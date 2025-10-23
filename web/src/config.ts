/**
 * Application configuration
 */

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  apiPrefix: '/api',
} as const

export const getApiUrl = (path: string): string => {
  return `${config.apiUrl}${config.apiPrefix}${path}`
}

export const getFullApiUrl = (path: string): string => {
  return `${config.apiUrl}${path}`
}
