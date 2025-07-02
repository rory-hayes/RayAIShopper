import React from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface LoadingViewProps {
  expectedCategories: string[]
}

export const LoadingView: React.FC<LoadingViewProps> = ({ expectedCategories }) => {
  return (
    <div className="max-w-md mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 animate-pulse">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Finding Your Perfect Items
        </h1>
        <p className="text-gray-600">
          Searching through thousands of products...
        </p>
      </div>
      
      {/* Category Loading Cards */}
      <div className="space-y-4">
        {expectedCategories.map((category, index) => (
          <div key={category} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">{category}</h3>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
            
            {/* Product Skeleton Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  {/* Image skeleton */}
                  <div className="bg-gray-200 h-20 rounded-lg mb-2"></div>
                  {/* Title skeleton */}
                  <div className="bg-gray-200 h-4 rounded w-3/4 mb-1"></div>
                  {/* Price skeleton */}
                  <div className="bg-gray-200 h-3 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            
            {/* Progress indicator */}
            <div className="mt-3 bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full"
                style={{
                  width: '60%',
                  animation: 'loading-progress 2s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Overall Progress */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>
            Analyzing {expectedCategories.length} categories...
          </span>
        </div>
      </div>
    </div>
  )
} 