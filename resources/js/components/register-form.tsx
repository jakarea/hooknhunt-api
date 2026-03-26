import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Paper,
  Anchor,
  PinInput,
  Alert,
  Progress,
  Group,
} from '@mantine/core'
import { IconCheck, IconPhone } from '@tabler/icons-react'
import { useUIStore } from '@/stores/uiStore'
import api from '@/lib/api'

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string
    }
  }
}

interface FormErrors {
  name?: string
  phone?: string
  password?: string
  confirmPassword?: string
  otp?: string
}

interface RegisterStep {
  type: 'details' | 'otp' | 'success'
}

export function RegisterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useUIStore()

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // OTP state
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [registeredPhone, setRegisteredPhone] = useState('')

  // Current step
  const [step, setStep] = useState<RegisterStep['type']>('details')

  // Countdown timer
  const startCountdown = useCallback(() => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Password strength
  const getPasswordStrength = useCallback((pwd: string) => {
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength += 25
    if (pwd.length >= 12) strength += 25
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25
    if (/\d/.test(pwd)) strength += 15
    if (/[!@#$%^&*]/.test(pwd)) strength += 10
    return Math.min(strength, 100)
  }, [])

  const passwordStrength = getPasswordStrength(password)
  const passwordColor =
    passwordStrength < 40 ? 'red' : passwordStrength < 70 ? 'yellow' : 'green'

  const validateDetailsForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = t('auth.register.validation.nameRequired')
    }

    if (!phone.trim()) {
      newErrors.phone = t('auth.register.validation.phoneRequired')
    }

    if (!password.trim()) {
      newErrors.password = t('auth.register.validation.passwordRequired')
    } else if (password.length < 8) {
      newErrors.password = t('auth.register.validation.passwordMinLength')
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.register.validation.passwordMismatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateOtpForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (otp.length !== 6) {
      newErrors.otp = t('auth.register.otp.validation.otpInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateDetailsForm()) {
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/register', {
        name,
        phone_number: phone,
        email: email || undefined,
        password,
        password_confirmation: confirmPassword,
      })

      setRegisteredPhone(phone)
      setStep('otp')
      showToast(t('auth.register.success.registrationSuccess'), 'success')
      startCountdown()
    } catch (error) {
      const apiError = error as unknown as ApiErrorResponse
      const message = apiError?.response?.data?.message || t('auth.register.errors.registerFailed')
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateOtpForm()) {
      return
    }

    setOtpLoading(true)

    try {
      await api.post('/auth/verify-otp', {
        phone_number: registeredPhone,
        otp,
      })

      setStep('success')
      showToast(t('auth.register.success.verified'), 'success')

      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      const apiError = error as unknown as ApiErrorResponse
      const message = apiError?.response?.data?.message || t('auth.register.otp.errors.verifyFailed')
      showToast(message, 'error')
    } finally {
      setOtpLoading(false)
    }
  }

  // Handle OTP resend
  const handleResendOtp = useCallback(async () => {
    setResendLoading(true)

    try {
      await api.post('/auth/resend-otp', {
        phone_number: registeredPhone,
      })

      showToast(t('auth.register.otp.resendButton'), 'success')
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    } catch (error) {
      const apiError = error as unknown as ApiErrorResponse
      const message = apiError?.response?.data?.message || t('auth.register.otp.errors.resendFailed')
      showToast(message, 'error')
    } finally {
      setResendLoading(false)
    }
  }, [registeredPhone, showToast, t])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup if needed
    }
  }, [])

  // Render OTP step
  if (step === 'otp') {
    return (
      <Paper
        withBorder
        shadow="md"
        p={{ base: 'md', md: 'xl', lg: '32px' }}
        radius="lg"
        miw={{ base: '100%', md: 450 }}
      >
        <Stack gap="lg">
          {/* Header */}
          <Stack align="center" gap="xs">
            <Text
              size="2xl"
              fw="bold"
              ta="center"
            >
              {t('auth.register.otp.title')}
            </Text>
            <Text
              size="md"
              c="dimmed"
              ta="center"
            >
              {t('auth.register.otp.subtitle')}{' '}
              <Text span fw={500} c="blue">
                {registeredPhone}
              </Text>
            </Text>
          </Stack>

          {/* OTP Form */}
          <Stack component="form" gap="md" onSubmit={handleVerifyOtp}>
            <Stack align="center" gap="xs">
              <PinInput
                length={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value)
                  if (errors.otp) setErrors({ ...errors, otp: undefined })
                }}
                size="lg"
                type={/^[0-9]*$/.test(otp) ? 'number' : 'alphanumeric'}
                placeholder={t('auth.register.otp.placeholder')}
                disabled={otpLoading}
                error={!!errors.otp}
              />
              {otp.length === 6 && !errors.otp && (
                <Group gap={4}>
                  <Text size="xs" c="green">
                    <IconCheck size={14} />
                  </Text>
                  <Text size="xs" c="green">
                    {t('auth.register.otp.otpEntered')}
                  </Text>
                </Group>
              )}
            </Stack>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={otpLoading}
            >
              {otpLoading ? t('auth.register.otp.submittingButton') : t('auth.register.otp.submitButton')}
            </Button>

            <Stack gap="xs">
              <Text size="sm" ta="center" c="dimmed">
                {t('auth.register.otp.didntReceive')}
              </Text>
              <Button
                variant="subtle"
                size="sm"
                fullWidth
                onClick={handleResendOtp}
                disabled={countdown > 0 || resendLoading}
                loading={resendLoading}
              >
                {countdown > 0
                  ? t('auth.register.otp.resendIn', { seconds: countdown })
                  : t('auth.register.otp.resendButton')}
              </Button>
            </Stack>
          </Stack>

          {/* Back to Register */}
          <Text size="sm" ta="center" c="dimmed">
            {t('auth.register.otp.wrongNumber')}{' '}
            <Anchor
              onClick={() => {
                setStep('details')
                setOtp('')
                setErrors({})
              }}
              inherit
              style={{ cursor: 'pointer' }}
            >
              {t('auth.register.otp.goBack')}
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    )
  }

  // Render success step
  if (step === 'success') {
    return (
      <Paper
        withBorder
        shadow="md"
        p={{ base: 'md', md: 'xl', lg: '32px' }}
        radius="lg"
        miw={{ base: '100%', md: 450 }}
      >
        <Stack gap="lg" align="center">
          <Alert variant="light" color="green" title={t('auth.register.success.title')} w="100%">
            <Text size="md">{t('auth.register.success.message')}</Text>
            <Text size="md">{t('auth.register.success.redirecting')}</Text>
          </Alert>
        </Stack>
      </Paper>
    )
  }

  // Render registration form
  return (
    <Paper
      withBorder
      shadow="md"
      p={{ base: 'md', md: 'xl', lg: '32px' }}
      radius="lg"
      miw={{ base: '100%', md: 450 }}
    >
      <Stack gap="lg">
        {/* Header */}
        <Stack align="center" gap="xs">
          <Text
            size="2xl"
            fw="bold"
            ta="center"
          >
            {t('auth.register.title')}
          </Text>
          <Text
            size="md"
            c="dimmed"
            ta="center"
          >
            {t('auth.register.subtitle')}
          </Text>
        </Stack>

        {/* Form */}
        <Stack component="form" gap="md" onSubmit={handleRegister}>
          <TextInput
            id="name"
            label={t('auth.register.nameLabel')}
            placeholder={t('auth.register.namePlaceholder')}
            required
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value)
              if (errors.name) setErrors({ ...errors, name: undefined })
            }}
            size="md"
            error={errors.name}
            autoFocus
          />

          <TextInput
            id="phone"
            label={t('auth.register.phoneLabel')}
            placeholder={t('auth.register.phonePlaceholder')}
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.currentTarget.value)
              if (errors.phone) setErrors({ ...errors, phone: undefined })
            }}
            leftSection={<IconPhone size={16} />}
            size="md"
            error={errors.phone}
          />

          <TextInput
            id="email"
            type="email"
            label={t('auth.register.emailLabel')}
            placeholder={t('auth.register.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            size="md"
          />

          <PasswordInput
            id="password"
            label={t('auth.register.passwordLabel')}
            placeholder={t('auth.register.passwordPlaceholder')}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value)
              if (errors.password) setErrors({ ...errors, password: undefined })
            }}
            size="md"
            error={errors.password}
          />

          {password && (
            <Stack gap="xs">
              <Progress
                value={passwordStrength}
                color={passwordColor}
                size="xs"
              />
              <Text size="sm" c="dimmed">
                {t('auth.register.passwordStrength')}:{' '}
                <Text
                  span
                  c={passwordColor}
                  fw={500}
                >
                  {passwordStrength < 40
                    ? t('auth.register.strength.weak')
                    : passwordStrength < 70
                    ? t('auth.register.strength.medium')
                    : t('auth.register.strength.strong')}
                </Text>
              </Text>
            </Stack>
          )}

          <PasswordInput
            id="confirm-password"
            label={t('auth.register.confirmPasswordLabel')}
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.currentTarget.value)
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
            }}
            error={errors.confirmPassword}
            size="md"
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            mt="sm"
          >
            {loading ? t('auth.register.submittingButton') : t('auth.register.submitButton')}
          </Button>

          <Text size="sm" ta="center" c="dimmed">
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Anchor href="/login" inherit style={{ textDecoration: 'underline' }}>
              {t('auth.register.signInLink')}
            </Anchor>
          </Text>
        </Stack>
      </Stack>
    </Paper>
  )
}
