import React from 'react'
import { Settings, Lock } from 'lucide-react'

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
      </div>
    </div>
  )
} 