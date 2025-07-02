import { useState, useCallback, useEffect } from 'react'
import { apiService, UserProfile, ProductItem, CategoryResult, DebugInfo, RecommendationResponseV2 } from '../services/api'

interface RecommendationState {
  status: 'loading' | 'success' | 'error' | 'empty'
  categories: Record<string, CategoryResult>
  selectedCategory: string
  error?: string
  debugInfo?: DebugInfo
  selectedItems: Set<string>
}

export const useRecommendationsV2 = (userProfile: UserProfile) => {
  const [state, setState] = useState<RecommendationState>({
    status: 'loading',
    categories: {},
    selectedCategory: 'all',
    selectedItems: new Set()
  })

  const fetchRecommendations = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading', error: undefined }))

    try {
      console.log('🔄 V2 Hook: Fetching recommendations for user profile:', userProfile)
      
      const response = await apiService.getRecommendationsV2({
        user_profile: userProfile,
        items_per_category: 20
      })

      console.log('📥 V2 Hook: API Response:', response)

      if (response.success) {
        const hasItems = Object.values(response.categories).some(cat => cat.items.length > 0)
        
        setState(prev => ({
          ...prev,
          status: hasItems ? 'success' : 'empty',
          categories: response.categories,
          debugInfo: response.debug_info,
          error: undefined
        }))
        
        console.log('✅ V2 Hook: Successfully loaded recommendations:', {
          totalCategories: Object.keys(response.categories).length,
          totalItems: response.debug_info?.total_items || 0,
          categoriesFound: response.debug_info?.categories_found || [],
          categoriesMissing: response.debug_info?.categories_missing || []
        })
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: response.error || 'Unknown error occurred'
        }))
        
        console.error('❌ V2 Hook: API returned error:', response.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recommendations'
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }))
      
      console.error('❌ V2 Hook: Fetch error:', error)
    }
  }, [userProfile])

  const selectCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }))
    console.log('🏷️ V2 Hook: Selected category:', category)
  }, [])

  const toggleItem = useCallback((itemId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedItems)
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId)
        console.log('➖ V2 Hook: Deselected item:', itemId)
      } else {
        newSelected.add(itemId)
        console.log('➕ V2 Hook: Selected item:', itemId)
      }
      return { ...prev, selectedItems: newSelected }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: new Set() }))
    console.log('🗑️ V2 Hook: Cleared all selections')
  }, [])

  const getDisplayItems = useCallback((category: string) => {
    if (category === 'all') {
      // Show first 2 items from each category for "All" view
      const allItems: ProductItem[] = []
      Object.entries(state.categories).forEach(([catName, catData]) => {
        allItems.push(...catData.items.slice(0, 2))
      })
      return allItems
    } else {
      // Show first 6 items for specific category
      return state.categories[category]?.items.slice(0, 6) || []
    }
  }, [state.categories])

  // Auto-fetch when userProfile changes
  useEffect(() => {
    if (userProfile && userProfile.preferred_article_types?.length > 0) {
      fetchRecommendations()
    }
  }, [fetchRecommendations])

  return {
    ...state,
    retry: fetchRecommendations,
    selectCategory,
    toggleItem,
    clearSelection,
    getDisplayItems,
    // Computed values
    totalItems: state.debugInfo?.total_items || 0,
    categoryNames: Object.keys(state.categories),
    hasItems: Object.values(state.categories).some(cat => cat.items.length > 0),
    selectedCount: state.selectedItems.size
  }
} 