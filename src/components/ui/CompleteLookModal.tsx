import React, { useState } from 'react'
import { X, ShoppingBag, Sparkles, Heart, Plus } from 'lucide-react'
import { ProductItem } from '../../services/api'
import { Button } from './Button'

interface CompleteLookModalProps {
  isOpen: boolean
  onClose: () => void
  baseItem: ProductItem
  suggestions: Record<string, ProductItem[]>
  onAddToCart: (items: ProductItem[]) => void
  onAddSingleItem: (item: ProductItem) => void
  styleReasoning?: string
}

export const CompleteLookModal: React.FC<CompleteLookModalProps> = ({
  isOpen,
  onClose,
  baseItem,
  suggestions,
  onAddToCart,
  onAddSingleItem,
  styleReasoning
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set([baseItem.id]))
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())

  if (!isOpen) return null

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleLikeItem = (itemId: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleAddCompleteOutfit = () => {
    const allItems = [baseItem]
    Object.values(suggestions).forEach(categoryItems => {
      categoryItems.forEach(item => {
        if (selectedItems.has(item.id)) {
          allItems.push(item)
        }
      })
    })
    onAddToCart(allItems)
    onClose()
  }

  const selectedCount = selectedItems.size
  const categoryCount = Object.keys(suggestions).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Complete the Look</h2>
              <p className="text-sm text-gray-600">
                {categoryCount} complementary piece{categoryCount > 1 ? 's' : ''} found
              </p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Style Reasoning */}
          {styleReasoning && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-sm text-purple-800 font-medium mb-1">Style Insight</p>
              <p className="text-sm text-purple-700">{styleReasoning}</p>
            </div>
          )}

          {/* Base Item */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Your Selected Item</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex gap-4">
                <div className="relative">
                  <img
                    src={baseItem.image_url}
                    alt={baseItem.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                    }}
                  />
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full">
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{baseItem.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{baseItem.article_type} in {baseItem.color}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Selected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Items by Category */}
          <div className="space-y-6">
            {Object.entries(suggestions).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {category} ({items.length} option{items.length > 1 ? 's' : ''})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        selectedItems.has(item.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleItemToggle(item.id)}
                    >
                      <div className="flex gap-3">
                        <div className="relative">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=400'
                            }}
                          />
                          {selectedItems.has(item.id) && (
                            <div className="absolute -top-1 -right-1 bg-purple-500 text-white p-1 rounded-full">
                              <Plus className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{item.article_type} in {item.color}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{item.store_location || 'Available'}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleLikeItem(item.id)
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                likedItems.has(item.id)
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${likedItems.has(item.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="secondary"
                className="text-gray-700 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCompleteOutfit}
                disabled={selectedCount === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Add Complete Look ({selectedCount})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 