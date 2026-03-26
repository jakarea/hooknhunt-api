import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Card,
  TextInput,
  ActionIcon,
  SimpleGrid,
  Table,
  Avatar,
  LoadingOverlay,
  Pagination,
  Tooltip,
} from '@mantine/core'
import {
  IconPlus,
  IconSearch,
  IconMail,
  IconBuilding,
  IconRefresh,
  IconEye,
  IconPencil,
  IconTrash,
  IconUsers,
  IconBriefcase,
  IconClock,
  IconBan,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/hooks/usePermissions'

interface Staff {
  id: number
  name: string
  phone: string
  email?: string
  role?: {
    id: number
    name: string
    slug: string
  }
  staffProfile?: {
    departmentId?: number
    designation?: string
    joiningDate?: string
    baseSalary?: number
    houseRent?: number
    medicalAllowance?: number
    conveyanceAllowance?: number
    overtimeHourlyRate?: number
    address?: string
    division?: string
    district?: string
    thana?: string
    dob?: string
    gender?: string
    whatsappNumber?: string
    officeEmail?: string
    officeEmailPassword?: string
    department?: {
      id: number
      name: string
    }
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse {
  data: Staff[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function StaffPage() {
  const { user: currentUser } = useAuthStore()
  const { hasPermission } = usePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [staffData, setStaffData] = useState<PaginatedResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null)

  // Fetch staff from API
  const fetchStaff = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page,
      }
      if (search) params.search = search

      const response = await api.get('/hrm/staff', { params })

      const paginatedData = response.data.data

      setStaffData({
        data: paginatedData.data || [],
        current_page: paginatedData.current_page || 1,
        last_page: paginatedData.last_page || 1,
        per_page: paginatedData.per_page || 20,
        total: paginatedData.total || 0
      })
    } catch (error) {
      console.error('Failed to fetch staff:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load staff. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchStaff(1, '')
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchStaff(1, searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchStaff(page, searchQuery)
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchStaff(currentPage, searchQuery)
  }

  // Handle delete
  const openDeleteModal = (id: number, name: string) => {
    // Prevent users from deleting themselves
    if (id === currentUser?.id) {
      notifications.show({
        title: 'Action Not Allowed',
        message: 'You cannot delete your own account.',
        color: 'red',
      })
      return
    }

    modals.openConfirmModal({
      title: 'Delete Staff',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
        </Text>
      ),
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          setDeletingStaffId(id)
          await api.delete(`/hrm/staff/${id}`)
          notifications.show({
            title: 'Staff Deleted',
            message: `${name} has been deleted successfully`,
            color: 'green',
          })
          fetchStaff(currentPage, searchQuery)
        } catch {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete staff. Please try again.',
            color: 'red',
          })
        } finally {
          setDeletingStaffId(null)
        }
      },
    })
  }

  const staff = useMemo(() => staffData?.data || [], [staffData])
  const totalPages = staffData?.last_page || 1

  // Calculate stats from real data
  const totalStaff = staffData?.total || 0
  const activeStaff = useMemo(() => staff.filter(s => s.isActive).length, [staff])
  const onLeaveStaff = 0 // No leave status in current data structure
  const departmentsCount = useMemo(
    () => new Set(staff.map(s => s.staffProfile?.departmentId)).size,
    [staff]
  )

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">Staff</Title>
              <Text c="dimmed" className="text-sm md:text-base">Manage your team members</Text>
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
              {hasPermission('hrm.staff.create') && (
                <Button
                  component={Link}
                  to="/hrm/staff/create"
                  leftSection={<IconPlus size={16} />}
                >
                  Add Staff
                </Button>
              )}
            </Group>
          </Group>
        </Box>

        {/* Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconUsers size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
              <Text size="xs" c="dimmed">Total Staff</Text>
            </Group>
            <Text size="xl" fw={700}>{totalStaff}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconBriefcase size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text size="xs" c="dimmed">Active</Text>
            </Group>
            <Text size="xl" fw={700}>{activeStaff}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconClock size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Text size="xs" c="dimmed">On Leave</Text>
            </Group>
            <Text size="xl" fw={700}>{onLeaveStaff}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconBuilding size={20} style={{ color: 'var(--mantine-color-purple-filled)' }} />
              <Text size="xs" c="dimmed">Departments</Text>
            </Group>
            <Text size="xl" fw={700}>{departmentsCount}</Text>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Group justify="space-between">
          <Group  style={{ flex: 1, maxWidth: '100%' }}>
            <TextInput
              placeholder="Search staff..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: '400px' }}
              size="md"
            />
          </Group>
        </Group>

        {/* Desktop Table */}
        <Card withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Table.ScrollContainer minWidth={1200}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Staff</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Position</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Joined</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {staff.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Box py="xl" ta="center">
                        <Text c="dimmed">No staff found</Text>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  staff.map((staffMember) => (
                    <Table.Tr key={staffMember.id}>
                      <Table.Td>
                        <Group >
                          <Avatar
                            alt={staffMember.name}
                            radius="xl"
                            size="sm"
                            color="red"
                          >
                            {getInitials(staffMember.name)}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm">{staffMember.name}</Text>
                            {staffMember.email && <Text size="xs" c="dimmed">{staffMember.email}</Text>}
                            <Text size="xs" c="dimmed">{staffMember.phone}</Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {staffMember.staffProfile?.department ? (
                          <Badge size="sm" variant="light">{staffMember.staffProfile.department.name}</Badge>
                        ) : (
                          <Text size="sm" c="dimmed">N/A</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{staffMember.staffProfile?.designation || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        {staffMember.role ? (
                          <Badge size="sm" color="blue" variant="light">{staffMember.role.name}</Badge>
                        ) : (
                          <Text size="sm" c="dimmed">N/A</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={staffMember.isActive ? 'green' : 'gray'}
                          variant="light"
                          size="sm"
                        >
                          {staffMember.isActive? 'Active':'InActive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDate(staffMember.staffProfile?.joiningDate)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group >
                          {/* View Button */}
                          {hasPermission('hrm.staff.index') && (
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              component={Link}
                              to={`/hrm/staff/${staffMember.id}`}
                              size="sm"
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          )}

                          {/* Edit Button */}
                          {hasPermission('hrm.staff.edit') && (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              component={Link}
                              to={`/hrm/staff/${staffMember.id}/edit`}
                              size="sm"
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          )}

                          {/* Delete Button */}
                          {hasPermission('hrm.staff.delete') && (
                            <Tooltip
                              label={staffMember.id === currentUser?.id ? "You cannot delete your own account" : "Delete staff"}
                            >
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                loading={deletingStaffId === staffMember.id}
                                disabled={staffMember.id === currentUser?.id}
                                onClick={() => openDeleteModal(staffMember.id, staffMember.name)}
                              >
                                {staffMember.id === currentUser?.id ? <IconBan size={16} /> : <IconTrash size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        {/* Mobile Card View */}
        <Stack  display={{ base: 'block', md: 'none' }}>
          {staff.length === 0 ? (
            <Card withBorder p="xl" ta="center" shadow="sm">
              <Text c="dimmed">No staff found</Text>
            </Card>
          ) : (
            staff.map((staffMember) => (
              <Card key={staffMember.id} shadow="sm" p="sm" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group >
                    <Avatar
                      alt={staffMember.name}
                      radius="xl"
                      size="md"
                      color="red"
                    >
                      {getInitials(staffMember.name)}
                    </Avatar>
                    <Box>
                      <Text fw={600} size="sm">{staffMember.name}</Text>
                      <Text size="xs" c="dimmed">{staffMember.phone}</Text>
                    </Box>
                  </Group>
                  <Badge
                    color={staffMember.isActive ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {String(staffMember.isActive)}
                  </Badge>
                </Group>

                {staffMember.email && (
                  <Group gap={6} mb="xs">
                    <IconMail size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    <Text size="xs">{staffMember.email}</Text>
                  </Group>
                )}

                <SimpleGrid cols={2}  mb="xs">
                  <Box>
                    <Text size="xs" c="dimmed">Department</Text>
                    {staffMember.staffProfile?.department ? (
                      <Badge size="xs" variant="light">{staffMember.staffProfile.department.name}</Badge>
                    ) : (
                      <Text size="xs">N/A</Text>
                    )}
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Position</Text>
                    <Text size="xs">{staffMember.staffProfile?.designation || 'N/A'}</Text>
                  </Box>
                </SimpleGrid>

                <SimpleGrid cols={2} >
                  <Box>
                    <Text size="xs" c="dimmed">Role</Text>
                    {staffMember.role ? (
                      <Badge size="xs" color="blue" variant="light">{staffMember.role.name}</Badge>
                    ) : (
                      <Text size="xs">N/A</Text>
                    )}
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Joined</Text>
                    <Text size="xs">{formatDate(staffMember.staffProfile?.joiningDate)}</Text>
                  </Box>
                </SimpleGrid>

                <Group  mt="xs">
                  {/* View Button */}
                  {hasPermission('hrm.staff.index') && (
                    <Button
                      variant="light"
                      size="xs"
                      component={Link}
                      to={`/hrm/staff/${staffMember.id}`}
                      leftSection={<IconEye size={14} />}
                      style={{ flex: 1 }}
                    >
                      View
                    </Button>
                  )}

                  {/* Edit Button */}
                  {hasPermission('hrm.staff.edit') && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      component={Link}
                      to={`/hrm/staff/${staffMember.id}/edit`}
                      size="sm"
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  )}

                  {/* Delete Button */}
                  {hasPermission('hrm.staff.delete') && (
                    <Tooltip
                      label={staffMember.id === currentUser?.id ? "You cannot delete your own account" : "Delete staff"}
                    >
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        loading={deletingStaffId === staffMember.id}
                        disabled={staffMember.id === currentUser?.id}
                        onClick={() => openDeleteModal(staffMember.id, staffMember.name)}
                      >
                        {staffMember.id === currentUser?.id ? <IconBan size={16} /> : <IconTrash size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Card>
            ))
          )}
        </Stack>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="flex-end">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={handlePageChange}
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </Box>
  )
}
