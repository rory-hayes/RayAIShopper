import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Sparkles, RotateCcw, ShoppingBag, X, Eye, RefreshCw, Heart, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { useWizard } from '../../contexts/WizardContext'
import { useChatContext } from '../../contexts/ChatContext'
import { RecommendationItem } from '../../types'
import { apiService } from '../../services/api'
import { VirtualTryOnModal } from '../ui/VirtualTryOnModal'
import { stepLogger } from '../../utils/logger'

// Mock data for fallback
const mockRecommendations: RecommendationItem[] = [
  {
    id: 'mock-1',
    name: 'Classic White T-Shirt',
    category: 'Tops',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
    description: 'Essential white cotton t-shirt',
    inStock: true,
    storeLocation: 'Available in store and online',
    similarity_score: 0.9,
    article_type: 'T-shirt',
    color: 'White',
    usage: 'Casual wear'
  },
  {
    id: 'mock-2', 
    name: 'Dark Denim Jeans',
    category: 'Bottoms',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&crop=center',
    description: 'Classic dark wash denim jeans',
    inStock: true,
    storeLocation: 'Available in store and online',
    similarity_score: 0.85,
    article_type: 'Jeans',
    color: 'Dark Blue',
    usage: 'Casual wear'
  }
]

interface Step6OutfitRailProps {
  onNext: () => void
}

export const Step6OutfitRail: React.FC<Step6OutfitRailProps> = ({ onNext }) => {
  const { formData, updateFormData } = useWizard()
  const { setSessionId, syncWithWizard } = useChatContext()
  
  // Core state
  const [displayedItems, setDisplayedItems] = useState<RecommendationItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [tryOnData, setTryOnData] = useState<{
    item: RecommendationItem
    selfieBase64: string
  } | null>(null)
  
  // State for refreshing functionality
  const [refreshCount, setRefreshCount] = useState(0)
  
  // Interaction states
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())
  const [isReplacingItem, setIsReplacingItem] = useState<string | null>(null)

  // Determine which data to use for recommendations
  const getRecommendationsToDisplay = useCallback((): RecommendationItem[] => {
    stepLogger.debug('STEP6', 'Determining data source for recommendations')
    stepLogger.debug('STEP6', 'cachedRecommendations count', formData.cachedRecommendations?.length || 0)
    stepLogger.debug('STEP6', 'selectedItems count', formData.selectedItems?.length || 0)
    stepLogger.debug('STEP6', 'hasLoadedRecommendations', formData.hasLoadedRecommendations)
    
    // Use cached recommendations if available and we haven't loaded fresh ones
    if (formData.cachedRecommendations && formData.cachedRecommendations.length > 0 && !formData.hasLoadedRecommendations) {
      stepLogger.info('STEP6', 'Using cached recommendations')
      return formData.cachedRecommendations
    }
    
    // Use fresh API data from selectedItems if available
    if (formData.selectedItems && formData.selectedItems.length > 0) {
      stepLogger.info('STEP6', 'Using selectedItems (fresh API data)')
      return formData.selectedItems
    }
    
    // Fallback to mock data
    stepLogger.info('STEP6', 'Using fallback mock data')
    return mockRecommendations
  }, [formData.cachedRecommendations, formData.selectedItems, formData.hasLoadedRecommendations])

  // Replace a disliked item with a new recommendation
  const replaceDislikedItem = useCallback(async (removedItemId: string): Promise<RecommendationItem | null> => {
    stepLogger.info('STEP6', 'Attempting to replace item', removedItemId)
    
    const recommendations = getRecommendationsToDisplay()
    const displayedIds = new Set(displayedItems.map(item => item.id))
    const availableForRotation = recommendations.filter(item => !displayedIds.has(item.id))
    
    stepLogger.debug('STEP6', 'Available for rotation count', availableForRotation.length)
    
    // First try: rotate from existing recommendations
    if (availableForRotation.length > 0) {
      const newItem = availableForRotation[0]
      stepLogger.info('STEP6', 'Replacing with item from pool', newItem.name)
      return newItem
    }
    
    // Second try: fetch fresh recommendations from API
    if (formData.sessionId) {
      stepLogger.info('STEP6', 'No items left in pool, fetching fresh recommendations')
      
      try {
        const freshItems = await fetchFreshRecommendations([removedItemId])
        stepLogger.debug('STEP6', 'API returned fresh items count', freshItems.length)
        if (freshItems.length > 0) {
          return freshItems[0]
        }
      } catch (error) {
        stepLogger.error('STEP6', 'Failed to fetch fresh recommendations', error)
      }
    } else {
      stepLogger.error('STEP6', 'No session ID available for fresh recommendations')
    }
    
    // Last resort: check for ANY non-displayed items
    const allRecommendations = [...(formData.selectedItems || []), ...(formData.cachedRecommendations || [])]
    const allDisplayedIds = new Set(displayedItems.map(item => item.id))
    const fallbackItems = allRecommendations.filter(item => !allDisplayedIds.has(item.id))
    
    if (fallbackItems.length > 0) {
      const fallbackItem = fallbackItems[0]
      stepLogger.info('STEP6', 'Using non-displayed item as fallback', fallbackItem.name)
      return fallbackItem
    }
    
    stepLogger.error('STEP6', 'No replacement items available')
    return null
  }, [displayedItems, formData.sessionId, formData.selectedItems, formData.cachedRecommendations, getRecommendationsToDisplay])

  // Fetch fresh recommendations from API
  const fetchFreshRecommendations = useCallback(async (excludeIds: string[] = []): Promise<RecommendationItem[]> => {
    if (!formData.sessionId) {
      stepLogger.error('STEP6', 'No session ID available for fresh recommendations')
      return []
    }

    try {
      const freshResponse = await apiService.refreshRecommendations({
        session_id: formData.sessionId,
        exclude_ids: excludeIds,
        count: 3
      })

      if (freshResponse && freshResponse.length > 0) {
        return freshResponse.map((item: any) => ({
          id: item.id || `fresh-${Date.now()}-${Math.random()}`,
          name: item.name || 'Fresh Recommendation',
          category: item.category || 'Unknown',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          image: item.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center',
          description: item.description || 'Fresh recommendation based on your preferences',
          inStock: item.inStock !== false,
          storeLocation: item.store_location || 'Available online',
          similarity_score: item.similarity_score || 0.8,
          article_type: item.article_type || item.category,
          color: item.color || 'Multi',
          usage: item.usage || 'General'
        }))
    } else {
        stepLogger.error('STEP6', 'No fresh items available from API')
        return []
      }
    } catch (error) {
      stepLogger.error('STEP6', 'Failed to get fresh items from API', error)
      return []
    }
  }, [formData.sessionId])

  // Handle item feedback
  const handleFeedback = useCallback(async (item: RecommendationItem, action: 'like' | 'dislike') => {
    try {
      // Update local state immediately for better UX
      if (action === 'like') {
        setLikedItems(prev => new Set([...prev, item.id]))
      }
      
      // Send feedback to backend (fire and forget for now)
      if (formData.sessionId) {
        apiService.sendFeedback({
          session_id: formData.sessionId,
          product_id: item.id,
          action: action,
          reason: action === 'dislike' ? 'User did not like this item' : 'User liked this item'
        }).catch(err => stepLogger.error('STEP6', 'Feedback error', err))
      }
    } catch (error) {
      stepLogger.error('STEP6', 'Error handling feedback', error)
    }
  }, [formData.sessionId])

  // Handle dislike with item replacement
  const handleDislike = useCallback(async (item: RecommendationItem) => {
    stepLogger.info('STEP6', 'User disliked item', item.name)
    
    setIsReplacingItem(item.id)
    
    try {
      // Send dislike feedback
      await handleFeedback(item, 'dislike')
      
      // Try to replace the item
      const replacementItem = await replaceDislikedItem(item.id)
      
      if (replacementItem) {
        // Update displayed items
        setDisplayedItems(prev => 
          prev.map(displayedItem => 
            displayedItem.id === item.id ? replacementItem : displayedItem
          )
        )
        
        // Update formData to include the new item and exclude the disliked one
        const updatedItems = (formData.selectedItems || [])
          .filter(selectedItem => selectedItem.id !== item.id)
          .concat([replacementItem])
        
        updateFormData({ selectedItems: updatedItems })
      } else {
        stepLogger.error('STEP6', 'Replacement failed, keeping item visible')
      }
    } catch (error) {
      stepLogger.error('STEP6', 'Error in handleDislike', error)
    } finally {
      setIsReplacingItem(null)
    }
  }, [handleFeedback, replaceDislikedItem, formData.selectedItems, updateFormData])

  // Handle virtual try-on
  const handleTryOn = useCallback(async (itemId: string) => {
    stepLogger.info('STEP6', 'handleTryOn called for itemId', itemId)
    
    const recommendations = getRecommendationsToDisplay()
    const item = recommendations.find(r => r.id === itemId)
    
    if (!item) {
      stepLogger.error('STEP6', 'Item not found for id', itemId)
      return
    }
    
    stepLogger.debug('STEP6', 'Found item', item.name)
    stepLogger.debug('STEP6', 'Checking selfie availability', !!formData.selfieImage)
    
    if (!formData.selfieImage) {
      stepLogger.error('STEP6', 'No selfie found, showing toast')
      // Show a toast or modal to inform user they need to upload a selfie
      alert('Please upload a selfie in Step 4 to use the virtual try-on feature!')
      return
    }
    
    stepLogger.info('STEP6', 'Selfie found, starting FileReader')
    
    // Convert selfie to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target?.result as string
      
      stepLogger.debug('STEP6', 'Setting up try-on data for item', item.name)
      stepLogger.debug('STEP6', 'Base64 data length', base64Data.length)
      
      setTryOnData({
        item,
        selfieBase64: base64Data
      })
      
      stepLogger.info('STEP6', 'Modal state set, should show now')
      setShowTryOnModal(true)
    }
    reader.readAsDataURL(formData.selfieImage)
  }, [formData.selfieImage, getRecommendationsToDisplay])

  // Handle item selection for checkout
  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  // Convert clothing items to standard format and set up display
  useEffect(() => {
    const recommendationsToDisplay = getRecommendationsToDisplay()
    
    stepLogger.debug('STEP6', 'Available recommendations count', recommendationsToDisplay.length)

    // Show the first 6 items for selection
    const itemsToShow = recommendationsToDisplay.slice(0, 6)
    setDisplayedItems(itemsToShow)
    
    // Sync with chat context
    syncWithWizard({ formData, currentStep: 6 })
  }, [formData.selectedItems, formData.cachedRecommendations, getRecommendationsToDisplay, syncWithWizard, formData])

  // Main effect to fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      // Skip if we already have cached recommendations or fresh data
      if ((formData.cachedRecommendations && formData.cachedRecommendations.length > 0) || 
          (formData.selectedItems && formData.selectedItems.length > 0 && formData.hasLoadedRecommendations)) {
        stepLogger.info('STEP6', 'Skipping API call - using cached data or already loaded')
        return
      }

      // Skip if no shopping prompt (required for recommendations)
      if (!formData.shoppingPrompt) {
        stepLogger.info('STEP6', 'Skipping API call - no shopping prompt provided')
        return
      }

      setIsLoading(true)
      
      try {
        stepLogger.info('STEP6', 'Fetching fresh recommendations from API')
        
        const userProfile = {
          shopping_prompt: formData.shoppingPrompt,
          gender: formData.gender,
          preferred_styles: formData.preferredStyles,
          preferred_colors: formData.preferredColors,
          preferred_article_types: formData.preferredArticleTypes
        }

        const response = await apiService.getRecommendations({
          user_profile: userProfile
        })
        
        stepLogger.info('STEP6', 'Received recommendations count', response.recommendations.length)
        stepLogger.debug('STEP6', 'Session ID from response', response.session_id)
        
        const processedRecommendations = response.recommendations.map((item: any, index: number) => ({
          id: item.id || `rec-${Date.now()}-${index}`,
          name: item.name || 'Recommended Item',
          category: item.category || 'Unknown',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          image: item.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center',
          description: item.description || 'Recommended based on your preferences',
          inStock: item.inStock !== false,
          storeLocation: item.store_location || 'Available online',
          similarity_score: item.similarity_score || 0.9,
          article_type: item.article_type || item.category,
          color: item.color || 'Multi',
          usage: item.usage || 'General'
        }))

        // Update form data with recommendations and session ID
        updateFormData({ 
          selectedItems: processedRecommendations,
          sessionId: response.session_id,
          hasLoadedRecommendations: true
        })

        // Update chat context with session ID
        if (response.session_id) {
          stepLogger.debug('STEP6', 'Setting session ID in chat context', response.session_id)
          setSessionId(response.session_id)
        }

      } catch (error) {
        stepLogger.error('STEP6', 'Failed to fetch recommendations', error)
        
        // Use fallback mock data
        updateFormData({ 
          selectedItems: mockRecommendations,
          hasLoadedRecommendations: true
        })
        
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [formData.shoppingPrompt, formData.gender, formData.preferredStyles, formData.preferredColors, formData.preferredArticleTypes, updateFormData, setSessionId, formData.cachedRecommendations, formData.selectedItems, formData.hasLoadedRecommendations])

  // Handle "More Options" - refresh some items
  const handleMoreOptions = useCallback(async () => {
    if (displayedItems.length === 0) return
    
    const idsToReplace = displayedItems.slice(0, 2).map(item => item.id) // Replace first 2 items
    stepLogger.info('STEP6', 'Replacing items', idsToReplace)
    
    setRefreshCount(prev => prev + 1)
    
    try {
      const freshItems = await fetchFreshRecommendations(idsToReplace)
      
      if (freshItems.length > 0) {
        setDisplayedItems(prev => {
          const updated = [...prev]
          freshItems.forEach((freshItem, index) => {
            if (index < 2) { // Replace first 2 items
              updated[index] = freshItem
            }
          })
          return updated
        })
      }
    } catch (error) {
      stepLogger.error('STEP6', 'Error in handleMoreOptions', error)
    }
  }, [displayedItems, fetchFreshRecommendations])

  const handleNext = () => {
    // Only pass the items that the user has explicitly selected
    const userSelectedItems = displayedItems.filter(item => selectedItems.has(item.id))
    
    stepLogger.info('STEP6', 'User selected items for checkout', {
      totalDisplayed: displayedItems.length,
      userSelected: userSelectedItems.length,
      selectedIds: Array.from(selectedItems)
    })
    
    updateFormData({ selectedItems: userSelectedItems })
    onNext()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-600" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Your Recommendations</h2>
          <p className="text-gray-600">Curating the perfect items for you...</p>
        </div>
      </div>
    )
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-light text-gray-900 mb-4">Your Personalized Recommendations</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Based on your style preferences, here are items curated just for you. Select the ones you'd like to add to your cart.
          </p>
        </div>

        {/* Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {displayedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="relative group">
                  <img
                    src={item.image}
                    alt={item.name}
                  className="w-full h-64 object-cover"
                />
                
                {/* Action Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTryOn(item.id)}
                    className="bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Try On
                  </Button>

        <Button
          variant="secondary"
                    size="sm"
                    onClick={() => handleFeedback(item, 'like')}
                    className={`transition-colors ${
                      likedItems.has(item.id) 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
                    {likedItems.has(item.id) ? 'Liked' : 'Like'}
        </Button>
      </div>

                {/* Loading overlay for item being replaced */}
                {isReplacingItem === item.id && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-600" />
                      <p className="text-sm text-gray-600">Finding new item...</p>
        </div>
      </div>
                )}

                {/* Selection indicator */}
                {selectedItems.has(item.id) && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full">
                    <Check className="h-4 w-4" />
        </div>
      )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-medium text-gray-900">{item.name}</h3>
                  <span className="text-xl font-semibold text-gray-900">${item.price}</span>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.category}
                  </span>
                  <span className="text-sm text-gray-500">{item.storeLocation}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleDislike(item)}
                    variant="secondary"
                    size="sm"
                    disabled={isReplacingItem === item.id}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {isReplacingItem === item.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Replacing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Replace
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleSelectItem(item.id)}
                    size="sm"
                    className={`flex-1 transition-colors ${
                      selectedItems.has(item.id)
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    {selectedItems.has(item.id) ? 'Selected' : 'Select'}
                  </Button>
                </div>
            </div>
          </div>
        ))}
      </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
            onClick={handleMoreOptions}
          variant="secondary"
            size="lg"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
            <RefreshCw className="h-5 w-5 mr-2" />
            More Options
        </Button>
          
        <Button
            onClick={handleNext}
            size="lg"
            disabled={selectedItems.size === 0}
            className="bg-gray-900 hover:bg-gray-800 text-white px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Checkout ({selectedItems.size} items)
            <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
        </div>

        {/* Virtual Try-On Modal */}
        {showTryOnModal && tryOnData && (
          <VirtualTryOnModal
            isOpen={showTryOnModal}
            onClose={() => {
              setShowTryOnModal(false)
              setTryOnData(null)
            }}
            productId={tryOnData.item.id}
            productName={tryOnData.item.name}
            productImage={tryOnData.item.image}
            userSelfie={tryOnData.selfieBase64}
          />
        )}
      </div>
    </div>
  )
}