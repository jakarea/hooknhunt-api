import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Checkbox,
  Paper,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '@/stores/authStore'
import { apiMethods } from '@/lib/api'

interface LoginResponse {
  status: boolean
  message: string
  data: {
    accessToken: string
    token?: string
    access_token?: string
    tokenType: string
    user: {
      id: number
      roleId: number
      name: string
      phone: string
      email: string
      isActive: boolean
      phoneVerifiedAt: string | null | undefined
      lastLoginAt: string | null | undefined
      createdAt: string
      updatedAt: string
      deletedAt: string | null | undefined
      role: {
        id: number
        position: number
        name: string
        slug: string
        description: string
        createdAt: string
        updatedAt: string
        deletedAt: string | null | undefined
        permissions: Array<{ slug: string }>
      }
    }
  }
}

interface FormErrors {
  phone?: string
  password?: string
}

export function LoginForm() {
  const { t } = useTranslation()
  const { login } = useAuthStore()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!phoneNumber.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    // Prevent double submission
    if (loading) {
      return
    }


    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await apiMethods.post<LoginResponse>('/auth/login', {
        login_id: phoneNumber,
        password,
      })

      console.log('Login full response:', response)

      // Check response status (apiMethods.post already unwraps response.data)
      if (!response?.status) {
        const errorMsg = response?.message || 'Login failed'
        setErrors({ password: errorMsg })
        throw new Error(errorMsg)
      }

      // API V2 response structure: { status, message, data: { access_token, user } }
      const { data } = response

      // Handle different token field names (token, accessToken, access_token)
      const token = data.token || data.accessToken || data.access_token
      const user = data.user

      if (!token) {
        console.error('Token not found in response. Available keys:', Object.keys(data))
        throw new Error('Token not found in login response')
      }


      // Store token immediately
      localStorage.setItem('token', token)

      // Extract permissions from login response (user.role.permissions is already included)
      const rolePermissions = user?.role?.permissions || []
      const permissions = rolePermissions.map((p: { slug: string }) => p.slug)

      // Convert null values to undefined for store compatibility
      const normalizedUser = {
        ...user,
        phoneVerifiedAt: user?.phoneVerifiedAt ?? undefined,
        lastLoginAt: user?.lastLoginAt ?? undefined,
        deletedAt: user?.deletedAt ?? undefined,
      }

      login(token, normalizedUser, permissions, rolePermissions)


      notifications.show({
        title: 'Success',
        message: t('auth.login.success'),
        color: 'green',
      })

      // Immediate redirect - localStorage is synchronous, no delay needed
      // Use window.location.href for hard redirect (more reliable than React Router)
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('Login error:', error)

      // Handle different error types
      if (error && typeof error === 'object' && 'handled' in error) {
        // Error was already handled by API interceptor
        const apiError = error as { response?: { data?: { message?: string; errors?: string | { action?: string }; error?: string } } }

        if (apiError.response?.data) {
          const responseData = apiError.response.data

          // Check for phone verification action
          if (responseData.errors && typeof responseData.errors === 'object' && 'action' in responseData.errors && responseData.errors.action === 'verify_otp') {
            const msg = responseData.message || 'Phone verification required'
            setErrors({ phone: msg })
            notifications.show({
              title: 'Verification Required',
              message: msg,
              color: 'yellow',
            })
          } else {
            // Show inline error for password field
            const msg = responseData.message || responseData.error || 'Invalid credentials. Please try again.'
            console.log('Showing error message:', msg)
            setErrors({ password: msg })
            notifications.show({
              title: 'Login Failed',
              message: msg,
              color: 'red',
              autoClose: 5000,
            })
          }
        }
      } else {
        // Direct error (not from API interceptor)
        const errorMessage = (error as Error)?.message || 'Login failed. Please try again.'
        console.log('Showing direct error:', errorMessage)
        setErrors({ password: errorMessage })
        notifications.show({
          title: 'Login Failed',
          message: errorMessage,
          color: 'red',
          autoClose: 5000,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      withBorder
      shadow="md"
      p={{ base: 'md', md: 'xl', lg: '32px' }}
      radius="lg"
      miw={{ base: '100%', md: 400 }}
    >
      <Stack gap="lg">
        {/* Header */}
        <Stack align="center" gap="xs">
          <Text
            size="2xl"
            fw="bold"
            ta="center"
          >
            {t('auth.login.title')}
          </Text>
          <Text
            size="md"
            c="dimmed"
            ta="center"
            maw={350}
          >
            {t('auth.login.subtitle')}
          </Text>
        </Stack>

        {/* Form */}
        <Stack gap="md">
          <TextInput
            id="phone_number"
            label={t('auth.login.phoneLabel')}
            placeholder={t('auth.login.phonePlaceholder')}
            required
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.currentTarget.value)
              if (errors.phone) setErrors({ ...errors, phone: undefined })
            }}
            size="md"
            error={errors.phone}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          <PasswordInput
            id="password"
            label={t('auth.login.passwordLabel')}
            placeholder={t('auth.login.passwordPlaceholder')}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value)
              if (errors.password) setErrors({ ...errors, password: undefined })
            }}
            size="md"
            error={errors.password}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          <Checkbox
            id="remember_me"
            label={t('auth.login.rememberMe')}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.currentTarget.checked)}
            size="md"
          />

          <Button
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading}
            mt="sm"
            onClick={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            {loading ? t('auth.login.submittingButton') : t('auth.login.submitButton')}
          </Button>
        </Stack>

        {/* Footer */}
        <Text size="sm" ta="center" c="dimmed">
          {t('auth.login.havingTrouble')}{' '}
          <Text
            component="a"
            href="#"
            c="blue"
            inherit
            style={{ textDecoration: 'underline' }}
          >
            {t('auth.login.contactSupport')}
          </Text>
        </Text>
      </Stack>
    </Paper>
  )
}
