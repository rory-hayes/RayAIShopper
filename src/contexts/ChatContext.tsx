import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiService } from '../services/api'
import { chatLogger } from '../utils/logger'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatContextType {
  messages: ChatMessage[]
  isOpen: boolean
  isLoading: boolean
  sessionId: string | null
  addMessage: (message: ChatMessage) => void
  sendMessage: (content: string) => Promise<void>
  updateContext: (context: any) => void
  setSessionId: (sessionId: string) => void
  openChat: () => void
  closeChat: () => void
  addSystemUpdate: (update: string) => void
  syncWithWizard: (wizardData: any) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentContext, setCurrentContext] = useState<any>({})
  const [lastWizardStep, setLastWizardStep] = useState<number>(1)
  const [hasAddedStepMessage, setHasAddedStepMessage] = useState<Set<number>>(new Set())

  // Initialize chat with empty messages - we'll add context-specific message when user reaches Step 6
  useEffect(() => {
    // Start with empty messages array - dynamic message will be added based on user's journey
    setMessages([])
  }, [])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    addMessage(userMessage)

    setIsLoading(true)
    try {
      chatLogger.debug('Sending message', { content, sessionId })
      
      // Send to backend chat endpoint with comprehensive context
      const response = await apiService.chat({
        message: content,
        context: currentContext,
        history: messages.slice(-10).map(msg => ({ // Last 10 messages for context
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        session_id: sessionId || undefined
      })

      chatLogger.debug('Received response', { hasResponse: !!response })

      // Add assistant response - use 'message' field from backend
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message || "I received your message but couldn't generate a response.",
        timestamp: new Date().toISOString()
      }
      addMessage(assistantMessage)

      // Update session ID if provided
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id)
        chatLogger.debug('Updated session ID', { sessionId: response.session_id })
      }

    } catch (error) {
      chatLogger.error('Chat error', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, currentContext, messages, sessionId])

  const updateContext = useCallback((context: any) => {
    setCurrentContext((prev: any) => ({ ...prev, ...context }))
    chatLogger.debug('Context updated', { keys: Object.keys(context) })
  }, [])

  const syncWithWizard = useCallback((wizardData: any) => {
    const { formData, currentStep } = wizardData
    
    // Build comprehensive context from wizard data
    const comprehensiveContext = {
      // Step tracking
      current_step: currentStep,
      step_name: getStepName(currentStep),
      step_progress: getStepProgress(currentStep, formData),
      
      // User profile
      user_profile: {
        shopping_prompt: formData.shoppingPrompt || '',
        gender: formData.gender || '',
        preferred_styles: formData.preferredStyles || [],
        preferred_colors: formData.preferredColors || [],
        preferred_article_types: formData.preferredArticleTypes || [],
        age_range: formData.ageRange || '',
        budget_range: formData.budgetRange || '',
        size: formData.size || ''
      },
      
      // Journey progress
      journey_status: {
        has_shopping_prompt: !!formData.shoppingPrompt,
        has_personal_info: !!(formData.gender && (formData.preferredStyles?.length > 0 || formData.preferredColors?.length > 0)),
        has_inspiration_images: formData.inspirationImages?.length > 0,
        inspiration_image_count: formData.inspirationImages?.length || 0,
        has_selfie: !!formData.selfieImage,
        has_recommendations: formData.selectedItems?.length > 0,
        recommendation_count: formData.selectedItems?.length || 0
      },
      
      // Current recommendations
      current_recommendations: formData.selectedItems || [],

      // User interactions for likes/dislikes
      user_interactions: formData.userInteractions || { liked: [], disliked: [], addedToCart: [] },

      // Session tracking
      session_id: sessionId || formData.sessionId || null
    }
    
    // Update context
    setCurrentContext(comprehensiveContext)
    
    // Only add step progression message if we haven't already added one for this step
    if (currentStep > lastWizardStep && !hasAddedStepMessage.has(currentStep)) {
      const stepMessage = getStepTransitionMessage(lastWizardStep, currentStep, formData)
      if (stepMessage) {
        addSystemUpdate(stepMessage)
        setHasAddedStepMessage(prev => {
          const newSet = new Set(prev)
          newSet.add(currentStep)
          return newSet
        })
      }
      setLastWizardStep(currentStep)
    }
    
    chatLogger.debug('Synced with wizard', { 
      currentStep, 
      hasRecommendations: !!formData.selectedItems?.length,
      sessionId: sessionId || formData.sessionId
    })
  }, [sessionId, lastWizardStep, hasAddedStepMessage])

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

  const getStepProgress = (step: number, formData: any): string => {
    switch (step) {
      case 1:
        return formData.shoppingPrompt ? 'Shopping prompt provided' : 'Entering shopping prompt'
      case 2:
        const progress = []
        if (formData.gender) progress.push('gender')
        if (formData.preferredStyles?.length > 0) progress.push('styles')
        if (formData.preferredColors?.length > 0) progress.push('colors')
        return progress.length > 0 ? `Provided: ${progress.join(', ')}` : 'Filling personal information'
      case 3:
        return formData.inspirationImages?.length > 0 
          ? `${formData.inspirationImages.length} inspiration images uploaded`
          : 'Uploading inspiration images'
      case 4:
        return formData.selfieImage ? 'Selfie uploaded' : 'Uploading selfie (optional)'
      case 5:
        return 'AI analyzing preferences and curating recommendations'
      case 6:
        return formData.selectedItems?.length > 0 
          ? `Reviewing ${formData.selectedItems.length} recommendations`
          : 'Reviewing outfit recommendations'
      case 7:
        return 'Reviewing checkout options'
      case 8:
        return 'Viewing shopping summary'
      default:
        return 'In progress'
    }
  }

  const getStepTransitionMessage = (fromStep: number, toStep: number, formData: any): string | null => {
    switch (toStep) {
      case 2:
        if (formData.shoppingPrompt) {
          return `Perfect! I understand you're looking for "${formData.shoppingPrompt}". Now let's learn about your personal style preferences.`
        }
        break
      case 3:
        const prefs = []
        if (formData.gender) prefs.push(`shopping for ${formData.gender}'s clothing`)
        if (formData.preferredStyles?.length > 0) prefs.push(`${formData.preferredStyles.join(', ')} style`)
        if (formData.preferredColors?.length > 0) prefs.push(`${formData.preferredColors.join(', ')} colors`)
        
        if (prefs.length > 0) {
          return `Great! I now know you're ${prefs.join(' with ')}. Let's add some visual inspiration to help me understand your aesthetic even better.`
        }
        break
      case 4:
        if (formData.inspirationImages?.length > 0) {
          return `Excellent! Your ${formData.inspirationImages.length} inspiration image${formData.inspirationImages.length > 1 ? 's' : ''} will help me understand your exact style vision. Now you can optionally upload a selfie for virtual try-ons.`
        } else {
          return `No problem skipping inspiration images - I have great info from your style preferences. You can optionally upload a selfie next for virtual try-ons.`
        }
        break
      case 5:
        return `Perfect! I'm now analyzing all your preferences${formData.selfieImage ? ' and your selfie' : ''} to curate the perfect recommendations for you.`
      case 6:
        // Combine welcome + recommendations message with user's shopping prompt
        const shoppingPrompt = formData.shoppingPrompt || 'your request'
        return `Hi! I'm Ray, your AI shopping assistant and I've found some amazing pieces that match your "${shoppingPrompt}" request and your style preferences! Let me know what you think of these recommendations.`
      case 7:
        if (formData.selectedItems?.length > 0) {
          return `Wonderful! You've selected ${formData.selectedItems.length} item${formData.selectedItems.length > 1 ? 's' : ''} that perfectly match your style. Let's move toward checkout.`
        }
        break
      case 8:
        return `Fantastic! Let's review your final shopping summary and complete your purchase.`
    }
    return null
  }

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])

  const addSystemUpdate = useCallback((update: string) => {
    const systemMessage: ChatMessage = {
      role: 'assistant',
      content: update,
      timestamp: new Date().toISOString()
    }
    addMessage(systemMessage)
  }, [addMessage])

  return (
    <ChatContext.Provider value={{
      messages,
      isOpen,
      isLoading,
      sessionId,
      addMessage,
      sendMessage,
      updateContext,
      setSessionId,
      openChat,
      closeChat,
      addSystemUpdate,
      syncWithWizard
    }}>
      {children}
    </ChatContext.Provider>
  )
} 