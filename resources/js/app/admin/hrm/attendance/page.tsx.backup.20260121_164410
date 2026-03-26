import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Card,
  Select,
  ActionIcon,
  Table,
  LoadingOverlay,
  Modal,
  TextInput,
  Textarea,
} from '@mantine/core'
import {
  IconRefresh,
  IconCalendar,
  IconClock,
  IconPencil,
  IconCheck,
  IconX,
  IconCoffee,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import AttendanceActions from '@/components/attendance-actions'

interface Attendance {
  id: number
  user_id: number
  date: string
  clock_in: string
  clock_out?: string
  break_in?: string[]
  break_out?: string[]
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
  note?: string
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
  }
  updater?: {
    id: number
    name: string
  }
}

interface Employee {
  id: number
  name: string
}

interface FormData {
  user_id: string | null
  date: string | null
  clock_in: string | null
  clock_out: string | null
  status: string | null
  note: string
}

export default function AttendancePage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(new Date().toISOString().slice(0, 7))
  const [modalOpened, setModalOpened] = useState(false)
  const [saving, setSaving] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [formData, setFormData] = useState<FormData>({
    user_id: null,
    date: null,
    clock_in: null,
    clock_out: null,
    status: null,
    note: '',
  })

  // Check if current user is admin (super_admin or admin)
  const isAdmin = useMemo(() => {
    return user?.role?.slug === 'super_admin' || user?.role?.slug === 'admin'
  }, [user])

  // Status options for filter and form
  const statusOptions = useMemo(() => [
    { value: 'all', label: t('hrm.attendance.filterAllStatus') },
    { value: 'present', label: t('hrm.attendance.status.present') },
    { value: 'late', label: t('hrm.attendance.status.late') },
    { value: 'absent', label: t('hrm.attendance.status.absent') },
    { value: 'leave', label: t('hrm.attendance.status.onLeave') },
    { value: 'holiday', label: t('hrm.attendance.status.holiday') },
  ], [t])

  // Status options for edit modal
  const statusFormOptions = useMemo(() => [
    { value: 'present', label: t('hrm.attendance.status.present') },
    { value: 'late', label: t('hrm.attendance.status.late') },
    { value: 'absent', label: t('hrm.attendance.status.absent') },
    { value: 'leave', label: t('hrm.attendance.status.onLeave') },
    { value: 'holiday', label: t('hrm.attendance.status.holiday') },
  ], [t])

  // Fetch attendance records
  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {
        start_date: monthFilter ? `${monthFilter}-01` : new Date().toISOString().slice(0, 7) + '-01',
        end_date: monthFilter ? `${monthFilter}-31` : new Date().toISOString().slice(0, 7) + '-31',
      }

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }

      // Non-admins can only see their own attendance
      if (!isAdmin) {
        params.user_id = String(user?.id)
      } else if (employeeFilter) {
        params.user_id = employeeFilter
      }

      const response = await api.get('/hrm/attendance', { params })
      const attendanceData = response.data.data?.data || response.data.data || []

      // Normalize camelCase to snake_case for consistency
      const normalizedAttendance = (Array.isArray(attendanceData) ? attendanceData : []).map((record: any) => ({
        id: record.id,
        user_id: record.userId || record.user_id,
        date: record.date,
        clock_in: record.clockIn || record.clock_in,
        clock_out: record.clockOut || record.clock_out,
        break_in: record.breakIn || record.break_in,
        break_out: record.breakOut || record.break_out,
        status: record.status,
        note: record.note,
        created_at: record.createdAt || record.created_at,
        updated_at: record.updatedAt || record.updated_at,
        user: record.user,
        updater: record.updater,
      }))

      console.log('Normalized attendance:', normalizedAttendance)
      setAttendance(normalizedAttendance)

      // Fetch today's attendance for current user (same approach as dashboard)
      if (user?.id) {
        try {
          const now = new Date()
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

          // Fetch all attendance for today (without user filter to avoid permission issues)
          const myAttendanceResponse = await api.get(`/hrm/attendance?start_date=${today}&end_date=${today}`)
          console.log('My attendance response:', myAttendanceResponse)

          // API returns paginated data with camelCase fields
          let myAttendanceData = []

          if (myAttendanceResponse.data?.data?.data) {
            myAttendanceData = myAttendanceResponse.data.data.data
          } else if (myAttendanceResponse.data?.data) {
            myAttendanceData = Array.isArray(myAttendanceResponse.data.data) ? myAttendanceResponse.data.data : []
          }

          console.log('My attendance data:', myAttendanceData)

          // Find my attendance - handle both camelCase/snake_case and string/number
          const myRecord = myAttendanceData.find((a: any) => {
            const recordUserId = a.userId || a.user_id
            return String(recordUserId) === String(user.id)
          })

          if (myRecord) {
            console.log('Found my attendance:', myRecord)

            // Convert camelCase to snake_case for consistency
            const normalizedRecord: Attendance = {
              id: myRecord.id,
              user_id: myRecord.userId || myRecord.user_id,
              date: myRecord.date,
              clock_in: myRecord.clockIn || myRecord.clock_in,
              clock_out: myRecord.clockOut || myRecord.clock_out,
              break_in: myRecord.breakIn || myRecord.break_in,
              break_out: myRecord.breakOut || myRecord.break_out,
              status: myRecord.status,
              note: myRecord.note,
              created_at: myRecord.createdAt || myRecord.created_at,
              updated_at: myRecord.updatedAt || myRecord.updated_at,
              user: myRecord.user,
              updater: myRecord.updater,
            }
            console.log('Normalized attendance:', normalizedRecord)
            setTodayAttendance(normalizedRecord)
          } else {
            console.log('No attendance found for user_id:', user.id)
            setTodayAttendance(null)
          }
        } catch (error) {
          console.error('Error fetching my attendance:', error)
          setTodayAttendance(null)
        }
      } else {
        setTodayAttendance(null)
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to fetch attendance:', error)
      notifications.show({
        title: t('common.error'),
        message: t('hrm.attendance.error.loadFailed'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch employees for dropdown (only for admins)
  const fetchEmployees = async () => {
    if (!isAdmin) return

    try {
      const response = await api.get('/user-management/users')
      const employeesData = response.data.data || []
      setEmployees(employeesData)
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to fetch employees:', error)
    }
  }

  // Initial load
  useEffect(() => {
    fetchAttendance()
    fetchEmployees()
  }, [statusFilter, employeeFilter, monthFilter])

  // Handle refresh
  const handleRefresh = () => {
    fetchAttendance()
  }

  // Open edit modal (admin only)
  const openEditModal = (record: Attendance) => {
    setFormData({
      user_id: String(record.user_id),
      date: record.date,
      clock_in: record.clock_in,
      clock_out: record.clock_out || null,
      status: record.status,
      note: record.note || '',
    })
    setModalOpened(true)
  }

  // Handle save (admin only - manual entry/update)
  const handleSave = async () => {
    if (isAdmin && !formData.user_id) {
      notifications.show({
        title: t('common.error'),
        message: t('hrm.attendance.validation.selectEmployee'),
        color: 'red',
      })
      return
    }

    if (!formData.date) {
      notifications.show({
        title: t('common.error'),
        message: t('hrm.attendance.validation.selectDate'),
        color: 'red',
      })
      return
    }

    if (!formData.status) {
      notifications.show({
        title: t('common.error'),
        message: t('hrm.attendance.validation.selectStatus'),
        color: 'red',
      })
      return
    }

    try {
      setSaving(true)

      await api.post('/hrm/attendance', {
        user_id: isAdmin ? formData.user_id : user?.id,
        date: formData.date,
        clock_in: formData.clock_in,
        clock_out: formData.clock_out,
        status: formData.status,
        note: formData.note || null,
      })

      notifications.show({
        title: t('common.success'),
        message: t('hrm.attendance.success.updated'),
        color: 'green',
      })

      setModalOpened(false)
      fetchAttendance()
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to save attendance:', error)
      const errorObj = error as { response?: { data?: { message?: string } } }
      notifications.show({
        title: t('common.error'),
        message: errorObj.response?.data?.message || t('hrm.attendance.error.saveFailed'),
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Calculate working hours
  const calculateHours = (clockIn: string, clockOut?: string, breakIns?: string[], breakOuts?: string[]) => {
    if (!clockOut) return '-'

    // Parse clock in and clock out times
    let inDate: Date
    let outDate: Date

    if (clockIn.includes('T') || clockIn.includes('-')) {
      inDate = new Date(clockIn)
    } else {
      const [hours, minutes] = clockIn.split(':').map(Number)
      inDate = new Date(2000, 0, 1, hours, minutes)
    }

    if (clockOut.includes('T') || clockOut.includes('-')) {
      outDate = new Date(clockOut)
    } else {
      const [hours, minutes] = clockOut.split(':').map(Number)
      outDate = new Date(2000, 0, 1, hours, minutes)
    }

    let totalWorkTime = outDate.getTime() - inDate.getTime()

    // Subtract break times
    if (breakIns && breakOuts && Array.isArray(breakIns) && Array.isArray(breakOuts)) {
      for (let i = 0; i < breakOuts.length; i++) {
        const breakIn = breakIns[i]
        const breakOut = breakOuts[i]

        if (breakIn && breakOut) {
          let breakInTime: Date
          let breakOutTime: Date

          if (breakIn.includes('T') || breakIn.includes('-')) {
            breakInTime = new Date(breakIn)
          } else {
            const [hours, minutes] = breakIn.split(':').map(Number)
            breakInTime = new Date(2000, 0, 1, hours, minutes)
          }

          if (breakOut.includes('T') || breakOut.includes('-')) {
            breakOutTime = new Date(breakOut)
          } else {
            const [hours, minutes] = breakOut.split(':').map(Number)
            breakOutTime = new Date(2000, 0, 1, hours, minutes)
          }

          const breakDuration = breakOutTime.getTime() - breakInTime.getTime()
          totalWorkTime -= breakDuration
        }
      }
    }

    const hours = Math.floor(totalWorkTime / (1000 * 60 * 60))
    const minutes = Math.floor((totalWorkTime % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  // Format time to 12-hour format
  const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '--'

    // Check if already in HH:MM:SS format
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    }

    try {
      const date = new Date(timeString)
      let hours = date.getHours()
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      return `${hours}:${minutes} ${ampm}`
    } catch {
      return timeString
    }
  }

  // Calculate break duration
  const calculateBreakDuration = (breakIn: string, breakOut: string | null | undefined): string => {
    if (!breakIn || !breakOut) return '--'

    try {
      // Parse break in time
      let breakInTime: Date
      if (breakIn.includes('T') || breakIn.includes('-')) {
        breakInTime = new Date(breakIn)
      } else {
        const [hours, minutes, seconds] = breakIn.split(':').map(Number)
        breakInTime = new Date()
        breakInTime.setHours(hours, minutes, seconds || 0, 0)
      }

      // Parse break out time
      let breakOutTime: Date
      if (breakOut.includes('T') || breakOut.includes('-')) {
        breakOutTime = new Date(breakOut)
      } else {
        const [hours, minutes, seconds] = breakOut.split(':').map(Number)
        breakOutTime = new Date()
        breakOutTime.setHours(hours, minutes, seconds || 0, 0)
      }

      // Calculate duration in minutes
      const diffMs = breakOutTime.getTime() - breakInTime.getTime()
      const totalMinutes = Math.floor(diffMs / 1000 / 60)

      if (totalMinutes <= 0) return '--'

      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    } catch {
      return '--'
    }
  }

  // Format break times for display
  const formatBreakTimes = (breakIns: string[] | undefined, breakOuts: string[] | undefined) => {
    if (!breakIns || breakIns.length === 0) return '--'

    const ins = Array.isArray(breakIns) ? breakIns : []
    const outs = Array.isArray(breakOuts) ? breakOuts : []

    return ins.map((breakIn, i) => {
      const inTime = formatTime(breakIn)
      const outTime = i < outs.length ? formatTime(outs[i]) : 'Active'
      const duration = i < outs.length ? calculateBreakDuration(breakIn, outs[i]) : null
      const isActive = i >= outs.length

      return (
        <Group key={i} gap={4} wrap="nowrap">
          <IconCoffee size={14} style={{ color: isActive ? '#f59e0b' : '#6b7280' }} />
          <Text size="xs" c="dimmed">
            {inTime} - {outTime}
            {duration && (
              <Text span c="orange" fw={500}> ({duration})</Text>
            )}
          </Text>
        </Group>
      )
    })
  }

  // Stats
  const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const lateDays = attendance.filter(a => a.status === 'late').length
  const absentDays = attendance.filter(a => a.status === 'absent').length
  const leaveDays = attendance.filter(a => a.status === 'leave').length

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header with refresh button */}
        <Box>
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1 }}>
              <AttendanceActions myAttendance={todayAttendance} onRefresh={fetchAttendance} />
            </Box>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleRefresh}
              loading={loading}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Box>

        {/* Today's Status Card */}
        {todayAttendance && (
          <Card withBorder p="md" radius="md" shadow="sm">
            <Group justify="space-between" align="flex-start">
              <Box style={{ flex: 1 }}>
                <Text size="sm" c="dimmed">{t('hrm.attendance.todaysStatus')}</Text>
                <Group mt="xs" wrap="nowrap">
                  <Badge
                    color={
                      todayAttendance.status === 'present' ? 'green' :
                      todayAttendance.status === 'late' ? 'yellow' :
                      todayAttendance.status === 'absent' ? 'red' :
                      'blue'
                    }
                    size="lg"
                  >
                    {todayAttendance.status.toUpperCase()}
                  </Badge>
                  <Text size="lg" fw={500}>
                    In: {formatTime(todayAttendance.clock_in)}
                  </Text>
                  {todayAttendance.clock_out && (
                    <Text size="lg" fw={500}>
                      Out: {formatTime(todayAttendance.clock_out)}
                    </Text>
                  )}
                </Group>
                {todayAttendance.break_in && todayAttendance.break_in.length > 0 && (
                  <Stack mt="xs" gap={2}>
                    <Text size="xs" c="dimmed" fw={500}>{t('hrm.attendance.breaks')}:</Text>
                    <Stack gap={2}>
                      {formatBreakTimes(todayAttendance.break_in, todayAttendance.break_out)}
                    </Stack>
                  </Stack>
                )}
              </Box>
              {todayAttendance.clock_in && todayAttendance.clock_out && (
                <Box>
                  <Text size="sm" c="dimmed">{t('hrm.attendance.workingHours')}</Text>
                  <Text size="xl" fw={700}>
                    {calculateHours(todayAttendance.clock_in, todayAttendance.clock_out, todayAttendance.break_in, todayAttendance.break_out)}
                  </Text>
                </Box>
              )}
            </Group>
          </Card>
        )}

        {/* Stats */}
        <Stack  display={{ base: 'none', md: 'flex' }}>
          <Group >
            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconCheck size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
                <Text size="xs" c="dimmed">{t('hrm.attendance.presentDays')}</Text>
              </Group>
              <Text size="xl" fw={700}>{presentDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconClock size={20} style={{ color: 'var(--mantine-color-yellow-filled)' }} />
                <Text size="xs" c="dimmed">{t('hrm.attendance.lateDays')}</Text>
              </Group>
              <Text size="xl" fw={700}>{lateDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconX size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Text size="xs" c="dimmed">{t('hrm.attendance.absentDays')}</Text>
              </Group>
              <Text size="xl" fw={700}>{absentDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
              <Group >
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Text size="xs" c="dimmed">{t('hrm.attendance.leaveDays')}</Text>
              </Group>
              <Text size="xl" fw={700}>{leaveDays}</Text>
            </Card>
          </Group>
        </Stack>

        {/* Filters */}
        <Group justify="space-between">
          <Group >
            <TextInput
              type="month"
              label={t('hrm.attendance.selectMonth')}
              value={monthFilter || ''}
              onChange={(e) => setMonthFilter(e.currentTarget.value)}
              style={{ width: '150px' }}
              size="md"
            />
            <Select
              placeholder={t('hrm.attendance.filterByStatus')}
              label={t('hrm.attendance.status.label')}
              data={statusOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: '150px' }}
              size="md"
            />
            {isAdmin && (
              <Select
                placeholder={t('hrm.attendance.filterByEmployee')}
                label={t('hrm.attendance.employee')}
                clearable
                searchable
                data={employees.map(emp => ({ value: String(emp.id), label: emp.name }))}
                value={employeeFilter}
                onChange={(value) => setEmployeeFilter(value)}
                style={{ width: '200px' }}
                size="md"
              />
            )}
          </Group>
        </Group>

        {/* Table */}
        <Card withBorder p="0" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {isAdmin && <Table.Th>{t('hrm.attendance.tableHeaders.employee')}</Table.Th>}
                <Table.Th>{t('hrm.attendance.tableHeaders.date')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.clockIn')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.clockOut')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.breaks')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.workingHours')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.status')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.note')}</Table.Th>
                {isAdmin && <Table.Th>{t('hrm.attendance.tableHeaders.actions')}</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {attendance.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 9 : 8}>
                    <Box py="xl" ta="center">
                      <Text c="dimmed">{t('hrm.attendance.noAttendanceFound')}</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ) : (
                attendance.map((record) => (
                  <Table.Tr key={record.id}>
                    {isAdmin && (
                      <Table.Td>
                        <Text fw={500} size="sm">{record.user?.name || 'N/A'}</Text>
                      </Table.Td>
                    )}
                    <Table.Td>
                      <Text size="sm">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm">{formatTime(record.clock_in)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm">{formatTime(record.clock_out)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        {formatBreakTimes(record.break_in, record.break_out)}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {record.clock_out ? calculateHours(record.clock_in, record.clock_out, record.break_in, record.break_out) : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          record.status === 'present' ? 'green' :
                          record.status === 'late' ? 'yellow' :
                          record.status === 'absent' ? 'red' :
                          record.status === 'leave' ? 'blue' :
                          'gray'
                        }
                        variant="light"
                        size="sm"
                      >
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{record.note || '-'}</Text>
                    </Table.Td>
                    {isAdmin && (
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          onClick={() => openEditModal(record)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      {/* Edit Modal (Admin Only) */}
      {isAdmin && (
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title={t('hrm.attendance.editAttendance')}
          centered
        >
          <Stack >
            <Stack >
              <Text size="sm" fw={500}>{t('hrm.attendance.employee')} *</Text>
              <Select
                placeholder={t('hrm.attendance.selectEmployee')}
                data={employees.map(emp => ({ value: String(emp.id), label: emp.name }))}
                value={formData.user_id}
                onChange={(value) => setFormData({ ...formData, user_id: value })}
                searchable
                size="md"
                disabled
              />
            </Stack>

            <Stack >
              <Text size="sm" fw={500}>{t('hrm.attendance.date')} *</Text>
              <TextInput
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.currentTarget.value })}
                size="md"
              />
            </Stack>

            <Group >
              <Stack  style={{ flex: 1 }}>
                <Text size="sm" fw={500}>{t('hrm.attendance.clockIn')}</Text>
                <TextInput
                  type="time"
                  value={formData.clock_in || ''}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.currentTarget.value })}
                  size="md"
                />
              </Stack>

              <Stack  style={{ flex: 1 }}>
                <Text size="sm" fw={500}>{t('hrm.attendance.clockOut')}</Text>
                <TextInput
                  type="time"
                  value={formData.clock_out || ''}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.currentTarget.value })}
                  size="md"
                />
              </Stack>
            </Group>

            <Stack >
              <Text size="sm" fw={500}>{t('hrm.attendance.status.label')} *</Text>
              <Select
                placeholder={t('hrm.attendance.selectStatus')}
                data={statusFormOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
                size="md"
              />
            </Stack>

            <Stack >
              <Text size="sm" fw={500}>{t('hrm.attendance.note')}</Text>
              <Textarea
                placeholder={t('hrm.attendance.enterNote')}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.currentTarget.value })}
                size="md"
                rows={3}
              />
            </Stack>

            <Group justify="flex-end" >
              <Button
                variant="default"
                onClick={() => setModalOpened(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
              >
                {t('hrm.attendance.updateAttendance')}
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Box>
  )
}
