import { create } from 'zustand'
import { api } from '@/lib/api'

export interface CRUDPermissions {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface ModulePermissions {
  [key: string]: CRUDPermissions
}

export interface Role {
  id: number
  name: string
  description: string
  users_count: number
  permissions: ModulePermissions
  created_at?: string
  updated_at?: string
}

interface RolesState {
  roles: Role[]
  currentRole: Role | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    perPage: number
    total: number
  }

  // Actions
  fetchRoles: (page?: number) => Promise<void>
  fetchRole: (id: string | number) => Promise<void>
  createRole: (data: Omit<Role, 'id' | 'users_count' | 'created_at' | 'updated_at'>) => Promise<void>
  updateRole: (id: string | number, data: Partial<Role>) => Promise<void>
  deleteRole: (id: string | number) => Promise<void>
  clearError: () => void
  clearCurrentRole: () => void
}

export const useRolesStore = create<RolesState>((set, get) => ({
  roles: [],
  currentRole: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    perPage: 15,
    total: 0,
  },

  fetchRoles: async (page = 1) => {
    set({ loading: true, error: null })
    try {
      const { perPage } = get().pagination
      const response = await api.get(`/roles?page=${page}&per_page=${perPage}`)

      set({
        roles: response.data.data || response.data,
        pagination: {
          page,
          perPage,
          total: response.data.total || response.data.length,
        },
        loading: false,
      })
    } catch {
      set({
        error: 'Failed to fetch roles',
        loading: false,
      })
    }
  },

  fetchRole: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get(`/roles/${id}`)
      set({
        currentRole: response.data,
        loading: false,
      })
    } catch {
      set({
        error: 'Failed to load role data',
        loading: false,
      })
    }
  },

  createRole: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.post('/roles', data)
      const { roles } = get()

      set({
        roles: [...roles, response.data],
        loading: false,
      })
    } catch (err) {
      set({
        error: 'Failed to create role',
        loading: false,
      })
      throw err
    }
  },

  updateRole: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.put(`/roles/${id}`, data)
      const { roles, currentRole } = get()

      set({
        roles: roles.map((role) =>
          role.id === id ? response.data : role
        ),
        currentRole: currentRole?.id === id ? response.data : currentRole,
        loading: false,
      })
    } catch (err) {
      set({
        error: 'Failed to update role',
        loading: false,
      })
      throw err
    }
  },

  deleteRole: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/roles/${id}`)
      const { roles } = get()

      set({
        roles: roles.filter((role) => role.id !== id),
        loading: false,
      })
    } catch (err) {
      set({
        error: 'Failed to delete role',
        loading: false,
      })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  clearCurrentRole: () => set({ currentRole: null }),
}))
