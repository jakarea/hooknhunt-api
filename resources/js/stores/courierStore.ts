import { create } from 'zustand'
import { sendOrderToCourier, syncCourierStatus } from '@/utils/websiteApi'

type CourierOperationState = {
  sending: Set<number>
  syncing: Set<number>
}

type CourierActions = {
  sendToCourier: (orderId: number) => Promise<{ success: boolean; message: string; data?: any }>
  syncStatus: (orderId: number) => Promise<{ success: boolean; message: string; deliveryStatus?: string }>
  isSending: (orderId: number) => boolean
  isSyncing: (orderId: number) => boolean
}

type CourierStore = CourierOperationState & CourierActions

export const useCourierStore = create<CourierStore>((set, get) => ({
  sending: new Set<number>(),
  syncing: new Set<number>(),

  sendToCourier: async (orderId: number) => {
    const sending = new Set(get().sending)
    sending.add(orderId)
    set({ sending })

    try {
      const result = await sendOrderToCourier(orderId)
      return result
    } finally {
      set((state) => {
        const sending = new Set(state.sending)
        sending.delete(orderId)
        return { sending }
      })
    }
  },

  syncStatus: async (orderId: number) => {
    const syncing = new Set(get().syncing)
    syncing.add(orderId)
    set({ syncing })

    try {
      const result = await syncCourierStatus(orderId)
      return result
    } finally {
      set((state) => {
        const syncing = new Set(state.syncing)
        syncing.delete(orderId)
        return { syncing }
      })
    }
  },

  isSending: (orderId: number) => get().sending.has(orderId),
  isSyncing: (orderId: number) => get().syncing.has(orderId),
}))
