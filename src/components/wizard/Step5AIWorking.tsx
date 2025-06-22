import React, { useEffect, useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { apiService, convertToUserProfile, convertFromBase64 } from '../../services/api'
import { Sparkles, AlertCircle } from 'lucide-react'

export const Step5AIWorking: React.FC = () => {
  const { formData, nextStep, updateFormData } = useWizard()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [hasProcessed, setHasProcessed] = useState(false)

  useEffect(() => {
    // Skip if we already have recommendations or have already processed
    if (formData.selectedItems.length > 0 || hasProcessed) {
      console.log('🔥 DEBUG: Skipping API call - already have recommendations or processed')
      setStatus('success')
      setTimeout(() => nextStep(), 1500)
      return
    }

    const processRecommendations = async () => {
      try {
        setHasProcessed(true) // Mark as processed immediately to prevent double execution
        setStatus('processing')

        console.log('🔥 DEBUG: Starting API call...')

        // Convert form data to API format
        const userProfile = convertToUserProfile(formData)
        console.log('User Profile:', userProfile)
        console.log('🔥 STEP5 DEBUG: Detailed User Profile:')
        console.log('  - shopping_prompt:', userProfile.shopping_prompt)
        console.log('  - gender:', userProfile.gender)
        console.log('  - preferred_styles:', userProfile.preferred_styles)
        console.log('  - preferred_colors:', userProfile.preferred_colors)
        console.log('  - size:', userProfile.size)

        // Prepare inspiration images with robust error handling
        let inspirationImages: string[] = []
        try {
          if (formData.inspirationImages && Array.isArray(formData.inspirationImages)) {
            console.log('🔥 Processing inspiration images...', formData.inspirationImages.length, 'files')
            
            // Convert File objects to base64
            const imagePromises = formData.inspirationImages.map(async (file: File, index: number) => {
              try {
                console.log(`🔥 Converting file ${index + 1}:`, file.name, file.type, file.size)
                
                return new Promise<string>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const base64 = reader.result as string
                    console.log(`🔥 Successfully converted file ${index + 1} to base64`)
                    resolve(base64)
                  }
                  reader.onerror = () => {
                    console.error(`🔥 Error reading file ${index + 1}:`, reader.error)
                    reject(reader.error)
                  }
                  reader.readAsDataURL(file)
                })
              } catch (error) {
                console.error(`🔥 Error processing file ${index + 1}:`, error)
                return ''
              }
            })
            
            // Wait for all images to be converted
            const base64Images = await Promise.all(imagePromises)
            
            // Filter out empty results and convert to API format
            inspirationImages = base64Images
              .filter(base64 => base64 && base64.trim() !== '')
              .map(base64 => {
                try {
                  // Remove data:image/jpeg;base64, prefix for API
                  return base64.replace(/^data:image\/[a-z]+;base64,/, '')
                } catch (error) {
                  console.error('Error converting base64:', error)
                  return ''
                }
              })
              .filter(img => img !== '')
              
            console.log('🔥 Final inspiration images count:', inspirationImages.length)
            console.log('🔥 Sample base64 length:', inspirationImages[0]?.length || 0)
          }
        } catch (error) {
          console.error('Error processing inspiration images:', error)
          inspirationImages = []
        }
        
        console.log('Inspiration Images Count:', inspirationImages.length)
        console.log('Form Data:', formData)

        // Call the backend API
        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          inspiration_images: inspirationImages.length > 0 ? inspirationImages : undefined,
          exclude_ids: [] // No exclusions on first request
        })
        
        console.log('API Response:', response)
        console.log('Response recommendations count:', response.recommendations?.length)
        console.log('First recommendation:', response.recommendations?.[0])
        
        // DEBUGGING: Very obvious test to see if this code path is reached
        console.log('🔥 CRITICAL DEBUG: API response received successfully, processing now...')

        // Validate response structure
        if (!response || !response.recommendations || !Array.isArray(response.recommendations)) {
          throw new Error('Invalid response structure from backend')
        }

        if (response.recommendations.length === 0) {
          throw new Error('No recommendations returned from backend')
        }

        // Update form data with real recommendations
        try {
          const selectedItems = response.recommendations.map((item, index) => {
            console.log(`Processing item ${index}:`, item)
            return {
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
            }
          })
          
          updateFormData({ selectedItems })
          console.log('Successfully updated form data with real recommendations')
          console.log('🔥 STEP5 DEBUG: selectedItems being saved:', selectedItems.length, 'items')
          console.log('🔥 STEP5 DEBUG: First item being saved:', selectedItems[0])
          
          // Add a small delay to ensure state update propagates
          setTimeout(() => {
            console.log('🔥 STEP5 DEBUG: About to call nextStep after state update delay')
            setStatus('success')
            
            // Move to next step after brief success display AND state propagation
            setTimeout(() => {
              console.log('🔥 STEP5 DEBUG: Calling nextStep now')
              nextStep()
            }, 1500)
          }, 100) // Small delay to ensure state update

        } catch (mappingError) {
          console.error('Error mapping recommendations:', mappingError)
          throw new Error(`Failed to process recommendations: ${mappingError}`)
        }

      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to get recommendations')
        
        // Fallback to mock data after 5 seconds
        setTimeout(() => {
          console.log('Using fallback mock data after API timeout/error')
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
        }, 5000)
      }
    }

    processRecommendations()
  }, []) // Empty dependency array to run only once

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