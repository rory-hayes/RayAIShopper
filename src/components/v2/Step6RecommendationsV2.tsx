import React, { useState, useCallback } from 'react'
import { Heart, ThumbsDown, Eye, ShoppingBag, Check, Loader2, RefreshCw, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'
import { useWizard } from '../../contexts/WizardContext'
import { useChatContext } from '../../contexts/ChatContext'
import { convertToUserProfile, ProductItem } from '../../services/api'
import { useRecommendationsV2 } from '../../hooks/useRecommendationsV2'
import { LoadingView } from './LoadingView'
import { ErrorView } from './ErrorView'
import { EmptyView } from './EmptyView'
import { VirtualTryOnModal } from '../ui/VirtualTryOnModal'
import { CompleteTheLookModal } from '../ui/CompleteTheLookModal'

interface Step6Props {
  onNext: () => void
}

export const Step6RecommendationsV2: React.FC<Step6Props> = ({ onNext }) => {
  const { formData, updateFormData } = useWizard()
  const { setSessionId } = useChatContext()
  const userProfile = convertToUserProfile(formData)
  
  // Use V2 hook with new replaceItem functionality
  const {
    status,
    categories,
    selectedCategory,
    error,
    debugInfo,
    selectedItems,
    retry,
    selectCategory,
    toggleItemSelection,
    replaceItem,  // New efficient replace function
    getDisplayItems,
    totalItems,
    categoryNames,
    hasItems
  } = useRecommendationsV2(userProfile)

  // Local state for UI interactions
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())
  const [isReplacingItem, setIsReplacingItem] = useState<string | null>(null)
  const [showTryOnModal, setShowTryOnModal] = useState(false)
  const [tryOnData, setTryOnData] = useState<{
    item: ProductItem
    selfieBase64: string
  } | null>(null)
  
  // NEW: Complete the Look modal state
  const [completeTheLookModal, setCompleteTheLookModal] = useState<{
    isOpen: boolean
    baseItem: ProductItem | null
  }>({ isOpen: false, baseItem: null })

  // Handle general feedback (like)
  const handleFeedback = useCallback(async (item: ProductItem, action: 'like' | 'dislike') => {
    try {
      if (action === 'like') {
        setLikedItems(prev => new Set([...prev, item.id]))
      }
      
      // TODO: Send feedback to backend when available
      console.log(`V2: User ${action}d item:`, item.name)
    } catch (error) {
      console.error('V2: Error handling feedback', error)
    }
  }, [])

  // NEW: Handle complete the look
  const handleCompleteTheLook = useCallback((item: ProductItem) => {
    console.log('V2: Complete the look for item', item.name, 'Complete look data:', item.complete_the_look)
    
    if (item.complete_the_look && Object.keys(item.complete_the_look.suggested_items).length > 0) {
      setCompleteTheLookModal({
        isOpen: true,
        baseItem: item
      })
    } else {
      console.log('V2: No complete the look data available for this item')
    }
  }, [])

  // NEW: Handle adding items from complete the look
  const handleCompleteTheLookAddToCart = useCallback((items: ProductItem[]) => {
    console.log('V2: Adding complete look items to cart:', items)
    items.forEach(item => {
      if (!selectedItems.has(item.id)) {
        toggleItemSelection(item.id)
      }
    })
  }, [selectedItems, toggleItemSelection])

  // NEW: Handle adding individual item from complete the look
  const handleCompleteTheLookAddItem = useCallback((item: ProductItem) => {
    console.log('V2: Adding individual item from complete the look:', item.name)
    if (!selectedItems.has(item.id)) {
      toggleItemSelection(item.id)
    }
  }, [selectedItems, toggleItemSelection])

  // Handle dislike with INSTANT item replacement from reserves
  const handleDislike = useCallback(async (item: ProductItem) => {
    console.log('🔄 V2: User disliked item', item.name, 'replacing instantly...')
    
    setIsReplacingItem(item.id)
    
    try {
      // Send dislike feedback (non-blocking)
      handleFeedback(item, 'dislike')
      
      // Find which category this item belongs to
      let itemCategory = item.article_type
      
      // If we're in 'all' view, we need to find the specific category
      if (selectedCategory === 'all') {
        // Find the category that contains this item
        for (const [catName, catData] of Object.entries(categories)) {
          if (catData.items.some(i => i.id === item.id)) {
            itemCategory = catName
            break
          }
        }
      } else {
        itemCategory = selectedCategory
      }
      
      console.log(`🔄 V2: Replacing item from category: ${itemCategory}`)
      
      // Use the new efficient replaceItem function
      replaceItem(item.id, itemCategory)
      
      console.log('✅ V2: Item replaced instantly from reserves!')
      
    } catch (error) {
      console.error('❌ V2: Error in handleDislike', error)
    } finally {
      // Short delay for visual feedback
      setTimeout(() => {
        setIsReplacingItem(null)
      }, 500)  // Reduced from 1000ms to 500ms since it's instant now
    }
  }, [handleFeedback, selectedCategory, categories, replaceItem])

  // Handle virtual try-on
  const handleTryOn = useCallback(async (item: ProductItem) => {
    console.log('V2: handleTryOn called for item', item.name)
    
    if (!formData.selfieImage) {
      alert('Please upload a selfie in Step 4 to use the virtual try-on feature!')
      return
    }
    
    // Convert selfie to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target?.result as string
      
      setTryOnData({
        item,
        selfieBase64: base64Data
      })
      
      setShowTryOnModal(true)
    }
    reader.readAsDataURL(formData.selfieImage)
  }, [formData.selfieImage])

  // Handle item selection for checkout
  const handleSelectItem = useCallback((itemId: string) => {
    toggleItemSelection(itemId)
  }, [toggleItemSelection])

  // Handle continue to next step
  const handleNext = () => {
    if (selectedItems.size > 0) {
      // Get the actual selected items from displayed items across all categories
      const allDisplayedItems = Object.values(categories).flatMap(cat => cat.items || [])
      const userSelectedItems = allDisplayedItems.filter(item => selectedItems.has(item.id))
      
      console.log('✅ V2 Component: Proceeding with selected items:', userSelectedItems)
      
      // Generate mock pricing for demo purposes
      const generateMockPrice = (item: ProductItem): number => {
        console.log('🔍 Generating price for item:', {
          id: item.id,
          name: item.name,
          article_type: item.article_type
        })
        
        // Base price ranges by article type
        const priceRanges: { [key: string]: [number, number] } = {
          'Shirts': [45, 85],
          'Tshirts': [40, 70],
          'T-Shirts': [40, 70], // Add alternative spelling
          'Jeans': [55, 120],
          'Trousers': [60, 110],
          'Casual Shoes': [65, 120],
          'Formal Shoes': [75, 120],
          'Sports Shoes': [70, 115],
          'Sandals': [40, 80],
          'Jackets': [80, 120],
          'Sweaters': [50, 95],
          'Shorts': [40, 75],
          'Shoes': [60, 120], // Generic shoes
          'Tops': [35, 75],
          'Dresses': [60, 140],
          'Skirts': [45, 85],
          'Leggings': [30, 60],
          'Heels': [65, 130],
          'Flats': [40, 90]
        }
        
        const [min, max] = priceRanges[item.article_type] || [40, 120]
        console.log('🔍 Price range for', item.article_type, ':', [min, max])
        
        // Add slight brand premium based on name quality
        let brandMultiplier = 1.0
        const itemName = item.name.toLowerCase()
        if (itemName.includes('premium') || itemName.includes('luxury')) {
          brandMultiplier = 1.2
        } else if (itemName.includes('basic') || itemName.includes('essential')) {
          brandMultiplier = 0.9
        }
        
        // Generate price with some randomization
        const basePrice = Math.floor(Math.random() * (max - min) + min)
        const finalPrice = Math.floor(basePrice * brandMultiplier)
        
        // Ensure it stays within our range
        const resultPrice = Math.max(40, Math.min(120, finalPrice))
        console.log('🔍 Generated price:', resultPrice, 'for', item.name)
        
        return resultPrice
      }
      
      // Convert ProductItem to RecommendationItem format for compatibility
      const formattedItems = userSelectedItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || item.article_type || 'Unknown',
        price: generateMockPrice(item), // Generate realistic mock pricing
        image: item.image_url,
        description: `${item.article_type} in ${item.color}`, // Generate description from available fields
        inStock: true,
        storeLocation: item.store_location || 'Available online',
        similarity_score: item.similarity_score || 0.9,
        article_type: item.article_type,
        color: item.color,
        usage: item.usage || 'General'
      }))
      
      // Update formData with selected items
      updateFormData({ selectedItems: formattedItems })
      
      onNext()
    }
  }

  // Handle simplified search fallback
  const handleSimplifiedSearch = () => {
    console.log('🔄 V2 Component: Switching to simplified search mode')
    retry()
  }

  // Handle more options (refresh categories)
  const handleMoreOptions = useCallback(() => {
    console.log('V2: Refreshing recommendations')
    retry()
  }, [retry])

  // Render loading state
  if (status === 'loading') {
    return <LoadingView expectedCategories={userProfile.preferred_article_types || []} />
  }
  
  // Render error state
  if (status === 'error') {
    return (
      <ErrorView 
        error={error!} 
        onRetry={retry} 
        onSimplifiedSearch={handleSimplifiedSearch}
      />
    )
  }
  
  // Render empty state
  if (status === 'empty' || !hasItems) {
    return (
      <EmptyView 
        userProfile={userProfile} 
        onRetry={retry}
        onBroaderSearch={handleSimplifiedSearch}
      />
    )
  }

  // Get items to display based on selected category
  const displayedItems = getDisplayItems(selectedCategory)

  // Render success state with recommendations
  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      {/* Header */}
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
        {selectedItems.size > 0 && (
          <p className="text-sm text-blue-600 mt-2">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </p>
        )}
      </div>
      
      {/* Category Tabs */}
      {categoryNames.length > 1 && (
        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => selectCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Categories
            </button>
            {categoryNames.map(category => (
              <button
                key={category}
                onClick={() => selectCategory(category)}
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
      
      {/* Items List - Same layout as V1 (horizontal cards like checkout) */}
      <div className="space-y-4 mb-8">
        {displayedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex gap-4">
              <div className="relative">
                <img
                  src={item.image_url}
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
                  <span className="font-medium text-gray-900">Available</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {`${item.article_type} in ${item.color}`}
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.article_type}
                  </span>
                  <span className="text-xs text-gray-500">{item.store_location || 'Available online'}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Same as V1 */}
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
                onClick={() => handleTryOn(item)}
                className="flex items-center justify-center p-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>

              {/* Complete the Look - Only show if data exists */}
              {item.complete_the_look && Object.keys(item.complete_the_look.suggested_items).length > 0 && (
                <button
                  onClick={() => handleCompleteTheLook(item)}
                  className="flex items-center justify-center p-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 hover:from-indigo-200 hover:to-purple-200 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}
              
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
          className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center whitespace-nowrap"
        >
          <RefreshCw className="h-5 w-5 mr-2 flex-shrink-0" />
          More Options
        </Button>
        
        <Button
          onClick={handleNext}
          fullWidth
          size="lg"
          disabled={selectedItems.size === 0}
          className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
        >
          <span className="flex items-center">
            Continue to Checkout ({selectedItems.size} item{selectedItems.size === 1 ? '' : 's'})
            <ChevronRight className="ml-2 h-5 w-5 flex-shrink-0" />
          </span>
        </Button>
      </div>
      
      {/* Debug Panel (Development Only) */}
      {debugInfo && import.meta.env.MODE === 'development' && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Debug Info</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

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
          productImage={tryOnData.item.image_url}
          userSelfie={tryOnData.selfieBase64}
        />
      )}

      {/* Complete the Look Modal */}
      {completeTheLookModal.isOpen && completeTheLookModal.baseItem && completeTheLookModal.baseItem.complete_the_look && (
        <CompleteTheLookModal
          isOpen={completeTheLookModal.isOpen}
          onClose={() => {
            setCompleteTheLookModal({ isOpen: false, baseItem: null })
          }}
          baseItem={completeTheLookModal.baseItem}
          suggestions={completeTheLookModal.baseItem.complete_the_look}
          onAddToCart={handleCompleteTheLookAddToCart}
          onAddItem={handleCompleteTheLookAddItem}
        />
      )}
    </div>
  )
} 