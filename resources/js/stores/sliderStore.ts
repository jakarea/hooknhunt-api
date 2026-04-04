import { create } from 'zustand'
import type {
  Slider,
  SliderFormData,
} from '@/utils/websiteApi'
import {
  getSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  reorderSliders,
} from '@/utils/websiteApi'
import { notifications } from '@mantine/notifications'
import i18n from '@/lib/i18n'

const t = (key: string) => i18n.t(key)

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
      const res = await getSliders()
      set({ sliders: res.data || [] })
    } catch {
      notifications.show({ title: t('sliders.failedToLoad'), message: t('sliders.failedToLoad'), color: 'red' })
    } finally {
      set({ loading: false })
    }
  },

  addSlider: async (data) => {
    set({ submitting: true })
    try {
      const res = await createSlider(data)
      set((state) => ({ sliders: [...state.sliders, res.data] }))
      notifications.show({ title: t('sliders.sliderCreated'), message: t('sliders.sliderCreated'), color: 'green' })
      return true
    } catch {
      notifications.show({ title: t('sliders.failedToCreate'), message: t('sliders.failedToCreate'), color: 'red' })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  editSlider: async (id, data) => {
    set({ submitting: true })
    try {
      const res = await updateSlider(id, data)
      set((state) => ({
        sliders: state.sliders.map((s) => (s.id === id ? res.data : s)),
      }))
      notifications.show({ title: t('sliders.sliderUpdated'), message: t('sliders.sliderUpdated'), color: 'green' })
      return true
    } catch {
      notifications.show({ title: t('sliders.failedToUpdate'), message: t('sliders.failedToUpdate'), color: 'red' })
      return false
    } finally {
      set({ submitting: false })
    }
  },

  removeSlider: async (id) => {
    try {
      await deleteSlider(id)
      set((state) => ({ sliders: state.sliders.filter((s) => s.id !== id) }))
      notifications.show({ title: t('sliders.sliderRemoved'), message: t('sliders.sliderRemoved'), color: 'green' })
      return true
    } catch {
      notifications.show({ title: t('sliders.failedToDelete'), message: t('sliders.failedToDelete'), color: 'red' })
      return false
    }
  },

  reorder: async (items) => {
    try {
      await reorderSliders(items)
      set((state) => ({
        sliders: state.sliders.map((s) => {
          const item = items.find((i) => i.id === s.id)
          return item ? { ...s, sortOrder: item.sortOrder } : s
        }).sort((a, b) => a.sortOrder - b.sortOrder),
      }))
    } catch {
      notifications.show({ title: t('sliders.failedToReorder'), message: t('sliders.failedToReorder'), color: 'red' })
    }
  },

  toggleActive: async (id) => {
    const slider = get().sliders.find((s) => s.id === id)
    if (!slider) return
    try {
      const res = await updateSlider(id, { isActive: !slider.isActive })
      set((state) => ({
        sliders: state.sliders.map((s) => (s.id === id ? res.data : s)),
      }))
    } catch {
      notifications.show({ title: t('sliders.failedToToggle'), message: t('sliders.failedToToggle'), color: 'red' })
    }
  },
}))
