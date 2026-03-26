'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Select,
  Badge,
  Box,
  Table,
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Skeleton,
  TextInput,
  Modal,
} from '@mantine/core'
import {
  IconChevronRight,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconFilter,
  IconCurrencyYuan,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getPurchaseOrders,
  getSuppliers,
  deletePurchaseOrder,
  getPurchaseOrderStatistics,
} from '@/utils/api'
import {
  useProcurementOrdersStore,
  useOrders,
  useSuppliers as useSuppliersData,
  useStatistics,
  useOrdersLoading,
  useOrdersRefreshing,
  useDeletingId,
  useOrdersFilters,
  useOrdersPagination,
  useDeleteModal,
  type PurchaseOrder,
} from '@/stores/procurementOrdersStore'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Status color mapping for badges
 * Maps status slug to Mantine color name
 */
const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  payment_confirmed: 'blue',
  supplier_dispatched: 'cyan',
  warehouse_received: 'teal',
  shipped_bd: 'indigo',
  arrived_bd: 'purple',
  in_transit_bogura: 'orange',
  received_hub: 'lime',
  partially_completed: 'orange',
  completed: 'green',
  lost: 'red',
}

// ============================================================================
// PURE UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates translated status labels object
 * @param t - Translation function from i18next
 * @returns Object mapping status slugs to translated labels
 */
const getStatusLabels = (t: (key: string) => string): Record<string, string> => ({
  draft: t('procurement.ordersPage.statuses.draft'),
  payment_confirmed: t('procurement.ordersPage.statuses.paymentConfirmed'),
  supplier_dispatched: t('procurement.ordersPage.statuses.supplierDispatched'),
  warehouse_received: t('procurement.ordersPage.statuses.warehouseReceived'),
  shipped_bd: t('procurement.ordersPage.statuses.shippedBd'),
  arrived_bd: t('procurement.ordersPage.statuses.arrivedBd'),
  in_transit_bogura: t('procurement.ordersPage.statuses.inTransitBogura'),
  received_hub: t('procurement.ordersPage.statuses.receivedHub'),
  partially_completed: t('procurement.ordersPage.statuses.partiallyCompleted'),
  completed: t('procurement.ordersPage.statuses.completed'),
  lost: t('procurement.ordersPage.statuses.lost'),
})

/**
 * Calculates BDT amount from RMB and exchange rate
 * @param rmbAmount - Amount in RMB
 * @param exchangeRate - Exchange rate (RMB to BDT)
 * @returns Amount in BDT
 */
const calculateBdt = (rmbAmount: number, exchangeRate: number): number => {
  return rmbAmount * exchangeRate
}

/**
 * Safely converts value to number with fallback
 * @param value - Value to convert
 * @param fallback - Default value if conversion fails
 * @returns Number value or fallback
 */
const toNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value)
  return isNaN(num) ? fallback : num
}

/**
 * Safely extracts array from API response
 * @param response - API response object
 * @returns Array of data
 */
const extractArrayFromResponse = (response: any): any[] => {
  const data = response?.data?.data || response?.data || response || []
  return Array.isArray(data) ? data : []
}

/**
 * Extracts total pages from API response
 * @param response - API response object
 * @returns Total number of pages
 */
const extractTotalPages = (response: any): number => {
  return response?.data?.last_page || 1
}

/**
 * Extracts statistics from API response
 * @param response - API response object
 * @returns Statistics object or null
 */
const extractStatistics = (response: any) => {
  return response?.data || response || null
}

/**
 * Builds filter parameters object from current filter states
 * @param filters - Filter state object
 * @param perPage - Items per page
 * @param currentPage - Current page number
 * @returns Filter parameters object for API call
 */
const buildFilterParams = (
  filters: {
    status: string
    supplierId: string | null
    searchQuery: string
    fromDate: string
    toDate: string
  },
  perPage: number,
  currentPage: number
) => ({
  status: filters.status === 'all' ? undefined : filters.status,
  supplier_id: filters.supplierId ? Number(filters.supplierId) : undefined,
  search: filters.searchQuery || undefined,
  from_date: filters.fromDate || undefined,
  to_date: filters.toDate || undefined,
  per_page: perPage,
  page: currentPage,
})

/**
 * Generates status filter options for Select component
 * @param t - Translation function
 * @returns Array of select options
 */
const getStatusFilterOptions = (t: (key: string) => string) => [
  { value: 'all', label: t('procurement.ordersPage.filters.allStatuses') },
  { value: 'draft', label: t('procurement.ordersPage.statuses.draft') },
  { value: 'payment_confirmed', label: t('procurement.ordersPage.statuses.paymentConfirmed') },
  { value: 'supplier_dispatched', label: t('procurement.ordersPage.statuses.supplierDispatched') },
  { value: 'warehouse_received', label: t('procurement.ordersPage.statuses.warehouseReceived') },
  { value: 'shipped_bd', label: t('procurement.ordersPage.statuses.shippedBd') },
  { value: 'arrived_bd', label: t('procurement.ordersPage.statuses.arrivedBd') },
  { value: 'in_transit_bogura', label: t('procurement.ordersPage.statuses.inTransitBogura') },
  { value: 'received_hub', label: t('procurement.ordersPage.statuses.receivedHub') },
  { value: 'partially_completed', label: t('procurement.ordersPage.statuses.partiallyCompleted') },
  { value: 'completed', label: t('procurement.ordersPage.statuses.completed') },
  { value: 'lost', label: t('procurement.ordersPage.statuses.lost') },
]

/**
 * Generates supplier filter options from suppliers data
 * @param suppliers - Array of supplier objects
 * @returns Array of select options
 */
const getSupplierFilterOptions = (suppliers: any[]) =>
  suppliers.map((supplier) => ({
    value: String(supplier.id),
    label: supplier.name,
  }))

/**
 * Checks if user can edit order based on status and permissions
 * @param orderStatus - Current order status
 * @param hasEditPermission - Whether user has edit permission
 * @returns True if order can be edited
 */
const canEditOrder = (orderStatus: string, hasEditPermission: boolean): boolean => {
  return orderStatus === 'draft' && hasEditPermission
}

/**
 * Checks if user can delete order based on status and permissions
 * @param orderStatus - Current order status
 * @param hasDeletePermission - Whether user has delete permission
 * @returns True if order can be deleted
 */
const canDeleteOrder = (orderStatus: string, hasDeletePermission: boolean): boolean => {
  return orderStatus === 'draft' && hasDeletePermission
}

/**
 * Formats RMB amount for display
 * @param amount - Amount in RMB
 * @returns Formatted string with currency symbol
 */
const formatRmbAmount = (amount: number): string => {
  return `¥${amount.toFixed(2)}`
}

/**
 * Formats BDT amount for display
 * @param amount - Amount in BDT
 * @returns Formatted string with currency symbol
 */
const formatBdtAmount = (amount: number): string => {
  return `৳${amount.toFixed(2)}`
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetches purchase orders from API
 * @param filters - Filter parameters
 * @returns Promise resolving to orders data and pagination info
 */
const fetchOrdersData = async (filters: any) => {
  const response = await getPurchaseOrders(filters)
  return {
    orders: extractArrayFromResponse(response),
    totalPages: extractTotalPages(response),
  }
}

/**
 * Fetches suppliers list from API
 * @returns Promise resolving to suppliers array
 */
const fetchSuppliersData = async () => {
  const response = await getSuppliers({ per_page: 100, is_active: true })
  return extractArrayFromResponse(response)
}

/**
 * Fetches purchase order statistics from API
 * @returns Promise resolving to statistics object
 */
const fetchStatisticsData = async () => {
  const response = await getPurchaseOrderStatistics()
  return extractStatistics(response)
}

// ============================================================================
// UI COMPONENTS (Pure Functions)
// ============================================================================

/**
 * Renders loading skeleton state
 */
const LoadingSkeleton = () => (
  <Box p={{ base: 'md', md: 'xl' }}>
    <Stack gap="md">
      <Skeleton height={40} width="30%" />
      <Skeleton height={100} />
      <Skeleton height={400} />
    </Stack>
  </Box>
)

/**
 * Renders breadcrumb navigation
 * @param t - Translation function
 */
const BreadcrumbsNav = ({ t }: { t: (key: string) => string }) => {
  const items = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.orders') || 'Purchase Orders' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  return <Breadcrumbs separator={<IconChevronRight size={16} />}>{items}</Breadcrumbs>
}

/**
 * Renders page header with title and action buttons
 */
const PageHeader = ({
  t,
  hasCreatePermission,
  onRefresh,
  refreshing,
  navigate,
}: {
  t: (key: string) => string
  hasCreatePermission: boolean
  onRefresh: () => void
  refreshing: boolean
  navigate: (path: string) => void
}) => (
  <Group justify="space-between">
    <Stack gap={0}>
      <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
        {t('procurement.ordersPage.title')}
      </Text>
      <Text size="sm" c="dimmed">
        {t('procurement.ordersPage.subtitle')}
      </Text>
    </Stack>

    <Group gap="sm">
      <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={onRefresh} loading={refreshing}>
        {t('common.refresh')}
      </Button>
      {hasCreatePermission && (
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/procurement/create')}>
          {t('procurement.createPO')}
        </Button>
      )}
    </Group>
  </Group>
)

/**
 * Renders statistics cards
 */
const StatisticsCards = ({
  statistics,
  t,
}: {
  statistics: { totalOrders: number; draftOrders: number; activeOrders: number; totalValueRmb: number }
  t: (key: string) => string
}) => (
  <Box className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
    <Paper withBorder p="md" radius="md">
      <Stack gap={0}>
        <Text size="sm" c="dimmed">
          {t('procurement.ordersPage.statistics.totalOrders')}
        </Text>
        <Text size="xl" fw={700} className="text-xl md:text-2xl">
          {statistics.totalOrders}
        </Text>
      </Stack>
    </Paper>
    <Paper withBorder p="md" radius="md">
      <Stack gap={0}>
        <Text size="sm" c="dimmed">
          {t('procurement.ordersPage.statistics.draftOrders')}
        </Text>
        <Text size="xl" fw={700} className="text-xl md:text-2xl" c="yellow">
          {statistics.draftOrders}
        </Text>
      </Stack>
    </Paper>
    <Paper withBorder p="md" radius="md">
      <Stack gap={0}>
        <Text size="sm" c="dimmed">
          {t('procurement.ordersPage.statistics.activeOrders')}
        </Text>
        <Text size="xl" fw={700} className="text-xl md:text-2xl" c="blue">
          {statistics.activeOrders}
        </Text>
      </Stack>
    </Paper>
    <Paper withBorder p="md" radius="md">
      <Stack gap={0}>
        <Text size="sm" c="dimmed">
          {t('procurement.ordersPage.statistics.totalValueRmb')}
        </Text>
        <Group gap={4} align="flex-end">
          <Text size="xl" fw={700} className="text-xl md:text-2xl">
            {formatRmbAmount(toNumber(statistics.totalValueRmb))}
          </Text>
          <IconCurrencyYuan size={16} />
        </Group>
      </Stack>
    </Paper>
  </Box>
)

/**
 * Renders filter section with all filter inputs
 */
const FiltersSection = ({
  t,
  filters,
  onStatusChange,
  onSupplierChange,
  supplierOptions,
  onSearchChange,
  onFromDateChange,
  onToDateChange,
}: {
  t: (key: string) => string
  filters: { status: string; supplierId: string | null; searchQuery: string; fromDate: string; toDate: string }
  onStatusChange: (value: string | null) => void
  onSupplierChange: (value: string | null) => void
  supplierOptions: { value: string; label: string }[]
  onSearchChange: (value: string) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
}) => (
  <Paper withBorder p="md" radius="md">
    <Stack gap="md">
      <Group gap="xs">
        <IconFilter size={16} />
        <Text fw={600} size="sm">{t('procurement.ordersPage.filters.title')}</Text>
      </Group>

      <Box className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Select
          label={t('procurement.ordersPage.filters.status')}
          placeholder={t('procurement.ordersPage.filters.allStatuses')}
          data={getStatusFilterOptions(t)}
          value={filters.status}
          onChange={onStatusChange}
          clearable
        />

        <Select
          label={t('procurement.ordersPage.filters.supplier')}
          placeholder={t('procurement.ordersPage.filters.allSuppliers')}
          data={supplierOptions}
          value={filters.supplierId}
          onChange={onSupplierChange}
          searchable
          clearable
        />

        <TextInput
          label={t('procurement.ordersPage.filters.search')}
          placeholder={t('procurement.ordersPage.filters.searchPlaceholder')}
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          leftSection={<IconFilter size={16} />}
        />

        <TextInput
          label={t('procurement.ordersPage.filters.fromDate')}
          type="date"
          value={filters.fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
        />

        <TextInput
          label={t('procurement.ordersPage.filters.toDate')}
          type="date"
          value={filters.toDate}
          onChange={(e) => onToDateChange(e.target.value)}
        />
      </Box>
    </Stack>
  </Paper>
)

/**
 * Renders empty state when no orders found
 */
const EmptyState = ({
  t,
  hasCreatePermission,
  onCreateClick,
}: {
  t: (key: string) => string
  hasCreatePermission: boolean
  onCreateClick: () => void
}) => (
  <Box p="xl" ta="center">
    <Stack gap="sm" align="center">
      <Text size="lg" c="dimmed">
        {t('procurement.ordersPage.notifications.noOrdersFound')}
      </Text>
      {hasCreatePermission && (
        <Button leftSection={<IconPlus size={16} />} onClick={onCreateClick} variant="light">
          {t('procurement.createPO')}
        </Button>
      )}
    </Stack>
  </Box>
)

/**
 * Renders desktop table row for an order
 */
const OrderTableRow = ({
  order,
  statusLabels,
  navigate,
  hasEditPermission,
  hasDeletePermission,
  deleting,
  onDeleteClick,
}: {
  order: PurchaseOrder
  statusLabels: Record<string, string>
  navigate: (path: string) => void
  hasEditPermission: boolean
  hasDeletePermission: boolean
  deleting: number | null
  onDeleteClick: (id: number, poNumber: string) => void
}) => {
  // Handle both camelCase and snake_case field names
  const poNumber = (order as any).poNumber || (order as any).po_number
  const totalAmount = toNumber((order as any).totalAmount || (order as any).total_amount)
  const exchangeRate = toNumber((order as any).exchangeRate || (order as any).exchange_rate)
  const orderDate = (order as any).orderDate || (order as any).order_date
  const itemsCount = (order as any).itemsCount || (order as any).items_count

  const totalBdt = calculateBdt(totalAmount, exchangeRate)
  const canEdit = canEditOrder(order.status, hasEditPermission)
  const canDelete = canDeleteOrder(order.status, hasDeletePermission)

  return (
    <Table.Tr key={order.id}>
      <Table.Td>
        <Anchor size="sm" fw={600} onClick={() => navigate(`/procurement/orders/${order.id}`)}>
          {poNumber}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{order.supplier.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{orderDate}</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={STATUS_COLORS[order.status] || 'gray'}>
          {statusLabels[order.status] || order.status}
        </Badge>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm" fw={600}>
          {formatRmbAmount(totalAmount)}
        </Text>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm" c="dimmed">
          {formatBdtAmount(totalBdt)}
        </Text>
      </Table.Td>
      <Table.Td ta="center">
        <Badge variant="light" size="sm">
          {itemsCount}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="center">
          <ActionIcon size="sm" variant="light" onClick={() => navigate(`/procurement/orders/${order.id}`)}>
            <IconEye size={14} />
          </ActionIcon>

          {canDelete && (
            <ActionIcon
              size="sm"
              variant="light"
              color="red"
              loading={deleting === order.id}
              onClick={() => onDeleteClick(order.id, poNumber)}
            >
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  )
}

/**
 * Renders mobile card for an order
 */
const OrderMobileCard = ({
  order,
  statusLabels,
  navigate,
  hasEditPermission,
  hasDeletePermission,
  deleting,
  onDeleteClick,
}: {
  order: PurchaseOrder
  statusLabels: Record<string, string>
  navigate: (path: string) => void
  hasEditPermission: boolean
  hasDeletePermission: boolean
  deleting: number | null
  onDeleteClick: (id: number, poNumber: string) => void
}) => {
  // Handle both camelCase and snake_case field names
  const poNumber = (order as any).poNumber || (order as any).po_number
  const totalAmount = toNumber((order as any).totalAmount || (order as any).total_amount)
  const exchangeRate = toNumber((order as any).exchangeRate || (order as any).exchange_rate)
  const orderDate = (order as any).orderDate || (order as any).order_date
  const itemsCount = (order as any).itemsCount || (order as any).items_count

  const totalBdt = calculateBdt(totalAmount, exchangeRate)
  const canEdit = canEditOrder(order.status, hasEditPermission)
  const canDelete = canDeleteOrder(order.status, hasDeletePermission)

  return (
    <Paper withBorder p="sm" radius="sm" key={order.id}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Anchor size="sm" fw={600} onClick={() => navigate(`/procurement/orders/${order.id}`)}>
            {poNumber}
          </Anchor>
          <Badge color={STATUS_COLORS[order.status] || 'gray'} size="sm">
            {statusLabels[order.status] || order.status}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">{order.supplier.name}</Text>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">{orderDate}</Text>
          <Badge variant="light" size="xs">
            {itemsCount} items
          </Badge>
        </Group>

        <Stack gap={0}>
          <Text size="sm" fw={600} ta="right">
            {formatRmbAmount(totalAmount)}
          </Text>
          <Text size="xs" c="dimmed" ta="right">
            {formatBdtAmount(totalBdt)} BDT
          </Text>
        </Stack>

        <Group gap="xs" justify="flex-end">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconEye size={14} />}
            onClick={() => navigate(`/procurement/orders/${order.id}`)}
          >
            View
          </Button>

          {canDelete && (
            <Button
              size="xs"
              variant="light"
              color="red"
              loading={deleting === order.id}
              leftSection={<IconTrash size={14} />}
              onClick={() => onDeleteClick(order.id, poNumber)}
            >
              Delete
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

/**
 * Renders pagination controls
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) => (
  <Group justify="center" gap="xs">
    <Button
      variant="light"
      size="xs"
      disabled={currentPage === 1}
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
    >
      Previous
    </Button>
    <Text size="sm">
      Page {currentPage} of {totalPages}
    </Text>
    <Button
      variant="light"
      size="xs"
      disabled={currentPage === totalPages}
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
    >
      Next
    </Button>
  </Group>
)

/**
 * Renders delete confirmation modal
 */
const DeleteConfirmModal = ({
  opened,
  onClose,
  onConfirm,
  poNumber,
  isDeleting,
  t,
}: {
  opened: boolean
  onClose: () => void
  onConfirm: () => void
  poNumber: string
  isDeleting: boolean
  t: (key: string) => string
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={<Text size="lg" fw={600}>{t('procurement.ordersPage.deleteConfirm.title')}</Text>}
    size="md"
  >
    <Stack gap="md">
      <Text size="sm">
        {t('procurement.ordersPage.deleteConfirm.message', { poNumber })}
      </Text>
      <Text size="sm" c="dimmed">
        {t('procurement.ordersPage.deleteConfirm.warning')}
      </Text>

      <Group justify="flex-end" gap="sm">
        <Button variant="light" onClick={onClose} disabled={isDeleting}>
          {t('procurement.ordersPage.deleteConfirm.cancel')}
        </Button>
        <Button color="red" loading={isDeleting} onClick={onConfirm}>
          {t('procurement.ordersPage.deleteConfirm.confirm')}
        </Button>
      </Group>
    </Stack>
  </Modal>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Purchase Orders List Page
 * Main component for displaying and managing purchase orders
 */
export default function PurchaseOrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  // Get status labels with translations (memoized)
  const STATUS_LABELS = useMemo(() => getStatusLabels(t), [t])

  // ============================================================================
  // STATE FROM ZUSTAND STORE (Optimized with selector hooks)
  // ============================================================================

  const orders = useOrders()
  const suppliers = useSuppliersData()
  const statistics = useStatistics()
  const loading = useOrdersLoading()
  const refreshing = useOrdersRefreshing()
  const deletingId = useDeletingId()
  const filters = useOrdersFilters()
  const pagination = useOrdersPagination()
  const deleteModal = useDeleteModal()

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial data fetch and permission check
  useEffect(() => {
    if (!hasPermission('procurement.orders.index')) {
      navigate('/dashboard')
      return
    }

    fetchAllData()
  }, [hasPermission, navigate])

  // Debounced filter change effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadOrders()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [filters.status, filters.supplierId, filters.searchQuery, filters.fromDate, filters.toDate, pagination.currentPage])

  // ============================================================================
  // DATA FETCHING HANDLERS
  // ============================================================================

  /**
   * Fetches all required data (orders, suppliers, statistics)
   */
  const fetchAllData = useCallback(async () => {
    await Promise.all([loadOrders(), loadSuppliers(), loadStatistics()])
  }, [
    filters.status,
    filters.supplierId,
    filters.searchQuery,
    filters.fromDate,
    filters.toDate,
    pagination.currentPage,
  ])

  /**
   * Loads orders based on current filters
   */
  const loadOrders = useCallback(async () => {
    try {
      useProcurementOrdersStore.getState().setLoading(true)
      const params = buildFilterParams(filters, pagination.perPage, pagination.currentPage)
      const response = await getPurchaseOrders(params)
      const ordersData = extractArrayFromResponse(response)
      useProcurementOrdersStore.getState().setOrders(ordersData)
      const totalPages = extractTotalPages(response)
      useProcurementOrdersStore.getState().setTotalPages(totalPages)
    } catch (error) {
      console.error('Failed to load orders:', error)
      notifications.show({
        title: t('common.error'),
        message: t('procurement.ordersPage.notifications.errorLoading'),
        color: 'red',
      })
    } finally {
      useProcurementOrdersStore.getState().setLoading(false)
    }
  }, [filters, pagination.currentPage, pagination.perPage, t])

  /**
   * Loads suppliers list
   */
  const loadSuppliers = useCallback(async () => {
    try {
      const suppliersData = await fetchSuppliersData()
      useProcurementOrdersStore.getState().setSuppliers(suppliersData)
    } catch (error) {
      console.error('Failed to load suppliers:', error)
    }
  }, [])

  /**
   * Loads statistics
   */
  const loadStatistics = useCallback(async () => {
    try {
      const statsData = await fetchStatisticsData()
      useProcurementOrdersStore.getState().setStatistics(statsData)
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }, [])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles refresh button click
   */
  const handleRefresh = useCallback(async () => {
    useProcurementOrdersStore.getState().setRefreshing(true)
    await fetchAllData()
    useProcurementOrdersStore.getState().setRefreshing(false)
    notifications.show({
      title: t('common.success'),
      message: t('procurement.ordersPage.notifications.refreshed'),
      color: 'green',
    })
  }, [fetchAllData, t])

  /**
   * Handles order deletion
   */
  const handleDelete = useCallback(async () => {
    if (!deleteModal.orderToDelete) return

    const { id, poNumber } = deleteModal.orderToDelete

    try {
      useProcurementOrdersStore.getState().setDeletingId(id)
      await deletePurchaseOrder(id)
      notifications.show({
        title: t('common.success'),
        message: t('procurement.ordersPage.notifications.deleted'),
        color: 'green',
        autoClose: 5000,
      })
      useProcurementOrdersStore.getState().closeDeleteModal()
      await fetchAllData()
    } catch (error: any) {
      console.error('Failed to delete PO:', error)
      notifications.show({
        title: t('common.error'),
        message:
          error.response?.data?.message || error.message || t('procurement.ordersPage.notifications.errorDeleting'),
        color: 'red',
      })
    } finally {
      useProcurementOrdersStore.getState().setDeletingId(null)
    }
  }, [deleteModal, fetchAllData, t])

  /**
   * Handles page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      useProcurementOrdersStore.getState().setCurrentPage(page)
    },
    []
  )

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const supplierOptions = useMemo(() => getSupplierFilterOptions(suppliers), [suppliers])

  const hasCreatePermission = hasPermission('procurement.orders.create')
  const hasEditPermission = hasPermission('procurement.orders.edit')
  const hasDeletePermission = hasPermission('procurement.orders.delete')

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show loading skeleton on initial load
  if (loading && orders.length === 0) {
    return <LoadingSkeleton />
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <BreadcrumbsNav t={t} />

        {/* Header */}
        <PageHeader
          t={t}
          hasCreatePermission={hasCreatePermission}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          navigate={navigate}
        />

        {/* Statistics Cards */}
        {statistics && <StatisticsCards statistics={statistics} t={t} />}

        {/* Filters */}
        <FiltersSection
          t={t}
          filters={filters}
          onStatusChange={(v) => useProcurementOrdersStore.getState().setStatusFilter(v || 'all')}
          onSupplierChange={useProcurementOrdersStore.getState().setSupplierFilter}
          supplierOptions={supplierOptions}
          onSearchChange={useProcurementOrdersStore.getState().setSearchQuery}
          onFromDateChange={useProcurementOrdersStore.getState().setFromDate}
          onToDateChange={useProcurementOrdersStore.getState().setToDate}
        />

        {/* Orders Table/Cards */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600} size="lg">
                {t('procurement.ordersPage.title')} ({orders.length})
              </Text>
            </Group>

            {orders.length === 0 ? (
              <EmptyState
                t={t}
                hasCreatePermission={hasCreatePermission}
                onCreateClick={() => navigate('/procurement/create')}
              />
            ) : (
              <>
                {/* Desktop Table */}
                <Box className="hidden md:block">
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('procurement.ordersPage.tableHeaders.poNumber')}</Table.Th>
                        <Table.Th>{t('procurement.ordersPage.tableHeaders.supplier')}</Table.Th>
                        <Table.Th>{t('procurement.ordersPage.tableHeaders.orderDate')}</Table.Th>
                        <Table.Th>{t('procurement.ordersPage.tableHeaders.status')}</Table.Th>
                        <Table.Th ta="right">{t('procurement.ordersPage.tableHeaders.totalRmb')}</Table.Th>
                        <Table.Th ta="right">{t('procurement.ordersPage.tableHeaders.totalBdt')}</Table.Th>
                        <Table.Th ta="center">{t('procurement.ordersPage.tableHeaders.items')}</Table.Th>
                        <Table.Th ta="center">{t('procurement.ordersPage.tableHeaders.actions')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {orders.map((order) => (
                        <OrderTableRow
                          key={order.id}
                          order={order}
                          statusLabels={STATUS_LABELS}
                          navigate={navigate}
                          hasEditPermission={hasEditPermission}
                          hasDeletePermission={hasDeletePermission}
                          deleting={deletingId}
                          onDeleteClick={useProcurementOrdersStore.getState().openDeleteModal}
                        />
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>

                {/* Mobile Cards */}
                <Box className="block md:hidden">
                  <Stack gap="sm">
                    {orders.map((order) => (
                      <OrderMobileCard
                        key={order.id}
                        order={order}
                        statusLabels={STATUS_LABELS}
                        navigate={navigate}
                        hasEditPermission={hasEditPermission}
                        hasDeletePermission={hasDeletePermission}
                        deleting={deletingId}
                        onDeleteClick={useProcurementOrdersStore.getState().openDeleteModal}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={deleteModal.isOpen}
        onClose={useProcurementOrdersStore.getState().closeDeleteModal}
        onConfirm={handleDelete}
        poNumber={deleteModal.orderToDelete?.poNumber || ''}
        isDeleting={deletingId !== null}
        t={t}
      />
    </Box>
  )
}
