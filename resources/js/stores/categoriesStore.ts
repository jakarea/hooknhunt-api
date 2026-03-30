/**
 * Categories Store
 *
 * Manages categories list, tree, and optimistic operations.
 * List page uses selectors to prevent full re-render.
 */

import { create } from 'zustand'
import {
  getCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryFilters,
} from '@/utils/api'

// ============================================================================
// TYPES
// ============================================================================

interface CategoriesState {
  // Data
  categories: Category[]
  categoryTree: Category[]
  loading: boolean
  error: string | null

  // Actions
  fetchCategories: (filters?: CategoryFilters) => Promise<void>
  fetchCategoryTree: () => Promise<void>
  addCategory: (data: { name: string; parent_id?: number | null; image_id?: number | null; is_active?: boolean }) => Promise<Category>
  editCategory: (id: number, data: { name?: string; parent_id?: number | null; image_id?: number | null; is_active?: boolean }) => Promise<void>
  removeCategory: (id: number) => Promise<void>
  getCategoryById: (id: number) => Category | undefined
  clearError: () => void
}

// ============================================================================
// STORE
// ============================================================================

export const useCategoriesStore = create<CategoriesState>()((set, get) => ({
  categories: [],
  categoryTree: [],
  loading: false,
  error: null,

  fetchCategories: async (filters?: CategoryFilters) => {
    set({ loading: true, error: null })
    try {
      const response = await getCategories(filters)

      let categoriesData: Category[] = []
      if (response && typeof response === 'object') {
        if ('status' in response && response.status && response.data) {
          const data = response.data
          categoriesData = typeof data === 'object' && 'data' in data && Array.isArray(data.data)
            ? data.data
            : Array.isArray(data) ? data : []
        } else if (Array.isArray(response)) {
          categoriesData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          categoriesData = response.data
        }
      }

      set({ categories: categoriesData, loading: false })
    } catch (error) {
      set({ error: 'Failed to load categories', loading: false })
    }
  },

  fetchCategoryTree: async () => {
    try {
      const response = await getCategoryTree()

      let treeData: Category[] = []
      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          treeData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          treeData = response.data
        } else if ('status' in response && response.data && Array.isArray(response.data)) {
          treeData = response.data
        }
      }

      set({ categoryTree: treeData })
    } catch (error) {
      console.error('Failed to load category tree:', error)
    }
  },

  addCategory: async (data) => {
    const response = await createCategory(data)
    const newCategory = response?.data ?? response

    // Refresh both lists
    await Promise.all([get().fetchCategories(), get().fetchCategoryTree()])

    return newCategory
  },

  editCategory: async (id, data) => {
    await updateCategory(id, data)

    // Refresh both lists
    await Promise.all([get().fetchCategories(), get().fetchCategoryTree()])
  },

  removeCategory: async (id) => {
    await deleteCategory(id)

    // Refresh both lists
    await Promise.all([get().fetchCategories(), get().fetchCategoryTree()])
  },

  getCategoryById: (id: number) => {
    return get().categories.find((c) => c.id === id)
  },

  clearError: () => set({ error: null }),
}))
