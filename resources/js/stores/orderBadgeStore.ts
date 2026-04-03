import { create } from 'zustand'
import { api } from '@/lib/api'

interface OrderBadgeState {
  pendingCount: number
  lastFetched: number
  fetchPendingCount: () => Promise<void>
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useOrderBadgeStore = create<OrderBadgeState>((set, get) => ({
  pendingCount: 0,
  lastFetched: 0,

  fetchPendingCount: async () => {
    const { lastFetched } = get()
    const now = Date.now()

    // Skip if cached within TTL
    if (now - lastFetched < CACHE_TTL) return

    try {
      const res = await api.get('/website-admin/orders/statistics')
      const pending = res.data?.data?.pending ?? 0
      set({ pendingCount: pending, lastFetched: now })
    } catch {
      // Silent fail — badge is non-critical UI
    }
  },
}))
