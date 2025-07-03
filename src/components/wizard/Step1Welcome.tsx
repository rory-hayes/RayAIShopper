import React, { useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { embeddingService } from '../../services/api'

export const Step1Welcome: React.FC = () => {
  const { formData, updateFormData, nextStep } = useWizard()
  const [prompt, setPrompt] = useState(formData.shoppingPrompt)

  const handleContinue = async () => {
    updateFormData({ shoppingPrompt: prompt })
    
    // Trigger embedding generation early for faster searches later
    try {
      console.log('🚀 Triggering early embedding generation...')
      const result = await embeddingService.prepareEmbeddings()
      console.log('✅ Embedding preparation:', result.message)
    } catch (error) {
      console.warn('⚠️ Could not start embedding generation:', error)
      // Don't block the user flow if this fails
    }
    
    nextStep()
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Hi, I'm Ray – your personal AI shopper.
        </h1>
        <p className="text-lg text-gray-600">
          Tell me what you're shopping for today.
        </p>
      </div>

      <div className="space-y-6">
        <Textarea
          placeholder="I'm looking for something elegant for a dinner party..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-lg"
        />

        <Button
          onClick={handleContinue}
          disabled={!prompt.trim()}
          fullWidth
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}