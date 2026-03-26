import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Paper,
  Table,
  TextInput,
  Select,
  ActionIcon,
  Avatar,
  Menu,
  LoadingOverlay,
  Modal,
  SimpleGrid,
  Card,
} from '@mantine/core'
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconPhone,
  IconMail,
  IconUser,
  IconPencil,
  IconTrash,
  IconRefresh,
  IconCalendar,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'

interface Lead {
  id: number
  name: string
  email: string | null
  phone: string
  source: string
  status: string
  assigned_to: number | null
  notes: string | null
  created_at: string
  updated_at: string
  assignedAgent?: {
    id: number
    name: string
  }
  scheduledActivities?: Array<{
    id: number
    summary: string
    schedule_at: string
  }>
}

export default function LeadsPage() {
  const { t } = useTranslation()

  const statusConfig = useMemo(() => [
    { value: 'all', label: t('crm.leads.filterByStatus') },
    { value: 'new', label: t('crm.leads.status.new') },
    { value: 'contacted', label: t('crm.leads.status.contacted') },
    { value: 'qualified', label: t('crm.leads.status.qualified') },
    { value: 'proposal', label: t('crm.leads.status.proposal') },
    { value: 'negotiation', label: t('crm.leads.status.negotiation') },
    { value: 'converted', label: t('crm.leads.status.converted') },
    { value: 'lost', label: t('crm.leads.status.lost') },
  ], [t])

  const sourceConfig = useMemo(() => [
    { value: 'all', label: t('crm.leads.filterBySource') },
    { value: 'manual', label: t('crm.leads.source.manual') },
    { value: 'website', label: t('crm.leads.source.website') },
    { value: 'referral', label: t('crm.leads.source.referral') },
    { value: 'trade_show', label: t('crm.leads.source.tradeShow') },
    { value: 'cold_call', label: t('crm.leads.source.coldCall') },
    { value: 'social_media', label: t('crm.leads.source.socialMedia') },
    { value: 'advertisement', label: t('crm.leads.source.advertisement') },
    { value: 'other', label: t('crm.leads.source.other') },
  ], [t])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [sourceFilter, setSourceFilter] = useState<string | null>('all')
  const [calendarModalOpen, setCalendarModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  // Fetch leads
  const fetchLeads = async () => {
    try {
      if (refreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (dateFilter) {
        params.append('date', dateFilter)
      }

      const response = await api.get(`/crm/leads?${params.toString()}`)

      if (response.data?.status) {
        // Handle paginated or array response
        const data = response.data.data
        const leadsData = Array.isArray(data) ? data : (data?.data || [])

        setLeads(leadsData)
      } else {
        throw new Error('Failed to fetch leads')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching leads:', error)
      }
      notifications.show({
        title: t('common.error'),
        message: t('crm.leads.errorLoading'),
        color: 'red',
      })
      setLeads([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchLeads()
  }, [])

  // Fetch when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        fetchLeads()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, sourceFilter, dateFilter])

  // Get lead name
  const getLeadName = (lead: Lead) => {
    return lead.name || 'Unknown'
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      contacted: 'cyan',
      qualified: 'green',
      proposal: 'yellow',
      negotiation: 'orange',
      converted: 'teal',
      lost: 'red',
    }
    return colors[status] || 'gray'
  }

  // Get source label
  const getSourceLabel = (source: string) => {
    const found = sourceConfig.find((s) => s.value === source)
    return found?.label || source
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Check if lead has activity scheduled for today
  const hasTodayActivity = (lead: Lead) => {
    const today = new Date().toISOString().split('T')[0]
    return lead.scheduledActivities?.some((activity) => {
      const date = new Date(activity.schedule_at)
      // Check if date is valid before calling toISOString()
      if (isNaN(date.getTime())) {
        return false
      }
      const activityDate = date.toISOString().split('T')[0]
      return activityDate === today
    })
  }

  // Delete lead handler
  const openDeleteModal = (id: number, name: string) => {
    modals.openConfirmModal({
      title: t('crm.leads.delete'),
      centered: true,
      children: (
        <Text className="text-sm md:text-base">
          {t('crm.leads.deleteConfirm', { name })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel')
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/leads/${id}`)
          notifications.show({
            title: t('common.success'),
            message: t('crm.leads.deleted', { name }),
            color: 'green',
          })
          fetchLeads()
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error deleting lead:', error)
          }
          notifications.show({
            title: t('common.error'),
            message: t('crm.leads.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }

  // Handle calendar view
  const handleCalendarView = async () => {
    if (selectedDate) {
      // Set date filter and clear other filters for clean view
      const dateStr = selectedDate.toISOString().split('T')[0]
      setDateFilter(dateStr)
      setCalendarModalOpen(false)

      // Fetch leads with activities scheduled for this date
      await fetchLeads()
    }
  }

  // Clear date filter
  const clearDateFilter = async () => {
    setDateFilter(null)
    setSelectedDate(null)
    await fetchLeads()
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between" wrap="wrap">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                {t('crm.leads.title')}
                {dateFilter && (
                  <Badge ml="md" color="blue" variant="light">
                    {t('crm.leads.scheduledFor', { date: new Date(dateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })}
                  </Badge>
                )}
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                {dateFilter ? t('crm.leads.dateFilterSubtitle') : t('crm.leads.subtitle')}
              </Text>
            </Box>
            <Group>
              {dateFilter && (
                <Button
                  variant="light"
                  className="text-base md:text-lg"
                  color="red"
                  onClick={clearDateFilter}
                  leftSection={<IconRefresh size={16} />}
                >
                  {t('crm.leads.clearDateFilter')}
                </Button>
              )}
              <Button
                variant="light"
                className="text-base md:text-lg"
                onClick={() => {
                  setRefreshing(true)
                  fetchLeads()
                }}
                loading={refreshing}
                leftSection={<IconRefresh size={16} />}
              >
                {t('common.refresh')}
              </Button>
              <Button
                variant="light"
                className="text-base md:text-lg"
                leftSection={<IconCalendar size={16} />}
                onClick={() => setCalendarModalOpen(true)}
              >
                {t('crm.leads.viewCalendar')}
              </Button>
              <Button
                component={Link}
                to="/crm/leads/create"
                leftSection={<IconPlus size={16} />}
              >
                {t('crm.leads.add')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Text className="text-xs md:text-sm" c="dimmed">{t('crm.leads.total')}</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{leads.length}</Text>
          </Card>
          <Card withBorder p="md" radius="md">
            <Text className="text-xs md:text-sm" c="dimmed">{t('crm.leads.status.new')}</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="blue">
              {leads.filter((l) => l.status === 'new').length}
            </Text>
          </Card>
          <Card withBorder p="md" radius="md">
            <Text className="text-xs md:text-sm" c="dimmed">{t('crm.leads.status.contacted')}</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="cyan">
              {leads.filter((l) => l.status === 'contacted').length}
            </Text>
          </Card>
          <Card withBorder p="md" radius="md">
            <Text className="text-xs md:text-sm" c="dimmed">{t('crm.leads.status.converted')}</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="teal">
              {leads.filter((l) => l.status === 'converted').length}
            </Text>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Group justify="space-between" wrap="wrap">
          <Group style={{ flex: 1, maxWidth: '100%' }}>
            <TextInput
              placeholder={t('crm.leads.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: '400px' }}
              className="text-base md:text-lg"
            />
            <Select
              placeholder={t('crm.leads.filterByStatus')}
              value={statusFilter}
              onChange={setStatusFilter}
              data={statusConfig}
              className="text-base md:text-lg"
              style={{ minWidth: '150px' }}
              clearable
            />
            <Select
              placeholder={t('crm.leads.filterBySource')}
              value={sourceFilter}
              onChange={setSourceFilter}
              data={sourceConfig}
              className="text-base md:text-lg"
              style={{ minWidth: '150px' }}
              clearable
            />
          </Group>
        </Group>

        {/* Leads Table */}
        <Box pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          {leads.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Text c="dimmed">{t('crm.leads.noResults')}</Text>
            </Paper>
          ) : (
            <Paper withBorder p="md" radius="md">
              <Table.ScrollContainer minWidth={800}>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('crm.leads.table.lead')}</Table.Th>
                      <Table.Th>{t('crm.leads.table.contact')}</Table.Th>
                      <Table.Th>{t('crm.leads.table.source')}</Table.Th>
                      <Table.Th>{t('crm.leads.table.status')}</Table.Th>
                      <Table.Th>{t('crm.leads.table.assignedTo')}</Table.Th>
                      <Table.Th>{t('crm.leads.table.created')}</Table.Th>
                      <Table.Th>{t('common.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {leads.map((lead) => {
                      const name = getLeadName(lead)
                      const isTodayActivity = hasTodayActivity(lead)
                      return (
                        <Table.Tr
                          key={lead.id}
                          onClick={() => (window.location.href = `/crm/leads/${lead.id}/edit`)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isTodayActivity ? 'var(--mantine-color-blue-0)' : undefined,
                          }}
                        >
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar className="text-sm md:text-base" radius="xl" color="red">
                                {name.charAt(0).toUpperCase()}
                              </Avatar>
                              <div>
                                <Group gap={4} align="center">
                                  <Text fw={500} className="text-sm md:text-base">
                                    {name}
                                  </Text>
                                  {isTodayActivity && (
                                    <IconCalendar
                                      size={14}
                                      style={{ color: 'var(--mantine-color-blue-6)' }}
                                      title="Activity scheduled for today"
                                    />
                                  )}
                                </Group>
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Group gap={4} style={{ flexWrap: 'wrap' }}>
                                <IconPhone size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                <Text className="text-xs md:text-sm">{lead.phone}</Text>
                              </Group>
                              {lead.email && (
                                <Group gap={4} style={{ flexWrap: 'wrap' }}>
                                  <IconMail size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                  <Text className="text-xs md:text-sm" truncate style={{ maxWidth: '200px' }}>
                                    {lead.email}
                                  </Text>
                                </Group>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{getSourceLabel(lead.source)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={getStatusColor(lead.status)}
                              variant="light"
                              className="text-sm md:text-base"
                            >
                              {t(`crm.leads.status.${lead.status}`)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {lead.assignedAgent ? (
                              <Group gap={4}>
                                <IconUser size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                <Text className="text-xs md:text-sm">{lead.assignedAgent.name}</Text>
                              </Group>
                            ) : (
                              <Text className="text-xs md:text-sm" c="dimmed">{t('crm.leads.unassigned')}</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{formatDate(lead.created_at)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Menu shadow="md" width={160} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle" className="text-lg md:text-xl lg:text-2xl">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>

                              <Menu.Dropdown>
                                <Menu.Label>{t('common.actions')}</Menu.Label>
                                <Menu.Item
                                  leftSection={<IconPencil size={14} />}
                                  component={Link}
                                  to={`/crm/leads/${lead.id}/edit`}
                                >
                                  {t('crm.leads.actions.viewEdit')}
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconPhone size={14} />}
                                  color="blue"
                                  component="a"
                                  href={`tel:${lead.phone}`}
                                >
                                  {t('crm.leads.actions.callNow')}
                                </Menu.Item>
                                {lead.email && (
                                  <Menu.Item
                                    leftSection={<IconMail size={14} />}
                                    color="green"
                                    component="a"
                                    href={`mailto:${lead.email}`}
                                  >
                                    {t('crm.leads.actions.sendEmail')}
                                  </Menu.Item>
                                )}
                                <Menu.Divider />
                                <Menu.Item
                                  leftSection={<IconTrash size={14} />}
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDeleteModal(lead.id, name)
                                  }}
                                >
                                  {t('common.delete')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          )}
        </Box>
      </Stack>

      {/* Calendar Modal */}
      <Modal
        opened={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        title={t('crm.leads.calendarModalTitle')}
        centered
        className="text-base md:text-lg"
      >
        <Stack>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('crm.leads.calendarModalDescription')}
          </Text>
          <DateInput
            placeholder={t('common.selectDate')}
            value={selectedDate}
            onChange={(value) => setSelectedDate(value ? new Date(value) : null)}
            clearable
            minDate={new Date()}
          />
          {selectedDate && (
            <Button
              onClick={handleCalendarView}
              leftSection={<IconSearch size={16} />}
            >
              {t('crm.leads.viewScheduledLeads')}
            </Button>
          )}
        </Stack>
      </Modal>
    </Box>
  )
}
