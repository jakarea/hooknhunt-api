'use client'

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Badge,
  Box,
  Table,
  Anchor,
  Breadcrumbs,
  Skeleton,
  Alert,
  Timeline,
  Card,
  TextInput,
  NumberInput,
  Modal,
  Textarea,
  ActionIcon,
  Select,
  Divider,
  SimpleGrid,
  useMantineColorScheme,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconEdit,
  IconCheck,
  IconPackage,
  IconTruck,
  IconPlane,
  IconHome,
  IconCircleCheck,
  IconAlertTriangle,
  IconHash,
  IconScreenshot,
  IconBuilding,
  IconCoin,
  IconWeight,
  IconInfoCircle,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getPurchaseOrder, updatePurchaseOrderStatus, updateStatusHistoryComments, getBanks } from '@/utils/api'
import api from '@/lib/api'
import ReceivingModal, { type ReceivingData } from '@/components/receiving-modal'
import { getNextStatus } from '@/stores/procurementStore'
import { usePurchaseOrderDetailStore } from '@/stores/purchaseOrderDetailStore'
import {
  validateAndShowErrors,
  buildStatusUpdatePayload,
  requiresReceivingModal,
  showStatusUpdateSuccess,
  showStatusUpdateError
} from '@/utils/procurement-status'
import {
  getInitialTimelineData,
  getEditableFieldsForStatus,
  buildTimelineUpdatePayload,
  validateTimelineData,
  saveTimelineUpdate,
  canEditStatus,
  getStatusLabel,
  getStatusColor,
  type TimelineEditData,
} from '@/utils/timeline-edit'

interface PurchaseOrder {
  id: number
  poNumber: string
  supplier: { id: number; name: string }
  orderDate: string
  expectedDate?: string
  totalAmount: number
  exchangeRate: number
  status: string
  courierName?: string
  trackingNumber?: string
  bdCourierTracking?: string
  lotNumber?: string
  totalShippingCost?: number
  totalWeight?: number
  shippingCostPerKg?: number
  extraCost?: number
  createdAt: string
  items: Array<{
    id: number
    productId: number
    quantity: number
    chinaPrice: number
    unitPrice?: number
    totalPrice: number
    shippingCost?: number
    unitWeight?: number
    extraWeight?: number
    finalUnitCost?: number
    receivedQuantity?: number
    lostQuantity?: number
    lostItemPrice?: number
    product: {
      id: number
      name: string
    }
  }>
  statusHistory?: Array<{
    id: number
    oldStatus?: string
    newStatus: string
    comments?: string
    createdAt: string
    changedByUser?: {
      id: number
      name: string
    }
  }>
}

// Helper function to get status flow with translations (keep this for UI display)
const getStatusFlow = (t: (key: string) => string, order?: PurchaseOrder | null) => {
  const baseStatuses = [
    { value: 'draft', label: t('procurement.ordersPage.statuses.draft'), icon: IconAlertTriangle, color: 'gray' },
    { value: 'payment_confirmed', label: t('procurement.ordersPage.statuses.paymentConfirmed'), icon: IconCheck, color: 'blue' },
    { value: 'supplier_dispatched', label: t('procurement.ordersPage.statuses.supplierDispatched'), icon: IconPackage, color: 'cyan' },
    { value: 'warehouse_received', label: t('procurement.ordersPage.statuses.warehouseReceived'), icon: IconHome, color: 'teal' },
    { value: 'shipped_bd', label: t('procurement.ordersPage.statuses.shippedBd'), icon: IconPlane, color: 'indigo' },
    { value: 'arrived_bd', label: t('procurement.ordersPage.statuses.arrivedBd'), icon: IconPlane, color: 'purple' },
    { value: 'in_transit_bogura', label: t('procurement.ordersPage.statuses.inTransitBogura'), icon: IconTruck, color: 'orange' },
    { value: 'received_hub', label: t('procurement.ordersPage.statuses.receivedHub'), icon: IconPackage, color: 'lime' },
  ]

  // Check if any items have lost_quantity > 0 OR received_quantity < quantity
  const hasLostItems = order?.items?.some(item => {
    const lostQty = item.lostQuantity || 0
    const receivedQty = item.receivedQuantity ?? item.quantity
    const orderedQty = item.quantity
    return lostQty > 0 || receivedQty < orderedQty
  }) || false

  // Add appropriate final status based on whether there are lost items
  if (hasLostItems) {
    baseStatuses.push({ value: 'partially_completed', label: t('procurement.ordersPage.statuses.partiallyCompleted'), icon: IconAlertTriangle, color: 'orange' })
  } else {
    baseStatuses.push({ value: 'completed', label: t('procurement.ordersPage.statuses.completed'), icon: IconCircleCheck, color: 'green' })
  }

  return baseStatuses
}

export default function PurchaseOrderDetailsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { hasPermission } = usePermissions()
  const { colorScheme } = useMantineColorScheme()

  // Use Zustand store for order data (no full page re-renders!)
  const order = usePurchaseOrderDetailStore((state) => state.order)
  const history = usePurchaseOrderDetailStore((state) => state.history)
  const loading = usePurchaseOrderDetailStore((state) => state.loading)
  const fetchOrder = usePurchaseOrderDetailStore((state) => state.fetchOrder)
  const updateStatusHistoryEntry = usePurchaseOrderDetailStore((state) => state.updateStatusHistoryEntry)

  // Local UI state only (modals, form inputs, etc.)

  // Get status flow with translations (for UI display only)
  // Recalculate when order changes to determine whether to show partially_completed or completed
  const STATUS_FLOW = useMemo(() => getStatusFlow(t, order), [t, order])

  // Status update state
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Receiving modal state
  const [receivingModalOpen, setReceivingModalOpen] = useState(false)
  const [approvingStock, setApprovingStock] = useState(false)

  // Modal inputs (consolidated into single object for better performance)
  const [statusFormData, setStatusFormData] = useState({
    exchangeRate: 0,
    paymentAccountId: null as number | null,
    courierName: '',
    trackingNumber: '',
    lotNumber: '',
    bdCourierTracking: '',
    comments: '',
    transportType: null as string | null,
    totalShippingCost: 0,
    // New fields for shipped_bd modal
    totalWeight: 0,
    shippingCostPerKg: 0,
  })

  // Payment state
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    from_supplier_credit: number
    from_bank: number
    total: number
  } | null>(null)
  const [paymentAccountError, setPaymentAccountError] = useState<string | null>(null)

  // Single timeline edit modal state (replaces 2 separate modals)
  const [timelineEditModalOpen, setTimelineEditModalOpen] = useState(false)
  const [editingStatusValue, setEditingStatusValue] = useState<string>('')
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null)
  const [timelineEditData, setTimelineEditData] = useState<TimelineEditData>({
    comments: '',
    exchangeRate: 0,
    courierName: '',
    trackingNumber: '',
    lotNumber: '',
    transportType: '',
    totalWeight: 0,
    shippingCostPerKg: 0,
    bdCourierTracking: '',
  })
  const [savingTimelineEdit, setSavingTimelineEdit] = useState(false)

  // Approve & Stock confirmation modal state
  const [approveModalOpen, setApproveModalOpen] = useState(false)

  // Helper to update status form data (prevents unnecessary re-renders)
  const updateStatusFormField = <K extends keyof typeof statusFormData>(
    field: K,
    value: typeof statusFormData[K]
  ) => {
    setStatusFormData(prev => ({ ...prev, [field]: value }))
    // Clear payment account error when user selects a payment account
    if (field === 'paymentAccountId' && value !== null) {
      setPaymentAccountError(null)
    }
  }

  // Helper to update timeline edit data
  const updateTimelineEditField = <K extends keyof TimelineEditData>(
    field: K,
    value: TimelineEditData[K]
  ) => {
    setTimelineEditData(prev => ({ ...prev, [field]: value }))
  }

  // Pure function: Calculate payment breakdown from supplier credit and bank
  const calculatePaymentBreakdown = (
    orderTotal: number,
    supplierCredit: number
  ): { from_supplier_credit: number; from_bank: number; total: number } => {
    const fromSupplierCredit = Math.min(orderTotal, Math.max(0, supplierCredit))
    const fromBank = Math.max(0, orderTotal - fromSupplierCredit)
    return {
      from_supplier_credit: Math.round(fromSupplierCredit * 100) / 100,
      from_bank: Math.round(fromBank * 100) / 100,
      total: Math.round(orderTotal * 100) / 100,
    }
  }

  // Pure function: Calculate final bank balance
  const calculateFinalBankBalance = (currentBalance: number, paymentAmount: number): number => {
    return Math.round((currentBalance - paymentAmount) * 100) / 100
  }

  // Load active banks for payment selection
  const loadBanks = async () => {
    try {
      const response = await getBanks({ status: 'active' })
      const banksData = response?.data?.data || response?.data || []
      setBanks(Array.isArray(banksData) ? banksData : [])
    } catch (error) {
      console.error('Failed to load banks:', error)
    }
  }

  // Load banks when component mounts
  useEffect(() => {
    loadBanks()
  }, [])

  useEffect(() => {
    if (!hasPermission('procurement.orders.index')) {
      navigate('/dashboard')
      return
    }

    if (id) {
      fetchOrder(Number(id))
    }
  }, [id])

  // Clear store when component unmounts
  useEffect(() => {
    return () => {
      usePurchaseOrderDetailStore.getState().clearOrder()
    }
  }, [])

  const openStatusModal = () => {
    const nextStatus = getNextStatus(order?.status || '')
    if (!nextStatus) return

    // Check if receiving modal is needed (skip status modal for receiving)
    if (requiresReceivingModal(order?.status || '', nextStatus)) {
      // Reset form with current order data
      setStatusFormData({
        exchangeRate: Number(order?.exchangeRate) || 0,
        paymentAccountId: null,
        courierName: order?.courierName || '',
        trackingNumber: order?.trackingNumber || '',
        lotNumber: order?.lotNumber || '',
        bdCourierTracking: order?.bdCourierTracking || '',
        comments: '',
        transportType: null,
        totalShippingCost: 0,
        totalWeight: 0,
        shippingCostPerKg: 0,
      })

      // Open receiving modal directly (skip status modal)
      setReceivingModalOpen(true)
      return
    }

    // Reset form with current order data
    setStatusFormData({
      exchangeRate: Number(order?.exchangeRate) || 0,
      paymentAccountId: null,
      courierName: order?.courierName || '',
      trackingNumber: order?.trackingNumber || '',
      lotNumber: order?.lotNumber || '',
      bdCourierTracking: order?.bdCourierTracking || '',
      comments: '',
      transportType: null,
      totalShippingCost: 0,
      totalWeight: 0,
      shippingCostPerKg: 0,
    })

    setStatusModalOpen(true)
  }

  // Calculate payment breakdown when exchange rate changes for draft orders
  useEffect(() => {
    if (order?.status === 'draft' && statusFormData.exchangeRate > 0) {
      const totalBdt = order.totalAmount * statusFormData.exchangeRate
      const supplierCredit = Number(order.supplier?.walletBalance) || 0
      setPaymentBreakdown(calculatePaymentBreakdown(totalBdt, supplierCredit))
    } else {
      setPaymentBreakdown(null)
    }
  }, [statusFormData.exchangeRate, order])

  const handleStatusChange = async () => {
    if (!order) return

    const nextStatus = getNextStatus(order.status)
    if (!nextStatus) return

    // Set inline error for payment account if missing
    if (order.status === 'draft' && nextStatus === 'payment_confirmed' && !statusFormData.paymentAccountId) {
      setPaymentAccountError('Please select a payment account')
    }

    // Validate using pure function
    const isValid = validateAndShowErrors(
      order.status,
      nextStatus,
      {
        exchange_rate: statusFormData.exchangeRate,
        payment_account_id: statusFormData.paymentAccountId,
        courier_name: statusFormData.courierName,
        tracking_number: statusFormData.trackingNumber,
        lot_number: statusFormData.lotNumber,
        bd_courier_tracking: statusFormData.bdCourierTracking,
        transport_type: statusFormData.transportType,
        total_weight: statusFormData.totalWeight,
        shipping_cost_per_kg: statusFormData.shippingCostPerKg,
        total_shipping_cost: statusFormData.totalShippingCost,
        comments: statusFormData.comments,
      },
      t
    )

    if (!isValid) return

    // Check if receiving modal is needed
    if (requiresReceivingModal(order.status, nextStatus)) {
      setStatusModalOpen(false)
      setReceivingModalOpen(true)
      return
    }

    try {
      setUpdatingStatus(true)

      // Build payload using pure function
      const payload = buildStatusUpdatePayload(
        order.status,
        nextStatus,
        {
          exchange_rate: statusFormData.exchangeRate,
          payment_account_id: statusFormData.paymentAccountId,
          courier_name: statusFormData.courierName,
          tracking_number: statusFormData.trackingNumber,
          lot_number: statusFormData.lotNumber,
          bd_courier_tracking: statusFormData.bdCourierTracking,
          transport_type: statusFormData.transportType,
          total_weight: statusFormData.totalWeight,
          shipping_cost_per_kg: statusFormData.shippingCostPerKg,
          total_shipping_cost: statusFormData.totalShippingCost,
          comments: statusFormData.comments,
        }
      )

      const response: any = await updatePurchaseOrderStatus(
        Number(id),
        nextStatus,
        payload.exchange_rate,
        payload
      )

      // Show success using pure function
      const message = response?.data?.message || response?.message
      const nextStatusLabel = STATUS_FLOW.find(s => s.value === nextStatus)?.label || nextStatus
      showStatusUpdateSuccess(nextStatusLabel, message, t)

      setStatusModalOpen(false)
      await fetchOrder(Number(id)) // Refresh order data
    } catch (error: any) {
      console.error('Failed to update status:', error)
      showStatusUpdateError(error, t)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleReceivingSubmit = async (data: ReceivingData) => {
    if (!order) return

    try {
      setUpdatingStatus(true)

      // Determine order status based on whether completion is partial
      const orderStatus = data.is_partial_completion ? 'partially_completed' : 'received_hub'

      const payload: any = {
        status: orderStatus,
        extra_cost: data.extra_cost,
        items: data.items,
        comments: data.comments?.trim() || (
          data.is_partial_completion
            ? `Goods received partially. ${data.items.filter((i: any) => {
                const orderedItem = order.items.find((oi: any) => oi.id === i.id)
                return orderedItem && i.received_quantity < orderedItem.quantity
              }).length} items missing. Extra cost: ${data.extra_cost} BDT`
            : `Goods received. Extra cost: ${data.extra_cost} BDT`
        ),
      }

      const response: any = await updatePurchaseOrderStatus(Number(id), orderStatus, order.exchangeRate, payload)

      notifications.show({
        title: t('common.success'),
        message: response?.data?.message || (data.is_partial_completion ? t('procurement.ordersPage.statuses.partiallyCompleted') : t('procurement.ordersPage.statuses.receivedHub')),
        color: data.is_partial_completion ? 'orange' : 'green',
        autoClose: 5000,
      })

      setReceivingModalOpen(false)
      await fetchOrder(Number(id))
    } catch (error: any) {
      console.error('Failed to receive goods:', error)
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || error.message || t('procurement.ordersPage.notifications.errorUpdating'),
        color: 'red',
      })
      throw error // Re-throw to let modal know submission failed
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleApproveAndStock = async () => {
    if (!order) return

    try {
      setApprovingStock(true)

      const response: any = await api.post(`/procurement/orders/${id}/approve-and-stock`, {
        comments: 'Order approved and inventory updated',
      })

      notifications.show({
        title: t('common.success'),
        message: response?.data?.message || t('procurement.ordersPage.details.actions.approveStock'),
        color: 'green',
        autoClose: 5000,
      })

      setApproveModalOpen(false)
      await fetchOrder(Number(id))
    } catch (error: any) {
      console.error('Failed to approve order:', error)
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || error.message || t('procurement.ordersPage.notifications.errorUpdating'),
        color: 'red',
      })
    } finally {
      setApprovingStock(false)
    }
  }

  const openApproveModal = () => {
    setApproveModalOpen(true)
  }

  const calculateBdt = (rmbAmount: number) => {
    return rmbAmount * (order?.exchangeRate || 0)
  }

  // Extract extra cost from status history comments
  const extractExtraCostFromHistory = () => {
    if (!order?.statusHistory) return 0

    const receivedHubEntry = history.find((h: any) => h.newStatus === 'received_hub')
    if (receivedHubEntry?.comments) {
      const match = receivedHubEntry.comments.match(/Extra cost:\s*(\d+(?:\.\d+)?)\s*BDT/i)
      if (match) {
        return Number(match[1]) || 0
      }
    }
    return 0
  }

  // Extract shipping cost from status history comments
  const extractShippingCostFromHistory = () => {
    if (!order?.statusHistory) return 0

    // Try to find arrived_bd status with shipping cost info
    const arrivedBDEntry = history.find((h: any) => h.newStatus === 'arrived_bd')
    if (arrivedBDEntry?.comments) {
      const match = arrivedBDEntry.comments.match(/Total shipping cost:\s*(\d+(?:\.\d+)?)\s*BDT/i)
      if (match) {
        return Number(match[1]) || 0
      }
    }
    return 0
  }

  const calculateGrandTotal = () => {
    if (!order) return 0

    // Calculate items total in BDT: sum of (china_price × exchange_rate × quantity)
    const itemsTotalBdt = order.items.reduce((sum, item) => {
      const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order.exchangeRate))
      return sum + (bdPrice * item.quantity)
    }, 0)

    // Get shipping cost (from order OR sum of item shipping costs)
    const totalShippingCost = Number(order.totalShippingCost) || order.items.reduce((sum, item) => sum + (Number(item.shippingCost) || 0), 0)

    // Get extra cost
    const extraCost = Number(order.extraCost) || extractExtraCostFromHistory()

    return itemsTotalBdt + totalShippingCost + extraCost
  }

  /**
   * Open timeline edit modal with initial data
   * @param statusValue - The status being edited
   * @param historyEntry - Optional history entry for comments
   */
  const openTimelineEditModal = (statusValue: string, historyEntry?: any) => {
    setEditingStatusValue(statusValue)
    setEditingHistoryId(historyEntry?.id || null)
    setTimelineEditData(getInitialTimelineData(statusValue, order, historyEntry))
    setTimelineEditModalOpen(true)
  }

  /**
   * Save timeline edit data using pure function
   */
  const handleSaveTimelineEdit = async () => {
    if (!id || !editingStatusValue) return

    // Validate using pure function
    const validation = validateTimelineData(editingStatusValue, timelineEditData)
    if (!validation.isValid) {
      notifications.show({
        title: t('common.error'),
        message: validation.errors.join(', '),
        color: 'red',
      })
      return
    }

    try {
      setSavingTimelineEdit(true)

      // Save using pure function
      const result = await saveTimelineUpdate(
        Number(id),
        editingStatusValue,
        timelineEditData,
        editingHistoryId,
        t
      )

      if (result.success) {
        setTimelineEditModalOpen(false)
        // Store already updated by saveTimelineUpdate - no full refetch needed!
      }
    } finally {
      setSavingTimelineEdit(false)
    }
  }

  const items = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.ordersPage.title'), href: '/procurement/orders' },
    { title: order?.poNumber || `${t('common.order')} #${id}` },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  if (loading || !order) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width="30%" />
          <Skeleton height={100} />
          <Skeleton height={400} />
        </Stack>
      </Box>
    )
  }

  const currentStatusIndex = STATUS_FLOW.findIndex(s => s.value === order.status)
  const nextStatusValue = getNextStatus(order.status)
  const nextStatus = nextStatusValue ? STATUS_FLOW.find(s => s.value === nextStatusValue) || null : null
  const canEdit = order.status === 'draft' && hasPermission('procurement.orders.edit')
  const canUpdateStatus = hasPermission('procurement.orders.edit') && order.status !== 'completed'
  const isCompleted = order.status === 'completed'
  const isPartiallyCompleted = order.status === 'partially_completed'

  // Check if any items have lost_quantity > 0 OR received_quantity < quantity
  const hasLostItems = order?.items?.some((item: any) => {
    const lostQty = item.lostQuantity || 0
    const receivedQty = item.receivedQuantity || item.quantity
    const orderedQty = item.quantity
    return lostQty > 0 || receivedQty < orderedQty
  }) || false

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={16} />}>{items}</Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <Stack gap={0}>
            <Group gap="sm" align="flex-end">
              <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
                {order.poNumber || `${t('procurement.ordersPage.title')} (${t('procurement.ordersPage.statuses.draft')})`}
              </Text>
              <Badge color={STATUS_FLOW[currentStatusIndex]?.color || 'gray'} size="lg">
                {STATUS_FLOW[currentStatusIndex]?.label || order.status}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {order.supplier.name}
            </Text>
          </Stack>

          <Group gap="sm">
            {canEdit && (
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={() => navigate(`/procurement/orders/${id}/edit`)}
              >
                {t('procurement.ordersPage.details.actions.editOrder')}
              </Button>
            )}
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/procurement/orders')}
            >
              {t('procurement.ordersPage.details.actions.back')}
            </Button>
          </Group>
        </Group>

        {/* Two Column Layout: Timeline (Left) + Details (Right) */}
        <Box className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          {/* Left Column - Enhanced Status Timeline */}
          <Paper withBorder p="md" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
            <Stack gap="sm">
              <Text fw={600} size="lg">{t('procurement.ordersPage.details.statusTimeline')}</Text>

              {/* Vertical Timeline - Clean & Simple */}
              <Timeline active={currentStatusIndex} bulletSize={22} lineWidth={1}>
                {STATUS_FLOW.map((status, index) => {
                  const Icon = status.icon
                  const isCurrent = index === currentStatusIndex
                  const isPast = index < currentStatusIndex

                  // Find status history for this status
                  const statusHistoryEntry = history?.find(
                    (h: any) => h.newStatus === status.value
                  )

                  return (
                    <Timeline.Item
                      key={status.value}
                      bullet={
                        <Box
                          sx={(theme) => ({
                            backgroundColor: isCurrent
                              ? theme.colors[status.color || 'gray'][6]
                              : isPast
                              ? theme.colors.green[5] // Green for completed
                              : theme.colors.gray[3],
                            color: isCurrent || isPast ? 'white' : theme.colors.gray[5],
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          })}
                        >
                          <Icon size={12} />
                        </Box>
                      }
                      title={
                        <Stack gap={4}>
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Text
                              size="sm"
                              fw={isCurrent ? 600 : isPast ? 500 : 400}
                              c={isCurrent ? status.color : isPast ? 'green' : 'dimmed'}
                            >
                              {status.label}
                            </Text>

                            {/* Edit Icon */}
                            {!isCompleted && !isPartiallyCompleted && statusHistoryEntry && canEditStatus(status.value, order.status === 'completed', order.status === 'partially_completed') && (
                              <ActionIcon
                                variant="transparent"
                                size={20}
                                color="blue"
                                onClick={() => openTimelineEditModal(status.value, statusHistoryEntry)}
                                title={`${t('common.edit')} ${status.label}`}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            )}
                          </Group>

                          {/* Simple inline details for current/past statuses */}
                          {(isCurrent || isPast) && statusHistoryEntry && (
                            <Stack gap={2}>
                              {/* Timestamp */}
                              <Text size="xs" c="dimmed">
                                {new Date(statusHistoryEntry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Text>

                              {/* Key info - only show essential details inline */}
                              <Group gap={6} wrap="wrap">
                                {/* Payment exchange rate */}
                                {status.value === 'payment_confirmed' && statusHistoryEntry.timelineData?.exchangeRate && (
                                  <Text size="xs" c="blue" fw={500}>৳{Number(statusHistoryEntry.timelineData.exchangeRate).toFixed(2)}</Text>
                                )}
                                {/* Courier */}
                                {status.value === 'supplier_dispatched' && statusHistoryEntry.timelineData?.courierName && (
                                  <Text size="xs" c="dimmed">{statusHistoryEntry.timelineData.courierName}</Text>
                                )}
                                {/* Tracking */}
                                {status.value === 'supplier_dispatched' && statusHistoryEntry.timelineData?.trackingNumber && (
                                  <Text size="xs" c="blue" fw={500} truncate style={{ maxWidth: 120 }}>{statusHistoryEntry.timelineData.trackingNumber}</Text>
                                )}
                                {/* BD Tracking */}
                                {(status.value === 'arrived_bd' || status.value === 'in_transit_bogura') && statusHistoryEntry.timelineData?.bdCourierTracking && (
                                  <Text size="xs" c="blue" fw={500} truncate style={{ maxWidth: 120 }}>{statusHistoryEntry.timelineData.bdCourierTracking}</Text>
                                )}
                                {/* Lot Number */}
                                {(status.value === 'warehouse_received' || status.value === 'shipped_bd') && statusHistoryEntry.timelineData?.lotNumber && (
                                  <Text size="xs" c="teal" fw={500}>{statusHistoryEntry.timelineData.lotNumber}</Text>
                                )}
                                {/* Shipping Cost */}
                                {status.value === 'shipped_bd' && statusHistoryEntry.timelineData?.totalShippingCost && (
                                  <Text size="xs" c="green" fw={600}>৳{Number(statusHistoryEntry.timelineData.totalShippingCost).toFixed(2)}</Text>
                                )}
                              </Group>

                              {/* Comment - only if exists and short */}
                              {statusHistoryEntry?.comments && statusHistoryEntry.comments.length < 50 && (
                                <Text size="xs" c="dimmed" italic lineClamp={1}>
                                  {statusHistoryEntry.comments}
                                </Text>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      }
                    />
                  )
                })}
              </Timeline>

              {/* Timeline Summary Card - Overall Order Stats */}
              {order.createdAt && (
                <Paper
                  p="xs"
                  radius="sm"
                  bg={colorScheme === 'dark' ? 'dark.7' : 'gray.0'}
                  withBorder
                >
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={500}>Order Timeline Summary</Text>
                    <SimpleGrid cols={2} spacing={4}>
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">Order Age:</Text>
                        <Text size="xs" fw={600}>
                          {(() => {
                            const now = new Date()
                            const created = new Date(order.createdAt)
                            const diffMs = now.getTime() - created.getTime()
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            return `${diffDays} days`
                          })()}
                        </Text>
                      </Group>
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">Stages Done:</Text>
                        <Text size="xs" fw={600}>{currentStatusIndex + 1}/{STATUS_FLOW.length}</Text>
                      </Group>
                    </SimpleGrid>
                    {/* Expected Delivery Badge - Show if not completed */}
                    {order.status !== 'completed' && order.status !== 'partially_completed' && order.expectedDate && (
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">Expected:</Text>
                        <Text size="xs" fw={500} c={(() => {
                          const expected = new Date(order.expectedDate)
                          const now = new Date()
                          const diffDays = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          return diffDays < 0 ? 'red' : diffDays <= 3 ? 'orange' : 'green'
                        })()}>
                          {order.expectedDate}
                          {(() => {
                            const expected = new Date(order.expectedDate)
                            const now = new Date()
                            const diffDays = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            if (diffDays < 0) return ` (${Math.abs(diffDays)}d overdue)`
                            if (diffDays === 0) return ' (today)'
                            if (diffDays === 1) return ' (tomorrow)'
                            return ` (${diffDays}d left)`
                          })()}
                        </Text>
                      </Group>
                    )}
                    {/* Average time per stage */}
                    {currentStatusIndex > 0 && (() => {
                      const firstStatusDate = history?.[0]?.createdAt
                      if (!firstStatusDate) return null

                      const now = new Date()
                      const first = new Date(firstStatusDate)
                      const avgTime = Math.ceil((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24) / currentStatusIndex)

                      return (
                        <Group gap={4}>
                          <Text size="xs" c="dimmed">Avg/Stage:</Text>
                          <Text size="xs" fw={500}>{avgTime} days</Text>
                        </Group>
                      )
                    })()}
                  </Stack>
                </Paper>
              )}

              {/* Action Button */}
              {canUpdateStatus && nextStatus && (
                <Button
                  fullWidth
                  size="sm"
                  leftSection={<nextStatus.icon size={14} />}
                  onClick={openStatusModal}
                  disabled={updatingStatus}
                  color={nextStatus.color}
                >
                  {order.status === 'draft' ? t('procurement.ordersPage.details.actions.confirmOrder') : t('procurement.ordersPage.details.actions.nextStatus', { status: nextStatus.label })}
                </Button>
              )}

              {/* Approve & Stock Button - Only for received_hub or partially_completed status */}
              {(order.status === 'received_hub' || order.status === 'partially_completed') && hasPermission('procurement.orders.edit') && (
                <Button
                  fullWidth
                  size="sm"
                  leftSection={<IconCircleCheck size={14} />}
                  onClick={openApproveModal}
                  loading={approvingStock}
                  disabled={updatingStatus}
                  color={order.status === 'partially_completed' ? 'orange' : 'green'}
                >
                  {t('procurement.ordersPage.details.actions.approveStock')}
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Right Column - Order Details */}
          <Stack gap="lg">
            {/* Order Information */}
            <Paper withBorder p="md" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
              <Stack gap="md">
                <Text fw={600} size="lg">{t('procurement.ordersPage.details.orderInformation')}</Text>

                {/* Supplier Info - Prominent with Link */}
                <Paper
                  p="sm"
                  radius="sm"
                  bg={colorScheme === 'dark' ? 'dark.7' : 'blue.0'}
                  withBorder
                >
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <IconBuilding size={18} c="blue" />
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Supplier</Text>
                        <Text size="sm" fw={600}>{order.supplier.name}</Text>
                      </Stack>
                    </Group>
                    <Button
                      variant="light"
                      size="xs"
                      color="blue"
                      leftSection={<IconBuilding size={14} />}
                      onClick={() => navigate(`/procurement/suppliers/${order.supplier.id}`)}
                    >
                      View Profile
                    </Button>
                  </Group>
                </Paper>

                {/* Order Summary Card - Key Metrics */}
                <Paper
                  p="sm"
                  radius="sm"
                  bg={colorScheme === 'dark' ? 'dark.7' : 'gray.0'}
                  withBorder
                >
                  <Stack gap={4}>
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <IconHash size={16} c="dimmed" />
                        <Text size="xs" c="dimmed" fw={500}>Order Summary</Text>
                      </Group>
                      <Badge size="sm" color={STATUS_FLOW[currentStatusIndex]?.color || 'gray'} variant="light">
                        {STATUS_FLOW[currentStatusIndex]?.label || order.status}
                      </Badge>
                    </Group>

                    <SimpleGrid cols={4} spacing={4}>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Items</Text>
                        <Text size="sm" fw={600}>{order.items.length}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Total Qty</Text>
                        <Text size="sm" fw={600}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Total (RMB)</Text>
                        <Text size="sm" fw={600} c="cyan">¥{Number(order.items.reduce((sum, item) => sum + (item.china_price * item.quantity), 0)).toFixed(2)}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Total (BDT)</Text>
                        <Text size="sm" fw={600} c="blue">
                          ৳{Number(order.items.reduce((sum, item) => {
                            const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order.exchangeRate))
                            return sum + (bdPrice * item.quantity)
                          }, 0)).toFixed(2)}
                        </Text>
                      </Stack>
                    </SimpleGrid>

                    {/* Progress Bar */}
                    <Box>
                      <Group justify="space-between" mb={2}>
                        <Text size="xs" c="dimmed">Progress</Text>
                        <Text size="xs" fw={600} c={STATUS_FLOW[currentStatusIndex]?.color}>{Math.round((currentStatusIndex + 1) / STATUS_FLOW.length * 100)}%</Text>
                      </Group>
                      <Box style={{ width: '100%', height: 6, backgroundColor: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
                        <Box
                          style={{
                            width: `${((currentStatusIndex + 1) / STATUS_FLOW.length) * 100}%`,
                            height: '100%',
                            backgroundColor: STATUS_FLOW[currentStatusIndex]?.color === 'gray' ? '#6c757d' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'blue' ? '#228be6' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'cyan' ? '#06b6d4' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'teal' ? '#0d9488' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'indigo' ? '#6366f1' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'purple' ? '#9333ea' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'orange' ? '#f97316' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'lime' ? '#84cc16' :
                                           STATUS_FLOW[currentStatusIndex]?.color === 'green' ? '#22c55e' : '#6c757d',
                            borderRadius: 3,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </Paper>

                <Box className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.orderDate')}</Text>
                    <Text size="sm" fw={500}>{order.orderDate}</Text>
                  </Stack>

                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.expectedDate')}</Text>
                    <Text size="sm" fw={500}>{order.expectedDate || t('common.notSet')}</Text>
                  </Stack>

                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.exchangeRate')}</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={500}>
                        {order.exchangeRate} BDT
                      </Text>
                      <Text size="sm" c="dimmed">৳</Text>
                    </Group>
                  </Stack>

                  {order.totalWeight && (
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">Total Weight</Text>
                      <Text size="sm" fw={500} c="teal">
                        {`${(Number(order.totalWeight) / 1000).toFixed(2)} kg`}
                      </Text>
                    </Stack>
                  )}

                  {(order.courierName || order.trackingNumber) && (
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.courierTracking')}</Text>
                      <Text size="xs">{order.courierName} / {order.trackingNumber}</Text>
                    </Stack>
                  )}
                </Box>

                {(order.lotNumber || order.bdCourierTracking) && (
                  <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {order.lotNumber && (
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.lotNumber')}</Text>
                        <Text size="sm" fw={500}>{order.lotNumber}</Text>
                      </Stack>
                    )}
                    {order.bdCourierTracking && (
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.bdTracking')}</Text>
                        <Text size="sm" fw={500}>{order.bdCourierTracking}</Text>
                      </Stack>
                    )}
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Order Items */}
            <Paper withBorder p="md" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
              <Stack gap="md">
                <Text fw={600} size="lg">{t('procurement.ordersPage.details.items', { count: order.items.length })}</Text>

                {/* Desktop Table */}
                <Box className="hidden md:block">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('procurement.ordersPage.details.product')}</Table.Th>
                        <Table.Th style={{ width: 100 }}>{t('procurement.ordersPage.details.quantity')}</Table.Th>
                        {order.status === 'draft' ? (
                          <>
                            <Table.Th style={{ width: 150 }}>Unit Price (RMB)</Table.Th>
                            <Table.Th style={{ width: 150 }}>Total (RMB)</Table.Th>
                          </>
                        ) : (
                          <>
                            <Table.Th style={{ width: 150 }}>BD Price</Table.Th>
                            <Table.Th style={{ width: 150 }}>Total (BDT)</Table.Th>
                          </>
                        )}
                        {(order.status === 'arrived_bd' || order.status === 'in_transit_bogura' || order.status === 'received_hub') && (
                          <Table.Th style={{ width: 150 }}>{t('procurement.ordersPage.details.shippingCost')}</Table.Th>
                        )}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {order.items.map((item) => {
                        const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order?.exchangeRate))
                        const totalBdt = bdPrice * item.quantity
                        const totalRmb = Number(item.china_price) * item.quantity

                        return (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {item.product.name}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{item.quantity}</Text>
                            </Table.Td>
                            {order.status === 'draft' ? (
                              <>
                                <Table.Td>
                                  <Stack gap={0}>
                                    <Text size="sm" fw={500}>
                                      ¥{Number(item.china_price).toFixed(2)}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      ৳{Number(bdPrice).toFixed(2)}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={0}>
                                    <Text size="sm" fw={600} c="cyan">
                                      ¥{Number(totalRmb).toFixed(2)}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      ৳{Number(totalBdt).toFixed(2)}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                              </>
                            ) : (
                              <>
                                <Table.Td>
                                  <Text size="sm">
                                    ৳{Number(bdPrice).toFixed(2)}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" fw={600} c="blue">
                                    ৳{Number(totalBdt).toFixed(2)}
                                  </Text>
                                </Table.Td>
                              </>
                            )}
                            {(order.status === 'arrived_bd' || order.status === 'in_transit_bogura' || order.status === 'received_hub') && (
                              <Table.Td>
                                <Text size="sm" c="blue">
                                  ৳{Number(item.shippingCost || 0).toFixed(2)}
                                </Text>
                              </Table.Td>
                            )}
                          </Table.Tr>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                </Box>

                {/* Mobile Cards */}
                <Box className="block md:hidden">
                  <Stack gap="sm">
                    {order.items.map((item) => (
                      <Card withBorder p="sm" radius="sm" key={item.id}>
                        <Stack gap="xs">
                          <Text size="sm" fw={600}>{item.product.name}</Text>

                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.quantity')}</Text>
                            <Text size="xs" fw={500}>{item.quantity}</Text>
                          </Group>

                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.unitPrice')}</Text>
                            {order.status === 'draft' ? (
                              <Stack gap={0} align="end">
                                <Text size="xs" fw={500}>¥{Number(item.china_price).toFixed(2)}</Text>
                                <Text size="xs" c="dimmed">
                                  ৳{Number(item.bdPrice || (Number(item.china_price) * Number(order?.exchangeRate))).toFixed(2)}
                                </Text>
                              </Stack>
                            ) : (
                              <Text size="xs">¥{Number(item.china_price).toFixed(2)}</Text>
                            )}
                          </Group>

                          <Stack gap={0}>
                            <Group justify="space-between">
                              <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.total')} (RMB)</Text>
                              <Text size="sm" fw={600}>¥{Number(item.totalPrice).toFixed(2)}</Text>
                            </Group>
                            <Group justify="space-between">
                              <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.total')} (BDT)</Text>
                              <Text size="xs">৳{calculateBdt(Number(item.totalPrice)).toFixed(2)}</Text>
                            </Group>
                            {(order.status === 'arrived_bd' || order.status === 'in_transit_bogura' || order.status === 'received_hub') && (
                              <Group justify="space-between">
                                <Text size="xs" c="dimmed">{t('procurement.ordersPage.details.shippingCost')}</Text>
                                <Text size="xs" c="blue">৳{Number(item.shippingCost || 0).toFixed(2)}</Text>
                              </Group>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Box>

                {/* Totals */}
                <Paper
                  withBorder
                  p="md"
                  radius="sm"
                  bg={colorScheme === 'dark' ? 'dark.7' : 'gray.0'}
                >
                  <Stack gap="sm">
                    <Stack gap={4}>
                      {/* Items Total */}
                      {order.status === 'draft' ? (
                        <Group justify="space-between">
                          <Text size="sm">Items Total (RMB)</Text>
                          <Stack gap={0} align="end">
                            <Text size="sm" fw={600} c="cyan">
                              ¥{Number(order.items.reduce((sum, item) => sum + (Number(item.china_price) * item.quantity), 0)).toFixed(2)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ৳{Number(order.items.reduce((sum, item) => {
                                const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order.exchangeRate))
                                return sum + (bdPrice * item.quantity)
                              }, 0)).toFixed(2)} BDT
                            </Text>
                          </Stack>
                        </Group>
                      ) : (
                        <Group justify="space-between">
                          <Text size="sm">{t('procurement.ordersPage.details.totals.itemsTotalBdt')}</Text>
                          <Text size="sm" c="dimmed">
                            ৳{Number(order.items.reduce((sum, item) => {
                              const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order.exchangeRate))
                              return sum + (bdPrice * item.quantity)
                            }, 0)).toFixed(2)}
                          </Text>
                        </Group>
                      )}

                      {/* Shipping Cost - only show when present */}
                      {((order.totalShippingCost && order.totalShippingCost > 0) || extractShippingCostFromHistory() > 0) && (
                        <Group justify="space-between">
                          <Text size="sm">{t('procurement.ordersPage.details.totals.shippingCost')}</Text>
                          <Text size="sm" fw={500} c="blue">
                            ৳{Number((Number(order.totalShippingCost) || 0) || extractShippingCostFromHistory()).toFixed(2)}
                          </Text>
                        </Group>
                      )}

                      {/* Extra Cost - only show when present */}
                      {((order.extraCost && order.extraCost > 0) || extractExtraCostFromHistory() > 0) && (
                        <Group justify="space-between">
                          <Text size="sm">{t('procurement.ordersPage.details.totals.extraCost')}</Text>
                          <Text size="sm" fw={500} c="blue">
                            ৳{Number((Number(order.extraCost) || 0) || extractExtraCostFromHistory()).toFixed(2)}
                          </Text>
                        </Group>
                      )}

                      <Divider />

                      {/* Grand Total */}
                      <Group justify="space-between" align="flex-end">
                        <Text size="lg" fw={600}>{t('procurement.ordersPage.details.totals.grandTotal')}</Text>
                        <Stack gap={0} align="end">
                          {order.status === 'draft' ? (
                            <>
                              <Text size="xl" fw={700} className="text-xl md:text-2xl" c="cyan">
                                ¥{Number(order.items.reduce((sum, item) => sum + (Number(item.china_price) * item.quantity), 0)).toFixed(2)}
                              </Text>
                              <Text size="sm" c="dimmed">
                                ৳{Number(calculateGrandTotal()).toFixed(2)} BDT
                              </Text>
                              <Text size="xs" c="dimmed" italic>{t('procurement.ordersPage.details.totals.note')}</Text>
                            </>
                          ) : (
                            <>
                              <Text size="xl" fw={700} className="text-xl md:text-2xl" c="blue">
                                ৳{Number(calculateGrandTotal()).toFixed(2)} BDT
                              </Text>
                              <Text size="xs" c="dimmed" italic>{t('procurement.ordersPage.details.totals.note')}</Text>
                            </>
                          )}
                        </Stack>
                      </Group>
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>

            {/* Lost and Found Section - Show forever if order has lost items (regardless of current status) */}
            {hasLostItems && (
              <Paper withBorder p="md" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconAlertTriangle size={18} style={{ color: '#ED6B5E' }} />
                    <Text fw={600} size="lg">{t('procurement.lostAndFound.title')}</Text>
                  </Group>

                  {/* Desktop Table */}
                  <Box className="hidden md:block">
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('procurement.lostAndFound.tableHeaders.product')}</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>{t('procurement.lostAndFound.tableHeaders.ordered')}</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>{t('procurement.lostAndFound.tableHeaders.received')}</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>{t('procurement.lostAndFound.tableHeaders.lost')}</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>{t('procurement.lostAndFound.tableHeaders.found')}</Table.Th>
                          <Table.Th style={{ textAlign: 'center' }}>{t('procurement.lostAndFound.tableHeaders.unitPrice')}</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>{t('procurement.lostAndFound.tableHeaders.lostCost')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {order.items
                          .filter((item) => {
                            const receivedQty = item.receivedQuantity || item.quantity
                            return receivedQty !== item.quantity
                          })
                          .map((item) => {
                            const orderedQty = item.quantity
                            const receivedQty = item.receivedQuantity || orderedQty
                            const lostQty = Math.max(0, orderedQty - receivedQty)
                            const foundQty = Math.max(0, receivedQty - orderedQty)
                            const bdPrice = Number(item.bdPrice) || (Number(item.china_price) * Number(order?.exchangeRate))
                            const lostCost = lostQty * bdPrice

                            return (
                              <Table.Tr key={item.id}>
                                <Table.Td>
                                  <Text size="sm" fw={500}>{item.product.name}</Text>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Badge color="gray">{orderedQty}</Badge>
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Badge color={receivedQty < orderedQty ? 'orange' : receivedQty > orderedQty ? 'green' : 'blue'}>
                                    {receivedQty}
                                  </Badge>
                                </Table.Td>
                                <Table.Td ta="center">
                                  {lostQty > 0 ? (
                                    <Badge color="red">{lostQty}</Badge>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td ta="center">
                                  {foundQty > 0 ? (
                                    <Badge color="green">+{foundQty}</Badge>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td ta="center">
                                  <Text size="xs" c="dimmed">৳{bdPrice.toFixed(2)}</Text>
                                </Table.Td>
                                <Table.Td ta="right">
                                  {lostQty > 0 ? (
                                    <Text size="sm" fw={700} c="red">
                                      -৳{lostCost.toFixed(2)}
                                    </Text>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            )
                          })}
                      </Table.Tbody>
                    </Table>
                  </Box>

                  {/* Mobile Cards */}
                  <Box className="block md:hidden">
                    <Stack gap="sm">
                      {order.items
                        .filter((item) => {
                          const receivedQty = item.receivedQuantity || item.quantity
                          return receivedQty !== item.quantity
                        })
                        .map((item) => {
                          const orderedQty = item.quantity
                          const receivedQty = item.receivedQuantity || orderedQty
                          const lostQty = Math.max(0, orderedQty - receivedQty)
                          const foundQty = Math.max(0, receivedQty - orderedQty)
                          const bdPrice = Number(item.bdPrice) || (Number(item.china_price) * Number(order?.exchangeRate))
                          const lostCost = lostQty * bdPrice

                          return (
                            <Card withBorder p="sm" radius="sm" key={item.id}>
                              <Stack gap="xs">
                                <Text size="sm" fw={600}>{item.product.name}</Text>

                                <SimpleGrid cols={3}>
                                  <Stack gap={0}>
                                    <Text size="xs" c="dimmed">{t('procurement.lostAndFound.tableHeaders.ordered')}</Text>
                                    <Text size="sm" fw={500}>{orderedQty}</Text>
                                  </Stack>
                                  <Stack gap={0}>
                                    <Text size="xs" c="dimmed">{t('procurement.lostAndFound.tableHeaders.received')}</Text>
                                    <Text size="sm" fw={500} c={receivedQty < orderedQty ? 'orange' : receivedQty > orderedQty ? 'green' : 'blue'}>
                                      {receivedQty}
                                    </Text>
                                  </Stack>
                                  <Stack gap={0}>
                                    <Text size="xs" c="dimmed">{t('procurement.lostAndFound.tableHeaders.lost')}</Text>
                                    <Text size="sm" fw={500} c={lostQty > 0 ? 'red' : 'dimmed'}>
                                      {lostQty > 0 ? lostQty : '-'}
                                    </Text>
                                  </Stack>
                                </SimpleGrid>

                                {foundQty > 0 && (
                                  <Group gap="xs">
                                    <Badge color="green">{t('procurement.lostAndFound.tableHeaders.found')}: +{foundQty}</Badge>
                                  </Group>
                                )}

                                <Divider />

                                <SimpleGrid cols={2}>
                                  <Group justify="space-between">
                                    <Text size="xs" c="dimmed">{t('procurement.lostAndFound.tableHeaders.unitPrice')}</Text>
                                    <Text size="xs" c="blue">৳{bdPrice.toFixed(2)}</Text>
                                  </Group>
                                  <Group justify="space-between">
                                    <Text size="xs" c="dimmed">{t('procurement.lostAndFound.tableHeaders.lostCost')}</Text>
                                    {lostQty > 0 ? (
                                      <Text size="sm" fw={700} c="red">-৳{lostCost.toFixed(2)}</Text>
                                    ) : (
                                      <Text size="xs" c="dimmed">-</Text>
                                    )}
                                  </Group>
                                </SimpleGrid>
                              </Stack>
                            </Card>
                          )
                        })}
                    </Stack>
                  </Box>

                  {/* Summary - Total Lost Cost */}
                  <Paper
                    withBorder
                    p="md"
                    radius="sm"
                    bg={colorScheme === 'dark' ? 'red.9' : 'red.0'}
                  >
                    <Stack gap={0}>
                      <Group justify="space-between">
                        <Text size="sm" c="white" fw={600}>
                          <IconAlertTriangle size={16} style={{ display: 'inline', marginRight: 4 }} />
                          {t('procurement.lostAndFound.summary.totalLostCost')}
                        </Text>
                        <Text size="lg" fw={700} c="white">
                          ৳{Number(order.items.reduce((sum, item) => {
                            const receivedQty = item.receivedQuantity || item.quantity
                            const lostQty = Math.max(0, item.quantity - receivedQty)
                            const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order?.exchangeRate))
                            return sum + (lostQty * bdPrice)
                          }, 0)).toFixed(2)}
                        </Text>
                      </Group>
                      <Text size="xs" c="white" mt={4}>
                        {t('procurement.lostAndFound.summary.description')}
                      </Text>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>
            )}

            {/* Info Alert */}
            {order.status === 'draft' && (
              <Alert color="blue">
                <Text size="sm">
                  {t('procurement.ordersPage.details.alerts.draft')}
                </Text>
              </Alert>
            )}

            {/* Partially Completed Alert */}
            {isPartiallyCompleted && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm">
                  {t('procurement.ordersPage.details.alerts.partiallyCompleted')}
                </Text>
              </Alert>
            )}

            {/* Completed Alert */}
            {isCompleted && (
              <Alert color="green" icon={<IconCircleCheck size={16} />}>
                <Text size="sm">
                  {t('procurement.ordersPage.details.alerts.completed')}
                </Text>
              </Alert>
            )}
          </Stack>
        </Box>
      </Stack>

      {/* Status Change Modal */}
      <Modal
        opened={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={
          <Text size="lg" fw={600}>
            {t('procurement.ordersPage.details.statusUpdate.update')}
          </Text>
        }
        size="lg"
      >
        <Stack gap="md">
          {/* Status Transition Indicator */}
          <Paper
            withBorder
            p="md"
            radius="md"
            bg={colorScheme === 'dark' ? 'dark.7' : 'gray.0'}
          >
            <Group justify="center" gap="xs" wrap="wrap">
              <Badge size="lg" color={STATUS_FLOW[currentStatusIndex]?.color || 'gray'}>
                {STATUS_FLOW[currentStatusIndex]?.label || order.status}
              </Badge>
              <IconChevronRight size={20} color="gray" />
              <Badge size="lg" color={nextStatus?.color || 'blue'} variant="light">
                {nextStatus?.label || String(nextStatus?.value || nextStatus || '')}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" ta="center" mt="xs">
              {t('procurement.ordersPage.details.statusUpdate.transitionDescription')}
            </Text>
          </Paper>
          {order.status === 'draft' && (
            <>
              {/* Info Alert - Enhanced */}
              <Alert
                variant="light"
                color="blue"
                radius="md"
                icon={<IconAlertTriangle size={20} />}
              >
                <Text size="sm" fw={500}>
                  {t('procurement.ordersPage.details.statusUpdate.draft.message')}
                </Text>
              </Alert>

              {/* Exchange Rate Input - Enhanced Card */}
              <Paper withBorder p="lg" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
                <Stack gap="md">
                  {/* Order Summary */}
                  <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Paper
                      p="md"
                      radius="sm"
                      bg={colorScheme === 'dark' ? 'blue.9' : 'blue.0'}
                    >
                      <Stack gap={0}>
                        <Text size="xs" c="blue" fw={600} tt="uppercase">Order Total (RMB)</Text>
                        <Text size="xl" fw={700} c="blue">¥{Number(order?.totalAmount || 0).toFixed(2)}</Text>
                      </Stack>
                    </Paper>

                    <Paper
                      p="md"
                      radius="sm"
                      bg={statusFormData.exchangeRate > 0
                        ? (colorScheme === 'dark' ? 'green.9' : 'green.0')
                        : (colorScheme === 'dark' ? 'dark.7' : 'gray.0')
                      }
                    >
                      <Stack gap={0}>
                        <Text size="xs" c={statusFormData.exchangeRate > 0 ? 'green' : 'gray'} fw={600} tt="uppercase">
                          Order Total (BDT)
                        </Text>
                        <Text
                          size="xl"
                          fw={700}
                          c={statusFormData.exchangeRate > 0 ? 'green' : 'gray'}
                        >
                          ৳{(Number(order?.totalAmount || 0) * Number(statusFormData.exchangeRate || 0)).toFixed(2)}
                        </Text>
                      </Stack>
                    </Paper>
                  </Box>

                  <Divider label="Set Exchange Rate" labelPosition="center" />

                  {/* Exchange Rate Input */}
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={600} size="sm">{t('procurement.ordersPage.details.statusUpdate.draft.exchangeRate')}</Text>
                      {statusFormData.exchangeRate > 0 && (
                        <Badge color="green" variant="light">Active</Badge>
                      )}
                    </Group>

                    <NumberInput
                      description={t('procurement.ordersPage.details.statusUpdate.draft.exchangeRateDescription')}
                      value={statusFormData.exchangeRate}
                      onChange={(v) => updateStatusFormField('exchangeRate', typeof v === 'number' ? v : parseFloat(v) || 0)}
                      min={0}
                      required
                      size="lg"
                      styles={{
                        input: {
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          textAlign: 'center',
                        },
                      }}
                      leftSection={<Text size="xl" fw={600} c="dimmed">৳</Text>}
                      rightSection={<Text size="sm" c="dimmed">per ¥1</Text>}
                    />
                  </Stack>
                </Stack>
              </Paper>

              {/* Payment Account Selection - Enhanced */}
              {order.status === 'draft' && (
                <Paper withBorder p="lg" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
                  <Stack gap="md">
                    <Group gap="sm">
                      <IconBuilding size={20} style={{ color: '#228BE6' }} />
                      <Text fw={600} size="sm">Select Payment Account*</Text>
                    </Group>

                    <Select
                      placeholder="Choose bank or mobile wallet"
                      data={banks.map(bank => ({
                          value: bank.id.toString(),
                          label: `${bank.name} - ৳${Number(bank.currentBalance).toFixed(2)} BDT`,
                        }))}
                        value={statusFormData.paymentAccountId?.toString()}
                        onChange={(value) => updateStatusFormField('paymentAccountId', value ? Number(value) : null)}
                        required
                        size="md"
                        nothingFoundMessage="No active bank accounts found"
                        error={!!paymentAccountError}
                        styles={{
                          input: {
                            fontSize: '1rem',
                          },
                        }}
                      />

                      {/* Inline Error Message */}
                      {paymentAccountError && (
                        <Text c="red" size="sm" mt={4}>
                          {paymentAccountError}
                        </Text>
                      )}

                      {/* Final Balance Warning - Enhanced */}
                      {statusFormData.paymentAccountId && paymentBreakdown!.from_bank > 0 && (() => {
                        const bank = banks.find(b => b.id === statusFormData.paymentAccountId)
                        if (!bank) return null
                        const finalBalance = calculateFinalBankBalance(
                          Number(bank.currentBalance),
                          paymentBreakdown!.from_bank
                        )
                        const isNegative = finalBalance < 0

                        return (
                          <Alert
                            variant="light"
                            color={isNegative ? 'red' : 'teal'}
                            radius="sm"
                            icon={isNegative ? <IconAlertTriangle size={18} /> : <IconCheck size={18} />}
                          >
                            <Stack gap={4}>
                              <Text size="sm" fw={600}>
                                {isNegative ? '⚠️ Insufficient Funds' : '✓ Balance Update'}
                              </Text>
                              <Text size="sm">
                                Current: <Text fw={600} c="dimmed">৳{Number(bank.currentBalance).toFixed(2)}</Text>
                                {' → '}
                                After Payment: <Text fw={700} c={isNegative ? 'red' : 'teal'}>৳{Number(finalBalance).toFixed(2)}</Text>
                              </Text>
                            </Stack>
                          </Alert>
                        )
                      })()}
                    </Stack>
                  </Paper>
                )}
              </>
            )}

          {order.status === 'payment_confirmed' && (
            <>
              <Alert color="cyan">
                <Text size="sm">
                  {t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.message')}
                </Text>
              </Alert>

              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.courierName')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.courierPlaceholder')}
                value={statusFormData.courierName}
                onChange={(e) => updateStatusFormField('courierName', e.target.value)}
                leftSection={<IconPlane size={16} />}
              />

              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.trackingNumber')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.trackingPlaceholder')}
                value={statusFormData.trackingNumber}
                onChange={(e) => updateStatusFormField('trackingNumber', e.target.value)}
                leftSection={<IconScreenshot size={16} />}
              />
            </>
          )}

          {order.status === 'warehouse_received' && (
            <>
              <Alert color="indigo">
                <Text size="sm">
                  {t('procurement.ordersPage.details.statusUpdate.warehouseReceived.message')}
                </Text>
              </Alert>

              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.warehouseReceived.lotNumber')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.warehouseReceived.lotPlaceholder')}
                value={statusFormData.lotNumber}
                onChange={(e) => updateStatusFormField('lotNumber', e.target.value)}
                leftSection={<IconHash size={16} />}
              />
            </>
          )}

          {order.status === 'shipped_bd' && (
            <>
              {/* Info Alert - Enhanced */}
              <Alert
                variant="light"
                color="purple"
                radius="md"
                icon={<IconPlane size={20} />}
              >
                <Text size="sm" fw={500}>
                  {t('procurement.ordersPage.details.statusUpdate.shippedBd.message')}
                </Text>
              </Alert>

              {/* Order Summary Card */}
              <Paper withBorder p="lg" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
                <Stack gap="md">
                  <Group gap="sm">
                    <IconPackage size={20} style={{ color: '#9333EA' }} />
                    <Text fw={600} size="sm">Order Summary</Text>
                  </Group>

                  {/* Items List - Invoice Style */}
                  <Paper p="sm" radius="sm" bg={colorScheme === 'dark' ? 'dark.7' : 'white'} withBorder>
                    <Text size="xs" c="dimmed" mb="xs" fw={600}>Items in this shipment:</Text>

                    {/* Header Row */}
                    <Group justify="space-between" align="center" px="xs" pb={2}>
                      <Text size="xs" fw={700} c="dimmed" style={{ width: '25%' }}>Item</Text>
                      <Text size="xs" fw={700} c="dimmed" ta="center" style={{ width: '60%' }}>Calculation (¥Price × ৳Rate × Qty)</Text>
                      <Text size="xs" fw={700} c="dimmed" ta="right" style={{ width: '15%' }}>Total</Text>
                    </Group>

                    <Divider />

                    <Stack gap={1}>
                      {order.items.map((item) => {
                        // Calculate BD price if not available: china_price × exchange_rate
                        const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order?.exchangeRate))
                        const totalPrice = bdPrice * item.quantity
                        return (
                          <Group key={item.id} justify="space-between" align="center" px="xs" py={2} gap={0}>
                            <Text size="xs" fw={500} style={{ minWidth: '20%', maxWidth: '20%' }} truncate>
                              {item.product.name}
                            </Text>
                            <Text size="xs" c="dimmed" ta="center" style={{ minWidth: '60%', maxWidth: '60%' }}>
                              ¥{Number(item.china_price).toFixed(2)} × {Number(order?.exchangeRate).toFixed(2)} × {item.quantity}
                            </Text>
                            <Text size="xs" fw={600} c="blue" ta="right" style={{ minWidth: '20%', maxWidth: '20%' }}>
                              ৳{Number(totalPrice).toFixed(2)}
                            </Text>
                          </Group>
                        )
                      })}

                      {/* Summary Row */}
                      <Divider my="xs" />
                      <Paper
                        px="xs"
                        py={6}
                        radius="xs"
                        bg={colorScheme === 'dark' ? 'blue.9' : 'blue.0'}
                      >
                        <Group justify="space-between">
                          <Text size="xs" fw={700} c="blue">
                            Total
                          </Text>
                          <Text size="sm" fw={700} c="blue">
                            ৳{Number(order.items.reduce((sum, item) => {
                              const bdPrice = item.bdPrice || (Number(item.china_price) * Number(order?.exchangeRate))
                              return sum + (bdPrice * item.quantity)
                            }, 0)).toFixed(2)}
                          </Text>
                        </Group>
                      </Paper>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>

              {/* Shipping Information Card */}
              <Paper withBorder p="lg" radius="md" bg={colorScheme === 'dark' ? 'dark.6' : 'white'}>
                <Stack gap="md">
                  <Group gap="sm">
                    <IconTruck size={20} style={{ color: '#9333EA' }} />
                    <Text fw={600} size="sm">Shipping Information</Text>
                  </Group>

                  {/* Transport Type Selection */}
                  <Select
                    label={t('procurement.ordersPage.details.statusUpdate.shippedBd.transportType')}
                    placeholder={t('procurement.ordersPage.details.statusUpdate.shippedBd.selectTransport')}
                    value={statusFormData.transportType}
                    onChange={(value) => updateStatusFormField('transportType', value)}
                    data={[
                      { value: 'air', label: '✈️ By Air (Fast)' },
                      { value: 'ship', label: '🚢 By Ship (Economy)' },
                    ]}
                    required
                    size="md"
                  />

                  <Divider label="Weight & Cost Calculation" labelPosition="center" />

                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    {/* Total Weight Input */}
                    <Stack gap="xs">
                      <Text fw={600} size="sm">Total Weight (kg)</Text>
                      <NumberInput
                        placeholder="Enter total weight"
                        value={statusFormData.totalWeight}
                        onChange={(value) => updateStatusFormField('totalWeight', typeof value === 'number' ? value : parseFloat(value) || 0)}
                        min={0}
                        required
                        size="md"
                        styles={{
                          input: {
                            fontSize: '1.25rem',
                            fontWeight: 600,
                          },
                        }}
                        rightSection={<Text size="sm" fw={600} c="purple">kg</Text>}
                      />
                    </Stack>

                    {/* Shipping Cost Per KG Input */}
                    <Stack gap="xs">
                      <Text fw={600} size="sm">Shipping Cost (per kg)</Text>
                      <NumberInput
                        placeholder="Enter cost per kg"
                        value={statusFormData.shippingCostPerKg}
                        onChange={(value) => updateStatusFormField('shippingCostPerKg', typeof value === 'number' ? value : parseFloat(value) || 0)}
                        min={0}
                        required
                        size="md"
                        styles={{
                          input: {
                            fontSize: '1.25rem',
                            fontWeight: 600,
                          },
                        }}
                        leftSection={<Text size="lg" fw={600} c="dimmed">৳</Text>}
                        rightSection={<Text size="sm" fw={600} c="dimmed">/kg</Text>}
                      />
                    </Stack>
                  </SimpleGrid>

                  {/* Calculated Total Shipping Cost */}
                  <Paper withBorder p="md" radius="md" bg={colorScheme === 'dark' ? 'dark.7' : 'gray.0'}>
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed" fw={500}>Total Shipping Cost</Text>
                      <Group justify="space-between" align="flex-end">
                        <Text size="sm" c="dimmed">
                          {statusFormData.totalWeight} kg × ৳{statusFormData.shippingCostPerKg}/kg
                        </Text>
                        <Text
                          size="xxl"
                          fw={700}
                        >
                          ৳{(Number(statusFormData.totalWeight || 0) * Number(statusFormData.shippingCostPerKg || 0)).toFixed(2)}
                        </Text>
                      </Group>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>
            </>
          )}

          {order.status === 'arrived_bd' && (
            <>
              <Alert color="orange">
                <Text size="sm">
                  {t('procurement.ordersPage.details.statusUpdate.arrivedBd.message')}
                </Text>
              </Alert>

              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdCourierTracking')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdPlaceholder')}
                value={statusFormData.bdCourierTracking}
                onChange={(e) => updateStatusFormField('bdCourierTracking', e.target.value)}
                leftSection={<IconTruck size={16} />}
              />
            </>
          )}

          {/* Comments Field - Always Show */}
          <TextInput
            label={t('procurement.ordersPage.details.statusUpdate.comments')}
            placeholder={t('procurement.ordersPage.details.statusUpdate.commentsPlaceholder')}
            value={statusFormData.comments}
            onChange={(e) => updateStatusFormField('comments', e.target.value)}
            description={t('procurement.ordersPage.details.statusUpdate.commentsDescription')}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={() => setStatusModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={updatingStatus}
              onClick={handleStatusChange}
              color={nextStatus?.color === 'red' ? 'red' : undefined}
            >
              {t('procurement.ordersPage.details.statusUpdate.update')}
            </Button>
          </Group>
        </Stack>
      </Modal>



      {/* Receiving Modal - for "in_transit_bogura" → "received_hub" transition */}
      <ReceivingModal
        opened={receivingModalOpen}
        onClose={() => setReceivingModalOpen(false)}
        onSubmit={handleReceivingSubmit}
        items={order?.items || []}
        exchangeRate={order?.exchangeRate || 0}
        poNumber={order?.poNumber || ''}
        totalWeight={Number(order?.totalWeight) || 0}
        shippingCostPerKg={Number(order?.shippingCostPerKg) || 0}
      />

      {/* Unified Timeline Edit Modal - Single modal for editing both status data and comments */}
      <Modal
        opened={timelineEditModalOpen}
        onClose={() => setTimelineEditModalOpen(false)}
        title={
          <Text size="lg" fw={600}>
            {t('procurement.ordersPage.details.actions.editData.title', { status: getStatusLabel(editingStatusValue, STATUS_FLOW) })}
          </Text>
        }
        size="md"
      >
        <Stack gap="md">
          {/* Info alert */}
          <Alert color="blue">
            <Text size="sm">
              {t('procurement.ordersPage.details.actions.editData.success')}
            </Text>
          </Alert>

          {/* Exchange Rate - Payment Confirmed */}
          {editingStatusValue === 'payment_confirmed' && (
            <NumberInput
              label={t('procurement.ordersPage.details.statusUpdate.draft.exchangeRate')}
              description={t('procurement.ordersPage.details.statusUpdate.draft.exchangeRateDescription')}
              value={timelineEditData.exchangeRate}
              onChange={(v) => updateTimelineEditField('exchangeRate', typeof v === 'number' ? v : parseFloat(v) || 0)}

              min={0}
              leftSection={<Text c="dimmed">৳</Text>}
            />
          )}

          {/* Supplier Dispatched - Courier Info */}
          {editingStatusValue === 'supplier_dispatched' && (
            <>
              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.courierName')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.courierPlaceholder')}
                value={timelineEditData.courierName}
                onChange={(e) => updateTimelineEditField('courierName', e.target.value)}
                leftSection={<IconPlane size={16} />}
              />
              <TextInput
                label={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.trackingNumber')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.paymentConfirmed.trackingPlaceholder')}
                value={timelineEditData.trackingNumber}
                onChange={(e) => updateTimelineEditField('trackingNumber', e.target.value)}
                leftSection={<IconScreenshot size={16} />}
              />
            </>
          )}

          {/* Warehouse Received - Lot Number */}
          {editingStatusValue === 'warehouse_received' && (
            <TextInput
              label={t('procurement.ordersPage.details.statusUpdate.warehouseReceived.lotNumber')}
              placeholder={t('procurement.ordersPage.details.statusUpdate.warehouseReceived.lotPlaceholder')}
              value={timelineEditData.lotNumber}
              onChange={(e) => updateTimelineEditField('lotNumber', e.target.value)}
              leftSection={<IconHash size={16} />}
            />
          )}

          {/* Shipped BD - Transport Type, Weight, Shipping Cost */}
          {editingStatusValue === 'shipped_bd' && (
            <>
              <Select
                label={t('procurement.ordersPage.details.statusUpdate.shippedBd.transportType')}
                placeholder={t('procurement.ordersPage.details.statusUpdate.shippedBd.selectTransport')}
                value={timelineEditData.transportType}
                onChange={(value) => updateTimelineEditField('transportType', value || '')}
                data={[
                  { value: 'air', label: '✈️ By Air (Fast)' },
                  { value: 'ship', label: '🚢 By Ship (Economy)' },
                ]}
                leftSection={<IconPlane size={16} />}
              />

              <NumberInput
                label="Total Weight (kg)"
                placeholder="Enter total weight"
                value={timelineEditData.totalWeight}
                onChange={(value) => updateTimelineEditField('totalWeight', typeof value === 'number' ? value : parseFloat(value) || 0)}
                min={0}
                leftSection={<IconWeight size={16} />}
                rightSection={<Text size="sm">kg</Text>}
              />

              <NumberInput
                label="Shipping Cost (per kg)"
                placeholder="Enter shipping cost per kg"
                value={timelineEditData.shippingCostPerKg}
                onChange={(value) => updateTimelineEditField('shippingCostPerKg', typeof value === 'number' ? value : parseFloat(value) || 0)}
                min={0}
                leftSection={<Text c="dimmed">৳</Text>}
                rightSection={<Text size="sm">/kg</Text>}
              />
            </>
          )}

          {/* Arrived BD - BD Courier Tracking */}
          {editingStatusValue === 'arrived_bd' && (
            <TextInput
              label={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdCourierTracking')}
              placeholder={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdPlaceholder')}
              value={timelineEditData.bdCourierTracking}
              onChange={(e) => updateTimelineEditField('bdCourierTracking', e.target.value)}
              leftSection={<IconTruck size={16} />}
            />
          )}

          {/* In Transit Bogura - BD Courier Tracking */}
          {editingStatusValue === 'in_transit_bogura' && (
            <TextInput
              label={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdCourierTracking')}
              placeholder={t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdPlaceholder')}
              value={timelineEditData.bdCourierTracking}
              onChange={(e) => updateTimelineEditField('bdCourierTracking', e.target.value)}
              leftSection={<IconTruck size={16} />}
            />
          )}

          {/* Comments - Always show for all statuses */}
          <Textarea
            label={t('procurement.ordersPage.details.statusUpdate.comments')}
            placeholder={t('procurement.ordersPage.details.statusUpdate.commentsPlaceholder')}
            value={timelineEditData.comments}
            onChange={(e) => updateTimelineEditField('comments', e.target.value)}
            minRows={3}
            maxRows={6}
            description={t('procurement.ordersPage.details.statusUpdate.commentsDescription')}
          />

          {/* Action Buttons */}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => setTimelineEditModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              loading={savingTimelineEdit}
              onClick={handleSaveTimelineEdit}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Approve & Stock Confirmation Modal */}
      <Modal
        opened={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title={
          <Text size="lg" fw={600}>
            {t('procurement.ordersPage.details.actions.approveConfirm.title')}
          </Text>
        }
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            {t('procurement.ordersPage.details.actions.approveConfirm.message', { poNumber: order?.poNumber })}
          </Text>
          <Text size="sm" c="dimmed">
            {t('procurement.ordersPage.details.actions.approveConfirm.warning')}
          </Text>

          {order?.status === 'partially_completed' && (
            <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm">
                {t('procurement.ordersPage.details.actions.approveConfirm.partialWarning')}
              </Text>
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => setApproveModalOpen(false)}
              disabled={approvingStock}
            >
              {t('procurement.ordersPage.details.actions.approveConfirm.cancel')}
            </Button>
            <Button
              color={order?.status === 'partially_completed' ? 'orange' : 'green'}
              onClick={handleApproveAndStock}
              loading={approvingStock}
              leftSection={<IconCircleCheck size={16} />}
            >
              {t('procurement.ordersPage.details.actions.approveConfirm.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
