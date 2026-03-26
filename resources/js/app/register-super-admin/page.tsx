import { Box, SimpleGrid, Image, Group, Title, Text, Alert } from '@mantine/core'
import { SuperAdminRegisterForm } from '@/components/super-admin-register-form'
import { IconInfoCircle } from '@tabler/icons-react'

export default function SuperAdminSignupPage() {
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
        {/* Left Side - Register Form */}
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

            {/* Warning Alert */}
            <Alert variant="light" color="yellow" title="Super Admin Registration" icon={<IconInfoCircle />} mb="xl">
              <Text size="sm">
                This registration creates a Super Admin account with full system access. Only use this if you are the system administrator.
              </Text>
            </Alert>

            {/* Register Form */}
            <SuperAdminRegisterForm />
          </Box>
        </Box>

        {/* Right Side - Image (Desktop only) */}
        <Box
          display={{ base: 'none', lg: 'block' }}
          style={{
            backgroundColor: 'var(--mantine-color-blue-filled)',
            position: 'relative',
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop"
            alt="Hook & Hunt"
            h="100vh"
            w="100%"
            styles={{
              root: {
                position: 'absolute',
                inset: 0,
              },
            }}
          />
          {/* Overlay */}
          <Box
            pos="absolute"
            inset={0}
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.95) 100%)',
            }}
          />
          {/* Content */}
          <Box
            pos="relative"
            p="xl"
            display="flex"
            style={{
              zIndex: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Title order={1} size="h1" mb="md">
              Super Admin Access
            </Title>
            <Text size="xl" c="white" maw={400}>
              Complete system control with full administrative privileges. Manage users, roles, permissions, and all system settings.
            </Text>
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  )
}
