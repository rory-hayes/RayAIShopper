import React, { useEffect, useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { apiService, convertToUserProfile, convertFromBase64 } from '../../services/api'
import { Sparkles, AlertCircle } from 'lucide-react'

export const Step5AIWorking: React.FC = () => {
  const { formData, nextStep, updateFormData } = useWizard()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const processRecommendations = async () => {
      try {
        setStatus('processing')

        // Convert form data to API format
        const userProfile = convertToUserProfile(formData)

        // Prepare inspiration images if any
        const inspirationImages = formData.inspirationImages?.map((img: string) => 
          convertFromBase64(img)
        ) || []

        // Call the backend API
        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          inspiration_images: inspirationImages.length > 0 ? inspirationImages : undefined,
          exclude_ids: [] // No exclusions on first request
        })

        // Update form data with real recommendations
        updateFormData({
          selectedItems: response.recommendations.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: Math.floor(Math.random() * 200) + 50, // Mock price for now
            image: item.image_url,
            description: `${item.article_type} in ${item.color}`,
            inStock: true,
            storeLocation: item.store_location || 'A1-B2',
            similarity_score: item.similarity_score,
            article_type: item.article_type,
            color: item.color,
            usage: item.usage
          }))
        })

        setStatus('success')
        
        // Move to next step after brief success display
        setTimeout(() => {
          nextStep()
        }, 1500)

      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to get recommendations')
        
        // Fallback to mock data after 3 seconds
        setTimeout(() => {
          // Use mock data as fallback
          updateFormData({
            selectedItems: [
              {
                id: 'fallback-1',
                name: 'Classic White Shirt',
                category: 'Topwear',
                price: 89,
                image: 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400',
                description: 'A timeless white button-down shirt',
                inStock: true,
                storeLocation: 'A1-B2'
              },
              {
                id: 'fallback-2',
                name: 'Dark Denim Jeans',
                category: 'Bottomwear',
                price: 129,
                image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
                description: 'Premium dark wash denim jeans',
                inStock: true,
                storeLocation: 'C3-D4'
              }
            ]
          })
          nextStep()
        }, 3000)
      }
    }

    processRecommendations()
  }, [formData, nextStep, updateFormData])

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <>
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
          </>
        )

      case 'success':
        return (
          <>
            <div className="mb-8">
              <Sparkles className="h-16 w-16 text-green-600 mx-auto" />
            </div>

            <h1 className="text-3xl font-light text-gray-900 mb-4">
              Perfect! Your curated look is ready
            </h1>
            
            <p className="text-gray-600 mb-8">
              Ray has found some amazing pieces just for you
            </p>
          </>
        )

      case 'error':
        return (
          <>
            <div className="mb-8">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto" />
            </div>

            <h1 className="text-3xl font-light text-gray-900 mb-4">
              Having trouble connecting...
            </h1>
            
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Don't worry! We'll show you some great options while we reconnect.
            </p>

            <div className="flex justify-center">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center animate-fade-in">
      {renderContent()}
    </div>
  )
}