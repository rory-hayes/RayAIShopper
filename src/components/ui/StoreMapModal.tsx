import React from 'react'
import { X, MapPin, Navigation, Info, Search } from 'lucide-react'
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

  // Parse location codes (e.g., "C3-D4" -> section C3, aisle D4)
  const parseLocation = (location: string) => {
    // Handle grid-style locations like "C3-D4"
    if (location.match(/[A-Z]\d+-[A-Z]\d+/)) {
      const [section, aisle] = location.split('-')
      return {
        section: section.charAt(0), // First letter (C, G, etc.)
        row: parseInt(section.slice(1)), // Number after letter
        aisle: aisle,
        displayName: `Section ${section}, Aisle ${aisle}`
      }
    }
    
    // Handle department names
    if (location.toLowerCase().includes('women')) {
      if (location.toLowerCase().includes('formal')) return { department: 'level2-womens-formal', displayName: location }
      if (location.toLowerCase().includes('business')) return { department: 'level2-womens-business', displayName: location }
      if (location.toLowerCase().includes('casual')) return { department: 'level2-womens-casual', displayName: location }
    }
    
    if (location.toLowerCase().includes('shoes')) return { department: 'level1-shoes', displayName: location }
    if (location.toLowerCase().includes('accessories')) return { department: 'level1-accessories', displayName: location }
    
    return { displayName: location }
  }

  // Mock store sections with coordinates for the floor plan
  const storeSections = [
    { id: 'entrance', name: 'Entrance', x: 50, y: 90, type: 'entrance' },
    { id: 'level1-shoes', name: 'Level 1, Shoes', x: 20, y: 70, type: 'department', gridSections: ['A1-A5', 'B1-B5'] },
    { id: 'level1-accessories', name: 'Level 1, Accessories', x: 80, y: 70, type: 'department', gridSections: ['H1-H5', 'I1-I5'] },
    { id: 'level1-checkout', name: 'Checkout', x: 50, y: 75, type: 'service' },
    { id: 'escalator', name: 'Escalator', x: 50, y: 50, type: 'navigation' },
    { id: 'level2-womens-casual', name: 'Level 2, Women\'s Casual', x: 20, y: 30, type: 'department', gridSections: ['C1-C8', 'D1-D8'] },
    { id: 'level2-womens-formal', name: 'Level 2, Women\'s Formal', x: 50, y: 30, type: 'department', gridSections: ['E1-E8', 'F1-F8'] },
    { id: 'level2-womens-business', name: 'Level 2, Women\'s Business', x: 80, y: 30, type: 'department', gridSections: ['G1-G8', 'H1-H8'] },
    { id: 'level2-fitting-rooms', name: 'Fitting Rooms', x: 50, y: 15, type: 'service' },
    { id: 'level2-customer-service', name: 'Customer Service', x: 20, y: 15, type: 'service' }
  ]

  // Enhanced item location matching
  const getItemLocations = () => {
    return selectedItems.map(item => {
      const parsed = parseLocation(item.storeLocation)
      
      // Find matching department
      let matchedSection = null
      if (parsed.department) {
        matchedSection = storeSections.find(section => section.id === parsed.department)
      } else if (parsed.section) {
        // Find section that contains this grid location
        matchedSection = storeSections.find(section => 
          section.gridSections?.some(gridRange => {
            const sectionLetter = parsed.section
            const ranges = gridRange.split('-')
            if (ranges.length === 2) {
              const startLetter = ranges[0].charAt(0)
              const endLetter = ranges[1].charAt(0)
              return sectionLetter >= startLetter && sectionLetter <= endLetter
            }
            return false
          })
        )
      }

      return {
        ...item,
        parsed,
        matchedSection,
        displayLocation: parsed.displayName
      }
    })
  }

  const itemLocations = getItemLocations()
  const highlightedSections = storeSections.filter(section => 
    itemLocations.some(item => item.matchedSection?.id === section.id)
  )

  const getSectionColor = (section: any) => {
    const isHighlighted = highlightedSections.some(h => h.id === section.id)
    
    if (isHighlighted) return 'bg-blue-500 border-blue-600 text-white shadow-lg'
    
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
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Store Map */}
            <div className="relative bg-gray-50 rounded-xl p-4 h-80 overflow-hidden mb-6">
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
            <div className="grid grid-cols-2 gap-2 text-xs mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded border shadow-sm"></div>
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

            {/* Enhanced Items List */}
            {itemLocations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                  <Search className="h-4 w-4 mr-1" />
                  Find Your Items
                </h3>
                <div className="space-y-3">
                  {itemLocations.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-blue-900 text-sm block">{item.name}</span>
                          <div className="flex items-center mt-1">
                            <MapPin className="h-3 w-3 text-blue-600 mr-1" />
                            <span className="text-xs text-blue-700">{item.displayLocation}</span>
                          </div>
                          {item.matchedSection && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                📍 {item.matchedSection.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Store Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-gray-500 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-2">Store Information</p>
                  <div className="space-y-1">
                    <p><strong>Hours:</strong> 10 AM - 9 PM</p>
                    <p><strong>Grid System:</strong> Items located by section (A-I) and row (1-8)</p>
                    <p><strong>Navigation:</strong> Use escalator to move between levels</p>
                    <p><strong>Assistance:</strong> Customer service on Level 2</p>
                    <p><strong>Fitting Rooms:</strong> Available on Level 2</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
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