import { create } from 'zustand'
import { getProducts, updateProduct } from '@/utils/api'
import { notifications } from '@mantine/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompactProduct = {
  id: number
  name: string
  slug: string
  thumbnail?: { id: number; fullUrl: string } | null
  status?: string
  category?: { id: number; name: string } | null
  variants?: Array<{ id: number; channel: string; price: number; stock: number }> | null
}

interface UpSaleState {
  // Modal
  modalOpen: boolean
  productId: number | null

  // Selection
  selectedIds: number[]
  existingIds: number[]

  // Product list for modal
  products: CompactProduct[]
  loading: boolean
  searchQuery: string

  // Actions
  openModal: (productId: number, currentUpSaleIds: number[]) => void
  closeModal: () => void
  setSearchQuery: (q: string) => void
  fetchProducts: () => Promise<void>
  toggleSelect: (id: number) => void
  save: () => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUpSaleStore = create<UpSaleState>((set, get) => ({
  modalOpen: false,
  productId: null,
  selectedIds: [],
  existingIds: [],
  products: [],
  loading: false,
  searchQuery: '',

  openModal: (productId, currentUpSaleIds) => {
    set({
      modalOpen: true,
      productId,
      selectedIds: [...currentUpSaleIds],
      existingIds: [...currentUpSaleIds],
      searchQuery: '',
    })
    get().fetchProducts()
  },

  closeModal: () => {
    set({ modalOpen: false, products: [], searchQuery: '' })
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q })
  },

  fetchProducts: async () => {
    set({ loading: true })
    try {
      const res = await getProducts({
        search: get().searchQuery || undefined,
        per_page: 100,
        status: 'published',
      })
      const items = res?.data ?? res ?? []
      set({ products: Array.isArray(items) ? items : (items.data ?? []) })
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load products',
        color: 'red',
      })
    } finally {
      set({ loading: false })
    }
  },

  toggleSelect: (id) => {
    const { selectedIds, productId } = get()
    // Cannot select the product itself
    if (id === productId) return

    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((i) => i !== id) })
    } else {
      if (selectedIds.length >= 3) return // max 3
      set({ selectedIds: [...selectedIds, id] })
    }
  },

  save: async () => {
    const { productId, selectedIds } = get()
    if (!productId) return false

    const upSaleStr = selectedIds.join(',')
    try {
      await updateProduct(productId, { upSale: upSaleStr })
      set({ existingIds: [...selectedIds] })
      notifications.show({
        title: 'Saved',
        message: 'Up-sale products updated',
        color: 'green',
      })
      return true
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to save up-sale products',
        color: 'red',
      })
      return false
    }
  },
}))
