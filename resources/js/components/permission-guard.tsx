/**
 * PERMISSION GUARD COMPONENT
 * Declarative permission-based rendering
 *
 * USAGE:
 * <PermissionGuard permission="employee.create">
 *   <Button>Create Employee</Button>
 * </PermissionGuard>
 *
 * <PermissionGuard
 *   permissions={['employee.edit', 'employee.delete']}
 *   fallback={<Text>Access Denied</Text>}
 * >
 *   <ActionButtons />
 * </PermissionGuard>
 *
 * <SelfProfileGuard userId={employeeId}>
 *   <Button>Edit My Profile</Button>
 * </SelfProfileGuard>
 */

import { type ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  children: ReactNode
  /** Single permission slug */
  permission?: string
  /** Multiple permissions (user needs any one) */
  permissions?: string[]
  /** User needs ALL permissions (default: false - needs any) */
  requireAll?: boolean
  /** Fallback UI when permission denied */
  fallback?: ReactNode
  /** Show debug info in console */
  debug?: boolean
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  debug = false,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions()

  // Determine if user has access
  let hasAccess = true

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  // Debug logging
  if (debug) {
      permission,
      permissions,
      requireAll,
      hasAccess,
      checking: permission || permissions,
    })
  }

  return <>{hasAccess ? children : fallback}</>
}

/**
 * SELF-PROFILE GUARD
 * Allows users to always view/edit their own profile
 * regardless of permissions
 *
 * USAGE:
 * <SelfProfileGuard userId={targetUserId} mode="edit">
 *   <Button>Edit Profile</Button>
 * </SelfProfileGuard>
 */
interface SelfProfileGuardProps {
  userId: number | string
  mode: 'view' | 'edit'
  children: ReactNode
  fallback?: ReactNode
  debug?: boolean
}

export function SelfProfileGuard({
  userId,
  mode,
  children,
  fallback = null,
  debug = false,
}: SelfProfileGuardProps) {
  const { canEditProfile, canViewProfile, isOwnProfile } = usePermissions()

  const hasAccess = mode === 'edit'
    ? canEditProfile(userId)
    : canViewProfile(userId)

  const ownProfile = isOwnProfile(userId)

  if (debug) {
      userId,
      mode,
      ownProfile,
      hasAccess,
    })
  }

  return <>{hasAccess ? children : fallback}</>
}

/**
 * HELPER COMPONENTS FOR COMMON PERMISSIONS
 * These make your code more readable
 * All permissions come from database dynamically using permission `key` field
 */

export function CanCreateEmployee({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="hrm_employees_create" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanEditEmployee({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="hrm_employees_edit" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanDeleteEmployee({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="hrm_employees_delete" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanManageRoles({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="hrm_roles_index" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanViewPayroll({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard permission="hrm_payroll_view" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}
