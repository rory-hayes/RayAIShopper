/**
 * API Service Layer
 * Handles all communication with the Ray AI Shopper backend
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/api'

// Types for API requests and responses
export interface UserProfile {
  shopping_prompt: string
  gender: string
  preferred_styles: string[]
  preferred_colors: string[]
  size: string
  age_range?: string
  budget_range?: string
  body_type?: string
}

export interface ProductItem {
  id: string
  name: string
  category: string
  subcategory: string
  article_type: string
  color: string
  gender: string
  season?: string
  usage: string
  image_url: string
  similarity_score: number
  store_location?: string
}

export interface RecommendationRequest {
  user_profile: UserProfile
  inspiration_images?: string[] // base64 encoded images
  exclude_ids?: string[]
}

export interface RecommendationResponse {
  recommendations: ProductItem[]
  total_found: number
  search_query: string
  processing_time: number
  fallback_mode: boolean
}

export interface ChatRequest {
  message: string
  context: {
    user_profile: UserProfile
    current_recommendations?: ProductItem[]
    conversation_history?: Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: string
    }>
  }
}

export interface ChatResponse {
  response: string
  context_updated: boolean
  suggestions?: string[]
}

export interface TryonRequest {
  user_image: string // base64
  product_item: ProductItem
  style_prompt?: string
}

export interface TryonResponse {
  tryon_image: string // base64
  description: string
}

export interface FeedbackRequest {
  product_id: string
  feedback_type: 'like' | 'dislike'
  user_profile: UserProfile
  reason?: string
}

export interface RefreshRequest {
  user_profile: UserProfile
  exclude_ids: string[]
  count: number
}

class ApiService {
  private baseURL: string
  private timeout: number

  constructor() {
    this.baseURL = API_CONFIG.baseURL
    this.timeout = API_CONFIG.timeout
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
    }

    // Add timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)
    config.signal = controller.signal

    try {
      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - AI processing is taking longer than expected')
        }
        throw error
      }
      throw new Error('Unknown API error')
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.makeRequest(API_ENDPOINTS.health)
  }

  // Get recommendations
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    return this.makeRequest(API_ENDPOINTS.recommendations, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Chat with assistant
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.makeRequest(API_ENDPOINTS.chat, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Virtual try-on
  async virtualTryon(request: TryonRequest): Promise<TryonResponse> {
    return this.makeRequest(API_ENDPOINTS.tryon, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Send feedback
  async sendFeedback(request: FeedbackRequest): Promise<{ success: boolean }> {
    return this.makeRequest(API_ENDPOINTS.feedback, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Refresh recommendations
  async refreshRecommendations(request: RefreshRequest): Promise<{ recommendations: ProductItem[] }> {
    return this.makeRequest(API_ENDPOINTS.refresh, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()

// Utility functions
export const convertToUserProfile = (formData: any): UserProfile => {
  // Map gender to backend enum format
  const mapGender = (gender: string): string => {
    switch (gender?.toLowerCase()) {
      case 'men':
      case 'male':
        return 'Men'
      case 'women':
      case 'female':
        return 'Women'
      case 'unisex':
        return 'Unisex'
      default:
        return 'Unisex'
    }
  }

  // Map styles to backend enum format
  const mapStyles = (styles: string[]): string[] => {
    return styles?.map(style => {
      switch (style?.toLowerCase()) {
        case 'casual':
          return 'Casual'
        case 'formal':
          return 'Formal'
        case 'smart casual':
        case 'smart-casual':
          return 'Smart Casual'
        case 'sporty':
        case 'sport':
          return 'Sporty'
        case 'elegant':
          return 'Elegant'
        case 'trendy':
        case 'trend':
          return 'Trendy'
        case 'classic':
          return 'Classic'
        default:
          return 'Casual' // Default fallback
      }
    }) || []
  }

  // Map size to backend enum format
  const mapSize = (size: string): string => {
    const sizeUpper = size?.toUpperCase()
    const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    return validSizes.includes(sizeUpper) ? sizeUpper : 'M' // Default to M
  }

  return {
    shopping_prompt: formData.shoppingPrompt || '',
    gender: mapGender(formData.gender),
    preferred_styles: mapStyles(formData.preferredStyles),
    preferred_colors: formData.preferredColors || [],
    size: mapSize(formData.size),
    age_range: formData.ageRange,
    budget_range: formData.budgetRange,
    body_type: formData.bodyType,
  }
}

export const convertFromBase64 = (base64String: any): string => {
  // Handle non-string inputs safely
  if (!base64String || typeof base64String !== 'string') {
    console.warn('convertFromBase64 received non-string input:', base64String)
    return ''
  }
  
  // Remove data:image/jpeg;base64, prefix if present
  return base64String.replace(/^data:image\/[a-z]+;base64,/, '')
} 