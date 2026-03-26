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
  IconUsers,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import api from '@/lib/api'

interface Role {
  id: number
  name: string
  slug: string
  description: string | null
  users_count: number
  created_at: string
}

export default function RolesListPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Fetch roles
  const fetchRoles = async (search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) {
        params.append('search', search)
      }

      const response = await api.get(`/hrm/roles?${params}`)
      setRoles(response.data.data)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to load roles',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRoles(searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRole) return

    try {
      await api.delete(`/hrm/roles/${selectedRole.id}`)
      notifications.show({
        title: 'Success',
        message: 'Role deleted successfully',
        color: 'green',
      })
      setDeleteConfirmOpened(false)
      fetchRoles(searchQuery)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to delete role',
        color: 'red',
      })
    }
  }

  // Mobile Card Component
  const RoleCard = ({ role }: { role: Role }) => (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack >
        <Group justify="space-between">
          <Box>
            <Text className="text-base font-semibold md:text-lg">{role.name}</Text>
            <Text className="text-xs md:text-sm" c="dimmed">{role.description || 'No description'}</Text>
          </Box>
          <Badge
            color={role.slug === 'super_admin' ? 'red' : 'blue'}
            variant="light"
            className="text-xs md:text-sm"
          >
            {role.slug.replace('_', ' ').toUpperCase()}
          </Badge>
        </Group>

        <Group >
          <IconUsers size={16} className="text-gray-500" />
          <Text className="text-sm">
            {role.users_count} {role.users_count === 1 ? 'user' : 'users'}
          </Text>
        </Group>

        <Group >
          {hasPermission('role.edit') && role.slug !== 'super_admin' && (
            <ActionIcon
              variant="light"
              color="blue"
              size="md"
              onClick={() => navigate(`/roles/${role.id}/edit`)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          )}

          {hasPermission('role.delete') && role.slug !== 'super_admin' && role.users_count === 0 && (
            <ActionIcon
              variant="light"
              color="red"
              size="md"
              onClick={() => {
                setSelectedRole(role)
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

  if (loading && roles.length === 0) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <LoadingOverlay visible overlayProps={{ blur: 2 }} />
        <Text className="text-sm md:text-base">Loading roles...</Text>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Title className="text-xl md:text-2xl lg:text-3xl font-semibold">Roles</Title>
          <Text className="text-sm md:text-base text-gray-500">
            Manage user roles and their permissions
          </Text>
        </Box>

        {/* Actions */}
        <Group justify="space-between">
          <TextInput
            placeholder="Search roles..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="w-full md:w-auto md:min-w-[300px]"
            size="md"
          />

          {hasPermission('role.create') && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/roles/create')}
              className="text-sm md:text-base"
              size="md"
            >
              <span className="hidden md:inline">Add Role</span>
              <span className="md:hidden">Add</span>
            </Button>
          )}
        </Group>

        {/* Content */}
        <Paper pos="relative" withBorder>
          <LoadingOverlay visible={loading && roles.length > 0} />

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="text-sm font-medium">Name</Table.Th>
                  <Table.Th className="text-sm font-medium">Slug</Table.Th>
                  <Table.Th className="text-sm font-medium">Description</Table.Th>
                  <Table.Th className="text-sm font-medium">Users</Table.Th>
                  <Table.Th className="text-sm font-medium text-right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {roles.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text className="text-sm text-center py-8 text-gray-500">
                        No roles found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  roles.map((role) => (
                    <Table.Tr key={role.id}>
                      <Table.Td>
                        <Text className="text-sm font-medium">{role.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={role.slug === 'super_admin' ? 'red' : 'blue'}
                          variant="light"
                          className="text-xs"
                        >
                          {role.slug}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm">{role.description || '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group >
                          <IconUsers size={14} className="text-gray-500" />
                          <Text className="text-sm">{role.users_count}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group  justify="flex-end">
                          {hasPermission('role.edit') && role.slug !== 'super_admin' && (
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={() => navigate(`/roles/${role.id}/edit`)}
                            >
                              <IconEdit size={14} />
                            </ActionIcon>
                          )}

                          {hasPermission('role.delete') && role.slug !== 'super_admin' && role.users_count === 0 && (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => {
                                setSelectedRole(role)
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
              {roles.length === 0 ? (
                <Box py="xl">
                  <Text className="text-sm text-center text-gray-500">
                    No roles found
                  </Text>
                </Box>
              ) : (
                roles.map((role) => <RoleCard key={role.id} role={role} />)
              )}
            </SimpleGrid>
          </div>
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
              Are you sure you want to delete role <strong>{selectedRole?.name}</strong>? This action cannot be undone.
            </Text>

            {(selectedRole?.users_count ?? 0) > 0 && (
              <Paper withBorder p="sm" bg="yellow.0">
                <Text className="text-xs md:text-sm text-yellow.800">
                  ⚠️ This role has {(selectedRole?.users_count ?? 0)} assigned user(s). Please reassign them before deleting.
                </Text>
              </Paper>
            )}

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
                disabled={(selectedRole?.users_count ?? 0) > 0}
                className="text-sm md:text-base"
              >
                Delete Role
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  )
}
