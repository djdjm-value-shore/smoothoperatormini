import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChatPage } from './pages/ChatPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated, hasApiKey } = useAuth()

  return (
    <div className="min-h-screen bg-base-200">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/chat"
          element={
            isAuthenticated && hasApiKey ? (
              <ChatPage />
            ) : !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/settings" replace />
            )
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
