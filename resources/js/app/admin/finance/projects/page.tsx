import { useEffect, useState } from 'react'
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Table,
  Badge,
  NumberFormatter,
  ActionIcon,
  TextInput,
  Select,
  Progress,
  Grid,
  Alert,
  Card,
  Modal,
} from '@mantine/core'
import {
  IconBriefcase,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconTrendingUp,
  IconTrendingDown,
  IconSearch,
  IconFilter,
  IconX,
  IconAlertTriangle,
  IconRefresh,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  calculateProjectProfitability,
  updateProjectProgress,
  getProjectStatistics,
  getNextProjectCode,
  getCostCenters,
  getUsers,
  type Project,
  type CostCenter,
} from '@/utils/api'
// TODO: Implement these API functions
// import { getCustomers } from '@/utils/api'
// import { getDepartments } from '@/utils/api'
// import type { Customer } from '@/utils/api'
// import type { Department } from '@/utils/api'
import { useForm } from '@mantine/form'
import { DateInput } from '@mantine/dates'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [progressModalOpened, setProgressModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [nextCode, setNextCode] = useState<string>('')

  // Filters
  const [filters, setFilters] = useState({
  })

  // Form for create/edit
  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      customer_id: '',
      cost_center_id: '',
      manager_id: '',
      start_date: null,
      end_date: null,
      budget: '',
      status: 'active',
      description: '',
    },
    validate: {
      name: (value) => value.trim().length > 0 || 'Name is required',
      code: (value) => value.trim().length > 0 || 'Code is required',
    },
  })

  // Form for update progress
  const progressForm = useForm({
    initialValues: {
      progress_percentage: 0,
      notes: '',
    },
    validate: {
      progress_percentage: (value) => (value >= 0 && value <= 100) || 'Progress must be between 0 and 100',
    },
  })

  useEffect(() => {
    fetchProjects()
    // fetchCustomers() // TODO: Implement getCustomers API
    // fetchDepartments() // TODO: Implement getDepartments API
    fetchCostCenters()
    fetchManagers()
    fetchStatistics()
    fetchNextCode()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await getProjects({
      })
      setProjects(response.data || [])
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch projects',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // TODO: Implement getCustomers API
  // const fetchCustomers = async () => {
  //   try {
  //     const response = await getCustomers()
  //     setCustomers(response.data || [])
  //   } catch (error: any) {
  //     console.error('Failed to fetch customers:', error)
  //   }
  // }

  // TODO: Implement getDepartments API
  // const fetchDepartments = async () => {
  //   try {
  //     const response = await getDepartments()
  //     setDepartments(response.data || [])
  //   } catch (error: any) {
  //     console.error('Failed to fetch departments:', error)
  //   }
  // }

  const fetchCostCenters = async () => {
    try {
      const response = await getCostCenters({ active: true })
      setCostCenters(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch cost centers:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      const response = await getUsers()
      setManagers(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await getProjectStatistics()
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchNextCode = async () => {
    try {
      const response = await getNextProjectCode()
      setNextCode(response.data?.next_code || 'PRJ-0001')
    } catch (error: any) {
      console.error('Failed to fetch next code:', error)
    }
  }

  const handleOpenCreate = () => {
    setEditId(null)
    form.reset()
    fetchNextCode()
    form.setValues({
    })
    setModalOpened(true)
  }

  const handleOpenEdit = async (id: number) => {
    try {
      const response = await getProject(id)
      const project = response.data

      setEditId(id)
      form.setValues({
      })
      setModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleOpenView = async (id: number) => {
    try {
      const response = await getProject(id)
      setSelectedProject(response.data)
      setViewModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleOpenProgress = (project: Project) => {
    setSelectedProject(project)
    progressForm.setValues({
    })
    setProgressModalOpened(true)
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
      }

      if (editId) {
        await updateProject(editId, payload)
        notifications.show({
          title: 'Success',
          message: 'Project updated successfully',
          color: 'green',
        })
      } else {
        await createProject(payload)
        notifications.show({
          title: 'Success',
          message: 'Project created successfully',
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchProjects()
      fetchStatistics()
      fetchNextCode()
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleDelete = (project: Project) => {
    modals.openConfirmModal({
      title: 'Delete Project',
      children: (
        <Text size="sm">Are you sure you want to delete this project? This action cannot be undone.</Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      onConfirm: async () => {
        try {
          await deleteProject(project.id)
          notifications.show({
            title: 'Success',
            message: 'Project deleted successfully',
            color: 'green',
          })
          fetchProjects()
          fetchStatistics()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.message || 'Failed to delete project',
            color: 'red',
          })
        }
      },
    })
  }

  const handleCalculateProfitability = async (id: number) => {
    try {
      await calculateProjectProfitability(id)
      notifications.show({
        title: 'Success',
        message: 'Profitability calculated successfully',
        color: 'green',
      })
      fetchProjects()
      fetchStatistics()
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleUpdateProgress = async () => {
    if (!selectedProject) return

    try {
      await updateProjectProgress(selectedProject.id, {
        progress_percentage: progressForm.values.progress_percentage,
        notes: progressForm.values.notes,
      })
      notifications.show({
        title: 'Success',
        message: 'Progress updated successfully',
        color: 'green',
      })
      setProgressModalOpened(false)
      fetchProjects()
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const getPriorityBadge = (project: Project) => {
    return <Badge color={project.priority_color}>{project.priority_label}</Badge>
  }

  const getProfitIcon = (project: Project) => {
    if (project.profit > 0) return <IconTrendingUp size={16} color="green" />
    if (project.profit < 0) return <IconTrendingDown size={16} color="red" />
    return null
  }

  return (
    <>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconBriefcase size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>Projects</Text>
              <Text size="sm" c="dimmed">Track project profitability and expenses</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            New Project
          </Button>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Projects</Text>
                <Text size="xl" fw={500}>{statistics.total_projects}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Active</Text>
                <Text size="xl" fw={500} c="green">{statistics.active_projects}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Completed</Text>
                <Text size="xl" fw={500} c="blue">{statistics.completed_projects}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Profit</Text>
                <Text size="xl" fw={500} c={statistics.total_profit >= 0 ? 'green' : 'red'}>
                  <NumberFormatter value={statistics.total_profit} decimalScale={2} thousandSeparator prefix="BDT " />
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Over Budget</Text>
                <Text size="xl" fw={500} c="red">{statistics.over_budget_projects}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Overdue</Text>
                <Text size="xl" fw={500} c="orange">{statistics.overdue_projects}</Text>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder="Customer"
                clearable
                data={customers.map(cust => ({
                }))}
                value={filters.customer_id}
                onChange={(value) => setFilters({ ...filters, customer_id: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder="Status"
                data={[
                ]}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder="Priority"
                data={[
                ]}
                value={filters.priority}
                onChange={(value) => setFilters({ ...filters, priority: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder="Department"
                clearable
                data={departments.map(dept => ({
                }))}
                value={filters.department_id}
                onChange={(value) => setFilters({ ...filters, department_id: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Group>
                <Button variant="light" onClick={fetchProjects} loading={loading}>
                  <IconFilter size={16} />
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setFilters({ customer_id: '', department_id: '', cost_center_id: '', manager_id: '', status: '', priority: '', search: '' })}
                >
                  <IconX size={16} />
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Alerts */}
        {projects.filter(p => p.is_overdue).length > 0 && (
          <Alert icon={<IconAlertTriangle size={16} />} color="orange">
            {projects.filter(p => p.is_overdue).length} project(s) are overdue
          </Alert>
        )}

        {/* Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Project Name</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Budget</Table.Th>
                <Table.Th>Actual Cost</Table.Th>
                <Table.Th>Profit</Table.Th>
                <Table.Th>Progress</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={10} ta="center">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : projects.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={10} ta="center">
                    <Text c="dimmed">No projects found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                projects.map((project) => (
                  <Table.Tr key={project.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">{project.code}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{project.name}</Text>
                      {project.deadline && (
                        <Text size="xs" c={project.is_overdue ? 'red' : 'dimmed'}>
                          Due: {new Date(project.deadline).toLocaleDateString()}
                          {project.days_remaining !== undefined && ` (${project.days_remaining} days)`}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{project.customer?.name || '-'}</Text>
                    </Table.Td>
                    <Table.Td>{getPriorityBadge(project)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        <NumberFormatter value={project.budget_amount} decimalScale={2} thousandSeparator prefix="BDT " />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={project.is_over_budget ? 'red' : 'green'}>
                        <NumberFormatter value={project.actual_cost} decimalScale={2} thousandSeparator prefix="BDT " />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {getProfitIcon(project)}
                        <Text size="sm" c={project.profit >= 0 ? 'green' : 'red'}>
                          <NumberFormatter value={project.profit} decimalScale={2} thousandSeparator prefix="BDT " />
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Progress
                        value={project.progress_percentage}
                        color={project.progress_percentage >= 100 ? 'green' : 'blue'}
                        size="md"
                        style={{ width: 80 }}
                      />
                      <Text size="xs" c="dimmed">{project.progress_percentage}%</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={project.status_badge}>{project.status_label}</Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => handleOpenView(project.id)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="yellow"
                          onClick={() => handleOpenEdit(project.id)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="grape"
                          onClick={() => handleOpenProgress(project)}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="teal"
                          onClick={() => handleCalculateProfitability(project.id)}
                        >
                          <IconTrendingUp size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(project.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={<Text fw={500}>{editId ? 'Edit Project' : 'New Project'}</Text>}
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group>
              <TextInput
                label="Project Name"
                placeholder="Enter project name"
                required
                {...form.getInputProps('name')}
                style={{ flex: 2 }}
              />
              <TextInput
                label="Code"
                placeholder="PRJ-0001"
                {...form.getInputProps('code')}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label="Description"
              placeholder="Project description (optional)"
              {...form.getInputProps('description')}
            />

            <Group>
              <Select
                label="Customer"
                placeholder="Select customer"
                data={customers.map(cust => ({
                }))}
                {...form.getInputProps('customer_id')}
                style={{ flex: 1 }}
                clearable
                searchable
              />
              <Select
                label="Manager"
                placeholder="Select manager"
                data={managers.map(manager => ({
                }))}
                {...form.getInputProps('manager_id')}
                style={{ flex: 1 }}
                clearable
                searchable
              />
            </Group>

            <Group>
              <DateInput
                label="Start Date"
                required
                value={form.values.start_date}
                onChange={(value) => form.setFieldValue('start_date', value)}
                style={{ flex: 1 }}
              />
              <DateInput
                label="End Date"
                value={form.values.end_date}
                onChange={(value) => form.setFieldValue('end_date', value)}
                style={{ flex: 1 }}
              />
              <DateInput
                label="Deadline"
                value={form.values.deadline}
                onChange={(value) => form.setFieldValue('deadline', value)}
                style={{ flex: 1 }}
              />
            </Group>

            <Group>
              <TextInput
                label="Budget Amount"
                placeholder="0.00"
                required
                type="number"
                step="0.01"
                {...form.getInputProps('budget_amount')}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Estimated Revenue"
                placeholder="0.00"
                required
                type="number"
                step="0.01"
                {...form.getInputProps('estimated_revenue')}
                style={{ flex: 1 }}
              />
            </Group>

            <Group>
              <Select
                label="Department"
                placeholder="Select department"
                data={departments.map(dept => ({
                }))}
                {...form.getInputProps('department_id')}
                style={{ flex: 1 }}
                clearable
              />
              <Select
                label="Cost Center"
                placeholder="Select cost center"
                data={costCenters.map(cc => ({
                }))}
                {...form.getInputProps('cost_center_id')}
                style={{ flex: 1 }}
                clearable
              />
            </Group>

            <Group>
              <Select
                label="Status"
                required
                data={[
                ]}
                {...form.getInputProps('status')}
                style={{ flex: 1 }}
              />
              <Select
                label="Priority"
                required
                data={[
                ]}
                {...form.getInputProps('priority')}
                style={{ flex: 1 }}
              />
            </Group>

            <Group>
              <TextInput
                label="Progress (%)"
                type="number"
                min={0}
                max={100}
                {...form.getInputProps('progress_percentage')}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Location"
                placeholder="Project location"
                {...form.getInputProps('location')}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label="Notes"
              placeholder="Additional notes (optional)"
              {...form.getInputProps('notes')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Update' : 'Create'} Project</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={<Text fw={500}>Project Details</Text>}
        size="md"
      >
        {selectedProject && (
          <Stack>
            <Group>
              <div>
                <Text size="xs" c="dimmed">Code</Text>
                <Text fw={500}>{selectedProject.code}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Status</Text>
                <Badge color={selectedProject.status_badge}>{selectedProject.status_label}</Badge>
              </div>
              <div>
                <Text size="xs" c="dimmed">Priority</Text>
                {getPriorityBadge(selectedProject)}
              </div>
            </Group>

            <Text size="lg" fw={500}>{selectedProject.name}</Text>

            {selectedProject.description && (
              <>
                <Text size="xs" c="dimmed">Description</Text>
                <Text>{selectedProject.description}</Text>
              </>
            )}

            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Customer</Text>
                <Text>{selectedProject.customer?.name || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Manager</Text>
                <Text>{selectedProject.manager?.name || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Start Date</Text>
                <Text>{new Date(selectedProject.start_date).toLocaleDateString()}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Deadline</Text>
                <Text c={selectedProject.is_overdue ? 'red' : 'green'}>
                  {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : '-'}
                </Text>
              </Grid.Col>
            </Grid>

            <Paper withBorder p="md">
              <Grid>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Budget</Text>
                  <Text size="lg" fw={500} c="blue">
                    <NumberFormatter value={selectedProject.budget_amount} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Actual Cost</Text>
                  <Text size="lg" fw={500} c={selectedProject.is_over_budget ? 'red' : 'green'}>
                    <NumberFormatter value={selectedProject.actual_cost} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Profit</Text>
                  <Text size="lg" fw={500} c={selectedProject.profit >= 0 ? 'green' : 'red'}>
                    <NumberFormatter value={selectedProject.profit} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Progress
              value={selectedProject.progress_percentage}
              color={selectedProject.progress_percentage >= 100 ? 'green' : 'blue'}
              size="xl"
              label={`${selectedProject.progress_percentage}%`}
            />

            <Group justify="flex-end">
              <Button onClick={() => setViewModalOpened(false)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Update Progress Modal */}
      <Modal
        opened={progressModalOpened}
        onClose={() => setProgressModalOpened(false)}
        title={<Text fw={500}>Update Progress</Text>}
        size="sm"
      >
        {selectedProject && (
          <Stack>
            <Text size="sm">
              Update progress for <Text span fw={500}>{selectedProject.name}</Text> ({selectedProject.code})
            </Text>

            <Text size="sm" c="dimmed">Current Progress: {selectedProject.progress_percentage}%</Text>

            <TextInput
              label="Progress (%)"
              placeholder="0-100"
              required
              type="number"
              min={0}
              max={100}
              {...progressForm.getInputProps('progress_percentage')}
            />

            <Progress
              value={parseInt(progressForm.values.progress_percentage) || 0}
              color={parseInt(progressForm.values.progress_percentage) >= 100 ? 'green' : 'blue'}
              size="xl"
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setProgressModalOpened(false)}>Cancel</Button>
              <Button onClick={handleUpdateProgress}>Update Progress</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}
