/**
 * ENHANCED PERMISSIONS HOOK
 * Provides permission checking with auto-refresh capability
 * Fully dynamic - all permissions come from database
 */

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import { notifications } from '@mantine/notifications'

export function usePermissions() {
  const {
    user,
    permissions,
    permissionKeys,
    permissionObjects,
    token,
    setPermissions,
    hasPermission: storeHasPermission,
    hasAnyPermission: storeHasAnyPermission,
    hasAllPermissions: storeHasAllPermissions,
    hasRole,
    isSuperAdmin,
    hasAccessToGroup,
    getPermissionGroups,
    canAccessRoute: storeCanAccessRoute,
  } = useAuthStore()

  /**
   * Refresh permissions from API
   * Call this when you suspect permissions might be stale
   */
  const refreshPermissions = useCallback(async () => {
    if (!user?.id || !token) {
      console.warn('Cannot refresh permissions: No user or token')
      notifications.show({
        title: 'Cannot Refresh',
        message: 'Please login first',
        color: 'orange',
      })
      return false
    }

    try {
      // Fetch fresh user data with permissions
      const response = await api.get(`/auth/me`)

      // Handle different response structures
      const userData = response.data?.data?.user || response.data?.user || response.data?.data

      if (userData) {
        // Get permissions from role
        const rolePermissions = userData.role?.permissions || []

        // Handle both array of objects and array of strings
        const newPermissions = rolePermissions.map((p: any) => {
          return typeof p === 'string' ? p : p.slug
        })

        // Also check for direct permissions on user
        const directPermissions = userData.directPermissions || []
        const directPermissionSlugs = directPermissions.map((p: any) => {
          return typeof p === 'string' ? p : p.slug
        })

        // Merge role and direct permissions
        const allPermissions = [...new Set([...newPermissions, ...directPermissionSlugs])]

        // Update store with both slugs and full objects
        setPermissions(allPermissions, rolePermissions)

        notifications.show({
          title: 'Success',
          message: `Permissions refreshed (${allPermissions.length} permissions loaded)`,
          color: 'green',
        })

        return true
      } else {
        throw new Error('No user data in response')
      }
    } catch (err) {
      console.error('Failed to refresh permissions:', err)
      notifications.show({
        title: 'Error',
        message: 'Failed to refresh permissions. Please try again.',
        color: 'red',
      })
      return false
    }
  }, [user?.id, token, setPermissions])

  /**
   * Check if user has a specific permission
   * Super admins always have all permissions
   */
  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      // Super admins have all permissions
      if (isSuperAdmin()) {
        return true
      }

      if (typeof permission === 'string') {
        return storeHasPermission(permission)
      }
      // Array of permissions - check if user has any
      return storeHasAnyPermission(permission)
    },
    [storeHasPermission, storeHasAnyPermission, isSuperAdmin]
  )

  /**
   * Check if user can access a specific route
   * Uses naming convention to derive permission from route
   * Super admins can access all routes
   */
  const canAccessRoute = useCallback(
    (route: string): boolean => {
      // Super admins can access all routes
      if (isSuperAdmin()) {
        return true
      }

      // Use store's canAccessRoute method (uses naming convention)
      return storeCanAccessRoute(route)
    },
    [storeCanAccessRoute, isSuperAdmin]
  )

  /**
   * Check if user can EDIT a specific staff's profile
   * Super admins can edit any profile
   * Users can always edit their own profile, otherwise need permission
   */
  const canEditProfile = useCallback(
    (targetUserId: number | string): boolean => {
      // Super admins can edit any profile
      if (isSuperAdmin()) {
        return true
      }

      // Convert to number if string
      const targetId = typeof targetUserId === 'string' ? parseInt(targetUserId) : targetUserId
      const currentUserId = user?.id

      // User can always edit their own profile
      if (currentUserId && currentUserId === targetId) {
        return true
      }

      // Otherwise, check for hrm.staff.edit permission
      return hasPermission('hrm.staff.edit')
    },
    [user?.id, hasPermission, isSuperAdmin]
  )

  /**
   * Check if user can VIEW a specific staff's profile
   * Super admins can view any profile
   * Users can always view their own profile, otherwise need permission
   */
  const canViewProfile = useCallback(
    (targetUserId: number | string): boolean => {
      // Super admins can view any profile
      if (isSuperAdmin()) {
        return true
      }

      // Convert to number if string
      const targetId = typeof targetUserId === 'string' ? parseInt(targetUserId) : targetUserId
      const currentUserId = user?.id

      // User can always view their own profile
      if (currentUserId && currentUserId === targetId) {
        return true
      }

      // Otherwise, check for hrm.staff.view permission (or hrm.staff.index)
      return hasPermission('hrm.staff.view') || hasPermission('hrm.staff.index')
    },
    [user?.id, hasPermission, isSuperAdmin]
  )

  /**
   * Check if user is viewing their own profile
   */
  const isOwnProfile = useCallback(
    (targetUserId: number | string): boolean => {
      const targetId = typeof targetUserId === 'string' ? parseInt(targetUserId) : targetUserId
      const currentUserId = user?.id
      return currentUserId !== undefined && currentUserId === targetId
    },
    [user?.id]
  )

  /**
   * Check if user has ALL specified permissions
   */
  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      return storeHasAllPermissions(perms)
    },
    [storeHasAllPermissions]
  )

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return storeHasAnyPermission(perms)
    },
    [storeHasAnyPermission]
  )

  return {
    permissions,
    permissionKeys,
    permissionObjects,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSuperAdmin,
    hasAccessToGroup,
    getPermissionGroups,
    canAccessRoute,
    canEditProfile,
    canViewProfile,
    isOwnProfile,
    refreshPermissions,
  }
}

/**
 * Hook to auto-refresh permissions on mount
 * Use this in apps that need up-to-date permissions
 */
export function useAutoRefreshPermissions(intervalMs: number = 5 * 60 * 1000) {
  const { refreshPermissions } = usePermissions()

  useEffect(() => {
    // Initial refresh
    refreshPermissions()

    // Set up interval
    const interval = setInterval(() => {
      refreshPermissions()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [refreshPermissions, intervalMs])
}
