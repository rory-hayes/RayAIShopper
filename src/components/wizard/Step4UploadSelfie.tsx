import React, { useState, useRef } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Camera, X, Image } from 'lucide-react'

export const Step4UploadSelfie: React.FC = () => {
  const { formData, updateFormData, nextStep, prevStep } = useWizard()
  const [selfie, setSelfie] = useState<File | null>(formData.selfieImage)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelfie(file)
  }

  const removeSelfie = () => {
    setSelfie(null)
  }

  const handleContinue = () => {
    updateFormData({ selfieImage: selfie })
    nextStep()
  }

  const handleSkip = () => {
    updateFormData({ selfieImage: null })
    nextStep()
  }

  const triggerCamera = () => {
    cameraInputRef.current?.click()
  }

  const triggerGallery = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Want to see how it might look on you?
        </h1>
        <p className="text-gray-600">
          Upload a selfie for virtual try-on (optional)
        </p>
      </div>

      <div className="space-y-6">
        {!selfie ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              Take a selfie or upload a photo
            </p>
            
            {/* Camera input for taking photos */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Gallery input for selecting existing photos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={triggerCamera}>
                <Camera className="h-4 w-4 mr-2" />
                Take Selfie
              </Button>
              <Button variant="secondary" onClick={triggerGallery}>
                <Image className="h-4 w-4 mr-2" />
                Choose Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <img
              src={URL.createObjectURL(selfie)}
              alt="Selfie"
              className="w-full max-h-80 object-cover rounded-xl"
            />
            <button
              onClick={removeSelfie}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={prevStep}
            variant="secondary"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}