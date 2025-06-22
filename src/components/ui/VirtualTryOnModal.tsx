import React, { useState, useEffect } from 'react'
import { X, Download, Share, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from './Button'
import { virtualTryOn, EnhancedTryonRequest, EnhancedTryonResponse } from '../../services/api'

interface VirtualTryOnModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  productImage: string
  userSelfie: string // base64
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productImage,
  userSelfie
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [tryOnResult, setTryOnResult] = useState<EnhancedTryonResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTryOnResult(null)
      setError(null)
      setProgress(0)
      // Start generation automatically
      generateTryOn()
    }
  }, [isOpen])

  // Progress simulation for better UX
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev // Stop at 90%, wait for actual completion
          return prev + Math.random() * 10
        })
      }, 500)

      return () => clearInterval(interval)
    }
  }, [isGenerating])

  const generateTryOn = async () => {
    if (!userSelfie) {
      setError('No selfie available. Please go back to Step 4 to upload a selfie.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(10)

    try {
      const request: EnhancedTryonRequest = {
        product_id: productId,
        user_image: userSelfie,
        style_prompt: `wearing ${productName}, fashion photography style`
      }

      console.log('🔥 TRYON: Starting virtual try-on generation...')
      const result = await virtualTryOn(request)
      
      setProgress(100)
      setTryOnResult(result)
      console.log('✅ TRYON: Successfully generated virtual try-on')
      
    } catch (err) {
      console.error('❌ TRYON: Generation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate virtual try-on')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetry = () => {
    generateTryOn()
  }

  const handleDownload = () => {
    if (tryOnResult?.generated_image_url) {
      const link = document.createElement('a')
      link.href = tryOnResult.generated_image_url
      link.download = `virtual-tryon-${productName.replace(/\s+/g, '-').toLowerCase()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = async () => {
    if (tryOnResult?.generated_image_url && navigator.share) {
      try {
        await navigator.share({
          title: `Virtual Try-On: ${productName}`,
          text: `Check out how I look in this ${productName}!`,
          url: tryOnResult.generated_image_url
        })
      } catch (err) {
        console.log('Share cancelled or failed')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Virtual Try-On</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Loading State */}
          {isGenerating && (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-white animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Creating your virtual try-on...</h3>
                <p className="text-sm text-gray-600">
                  AI is analyzing your photo and generating a personalized image
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <p className="text-xs text-gray-500">
                This usually takes 10-15 seconds...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isGenerating && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <X className="h-8 w-8 text-red-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Oops! Something went wrong</h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleRetry} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Success State */}
          {tryOnResult && !isGenerating && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Here's how you look!</h3>
                <p className="text-sm text-gray-600">AI-generated virtual try-on of {productName}</p>
              </div>

              {/* Image Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Original Product */}
                <div className="space-y-2">
                  <img
                    src={productImage}
                    alt="Original product"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-xs text-center text-gray-500">Original</p>
                </div>

                {/* Virtual Try-On Result */}
                <div className="space-y-2">
                  <img
                    src={tryOnResult.generated_image_url}
                    alt="Virtual try-on result"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-xs text-center text-gray-500">Virtual Try-On</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleDownload} variant="secondary" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Save
                </Button>
                
                {navigator.share && (
                  <Button onClick={handleShare} variant="secondary" className="flex-1">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
                
                <Button onClick={handleRetry} variant="ghost" className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>

              <Button onClick={onClose} fullWidth variant="secondary">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 