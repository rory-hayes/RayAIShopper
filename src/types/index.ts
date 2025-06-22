export interface WizardState {
  currentStep: number
  formData: {
    shoppingPrompt: string
    gender: string
    preferredStyles: string[]
    preferredColors: string[]
    preferredArticleTypes: string[]
    inspirationImages: File[]
    selfieImage: File | null
    selectedItems: RecommendationItem[]
    sessionId?: string
  }
}

export interface RecommendationItem {
  id: string
  name: string
  category: string
  price: number
  image: string
  description: string
  inStock: boolean
  storeLocation: string
  similarity_score?: number
  article_type: string
  color: string
  usage?: string
}

export interface ClothingItem {
  id: string
  name: string
  description: string
  image: string
  price: string
  location: string
  liked: boolean
  disliked: boolean
  addedToCart: boolean
}

export interface UserContext {
  currentStep: number
  stepName: string
  shoppingPrompt: string
  gender: string
  preferredStyles: string[]
  preferredColors: string[]
  preferredArticleTypes: string[]
  hasInspirationImages: boolean
  inspirationImageCount: number
  hasSelfie: boolean
  selectedItemsCount: number
  likedItemsCount: number
  dislikedItemsCount: number
  cartTotal: number
  completedSteps: string[]
  currentStepProgress: string
}