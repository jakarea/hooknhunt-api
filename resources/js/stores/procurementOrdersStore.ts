import { create } from 'zustand'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Purchase Order data structure
 */
export interface PurchaseOrder {
  id: number
  poNumber: string
  supplier: { id: number; name: string }
  orderDate: string
  expectedDate?: string
  totalAmount: number
  exchangeRate: number
  status: string
  createdAt: string
  itemsCount: number
}

/**
 * Statistics data structure
 */
export interface Statistics {
  totalOrders: number
  draftOrders: number
  activeOrders: number
  completedOrders: number
  totalValueRmb: number
}

/**
 * Filter state structure
 */
export interface OrderFilters {
  status: string
  supplierId: string | null
  searchQuery: string
  fromDate: string
  toDate: string
}

/**
 * Pagination state structure
 */
export interface PaginationState {
  currentPage: number
  perPage: number
  totalPages: number
}

/**
 * Delete modal state structure
 */
export interface DeleteModalState {
  isOpen: boolean
  orderToDelete: { id: number; poNumber: string } | null
}

/**
 * Store state structure
 */
interface ProcurementOrdersState {
  // Data
  orders: PurchaseOrder[]
  suppliers: any[]
  statistics: Statistics | null

  // UI states
  loading: boolean
  refreshing: boolean
  deletingId: number | null

  // Filters
  filters: OrderFilters

  // Pagination
  pagination: PaginationState

  // Delete modal
  deleteModal: DeleteModalState
}

/**
 * Store actions structure
 */
interface ProcurementOrdersActions {
  // Data setters
  setOrders: (orders: PurchaseOrder[]) => void
  setSuppliers: (suppliers: any[]) => void
  setStatistics: (statistics: Statistics | null) => void

  // UI state setters
  setLoading: (loading: boolean) => void
  setRefreshing: (refreshing: boolean) => void
  setDeletingId: (id: number | null) => void

  // Filter setters
  setStatusFilter: (status: string) => void
  setSupplierFilter: (supplierId: string | null) => void
  setSearchQuery: (query: string) => void
  setFromDate: (date: string) => void
  setToDate: (date: string) => void
  resetFilters: () => void

  // Pagination setters
  setCurrentPage: (page: number) => void
  setTotalPages: (pages: number) => void

  // Delete modal setters
  openDeleteModal: (id: number, poNumber: string) => void
  closeDeleteModal: () => void

  // Computed getters
  getTotalOrders: () => number
  getFilteredOrders: () => PurchaseOrder[]
}

/**
 * Initial filter state
 */
const initialFilters: OrderFilters = {
  status: 'all',
  supplierId: null,
  searchQuery: '',
  fromDate: '',
  toDate: '',
}

/**
 * Initial pagination state
 */
const initialPagination: PaginationState = {
  currentPage: 1,
  perPage: 20,
  totalPages: 1,
}

/**
 * Initial delete modal state
 */
const initialDeleteModal: DeleteModalState = {
  isOpen: false,
  orderToDelete: null,
}

// ============================================================================
// STORE CREATION
// ============================================================================

type ProcurementOrdersStore = ProcurementOrdersState & ProcurementOrdersActions

/**
 * Procurement Orders Store
 * Manages state for purchase orders list page
 */
export const useProcurementOrdersStore = create<ProcurementOrdersStore>((set, get) => ({
  // ========================================================================
  // INITIAL STATE
  // ========================================================================

  // Data
  orders: [],
  suppliers: [],
  statistics: null,

  // UI states
  loading: true,
  refreshing: false,
  deletingId: null,

  // Filters
  filters: initialFilters,

  // Pagination
  pagination: initialPagination,

  // Delete modal
  deleteModal: initialDeleteModal,

  // ========================================================================
  // ACTIONS
  // ========================================================================

  // Data setters
  setOrders: (orders) => set({ orders }),

  setSuppliers: (suppliers) => set({ suppliers }),

  setStatistics: (statistics) => set({ statistics }),

  // UI state setters
  setLoading: (loading) => set({ loading }),

  setRefreshing: (refreshing) => set({ refreshing }),

  setDeletingId: (deletingId) => set({ deletingId }),

  // Filter setters
  setStatusFilter: (status) =>
    set((state) => ({
      filters: { ...state.filters, status },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setSupplierFilter: (supplierId) =>
    set((state) => ({
      filters: { ...state.filters, supplierId },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setFromDate: (fromDate) =>
    set((state) => ({
      filters: { ...state.filters, fromDate },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  setToDate: (toDate) =>
    set((state) => ({
      filters: { ...state.filters, toDate },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  resetFilters: () =>
    set((state) => ({
      filters: { ...initialFilters },
      pagination: { ...state.pagination, currentPage: 1 },
    })),

  // Pagination setters
  setCurrentPage: (currentPage) =>
    set((state) => ({
      pagination: { ...state.pagination, currentPage },
    })),

  setTotalPages: (totalPages) =>
    set((state) => ({
      pagination: { ...state.pagination, totalPages },
    })),

  // Delete modal setters
  openDeleteModal: (id, poNumber) =>
    set({
      deleteModal: {
        isOpen: true,
        orderToDelete: { id, poNumber },
      },
    }),

  closeDeleteModal: () => set({ deleteModal: initialDeleteModal }),

  // Computed getters
  getTotalOrders: () => get().orders.length,

  getFilteredOrders: () => {
    const { orders, filters } = get()

    return orders.filter((order) => {
      // Status filter
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false
      }

      // Supplier filter
      if (filters.supplierId && String(order.supplier.id) !== filters.supplierId) {
        return false
      }

      // Search query - handle both camelCase and snake_case
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const poNumber = (order as any).poNumber || (order as any).po_number || ''
        const matchesPoNumber = poNumber.toLowerCase().includes(query)
        const matchesSupplier = order.supplier.name.toLowerCase().includes(query)
        if (!matchesPoNumber && !matchesSupplier) {
          return false
        }
      }

      // Date range filter - handle both camelCase and snake_case
      const orderDate = (order as any).orderDate || (order as any).order_date
      if (filters.fromDate && orderDate < filters.fromDate) {
        return false
      }
      if (filters.toDate && orderDate > filters.toDate) {
        return false
      }

      return true
    })
  },
}))

// ============================================================================
// SELECTOR HOOKS (For optimized re-renders)
// ============================================================================

/**
 * Selector hook for orders data
 */
export const useOrders = () => useProcurementOrdersStore((state) => state.orders)

/**
 * Selector hook for suppliers data
 */
export const useSuppliers = () => useProcurementOrdersStore((state) => state.suppliers)

/**
 * Selector hook for statistics data
 */
export const useStatistics = () => useProcurementOrdersStore((state) => state.statistics)

/**
 * Selector hook for loading state
 */
export const useOrdersLoading = () => useProcurementOrdersStore((state) => state.loading)

/**
 * Selector hook for refreshing state
 */
export const useOrdersRefreshing = () => useProcurementOrdersStore((state) => state.refreshing)

/**
 * Selector hook for deleting ID
 */
export const useDeletingId = () => useProcurementOrdersStore((state) => state.deletingId)

/**
 * Selector hook for filters
 */
export const useOrdersFilters = () => useProcurementOrdersStore((state) => state.filters)

/**
 * Selector hook for pagination
 */
export const useOrdersPagination = () => useProcurementOrdersStore((state) => state.pagination)

/**
 * Selector hook for delete modal state
 */
export const useDeleteModal = () => useProcurementOrdersStore((state) => state.deleteModal)
