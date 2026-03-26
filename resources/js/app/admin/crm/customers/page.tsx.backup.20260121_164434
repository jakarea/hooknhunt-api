import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Paper,
  Card,
  Grid,
  TextInput,
  Select,
  LoadingOverlay,
  Collapse,
  MultiSelect,
  RangeSlider,
} from '@mantine/core'
import { IconPlus, IconPencil, IconTrash, IconSearch, IconEye, IconShoppingBag, IconRefresh, IconFilter, IconX, IconDownload } from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { DatesProvider, DateInput } from '@mantine/dates'
import '@mantine/dates/styles.css'
import dayjs from 'dayjs'

interface Customer {
  id: number
  name: string
  email: string | null
  phone: string
  roleId: number
  isActive: boolean
  phoneVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  role?: {
    id: number
    name: string
    slug: string
  }
  customerProfile?: {
    id: number
    type: string
    totalOrders: number
    totalSpent: number
    loyaltyPoints: number
  }
}

interface PaginatedResponse {
  data: Customer[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function CustomersPage() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>('all')
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false)

  const customerTypeOptions = useMemo(() => [
    { value: 'all', label: t('crm.customers.type.all') },
    { value: 'retail', label: t('crm.customers.type.retail') },
    { value: 'wholesale', label: t('crm.customers.type.wholesale') },
  ], [t])

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('crm.customers.status.all') },
    { value: 'active', label: t('crm.customers.status.active') },
    { value: 'inactive', label: t('crm.customers.status.inactive') },
  ], [t])

  // Advanced filters
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState<string[]>([])
  const [spentRangeFilter, setSpentRangeFilter] = useState<[number, number]>([0, 100000])
  const [ordersRangeFilter, setOrdersRangeFilter] = useState<[number, number]>([0, 100])
  const [loyaltyPointsFilter, setLoyaltyPointsFilter] = useState<[number, number]>([0, 10000])
  const [registrationDateFrom, setRegistrationDateFrom] = useState<Date | null>(null)
  const [registrationDateTo, setRegistrationDateTo] = useState<Date | null>(null)
  const [lastPurchaseFrom, setLastPurchaseFrom] = useState<Date | null>(null)
  const [lastPurchaseTo, setLastPurchaseTo] = useState<Date | null>(null)
  const [vipStatusFilter, setVipStatusFilter] = useState<string | null>('all')

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  })

  // Check if any advanced filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      locationFilter !== null ||
      cityFilter.length > 0 ||
      spentRangeFilter[0] > 0 ||
      spentRangeFilter[1] < 100000 ||
      ordersRangeFilter[0] > 0 ||
      ordersRangeFilter[1] < 100 ||
      loyaltyPointsFilter[0] > 0 ||
      loyaltyPointsFilter[1] < 10000 ||
      registrationDateFrom !== null ||
      registrationDateTo !== null ||
      lastPurchaseFrom !== null ||
      lastPurchaseTo !== null ||
      vipStatusFilter !== 'all'
    )
  }, [statusFilter, locationFilter, cityFilter, spentRangeFilter, ordersRangeFilter, loyaltyPointsFilter, registrationDateFrom, registrationDateTo, lastPurchaseFrom, lastPurchaseTo, vipStatusFilter])

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter('all')
    setLocationFilter(null)
    setCityFilter([])
    setSpentRangeFilter([0, 100000])
    setOrdersRangeFilter([0, 100])
    setLoyaltyPointsFilter([0, 10000])
    setRegistrationDateFrom(null)
    setRegistrationDateTo(null)
    setLastPurchaseFrom(null)
    setLastPurchaseTo(null)
    setVipStatusFilter('all')
  }

  // Format date for API
  const formatDateForApi = (date: Date | null): string => {
    if (!date) return ''
    return dayjs(date).format('YYYY-MM-DD')
  }

  // Export to CSV
  const exportToCSV = async () => {
    try {
      setExporting(true)

      // Build query parameters with current filters
      const params = new URLSearchParams({
        type: 'customer',
        per_page: '1000', // Export all records
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      if (typeFilter && typeFilter !== 'all') {
        params.append('customer_type', typeFilter)
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (locationFilter) {
        params.append('location', locationFilter)
      }

      if (cityFilter.length > 0) {
        params.append('cities', cityFilter.join(','))
      }

      if (spentRangeFilter[0] > 0) {
        params.append('min_spent', spentRangeFilter[0].toString())
      }
      if (spentRangeFilter[1] < 100000) {
        params.append('max_spent', spentRangeFilter[1].toString())
      }

      if (ordersRangeFilter[0] > 0) {
        params.append('min_orders', ordersRangeFilter[0].toString())
      }
      if (ordersRangeFilter[1] < 100) {
        params.append('max_orders', ordersRangeFilter[1].toString())
      }

      if (loyaltyPointsFilter[0] > 0) {
        params.append('min_loyalty_points', loyaltyPointsFilter[0].toString())
      }
      if (loyaltyPointsFilter[1] < 10000) {
        params.append('max_loyalty_points', loyaltyPointsFilter[1].toString())
      }

      if (vipStatusFilter && vipStatusFilter !== 'all') {
        params.append('vip_status', vipStatusFilter)
      }

      if (registrationDateFrom) {
        params.append('registration_date_from', formatDateForApi(registrationDateFrom))
      }
      if (registrationDateTo) {
        params.append('registration_date_to', formatDateForApi(registrationDateTo))
      }

      if (lastPurchaseFrom) {
        params.append('last_purchase_from', formatDateForApi(lastPurchaseFrom))
      }
      if (lastPurchaseTo) {
        params.append('last_purchase_to', formatDateForApi(lastPurchaseTo))
      }

      const response = await api.get(`/user-management/users?${params.toString()}`)

      if (response.data?.status) {
        const data: PaginatedResponse = response.data.data
        const allCustomers = Array.isArray(data) ? data : data.data || []

        // Build CSV content
        const headers = [
          'ID',
          'Name',
          'Email',
          'Phone',
          'Type',
          'Status',
          'Total Orders',
          'Total Spent',
          'Loyalty Points',
          'Joined Date',
        ]

        const rows = allCustomers.map((customer) => {
          const type = getCustomerType(customer)
          return [
            customer.id,
            `"${customer.name}"`,
            customer.email || '',
            customer.phone,
            type,
            customer.isActive ? 'Active' : 'Inactive',
            customer.customerProfile?.totalOrders || 0,
            customer.customerProfile?.totalSpent || 0,
            customer.customerProfile?.loyaltyPoints || 0,
            formatDate(customer.createdAt),
          ]
        })

        // Combine headers and rows
        const csvContent = [
          headers.join(','),
          ...rows.map((row) => row.join(',')),
        ].join('\n')

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', `customers_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        notifications.show({
          title: t('common.success'),
          message: t('crm.customers.exported', { count: allCustomers.length }),
          color: 'green',
        })
      } else {
        throw new Error('Failed to fetch customers for export')
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error exporting customers:', error)
      }
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || error.message || t('crm.customers.errorLoading'),
        color: 'red',
      })
    } finally {
      setExporting(false)
    }
  }

  // Fetch customers
  const fetchCustomers = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const params = new URLSearchParams({
        type: 'customer',
        page: page.toString(),
        per_page: '10',
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      // Add type filter if selected (retail or wholesale)
      if (typeFilter && typeFilter !== 'all') {
        params.append('customer_type', typeFilter)
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      // Location filter
      if (locationFilter) {
        params.append('location', locationFilter)
      }

      // City filter (multiple cities)
      if (cityFilter.length > 0) {
        params.append('cities', cityFilter.join(','))
      }

      // Purchase history filters
      if (spentRangeFilter[0] > 0) {
        params.append('min_spent', spentRangeFilter[0].toString())
      }
      if (spentRangeFilter[1] < 100000) {
        params.append('max_spent', spentRangeFilter[1].toString())
      }

      if (ordersRangeFilter[0] > 0) {
        params.append('min_orders', ordersRangeFilter[0].toString())
      }
      if (ordersRangeFilter[1] < 100) {
        params.append('max_orders', ordersRangeFilter[1].toString())
      }

      // Loyalty points filter
      if (loyaltyPointsFilter[0] > 0) {
        params.append('min_loyalty_points', loyaltyPointsFilter[0].toString())
      }
      if (loyaltyPointsFilter[1] < 10000) {
        params.append('max_loyalty_points', loyaltyPointsFilter[1].toString())
      }

      // VIP status filter
      if (vipStatusFilter && vipStatusFilter !== 'all') {
        params.append('vip_status', vipStatusFilter)
      }

      // Date filters - Registration date range
      if (registrationDateFrom) {
        params.append('registration_date_from', formatDateForApi(registrationDateFrom))
      }
      if (registrationDateTo) {
        params.append('registration_date_to', formatDateForApi(registrationDateTo))
      }

      // Date filters - Last purchase date range
      if (lastPurchaseFrom) {
        params.append('last_purchase_from', formatDateForApi(lastPurchaseFrom))
      }
      if (lastPurchaseTo) {
        params.append('last_purchase_to', formatDateForApi(lastPurchaseTo))
      }

      const response = await api.get(`/user-management/users?${params.toString()}`)

      if (response.data?.status) {
        const data: PaginatedResponse = response.data.data
        setCustomers(Array.isArray(data) ? data : data.data || [])

        // Handle pagination data
        if (data.current_page) {
          setPagination({
            current_page: data.current_page,
            last_page: data.last_page || 1,
            per_page: data.per_page || 10,
            total: data.total || 0,
          })
        }
      } else {
        throw new Error('Failed to fetch customers')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching customers:', error)
      }
      notifications.show({
        title: t('common.error'),
        message: t('crm.customers.errorLoading'),
        color: 'red',
      })
      setCustomers([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchCustomers(1)
  }, [])

  // Fetch when search or filter changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        fetchCustomers(1)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, typeFilter, statusFilter, locationFilter, cityFilter, spentRangeFilter, ordersRangeFilter, loyaltyPointsFilter, registrationDateFrom, registrationDateTo, lastPurchaseFrom, lastPurchaseTo, vipStatusFilter])

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '৳0.00'
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get customer type from role
  const getCustomerType = (customer: Customer) => {
    if (customer.role?.slug === 'wholesale_customer') return 'wholesale'
    if (customer.role?.slug === 'retail_customer') return 'retail'
    return customer.customerProfile?.type || 'retail'
  }

  // Desktop table rows
  const desktopRows = customers.map((customer) => {
    const type = getCustomerType(customer)
    const isActive = customer.isActive
    const totalOrders = customer.customerProfile?.totalOrders || 0
    const totalSpent = customer.customerProfile?.totalSpent || 0
    const loyaltyPoints = customer.customerProfile?.loyaltyPoints || 0

    return (
      <Table.Tr key={customer.id}>
        <Table.Td>
          <Text fw={600} size="sm">{customer.name}</Text>
          <Text size="xs" c="dimmed">{customer.email || 'No email'}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{customer.phone}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color={type === 'wholesale' ? 'blue' : 'gray'} variant="light">
            {t(`crm.customers.type.${type}`)}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Group>
            <Text size="sm" fw={500}>{formatCurrency(totalSpent)}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group>
            <Text size="sm">{totalOrders}</Text>
            <Text size="xs" c="dimmed">{t('crm.customers.orders')}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{loyaltyPoints} {t('crm.customers.points')}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color={isActive ? 'green' : 'gray'} variant="light">
            {isActive ? t('crm.customers.status.active') : t('crm.customers.status.inactive')}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{formatDate(customer.createdAt)}</Text>
        </Table.Td>
        <Table.Td>
          <Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              component={Link}
              to={`/crm/customers/${customer.id}`}
              aria-label="View Profile"
            >
              <IconEye size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="blue"
              component={Link}
              to={`/crm/customers/${customer.id}/edit`}
              aria-label="Edit Customer"
            >
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => openDeleteModal(customer.id, customer.name)}
              aria-label="Delete Customer"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    )
  })

  // Mobile cards
  const mobileCards = customers.map((customer) => {
    const type = getCustomerType(customer)
    const isActive = customer.isActive
    const totalOrders = customer.customerProfile?.totalOrders || 0
    const totalSpent = customer.customerProfile?.totalSpent || 0
    const loyaltyPoints = customer.customerProfile?.loyaltyPoints || 0

    return (
      <Card key={customer.id} shadow="sm" p={{ base: 'lg', md: 'md' }} radius="md" withBorder mb="md">
        <Stack>
          {/* Header with name and actions */}
          <Group justify="space-between">
            <Box style={{ flex: 1 }}>
              <Text fw={700} size="lg">{customer.name}</Text>
              <Text size="sm" c="dimmed">{customer.email || 'No email'}</Text>
              <Text size="xs" c="dimmed" mt={2}>{customer.phone}</Text>
            </Box>
            <Group>
              <ActionIcon
                variant="subtle"
                color="gray"
                component={Link}
                to={`/crm/customers/${customer.id}`}
                aria-label="View Profile"
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="blue"
                component={Link}
                to={`/crm/customers/${customer.id}/edit`}
                aria-label="Edit Customer"
              >
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => openDeleteModal(customer.id, customer.name)}
                aria-label="Delete Customer"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Customer Type & Status */}
          <Group>
            <Badge color={type === 'wholesale' ? 'blue' : 'gray'} variant="light">
              {t(`crm.customers.type.${type}`)}
            </Badge>
            <Badge color={isActive ? 'green' : 'gray'} variant="light">
              {isActive ? t('crm.customers.status.active') : t('crm.customers.status.inactive')}
            </Badge>
          </Group>

          {/* Details */}
          <Grid>
            <Grid.Col span={6}>
              <Group>
                <IconShoppingBag size={16} />
                <Box>
                  <Text size="xs" c="dimmed">{t('crm.customers.orders')}</Text>
                  <Text size="sm" fw={500}>{totalOrders}</Text>
                </Box>
              </Group>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">{t('crm.customers.table.totalSpent')}</Text>
              <Text size="sm" fw={500}>{formatCurrency(totalSpent)}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">{t('crm.customers.table.loyaltyPoints')}</Text>
              <Text size="sm" fw={500}>{loyaltyPoints}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">{t('crm.customers.table.joined')}</Text>
              <Text size="sm" fw={500}>{formatDate(customer.createdAt)}</Text>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>
    )
  })

  const openDeleteModal = (id: number, name: string) => {
    modals.openConfirmModal({
      title: t('crm.customers.delete'),
      centered: true,
      children: (
        <Text size="sm">
          {t('crm.customers.deleteConfirm')}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await api.delete(`/user-management/users/${id}`)

          if (response.data?.status) {
            notifications.show({
              title: t('common.success'),
              message: t('crm.customers.deleted', { name }),
              color: 'green',
            })
            // Refresh the list
            fetchCustomers(pagination.current_page)
          } else {
            throw new Error(response.data?.message || 'Failed to delete customer')
          }
        } catch (error: any) {
          if (import.meta.env.DEV) {
            console.error('Error deleting customer:', error)
          }
          notifications.show({
            title: t('common.error'),
            message: error.response?.data?.message || error.message || t('crm.customers.errorLoading'),
            color: 'red',
          })
        }
      },
    })
  }

  const handlePageChange = (newPage: number) => {
    fetchCustomers(newPage)
  }

  return (
    <DatesProvider settings={{ locale: 'en' }}>
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
        {/* Header */}
        <Group justify="space-between" align="center">
          <Box>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">{t('crm.customers.title')}</Title>
            <Text c="dimmed" className="text-sm md:text-base">{t('crm.customers.management')}</Text>
          </Box>
          <Group>
            <Button
              variant="light"
              size="md"
              onClick={() => fetchCustomers(pagination.current_page)}
              loading={refreshing}
              leftSection={<IconRefresh size={16} />}
            >
              {t('common.refresh')}
            </Button>
            <Button
              variant="light"
              size="md"
              onClick={exportToCSV}
              loading={exporting}
              leftSection={<IconDownload size={16} />}
            >
              {t('crm.customers.export')}
            </Button>
            <Button
              component={Link}
              to="/crm/customers/create"
              leftSection={<IconPlus size={16} />}
              size="md"
              color="red"
            >
              {t('crm.customers.add')}
            </Button>
          </Group>
        </Group>

        {/* Search and Filters */}
        <Stack>
          <Group justify="space-between">
            <Group style={{ flex: 1, maxWidth: '100%' }}>
              <TextInput
                placeholder={t('crm.customers.searchPlaceholder')}
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, maxWidth: '400px' }}
                size="md"
              />
              <Select
                placeholder={t('crm.customers.type.all')}
                value={typeFilter}
                onChange={setTypeFilter}
                data={customerTypeOptions}
                size="md"
                style={{ minWidth: '150px' }}
                clearable
              />
              <Button
                variant="light"
                size="md"
                leftSection={<IconFilter size={16} />}
                onClick={toggleFilters}
                color={hasActiveFilters ? 'red' : 'gray'}
              >
                {t('crm.customers.advancedFilters')} {hasActiveFilters && `( ${t('crm.customers.active')})`}
              </Button>
            </Group>
          </Group>

          {/* Advanced Filters Panel */}
          <Collapse in={filtersOpened}>
            <Paper withBorder p="md" radius="md">
              <Stack>
                <Group justify="space-between">
                  <Text fw={600} size="lg">{t('crm.customers.advancedFilters')}</Text>
                  {hasActiveFilters && (
                    <Button
                      variant="subtle"
                      size="sm"
                      leftSection={<IconX size={14} />}
                      onClick={clearAllFilters}
                      color="gray"
                    >
                      {t('crm.customers.clearFilters')}
                    </Button>
                  )}
                </Group>

                <Grid>
                  {/* Status & VIP */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>{t('crm.customers.status.label')}</Text>
                      <Select
                        placeholder={t('crm.customers.status.all')}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        data={statusOptions}
                        clearable
                      />
                    </Stack>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>VIP Status</Text>
                      <Select
                        placeholder="Select VIP status"
                        value={vipStatusFilter}
                        onChange={setVipStatusFilter}
                        data={[
                          { value: 'all', label: 'All Customers' },
                          { value: 'vip', label: 'VIP Only' },
                          { value: 'regular', label: 'Regular Only' },
                        ]}
                        clearable
                      />
                    </Stack>
                  </Grid.Col>

                  {/* Location */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>Division/Region</Text>
                      <Select
                        placeholder="Select region"
                        value={locationFilter}
                        onChange={setLocationFilter}
                        data={[
                          { value: 'dhaka', label: 'Dhaka' },
                          { value: 'chittagong', label: 'Chittagong' },
                          { value: 'rajshahi', label: 'Rajshahi' },
                          { value: 'khulna', label: 'Khulna' },
                          { value: 'sylhet', label: 'Sylhet' },
                          { value: 'barisal', label: 'Barisal' },
                          { value: 'rangpur', label: 'Rangpur' },
                        ]}
                        clearable
                      />
                    </Stack>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>Cities</Text>
                      <MultiSelect
                        placeholder="Select cities"
                        value={cityFilter}
                        onChange={setCityFilter}
                        data={[
                          { value: 'dhaka', label: 'Dhaka City' },
                          { value: 'gazipur', label: 'Gazipur' },
                          { value: 'narayanganj', label: 'Narayanganj' },
                          { value: 'ctg', label: 'Chittagong City' },
                          { value: 'sylhet-city', label: 'Sylhet City' },
                          { value: 'khulna-city', label: 'Khulna City' },
                        ]}
                        clearable
                        searchable
                      />
                    </Stack>
                  </Grid.Col>

                  {/* Purchase History - Total Spent */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        Total Spent: ৳{spentRangeFilter[0].toLocaleString()} - ৳{spentRangeFilter[1].toLocaleString()}
                      </Text>
                      <RangeSlider
                        min={0}
                        max={100000}
                        step={5000}
                        value={spentRangeFilter}
                        onChange={setSpentRangeFilter}
                        label={null}
                      />
                    </Stack>
                  </Grid.Col>

                  {/* Purchase History - Number of Orders */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        Number of Orders: {ordersRangeFilter[0]} - {ordersRangeFilter[1]}
                      </Text>
                      <RangeSlider
                        min={0}
                        max={100}
                        step={1}
                        value={ordersRangeFilter}
                        onChange={setOrdersRangeFilter}
                        label={null}
                      />
                    </Stack>
                  </Grid.Col>

                  {/* Loyalty Points */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>
                        Loyalty Points: {loyaltyPointsFilter[0]} - {loyaltyPointsFilter[1]}
                      </Text>
                      <RangeSlider
                        min={0}
                        max={10000}
                        step={100}
                        value={loyaltyPointsFilter}
                        onChange={setLoyaltyPointsFilter}
                        label={null}
                      />
                    </Stack>
                  </Grid.Col>

                  {/* Date Filters */}
                  <Grid.Col span={{ base: 12, md: 6, lg: 6 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>Registration Date Range</Text>
                      <Group>
                        <DateInput
                          placeholder="From date"
                          value={registrationDateFrom}
                          onChange={(value) => setRegistrationDateFrom(value as Date | null)}
                          clearable
                          size="sm"
                          maxDate={registrationDateTo || undefined}
                        />
                        <DateInput
                          placeholder="To date"
                          value={registrationDateTo}
                          onChange={(value) => setRegistrationDateTo(value as Date | null)}
                          clearable
                          size="sm"
                          minDate={registrationDateFrom || undefined}
                        />
                      </Group>
                    </Stack>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6, lg: 6 }}>
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>Last Purchase Date Range</Text>
                      <Group>
                        <DateInput
                          placeholder="From date"
                          value={lastPurchaseFrom}
                          onChange={(value) => setLastPurchaseFrom(value as Date | null)}
                          clearable
                          size="sm"
                          maxDate={lastPurchaseTo || undefined}
                        />
                        <DateInput
                          placeholder="To date"
                          value={lastPurchaseTo}
                          onChange={(value) => setLastPurchaseTo(value as Date | null)}
                          clearable
                          size="sm"
                          minDate={lastPurchaseFrom || undefined}
                        />
                      </Group>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Paper>
          </Collapse>
        </Stack>

        {/* Mobile: Card View */}
        <Stack display={{ base: 'block', md: 'none' }} pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          {!loading && customers.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Text c="dimmed">{t('crm.customers.noCustomersFound')}</Text>
            </Paper>
          ) : (
            mobileCards
          )}
        </Stack>

        {/* Desktop: Table View */}
        <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          {!loading && (
            <Table.ScrollContainer minWidth={1200}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('crm.customers.table.customer')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.phone')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.type')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.totalSpent')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.orders')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.loyaltyPoints')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.status')}</Table.Th>
                    <Table.Th>{t('crm.customers.table.joined')}</Table.Th>
                    <Table.Th>{t('common.actions')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {customers.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={9}>
                        <Box py="xl" ta="center">
                          <Text c="dimmed">{t('crm.customers.noCustomersFound')}</Text>
                        </Box>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    desktopRows
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <Group justify="flex-end">
            <Text size="sm" c="dimmed">
              {t('crm.customers.total')}: {pagination.total} {t('crm.customers.title').toLowerCase()}
            </Text>
            <Button
              variant="light"
              size="sm"
              disabled={pagination.current_page === 1}
              onClick={() => handlePageChange(pagination.current_page - 1)}
            >
              {t('common.previous')}
            </Button>
            <Text size="sm" c="dimmed">
              {t('crm.customers.page', { current: pagination.current_page, total: pagination.last_page })}
            </Text>
            <Button
              variant="light"
              size="sm"
              disabled={pagination.current_page === pagination.last_page}
              onClick={() => handlePageChange(pagination.current_page + 1)}
            >
              {t('common.next')}
            </Button>
          </Group>
        )}
        </Stack>
      </Box>
    </DatesProvider>
  )
}
