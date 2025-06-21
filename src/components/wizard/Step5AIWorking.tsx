import React, { useEffect } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Sparkles } from 'lucide-react'

export const Step5AIWorking: React.FC = () => {
  const { nextStep } = useWizard()

  useEffect(() => {
    const timer = setTimeout(() => {
      nextStep()
    }, 3000) // Simulate 3 seconds of AI processing

    return () => clearTimeout(timer)
  }, [nextStep])

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center animate-fade-in">
      <div className="mb-8">
        <div className="relative">
          <Sparkles className="h-16 w-16 text-gray-900 mx-auto animate-pulse" />
          <div className="absolute inset-0 animate-spin">
            <Sparkles className="h-16 w-16 text-gray-400 mx-auto opacity-30" />
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-light text-gray-900 mb-4">
        Sit tight while Ray curates your look…
      </h1>
      
      <p className="text-gray-600 mb-8">
        Analyzing your style preferences and finding the perfect pieces
      </p>

      <div className="flex justify-center">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}