# Improved Recommendation System Architecture

## 1. Backend-First Approach

### Reliable Data Contract
```typescript
interface RecommendationResponse {
  success: boolean
  error?: string
  categories: {
    [categoryName: string]: {
      items: ProductItem[]
      total_available: number
      requested_count: number
    }
  }
  session_id: string
  debug_info?: {
    user_selections: string[]
    categories_found: string[]
    categories_missing: string[]
    total_items: number
  }
}
```

### Backend Guarantees
- Always return the exact categories requested
- If a category has no items, return empty array with explanation
- Consistent data structure regardless of search mode (FAISS/embedding/keyword)
- Clear error messages for debugging

## 2. Simplified Frontend State

### Single Source of Truth
```typescript
interface RecommendationState {
  status: 'loading' | 'success' | 'error' | 'empty'
  categories: Record<string, CategoryData>
  selectedCategory: string
  error?: string
  debugInfo?: DebugInfo
}

interface CategoryData {
  items: ProductItem[]
  totalAvailable: number
  displayedItems: ProductItem[]
  isLoading: boolean
}
```

### No Complex Fallbacks
- Remove cached recommendations complexity
- Remove mock data fallbacks
- Single API call, single response handling
- Clear error states with retry options

## 3. Better UX Patterns

### Progressive Loading
```tsx
// Show skeleton for each expected category immediately
const expectedCategories = ['Tshirts', 'Jeans', 'Casual Shoes']

return (
  <div className="categories">
    {expectedCategories.map(category => (
      <CategorySection 
        key={category}
        name={category}
        status={getLoadingStatus(category)}
        items={getCategoryItems(category)}
        onRetry={() => retryCategory(category)}
      />
    ))}
  </div>
)
```

### Clear Error States
- "No Tshirts found for men - try different filters"
- "Connection issue - retry"
- "Search taking longer than expected"

### Smart Defaults
- Show all available items if categorization fails
- Graceful degradation to basic grid view
- Always actionable (never blank screen)

## 4. Implementation Strategy

### Phase 1: Backend Reliability
1. **Standardize Response Format**
   - Always return requested categories (even if empty)
   - Include debug information in development
   - Consistent error messages

2. **Improve Search Logic**
   - Fix gender/article type mapping once in backend
   - Return category-aware results
   - Handle edge cases (no results, timeout)

### Phase 2: Frontend Simplification
1. **Remove Complex State**
   - Single recommendation hook
   - Clear loading/error/success states
   - Remove caching complexity

2. **Better UI Components**
   - Category-aware loading states
   - Inline error messages with retry
   - Progressive enhancement

### Phase 3: Enhanced UX
1. **Smart Interactions**
   - Quick filters within categories
   - Infinite scroll instead of "More Options"
   - Real-time feedback on actions

2. **Performance Optimization**
   - Image lazy loading
   - Virtual scrolling for large lists
   - Optimistic updates

## 5. Proposed Implementation

### Backend API Change
```python
@router.post("/recommendations/v2")
async def get_recommendations_v2(request: RecommendationRequest):
    try:
        # Ensure we have expected categories
        user_categories = request.user_profile.preferred_article_types
        if not user_categories:
            raise ValueError("No article types specified")
        
        result = {
            "success": True,
            "categories": {},
            "session_id": str(uuid.uuid4()),
            "debug_info": {
                "user_selections": user_categories,
                "categories_found": [],
                "categories_missing": [],
                "total_items": 0
            }
        }
        
        # Search for each category individually
        for category in user_categories:
            items = await search_category(category, request)
            result["categories"][category] = {
                "items": items,
                "total_available": len(items),
                "requested_count": request.items_per_category or 20
            }
            
            if items:
                result["debug_info"]["categories_found"].append(category)
            else:
                result["debug_info"]["categories_missing"].append(category)
        
        result["debug_info"]["total_items"] = sum(
            len(cat["items"]) for cat in result["categories"].values()
        )
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "categories": {},
            "session_id": None
        }
```

### Frontend Hook
```typescript
function useRecommendations(userProfile: UserProfile) {
  const [state, setState] = useState<RecommendationState>({
    status: 'loading',
    categories: {},
    selectedCategory: 'all'
  })
  
  const fetchRecommendations = async () => {
    setState(prev => ({ ...prev, status: 'loading' }))
    
    try {
      const response = await apiService.getRecommendationsV2({
        user_profile: userProfile,
        items_per_category: 20
      })
      
      if (response.success) {
        setState({
          status: 'success',
          categories: response.categories,
          selectedCategory: 'all',
          debugInfo: response.debug_info
        })
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: response.error
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }))
    }
  }
  
  return {
    ...state,
    retry: fetchRecommendations,
    selectCategory: (category: string) => 
      setState(prev => ({ ...prev, selectedCategory: category }))
  }
}
```

### Simplified Component
```tsx
export const Step6RecommendationsV2: React.FC = ({ onNext }) => {
  const { formData } = useWizard()
  const userProfile = convertToUserProfile(formData)
  const { status, categories, selectedCategory, error, retry } = useRecommendations(userProfile)
  
  if (status === 'loading') {
    return <LoadingView expectedCategories={userProfile.preferred_article_types} />
  }
  
  if (status === 'error') {
    return <ErrorView error={error} onRetry={retry} />
  }
  
  const categoryNames = Object.keys(categories)
  const hasItems = categoryNames.some(cat => categories[cat].items.length > 0)
  
  if (!hasItems) {
    return <EmptyView userProfile={userProfile} onRetry={retry} />
  }
  
  return (
    <div className="recommendations-v2">
      <CategoryTabs 
        categories={categoryNames}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        counts={categories}
      />
      
      <ItemGrid 
        items={getDisplayItems(categories, selectedCategory)}
        onItemAction={handleItemAction}
      />
      
      <ContinueButton 
        selectedCount={getSelectedCount()}
        onNext={onNext}
      />
    </div>
  )
}
```

## 6. Benefits of This Approach

### Reliability
- ✅ Single source of truth
- ✅ Predictable error handling
- ✅ Clear data contracts
- ✅ No silent failures

### Performance
- ✅ Simpler state management
- ✅ Fewer re-renders
- ✅ Better caching strategies
- ✅ Optimistic updates

### Developer Experience
- ✅ Easier debugging
- ✅ Clear error messages
- ✅ Testable components
- ✅ Type safety

### User Experience
- ✅ Clear loading states
- ✅ Actionable error messages
- ✅ Predictable behavior
- ✅ Graceful degradation

## 7. Migration Plan

1. **Week 1**: Implement backend v2 API alongside existing
2. **Week 2**: Create new frontend components with simplified state
3. **Week 3**: A/B test both approaches
4. **Week 4**: Migration and cleanup

This approach removes the complexity and brittleness while providing a much better user experience. 