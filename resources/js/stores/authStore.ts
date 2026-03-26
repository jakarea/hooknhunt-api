import { create } from 'zustand'

/**
 * Convert route path to permission key using naming convention
 *
 * Examples:
 * /finance/banks           → finance_banks_view
 * /finance/banks/create    → finance_banks_create
 * /finance/banks/123/edit   → finance_banks_edit
 * /hrm/staff               → hrm_staff_view
 *
 * @param route - The route path (e.g., "/finance/banks/123/edit")
 * @returns The corresponding permission key (e.g., "finance_banks_edit")
 */
function routeToPermissionKey(route: string): string | null {
  // Remove leading and trailing slashes
  let path = route.replace(/^\/|\/$/g, '')

  // Split by /
  const parts = path.split('/').filter(Boolean)

  if (parts.length === 0) return null

  // Remove numeric segments (IDs) from dynamic routes
  // e.g., /finance/banks/123/edit → /finance/banks/edit
  const cleanParts = parts.filter(p => !/^\d+$/.test(p))

  // Handle action keywords
  const lastPart = cleanParts[cleanParts.length - 1]

  // Map action keywords to permission actions
  const actionMap: Record<string, string> = {
    create: 'create',
    edit: 'edit',
    update: 'edit',
    delete: 'delete',
    destroy: 'delete',
    store: 'create',
    show: 'view',
    view: 'view',
    index: 'view',
  }

  // If last part is an action keyword, use it
  // Otherwise, default to 'view'
  const action = actionMap[lastPart as string] || 'view'

  // Remove the action from parts if it's 'view'
  const resourceParts = action === 'view'
    ? cleanParts
    : cleanParts.slice(0, -1)

  // Join with underscores to create permission key
  return [...resourceParts, action].join('_')
}

export interface Role {
  id: number
  name: string
  slug: string
  description?: string
}

export interface Permission {
  id: number
  name: string
  slug: string
  key: string  // Frontend permission identifier (e.g., "finance_banks_view")
  group_name?: string
}

export interface User {
  id: number
  name: string
  email: string
  phone: string  // Changed from phone_number
  whatsappNumber?: string  // Changed from whatsapp_number
  roleId?: number  // Changed from role_id
  isActive?: boolean  // Changed from is_active
  phoneVerifiedAt?: string  // Changed from phone_verified_at
  lastLoginAt?: string  // Changed from last_login_at
  createdAt: string  // Changed from created_at
  updatedAt: string  // Changed from updated_at
  deletedAt?: string  // Changed from deleted_at
  role?: Role
}

interface AuthState {
  user: User | null
  token: string | null
  permissions: string[] // Array of permission slugs (for backward compatibility)
  permissionKeys: string[] // Array of permission keys (for frontend)
  permissionObjects: Permission[] // Array of full permission objects with group_name
  hydrated: boolean // Track if we've loaded from localStorage
  isAuthenticated: () => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (roleSlug: string) => boolean
  isSuperAdmin: () => boolean
  hasAccessToGroup: (groupName: string) => boolean
  getPermissionGroups: () => string[]
  canAccessRoute: (route: string) => boolean  // Check route access using permission keys
  login: (token: string, user: User, permissions?: string[], permissionObjects?: Permission[]) => void
  setPermissions: (permissions: string[], permissionObjects?: Permission[]) => void
  logout: () => void
  loadUserFromStorage: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  permissions: [],
  permissionKeys: [], // NEW: Store permission keys separately for frontend
  permissionObjects: [],
  hydrated: false,
  isAuthenticated: () => !!get().token, // Check for both null and undefined

  // Permission checking methods (checks both keys and slugs)
  hasPermission: (permission: string) => {
    const { permissions, permissionKeys, user } = get()
    // Super admin has all permissions (check by slug or role name)
    if (user?.role?.slug === 'super_admin' || user?.role?.name === 'Super Admin' || user?.roleId === 1) return true
    // Check both keys and slugs for flexibility
    return permissions.includes(permission) || permissionKeys.includes(permission)
  },

  hasAnyPermission: (permissions: string[]) => {
    const { permissions: userPermissions, user } = get()
    // Super admin has all permissions
    if (user?.role?.slug === 'super_admin') return true
    return permissions.some(p => userPermissions.includes(p))
  },

  hasAllPermissions: (permissions: string[]) => {
    const { permissions: userPermissions, user } = get()
    // Super admin has all permissions
    if (user?.role?.slug === 'super_admin') return true
    return permissions.every(p => userPermissions.includes(p))
  },

  hasRole: (roleSlug: string) => {
    const { user } = get()
    return user?.role?.slug === roleSlug
  },

  isSuperAdmin: () => {
    const { user } = get()
    return user?.role?.slug === 'super_admin' || user?.role?.name === 'Super Admin' || user?.roleId === 1
  },

  // Check if user has access to any permission in a group
  hasAccessToGroup: (groupName: string) => {
    const { permissionObjects, user } = get()
    // Super admin has access to all groups
    if (user?.role?.slug === 'super_admin') return true
    return permissionObjects.some(p => p.group_name === groupName)
  },

  // Get all unique permission groups the user has access to
  getPermissionGroups: () => {
    const { permissionObjects, user } = get()
    // Super admin has access to all groups
    if (user?.role?.slug === 'super_admin') return ['Dashboard', 'HRM', 'Operations', 'Finance', 'Settings']
    const groups = new Set(permissionObjects.map(p => p.group_name).filter((g): g is string => Boolean(g)))
    return Array.from(groups)
  },

  // Check if user can access a route based on their permissions (from database)
  // Uses naming convention: route path → permission key
  canAccessRoute: (route: string) => {
    const { user, permissionKeys } = get()
    // Super admin can access all routes (multiple checks for robustness)
    if (user?.role?.slug === 'super_admin' || user?.role?.name === 'Super Admin' || user?.roleId === 1) return true

    // Convert route path to permission key using naming convention
    // /finance/banks → finance_banks_view
    // /finance/banks/create → finance_banks_create
    // /finance/banks/123/edit → finance_banks_edit
    const requiredKey = routeToPermissionKey(route)

    // If route doesn't map to a permission pattern, it's public
    if (!requiredKey) return true

    // Check if user has the permission key
    return permissionKeys.includes(requiredKey)
  },

  login: (token, user, permissions = [], permissionObjects = []) => {
    // Extract permission keys from permissionObjects (optimized - single pass)
    const permissionKeys = permissionObjects.map((p: Permission) => p.key).filter(Boolean)

    // Batch all localStorage writes into a single object (faster than multiple setItem calls)
    const authData = {
      token,
      user: JSON.stringify(user),
      permissions: JSON.stringify(permissions),
      permissionKeys: JSON.stringify(permissionKeys),
      permissionObjects: JSON.stringify(permissionObjects),
    }

    // Write all at once (localStorage is synchronous)
    Object.entries(authData).forEach(([key, value]) => {
      localStorage.setItem(key, value)
    })

    // Set state (single update, no re-renders)
    set({ user, token, permissions, permissionKeys, permissionObjects, hydrated: true })
  },

  setPermissions: (permissions: string[], permissionObjects = []) => {
    // Extract permission keys from permissionObjects
    const permissionKeys = permissionObjects.map((p: Permission) => p.key).filter(Boolean)

    localStorage.setItem('permissions', JSON.stringify(permissions))
    localStorage.setItem('permissionKeys', JSON.stringify(permissionKeys))
    localStorage.setItem('permissionObjects', JSON.stringify(permissionObjects))
    set({ permissions, permissionKeys, permissionObjects })
  },

  logout: () => {
    // Clear from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    localStorage.removeItem('permissionKeys')
    localStorage.removeItem('permissionObjects')

    // Clear state
    set({ user: null, token: null, permissions: [], permissionKeys: [], permissionObjects: [], hydrated: false })

    // Redirect to login
    window.location.href = '/login'
  },

  loadUserFromStorage: () => {
    const token = localStorage.getItem('token')
    const userString = localStorage.getItem('user')
    const permissionsString = localStorage.getItem('permissions')
    const permissionKeysString = localStorage.getItem('permissionKeys')
    const permissionObjectsString = localStorage.getItem('permissionObjects')


    if (token && userString) {
      try {
        const user = JSON.parse(userString) as User
        const permissions = permissionsString ? JSON.parse(permissionsString) : []
        const permissionKeys = permissionKeysString ? JSON.parse(permissionKeysString) : []
        const permissionObjects = permissionObjectsString ? JSON.parse(permissionObjectsString) : []
        set({ user, token, permissions, permissionKeys, permissionObjects, hydrated: true })
      } catch (error) {
        console.error('[authStore.loadUserFromStorage] Error parsing:', error)
        // Clear corrupted storage
        set({ hydrated: true })
        get().logout()
      }
    } else {
      set({ hydrated: true })
    }
  },

  setUser: (user) => {
    // Update user in both state and localStorage
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
}))

// Load from storage immediately when the store is created (outside React lifecycle)
useAuthStore.getState().loadUserFromStorage()
