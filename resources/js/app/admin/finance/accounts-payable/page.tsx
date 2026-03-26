'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Card,
  Table,
  Badge,
  Button,
  ActionIcon,
  TextInput,
  NumberFormatter,
  Skeleton,
  Tabs,
  Select,
  Paper,
  Alert,
  SimpleGrid,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconClock,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { modals } from '@mantine/modals'
import {
  getVendorBills,
  deleteVendorBill,
  getAccountsPayableStatistics,
  getAgingReport,
  type VendorBill,
  type AccountsPayableStatistics,
  type AgingReport,
} from '@/utils/api'

export default function AccountsPayablePage() {
  const { t } = useTranslation()
  const { hasPermission, isSuperAdmin } = usePermissions()

  // Super admins have access to everything
  if (!isSuperAdmin() && !hasPermission('finance.view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>{t('common.accessDenied')}</Title>
          <Text c="dimmed">{t('finance.accountsPayablePage.accessDenied')}</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [bills, setBills] = useState<VendorBill[]>([])
  const [statistics, setStatistics] = useState<AccountsPayableStatistics | null>(null)
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('bills')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [billsRes, statsRes, agingRes] = await Promise.all([
        getVendorBills({ per_page: 50 }),
        getAccountsPayableStatistics(),
        getAgingReport(),
      ])
      // Handle both paginated response and direct array
      const billsData = Array.isArray(billsRes) ? billsRes : (billsRes.data?.data || billsRes.data || [])
      setBills(billsData)
      setStatistics(statsRes.data)
      setAgingReport(agingRes.data)
    } catch (error) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('finance.accountsPayablePage.notification.fetchError'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = (bill: VendorBill) => {
    modals.openConfirmModal({
      title: t('finance.accountsPayablePage.notification.deleteTitle'),
      children: (
        <Text size="sm">
          {t('finance.accountsPayablePage.notification.deleteConfirm', { billNumber: bill.bill_number })}
        </Text>
      ),
      labels: { confirm: t('common.delete') || 'Delete', cancel: t('common.cancel') || 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteVendorBill(bill.id)
          notifications.show({
            title: t('common.success') || 'Success',
            message: t('finance.accountsPayablePage.notification.deleteSuccess'),
            color: 'green',
          })
          fetchData()
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('finance.accountsPayablePage.notification.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'gray',
      open: 'blue',
      partial: 'yellow',
      paid: 'green',
      overdue: 'red',
    }
    return colors[status] || 'gray'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'red',
      partial: 'yellow',
      paid: 'green',
    }
    return colors[status] || 'gray'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: t('finance.accountsPayablePage.statusBadges.draft'),
      open: t('finance.accountsPayablePage.statusBadges.open'),
      partial: t('finance.accountsPayablePage.statusBadges.partial'),
      paid: t('finance.accountsPayablePage.statusBadges.paid'),
      overdue: t('finance.accountsPayablePage.statusBadges.overdue'),
    }
    return labels[status] || status
  }

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      unpaid: t('finance.accountsPayablePage.statusBadges.unpaid'),
      partial: t('finance.accountsPayablePage.statusBadges.partial'),
      paid: t('finance.accountsPayablePage.statusBadges.paid'),
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Skeleton height={40} width="100%" />
          <Group>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={100} style={{ flex: 1 }} />
            ))}
          </Group>
          <Skeleton height={400} radius="md" />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">{t('finance.accountsPayablePage.title')}</Title>
            <Text c="dimmed" className="text-sm md:text-base">{t('finance.accountsPayablePage.subtitle')}</Text>
          </Box>
          <Group>
            <ActionIcon variant="light" onClick={fetchData}>
              <IconRefresh size={18} />
            </ActionIcon>
            <Button leftSection={<IconPlus size={18} />} onClick={() => modals.open({
              title: t('finance.accountsPayablePage.newBill'),
              children: (
                <Text c="dimmed">
                  {t('finance.accountsPayablePage.createBillModal.comingSoon') || 'Create bill feature coming soon. Please use the API for now.'}
                </Text>
              ),
            })}>
              {t('finance.accountsPayablePage.newBill')}
            </Button>
          </Group>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Group>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.statistics.totalBills')}</Text>
              <Text className="text-xl md:text-2xl" fw={700}>{statistics.total_bills}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.statistics.unpaid')}</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="red">{statistics.unpaid_bills}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.statistics.overdue')}</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="orange">{statistics.overdue_bills}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.statistics.totalDue')}</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="blue">
                <NumberFormatter value={statistics.total_due} prefix="৳" thousandSeparator />
              </Text>
            </Card>
          </Group>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="bills" leftSection={<IconClock size={14} />}>{t('finance.accountsPayablePage.tabs.bills')}</Tabs.Tab>
            <Tabs.Tab value="aging" leftSection={<IconAlertCircle size={14} />}>{t('finance.accountsPayablePage.tabs.aging')}</Tabs.Tab>
          </Tabs.List>

          {/* Bills Tab */}
          <Tabs.Panel value="bills">
            {/* Filters */}
            <Paper withBorder p="md" radius="md" mb="md">
              <Group>
                <TextInput
                  placeholder={t('finance.accountsPayablePage.filters.searchPlaceholder')}
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  className="flex-1"
                />
                <Select
                  placeholder={t('finance.accountsPayablePage.filters.status')}
                  clearable
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v || '')}
                  data={[
                    { value: 'draft', label: t('finance.accountsPayablePage.statusBadges.draft') },
                    { value: 'open', label: t('finance.accountsPayablePage.statusBadges.open') },
                    { value: 'partial', label: t('finance.accountsPayablePage.statusBadges.partial') },
                    { value: 'paid', label: t('finance.accountsPayablePage.statusBadges.paid') },
                    { value: 'overdue', label: t('finance.accountsPayablePage.statusBadges.overdue') },
                  ]}
                  w={{ base: '100%', sm: 150 }}
                />
              </Group>
            </Paper>

            {/* Desktop Table */}
            <Card withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }}>
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('finance.accountsPayablePage.table.billNumber')}</Table.Th>
                      <Table.Th>{t('finance.accountsPayablePage.table.supplier')}</Table.Th>
                      <Table.Th>{t('finance.accountsPayablePage.table.billDate')}</Table.Th>
                      <Table.Th>{t('finance.accountsPayablePage.table.dueDate')}</Table.Th>
                      <Table.Th ta="right">{t('finance.accountsPayablePage.table.total')}</Table.Th>
                      <Table.Th ta="right">{t('finance.accountsPayablePage.table.balance')}</Table.Th>
                      <Table.Th>{t('finance.accountsPayablePage.table.status')}</Table.Th>
                      <Table.Th ta="center">{t('finance.accountsPayablePage.table.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {bills.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">{t('finance.accountsPayablePage.table.noBillsFound')}</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      bills.map((bill) => (
                        <Table.Tr key={bill.id}>
                          <Table.Td><Text className="font-mono">{bill.bill_number}</Text></Table.Td>
                          <Table.Td>{bill.supplier_name || '-'}</Table.Td>
                          <Table.Td>{bill.bill_date}</Table.Td>
                          <Table.Td>{bill.due_date}</Table.Td>
                          <Table.Td ta="right">
                            <NumberFormatter value={bill.total_amount} prefix="৳" thousandSeparator />
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text fw={600} c={bill.balance_due > 0 ? 'red' : 'green'}>
                              <NumberFormatter value={bill.balance_due} prefix="৳" thousandSeparator />
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge color={getStatusColor(bill.status)} variant="light">
                                {bill.status_label || getStatusLabel(bill.status)}
                              </Badge>
                              <Badge color={getPaymentStatusColor(bill.payment_status)} variant="light">
                                {bill.payment_status_label || getPaymentStatusLabel(bill.payment_status)}
                              </Badge>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" justify="center">
                              <ActionIcon size="sm" color="blue" variant="light">
                                <IconPencil size={14} />
                              </ActionIcon>
                              <ActionIcon
                                size="sm"
                                color="red"
                                variant="light"
                                onClick={() => handleDelete(bill)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>

            {/* Mobile Card View */}
            <Stack display={{ base: 'block', md: 'none' }} gap="sm">
              {bills.length === 0 ? (
                <Card withBorder p="xl" ta="center">
                  <Text c="dimmed">{t('finance.accountsPayablePage.table.noBillsFound')}</Text>
                </Card>
              ) : (
                bills.map((bill) => (
                  <Card key={bill.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Text className="font-mono" fw={600}>{bill.bill_number}</Text>
                      <Badge color={getStatusColor(bill.status)} variant="light">
                        {bill.status_label || getStatusLabel(bill.status)}
                      </Badge>
                    </Group>
                    <Text size="sm">{bill.supplier_name || '-'}</Text>
                    <Group mt="xs" justify="space-between">
                      <Text size="xs" c="dimmed">{t('finance.accountsPayablePage.table.due')} {bill.due_date}</Text>
                      <Text size="sm" fw={600} c={bill.balance_due > 0 ? 'red' : 'green'}>
                        <NumberFormatter value={bill.balance_due} prefix="৳" thousandSeparator />
                      </Text>
                    </Group>
                    <Group mt="sm" justify="flex-end">
                      <ActionIcon size="sm" color="blue" variant="light">
                        <IconPencil size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="light"
                        onClick={() => handleDelete(bill)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

          {/* Aging Report Tab */}
          <Tabs.Panel value="aging">
            {agingReport && (
              <Stack>
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  <Text className="text-sm md:text-base">
                    {t('finance.accountsPayablePage.aging.totalOutstanding')} <Text fw={700} span><NumberFormatter value={agingReport?.total_due || 0} prefix="৳" thousandSeparator /></Text>
                  </Text>
                </Alert>

                {/* Aging Buckets */}
                <Title order={3} className="text-base md:text-lg">{t('finance.accountsPayablePage.aging.title')}</Title>
                <Card withBorder p="md">
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }}>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.aging.current')}</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="green">
                        <NumberFormatter value={agingReport?.aging?.current?.amount || 0} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport?.aging?.current?.count || 0} {t('finance.accountsPayablePage.aging.bills')}
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.aging.days1_30')}</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="yellow">
                        <NumberFormatter value={agingReport?.aging?.['1_30_days']?.amount || 0} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport?.aging?.['1_30_days']?.count || 0} {t('finance.accountsPayablePage.aging.bills')}
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.aging.days31_60')}</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="orange">
                        <NumberFormatter value={agingReport?.aging?.['31_60_days']?.amount || 0} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport?.aging?.['31_60_days']?.count || 0} {t('finance.accountsPayablePage.aging.bills')}
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.aging.days61_90')}</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="red">
                        <NumberFormatter value={agingReport?.aging?.['61_90_days']?.amount || 0} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport?.aging?.['61_90_days']?.count || 0} {t('finance.accountsPayablePage.aging.bills')}
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPayablePage.aging.daysOver90')}</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="red">
                        <NumberFormatter value={agingReport?.aging?.over_90_days?.amount || 0} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport?.aging?.over_90_days?.count || 0} {t('finance.accountsPayablePage.aging.bills')}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Card>

                {/* By Supplier */}
                <Title order={3} className="text-base md:text-lg">{t('finance.accountsPayablePage.aging.bySupplier')}</Title>
                <Card withBorder p="0" radius="md">
                  <Table.ScrollContainer minWidth={800}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('finance.accountsPayablePage.aging.supplier')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.current')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.days1_30')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.days31_60')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.days61_90')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.daysOver90')}</Table.Th>
                          <Table.Th ta="right">{t('finance.accountsPayablePage.aging.total')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {agingReport?.by_supplier?.map((supplier) => (
                          <Table.Tr key={supplier.supplier_id}>
                            <Table.Td>{supplier.supplier_name}</Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={supplier.current} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={supplier['1_30_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={supplier['31_60_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={supplier['61_90_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={supplier.over_90_days} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text fw={700}>
                                <NumberFormatter value={supplier.total_due} prefix="৳" thousandSeparator />
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </Card>
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  )
}
