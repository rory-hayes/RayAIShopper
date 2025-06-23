import React from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { MapPin, ShoppingBag } from 'lucide-react'

const mockItems = [
  { id: '1', name: 'Silk Midi Dress', price: '€189', location: 'Level 2, Women\'s Formal' },
  { id: '2', name: 'Tailored Blazer', price: '€249', location: 'Level 2, Women\'s Business' },
  { id: '3', name: 'Designer Heels', price: '€159', location: 'Level 1, Shoes' },
  { id: '4', name: 'Statement Necklace', price: '€89', location: 'Level 1, Accessories' }
]

export const Step8Summary: React.FC = () => {
  const { formData, resetWizard } = useWizard()
  
  // Check if we have a storeID parameter (would come from QR code)
  const urlParams = new URLSearchParams(window.location.search)
  const storeId = urlParams.get('storeID')
  
  const selectedItems = mockItems.filter(item => 
    formData.selectedItems.some(selectedItem => selectedItem.id === item.id)
  )
  const total = selectedItems.reduce((sum, item) => sum + parseInt(item.price.replace('€', '')), 0)

  const handleCheckout = () => {
    // In a real app, this would handle checkout
    alert('Checkout functionality would be implemented here!')
  }

  const handleNewSession = () => {
    resetWizard()
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Your Shopping List
        </h1>
        <p className="text-gray-600">
          {selectedItems.length} items curated just for you
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {selectedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              <span className="font-medium text-gray-900">{item.price}</span>
            </div>
            {storeId && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                {item.location}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedItems.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-xl font-medium text-gray-900">€{total}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {selectedItems.length > 0 && (
          <Button
            onClick={handleCheckout}
            fullWidth
            size="lg"
            className="flex items-center justify-center"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            {storeId ? 'Find in Store' : 'Checkout'}
          </Button>
        )}
        
        <Button
          onClick={handleNewSession}
          variant="secondary"
          fullWidth
          size="lg"
        >
          Start New Session
        </Button>
      </div>

      {storeId && (
        <div className="mt-8 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800 text-center">
            <MapPin className="h-4 w-4 inline mr-1" />
            You're shopping at Store #{storeId}
          </p>
        </div>
      )}
    </div>
  )
}