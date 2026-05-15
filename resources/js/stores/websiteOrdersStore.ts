import { create } from 'zustand'
import { api } from '@/lib/api'
import type { WebsiteOrderListItem, WebsiteOrderStats, WebsiteOrderFilters } from '@/utils/websiteApi'

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
  deleteOrder: (orderId: number, invoiceNo: string) => Promise<void>
  bulkDeleteOrders: (orderIds: number[]) => Promise<void>
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
    } catch (error) {
      console.error('Failed to fetch orders:', error)
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
    } catch (error) {
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

      return { success: true }
    } catch (error: any) {
      console.error('Failed to delete order:', error)
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

      return { success: true, data: res.data?.data }
    } catch (error: any) {
      console.error('Failed to bulk delete orders:', error)
      throw error
    } finally {
      set({ bulkDeleting: false })
    }
  },

  reset: () => set(initialState),
}))
