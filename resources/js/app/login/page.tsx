import { useEffect } from 'react'
import { Box, Image, SimpleGrid, Group } from '@mantine/core'
import { LoginForm } from '@/components/login-form'
import { LoginQuotes } from '@/components/login-quotes'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const token = useAuthStore((state) => state.token)
  const hydrated = useAuthStore((state) => state.hydrated)

  // Redirect authenticated users to dashboard immediately
  useEffect(() => {
    if (hydrated && token) {
      // Use window.location.href for instant hard redirect (faster than React Router)
      window.location.href = '/dashboard'
    }
  }, [hydrated, token])

  // Show loading while hydrating
  if (!hydrated) {
    return null
  }

  // Don't render login form if already authenticated
  if (token) {
    return null
  }

  return (
    <Box
      mih="100vh"
      display="flex"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      <SimpleGrid
        cols={{ base: 1, lg: 2 }}
        spacing={{ base: 0, lg: 'xl' }}
        w="100%"
        mih="100vh"
      >
        {/* Left Side - Login Form */}
        <Box
          p={{ base: 'md', md: 'xl', lg: '6xl' }}
          display="flex"
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box w="100%" maw={450}>
            {/* Logo */}
            <Group justify="center" mb="xl">
              <Image
                src="/hook-and-hunt-logo.svg"
                alt="Hook & Hunt"
                h={80}
                w="auto"
                fit="contain"
              />
            </Group>

            {/* Login Form */}
            <LoginForm />
          </Box>
        </Box>

        {/* Right Side - Quotes (Desktop only) */}
        <Box
          display={{ base: 'none', lg: 'flex' }}
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background Pattern */}
          <Box
            pos="absolute"
            inset={0}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Floating Circles */}
          <Box
            pos="absolute"
            top={-100}
            right={-100}
            w={400}
            h={400}
            style={{
              borderRadius: '400px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            }}
          />
          <Box
            pos="absolute"
            bottom={-150}
            left={-150}
            w={500}
            h={500}
            style={{
              borderRadius: '500px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            }}
          />

          {/* Quotes Component */}
          <Box
            pos="relative"
            w="100%"
            h="100vh"
            display="flex"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <LoginQuotes />
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  )
}
