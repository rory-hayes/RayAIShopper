import React from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Step1Welcome } from './Step1Welcome'
import { Step2AboutYou } from './Step2AboutYou'
import { Step3UploadInspiration } from './Step3UploadInspiration'
import { Step4UploadSelfie } from './Step4UploadSelfie'
import { Step5AIWorking } from './Step5AIWorking'
import { Step6OutfitRail } from './Step6OutfitRail'
import { Step7Checkout } from './Step7Checkout'
import { Step8Summary } from './Step8Summary'

export const WizardContainer: React.FC = () => {
  const { currentStep, nextStep } = useWizard()
  
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
        return <Step6OutfitRail onNext={nextStep} />
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
      
      {/* Step content */}
      <div className="transition-all duration-300">
        {renderStep()}
      </div>
    </div>
  )
}