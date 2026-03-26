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
  Tabs,
  Tooltip,
  Menu,
} from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconUsers,
  IconArchive,
  IconRestore,
  IconTrashX,
  IconDots,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import api from '@/lib/api'

interface Role {
  id: number
  name: string
  slug: string
  description: string | null
  position: number
  users_count: number
  created_at: string
  deleted_at?: string | null
}

export default function RolesListPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [archiveConfirmOpened, setArchiveConfirmOpened] = useState(false)
  const [restoreConfirmOpened, setRestoreConfirmOpened] = useState(false)
  const [forceDeleteConfirmOpened, setForceDeleteConfirmOpened] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Fetch roles
  const fetchRoles = async (search = '', tab: 'active' | 'archived' = activeTab) => {
    try {
      setLoading(true)
      const endpoint = tab === 'active' ? '/hrm/roles' : '/hrm/roles/trashed'
      const params = new URLSearchParams()
      if (search) {
        params.append('search', search)
      }

      const response = await api.get(`${endpoint}?${params}`)
      // Sort roles by position
      const sortedRoles = (response.data.data || []).sort((a: Role, b: Role) => a.position - b.position)
      setRoles(sortedRoles)
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
    fetchRoles('', activeTab)
  }, [activeTab])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRoles(searchQuery, activeTab)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, activeTab])

  // Handle archive (soft delete)
  const handleArchive = async () => {
    if (!selectedRole) return

    try {
      await api.delete(`/hrm/roles/${selectedRole.id}`)
      notifications.show({
        title: 'Success',
        message: 'Role archived successfully',
        color: 'green',
      })
      setArchiveConfirmOpened(false)
      fetchRoles(searchQuery, activeTab)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to archive role',
        color: 'red',
      })
    }
  }

  // Handle restore
  const handleRestore = async () => {
    if (!selectedRole) return

    try {
      await api.post(`/hrm/roles/${selectedRole.id}/restore`)
      notifications.show({
        title: 'Success',
        message: 'Role restored successfully',
        color: 'green',
      })
      setRestoreConfirmOpened(false)
      fetchRoles(searchQuery, activeTab)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to restore role',
        color: 'red',
      })
    }
  }

  // Handle force delete
  const handleForceDelete = async () => {
    if (!selectedRole) return

    try {
      await api.delete(`/hrm/roles/${selectedRole.id}/force-delete`)
      notifications.show({
        title: 'Success',
        message: 'Role permanently deleted successfully',
        color: 'green',
      })
      setForceDeleteConfirmOpened(false)
      fetchRoles(searchQuery, activeTab)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to delete role',
        color: 'red',
      })
    }
  }

  // Mobile Card Component
  const RoleCard = ({ role }: { role: Role }) => {
    const protectedSlugs = ['super_admin', 'supplier', 'retail_customer', 'wholesale_customer']
    const isProtected = protectedSlugs.includes(role.slug)

    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1 }}>
              <Group gap="xs" mb="xs">
                <Badge variant="light" size="sm" c="gray">
                  Pos {role.position}
                </Badge>
                <Text fw={600} size="lg">{role.name}</Text>
                {isProtected && (
                  <Badge variant="light" size="xs" c="red">PROTECTED</Badge>
                )}
              </Group>
              {role.description && (
                <Text size="sm" c="dimmed">{role.description}</Text>
              )}
            </Box>
            <Badge
              variant={activeTab === 'active' ? 'filled' : 'light'}
              color={activeTab === 'active' ? 'blue' : 'orange'}
              size="lg"
            >
              {role.slug.toUpperCase().replace('_', ' ')}
            </Badge>
          </Group>

          <Paper withBorder p="xs" bg="gray.0">
            <Group gap="xs">
              <IconUsers size={16} style={{ color: '#6b7280' }} />
              <Text size="sm">
                {role.users_count} {role.users_count === 1 ? 'user' : 'users'}
              </Text>
            </Group>
          </Paper>

          <Menu position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <Button variant="light" color="gray" fullWidth>
                <Group justify="space-between" w="100%">
                  <Text>Actions</Text>
                  <IconDots size={16} />
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              {activeTab === 'active' ? (
                <>
                  {hasPermission('role.edit') && !isProtected && (
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => navigate(`/roles/${role.id}/edit`)}
                    >
                      Edit Role
                    </Menu.Item>
                  )}

                  {hasPermission('role.delete') && !isProtected && (
                    <Menu.Item
                      leftSection={<IconArchive size={16} />}
                      color="orange"
                      onClick={() => {
                        setSelectedRole(role)
                        setArchiveConfirmOpened(true)
                      }}
                    >
                      Archive Role{role.users_count > 0 && ` (${role.users_count})`}
                    </Menu.Item>
                  )}

                  {isProtected && (
                    <Menu.Item disabled>
                      Protected system role
                    </Menu.Item>
                  )}
                </>
              ) : (
                <>
                  <Menu.Item
                    leftSection={<IconRestore size={16} />}
                    color="green"
                    onClick={() => {
                      setSelectedRole(role)
                      setRestoreConfirmOpened(true)
                    }}
                  >
                    Restore Role
                  </Menu.Item>

                  {hasPermission('role.delete') && !isProtected && (
                    <Menu.Item
                      leftSection={<IconTrashX size={16} />}
                      color="red"
                      onClick={() => {
                        setSelectedRole(role)
                        setForceDeleteConfirmOpened(true)
                      }}
                    >
                      Delete Permanently{role.users_count > 0 && ` (${role.users_count})`}
                    </Menu.Item>
                  )}

                  {isProtected && (
                    <Menu.Item disabled>
                      Protected system role
                    </Menu.Item>
                  )}
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </Stack>
      </Card>
    )
  }

  if (loading && roles.length === 0) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <LoadingOverlay visible overlayProps={{ blur: 2 }} />
        <Text size="sm">Loading roles...</Text>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Header */}
        <Box>
          <Title order={1} size={{ base: '24px', md: '32px' }}>Roles Management</Title>
          <Text size="sm" c="dimmed">
            Manage user roles, permissions, and access control
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            ℹ️ When archiving a role, all assigned users are automatically reassigned to Retail Customer.
          </Text>
        </Box>

        {/* Actions */}
        <Group justify="space-between" wrap="nowrap">
          <TextInput
            placeholder="Search roles..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: '400px' }}
            size="md"
          />

          {hasPermission('role.create') && activeTab === 'active' && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/roles/create')}
              size="md"
              gradient={{ from: 'blue', to: 'cyan' }}
              variant="gradient"
            >
              Add Role
            </Button>
          )}
        </Group>

        {/* Content */}
        <Paper shadow="sm" withBorder p="0">
          <LoadingOverlay visible={loading && roles.length > 0} />

          {/* Tabs */}
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value as 'active' | 'archived')} variant="default">
            <Tabs.List p="md" style={{ borderBottom: '1px solid #e9ecef' }}>
              <Tabs.Tab
                value="active"
                leftSection={<IconUsers size={14} />}
                style={{ fontSize: '15px', fontWeight: 600 }}
              >
                Active Roles
                {roles.length > 0 && (
                  <Badge size="xs" ml="xs" variant="light" color="blue" circle>
                    {roles.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab
                value="archived"
                leftSection={<IconArchive size={14} />}
                style={{ fontSize: '15px', fontWeight: 600 }}
              >
                Archived
                {activeTab === 'archived' && roles.length > 0 && (
                  <Badge size="xs" ml="xs" variant="light" color="orange" circle>
                    {roles.length}
                  </Badge>
                )}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value={activeTab}>
              {/* Desktop Table */}
              <Box display={{ base: 'none', md: 'block' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ fontWeight: 600, fontSize: '13px' }}>Position</Table.Th>
                      <Table.Th style={{ fontWeight: 600, fontSize: '13px' }}>Role</Table.Th>
                      <Table.Th style={{ fontWeight: 600, fontSize: '13px' }}>Slug</Table.Th>
                      <Table.Th style={{ fontWeight: 600, fontSize: '13px' }}>Users</Table.Th>
                      <Table.Th style={{ fontWeight: 600, fontSize: '13px' }} textRight>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {roles.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Box py="xl">
                            <Text ta="center" c="dimmed" size="md">
                              No {activeTab === 'active' ? 'active' : 'archived'} roles found
                            </Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      roles.map((role) => {
                        const protectedSlugs = ['super_admin', 'supplier', 'retail_customer', 'wholesale_customer']
                        const isProtected = protectedSlugs.includes(role.slug)

                        return (
                        <Table.Tr key={role.id}>
                          <Table.Td>
                            <Badge variant="light" size="sm" c="gray">
                              {role.position}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={0}>
                              <Group gap="xs">
                                <Text fw={600} size="sm">{role.name}</Text>
                                {isProtected && (
                                  <Badge variant="light" size="xs" c="red">PROTECTED</Badge>
                                )}
                              </Group>
                              {role.description && (
                                <Text size="xs" c="dimmed" lineClamp={1}>{role.description}</Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              variant={activeTab === 'active' ? 'filled' : 'light'}
                              color={activeTab === 'active' ? 'blue' : 'orange'}
                              size="sm"
                            >
                              {role.slug}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <IconUsers size={14} style={{ color: '#6b7280' }} />
                              <Text size="sm">{role.users_count}</Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>

                              <Menu.Dropdown>
                                {activeTab === 'active' ? (
                                  <>
                                    {hasPermission('role.edit') && !isProtected && (
                                      <Menu.Item
                                        leftSection={<IconEdit size={16} />}
                                        onClick={() => navigate(`/roles/${role.id}/edit`)}
                                      >
                                        Edit Role
                                      </Menu.Item>
                                    )}

                                    {hasPermission('role.delete') && !isProtected && (
                                      <Menu.Item
                                        leftSection={<IconArchive size={16} />}
                                        color="orange"
                                        onClick={() => {
                                          setSelectedRole(role)
                                          setArchiveConfirmOpened(true)
                                        }}
                                      >
                                        Archive Role{role.users_count > 0 && ` (${role.users_count} users)`}
                                      </Menu.Item>
                                    )}

                                    {isProtected && (
                                      <Menu.Item disabled>
                                        Protected system role
                                      </Menu.Item>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Menu.Item
                                      leftSection={<IconRestore size={16} />}
                                      color="green"
                                      onClick={() => {
                                        setSelectedRole(role)
                                        setRestoreConfirmOpened(true)
                                      }}
                                    >
                                      Restore Role
                                    </Menu.Item>

                                    {hasPermission('role.delete') && !isProtected && (
                                      <Menu.Item
                                        leftSection={<IconTrashX size={16} />}
                                        color="red"
                                        onClick={() => {
                                          setSelectedRole(role)
                                          setForceDeleteConfirmOpened(true)
                                        }}
                                      >
                                        Delete Permanently{role.users_count > 0 && ` (${role.users_count} users)`}
                                      </Menu.Item>
                                    )}

                                    {isProtected && (
                                      <Menu.Item disabled>
                                        Protected system role
                                      </Menu.Item>
                                    )}
                                  </>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          </Table.Td>
                        </Table.Tr>
                      )})
                    )}
                  </Table.Tbody>
                </Table>
              </Box>

              {/* Mobile Cards */}
              <Box p="md" display={{ base: 'block', md: 'none' }}>
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                  {roles.length === 0 ? (
                    <Box py="xl">
                      <Text ta="center" c="dimmed" size="md">
                        No {activeTab === 'active' ? 'active' : 'archived'} roles found
                      </Text>
                    </Box>
                  ) : (
                    roles.map((role) => <RoleCard key={role.id} role={role} />)
                  )}
                </SimpleGrid>
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Paper>

        {/* Archive Confirmation Modal */}
        <Modal
          opened={archiveConfirmOpened}
          onClose={() => setArchiveConfirmOpened(false)}
          title={<Text fw={600} size="lg">Archive Role</Text>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to archive <Text span fw={600}>{selectedRole?.name}</Text>? You can restore it later if needed.
            </Text>

            {(selectedRole?.users_count ?? 0) > 0 && (
              <Paper withBorder p="sm" bg="blue.0">
                <Text size="sm" c="blue.9">
                  ℹ️ This role has {(selectedRole?.users_count ?? 0)} assigned user(s). They will be automatically reassigned to <Text span fw={600}>Retail Customer</Text> role.
                </Text>
              </Paper>
            )}

            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                onClick={() => setArchiveConfirmOpened(false)}
              >
                Cancel
              </Button>
              <Button
                color="orange"
                onClick={handleArchive}
              >
                Archive
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Restore Confirmation Modal */}
        <Modal
          opened={restoreConfirmOpened}
          onClose={() => setRestoreConfirmOpened(false)}
          title={<Text fw={600} size="lg">Restore Role</Text>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to restore <Text span fw={600}>{selectedRole?.name}</Text>?
            </Text>

            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                onClick={() => setRestoreConfirmOpened(false)}
              >
                Cancel
              </Button>
              <Button
                color="green"
                onClick={handleRestore}
              >
                Restore
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Force Delete Confirmation Modal */}
        <Modal
          opened={forceDeleteConfirmOpened}
          onClose={() => setForceDeleteConfirmOpened(false)}
          title={<Text fw={600} size="lg" c="red">Permanently Delete Role</Text>}
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to <Text span fw={600} c="red">permanently delete</Text> <Text span fw={600}>{selectedRole?.name}</Text>? This action cannot be undone.
            </Text>

            {(selectedRole?.users_count ?? 0) > 0 && (
              <Paper withBorder p="sm" bg="blue.0">
                <Text size="sm" c="blue.9">
                  ℹ️ This role has {(selectedRole?.users_count ?? 0)} associated user(s). They will be automatically reassigned to <Text span fw={600}>Retail Customer</Text> role.
                </Text>
              </Paper>
            )}

            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                onClick={() => setForceDeleteConfirmOpened(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={handleForceDelete}
              >
                Permanently Delete
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  )
}
