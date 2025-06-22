import React from 'react'
import { WizardProvider } from './contexts/WizardContext'
import { ChatProvider } from './contexts/ChatContext'
import { WizardContainer } from './components/wizard/WizardContainer'
import { ChatAssistant } from './components/ui/ChatAssistant'

function App() {
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