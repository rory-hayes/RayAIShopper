import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
import { useWizard } from '../../contexts/WizardContext'

export const ChatAssistant: React.FC = () => {
  const { 
    messages, 
    isOpen, 
    isLoading, 
    sendMessage, 
    openChat, 
    closeChat,
    syncWithWizard,
    addSystemUpdate 
  } = useChatContext()
  const { formData, currentStep } = useWizard()
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [showNotification, setShowNotification] = useState(false)

  // Only show chat from Step 6 onwards (when we have recommendations)
  const shouldShowChat = currentStep >= 6

  // Sync with wizard data when component mounts or when we reach Step 6
  useEffect(() => {
    if (shouldShowChat && !hasInitialized) {
      console.log('🤖 CHAT: Initializing with full wizard context at Step 6')
      syncWithWizard({ formData, currentStep })
      setShowNotification(true) // Show notification badge
      setHasInitialized(true)
    }
  }, [shouldShowChat, currentStep, formData, syncWithWizard, hasInitialized])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateFashionSummary = (formData: any): string => {
    const styles = formData.preferredStyles || []
    const colors = formData.preferredColors || []
    const prompt = formData.shoppingPrompt || ''
    const gender = formData.gender || ''
    const hasInspiration = formData.inspirationImages?.length > 0
    const hasSelfie = !!formData.selfieImage
    const recommendationCount = formData.selectedItems?.length || 0

    let summary = `🎉 Welcome! I'm Ray, your personal fashion stylist. Let me break down what I've curated for you:\n\n`

    // Shopping goal
    if (prompt) {
      summary += `🎯 **Your Goal:** "${prompt}"\n`
    }

    // Style analysis
    if (styles.length > 0) {
      summary += `✨ **Your Style DNA:** ${styles.join(', ')}\n`
      
      // Add style insights
      if (styles.includes('Minimalist')) {
        summary += `   → Perfect! Minimalist style is timeless and versatile. I've focused on clean lines and quality basics.\n`
      }
      if (styles.includes('Bohemian')) {
        summary += `   → Love the boho vibe! I've selected flowing fabrics and artistic details that capture that free-spirited essence.\n`
      }
      if (styles.includes('Classic')) {
        summary += `   → Classic never goes out of style! I've chosen pieces that will work for years to come.\n`
      }
      if (styles.includes('Trendy')) {
        summary += `   → Staying current! These pieces reflect the latest fashion movements while staying true to your aesthetic.\n`
      }
    }

    // Color analysis
    if (colors.length > 0) {
      summary += `🎨 **Your Color Palette:** ${colors.join(', ')}\n`
      
      // Add color matching insights
      if (colors.includes('Black')) {
        summary += `   → Black is your power color - sophisticated and endlessly versatile for any occasion.\n`
      }
      if (colors.includes('Navy')) {
        summary += `   → Navy is the new black! It's professional yet approachable, perfect for your needs.\n`
      }
      if (colors.includes('Beige') || colors.includes('Cream')) {
        summary += `   → Neutrals are your foundation - they create a cohesive wardrobe and pair beautifully with accent colors.\n`
      }
      if (colors.includes('Red')) {
        summary += `   → Red makes a statement! I've included pieces that add that perfect pop of confidence.\n`
      }
    }

    // Inspiration and personalization
    if (hasInspiration) {
      summary += `📸 **Visual Inspiration:** I've analyzed your inspiration images to understand your aesthetic vision.\n`
    }
    if (hasSelfie) {
      summary += `👤 **Personal Touch:** With your selfie, I can show you virtual try-ons for the perfect fit visualization.\n`
    }

    // Recommendations summary
    if (recommendationCount > 0) {
      summary += `\n🛍️ **Your Curated Collection:** ${recommendationCount} handpicked pieces that work together beautifully.\n\n`
      
      summary += `**Why These Recommendations?**\n`
      summary += `• Each piece aligns with your ${styles.join(' and ')} aesthetic\n`
      if (colors.length > 0) {
        summary += `• Colors complement your ${colors.join(', ')} palette\n`
      }
      summary += `• Perfect for "${prompt}"\n`
      summary += `• High-quality pieces that offer versatility and longevity\n\n`
    }

    summary += `💬 **I'm here to help with:**\n`
    summary += `• Color combinations and matching\n`
    summary += `• Styling tips and outfit ideas\n`
    summary += `• Accessory recommendations\n`
    summary += `• Fit and sizing advice\n`
    summary += `• Mix-and-match suggestions\n`
    summary += `• Fashion trends and timeless pieces\n\n`

    summary += `What would you like to know about your recommendations? 😊`

    return summary
  }

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !isLoading) {
      await sendMessage(inputMessage.trim())
      setInputMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleOpenChat = () => {
    setShowNotification(false) // Hide notification when chat is opened
    openChat()
  }

  // Don't render anything if we're not at Step 6 yet
  if (!shouldShowChat) {
    return null
  }

  return (
    <>
      {/* Chat Button with Notification */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleOpenChat}
            className="relative bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-200 group"
          >
            <MessageCircle className="h-6 w-6" />
            
            {/* Notification Badge */}
            {showNotification && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
            
            {/* Hover tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Chat with Ray - Your Personal Fashion Expert
            </div>
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">R</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Ray</h3>
                <p className="text-xs text-gray-500">Fashion Stylist & Color Expert</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 text-gray-900 p-3 rounded-lg flex items-center gap-2 border border-gray-200">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  <p className="text-sm">Ray is styling your response...</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about colors, styling, fit, accessories..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 