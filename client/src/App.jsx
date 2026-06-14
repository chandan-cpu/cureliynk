import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import AIHealthAssistant from './pages/AIHealthAssistant'

const App = () => {
  const [activePage, setActivePage] = useState('dashboard')

  return activePage === 'chat' ? (
    <AIHealthAssistant onBack={() => setActivePage('dashboard')} />
  ) : (
    <Dashboard onNavigateChat={() => setActivePage('chat')} />
  )
}

export default App