import { useAuthStore } from '@/stores/authStore'
import { LoadingState } from './LoadingState'

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  // Use the hook to get hydrated state directly
  const hydrated = useAuthStore((state) => state.hydrated)

  // If auth store is still loading, show loading state
  if (!hydrated) {
    return <LoadingState />
  }

  return <>{children}</>
}
