import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Sparkles, RotateCcw, ShoppingBag, X, Eye, RefreshCw, Heart, Check, Loader2, ChevronRight, ChevronLeft, ThumbsDown } from 'lucide-react'
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
  
  // Category organization state
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [categorizedItems, setCategorizedItems] = useState<Record<string, RecommendationItem[]>>({})
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  
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

  // Organize items by category
  const organizeItemsByCategory = useCallback((items: RecommendationItem[]) => {
    const categorized: Record<string, RecommendationItem[]> = {}
    
    // PRODUCTION DEBUG - Remove after fixing
    console.log('🔍 STEP6 DEBUG - Starting categorization with items:', {
      itemCount: items.length,
      sampleArticleTypes: items.slice(0, 5).map(item => item.article_type)
    })
    
    items.forEach(item => {
      // Use article_type for categorization instead of category (which is masterCategory)
      const category = item.article_type || item.category || 'Other'
      if (!categorized[category]) {
        categorized[category] = []
      }
      categorized[category].push(item)
    })
    
    // PRODUCTION DEBUG - Remove after fixing
    console.log('🔍 STEP6 DEBUG - Categorization Results:', {
      totalCategories: Object.keys(categorized).length,
      categories: Object.keys(categorized),
      categoryDistribution: Object.entries(categorized).map(([cat, items]) => ({
        category: cat,
        itemCount: items.length
      }))
    })
    
    setCategorizedItems(categorized)
    
    // Get available categories (only those with items)
    const categories = Object.keys(categorized).sort()
    setAvailableCategories(categories)
    
    // Set default category to first available or 'All'
    if (categories.length > 1) {
      setSelectedCategory('All')
    } else if (categories.length === 1) {
      setSelectedCategory(categories[0])
    }
    
    stepLogger.debug('STEP6', 'Organized items by article_type:', categorized)
    stepLogger.debug('STEP6', 'Available categories:', categories)
  }, [])

  // Get items for current category
  const getItemsForCategory = useCallback((category: string): RecommendationItem[] => {
    if (category === 'All') {
      // Show first 3 items from each category for variety in 'All' view
      const allItems: RecommendationItem[] = []
      availableCategories.forEach(cat => {
        const itemsInCategory = categorizedItems[cat] || []
        // Take first 3 items from each category for 'All' view
        allItems.push(...itemsInCategory.slice(0, 3))
      })
      return allItems
    }
    
    // Show first 6 items for individual categories (out of 20 available)
    const categoryItems = categorizedItems[category] || []
    return categoryItems.slice(0, 6)
  }, [categorizedItems, availableCategories])

  // Replace a disliked item with a new recommendation
  const replaceDislikedItem = useCallback(async (removedItemId: string): Promise<RecommendationItem | null> => {
    stepLogger.info('STEP6', 'Attempting to replace item', removedItemId)
    
    const recommendations = getRecommendationsToDisplay()
    const displayedIds = new Set(displayedItems.map(item => item.id))
    const availableForRotation = recommendations.filter(item => !displayedIds.has(item.id))
    
    stepLogger.debug('STEP6', 'Replacement Details:', {
      totalRecommendations: recommendations.length,
      displayedCount: displayedItems.length,
      availableForRotation: availableForRotation.length,
      sessionId: formData.sessionId
    })
    
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
          category: item.masterCategory || item.category || 'Unknown',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          image: item.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center',
          description: item.description || 'Fresh recommendation based on your preferences',
          inStock: item.inStock !== false,
          storeLocation: item.store_location || 'Available online',
          similarity_score: item.similarity_score || 0.8,
          article_type: item.articleType || item.article_type || item.subCategory || 'Unknown',
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

    if (recommendationsToDisplay.length > 0) {
      // Organize items by category
      organizeItemsByCategory(recommendationsToDisplay)
    }
    
    // Sync with chat context
    syncWithWizard({ formData, currentStep: 6 })
  }, [formData.selectedItems, formData.cachedRecommendations, getRecommendationsToDisplay, organizeItemsByCategory, syncWithWizard, formData])

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
        
        stepLogger.info('STEP6', 'Sending API Request:', {
          userProfile,
          itemsPerCategory: 20
        })
        
        // PRODUCTION DEBUG - Remove after fixing
        console.log('🔍 STEP6 DEBUG - API Request:', {
          userProfile,
          itemsPerCategory: 20,
          preferredArticleTypes: formData.preferredArticleTypes,
          fullApiPayload: {
            user_profile: userProfile,
            items_per_category: 20
          },
          originalFormData: {
            gender: formData.gender,
            shoppingPrompt: formData.shoppingPrompt,
            preferredStyles: formData.preferredStyles,
            preferredColors: formData.preferredColors,
            preferredArticleTypes: formData.preferredArticleTypes
          }
        })

        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          items_per_category: 20 // Request 20 items per article type
        })
        
        // PRODUCTION DEBUG - Remove after fixing
        console.log('🔍 STEP6 DEBUG - Raw API Response Structure:', {
          totalRecommendations: response.recommendations.length,
          sessionId: response.session_id,
          // Access raw response before processing
          firstFewRawItems: response.recommendations.slice(0, 3).map((item: any) => ({
            name: item.name,
            category: item.category,
            masterCategory: item.masterCategory,
            article_type: item.article_type,
            articleType: item.articleType
          })),
          // Show ALL article types in response
          allRawArticleTypes: response.recommendations.map((item: any) => 
            item.articleType || item.article_type || 'Unknown'
          ),
          uniqueRawArticleTypes: [...new Set(response.recommendations.map((item: any) => 
            item.articleType || item.article_type || 'Unknown'
          ))]
        })
        
        stepLogger.info('STEP6', 'API Response Details:', {
          totalRecommendations: response.recommendations.length,
          sessionId: response.session_id,
          firstItemStructure: response.recommendations[0] || null
        })
        
        // Debug: Log the structure of the first few items
        response.recommendations.slice(0, 3).forEach((item: any, index: number) => {
          stepLogger.debug('STEP6', `API Item ${index + 1} Raw Structure:`, {
            id: item.id,
            name: item.name,
            category: item.category,
            masterCategory: item.masterCategory,
            subCategory: item.subCategory,
            article_type: item.article_type,
            articleType: item.articleType
          })
        })
        
        stepLogger.info('STEP6', 'Received recommendations count', response.recommendations.length)
        stepLogger.debug('STEP6', 'Session ID from response', response.session_id)
        
        const processedRecommendations = response.recommendations.map((item: any, index: number) => ({
          id: item.id || `rec-${Date.now()}-${index}`,
          name: item.name || 'Recommended Item',
          category: item.masterCategory || item.category || 'Unknown',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          image: item.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center',
          description: item.description || 'Recommended based on your preferences',
          inStock: item.inStock !== false,
          storeLocation: item.store_location || 'Available online',
          similarity_score: item.similarity_score || 0.9,
          article_type: item.articleType || item.article_type || item.subCategory || 'Unknown',
          color: item.color || 'Multi',
          usage: item.usage || 'General'
        }))

        // Debug processed items
        stepLogger.debug('STEP6', 'First 3 Processed Items:', 
          processedRecommendations.slice(0, 3).map(item => ({
            name: item.name,
            category: item.category,
            article_type: item.article_type
          }))
        )
        
        // PRODUCTION DEBUG - Remove after fixing
        console.log('🔍 STEP6 DEBUG - Processed Items for Categorization:', {
          totalProcessed: processedRecommendations.length,
          sampleItems: processedRecommendations.slice(0, 5).map(item => ({
            name: item.name,
            category: item.category,
            article_type: item.article_type
          })),
          allArticleTypes: [...new Set(processedRecommendations.map(item => item.article_type))]
        })

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

  // Handle "More Options" - refresh some items in current category
  const handleMoreOptions = useCallback(async () => {
    if (selectedCategory === 'All') {
      // For 'All' view, refresh 1 item from each category
      const allItems = getRecommendationsToDisplay()
      organizeItemsByCategory(allItems) // Re-organize to refresh display
      return
    }

    // For specific category, cycle through more items from that category
    const categoryItems = categorizedItems[selectedCategory] || []
    if (categoryItems.length > 6) {
      // Rotate items: move first 3 to end, show next 3
      const rotatedItems = [...categoryItems.slice(3), ...categoryItems.slice(0, 3)]
      setCategorizedItems(prev => ({
        ...prev,
        [selectedCategory]: rotatedItems
      }))
      stepLogger.info('STEP6', `Rotated items in category: ${selectedCategory}`)
    } else {
      // If less than 6 items, try to fetch fresh ones from API
      try {
        const idsToReplace = displayedItems.slice(0, 2).map(item => item.id)
        const freshItems = await fetchFreshRecommendations(idsToReplace)
        
        if (freshItems.length > 0) {
          // Add fresh items to current category
          setCategorizedItems(prev => ({
            ...prev,
            [selectedCategory]: [...(prev[selectedCategory] || []), ...freshItems]
          }))
        }
      } catch (error) {
        stepLogger.error('STEP6', 'Error in handleMoreOptions', error)
      }
    }
  }, [selectedCategory, categorizedItems, displayedItems, fetchFreshRecommendations, getRecommendationsToDisplay, organizeItemsByCategory])

  // Update displayed items when category changes
  useEffect(() => {
    const itemsToShow = getItemsForCategory(selectedCategory)
    setDisplayedItems(itemsToShow)
    stepLogger.debug('STEP6', `Showing ${itemsToShow.length} items for category: ${selectedCategory}`)
    
    // PRODUCTION DEBUG - Remove after fixing
    console.log('🔍 STEP6 DEBUG - Items Display Update:', {
      selectedCategory,
      itemsToShow: itemsToShow.length,
      availableCategories,
      categorizedItemsKeys: Object.keys(categorizedItems)
    })
  }, [selectedCategory, categorizedItems, getItemsForCategory])

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
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-full">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-light text-gray-900 mb-4">Your Personalized Recommendations</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Based on your style preferences, here are items curated just for you. Select the ones you'd like to add to your cart.
        </p>
      </div>

      {/* Category Tabs */}
      {availableCategories.length > 1 && (
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Categories
            </button>
            {availableCategories.map(category => (
          <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {category}
              </button>
            ))}
            </div>
        </div>
      )}

      {/* Items List - Compact Cards like Checkout */}
      <div className="space-y-4 mb-8">
        {displayedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex gap-4">
              <div className="relative">
            <img
              src={item.image}
              alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                  }}
                />
                
                {/* Loading overlay for item being replaced */}
                {isReplacingItem === item.id && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  </div>
                )}

                {/* Selection indicator */}
                {selectedItems.has(item.id) && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <span className="font-medium text-gray-900">${item.price}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-500">{item.storeLocation}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              {/* Thumbs Up */}
                <button
                onClick={() => handleFeedback(item, 'like')}
                className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
                  likedItems.has(item.id) 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Heart className={`h-4 w-4 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
                </button>
                
              {/* Thumbs Down / Replace */}
                <button
                onClick={() => handleDislike(item)}
                disabled={isReplacingItem === item.id}
                className="flex items-center justify-center p-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isReplacingItem === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4" />
                )}
              </button>

              {/* Try On */}
              <button
                onClick={() => handleTryOn(item.id)}
                className="flex items-center justify-center p-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <Eye className="h-4 w-4" />
                </button>
                
              {/* Add to Cart */}
                <button
                onClick={() => handleSelectItem(item.id)}
                className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedItems.has(item.id)
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {selectedItems.has(item.id) ? 'Added' : 'Add to Cart'}
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <Button
          onClick={handleMoreOptions}
          variant="secondary"
          fullWidth
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          More Options
        </Button>
        
        <Button
          onClick={handleNext}
          fullWidth
          size="lg"
          disabled={selectedItems.size === 0}
          className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}