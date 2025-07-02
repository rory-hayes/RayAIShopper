import React, { useState, useEffect } from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { convertToUserProfile, apiService } from '../../services/api'
import { stepLogger } from '../../utils/logger'

export const Step5AIWorking: React.FC = () => {
  const { formData, updateFormData, nextStep } = useWizard()
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'fallback'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const [hasProcessed, setHasProcessed] = useState(false)

  useEffect(() => {
    if (hasProcessed) {
      stepLogger.debug('STEP5', 'Skipping API call - already processed')
      return
    }

    if (formData.selectedItems && formData.selectedItems.length > 0 && formData.hasLoadedRecommendations) {
      stepLogger.debug('STEP5', 'Skipping API call - already have recommendations')
      return
    }

    const processRecommendations = async () => {
      setHasProcessed(true)
      
      try {
        stepLogger.info('STEP5', 'Starting API call')
        
        const userProfile = convertToUserProfile(formData)
        stepLogger.debug('STEP5', 'User Profile created', userProfile)

        // Process inspiration images
        const inspirationImages: string[] = []
        
        if (formData.inspirationImages && formData.inspirationImages.length > 0) {
          stepLogger.info('STEP5', `Processing ${formData.inspirationImages.length} inspiration images`)
          
          for (const [index, file] of formData.inspirationImages.entries()) {
            if (file && typeof file === 'object' && file.constructor === File) {
              stepLogger.debug('STEP5', `Valid file: ${file.name}, type: ${file.type}, size: ${file.size}`)
            } else {
              stepLogger.warn('STEP5', `Skipping invalid file object:`, typeof file, file)
              continue
            }
          }
          
          if (inspirationImages.length === 0) {
            stepLogger.info('STEP5', 'No valid image files found')
          }

          // Convert images to base64
          for (const [index, file] of formData.inspirationImages.entries()) {
            if (!(file instanceof File)) continue
            
            try {
              stepLogger.debug('STEP5', `Converting file ${index + 1}:`, file.name, file.type, file.size)
              
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  stepLogger.debug('STEP5', `Successfully converted file ${index + 1} to base64, length: ${result.length}`)
                  resolve(result)
                }
                reader.onerror = () => {
                  stepLogger.error('STEP5', `Error reading file ${index + 1}:`, reader.error)
                  reject(reader.error)
                }
                reader.readAsDataURL(file)
              })
              
              // Process the base64 string
              try {
                if (!base64.startsWith('data:image/')) {
                  stepLogger.error('STEP5', 'Invalid base64 format - missing data:image/ prefix')
                  continue
                }

                // Extract just the base64 data (remove data:image/jpeg;base64, prefix)
                const base64Data = base64.split(',')[1]
                
                if (!base64Data) {
                  stepLogger.error('STEP5', 'Empty base64 data after cleaning')
                  continue
                }

                stepLogger.debug('STEP5', `Processed base64 image, length: ${base64Data.length}`)
                inspirationImages.push(base64Data)
                
              } catch (error) {
                stepLogger.error('STEP5', 'Error converting base64:', error)
                continue
              }
              
            } catch (error) {
              stepLogger.error('STEP5', `Error processing file ${index + 1}:`, error)
              continue
            }
          }
        } else {
          stepLogger.info('STEP5', 'No inspiration images provided')
        }
        
        stepLogger.info('STEP5', 'Final inspiration images count:', inspirationImages.length)
        if (inspirationImages.length > 0) {
          stepLogger.debug('STEP5', 'Sample base64 length:', inspirationImages[0]?.length || 0)
          stepLogger.debug('STEP5', 'First few characters:', inspirationImages[0]?.substring(0, 50) || 'none')
        }

        // Continue with API call
        stepLogger.info('STEP5', 'Inspiration Images Count:', inspirationImages.length)
        stepLogger.debug('STEP5', 'Form Data summary', { 
          hasShoppingPrompt: !!formData.shoppingPrompt,
          gender: formData.gender,
          stylesCount: formData.preferredStyles?.length || 0,
          colorsCount: formData.preferredColors?.length || 0
        })

        // Call the backend API
        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          inspiration_images: inspirationImages.length > 0 ? inspirationImages : undefined,
          exclude_ids: [] // No exclusions on first request
        })
        
        stepLogger.info('STEP5', 'API Response received', {
          recommendationsCount: response.recommendations?.length,
          sessionId: response.session_id
        })
        
        // Validate response structure
        if (!response || !response.recommendations || !Array.isArray(response.recommendations)) {
          throw new Error('Invalid response structure from backend')
        }

        if (response.recommendations.length === 0) {
          throw new Error('No recommendations returned from backend')
        }

        // Update form data with real recommendations - keep all for rotation but don't auto-advance
        const selectedItems = response.recommendations.map((item: any, index: number) => {
          stepLogger.debug('STEP5', `Processing item ${index}:`, item.name)
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
        
        updateFormData({ 
          selectedItems,
          sessionId: response.session_id,
          hasLoadedRecommendations: true 
        })
        
        stepLogger.info('STEP5', 'Successfully updated form data', {
          itemsCount: selectedItems.length,
          sessionId: response.session_id
        })
        
        setStatus('success')
        
        // Show success message briefly, then automatically advance to Step 6
        setTimeout(() => {
          nextStep()
        }, 1500) // Shorter delay, then auto-advance

      } catch (error) {
        stepLogger.error('STEP5', 'Failed to fetch recommendations:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to get recommendations')
        
        // Show error, then offer to continue with fallback
        setTimeout(() => {
          setStatus('fallback')
        }, 3000)
      }
    }

    processRecommendations()
  }, [formData, updateFormData, hasProcessed, nextStep])

  const handleContinue = () => {
    nextStep()
  }

  const handleRetry = () => {
    setHasProcessed(false)
    setStatus('processing')
    setErrorMessage('')
  }

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
              Taking you to your recommendations...
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
              Don't worry! We'll try again or show you some great options.
            </p>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRetry}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        )

      case 'fallback':
        return (
          <>
            <div className="mb-8">
              <Sparkles className="h-16 w-16 text-blue-600 mx-auto" />
            </div>

            <h1 className="text-3xl font-light text-gray-900 mb-4">
              We'll use some great backup recommendations
            </h1>
            
            <p className="text-gray-600 mb-8">
              While we fix the connection, here are some excellent items for you.
            </p>

            <button
              onClick={() => {
                // Set fallback recommendations and continue
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
                      storeLocation: 'A1-B2',
                      article_type: 'Shirt',
                      color: 'White'
                    },
                    {
                      id: 'fallback-2',
                      name: 'Dark Denim Jeans',
                      category: 'Bottomwear',
                      price: 129,
                      image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
                      description: 'Premium dark wash denim jeans',
                      inStock: true,
                      storeLocation: 'C3-D4',
                      article_type: 'Jeans',
                      color: 'Dark Blue'
                    }
                  ],
                  hasLoadedRecommendations: true
                })
                handleContinue()
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              View Backup Recommendations
            </button>
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