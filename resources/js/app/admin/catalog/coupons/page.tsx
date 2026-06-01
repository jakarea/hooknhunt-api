'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Paper, TextInput, Button, Stack, Group, Text, Box,
  ActionIcon, Table, Skeleton, Select, NumberInput,
  Badge, Pagination, Tooltip,
} from '@mantine/core'
import {
  IconSearch, IconRefresh, IconPlus, IconEdit, IconTrash,
  IconDiscount, IconPlayerPlay, IconPlayerPause, IconCopy,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { useCouponStore } from '@/stores/couponStore'
import { type Coupon } from '@/utils/api'

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function CouponsPage() {
  const { t } = useTranslation()
  const ns = 'coupons'
  const navigate = useNavigate()

  const {
    coupons, loading, pagination,
    fetchCoupons, removeCoupon, toggleStatus,
  } = useCouponStore()

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 400)
  const [currentPage, setCurrentPage] = useState(1)

  // ---- Fetch data ----
  const loadCoupons = useCallback(() => {
    fetchCoupons({ search: debouncedSearch || undefined, page: currentPage, per_page: 25 })
  }, [fetchCoupons, debouncedSearch, currentPage])

  useEffect(() => { loadCoupons() }, [loadCoupons])

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1) }, [debouncedSearch])

  // ---- Actions ----
  const openCreate = () => {
    navigate('/catalog/coupons/create')
  }

  const openEdit = (coupon: Coupon) => {
    navigate(`/catalog/coupons/${coupon.id}/edit`)
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
      </Stack>
    </Box>
  )
}
