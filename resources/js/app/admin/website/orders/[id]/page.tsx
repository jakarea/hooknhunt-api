'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box, Stack, Group, Title, Text, Badge, Button, Card, SimpleGrid, Grid,
  Select, NumberInput, Divider, Table, ActionIcon, Skeleton, TextInput,
  Image, Drawer, LoadingOverlay, Textarea, Progress, Anchor,
} from '@mantine/core'
import {
  IconArrowLeft, IconPackage, IconUser, IconCreditCard,
  IconMapPin, IconClock, IconShoppingCart, IconTruckDelivery, IconExternalLink,
  IconTrash, IconPlus, IconSearch, IconReplace, IconChevronDown,
  IconMessage, IconSend, IconPrinter,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getWebsiteOrder, updateWebsiteOrderStatus, updateWebsiteOrderPayment,
  updateWebsiteOrder,
  addWebsiteOrderItem, updateWebsiteOrderItem, removeWebsiteOrderItem,
  searchProductVariants, getProductVariants,
  searchProducts, getTopSellingProducts,
  sendOrderSms,
  formatCurrency, statusColors, statusLabels, paymentStatusColors, decodeHtmlEntities,
  type WebsiteOrderDetail, type WebsiteOrderStatus, type PaymentStatus,
  type ProductVariantSearchResult,
  type ProductSearchResult,
} from '@/utils/websiteApi'
import { useCourierStore } from '@/stores/courierStore'

type OrderData = WebsiteOrderDetail & {
  channel?: string
  allowedNextStatuses?: WebsiteOrderStatus[]
  isEditable?: boolean
  canSendToCourier?: boolean
}

function getProcessingTime(createdAt: string, status: string): string {
  const start = new Date(createdAt)
  const end = status === 'completed' || status === 'cancelled'
    ? new Date()
    : new Date()
  const diffMs = end.getTime() - start.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

export default function WebsiteOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountValue, setDiscountValue] = useState(0)
  const [savingDiscount, setSavingDiscount] = useState(false)
  const discountInputRef = useRef<HTMLInputElement>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [savingItemId, setSavingItemId] = useState<number | null>(null)
  const [removingItemId, setRemovingItemId] = useState<number | null>(null)
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState('')
  const [addSearchResults, setAddSearchResults] = useState<ProductSearchResult[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null)
  const [expandedVariants, setExpandedVariants] = useState<ProductVariantSearchResult[]>([])
  const [loadingExpanded, setLoadingExpanded] = useState(false)
  const [addingVariantId, setAddingVariantId] = useState<number | null>(null)
  const [addQtyMap, setAddQtyMap] = useState<Record<number, number>>({})
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const [changeVariantDrawerOpen, setChangeVariantDrawerOpen] = useState(false)
  const [changingItemId, setChangingItemId] = useState<number | null>(null)
  const [currentVariantId, setCurrentVariantId] = useState<number | null>(null)
  const [productVariants, setProductVariants] = useState<ProductVariantSearchResult[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [changingVariantId, setChangingVariantId] = useState<number | null>(null)
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await getWebsiteOrder(Number(id))
      setOrder(res.data)
      setSelectedStatus(null)
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load order', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const appendChangeNote = async () => {
    const noteToSave = changeNote.trim()
    if (!noteToSave) return
    setChangeNote('')
    try {
      const res = await updateWebsiteOrder(Number(id), { append_note: noteToSave })
      if (res.data) setOrder(res.data)
    } catch {
      // silent — note append failure shouldn't block the main action
    }
  }

  const handleSaveNote = async () => {
    if (!changeNote.trim()) return
    try {
      setSavingNote(true)
      await appendChangeNote()
      notifications.show({ title: 'Saved', message: 'Note added', color: 'green' })
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to save note', color: 'red' })
    } finally {
      setSavingNote(false)
    }
  }

  const handleStatusUpdate = () => {
    if (!selectedStatus || !order) return

    modals.openConfirmModal({
      title: `Change status to ${statusLabels[selectedStatus as WebsiteOrderStatus] || selectedStatus}?`,
      children: (
        <Text size="sm">
          Order #{order.invoiceNo} status will be changed from{' '}
          <b>{statusLabels[order.status] || order.status}</b> to{' '}
          <b>{statusLabels[selectedStatus as WebsiteOrderStatus] || selectedStatus}</b>.
        </Text>
      ),
      labels: { confirm: 'Confirm', cancel: 'Cancel' },
      confirmProps: { color: selectedStatus === 'cancelled' ? 'red' : 'blue' },
      onConfirm: async () => {
        try {
          const res = await updateWebsiteOrderStatus(Number(id), {
            status: selectedStatus as WebsiteOrderStatus,
            comment: changeNote || undefined,
          })
          setOrder(res.data)
          setSelectedStatus(null)
          await appendChangeNote()
          notifications.show({ title: 'Success', message: `Status updated to ${statusLabels[selectedStatus as WebsiteOrderStatus] || selectedStatus}`, color: 'green' })
        } catch (err: any) {
          notifications.show({
            title: 'Error',
            message: err?.response?.data?.message || 'Failed to update status',
            color: 'red',
          })
        }
      },
    })
  }

  const handlePaymentUpdate = () => {
    if (!order) return

    let tempPaymentStatus = order.paymentStatus
    let tempPaidAmount = order.paidAmount

    modals.openConfirmModal({
      title: 'Update Payment',
      children: (
        <Stack>
          <Select
            label="Payment Status"
            data={[
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'partial', label: 'Partial' },
              { value: 'paid', label: 'Paid' },
            ]}
            defaultValue={order.paymentStatus}
            onChange={(v) => { tempPaymentStatus = (v || 'unpaid') as PaymentStatus }}
          />
          <NumberInput
            label="Paid Amount"
            defaultValue={order.paidAmount || 0}
            min={0}
            max={order.totalAmount || 999999}
            onChange={(v) => { tempPaidAmount = Number(v) || 0 }}
          />
        </Stack>
      ),
      labels: { confirm: 'Update', cancel: 'Cancel' },
      onConfirm: async () => {
        try {
          const res = await updateWebsiteOrderPayment(Number(id), {
            paymentStatus: tempPaymentStatus,
            paidAmount: tempPaidAmount,
          })
          setOrder(res.data)
          await appendChangeNote()
          notifications.show({ title: 'Success', message: 'Payment updated', color: 'green' })
        } catch {
          notifications.show({ title: 'Error', message: 'Failed to update payment', color: 'red' })
        }
      },
    })
  }

  const handleSendToCourier = () => {
    if (!order) return
    modals.openConfirmModal({
      title: 'Send to Steadfast Courier?',
      children: (
        <Text size="sm">
          Order #{order.invoiceNo} will be sent to Steadfast for delivery.
          <br />Amount: <b>{formatCurrency(order.dueAmount > 0 ? order.dueAmount : 0)}</b> (COD)
        </Text>
      ),
      labels: { confirm: 'Send', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: async () => {
        const res = await useCourierStore.getState().sendToCourier(Number(id))
        if (res.success) {
          setOrder(res.data)
          await appendChangeNote()
          notifications.show({ title: 'Success', message: 'Order sent to Steadfast', color: 'green' })
        } else {
          notifications.show({ title: 'Error', message: res.message || 'Failed to send', color: 'red' })
        }
      },
    })
  }

  const handleSyncCourier = async () => {
    const res = await useCourierStore.getState().syncStatus(Number(id))
    if (res.success) {
      setOrder(res.data)
      notifications.show({ title: 'Synced', message: 'Courier status updated', color: 'green' })
    } else {
      notifications.show({ title: 'Error', message: res.message || 'Sync failed', color: 'red' })
    }
  }

  const handleSendSms = async () => {
    if (!smsMessage.trim() || !id) return
    try {
      setSendingSms(true)
      const res = await sendOrderSms(Number(id), smsMessage.trim())
      if (res.success) {
        notifications.show({ title: 'SMS Sent', message: 'Message sent to customer', color: 'green' })
        setSmsMessage('')
        fetchOrder()
      } else {
        notifications.show({ title: 'Error', message: res.message || 'Failed to send SMS', color: 'red' })
      }
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to send SMS', color: 'red' })
    } finally {
      setSendingSms(false)
    }
  }

  const handleStartEditDiscount = () => {
    setDiscountValue(order?.discountAmount || 0)
    setEditingDiscount(true)
    setTimeout(() => discountInputRef.current?.select(), 0)
  }

  const handleApplyDiscount = async () => {
    if (!order) return
    const newDiscount = Math.max(0, Math.min(discountValue, order.subTotal))
    setEditingDiscount(false)

    if (newDiscount === order.discountAmount) return

    try {
      setSavingDiscount(true)
      const res = await updateWebsiteOrder(Number(id), { discount_amount: newDiscount })
      if (res.data) {
        setOrder(res.data)
        await appendChangeNote()
        notifications.show({ title: 'Discount updated', message: `Discount set to ${formatCurrency(newDiscount)}`, color: 'green' })
      }
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to update discount', color: 'red' })
    } finally {
      setSavingDiscount(false)
    }
  }

  useEffect(() => {
    if (editingDiscount && discountInputRef.current) {
      discountInputRef.current.focus()
      discountInputRef.current.select()
    }
  }, [editingDiscount])

  // ---- Item Management Handlers ----

  const handleStartEditQty = (itemId: number, currentQty: number) => {
    setEditingItemId(itemId)
    setEditQty(currentQty)
    setTimeout(() => qtyInputRef.current?.select(), 0)
  }

  const handleSaveQty = async () => {
    if (!order || editingItemId == null) return
    const item = order.items?.find(i => i.id === editingItemId)
    if (!item || editQty === item.quantity) { setEditingItemId(null); return }
    if (editQty < 1) { setEditingItemId(null); return }

    try {
      setSavingItemId(editingItemId)
      const res = await updateWebsiteOrderItem(Number(id), editingItemId, { quantity: editQty })
      if (res.success !== false) {
        setOrder(res.data || res)
        await appendChangeNote()
        notifications.show({ title: 'Updated', message: 'Quantity updated', color: 'green' })
      }
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to update', color: 'red' })
    } finally {
      setSavingItemId(null)
      setEditingItemId(null)
    }
  }

  const handleRemoveItem = (itemId: number, itemName: string) => {
    modals.openConfirmModal({
      title: 'Remove item?',
      children: <Text size="sm">Remove <b>{itemName}</b> from this order?</Text>,
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          setRemovingItemId(itemId)
          const res = await removeWebsiteOrderItem(Number(id), itemId)
          if (res.success !== false) {
            setOrder(res.data || res)
            await appendChangeNote()
            notifications.show({ title: 'Removed', message: `${itemName} removed`, color: 'green' })
          }
        } catch (err: any) {
          notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to remove', color: 'red' })
        } finally {
          setRemovingItemId(null)
        }
      },
    })
  }

  const loadTopSelling = useCallback(async () => {
    try {
      setAddSearching(true)
      const res = await getTopSellingProducts()
      setAddSearchResults(res.data || [])
    } catch {
      setAddSearchResults([])
    } finally {
      setAddSearching(false)
    }
  }, [])

  const handleAddSearch = useCallback(async (query: string) => {
    setAddSearchQuery(query)
    setExpandedProductId(null)
    if (query.length < 2) {
      loadTopSelling()
      return
    }
    try {
      setAddSearching(true)
      const res = await searchProducts(query)
      setAddSearchResults(res.data || [])
    } catch {
      setAddSearchResults([])
    } finally {
      setAddSearching(false)
    }
  }, [loadTopSelling])

  const handleExpandProduct = async (productId: number) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null)
      setExpandedVariants([])
      return
    }
    setExpandedProductId(productId)
    setExpandedVariants([])
    setLoadingExpanded(true)
    try {
      const res = await getProductVariants(productId)
      setExpandedVariants(res.data || [])
    } catch {
      setExpandedVariants([])
    } finally {
      setLoadingExpanded(false)
    }
  }

  const handleAddItem = async (variantId: number, qty: number) => {
    try {
      setAddingVariantId(variantId)
      const res = await addWebsiteOrderItem(Number(id), {
        product_variant_id: variantId,
        quantity: qty,
      })
      if (res.success !== false) {
        setOrder(res.data || res)
        await appendChangeNote()
        notifications.show({ title: 'Added', message: 'Item added to order', color: 'green' })
        setAddDrawerOpen(false)
        setAddSearchQuery('')
        setAddSearchResults([])
        setAddQtyMap({})
        setExpandedProductId(null)
        setExpandedVariants([])
      }
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to add item', color: 'red' })
    } finally {
      setAddingVariantId(null)
    }
  }

  const handleOpenChangeVariant = async (itemId: number, productId: number | null, variantId: number) => {
    if (!productId) return
    setChangingItemId(itemId)
    setCurrentVariantId(variantId)
    setChangeVariantDrawerOpen(true)
    setLoadingVariants(true)
    setProductVariants([])
    try {
      const res = await getProductVariants(productId)
      setProductVariants(res.data || [])
    } catch {
      setProductVariants([])
    } finally {
      setLoadingVariants(false)
    }
  }

  const handleChangeVariant = async (newVariantId: number) => {
    if (!order || changingItemId == null) return
    try {
      setChangingVariantId(newVariantId)
      const res = await updateWebsiteOrderItem(Number(id), changingItemId, { product_variant_id: newVariantId })
      if (res.success !== false) {
        setOrder(res.data || res)
        setChangeVariantDrawerOpen(false)
        setChangingItemId(null)
        await appendChangeNote()
        notifications.show({ title: 'Updated', message: 'Variant changed successfully', color: 'green' })
      }
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to change variant', color: 'red' })
    } finally {
      setChangingVariantId(null)
    }
  }

  const isItemEditable = order?.isEditable && !['shipped', 'delivered', 'completed', 'cancelled'].includes(order?.status)
  const isSending = useCourierStore((state) => state.isSending(Number(id)))
  const isSyncing = useCourierStore((state) => state.isSyncing(Number(id)))

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} />
          <Skeleton height={200} />
          <Skeleton height={300} />
        </Stack>
      </Box>
    )
  }

  if (!order) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Card withBorder p="xl" ta="center">
          <Text>Order not found</Text>
          <Button mt="md" onClick={() => navigate('/website/orders')}>Back to Orders</Button>
        </Card>
      </Box>
    )
  }

  const allStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }))

  const orderDate = new Date(order.timestamps?.createdAt || (order as any).createdAt)
  const customerSummary = (order.customerInfo as any)?.summary
  const shipping = order.shipping
  const totalWeight = order.items?.reduce((sum, item) => sum + ((item.variantWeight || 0) * item.quantity), 0) || 0
  const totalProfit = order.items?.reduce((sum, item) => sum + (item.profit || 0), 0) || 0

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ActionIcon variant="subtle" onClick={() => navigate('/website/orders')}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="sm" wrap="nowrap">
                <Title order={2} className="text-lg md:text-xl">#{order.invoiceNo}</Title>
                <Badge color={statusColors[order.status] || 'gray'} variant="light" size="lg">
                  {statusLabels[order.status] || order.status}
                </Badge>
                <Badge color={paymentStatusColors[order.paymentStatus]} variant="outline" size="lg">
                  {order.paymentStatus}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {(order as any).channel || ''} • {orderDate.toLocaleString()}
              </Text>
            </div>
          </Group>
          <Button
            size="sm"
            variant="light"
            leftSection={<IconPrinter size={16} />}
            onClick={() => setPrintDialogOpen(true)}
          >
            Print Invoice
          </Button>
        </Group>

        {/* Status Update Card */}
        <Card withBorder p="md">
          <Group justify="space-between" wrap="wrap">
            <div>
              <Title order={4} size="sm" mb={4}>Update Status</Title>
              <Group gap="xs">
                <IconClock size={14} color="gray" />
                <Text size="xs" c="dimmed">
                  Placed: {orderDate.toLocaleDateString()} •
                  Processing: <Text span fw={600} c={order.status === 'completed' || order.status === 'cancelled' ? 'dimmed' : 'orange'}>
                    {getProcessingTime(orderDate.toISOString(), order.status)}
                  </Text>
                  {order.status !== 'completed' && order.status !== 'cancelled' && ' (ongoing)'}
                </Text>
              </Group>
            </div>
          </Group>
          <Group align="flex-end" gap="sm" wrap="wrap" mt="sm">
            <Select
              label="Status"
              data={allStatusOptions}
              value={selectedStatus || order.status}
              onChange={setSelectedStatus}
              searchable={false}
              style={{ minWidth: 200 }}
            />
            <Button
              size="sm"
              disabled={!selectedStatus || selectedStatus === order.status}
              color={selectedStatus === 'cancelled' ? 'red' : 'blue'}
              onClick={handleStatusUpdate}
            >
              Update
            </Button>
            <Button size="sm" variant="outline" leftSection={<IconCreditCard size={14} />} onClick={handlePaymentUpdate}>
              Payment
            </Button>
          </Group>
          <Group align="flex-end" gap="xs" mt="sm">
            <Textarea
              placeholder="Add a note (e.g. customer called to change variant, special discount given)..."
              value={changeNote}
              onChange={(e) => setChangeNote(e.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={4}
              style={{ flex: 1 }}
            />
            <Button
              size="sm"
              variant="light"
              loading={savingNote}
              disabled={!changeNote.trim()}
              onClick={handleSaveNote}
            >
              Save Note
            </Button>
          </Group>
        </Card>

        {/* Timeline & Notes + SMS */}
        <Grid gutter="md" columns={10}>
          {/* Timeline & Notes — 80% */}
          <Grid.Col span={{ base: 10, md: 8 }}>
            <Card withBorder p="md" h="100%">
              <Title order={4} size="sm" mb="sm">Timeline &amp; Notes</Title>
              <Stack gap="xs">
                {order.statusHistory && order.statusHistory.length > 0 && order.statusHistory.map((h: any, i: number) => (
                  <Group key={h.id || i} gap="sm" wrap="nowrap">
                    <Badge size="xs" variant="dot" color={statusColors[h.toStatus] || 'gray'}>
                      {statusLabels[h.toStatus] || h.toStatus}
                    </Badge>
                    {h.fromStatus && (
                      <Text size="xs" c="dimmed">from {statusLabels[h.fromStatus] || h.fromStatus}</Text>
                    )}
                    {h.comment && <Text size="xs" c="dimmed">— {h.comment}</Text>}
                    {h.changedBy && <Text size="xs" c="dimmed">by {h.changedBy}</Text>}
                    <Text size="xs" c="dimmed">{new Date(h.createdAt).toLocaleString()}</Text>
                  </Group>
                ))}
                {order.note && (() => {
                  const notes = order.note.split(/,\s*(?=[A-Za-z0-9])/).filter((n: string) => n.trim())
                  return notes.length > 0 && (
                    <>
                      {(order.statusHistory && order.statusHistory.length > 0) && <Divider my={4} />}
                      <Text size="xs" fw={600} c="dimmed" mb={4}>NOTES</Text>
                      {notes.map((n: string, i: number) => (
                        <Group key={i} gap="sm" wrap="nowrap">
                          <Badge size="xs" variant="outline" color="violet">Note</Badge>
                          <Text size="xs">{n.trim()}</Text>
                        </Group>
                      ))}
                    </>
                  )
                })()}
                {(!order.statusHistory || order.statusHistory.length === 0) && !order.note && (
                  <Text size="xs" c="dimmed" ta="center">No activity yet</Text>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          {/* Send SMS — 20% */}
          <Grid.Col span={{ base: 10, md: 2 }}>
            <Card withBorder p="md" h="100%">
              <Group gap="xs" mb="sm">
                <IconMessage size={16} />
                <Title order={4} size="sm">Send SMS</Title>
              </Group>
              <Text size="xs" c="dimmed" mb="xs">
                To: <Text span fw={500}>{order.customerInfo?.phone || (order as any).customer?.phone || 'N/A'}</Text>
              </Text>
              <Stack gap="xs">
                <Textarea
                  placeholder="Type your message..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.currentTarget.value)}
                  minRows={4}
                  maxRows={6}
                  maxLength={160}
                />
                <Group justify="space-between" gap="xs">
                  <Text
                    size="xs"
                    c={smsMessage.length >= 150 ? 'red' : 'dimmed'}
                    fw={smsMessage.length >= 150 ? 600 : 400}
                  >
                    {smsMessage.length}/160
                  </Text>
                  <Button
                    size="xs"
                    leftSection={<IconSend size={12} />}
                    loading={sendingSms}
                    disabled={!smsMessage.trim() || smsMessage.length > 160}
                    onClick={handleSendSms}
                  >
                    Send
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {/* Order Summary */}
          <Card withBorder p="md">
            <Text fw={600} size="sm" mb="xs">Order Summary</Text>
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Subtotal</Text>
                <Text size="xs">{formatCurrency(order.subTotal)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Discount {order.discountAmount > 0 && order.subTotal > 0 && (
                    <Text span c="red" size="xs">({((order.discountAmount / order.subTotal) * 100).toFixed(1)}%)</Text>
                  )}
                </Text>
                {editingDiscount ? (
                  <TextInput
                    ref={discountInputRef}
                    type="number"
                    size="xs"
                    w={90}
                    min={0}
                    max={order.subTotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.currentTarget.value) || 0)}
                    onBlur={handleApplyDiscount}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyDiscount()
                      if (e.key === 'Escape') { setEditingDiscount(false); setDiscountValue(order.discountAmount) }
                    }}
                    disabled={savingDiscount}
                    styles={{ input: { textAlign: 'right', height: 24, fontSize: 12, paddingRight: 4 } }}
                  />
                ) : (
                  <Text
                    size="xs"
                    c={order.discountAmount > 0 ? 'red' : 'dimmed'}
                    style={{ cursor: 'pointer', borderBottom: '1px dashed var(--mantine-color-gray-4)' }}
                    onClick={handleStartEditDiscount}
                  >
                    {order.discountAmount > 0 ? `-${formatCurrency(order.discountAmount)}` : '0 (click to set)'}
                  </Text>
                )}
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Delivery</Text>
                <Text size="xs">{formatCurrency(order.deliveryCharge)}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text fw={700} size="sm">Total</Text>
                <Text fw={700} size="sm">{formatCurrency(order.totalAmount)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Paid</Text>
                <Text size="xs" c="green">{formatCurrency(order.paidAmount)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Due</Text>
                <Text size="xs" c={order.dueAmount > 0 ? 'red' : 'dimmed'}>{formatCurrency(order.dueAmount)}</Text>
              </Group>
              {totalWeight > 0 && (
                <Group justify="space-between" px="xs" py={4} style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 4 }}>
                  <Text size="xs" c="dimmed" fw={500}>Weight</Text>
                  <Text size="xs" fw={600}>{totalWeight}g</Text>
                </Group>
              )}
              {totalProfit !== undefined && (
                <Group justify="space-between" px="xs" py={4} style={{ backgroundColor: totalProfit >= 0 ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)', borderRadius: 4 }}>
                  <Text size="xs" fw={500} c={totalProfit >= 0 ? 'green.8' : 'red.8'}>Profit</Text>
                  <Text size="xs" fw={700} c={totalProfit >= 0 ? 'green.8' : 'red.8'}>{formatCurrency(totalProfit)}</Text>
                </Group>
              )}
            </Stack>
          </Card>

          {/* Customer Summary */}
          <Card withBorder p="md">
            <Group justify="space-between" align="flex-start">
              <Text fw={600} size="sm">Customer</Text>
              <Group gap="xs">
                {customerSummary && (
                  <Badge
                    size="lg"
                    variant="light"
                    color={customerSummary.rating >= 4 ? 'green' : customerSummary.rating >= 2.5 ? 'yellow' : 'red'}
                    style={{ minWidth: 42, justifyContent: 'center' }}
                  >
                    {customerSummary.rating}/5
                  </Badge>
                )}
                {order.customerInfo?.id && (
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="blue"
                    component={Link}
                    to={`/crm/customers/${order.customerInfo.id}`}
                    aria-label="View Customer Profile"
                  >
                    <IconExternalLink size={14} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
            {(order.customerInfo || (order as any).customer) ? (
              <Stack gap={4} mt="xs">
                <Group gap="xs">
                  <IconUser size={14} />
                  <Text size="sm" fw={500}>{order.customerInfo?.name || (order as any).customer?.name || 'N/A'}</Text>
                  {order.customerInfo?.type && (
                    <Badge size="xs" variant="light" color={order.customerInfo.type === 'wholesale' ? 'violet' : 'blue'}>
                      {order.customerInfo.type}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">Phone: <a href={`https://wa.me/${(order.customerInfo?.phone || (order as any).customer?.phone || '').replace(/^0/, '880')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-green-6)' }}>{order.customerInfo?.phone || (order as any).customer?.phone || 'N/A'}</a></Text>
                {order.customerInfo?.email && <Text size="xs" c="dimmed">Email: {order.customerInfo.email}</Text>}
                <Divider my={4} />
                {customerSummary && (
                  <>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Total Orders</Text>
                      <Text size="xs" fw={500}>{customerSummary.totalOrders}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Completed</Text>
                      <Text size="xs" c="green" fw={500}>{customerSummary.completedOrders}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Cancelled</Text>
                      <Text size="xs" c={customerSummary.canceledOrders > 0 ? 'red' : 'dimmed'} fw={500}>{customerSummary.canceledOrders}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Total Spent</Text>
                      <Text size="xs" fw={500}>{formatCurrency(customerSummary.totalSpent)}</Text>
                    </Group>
                  </>
                )}
                {order.customerInfo?.id && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconUser size={14} />}
                    component={Link}
                    to={`/crm/customers/${order.customerInfo.id}`}
                    mt="xs"
                  >
                    View Customer Profile
                  </Button>
                )}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">Guest order</Text>
            )}
          </Card>

          {/* Shipping Address */}
          <Card withBorder p="md">
            <Text fw={600} size="sm" mb="xs">Shipping Address</Text>
            <Stack gap={4}>
              {shipping && (shipping.address || shipping.division) ? (
                <>
                  <Group gap="xs">
                    <IconMapPin size={14} color="gray" />
                    <Text size="xs" fw={500}>Delivery Address</Text>
                  </Group>
                  {shipping.address && <Text size="xs">{shipping.address}</Text>}
                  <Text size="xs" c="dimmed">
                    {[shipping.thana, shipping.district, shipping.division].filter(Boolean).join(', ')}
                  </Text>
                </>
              ) : (
                <Text size="xs" c="dimmed">No shipping address</Text>
              )}
              {(order as any).sentToCourier ? (
                <>
                  <Divider my={4} />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Courier</Text>
                    <Badge size="xs" color="green">Steadfast</Badge>
                  </Group>
                  {order.trackingCode && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Tracking</Text>
                      <Text size="xs">{order.trackingCode}</Text>
                    </Group>
                  )}
                  {order.consignmentId && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Consignment</Text>
                      <Text size="xs">{order.consignmentId}</Text>
                    </Group>
                  )}
                  {(order as any).deliveryStatus && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">Delivery</Text>
                      <Badge size="xs" variant="light">{(order as any).deliveryStatus}</Badge>
                    </Group>
                  )}
                  <Group gap="xs" mt={4}>
                    <Button
                      size="xs"
                      variant="outline"
                      leftSection={<IconExternalLink size={12} />}
                      component="a"
                      href={order.trackingLink || `https://steadfast.com.bd/tl/${order.trackingCode}`}
                      target="_blank"
                    >
                      Track Order
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      loading={isSyncing}
                      onClick={handleSyncCourier}
                    >
                      Sync Status
                    </Button>
                  </Group>
                </>
              ) : (
                <>
                  <Divider my={4} />
                  <Button
                    size="xs"
                    color="blue"
                    fullWidth
                    leftSection={<IconTruckDelivery size={14} />}
                    loading={isSending}
                    onClick={handleSendToCourier}
                  >
                    Send to Steadfast
                  </Button>
                </>
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Items */}
        <Card withBorder p="md" style={{ position: 'relative' }}>
          <Group justify="space-between" mb="sm">
            <Text fw={600} size="sm">Items ({order.items?.length || 0})</Text>
            {isItemEditable && (
              <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => { setAddDrawerOpen(true); loadTopSelling() }}>
                Add Item
              </Button>
            )}
          </Group>
          <div className="hidden md:block">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Variant</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Weight</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Total</Table.Th>
                  {isItemEditable && <Table.Th></Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {order.items?.map((item) => (
                  <Table.Tr key={item.id} style={removingItemId === item.id ? { opacity: 0.5 } : undefined}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        {item.thumbnail ? (
                          <Image src={item.thumbnail} alt={decodeHtmlEntities(item.productName)} w={40} h={40} radius={4} fit="contain" bg="gray.0" />
                        ) : (
                          <Box w={40} h={40} bg="gray.1" style={{ borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconPackage size={18} color="gray" />
                          </Box>
                        )}
                        <div>
                          <Anchor
                            href={`https://hooknhunt.com/products/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            fw={500}
                          >
                            {decodeHtmlEntities(item.productName)}
                          </Anchor>
                          <br />
                          {item.wholesaleName && (
                            <Anchor
                              component={Link}
                              to={`/catalog/products/${item.productId}`}
                              size="xs"
                              c="blue"
                            >
                              {decodeHtmlEntities(item.wholesaleName)}
                            </Anchor>
                          )}
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="xs">{decodeHtmlEntities(item.variantName)}</Text>
                        {isItemEditable && (
                          <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => handleOpenChangeVariant(item.id, item.productId, item.productVariantId)}>
                            <IconReplace size={12} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="xs">{item.sku || '-'}</Text></Table.Td>
                    <Table.Td>
                      {editingItemId === item.id ? (
                        <TextInput
                          ref={qtyInputRef}
                          type="number"
                          size="xs"
                          w={60}
                          min={1}
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.currentTarget.value) || 1)}
                          onBlur={handleSaveQty}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveQty()
                            if (e.key === 'Escape') setEditingItemId(null)
                          }}
                          disabled={savingItemId === item.id}
                          styles={{ input: { textAlign: 'center', height: 28 } }}
                        />
                      ) : (
                        <Text
                          size="sm"
                          style={isItemEditable ? { cursor: 'pointer', borderBottom: '1px dashed var(--mantine-color-gray-4)' } : undefined}
                          onClick={() => isItemEditable && handleStartEditQty(item.id, item.quantity)}
                        >
                          {item.quantity}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td><Text size="xs">{item.variantWeight || 0}g</Text></Table.Td>
                    <Table.Td>
                      {(item.originalPrice && item.originalPrice > item.unitPrice) ? (
                        <Group gap={4} wrap="nowrap">
                          <Text size="sm" c="red" fw={500}>{formatCurrency(item.unitPrice)}</Text>
                          <Text size="xs" td="line-through" c="dimmed">{formatCurrency(item.originalPrice)}</Text>
                        </Group>
                      ) : (
                        <Text size="sm">{formatCurrency(item.unitPrice)}</Text>
                      )}
                    </Table.Td>
                    <Table.Td><Text size="sm" fw={500}>{formatCurrency(item.totalPrice)}</Text></Table.Td>
                    {isItemEditable && (
                      <Table.Td>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          loading={removingItemId === item.id}
                          disabled={removingItemId != null}
                          onClick={() => handleRemoveItem(item.id, item.productName)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
          <div className="block md:hidden">
            <Stack gap="sm">
              {order.items?.map((item) => (
                <Card key={item.id} withBorder p="sm" radius="sm" style={removingItemId === item.id ? { opacity: 0.5 } : undefined}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={decodeHtmlEntities(item.productName)} w={36} h={36} radius={4} fit="contain" bg="gray.0" />
                      ) : (
                        <Box w={36} h={36} bg="gray.1" style={{ borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconPackage size={16} color="gray" />
                        </Box>
                      )}
                      <div>
                        <Anchor
                          href={`https://hooknhunt.com/products/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          fw={500}
                        >
                          {decodeHtmlEntities(item.productName)}
                        </Anchor>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="xs" c="dimmed">{decodeHtmlEntities(item.variantName)}</Text>
                          {isItemEditable && (
                            <ActionIcon size="xs" variant="subtle" color="blue" onClick={() => handleOpenChangeVariant(item.id, item.productId, item.productVariantId)}>
                              <IconReplace size={12} />
                            </ActionIcon>
                          )}
                        </Group>
                        {item.wholesaleName && (
                          <Anchor
                            component={Link}
                            to={`/catalog/products/${item.productId}`}
                            size="xs"
                            c="blue"
                          >
                            {decodeHtmlEntities(item.wholesaleName)}
                          </Anchor>
                        )}
                      </div>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500}>{formatCurrency(item.totalPrice)}</Text>
                        {editingItemId === item.id ? (
                          <TextInput
                            type="number"
                            size="xs"
                            w={60}
                            min={1}
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.currentTarget.value) || 1)}
                            onBlur={handleSaveQty}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQty()
                              if (e.key === 'Escape') setEditingItemId(null)
                            }}
                            styles={{ input: { textAlign: 'center', height: 24 } }}
                          />
                        ) : (
                          <Text
                            size="xs"
                            c="dimmed"
                            style={isItemEditable ? { cursor: 'pointer', borderBottom: '1px dashed var(--mantine-color-gray-4)' } : undefined}
                            onClick={() => isItemEditable && handleStartEditQty(item.id, item.quantity)}
                          >
                            {item.quantity} x {(item.originalPrice && item.originalPrice > item.unitPrice) ? (
                              <span>
                                <span style={{ color: '#fa5252' }}>{formatCurrency(item.unitPrice)}</span>
                                <span style={{ textDecoration: 'line-through', marginLeft: 4, color: '#999' }}>{formatCurrency(item.originalPrice)}</span>
                              </span>
                            ) : formatCurrency(item.unitPrice)}
                          </Text>
                        )}
                      </div>
                      {isItemEditable && (
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          loading={removingItemId === item.id}
                          onClick={() => handleRemoveItem(item.id, item.productName)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </div>
        </Card>

        {/* Add Item Drawer */}
        <Drawer
          opened={addDrawerOpen}
          onClose={() => { setAddDrawerOpen(false); setAddSearchQuery(''); setAddSearchResults([]); setAddQtyMap({}); setExpandedProductId(null); setExpandedVariants([]) }}
          title="Add Item"
          position="right"
          size="md"
        >
          <Stack gap="sm">
            <TextInput
              placeholder="Search by product name..."
              leftSection={<IconSearch size={16} />}
              value={addSearchQuery}
              onChange={(e) => handleAddSearch(e.currentTarget.value)}
              autoFocus
            />
            {addSearching && (
              <>
                <Skeleton height={50} />
                <Skeleton height={50} />
              </>
            )}
            {!addSearching && addSearchQuery.length < 2 && addSearchResults.length > 0 && (
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" ls={1}>Top Selling</Text>
            )}
            {!addSearching && addSearchResults.length === 0 && addSearchQuery.length >= 2 && (
              <Text size="sm" c="dimmed" ta="center">No products found</Text>
            )}
            {addSearchResults.map((product) => (
              <Card key={product.id} withBorder p={0} style={{ overflow: 'hidden' }}>
                {/* Product header - clickable to expand */}
                <Group
                  gap="sm"
                  wrap="nowrap"
                  p="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleExpandProduct(product.id)}
                >
                  {product.thumbnail ? (
                    <Image src={product.thumbnail} alt={product.name} w={40} h={40} radius={4} fit="contain" bg="gray.0" />
                  ) : (
                    <Box w={40} h={40} bg="gray.1" style={{ borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconPackage size={18} color="gray" />
                    </Box>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>{decodeHtmlEntities(product.name)}</Text>
                    {product.wholesaleName && <Text size="xs" c="blue" truncate>{decodeHtmlEntities(product.wholesaleName)}</Text>}
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    {product.totalSold != null && (
                      <Badge size="sm" variant="light" color="violet">{product.totalSold} sold</Badge>
                    )}
                    <Badge size="sm" variant="light">{product.variantsCount} variants</Badge>
                  </Group>
                  <IconChevronDown
                    size={16}
                    color="gray"
                    style={{ transition: 'transform 0.2s', transform: expandedProductId === product.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </Group>

                {/* Expanded variants */}
                {expandedProductId === product.id && (
                  <Stack gap={0} style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                    {loadingExpanded ? (
                      <Box p="sm"><Skeleton height={40} /></Box>
                    ) : expandedVariants.length === 0 ? (
                      <Text size="xs" c="dimmed" p="sm" ta="center">No variants</Text>
                    ) : (
                      expandedVariants.map((variant) => (
                        <Group
                          key={variant.variantId}
                          gap="sm"
                          wrap="nowrap"
                          px="sm"
                          py="xs"
                          style={{ borderBottom: '1px solid var(--mantine-color-gray-1)', backgroundColor: 'var(--mantine-color-gray-0)' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" fw={500}>{decodeHtmlEntities(variant.variantName || variant.sku)}</Text>
                            <Group gap="xs">
                              <Text size="xs" fw={500}>{formatCurrency(variant.price)}</Text>
                              <Text size="xs" c="dimmed">{variant.weight}g</Text>
                              <Badge size="xs" variant="light" color={variant.stock > 0 ? 'green' : 'red'}>
                                {variant.stock} stk
                              </Badge>
                            </Group>
                          </div>
                          <NumberInput
                            size="xs"
                            w={55}
                            min={1}
                            max={variant.stock || 999}
                            value={addQtyMap[variant.variantId] || 1}
                            onChange={(v) => setAddQtyMap(prev => ({ ...prev, [variant.variantId]: Number(v) || 1 }))}
                            styles={{ input: { textAlign: 'center', height: 28 } }}
                          />
                          <Button
                            size="xs"
                            loading={addingVariantId === variant.variantId}
                            disabled={addingVariantId != null}
                            onClick={() => handleAddItem(variant.variantId, addQtyMap[variant.variantId] || 1)}
                          >
                            Add
                          </Button>
                        </Group>
                      ))
                    )}
                  </Stack>
                )}
              </Card>
            ))}
          </Stack>
        </Drawer>

        {/* Change Variant Drawer */}
        <Drawer
          opened={changeVariantDrawerOpen}
          onClose={() => { setChangeVariantDrawerOpen(false); setChangingItemId(null); setProductVariants([]); setCurrentVariantId(null) }}
          title="Change Variant"
          position="right"
          size="md"
        >
          <Stack gap="sm">
            {loadingVariants && (
              <>
                <Skeleton height={60} />
                <Skeleton height={60} />
              </>
            )}
            {!loadingVariants && productVariants.length === 0 && (
              <Text size="sm" c="dimmed" ta="center">No variants found for this product</Text>
            )}
            {productVariants.map((variant) => {
              const isCurrent = variant.variantId === currentVariantId
              return (
                <Card
                  key={variant.variantId}
                  withBorder
                  p="sm"
                  style={isCurrent ? { borderColor: 'var(--mantine-color-blue-4)', backgroundColor: 'var(--mantine-color-blue-0)' } : changingVariantId === variant.variantId ? { opacity: 0.6 } : undefined}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      {variant.thumbnail ? (
                        <Image src={variant.thumbnail} alt={variant.productName} w={36} h={36} radius={4} fit="contain" bg="gray.0" />
                      ) : (
                        <Box w={36} h={36} bg="gray.1" style={{ borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconPackage size={16} color="gray" />
                        </Box>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>{decodeHtmlEntities(variant.variantName || variant.sku)}</Text>
                        <Group gap="xs">
                          <Text size="xs" fw={500}>{formatCurrency(variant.price)}</Text>
                          <Text size="xs" c="dimmed">{variant.weight}g</Text>
                          <Badge size="xs" variant="light" color={variant.stock > 0 ? 'green' : 'red'}>
                            {variant.stock} in stock
                          </Badge>
                        </Group>
                      </div>
                    </Group>
                    {isCurrent ? (
                      <Badge size="sm" variant="light" color="blue">Current</Badge>
                    ) : (
                      <Button
                        size="xs"
                        color="blue"
                        variant="light"
                        loading={changingVariantId === variant.variantId}
                        disabled={changingVariantId != null}
                        onClick={() => handleChangeVariant(variant.variantId)}
                      >
                        Select
                      </Button>
                    )}
                  </Group>
                </Card>
              )
            })}
          </Stack>
        </Drawer>

        {/* Print Invoice Modal */}
        {printDialogOpen && (
          <iframe
            srcDoc={generateInvoiceHTML(order)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              border: 'none',
              zIndex: 9999,
            }}
            onLoad={(e) => {
              setTimeout(() => {
                e.target.contentWindow?.print()
                setPrintDialogOpen(false)
              }, 500)
            }}
          />
        )}
      </Stack>
    </Box>
  )
}

// Generate professional invoice HTML for printing (optimized for thermal/pad printing)
function generateInvoiceHTML(order: OrderData): string {
  const orderDate = new Date(order.timestamps?.createdAt || (order as any).createdAt)
  const shipping = order.shipping
  const items = order.items || []

  const totalWeight = items.reduce((sum, item) => sum + ((item.variantWeight || 0) * item.quantity), 0)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${order.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      margin-top: 25mm;
      margin-bottom: 25mm;
      margin-left: 15mm;
      margin-right: 15mm;
      size: A4;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      color: #000;
      line-height: 1.4;
      background: white;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .invoice {
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 15px;
      padding-top: 20px;
      padding-bottom: 20px;
      background: white;
    }
    .header {
      text-align: center;
      margin-top: 10px;
      margin-bottom: 20px;
      padding: 15px 10px;
      padding-bottom: 12px;
      border-bottom: 2px solid #000;
    }
    .header h1 {
      font-size: 24px;
      color: #000;
      margin-bottom: 5px;
      font-weight: 700;
    }
    .header p {
      color: #333;
      font-size: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-box {
      border: 1px solid #ddd;
      padding: 10px;
      background: #fafafa;
    }
    .info-box h3 {
      font-size: 11px;
      color: #555;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .info-box p {
      font-size: 12px;
      margin: 3px 0;
    }
    .info-box strong {
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 12px;
    }
    table th {
      background: #eee;
      border: 1px solid #333;
      color: #000;
      padding: 8px 6px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
    }
    table td {
      padding: 8px 6px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    table tr:last-child td {
      border-bottom: 1px solid #333;
    }
    .product-image {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border: 1px solid #ddd;
      border-radius: 3px;
      background: #fff;
    }
    .no-image {
      width: 40px;
      height: 40px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #999;
    }
    .price-display {
      white-space: nowrap;
    }
    .original-price {
      text-decoration: line-through;
      color: #999;
      font-size: 11px;
    }
    .offer-price {
      color: #000;
      font-weight: 600;
    }
    .totals {
      margin-left: auto;
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-row.grand-total {
      background: #000;
      color: #fff;
      padding: 10px 12px;
      font-weight: 700;
      font-size: 13px;
      margin-top: 5px;
      border: 1px solid #000;
    }
    .footer {
      margin-top: 20px;
      margin-bottom: 15px;
      padding: 15px 10px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
    .status-paid { color: #000; font-weight: 600; }
    .status-partial { color: #000; font-weight: 600; }
    .status-unpaid { color: #000; font-weight: 600; }
    @media print {
      .invoice {
        padding: 10px;
        padding-top: 15px;
        padding-bottom: 15px;
      }
      .header {
        margin-top: 5px;
        margin-bottom: 15px;
        padding: 12px 10px;
        padding-bottom: 10px;
      }
      .info-grid { gap: 10px; margin-bottom: 12px; }
      .info-box { padding: 8px; }
      table th, table td { padding: 6px 4px; }
      .totals { margin-bottom: 10px; }
      .footer {
        margin-top: 15px;
        margin-bottom: 10px;
        padding: 12px 10px;
        padding-top: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <!-- Header -->
    <div class="header">
      <h1>INVOICE</h1>
    </div>

    <!-- Customer & Shipping Info -->
    <div class="info-grid">
      <div class="info-box">
        <h3>Customer Details</h3>
        <p><strong>${order.customerInfo?.name || (order as any).customer?.name || 'Customer'}</strong></p>
        <p>📱 ${order.customerInfo?.phone || (order as any).customer?.phone || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h3>Shipping Address</h3>
        <p><strong>${shipping.address || 'N/A'}</strong></p>
        <p>${[shipping.thana, shipping.district, shipping.division].filter(Boolean).join(', ') || ''}</p>
        ${order.trackingCode ? `<p style="margin-top: 5px;">📦 Tracking: ${order.trackingCode}</p>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">Img</th>
          <th>Product</th>
          <th style="width: 60px;">SKU</th>
          <th style="width: 40px; text-align: center;">Qty</th>
          <th style="width: 90px; text-align: right;">Price</th>
          <th style="width: 90px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td style="text-align: center;">
              ${item.thumbnail
                ? `<img src="${item.thumbnail}" alt="" class="product-image" />`
                : `<div class="no-image">N/A</div>`
              }
            </td>
            <td>
              <div style="font-weight: 500; margin-bottom: 2px;">${decodeHtmlEntities(item.productName)}</div>
              <div style="font-size: 11px; color: #666;">${decodeHtmlEntities(item.variantName)}</div>
            </td>
            <td>${item.sku || '-'}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;" class="price-display">
              ${item.originalPrice && item.originalPrice > item.unitPrice
                ? `<span class="offer-price">${formatCurrency(item.unitPrice)}</span><br><span class="original-price">${formatCurrency(item.originalPrice)}</span>`
                : formatCurrency(item.unitPrice)
              }
            </td>
            <td style="text-align: right; font-weight: 500;">${formatCurrency(item.totalPrice)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatCurrency(order.subTotal)}</span>
      </div>
      ${order.discountAmount > 0 ? `
      <div class="total-row">
        <span>Discount ${order.subTotal > 0 ? `(${((order.discountAmount / order.subTotal) * 100).toFixed(1)}%)` : ''}</span>
        <span style="color: #000;">-${formatCurrency(order.discountAmount)}</span>
      </div>
      ` : ''}
      <div class="total-row">
        <span>Delivery Charge</span>
        <span>${formatCurrency(order.deliveryCharge)}</span>
      </div>
      <div class="total-row">
        <span>Total Weight</span>
        <span>${totalWeight}g</span>
      </div>
      <div class="total-row grand-total">
        <span>GRAND TOTAL</span>
        <span>${formatCurrency(order.totalAmount)}</span>
      </div>
      <div class="total-row">
        <span>Amount Paid</span>
        <span class="status-${order.paymentStatus}">${formatCurrency(order.paidAmount)}</span>
      </div>
      <div class="total-row">
        <span>Due Amount</span>
        <span style="font-weight: 700;">${formatCurrency(order.dueAmount)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      ${order.note ? `<p>Note: ${order.note}</p>` : '<p>&nbsp;</p>'}
    </div>
  </div>
</body>
</html>
  `
}
