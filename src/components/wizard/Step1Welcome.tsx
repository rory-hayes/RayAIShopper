import React, { useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

export const Step1Welcome: React.FC = () => {
  const { formData, updateFormData, nextStep } = useWizard()
  const [prompt, setPrompt] = useState(formData.shoppingPrompt)

  const handleContinue = () => {
    updateFormData({ shoppingPrompt: prompt })
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