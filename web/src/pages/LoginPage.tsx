import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { getApiUrl } from '../config'

export function LoginPage() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(getApiUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ passcode }),
      })

      const data = await response.json()

      if (response.ok) {
        navigate('/settings')
      } else {
        setError(data.detail || 'Login failed')
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
            <LogIn className="w-12 h-12 text-primary" />
          </div>

          <h2 className="card-title text-2xl font-bold text-center mb-2">
            SmoothOperator
          </h2>

          <p className="text-center text-base-content/70 mb-6">
            Enter your passcode to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Passcode</span>
              </label>
              <input
                type="password"
                placeholder="Enter passcode"
                className="input input-bordered w-full"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading || !passcode}
            >
              {isLoading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
