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
  IconCalendar,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconLock,
  IconLockOpen,
  IconSearch,
  IconFilter,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getFiscalYears,
  getFiscalYear,
  createFiscalYear,
  updateFiscalYear,
  deleteFiscalYear,
  closeFiscalYear,
  reopenFiscalYear,
  getFiscalYearSummary,
  getFiscalYearStatistics,
  getCurrentFiscalYear,
  type FiscalYear,
} from '@/utils/api'
import { useForm } from '@mantine/form'
import { DateInput } from '@mantine/dates'

export default function FiscalYearsPage() {
  const { t } = useTranslation()
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [currentFiscalYear, setCurrentFiscalYear] = useState<FiscalYear | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [summaryModalOpened, setSummaryModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)

  // Filters
  const [filters, setFilters] = useState({
    is_active: '',
    is_closed: '',
    search: '',
  })

  // Form for create/edit
  const form = useForm({
    initialValues: {
      name: '',
      start_date: null as Date | null,
      end_date: null as Date | null,
      is_active: true,
      notes: '',
    },
    validate: {
      name: (val: string) => (val ? null : 'Fiscal year name is required'),
      start_date: (val: Date | null) => (val ? null : 'Start date is required'),
      end_date: (val: Date | null) => (val ? null : 'End date is required'),
    },
  })

  useEffect(() => {
    fetchFiscalYears()
    fetchStatistics()
    fetchCurrentFiscalYear()
  }, [])

  const fetchFiscalYears = async () => {
    setLoading(true)
    try {
      const response = await getFiscalYears({
        is_active: filters.is_active === '' ? undefined : filters.is_active === 'true',
        is_closed: filters.is_closed === '' ? undefined : filters.is_closed === 'true',
        search: filters.search || undefined,
      })
      setFiscalYears(response.data || [])
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch fiscal years',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await getFiscalYearStatistics()
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchCurrentFiscalYear = async () => {
    try {
      const response = await getCurrentFiscalYear()
      if (response.data) {
        setCurrentFiscalYear(response.data)
      }
    } catch (error: any) {
      console.error('Failed to fetch current fiscal year:', error)
    }
  }

  const handleOpenCreate = () => {
    setEditId(null)
    form.reset()
    form.setValues({
      name: '',
      start_date: new Date(),
      end_date: new Date(new Date().getFullYear() + 1, 11, 31),
      is_active: true,
      notes: '',
    })
    setModalOpened(true)
  }

  const handleOpenEdit = async (id: number) => {
    try {
      const response = await getFiscalYear(id)
      const fiscalYear = response.data

      setEditId(id)
      form.setValues({
        name: fiscalYear.name,
        start_date: new Date(fiscalYear.start_date),
        end_date: new Date(fiscalYear.end_date),
        is_active: fiscalYear.is_active,
        notes: fiscalYear.notes || '',
      })
      setModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load fiscal year',
        color: 'red',
      })
    }
  }

  const handleOpenView = async (id: number) => {
    try {
      const response = await getFiscalYear(id)
      setSelectedFiscalYear(response.data)
      setViewModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load fiscal year',
        color: 'red',
      })
    }
  }

  const handleOpenSummary = async (fiscalYear: FiscalYear) => {
    try {
      const response = await getFiscalYearSummary(fiscalYear.id)
      setSelectedFiscalYear(fiscalYear)
      setSummaryData(response.data)
      setSummaryModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load fiscal year summary',
        color: 'red',
      })
    }
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        start_date: values.start_date?.toISOString().split('T')[0],
        end_date: values.end_date?.toISOString().split('T')[0],
        is_active: values.is_active,
        notes: values.notes || null,
      }

      if (editId) {
        await updateFiscalYear(editId, payload)
        notifications.show({
          title: 'Success',
          message: 'Fiscal year updated successfully',
          color: 'green',
        })
      } else {
        await createFiscalYear(payload)
        notifications.show({
          title: 'Success',
          message: 'Fiscal year created successfully',
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchFiscalYears()
      fetchStatistics()
      fetchCurrentFiscalYear()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save fiscal year',
        color: 'red',
      })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: 'Delete Fiscal Year',
      children: (
        <Text size="sm">Are you sure you want to delete this fiscal year? This action cannot be undone.</Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteFiscalYear(id)
          notifications.show({
            title: 'Success',
            message: 'Fiscal year deleted successfully',
            color: 'green',
          })
          fetchFiscalYears()
          fetchStatistics()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.response?.data?.message || 'Failed to delete fiscal year',
            color: 'red',
          })
        }
      },
    })
  }

  const handleClose = (id: number) => {
    modals.openConfirmModal({
      title: 'Close Fiscal Year',
      children: (
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to close this fiscal year? This will prevent any modifications to financial data within this period.
          </Text>
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">This action cannot be easily undone. Reopening requires special permissions.</Text>
          </Alert>
        </Stack>
      ),
      labels: { confirm: 'Close', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await closeFiscalYear(id)
          notifications.show({
            title: 'Success',
            message: 'Fiscal year closed successfully',
            color: 'green',
          })
          fetchFiscalYears()
          fetchStatistics()
          fetchCurrentFiscalYear()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.response?.data?.message || 'Failed to close fiscal year',
            color: 'red',
          })
        }
      },
    })
  }

  const handleReopen = (id: number) => {
    modals.openConfirmModal({
      title: 'Reopen Fiscal Year',
      children: (
        <Text size="sm">
          Reopening a closed fiscal year will allow modifications to financial data within this period. This action should be performed with caution.
        </Text>
      ),
      labels: { confirm: 'Reopen', cancel: 'Cancel' },
      confirmProps: { color: 'orange' },
      onConfirm: async () => {
        try {
          await reopenFiscalYear(id)
          notifications.show({
            title: 'Success',
            message: 'Fiscal year reopened successfully',
            color: 'green',
          })
          fetchFiscalYears()
          fetchStatistics()
          fetchCurrentFiscalYear()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.response?.data?.message || 'Failed to reopen fiscal year',
            color: 'red',
          })
        }
      },
    })
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} days`
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'Ended'
    if (days === 0) return 'Ends today'
    return `${days} days left`
  }

  return (
    <>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconCalendar size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>Fiscal Years</Text>
              <Text size="sm" c="dimmed">Manage fiscal periods and financial year closing</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            New Fiscal Year
          </Button>
        </Group>

        {/* Current Fiscal Year Alert */}
        {currentFiscalYear && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            <Text size="sm">
              Current Fiscal Year: <Text span fw={500}>{currentFiscalYear.name}</Text> ({new Date(currentFiscalYear.start_date).toLocaleDateString()} - {new Date(currentFiscalYear.end_date).toLocaleDateString()})
            </Text>
          </Alert>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Fiscal Years</Text>
                <Text size="xl" fw={500}>{statistics.total_fiscal_years}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Active</Text>
                <Text size="xl" fw={500} c="green">{statistics.active_fiscal_years}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Closed</Text>
                <Text size="xl" fw={500} c="red">{statistics.closed_fiscal_years}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Open</Text>
                <Text size="xl" fw={500} c="blue">{statistics.open_fiscal_years}</Text>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Group>
            <TextInput
              placeholder="Search fiscal years..."
              leftSection={<IconSearch size={16} />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Status"
              data={[
                { value: '', label: 'All' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              value={filters.is_active}
              onChange={(value) => setFilters({ ...filters, is_active: value || '' })}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="State"
              data={[
                { value: '', label: 'All' },
                { value: 'false', label: 'Open' },
                { value: 'true', label: 'Closed' },
              ]}
              value={filters.is_closed}
              onChange={(value) => setFilters({ ...filters, is_closed: value || '' })}
              style={{ flex: 1 }}
            />
            <Button variant="light" onClick={fetchFiscalYears} loading={loading}>
              <IconFilter size={16} />
            </Button>
            <Button
              variant="subtle"
              onClick={() => setFilters({ is_active: '', is_closed: '', search: '' })}
            >
              <IconX size={16} />
            </Button>
          </Group>
        </Paper>

        {/* Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Time Remaining</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : fiscalYears.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center">
                    <Text c="dimmed">No fiscal years found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                fiscalYears.map((fy) => (
                  <Table.Tr key={fy.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">{fy.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(fy.start_date).toLocaleDateString()} - {new Date(fy.end_date).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{calculateDuration(fy.start_date, fy.end_date)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={!fy.is_closed && new Date(fy.end_date) < new Date() ? 'green' : 'dimmed'}>
                        {getDaysRemaining(fy.end_date)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {fy.is_closed ? (
                        <Badge color="red" leftSection={<IconLock size={12} />}>Closed</Badge>
                      ) : fy.is_active ? (
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
                          onClick={() => handleOpenView(fy.id)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="grape"
                          onClick={() => handleOpenSummary(fy)}
                        >
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                        {!fy.is_closed && (
                          <>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="yellow"
                              onClick={() => handleOpenEdit(fy.id)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="orange"
                              onClick={() => handleClose(fy.id)}
                            >
                              <IconLock size={16} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleDelete(fy.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </>
                        )}
                        {fy.is_closed && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="lime"
                            onClick={() => handleReopen(fy.id)}
                          >
                            <IconLockOpen size={16} />
                          </ActionIcon>
                        )}
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
        title={<Text fw={500}>{editId ? 'Edit Fiscal Year' : 'New Fiscal Year'}</Text>}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Fiscal Year Name"
              placeholder="e.g., FY 2024-2025"
              required
              {...form.getInputProps('name')}
            />

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
                required
                value={form.values.end_date}
                onChange={(value) => form.setFieldValue('end_date', value)}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label="Notes (optional)"
              placeholder="Additional notes..."
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
              <Button type="submit">{editId ? 'Update' : 'Create'} Fiscal Year</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={<Text fw={500}>Fiscal Year Details</Text>}
        size="md"
      >
        {selectedFiscalYear && (
          <Stack>
            <Group>
              <div>
                <Text size="xs" c="dimmed">Name</Text>
                <Text fw={500} size="lg">{selectedFiscalYear.name}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Status</Text>
                {selectedFiscalYear.is_closed ? (
                  <Badge color="red" leftSection={<IconLock size={12} />}>Closed</Badge>
                ) : selectedFiscalYear.is_active ? (
                  <Badge color="green">Active</Badge>
                ) : (
                  <Badge color="gray">Inactive</Badge>
                )}
              </div>
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Start Date</Text>
                <Text>{new Date(selectedFiscalYear.start_date).toLocaleDateString()}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">End Date</Text>
                <Text>{new Date(selectedFiscalYear.end_date).toLocaleDateString()}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Duration</Text>
                <Text>{calculateDuration(selectedFiscalYear.start_date, selectedFiscalYear.end_date)}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">Time Remaining</Text>
                <Text>{getDaysRemaining(selectedFiscalYear.end_date)}</Text>
              </Grid.Col>
            </Grid>

            {selectedFiscalYear.closed_at && (
              <>
                <Text size="xs" c="dimmed">Closed At</Text>
                <Text>{new Date(selectedFiscalYear.closed_at).toLocaleString()}</Text>
              </>
            )}

            {selectedFiscalYear.notes && (
              <>
                <Text size="xs" c="dimmed">Notes</Text>
                <Text>{selectedFiscalYear.notes}</Text>
              </>
            )}

            <Group justify="flex-end">
              <Button onClick={() => setViewModalOpened(false)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Summary Modal */}
      <Modal
        opened={summaryModalOpened}
        onClose={() => setSummaryModalOpened(false)}
        title={<Text fw={500}>Fiscal Year Summary</Text>}
        size="lg"
      >
        {selectedFiscalYear && summaryData && (
          <Stack>
            <Text size="sm" c="dimmed">Financial summary for <Text span fw={500}>{selectedFiscalYear.name}</Text></Text>

            <Grid>
              <Grid.Col span={6}>
                <Card padding="md" withBorder>
                  <Text size="xs" c="dimmed">Journal Entries</Text>
                  <Text size="xl" fw={500}>{summaryData.journal_entries_count}</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="md" withBorder>
                  <Text size="xs" c="dimmed">Expenses</Text>
                  <Text size="xl" fw={500}>{summaryData.expenses_count}</Text>
                </Card>
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={4}>
                <Card padding="md" withBorder>
                  <Text size="xs" c="dimmed">Total Debit</Text>
                  <Text size="lg" fw={500} c="green">
                    <NumberFormatter value={summaryData.total_debit} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card padding="md" withBorder>
                  <Text size="xs" c="dimmed">Total Credit</Text>
                  <Text size="lg" fw={500} c="red">
                    <NumberFormatter value={summaryData.total_credit} decimalScale={2} thousandSeparator prefix="BDT " />
                  </Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card padding="md" withBorder>
                  <Text size="xs" c="dimmed">Balanced</Text>
                  <Text size="lg" fw={500} c={summaryData.is_balanced ? 'green' : 'red'}>
                    {summaryData.is_balanced ? 'Yes' : 'No'}
                  </Text>
                </Card>
              </Grid.Col>
            </Grid>

            <Card padding="md" withBorder>
              <Text size="xs" c="dimmed">Total Expenses</Text>
              <Text size="lg" fw={500} c="red">
                <NumberFormatter value={summaryData.total_expenses} decimalScale={2} thousandSeparator prefix="BDT " />
              </Text>
            </Card>

            <Grid>
              <Grid.Col span={4}>
                <Text size="xs" c="dimmed">Period Duration</Text>
                <Text>{summaryData.period_days} days</Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="xs" c="dimmed">Days Elapsed</Text>
                <Text>{summaryData.days_elapsed} days</Text>
              </Grid.Col>
              <Grid.Col span={4}>
                <Text size="xs" c="dimmed">Completion</Text>
                <Progress value={summaryData.completion_percentage} size="xl" />
                <Text size="xs" ta="center">{summaryData.completion_percentage}%</Text>
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button onClick={() => setSummaryModalOpened(false)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}
