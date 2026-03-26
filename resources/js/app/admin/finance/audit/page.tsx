import { useEffect, useState } from 'react'
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Table,
  Badge,
  TextInput,
  Select,
  Grid,
  Card,
  ScrollArea,
  JsonInput,
  Modal,
  Box,
} from '@mantine/core'
import {
  IconHistory,
  IconSearch,
  IconFilter,
  IconX,
  IconEye,
  IconUsers,
  IconRefresh,
  IconClock,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getAuditLogs,
  getAuditLog,
  getAuditStatistics,
  type AuditLog,
} from '@/utils/api'
import { DateInput } from '@mantine/dates'
import {
  IconFileDescription,
  IconPlus,
  IconCheck,
  IconArrowRight,
  IconX as IconTablerX,
  IconEye as IconTablerEye,
} from '@tabler/icons-react'

export default function FinanceAuditPage() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [viewModalOpened, setViewModalOpened] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    user_id: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    search: '',
  })

  const actionOptions = [
    { value: '', label: t('finance.auditPage.actions.all') },
    { value: 'created', label: t('finance.auditPage.actions.created') },
    { value: 'updated', label: t('finance.auditPage.actions.updated') },
    { value: 'deleted', label: t('finance.auditPage.actions.deleted') },
    { value: 'approved', label: t('finance.auditPage.actions.approved') },
    { value: 'rejected', label: t('finance.auditPage.actions.rejected') },
    { value: 'reconciled', label: t('finance.auditPage.actions.reconciled') },
  ]

  const entityTypeOptions = [
    { value: '', label: t('finance.auditPage.entities.all') },
    { value: 'Bank', label: t('finance.auditPage.entities.bank') },
    { value: 'Expense', label: t('finance.auditPage.entities.expense') },
    { value: 'Revenue', label: t('finance.auditPage.entities.revenue') },
    { value: 'Budget', label: t('finance.auditPage.entities.budget') },
    { value: 'Transaction', label: t('finance.auditPage.entities.transaction') },
    { value: 'JournalEntry', label: t('finance.auditPage.entities.journalEntry') },
    { value: 'FixedAsset', label: t('finance.auditPage.entities.fixedAsset') },
    { value: 'Cheque', label: t('finance.auditPage.entities.cheque') },
    { value: 'Currency', label: t('finance.auditPage.entities.currency') },
  ]

  useEffect(() => {
    fetchLogs()
    fetchStatistics()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await getAuditLogs({
        entity_type: filters.entity_type || undefined,
        action: filters.action || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        start_date: filters.start_date?.toISOString().split('T')[0],
        end_date: filters.end_date?.toISOString().split('T')[0],
        search: filters.search || undefined,
      })
      const logsData = Array.isArray(response) ? response : (response.data?.data || response.data || [])
      setLogs(logsData)
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || t('finance.auditPage.notification.fetchError'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await getAuditStatistics({
        start_date: filters.start_date?.toISOString().split('T')[0],
        end_date: filters.end_date?.toISOString().split('T')[0],
      })
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const handleView = async (id: number) => {
    try {
      const response = await getAuditLog(id)
      setSelectedLog(response.data)
      setViewModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('finance.auditPage.notification.loadError'),
        color: 'red',
      })
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      created: 'green',
      updated: 'blue',
      deleted: 'red',
      approved: 'teal',
      rejected: 'orange',
      reconciled: 'cyan',
    }
    return <Badge color={colors[action] || 'gray'}>{action}</Badge>
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      created: IconPlus,
      updated: IconRefresh,
      deleted: IconTablerX,
      approved: IconTablerEye,
      rejected: IconTablerX,
      reconciled: IconCheck,
    }
    return icons[action] || IconFileDescription
  }

  const formatChanges = (oldValues: Record<string, any> | null | undefined, newValues: Record<string, any> | null | undefined) => {
    if (!oldValues && !newValues) return null

    const changes: { field: string; oldValue: any; newValue: any }[] = []

    if (oldValues && newValues) {
      Object.keys({ ...oldValues, ...newValues }).forEach(key => {
        if (oldValues[key] !== newValues[key]) {
          changes.push({
            field: key,
            oldValue: oldValues[key],
            newValue: newValues[key],
          })
        }
      })
    }

    if (changes.length === 0) return null

    return changes
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconHistory size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>{t('finance.auditPage.title')}</Text>
              <Text size="sm" c="dimmed">{t('finance.auditPage.subtitle')}</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconRefresh size={16} />} onClick={fetchLogs}>
            {t('finance.auditPage.refresh')}
          </Button>
        </Group>

        {/* Statistics Cards */}
        {statistics && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Group>
                  <IconClock size={24} c="blue" />
                  <div>
                    <Text size="xs" c="dimmed">{t('finance.auditPage.statistics.totalLogs')}</Text>
                    <Text size="xl" fw={500}>{statistics.total_logs}</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Group>
                  <IconUsers size={24} c="green" />
                  <div>
                    <Text size="xs" c="dimmed">{t('finance.auditPage.statistics.actions')}</Text>
                    <Text size="xl" fw={500}>{Object.keys(statistics.by_action || {}).length}</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Group>
                  <IconFileDescription size={24} c="orange" />
                  <div>
                    <Text size="xs" c="dimmed">{t('finance.auditPage.statistics.entityTypes')}</Text>
                    <Text size="xl" fw={500}>{Object.keys(statistics.by_entity_type || {}).length}</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Card padding="md" withBorder>
                <Group>
                  <IconRefresh size={24} c="red" />
                  <div>
                    <Text size="xs" c="dimmed">{t('finance.auditPage.statistics.reversals')}</Text>
                    <Text size="xl" fw={500}>{statistics.reversals || 0}</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label={t('finance.auditPage.filters.entityType')}
                placeholder={t('finance.auditPage.filters.entityTypePlaceholder')}
                data={entityTypeOptions}
                value={filters.entity_type}
                onChange={(value) => setFilters({ ...filters, entity_type: value || '' })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                label={t('finance.auditPage.filters.action')}
                placeholder={t('finance.auditPage.filters.actionPlaceholder')}
                data={actionOptions}
                value={filters.action}
                onChange={(value) => setFilters({ ...filters, action: value || '' })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <DateInput
                label={t('finance.auditPage.filters.startDate')}
                placeholder={t('finance.auditPage.filters.startDatePlaceholder')}
                value={filters.start_date}
                onChange={(value) => setFilters({ ...filters, start_date: value })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <DateInput
                label={t('finance.auditPage.filters.endDate')}
                placeholder={t('finance.auditPage.filters.endDatePlaceholder')}
                value={filters.end_date}
                onChange={(value) => setFilters({ ...filters, end_date: value })}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                label={t('finance.auditPage.filters.search')}
                placeholder={t('finance.auditPage.filters.searchPlaceholder')}
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 1 }}>
              <Group mt="lg">
                <Button variant="light" onClick={fetchLogs} loading={loading}>
                  <IconFilter size={16} />
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setFilters({
                    entity_type: '',
                    action: '',
                    user_id: '',
                    start_date: null,
                    end_date: null,
                    search: '',
                  })}
                >
                  <IconX size={16} />
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Table */}
        <Paper withBorder>
          <ScrollArea h="calc(100vh - 450px)">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.auditPage.table.dateTime')}</Table.Th>
                  <Table.Th>{t('finance.auditPage.table.action')}</Table.Th>
                  <Table.Th>{t('finance.auditPage.table.entity')}</Table.Th>
                  <Table.Th>{t('finance.auditPage.table.description')}</Table.Th>
                  <Table.Th>{t('finance.auditPage.table.user')}</Table.Th>
                  <Table.Th ta="right">{t('finance.auditPage.table.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center">
                      <Text c="dimmed">{t('finance.auditPage.table.loading')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : logs.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center">
                      <Text c="dimmed">{t('finance.auditPage.table.noLogsFound')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  logs.map((log) => {
                    const ActionIcon = getActionIcon(log.action)
                    return (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          <Text size="sm">{new Date(log.createdAt).toLocaleDateString()}</Text>
                          <Text size="xs" c="dimmed">{new Date(log.createdAt).toLocaleTimeString()}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon size={16} />
                            {getActionBadge(log.action)}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{log.entityType}</Text>
                          <Text size="xs" c="dimmed">ID: {log.entityId}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={1}>{log.description}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">User #{log.performedBy}</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Button
                            size="xs"
                            variant="subtle"
                            color="blue"
                            leftSection={<IconTablerEye size={14} />}
                            onClick={() => handleView(log.id)}
                          >
                            {t('finance.auditPage.table.view')}
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Stack>

      {/* View Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={<Text fw={500}>{t('finance.auditPage.modal.title')}</Text>}
        size="lg"
      >
        {selectedLog && (
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.table.dateTime')}</Text>
                <Text>{new Date(selectedLog.createdAt).toLocaleString()}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.table.action')}</Text>
                {getActionBadge(selectedLog.action)}
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.modal.entityType')}</Text>
                <Text fw={500}>{selectedLog.entityType}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.table.entityId')}</Text>
                <Text>{selectedLog.entityId}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.modal.performedBy')}</Text>
                <Text>User #{selectedLog.performedBy}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="xs" c="dimmed">{t('finance.auditPage.modal.ipAddress')}</Text>
                <Text>{selectedLog.ipAddress || 'N/A'}</Text>
              </Grid.Col>
            </Grid>

            <Paper withBorder p="md">
              <Text size="sm" fw={500} mb="xs">{t('finance.auditPage.modal.description')}</Text>
              <Text>{selectedLog.description}</Text>
            </Paper>

            {formatChanges(selectedLog.oldValues, selectedLog.newValues) && (
              <Paper withBorder p="md">
                <Text size="sm" fw={500} mb="xs">{t('finance.auditPage.modal.changes')}</Text>
                <Stack gap="xs">
                  {formatChanges(selectedLog.oldValues, selectedLog.newValues)?.map((change, idx) => (
                    <Group key={idx}>
                      <Badge color="red" variant="light">
                        {change.field}: {JSON.stringify(change.oldValue)}
                      </Badge>
                      <IconArrowRight size={16} />
                      <Badge color="green" variant="light">
                        {change.field}: {JSON.stringify(change.newValue)}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            <Group justify="flex-end">
              <Button onClick={() => setViewModalOpened(false)}>{t('finance.auditPage.modal.close')}</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  )
}
