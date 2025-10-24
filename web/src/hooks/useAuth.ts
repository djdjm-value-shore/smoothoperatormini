import { useState, useEffect } from 'react'
import { getApiUrl } from '../config'
import type { SessionStatus } from '../types'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      const response = await fetch(getApiUrl('/session-status'), {
        headers: {
          'X-Session-ID': sessionId || '',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data: SessionStatus = await response.json()
        setIsAuthenticated(data.passcode_verified)
        setHasApiKey(data.api_key_set)
      } else {
        setIsAuthenticated(false)
        setHasApiKey(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
      setHasApiKey(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return {
    isAuthenticated,
    hasApiKey,
    isLoading,
    refresh: checkAuth,
  }
}
