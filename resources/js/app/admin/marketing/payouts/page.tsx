import { useState, useEffect } from 'react'
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
  TextInput,
  Select,
  Textarea,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconRefresh,
  IconSearch,
  IconCheck,
  IconX,
  IconClock,
  IconCircleCheck,
  IconBan,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Payout {
  id: number
  affiliate_id: number
  affiliate_name: string
  affiliate_email: string
  amount: number
  payment_method: string
  payment_details: string
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  admin_notes: string
  rejection_reason: string
  approved_at: string | null
  completed_at: string | null
  created_at: string
}

interface PaginatedResponse {
  payouts: Payout[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export default function PayoutsPage() {
  const { t } = useTranslation()
  const { hasPermission, isSuperAdmin } = usePermissions()

  if (!isSuperAdmin() && !hasPermission('crm.affiliates.index')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view this page.</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payouts, setPayouts] = useState<Payout[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>('all')

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    last_page: 0,
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ]

  /**
   * Fetch payouts list
   */
  const fetchPayouts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const params: Record<string, string | number> = {
        page: pagination.page,
        per_page: pagination.per_page,
      }

      if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim()
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter

      const response = await api.get<PaginatedResponse>('/admin/affiliate-payouts', { params })
      console.log('Payouts response:', response.data)
      const apiData = response.data?.data || response.data
      setPayouts(apiData?.payouts || [])
      setPagination({
        page: apiData?.pagination?.current_page || 1,
        per_page: apiData?.pagination?.per_page || 20,
        total: apiData?.pagination?.total || 0,
        last_page: apiData?.pagination?.last_page || 1,
      })
    } catch (error) {
      console.error('Failed to fetch payouts:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load payouts.',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * Approve payout
   */
  const approvePayout = (payout: Payout) => {
    openActionModal(payout, 'approve')
  }

  /**
   * Reject payout
   */
  const rejectPayout = (payout: Payout) => {
    openActionModal(payout, 'reject')
  }

  /**
   * Mark as processing
   */
  const markAsProcessing = async (payout: Payout) => {
    try {
      await api.post(`/admin/affiliate-payouts/${payout.id}/process`)
      notifications.show({
        title: 'Success',
        message: 'Payout marked as processing.',
        color: 'green',
      })
      fetchPayouts(false)
    } catch (error) {
      console.error('Failed to update payout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to update payout.',
        color: 'red',
      })
    }
  }

  /**
   * Mark as completed
   */
  const markAsCompleted = async (payout: Payout) => {
    try {
      await api.post(`/admin/affiliate-payouts/${payout.id}/complete`)
      notifications.show({
        title: 'Success',
        message: 'Payout marked as completed.',
        color: 'green',
      })
      fetchPayouts(false)
    } catch (error) {
      console.error('Failed to complete payout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to complete payout.',
        color: 'red',
      })
    }
  }

  /**
   * Open action modal (approve/reject)
   */
  const openActionModal = (payout: Payout, action: 'approve' | 'reject') => {
    const isApprove = action === 'approve'

    modals.open({
      title: isApprove ? 'Approve Payout' : 'Reject Payout',
      children: (
        <ActionForm
          payout={payout}
          action={action}
          onSuccess={() => {
            fetchPayouts(false)
            modals.closeAll()
          }}
        />
      ),
    })
  }

  // Initial load
  useEffect(() => {
    fetchPayouts()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchPayouts()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [debouncedSearchQuery, statusFilter])

  // Refetch when page changes
  useEffect(() => {
    if (!loading) fetchPayouts()
  }, [pagination.page])

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'yellow', label: 'Pending' },
      approved: { color: 'blue', label: 'Approved' },
      processing: { color: 'grape', label: 'Processing' },
      completed: { color: 'green', label: 'Completed' },
      rejected: { color: 'red', label: 'Rejected' },
    }
    const { color, label } = config[status as keyof typeof config] || { color: 'gray', label: status }
    return <Badge color={color} variant="light">{label}</Badge>
  }

  return (
    <Stack gap="md" p="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Payout Management</Title>
          <Text c="dimmed">Manage affiliate payout requests</Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={() => fetchPayouts(false)}
          loading={refreshing}
        >
          Refresh
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="Search by affiliate name..."
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
              <Table.Th>Amount</Table.Th>
              <Table.Th>Method</Table.Th>
              <Table.Th>Details</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {payouts.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8} ta="center">
                  <Text c="dimmed" py="xl">No payout requests found</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              payouts.map((payout) => (
                <Table.Tr key={payout.id}>
                  <Table.Td>
                    <Text fw={500}>{payout.affiliate_name}</Text>
                    <Text size="xs" c="dimmed">{payout.affiliate_email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} size="lg">৳{payout.amount.toFixed(2)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{payout.payment_method.replace('_', ' ')}</Text>
                  </Table.Td>
                  <Table.Td size="xs" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {payout.payment_details || '-'}
                  </Table.Td>
                  <Table.Td>{getStatusBadge(payout.status)}</Table.Td>
                  <Table.Td>{new Date(payout.created_at).toLocaleDateString()}</Table.Td>
                  <Table.Td ta="right">
                    <Group gap="xs" justify="right">
                      {payout.status === 'pending' && (
                        <>
                          <ActionIcon
                            color="green"
                            variant="light"
                            size="sm"
                            onClick={() => approvePayout(payout)}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={() => rejectPayout(payout)}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      )}
                      {payout.status === 'approved' && (
                        <ActionIcon
                          color="grape"
                          variant="light"
                          size="sm"
                          onClick={() => markAsProcessing(payout)}
                        >
                          <IconClock size={16} />
                        </ActionIcon>
                      )}
                      {payout.status === 'processing' && (
                        <ActionIcon
                          color="green"
                          variant="light"
                          size="sm"
                          onClick={() => markAsCompleted(payout)}
                        >
                          <IconCircleCheck size={16} />
                        </ActionIcon>
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
 * Action Form Component
 */
function ActionForm({
  payout,
  action,
  onSuccess,
}: {
  payout: Payout
  action: 'approve' | 'reject'
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const isApprove = action === 'approve'

  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const handleSubmit = async () => {
    if (!isApprove && !rejectionReason.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please provide a reason for rejection.',
        color: 'red',
      })
      return
    }

    try {
      setSubmitting(true)

      if (isApprove) {
        await api.post(`/admin/affiliate-payouts/${payout.id}/approve`, {
          admin_notes: adminNotes,
        })
        notifications.show({
          title: 'Success',
          message: 'Payout approved successfully.',
          color: 'green',
        })
      } else {
        await api.post(`/admin/affiliate-payouts/${payout.id}/reject`, {
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
        })
        notifications.show({
          title: 'Success',
          message: 'Payout rejected.',
          color: 'green',
        })
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to process payout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to process payout. Please try again.',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm">
        {isApprove
          ? `Approve payout request of ৳${payout.amount.toFixed(2)} for ${payout.affiliate_name}?`
          : `Reject payout request of ৳${payout.amount.toFixed(2)} for ${payout.affiliate_name}?`
        }
      </Text>

      <Group>
        <Text fw={500}>Affiliate:</Text>
        <Text>{payout.affiliate_name}</Text>
      </Group>
      <Group>
        <Text fw={500}>Amount:</Text>
        <Text>৳{payout.amount.toFixed(2)}</Text>
      </Group>
      <Group>
        <Text fw={500}>Payment Method:</Text>
        <Text>{payout.payment_method.replace('_', ' ')}</Text>
      </Group>

      {isApprove ? (
        <Textarea
          label="Admin Notes (Optional)"
          placeholder="Any notes for this approval..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.currentTarget.value)}
          rows={3}
        />
      ) : (
        <>
          <Textarea
            label="Rejection Reason *"
            placeholder="Reason for rejecting this payout..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.currentTarget.value)}
            required
            rows={3}
          />
          <Textarea
            label="Admin Notes (Optional)"
            placeholder="Any additional notes..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.currentTarget.value)}
            rows={3}
          />
        </>
      )}

      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={modals.closeAll}>
          Cancel
        </Button>
        <Button
          color={isApprove ? 'green' : 'red'}
          onClick={handleSubmit}
          loading={submitting}
        >
          {isApprove ? 'Approve' : 'Reject'}
        </Button>
      </Group>
    </Stack>
  )
}
