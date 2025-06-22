import React from 'react'
import { X, MapPin, Navigation, Info } from 'lucide-react'
import { Button } from './Button'

interface StoreMapModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItems?: Array<{
    id: string
    name: string
    storeLocation: string
  }>
}

export const StoreMapModal: React.FC<StoreMapModalProps> = ({
  isOpen,
  onClose,
  selectedItems = []
}) => {
  if (!isOpen) return null

  // Mock store sections with coordinates for the floor plan
  const storeSections = [
    { id: 'entrance', name: 'Entrance', x: 50, y: 90, type: 'entrance' },
    { id: 'level1-shoes', name: 'Level 1, Shoes', x: 20, y: 70, type: 'department' },
    { id: 'level1-accessories', name: 'Level 1, Accessories', x: 80, y: 70, type: 'department' },
    { id: 'level1-checkout', name: 'Checkout', x: 50, y: 75, type: 'service' },
    { id: 'escalator', name: 'Escalator', x: 50, y: 50, type: 'navigation' },
    { id: 'level2-womens-casual', name: 'Level 2, Women\'s Casual', x: 20, y: 30, type: 'department' },
    { id: 'level2-womens-formal', name: 'Level 2, Women\'s Formal', x: 50, y: 30, type: 'department' },
    { id: 'level2-womens-business', name: 'Level 2, Women\'s Business', x: 80, y: 30, type: 'department' },
    { id: 'level2-fitting-rooms', name: 'Fitting Rooms', x: 50, y: 15, type: 'service' },
    { id: 'level2-customer-service', name: 'Customer Service', x: 20, y: 15, type: 'service' }
  ]

  // Find which sections contain the user's selected items
  const highlightedSections = storeSections.filter(section => 
    selectedItems.some(item => 
      item.storeLocation.toLowerCase().includes(section.name.toLowerCase().replace('level 1, ', '').replace('level 2, ', ''))
    )
  )

  const getSectionColor = (section: any) => {
    const isHighlighted = highlightedSections.some(h => h.id === section.id)
    
    if (isHighlighted) return 'bg-blue-500 border-blue-600 text-white'
    
    switch (section.type) {
      case 'entrance': return 'bg-green-100 border-green-300 text-green-800'
      case 'department': return 'bg-gray-100 border-gray-300 text-gray-800'
      case 'service': return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'navigation': return 'bg-orange-100 border-orange-300 text-orange-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Store Floor Plan</h2>
            <p className="text-sm text-gray-600">Downtown Fashion Mall - Store #123</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Store Map */}
        <div className="p-6">
          <div className="relative bg-gray-50 rounded-xl p-4 h-80 overflow-hidden">
            {/* Floor Plan Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-gray-100 rounded-xl"></div>
            
            {/* Level Labels */}
            <div className="absolute top-2 left-2 text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
              Level 2
            </div>
            <div className="absolute bottom-16 left-2 text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
              Level 1
            </div>
            
            {/* Store Sections */}
            {storeSections.map((section) => (
              <div
                key={section.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border-2 text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer ${getSectionColor(section)}`}
                style={{
                  left: `${section.x}%`,
                  top: `${section.y}%`,
                  minWidth: section.type === 'navigation' ? '40px' : '80px',
                  textAlign: 'center'
                }}
                title={section.name}
              >
                {section.type === 'navigation' ? (
                  <Navigation className="h-4 w-4 mx-auto" />
                ) : section.type === 'entrance' ? (
                  <span className="text-xs">🚪</span>
                ) : (
                  <span className="text-xs leading-tight">{section.name.replace('Level 1, ', '').replace('Level 2, ', '')}</span>
                )}
              </div>
            ))}

            {/* Level Separator Line */}
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-gray-300" style={{ top: '60%' }}></div>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded border"></div>
              <span>Your Items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Departments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
              <span>Services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Navigation</span>
            </div>
          </div>

          {/* Selected Items List */}
          {selectedItems.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                Your Items Location
              </h3>
              <div className="space-y-1">
                {selectedItems.map((item) => (
                  <div key={item.id} className="text-sm text-blue-800">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-blue-600 ml-2">→ {item.storeLocation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Store Hours: 10 AM - 9 PM</p>
                <p>• Escalator connects Level 1 & 2</p>
                <p>• Fitting rooms available on Level 2</p>
                <p>• Customer service for assistance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            fullWidth
            variant="secondary"
          >
            Close Map
          </Button>
        </div>
      </div>
    </div>
  )
} 