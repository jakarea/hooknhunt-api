import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Paper,
  TextInput,
  ActionIcon,
  Badge,
  LoadingOverlay,
  Modal,
  Card,
  SimpleGrid,
} from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconBan,
  IconCheck,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string | null
  phone: string
  role: {
    id: number
    name: string
    slug: string
  }
  is_active: boolean
  phone_verified_at: string | null
  created_at: string
}

interface PaginationData {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function UsersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [statusConfirmOpened, setStatusConfirmOpened] = useState(false)

  // Fetch users
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
      })

      if (search) {
        params.append('search', search)
      }

      const response = await api.get(`/user-management/users?${params}`)
      setUsers(response.data.data.data)
      setPagination(response.data.data.meta || {
        current_page: response.data.data.current_page || 1,
        last_page: response.data.data.last_page || 1,
        per_page: 10,
        total: response.data.data.total || 0,
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to load users',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1, searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      await api.delete(`/user-management/users/${selectedUser.id}`)
      notifications.show({
        title: 'Success',
        message: 'User deleted successfully',
        color: 'green',
      })
      setDeleteConfirmOpened(false)
      fetchUsers(pagination?.current_page || 1, searchQuery)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to delete user',
        color: 'red',
      })
    }
  }

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedUser) return

    try {
      await api.put(`/user-management/users/${selectedUser.id}/status`, {
        is_active: !selectedUser.is_active,
      })

      notifications.show({
        title: 'Success',
        message: `User ${selectedUser.is_active ? 'blocked' : 'unblocked'} successfully`,
        color: 'green',
      })

      setStatusConfirmOpened(false)
      fetchUsers(pagination?.current_page || 1, searchQuery)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to update user status',
        color: 'red',
      })
    }
  }

  // Mobile Card Component
  const UserCard = ({ user }: { user: User }) => (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack >
        <Group justify="space-between">
          <Box>
            <Text className="text-base font-semibold md:text-lg">{user.name}</Text>
            <Text className="text-xs md:text-sm" c="dimmed">{user.phone}</Text>
          </Box>
          <Badge
            color={user.is_active ? 'green' : 'gray'}
            variant="light"
            className="text-xs md:text-sm"
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </Group>

        <SimpleGrid cols={2} className="gap-xs md:gap-sm">
          <Box>
            <Text className="text-xs" c="dimmed">Role2Test</Text>
            <Text className="text-sm font-medium">{user.role.name}</Text>
          </Box>
          <Box>
            <Text className="text-xs" c="dimmed">Phone</Text>
            <Text className="text-sm font-medium">{user.phone}</Text>
          </Box>
        </SimpleGrid>

        <Group >
          {hasPermission('user.edit') && (
            <ActionIcon
              variant="light"
              color="blue"
              size="md"
              onClick={() => navigate(`/hrm/staff/${user.id}/edit`)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          )}

          {hasPermission('user.ban') && (
            <ActionIcon
              variant="light"
              color={user.is_active ? 'red' : 'green'}
              size="md"
              onClick={() => {
                setSelectedUser(user)
                setStatusConfirmOpened(true)
              }}
            >
              {user.is_active ? <IconBan size={16} /> : <IconCheck size={16} />}
            </ActionIcon>
          )}

          {hasPermission('user.delete') && (
            <ActionIcon
              variant="light"
              color="red"
              size="md"
              onClick={() => {
                setSelectedUser(user)
                setDeleteConfirmOpened(true)
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Stack>
    </Card>
  )

  if (loading && users.length === 0) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <LoadingOverlay visible overlayProps={{ blur: 2 }} />
        <Text className="text-sm md:text-base">Loading users...</Text>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Title className="text-xl md:text-2xl lg:text-3xl font-semibold">Users</Title>
          <Text className="text-sm md:text-base text-gray-500">
            Manage system users and their access
          </Text>
        </Box>

        {/* Actions */}
        <Group justify="space-between">
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="w-full md:w-auto md:min-w-[300px]"
            size="md"
          />

          {hasPermission('user.create') && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/hrm/staff/create')}
              className="text-sm md:text-base"
              size="md"
            >
              <span className="hidden md:inline">Add User</span>
              <span className="md:hidden">Add</span>
            </Button>
          )}
        </Group>

        {/* Loading Overlay */}
        <Paper pos="relative" withBorder>
          <LoadingOverlay visible={loading && users.length > 0} />

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-sm font-medium">Name</Table.Th>
                  <Table.Th className="text-sm font-medium">Phone</Table.Th>
                  <Table.Th className="text-sm font-medium">Email</Table.Th>
                  <Table.Th className="text-sm font-medium">Role</Table.Th>
                  <Table.Th className="text-sm font-medium">Status</Table.Th>
                  <Table.Th className="text-sm font-medium text-right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text className="text-sm text-center py-8 text-gray-500">
                        No users found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  users.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Text className="text-sm font-medium">{user.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm">{user.phone}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm">{user.email || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color="blue"
                          variant="light"
                          className="text-xs"
                        >
                          {user.role.name}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={user.is_active ? 'green' : 'gray'}
                          variant="light"
                          className="text-xs"
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group  justify="flex-end">
                          {hasPermission('user.edit') && (
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={() => navigate(`/hrm/staff/${user.id}/edit`)}
                            >
                              <IconEdit size={14} />
                            </ActionIcon>
                          )}

                          {hasPermission('user.ban') && (
                            <ActionIcon
                              variant="subtle"
                              color={user.is_active ? 'red' : 'green'}
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setStatusConfirmOpened(true)
                              }}
                            >
                              {user.is_active ? <IconBan size={14} /> : <IconCheck size={14} />}
                            </ActionIcon>
                          )}

                          {hasPermission('user.delete') && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setDeleteConfirmOpened(true)
                              }}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden">
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              {users.length === 0 ? (
                <Box py="xl">
                  <Text className="text-sm text-center text-gray-500">
                    No users found
                  </Text>
                </Box>
              ) : (
                users.map((user) => <UserCard key={user.id} user={user} />)
              )}
            </SimpleGrid>
          </div>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <Group justify="center" mt="md">
              <Button
                variant="default"
                size="sm"
                disabled={pagination.current_page === 1}
                onClick={() => fetchUsers(pagination.current_page - 1, searchQuery)}
                className="text-xs md:text-sm"
              >
                Previous
              </Button>
              <Text className="text-sm text-gray-500">
                Page {pagination.current_page} of {pagination.last_page}
              </Text>
              <Button
                variant="default"
                size="sm"
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchUsers(pagination.current_page + 1, searchQuery)}
                className="text-xs md:text-sm"
              >
                Next
              </Button>
            </Group>
          )}
        </Paper>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteConfirmOpened}
          onClose={() => setDeleteConfirmOpened(false)}
          title={
            <Text className="text-base md:text-lg font-semibold">
              Confirm Delete
            </Text>
          }
          centered
        >
          <Stack >
            <Text className="text-sm md:text-base">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
            </Text>

            <Group justify="flex-end" >
              <Button
                variant="default"
                onClick={() => setDeleteConfirmOpened(false)}
                className="text-sm md:text-base"
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleDelete}
                className="text-sm md:text-base"
              >
                Delete User
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Status Change Confirmation Modal */}
        <Modal
          opened={statusConfirmOpened}
          onClose={() => setStatusConfirmOpened(false)}
          title={
            <Text className="text-base md:text-lg font-semibold">
              Confirm Status Change
            </Text>
          }
          centered
        >
          <Stack >
            <Text className="text-sm md:text-base">
              Are you sure you want to {selectedUser?.is_active ? 'block' : 'unblock'}{' '}
              <strong>{selectedUser?.name}</strong>?
            </Text>

            {selectedUser?.is_active && (
              <Paper withBorder p="sm" bg="yellow.0">
                <Text className="text-xs md:text-sm text-yellow.800">
                  ⚠️ Blocking this user will prevent them from accessing the system.
                </Text>
              </Paper>
            )}

            <Group justify="flex-end" >
              <Button
                variant="default"
                onClick={() => setStatusConfirmOpened(false)}
                className="text-sm md:text-base"
              >
                Cancel
              </Button>
              <Button
                color={selectedUser?.is_active ? 'red' : 'green'}
                onClick={handleStatusChange}
                className="text-sm md:text-base"
              >
                {selectedUser?.is_active ? 'Block User' : 'Unblock User'}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  )
}
