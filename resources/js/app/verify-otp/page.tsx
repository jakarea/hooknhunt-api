import { SimpleGrid, Box, Image } from '@mantine/core'
import { OTPForm } from "@/components/otp-form"

export default function OTPPage() {
  return (
    <SimpleGrid
      cols={{ base: 1, lg: 2 }}
      spacing={0}
      mih="100vh"
      mah="100vh"
    >
      <Box p={{ base: 'md', md: 'xl' }}>
        <Box
          display="flex"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <Box maw={320} w="100%">
            <OTPForm />
          </Box>
        </Box>
      </Box>
      <Box visibleFrom="lg" pos="relative">
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
