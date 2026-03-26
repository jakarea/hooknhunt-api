import { useState, useEffect, useCallback } from 'react'
import { apiMethods } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'

interface UseApiOptions<T> {
  initialData?: T[]
  onError?: (error: unknown) => void
  onSuccess?: (data: T[]) => void
  refetchInterval?: number
}

export function useApi<T = unknown>(
  endpoint: string,
  options: UseApiOptions<T> = {}
) {
  const { initialData = [], onError, onSuccess, refetchInterval } = options

  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiMethods.get<T[]>(endpoint)
      setData(response)
      onSuccess?.(response)
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch data'
      setError(errorMessage)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [endpoint, onError, onSuccess])

  useEffect(() => {
    fetchData()

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, refetchInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// Hook for mutations (POST, PUT, DELETE)
export function useApiMutation<T = unknown, D = unknown>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useUIStore()

  const mutate = useCallback(
    async (
      method: 'post' | 'put' | 'patch' | 'delete',
      endpoint: string,
      data?: D,
      options?: {
        onSuccess?: (response: T) => void
        onError?: (error: unknown) => void
        successMessage?: string
      }
    ) => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiMethods[method]<T>(endpoint, data)

        options?.onSuccess?.(response)

        if (options?.successMessage) {
          showToast(options.successMessage, 'success')
        }

        return response
      } catch (err: unknown) {
        const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Operation failed'
        setError(errorMessage)
        options?.onError?.(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [showToast]
  )

  const post = useCallback(
    (endpoint: string, data?: D, options?: { onSuccess?: (response: T) => void; onError?: (error: unknown) => void; successMessage?: string }) =>
      mutate('post', endpoint, data, options),
    [mutate]
  )

  const put = useCallback(
    (endpoint: string, data?: D, options?: { onSuccess?: (response: T) => void; onError?: (error: unknown) => void; successMessage?: string }) =>
      mutate('put', endpoint, data, options),
    [mutate]
  )

  const patch = useCallback(
    (endpoint: string, data?: D, options?: { onSuccess?: (response: T) => void; onError?: (error: unknown) => void; successMessage?: string }) =>
      mutate('patch', endpoint, data, options),
    [mutate]
  )

  const del = useCallback(
    (endpoint: string, options?: { onSuccess?: (response: T) => void; onError?: (error: unknown) => void; successMessage?: string }) =>
      mutate('delete', endpoint, undefined, options),
    [mutate]
  )

  return {
    loading,
    error,
    mutate,
    post,
    put,
    patch,
    delete: del,
  }
}
