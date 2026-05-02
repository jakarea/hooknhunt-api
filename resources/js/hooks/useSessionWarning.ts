import { useEffect, useState, useRef } from 'react'
import { notifications } from '@mantine/notifications'

// Configuration
const SESSION_WARNING_MINUTES = 55 // Show warning after 55 minutes
const CHECK_INTERVAL_SECONDS = 30 // Check every 30 seconds

interface SessionWarningOptions {
  /** Whether the session warning is enabled */
  enabled?: boolean
  /** Callback when session is about to expire (minutes remaining) */
  onWarning?: (minutesRemaining: number) => void
  /** Callback when session has expired */
  onExpired?: () => void
  /** Custom session duration in minutes (default: 60) */
  sessionDurationMinutes?: number
}

export function useSessionWarning(options: SessionWarningOptions = {}) {
  const {
    enabled = true,
    onWarning,
    onExpired,
    sessionDurationMinutes = 60,
  } = options

  const [loginTime] = useState(() => {
    const stored = localStorage.getItem('loginTime')
    if (stored) return new Date(stored)
    // If no login time stored, use current time
    const now = new Date()
    localStorage.setItem('loginTime', now.toISOString())
    return now
  })

  const warningShown = useRef(false)
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const checkSession = () => {
      const now = new Date()
      const elapsedMinutes = (now.getTime() - loginTime.getTime()) / (1000 * 60)
      const remaining = sessionDurationMinutes - elapsedMinutes

      setMinutesRemaining(remaining > 0 ? Math.ceil(remaining) : 0)

      // Show warning when approaching session expiry
      if (remaining <= (sessionDurationMinutes - SESSION_WARNING_MINUTES) && remaining > 0 && !warningShown.current) {
        warningShown.current = true

        if (onWarning) {
          onWarning(Math.ceil(remaining))
        }

        // Show notification with dismiss option
        notifications.show({
          title: 'Session Expiring Soon',
          message: `Your session will expire in ${Math.ceil(remaining)} minutes. Please save your work.`,
          color: 'yellow',
          autoClose: false,
          withCloseButton: true,
        })
      }

      // Session expired
      if (remaining <= 0 && warningShown.current) {
        if (onExpired) {
          onExpired()
        }

        notifications.show({
          title: 'Session Expired',
          message: 'Your session has expired. Please save your work locally and refresh to continue.',
          color: 'red',
          autoClose: false,
        })
      }
    }

    // Initial check
    checkSession()

    // Set up interval to check session
    const intervalId = setInterval(checkSession, CHECK_INTERVAL_SECONDS * 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [enabled, loginTime, sessionDurationMinutes, onWarning, onExpired])

  // Reset warning when user logs in or session is refreshed
  const resetSession = () => {
    const now = new Date()
    localStorage.setItem('loginTime', now.toISOString())
    warningShown.current = false
    setMinutesRemaining(sessionDurationMinutes)
  }

  return { loginTime, resetSession, minutesRemaining }
}

// Also export a function to manually update login time (called after successful login)
export function updateLoginTime() {
  localStorage.setItem('loginTime', new Date().toISOString())
}
