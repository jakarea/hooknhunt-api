import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface PermissionGuardProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  fallback?: ReactNode
}

/**
 * PermissionGuard Component
 *
 * Conditionally renders children based on user permissions/roles
 *
 * @example
 * // Single permission check
 * <PermissionGuard permission="user.index">
 *   <UserList />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (require at least one)
 * <PermissionGuard permissions={['user.create', 'user.edit']}>
 *   <UserActions />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (require all)
 * <PermissionGuard permissions={['user.create', 'user.edit']} requireAll={true}>
 *   <AdvancedUserActions />
 * </PermissionGuard>
 *
 * @example
 * // Role check
 * <PermissionGuard role="admin">
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * @example
 * // With fallback
 * <PermissionGuard permission="user.delete" fallback={<AccessDenied />}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}: PermissionGuardProps) => {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission)
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions)
  const hasRole = useAuthStore((state) => state.hasRole)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)

  // Super admin bypasses all checks
  if (isSuperAdmin()) {
    return <>{children}</>
  }

  // Role check
  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
