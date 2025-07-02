import React from 'react'
import { Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { useWizard } from '../../contexts/WizardContext'
import { convertToUserProfile, ProductItem } from '../../services/api'
import { useRecommendationsV2 } from '../../hooks/useRecommendationsV2'
import { LoadingView } from './LoadingView'
import { ErrorView } from './ErrorView'
import { EmptyView } from './EmptyView'

interface Step6Props {
  onNext: () => void
}

export const Step6RecommendationsV2: React.FC<Step6Props> = ({ onNext }) => {
  const { formData } = useWizard()
  const userProfile = convertToUserProfile(formData)
  
  const { 
    status, 
    categories, 
    selectedCategory, 
    selectedItems,
    error, 
    debugInfo,
    retry, 
    selectCategory, 
    toggleItem,
    getDisplayItems,
    totalItems,
    categoryNames,
    hasItems,
    selectedCount
  } = useRecommendationsV2(userProfile)

  // Handle continue to next step
  const handleNext = () => {
    if (selectedCount > 0) {
      console.log('✅ V2 Component: Proceeding with selected items:', Array.from(selectedItems))
      onNext()
    }
  }

  // Handle simplified search fallback
  const handleSimplifiedSearch = () => {
    console.log('🔄 V2 Component: Switching to simplified search mode')
    // Could implement a fallback to the original API or simplified search
    retry()
  }

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

  // Render success state with recommendations
  return (
    <div className="max-w-md mx-auto px-6 py-8">
      {/* Header */}
      <Header 
        totalItems={totalItems}
        categoryCount={categoryNames.length}
        selectedCount={selectedCount}
      />
      
      {/* Category Tabs */}
      <CategoryTabs 
        categories={categoryNames}
        categoriesData={categories}
        selected={selectedCategory}
        onSelect={selectCategory}
      />
      
      {/* Items Grid */}
      <ItemGrid 
        items={getDisplayItems(selectedCategory)}
        selectedItems={selectedItems}
        onToggleItem={toggleItem}
      />
      
      {/* Debug Panel (Development Only) */}
      {debugInfo && process.env.NODE_ENV === 'development' && (
        <DebugPanel debugInfo={debugInfo} />
      )}
      
      {/* Continue Button */}
      <ContinueButton 
        selectedCount={selectedCount}
        onNext={handleNext}
        disabled={selectedCount === 0}
      />
    </div>
  )
}

// Header Component
interface HeaderProps {
  totalItems: number
  categoryCount: number
  selectedCount: number
}

const Header: React.FC<HeaderProps> = ({ totalItems, categoryCount, selectedCount }) => (
  <div className="text-center mb-6">
    <h1 className="text-3xl font-light text-gray-900 mb-2">
      Your Personalized Recommendations
    </h1>
    <p className="text-gray-600">
      {totalItems} items found across {categoryCount} categories
    </p>
    {selectedCount > 0 && (
      <p className="text-sm text-blue-600 mt-2">
        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
      </p>
    )}
  </div>
)

// Category Tabs Component
interface CategoryTabsProps {
  categories: string[]
  categoriesData: any
  selected: string
  onSelect: (category: string) => void
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ 
  categories, 
  categoriesData, 
  selected, 
  onSelect 
}) => (
  <div className="flex flex-wrap gap-2 mb-6">
    <button
      onClick={() => onSelect('all')}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        selected === 'all'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      All Categories
    </button>
    {categories.map(category => (
      <button
        key={category}
        onClick={() => onSelect(category)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selected === category
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {category} ({categoriesData[category]?.items.length || 0})
      </button>
    ))}
  </div>
)

// Items Grid Component
interface ItemGridProps {
  items: ProductItem[]
  selectedItems: Set<string>
  onToggleItem: (itemId: string) => void
}

const ItemGrid: React.FC<ItemGridProps> = ({ items, selectedItems, onToggleItem }) => (
  <div className="grid grid-cols-2 gap-4 mb-6">
    {items.map(item => (
      <div
        key={item.id}
        onClick={() => onToggleItem(item.id)}
        className={`relative bg-white rounded-lg border cursor-pointer transition-all hover:shadow-md ${
          selectedItems.has(item.id)
            ? 'border-blue-500 ring-2 ring-blue-200'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Selection Indicator */}
        {selectedItems.has(item.id) && (
          <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1 z-10">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        
        {/* Product Image */}
        <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/api/placeholder/150/150'
            }}
          />
        </div>
        
        {/* Product Info */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 mb-1">
            {item.article_type} • {item.color}
          </p>
          <p className="text-xs text-green-600 font-medium">
            Available
          </p>
        </div>
      </div>
    ))}
  </div>
)

// Continue Button Component
interface ContinueButtonProps {
  selectedCount: number
  onNext: () => void
  disabled: boolean
}

const ContinueButton: React.FC<ContinueButtonProps> = ({ 
  selectedCount, 
  onNext, 
  disabled 
}) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
    <div className="max-w-md mx-auto">
      <Button
        onClick={onNext}
        disabled={disabled}
        fullWidth
        className={`${
          disabled 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } transition-colors`}
      >
        {selectedCount > 0 
          ? `Continue with ${selectedCount} item${selectedCount > 1 ? 's' : ''}`
          : 'Select items to continue'
        }
      </Button>
    </div>
  </div>
)

// Debug Panel Component (Development Only)
interface DebugPanelProps {
  debugInfo: any
}

const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo }) => (
  <div className="mt-6 p-4 bg-gray-900 text-white rounded-lg text-xs">
    <h4 className="font-bold mb-2">🔍 Debug Info</h4>
    <div className="space-y-1">
      <div><strong>Selections:</strong> {debugInfo.user_selections.join(', ')}</div>
      <div><strong>Found:</strong> {debugInfo.categories_found.join(', ')}</div>
      <div><strong>Missing:</strong> {debugInfo.categories_missing.join(', ')}</div>
      <div><strong>Total Items:</strong> {debugInfo.total_items}</div>
      <div><strong>Search Mode:</strong> {debugInfo.search_mode}</div>
      <div><strong>Processing Time:</strong> {debugInfo.processing_time_ms}ms</div>
    </div>
  </div>
) 