import { SimpleGrid, Box, Image, Group, Anchor } from '@mantine/core'
import { ForgotPasswordForm } from "@/components/forgot-password"

export default function ForgotPasswordPage() {
  return (
    <SimpleGrid
      cols={{ base: 1, lg: 2 }}
      spacing={0}
      mih="100vh"
      mah="100vh"
    >
      <Box p={{ base: 'md', md: 'xl' }}>
        <Group justify="center" mb="xl">
          <Anchor href="/" inherit>
            <img
              src="https://hooknhunt.xyz/wp-content/uploads/2024/04/hook-and-hunt-transparent-png-1-3.svg"
              alt="Hook & Hunt"
              style={{ height: 40 }}
            />
          </Anchor>
        </Group>
        <Box
          display="flex"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <Box maw={320} w="100%">
            <ForgotPasswordForm />
          </Box>
        </Box>
      </Box>
      <Box visibleFrom="lg" bg="var(--mantine-color-gray-0)" pos="relative">
        <Image
          src="https://ui.shadcn.com/placeholder.svg"
          alt="Authentication"
          h="100%"
          w="100%"
          styles={{
            root: {
              position: 'absolute',
              inset: 0,
            },
          }}
        />
      </Box>
    </SimpleGrid>
  )
}
