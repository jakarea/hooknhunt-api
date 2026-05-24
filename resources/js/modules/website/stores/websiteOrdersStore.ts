import { create } from 'zustand'
import { api } from '@/lib/api'
import { notifications } from '@mantine/notifications'

// ============================================================================
// TYPES
// ============================================================================

export interface WebsiteOrderListItem {
  id: number
  invoiceNo: string
  customerName: string
  customerPhone: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod?: string
  channel?: string
  createdAt: string
  updatedAt: string
}

export interface WebsiteOrderStats {
  total: number
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  todayOrders: number
  todayRevenue: number
  monthRevenue: number
}

export interface WebsiteOrderFilters {
  search?: string
  status?: string
  paymentStatus?: string
  channel?: string
  fromDate?: string
  toDate?: string
  page?: number
  perPage?: number
}

interface WebsiteOrdersState {
  orders: WebsiteOrderListItem[]
  stats: WebsiteOrderStats | null
  loading: boolean
  totalPages: number
  total: number
  currentPage: number
  perPage: number
  selectedOrders: Set<number>
  deletingOrderId: number | null
  bulkDeleting: boolean

  // Actions
  fetchOrders: (filters: WebsiteOrderFilters) => Promise<void>
  fetchStats: () => Promise<void>
  setSelectedOrders: (orders: Set<number>) => void
  toggleOrderSelection: (orderId: number) => void
  clearSelection: () => void
  selectAll: (orderIds: number[]) => void
  deleteOrder: (orderId: number, invoiceNo: string) => Promise<{ success: boolean }>
  bulkDeleteOrders: (orderIds: number[]) => Promise<{ success: boolean; data?: any }>
  reset: () => void
}

const initialState = {
  orders: [],
  stats: null,
  loading: true,
  totalPages: 1,
  total: 0,
  currentPage: 1,
  perPage: 100,
  selectedOrders: new Set<number>(),
  deletingOrderId: null,
  bulkDeleting: false,
}

export const useWebsiteOrdersStore = create<WebsiteOrdersState>((set, get) => ({
  ...initialState,

  fetchOrders: async (filters) => {
    try {
      set({ loading: true })
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.paymentStatus) params.append('payment_status', filters.paymentStatus)
      if (filters.channel) params.append('channel', filters.channel)
      if (filters.fromDate) params.append('from_date', filters.fromDate)
      if (filters.toDate) params.append('to_date', filters.toDate)
      if (filters.page) params.append('page', String(filters.page))
      if (filters.perPage) params.append('per_page', String(filters.perPage))

      const response = await api.get(`website-admin/orders?${params.toString()}`)
      // Backend returns: { success: true, data: { data: [...], last_page: 1, total: 10 } }
      // api.get() returns response.data, so response = { success: true, data: { ... } }
      const paginator = response.data?.data || {}
      const orders = paginator.data || []
      const lastPage = paginator.last_page || 1
      const total = paginator.total || 0

      set({
        orders,
        totalPages: lastPage,
        total,
        currentPage: filters.page || 1,
        loading: false,
      })
    } catch (error: any) {
      console.error('Failed to fetch orders:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load orders',
        color: 'red',
      })
      set({ loading: false })
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get('website-admin/orders/statistics')
      // Backend returns: { success: true, data: { total, pending, ... } }
      // api.get() returns response.data, so response = { success: true, data: { ... } }
      const statsData = response.data?.data || null
      set({ stats: statsData })
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  },

  setSelectedOrders: (orders) => set({ selectedOrders: orders }),

  toggleOrderSelection: (orderId) => {
    const { selectedOrders } = get()
    const newSet = new Set(selectedOrders)
    if (newSet.has(orderId)) {
      newSet.delete(orderId)
    } else {
      newSet.add(orderId)
    }
    set({ selectedOrders: newSet })
  },

  clearSelection: () => set({ selectedOrders: new Set() }),

  selectAll: (orderIds) => set({ selectedOrders: new Set(orderIds) }),

  deleteOrder: async (orderId, invoiceNo) => {
    try {
      set({ deletingOrderId: orderId })
      await api.delete(`website-admin/orders/${orderId}`)

      // Remove from state
      set((state) => ({
        orders: state.orders.filter(o => o.id !== orderId),
        total: state.total - 1,
      }))

      // Refresh stats
      get().fetchStats()

      notifications.show({
        title: 'Success',
        message: `Order ${invoiceNo} deleted`,
        color: 'green',
      })

      return { success: true }
    } catch (error: any) {
      console.error('Failed to delete order:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete order',
        color: 'red',
      })
      throw error
    } finally {
      set({ deletingOrderId: null })
    }
  },

  bulkDeleteOrders: async (orderIds) => {
    try {
      set({ bulkDeleting: true })
      const res = await api.post('website-admin/orders/bulk-delete', {
        order_ids: orderIds,
      })

      const successCount = res.data?.data?.success_count || 0
      const results = res.data?.data?.results || []

      // Get successfully deleted order IDs
      const deletedOrderIds = results
        .filter((r: any) => r.success && !r.skipped)
        .map((r: any) => r.order_id)

      // Remove deleted orders from state
      set((state) => ({
        orders: state.orders.filter(o => !deletedOrderIds.includes(o.id)),
        total: state.total - deletedOrderIds.length,
        selectedOrders: new Set(),
      }))

      // Refresh stats
      get().fetchStats()

      notifications.show({
        title: 'Success',
        message: `${successCount} order(s) deleted successfully`,
        color: 'green',
      })

      return { success: true, data: res.data?.data }
    } catch (error: any) {
      console.error('Failed to bulk delete orders:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete orders',
        color: 'red',
      })
      throw error
    } finally {
      set({ bulkDeleting: false })
    }
  },

  reset: () => set(initialState),
}))
