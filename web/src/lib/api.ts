/**
 * API request helpers with automatic session ID injection
 */

import { getApiUrl } from '../config'

export interface ApiRequestOptions extends RequestInit {
  includeSession?: boolean
}

/**
 * Make an API request with automatic session ID header
 */
export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { includeSession = true, headers = {}, ...fetchOptions } = options

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Add session ID from localStorage if available
  if (includeSession) {
    const sessionId = localStorage.getItem('session_id')
    if (sessionId) {
      ;(requestHeaders as Record<string, string>)['X-Session-ID'] = sessionId
    }
  }

  return fetch(getApiUrl(path), {
    ...fetchOptions,
    headers: requestHeaders,
    credentials: 'include',
  })
}
