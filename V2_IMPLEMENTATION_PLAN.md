# V2 Recommendation System Implementation Plan

## Phase 1: Backend V2 API (Day 1-2)

### Step 1: Create V2 Response Models
```python
# backend/app/models/responses.py

class CategoryResult(BaseModel):
    items: List[ProductItem]
    total_available: int
    requested_count: int
    search_time_ms: Optional[int] = None

class DebugInfo(BaseModel):
    user_selections: List[str]
    categories_found: List[str]
    categories_missing: List[str]
    total_items: int
    search_mode: str  # "faiss", "embedding", "keyword"
    processing_time_ms: int

class RecommendationResponseV2(BaseModel):
    success: bool
    error: Optional[str] = None
    categories: Dict[str, CategoryResult]
    session_id: str
    debug_info: Optional[DebugInfo] = None
```

### Step 2: Create V2 Service Method
```python
# backend/app/services/recommendation_service.py

async def get_recommendations_v2(self, request: RecommendationRequest) -> RecommendationResponseV2:
    """
    V2 API that guarantees category structure and clear error handling
    """
    start_time = time.time()
    
    try:
        user_categories = request.user_profile.preferred_article_types
        if not user_categories:
            raise ValueError("No article types specified")
        
        # Initialize response structure
        result = RecommendationResponseV2(
            success=True,
            categories={},
            session_id=str(uuid.uuid4()),
            debug_info=DebugInfo(
                user_selections=user_categories,
                categories_found=[],
                categories_missing=[],
                total_items=0,
                search_mode=self._get_search_mode(),
                processing_time_ms=0
            )
        )
        
        # Search each category individually
        for category in user_categories:
            category_start = time.time()
            
            items = await self._search_single_category(
                category=category,
                request=request
            )
            
            category_time = int((time.time() - category_start) * 1000)
            
            result.categories[category] = CategoryResult(
                items=items,
                total_available=len(items),
                requested_count=request.items_per_category or 20,
                search_time_ms=category_time
            )
            
            if items:
                result.debug_info.categories_found.append(category)
            else:
                result.debug_info.categories_missing.append(category)
        
        # Calculate totals
        result.debug_info.total_items = sum(
            len(cat.items) for cat in result.categories.values()
        )
        result.debug_info.processing_time_ms = int((time.time() - start_time) * 1000)
        
        return result
        
    except Exception as e:
        logger.error(f"V2 API Error: {e}")
        return RecommendationResponseV2(
            success=False,
            error=str(e),
            categories={},
            session_id=str(uuid.uuid4())
        )
```

### Step 3: Create V2 Route
```python
# backend/app/api/routes.py

@router.post("/recommendations/v2", response_model=RecommendationResponseV2)
async def get_recommendations_v2(request: RecommendationRequest):
    """
    V2 Recommendations API with guaranteed category structure
    """
    return await recommendation_service.get_recommendations_v2(request)
```

## Phase 2: Frontend V2 Components (Day 3-4)

### Step 1: Create V2 Hook
```typescript
// src/hooks/useRecommendationsV2.ts

interface RecommendationState {
  status: 'loading' | 'success' | 'error' | 'empty'
  categories: Record<string, CategoryData>
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
    setState(prev => ({ ...prev, status: 'loading' }))
    
    try {
      const response = await apiService.getRecommendationsV2({
        user_profile: userProfile,
        items_per_category: 20
      })
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          status: 'success',
          categories: response.categories,
          debugInfo: response.debug_info
        }))
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
  }, [userProfile])
  
  const selectCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }))
  }, [])
  
  const toggleItem = useCallback((itemId: string) => {
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
  
  return {
    ...state,
    retry: fetchRecommendations,
    selectCategory,
    toggleItem
  }
}
```

### Step 2: Create Loading Component
```tsx
// src/components/v2/LoadingView.tsx

interface LoadingViewProps {
  expectedCategories: string[]
}

export const LoadingView: React.FC<LoadingViewProps> = ({ expectedCategories }) => {
  return (
    <div className="max-w-md mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Finding Your Perfect Items
        </h1>
        <p className="text-gray-600">
          Searching through thousands of products...
        </p>
      </div>
      
      <div className="space-y-4">
        {expectedCategories.map((category, index) => (
          <div key={category} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">{category}</h3>
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-16 rounded-lg mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-3/4 mb-1"></div>
                  <div className="bg-gray-200 h-3 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Step 3: Create Error Component
```tsx
// src/components/v2/ErrorView.tsx

interface ErrorViewProps {
  error: string
  onRetry: () => void
}

export const ErrorView: React.FC<ErrorViewProps> = ({ error, onRetry }) => {
  return (
    <div className="max-w-md mx-auto px-6 py-8 text-center">
      <div className="bg-red-100 p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4">
        <X className="h-8 w-8 text-red-600" />
      </div>
      
      <h1 className="text-2xl font-medium text-gray-900 mb-4">
        Unable to Load Recommendations
      </h1>
      
      <p className="text-gray-600 mb-8">
        {error}
      </p>
      
      <div className="space-y-3">
        <Button onClick={onRetry} fullWidth>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        
        <Button variant="secondary" fullWidth>
          Use Simplified Search
        </Button>
      </div>
    </div>
  )
}
```

### Step 4: Create Main V2 Component
```tsx
// src/components/v2/Step6RecommendationsV2.tsx

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
    toggleItem 
  } = useRecommendationsV2(userProfile)
  
  if (status === 'loading') {
    return <LoadingView expectedCategories={userProfile.preferred_article_types} />
  }
  
  if (status === 'error') {
    return <ErrorView error={error!} onRetry={retry} />
  }
  
  const categoryNames = Object.keys(categories)
  const hasItems = categoryNames.some(cat => categories[cat].items.length > 0)
  
  if (!hasItems) {
    return <EmptyView userProfile={userProfile} onRetry={retry} />
  }
  
  return (
    <div className="max-w-md mx-auto px-6 py-8">
      <Header 
        totalItems={debugInfo?.total_items || 0}
        categoryCount={categoryNames.length}
      />
      
      <CategoryTabs 
        categories={categoryNames}
        categoriesData={categories}
        selected={selectedCategory}
        onSelect={selectCategory}
      />
      
      <ItemGrid 
        items={getDisplayItems(categories, selectedCategory)}
        selectedItems={selectedItems}
        onToggleItem={toggleItem}
      />
      
      {debugInfo && process.env.NODE_ENV === 'development' && (
        <DebugPanel debugInfo={debugInfo} />
      )}
      
      <ContinueButton 
        selectedCount={selectedItems.size}
        onNext={() => handleNext(selectedItems)}
        disabled={selectedItems.size === 0}
      />
    </div>
  )
}
```

## Phase 3: Integration & Testing (Day 5)

### Step 1: Add V2 Route to API Service
```typescript
// src/services/api.ts

async getRecommendationsV2(request: RecommendationRequest): Promise<RecommendationResponseV2> {
  return this.makeRequest('/recommendations/v2', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
```

### Step 2: Update Wizard to Use V2
```tsx
// src/components/wizard/Wizard.tsx

const Step6Component = useMemo(() => {
  // Use feature flag or environment variable
  const useV2 = process.env.REACT_APP_USE_RECOMMENDATIONS_V2 === 'true'
  
  return useV2 ? Step6RecommendationsV2 : Step6OutfitRail
}, [])

// In render:
{currentStep === 6 && <Step6Component onNext={nextStep} />}
```

### Step 3: A/B Testing Setup
```typescript
// src/hooks/useFeatureFlag.ts

export const useRecommendationsV2 = () => {
  // Could be environment variable, user preference, or A/B test
  return process.env.REACT_APP_USE_RECOMMENDATIONS_V2 === 'true' ||
         localStorage.getItem('useRecommendationsV2') === 'true'
}
```

## Success Metrics

### Technical Metrics
- ✅ API response time < 3 seconds
- ✅ 0% silent failures (all errors are shown to user)
- ✅ 100% category accuracy (user gets exactly what they requested)
- ✅ <5 React re-renders per interaction

### User Experience Metrics  
- ✅ Clear loading states (no blank screens)
- ✅ Actionable error messages (retry buttons work)
- ✅ Predictable behavior (same input = same output)
- ✅ Fast interactions (< 200ms for UI updates)

## Timeline
- **Day 1**: Backend V2 API implementation
- **Day 2**: Backend testing and debugging
- **Day 3**: Frontend V2 components
- **Day 4**: Frontend integration and styling
- **Day 5**: End-to-end testing and deployment

This plan ensures we build a reliable, user-friendly recommendation system that eliminates the current bugs and complexity. 