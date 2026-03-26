import { useState } from 'react'
import { Stack, TextInput, Text, Button, Anchor } from '@mantine/core'
import { useTranslation } from 'react-i18next'

type ForgotPasswordFormProps = React.ComponentProps<'form'>

export function ForgotPasswordForm({ className, ...props }: ForgotPasswordFormProps) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
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
        <Text size="xl" fw="bold">{t('auth.forgotPassword.title')}</Text>
        <Text size="sm" c="dimmed" style={{ textAlign: 'center', textWrap: 'balance' }}>
          {t('auth.forgotPassword.subtitle')}
        </Text>

        <Stack gap="md">
          <TextInput
            id="phone"
            type="tel"
            label={t('auth.login.phoneLabel')}
            placeholder={t('auth.login.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
            required
            size="md"
          />

          <Button type="submit" fullWidth loading={loading}>
            {t('auth.forgotPassword.sendOtp')}
          </Button>

          <Text size="sm" ta="center" c="dimmed">
            {t('auth.forgotPassword.rememberPassword')}{' '}
            <Anchor href="/login" inherit style={{ textDecoration: 'underline', textDecorationOffset: '2px' }}>
              {t('auth.forgotPassword.signIn')}
            </Anchor>
          </Text>
        </Stack>
      </Stack>
    </form>
  )
}
