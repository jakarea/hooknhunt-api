/**
 * Categories Store
 *
 * Manages categories list, tree, split view navigation, and optimistic operations.
 * List page uses selectors to prevent full re-render.
 */

import { create } from 'zustand'
import {
  getCategories,
  getCategoryTree,
  getRootCategories,
  getCategoryChildren,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryFilters,
} from '@/utils/api'

// ============================================================================
// TYPES
// ============================================================================

interface NavigationItem {
  id: number
  name: string
}

interface CategoriesState {
  // Data
  categories: Category[]
  categoryTree: Category[]
  loading: boolean
  error: string | null

  // Split view state
  rootCategories: Category[]
  currentChildren: Category[]
  selectedCategory: Category | null
  navigationPath: NavigationItem[]
  loadingChildren: boolean

  // Actions
  fetchCategories: (filters?: CategoryFilters) => Promise<void>
  fetchCategoryTree: () => Promise<void>
  fetchRootCategories: () => Promise<void>
  fetchChildren: (parentId: number, parentName: string) => Promise<void>
  navigateToCategory: (category: Category) => Promise<void>
  navigateBack: () => void
  navigateToRoot: () => void
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

  // Split view state
  rootCategories: [],
  currentChildren: [],
  selectedCategory: null,
  navigationPath: [],
  loadingChildren: false,

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

  fetchRootCategories: async () => {
    set({ loading: true, error: null })
    try {
      const response = await getRootCategories()

      let rootsData: Category[] = []
      if (response && typeof response === 'object') {
        if ('status' in response && response.status && response.data) {
          rootsData = Array.isArray(response.data) ? response.data : []
        } else if (Array.isArray(response)) {
          rootsData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          rootsData = response.data
        }
      }

      set({ rootCategories: rootsData, currentChildren: rootsData, selectedCategory: null, navigationPath: [], loading: false })
    } catch (error) {
      set({ error: 'Failed to load root categories', loading: false })
    }
  },

  fetchChildren: async (parentId: number, parentName: string) => {
    set({ loadingChildren: true, error: null })
    try {
      const response = await getCategoryChildren(parentId)

      let childrenData: Category[] = []
      if (response && typeof response === 'object') {
        if ('status' in response && response.status && response.data) {
          childrenData = Array.isArray(response.data) ? response.data : []
        } else if (Array.isArray(response)) {
          childrenData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          childrenData = response.data
        }
      }

      // Find the parent category to get full details
      const parent = get().rootCategories.find(c => c.id === parentId)
        || get().currentChildren.find(c => c.id === parentId)

      set({
        currentChildren: childrenData,
        selectedCategory: parent || null,
        navigationPath: [...get().navigationPath, { id: parentId, name: parentName }],
        loadingChildren: false
      })
    } catch (error) {
      set({ error: 'Failed to load child categories', loadingChildren: false })
    }
  },

  navigateToCategory: async (category: Category) => {
    set({ loadingChildren: true, error: null })
    try {
      const response = await getCategoryChildren(category.id)

      let childrenData: Category[] = []
      if (response && typeof response === 'object') {
        if ('status' in response && response.status && response.data) {
          childrenData = Array.isArray(response.data) ? response.data : []
        } else if (Array.isArray(response)) {
          childrenData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          childrenData = response.data
        }
      }

      // Check if this category is already in navigation path
      const existingIndex = get().navigationPath.findIndex(item => item.id === category.id)

      if (existingIndex >= 0) {
        // Going back to a previous level - truncate path
        set({
          currentChildren: childrenData,
          selectedCategory: category,
          navigationPath: get().navigationPath.slice(0, existingIndex + 1),
          loadingChildren: false
        })
      } else {
        // Going deeper - add to path
        set({
          currentChildren: childrenData,
          selectedCategory: category,
          navigationPath: [...get().navigationPath, { id: category.id, name: category.name }],
          loadingChildren: false
        })
      }
    } catch (error) {
      set({ error: 'Failed to load category', loadingChildren: false })
    }
  },

  navigateBack: () => {
    const currentPath = get().navigationPath
    if (currentPath.length <= 1) {
      // Go back to root
      set({
        currentChildren: get().rootCategories,
        selectedCategory: null,
        navigationPath: []
      })
    } else {
      // Go back one level
      const newPath = currentPath.slice(0, -1)
      const previousCategory = newPath[newPath.length - 1]

      // Reload children of the previous category
      get().navigateToCategory({ id: previousCategory.id, name: previousCategory.name } as Category)
    }
  },

  navigateToRoot: () => {
    set({
      currentChildren: get().rootCategories,
      selectedCategory: null,
      navigationPath: []
    })
  },

  addCategory: async (data) => {
    const response = await createCategory(data)
    const newCategory = response?.data ?? response

    // Refresh all lists
    await Promise.all([
      get().fetchCategories(),
      get().fetchCategoryTree(),
      get().fetchRootCategories()
    ])

    return newCategory
  },

  editCategory: async (id, data) => {
    await updateCategory(id, data)

    // Refresh all lists
    await Promise.all([
      get().fetchCategories(),
      get().fetchCategoryTree(),
      get().fetchRootCategories()
    ])
  },

  removeCategory: async (id) => {
    await deleteCategory(id)

    // Refresh all lists
    await Promise.all([
      get().fetchCategories(),
      get().fetchCategoryTree(),
      get().fetchRootCategories()
    ])
  },

  getCategoryById: (id: number) => {
    return get().categories.find((c) => c.id === id)
  },

  clearError: () => set({ error: null }),
}))
