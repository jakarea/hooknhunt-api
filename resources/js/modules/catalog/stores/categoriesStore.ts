/**
 * Categories Store (Catalog Module)
 *
 * Manages categories list, tree, split view navigation, and optimistic operations.
 * List page uses selectors to prevent full re-render.
 * Module-isolated - uses Catalog API endpoints directly.
 */

import { create } from 'zustand'
import { api } from '@/lib/api'
import { notifications } from '@mantine/notifications'

// ============================================================================
// TYPES
// ============================================================================

export type Category = {
  id: number
  name: string
  slug: string
  parentId?: number | null
  image?: { id: number; fullUrl: string } | null
  imagePath?: string | null
  icon?: string | null
  position?: number
  isActive?: boolean
  isFeatured?: boolean
  showInMenu?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  children?: Category[]
  createdAt?: string
  updatedAt?: string
}

export interface CategoryFilters {
  search?: string
  is_active?: boolean
  is_featured?: boolean
  parent_id?: number | null
  per_page?: number
  page?: number
}

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
      // Build query params
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
      if (filters?.is_featured !== undefined) params.append('is_featured', filters.is_featured.toString())
      if (filters?.parent_id !== undefined) params.append('parent_id', filters.parent_id.toString())
      if (filters?.per_page) params.append('per_page', filters.per_page.toString())
      if (filters?.page) params.append('page', filters.page.toString())

      const queryString = params.toString()
      const endpoint = `catalog/categories${queryString ? `?${queryString}` : ''}`

      const response = await api.get(endpoint)

      // Handle response structure: { data: { data: [...], ... } }
      let categoriesData: Category[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      categoriesData = Array.isArray(responseData) ? responseData : []

      set({ categories: categoriesData, loading: false })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load categories',
        color: 'red',
      })
      set({ error: 'Failed to load categories', loading: false })
    }
  },

  fetchCategoryTree: async () => {
    try {
      const response = await api.get('catalog/categories/tree')

      // Handle response structure: { data: { data: [...], ... } }
      let treeData: Category[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      treeData = Array.isArray(responseData) ? responseData : []

      set({ categoryTree: treeData })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load category tree',
        color: 'red',
      })
    }
  },

  fetchRootCategories: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('catalog/categories?filter=root')

      // Handle response structure: { data: { data: [...], ... } }
      let rootsData: Category[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      rootsData = Array.isArray(responseData) ? responseData : []

      set({
        rootCategories: rootsData,
        currentChildren: rootsData,
        selectedCategory: null,
        navigationPath: [],
        loading: false
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load root categories',
        color: 'red',
      })
      set({ error: 'Failed to load root categories', loading: false })
    }
  },

  fetchChildren: async (parentId: number, parentName: string) => {
    set({ loadingChildren: true, error: null })
    try {
      const response = await api.get(`catalog/categories/${parentId}/children`)

      // Handle response structure: { data: { data: [...], ... } }
      let childrenData: Category[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      childrenData = Array.isArray(responseData) ? responseData : []

      // Find the parent category to get full details
      const parent = get().rootCategories.find(c => c.id === parentId)
        || get().currentChildren.find(c => c.id === parentId)

      set({
        currentChildren: childrenData,
        selectedCategory: parent || null,
        navigationPath: [...get().navigationPath, { id: parentId, name: parentName }],
        loadingChildren: false
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load child categories',
        color: 'red',
      })
      set({ error: 'Failed to load child categories', loadingChildren: false })
    }
  },

  navigateToCategory: async (category: Category) => {
    set({ loadingChildren: true, error: null })
    try {
      const response = await api.get(`catalog/categories/${category.id}/children`)

      // Handle response structure: { data: { data: [...], ... } }
      let childrenData: Category[] = []
      const responseData = response.data?.data?.data || response.data?.data || response.data || []

      childrenData = Array.isArray(responseData) ? responseData : []

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
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load category',
        color: 'red',
      })
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
    try {
      const response = await api.post('catalog/categories', data)

      // Refresh all lists
      await Promise.all([
        get().fetchCategories(),
        get().fetchCategoryTree(),
        get().fetchRootCategories()
      ])

      notifications.show({
        title: 'Success',
        message: 'Category created',
        color: 'green',
      })

      return response.data?.data || response.data
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create category',
        color: 'red',
      })
      throw error
    }
  },

  editCategory: async (id, data) => {
    try {
      await api.put(`catalog/categories/${id}`, data)

      // Refresh all lists
      await Promise.all([
        get().fetchCategories(),
        get().fetchCategoryTree(),
        get().fetchRootCategories()
      ])

      notifications.show({
        title: 'Success',
        message: 'Category updated',
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update category',
        color: 'red',
      })
      throw error
    }
  },

  removeCategory: async (id) => {
    try {
      await api.delete(`catalog/categories/${id}`)

      // Refresh all lists
      await Promise.all([
        get().fetchCategories(),
        get().fetchCategoryTree(),
        get().fetchRootCategories()
      ])

      notifications.show({
        title: 'Success',
        message: 'Category deleted',
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete category',
        color: 'red',
      })
      throw error
    }
  },

  getCategoryById: (id: number) => {
    return get().categories.find((c) => c.id === id)
  },

  clearError: () => set({ error: null }),
}))
