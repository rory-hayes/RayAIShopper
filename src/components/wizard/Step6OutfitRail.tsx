import React, { useState, useEffect } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { useChatContext } from '../../contexts/ChatContext'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { ThumbsUp, ThumbsDown, ShoppingCart, Eye, MapPin, ShoppingBag, X, RefreshCw, Heart, Sparkles, Check, Loader2 } from 'lucide-react'
import { ClothingItem, RecommendationItem } from '../../types'
import { VirtualTryOnModal } from '../ui/VirtualTryOnModal'
import { convertToUserProfile, convertFromBase64, apiService } from '../../services/api'

const mockClothingItems: ClothingItem[] = [
  {
    id: '1',
    name: 'Silk Midi Dress',
    price: '€189',
    description: 'Elegant silk dress perfect for formal occasions',
    image: 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400',
    location: 'Level 2, Women\'s Formal',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '2',
    name: 'Tailored Blazer',
    price: '€249',
    description: 'Professional blazer for business attire',
    image: 'https://images.pexels.com/photos/2343465/pexels-photo-2343465.jpeg?auto=compress&cs=tinysrgb&w=400',
    location: 'Level 2, Women\'s Business',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '3',
    name: 'Designer Heels',
    price: '€159',
    description: 'Comfortable heels for any occasion',
    image: 'https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg?auto=compress&cs=tinysrgb&w=400',
    location: 'Level 1, Shoes',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '4',
    name: 'Statement Necklace',
    price: '€89',
    description: 'Bold necklace to complete your look',
    image: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=400',
    location: 'Level 1, Accessories',
    liked: false,
    disliked: false,
    addedToCart: false
  }
]

export const Step6OutfitRail: React.FC = () => {
  const { formData, updateFormData, nextStep, prevStep } = useWizard()
  const chatContext = useChatContext()
  
  // Convert real recommendations to ClothingItem format
  const convertToClothingItems = (recommendations: RecommendationItem[], interactions?: { liked: string[]; disliked: string[]; addedToCart: string[] }): ClothingItem[] => {
    return recommendations.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      price: `€${item.price}`,
      location: item.storeLocation,
      liked: interactions?.liked.includes(item.id) || false,
      disliked: interactions?.disliked.includes(item.id) || false,
      addedToCart: interactions?.addedToCart.includes(item.id) || false
    }))
  }

  // Determine data source: cached recommendations first, then selectedItems, then mock
  const getInitialRecommendations = (): ClothingItem[] => {
    console.log('🔄 CONTEXT: Determining data source for recommendations')
    console.log('🔄 CONTEXT: cachedRecommendations:', formData.cachedRecommendations?.length || 0)
    console.log('🔄 CONTEXT: selectedItems:', formData.selectedItems?.length || 0)
    console.log('🔄 CONTEXT: hasLoadedRecommendations:', formData.hasLoadedRecommendations)

    // First priority: Use cached recommendations with preserved interactions
    if (formData.cachedRecommendations && formData.cachedRecommendations.length > 0) {
      console.log('✅ CONTEXT: Using cached recommendations')
      return convertToClothingItems(formData.cachedRecommendations, formData.userInteractions)
    }
    
    // Second priority: Use selectedItems (fresh API data)
    if (formData.selectedItems && formData.selectedItems.length > 0) {
      console.log('✅ CONTEXT: Using selectedItems (fresh API data)')
      return convertToClothingItems(formData.selectedItems, formData.userInteractions)
    }
    
    // Fallback: Use mock data
    console.log('⚠️ CONTEXT: Falling back to mock data')
    return mockClothingItems
  }

  // Initialize with recommendations from appropriate source
  const initialRecommendations = getInitialRecommendations()

  // State to track which items are currently displayed (5 at a time)
  const [displayedItemIds, setDisplayedItemIds] = useState<string[]>(formData.displayedItemIds || [])
  const [allItems, setAllItems] = useState<ClothingItem[]>(initialRecommendations)
  const [showTryOn, setShowTryOn] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(formData.sessionId || null)
  const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(formData.hasLoadedRecommendations || false)

  // Initialize displayed items (first 5 from the pool) or restore from cache
  useEffect(() => {
    if (allItems.length > 0 && displayedItemIds.length === 0) {
      const initialIds = allItems.slice(0, 5).map(item => item.id)
      setDisplayedItemIds(initialIds)
    }
  }, [allItems, displayedItemIds.length])

  // Save context to formData whenever state changes
  useEffect(() => {
    const saveContext = () => {
      // Convert ClothingItems back to RecommendationItems for storage
      const recommendationItems: RecommendationItem[] = allItems.map(item => ({
        id: item.id,
        name: item.name,
        category: 'Apparel',
        price: parseInt(item.price.replace('€', '')),
        image: item.image,
        description: item.description,
        inStock: true,
        storeLocation: item.location,
        article_type: 'Unknown',
        color: 'Unknown',
        usage: 'Unknown'
      }))

      // Extract user interactions
      const userInteractions = {
        liked: allItems.filter(item => item.liked).map(item => item.id),
        disliked: allItems.filter(item => item.disliked).map(item => item.id),
        addedToCart: allItems.filter(item => item.addedToCart).map(item => item.id)
      }

      // Update context with current state
      updateFormData({
        cachedRecommendations: recommendationItems,
        userInteractions,
        displayedItemIds,
        hasLoadedRecommendations
      })
    }

    // Debounce context saving to avoid excessive updates
    const timeoutId = setTimeout(saveContext, 500)
    return () => clearTimeout(timeoutId)
  }, [allItems, displayedItemIds, hasLoadedRecommendations, updateFormData])

  // Get currently displayed items
  const displayedItems = allItems.filter(item => displayedItemIds.includes(item.id))
  
  // Get items available for rotation (not currently displayed and not disliked)
  const availableForRotation = allItems.filter(item => 
    !displayedItemIds.includes(item.id) && !item.disliked
  )

  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')

  // Smart item replacement - rotate from available pool first, then API call if needed
  const replaceItem = async (removedItemId: string) => {
    // First, try to replace from available pool
    if (availableForRotation.length > 0) {
      const newItem = availableForRotation[0]
      console.log('🔄 ROTATE: Replacing with item from pool:', newItem.name)
      
      // Update displayed items
      setDisplayedItemIds(prev => prev.map(id => id === removedItemId ? newItem.id : id))
      
      setToast({
        message: `Added ${newItem.name} to your recommendations`,
        type: 'success'
      })
      
      return true
    }
    
    // If no items available in pool, make API call for fresh items
    console.log('🔄 API: No items left in pool, fetching fresh recommendations...')
    return await fetchFreshItem(removedItemId)
  }

  // Fallback: Fetch fresh item from API when pool is exhausted
  const fetchFreshItem = async (removedItemId: string): Promise<boolean> => {
    try {
      if (!currentSessionId) {
        console.error('❌ REFRESH: No session ID available')
        setToast({
          message: 'Please wait for recommendations to load first',
          type: 'error'
        })
        return false
      }
      
      const allItemIds = allItems.map(item => item.id)
      const freshItemsResponse = await apiService.refreshRecommendations({
        session_id: currentSessionId,
        exclude_ids: allItemIds,
        count: 1
      })

      const freshItems = Array.isArray(freshItemsResponse) ? freshItemsResponse : []
      
      if (freshItems.length === 0) {
        console.warn('⚠️ REFRESH: No fresh items available')
        setToast({
          message: 'No more new recommendations available',
          type: 'info'
        })
        return false
      }

      // Convert to ClothingItem format
      const newClothingItem: ClothingItem = {
        id: freshItems[0].id,
        name: freshItems[0].name,
        description: `${freshItems[0].article_type} in ${freshItems[0].color}`,
        image: freshItems[0].image_url,
        price: '€75',
        location: freshItems[0].store_location || 'Available in store',
        liked: false,
        disliked: false,
        addedToCart: false
      }

      // Add to all items pool
      setAllItems(prev => [...prev, newClothingItem])
      
      // Replace in displayed items
      setDisplayedItemIds(prev => prev.map(id => id === removedItemId ? newClothingItem.id : id))

      setToast({
        message: `Added ${newClothingItem.name} to your recommendations`,
        type: 'success'
      })

      return true
    } catch (error) {
      console.error('❌ REFRESH: Failed to get fresh items:', error)
      setToast({
        message: 'Failed to load new recommendations',
        type: 'error'
      })
      return false
    }
  }

  const toggleLike = (itemId: string) => {
    setAllItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
      item.id === itemId ? { ...item, liked: !item.liked, disliked: false } : item
    ))
  }

  const toggleDislike = async (itemId: string) => {
    const item = allItems.find((i: ClothingItem) => i.id === itemId)
    if (!item) return

    if (!item.disliked) {
      console.log('👎 DISLIKE: User disliked item:', item.name)
      
      // Start the removal animation
      setRemovingItems((prev: Set<string>) => new Set([...prev, itemId]))
      
      // Show toast notification
      setToast({
        message: `${item.name} removed from recommendations`,
        type: 'info'
      })

      // Mark item as refreshing to show loading state
      setRefreshingItems((prev: Set<string>) => new Set([...prev, itemId]))

      // Request fresh item to replace the disliked one
      const success = await replaceItem(itemId)
      
      // After animation completes, actually mark item as disliked
      setTimeout(() => {
        setAllItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
          item.id === itemId ? { ...item, disliked: true, liked: false, addedToCart: false } : item
        ))
        setRemovingItems((prev: Set<string>) => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
        setRefreshingItems((prev: Set<string>) => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 300) // Match the animation duration
    }
  }

  const toggleCart = (itemId: string) => {
    const item = allItems.find((i: ClothingItem) => i.id === itemId)
    if (!item) return

    setAllItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
      item.id === itemId ? { ...item, addedToCart: !item.addedToCart } : item
    ))

    // Show toast for cart actions
    if (!item.addedToCart) {
      setToast({
        message: `${item.name} added to cart`,
        type: 'success'
      })
    } else {
      setToast({
        message: `${item.name} removed from cart`,
        type: 'info'
      })
    }
  }

  const handleTryOn = (itemId: string) => {
    console.log('🔥 TRYON: handleTryOn called for itemId:', itemId)
    
    const item = allItems.find((i: ClothingItem) => i.id === itemId)
    if (!item) {
      console.log('❌ TRYON: Item not found for id:', itemId)
      return
    }

    console.log('🔥 TRYON: Found item:', item.name)
    console.log('🔥 TRYON: Checking selfie - formData.selfieImage:', !!formData.selfieImage)

    // Check if user has a selfie
    if (!formData.selfieImage) {
      console.log('❌ TRYON: No selfie found, showing toast')
      setToast({
        message: 'Please upload a selfie in Step 4 to use virtual try-on',
        type: 'info'
      })
      return
    }

    console.log('🔥 TRYON: Selfie found, starting FileReader...')

    // Convert selfie to base64 string
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      const base64Data = convertFromBase64(base64String)
      
      console.log('🔥 TRYON: Setting up try-on data for item:', item.name)
      console.log('🔥 TRYON: Base64 data length:', base64Data.length)
      
      // Set the try-on data and show modal
      setTryOnData({
        productId: itemId,
        productName: item.name,
        productImage: item.image,
        userSelfie: base64Data
      })
      setShowTryOn(itemId)
      
      console.log('🔥 TRYON: Modal state set, should show now')
    }
    reader.readAsDataURL(formData.selfieImage)
  }

  // Add state for try-on data
  const [tryOnData, setTryOnData] = useState<{
    productId: string
    productName: string
    productImage: string
    userSelfie: string
  } | null>(null)

  const handleContinue = () => {
    // Get selected items and convert back to RecommendationItem format
    const selectedClothingItems = allItems.filter((item: ClothingItem) => item.addedToCart)
    
    // Convert ClothingItem back to RecommendationItem format for checkout
    const selectedItems = selectedClothingItems.map((item: ClothingItem) => ({
      id: item.id,
      name: item.name,
      category: 'Apparel', // Default category
      price: parseInt(item.price.replace('€', '')), // Convert price string back to number
      image: item.image,
      description: item.description,
      inStock: true,
      storeLocation: item.location,
      article_type: 'Unknown', // We lost this info in conversion, could be improved
      color: 'Unknown', // We lost this info in conversion, could be improved
      usage: 'Unknown' // We lost this info in conversion, could be improved
    }))
    
    console.log('🔥 STEP6 DEBUG: selectedClothingItems:', selectedClothingItems)
    console.log('🔥 STEP6 DEBUG: converted selectedItems:', selectedItems)
    console.log('🔥 STEP6 DEBUG: First converted item:', selectedItems[0])
    
    updateFormData({ selectedItems })
    nextStep()
  }

  const cartItems = allItems.filter((item: ClothingItem) => item.addedToCart)
  const visibleItems = displayedItems.filter(item => !item.disliked)
  const tryOnItem = allItems.find((item: ClothingItem) => item.id === showTryOn)

  // Generate explanation based on user preferences
  const getRecommendationReason = () => {
    const styles = formData.preferredStyles.join(', ')
    const colors = formData.preferredColors.join(', ')
    const occasion = formData.shoppingPrompt
    
    let explanation = `Based on your ${styles.toLowerCase()} style preferences`
    
    if (colors) {
      explanation += ` and love for ${colors.toLowerCase()} colors`
    }
    
    explanation += `, and your request for "${occasion}", I've curated these pieces that perfectly match your aesthetic and occasion needs.`
    
    // Type-safe check for size property
    if ('size' in formData && formData.size) {
      explanation += ` All items are available in your size (${formData.size}).`
    }
    
    return explanation
  }

  useEffect(() => {
    // Skip fetching if we already have cached recommendations or have loaded before
    if (hasLoadedRecommendations || (formData.cachedRecommendations && formData.cachedRecommendations.length > 0)) {
      console.log('🔄 STEP6: Skipping API call - using cached data or already loaded')
      return
    }

    // Skip if we don't have the necessary data to make recommendations
    if (!formData.shoppingPrompt) {
      console.log('🔄 STEP6: Skipping API call - no shopping prompt provided')
      return
    }

    const fetchRecommendations = async () => {
      try {
        console.log('🔄 STEP6: Fetching fresh recommendations from API...')
        
        const userProfile = convertToUserProfile(formData)
        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          inspiration_images: formData.inspirationImages.map(img => convertFromBase64(img))
        })

        console.log('✅ STEP6: Received recommendations:', response.recommendations.length)
        console.log('🔥 STEP6: Session ID from response:', response.session_id)

        // Store session ID in both form data and local state
        setCurrentSessionId(response.session_id)
        setHasLoadedRecommendations(true)

        // Set session ID in chat context
        if (chatContext && chatContext.sessionId !== response.session_id) {
          console.log('🤖 CHAT: Setting session ID in chat context:', response.session_id)
          chatContext.setSessionId(response.session_id)
        }

        // Convert ProductItem[] to RecommendationItem[] format
        const recommendationItems: RecommendationItem[] = response.recommendations.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: 75, // Default price since ProductItem doesn't have price
          image: item.image_url,
          description: `${item.article_type} in ${item.color}`,
          inStock: true,
          storeLocation: item.store_location || 'Available in store',
          similarity_score: item.similarity_score,
          article_type: item.article_type,
          color: item.color,
          usage: item.usage
        }))

        // Convert to ClothingItem format and set
        const clothingItems = convertToClothingItems(recommendationItems, formData.userInteractions)
        setAllItems(clothingItems)

        // Update form data with fresh recommendations and session
        updateFormData({ 
          sessionId: response.session_id,
          cachedRecommendations: recommendationItems,
          hasLoadedRecommendations: true
        })

      } catch (error) {
        console.error('❌ STEP6: Failed to fetch recommendations:', error)
        setToast({
          message: 'Failed to load recommendations. Please try again.',
          type: 'error'
        })
      }
    }

    fetchRecommendations()
  }, [formData.shoppingPrompt, hasLoadedRecommendations])

  // More Options - rotate multiple items
  const handleMoreOptions = async () => {
    const itemsToReplace = Math.min(3, displayedItemIds.length) // Replace up to 3 items
    const idsToReplace = displayedItemIds.slice(0, itemsToReplace)
    
    console.log('🔄 MORE OPTIONS: Replacing items:', idsToReplace)
    
    let replacedCount = 0
    for (const itemId of idsToReplace) {
      const success = await replaceItem(itemId)
      if (success) replacedCount++
    }
    
    if (replacedCount > 0) {
      setToast({
        message: `Refreshed ${replacedCount} recommendations`,
        type: 'success'
      })
    }
  }

  if (showCart) {
    return (
      <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-900 mb-4">
            Your Shopping Cart
          </h1>
          <p className="text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} selected
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            cartItems.map((item: ClothingItem) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.price}</p>
                    {storeId && (
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.location}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleCart(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          onClick={() => setShowCart(false)}
          fullWidth
          variant="secondary"
        >
          Back to Items
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      {/* Virtual Try-On Modal */}
      {showTryOn && tryOnData && (
        <VirtualTryOnModal
          isOpen={!!showTryOn}
          onClose={() => {
            setShowTryOn(null)
            setTryOnData(null)
          }}
          productId={tryOnData.productId}
          productName={tryOnData.productName}
          productImage={tryOnData.productImage}
          userSelfie={tryOnData.userSelfie}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-light text-gray-900">
            How about these?
          </h1>
          <button
            onClick={handleMoreOptions}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            More Options
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            {getRecommendationReason()}
          </p>
        </div>
      </div>

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-gray-900 text-white rounded-xl p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span>View Cart ({cartItems.length})</span>
            </div>
            <span className="font-medium">
              €{cartItems.reduce((sum: number, item: ClothingItem) => sum + parseInt(item.price.replace('€', '')), 0)}
            </span>
          </button>
        </div>
      )}

      <div className="space-y-4">
        {visibleItems.map((item: ClothingItem) => (
          <div 
            key={item.id} 
            className={`bg-white rounded-xl border border-gray-100 p-4 transition-all duration-300 ${
              removingItems.has(item.id) 
                ? 'opacity-0 transform scale-95 -translate-x-4' 
                : 'opacity-100 transform scale-100 translate-x-0'
            }`}
          >
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
                onError={(e: any) => {
                  // Fallback image if the original fails to load
                  e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <span className="font-medium text-gray-900">{item.price}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                {storeId && (
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{item.location}</span>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleTryOn(item.id)}
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Try On
                  </Button>
                  
                  <button
                    onClick={() => toggleLike(item.id)}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      item.liked 
                        ? 'bg-green-100 text-green-600 scale-110' 
                        : 'bg-gray-100 text-gray-400 hover:text-gray-600 hover:scale-105'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => toggleDislike(item.id)}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      item.disliked 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-400 hover:text-red-500 hover:scale-105'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => toggleCart(item.id)}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      item.addedToCart 
                        ? 'bg-gray-900 text-white scale-110' 
                        : 'bg-gray-100 text-gray-400 hover:text-gray-600 hover:scale-105'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-6">
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
  )
}