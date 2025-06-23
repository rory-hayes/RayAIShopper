import React, { useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { StoreMapModal } from '../ui/StoreMapModal'
import { MapPin, ShoppingBag, CreditCard, Store } from 'lucide-react'

export const Step7Checkout: React.FC = () => {
  const { formData, resetWizard, prevStep } = useWizard()
  const [activeTab, setActiveTab] = useState<'checkout' | 'store'>('store')
  const [showStoreMap, setShowStoreMap] = useState(false)
  
  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')
  
  // Use real selected items from formData
  const selectedItems = formData.selectedItems || []
  
  // Debug logging
  console.log('🔥 CHECKOUT DEBUG: selectedItems:', selectedItems)
  console.log('🔥 CHECKOUT DEBUG: selectedItems length:', selectedItems.length)
  if (selectedItems.length > 0) {
    console.log('🔥 CHECKOUT DEBUG: First item:', selectedItems[0])
    console.log('🔥 CHECKOUT DEBUG: First item price:', selectedItems[0].price)
    console.log('🔥 CHECKOUT DEBUG: First item storeLocation:', selectedItems[0].storeLocation)
  }
  
  // Calculate totals with proper number handling
  const total = selectedItems.reduce((sum, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
    console.log(`🔥 CHECKOUT DEBUG: Item ${item.id} price: ${item.price} -> ${price}`)
    return sum + price
  }, 0)
  
  const tax = Math.round(total * 0.08) // 8% tax
  const finalTotal = total + tax
  
  console.log('🔥 CHECKOUT DEBUG: Calculated total:', total)
  console.log('🔥 CHECKOUT DEBUG: Tax:', tax)
  console.log('🔥 CHECKOUT DEBUG: Final total:', finalTotal)

  const handleCheckout = () => {
    // In a real app, this would handle checkout
    alert('Redirecting to secure checkout...')
  }

  const handleNewSession = () => {
    resetWizard()
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

          {/* Store Navigation Help */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-2">Store Navigation Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use the store map near the entrance</li>
              <li>• Ask any associate for directions</li>
              <li>• Items are organized by department and level</li>
              <li>• Fitting rooms are available on each level</li>
            </ul>
          </div>

          {/* Store Actions */}
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
              <span className="text-gray-900">€{total}</span>
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