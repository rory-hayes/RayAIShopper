import React from 'react'
import { WizardProvider } from './contexts/WizardContext'
import { WizardContainer } from './components/wizard/WizardContainer'
import { ChatButton } from './components/ui/ChatButton'

function App() {
  return (
    <WizardProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <WizardContainer />
        <ChatButton />
      </div>
    </WizardProvider>
  )
}

export default App