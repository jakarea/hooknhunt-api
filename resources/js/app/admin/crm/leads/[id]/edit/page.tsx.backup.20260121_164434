import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Paper,
  TextInput,
  Textarea,
  Select,
  SimpleGrid,
  Anchor,
  LoadingOverlay,
  Badge,
  Timeline,
  Grid,
  Collapse,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconCheck,
  IconPhone,
  IconMail,
  IconNote,
  IconCalendar,
  IconClock,
  IconPlus,
  IconDeviceMobile,
  IconRefresh,
  IconChecklist,
  IconUser,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
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
  activities?: Activity[]
}

interface Staff {
  id: number
  name: string
  email: string
  roleId: number
  role?: {
    name: string
    slug: string
  }
}

interface Activity {
  id: number
  type: string
  summary: string
  description: string | null
  schedule_at: string | null
  is_done: boolean
  created_at: string
  user: {
    id: number
    name: string
  }
}

const statusConfig = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

const sourceConfig = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
]

const activityTypes = [
  { value: 'call', label: 'Phone Call', icon: IconPhone },
  { value: 'meeting', label: 'Meeting', icon: IconCalendar },
  { value: 'email', label: 'Email', icon: IconMail },
  { value: 'whatsapp', label: 'WhatsApp', icon: IconDeviceMobile },
  { value: 'note', label: 'Note', icon: IconNote },
]

export default function EditLeadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lead, setLead] = useState<Lead | null>(null)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [assignedToSearch, setAssignedToSearch] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'manual',
    status: 'new',
    assigned_to: null as number | null,
    notes: '',
  })

  // Activity form state
  const [activityData, setActivityData] = useState({
    type: 'call',
    summary: '',
    description: '',
    schedule_at: null as Date | null,
  })

  const [savingActivity, setSavingActivity] = useState(false)

  // Fetch staff list
  const fetchStaff = async () => {
    setLoadingStaff(true)
    try {
      const response = await api.get('/hrm/staff')

      console.log('Staff API response:', response.data)

      if (response.data?.status) {
        // Handle both array and paginated response
        const data = response.data.data
        const users = Array.isArray(data) ? data : (data?.data || [])

        console.log('Parsed staff list:', users)

        setStaffList(users)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      notifications.show({
        title: 'Warning',
        message: 'Could not load staff list',
        color: 'yellow',
      })
    } finally {
      setLoadingStaff(false)
    }
  }

  // Fetch lead details
  const fetchLead = async () => {
    if (!id) return

    setLoading(true)
    try {
      const response = await api.get(`/crm/leads/${id}`)

      if (response.data?.status) {
        const leadData = response.data.data as Lead
        setLead(leadData)
        setFormData({
          name: leadData.name || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          source: leadData.source || 'manual',
          status: leadData.status || 'new',
          assigned_to: leadData.assigned_to || null,
          notes: leadData.notes || '',
        })
        // Set the search value to show the assigned staff name
        if (leadData.assignedAgent) {
          setAssignedToSearch(leadData.assignedAgent.name)
        }
      } else {
        throw new Error('Failed to load lead')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load lead details.',
        color: 'red',
      })
      navigate('/crm/leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLead()
    fetchStaff()
  }, [id])

  // Handle lead update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id) return

    setSaving(true)
    try {
      const response = await api.put(`/crm/leads/${id}`, {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        source: formData.source,
        status: formData.status,
        assigned_to: formData.assigned_to,
        notes: formData.notes.trim() || null,
      })

      if (response.data?.status) {
        notifications.show({
          title: 'Success',
          message: 'Lead updated successfully!',
          color: 'green',
        })
        fetchLead() // Refresh data
      } else {
        throw new Error('Failed to update lead')
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update lead.',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle activity logging
  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id) return

    // Validate
    if (!activityData.summary.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Summary is required',
        color: 'red',
      })
      return
    }

    setSavingActivity(true)
    try {
      const payload = {
        lead_id: parseInt(id),
        type: activityData.type,
        summary: activityData.summary.trim(),
        description: activityData.description.trim() || null,
        schedule_at: activityData.schedule_at
          ? new Date(activityData.schedule_at).toISOString()
          : null,
      }

      console.log('Sending activity payload:', payload)

      const response = await api.post('/crm/activities', payload)

      console.log('Activity response:', response.data)

      if (response.data?.status) {
        notifications.show({
          title: 'Activity Logged',
          message: activityData.schedule_at
            ? 'Activity logged and reminder set!'
            : 'Activity logged successfully!',
          color: 'green',
        })

        // Reset form
        setActivityData({
          type: 'call',
          summary: '',
          description: '',
          schedule_at: null,
        })
        setShowActivityForm(false)

        // Refresh lead data
        fetchLead()
      } else {
        throw new Error(response.data?.message || 'Failed to log activity')
      }
    } catch (error: any) {
      console.error('Activity logging error:', error)
      console.error('Error response:', error.response?.data)

      // Show validation errors if any
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            const msgArray = Array.isArray(messages) ? messages : [messages]
            return `${field}: ${msgArray.join(', ')}`
          })
          .join('\n')

        notifications.show({
          title: 'Validation Error',
          message: errorMessages,
          color: 'red',
        })
      } else {
        notifications.show({
          title: 'Error',
          message: error.response?.data?.message || error.message || 'Failed to log activity.',
          color: 'red',
        })
      }
    } finally {
      setSavingActivity(false)
    }
  }

  // Mark activity as done
  const markActivityDone = async (activityId: number) => {
    try {
      await api.post(`/crm/activities/${activityId}/done`)
      notifications.show({
        title: 'Success',
        message: 'Activity marked as completed!',
        color: 'green',
      })
      fetchLead()
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to mark activity as done.',
        color: 'red',
      })
    }
  }

  // Quick action buttons
  const quickActions = [
    {
      type: 'call' as const,
      label: 'Log Call',
      icon: IconPhone,
      color: 'blue',
    },
    {
      type: 'email' as const,
      label: 'Log Email',
      icon: IconMail,
      color: 'green',
    },
    {
      type: 'whatsapp' as const,
      label: 'Log WhatsApp',
      icon: IconDeviceMobile,
      color: 'teal',
    },
    {
      type: 'note' as const,
      label: 'Add Note',
      icon: IconNote,
      color: 'gray',
    },
  ]

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatScheduleDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const isPast = date < now

    return {
      text: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      isPast,
    }
  }

  const getActivityIcon = (type: string) => {
    const found = activityTypes.find((t) => t.value === type)
    return found?.icon || IconNote
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      call: 'blue',
      meeting: 'grape',
      email: 'green',
      whatsapp: 'teal',
      note: 'gray',
    }
    return colors[type] || 'gray'
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Breadcrumbs */}
        <Group>
          <Anchor component={Link} to="/dashboard" c="dimmed">
            Dashboard
          </Anchor>
          <IconChevronRight size={14} />
          <Anchor component={Link} to="/crm" c="dimmed">
            CRM
          </Anchor>
          <IconChevronRight size={14} />
          <Anchor component={Link} to="/crm/leads" c="dimmed">
            Leads
          </Anchor>
          <IconChevronRight size={14} />
          <Text c="red">Edit Lead</Text>
        </Group>

        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">
              Edit Lead
            </Title>
            <Text c="dimmed">Update lead information and set reminders</Text>
          </Box>
          <Button
            variant="light"
            size="md"
            onClick={() => {
              fetchLead()
            }}
            leftSection={<IconRefresh size={16} />}
          >
            Refresh
          </Button>
          <Button
            component={Link}
            to="/crm/leads"
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Leads
          </Button>
        </Group>

        {loading ? (
          <Paper withBorder p="xl" pos="relative">
            <LoadingOverlay visible />
            <Text>Loading lead details...</Text>
          </Paper>
        ) : lead ? (
          <Grid>
            {/* Left Column - Lead Info */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack>
                {/* Lead Information Form */}
                <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" component="form" onSubmit={handleSubmit}>
                  <Stack>
                    <Group justify="space-between">
                      <Title order={4}>Lead Information</Title>
                      <Badge color={lead.status === 'new' ? 'blue' : lead.status === 'converted' ? 'green' : 'gray'}>
                        {lead.status.toUpperCase()}
                      </Badge>
                    </Group>

                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <TextInput
                        label="Name"
                        placeholder="Lead name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />

                      <TextInput
                        label="Phone"
                        placeholder="e.g., 01712345678"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        required
                        leftSection={<IconPhone size={16} />}
                      />

                      <TextInput
                        label="Email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        leftSection={<IconMail size={16} />}
                      />

                      <Select
                        label="Source"
                        placeholder="Select source"
                        data={sourceConfig}
                        value={formData.source}
                        onChange={(value) => setFormData((prev) => ({ ...prev, source: value || 'manual' }))}
                      />

                      <Select
                        label="Status"
                        placeholder="Select status"
                        data={statusConfig}
                        value={formData.status}
                        onChange={(value) => setFormData((prev) => ({ ...prev, status: value || 'new' }))}
                      />

                      <Select
                        label="Assigned To"
                        placeholder={loadingStaff ? 'Loading staff...' : 'Select staff member'}
                        data={staffList.map((staff) => ({
                          value: staff.id.toString(),
                          label: staff.name,
                        }))}
                        value={formData.assigned_to?.toString() || null}
                        onChange={(value) => {
                          const selectedId = value ? parseInt(value) : null
                          setFormData((prev) => ({ ...prev, assigned_to: selectedId }))
                          // Update search value to show selected staff name
                          if (selectedId) {
                            const selected = staffList.find((s) => s.id === selectedId)
                            if (selected) {
                              setAssignedToSearch(selected.name)
                            }
                          } else {
                            setAssignedToSearch('')
                          }
                        }}
                        clearable
                        onClear={() => {
                          setFormData((prev) => ({ ...prev, assigned_to: null }))
                          setAssignedToSearch('')
                        }}
                        searchable
                        searchValue={assignedToSearch}
                        onSearchChange={setAssignedToSearch}
                        nothingFoundMessage="No staff members found"
                        disabled={loadingStaff || staffList.length === 0}
                        leftSection={<IconUser size={16} />}
                        checkIconPosition="right"
                      />
                    </SimpleGrid>

                    <Textarea
                      label="Notes"
                      placeholder="Additional notes about this lead..."
                      minRows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    />

                    <Group justify="flex-end">
                      <Button type="submit" loading={saving} leftSection={<IconCheck size={16} />}>
                        Update Lead
                      </Button>
                    </Group>
                  </Stack>
                </Paper>

                {/* Activity Log */}
                <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Group justify="space-between" mb="md">
                    <Title order={4}>Activity History</Title>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => setShowActivityForm(!showActivityForm)}
                    >
                      Log Activity
                    </Button>
                  </Group>

                  {/* Activity Form */}
                  <Collapse in={showActivityForm}>
                    <Paper withBorder p="md" mb="md" radius="md" bg="gray.0">
                      <form onSubmit={handleActivitySubmit}>
                        <Stack>
                          <Select
                            label="Activity Type"
                            data={activityTypes}
                            value={activityData.type}
                            onChange={(value) => setActivityData((prev) => ({ ...prev, type: value || 'call' }))}
                            required
                          />

                          <TextInput
                            label="Summary"
                            placeholder="e.g., Discussed pricing proposal"
                            value={activityData.summary}
                            onChange={(e) => setActivityData((prev) => ({ ...prev, summary: e.target.value }))}
                            required
                          />

                          <Textarea
                            label="Description (Optional)"
                            placeholder="Additional details..."
                            minRows={2}
                            value={activityData.description}
                            onChange={(e) => setActivityData((prev) => ({ ...prev, description: e.target.value }))}
                          />

                          <DateInput
                            label="Schedule Follow-up (Optional)"
                            placeholder="Set reminder date"
                            value={activityData.schedule_at}
                            onChange={(value) => setActivityData((prev) => ({ ...prev, schedule_at: value as Date | null }))}
                            clearable
                            minDate={new Date()}
                          />

                          <Group justify="flex-end">
                            <Button type="button" variant="default" size="sm" onClick={() => setShowActivityForm(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" loading={savingActivity}>
                              Log Activity
                            </Button>
                          </Group>
                        </Stack>
                      </form>
                    </Paper>
                  </Collapse>

                  {/* Timeline */}
                  {lead.activities && lead.activities.length > 0 ? (
                    <Timeline bulletSize={24}>
                      {lead.activities.map((activity) => {
                        const Icon = getActivityIcon(activity.type)
                        const scheduleInfo = formatScheduleDate(activity.schedule_at)

                        return (
                          <Timeline.Item
                            key={activity.id}
                            bullet={<Icon size={12} />}
                            color={getActivityColor(activity.type)}
                          >
                            <Paper withBorder p="sm" radius="md">
                              <Stack gap={4}>
                                <Group justify="space-between" wrap="nowrap">
                                  <Text fw={500} size="sm">
                                    {activity.summary}
                                  </Text>
                                  <Group gap={4}>
                                    {activity.schedule_at && !activity.is_done && (
                                      <Tooltip label="Mark as done">
                                        <ActionIcon
                                          size="sm"
                                          color="green"
                                          variant="light"
                                          onClick={() => markActivityDone(activity.id)}
                                        >
                                          <IconChecklist size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                    {activity.is_done && (
                                      <Badge color="green" size="xs" variant="light">
                                        Done
                                      </Badge>
                                    )}
                                  </Group>
                                </Group>

                                {activity.description && (
                                  <Text size="xs" c="dimmed">
                                    {activity.description}
                                  </Text>
                                )}

                                <Group gap={4}>
                                  <IconClock size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                  <Text size="xs" c="dimmed">
                                    {formatDate(activity.created_at)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    by {activity.user.name}
                                  </Text>
                                </Group>

                                {scheduleInfo && !activity.is_done && (
                                  <Group gap={4}>
                                    <IconCalendar size={12} style={{ color: scheduleInfo.isPast ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-orange-6)' }} />
                                    <Text size="xs" c={scheduleInfo.isPast ? 'red' : 'orange'}>
                                      Follow-up: {scheduleInfo.text} {scheduleInfo.isPast && '(Overdue)'}
                                    </Text>
                                  </Group>
                                )}
                              </Stack>
                            </Paper>
                          </Timeline.Item>
                        )
                      })}
                    </Timeline>
                  ) : (
                    <Paper withBorder p="xl" ta="center" c="dimmed">
                      No activities logged yet
                    </Paper>
                  )}
                </Paper>
              </Stack>
            </Grid.Col>

            {/* Right Column - Quick Actions */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack>
                {/* Quick Actions */}
                <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Title order={4} mb="md">Quick Actions</Title>
                  <SimpleGrid cols={2}>
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <Button
                          key={action.type}
                          variant="light"
                          color={action.color}
                          size="md"
                          leftSection={<Icon size={18} />}
                          onClick={() => {
                            setActivityData((prev) => ({ ...prev, type: action.type }))
                            setShowActivityForm(true)
                          }}
                        >
                          {action.label}
                        </Button>
                      )
                    })}
                  </SimpleGrid>
                </Paper>

                {/* Lead Details */}
                <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Title order={4} mb="md">Lead Details</Title>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">Lead ID</Text>
                      <Text fw={500}>#{lead.id}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Created</Text>
                      <Text fw={500}>{formatDate(lead.created_at)}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Assigned To</Text>
                      {formData.assigned_to && lead.assignedAgent ? (
                        <Text fw={500}>{lead.assignedAgent.name}</Text>
                      ) : (
                        <Text c="dimmed" fs="italic">Not assigned</Text>
                      )}
                    </Box>
                  </Stack>
                </Paper>

                {/* Contact Actions */}
                <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Title order={4} mb="md">Quick Contact</Title>
                  <Stack>
                    <Button
                      component="a"
                      href={`tel:${lead.phone}`}
                      fullWidth
                      leftSection={<IconPhone size={16} />}
                      variant="light"
                      color="blue"
                    >
                      Call Now
                    </Button>
                    {lead.email && (
                      <Button
                        component="a"
                        href={`mailto:${lead.email}`}
                        fullWidth
                        leftSection={<IconMail size={16} />}
                        variant="light"
                        color="green"
                      >
                        Send Email
                      </Button>
                    )}
                    <Button
                      component="a"
                      href={`https://wa.me/${lead.phone.replace(/^0/, '880')}`}
                      target="_blank"
                      fullWidth
                      leftSection={<IconDeviceMobile size={16} />}
                      variant="light"
                      color="teal"
                    >
                      Open WhatsApp
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Grid.Col>
          </Grid>
        ) : null}
      </Stack>
    </Box>
  )
}
