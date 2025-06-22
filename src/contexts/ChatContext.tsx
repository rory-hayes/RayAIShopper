import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../services/api'

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

  // Initialize chat with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: "Hi! I'm Ray, your AI shopping assistant. I'm here to help you find the perfect items. As you go through the wizard, I'll learn about your preferences and can answer any questions you have!",
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])
  }, [])

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  const sendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    addMessage(userMessage)

    setIsLoading(true)
    try {
      console.log('🤖 CHAT: Sending message:', content)
      console.log('🤖 CHAT: Current context:', currentContext)
      console.log('🤖 CHAT: Session ID:', sessionId)
      
      // Send to backend chat endpoint
      const response = await apiService.chat({
        message: content,
        context: currentContext,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        session_id: sessionId || undefined
      })

      console.log('🤖 CHAT: Received response:', response)

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
        console.log('🤖 CHAT: Updated session ID:', response.session_id)
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toISOString()
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const updateContext = (context: any) => {
    setCurrentContext(prev => ({ ...prev, ...context }))
    console.log('🤖 CHAT: Context updated:', context)
  }

  const openChat = () => setIsOpen(true)
  const closeChat = () => setIsOpen(false)

  const addSystemUpdate = (update: string) => {
    const systemMessage: ChatMessage = {
      role: 'assistant',
      content: update,
      timestamp: new Date().toISOString()
    }
    addMessage(systemMessage)
  }

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
      addSystemUpdate
    }}>
      {children}
    </ChatContext.Provider>
  )
} 