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
  IconBuilding,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconWallet,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconX,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getCostCenters,
  getCostCenter,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  allocateCostCenterBudget,
  recalculateCostCenterBudget,
  getCostCenterStatistics,
  getNextCostCenterCode,
  getUsers,
  type CostCenter,
} from '@/utils/api'
// TODO: Implement getDepartments
// import { getDepartments } from '@/utils/api'
// import type { Department } from '@/utils/api'
import { useForm } from '@mantine/form'

export default function CostCentersPage() {
  const { t } = useTranslation()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [allocateModalOpened, setAllocateModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)
  const [nextCode, setNextCode] = useState<string>('')

  // Filters
  const [filters, setFilters] = useState({
  })

  // Form for create/edit
  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      manager_id: '',
      budget: '',
      status: 'active',
      description: '',
    },
    validate: {
      name: (value) => value.trim().length > 0 || 'Name is required',
      code: (value) => value.trim().length > 0 || 'Code is required',
    },
  })

  // Form for allocate budget
  const allocateForm = useForm({
    initialValues: {
      amount: '',
      notes: '',
    },
    validate: {
      amount: (value) => parseFloat(value) > 0 || 'Amount must be greater than 0',
    },
  })

  useEffect(() => {
    fetchCostCenters()
    // fetchDepartments() // TODO: Implement getDepartments API
    fetchManagers()
    fetchStatistics()
    fetchNextCode()
  }, [])

  const fetchCostCenters = async () => {
    setLoading(true)
    try {
      const response = await getCostCenters({
      })
      setCostCenters(response.data || [])
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  // TODO: Implement getDepartments API
  // const fetchDepartments = async () => {
  //   try {
  //     const response = await getDepartments()
  //     setDepartments(response.data || [])
  //   } catch (error: any) {
  //     console.error('Failed to fetch departments:', error)
  //   }
  // }

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
      const response = await getCostCenterStatistics()
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchNextCode = async () => {
    try {
      const response = await getNextCostCenterCode()
      setNextCode(response.data?.next_code || 'CC-001')
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
      const response = await getCostCenter(id)
      const costCenter = response.data

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
      const response = await getCostCenter(id)
      setSelectedCostCenter(response.data)
      setViewModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleOpenAllocate = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter)
    allocateForm.reset()
    setAllocateModalOpened(true)
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
      }

      if (editId) {
        await updateCostCenter(editId, payload)
        notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
        })
      } else {
        await createCostCenter(payload)
        notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
        })
      }

      setModalOpened(false)
      fetchCostCenters()
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

  const handleDelete = (costCenter: CostCenter) => {
    modals.openConfirmModal({
      title: 'Delete Cost Center',
      children: (
        <Text size="sm">Are you sure you want to delete this cost center? This action cannot be undone.</Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      onConfirm: async () => {
        try {
          await deleteCostCenter(costCenter.id)
          notifications.show({
            title: 'Success',
            message: 'Cost center deleted successfully',
            color: 'green',
          })
          fetchCostCenters()
          fetchStatistics()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.message || 'Failed to delete cost center',
            color: 'red',
          })
        }
      },
    })
  }

  const handleAllocateBudget = async () => {
    if (!selectedCostCenter) return

    try {
      await allocateCostCenterBudget(selectedCostCenter.id, {
      })
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
      setAllocateModalOpened(false)
      fetchCostCenters()
      fetchStatistics()
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  const handleRecalculateBudget = async (id: number) => {
    try {
      await recalculateCostCenterBudget(id)
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
      fetchCostCenters()
      fetchStatistics()
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: "An error occurred",
        color: "red",
      })
    }
  }

  return (
    <>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconBuilding size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>Cost Centers</Text>
              <Text size="sm" c="dimmed">Manage departmental cost centers and budgets</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            New Cost Center
          </Button>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Cost Centers</Text>
                <Text size="xl" fw={500}>{statistics.total_cost_centers}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Active</Text>
                <Text size="xl" fw={500} c="green">{statistics.active_cost_centers}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Over Budget</Text>
                <Text size="xl" fw={500} c="red">{statistics.over_budget_count}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Budget</Text>
                <Text size="xl" fw={500}>
                  <NumberFormatter value={statistics.total_monthly_budget} decimalScale={2} thousandSeparator prefix="BDT " />
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                placeholder="Search cost centers..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
              <Select
                placeholder="Manager"
                clearable
                data={managers.map(manager => ({
                }))}
                value={filters.manager_id}
                onChange={(value) => setFilters({ ...filters, manager_id: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder="Status"
                data={[
                ]}
                value={filters.is_active}
                onChange={(value) => setFilters({ ...filters, is_active: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Group>
                <Button variant="light" onClick={fetchCostCenters} loading={loading}>
                  <IconFilter size={16} />
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setFilters({ department_id: '', manager_id: '', is_active: '', search: '' })}
                >
                  <IconX size={16} />
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Alert for over budget */}
        {costCenters.filter(cc => cc.is_over_budget).length > 0 && (
          <Alert icon={<IconAlertTriangle size={16} />} color="red">
            {costCenters.filter(cc => cc.is_over_budget).length} cost center(s) are over budget
          </Alert>
        )}

        {/* Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Manager</Table.Th>
                <Table.Th>Budget</Table.Th>
                <Table.Th>Spent</Table.Th>
                <Table.Th>Remaining</Table.Th>
                <Table.Th>Utilization</Table.Th>
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
              ) : costCenters.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={10} ta="center">
                    <Text c="dimmed">No cost centers found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                costCenters.map((cc) => (
                  <Table.Tr key={cc.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">{cc.code}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{cc.name}</Text>
                      {cc.location && (
                        <Text size="xs" c="dimmed">{cc.location}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{cc.department?.name || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{cc.manager?.name || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        <NumberFormatter value={cc.monthly_budget} decimalScale={2} thousandSeparator prefix="BDT " />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={cc.is_over_budget ? 'red' : 'green'}>
                        <NumberFormatter value={cc.actual_spent} decimalScale={2} thousandSeparator prefix="BDT " />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={cc.remaining_budget >= 0 ? 'green' : 'red'}>
                        <NumberFormatter value={cc.remaining_budget} decimalScale={2} thousandSeparator prefix="BDT " />
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Progress
                        value={Math.min(cc.budget_utilization || 0, 100)}
                        color={cc.is_over_budget ? 'red' : cc.is_approaching_limit ? 'orange' : 'green'}
                        size="md"
                        style={{ width: 100 }}
                      />
                      <Text size="xs" c="dimmed">{cc.budget_utilization?.toFixed(1)}%</Text>
                    </Table.Td>
                    <Table.Td>
                      {cc.is_active ? (
                        <Badge color="green">Active</Badge>
                      ) : (
                        <Badge color="gray">Inactive</Badge>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => handleOpenView(cc.id)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="yellow"
                          onClick={() => handleOpenEdit(cc.id)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="green"
                          onClick={() => handleOpenAllocate(cc)}
                        >
                          <IconWallet size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="grape"
                          onClick={() => handleRecalculateBudget(cc.id)}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(cc.id)}
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
        title={<Text fw={500}>{editId ? 'Edit Cost Center' : 'New Cost Center'}</Text>}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group>
              <TextInput
                label="Cost Center Name"
                placeholder="Enter name"
                required
                {...form.getInputProps('name')}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Code"
                placeholder="CC-001"
                {...form.getInputProps('code')}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label="Description"
              placeholder="Description (optional)"
              {...form.getInputProps('description')}
            />

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
                label="Manager"
                placeholder="Select manager"
                data={managers.map(manager => ({
                }))}
                {...form.getInputProps('manager_id')}
                style={{ flex: 1 }}
                clearable
              />
            </Group>

            <Group>
              <TextInput
                label="Monthly Budget"
                placeholder="0.00"
                required
                type="number"
                step="0.01"
                {...form.getInputProps('monthly_budget')}
                style={{ flex: 1 }}
              />
              <TextInput
                label="Location"
                placeholder="Physical location"
                {...form.getInputProps('location')}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label="Notes"
              placeholder="Additional notes (optional)"
              {...form.getInputProps('notes')}
            />

            <Group>
              <Text>Status:</Text>
              <Badge onClick={() => form.setFieldValue('is_active', !form.values.is_active)}
                style={{ cursor: 'pointer' }}>
                {form.values.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Group>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Update' : 'Create'} Cost Center</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={<Text fw={500}>Cost Center Details</Text>}
        size="md"
      >
        {selectedCostCenter && (
          <Stack>
            <Group>
              <div>
                <Text size="xs" c="dimmed">Code</Text>
                <Text fw={500}>{selectedCostCenter.code}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Status</Text>
                {selectedCostCenter.is_active ? (
                  <Badge color="green">Active</Badge>
                ) : (
                  <Badge color="gray">Inactive</Badge>
                )}
              </div>
            </Group>

            <Text size="lg" fw={500}>{selectedCostCenter.name}</Text>

            {selectedCostCenter.description && (
              <>
                <Text size="xs" c="dimmed">Description</Text>
                <Text>{selectedCostCenter.description}</Text>
              </>
            )}

            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Department</Text>
                <Text>{selectedCostCenter.department?.name || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Manager</Text>
                <Text>{selectedCostCenter.manager?.name || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Location</Text>
                <Text>{selectedCostCenter.location || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Budget Utilization</Text>
                <Text>{selectedCostCenter.budget_utilization?.toFixed(1)}%</Text>
              </Grid.Col>
            </Grid>

            <Paper withBorder p="md">
              <Grid>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Monthly Budget</Text>
                  <Text size="lg" fw={500} c="blue">
                    <NumberFormatter value={selectedCostCenter.monthly_budget} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Actual Spent</Text>
                  <Text size="lg" fw={500} c="red">
                    <NumberFormatter value={selectedCostCenter.actual_spent} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Text size="xs" c="dimmed">Remaining</Text>
                  <Text size="lg" fw={500} c={selectedCostCenter.remaining_budget >= 0 ? 'green' : 'red'}>
                    <NumberFormatter value={selectedCostCenter.remaining_budget} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            <Progress
              value={Math.min(selectedCostCenter.budget_utilization || 0, 100)}
              color={selectedCostCenter.is_over_budget ? 'red' : selectedCostCenter.is_approaching_limit ? 'orange' : 'green'}
              size="xl"
              label={`${selectedCostCenter.budget_utilization?.toFixed(1)}%`}
            />

            {selectedCostCenter.notes && (
              <>
                <Text size="xs" c="dimmed">Notes</Text>
                <Text>{selectedCostCenter.notes}</Text>
              </>
            )}

            <Group justify="flex-end">
              <Button onClick={() => setViewModalOpened(false)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Allocate Budget Modal */}
      <Modal
        opened={allocateModalOpened}
        onClose={() => setAllocateModalOpened(false)}
        title={<Text fw={500}>Allocate Budget</Text>}
        size="sm"
      >
        {selectedCostCenter && (
          <Stack>
            <Text size="sm">
              Allocate additional budget to <Text span fw={500}>{selectedCostCenter.name}</Text> ({selectedCostCenter.code})
            </Text>

            <Text size="sm" c="dimmed">Current Budget: {
              <NumberFormatter value={selectedCostCenter.monthly_budget} decimalScale={2} thousandSeparator prefix="BDT " />
            }</Text>

            <TextInput
              label="Amount to Allocate"
              placeholder="0.00"
              required
              type="number"
              step="0.01"
              {...allocateForm.getInputProps('amount')}
            />

            <TextInput
              label="Notes (optional)"
              placeholder="Reason for allocation..."
              {...allocateForm.getInputProps('notes')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setAllocateModalOpened(false)}>Cancel</Button>
              <Button
                leftSection={<IconWallet size={16} />}
                onClick={handleAllocateBudget}
              >
                Allocate Budget
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}
