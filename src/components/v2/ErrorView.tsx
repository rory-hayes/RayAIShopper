import React from 'react'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'

interface ErrorViewProps {
  error: string
  onRetry: () => void
  onSimplifiedSearch?: () => void
}

export const ErrorView: React.FC<ErrorViewProps> = ({ 
  error, 
  onRetry, 
  onSimplifiedSearch 
}) => {
  // Determine error type for better messaging
  const getErrorInfo = (error: string) => {
    if (error.includes('timeout') || error.includes('taking longer')) {
      return {
        icon: <AlertTriangle className="h-8 w-8 text-amber-600" />,
        title: 'Request Taking Longer Than Expected',
        subtitle: 'AI processing is working hard to find your perfect items',
        bgColor: 'bg-amber-100',
        suggestion: 'Try again or use simplified search for faster results'
      }
    } else if (error.includes('Network') || error.includes('connection')) {
      return {
        icon: <X className="h-8 w-8 text-red-600" />,
        title: 'Connection Issue',
        subtitle: 'Unable to connect to our recommendation service',
        bgColor: 'bg-red-100',
        suggestion: 'Check your internet connection and try again'
      }
    } else if (error.includes('No article types')) {
      return {
        icon: <AlertTriangle className="h-8 w-8 text-blue-600" />,
        title: 'Missing Preferences',
        subtitle: 'Please select your preferred item types to continue',
        bgColor: 'bg-blue-100',
        suggestion: 'Go back and select at least one item type (shirts, jeans, etc.)'
      }
    } else {
      return {
        icon: <X className="h-8 w-8 text-red-600" />,
        title: 'Unable to Load Recommendations',
        subtitle: 'Something went wrong while finding your items',
        bgColor: 'bg-red-100',
        suggestion: 'Please try again or use simplified search'
      }
    }
  }

  const errorInfo = getErrorInfo(error)

  return (
    <div className="max-w-md mx-auto px-6 py-8 text-center">
      {/* Error Icon */}
      <div className={`${errorInfo.bgColor} p-3 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-6`}>
        {errorInfo.icon}
      </div>
      
      {/* Error Title */}
      <h1 className="text-2xl font-medium text-gray-900 mb-3">
        {errorInfo.title}
      </h1>
      
      {/* Error Subtitle */}
      <p className="text-gray-600 mb-4">
        {errorInfo.subtitle}
      </p>
      
      {/* Technical Error Details (Collapsed) */}
      <details className="mb-6 text-left">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
          Technical Details
        </summary>
        <div className="mt-2 p-3 bg-gray-100 rounded-md text-sm text-gray-700 font-mono break-words">
          {error}
        </div>
      </details>
      
      {/* Suggestion Text */}
      <p className="text-sm text-gray-600 mb-8">
        {errorInfo.suggestion}
      </p>
      
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={onRetry} 
          fullWidth
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        
        {onSimplifiedSearch && (
          <Button 
            onClick={onSimplifiedSearch}
            variant="secondary" 
            fullWidth
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Use Simplified Search
          </Button>
        )}
        
        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-4">
          If the problem persists, try selecting different item types or reducing your requirements.
        </p>
      </div>
    </div>
  )
} 