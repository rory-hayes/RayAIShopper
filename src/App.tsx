import React from 'react'
import { WizardProvider } from './contexts/WizardContext'
import { ChatProvider } from './contexts/ChatContext'
import { WizardContainer } from './components/wizard/WizardContainer'
import { ChatAssistant } from './components/ui/ChatAssistant'
import { UnderConstruction } from './components/ui/UnderConstruction'
import { isUnderConstruction } from './config/app'

function App() {
  // Check if the app is under construction
  if (isUnderConstruction()) {
    return <UnderConstruction />
  }

  // Normal app rendering
  return (
    <ChatProvider>
      <WizardProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <WizardContainer />
          <ChatAssistant />
        </div>
      </WizardProvider>
    </ChatProvider>
  )
}

export default App