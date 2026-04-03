'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, TextInput, Select, Badge, Button,
  ActionIcon, NumberFormatter, Skeleton, Card, SimpleGrid, Pagination,
} from '@mantine/core'
import { IconSearch, IconRefresh, IconEye, IconShoppingCart } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { Link } from 'react-router-dom'
import {
  getWebsiteOrders, getWebsiteOrderStats, formatCurrency,
  statusColors, statusLabels, paymentStatusColors, channelLabels,
  type WebsiteOrder, type WebsiteOrderFilters, type WebsiteOrderStats,
  type WebsiteOrderStatus, type PaymentStatus, type OrderChannel,
} from '@/utils/websiteApi'

export default function WebsiteOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<WebsiteOrder[]>([])
  const [stats, setStats] = useState<WebsiteOrderStats | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<WebsiteOrderStatus | ''>('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [channel, setChannel] = useState<OrderChannel | ''>('')
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [page, setPage] = useState(1)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const filters: WebsiteOrderFilters = {
        search: search || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        channel: channel || undefined,
        fromDate: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
        toDate: toDate ? toDate.toISOString().split('T')[0] : undefined,
        page,
        perPage: 20,
      }
      const res = await getWebsiteOrders(filters)
      setOrders(res.data.data || [])
      setTotalPages(res.data.last_page || 1)
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load orders', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [search, status, paymentStatus, channel, fromDate, toDate, page])

  const fetchStats = useCallback(async () => {
    try {
      const res = await getWebsiteOrderStats()
      setStats(res.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [fetchOrders, fetchStats])

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="sm">
            <IconShoppingCart size={32} />
            <div>
              <Title order={2} className="text-lg md:text-xl">Website Orders</Title>
              <Text c="dimmed" size="sm">Manage storefront orders</Text>
            </div>
          </Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => { fetchOrders(); fetchStats() }}>
            Refresh
          </Button>
        </Group>

        {/* Stats Cards */}
        {stats && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Total Orders</Text>
              <Text fw={700} size="lg">{stats.total}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Pending</Text>
              <Text fw={700} size="lg" c="yellow">{stats.pending}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Processing</Text>
              <Text fw={700} size="lg" c="blue">{stats.processing}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Shipped</Text>
              <Text fw={700} size="lg" c="cyan">{stats.shipped}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Revenue</Text>
              <Text fw={700} size="lg" c="green">{formatCurrency(stats.totalRevenue)}</Text>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <Group grow>
              <TextInput
                placeholder="Search invoice, customer, phone..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => { setSearch(e.currentTarget.value); setPage(1) }}
              />
              <Select
                placeholder="Status"
                clearable
                data={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
                value={status || null}
                onChange={(v) => { setStatus(v as WebsiteOrderStatus | ''); setPage(1) }}
              />
              <Select
                placeholder="Payment"
                clearable
                data={[
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                ]}
                value={paymentStatus || null}
                onChange={(v) => { setPaymentStatus(v as PaymentStatus | ''); setPage(1) }}
              />
              <Select
                placeholder="Channel"
                clearable
                data={Object.entries(channelLabels).map(([v, l]) => ({ value: v, label: l }))}
                value={channel || null}
                onChange={(v) => { setChannel(v as OrderChannel | ''); setPage(1) }}
              />
            </Group>
            <Group>
              <DateInput
                placeholder="From date"
                value={fromDate}
                onChange={(v) => { setFromDate(v); setPage(1) }}
                clearable
                valueFormat="DD MMM YYYY"
              />
              <DateInput
                placeholder="To date"
                value={toDate}
                onChange={(v) => { setToDate(v); setPage(1) }}
                clearable
                valueFormat="DD MMM YYYY"
              />
            </Group>
          </Stack>
        </Card>

        {/* Order List */}
        {loading ? (
          <Stack gap="sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={80} radius="md" />
            ))}
          </Stack>
        ) : orders.length === 0 ? (
          <Card withBorder p="xl" ta="center">
            <Text c="dimmed">No orders found</Text>
          </Card>
        ) : (
          <Stack gap="xs">
            {orders.map((order) => (
              <Card key={order.id} withBorder p="sm" component={Link} to={`/website/orders/${order.id}`}
                style={{ textDecoration: 'none', cursor: 'pointer' }}
                className="hover:bg-gray-50 transition-colors">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="sm" wrap="nowrap">
                      <Text fw={600} size="sm">#{order.invoiceNo}</Text>
                      <Badge color={statusColors[order.status]} variant="light" size="sm">
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge color={paymentStatusColors[order.paymentStatus]} variant="outline" size="sm">
                        {order.paymentStatus}
                      </Badge>
                      {order.channel && (
                        <Badge variant="dot" size="sm" color="gray">
                          {channelLabels[order.channel] || order.channel}
                        </Badge>
                      )}
                    </Group>
                    <Group gap="md" mt={4}>
                      <Text size="xs" c="dimmed">
                        {order.customer?.name || 'Guest'} {order.customer?.phone ? `• ${order.customer.phone}` : ''}
                      </Text>
                      <Text size="xs" c="dimmed">{order.itemCount} item(s)</Text>
                      <Text size="xs" c="dimmed">{new Date(order.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</Text>
                    </Group>
                  </div>
                  <Group gap="md" wrap="nowrap">
                    <div style={{ textAlign: 'right' }}>
                      <Text fw={700} size="sm">{formatCurrency(order.totalAmount)}</Text>
                      {!order.isPaid && (
                        <Text size="xs" c="red">Due: {formatCurrency(order.dueAmount)}</Text>
                      )}
                    </div>
                    <ActionIcon variant="subtle" color="blue">
                      <IconEye size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination total={totalPages} value={page} onChange={setPage} />
              </Group>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
