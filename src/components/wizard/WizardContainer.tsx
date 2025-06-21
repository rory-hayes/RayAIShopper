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

const steps = [
  Step1Welcome,
  Step2AboutYou,
  Step3UploadInspiration,
  Step4UploadSelfie,
  Step5AIWorking,
  Step6OutfitRail,
  Step7Checkout,
  Step8Summary
]

export const WizardContainer: React.FC = () => {
  const { currentStep } = useWizard()
  
  const CurrentStepComponent = steps[currentStep - 1]
  
  if (!CurrentStepComponent) {
    return <div>Step not found</div>
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
        <CurrentStepComponent />
      </div>
    </div>
  )
}