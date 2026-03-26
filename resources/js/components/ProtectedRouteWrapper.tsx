import React from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from './LoadingState'
import { AccessDenied } from './AccessDenied'
import { useAttendance } from '@/hooks/useAttendance'

interface ProtectedRouteProps {
  permissions?: string[]
  requireAll?: boolean
  role?: string
}

export function ProtectedRouteWrapper({
  permissions,
  requireAll = false,
  role,
}: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const hydrated = useAuthStore((state) => state.hydrated)
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission)
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions)
  const hasRole = useAuthStore((state) => state.hasRole)
  const location = useLocation()
  const { attendance, loading } = useAttendance(user?.id, token)


  if (!hydrated || loading) {
    return <LoadingState />
  }

  const isAuthenticated = !!token

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const breakIns = Array.isArray(attendance?.break_in) ? attendance.break_in : []
  const breakOuts = Array.isArray(attendance?.break_out) ? attendance.break_out : []
  const isOnBreak = attendance?.clock_in && !attendance?.clock_out && breakIns.length > breakOuts.length

  if (isOnBreak && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />
  }

  if (role && !hasRole(role)) {
    return <AccessDenied message={`You don't have permission to access this page. Required role: ${role}`} />
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasAccess) {
      return (
        <AccessDenied
          message={`You don't have permission to access this page. Required permissions: ${
            requireAll ? 'All of ' : 'Any of '
          }${permissions.join(', ')}`}
        />
      )
    }
  }

  return <Outlet />
}
