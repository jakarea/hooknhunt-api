import { useState, useEffect } from 'react'
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
  Table,
  LoadingOverlay,
  Modal,
  Switch,
} from '@mantine/core'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconPencil,
  IconRefresh,
  IconBuilding,
  IconUsers,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Department {
  id: number
  name: string
  is_active: boolean
  employees_count: number
  created_at: string
  updated_at: string
}

interface FormData {
  name: string
  is_active: boolean
}

export default function DepartmentsPage() {
  const { hasPermission } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpened, setModalOpened] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    is_active: true,
  })

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/hrm/departments')
      setDepartments(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load departments. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchDepartments()
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        const filtered = departments.filter(dept =>
          dept.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setDepartments(filtered)
      } else {
        fetchDepartments()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Handle refresh
  const handleRefresh = () => {
    fetchDepartments()
  }

  // Open create modal
  const openCreateModal = () => {
    setEditingDepartment(null)
    setFormData({ name: '', is_active: true })
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (department: Department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name,
      is_active: department.is_active,
    })
    setModalOpened(true)
  }

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Department name is required',
        color: 'red',
      })
      return
    }

    if (formData.name.trim().length < 2) {
      notifications.show({
        title: 'Validation Error',
        message: 'Department name must be at least 2 characters',
        color: 'red',
      })
      return
    }

    try {
      setSaving(true)

      if (editingDepartment) {
        // Update
        await api.put(`/hrm/departments/${editingDepartment.id}`, {
          name: formData.name.trim(),
          is_active: formData.is_active,
        })
        notifications.show({
          title: 'Success',
          message: 'Department updated successfully',
          color: 'green',
        })
      } else {
        // Create
        await api.post('/hrm/departments', {
          name: formData.name.trim(),
          is_active: formData.is_active,
        })
        notifications.show({
          title: 'Success',
          message: 'Department created successfully',
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchDepartments()
    } catch (error) {
      console.error('Failed to save department:', error)
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || 'Failed to save department. Please try again.',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const openDeleteModal = (department: Department) => {
    modals.openConfirmModal({
      title: 'Delete Department',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{department.name}</strong>?
          {department.employees_count > 0 && (
            <Text c="red" mt="xs" display="block">
              This department has {department.employees_count} employee{department.employees_count > 1 ? 's' : ''}. You cannot delete departments with employees.
            </Text>
          )}
        </Text>
      ),
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      confirmProps: { color: 'red', disabled: department.employees_count > 0 },
      onConfirm: async () => {
        try {
          await api.delete(`/hrm/departments/${department.id}`)
          notifications.show({
            title: 'Department Deleted',
            message: `${department.name} has been deleted successfully`,
            color: 'green',
          })
          fetchDepartments()
        } catch (error) {
          console.error('Failed to delete department:', error)
          notifications.show({
            title: 'Error',
            message: (error as any).response?.data?.message || 'Failed to delete department. Please try again.',
            color: 'red',
          })
        }
      },
    })
  }

  // Filtered departments for display
  const filteredDepartments = departments

  // Stats
  const totalDepartments = departments.length
  const activeDepartments = departments.filter(d => d.is_active).length
  const totalEmployees = departments.reduce((sum, dept) => sum + dept.employees_count, 0)

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">Departments</Title>
              <Text c="dimmed" className="text-sm md:text-base">Manage organization departments</Text>
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
              {hasPermission('hrm.department.create') && (
                <Button
                  onClick={openCreateModal}
                  leftSection={<IconPlus size={16} />}
                >
                  Add Department
                </Button>
              )}
            </Group>
          </Group>
        </Box>

        {/* Stats */}
        <Stack  display={{ base: 'none', md: 'flex' }}>
          <Group >
            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconBuilding size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Text size="xs" c="dimmed">Total Departments</Text>
              </Group>
              <Text size="xl" fw={700}>{totalDepartments}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconBuilding size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
                <Text size="xs" c="dimmed">Active</Text>
              </Group>
              <Text size="xl" fw={700}>{activeDepartments}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconUsers size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
                <Text size="xs" c="dimmed">Total Employees</Text>
              </Group>
              <Text size="xl" fw={700}>{totalEmployees}</Text>
            </Card>
          </Group>
        </Stack>

        {/* Search */}
        <Group justify="space-between">
          <TextInput
            placeholder="Search departments..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: '400px' }}
            size="md"
          />
        </Group>

        {/* Desktop Table */}
        <Card withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Department Name</Table.Th>
                <Table.Th>Employees</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDepartments.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Box py="xl" ta="center">
                      <Text c="dimmed">
                        {searchQuery ? 'No departments found matching your search' : 'No departments found'}
                      </Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredDepartments.map((department) => (
                  <Table.Tr key={department.id}>
                    <Table.Td>
                      <Group >
                        <IconBuilding size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                        <Text fw={500} size="sm">{department.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" leftSection={<IconUsers size={14} />}>
                        {department.employees_count}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={department.is_active ? 'green' : 'gray'}
                        variant="light"
                        size="sm"
                      >
                        {department.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(department.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group >
                        {hasPermission('hrm.department.edit') && (
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => openEditModal(department)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        )}
                        {hasPermission('hrm.department.delete') && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => openDeleteModal(department)}
                            disabled={department.employees_count > 0}
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

        {/* Mobile Card View */}
        <Stack  display={{ base: 'block', md: 'none' }}>
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          {filteredDepartments.length === 0 ? (
            <Card withBorder p="xl" ta="center" shadow="sm">
              <Text c="dimmed">
                {searchQuery ? 'No departments found matching your search' : 'No departments found'}
              </Text>
            </Card>
          ) : (
            filteredDepartments.map((department) => (
              <Card key={department.id} shadow="sm" p="sm" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group >
                    <IconBuilding size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                    <Text fw={600} size="sm">{department.name}</Text>
                  </Group>
                  <Badge
                    color={department.is_active ? 'green' : 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {department.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Group>

                <Group  mt="xs">
                  <Group >
                    <IconUsers size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
                    <Text size="xs">{department.employees_count} employee{department.employees_count !== 1 ? 's' : ''}</Text>
                  </Group>
                  <Group >
                    <Text size="xs" c="dimmed">
                      Created {new Date(department.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </Group>
                </Group>

                <Group  mt="xs">
                  {hasPermission('hrm.department.edit') && (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => openEditModal(department)}
                      leftSection={<IconPencil size={14} />}
                      style={{ flex: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                  {hasPermission('hrm.department.delete') && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => openDeleteModal(department)}
                      disabled={department.employees_count > 0}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingDepartment ? 'Edit Department' : 'Create New Department'}
        centered
      >
        <Stack >
          <Stack >
            <Text size="sm" fw={500}>Department Name *</Text>
            <TextInput
              placeholder="Enter department name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
              size="md"
              autoFocus
              required
            />
          </Stack>

          <Group >
            <Switch
              label="Active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
            />
            <Text size="sm" c="dimmed">
              {formData.is_active ? 'Department is active' : 'Department is inactive'}
            </Text>
          </Group>

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
              disabled={!formData.name.trim()}
            >
              {editingDepartment ? 'Update' : 'Create'} Department
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
