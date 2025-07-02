import React from 'react'
import { Search, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { UserProfile } from '../../services/api'

interface EmptyViewProps {
  userProfile: UserProfile
  onRetry: () => void
  onBroaderSearch?: () => void
}

export const EmptyView: React.FC<EmptyViewProps> = ({ 
  userProfile, 
  onRetry, 
  onBroaderSearch 
}) => {
  return (
    <div className="max-w-md mx-auto px-6 py-8 text-center">
      {/* Empty Icon */}
      <div className="bg-gray-100 p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-6">
        <Search className="h-10 w-10 text-gray-400" />
      </div>
      
      {/* Title */}
      <h1 className="text-2xl font-medium text-gray-900 mb-3">
        No Items Found
      </h1>
      
      {/* Subtitle with user context */}
      <p className="text-gray-600 mb-6">
        We couldn't find any {userProfile.preferred_article_types?.join(', ')} for {userProfile.gender.toLowerCase()} 
        {userProfile.preferred_styles && userProfile.preferred_styles.length > 0 && 
          ` in ${userProfile.preferred_styles.join(', ')} style`
        }.
      </p>
      
      {/* Suggestions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center">
          <Sparkles className="h-4 w-4 mr-2" />
          Try These Suggestions:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Choose different item types (e.g., shirts instead of t-shirts)</li>
          <li>• Broaden your style preferences</li>
          <li>• Remove specific color requirements</li>
          <li>• Try a different shopping prompt</li>
        </ul>
      </div>
      
      {/* Current Search Details */}
      <details className="mb-6 text-left">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          Your Current Search
        </summary>
        <div className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700">
          <div><strong>Items:</strong> {userProfile.preferred_article_types?.join(', ') || 'None'}</div>
          <div><strong>Gender:</strong> {userProfile.gender}</div>
          <div><strong>Styles:</strong> {userProfile.preferred_styles?.join(', ') || 'Any'}</div>
          <div><strong>Colors:</strong> {userProfile.preferred_colors?.join(', ') || 'Any'}</div>
          <div><strong>Prompt:</strong> {userProfile.shopping_prompt}</div>
        </div>
      </details>
      
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={onRetry} 
          fullWidth
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Search Again
        </Button>
        
        {onBroaderSearch && (
          <Button 
            onClick={onBroaderSearch}
            variant="secondary" 
            fullWidth
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-4 w-4 mr-2" />
            Broader Search
          </Button>
        )}
        
        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-4">
          You can also go back and modify your preferences in the previous steps.
        </p>
      </div>
    </div>
  )
} 