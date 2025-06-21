/**
 * API Configuration
 */

// Use environment variable if available, otherwise fallback to production URL
export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://ray-ai-shopper-backend.vercel.app/api/v1'

export const API_ENDPOINTS = {
  // Health check
  health: '/health',
  
  // Main recommendation flow
  recommendations: '/recommendations',
  
  // Chat assistant
  chat: '/chat',
  
  // Virtual try-on
  tryon: '/tryon',
  
  // Feedback
  feedback: '/feedback',
  
  // Refresh recommendations
  refresh: '/refresh'
}

// API configuration
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for AI processing
  headers: {
    'Content-Type': 'application/json',
  }
} 