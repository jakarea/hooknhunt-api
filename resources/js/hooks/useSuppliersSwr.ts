/**
 * Custom SWR hooks for Suppliers module.
 *
 * Provides convenient hooks for data fetching with automatic:
 * - Caching
 * - Revalidation
 * - Optimistic updates
 * - Error handling
 */

import useSWR, { useSWRConfig } from 'swr'
import { useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import {
  fetcher,
  fetchSuppliersSwr,
  fetchSupplier,
  getSuppliersKey,
  getSupplierKey,
  updateSupplierCache,
  addSupplierToCache,
  removeSupplierFromCache,
  revalidateSuppliers,
  revalidateSupplier,
  getErrorMessage,
} from '@/utils/suppliersApi'
import type { Supplier } from '@/types/supplier'

// ============================================================================
// SUPPLIERS LIST HOOK
// ============================================================================

interface UseSuppliersOptions {
  page?: number
  perPage?: number
  search?: string
  isActive?: boolean | null
  enabled?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
}

interface UseSuppliersReturn {
  suppliers: Supplier[]
  isLoading: boolean
  isError: boolean
  error: any
  isValidating: boolean
  mutate: any
  refresh: () => Promise<void>
}

/**
 * Hook for fetching suppliers list with SWR
 *
 * @param options - Fetch options
 * @returns Suppliers data and SWR utilities
 *
 * @example
 * const { suppliers, isLoading, isError, refresh } = useSuppliers({
 *   page: 1,
 *   perPage: 15,
 *   search: 'john',
 *   isActive: true
 * })
 */
export function useSuppliers(options: UseSuppliersOptions = {}): UseSuppliersReturn {
  const {
    page = 1,
    perPage = 15,
    search = '',
    isActive = null,
    enabled = true,
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
  } = options

  const key = getSuppliersKey({
    page,
    per_page: perPage,
    search: search || undefined,
    is_active: isActive,
  })

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled && key ? key : null,
    () => fetchSuppliersSwr({
      page,
      per_page: perPage,
      search: search || undefined,
      is_active: isActive,
    }),
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      dedupingInterval: 2000, // Don't make same request within 2 seconds
      errorRetryCount: 3,
      onError: (error) => {
        console.error('Failed to fetch suppliers:', error)
        if (error?.status !== 401) {
          // Don't show notification for auth errors (handled globally)
          notifications.show({
            title: 'Error',
            message: getErrorMessage(error),
            color: 'red',
          })
        }
      },
    }
  )

  // Handle different response structures:
  // - Laravel paginator: { data: { data: [...], meta: {...} } }
  // - Laravel pagination: { data: [...], meta: {...} }
  // - Direct array: [...]
  // - Error state: undefined
  const suppliers = Array.isArray(data?.data?.data) ? data.data.data :  // Laravel paginator
                   Array.isArray(data?.data) ? data.data :              // Laravel pagination
                   Array.isArray(data) ? data :                          // Direct array
                   []

  const refresh = async () => {
    await mutate()
  }

  return {
    suppliers,
    isLoading,
    isError: !!error,
    error,
    isValidating,
    mutate,
    refresh,
  }
}

// ============================================================================
// SINGLE SUPPLIER HOOK
// ============================================================================

interface UseSupplierReturn {
  supplier: Supplier | undefined
  isLoading: boolean
  isError: boolean
  error: any
  isValidating: boolean
  mutate: any
  refresh: () => Promise<void>
}

/**
 * Hook for fetching single supplier with SWR
 *
 * @param id - Supplier ID
 * @param options - SWR options
 * @returns Supplier data and SWR utilities
 *
 * @example
 * const { supplier, isLoading, isError } = useSupplier(1)
 */
export function useSupplier(
  id: number | null,
  options: { enabled?: boolean } = {}
): UseSupplierReturn {
  const { enabled = true } = options

  const key = getSupplierKey(id)

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled && key ? key : null,
    () => fetchSupplier(id!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      errorRetryCount: 3,
    }
  )

  const supplier = data

  const refresh = async () => {
    await mutate()
  }

  return {
    supplier,
    isLoading,
    isError: !!error,
    error,
    isValidating,
    mutate,
    refresh,
  }
}

// ============================================================================
// SUPPLIERS MUTATION HOOKS
// ============================================================================

/**
 * Hook for optimistic supplier updates
 *
 * @returns Mutation functions
 *
 * @example
 * const { updateSupplier, createSupplier, deleteSupplier } = useSupplierMutations()
 */
export function useSupplierMutations() {
  const { mutate: globalMutate } = useSWRConfig()

  /**
   * Optimistically update a supplier
   *
   * @param id - Supplier ID
   * @param updates - Partial supplier data
   * @param apiCall - API function to call
   *
   * @example
   * await updateSupplier(1, { name: 'New Name' }, () => updateSupplierApi(1, data))
   */
  const updateSupplier = async (
    id: number,
    updates: Partial<Supplier>,
    apiCall: () => Promise<void>
  ) => {
    // Optimistically update cache
    updateSupplierCache(id, updates)

    try {
      // Call API
      await apiCall()

      // Revalidate to get latest data
      await revalidateSupplier(id)
      await revalidateSuppliers()

      notifications.show({
        title: 'Success',
        message: 'Supplier updated successfully',
        color: 'green',
      })
    } catch (error) {
      // Rollback on error (SWR will automatically rollback)
      await revalidateSupplier(id)
      await revalidateSuppliers()

      notifications.show({
        title: 'Error',
        message: getErrorMessage(error),
        color: 'red',
      })

      throw error
    }
  }

  /**
   * Optimistically create a supplier
   *
   * @param tempSupplier - Temporary supplier (with negative ID)
   * @param apiCall - API function to call
   * @returns Created supplier from API
   *
   * @example
   * await createSupplier(tempSupplier, () => createSupplierApi(data))
   */
  const createSupplier = async (
    tempSupplier: Supplier,
    apiCall: () => Promise<Supplier>
  ) => {
    // Optimistically add to cache
    addSupplierToCache(tempSupplier)

    try {
      // Call API
      const created = await apiCall()

      // Revalidate to get latest data
      await revalidateSuppliers()

      notifications.show({
        title: 'Success',
        message: 'Supplier created successfully',
        color: 'green',
      })

      return created
    } catch (error) {
      // Rollback on error
      await revalidateSuppliers()

      notifications.show({
        title: 'Error',
        message: getErrorMessage(error),
        color: 'red',
      })

      throw error
    }
  }

  /**
   * Optimistically delete a supplier
   *
   * @param supplier - Supplier to delete
   * @param apiCall - API function to call
   *
   * @example
   * await deleteSupplier(supplier, () => deleteSupplierApi(supplier.id))
   */
  const deleteSupplier = async (
    supplier: Supplier,
    apiCall: () => Promise<void>
  ) => {
    // Optimistically remove from cache
    removeSupplierFromCache(supplier.id)

    try {
      // Call API
      await apiCall()

      // Clear single supplier cache
      await globalMutate(getSupplierKey(supplier.id))

      notifications.show({
        title: 'Success',
        message: 'Supplier deleted successfully',
        color: 'green',
      })
    } catch (error) {
      // Rollback on error
      await revalidateSuppliers()

      notifications.show({
        title: 'Error',
        message: getErrorMessage(error),
        color: 'red',
      })

      throw error
    }
  }

  return {
    updateSupplier,
    createSupplier,
    deleteSupplier,
  }
}

// ============================================================================
// REVALIDATION HOOK
// ============================================================================

/**
 * Hook for automatic revalidation on interval
 *
 * @param intervalMs - Revalidation interval in milliseconds
 * @param options - Fetch options
 *
 * @example
 * // Revalidate every 30 seconds
 * useSuppliersPolling(30000, { page: 1 })
 */
export function useSuppliersPolling(
  intervalMs: number,
  options: UseSuppliersOptions = {}
) {
  const { refresh } = useSuppliers(options)

  useEffect(() => {
    if (!intervalMs || intervalMs < 1000) return

    const interval = setInterval(() => {
      refresh()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [intervalMs, refresh])
}

// ============================================================================
// BULK OPERATIONS HOOK
// ============================================================================

/**
 * Hook for bulk operations on suppliers
 *
 * @returns Bulk operation functions
 *
 * @example
 * const { bulkUpdate, bulkDelete } = useSupplierBulkOperations()
 */
export function useSupplierBulkOperations() {
  /**
   * Bulk update multiple suppliers
   *
   * @param ids - Supplier IDs to update
   * @param updates - Updates to apply
   * @param apiCall - API function to call
   *
   * @example
   * await bulkUpdate([1, 2, 3], { isActive: false }, () => bulkUpdateApi(ids, data))
   */
  const bulkUpdate = async (
    ids: number[],
    updates: Partial<Supplier>,
    apiCall: () => Promise<void>
  ) => {
    // Optimistically update all in cache
    ids.forEach(id => {
      updateSupplierCache(id, updates)
    })

    try {
      // Call API
      await apiCall()

      // Revalidate
      await revalidateSuppliers()

      notifications.show({
        title: 'Success',
        message: `${ids.length} suppliers updated successfully`,
        color: 'green',
      })
    } catch (error) {
      // Rollback
      await revalidateSuppliers()

      notifications.show({
        title: 'Error',
        message: getErrorMessage(error),
        color: 'red',
      })

      throw error
    }
  }

  /**
   * Bulk delete multiple suppliers
   *
   * @param suppliers - Suppliers to delete
   * @param apiCall - API function to call
   *
   * @example
   * await bulkDelete([supplier1, supplier2], () => bulkDeleteApi(ids))
   */
  const bulkDelete = async (
    suppliers: Supplier[],
    apiCall: () => Promise<void>
  ) => {
    const ids = suppliers.map(s => s.id)

    // Optimistically remove all from cache
    ids.forEach(id => {
      removeSupplierFromCache(id)
    })

    try {
      // Call API
      await apiCall()

      // Revalidate
      await revalidateSuppliers()

      notifications.show({
        title: 'Success',
        message: `${suppliers.length} suppliers deleted successfully`,
        color: 'green',
      })
    } catch (error) {
      // Rollback
      await revalidateSuppliers()

      notifications.show({
        title: 'Error',
        message: getErrorMessage(error),
        color: 'red',
      })

      throw error
    }
  }

  return {
    bulkUpdate,
    bulkDelete,
  }
}

// ============================================================================
// PREFETCHING HOOK
// ============================================================================

/**
 * Hook for prefetching supplier data
 * Use this to load data before it's needed
 *
 * @returns Prefetch functions
 *
 * @example
 * const { prefetchSupplier, prefetchSuppliers } = useSupplierPrefetching()
 *
 * // Prefetch on hover
 * <div onMouseEnter={() => prefetchSupplier(1)}>
 */
export function useSupplierPrefetching() {
  /**
   * Prefetch single supplier
   *
   * @param id - Supplier ID to prefetch
   *
   * @example
   * await prefetchSupplier(1)
   */
  const prefetchSupplier = async (id: number) => {
    const key = getSupplierKey(id)
    if (key) {
      await mutate(key, fetchSupplier(id), false)
    }
  }

  /**
   * Prefetch suppliers list
   *
   * @param options - Fetch options
   *
   * @example
   * await prefetchSuppliers({ page: 2 })
   */
  const prefetchSuppliers = async (options: UseSuppliersOptions = {}) => {
    const key = getSuppliersKey(options)
    if (key) {
      await mutate(key, fetchSuppliersSwr(options), false)
    }
  }

  return {
    prefetchSupplier,
    prefetchSuppliers,
  }
}
