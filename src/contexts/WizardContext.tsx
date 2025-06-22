import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'
import { WizardState, UserContext, RecommendationItem } from '../types'

interface WizardContextType extends WizardState {
  nextStep: () => void
  prevStep: () => void
  updateFormData: (data: Partial<WizardState['formData']>) => void
  resetWizard: () => void
  getUserContext: () => UserContext
  getStepSummary: (step: number) => string
}

const initialState: WizardState = {
  currentStep: 1,
  formData: {
    shoppingPrompt: '',
    gender: '',
    preferredStyles: [],
    preferredColors: [],
    preferredArticleTypes: [],
    inspirationImages: [],
    selfieImage: null,
    selectedItems: []
  }
}

type WizardAction = 
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<WizardState['formData']> }
  | { type: 'RESET_WIZARD' }

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 8) }
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) }
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      }
    case 'RESET_WIZARD':
      return initialState
    default:
      return state
  }
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  // Try to get chat context if available (will be undefined if chat context isn't loaded yet)
  let chatContext: any = null
  try {
    const { useChatContext } = require('../contexts/ChatContext')
    chatContext = useChatContext()
  } catch (error) {
    // Chat context not available, continue without it
  }

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' })
    
    // Update chat context when moving to next step
    if (chatContext) {
      const newStep = Math.min(state.currentStep + 1, 8)
      const stepSummary = getStepSummary(newStep)
      
      chatContext.updateContext({
        current_step: newStep,
        step_name: getStepName(newStep),
        user_profile: {
          shopping_prompt: state.formData.shoppingPrompt,
          gender: state.formData.gender,
          preferred_styles: state.formData.preferredStyles,
          preferred_colors: state.formData.preferredColors,
          preferred_article_types: state.formData.preferredArticleTypes
        }
      })

      if (newStep > 1) {
        chatContext.addSystemUpdate(`✅ Advanced to ${getStepName(newStep)}! ${stepSummary}`)
      }
    }
  }

  const prevStep = () => dispatch({ type: 'PREV_STEP' })
  
  const updateFormData = (data: Partial<WizardState['formData']>) => {
    console.log('🔥 WIZARD CONTEXT: updateFormData called with:', data)
    console.log('🔥 WIZARD CONTEXT: selectedItems in update:', data.selectedItems?.length, 'items')
    console.log('🔥 WIZARD CONTEXT: Current state before update:', state.formData.selectedItems?.length, 'items')
    
    dispatch({ type: 'UPDATE_FORM_DATA', payload: data })
    
    // Update chat context with new user data
    if (chatContext) {
      const updatedProfile = {
        shopping_prompt: data.shoppingPrompt || state.formData.shoppingPrompt,
        gender: data.gender || state.formData.gender,
        preferred_styles: data.preferredStyles || state.formData.preferredStyles,
        preferred_colors: data.preferredColors || state.formData.preferredColors,
        preferred_article_types: data.preferredArticleTypes || state.formData.preferredArticleTypes
      }

      chatContext.updateContext({
        user_profile: updatedProfile,
        current_recommendations: data.selectedItems || state.formData.selectedItems
      })

      // Add contextual updates for significant changes
      if (data.shoppingPrompt) {
        chatContext.addSystemUpdate(`🎯 Shopping goal updated: "${data.shoppingPrompt}"`)
      }
      if (data.preferredStyles && data.preferredStyles.length > 0) {
        chatContext.addSystemUpdate(`✨ Style preferences updated: ${data.preferredStyles.join(', ')}`)
      }
      if (data.selectedItems && data.selectedItems.length > 0) {
        chatContext.addSystemUpdate(`🛍️ Items selected: ${data.selectedItems.length} items added to your selection`)
      }
    }
    
    // Log after dispatch (though this won't show the updated state immediately due to async nature)
    console.log('🔥 WIZARD CONTEXT: dispatch called, state will update asynchronously')
  }
  
  const resetWizard = () => dispatch({ type: 'RESET_WIZARD' })

  const getStepName = (step: number): string => {
    const stepNames = [
      'Welcome & Shopping Prompt',
      'Personal Information',
      'Inspiration Images',
      'Selfie Upload',
      'AI Processing',
      'Outfit Recommendations',
      'Checkout Options',
      'Shopping Summary'
    ]
    return stepNames[step - 1] || 'Unknown Step'
  }

  const getCompletedSteps = (): string[] => {
    const steps = []
    if (state.formData.shoppingPrompt) steps.push('Shopping prompt provided')
    if (state.formData.gender) steps.push('Gender selected')
    if (state.formData.preferredStyles.length > 0) steps.push('Style preferences set')
    if (state.formData.preferredColors.length > 0) steps.push('Color preferences set')
    if (state.formData.preferredArticleTypes.length > 0) steps.push('Article type preferences set')
    if (state.formData.inspirationImages.length > 0) steps.push('Inspiration images uploaded')
    if (state.formData.selfieImage) steps.push('Selfie uploaded')
    if (state.formData.selectedItems.length > 0) steps.push('Items selected for purchase')
    return steps
  }

  const getCurrentStepProgress = (): string => {
    switch (state.currentStep) {
      case 1:
        return state.formData.shoppingPrompt ? 'Shopping prompt entered' : 'Entering shopping prompt'
      case 2:
        const aboutYouProgress = []
        if (state.formData.gender) aboutYouProgress.push('gender')
        if (state.formData.preferredArticleTypes.length > 0) aboutYouProgress.push('article types')
        if (state.formData.preferredStyles.length > 0) aboutYouProgress.push('styles')
        if (state.formData.preferredColors.length > 0) aboutYouProgress.push('colors')
        return aboutYouProgress.length > 0 
          ? `Provided: ${aboutYouProgress.join(', ')}` 
          : 'Filling out personal information'
      case 3:
        return state.formData.inspirationImages.length > 0 
          ? `${state.formData.inspirationImages.length} inspiration images uploaded`
          : 'Uploading inspiration images'
      case 4:
        return state.formData.selfieImage ? 'Selfie uploaded' : 'Uploading selfie (optional)'
      case 5:
        return 'AI analyzing preferences and curating recommendations'
      case 6:
        return 'Reviewing outfit recommendations'
      case 7:
        return 'Reviewing checkout options'
      case 8:
        return 'Viewing shopping summary'
      default:
        return 'In progress'
    }
  }

  const getStepSummary = (step: number): string => {
    switch (step) {
      case 1:
        return state.formData.shoppingPrompt 
          ? `✅ Step 1 Complete: Looking for "${state.formData.shoppingPrompt}"`
          : '⏳ Step 1: Entering shopping prompt'
      case 2:
        const step2Items = []
        if (state.formData.gender) step2Items.push(`Gender: ${state.formData.gender}`)
        if (state.formData.preferredArticleTypes.length > 0) step2Items.push(`Article types: ${state.formData.preferredArticleTypes.join(', ')}`)
        if (state.formData.preferredStyles.length > 0) step2Items.push(`Styles: ${state.formData.preferredStyles.join(', ')}`)
        if (state.formData.preferredColors.length > 0) step2Items.push(`Colors: ${state.formData.preferredColors.join(', ')}`)
        
        return step2Items.length > 0 
          ? `✅ Step 2 Complete: ${step2Items.join(' | ')}`
          : '⏳ Step 2: Filling personal information'
      case 3:
        return state.formData.inspirationImages.length > 0 
          ? `✅ Step 3 Complete: ${state.formData.inspirationImages.length} inspiration image${state.formData.inspirationImages.length > 1 ? 's' : ''} uploaded`
          : '⏳ Step 3: Uploading inspiration images'
      case 4:
        return state.formData.selfieImage 
          ? '✅ Step 4 Complete: Selfie uploaded for virtual try-on'
          : '⏳ Step 4: Selfie upload (optional)'
      case 5:
        return '🤖 Step 5: AI analyzing your preferences and curating recommendations'
      case 6:
        return state.formData.selectedItems.length > 0 
          ? `✅ Step 6: ${state.formData.selectedItems.length} item${state.formData.selectedItems.length > 1 ? 's' : ''} selected from recommendations`
          : '⏳ Step 6: Reviewing outfit recommendations'
      case 7:
        return '💳 Step 7: Reviewing checkout and purchase options'
      case 8:
        return '📋 Step 8: Final shopping summary and completion'
      default:
        return 'Unknown step'
    }
  }

  const getUserContext = (): UserContext => {
    // Mock data for liked/disliked items (in real app, this would come from the outfit rail state)
    const mockLikedCount = 2
    const mockDislikedCount = 1
    const mockCartTotal = 597 // This would be calculated from selected items

    return {
      currentStep: state.currentStep,
      stepName: getStepName(state.currentStep),
      shoppingPrompt: state.formData.shoppingPrompt,
      gender: state.formData.gender,
      preferredStyles: state.formData.preferredStyles,
      preferredColors: state.formData.preferredColors,
      preferredArticleTypes: state.formData.preferredArticleTypes,
      hasInspirationImages: state.formData.inspirationImages.length > 0,
      inspirationImageCount: state.formData.inspirationImages.length,
      hasSelfie: state.formData.selfieImage !== null,
      selectedItemsCount: state.formData.selectedItems.length,
      likedItemsCount: mockLikedCount,
      dislikedItemsCount: mockDislikedCount,
      cartTotal: mockCartTotal,
      completedSteps: getCompletedSteps(),
      currentStepProgress: getCurrentStepProgress()
    }
  }

  return (
    <WizardContext.Provider value={{
      ...state,
      nextStep,
      prevStep,
      updateFormData,
      resetWizard,
      getUserContext,
      getStepSummary
    }}>
      {children}
    </WizardContext.Provider>
  )
}

export const useWizard = () => {
  const context = useContext(WizardContext)
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}