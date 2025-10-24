import { useState } from 'react'
import { Settings, Key, MessageSquare } from 'lucide-react'
import { apiRequest } from '../lib/api'

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await apiRequest('/set-key', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Force page navigation to trigger auth re-check
        // Using window.location instead of navigate() to force reload
        setTimeout(() => {
          window.location.href = '/chat'
        }, 500)
      } else {
        setError(data.detail || 'Failed to set API key')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-center mb-6">
            <Settings className="w-12 h-12 text-primary" />
          </div>

          <h2 className="card-title text-2xl font-bold text-center mb-2">
            API Configuration
          </h2>

          <p className="text-center text-base-content/70 mb-6">
            Provide your OpenAI API key to enable chat
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">OpenAI API Key</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <input
                  type="password"
                  placeholder="sk-..."
                  className="input input-bordered w-full pl-10"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  Your key is stored in session memory only
                </span>
              </label>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span>API key saved! Redirecting to chat...</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading || !apiKey}
            >
              {isLoading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Continue to Chat
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
