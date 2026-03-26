import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Paper,
  Anchor,
  Alert,
  Progress,
  Group,
} from '@mantine/core'
import { IconCheck, IconShield, IconUser, IconMail, IconPhone } from '@tabler/icons-react'
import { useUIStore } from '@/stores/uiStore'
import api from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string
      data?: Record<string, string>
    }
  }
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

export function SuperAdminRegisterForm() {
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const { t } = useTranslation()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [success, setSuccess] = useState(false)

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength += 25
    if (pwd.length >= 12) strength += 25
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25
    if (/\d/.test(pwd)) strength += 15
    if (/[!@#$%^&*]/.test(pwd)) strength += 10
    return Math.min(strength, 100)
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordColor = passwordStrength < 40 ? 'red' : passwordStrength < 70 ? 'yellow' : 'green'

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/register-super-admin', {
        name,
        email,
        phone,
        password,
        password_confirmation: confirmPassword,
      })

      setSuccess(true)
      showToast('Super Admin created successfully!', 'success')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      const apiError = error as unknown as ApiErrorResponse
      const message = apiError?.response?.data?.message || 'Registration failed'
      showToast(message, 'error')

      // Handle validation errors
      if (apiError?.response?.data?.data) {
        const serverErrors = apiError.response.data.data as Record<string, string>
        setErrors({
          email: serverErrors.email,
          phone: serverErrors.phone,
          name: serverErrors.name,
          password: serverErrors.password,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Show success message
  if (success) {
    return (
      <Paper
        withBorder
        shadow="md"
        p={{ base: 'md', md: 'xl', lg: '32px' }}
        radius="lg"
        miw={{ base: '100%', md: 450 }}
      >
        <Stack gap="lg">
          <Alert variant="light" color="green" title={t('auth.superAdminRegister.successTitle')} icon={<IconCheck size={20} />}>
            <Text size="md">{t('auth.superAdminRegister.successMessage')}</Text>
            <Text size="sm" c="dimmed" mt="xs">
              {t('auth.superAdminRegister.redirecting')}
            </Text>
          </Alert>

          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/login')}
          >
            {t('auth.superAdminRegister.goToLogin')}
          </Button>
        </Stack>
      </Paper>
    )
  }

  // Show registration form
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
          <Group gap="xs" justify="center">
            <IconShield size={28} color="var(--mantine-color-blue-filled)" />
            <Text
              size="2xl"
              fw="bold"
              ta="center"
            >
              {t('auth.superAdminRegister.title')}
            </Text>
          </Group>
          <Text
            size="md"
            c="dimmed"
            ta="center"
          >
            {t('auth.superAdminRegister.subtitle')}
          </Text>
        </Stack>

        {/* Form */}
        <Stack component="form" gap="md" onSubmit={handleSubmit}>
          <TextInput
            id="name"
            label={t('auth.superAdminRegister.nameLabel')}
            placeholder={t('auth.register.namePlaceholder')}
            required
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value)
              if (errors.name) setErrors({ ...errors, name: undefined })
            }}
            size="md"
            error={errors.name}
            leftSection={<IconUser size={16} />}
            autoFocus
          />

          <TextInput
            id="email"
            type="email"
            label={t('auth.superAdminRegister.emailLabel')}
            placeholder={t('auth.register.emailPlaceholder')}
            required
            value={email}
            onChange={(e) => {
              setEmail(e.currentTarget.value)
              if (errors.email) setErrors({ ...errors, email: undefined })
            }}
            size="md"
            error={errors.email}
            leftSection={<IconMail size={16} />}
          />

          <TextInput
            id="phone"
            label={t('auth.superAdminRegister.phoneLabel')}
            placeholder={t('auth.register.phonePlaceholder')}
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.currentTarget.value)
              if (errors.phone) setErrors({ ...errors, phone: undefined })
            }}
            size="md"
            error={errors.phone}
            leftSection={<IconPhone size={16} />}
          />

          <PasswordInput
            id="password"
            label={t('auth.superAdminRegister.passwordLabel')}
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
                  {passwordStrength < 40 ? t('auth.register.strength.weak') : passwordStrength < 70 ? t('auth.register.strength.medium') : t('auth.register.strength.strong')}
                </Text>
              </Text>
            </Stack>
          )}

          <PasswordInput
            id="confirm-password"
            label={t('auth.superAdminRegister.confirmPasswordLabel')}
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
            color="blue"
          >
            {loading ? t('auth.superAdminRegister.submittingButton') : t('auth.superAdminRegister.submitButton')}
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
