export interface WizardState {
  currentStep: number
  formData: {
    shoppingPrompt: string
    gender: string
    preferredStyles: string[]
    preferredColors: string[]
    size: string
    inspirationImages: File[]
    selfieImage: File | null
    selectedItems: string[]
  }
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
  size: string
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