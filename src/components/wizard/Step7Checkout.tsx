import React, { useState, useEffect } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { StoreMapModal } from '../ui/StoreMapModal'
import { MapPin, ShoppingBag, CreditCard, Store, Star, MessageSquare } from 'lucide-react'
import { stepLogger } from '../../utils/logger'

export const Step7Checkout: React.FC = () => {
  const { formData, resetWizard, prevStep } = useWizard()
  const [activeTab, setActiveTab] = useState<'checkout' | 'store'>('store')
  const [showStoreMap, setShowStoreMap] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'store' | 'online'>('store')
  
  // Review state
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false)
  
  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')
  
  // Use real selected items from formData
  const selectedItems = formData.selectedItems || []
  
  stepLogger.debug('CHECKOUT', 'selectedItems:', selectedItems)
  stepLogger.debug('CHECKOUT', 'selectedItems length:', selectedItems.length)
  
  if (selectedItems.length > 0) {
    stepLogger.debug('CHECKOUT', 'First item:', selectedItems[0])
    stepLogger.debug('CHECKOUT', 'First item price:', selectedItems[0].price)
    stepLogger.debug('CHECKOUT', 'First item storeLocation:', selectedItems[0].storeLocation)
  }
  
  // Calculate totals with proper number handling
  const subtotal = selectedItems.reduce((acc, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
    stepLogger.debug('CHECKOUT', `Item ${item.id} price: ${item.price} -> ${price}`)
    return acc + price
  }, 0)
  
  const total = Math.round(subtotal * 100) / 100 // Round to 2 decimal places
  const tax = Math.round(total * 0.08 * 100) / 100 // 8% tax
  const finalTotal = Math.round((total + tax) * 100) / 100
  
  stepLogger.debug('CHECKOUT', 'Calculated total:', total)
  stepLogger.debug('CHECKOUT', 'Tax:', tax)
  stepLogger.debug('CHECKOUT', 'Final total:', finalTotal)

  const handleCheckout = () => {
    // In a real app, this would handle checkout
    alert('Redirecting to secure checkout...')
  }

  const handleNewSession = () => {
    resetWizard()
  }

  const handleSubmitReview = () => {
    if (rating === 0) {
      alert('Please select a rating before submitting')
      return
    }
    
    // In a real app, this would submit to backend
    console.log('Review submitted:', { rating, comment: reviewComment })
    setHasSubmittedReview(true)
    
    // Show success message
    setTimeout(() => {
      alert('Thank you for your review!')
    }, 100)
  }

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-colors"
            disabled={hasSubmittedReview}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              } ${hasSubmittedReview ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 && (
            <>
              {rating} out of 5 star{rating !== 1 ? 's' : ''}
            </>
          )}
        </span>
      </div>
    )
  }

  if (selectedItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-6 py-8 animate-fade-in text-center">
        <div className="mb-8">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-light text-gray-900 mb-4">
            No items selected
          </h1>
          <p className="text-gray-600">
            Go back and add some items to your cart to continue
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={prevStep}
            fullWidth
            size="lg"
          >
            Back to Items
          </Button>
          
          <Button
            onClick={handleNewSession}
            variant="secondary"
            fullWidth
            size="lg"
          >
            Start New Session
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Your Shopping Summary
        </h1>
        <p className="text-gray-600">
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} ready for you
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'store'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Store className="h-4 w-4 mr-2" />
          Find in Store
        </button>
        <button
          onClick={() => setActiveTab('checkout')}
          className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'checkout'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Checkout
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'store' ? (
        <div className="space-y-6">
          {/* Store Info */}
          {storeId && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center text-blue-800 mb-2">
                <Store className="h-5 w-5 mr-2" />
                <span className="font-medium">Store #{storeId}</span>
              </div>
              <p className="text-sm text-blue-700">
                123 Fashion Avenue, Downtown Mall
              </p>
            </div>
          )}

          {/* Items with Store Locations */}
          <div className="space-y-4">
            {selectedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className="font-medium text-gray-900">€{item.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <div className="flex items-center text-sm text-blue-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="font-medium">{item.storeLocation || 'Location not available'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View Store Map Button - Moved above review section */}
          <div className="space-y-4">
            <Button
              onClick={() => setShowStoreMap(true)}
              fullWidth
              size="lg"
              className="flex items-center justify-center"
            >
              <MapPin className="h-5 w-5 mr-2" />
              View Store Map
            </Button>
          </div>

          {/* Review Section - Replaces Store Navigation Tips */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center mb-3">
              <MessageSquare className="h-5 w-5 mr-2 text-gray-700" />
              <h3 className="font-medium text-gray-900">Rate Your Experience</h3>
            </div>
            
            {!hasSubmittedReview ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  How was your Ray AI shopping experience?
                </p>
                
                {renderStarRating()}
                
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us about your experience (optional)"
                  className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  maxLength={500}
                />
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">
                    {reviewComment.length}/500 characters
                  </span>
                  <Button
                    onClick={handleSubmitReview}
                    size="sm"
                    disabled={rating === 0}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Review
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="flex justify-center mb-2">
                  {renderStarRating()}
                </div>
                <p className="text-sm text-green-600 font-medium">
                  Thank you for your feedback!
                </p>
                {reviewComment && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    "{reviewComment}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Items List */}
          <div className="space-y-4">
            {selectedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      // Fallback image if the original fails to load
                      e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className="font-medium text-gray-900">€{item.price}</span>
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm text-gray-500">Category: {item.category}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">€{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">€{tax}</span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="text-xl font-medium text-gray-900">€{finalTotal}</span>
              </div>
            </div>
          </div>

          {/* Checkout Actions */}
          <div className="space-y-4">
            <Button
              onClick={handleCheckout}
              fullWidth
              size="lg"
              className="flex items-center justify-center"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Proceed to Checkout
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
        <Button
          onClick={prevStep}
          variant="secondary"
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleNewSession}
          variant="ghost"
          className="flex-1"
        >
          New Session
        </Button>
      </div>

      {/* Store Map Modal */}
      {showStoreMap && (
        <StoreMapModal
          isOpen={showStoreMap}
          onClose={() => setShowStoreMap(false)}
          selectedItems={selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            storeLocation: item.storeLocation || 'Location not available'
          }))}
        />
      )}
    </div>
  )
}