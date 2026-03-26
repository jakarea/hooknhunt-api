import { useState } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Paper,
  Alert,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconBuildingBank,
  IconCash,
  IconCoin,
} from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { createBank } from '@/utils/api'
import { usePermissions } from '@/hooks/usePermissions'

const getAccountTypes = (t: (key: string) => string) => [
  { value: 'cash', label: t('finance.banksPage.createPage.accountTypes.cash') },
  { value: 'bank', label: t('finance.banksPage.createPage.accountTypes.bank') },
  { value: 'bkash', label: t('finance.banksPage.createPage.accountTypes.bkash') },
  { value: 'nagad', label: t('finance.banksPage.createPage.accountTypes.nagad') },
  { value: 'rocket', label: t('finance.banksPage.createPage.accountTypes.rocket') },
  { value: 'other', label: t('finance.banksPage.createPage.accountTypes.other') },
]

export default function CreateBankPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()

  // Permission check - user needs finance banks create permission
  if (!hasPermission('finance_banks_create')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to create Bank Accounts.</Text>
          <Button
            component={Link}
            to="/finance"
            leftSection={<IconArrowLeft size={16} />}
            mt="md"
          >
            Back to Finance
          </Button>
        </Paper>
      </Stack>
    )
  }
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    accountNumber: '',
    accountName: '',
    branch: '',
    initial_balance: '',
    phone: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('finance.banksPage.createPage.validation.nameRequired')
    }

    if (!formData.type) {
      newErrors.type = t('finance.banksPage.createPage.validation.typeRequired')
    }

    if (formData.account_number && formData.account_number.length < 5) {
      newErrors.account_number = t('finance.banksPage.createPage.validation.accountNumberMinLength')
    }

    if (formData.phone && !/^[0-9+]+$/.test(formData.phone)) {
      newErrors.phone = t('finance.banksPage.createPage.validation.phoneInvalid')
    }

    if (formData.initial_balance && parseFloat(formData.initial_balance) < 0) {
      newErrors.initial_balance = t('finance.banksPage.createPage.validation.initialBalanceNegative')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      notifications.show({
        title: t('finance.banksPage.createPage.notification.validationError'),
        message: t('finance.banksPage.createPage.notification.validationErrorMessage'),
        color: 'red',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Call the real API
      await createBank({
        name: formData.name,
        type: formData.type as any,
        accountNumber: formData.account_number || null,
        accountName: formData.account_name || null,
        branch: formData.branch || null,
        initial_balance: formData.initial_balance ? parseFloat(formData.initial_balance) : null,
        phone: formData.phone || null,
        notes: formData.notes || null,
      })

      notifications.show({
        title: t('finance.banksPage.createPage.notification.success'),
        message: t('finance.banksPage.createPage.notification.successMessage', { name: formData.name }),
        color: 'green',
      })

      // Navigate back to banks list after successful creation
      navigate('/finance/banks')
    } catch (err: any) {
      console.error('Error creating bank:', err)

      // Handle validation errors from API
      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {}
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0]
        })
        setErrors(apiErrors)

        notifications.show({
          title: t('finance.banksPage.createPage.notification.validationError'),
          message: t('finance.banksPage.createPage.notification.validationErrorMessage'),
          color: 'red',
        })
      } else {
        notifications.show({
          title: 'Error',
          message: err.response?.data?.message || err.message || 'Failed to create bank account',
          color: 'red',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getIconForType = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      cash: <IconCash />,
      bank: <IconBuildingBank />,
      bkash: <Text fw={700}>bKash</Text>,
      nagad: <Text fw={700} style={{ fontFamily: 'cursive' }}>Nagad</Text>,
      rocket: <Text fw={700} style={{ fontFamily: 'monospace' }}>Rocket</Text>,
      other: <IconCoin />,
    }
    return icons[type] || icons.other
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }} pos="relative">
      {isSubmitting && <LoadingOverlay visible={isSubmitting} />}
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <div>
              <Title order={1}>{t('finance.banksPage.createPage.title')}</Title>
              <Text c="dimmed">{t('finance.banksPage.createPage.subtitle')}</Text>
            </div>
            <Button
              component={Link}
              to="/finance/banks"
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
              disabled={isSubmitting}
            >
              {t('finance.banksPage.createPage.backToBanks')}
            </Button>
          </Group>
        </Box>

        {/* Form */}
        <Paper withBorder p="xl" radius="md" shadow="sm" component="form" onSubmit={handleSubmit}>
          <Stack>
            <Alert variant="light" color="blue" title={t('finance.banksPage.createPage.accountInformation')} mb="md">
              <Text className="text-sm md:text-base">{t('finance.banksPage.createPage.description')}</Text>
            </Alert>

            <Stack gap="md">
              {/* Account Name */}
              <TextInput
                required
                label={t('finance.banksPage.createPage.accountName')}
                placeholder={t('finance.banksPage.createPage.accountNamePlaceholder')}
                description={t('finance.banksPage.createPage.accountNameDescription')}
                value={formData.name}
                onChange={(e) => handleChange('name', e.currentTarget.value)}
                error={errors.name}
                leftSection={<IconBuildingBank size={16} />}
                disabled={isSubmitting}
              />

              {/* Account Type */}
              <Select
                required
                label={t('finance.banksPage.createPage.accountType')}
                placeholder={t('finance.banksPage.createPage.accountTypePlaceholder')}
                data={getAccountTypes(t)}
                value={formData.type}
                onChange={(value) => handleChange('type', value || '')}
                error={errors.type}
                searchable
                disabled={isSubmitting}
              />

              {/* Account Number */}
              <TextInput
                label={t('finance.banksPage.createPage.accountNumber')}
                placeholder={t('finance.banksPage.createPage.accountNumberPlaceholder')}
                description={t('finance.banksPage.createPage.accountNumberDescription')}
                value={formData.account_number}
                onChange={(e) => handleChange('account_number', e.currentTarget.value)}
                error={errors.account_number}
                leftSection={<IconDeviceFloppy size={16} />}
                disabled={isSubmitting}
              />

              {/* Account Holder Name */}
              <TextInput
                label={t('finance.banksPage.createPage.accountHolder')}
                placeholder={t('finance.banksPage.createPage.accountHolderPlaceholder')}
                value={formData.account_name}
                onChange={(e) => handleChange('account_name', e.currentTarget.value)}
                description={t('finance.banksPage.createPage.accountHolderDescription')}
                disabled={isSubmitting}
              />

              {/* Branch */}
              <TextInput
                label={t('finance.banksPage.createPage.branch')}
                placeholder={t('finance.banksPage.createPage.branchPlaceholder')}
                value={formData.branch}
                onChange={(e) => handleChange('branch', e.currentTarget.value)}
                description={t('finance.banksPage.createPage.branchDescription')}
                disabled={isSubmitting}
              />

              {/* Initial Balance */}
              <NumberInput
                label={t('finance.banksPage.createPage.initialBalance')}
                placeholder="0.00"
                description={t('finance.banksPage.createPage.initialBalanceDescription')}
                value={formData.initial_balance}
                onChange={(value) => handleChange('initial_balance', value || '')}
                error={errors.initial_balance}
                min={0}
                precision={2}
                thousandSeparator=","
                prefix="৳"
                hideControls
                disabled={isSubmitting}
              />

              {/* Phone Number */}
              <TextInput
                label={t('finance.banksPage.createPage.phoneNumber')}
                placeholder={t('finance.banksPage.createPage.phonePlaceholder')}
                description={t('finance.banksPage.createPage.phoneDescription')}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.currentTarget.value)}
                error={errors.phone}
                leftSection={<Text className="text-sm md:text-base">+88</Text>}
                disabled={isSubmitting}
              />

              {/* Notes */}
              <Textarea
                label={t('finance.banksPage.createPage.notes')}
                placeholder={t('finance.banksPage.createPage.notesPlaceholder')}
                description={t('finance.banksPage.createPage.notesDescription')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.currentTarget.value)}
                minRows={3}
                maxRows={6}
                disabled={isSubmitting}
              />
            </Stack>

            {/* Account Type Preview */}
            {formData.type && (
              <Alert variant="light" color="grape">
                <Group gap="sm">
                  {getIconForType(formData.type)}
                  <Text className="text-sm md:text-base">
                    <Text span fw={600}>{t('finance.banksPage.createPage.accountTypePreview')}:</Text> {formData.type.toUpperCase()}
                  </Text>
                </Group>
              </Alert>
            )}

            {/* Form Actions */}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="light"
                onClick={() => navigate('/finance/banks')}
                disabled={isSubmitting}
              >
                {t('finance.banksPage.createPage.cancel')}
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {t('finance.banksPage.createPage.createAccount')}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
