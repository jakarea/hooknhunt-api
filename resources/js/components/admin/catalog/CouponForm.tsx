'use client'

import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Button,
  TextInput,
  NumberInput,
  Select,
  Switch,
  MultiSelect,
  Divider,
  Skeleton,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { useDebouncedValue } from '@mantine/hooks'
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconDiscount,
  IconTrash,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { api } from '@/lib/api'
import { useCouponFormStore } from '@/stores/couponFormStore'
import { useSessionWarning } from '@/hooks/useSessionWarning'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CouponFormProps {
  mode?: 'create' | 'edit'
}

// ---------------------------------------------------------------------------
// Searchable Multi-Select Component
// ---------------------------------------------------------------------------
interface SearchableMultiSelectProps {
  label: string
  description: string
  placeholder: string
  value: number[] | null
  onChange: (value: number[] | null) => void
  searchFn: (query: string) => Promise<{ id: number; title: string }[]>
  fetchByIdFn: (id: number) => Promise<{ id: number; title: string } | null>
  error?: string
}

function SearchableMultiSelect({
  label,
  description,
  placeholder,
  value,
  onChange,
  searchFn,
  fetchByIdFn,
  error,
}: SearchableMultiSelectProps) {
  const { t } = useTranslation()
  const [search, setSearch] = React.useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)
  const [data, setData] = React.useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = React.useState(false)

  // Fetch data when search changes
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setData([])
      return
    }

    setLoading(true)
    searchFn(debouncedSearch)
      .then((results) => {
        setData(results.map((item) => ({ value: String(item.id), label: item.title })))
      })
      .catch(() => {
        setData([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [debouncedSearch, searchFn])

  // Load selected items' labels
  useEffect(() => {
    if (!value || value.length === 0) return

    // Fetch full details for selected IDs to get their titles
    Promise.all(
      value.map((id) =>
        fetchByIdFn(id)
          .then((item) => ({ value: String(id), label: item?.title || `ID: ${id}` }))
          .catch(() => ({ value: String(id), label: `ID: ${id}` }))
      )
    ).then((selectedItems) => {
      // Merge with search results to avoid duplicates
      const existing = new Set(data.map((d) => d.value))
      const newItems = selectedItems.filter((item) => !existing.has(item.value))
      setData((prev) => [...prev, ...newItems])
    })
  }, [value, fetchByIdFn])

  const handleChange = (selectedValues: string[]) => {
    const ids = selectedValues.map((v) => Number(v))
    onChange(ids.length > 0 ? ids : null)
  }

  return (
    <MultiSelect
      label={label}
      description={description}
      placeholder={placeholder}
      searchValue={search}
      onSearchChange={setSearch}
      data={data}
      value={value?.map(String) ?? []}
      onChange={handleChange}
      searchable
      clearable
      nothingFoundMessage={loading ? t('coupons.search.searching') : (search.length < 2 ? t('coupons.search.typeToSearch') : t('coupons.search.noResults'))}
      error={error}
    />
  )
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------
const searchProducts = async (query: string) => {
  const response = await api.get(`/catalog/products?search=${query}&per_page=20`)
  const products = response.data.data?.data || response.data.data || []
  return products.map((p: any) => ({ id: p.id, title: p.name || `Product #${p.id}` }))
}

const fetchProductById = async (id: number) => {
  // Use search to find product by ID since routes use slug
  const response = await api.get(`/catalog/products?per_page=100`)
  const products = response.data.data?.data || response.data.data || []
  const product = products.find((p: any) => p.id === id)
  return product ? { id: product.id, title: product.name || `Product #${product.id}` } : null
}

const searchCategories = async (query: string) => {
  const response = await api.get(`/catalog/categories?search=${query}&per_page=50`)
  const categories = response.data.data?.categories || response.data.data || []
  return categories.map((c: any) => ({ id: c.id, title: c.name || `Category #${c.id}` }))
}

const fetchCategoryById = async (id: number) => {
  // Use search to find category by ID since routes use slug for show
  const response = await api.get(`/catalog/categories?per_page=100`)
  const categories = response.data.data?.categories || response.data.data || []
  const category = categories.find((c: any) => c.id === id)
  return category ? { id: category.id, title: category.name || `Category #${category.id}` } : null
}

const searchCustomers = async (query: string) => {
  const response = await api.get(`/system/users?type=customer&search=${query}&per_page=50`)
  const customers = response.data.data?.data || response.data.data || []
  return customers.map((c: any) => ({ id: c.id, title: c.name || `Customer #${c.id}` }))
}

const fetchCustomerById = async (id: number) => {
  // Use system users endpoint with customer type
  const response = await api.get(`/system/users/${id}`)
  const customer = response.data.data || response.data
  return customer ? { id: customer.id, title: customer.name || `Customer #${customer.id}` } : null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CouponForm({ mode = 'create' }: CouponFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  // Session warning
  useSessionWarning({
    enabled: true,
    sessionDurationMinutes: 60,
  })

  // Store
  const {
    formData,
    loading,
    submitting,
    errors,
    originalCoupon,
    setMode,
    setCouponId,
    setField,
    clearError,
    setErrors,
    loadCoupon,
    submitForm,
    deleteCoupon,
  } = useCouponFormStore()

  // Translate validation errors
  const translatedErrors: Record<string, string | undefined> = {}
  Object.keys(errors).forEach(key => {
    const value = errors[key]
    if (value.startsWith('validation.')) {
      translatedErrors[key] = t('coupons.' + value)
    } else {
      translatedErrors[key] = value
    }
  })

  // Initialize mode and load data
  useEffect(() => {
    setMode(mode)
    if (mode === 'edit' && id) {
      setCouponId(Number(id))
      loadCoupon(Number(id)).catch((error) => {
        notifications.show({
          title: t('common.error'),
          message: error.response?.data?.message || 'Failed to load coupon',
          color: 'red',
        })
        setTimeout(() => navigate('/catalog/coupons'), 2000)
      })
    }
  }, [mode, id])

  // Handlers
  const handleFieldChange = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    clearError(field)
    setField(field, value)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    try {
      const success = await submitForm()
      if (success) {
        notifications.show({
          title: t('coupons.notifications.' + (mode === 'create' ? 'created' : 'updated')),
          message: t('coupons.notifications.' + (mode === 'create' ? 'createdMessage' : 'updatedMessage')),
          color: 'green',
        })
        setTimeout(() => navigate('/catalog/coupons'), 500)
      }
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || t('coupons.notifications.error' + (mode === 'create' ? 'Creating' : 'Updating')),
        color: 'red',
      })
    }
  }

  const handleDelete = () => {
    if (!id) return

    modals.openConfirmModal({
      title: t('coupons.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('coupons.notifications.deleteConfirmMessage')}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteCoupon(Number(id))
          notifications.show({
            title: t('coupons.notifications.deleted'),
            message: t('coupons.notifications.deletedMessage'),
            color: 'green',
          })
          navigate('/catalog/coupons')
        } catch (error: any) {
          notifications.show({
            title: t('common.error'),
            message: error.response?.data?.message || t('coupons.notifications.errorDeleting'),
            color: 'red',
          })
        }
      },
    })
  }

  // Loading state
  if (loading) {
    return (
      <Box p="md">
        <Stack gap="md">
          <Skeleton height={40} width={300} />
          <Skeleton height={400} />
        </Stack>
      </Box>
    )
  }

  // Page title
  const pageTitle = mode === 'create' ? t('coupons.form.create') : t('coupons.form.update')
  const submitButtonText = mode === 'create' ? t('coupons.form.create') : t('coupons.form.update')

  return (
    <Box p="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconDiscount size={32} className="text-blue-600" />
            <Title order={1}>{pageTitle}</Title>
            {mode === 'edit' && originalCoupon && (
              <Text c="dimmed" size="sm">({originalCoupon.code})</Text>
            )}
          </Group>
          <Group gap="xs">
            {mode === 'edit' && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleDelete}
              >
                {t('common.delete')}
              </Button>
            )}
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/catalog/coupons')}
            >
              {t('coupons.back') || 'Back'}
            </Button>
          </Group>
        </Group>

        {/* Usage Statistics (edit mode only) */}
        {mode === 'edit' && originalCoupon && (
          <Paper withBorder p="md" shadow="sm">
            <Group gap="xl">
              <Text size="sm">
                <Text span fw={600}>Status:</Text>{' '}
                {originalCoupon.isActive ? t('coupons.active') : t('coupons.inactive')}
              </Text>
              <Text size="sm">
                <Text span fw={600}>Usage:</Text>{' '}
                {originalCoupon.usedCount}
                {originalCoupon.maxUses ? ` / ${originalCoupon.maxUses}` : ''}
              </Text>
              {originalCoupon.expiresAt && new Date(originalCoupon.expiresAt) < new Date() && (
                <Text size="sm" c="red">
                  <Text span fw={600}>Expired</Text>
                </Text>
              )}
            </Group>
          </Paper>
        )}

        {/* Form */}
        <Paper withBorder p="md" shadow="sm" component="form" onSubmit={handleSubmit}>
          <Stack gap="xl">
            {/* Basic Information */}
            <Stack gap="md">
              <Text fw={600} size="lg">{t('coupons.basicInfo') || 'Basic Information'}</Text>

              <TextInput
                label={t('coupons.form.code')}
                placeholder={t('coupons.form.codePlaceholder')}
                description={t('coupons.form.codeDescription')}
                required
                disabled={mode === 'edit'}
                uppercase
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.currentTarget.value.toUpperCase())}
                error={translatedErrors.code}
                fw={500}
              />

              <TextInput
                label={t('coupons.form.description')}
                placeholder={t('coupons.form.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.currentTarget.value)}
              />

              <Select
                label={t('coupons.form.type')}
                required
                data={[
                  { value: 'percentage', label: t('coupons.form.typePercentage') },
                  { value: 'fixed_amount', label: t('coupons.form.typeFixedAmount') },
                ]}
                value={formData.type}
                onChange={(v) => handleFieldChange('type', v as 'percentage' | 'fixed_amount')}
              />

              <NumberInput
                label={formData.type === 'percentage' ? t('coupons.form.percentageLabel') : t('coupons.form.fixedLabel')}
                required
                min={0}
                max={formData.type === 'percentage' ? 100 : undefined}
                decimalScale={2}
                value={formData.amount}
                onChange={(v) => {
                  clearError('amount')
                  handleFieldChange('amount', Number(v) || 0)
                }}
                error={translatedErrors.amount}
              />

              {formData.type === 'percentage' && (
                <NumberInput
                  label={t('coupons.form.maxDiscountAmount')}
                  description={t('coupons.form.maxDiscountAmountDescription')}
                  min={0}
                  decimalScale={2}
                  value={formData.maxDiscountAmount ?? undefined}
                  onChange={(v) => handleFieldChange('maxDiscountAmount', Number(v) || null)}
                  error={translatedErrors.maxDiscountAmount}
                />
              )}

              <NumberInput
                label={t('coupons.form.minOrderAmount')}
                description={t('coupons.form.minOrderAmountDescription')}
                min={0}
                decimalScale={2}
                value={formData.minOrderAmount ?? undefined}
                onChange={(v) => handleFieldChange('minOrderAmount', Number(v) || null)}
                error={translatedErrors.minOrderAmount}
              />
            </Stack>

            <Divider label={t('coupons.datesAndLimits') || 'Dates & Limits'} labelPosition="left" />

            {/* Dates & Usage Limits */}
            <Stack gap="md">
              <Group grow>
                <DateTimePicker
                  label={t('coupons.form.startsAt')}
                  placeholder="Pick date and time"
                  valueFormat="DD/MM/YYYY hh:mm A"
                  clearable
                  value={formData.startsAt ? new Date(formData.startsAt) : null}
                  onChange={(v) => handleFieldChange('startsAt', v?.toISOString() ?? null)}
                />

                <DateTimePicker
                  label={t('coupons.form.expiresAt')}
                  placeholder="Pick date and time"
                  valueFormat="DD/MM/YYYY hh:mm A"
                  clearable
                  value={formData.expiresAt ? new Date(formData.expiresAt) : null}
                  onChange={(v) => {
                    clearError('expiresAt')
                    handleFieldChange('expiresAt', v?.toISOString() ?? null)
                  }}
                  error={translatedErrors.expiresAt}
                />
              </Group>

              <Group grow>
                <NumberInput
                  label={t('coupons.form.maxUses')}
                  description={t('coupons.form.maxUsesDescription')}
                  min={1}
                  value={formData.maxUses ?? undefined}
                  onChange={(v) => handleFieldChange('maxUses', Number(v) || null)}
                  error={translatedErrors.maxUses}
                />

                <NumberInput
                  label={t('coupons.form.usageLimitPerCustomer')}
                  description={t('coupons.form.usageLimitPerCustomerDescription')}
                  min={1}
                  value={formData.usageLimitPerCustomer ?? 1}
                  onChange={(v) => handleFieldChange('usageLimitPerCustomer', Number(v) || 1)}
                  error={translatedErrors.usageLimitPerCustomer}
                />
              </Group>
            </Stack>

            <Divider label={t('coupons.settings') || 'Settings'} labelPosition="left" />

            {/* Settings */}
            <Stack gap="md">
              <Switch
                label={t('coupons.form.isActive')}
                description={t('coupons.form.isActiveDescription')}
                checked={formData.isActive}
                onChange={(e) => handleFieldChange('isActive', e.currentTarget.checked)}
              />

              <Switch
                label={t('coupons.form.isAutoApply')}
                description={t('coupons.form.isAutoApplyDescription')}
                checked={formData.isAutoApply}
                onChange={(e) => handleFieldChange('isAutoApply', e.currentTarget.checked)}
              />

              <Switch
                label={t('coupons.form.firstPurchaseOnly')}
                description={t('coupons.form.firstPurchaseOnlyDescription')}
                checked={formData.firstPurchaseOnly}
                onChange={(e) => handleFieldChange('firstPurchaseOnly', e.currentTarget.checked)}
              />
            </Stack>

            <Divider label={t('coupons.targeting') || 'Targeting'} labelPosition="left" />

            {/* Targeting */}
            <Stack gap="md">
              <SearchableMultiSelect
                label={t('coupons.form.productIds')}
                description={t('coupons.form.productIdsDescription')}
                placeholder={t('coupons.form.productIdsPlaceholder')}
                value={formData.productIds}
                onChange={(v) => handleFieldChange('productIds', v)}
                searchFn={searchProducts}
                fetchByIdFn={fetchProductById}
                error={translatedErrors.productIds}
              />

              <SearchableMultiSelect
                label={t('coupons.form.categoryIds')}
                description={t('coupons.form.categoryIdsDescription')}
                placeholder={t('coupons.form.categoryIdsPlaceholder')}
                value={formData.categoryIds}
                onChange={(v) => handleFieldChange('categoryIds', v)}
                searchFn={searchCategories}
                fetchByIdFn={fetchCategoryById}
                error={translatedErrors.categoryIds}
              />

              <SearchableMultiSelect
                label={t('coupons.form.customerIds')}
                description={t('coupons.form.customerIdsDescription')}
                placeholder={t('coupons.form.customerIdsPlaceholder')}
                value={formData.customerIds}
                onChange={(v) => handleFieldChange('customerIds', v)}
                searchFn={searchCustomers}
                fetchByIdFn={fetchCustomerById}
                error={translatedErrors.customerIds}
              />
            </Stack>

            {/* Actions */}
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => navigate('/catalog/coupons')}
              >
                {t('coupons.form.cancel')}
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={submitting}
              >
                {submitButtonText}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
