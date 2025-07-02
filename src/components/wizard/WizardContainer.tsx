import React from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Step1Welcome } from './Step1Welcome'
import { Step2AboutYou } from './Step2AboutYou'
import { Step3UploadInspiration } from './Step3UploadInspiration'
import { Step4UploadSelfie } from './Step4UploadSelfie'
import { Step5AIWorking } from './Step5AIWorking'
import { Step6OutfitRail } from './Step6OutfitRail'
import { Step6RecommendationsV2 } from '../v2/Step6RecommendationsV2'
import { Step7Checkout } from './Step7Checkout'
import { Step8Summary } from './Step8Summary'

export const WizardContainer: React.FC = () => {
  const { currentStep, nextStep } = useWizard()
  
  // Feature flag for V2 recommendations
  const envFlag = process.env.REACT_APP_USE_RECOMMENDATIONS_V2 === 'true'
  const localStorageFlag = localStorage.getItem('useRecommendationsV2') === 'true'
  const urlFlag = new URLSearchParams(window.location.search).get('v2') === 'true'
  const useV2Recommendations = envFlag || localStorageFlag || urlFlag
  
  // Debug logging
  console.log('🚀 V2 Feature Flag Check:', {
    envFlag,
    localStorageFlag,
    urlFlag,
    useV2Recommendations,
    currentStep,
    nodeEnv: process.env.NODE_ENV
  })
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome />
      case 2:
        return <Step2AboutYou />
      case 3:
        return <Step3UploadInspiration />
      case 4:
        return <Step4UploadSelfie />
      case 5:
        return <Step5AIWorking />
      case 6:
        console.log('🎯 Rendering Step 6:', useV2Recommendations ? 'V2' : 'V1')
        return useV2Recommendations 
          ? <Step6RecommendationsV2 onNext={nextStep} />
          : <Step6OutfitRail onNext={nextStep} />
      case 7:
        return <Step7Checkout />
      case 8:
        return <Step8Summary />
      default:
        return <div>Step not found</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1">
        <div 
          className="bg-gray-900 h-1 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 8) * 100}%` }}
        />
      </div>
      
      {/* V2 Feature Indicator (Always show when V2 is active) */}
      {useV2Recommendations && (
        <div className="bg-blue-600 text-white text-center py-1 text-xs">
          🚀 Using V2 Recommendations API
        </div>
      )}
      
      {/* Step content */}
      <div className="transition-all duration-300">
        {renderStep()}
      </div>
    </div>
  )
}