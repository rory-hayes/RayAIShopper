import React, { useState, useRef } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Upload, X, Camera, Image } from 'lucide-react'

export const Step3UploadInspiration: React.FC = () => {
  const { formData, updateFormData, nextStep, prevStep } = useWizard()
  const [images, setImages] = useState<File[]>(formData.inspirationImages)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleContinue = () => {
    updateFormData({ inspirationImages: images })
    nextStep()
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Have a look or vibe in mind?
        </h1>
        <p className="text-gray-600">
          Upload images that inspire your style today
        </p>
      </div>

      <div className="space-y-6">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={triggerFileInput}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            Drag and drop images here, or click to select
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={triggerFileInput}>
              <Image className="h-4 w-4 mr-2" />
              Choose from Gallery
            </Button>
            <Button variant="secondary" onClick={triggerFileInput}>
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Inspiration ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
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