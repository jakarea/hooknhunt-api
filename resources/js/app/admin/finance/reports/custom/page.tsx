import { useEffect, useState } from 'react'
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Table,
  Badge,
  ActionIcon,
  TextInput,
  Select,
  Modal,
  Grid,
  Card,
  Switch,
  Progress,
  Box,
} from '@mantine/core'
import {
  IconFileAnalytics,
  IconPlus,
  IconPencil,
  IconTrash,
  IconPlayerPlay,
  IconDownload,
  IconRefresh,
  IconChartBar,
  IconChartPie,
  IconTrendingUp,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getFinancialReports,
  getFinancialReport,
  createFinancialReport,
  updateFinancialReport,
  deleteFinancialReport,
  generateFinancialReport,
  exportFinancialReport,
  getFinancialReportStatistics,
  getReportTemplates,
  type FinancialReport,
  type ReportTemplate,
} from '@/utils/api'
import { useForm } from '@mantine/form'
import { DateInput } from '@mantine/dates'

export default function CustomReportsPage() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  // Form for create/edit
  const form = useForm({
    initialValues: {
      name: '',
      type: 'custom' as 'comparative' | 'ratio' | 'cash_flow' | 'fund_flow' | 'custom',
      description: '',
      start_date: null as Date | null,
      end_date: null as Date | null,
      compare_start_date: null as Date | null,
      compare_end_date: null as Date | null,
      period_type: '',
      is_scheduled: false,
      schedule_frequency: '' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | '',
      export_format: 'pdf' as 'pdf' | 'excel' | 'csv',
    },
    validate: {
      name: (val: string) => (val ? null : 'Report name is required'),
      type: (val: string) => (val ? null : 'Report type is required'),
      start_date: (val: Date | null) => (val ? null : 'Start date is required'),
      end_date: (val: Date | null) => (val ? null : 'End date is required'),
    },
  })

  useEffect(() => {
    fetchReports()
    fetchTemplates()
    fetchStatistics()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const response = await getFinancialReports()
      const reportsData = Array.isArray(response) ? response : (response.data?.data || response.data || [])
      setReports(reportsData)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch reports',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await getReportTemplates()
      setTemplates(response || [])
    } catch (error: any) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await getFinancialReportStatistics()
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const handleOpenCreate = () => {
    setEditId(null)
    form.reset()
    form.setValues({
      name: '',
      type: 'custom',
      description: '',
      start_date: null,
      end_date: null,
      compare_start_date: null,
      compare_end_date: null,
      period_type: '',
      is_scheduled: false,
      schedule_frequency: '',
      export_format: 'pdf',
    })
    setModalOpened(true)
  }

  const handleOpenEdit = async (id: number) => {
    try {
      const response = await getFinancialReport(id)
      const report = response.data

      setEditId(id)
      form.setValues({
        name: report.name,
        type: report.type,
        description: report.description || '',
        start_date: new Date(report.startDate),
        end_date: new Date(report.endDate),
        compare_start_date: report.compareStartDate ? new Date(report.compareStartDate) : null,
        compare_end_date: report.compareEndDate ? new Date(report.compareEndDate) : null,
        period_type: report.periodType || '',
        is_scheduled: report.isScheduled,
        schedule_frequency: report.scheduleFrequency || '',
        export_format: report.exportFormat,
      })
      setModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load report',
        color: 'red',
      })
    }
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        name: values.name,
        type: values.type,
        description: values.description || null,
        start_date: values.start_date?.toISOString().split('T')[0],
        end_date: values.end_date?.toISOString().split('T')[0],
        compare_start_date: values.compare_start_date?.toISOString().split('T')[0] || null,
        compare_end_date: values.compare_end_date?.toISOString().split('T')[0] || null,
        period_type: values.period_type || null,
        is_scheduled: values.is_scheduled,
        schedule_frequency: values.schedule_frequency || null,
        export_format: values.export_format,
      }

      if (editId) {
        await updateFinancialReport(editId, payload)
        notifications.show({
          title: 'Success',
          message: 'Report updated successfully',
          color: 'green',
        })
      } else {
        await createFinancialReport(payload)
        notifications.show({
          title: 'Success',
          message: 'Report created successfully',
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchReports()
      fetchStatistics()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save report',
        color: 'red',
      })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: 'Delete Report',
      children: (
        <Text size="sm">Are you sure you want to delete this report? This action cannot be undone.</Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteFinancialReport(id)
          notifications.show({
            title: 'Success',
            message: 'Report deleted successfully',
            color: 'green',
          })
          fetchReports()
          fetchStatistics()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.response?.data?.message || 'Failed to delete report',
            color: 'red',
          })
        }
      },
    })
  }

  const handleGenerate = async (id: number) => {
    try {
      await generateFinancialReport(id)
      notifications.show({
        title: 'Success',
        message: 'Report generation started',
        color: 'green',
      })
      fetchReports()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to generate report',
        color: 'red',
      })
    }
  }

  const handleExport = async (id: number) => {
    try {
      await exportFinancialReport(id)
      notifications.show({
        title: 'Success',
        message: 'Report exported successfully',
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to export report',
        color: 'red',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'gray',
      generating: 'blue',
      completed: 'green',
      failed: 'red',
    }
    return <Badge color={colors[status] || 'gray'}>{status}</Badge>
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      comparative: IconChartBar,
      ratio: IconTrendingUp,
      cash_flow: IconChartPie,
      fund_flow: IconRefresh,
      custom: IconFileAnalytics,
    }
    return icons[type] || IconFileAnalytics
  }

  const reportTypeLabels: Record<string, string> = {
    comparative: 'Comparative',
    ratio: 'Ratio Analysis',
    cash_flow: 'Cash Flow',
    fund_flow: 'Fund Flow',
    custom: 'Custom',
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconFileAnalytics size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>Advanced Financial Reports</Text>
              <Text size="sm" c="dimmed">Create and manage custom financial reports</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            New Report
          </Button>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 2.4 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Total Reports</Text>
                <Text size="xl" fw={500}>{statistics.total_reports}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2.4 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Completed</Text>
                <Text size="xl" fw={500} c="green">{statistics.completed_reports}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2.4 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Pending</Text>
                <Text size="xl" fw={500} c="gray">{statistics.pending_reports}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2.4 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Failed</Text>
                <Text size="xl" fw={500} c="red">{statistics.failed_reports}</Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2.4 }}>
              <Card padding="md" withBorder>
                <Text size="sm" c="dimmed">Scheduled</Text>
                <Text size="xl" fw={500} c="blue">{statistics.scheduled_reports}</Text>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Report Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Scheduled</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center">
                    <Text c="dimmed">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : reports.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} ta="center">
                    <Text c="dimmed">No reports found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                reports.map((report) => {
                  const TypeIcon = getTypeIcon(report.type)
                  return (
                    <Table.Tr key={report.id}>
                      <Table.Td>
                        <Text fw={500} size="sm">{report.name}</Text>
                        {report.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>{report.description}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <TypeIcon size={16} />
                          <Text size="sm">{reportTypeLabels[report.type]}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{new Date(report.startDate).toLocaleDateString()}</Text>
                        <Text size="xs" c="dimmed">to {new Date(report.endDate).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>{getStatusBadge(report.status)}</Table.Td>
                      <Table.Td>
                        {report.isScheduled ? (
                          <Badge size="sm" color="blue">{report.scheduleFrequency}</Badge>
                        ) : (
                          <Text size="sm" c="dimmed">No</Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">
                        <Group gap="xs" justify="flex-end">
                          {report.status === 'pending' && (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="green"
                              onClick={() => handleGenerate(report.id)}
                              title="Generate Report"
                            >
                              <IconPlayerPlay size={16} />
                            </ActionIcon>
                          )}
                          {report.status === 'completed' && (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="blue"
                              onClick={() => handleExport(report.id)}
                              title="Export Report"
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="yellow"
                            onClick={() => handleOpenEdit(report.id)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(report.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={<Text fw={500}>{editId ? 'Edit Report' : 'New Report'}</Text>}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Report Name"
              placeholder="Enter report name"
              required
              {...form.getInputProps('name')}
            />

            <Select
              label="Report Type"
              required
              data={[
                { value: 'comparative', label: 'Comparative Analysis' },
                { value: 'ratio', label: 'Ratio Analysis' },
                { value: 'cash_flow', label: 'Cash Flow Statement' },
                { value: 'fund_flow', label: 'Fund Flow Statement' },
                { value: 'custom', label: 'Custom Report' },
              ]}
              {...form.getInputProps('type')}
            />

            <TextInput
              label="Description"
              placeholder="Report description (optional)"
              {...form.getInputProps('description')}
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

            <Group>
              <DateInput
                label="Compare Start Date (Optional)"
                value={form.values.compare_start_date}
                onChange={(value) => form.setFieldValue('compare_start_date', value)}
                style={{ flex: 1 }}
              />
              <DateInput
                label="Compare End Date (Optional)"
                value={form.values.compare_end_date}
                onChange={(value) => form.setFieldValue('compare_end_date', value)}
                style={{ flex: 1 }}
              />
            </Group>

            <Select
              label="Period Type"
              placeholder="Select period type"
              data={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'custom', label: 'Custom' },
              ]}
              {...form.getInputProps('period_type')}
            />

            <Switch
              label="Schedule this report"
              checked={form.values.is_scheduled}
              onChange={(e) => form.setFieldValue('is_scheduled', e.currentTarget.checked)}
            />

            {form.values.is_scheduled && (
              <Select
                label="Schedule Frequency"
                required
                data={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                ]}
                {...form.getInputProps('schedule_frequency')}
              />
            )}

            <Select
              label="Export Format"
              required
              data={[
                { value: 'pdf', label: 'PDF' },
                { value: 'excel', label: 'Excel' },
                { value: 'csv', label: 'CSV' },
              ]}
              {...form.getInputProps('export_format')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Update' : 'Create'} Report</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  )
}
