import React, { useState, useEffect } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { useChatContext } from '../../contexts/ChatContext'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { ThumbsUp, ThumbsDown, ShoppingCart, Eye, MapPin, ShoppingBag, X, RefreshCw, Heart, Sparkles, Check, Loader2 } from 'lucide-react'
import { ClothingItem, RecommendationItem } from '../../types'
import { VirtualTryOnModal } from '../ui/VirtualTryOnModal'
import { convertToUserProfile, convertFromBase64, apiService } from '../../services/api'

const mockItems: ClothingItem[] = [
  {
    id: '1',
    name: 'Silk Midi Dress',
    description: 'Elegant flowing dress perfect for dinner parties',
    image: 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: '$189',
    location: 'Level 2, Women\'s Formal',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '2',
    name: 'Tailored Blazer',
    description: 'Classic navy blazer for sophisticated looks',
    image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: '$249',
    location: 'Level 2, Women\'s Business',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '3',
    name: 'Designer Heels',
    description: 'Comfortable yet stylish for all-day wear',
    image: 'https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: '$159',
    location: 'Level 1, Shoes',
    liked: false,
    disliked: false,
    addedToCart: false
  },
  {
    id: '4',
    name: 'Statement Necklace',
    description: 'Gold-plated accessory to complete your look',
    image: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: '$89',
    location: 'Level 1, Accessories',
    liked: false,
    disliked: false,
    addedToCart: false
  }
]

export const Step6OutfitRail: React.FC = () => {
  const { formData, updateFormData, nextStep, prevStep } = useWizard()
  const chatContext = useChatContext()
  
  // COMPREHENSIVE DEBUGGING - Add at the very start
  console.log('🔥🔥🔥 STEP6 COMPONENT LOADED 🔥🔥🔥')
  console.log('🔥 STEP6 DEBUG: Full formData:', formData)
  console.log('🔥 STEP6 DEBUG: formData.selectedItems:', formData.selectedItems)
  console.log('🔥 STEP6 DEBUG: formData.selectedItems length:', formData.selectedItems?.length)
  console.log('🔥 STEP6 DEBUG: formData.selectedItems type:', typeof formData.selectedItems)
  console.log('🔥 STEP6 DEBUG: Array.isArray(formData.selectedItems):', Array.isArray(formData.selectedItems))
  console.log('🔥 STEP6 DEBUG: first item:', formData.selectedItems?.[0])
  console.log('🔥 STEP6 DEBUG: JSON.stringify first item:', JSON.stringify(formData.selectedItems?.[0], null, 2))
  
  // Convert real recommendations to ClothingItem format
  const convertToClothingItems = (recommendations: RecommendationItem[]): ClothingItem[] => {
    return recommendations.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      price: `$${item.price}`,
      location: item.storeLocation,
      liked: false,
      disliked: false,
      addedToCart: false
    }))
  }

  // Use real recommendations if available, otherwise fall back to mock data
  const initialItems = formData.selectedItems && formData.selectedItems.length > 0 
    ? convertToClothingItems(formData.selectedItems)
    : mockItems

  console.log('🔥 DEBUG Step6: formData.selectedItems:', formData.selectedItems)
  console.log('🔥 DEBUG Step6: formData.selectedItems length:', formData.selectedItems?.length)
  console.log('🔥 DEBUG Step6: formData.selectedItems type:', typeof formData.selectedItems)
  console.log('🔥 DEBUG Step6: first item:', formData.selectedItems?.[0])
  console.log('🔥 DEBUG Step6: initialItems:', initialItems)

  const [items, setItems] = useState<ClothingItem[]>(initialItems)
  const [showTryOn, setShowTryOn] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(formData.sessionId || null)

  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')

  // Function to refresh/replace items
  const refreshItems = async (excludeIds: string[], count: number = 1) => {
    try {
      console.log('🔄 REFRESH: Requesting fresh items, excluding:', excludeIds)
      console.log('🔄 REFRESH: Current session ID:', currentSessionId)
      
      if (!currentSessionId) {
        console.error('❌ REFRESH: No session ID available')
        setToast({
          message: 'Please wait for recommendations to load first',
          type: 'error'
        })
        return []
      }
      
      const freshItems = await apiService.refreshRecommendations({
        session_id: currentSessionId,
        exclude_ids: excludeIds,
        count
      })

      console.log('✅ REFRESH: Received fresh items:', freshItems.recommendations.length)

      // Convert ProductItem[] to RecommendationItem[] format
      const recommendationItems: RecommendationItem[] = freshItems.recommendations.map(item => ({
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

      // Convert to ClothingItem format
      const newClothingItems = convertToClothingItems(recommendationItems)
      
      // Add new items to the list
      setItems((prev: ClothingItem[]) => [...prev, ...newClothingItems])

      return newClothingItems
    } catch (error) {
      console.error('❌ REFRESH: Failed to get fresh items:', error)
      setToast({
        message: 'Failed to load new recommendations',
        type: 'error'
      })
      return []
    }
  }

  const toggleLike = (itemId: string) => {
    setItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
      item.id === itemId ? { ...item, liked: !item.liked, disliked: false } : item
    ))
  }

  const toggleDislike = async (itemId: string) => {
    const item = items.find((i: ClothingItem) => i.id === itemId)
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

      // Get all current item IDs to exclude from refresh
      const allItemIds = items.map((item: ClothingItem) => item.id)
      
      // Request fresh item to replace the disliked one
      const freshItems = await refreshItems(allItemIds, 1)
      
      // After animation completes, actually remove the disliked item
      setTimeout(() => {
        setItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
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

        if (freshItems.length > 0) {
          setToast({
            message: `Added ${freshItems[0].name} to your recommendations`,
            type: 'success'
          })
        }
      }, 300) // Match the animation duration
    }
  }

  const toggleCart = (itemId: string) => {
    const item = items.find((i: ClothingItem) => i.id === itemId)
    if (!item) return

    setItems((prev: ClothingItem[]) => prev.map((item: ClothingItem) => 
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
    
    const item = items.find((i: ClothingItem) => i.id === itemId)
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
    const selectedClothingItems = items.filter((item: ClothingItem) => item.addedToCart)
    
    // Convert ClothingItem back to RecommendationItem format for checkout
    const selectedItems = selectedClothingItems.map((item: ClothingItem) => ({
      id: item.id,
      name: item.name,
      category: 'Apparel', // Default category
      price: parseInt(item.price.replace('$', '')), // Convert price string back to number
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

  const cartItems = items.filter((item: ClothingItem) => item.addedToCart)
  const visibleItems = items.filter((item: ClothingItem) => !item.disliked)
  const tryOnItem = items.find((item: ClothingItem) => item.id === showTryOn)

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
    
    if (formData.size) {
      explanation += ` All items are available in your size (${formData.size}).`
    }
    
    return explanation
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        console.log('🔄 STEP6: Fetching recommendations...')
        
        const userProfile = convertToUserProfile(formData)
        const response = await apiService.getRecommendations({
          user_profile: userProfile,
          inspiration_images: formData.inspirationImages.map(img => convertFromBase64(img))
        })

        console.log('✅ STEP6: Received recommendations:', response.recommendations.length)
        console.log('🔥 STEP6: Session ID from response:', response.session_id)

        // Store session ID in both form data and local state
        setCurrentSessionId(response.session_id)
        updateFormData({ sessionId: response.session_id })

        // Sync with chat context
        if (chatContext) {
          chatContext.updateContext({
            session_id: response.session_id,
            user_profile: userProfile,
            current_recommendations: response.recommendations
          })
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
        const clothingItems = convertToClothingItems(recommendationItems)
        setItems(clothingItems)

      } catch (error) {
        console.error('❌ STEP6: Failed to fetch recommendations:', error)
        setToast({
          message: 'Failed to load recommendations. Please try again.',
          type: 'error'
        })
      }
    }

    fetchRecommendations()
  }, [formData.shoppingPrompt, formData.preferredStyles, formData.preferredColors])

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
            onClick={() => refreshItems(items.map((item: ClothingItem) => item.id), 3)}
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
              ${cartItems.reduce((sum: number, item: ClothingItem) => sum + parseInt(item.price.replace('$', '')), 0)}
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