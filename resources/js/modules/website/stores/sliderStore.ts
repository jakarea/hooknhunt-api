import { create } from 'zustand'
import { api } from '@/lib/api'
import { notifications } from '@mantine/notifications'
import i18n from '@/lib/i18n'

const t = (key: string) => i18n.t(key)

// ============================================================================
// TYPES
// ============================================================================

export interface Slider {
  id: number
  title: string
  subtitle?: string
  imageUrl: string
  link?: string
  buttonText?: string
  isActive: boolean
  sortOrder: number
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface SliderFormData {
  title: string
  subtitle?: string
  imageUrl: string
  link?: string
  buttonText?: string
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
}

interface SliderState {
  sliders: Slider[]
  loading: boolean
  submitting: boolean
  fetchSliders: () => Promise<void>
  addSlider: (data: SliderFormData) => Promise<boolean>
  editSlider: (id: number, data: Partial<SliderFormData>) => Promise<boolean>
  removeSlider: (id: number) => Promise<boolean>
  reorder: (items: Array<{ id: number; sortOrder: number }>) => Promise<void>
  toggleActive: (id: number) => Promise<void>
}

export const useSliderStore = create<SliderState>((set, get) => ({
  sliders: [],
  loading: false,
  submitting: false,

  fetchSliders: async () => {
    set({ loading: true })
    try {
      const response = await api.get('website-admin/sliders')

      // Handle response structure: { data: { data: [...], ... } }
      let slidersData: Slider[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      slidersData = Array.isArray(responseData) ? responseData : []

      set({ sliders: slidersData, loading: false })
    } catch (error: any) {
      console.error('Failed to load sliders:', error)
      notifications.show({
        title: t('sliders.failedToLoad') || 'Failed to Load',
        message: t('sliders.failedToLoad') || 'Failed to load sliders',
        color: 'red',
      })
      set({ loading: false })
    }
  },

  addSlider: async (data) => {
    set({ submitting: true })
    try {
      const response = await api.post('website-admin/sliders', data)

      const newSlider = response.data?.data || response.data

      set((state) => ({ sliders: [...state.sliders, newSlider] }))

      notifications.show({
        title: t('sliders.sliderCreated') || 'Slider Created',
        message: t('sliders.sliderCreated') || 'Slider has been created',
        color: 'green',
      })

      return true
    } catch (error: any) {
      console.error('Failed to create slider:', error)
      notifications.show({
        title: t('sliders.failedToCreate') || 'Failed to Create',
        message: t('sliders.failedToCreate') || 'Failed to create slider',
        color: 'red',
      })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  editSlider: async (id, data) => {
    set({ submitting: true })
    try {
      const response = await api.put(`website-admin/sliders/${id}`, data)

      const updatedSlider = response.data?.data || response.data

      set((state) => ({
        sliders: state.sliders.map((s) => (s.id === id ? updatedSlider : s)),
      }))

      notifications.show({
        title: t('sliders.sliderUpdated') || 'Slider Updated',
        message: t('sliders.sliderUpdated') || 'Slider has been updated',
        color: 'green',
      })

      return true
    } catch (error: any) {
      console.error('Failed to update slider:', error)
      notifications.show({
        title: t('sliders.failedToUpdate') || 'Failed to Update',
        message: t('sliders.failedToUpdate') || 'Failed to update slider',
        color: 'red',
      })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  removeSlider: async (id) => {
    try {
      await api.delete(`website-admin/sliders/${id}`)

      set((state) => ({ sliders: state.sliders.filter((s) => s.id !== id) }))

      notifications.show({
        title: t('sliders.sliderRemoved') || 'Slider Removed',
        message: t('sliders.sliderRemoved') || 'Slider has been removed',
        color: 'green',
      })

      return true
    } catch (error: any) {
      console.error('Failed to delete slider:', error)
      notifications.show({
        title: t('sliders.failedToDelete') || 'Failed to Delete',
        message: t('sliders.failedToDelete') || 'Failed to delete slider',
        color: 'red',
      })
      return false
    }
  },

  reorder: async (items) => {
    try {
      await api.post('website-admin/sliders/reorder', { items })

      set((state) => ({
        sliders: state.sliders.map((s) => {
          const item = items.find((i) => i.id === s.id)
          return item ? { ...s, sortOrder: item.sortOrder } : s
        }).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
    } catch (error: any) {
      console.error('Failed to reorder sliders:', error)
      notifications.show({
        title: t('sliders.failedToReorder') || 'Failed to Reorder',
        message: t('sliders.failedToReorder') || 'Failed to reorder sliders',
        color: 'red',
      })
    }
  },

  toggleActive: async (id) => {
    const slider = get().sliders.find((s) => s.id === id)
    if (!slider) return

    try {
      const response = await api.put(`website-admin/sliders/${id}`, {
        isActive: !slider.isActive,
      })

      const updatedSlider = response.data?.data || response.data

      set((state) => ({
        sliders: state.sliders.map((s) => (s.id === id ? updatedSlider : s)),
      }))
    } catch (error: any) {
      console.error('Failed to toggle slider:', error)
      notifications.show({
        title: t('sliders.failedToToggle') || 'Failed to Toggle',
        message: t('sliders.failedToToggle') || 'Failed to toggle slider',
        color: 'red',
      })
    }
  },
}))
