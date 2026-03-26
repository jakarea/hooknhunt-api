import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v2'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for mobile networks
})

// Request interceptor to add auth token and track start time
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Store start time for response time tracking
    config.metadata = { startTime: Date.now() }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and response time tracking
api.interceptors.response.use(
  (response) => {
    // Calculate REAL total response time (server + network + client processing)
    const startTime = response.config.metadata?.startTime
    if (startTime) {
      const duration = Date.now() - startTime

      // Override backend's response_time with actual round-trip time (real total time)
      if (response.data && typeof response.data === 'object') {
        response.data.response_time = duration
      }
    }

    return response
  },
  (error: AxiosError) => {
    const { showErrorToast } = errorHandlers

    // Network error (no internet connection)
    if (!error.response) {
      showErrorToast('network_error')
      return Promise.reject({ ...error, handled: true, message: 'Network error. Please check your connection.' })
    }

    const status = error.response.status
    const data: unknown = error.response.data

    // Handle specific error status codes
    switch (status) {
      case 401:
        // Don't redirect if we're already on login page (let the login form handle the error)
        const currentPath = window.location.pathname
        if (currentPath !== '/login') {
          // Unauthorized - clear auth and redirect to login
          useAuthStore.getState().logout()
          showErrorToast('session_expired')
          window.location.href = '/login'
        }
        break

      case 403:
        showErrorToast((data as any)?.message || 'access_denied')
        break

      case 404:
        showErrorToast((data as any)?.message || 'resource_not_found')
        break

      case 400:
      case 422:
        // Business logic and validation errors - return as is for component-level handling
        return Promise.reject({
          ...error,
          handled: true,
        })

      case 500:
        showErrorToast('server_error')
        break

      case 503:
        showErrorToast('service_unavailable')
        break

      default:
        showErrorToast((data as any)?.message || 'something_went_wrong')
    }

    return Promise.reject(error)
  }
)

// Error handler functions
const errorHandlers = {
  showErrorToast: (key: string) => {
    const messages: Record<string, string> = {
      network_error: 'Network error. Please check your connection.',
      session_expired: 'Your session has expired. Please login again.',
      access_denied: 'You do not have permission to access this resource.',
      resource_not_found: 'The requested resource was not found.',
      server_error: 'Server error. Please try again later.',
      service_unavailable: 'Service is temporarily unavailable.',
      something_went_wrong: 'Something went wrong. Please try again.',
    }
    useUIStore.getState().showToast(messages[key] || messages.something_went_wrong, 'error')
  },
}

// Type-safe API methods
export const apiMethods = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    api.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    api.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown) =>
    api.patch<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    api.delete<T>(url).then((res) => res.data),
}

export default api
