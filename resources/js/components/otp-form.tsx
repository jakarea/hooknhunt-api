import { useState } from 'react'
import { Stack, PinInput, Text, Button, Anchor, Box } from '@mantine/core'
import { useTranslation } from 'react-i18next'

interface OTPFormProps extends React.ComponentProps<'form'> {
  phone?: string
}

export function OTPForm({ phone = '', className, ...props }: OTPFormProps) {
  const { t } = useTranslation()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className={className} {...props}>
      <Stack align="center" gap="xs">
        <Text size="xl" fw="bold">{t('auth.otp.verifyTitle')}</Text>
        <Text size="sm" c="dimmed" style={{ textAlign: 'center', textWrap: 'balance' }}>
          {t('auth.otp.verifySubtitle')} {phone || t('auth.otp.yourPhone')}
        </Text>

        <Stack gap="md">
        <Box>
          <Text component="label" size="sm" fw={500} mb="xs" display="block">
            {t('auth.otp.label')}
          </Text>
          <PinInput
            length={6}
            type="number"
            value={otp}
            onChange={setOtp}
            placeholder="○"
            size="md"
          />
        </Box>

        <Button type="submit" fullWidth loading={loading}>
          {t('auth.otp.verifyButton')}
        </Button>

        <Text size="sm" ta="center" c="dimmed">
          {t('auth.otp.didntReceive')}{' '}
          <Anchor href="#" inherit style={{ textDecoration: 'underline', textDecorationOffset: '2px' }}>
            {t('auth.otp.resend')}
          </Anchor>
        </Text>

        <Text size="sm" ta="center" c="dimmed">
          <Anchor href="/login" inherit style={{ textDecoration: 'underline', textDecorationOffset: '2px' }}>
            {t('auth.otp.backToLogin')}
          </Anchor>
        </Text>
        </Stack>
      </Stack>
    </form>
  )
}
