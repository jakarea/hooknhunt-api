'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, TextInput, Select, Badge, Button,
  ActionIcon, NumberFormatter, Skeleton, Card, SimpleGrid, Tabs, Pagination, Checkbox, Textarea,
} from '@mantine/core'
import { IconSearch, IconRefresh, IconEye, IconShoppingCart } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useDebouncedValue } from '@mantine/hooks'
import { DateInput } from '@mantine/dates'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWebsiteOrders, getWebsiteOrderStats, formatCurrency,
  statusColors, statusLabels, paymentStatusColors, channelLabels,
  bulkUpdateOrderStatus, bulkSendToCourier,
  type WebsiteOrder, type WebsiteOrderFilters, type WebsiteOrderStats,
  type WebsiteOrderStatus, type PaymentStatus, type OrderChannel,
} from '@/utils/websiteApi'

export default function WebsiteOrdersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<WebsiteOrder[]>([])
  const [stats, setStats] = useState<WebsiteOrderStats | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<WebsiteOrderStatus | 'all'>('pending')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [channel, setChannel] = useState<OrderChannel | ''>('retail_web')
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const filters: WebsiteOrderFilters = {
        search: search || undefined,
        status: (status && status !== 'all') ? status as WebsiteOrderStatus : undefined,
        paymentStatus: paymentStatus || undefined,
        channel: channel || undefined,
        fromDate: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
        toDate: toDate ? toDate.toISOString().split('T')[0] : undefined,
        page,
        perPage,
      }
      const res = await getWebsiteOrders(filters)
      setOrders(res.data.data || [])
      setTotalPages(res.data.lastPage || 1)
      setTotal(res.data.total || 0)
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load orders', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [search, status, paymentStatus, channel, fromDate, toDate, page, perPage])

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

  // Bulk action handlers
  const handleBulkStatusChange = () => {
    if (selectedOrders.size === 0) return

    modals.open({
      title: 'Change Status for Multiple Orders',
      children: (
        <Stack>
          <Text>Change status for {selectedOrders.size} order(s)?</Text>
          <Select
            label="New Status"
            placeholder="Select status"
            data={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            defaultValue="processing"
          />
          <Textarea
            label="Comment (optional)"
            placeholder="Add a comment for this status change"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => modals.closeAll()}>Cancel</Button>
            <Button
              onClick={async () => {
                notifications.show({ title: 'Processing...', message: 'Updating order statuses...', color: 'blue' })
                try {
                  await bulkUpdateOrderStatus({
                    order_ids: Array.from(selectedOrders),
                    status: 'processing',
                  })
                  notifications.show({ title: 'Success', message: 'Statuses updated successfully', color: 'green' })
                  setSelectedOrders(new Set())
                  fetchOrders()
                  fetchStats()
                } catch {
                  notifications.show({ title: 'Error', message: 'Failed to update statuses', color: 'red' })
                }
                modals.closeAll()
              }}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      ),
    })
  }

  const handleBulkSendCourier = async () => {
    if (selectedOrders.size === 0) return

    const orderIds = Array.from(selectedOrders)
    const total = orderIds.length

    modals.open({
      title: 'Send to Steadfast Courier',
      children: (
        <Stack>
          <Text>Send {total} order(s) to Steadfast courier?</Text>
          <Text size="sm" c="dimmed">This will process {total} orders with a 0.5 second delay between each request.</Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => modals.closeAll()}>Cancel</Button>
            <Button
              onClick={async () => {
                notifications.show({ title: 'Processing...', message: `Sending ${total} orders to courier...`, color: 'blue' })
                try {
                  const result = await bulkSendToCourier(orderIds)
                  const successCount = result.data?.success_count || 0
                  notifications.show({
                    title: 'Complete',
                    message: `Successfully sent ${successCount} of ${total} orders to courier.`,
                    color: successCount === total ? 'green' : 'yellow',
                  })
                  if (successCount > 0) {
                    setSelectedOrders(new Set())
                    fetchOrders()
                    fetchStats()
                  }
                } catch {
                  notifications.show({ title: 'Error', message: 'Failed to send orders to courier', color: 'red' })
                }
                modals.closeAll()
              }}
            >
              Send to Courier
            </Button>
          </Group>
        </Stack>
      ),
    })
  }

  const handleBulkPrint = () => {
    if (selectedOrders.size === 0) return

    const orderIds = Array.from(selectedOrders)
    // Navigate to print page with order IDs
    navigate(`/website/orders/print?ids=${orderIds.join(',')}`)
  }

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

        {/* Status Tabs */}
        <Card withBorder p="xs">
          <Tabs value={status} onChange={(v) => { setStatus(v as WebsiteOrderStatus | 'all'); setPage(1) }}>
            <Tabs.List>
              <Tabs.Tab value="all">All ({stats?.total || 0})</Tabs.Tab>
              <Tabs.Tab value="pending">Pending ({stats?.pending || 0})</Tabs.Tab>
              <Tabs.Tab value="processing">Processing ({stats?.processing || 0})</Tabs.Tab>
              <Tabs.Tab value="shipped">Shipped ({stats?.shipped || 0})</Tabs.Tab>
              <Tabs.Tab value="cancelled">Cancelled ({stats?.cancelled || 0})</Tabs.Tab>
              <Tabs.Tab value="completed">Completed ({stats?.completed || 0})</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Card>

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
        {selectedOrders.size > 0 && (
          <Card withBorder p="sm" bg="blue.0">
            <Group justify="space-between">
              <Text fw={600}>{selectedOrders.size} order(s) selected</Text>
              <Group gap="sm">
                <Button size="sm" variant="light" onClick={handleBulkStatusChange}>
                  Change Status
                </Button>
                <Button size="sm" variant="light" onClick={handleBulkSendCourier}>
                  Send to Courier
                </Button>
                <Button size="sm" variant="light" onClick={handleBulkPrint}>
                  Print Invoices
                </Button>
                <Button size="sm" variant="outline" color="gray" onClick={() => setSelectedOrders(new Set())}>
                  Clear
                </Button>
              </Group>
            </Group>
          </Card>
        )}

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
            {/* Select All Header */}
            {orders.length > 0 && (
              <Card withBorder p="sm" bg="gray.0">
                <Group gap="sm">
                  <Checkbox
                    checked={orders.length > 0 && orders.every(o => selectedOrders.has(o.id))}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setSelectedOrders(new Set(orders.map(o => o.id)))
                      } else {
                        setSelectedOrders(new Set())
                      }
                    }}
                    label="Select All (current page)"
                  />
                </Group>
              </Card>
            )}

            {orders.map((order) => (
              <Card key={order.id} withBorder p="sm"
                style={{ backgroundColor: order.status === 'pending' ? '#fef2f2' : 'transparent' }}
                className="hover:bg-gray-50 transition-colors">
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedOrders)
                      if (e.currentTarget.checked) {
                        newSet.add(order.id)
                      } else {
                        newSet.delete(order.id)
                      }
                      setSelectedOrders(newSet)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Card component={Link} to={`/website/orders/${order.id}`}
                    p={0}
                    style={{ textDecoration: 'none', flex: 1, cursor: 'pointer', backgroundColor: 'transparent' }}
                    className="hover:bg-transparent"
                  >
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
                </Group>
              </Card>
            ))}

            {totalPages > 0 && (
              <Group justify="space-between" align="center" mt="md">
                <Text size="sm" c="dimmed">
                  Showing {orders.length > 0 ? (page - 1) * perPage + 1 : 0}-{Math.min(page * perPage, total)} of {total} orders
                </Text>
                <Group gap="sm">
                  <Text size="sm" c="dimmed">Per page:</Text>
                  <Select
                    data={[20, 50, 100, 500].map(n => ({ value: String(n), label: String(n) }))}
                    value={String(perPage)}
                    onChange={(v) => { setPerPage(Number(v)); setPage(1) }}
                    w={80}
                    size="sm"
                  />
                  <Pagination total={totalPages} value={page} onChange={setPage} />
                </Group>
              </Group>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
