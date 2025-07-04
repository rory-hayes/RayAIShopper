import React, { useState } from 'react'
import { X, ShoppingBag, Sparkles, Plus } from 'lucide-react'
import { Button } from './Button'
import { ProductItem, ProductItemSummary, CompleteTheLookSuggestion } from '../../services/api'

interface CompleteTheLookModalProps {
  isOpen: boolean
  onClose: () => void
  baseItem: ProductItem
  suggestions: CompleteTheLookSuggestion
  onAddToCart: (items: ProductItem[]) => void
  onAddItem: (item: ProductItem) => void
}

export const CompleteTheLookModal: React.FC<CompleteTheLookModalProps> = ({
  isOpen,
  onClose,
  baseItem,
  suggestions,
  onAddToCart,
  onAddItem
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set([baseItem.id]))

  if (!isOpen) return null

  const handleItemToggle = (item: ProductItemSummary) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(item.id)) {
        newSet.delete(item.id)
      } else {
        newSet.add(item.id)
      }
      return newSet
    })
  }

  const handleAddToCart = () => {
    const allItems = Object.values(suggestions.suggested_items).flat()
    const selectedSuggestions = allItems.filter(item => selectedItems.has(item.id))
    
    // Convert ProductItemSummary to ProductItem format
    const convertedItems: ProductItem[] = [
      baseItem, // Always include the base item
      ...selectedSuggestions.map(summary => ({
        id: summary.id,
        name: summary.name,
        category: summary.category,
        subcategory: summary.category, // Use category as subcategory
        article_type: summary.article_type,
        color: summary.color,
        gender: baseItem.gender, // Inherit gender from base item
        season: undefined,
        usage: 'General', // Default usage
        image_url: summary.image_url,
        similarity_score: summary.similarity_score ?? 0.8, // Provide default value
        store_location: undefined
      } as ProductItem))
    ]
    
    onAddToCart(convertedItems)
    onClose()
  }

  const handleAddIndividualItem = (item: ProductItemSummary) => {
    // Convert ProductItemSummary to ProductItem format
    const convertedItem: ProductItem = {
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.category,
      article_type: item.article_type,
      color: item.color,
      gender: baseItem.gender,
      season: undefined,
      usage: 'General',
      image_url: item.image_url,
      similarity_score: item.similarity_score ?? 0.8, // Provide default value
      store_location: undefined
    }
    
    onAddItem(convertedItem)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Complete the Look</h2>
              <p className="text-sm text-gray-600">Perfect pieces to go with your {baseItem.article_type.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Style Rationale */}
          {suggestions.style_rationale && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
              <p className="text-sm text-indigo-800 font-medium">
                💡 {suggestions.style_rationale}
              </p>
            </div>
          )}

          {/* Base Item */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Your Selected Item</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <img
                  src={baseItem.image_url}
                  alt={baseItem.name}
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{baseItem.name}</h4>
                  <p className="text-sm text-gray-600">{baseItem.article_type} in {baseItem.color}</p>
                </div>
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Items by Category */}
          {Object.entries(suggestions.suggested_items).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Add {category}
              </h3>
              <div className="grid gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedItems.has(item.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleItemToggle(item)}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.article_type} in {item.color}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddIndividualItem(item)
                          }}
                          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedItems.has(item.id)
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedItems.has(item.id) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedItems.size} item{selectedItems.size === 1 ? '' : 's'} selected
            </p>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="secondary"
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCart}
                disabled={selectedItems.size === 0}
                className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Add Selected to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 