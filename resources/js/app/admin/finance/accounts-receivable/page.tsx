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
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconPencil,
  IconTrash,
  IconAlertCircle,
  IconClock,
  IconSend,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { modals } from '@mantine/modals'

export default function AccountsReceivablePage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  if (!hasPermission('finance.view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Accounts Receivable.</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [agingReport, setAgingReport] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('invoices')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual API calls
      setInvoices([])
      setStatistics({
        total_invoices: 0,
        unpaid_invoices: 0,
        partial_invoices: 0,
        paid_invoices: 0,
        overdue_invoices: 0,
        total_due: 0,
        total_collected_this_month: 0,
      })
      setAgingReport({
        as_of_date: new Date().toISOString().split('T')[0],
        total_due: 0,
        aging: {
          current: { count: 0, amount: 0 },
          '1_30_days': { count: 0, amount: 0 },
          '31_60_days': { count: 0, amount: 0 },
          '61_90_days': { count: 0, amount: 0 },
          over_90_days: { count: 0, amount: 0 },
        },
        by_customer: [],
        total_unpaid_invoices: 0,
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load accounts receivable data',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = (invoice: any) => {
    modals.openConfirmModal({
      title: 'Delete Invoice',
      children: (
        <Text size="sm">
          Are you sure you want to delete invoice {invoice.invoice_number}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        notifications.show({
          title: 'Success',
          message: 'Invoice deleted successfully',
          color: 'green',
        })
        fetchData()
      },
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'gray',
      sent: 'blue',
      partial: 'yellow',
      paid: 'green',
      overdue: 'red',
    }
    return colors[status] || 'gray'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unpaid: 'orange',
      partial: 'yellow',
      paid: 'green',
    }
    return colors[status] || 'gray'
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
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">Accounts Receivable</Title>
            <Text c="dimmed" className="text-sm md:text-base">Customer invoices and payments management</Text>
          </Box>
          <Group>
            <ActionIcon variant="light" onClick={fetchData}>
              <IconRefresh size={18} />
            </ActionIcon>
            <Button leftSection={<IconPlus size={16} />}>
              New Invoice
            </Button>
          </Group>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Group>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">Total Invoices</Text>
              <Text className="text-xl md:text-2xl" fw={700}>{statistics.total_invoices}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">Unpaid</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="orange">{statistics.unpaid_invoices}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">Overdue</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="red">{statistics.overdue_invoices}</Text>
            </Card>
            <Card withBorder p="md" radius="md" className="flex-1">
              <Text className="text-xs md:text-sm" c="dimmed">Total Receivable</Text>
              <Text className="text-xl md:text-2xl" fw={700} c="green">
                <NumberFormatter value={statistics.total_due} prefix="৳" thousandSeparator />
              </Text>
            </Card>
          </Group>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="invoices" leftSection={<IconSend size={14} />}>Invoices</Tabs.Tab>
            <Tabs.Tab value="aging" leftSection={<IconAlertCircle size={14} />}>Aging Report</Tabs.Tab>
          </Tabs.List>

          {/* Invoices Tab */}
          <Tabs.Panel value="invoices">
            {/* Filters */}
            <Paper withBorder p="md" radius="md" mb="md">
              <Group>
                <TextInput
                  placeholder="Search invoices..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  className="flex-1"
                />
                <Select
                  placeholder="Status"
                  clearable
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v || '')}
                  data={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'partial', label: 'Partially Paid' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'overdue', label: 'Overdue' },
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
                      <Table.Th>Invoice #</Table.Th>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Invoice Date</Table.Th>
                      <Table.Th>Due Date</Table.Th>
                      <Table.Th ta="right">Total</Table.Th>
                      <Table.Th ta="right">Balance</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th ta="center">Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {invoices.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">No invoices found</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      invoices.map((invoice) => (
                        <Table.Tr key={invoice.id}>
                          <Table.Td><Text className="font-mono">{invoice.invoice_number}</Text></Table.Td>
                          <Table.Td>{invoice.customer_name || '-'}</Table.Td>
                          <Table.Td>{invoice.invoice_date}</Table.Td>
                          <Table.Td>{invoice.due_date}</Table.Td>
                          <Table.Td ta="right">
                            <NumberFormatter value={invoice.total_amount} prefix="৳" thousandSeparator />
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text fw={600} c={invoice.balance_due > 0 ? 'orange' : 'green'}>
                              <NumberFormatter value={invoice.balance_due} prefix="৳" thousandSeparator />
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge color={getStatusColor(invoice.status)} variant="light">
                                {invoice.status_label || invoice.status}
                              </Badge>
                              <Badge color={getPaymentStatusColor(invoice.payment_status)} variant="light">
                                {invoice.payment_status_label || invoice.payment_status}
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
                                onClick={() => handleDelete(invoice)}
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
              {invoices.length === 0 ? (
                <Card withBorder p="xl" ta="center">
                  <Text c="dimmed">No invoices found</Text>
                </Card>
              ) : (
                invoices.map((invoice) => (
                  <Card key={invoice.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Text className="font-mono" fw={600}>{invoice.invoice_number}</Text>
                      <Badge color={getStatusColor(invoice.status)} variant="light">
                        {invoice.status_label || invoice.status}
                      </Badge>
                    </Group>
                    <Text size="sm">{invoice.customer_name || '-'}</Text>
                    <Group mt="xs" justify="space-between">
                      <Text size="xs" c="dimmed">Due: {invoice.due_date}</Text>
                      <Text size="sm" fw={600} c={invoice.balance_due > 0 ? 'orange' : 'green'}>
                        <NumberFormatter value={invoice.balance_due} prefix="৳" thousandSeparator />
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
                        onClick={() => handleDelete(invoice)}
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
                <Alert icon={<IconAlertCircle size={16} />} color="green">
                  <Text className="text-sm md:text-base">
                    Total Outstanding: <Text fw={700} span><NumberFormatter value={agingReport.total_due} prefix="৳" thousandSeparator /></Text>
                  </Text>
                </Alert>

                {/* Aging Buckets */}
                <Title order={3} className="text-base md:text-lg">Aging Summary</Title>
                <Card withBorder p="md">
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }}>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">Current</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="green">
                        <NumberFormatter value={agingReport.aging.current.amount} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport.aging.current.count} invoices
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">1-30 Days</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="yellow">
                        <NumberFormatter value={agingReport.aging['1_30_days'].amount} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport.aging['1_30_days'].count} invoices
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">31-60 Days</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="orange">
                        <NumberFormatter value={agingReport.aging['31_60_days'].amount} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport.aging['31_60_days'].count} invoices
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">61-90 Days</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="red">
                        <NumberFormatter value={agingReport.aging['61_90_days'].amount} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport.aging['61_90_days'].count} invoices
                      </Text>
                    </Box>
                    <Box>
                      <Text className="text-xs md:text-sm" c="dimmed">Over 90 Days</Text>
                      <Text className="text-lg md:text-xl" fw={700} c="red">
                        <NumberFormatter value={agingReport.aging.over_90_days.amount} prefix="৳" thousandSeparator />
                      </Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {agingReport.aging.over_90_days.count} invoices
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Card>

                {/* By Customer */}
                <Title order={3} className="text-base md:text-lg">Aging by Customer</Title>
                <Card withBorder p="0" radius="md">
                  <Table.ScrollContainer minWidth={800}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Customer</Table.Th>
                          <Table.Th ta="right">Current</Table.Th>
                          <Table.Th ta="right">1-30</Table.Th>
                          <Table.Th ta="right">31-60</Table.Th>
                          <Table.Th ta="right">61-90</Table.Th>
                          <Table.Th ta="right">90+</Table.Th>
                          <Table.Th ta="right">Total</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {agingReport.by_customer.map((customer: any) => (
                          <Table.Tr key={customer.customer_id}>
                            <Table.Td>{customer.customer_name}</Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={customer.current} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={customer['1_30_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={customer['31_60_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={customer['61_90_days']} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <NumberFormatter value={customer.over_90_days} prefix="৳" thousandSeparator />
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text fw={700}>
                                <NumberFormatter value={customer.total_due} prefix="৳" thousandSeparator />
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
