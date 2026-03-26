import { Box, SimpleGrid, Image, Group, Title, Text } from '@mantine/core'
import { RegisterForm } from '@/components/register-form'

export default function SignupPage() {
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

            {/* Register Form */}
            <RegisterForm />
          </Box>
        </Box>

        {/* Right Side - Image (Desktop only) */}
        <Box
          display={{ base: 'none', lg: 'block' }}
          style={{
            backgroundColor: 'var(--mantine-color-red-filled)',
            position: 'relative',
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&h=1080&fit=crop"
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
              background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9) 0%, rgba(153, 27, 27, 0.95) 100%)',
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
              Join Our Team
            </Title>
            <Text size="xl" c="white" maw={400}>
              Create an admin account and start managing your business with our powerful ERP system.
            </Text>
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  )
}
