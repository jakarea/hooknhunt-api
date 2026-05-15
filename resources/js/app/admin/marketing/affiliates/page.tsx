import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Paper,
  Grid,
  TextInput,
  Select,
  LoadingOverlay,
  NumberInput,
  Switch,
  Divider,
} from '@mantine/core'
import {
  IconPlus,
  IconPencil,
  IconCheck,
  IconX,
  IconSearch,
  IconEye,
  IconRefresh,
  IconUsers,
  IconCoin,
  IconClock,
  IconChartBar,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Affiliate {
  id: number
  userId: number
  name: string
  email: string
  phone: string
  referralCode: string
  referralLink: string
  commissionRate: number
  totalEarned: number
  withdrawnAmount: number
  availableBalance: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  isApproved: boolean
  joinedAt: string
  lastConversionAt: string | null
}

interface AffiliateStats {
  totalAffiliates: number
  activeAffiliates: number
  pendingAffiliates: number
  totalEarned: number
  totalWithdrawn: number
  totalPendingPayouts: number
  totalCompletedPayouts: number
  totalClicks: number
  totalConversions: number
  thisMonthEarnings: number
}

interface PaginatedResponse {
  data: Affiliate[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function AffiliatesPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  if (!hasPermission('crm.affiliates.index')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view this page.</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 15,
    total: 0,
    last_page: 0,
  })

  // Add Affiliate Modal state
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string; phone: string }>>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
  ], [])

  /**
   * Fetch affiliates list with filters
   */
  const fetchAffiliates = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const params: Record<string, string | number> = {
        page: pagination.page,
        per_page: pagination.per_page,
      }

      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter

      const response = await api.get<{
        success: boolean
        data: {
          affiliates: Affiliate[]
          pagination: {
            total: number
            per_page: number
            current_page: number
            last_page: number
          }
        }
      }>('/admin/affiliates', { params })
      setAffiliates(response.data.data?.affiliates || [])
      setPagination({
        page: response.data.data?.pagination?.current_page || 1,
        per_page: response.data.data?.pagination?.per_page || 15,
        total: response.data.data?.pagination?.total || 0,
        last_page: response.data.data?.pagination?.last_page || 1,
      })
    } catch (error) {
      console.error('Failed to fetch affiliates:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load affiliates. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * Fetch dashboard stats
   */
  const fetchStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: AffiliateStats }>('/admin/affiliates/stats')
      console.log('Stats response:', response.data)
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Set default stats to prevent undefined errors
      setStats({
        totalAffiliates: 0,
        activeAffiliates: 0,
        pendingAffiliates: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalPendingPayouts: 0,
        totalCompletedPayouts: 0,
        totalClicks: 0,
        totalConversions: 0,
        thisMonthEarnings: 0,
      })
    }
  }

  /**
   * Approve affiliate
   */
  const approveAffiliate = async (id: number, name: string) => {
    try {
      await api.post(`/admin/affiliates/${id}/approve`)
      notifications.show({
        title: 'Success',
        message: `${name} has been approved.`,
        color: 'green',
      })
      fetchAffiliates(false)
      fetchStats()
    } catch (error) {
      console.error('Failed to approve affiliate:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to approve affiliate. Please try again.',
        color: 'red',
      })
    }
  }

  /**
   * Reject affiliate
   */
  const rejectAffiliate = async (id: number, name: string) => {
    try {
      await api.post(`/admin/affiliates/${id}/reject`)
      notifications.show({
        title: 'Success',
        message: `${name} has been rejected.`,
        color: 'green',
      })
      fetchAffiliates(false)
      fetchStats()
    } catch (error) {
      console.error('Failed to reject affiliate:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to reject affiliate. Please try again.',
        color: 'red',
      })
    }
  }

  /**
   * Handle approve action with confirmation
   */
  const handleApprove = (affiliate: Affiliate) => {
    modals.openConfirmModal({
      title: 'Approve Affiliate',
      children: (
        <Text size="sm">
          Are you sure you want to approve <b>{affiliate.name}</b>? They will be able to earn commissions.
        </Text>
      ),
      labels: { confirm: 'Approve', cancel: 'Cancel' },
      confirmProps: { color: 'green' },
      onConfirm: () => approveAffiliate(affiliate.id, affiliate.name),
    })
  }

  /**
   * Handle reject action with confirmation
   */
  const handleReject = (affiliate: Affiliate) => {
    modals.openConfirmModal({
      title: 'Reject Affiliate',
      children: (
        <Text size="sm">
          Are you sure you want to reject <b>{affiliate.name}</b>? They will not be able to earn commissions.
        </Text>
      ),
      labels: { confirm: 'Reject', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => rejectAffiliate(affiliate.id, affiliate.name),
    })
  }

  /**
   * Open add affiliate modal
   */
  const openAddAffiliateModal = async () => {
    console.log('Add Affiliate button clicked!')

    // Fetch users before opening modal
    try {
      setUsersLoading(true)
      console.log('Fetching users from /admin/users/not-affiliates')
      const response = await api.get<{
        success: boolean
        data: Array<{ id: number; name: string; email: string; phone: string }>
      }>('/admin/users/not-affiliates')

      console.log('Users API response:', response)
      console.log('Users data from response:', response.data)
      const usersList = response.data.data || []
      console.log('Users list:', usersList)
      setUsers(usersList)

      if (usersList.length === 0) {
        notifications.show({
          title: 'Info',
          message: 'All users are already affiliates.',
          color: 'blue',
        })
        return
      }

      console.log('Opening modal with', usersList.length, 'users')

      // Open modal using Mantine modals
      modals.open({
        title: 'Add New Affiliate',
        children: (
          <AddAffiliateForm
            users={usersList}
            loading={false}
            onSubmit={handleCreateAffiliate}
            onCancel={() => modals.closeAll()}
          />
        ),
        size: 'lg',
      })
    } catch (error) {
      console.error('Failed to fetch users:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load users.',
        color: 'red',
      })
    } finally {
      setUsersLoading(false)
    }
  }

  /**
   * Handle create affiliate form submission
   */
  const handleCreateAffiliate = async () => {
    // Get form values from the window object (set by the form component)
    const formValues = (window as any).affiliateFormValues

    if (!formValues || !formValues.userId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a user.',
        color: 'red',
      })
      return
    }

    try {
      const response = await api.post<{
        success: boolean
        message: string
        data: {
          id: number
          referral_code: string
          user_name: string
        }
      }>('/admin/affiliates/create-from-user', {
        user_id: parseInt(formValues.userId),
        commission_rate: formValues.commissionRate,
        auto_approve: formValues.autoApprove,
      })

      notifications.show({
        title: 'Success',
        message: response.data.message || 'Affiliate created successfully.',
        color: 'green',
      })

      modals.closeAll()
      fetchAffiliates(false)
      fetchStats()

      // Clean up window object
      delete (window as any).affiliateFormValues
    } catch (error: any) {
      console.error('Failed to create affiliate:', error)
      const message = error.response?.data?.message || 'Failed to create affiliate.'
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      })
    }
  }

  // Initial load
  useEffect(() => {
    fetchAffiliates()
    fetchStats()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchAffiliates()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [searchQuery, statusFilter])

  // Refetch when page changes
  useEffect(() => {
    if (!loading) fetchAffiliates()
  }, [pagination.page])

  /**
   * Render stat card
   */
  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, color: string) => (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
        </div>
        <div style={{ backgroundColor: `var(--mantine-color-${color}-0)`, padding: '8px', borderRadius: '8px' }}>
          <div style={{ color: `var(--mantine-color-${color}-filled)` }}>
            {icon}
          </div>
        </div>
      </Group>
    </Paper>
  )

  return (
    <Stack gap="md" p="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Affiliates</Title>
          <Text c="dimmed">Manage your affiliate partners</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => fetchAffiliates(false)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openAddAffiliateModal}
          >
            Add Affiliate
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      {stats && (
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            {renderStatCard('Total Affiliates', stats.totalAffiliates ?? 0, <IconUsers size={24} />, 'blue')}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            {renderStatCard('Active Affiliates', stats.activeAffiliates ?? 0, <IconCheck size={24} />, 'green')}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            {renderStatCard('Total Earned', `৳${(stats.totalEarned ?? 0).toFixed(2)}`, <IconCoin size={24} />, 'yellow')}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            {renderStatCard('This Month', `৳${(stats.thisMonthEarnings ?? 0).toFixed(2)}`, <IconChartBar size={24} />, 'grape')}
          </Grid.Col>
        </Grid>
      )}

      {/* Filters */}
      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="Search by name, email or code..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            w={150}
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper withBorder>
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Affiliate</Table.Th>
              <Table.Th>Referral Code</Table.Th>
              <Table.Th>Rate</Table.Th>
              <Table.Th>Balance</Table.Th>
              <Table.Th>Clicks</Table.Th>
              <Table.Th>Conversions</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {affiliates.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8} ta="center">
                  <Text c="dimmed" py="xl">
                    No affiliates found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              affiliates.map((affiliate) => (
                <Table.Tr key={affiliate.id}>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{affiliate.name}</Text>
                      <Text size="xs" c="dimmed">{affiliate.email}</Text>
                      <Text size="xs" c="dimmed">{affiliate.phone}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{affiliate.referralCode}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{affiliate.commissionRate}%</Badge>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>৳{affiliate.availableBalance.toFixed(2)}</Text>
                      <Text size="xs" c="dimmed">Earned: ৳{affiliate.totalEarned.toFixed(2)}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>{affiliate.totalClicks}</Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm">{affiliate.totalConversions}</Text>
                      <Text size="xs" c="dimmed">{affiliate.conversionRate.toFixed(1)}%</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    {affiliate.isApproved ? (
                      <Badge color="green" variant="light">Approved</Badge>
                    ) : (
                      <Badge color="yellow" variant="light">Pending</Badge>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        component={Link}
                        to={`/marketing/affiliates/${affiliate.id}`}
                        color="blue"
                        variant="light"
                        size="sm"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      {!affiliate.isApproved && (
                        <>
                          <ActionIcon
                            color="green"
                            variant="light"
                            size="sm"
                            onClick={() => handleApprove(affiliate)}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={() => handleReject(affiliate)}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <Group justify="space-between" p="md">
            <Text size="sm" c="dimmed">
              Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="light"
                size="sm"
                disabled={pagination.page === pagination.last_page}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Group>
          </Group>
        )}
      </Paper>
    </Stack>
  )
}

/**
 * Add Affiliate Form Component
 */
function AddAffiliateForm({
  users,
  loading,
  onSubmit,
  onCancel,
}: {
  users: Array<{ id: number; name: string; email: string; phone: string }>
  loading: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [commissionRate, setCommissionRate] = useState(5)
  const [autoApprove, setAutoApprove] = useState(true)

  // Update parent state when form values change
  const handleSubmit = () => {
    if (!selectedUserId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a user.',
        color: 'red',
      })
      return
    }

    if (commissionRate < 0 || commissionRate > 100) {
      notifications.show({
        title: 'Error',
        message: 'Commission rate must be between 0 and 100.',
        color: 'red',
      })
      return
    }

    // Store values in window object temporarily for parent to access
    ;(window as any).affiliateFormValues = {
      userId: selectedUserId,
      commissionRate,
      autoApprove,
    }

    onSubmit()
  }

  return (
    <Stack gap="md">
      <Select
        label="Select User"
        placeholder="Search and select a user..."
        data={users.map((u) => ({ value: u.id.toString(), label: `${u.name} (${u.email})` }))}
        value={selectedUserId}
        onChange={(value) => setSelectedUserId(value as string | null)}
        searchable
        nothingFoundMessage="No users found"
        disabled={loading}
        required
      />

      <NumberInput
        label="Commission Rate (%)"
        placeholder="5"
        value={commissionRate}
        onChange={(value) => setCommissionRate(typeof value === 'number' ? value : 5)}
        min={0}
        max={100}
        step={0.01}
        decimalScale={2}
        description="Default commission rate for this affiliate"
        required
      />

      <Switch
        label="Auto Approve"
        description="Automatically approve this affiliate (they can start earning immediately)"
        checked={autoApprove}
        onChange={(e) => setAutoApprove(e.currentTarget.checked)}
      />

      <Group justify="flex-end" gap="xs" mt="md">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!selectedUserId}>
          Create Affiliate
        </Button>
      </Group>
    </Stack>
  )
}
