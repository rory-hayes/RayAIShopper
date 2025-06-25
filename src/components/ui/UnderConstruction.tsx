import React from 'react'
import { Settings, Lock, Calendar } from 'lucide-react'

export const UnderConstruction: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo/Brand Area */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Ray AI Shopper</h1>
          <p className="text-gray-600">AI-Powered Fashion Recommendations</p>
        </div>

        {/* Construction Message */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Settings className="h-8 w-8 text-gray-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          
          <h2 className="text-xl font-medium text-gray-900 mb-3">Under Construction</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We're putting the finishing touches on your personalized shopping experience. 
            Our AI fashion assistant is learning the latest trends and preparing to help you 
            discover your perfect style.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Coming Soon</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            <span>Access temporarily restricted during development</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400">
          © 2025 Ray AI Shopper. All rights reserved.
        </div>
        
        {/* Development Hint - Very subtle */}
        <div className="mt-4 text-xs text-gray-300 opacity-50">
          Dev: Add ?admin=ray_admin_2025 to URL for access
        </div>
      </div>
    </div>
  )
} 