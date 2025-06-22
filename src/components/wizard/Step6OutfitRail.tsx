import React, { useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { ThumbsUp, ThumbsDown, ShoppingCart, Eye, MapPin, ShoppingBag, X } from 'lucide-react'
import { ClothingItem, RecommendationItem } from '../../types'

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')

  const toggleLike = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, liked: !item.liked, disliked: false } : item
    ))
  }

  const toggleDislike = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    if (!item.disliked) {
      // Start the removal animation
      setRemovingItems(prev => new Set([...prev, itemId]))
      
      // Show toast notification
      setToast({
        message: `${item.name} removed from recommendations`,
        type: 'info'
      })

      // After animation completes, actually remove the item
      setTimeout(() => {
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, disliked: true, liked: false, addedToCart: false } : item
        ))
        setRemovingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 300) // Match the animation duration
    }
  }

  const toggleCart = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setItems(prev => prev.map(item => 
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
    setShowTryOn(itemId)
  }

  const handleContinue = () => {
    const selectedItems = items.filter(item => item.addedToCart).map(item => item.id)
    updateFormData({ selectedItems })
    nextStep()
  }

  const cartItems = items.filter(item => item.addedToCart)
  const visibleItems = items.filter(item => !item.disliked)
  const tryOnItem = items.find(item => item.id === showTryOn)

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

  // Virtual Try-On Modal
  if (showTryOn && tryOnItem) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900">Virtual Try-On</h2>
              <button
                onClick={() => setShowTryOn(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Item Info */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{tryOnItem.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{tryOnItem.description}</p>
              <span className="text-xl font-medium text-gray-900">{tryOnItem.price}</span>
            </div>

            {/* Try-On Comparison */}
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Your Photo</p>
                {formData.selfieImage ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(formData.selfieImage)}
                      alt="Your selfie"
                      className="w-full h-64 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <Eye className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">No selfie uploaded</p>
                      <p className="text-gray-400 text-xs mt-1">Upload a selfie to see virtual try-on</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Virtual Try-On Preview</p>
                <div className="w-full h-64 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-xl flex items-center justify-center relative overflow-hidden">
                  {/* Placeholder for AI-generated try-on */}
                  <div className="text-center z-10">
                    <div className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
                      <Eye className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-gray-700 font-medium text-sm">AI Try-On Preview</p>
                    <p className="text-gray-500 text-xs mt-1">Generated with DALL·E</p>
                  </div>
                  
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-white/30 rounded-full"></div>
                  <div className="absolute bottom-6 left-6 w-12 h-12 bg-white/20 rounded-full"></div>
                  <div className="absolute top-1/2 left-4 w-6 h-6 bg-white/25 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-medium">Ray's Analysis:</span> This {tryOnItem.name.toLowerCase()} complements your {formData.preferredStyles.join(', ').toLowerCase()} style preferences beautifully. {formData.preferredColors.length > 0 && `The colors work well with your preference for ${formData.preferredColors.join(', ').toLowerCase()}.`} It's perfect for your requested occasion: "{formData.shoppingPrompt}".
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => toggleLike(tryOnItem.id)}
                  className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-200 ${
                    tryOnItem.liked 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {tryOnItem.liked ? 'Liked' : 'Like'}
                </button>
                
                <button
                  onClick={() => toggleCart(tryOnItem.id)}
                  className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all duration-200 ${
                    tryOnItem.addedToCart 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {tryOnItem.addedToCart ? 'In Cart' : 'Add to Cart'}
                </button>
              </div>
              
              <Button
                onClick={() => setShowTryOn(null)}
                fullWidth
                variant="secondary"
                size="lg"
              >
                Back to Items
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
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
            cartItems.map((item) => (
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
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="text-center mb-6">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          How about these?
        </h1>
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
              ${cartItems.reduce((sum, item) => sum + parseInt(item.price.replace('$', '')), 0)}
            </span>
          </button>
        </div>
      )}

      <div className="space-y-6">
        {visibleItems.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
              removingItems.has(item.id) 
                ? 'opacity-0 transform scale-95 -translate-x-4' 
                : 'opacity-100 transform scale-100 translate-x-0'
            }`}
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <span className="font-medium text-gray-900">{item.price}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              {storeId && (
                <div className="flex items-center text-xs text-gray-500 mb-4">
                  <MapPin className="h-3 w-3 mr-1" />
                  {item.location}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTryOn(item.id)}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Try On
                </Button>
                
                <button
                  onClick={() => toggleLike(item.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    item.liked 
                      ? 'bg-green-100 text-green-600 scale-110' 
                      : 'bg-gray-100 text-gray-400 hover:text-gray-600 hover:scale-105'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => toggleDislike(item.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    item.disliked 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-400 hover:text-red-500 hover:scale-105'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => toggleCart(item.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
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