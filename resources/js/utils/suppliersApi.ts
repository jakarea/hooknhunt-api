/**
 * SWR fetchers and utilities for Suppliers API.
 *
 * Implements SWR pattern for efficient data fetching with:
 * - Automatic caching
 * - Background revalidation
 * - Optimistic updates
 * - Error handling
 */

import { mutate } from 'swr'
import { getSuppliers, type Supplier } from '@/utils/api'

// ============================================================================
// FETCHER FUNCTIONS
// ============================================================================

/**
 * Fetcher function for SWR
 * Wraps API calls and handles errors
 *
 * @param key - SWR cache key (can be string or array)
 * @returns Promise resolving to data
 *
 * @example
 * fetcher('/api/suppliers')
 * fetcher(['/api/suppliers', { page: 1 }])
 */
export const fetcher = async (key: string | [string, any]): Promise<any> => {
  if (Array.isArray(key)) {
    const [url, params] = key
    const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  const response = await fetch(key, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch suppliers list with optional filters
 *
 * @param params - Query parameters
 * @returns Promise resolving to suppliers response
 *
 * @example
 * await fetchSuppliers({ page: 1, per_page: 15, search: 'john' })
 */
export const fetchSuppliersSwr = async (params: {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean | null
}): Promise<{ data: Supplier[]; meta: any }> => {
  try {
    const response = await getSuppliers(params)
    return response
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
    throw error
  }
}

/**
 * Fetch single supplier by ID
 *
 * @param id - Supplier ID
 * @returns Promise resolving to supplier
 *
 * @example
 * await fetchSupplier(1)
 */
export const fetchSupplier = async (id: number): Promise<Supplier> => {
  const response = await fetch(`/api/v2/procurement/suppliers/${id}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data.data
}

// ============================================================================
// SWR CACHE KEYS
// ============================================================================

/**
 * Generate cache key for suppliers list
 *
 * @param params - Query parameters
 * @returns SWR cache key
 *
 * @example
 * getSuppliersKey({ page: 1, search: 'john' })
 * // Returns: ['/api/v2/procurement/suppliers', { page: 1, search: 'john' }]
 */
export const getSuppliersKey = (params?: {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean | null
}): [string, object] | null => {
  if (!params) return null
  return ['/api/v2/procurement/suppliers', params]
}

/**
 * Generate cache key for single supplier
 *
 * @param id - Supplier ID
 * @returns SWR cache key
 *
 * @example
 * getSupplierKey(1)
 * // Returns: '/api/v2/procurement/suppliers/1'
 */
export const getSupplierKey = (id: number | null): string | null => {
  if (!id) return null
  return `/api/v2/procurement/suppliers/${id}`
}

// ============================================================================
// MUTATION HELPERS
// ============================================================================

/**
 * Optimistically update supplier in cache
 *
 * @param id - Supplier ID
 * @param updates - Partial supplier data to update
 *
 * @example
 * updateSupplierCache(1, { name: 'New Name', isActive: true })
 */
export const updateSupplierCache = (id: number, updates: Partial<Supplier>) => {
  // Update single supplier cache
  mutate(
    getSupplierKey(id),
    (current: Supplier) => ({ ...current, ...updates }),
    false
  )

  // Update suppliers list cache (handle Laravel paginator structure)
  mutate(
    getSuppliersKey({ page: 1, per_page: 50 }),
    (current: any) => {
      // Handle Laravel paginator: { data: { data: [...], ... } }
      if (current?.data?.data) {
        return {
          ...current,
          data: {
            ...current.data,
            data: current.data.data.map((s: Supplier) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          },
        }
      }
      // Handle simple pagination: { data: [...], ... }
      if (current?.data && Array.isArray(current.data)) {
        return {
          ...current,
          data: current.data.map((s: Supplier) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }
      }
      return current
    },
    false
  )
}

/**
 * Optimistically add supplier to cache
 *
 * @param supplier - Supplier to add
 *
 * @example
 * addSupplierToCache(newSupplier)
 */
export const addSupplierToCache = (supplier: Supplier) => {
  mutate(
    getSuppliersKey({ page: 1, per_page: 50 }),
    (current: any) => {
      // Handle Laravel paginator: { data: { data: [...], total: N } }
      if (current?.data?.data) {
        return {
          ...current,
          data: {
            ...current.data,
            data: [supplier, ...current.data.data],
            total: current.data.total + 1,
          },
        }
      }
      // Handle simple pagination: { data: [...], meta: { total: N } }
      if (current?.data && Array.isArray(current.data)) {
        return {
          ...current,
          data: [supplier, ...current.data],
          meta: {
            ...current.meta,
            total: current.meta.total + 1,
          },
        }
      }
      // No data yet, create new structure
      return {
        data: {
          data: [supplier],
          total: 1,
          current_page: 1,
          per_page: 50,
        },
      }
    },
    false
  )
}

/**
 * Optimistically remove supplier from cache
 *
 * @param id - Supplier ID to remove
 *
 * @example
 * removeSupplierFromCache(1)
 */
export const removeSupplierFromCache = (id: number) => {
  mutate(
    getSuppliersKey({ page: 1, per_page: 50 }),
    (current: any) => {
      // Handle Laravel paginator: { data: { data: [...], total: N } }
      if (current?.data?.data) {
        return {
          ...current,
          data: {
            ...current.data,
            data: current.data.data.filter((s: Supplier) => s.id !== id),
            total: Math.max(0, current.data.total - 1),
          },
        }
      }
      // Handle simple pagination: { data: [...], meta: { total: N } }
      if (current?.data && Array.isArray(current.data)) {
        return {
          ...current,
          data: current.data.filter((s: Supplier) => s.id !== id),
          meta: {
            ...current.meta,
            total: Math.max(0, current.meta.total - 1),
          },
        }
      }
      return current
    },
    false
  )
}

// ============================================================================
// REVALIDATION HELPERS
// ============================================================================

/**
 * Revalidate all suppliers caches
 * Use this after mutations to refresh data
 *
 * @example
 * await revalidateSuppliers()
 */
export const revalidateSuppliers = async () => {
  // Revalidate list cache
  await mutate(getSuppliersKey({ page: 1, per_page: 50 }))

  // Revalidate all individual supplier caches
  // (SWR will handle this automatically if they're being used)
}

/**
 * Revalidate single supplier cache
 *
 * @param id - Supplier ID
 *
 * @example
 * await revalidateSupplier(1)
 */
export const revalidateSupplier = async (id: number) => {
  await mutate(getSupplierKey(id))
}

/**
 * Clear all suppliers caches
 * Use this when logging out or clearing data
 *
 * @example
 * clearSuppliersCache()
 */
export const clearSuppliersCache = () => {
  // Clear list cache
  mutate(getSuppliersKey({ page: 1, per_page: 50 }), undefined, false)

  // Clear all individual caches by matching pattern
  // (Note: SWR doesn't provide a direct way to clear by pattern,
  // but caches will be cleared when components unmount)
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Check if error is a network error
 *
 * @param error - Error object
 * @returns true if network error
 *
 * @example
 * if (isNetworkError(error)) {
 *   notifications.show({ title: 'Network Error', message: 'Check your connection' })
 * }
 */
export const isNetworkError = (error: any): boolean => {
  return (
    error instanceof TypeError &&
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch')
  )
}

/**
 * Check if error is an auth error
 *
 * @param error - Error object
 * @returns true if auth error
 *
 * @example
 * if (isAuthError(error)) {
 *   navigate('/login')
 * }
 */
export const isAuthError = (error: any): boolean => {
  return error?.response?.status === 401 || error?.status === 401
}

/**
 * Get user-friendly error message
 *
 * @param error - Error object
 * @returns User-friendly message
 *
 * @example
 * const message = getErrorMessage(error)
 * notifications.show({ title: 'Error', message })
 */
export const getErrorMessage = (error: any): string => {
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection.'
  }

  if (isAuthError(error)) {
    return 'Session expired. Please log in again.'
  }

  if (error?.response?.status === 404) {
    return 'The requested resource was not found.'
  }

  if (error?.response?.status === 500) {
    return 'Server error. Please try again later.'
  }

  return error?.message || 'An unexpected error occurred'
}
