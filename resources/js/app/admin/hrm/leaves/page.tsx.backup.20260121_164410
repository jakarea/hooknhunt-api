import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Card,
  Select,
  ActionIcon,
  Table,
  LoadingOverlay,
  Modal,
  TextInput,
  Textarea,
} from '@mantine/core'
import {
  IconPlus,
  IconCheck,
  IconX,
  IconTrash,
  IconRefresh,
  IconCalendar,
  IconFilter,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface Leave {
  id: number
  user_id: number
  type: string
  start_date: string
  end_date: string
  days_count: number
  reason?: string
  admin_note?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: number
  created_at: string
  user?: {
    id: number
    name: string
  }
  approver?: {
    id: number
    name: string
  }
}

interface Employee {
  id: number
  name: string
}

interface FormData {
  id?: number
  user_id: string | null
  type: string | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  reason: string
  admin_note: string
  action: 'approve' | 'reject' | null
}

export default function LeavesPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    user_id: null,
    type: null,
    start_date: null,
    end_date: null,
    start_time: null,
    end_time: null,
    reason: '',
    admin_note: '',
    action: null,
  })

  // Check if current user is admin (super_admin or admin)
  const isAdmin = useMemo(() => {
    return user?.role?.slug === 'super_admin' || user?.role?.slug === 'admin'
  }, [user])

  // Fetch leaves
  const fetchLeaves = async () => {
    try {
      setLoading(true)

      // Debug logging
      console.log('=== Fetch Leaves Debug ===')
      console.log('User object:', user)
      console.log('User role:', user?.role)
      console.log('Is Admin:', isAdmin)

      const params: Record<string, string> = {}
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }

      // Non-admins can only see their own leaves
      if (!isAdmin) {
        params.user_id = String(user?.id)
        console.log('Not admin, filtering by user_id:', params.user_id)
      } else if (employeeFilter) {
        params.user_id = employeeFilter
        console.log('Admin with employee filter:', employeeFilter)
      } else {
        console.log('Admin without filter - fetching all leaves')
      }

      console.log('Request params:', params)

      const response = await api.get('/hrm/leaves', { params })
      console.log('Leaves API Response:', response.data)

      const leavesData = response.data.data?.data || response.data.data || []

      // Normalize data - handle both camelCase and snake_case
      const normalizedLeaves = Array.isArray(leavesData) ? leavesData.map((leave: any) => ({
        id: leave.id,
        user_id: leave.userId || leave.user_id,
        type: leave.type,
        start_date: leave.startDate || leave.start_date,
        end_date: leave.endDate || leave.end_date,
        days_count: leave.daysCount || leave.days_count,
        reason: leave.reason,
        admin_note: leave.adminNote || leave.admin_note,
        status: leave.status,
        approved_by: leave.approvedBy || leave.approved_by,
        created_at: leave.createdAt || leave.created_at,
        user: leave.user,
        approver: leave.approver || leave.approver,
      })) : []

      console.log('Normalized Leaves:', normalizedLeaves)
      setLeaves(normalizedLeaves)
    } catch (error: unknown) {
      console.error('Failed to fetch leaves:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load leaves. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch employees for dropdown (only for admins)
  const fetchEmployees = async () => {
    if (!isAdmin) return // Non-admins don't need employee list

    try {
      const response = await api.get('/user-management/users')
      const employeesData = response.data.data || []
      setEmployees(employeesData)
    } catch (error: unknown) {
      console.error('Failed to fetch employees:', error)
    }
  }

  // Initial load
  useEffect(() => {
    fetchLeaves()
    fetchEmployees()
  }, [statusFilter, employeeFilter])

  // Handle refresh
  const handleRefresh = () => {
    fetchLeaves()
  }

  // Open create modal
  const openCreateModal = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    setFormData({
      user_id: isAdmin ? null : String(user?.id), // Auto-set for non-admins
      type: null,
      start_date: today,
      end_date: today,
      start_time: '09:00',
      end_time: '18:00',
      reason: '',
      admin_note: '',
      action: null,
    })
    setModalOpened(true)
  }

  // Open approve/reject modal for admins
  const openApprovalModal = (leave: Leave, action: 'approve' | 'reject') => {
    // Extract date and time from start_date and end_date
    const startDateTime = new Date(leave.start_date)
    const endDateTime = new Date(leave.end_date)

    const startDate = startDateTime.toISOString().split('T')[0]
    const endDate = endDateTime.toISOString().split('T')[0]
    const startTime = startDateTime.toTimeString().slice(0, 5)
    const endTime = endDateTime.toTimeString().slice(0, 5)

    setFormData({
      id: leave.id, // Store the leave ID for updating
      user_id: String(leave.user_id),
      type: leave.type,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      reason: leave.reason || '',
      admin_note: '',
      action: action,
    })
    setModalOpened(true)
  }

  // Handle save
  const handleSave = async () => {
    // Validation
    if (isAdmin && !formData.user_id) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select an employee',
        color: 'red',
      })
      return
    }

    if (!formData.type) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select leave type',
        color: 'red',
      })
      return
    }

    if (!formData.start_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select start date',
        color: 'red',
      })
      return
    }

    if (!formData.end_date) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select end date',
        color: 'red',
      })
      return
    }

    // For approve/reject actions, require admin note
    if (formData.action && !formData.admin_note) {
      notifications.show({
        title: 'Validation Error',
        message: `Please provide a reason for ${formData.action}al`,
        color: 'red',
      })
      return
    }

    try {
      setSaving(true)

      // Combine date and time into datetime strings
      const startDateTime = formData.start_date && formData.start_time
        ? `${formData.start_date} ${formData.start_time}`
        : formData.start_date
      const endDateTime = formData.end_date && formData.end_time
        ? `${formData.end_date} ${formData.end_time}`
        : formData.end_date

      if (formData.action) {
        // Update existing leave with status
        if (!formData.id) {
          notifications.show({
            title: 'Error',
            message: 'Leave ID not found',
            color: 'red',
          })
          return
        }

        await api.put(`/hrm/leaves/${formData.id}`, {
          status: formData.action === 'approve' ? 'approved' : 'rejected',
          start_date: startDateTime,
          end_date: endDateTime,
          reason: formData.reason || null,
          admin_note: formData.admin_note,
        })

        notifications.show({
          title: 'Success',
          message: `Leave request ${formData.action === 'approve' ? 'approved' : 'rejected'} successfully`,
          color: 'green',
        })
      } else {
        // Create new leave request
        await api.post('/hrm/leaves', {
          user_id: formData.user_id,
          type: formData.type,
          start_date: startDateTime,
          end_date: endDateTime,
          reason: formData.reason || null,
        })

        notifications.show({
          title: 'Success',
          message: 'Leave request created successfully',
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchLeaves()
    } catch (error: unknown) {
      console.error('Failed to save leave:', error)
      const errorObj = error as { response?: { data?: { message?: string } } }
      notifications.show({
        title: 'Error',
        message: errorObj.response?.data?.message || 'Failed to save leave. Please try again.',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle approve
  const handleApprove = (leave: Leave) => {
    openApprovalModal(leave, 'approve')
  }

  // Handle reject
  const handleReject = (leave: Leave) => {
    openApprovalModal(leave, 'reject')
  }

  // Handle delete
  const handleDelete = (leave: Leave) => {
    modals.openConfirmModal({
      title: 'Delete Leave Request',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this leave request for <strong>{leave.user?.name}</strong>?
        </Text>
      ),
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/hrm/leaves/${leave.id}`)
          notifications.show({
            title: 'Success',
            message: 'Leave request deleted successfully',
            color: 'green',
          })
          fetchLeaves()
        } catch (error: unknown) {
          console.error('Failed to delete leave:', error)
          const errorObj = error as { response?: { data?: { message?: string } } }
          notifications.show({
            title: 'Error',
            message: errorObj.response?.data?.message || 'Failed to delete leave. Please try again.',
            color: 'red',
          })
        }
      },
    })
  }

  // Stats
  const totalLeaves = leaves.length
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length
  const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                {isAdmin ? 'Leave Management' : 'My Leave Requests'}
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                {isAdmin ? 'Manage employee leave requests' : 'View and manage your leave requests'}
              </Text>
            </Box>
            <Group >
              <ActionIcon
                variant="light"
                size="lg"
                onClick={handleRefresh}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
              <Button
                onClick={openCreateModal}
                leftSection={<IconPlus size={16} />}
              >
                {isAdmin ? 'Add Leave' : 'Apply for Leave'}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Stats */}
        <Stack  display={{ base: 'none', md: 'flex' }}>
          <Group >
            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Text size="xs" c="dimmed">Total Requests</Text>
              </Group>
              <Text size="xl" fw={700}>{totalLeaves}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-yellow-filled)' }} />
                <Text size="xs" c="dimmed">Pending</Text>
              </Group>
              <Text size="xl" fw={700}>{pendingLeaves}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconCheck size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
                <Text size="xs" c="dimmed">Approved</Text>
              </Group>
              <Text size="xl" fw={700}>{approvedLeaves}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconX size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Text size="xs" c="dimmed">Rejected</Text>
              </Group>
              <Text size="xl" fw={700}>{rejectedLeaves}</Text>
            </Card>
          </Group>
        </Stack>

        {/* Filters */}
        <Group justify="space-between">
          <Group >
            <Select
              placeholder="Filter by status"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: '150px' }}
              size="md"
            />
            {isAdmin && (
              <Select
                placeholder="Filter by employee"
                clearable
                searchable
                data={employees.map(emp => ({ value: String(emp.id), label: emp.name }))}
                value={employeeFilter}
                onChange={(value) => setEmployeeFilter(value)}
                style={{ width: '200px' }}
                size="md"
              />
            )}
          </Group>
        </Group>

        {/* Table */}
        <Card withBorder p="0" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {isAdmin && <Table.Th>Employee</Table.Th>}
                <Table.Th>Type</Table.Th>
                <Table.Th>Dates</Table.Th>
                <Table.Th>Days</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Status</Table.Th>
                {isAdmin && <Table.Th>Approved By</Table.Th>}
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {leaves.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 6}>
                    <Box py="xl" ta="center">
                      <Text c="dimmed">No leave requests found</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ) : (
                leaves.map((leave) => (
                  <Table.Tr key={leave.id}>
                    {isAdmin && (
                      <Table.Td>
                        <Text fw={500} size="sm">{leave.user?.name || 'N/A'}</Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Badge
                        color={
                          leave.type === 'sick' ? 'red' :
                          leave.type === 'casual' ? 'blue' :
                          'gray'
                        }
                        variant="light"
                        size="sm"
                      >
                        {leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {(() => {
                          // Check if dates exist
                          if (!leave.start_date || !leave.end_date) {
                            return 'N/A'
                          }

                          const startDate = new Date(leave.start_date)
                          const endDate = new Date(leave.end_date)
                          const hasTime = String(leave.start_date).includes(':') || String(leave.end_date).includes(':')

                          const formatDateTime = (date: Date) => {
                            if (hasTime) {
                              return date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })
                            }
                            return date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                          }

                          const startStr = formatDateTime(startDate)
                          const endStr = formatDateTime(endDate)

                          // Show year only if different year or same start/end
                          if (leave.start_date !== leave.end_date) {
                            return `${startStr} - ${endStr}`
                          }
                          return startStr
                        })()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{leave.days_count}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm" c="dimmed">{leave.reason || 'N/A'}</Text>
                        {leave.admin_note && (
                          <Text size="xs" c={leave.status === 'approved' ? 'green' : 'red'} fw={500}>
                            {leave.status === 'approved' ? '✓' : '✗'} {leave.admin_note}
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          leave.status === 'approved' ? 'green' :
                          leave.status === 'rejected' ? 'red' :
                          'yellow'
                        }
                        variant="light"
                        size="sm"
                      >
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </Badge>
                    </Table.Td>
                    {isAdmin && (
                      <Table.Td>
                        <Text size="sm">{leave.approver?.name || 'N/A'}</Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Group >
                        {isAdmin && leave.status === 'pending' && (
                          <>
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              size="sm"
                              onClick={() => handleApprove(leave)}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleReject(leave)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </>
                        )}
                        {(isAdmin || leave.status === 'pending') && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => handleDelete(leave)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      {/* Create/Edit/Approve Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          formData.action === 'approve'
            ? "Approve Leave Request"
            : formData.action === 'reject'
            ? "Reject Leave Request"
            : isAdmin
            ? "Create Leave Request"
            : "Apply for Leave"
        }
        centered
      >
        <Stack >
          {formData.action ? (
            // Approval/Rejection Mode - Show employee as read-only
            <Stack >
              <Text size="sm" fw={500}>Employee</Text>
              <Text size="sm" c="dimmed">
                {employees.find(e => String(e.id) === formData.user_id)?.name || user?.name}
              </Text>
            </Stack>
          ) : isAdmin ? (
            // Admin Create Mode - Show employee dropdown
            <Stack >
              <Text size="sm" fw={500}>Employee *</Text>
              <Select
                placeholder="Select employee"
                data={employees.map(emp => ({ value: String(emp.id), label: emp.name }))}
                value={formData.user_id}
                onChange={(value) => setFormData({ ...formData, user_id: value })}
                searchable
                size="md"
              />
            </Stack>
          ) : (
            // Staff Create Mode - Show current user
            <Stack >
              <Text size="sm" fw={500}>Employee</Text>
              <Text size="sm">{user?.name}</Text>
            </Stack>
          )}

          <Stack >
            <Text size="sm" fw={500}>Leave Type *</Text>
            <Select
              placeholder="Select leave type"
              data={[
                { value: 'sick', label: 'Sick Leave' },
                { value: 'casual', label: 'Casual Leave' },
                { value: 'unpaid', label: 'Unpaid Leave' },
              ]}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              size="md"
              disabled={!!formData.action} // Disable in approval mode
            />
          </Stack>

          <Group >
            <Stack  style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                Start Date *
                {formData.action && " (Editable)"}
              </Text>
              <TextInput
                type="date"
                placeholder="Pick start date"
                value={typeof formData.start_date === 'string' ? formData.start_date : ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.currentTarget.value })}
                size="md"
              />
              <Text size="sm" fw={500}>Start Time *</Text>
              <TextInput
                type="time"
                placeholder="Pick start time"
                value={typeof formData.start_time === 'string' ? formData.start_time : ''}
                onChange={(e) => setFormData({ ...formData, start_time: e.currentTarget.value })}
                size="md"
              />
            </Stack>

            <Stack  style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                End Date *
                {formData.action && " (Editable)"}
              </Text>
              <TextInput
                type="date"
                placeholder="Pick end date"
                value={typeof formData.end_date === 'string' ? formData.end_date : ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.currentTarget.value })}
                size="md"
                min={typeof formData.start_date === 'string' ? formData.start_date : undefined}
              />
              <Text size="sm" fw={500}>End Time *</Text>
              <TextInput
                type="time"
                placeholder="Pick end time"
                value={typeof formData.end_time === 'string' ? formData.end_time : ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.currentTarget.value })}
                size="md"
              />
            </Stack>
          </Group>

          {formData.start_date && formData.end_date && (
            <Box>
              <Text size="sm" c="dimmed">
                Total Days: {
                  Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                }
              </Text>
            </Box>
          )}

          <Stack >
            <Text size="sm" fw={500}>Employee Reason</Text>
            <Textarea
              placeholder="Employee's reason for leave"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.currentTarget.value })}
              size="md"
              rows={2}
              disabled={!!formData.action} // Disable in approval mode
            />
          </Stack>

          {formData.action && (
            <Stack >
              <Text size="sm" fw={500}>
                {formData.action === 'approve' ? 'Approval' : 'Rejection'} Note *
              </Text>
              <Textarea
                placeholder={`Enter reason for ${formData.action}al...`}
                value={formData.admin_note}
                onChange={(e) => setFormData({ ...formData, admin_note: e.currentTarget.value })}
                size="md"
                rows={3}
                required
              />
            </Stack>
          )}

          <Group justify="flex-end" >
            <Button
              variant="default"
              onClick={() => setModalOpened(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              color={
                formData.action === 'reject'
                  ? 'red'
                  : formData.action === 'approve'
                  ? 'green'
                  : undefined
              }
            >
              {formData.action === 'approve'
                ? 'Approve Leave'
                : formData.action === 'reject'
                ? 'Reject Leave'
                : 'Create Leave Request'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
