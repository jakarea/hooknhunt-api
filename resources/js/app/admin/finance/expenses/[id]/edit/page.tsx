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
  Breadcrumbs,
  Anchor,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconReceipt,
  IconUpload,
  IconAlertTriangle,
  IconWallet,
} from '@tabler/icons-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import {
  updateExpense,
  getExpense,
  getAccounts,
  getPaymentAccounts,
  type ChartOfAccount,
} from '@/utils/api'

export default function EditExpensePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [expense, setExpense] = useState<any>(null)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    accountId: '',
    paymentAccountId: '',
    expenseDate: new Date(),
    referenceNumber: '',
    notes: '',
    attachment: null as File | null,
    // VAT (Value Added Tax) fields
    vatPercentage: '',
    vatAmount: '',
    vatChallanNo: '',
    // Tax (AIT) fields
    taxPercentage: '',
    taxAmount: '',
    taxChallanNo: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch expense and accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch expense details
        const expenseResponse = await getExpense(parseInt(id || '0'))
        const expenseData = expenseResponse?.data || expenseResponse

        if (expenseData) {
          setExpense(expenseData)

          // Check if already approved
          if (expenseData.is_approved || expenseData.isApproved) {
            notifications.show({
              title: 'Expense Already Approved',
              message: 'This expense has already been approved and posted to the ledger. It cannot be modified.',
              color: 'orange',
            })
          }

          // Set form data - API returns camelCase due to CamelCaseResponse middleware
          setFormData({
            title: expenseData.title || '',
            amount: expenseData.amount?.toString() || '',
            accountId: expenseData.account_id?.toString() || expenseData.accountId?.toString() || '',
            expenseDate: expenseData.expense_date || expenseData.expenseDate
              ? new Date(expenseData.expense_date || expenseData.expenseDate)
              : new Date(),
            referenceNumber: expenseData.reference_number || expenseData.referenceNumber || '',
            notes: expenseData.notes || '',
            attachment: null, // File inputs don't support pre-loading files
            // VAT fields - API returns camelCase
            vatPercentage: expenseData.vatPercentage?.toString() || expenseData.vat_percentage?.toString() || '',
            vatAmount: expenseData.vatAmount?.toString() || expenseData.vat_amount?.toString() || '',
            vatChallanNo: expenseData.vatChallanNo || expenseData.vat_challan_no || '',
            // Tax fields - API returns camelCase
            taxPercentage: expenseData.taxPercentage?.toString() || expenseData.tax_percentage?.toString() || '',
            taxAmount: expenseData.taxAmount?.toString() || expenseData.tax_amount?.toString() || '',
            taxChallanNo: expenseData.taxChallanNo || expenseData.tax_challan_no || '',
          })
        }

        // Fetch accounts
        const accountsResponse = await getAccounts()
        let accountsData: ChartOfAccount[] = []
        if (accountsResponse && typeof accountsResponse === 'object') {
          if ('data' in accountsResponse) {
            const innerData = accountsResponse.data
            if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
              accountsData = innerData.data
            } else if (Array.isArray(innerData)) {
              accountsData = innerData
            }
          } else if (Array.isArray(accountsResponse)) {
            accountsData = accountsResponse
          }
        }

        // Filter only expense accounts
        const expenseAccounts = accountsData.filter((acc) => {
          const accountType = typeof acc.type === 'string' ? acc.type.toLowerCase() : ''
          return accountType === 'expense'
        })

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

          setAccounts(expenseAccounts)
          setPaymentAccounts(paymentAccountsData)
        } catch (paymentError) {
          console.error('Failed to fetch payment accounts:', paymentError)
          // Fallback to filtered chart of accounts
          const assetAccounts = accountsData.filter((acc) => {
            const accountType = typeof acc.type === 'string' ? acc.type.toLowerCase() : ''
            if (accountType !== 'asset') return false

            const name = typeof acc.name === 'string' ? acc.name.toLowerCase() : ''
            const code = typeof acc.code === 'string' ? acc.code.toLowerCase() : ''

            const isLiquidAsset = name.includes('cash') || name.includes('bank') ||
                                  name.includes('bkash') || name.includes('bkash') ||
                                  name.includes('nagad') || name.includes('rocket') ||
                                  code.includes('bkash') || code.includes('bank') ||
                                  code.includes('rocket') || code.includes('cash')

            return isLiquidAsset && acc.isActive !== false
          })

          setAccounts(expenseAccounts)
          setPaymentAccounts(assetAccounts)
        }
      } catch (error: any) {
        console.error('Failed to fetch data:', error)
        notifications.show({
          title: 'Error',
          message: error.response?.data?.message || 'Failed to load expense data',
          color: 'red',
        })
        navigate('/finance/expenses')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, navigate])

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

  // Handle VAT percentage change
  const handleVatPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0
    const amount = parseFloat(formData.amount) || 0
    const vatAmount = (amount * percentage) / 100

    setFormData((prev) => ({
      ...prev,
      vatPercentage: value,
      vatAmount: vatAmount.toFixed(2),
    }))
  }

  // Handle Tax percentage change
  const handleTaxPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = (amount * percentage) / 100

    setFormData((prev) => ({
      ...prev,
      taxPercentage: value,
      taxAmount: taxAmount.toFixed(2),
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Expense account is required'
    }

    if (!formData.expenseDate) {
      newErrors.expenseDate = 'Expense date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fix the errors before submitting',
        color: 'red',
      })
      return
    }

    // Check if expense is already approved
    if (expense?.is_approved || expense?.isApproved) {
      notifications.show({
        title: 'Cannot Modify',
        message: 'This expense has been approved and posted to the ledger. It cannot be modified.',
        color: 'red',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        accountId: parseInt(formData.accountId),
        paymentAccountId: formData.paymentAccountId ? parseInt(formData.paymentAccountId) : null,
        expenseDate: formData.expenseDate instanceof Date
          ? formData.expenseDate.toISOString().split('T')[0]
          : formData.expenseDate,
        referenceNumber: formData.referenceNumber || null,
        notes: formData.notes || null,
      }

      // VAT fields - only include if has a value (use !== '' to check for non-empty)
      if (formData.vatPercentage !== '' && formData.vatPercentage != null) {
        payload.vatPercentage = parseFloat(formData.vatPercentage as string)
      }
      if (formData.vatAmount !== '' && formData.vatAmount != null) {
        payload.vatAmount = parseFloat(formData.vatAmount as string)
      }
      if (formData.vatChallanNo) {
        payload.vatChallanNo = formData.vatChallanNo
      }

      // Tax fields - only include if has a value
      if (formData.taxPercentage !== '' && formData.taxPercentage != null) {
        payload.taxPercentage = parseFloat(formData.taxPercentage as string)
      }
      if (formData.taxAmount !== '' && formData.taxAmount != null) {
        payload.taxAmount = parseFloat(formData.taxAmount as string)
      }
      if (formData.taxChallanNo) {
        payload.taxChallanNo = formData.taxChallanNo
      }

      // Only include attachment if a new file is selected
      if (formData.attachment) {
        // Note: You'll need to implement file upload separately
        // This is a placeholder for the actual file upload logic
        payload.attachment = formData.attachment.name
      }

      await updateExpense(parseInt(id || '0'), payload)

      notifications.show({
        title: 'Success',
        message: 'Expense updated successfully',
        color: 'green',
      })

      navigate('/finance/expenses')
    } catch (error: any) {
      console.error('Failed to update expense:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update expense',
        color: 'red',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width="60%" />
          <Skeleton height={400} />
        </Stack>
      </Box>
    )
  }

  const isApproved = expense?.is_approved || expense?.isApproved

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Stack gap={0}>
            <Breadcrumbs>
              <Anchor component={Link} to="/finance/expenses" size="sm">
                Expenses
              </Anchor>
              <Anchor size="sm">Edit Expense #{id}</Anchor>
            </Breadcrumbs>
            <Title order={2}>Edit Expense #{id}</Title>
          </Stack>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            to="/finance/expenses"
          >
            Back to Expenses
          </Button>
        </Group>

        {/* Warning if already approved */}
        {isApproved && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">
              <strong>Warning:</strong> This expense has been approved and posted to the ledger.
              Modifications are not recommended as they may affect financial reports.
            </Text>
          </Alert>
        )}

        <Paper withBorder p="md" component="form" onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Basic Information */}
            <Stack gap="md">
              <Text className="text-base md:text-lg" fw={500}>Basic Information</Text>

              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <TextInput
                  required
                  label="Title"
                  placeholder="e.g., Office Supplies"
                  description="Enter a descriptive title for the expense"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.currentTarget.value)}
                  error={errors.title}
                />

                <NumberInput
                  required
                  label="Amount"
                  placeholder="0.00"
                  description="Enter the expense amount"
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
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }}>
                <Select
                  required
                  label="Expense Account"
                  placeholder="Select account"
                  description="Choose the expense category/account"
                  data={accounts.map((account) => ({
                    value: account.id.toString(),
                    label: `${account.name} (${account.code})`,
                  }))}
                  value={formData.accountId}
                  onChange={(value) => handleChange('accountId', value || '')}
                  error={errors.accountId}
                  searchable
                  disabled={isApproved}
                />

                <DateInput
                  required
                  label="Expense Date"
                  placeholder="Select date"
                  description="When was this expense incurred?"
                  value={formData.expenseDate}
                  onChange={(value) => {
                    handleChange('expenseDate', value)
                  }}
                  error={errors.expenseDate}
                  maxDate={new Date()}
                  valueFormat="YYYY-MM-DD"
                  clearable
                  allowDeselect
                />
              </SimpleGrid>

              <Select
                label="Payment From"
                placeholder="Select bank or cash account"
                description="Which account will pay for this expense?"
                data={paymentAccounts.map((acc) => ({
                  value: acc.id.toString(),
                  label: `${acc.name} (${acc.code})`,
                }))}
                value={formData.paymentAccountId}
                onChange={(value) => handleChange('paymentAccountId', value || '')}
                searchable
                clearable
                leftSection={<IconWallet size={16} />}
                disabled={isApproved}
              />

              <TextInput
                label="Reference Number"
                placeholder="Optional reference number"
                description="Bill number, receipt number, etc."
                value={formData.referenceNumber}
                onChange={(e) => handleChange('referenceNumber', e.currentTarget.value)}
              />

              <Textarea
                label="Notes"
                placeholder="Additional details about this expense..."
                description="Any additional information or context"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.currentTarget.value)}
                minRows={3}
              />
            </Stack>

            <Divider label="Optional: VAT & Tax" labelPosition="left" />

            {/* VAT & Tax Section */}
            <Stack gap="md">
              <Text className="text-base md:text-lg" fw={500}>VAT & Tax (Optional)</Text>

              <Alert variant="light" color="blue">
                <Text className="text-sm md:text-base">
                  VAT (Value Added Tax) and Tax fields are optional. Only fill these if your expense includes VAT or Tax deductions.
                </Text>
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
                  readOnly={!!formData.vatPercentage}
                />
                <TextInput
                  label="VAT Challan No"
                  placeholder="Optional"
                  description="VAT challan number"
                  value={formData.vatChallanNo}
                  onChange={(e) => handleChange('vatChallanNo', e.currentTarget.value)}
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
                  readOnly={!!formData.taxPercentage}
                />
                <TextInput
                  label="Tax Challan No"
                  placeholder="Optional"
                  description="Tax challan number"
                  value={formData.taxChallanNo}
                  onChange={(e) => handleChange('taxChallanNo', e.currentTarget.value)}
                />
              </SimpleGrid>
            </Stack>

            {/* Form Actions */}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="light"
                type="button"
                onClick={() => navigate('/finance/expenses')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={isSubmitting}
                disabled={isSubmitting || isApproved}
              >
                Update Expense
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
