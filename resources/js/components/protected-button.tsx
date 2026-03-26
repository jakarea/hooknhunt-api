/**
 * PROTECTED BUTTON COMPONENT
 * Button that only shows if user has permission
 *
 * USAGE:
 * <ProtectedButton permission="employee.create" onClick={handleCreate}>
 *   Create Employee
 * </ProtectedButton>
 *
 * <ProtectedButton
 *   permissions={['employee.edit', 'hrm.manage']}
 *   color="red"
 *   onClick={handleDelete}
 * >
 *   Delete
 * </ProtectedButton>
 */

import { Button, type ButtonProps } from '@mantine/core'
import { PermissionGuard } from './permission-guard'

interface ProtectedButtonProps extends Omit<ButtonProps, 'children'> {
  children: React.ReactNode
  /** Single permission slug */
  permission?: string
  /** Multiple permissions (user needs any one) */
  permissions?: string[]
  /** User needs ALL permissions */
  requireAll?: boolean
  /** Fallback when no permission (default: null) */
  fallback?: React.ReactNode
  onClick?: () => void
}

export function ProtectedButton({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
  ...buttonProps
}: ProtectedButtonProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      fallback={fallback}
    >
      <Button {...buttonProps}>{children}</Button>
    </PermissionGuard>
  )
}
