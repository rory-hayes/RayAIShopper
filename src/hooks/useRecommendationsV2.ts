import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiService, UserProfile, ProductItem, CategoryResult, DebugInfo, RecommendationResponseV2 } from '../services/api'

interface RecommendationState {
  status: 'loading' | 'success' | 'error' | 'empty'
  categories: Record<string, CategoryResult>
  displayedItems: Record<string, ProductItem[]>  // Items currently shown to user (20 per category)
  reserveItems: Record<string, ProductItem[]>    // Items held in reserve (20 per category)
  selectedCategory: string
  error?: string
  debugInfo?: DebugInfo
  selectedItems: Set<string>
}

export const useRecommendationsV2 = (userProfile: UserProfile) => {
  const [state, setState] = useState<RecommendationState>({
    status: 'loading',
    categories: {},
    displayedItems: {},
    reserveItems: {},
    selectedCategory: 'all',
    selectedItems: new Set()
  })

  // Memoize userProfile to prevent unnecessary re-renders
  const stableUserProfile = useMemo(() => userProfile, [
    userProfile.shopping_prompt,
    userProfile.gender,
    JSON.stringify(userProfile.preferred_styles),
    JSON.stringify(userProfile.preferred_colors),
    JSON.stringify(userProfile.preferred_article_types)
  ])

  const fetchRecommendations = useCallback(async () => {
    if (!stableUserProfile.preferred_article_types?.length) {
      setState(prev => ({ ...prev, status: 'empty' }))
      return
    }

    setState(prev => ({ ...prev, status: 'loading' }))
    console.log('🔄 V2 Hook: Fetching recommendations for user profile:', stableUserProfile)

    try {
      const response = await apiService.getRecommendationsV2({
        user_profile: stableUserProfile,
        items_per_category: 20  // Backend will return 40 (20 + 20 reserves)
      })

      console.log('📥 V2 Hook: API Response:', response)

      if (!response.success || !response.categories) {
        throw new Error(response.error || 'Failed to get recommendations')
      }

      // Split items into displayed (first 20) and reserve (next 20) for each category
      const displayedItems: Record<string, ProductItem[]> = {}
      const reserveItems: Record<string, ProductItem[]> = {}
      
      Object.entries(response.categories).forEach(([categoryName, categoryData]) => {
        const allItems = categoryData.items || []
        displayedItems[categoryName] = allItems.slice(0, 20)  // First 20 for display
        reserveItems[categoryName] = allItems.slice(20, 40)   // Next 20 for reserves
        
        console.log(`📦 V2 Hook: Category ${categoryName} - Displayed: ${displayedItems[categoryName].length}, Reserve: ${reserveItems[categoryName].length}`)
      })

      const categoryNames = Object.keys(response.categories)
      const totalDisplayedItems = Object.values(displayedItems).reduce((sum, items) => sum + items.length, 0)
      const totalReserveItems = Object.values(reserveItems).reduce((sum, items) => sum + items.length, 0)

      console.log('✅ V2 Hook: Successfully loaded recommendations:', {
        totalCategories: categoryNames.length,
        totalDisplayedItems,
        totalReserveItems,
        categoriesFound: categoryNames.filter(cat => displayedItems[cat]?.length > 0),
        categoriesMissing: categoryNames.filter(cat => !displayedItems[cat]?.length)
      })

      if (totalDisplayedItems === 0) {
        setState(prev => ({
          ...prev,
          status: 'empty',
          categories: response.categories,
          displayedItems,
          reserveItems,
          debugInfo: response.debug_info
        }))
      } else {
        setState(prev => ({
          ...prev,
          status: 'success',
          categories: response.categories,
          displayedItems,
          reserveItems,
          debugInfo: response.debug_info,
          selectedCategory: categoryNames.length === 1 ? categoryNames[0] : 'all'
        }))
      }

    } catch (error) {
      console.error('❌ V2 Hook: Fetch error:', error)
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [stableUserProfile])

  // Replace a disliked item with one from reserves
  const replaceItem = useCallback((itemId: string, categoryName: string) => {
    setState(prev => {
      const currentDisplayed = prev.displayedItems[categoryName] || []
      const currentReserves = prev.reserveItems[categoryName] || []
      
      // Find the item to replace
      const itemIndex = currentDisplayed.findIndex(item => item.id === itemId)
      if (itemIndex === -1) {
        console.warn(`🔄 V2 Hook: Item ${itemId} not found in displayed items for category ${categoryName}`)
        return prev
      }

      // Check if we have reserves available
      if (currentReserves.length === 0) {
        console.warn(`🔄 V2 Hook: No reserve items available for category ${categoryName}`)
        return prev
      }

      // Get the replacement item (first from reserves)
      const replacementItem = currentReserves[0]
      const removedItem = currentDisplayed[itemIndex]
      
      // Update displayed items (replace the disliked item)
      const newDisplayed = [...currentDisplayed]
      newDisplayed[itemIndex] = replacementItem
      
      // Update reserves (remove the used item, add the disliked item to end)
      const newReserves = [...currentReserves.slice(1), removedItem]
      
      console.log(`🔄 V2 Hook: Replaced item "${removedItem.name}" with "${replacementItem.name}" in category ${categoryName}`)
      console.log(`📦 V2 Hook: Category ${categoryName} now has ${newReserves.length} reserves remaining`)

      return {
        ...prev,
        displayedItems: {
          ...prev.displayedItems,
          [categoryName]: newDisplayed
        },
        reserveItems: {
          ...prev.reserveItems,
          [categoryName]: newReserves
        }
      }
    })
  }, [])

  const selectCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }))
    console.log('🏷️ V2 Hook: Selected category:', category)
  }, [])

  const toggleItemSelection = useCallback((itemId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedItems)
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId)
      } else {
        newSelected.add(itemId)
      }
      return { ...prev, selectedItems: newSelected }
    })
  }, [])

  // Get items to display based on selected category
  const getDisplayItems = useCallback((category: string) => {
    if (category === 'all') {
      // Show first 6 items from each category for 'all' view
      return Object.values(state.displayedItems).flatMap(items => items.slice(0, 6))
    }
    return state.displayedItems[category] || []
  }, [state.displayedItems])

  // Auto-fetch when userProfile changes
  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const categoryNames = Object.keys(state.categories)
  const totalItems = Object.values(state.displayedItems).reduce((sum, items) => sum + items.length, 0)
  const hasItems = totalItems > 0

  return {
    status: state.status,
    categories: state.categories,
    selectedCategory: state.selectedCategory,
    error: state.error,
    debugInfo: state.debugInfo,
    selectedItems: state.selectedItems,
    retry: fetchRecommendations,
    selectCategory,
    toggleItemSelection,
    replaceItem,  // New function for thumbs down
    getDisplayItems,
    totalItems,
    categoryNames,
    hasItems
  }
} 