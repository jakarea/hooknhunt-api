/**
 * Suppliers Store with Optimistic UI
 *
 * Provides instant UI updates by assuming API calls will succeed.
 * Rolls back changes if API calls fail.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Supplier } from '@/types/supplier'

// ============================================================================
// TYPES
// ============================================================================

export interface SuppliersState {
  // Data
  suppliers: Supplier[]
  loading: boolean
  error: string | null

  // Pagination
  pagination: {
    page: number
    perPage: number
    total: number
    lastPage: number
  }

  // Filters
  filters: {
    search: string | null
    isActive: boolean | null
  }

  // Actions
  setSuppliers: (suppliers: Supplier[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPagination: (pagination: Partial<SuppliersState['pagination']>) => void
  setFilters: (filters: Partial<SuppliersState['filters']>) => void

  // Optimistic operations
  optimisticAdd: (supplier: Supplier) => void
  optimisticUpdate: (id: number, updates: Partial<Supplier>) => void
  optimisticDelete: (id: number) => void
  rollbackAdd: (tempId: number) => void
  rollbackUpdate: (id: number, previousData: Partial<Supplier>) => void
  rollbackDelete: (supplier: Supplier) => void

  // Helper methods
  getSupplierById: (id: number) => Supplier | undefined
  clearSuppliers: () => void
}

// ============================================================================
// STORE
// ============================================================================

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      // Initial state
      suppliers: [],
      loading: false,
      error: null,

      pagination: {
        page: 1,
        perPage: 15,
        total: 0,
        lastPage: 1,
      },

      filters: {
        search: null,
        isActive: null,
      },

      // ============================================================================
      // BASIC ACTIONS
      // ============================================================================

      setSuppliers: (suppliers) => set({ suppliers, error: null }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setPagination: (pagination) =>
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        })),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, page: 1 }, // Reset to page 1
        })),

      // ============================================================================
      // OPTIMISTIC OPERATIONS
      // ============================================================================

      /**
       * Optimistically add a new supplier to the list
       * Use this immediately after user submits create form
       */
      optimisticAdd: (supplier) =>
        set((state) => ({
          suppliers: [supplier, ...state.suppliers],
          pagination: {
            ...state.pagination,
            total: state.pagination.total + 1,
          },
        })),

      /**
       * Optimistically update a supplier in the list
       * Use this immediately after user submits edit form
       */
      optimisticUpdate: (id, updates) =>
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      /**
       * Optimistically delete a supplier from the list
       * Use this immediately after user confirms delete
       */
      optimisticDelete: (id) =>
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
          pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1),
          },
        })),

      // ============================================================================
      // ROLLBACK OPERATIONS
      // ============================================================================

      /**
       * Rollback an optimistic add if API call fails
       */
      rollbackAdd: (tempId) =>
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== tempId),
          pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1),
          },
        })),

      /**
       * Rollback an optimistic update if API call fails
       * Requires storing previous data before optimistic update
       */
      rollbackUpdate: (id, previousData) =>
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { ...s, ...previousData } : s
          ),
        })),

      /**
       * Rollback an optimistic delete if API call fails
       */
      rollbackDelete: (supplier) =>
        set((state) => {
          // Find the correct position to reinsert (sort by id descending)
          const sortedSuppliers = [...state.suppliers, supplier].sort(
            (a, b) => b.id - a.id
          )
          return {
            suppliers: sortedSuppliers,
            pagination: {
              ...state.pagination,
              total: state.pagination.total + 1,
            },
          }
        }),

      // ============================================================================
      // HELPER METHODS
      // ============================================================================

      getSupplierById: (id) => {
        return get().suppliers.find((s) => s.id === id)
      },

      clearSuppliers: () =>
        set({
          suppliers: [],
          pagination: {
            page: 1,
            perPage: 15,
            total: 0,
            lastPage: 1,
          },
        }),
    }),
    {
      name: 'suppliers-storage',
      // Only persist pagination and filters, not the actual suppliers data
      partialize: (state) => ({
        pagination: state.pagination,
        filters: state.filters,
      }),
    }
  )
)

// ============================================================================
// SELECTORS FOR PERFORMANCE
// ============================================================================

/**
 * Select active suppliers only
 */
export const selectActiveSuppliers = (state: SuppliersState) =>
  state.suppliers.filter((s) => s.isActive)

/**
 * Select suppliers by search term
 */
export const selectSuppliersBySearch = (
  state: SuppliersState,
  searchTerm: string
) =>
  state.suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

/**
 * Select filtered suppliers (by search and isActive)
 */
export const selectFilteredSuppliers = (state: SuppliersState) => {
  let filtered = [...state.suppliers]

  // Filter by search
  if (state.filters.search) {
    const searchLower = state.filters.search.toLowerCase()
    filtered = filtered.filter((s) =>
      s.name.toLowerCase().includes(searchLower)
    )
  }

  // Filter by isActive
  if (state.filters.isActive !== null) {
    filtered = filtered.filter((s) => s.isActive === state.filters.isActive)
  }

  return filtered
}
