'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, TextInput, Select, Badge, Button,
  ActionIcon, Skeleton, Card, SimpleGrid, Tabs, Pagination, Checkbox,
} from '@mantine/core'
import { IconSearch, IconRefresh, IconEye, IconShoppingCart, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useDebouncedValue } from '@mantine/hooks'
import { DateInput } from '@mantine/dates'
import { Link, useNavigate } from 'react-router-dom'
import {
  formatCurrency, statusColors, statusLabels, paymentStatusColors, channelLabels,
  bulkUpdateOrderStatus, bulkSendToCourier,
  type WebsiteOrderStatus, type PaymentStatus, type OrderChannel,
} from '@/utils/websiteApi'
import { useWebsiteOrdersStore, type WebsiteOrderFilters } from '@/modules/website/stores/websiteOrdersStore'

export default function WebsiteOrdersPage() {
  const navigate = useNavigate()

  // Zustand store
  const {
    orders,
    stats,
    loading,
    totalPages,
    total,
    selectedOrders,
    deletingOrderId,
    bulkDeleting,
    fetchOrders,
    fetchStats,
    setSelectedOrders,
    clearSelection,
    selectAll,
    deleteOrder,
    bulkDeleteOrders,
  } = useWebsiteOrdersStore()

  // Local filter state
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<WebsiteOrderStatus | 'all'>('pending')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [channel, setChannel] = useState<OrderChannel | ''>('retail_web')
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)

  const [debouncedSearch] = useDebouncedValue(search, 500)

  const fetchOrdersData = useCallback(async () => {
    const filters: WebsiteOrderFilters = {
      search: debouncedSearch || undefined,
      status: (status && status !== 'all') ? status as WebsiteOrderStatus : undefined,
      paymentStatus: paymentStatus || undefined,
      channel: channel || undefined,
      fromDate: fromDate ? fromDate.toISOString().split('T')[0] : undefined,
      toDate: toDate ? toDate.toISOString().split('T')[0] : undefined,
      page,
      perPage,
    }
    await fetchOrders(filters)
  }, [debouncedSearch, status, paymentStatus, channel, fromDate, toDate, page, perPage, fetchOrders])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchOrdersData()
  }, [fetchOrdersData])

  // Handlers
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
                  clearSelection()
                  fetchOrdersData()
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
                    clearSelection()
                    fetchOrdersData()
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
    navigate(`/website/orders/print?ids=${orderIds.join(',')}`)
  }

  const handleSingleDelete = (orderId: number, invoiceNo: string) => {
    modals.openConfirmModal({
      title: 'Delete Order',
      children: (
        <Stack gap="sm">
          <Text>Are you sure you want to delete <b>order #{invoiceNo}</b>?</Text>
          <Text size="sm" c="dimmed">This action will soft delete the order. It can be recovered from the database if needed.</Text>
          <Text size="sm" c="orange">Note: Completed and cancelled orders cannot be deleted.</Text>
        </Stack>
      ),
      labels: { confirm: 'Delete Order', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteOrder(orderId, invoiceNo)
          notifications.show({ title: 'Success', message: `Order #${invoiceNo} deleted successfully`, color: 'green' })
        } catch (err: any) {
          const message = err?.response?.data?.message || 'Failed to delete order'
          notifications.show({ title: 'Error', message, color: 'red' })
        }
      },
    })
  }

  const handleBulkDelete = () => {
    if (selectedOrders.size === 0) return

    const orderIds = Array.from(selectedOrders)
    const total = orderIds.length

    modals.openConfirmModal({
      title: 'Delete Multiple Orders',
      children: (
        <Stack gap="sm">
          <Text>Are you sure you want to delete <b>{total} order(s)</b>?</Text>
          <Text size="sm" c="dimmed">This action will soft delete the selected orders.</Text>
          <Text size="sm" c="orange">Note: Completed and cancelled orders will be skipped and cannot be deleted.</Text>
        </Stack>
      ),
      labels: { confirm: 'Delete Orders', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          notifications.show({ title: 'Processing...', message: `Deleting ${total} order(s)...`, color: 'blue' })
          const result = await bulkDeleteOrders(orderIds)
          const successCount = result.data?.success_count || 0
          const skippedCount = result.data?.skipped_count || 0

          notifications.show({
            title: 'Complete',
            message: result.data?.message || `Deleted ${successCount} of ${total} orders${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}.`,
            color: successCount > 0 ? 'green' : 'yellow',
          })
        } catch (err: any) {
          const message = err?.response?.data?.message || 'Failed to delete orders'
          notifications.show({ title: 'Error', message, color: 'red' })
        }
      },
    })
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
          <Group gap="sm">
            {stats?.timestamp && (
              <Text size="xs" c="dimmed">
                Updated: {new Date(stats.timestamp).toLocaleTimeString()}
              </Text>
            )}
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => { fetchOrdersData(); fetchStats() }}>
              Refresh
            </Button>
          </Group>
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
              <Text size="xs" c="dimmed">In Transit</Text>
              <Text fw={700} size="lg" c="cyan">{stats.inTransit}</Text>
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
              <Tabs.Tab value="approved">Approved ({stats?.approved || 0})</Tabs.Tab>
              <Tabs.Tab value="sent_to_steadfast">Sent to SteadFast ({stats?.sentToSteadfast || 0})</Tabs.Tab>
              <Tabs.Tab value="in_review">In Review ({stats?.inReview || 0})</Tabs.Tab>
              <Tabs.Tab value="in_transit">In Transit ({stats?.inTransit || 0})</Tabs.Tab>
              <Tabs.Tab value="delivered">Delivered ({stats?.delivered || 0})</Tabs.Tab>
              <Tabs.Tab value="partial_delivered">Partial Delivered ({stats?.partialDelivered || 0})</Tabs.Tab>
              <Tabs.Tab value="delivery_failed_return">Delivery Failed & Return ({stats?.deliveryFailedReturn || 0})</Tabs.Tab>
              <Tabs.Tab value="return_received">Return Received ({stats?.returnReceived || 0})</Tabs.Tab>
              <Tabs.Tab value="refunded_completed">Refunded & Completed ({stats?.refundedCompleted || 0})</Tabs.Tab>
              <Tabs.Tab value="completed">Completed ({stats?.completed || 0})</Tabs.Tab>
              <Tabs.Tab value="cancelled">Cancelled ({stats?.cancelled || 0})</Tabs.Tab>
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
                onChange={(v) => { setFromDate(v as Date | null); setPage(1) }}
                clearable
                valueFormat="DD MMM YYYY"
              />
              <DateInput
                placeholder="To date"
                value={toDate}
                onChange={(v) => { setToDate(v as Date | null); setPage(1) }}
                clearable
                valueFormat="DD MMM YYYY"
              />
            </Group>
          </Stack>
        </Card>

        {/* Bulk Actions */}
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
                <Button
                  size="sm"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleBulkDelete}
                  loading={bulkDeleting}
                >
                  Delete
                </Button>
                <Button size="sm" variant="outline" color="gray" onClick={clearSelection}>
                  Clear
                </Button>
              </Group>
            </Group>
          </Card>
        )}

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
            {/* Select All Header */}
            {orders.length > 0 && (
              <Card withBorder p="sm" bg="gray.0">
                <Group gap="sm">
                  <Checkbox
                    checked={orders.length > 0 && orders.every(o => selectedOrders.has(o.id))}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        selectAll(orders.map(o => o.id))
                      } else {
                        clearSelection()
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
                    onChange={() => {
                      const newSet = new Set(selectedOrders)
                      if (newSet.has(order.id)) {
                        newSet.delete(order.id)
                      } else {
                        newSet.add(order.id)
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
                          {order.dueAmount > 0 && (
                            <Text size="xs" c="red">Due: {formatCurrency(order.dueAmount)}</Text>
                          )}
                        </div>
                      </Group>
                    </Group>
                  </Card>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      component={Link}
                      to={`/website/orders/${order.id}`}
                    >
                      <IconEye size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSingleDelete(order.id, order.invoiceNo)
                      }}
                      loading={deletingOrderId === order.id}
                      disabled={order.status === 'completed' || order.status === 'cancelled'}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
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
