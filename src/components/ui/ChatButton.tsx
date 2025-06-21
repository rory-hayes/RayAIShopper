import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User, Bot, CheckCircle } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'ray'
  timestamp: Date
  isStepUpdate?: boolean
}

export const ChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { getUserContext, getStepSummary } = useWizard()
  const lastContextRef = useRef<string>('')
  const lastStepRef = useRef<number>(0)
  const hasInitializedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateContextualGreeting = (): string => {
    const context = getUserContext()
    
    let greeting = "Hi! I'm Ray, your personal shopping assistant. "
    
    // Add context based on current step and progress
    switch (context.currentStep) {
      case 1:
        if (context.shoppingPrompt) {
          greeting += `I can see you're looking for "${context.shoppingPrompt}". Great start! `
        } else {
          greeting += "I'm here to help you find the perfect outfit. "
        }
        break
      case 2:
        greeting += `I can see you're working on your personal preferences. `
        if (context.completedSteps.length > 0) {
          greeting += `Great progress: ${context.completedSteps.slice(-2).join(' and ')}. `
        }
        break
      case 3:
        greeting += `Time for inspiration images! `
        if (context.shoppingPrompt) {
          greeting += `I remember you're looking for "${context.shoppingPrompt}". `
        }
        if (context.preferredStyles.length > 0) {
          greeting += `Your ${context.preferredStyles.join(', ')} style will help guide the search. `
        }
        break
      case 4:
        greeting += `Selfie time! This is optional but helps with virtual try-ons. `
        if (context.inspirationImageCount > 0) {
          greeting += `I love the ${context.inspirationImageCount} inspiration image${context.inspirationImageCount > 1 ? 's' : ''} you uploaded. `
        }
        break
      case 5:
        greeting += `I'm analyzing your preferences right now! `
        if (context.preferredStyles.length > 0 && context.preferredColors.length > 0) {
          greeting += `Your ${context.preferredStyles.join(', ')} style and ${context.preferredColors.join(', ')} color preferences are perfect guidance. `
        }
        break
      case 6:
        greeting += `Here are your curated recommendations! `
        if (context.shoppingPrompt) {
          greeting += `I've selected these based on "${context.shoppingPrompt}" `
        }
        if (context.preferredStyles.length > 0) {
          greeting += `and your ${context.preferredStyles.join(', ')} style preferences. `
        }
        if (context.selectedItemsCount > 0) {
          greeting += `I see you've selected ${context.selectedItemsCount} item${context.selectedItemsCount > 1 ? 's' : ''} so far! `
        }
        break
      case 7:
        greeting += `Ready to checkout! `
        if (context.selectedItemsCount > 0) {
          greeting += `You have ${context.selectedItemsCount} item${context.selectedItemsCount > 1 ? 's' : ''} selected. `
        }
        break
      case 8:
        greeting += `Here's your shopping summary! `
        if (context.selectedItemsCount > 0) {
          greeting += `${context.selectedItemsCount} perfect item${context.selectedItemsCount > 1 ? 's' : ''} curated just for you. `
        }
        break
    }
    
    greeting += "How can I help you today?"
    return greeting
  }

  const generateStepCompletionMessage = (step: number): string => {
    const context = getUserContext()
    const stepSummary = getStepSummary(step)
    
    let message = `Perfect! I've captured your information from this step:\n\n${stepSummary}\n\n`
    
    switch (step) {
      case 1:
        if (context.shoppingPrompt) {
          message += `I understand you're looking for "${context.shoppingPrompt}". This gives me great direction for finding the perfect pieces! Ready to tell me more about your personal style?`
        }
        break
      case 2:
        message += `Excellent! Now I know:`
        if (context.gender) message += `\n• You're shopping for ${context.gender}'s clothing`
        if (context.size) message += `\n• Your size is ${context.size}`
        if (context.preferredStyles.length > 0) message += `\n• Your style preferences: ${context.preferredStyles.join(', ')}`
        if (context.preferredColors.length > 0) message += `\n• Your favorite colors: ${context.preferredColors.join(', ')}`
        message += `\n\nThis information helps me understand your aesthetic perfectly! Ready to add some inspiration images?`
        break
      case 3:
        if (context.inspirationImageCount > 0) {
          message += `Great visual references! Your ${context.inspirationImageCount} inspiration image${context.inspirationImageCount > 1 ? 's' : ''} will help me understand the exact vibe you're going for. Combined with your ${context.preferredStyles.join(', ')} style preferences, I'm getting a clear picture of your aesthetic!`
        } else {
          message += `No worries about skipping inspiration images - I have plenty to work with from your style and color preferences!`
        }
        break
      case 4:
        if (context.hasSelfie) {
          message += `Perfect! Your selfie will help me show you virtual try-ons of the items I recommend. This makes the shopping experience so much more personalized!`
        } else {
          message += `No problem skipping the selfie - I can still find amazing pieces that match your style perfectly!`
        }
        break
      case 6:
        if (context.selectedItemsCount > 0) {
          message += `Wonderful choices! You've selected ${context.selectedItemsCount} item${context.selectedItemsCount > 1 ? 's' : ''} that perfectly match your "${context.shoppingPrompt}" request and ${context.preferredStyles.join(', ')} style. Ready to move toward checkout?`
        }
        break
    }
    
    return message
  }

  const generateContextualResponse = (userMessage: string): string => {
    const context = getUserContext()
    const lowerMessage = userMessage.toLowerCase()

    // Context-aware responses based on current step and user data
    if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
      switch (context.currentStep) {
        case 1:
          return "I can help you describe what you're looking for! Try being specific about the occasion, style, or feeling you want to achieve. For example: 'I need something elegant for a dinner date' or 'Looking for casual weekend wear that's comfortable but stylish.'"
        case 2:
          let step2Help = "I see you're on the personal information step. "
          if (context.gender) step2Help += `Great that you've selected ${context.gender}! `
          else step2Help += "Start by selecting your gender, "
          
          if (context.size) step2Help += `I have your size as ${context.size}. `
          else step2Help += "then add your size, "
          
          if (context.preferredStyles.length > 0) step2Help += `I love your style choices: ${context.preferredStyles.join(', ')}. `
          else step2Help += "and pick your favorite styles. "
          
          if (context.preferredColors.length > 0) step2Help += `Your color preferences (${context.preferredColors.join(', ')}) will help me find perfect matches!`
          else step2Help += "Don't forget to add your favorite colors too!"
          
          return step2Help
        case 3:
          return "For inspiration images, upload photos of outfits, styles, or looks you admire. These could be from social media, magazines, or even photos of clothes in your wardrobe that you love. The more visual references you give me, the better I can understand your aesthetic!"
        case 4:
          return "The selfie is optional but really helpful for virtual try-ons! If you're comfortable sharing one, it helps me show you how items might look on you. If not, no worries - I can still help you find amazing pieces."
        case 6:
          let step6Help = `I've curated these items based on your request: "${context.shoppingPrompt}" and your style preferences: ${context.preferredStyles.join(', ')}. `
          if (context.preferredColors.length > 0) {
            step6Help += `I've also considered your color preferences: ${context.preferredColors.join(', ')}. `
          }
          step6Help += "Feel free to like items you love, dislike ones that don't work, and add favorites to your cart!"
          return step6Help
        default:
          return "I'm here to help at any step! What specific question do you have about your shopping experience?"
      }
    }

    if (lowerMessage.includes('style') || lowerMessage.includes('recommend')) {
      if (context.preferredStyles.length > 0) {
        let styleResponse = `Based on your ${context.preferredStyles.join(', ')} style preferences`
        if (context.preferredColors.length > 0) {
          styleResponse += ` and love for ${context.preferredColors.join(', ')} colors`
        }
        styleResponse += `, I'd suggest focusing on pieces that `
        
        if (context.preferredStyles.includes('Elegant')) {
          styleResponse += 'have clean lines and sophisticated details'
        } else if (context.preferredStyles.includes('Casual')) {
          styleResponse += 'are comfortable yet put-together'
        } else if (context.preferredStyles.includes('Edgy')) {
          styleResponse += 'have interesting textures or unexpected details'
        } else {
          styleResponse += 'match your aesthetic'
        }
        
        styleResponse += '. What specific type of item are you most interested in?'
        return styleResponse
      }
      return "I'd love to give you personalized style advice! First, let me know your style preferences in step 2 - are you more casual, elegant, edgy, or something else?"
    }

    if (lowerMessage.includes('color') || lowerMessage.includes('colours')) {
      if (context.preferredColors.length > 0) {
        let colorResponse = `I see you love ${context.preferredColors.join(', ')}! These colors work beautifully`
        if (context.preferredStyles.length > 0) {
          colorResponse += ` with your ${context.preferredStyles.join(', ')} style`
        } else {
          colorResponse += ` with many different styles`
        }
        colorResponse += '. I\'ll make sure to prioritize items in these shades when making recommendations.'
        return colorResponse
      }
      return "Colors are so important for creating looks you'll love! In step 2, you can select your favorite colors. Think about what makes you feel confident and what complements your skin tone."
    }

    if (lowerMessage.includes('size') || lowerMessage.includes('fit')) {
      if (context.size) {
        return `I have your size as ${context.size}. Remember, fit can vary between brands, so don't hesitate to try things on in-store or check size guides when shopping online. I always recommend going with what feels comfortable and confident!`
      }
      return "Getting the right fit is crucial! Make sure to add your size in step 2. If you're between sizes or unsure, I can help you think through what works best for different types of clothing."
    }

    if (lowerMessage.includes('cart') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
      if (context.selectedItemsCount > 0) {
        return `You have ${context.selectedItemsCount} item${context.selectedItemsCount > 1 ? 's' : ''} in your cart! Your total is looking to be around $${context.cartTotal}. You can review everything in your cart and proceed to checkout when you're ready.`
      }
      return "I don't see any items in your cart yet. Once you get to the recommendations step, you can add items you love by clicking the cart icon on each product card."
    }

    if (lowerMessage.includes('occasion') || lowerMessage.includes('event')) {
      if (context.shoppingPrompt) {
        return `I remember you mentioned: "${context.shoppingPrompt}". This helps me understand the vibe you're going for! The occasion really shapes what will work best - from fabric choices to silhouettes to styling details.`
      }
      return "The occasion is key to finding the perfect outfit! In step 1, describe what you're shopping for - whether it's work, a special event, everyday wear, or something specific. The more context you give me, the better I can help!"
    }

    // Generic contextual response
    if (context.currentStep <= 2) {
      let genericResponse = `I can see you're in the ${context.stepName.toLowerCase()} phase. `
      if (context.completedSteps.length > 0) {
        genericResponse += `You've already completed: ${context.completedSteps.join(', ')}. `
      }
      genericResponse += `${context.currentStepProgress} Feel free to ask me anything about style, fit, or what you're looking for!`
      return genericResponse
    } else if (context.currentStep <= 4) {
      let setupResponse = "You're doing great with the setup! "
      if (context.shoppingPrompt) {
        setupResponse += `I love that you're looking for "${context.shoppingPrompt}" `
      }
      if (context.preferredStyles.length > 0) {
        setupResponse += `and your ${context.preferredStyles.join(', ')} style preferences will help me find perfect matches. `
      }
      setupResponse += "What questions do you have about this step?"
      return setupResponse
    } else {
      let lateStageResponse = `We're in the ${context.stepName.toLowerCase()} phase! `
      if (context.selectedItemsCount > 0) {
        lateStageResponse += `You've selected ${context.selectedItemsCount} items so far. `
      }
      lateStageResponse += "I'm here to help with any questions about the items, styling, or your shopping experience."
      return lateStageResponse
    }
  }

  const handleSend = () => {
    if (message.trim()) {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'user',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, userMessage])
      setMessage('')

      // Generate Ray's contextual response
      setTimeout(() => {
        const rayResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: generateContextualResponse(message.trim()),
          sender: 'ray',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, rayResponse])
      }, 1000)
    }
  }

  // Initialize chat with contextual greeting
  useEffect(() => {
    if (!hasInitializedRef.current) {
      const initialGreeting: ChatMessage = {
        id: '1',
        text: generateContextualGreeting(),
        sender: 'ray',
        timestamp: new Date()
      }
      setMessages([initialGreeting])
      hasInitializedRef.current = true
      lastStepRef.current = 1
    }
  }, [])

  // Track step changes and form data updates
  useEffect(() => {
    const context = getUserContext()
    const currentContextKey = `${context.currentStep}-${context.shoppingPrompt}-${context.preferredStyles.join(',')}-${context.preferredColors.join(',')}-${context.selectedItemsCount}-${context.gender}-${context.size}-${context.inspirationImageCount}-${context.hasSelfie}`
    
    if (hasInitializedRef.current && lastContextRef.current !== currentContextKey) {
      // Check if we moved to a new step
      if (context.currentStep !== lastStepRef.current) {
        // User moved to a new step - add step completion message for the previous step
        if (lastStepRef.current > 0 && lastStepRef.current < context.currentStep) {
          const stepCompletionMessage: ChatMessage = {
            id: `step-${lastStepRef.current}-${Date.now()}`,
            text: generateStepCompletionMessage(lastStepRef.current),
            sender: 'ray',
            timestamp: new Date(),
            isStepUpdate: true
          }
          
          setMessages(prev => [...prev, stepCompletionMessage])
        }
        
        lastStepRef.current = context.currentStep
      } else {
        // Same step but context changed (form data updated)
        // Add a brief update message
        const contextUpdateMessage: ChatMessage = {
          id: `update-${Date.now()}`,
          text: `I've updated my understanding based on your latest input: ${getStepSummary(context.currentStep)}`,
          sender: 'ray',
          timestamp: new Date(),
          isStepUpdate: true
        }
        
        setMessages(prev => [...prev, contextUpdateMessage])
      }
    }
    
    lastContextRef.current = currentContextKey
  }, [getUserContext, getStepSummary])

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-slide-up">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-medium">R</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Ray</h3>
                  <p className="text-xs text-green-600">Online • Step Aware</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4 h-64 overflow-y-auto space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'ml-2 bg-gray-900' : 'mr-2 bg-gray-100'}`}>
                    {msg.sender === 'user' ? (
                      <User className="h-3 w-3 text-white" />
                    ) : msg.isStepUpdate ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Bot className="h-3 w-3 text-gray-600" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    msg.sender === 'user' 
                      ? 'bg-gray-900 text-white' 
                      : msg.isStepUpdate 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender === 'user' 
                        ? 'text-gray-300' 
                        : msg.isStepUpdate 
                          ? 'text-green-600' 
                          : 'text-gray-500'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Ray anything..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all duration-200 flex items-center justify-center z-40 hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </>
  )
}