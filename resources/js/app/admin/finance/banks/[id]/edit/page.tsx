import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Paper,
  Alert,
  LoadingOverlay,
  Badge,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconBuildingBank,
  IconCash,
  IconCoin,
  IconLock,
  IconBrandCashapp,
  IconPhone,
  IconRocket,
  IconWallet,
} from '@tabler/icons-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { getBank, updateBank, type BankAccount } from '@/utils/api'
import { usePermissions } from '@/hooks/usePermissions'

const getAccountTypes = (t: (key: string) => string) => [
  { value: 'cash', label: t('finance.banksPage.createPage.accountTypes.cash') },
  { value: 'bank', label: t('finance.banksPage.createPage.accountTypes.bank') },
  { value: 'bkash', label: t('finance.banksPage.createPage.accountTypes.bkash') },
  { value: 'nagad', label: t('finance.banksPage.createPage.accountTypes.nagad') },
  { value: 'rocket', label: t('finance.banksPage.createPage.accountTypes.rocket') },
  { value: 'other', label: t('finance.banksPage.createPage.accountTypes.other') },
]

export default function EditBankPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = usePermissions()

  // Permission check
  if (!hasPermission('finance.banks.edit')) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" shadow="sm" ta="center">
          <Stack gap="md">
            <IconLock size={48} style={{ opacity: 0.5 }} />
            <Title order={3}>Access Denied</Title>
            <Text c="dimmed">You don't have permission to edit bank accounts.</Text>
            <Button component={Link} to="/finance/banks">Back to Banks</Button>
          </Stack>
        </Paper>
      </Box>
    )
  }
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    account_number: '',
    account_name: '',
    branch: '',
    phone: '',
    notes: '',
    status: 'active',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bank, setBank] = useState<BankAccount | null>(null)
  const [hasTransactions, setHasTransactions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch bank data on mount
  useEffect(() => {
    const fetchBankData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)
        const response = await getBank(parseInt(id))
        const bankData = response.data as BankAccount & { transactions_count?: number }


        setBank(bankData)
        setHasTransactions((bankData.transactions_count || 0) > 0)

        // Pre-fill form
        setFormData({
          name: bankData.name || '',
          type: bankData.type || '',
          account_number: bankData.accountNumber || '',
          account_name: bankData.accountName || '',
          branch: bankData.branch || '',
          phone: bankData.phone || '',
          notes: bankData.notes || '',
          status: bankData.status || 'active',
        })
      } catch (err: any) {
        console.error('Error fetching bank:', err)
        setError(err.message || 'Failed to load bank details')
        notifications.show({
          title: 'Error',
          message: err.message || 'Failed to load bank details',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBankData()
  }, [id])

  const handleChange = (field: string, value: string | boolean) => {
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
      // Convert empty strings to null for nullable fields
      const cleanData = {
        name: formData.name,
        type: formData.type as any,
        account_number: formData.account_number || null,
        account_name: formData.account_name || null,
        branch: formData.branch || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
        is_active: formData.status === 'active',
      }

      // Debug logging - before

      const response = await updateBank(parseInt(id!), cleanData)

      notifications.show({
        title: 'Success',
        message: 'Bank account updated successfully',
        color: 'green',
      })

      // Redirect to bank details page
      navigate('/finance/banks/' + id)
    } catch (err: any) {
      console.error('Error updating bank:', err)

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
          message: err.response?.data?.message || err.message || 'Failed to update bank account',
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

  const getTypeConfig = (tFunction: (key: string) => string, type: string) => ({
    cash: { icon: <IconWallet size={24} />, color: 'green', label: 'Cash' },
    bank: { icon: <IconBuildingBank size={24} />, color: 'blue', label: 'Bank' },
    bkash: { icon: <IconPhone size={24} />, color: 'pink', label: 'bKash' },
    nagad: { icon: <IconBrandCashapp size={24} />, color: 'orange', label: 'Nagad' },
    rocket: { icon: <IconRocket size={24} />, color: 'grape', label: 'Rocket' },
    other: { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' },
  })[type] || { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }} pos="relative">
        <Paper withBorder p="xl" radius="md" shadow="sm">
          <LoadingOverlay visible={loading} />
          <div style={{ height: '400px' }} />
        </Paper>
      </Box>
    )
  }

  if (error && !bank) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" shadow="sm" ta="center">
          <Text c="red">{error}</Text>
          <Button onClick={() => navigate('/finance/banks')} mt="md">Back to Banks</Button>
        </Paper>
      </Box>
    )
  }

  const config = getTypeConfig(t, formData.type)

  return (
    <Box p={{ base: 'md', md: 'xl' }} pos="relative">
      {isSubmitting && <LoadingOverlay visible={isSubmitting} />}
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <div>
              <Title order={1}>Edit Bank Account</Title>
              <Text c="dimmed">Update bank account information</Text>
            </div>
            <Button
              component={Link}
              to={"/finance/banks/" + id}
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
              disabled={isSubmitting}
            >
              Back to Bank Details
            </Button>
          </Group>
        </Box>

        {/* Warning if account has transactions */}
        {hasTransactions && (
          <Alert variant="light" color="yellow" title="Account has transactions">
            <Text className="text-sm md:text-base">
              This account has existing transactions. Some fields may be restricted to maintain data integrity.
            </Text>
          </Alert>
        )}

        {/* Form */}
        <Paper withBorder p="xl" radius="md" shadow="sm" component="form" onSubmit={handleSubmit}>
          <Stack>
            <Alert variant="light" color="blue" title="Account Information">
              <Text className="text-sm md:text-base">Edit the bank account details below. Fields marked with * are required.</Text>
            </Alert>

            <Stack gap="md">
              {/* Account Name */}
              <TextInput
                required
                label="Account Name"
                placeholder="Enter account name"
                description="The name of this bank account"
                value={formData.name}
                onChange={(e) => handleChange('name', e.currentTarget.value)}
                error={errors.name}
                leftSection={<IconBuildingBank size={16} />}
                disabled={isSubmitting}
              />

              {/* Account Type */}
              <Select
                required
                label="Account Type"
                placeholder="Select account type"
                data={getAccountTypes(t)}
                value={formData.type}
                onChange={(value) => handleChange('type', value || '')}
                error={errors.type}
                searchable
                disabled={isSubmitting || hasTransactions}
                description={hasTransactions ? 'Account type cannot be changed when transactions exist' : undefined}
                rightSection={hasTransactions ? <IconLock size={14} /> : undefined}
              />

              {/* Account Number */}
              <TextInput
                label="Account Number"
                placeholder="Enter account number"
                description="Bank account or mobile number"
                value={formData.account_number}
                onChange={(e) => handleChange('account_number', e.currentTarget.value)}
                error={errors.account_number}
                leftSection={<IconDeviceFloppy size={16} />}
                disabled={isSubmitting}
              />

              {/* Account Holder Name */}
              <TextInput
                label="Account Holder Name"
                placeholder="Enter account holder name"
                value={formData.account_name}
                onChange={(e) => handleChange('account_name', e.currentTarget.value)}
                description="Name of the account holder"
                disabled={isSubmitting}
              />

              {/* Branch */}
              <TextInput
                label="Branch"
                placeholder="Enter branch name"
                value={formData.branch}
                onChange={(e) => handleChange('branch', e.currentTarget.value)}
                description="Bank branch name (if applicable)"
                disabled={isSubmitting}
              />

              {/* Phone Number */}
              <TextInput
                label="Phone Number"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.currentTarget.value)}
                error={errors.phone}
                leftSection={<Text className="text-sm md:text-base">+88</Text>}
                disabled={isSubmitting}
              />

              {/* Notes */}
              <Textarea
                label="Notes"
                placeholder="Enter any additional notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.currentTarget.value)}
                minRows={3}
                maxRows={6}
                disabled={isSubmitting}
              />

              {/* Status */}
              <Select
                label="Status"
                placeholder="Select status"
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={formData.status}
                onChange={(value) => handleChange('status', value || 'active')}
                disabled={isSubmitting}
                description="Inactive accounts won't appear in dropdowns"
              />
            </Stack>

            {/* Account Type Preview */}
            {formData.type && (
              <Alert variant="light" color="grape">
                <Group gap="sm">
                  {getIconForType(formData.type)}
                  <Text className="text-sm md:text-base">
                    <Text span fw={600}>Account Type:</Text> {formData.type.toUpperCase()}
                  </Text>
                </Group>
              </Alert>
            )}

            {/* Balance Info (Read-only) */}
            {bank && (
              <Alert variant="light" color="blue">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text className="text-sm md:text-base">Current Balance:</Text>
                    <Text className="text-sm md:text-base" fw={600}>৳{(bank.currentBalance || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>
                  <Text className="text-xs md:text-sm" c="dimmed">
                    Balance cannot be edited directly. Use Deposit/Withdraw options to change the balance.
                  </Text>
                </Stack>
              </Alert>
            )}

            {/* Audit Info */}
            {bank && (bank.created_at || bank.updated_at) && (
              <Text className="text-xs md:text-sm" c="dimmed">
                Last updated: {bank.updated_at ? new Date(bank.updated_at).toLocaleString() : 'N/A'}
              </Text>
            )}

            {/* Form Actions */}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="light"
                onClick={() => navigate('/finance/banks/' + id)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Update Bank Account
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
