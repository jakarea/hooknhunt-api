import { create } from 'zustand'
import type { Coupon, CouponFilters, CouponFormData } from '@/utils/api'
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
} from '@/utils/api'
import { notifications } from '@mantine/notifications'

interface CouponPagination {
  total: number
  currentPage: number
  perPage: number
  lastPage: number
}

interface CouponState {
  coupons: Coupon[]
  loading: boolean
  submitting: boolean
  pagination: CouponPagination
  filters: CouponFilters
  fetchCoupons: (filters?: CouponFilters) => Promise<void>
  addCoupon: (data: CouponFormData) => Promise<boolean>
  editCoupon: (id: number, data: Partial<CouponFormData>) => Promise<boolean>
  removeCoupon: (id: number) => Promise<boolean>
  toggleStatus: (id: number) => Promise<void>
  setFilters: (filters: CouponFilters) => void
}

export const useCouponStore = create<CouponState>((set, get) => ({
  coupons: [],
  loading: false,
  submitting: false,
  pagination: { total: 0, currentPage: 1, perPage: 25, lastPage: 1 },
  filters: { per_page: 25, page: 1 },

  fetchCoupons: async (filters?: CouponFilters) => {
    const mergedFilters = { ...get().filters, ...filters }
    set({ loading: true, filters: mergedFilters })
    try {
      const res = await getCoupons(mergedFilters)
      const data = res.data ?? res
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      const pag = data?.meta ?? data
      set({
        coupons: items,
        pagination: {
          total: pag?.total ?? items.length,
          currentPage: pag?.current_page ?? mergedFilters.page ?? 1,
          perPage: pag?.per_page ?? mergedFilters.per_page ?? 25,
          lastPage: pag?.last_page ?? 1,
        },
      })
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load coupons', color: 'red' })
    } finally {
      set({ loading: false })
    }
  },

  addCoupon: async (data) => {
    set({ submitting: true })
    try {
      await createCoupon(data)
      notifications.show({ title: 'Created', message: `Coupon ${data.code} created`, color: 'green' })
      await get().fetchCoupons()
      return true
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to create coupon', color: 'red' })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  editCoupon: async (id, data) => {
    set({ submitting: true })
    try {
      await updateCoupon(id, data)
      notifications.show({ title: 'Updated', message: 'Coupon updated', color: 'green' })
      await get().fetchCoupons()
      return true
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update coupon', color: 'red' })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  removeCoupon: async (id) => {
    set({ submitting: true })
    try {
      await deleteCoupon(id)
      notifications.show({ title: 'Deleted', message: 'Coupon deleted', color: 'green' })
      // Optimistic remove
      set({ coupons: get().coupons.filter((c) => c.id !== id) })
      return true
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete coupon', color: 'red' })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  toggleStatus: async (id) => {
    try {
      await toggleCouponStatus(id)
      // Optimistic update
      set({
        coupons: get().coupons.map((c) =>
          c.id === id ? { ...c, isActive: !c.isActive } : c
        ),
      })
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to toggle status', color: 'red' })
    }
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } })
  },
}))
