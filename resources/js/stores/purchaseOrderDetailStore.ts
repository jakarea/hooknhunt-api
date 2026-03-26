import { create } from 'zustand'
import api from '@/lib/api'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Use 'any' for items to avoid TypeScript restrictions
export interface PurchaseOrderItem {
  id: number
  poNumber?: string
  productId: number
  variantId?: number
  inventoryBatchId?: number
  quantity: number
  unitPrice?: number
  totalPrice?: number
  landedCost?: number
  shippingCostPerKg?: number
  unit_weight?: number
  extra_weight?: number
  shipping_cost?: number
  final_unit_cost?: number
  // Allow any additional fields from backend
  [key: string]: any
  product?: {
    id: number
    name: string
    baseName?: string
    images?: string[]
  }
  variant?: {
    id: number
    sku: string
    retailPrice: number
    images?: string[]
  }
}

export interface StatusHistoryEntry {
  id: number
  oldStatus?: string
  newStatus: string
  comments?: string
  createdAt: string
  changedBy: number
  changedByUser?: {
    id: number
    name: string
  }
  timelineData?: {
    exchange_rate?: number
    courier_name?: string
    tracking_number?: string
    lot_number?: string
    transport_type?: string
    total_weight?: number
    shipping_cost_per_kg?: number
    total_shipping_cost?: number
    bd_courier_tracking?: string
  }
}

export interface PurchaseOrderDetail {
  id: number
  poNumber: string
  supplier: { id: number; name: string }
  orderDate: string
  expectedDate?: string
  totalAmount: number
  exchangeRate: number
  totalBdt: number
  status: string
  courierName?: string
  trackingNumber?: string
  shippingMethod?: string
  lotNumber?: string
  totalWeight?: number
  bdCourierTracking?: string
  extraCost?: number
  items: PurchaseOrderItem[]
  statusHistory: StatusHistoryEntry[]
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: number
    name: string
  }
}

interface PurchaseOrderDetailState {
  // Data
  order: PurchaseOrderDetail | null
  history: StatusHistoryEntry[]

  // UI states
  loading: boolean
  refreshing: boolean
  error: string | null
}

interface PurchaseOrderDetailActions {
  // Data actions
  setOrder: (order: PurchaseOrderDetail) => void
  updateOrderStatus: (status: string) => void
  updateStatusHistoryEntry: (historyId: number, updates: Partial<StatusHistoryEntry>) => void
  addStatusHistoryEntry: (entry: StatusHistoryEntry) => void

  // UI state actions
  setLoading: (loading: boolean) => void
  setRefreshing: (refreshing: boolean) => void
  setError: (error: string | null) => void

  // API actions
  fetchOrder: (orderId: number) => Promise<void>
  clearOrder: () => void
}

// ============================================================================
// STORE CREATION
// ============================================================================

type PurchaseOrderDetailStore = PurchaseOrderDetailState & PurchaseOrderDetailActions

export const usePurchaseOrderDetailStore = create<PurchaseOrderDetailStore>((set, get) => ({
  // ========================================================================
  // INITIAL STATE
  // ========================================================================

  order: null,
  history: [],
  loading: true,
  refreshing: false,
  error: null,

  // ========================================================================
  // ACTIONS
  // ========================================================================

  setOrder: (order) => {
    set({ order, history: order.statusHistory || [] })
  },

  updateOrderStatus: (status) => {
    set((state) => ({
      order: state.order ? { ...state.order, status } : null,
    }))
  },

  updateStatusHistoryEntry: (historyId, updates) => {
    set((state) => ({
      history: state.history.map((entry) =>
        entry.id === historyId ? { ...entry, ...updates } : entry
      ),
      order: state.order
        ? {
            ...state.order,
            statusHistory: state.history.map((entry) =>
              entry.id === historyId ? { ...entry, ...updates } : entry
            ),
          }
        : null,
    }))
  },

  addStatusHistoryEntry: (entry) => {
    set((state) => ({
      history: [entry, ...state.history],
      order: state.order
        ? {
            ...state.order,
            statusHistory: [entry, ...state.history],
          }
        : null,
    }))
  },

  setLoading: (loading) => set({ loading }),

  setRefreshing: (refreshing) => set({ refreshing }),

  setError: (error) => set({ error }),

  fetchOrder: async (orderId) => {
    try {
      set({ loading: true, error: null })
      const response = await api.get(`procurement/orders/${orderId}`)
      const order = response.data.data

      set({
        order,
        history: order.statusHistory || [],
        loading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch order',
        loading: false,
      })
      throw error
    }
  },

  clearOrder: () => {
    set({
      order: null,
      history: [],
      loading: true,
      error: null,
    })
  },
}))

// ============================================================================
// SELECTOR HOOKS (For optimized re-renders)
// ============================================================================

export const useOrderDetail = () => usePurchaseOrderDetailStore((state) => state.order)
export const useOrderHistory = () => usePurchaseOrderDetailStore((state) => state.history)
export const useOrderLoading = () => usePurchaseOrderDetailStore((state) => state.loading)
export const useOrderRefreshing = () => usePurchaseOrderDetailStore((state) => state.refreshing)
export const useOrderError = () => usePurchaseOrderDetailStore((state) => state.error)
