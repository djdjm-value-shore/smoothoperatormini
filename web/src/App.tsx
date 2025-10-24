import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChatPage } from './pages/ChatPage'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated, hasApiKey, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">Loading...</p>
        </div>
      </div>
    )
  }

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
