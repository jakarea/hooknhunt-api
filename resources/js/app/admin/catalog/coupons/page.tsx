'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Paper, TextInput, Button, Stack, Group, Text, Box,
  ActionIcon, Table, Skeleton, Modal, Select, NumberInput,
  Textarea, Switch, Badge, TagsInput, Pagination, Loader,
  Tooltip,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import {
  IconSearch, IconRefresh, IconPlus, IconEdit, IconTrash,
  IconDiscount, IconPercentage, IconCoin, IconCalendar,
  IconCopy, IconPlayerPlay, IconPlayerPause, IconTicket,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { useCouponStore } from '@/stores/couponStore'
import { bulkGenerateCoupons, type Coupon, type CouponFormData } from '@/utils/api'

// ---------------------------------------------------------------------------
// Empty form template
// ---------------------------------------------------------------------------
const emptyForm = (): CouponFormData => ({
  code: '',
  description: '',
  type: 'percentage',
  amount: 0,
  maxDiscountAmount: null,
  minOrderAmount: null,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usageLimitPerCustomer: 1,
  isActive: true,
  isAutoApply: false,
  firstPurchaseOnly: false,
  productIds: null,
  categoryIds: null,
  customerIds: null,
})

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function CouponsPage() {
  const { t } = useTranslation()
  const ns = 'coupons'

  const {
    coupons, loading, submitting, pagination,
    fetchCoupons, addCoupon, editCoupon, removeCoupon, toggleStatus,
  } = useCouponStore()

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 400)
  const [currentPage, setCurrentPage] = useState(1)

  // Modal state
  const [modalOpened, setModalOpened] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<CouponFormData>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Bulk generate modal
  const [bulkModalOpened, setBulkModalOpened] = useState(false)
  const [bulkPrefix, setBulkPrefix] = useState('PROMO')
  const [bulkQuantity, setBulkQuantity] = useState(10)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  // ---- Fetch data ----
  const loadCoupons = useCallback(() => {
    fetchCoupons({ search: debouncedSearch || undefined, page: currentPage, per_page: 25 })
  }, [fetchCoupons, debouncedSearch, currentPage])

  useEffect(() => { loadCoupons() }, [loadCoupons])

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1) }, [debouncedSearch])

  // ---- Form helpers ----
  const resetForm = () => {
    setFormData(emptyForm())
    setErrors({})
    setEditMode(false)
    setCurrentCoupon(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpened(true)
  }

  const openEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      description: coupon.description ?? '',
      type: coupon.type,
      amount: coupon.amount,
      maxDiscountAmount: coupon.maxDiscountAmount ?? null,
      minOrderAmount: coupon.minOrderAmount ?? null,
      startsAt: coupon.startsAt ?? null,
      expiresAt: coupon.expiresAt ?? null,
      maxUses: coupon.maxUses ?? null,
      usageLimitPerCustomer: coupon.usageLimitPerCustomer ?? 1,
      isActive: coupon.isActive,
      isAutoApply: coupon.isAutoApply,
      firstPurchaseOnly: coupon.firstPurchaseOnly,
      productIds: coupon.productIds ?? null,
      categoryIds: coupon.categoryIds ?? null,
      customerIds: coupon.customerIds ?? null,
    })
    setCurrentCoupon(coupon)
    setEditMode(true)
    setErrors({})
    setModalOpened(true)
  }

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (!formData.code.trim()) e.code = t(`${ns}.validation.codeRequired`)
    if (!formData.amount || formData.amount <= 0) e.amount = t(`${ns}.validation.amountPositive`)
    if (formData.type === 'percentage' && formData.amount > 100) e.amount = t(`${ns}.validation.percentageMax`)
    if (formData.startsAt && formData.expiresAt && new Date(formData.startsAt) >= new Date(formData.expiresAt)) {
      e.expiresAt = t(`${ns}.validation.expiryAfterStart`)
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    const ok = editMode && currentCoupon
      ? await editCoupon(currentCoupon.id, formData)
      : await addCoupon(formData)
    if (ok) setModalOpened(false)
  }

  const handleDelete = (coupon: Coupon) => {
    modals.openConfirmModal({
      title: t(`${ns}.notifications.deleteConfirm`),
      children: (
        <Text size="sm">
          <span dangerouslySetInnerHTML={{
            __html: t(`${ns}.notifications.deleteCode`, { code: `<strong>${coupon.code}</strong>` })
          }} />
        </Text>
      ),
      labels: { confirm: t(`${ns}.notifications.deleted`), cancel: t(`${ns}.form.cancel`) },
      confirmProps: { color: 'red' },
      onConfirm: () => removeCoupon(coupon.id),
    })
  }

  const handleBulkGenerate = async () => {
    if (!bulkPrefix.trim() || bulkQuantity < 1) return
    setBulkSubmitting(true)
    try {
      const res = await bulkGenerateCoupons({
        prefix: bulkPrefix,
        quantity: bulkQuantity,
        type: formData.type,
        amount: formData.amount,
        maxDiscountAmount: formData.maxDiscountAmount,
        minOrderAmount: formData.minOrderAmount,
        startsAt: formData.startsAt,
        expiresAt: formData.expiresAt,
        maxUses: formData.maxUses,
        usageLimitPerCustomer: formData.usageLimitPerCustomer,
        isActive: formData.isActive,
        isAutoApply: formData.isAutoApply,
        firstPurchaseOnly: formData.firstPurchaseOnly,
        productIds: formData.productIds,
        categoryIds: formData.categoryIds,
        customerIds: formData.customerIds,
      })
      const count = Array.isArray(res?.data) ? res.data.length : bulkQuantity
      notifications.show({
        title: t(`${ns}.bulk.generated`),
        message: t(`${ns}.bulk.generatedMessage`, { count }),
        color: 'green'
      })
      setBulkModalOpened(false)
      loadCoupons()
    } catch {
      notifications.show({
        title: t(`${ns}.errorTitle`),
        message: t(`${ns}.generateError`),
        color: 'red'
      })
    } finally {
      setBulkSubmitting(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    notifications.show({
      title: t(`${ns}.copied`),
      message: code,
      color: 'blue',
      autoClose: 1500
    })
  }

  // ---- Helpers ----
  const formatDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString() : '—'

  // ---- Render ----
  if (loading && coupons.length === 0) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width={200} />
          <Skeleton height={300} radius="md" />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="sm">
            <IconDiscount size={28} className="text-blue-600" />
            <div>
              <Text fw={700} className="text-lg md:text-xl">{t(`${ns}.title`)}</Text>
              <Text c="dimmed" className="text-sm">
                {pagination.total === 1
                  ? t(`${ns}.countLabel`, { count: pagination.total })
                  : t(`${ns}.countLabelPlural`, { count: pagination.total || 0 })
                }
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            <Button variant="default" size="sm" leftSection={<IconRefresh size={16} />} onClick={loadCoupons}>
              {t(`${ns}.refresh`)}
            </Button>
            <Button variant="light" size="sm" leftSection={<IconTicket size={16} />} onClick={() => { resetForm(); setBulkModalOpened(true) }}>
              {t(`${ns}.bulkGenerate`)}
            </Button>
            <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              {t(`${ns}.addCoupon`)}
            </Button>
          </Group>
        </Group>

        {/* Search */}
        <TextInput
          placeholder={t(`${ns}.searchPlaceholder`)}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t(`${ns}.tableHeaders.code`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.type`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.amount`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.validity`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.usage`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.status`)}</Table.Th>
                  <Table.Th>{t(`${ns}.tableHeaders.actions`)}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {coupons.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Stack align="center" py="xl">
                        <IconDiscount size={40} className="text-gray-300" />
                        <Text c="dimmed">{t(`${ns}.noCouponsFound`)}</Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ) : coupons.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={600} className="text-sm" ff="monospace">{c.code}</Text>
                        <ActionIcon variant="subtle" size="xs" color="gray" onClick={() => copyCode(c.code)}>
                          <IconCopy size={12} />
                        </ActionIcon>
                        {c.isAutoApply && <Badge size="xs" color="grape" variant="light">{t(`${ns}.autoBadge`)}</Badge>}
                        {c.firstPurchaseOnly && <Badge size="xs" color="indigo" variant="light">{t(`${ns}.firstBadge`)}</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={c.type === 'percentage' ? 'blue' : 'teal'}>
                        {c.type === 'percentage' ? '%' : t(`${ns}.fixedType`)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text className="text-sm" fw={500}>
                          {c.type === 'percentage' ? `${c.amount}%` : `৳${Number(c.amount).toFixed(2)}`}
                        </Text>
                        {c.maxDiscountAmount && c.type === 'percentage' && (
                          <Text className="text-xs" c="dimmed">{t(`${ns}.maxCap`, { amount: Number(c.maxDiscountAmount).toFixed(0) })}</Text>
                        )}
                        {c.minOrderAmount && Number(c.minOrderAmount) > 0 && (
                          <Text className="text-xs" c="dimmed">{t(`${ns}.minOrder`, { amount: Number(c.minOrderAmount).toFixed(0) })}</Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text className="text-xs" c="dimmed">{formatDate(c.startsAt)} → {formatDate(c.expiresAt)}</Text>
                        {c.expiresAt && new Date(c.expiresAt) < new Date() && (
                          <Badge size="xs" color="red">{t(`${ns}.expired`)}</Badge>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={c.isActive ? t(`${ns}.clickToDeactivate`) : t(`${ns}.clickToActivate`)}>
                        <ActionIcon
                          variant="subtle"
                          color={c.isActive ? 'green' : 'gray'}
                          onClick={() => toggleStatus(c.id)}
                        >
                          {c.isActive ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(c)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden">
          <Stack gap="sm">
            {coupons.length === 0 ? (
              <Paper withBorder p="xl" ta="center">
                <Stack align="center">
                  <IconDiscount size={40} className="text-gray-300" />
                  <Text c="dimmed">{t(`${ns}.noCouponsFound`)}</Text>
                </Stack>
              </Paper>
            ) : coupons.map((c) => (
              <Paper key={c.id} withBorder p="sm" radius="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4} className="flex-1 min-w-0">
                    <Group gap="xs">
                      <Text fw={600} ff="monospace" className="text-sm">{c.code}</Text>
                      <Badge size="xs" variant="light" color={c.type === 'percentage' ? 'blue' : 'teal'}>
                        {c.type === 'percentage' ? `${c.amount}%` : `৳${c.amount}`}
                      </Badge>
                    </Group>
                    <Text className="text-xs" c="dimmed">
                      {formatDate(c.startsAt)} → {formatDate(c.expiresAt)}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color={c.isActive ? 'green' : 'gray'} onClick={() => toggleStatus(c.id)}>
                      {c.isActive ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(c)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </div>

        {/* Pagination */}
        {pagination.lastPage > 1 && (
          <Group justify="center">
            <Pagination
              total={pagination.lastPage}
              value={currentPage}
              onChange={setCurrentPage}
            />
          </Group>
        )}

        {/* ===== CREATE / EDIT MODAL ===== */}
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title={editMode ? t(`${ns}.form.update`) : t(`${ns}.form.create`)}
          size="lg"
          centered
        >
          <Stack gap="md">
            <TextInput
              label={t(`${ns}.form.code`)}
              placeholder={t(`${ns}.form.codePlaceholder`)}
              required
              uppercase
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.currentTarget.value.toUpperCase() })}
              error={errors.code}
              disabled={editMode}
            />

            <Textarea
              label={t(`${ns}.form.description`)}
              placeholder={t(`${ns}.form.descriptionPlaceholder`)}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
              rows={2}
            />

            <Select
              label={t(`${ns}.form.type`)}
              required
              data={[
                { value: 'percentage', label: t(`${ns}.form.typePercentage`) },
                { value: 'fixed_amount', label: t(`${ns}.form.typeFixedAmount`) },
              ]}
              value={formData.type}
              onChange={(v) => setFormData({ ...formData, type: v as 'percentage' | 'fixed_amount' })}
            />

            <NumberInput
              label={formData.type === 'percentage' ? t(`${ns}.form.percentageLabel`) : t(`${ns}.form.fixedLabel`)}
              required
              min={0}
              max={formData.type === 'percentage' ? 100 : undefined}
              decimalScale={2}
              value={formData.amount}
              onChange={(v) => setFormData({ ...formData, amount: Number(v) || 0 })}
              error={errors.amount}
            />

            {formData.type === 'percentage' && (
              <NumberInput
                label={t(`${ns}.form.maxDiscountAmount`)}
                description={t(`${ns}.form.maxDiscountAmountDescription`)}
                min={0}
                decimalScale={2}
                value={formData.maxDiscountAmount ?? ''}
                onChange={(v) => setFormData({ ...formData, maxDiscountAmount: Number(v) || null })}
              />
            )}

            <NumberInput
              label={t(`${ns}.form.minOrderAmount`)}
              description={t(`${ns}.form.minOrderAmountDescription`)}
              min={0}
              decimalScale={2}
              value={formData.minOrderAmount ?? ''}
              onChange={(v) => setFormData({ ...formData, minOrderAmount: Number(v) || null })}
            />

            <Group grow>
              <DateTimePicker
                label={t(`${ns}.form.startsAt`)}
                valueFormat="DD/MM/YYYY hh:mm A"
                clearable
                value={formData.startsAt ? new Date(formData.startsAt) : null}
                onChange={(v) => setFormData({ ...formData, startsAt: v?.toISOString() ?? null })}
              />
              <DateTimePicker
                label={t(`${ns}.form.expiresAt`)}
                valueFormat="DD/MM/YYYY hh:mm A"
                clearable
                value={formData.expiresAt ? new Date(formData.expiresAt) : null}
                onChange={(v) => setFormData({ ...formData, expiresAt: v?.toISOString() ?? null })}
                error={errors.expiresAt}
              />
            </Group>

            <Group grow>
              <NumberInput
                label={t(`${ns}.form.maxUses`)}
                description={t(`${ns}.form.maxUsesDescription`)}
                min={1}
                value={formData.maxUses ?? ''}
                onChange={(v) => setFormData({ ...formData, maxUses: Number(v) || null })}
              />
              <NumberInput
                label={t(`${ns}.form.usageLimitPerCustomer`)}
                description={t(`${ns}.form.usageLimitPerCustomerDescription`)}
                min={1}
                value={formData.usageLimitPerCustomer ?? 1}
                onChange={(v) => setFormData({ ...formData, usageLimitPerCustomer: Number(v) || 1 })}
              />
            </Group>

            <Group grow>
              <Switch
                label={t(`${ns}.form.isActive`)}
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
              />
              <Switch
                label={t(`${ns}.form.isAutoApply`)}
                description={t(`${ns}.form.isAutoApplyDescription`)}
                checked={formData.isAutoApply}
                onChange={(e) => setFormData({ ...formData, isAutoApply: e.currentTarget.checked })}
              />
              <Switch
                label={t(`${ns}.form.firstPurchaseOnly`)}
                checked={formData.firstPurchaseOnly}
                onChange={(e) => setFormData({ ...formData, firstPurchaseOnly: e.currentTarget.checked })}
              />
            </Group>

            <TagsInput
              label={t(`${ns}.form.productIds`)}
              description={t(`${ns}.form.productIdsDescription`)}
              placeholder={t(`${ns}.form.productIdsPlaceholder`)}
              value={formData.productIds?.map(String) ?? []}
              onChange={(v) => setFormData({ ...formData, productIds: v.length > 0 ? v.map(Number) : null })}
            />

            <TagsInput
              label={t(`${ns}.form.categoryIds`)}
              description={t(`${ns}.form.categoryIdsDescription`)}
              placeholder={t(`${ns}.form.categoryIdsPlaceholder`)}
              value={formData.categoryIds?.map(String) ?? []}
              onChange={(v) => setFormData({ ...formData, categoryIds: v.length > 0 ? v.map(Number) : null })}
            />

            <TagsInput
              label={t(`${ns}.form.customerIds`)}
              description={t(`${ns}.form.customerIdsDescription`)}
              placeholder={t(`${ns}.form.customerIdsPlaceholder`)}
              value={formData.customerIds?.map(String) ?? []}
              onChange={(v) => setFormData({ ...formData, customerIds: v.length > 0 ? v.map(Number) : null })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpened(false)}>{t(`${ns}.form.cancel`)}</Button>
              <Button loading={submitting} onClick={handleSubmit}>
                {editMode ? t(`${ns}.form.update`) : t(`${ns}.form.create`)}
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* ===== BULK GENERATE MODAL ===== */}
        <Modal
          opened={bulkModalOpened}
          onClose={() => setBulkModalOpened(false)}
          title={t(`${ns}.bulk.title`)}
          size="lg"
          centered
        >
          <Stack gap="md">
            <Group grow>
              <TextInput
                label={t(`${ns}.bulk.codePrefix`)}
                placeholder={t(`${ns}.bulk.codePrefixPlaceholder`)}
                required
                uppercase
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.currentTarget.value.toUpperCase())}
              />
              <NumberInput
                label={t(`${ns}.bulk.quantity`)}
                required
                min={1}
                max={100}
                value={bulkQuantity}
                onChange={(v) => setBulkQuantity(Number(v) || 1)}
              />
            </Group>

            <Text c="dimmed" className="text-sm">
              {t(`${ns}.bulk.generatesLike`, { count: bulkQuantity })} <strong>{bulkPrefix}XXXXXX</strong>
            </Text>

            <Select
              label={t(`${ns}.form.type`)}
              required
              data={[
                { value: 'percentage', label: t(`${ns}.form.typePercentage`) },
                { value: 'fixed_amount', label: t(`${ns}.form.typeFixedAmount`) },
              ]}
              value={formData.type}
              onChange={(v) => setFormData({ ...formData, type: v as 'percentage' | 'fixed_amount' })}
            />

            <NumberInput
              label={formData.type === 'percentage' ? t(`${ns}.form.percentageLabel`) : t(`${ns}.form.fixedLabel`)}
              required
              min={0}
              max={formData.type === 'percentage' ? 100 : undefined}
              decimalScale={2}
              value={formData.amount}
              onChange={(v) => setFormData({ ...formData, amount: Number(v) || 0 })}
            />

            {formData.type === 'percentage' && (
              <NumberInput
                label={t(`${ns}.form.maxDiscountAmount`)}
                description={t(`${ns}.form.maxDiscountAmountDescription`)}
                min={0}
                decimalScale={2}
                value={formData.maxDiscountAmount ?? ''}
                onChange={(v) => setFormData({ ...formData, maxDiscountAmount: Number(v) || null })}
              />
            )}

            <NumberInput
              label={t(`${ns}.form.minOrderAmount`)}
              description={t(`${ns}.form.minOrderAmountDescription`)}
              min={0}
              decimalScale={2}
              value={formData.minOrderAmount ?? ''}
              onChange={(v) => setFormData({ ...formData, minOrderAmount: Number(v) || null })}
            />

            <Group grow>
              <DateTimePicker
                label={t(`${ns}.form.startsAt`)}
                valueFormat="DD/MM/YYYY hh:mm A"
                clearable
                value={formData.startsAt ? new Date(formData.startsAt) : null}
                onChange={(v) => setFormData({ ...formData, startsAt: v?.toISOString() ?? null })}
              />
              <DateTimePicker
                label={t(`${ns}.form.expiresAt`)}
                valueFormat="DD/MM/YYYY hh:mm A"
                clearable
                value={formData.expiresAt ? new Date(formData.expiresAt) : null}
                onChange={(v) => setFormData({ ...formData, expiresAt: v?.toISOString() ?? null })}
              />
            </Group>

            <Group grow>
              <NumberInput
                label={t(`${ns}.form.maxUsesPerCoupon`)}
                description={t(`${ns}.form.maxUsesDescription`)}
                min={1}
                value={formData.maxUses ?? ''}
                onChange={(v) => setFormData({ ...formData, maxUses: Number(v) || null })}
              />
              <NumberInput
                label={t(`${ns}.form.usageLimitPerCustomer`)}
                description={t(`${ns}.form.usageLimitPerCustomerDescription`)}
                min={1}
                value={formData.usageLimitPerCustomer ?? 1}
                onChange={(v) => setFormData({ ...formData, usageLimitPerCustomer: Number(v) || 1 })}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setBulkModalOpened(false)}>{t(`${ns}.form.cancel`)}</Button>
              <Button loading={bulkSubmitting} onClick={handleBulkGenerate}>
                {t(`${ns}.bulk.generateButton`, { count: bulkQuantity })}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  )
}
