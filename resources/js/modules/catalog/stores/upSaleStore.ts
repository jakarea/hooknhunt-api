import { create } from 'zustand'
import { api } from '@/lib/api'
import { notifications } from '@mantine/notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompactProduct = {
  id: number
  name: string
  slug: string
  thumbnailUrl?: string | null
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
  existingIds: number[]  // IDs already saved before modal opens

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

  openModal: (productId: number, currentUpSaleIds: number[] = []) => {
    set({
      modalOpen: true,
      productId,
      selectedIds: [...currentUpSaleIds],
      existingIds: [...currentUpSaleIds],
      searchQuery: '',
      products: [],
    })
    get().fetchProducts()
  },

  closeModal: () => {
    set({
      modalOpen: false,
      productId: null,
      selectedIds: [],
      searchQuery: '',
    })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  fetchProducts: async () => {
    try {
      set({ loading: true })

      // Use Catalog module's API endpoint
      const response = await api.get(`catalog/products?per_page=100&search=${get().searchQuery}`)

      // Handle response structure: { data: { data: [...], ... } }
      const productsData = response.data?.data?.data || response.data?.data || response.data || []

      // Transform to compact format
      const compactProducts = productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnailUrl: p.thumbnailUrl || p.thumbnail?.url || null,
        status: p.status,
        category: p.category ? { id: p.category.id, name: p.category.name } : null,
        variants: p.variants?.map((v: any) => ({
          id: v.id,
          channel: v.channel,
          price: v.price,
          stock: v.stock,
        })) || null,
      }))

      set({ products: compactProducts, loading: false })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load products',
        color: 'red',
      })
      set({ loading: false })
    }
  },

  toggleSelect: (id: number) => {
    const { selectedIds, products } = get()

    // Don't allow selecting self
    if (id === get().productId) return

    // Max 3 products
    if (selectedIds.includes(id)) {
      // Already selected, remove
      set({ selectedIds: selectedIds.filter((x) => x !== id) })
    } else {
      // Not selected, add (if under limit)
      if (selectedIds.length < 3) {
        set({ selectedIds: [...selectedIds, id] })
      }
    }
  },

  save: async () => {
    const { productId, selectedIds } = get()

    if (!productId) {
      notifications.show({
        title: 'Error',
        message: 'No product selected',
        color: 'red',
      })
      return false
    }

    try {
      // Update product via Catalog API
      await api.put(`catalog/products/${productId}`, {
        up_sale: selectedIds.length > 0 ? selectedIds.join(',') : null,
      })

      notifications.show({
        title: 'Success',
        message: 'Up-sale products saved',
        color: 'green',
      })

      set({ modalOpen: false })
      return true
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save up-sale products',
        color: 'red',
      })
      return false
    }
  },
}))
