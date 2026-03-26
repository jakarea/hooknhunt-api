'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Paper,
  Alert,
  FileInput,
  Divider,
  Skeleton,
  SimpleGrid,
  Button,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconReceipt,
  IconUpload,
  IconInfoCircle,
  IconWallet,
} from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import {
  createExpense,
  getAccounts,
  getUsers,
  getPaymentAccounts,
  type ChartOfAccount,
  type User,
  type BankAccount,
} from '@/utils/api'

export default function CreateExpensePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<(ChartOfAccount | BankAccount)[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    accountId: '',
    paymentAccountId: '',
    expenseDate: new Date(),
    referenceNumber: '',
    paidById: '',
    notes: '',
    attachment: null as File | null,
    // VAT (Value Added Tax) fields - optional
    vatPercentage: '',
    vatAmount: '',
    vatChallanNo: '',
    // Tax (AIT) fields - optional
    taxPercentage: '',
    taxAmount: '',
    taxChallanNo: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch accounts and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch accounts
        const accountsResponse = await getAccounts()

        console.log('DEBUG: Raw accountsResponse:', accountsResponse)

        let accountsData: ChartOfAccount[] = []
        if (accountsResponse && typeof accountsResponse === 'object') {
          if ('data' in accountsResponse) {
            const innerData = accountsResponse.data
            console.log('DEBUG: innerData:', innerData)
            if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
              accountsData = innerData.data
            } else if (Array.isArray(innerData)) {
              accountsData = innerData
            }
          } else if (Array.isArray(accountsResponse)) {
            accountsData = accountsResponse
          }
        }

        console.log('DEBUG: accountsData count:', accountsData.length)
        console.log('DEBUG: First 3 accounts:', accountsData.slice(0, 3))

        // Filter only expense accounts (case-insensitive)
        const expenseAccounts = accountsData.filter((acc) => {
          const accountType = typeof acc.type === 'string' ? acc.type.toLowerCase() : ''
          return accountType === 'expense'
        })
        console.log('DEBUG: expenseAccounts count:', expenseAccounts.length)
        setAccounts(expenseAccounts)

        // Fetch payment accounts (bank accounts linked to chart of accounts)
        try {
          const paymentAccountsResponse = await getPaymentAccounts()
          let paymentAccountsData: any[] = []

          if (paymentAccountsResponse && typeof paymentAccountsResponse === 'object') {
            if (Array.isArray(paymentAccountsResponse)) {
              paymentAccountsData = paymentAccountsResponse
            } else if ('data' in paymentAccountsResponse) {
              if (Array.isArray(paymentAccountsResponse.data)) {
                paymentAccountsData = paymentAccountsResponse.data
              } else if (typeof paymentAccountsResponse.data === 'object' && 'data' in paymentAccountsResponse.data && Array.isArray(paymentAccountsResponse.data.data)) {
                paymentAccountsData = paymentAccountsResponse.data.data
              }
            }
          }

          console.log('DEBUG: paymentAccounts count:', paymentAccountsData.length)
          setPaymentAccounts(paymentAccountsData)
        } catch (paymentError) {
          console.error('Failed to fetch payment accounts:', paymentError)
          // Fallback to filtered chart of accounts
          const fallbackAccounts = accountsData.filter((acc) => {
            const accountType = typeof acc.type === 'string' ? acc.type.toLowerCase() : ''
            const name = typeof acc.name === 'string' ? acc.name.toLowerCase() : ''
            const code = typeof acc.code === 'string' ? acc.code.toLowerCase() : ''

            if (accountType !== 'asset') return false

            // Only include liquid assets (cash, bank, mobile banking)
            const isLiquidAsset = name.includes('cash') || name.includes('bank') ||
                                  name.includes('bkash') || name.includes('bKash') ||
                                  name.includes('nagad') || name.includes('rocket') ||
                                  code.includes('bkash') || code.includes('bank') ||
                                  code.includes('rocket') || code.includes('cash')

            return isLiquidAsset && acc.isActive !== false
          })
          setPaymentAccounts(fallbackAccounts)
        }

        // Fetch users
        const usersResponse = await getUsers()

        let usersData: User[] = []
        if (usersResponse && typeof usersResponse === 'object') {
          if ('data' in usersResponse) {
            const innerData = usersResponse.data
            if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
              usersData = innerData.data
            } else if (Array.isArray(innerData)) {
              usersData = innerData
            }
          } else if (Array.isArray(usersResponse)) {
            usersData = usersResponse
          }
        }
        setUsers(usersData)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        notifications.show({
          title: t('common.error'),
          message: t('common.somethingWentWrong'),
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  const handleChange = (field: string, value: any) => {
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

  // Auto-calculate VAT amount when percentage changes
  const handleVatPercentageChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vatPercentage: value }))
    if (value && formData.amount) {
      const amount = parseFloat(formData.amount as string)
      const percentage = parseFloat(value)
      if (!isNaN(amount) && !isNaN(percentage)) {
        const vatAmount = (amount * percentage) / 100
        setFormData((prev) => ({ ...prev, vatPercentage: value, vatAmount: vatAmount.toString() }))
      }
    } else {
      setFormData((prev) => ({ ...prev, vatPercentage: value, vatAmount: '' }))
    }
  }

  // Auto-calculate Tax amount when percentage changes
  const handleTaxPercentageChange = (value: string) => {
    setFormData((prev) => ({ ...prev, taxPercentage: value }))
    if (value && formData.amount) {
      const amount = parseFloat(formData.amount as string)
      const percentage = parseFloat(value)
      if (!isNaN(amount) && !isNaN(percentage)) {
        const taxAmount = (amount * percentage) / 100
        setFormData((prev) => ({ ...prev, taxPercentage: value, taxAmount: taxAmount.toString() }))
      }
    } else {
      setFormData((prev) => ({ ...prev, taxPercentage: value, taxAmount: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('finance.banksPage.expensesCreatePage.validation.titleRequired')
    }

    if (!formData.amount || parseFloat(formData.amount as string) <= 0) {
      newErrors.amount = t('finance.banksPage.expensesCreatePage.validation.amountRequired')
    }

    if (!formData.accountId) {
      newErrors.accountId = t('finance.banksPage.expensesCreatePage.validation.accountRequired')
    }

    if (!formData.expenseDate) {
      newErrors.expenseDate = t('finance.banksPage.expensesCreatePage.validation.dateRequired')
    }

    if (formData.attachment) {
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (formData.attachment.size > maxSize) {
        newErrors.attachment = t('finance.banksPage.expensesCreatePage.validation.fileSize')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      notifications.show({
        title: t('finance.banksPage.expensesCreatePage.notification.validationError'),
        message: t('finance.banksPage.expensesCreatePage.notification.validationErrorMessage'),
        color: 'red',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Format date safely
      let formattedDate = new Date().toISOString().split('T')[0]
      if (formData.expenseDate) {
        if (formData.expenseDate instanceof Date) {
          formattedDate = formData.expenseDate.toISOString().split('T')[0]
        } else if (typeof formData.expenseDate === 'string') {
          formattedDate = formData.expenseDate
        }
      }

      const payload = {
        title: formData.title,
        amount: parseFloat(formData.amount as string),
        accountId: parseInt(formData.accountId),
        paymentAccountId: formData.paymentAccountId ? parseInt(formData.paymentAccountId) : null,
        expenseDate: formattedDate,
        referenceNumber: formData.referenceNumber || undefined,
        paidById: formData.paidById ? parseInt(formData.paidById) : undefined,
        notes: formData.notes || undefined,
        attachment: formData.attachment || undefined,
        // VAT fields (optional)
        vatPercentage: formData.vatPercentage ? parseFloat(formData.vatPercentage as string) : undefined,
        vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount as string) : undefined,
        vatChallanNo: formData.vatChallanNo || undefined,
        // Tax fields (optional)
        taxPercentage: formData.taxPercentage ? parseFloat(formData.taxPercentage as string) : undefined,
        taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount as string) : undefined,
        taxChallanNo: formData.taxChallanNo || undefined,
      }

      await createExpense(payload)

      notifications.show({
        title: t('finance.banksPage.expensesCreatePage.notification.success'),
        message: t('finance.banksPage.expensesCreatePage.notification.successMessage', { title: formData.title }),
        color: 'green',
      })

      navigate('/finance/expenses')
    } catch (error) {
      console.error('Failed to create expense:', error)
      notifications.show({
        title: t('common.error'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Skeleton height={40} width="100%" />
          <Skeleton height={500} radius="md" />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <div>
              <Title order={1}>{t('finance.banksPage.expensesCreatePage.title')}</Title>
              <Text c="dimmed">{t('finance.banksPage.expensesCreatePage.subtitle')}</Text>
            </div>
            <Button
              component={Link}
              to="/finance/expenses"
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
            >
              {t('finance.banksPage.expensesCreatePage.backToExpenses')}
            </Button>
          </Group>
        </Box>

        {/* Form */}
        <Paper withBorder p="xl" radius="md" shadow="sm" component="form" onSubmit={handleSubmit}>
          <Stack>
            <Alert variant="light" color="blue" title={t('finance.banksPage.expensesCreatePage.expenseInformation')} mb="md">
              <Text className="text-sm md:text-base">{t('finance.banksPage.expensesCreatePage.description')}</Text>
            </Alert>

            <Stack gap="md">
              {/* Expense Title */}
              <TextInput
                required
                label={t('finance.banksPage.expensesCreatePage.expenseTitle')}
                placeholder={t('finance.banksPage.expensesCreatePage.expenseTitlePlaceholder')}
                description={t('finance.banksPage.expensesCreatePage.expenseTitleDescription')}
                value={formData.title}
                onChange={(e) => handleChange('title', e.currentTarget.value)}
                error={errors.title}
                leftSection={<IconReceipt size={16} />}
              />

              {/* Amount */}
              <NumberInput
                required
                label={t('finance.banksPage.expensesCreatePage.amount')}
                placeholder={t('finance.banksPage.expensesCreatePage.amountPlaceholder')}
                description={t('finance.banksPage.expensesCreatePage.amountDescription')}
                value={formData.amount}
                onChange={(value) => handleChange('amount', value || '')}
                error={errors.amount}
                min={0.01}
                precision={2}
                thousandSeparator=","
                prefix="৳"
                hideControls
                leftSection={<Text className="text-sm md:text-base">৳</Text>}
              />

              {/* Expense Account */}
              <Select
                required
                label={t('finance.banksPage.expensesCreatePage.expenseAccount')}
                placeholder={t('finance.banksPage.expensesCreatePage.selectAccount')}
                description={t('finance.banksPage.expensesCreatePage.expenseAccountDescription')}
                data={accounts.map((account) => ({
                  value: account.id.toString(),
                  label: `${account.name} (${account.code})`,
                }))}
                value={formData.accountId}
                onChange={(value) => handleChange('accountId', value || '')}
                error={errors.accountId}
                searchable
              />

              {/* Payroll Warning */}
              {formData.accountId && accounts.find((acc) => acc.id === parseInt(formData.accountId as string))?.name.toLowerCase().includes('salaries') && (
                <Alert variant="light" color="yellow" title={t('finance.banksPage.expensesCreatePage.payrollWarning.title')}>
                  <Stack gap="xs">
                    <Text className="text-sm md:text-base">
                      <strong>{t('finance.banksPage.expensesCreatePage.payrollWarning.note')}</strong> {t('finance.banksPage.expensesCreatePage.payrollWarning.noteText')}{' '}
                      <Text span fw={600} c="blue">{t('finance.banksPage.expensesCreatePage.payrollWarning.hrmModule')}</Text> {t('finance.banksPage.expensesCreatePage.payrollWarning.moduleText')}
                    </Text>
                    <Text className="text-sm md:text-base">
                      {t('finance.banksPage.expensesCreatePage.payrollWarning.accountUsage')}
                    </Text>
                    <Text className="text-sm md:text-base" ml="sm">• {t('finance.banksPage.expensesCreatePage.payrollWarning.contractWorkers')}</Text>
                    <Text className="text-sm md:text-base" ml="sm">• {t('finance.banksPage.expensesCreatePage.payrollWarning.oneTimeBonuses')}</Text>
                    <Text className="text-sm md:text-base" ml="sm">• {t('finance.banksPage.expensesCreatePage.payrollWarning.adjustments')}</Text>
                    <Text className="text-sm md:text-base" ml="sm">• {t('finance.banksPage.expensesCreatePage.payrollWarning.taxPayments')}</Text>
                    <Divider />
                    <Text className="text-xs md:text-sm" c="dimmed">
                      {t('finance.banksPage.expensesCreatePage.payrollWarning.noteText2')}
                    </Text>
                  </Stack>
                </Alert>
              )}

              {/* Expense Date */}
              <DateInput
                required
                label={t('finance.banksPage.expensesCreatePage.expenseDate')}
                placeholder={t('finance.banksPage.expensesCreatePage.selectDate')}
                description={t('finance.banksPage.expensesCreatePage.expenseDateDescription')}
                value={formData.expenseDate}
                onChange={(value) => {
                  handleChange('expenseDate', value)
                }}
                error={errors.expenseDate}
                maxDate={new Date()}
                // clearable temporarily removed for debugging
              />

              {/* Payment From (Bank/Cash Account) */}
              <Select
                label="Payment From"
                placeholder="Select bank or cash account"
                description="Which account will pay for this expense?"
                data={paymentAccounts.map((acc) => ({
                  value: acc.id.toString(),
                  // Handle both BankAccount (has accountNumber) and ChartOfAccount (has code)
                  label: acc.code
                    ? `${acc.name} (${acc.code})`
                    : acc.accountNumber
                      ? `${acc.name} - ${acc.accountNumber}`
                      : acc.name,
                }))}
                value={formData.paymentAccountId}
                onChange={(value) => {
                  handleChange('paymentAccountId', value || '')
                }}
                searchable
                clearable
                leftSection={<IconWallet size={16} />}
              />

              {/* Reference Number */}
              <TextInput
                label={t('finance.banksPage.expensesCreatePage.referenceNumber')}
                placeholder={t('finance.banksPage.expensesCreatePage.referenceNumberPlaceholder')}
                description={t('finance.banksPage.expensesCreatePage.referenceNumberDescription')}
                value={formData.referenceNumber}
                onChange={(e) => handleChange('referenceNumber', e.currentTarget.value)}
              />

              {/* Paid By */}
              <Select
                label={t('finance.banksPage.expensesCreatePage.paidBy')}
                placeholder={t('finance.banksPage.expensesCreatePage.selectPerson')}
                description={t('finance.banksPage.expensesCreatePage.paidByDescription')}
                data={users.map((person) => ({
                  value: person.id.toString(),
                  label: person.name,
                }))}
                value={formData.paidById}
                onChange={(value) => {
                  handleChange('paidById', value || '')
                }}
                searchable
                // clearable temporarily removed for debugging
              />

              {/* Attachment */}
              <FileInput
                label={t('finance.banksPage.expensesCreatePage.attachment')}
                placeholder={t('finance.banksPage.expensesCreatePage.attachmentPlaceholder')}
                description={t('finance.banksPage.expensesCreatePage.attachmentDescription')}
                value={formData.attachment}
                onChange={(value) => handleChange('attachment', value)}
                error={errors.attachment}
                accept="image/*,.pdf"
                leftSection={<IconUpload size={16} />}
                // clearable temporarily removed for debugging
              />

              {/* Notes */}
              <Textarea
                label={t('finance.banksPage.expensesCreatePage.notes')}
                placeholder={t('finance.banksPage.expensesCreatePage.notesPlaceholder')}
                description={t('finance.banksPage.expensesCreatePage.notesDescription')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.currentTarget.value)}
                minRows={3}
                maxRows={6}
              />

              {/* VAT & Tax Section (Optional) */}
              <Divider label="VAT & Tax (Optional)" labelPosition="left" />

              <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">VAT (Value Added Tax) and Tax fields are optional. Only fill these if your expense includes VAT or Tax deductions.</Text>
              </Alert>

              {/* VAT Fields */}
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <NumberInput
                  label="VAT %"
                  placeholder="e.g., 15"
                  description="VAT percentage (if applicable)"
                  value={formData.vatPercentage}
                  onChange={(value) => handleVatPercentageChange(value as string)}
                  decimalScale={2}
                  min={0}
                  max={100}
                  leftSection={<Text size="sm">%</Text>}
                />
                <NumberInput
                  label="VAT Amount"
                  placeholder="Auto-calculated"
                  description="VAT amount in Taka"
                  value={formData.vatAmount}
                  onChange={(value) => handleChange('vatAmount', value)}
                  decimalScale={2}
                  min={0}
                  precision={2}
                  thousandSeparator=","
                  prefix="৳"
                  hideControls
                  leftSection={<Text size="sm">৳</Text>}
                  readOnly={!!formData.vatPercentage}
                />
                <TextInput
                  label="VAT Challan No"
                  placeholder="Optional"
                  description="VAT challan number"
                  value={formData.vatChallanNo}
                  onChange={(e) => handleChange('vatChallanNo', e.currentTarget.value)}
                  // clearable temporarily removed for debugging
                />
              </SimpleGrid>

              {/* Tax Fields */}
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <NumberInput
                  label="Tax % (AIT)"
                  placeholder="e.g., 3"
                  description="Tax/AIT percentage (if applicable)"
                  value={formData.taxPercentage}
                  onChange={(value) => handleTaxPercentageChange(value as string)}
                  decimalScale={2}
                  min={0}
                  max={100}
                  leftSection={<Text size="sm">%</Text>}
                />
                <NumberInput
                  label="Tax Amount"
                  placeholder="Auto-calculated"
                  description="Tax amount in Taka"
                  value={formData.taxAmount}
                  onChange={(value) => handleChange('taxAmount', value)}
                  decimalScale={2}
                  min={0}
                  precision={2}
                  thousandSeparator=","
                  prefix="৳"
                  hideControls
                  leftSection={<Text size="sm">৳</Text>}
                  readOnly={!!formData.taxPercentage}
                />
                <TextInput
                  label="Tax Challan No"
                  placeholder="Optional"
                  description="Tax challan number"
                  value={formData.taxChallanNo}
                  onChange={(e) => handleChange('taxChallanNo', e.currentTarget.value)}
                  // clearable temporarily removed for debugging
                />
              </SimpleGrid>
            </Stack>

            {/* Form Actions */}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="light"
                onClick={() => navigate('/finance/expenses')}
                disabled={isSubmitting}
              >
                {t('finance.banksPage.expensesCreatePage.cancel')}
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {t('finance.banksPage.expensesCreatePage.createExpense')}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
