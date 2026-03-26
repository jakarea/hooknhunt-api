import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Paper,
  Text,
  Title,
  Box,
  Stack,
  Group,
  Alert,
  Table,
  Badge,
  Card,
  SimpleGrid,
  ThemeIcon,
  Loader,
  Center,
} from '@mantine/core'
import {
  IconUsers,
  IconBuilding,
  IconCalendarClock,
  IconCoffee,
  IconAlertCircle,
} from '@tabler/icons-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { QUOTES } from '@/config/quotes'
import AttendanceActions from '@/components/attendance-actions'

interface DashboardStats {
  total_staff: number
  total_departments: number
  today_attendance: number
  on_break: number
  pending_payroll: number
}

interface RecentActivity {
  id: number
  user_name: string
  action: string
  timestamp: string
}

interface MyAttendance {
  id: number
  user_id: number
  date: string
  clock_in: string
  clock_out?: string | null
  break_in?: string[]
  break_out?: string[]
  break_notes?: string[]
  status: string
  note?: string | null
}

interface HRMSettings {
  workStartTime: string
  workEndTime: string
  breakDuration: number
  gracePeriod: number
}

export default function AdminDashboardPage() {
  const { user, hasRole } = useAuthStore()
  const { t } = useTranslation()
  const isAdmin = user?.role?.slug === 'super_admin' || user?.role?.slug === 'admin' || hasRole('admin') || hasRole('super_admin')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [myAttendance, setMyAttendance] = useState<MyAttendance | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<MyAttendance[]>([])
  const [dailyQuote, setDailyQuote] = useState('')

  // HRM Settings for late calculation
  const [hrmSettings, setHrmSettings] = useState<HRMSettings>({
    workStartTime: '09:00',
    workEndTime: '18:00',
    breakDuration: 60,
    gracePeriod: 15,
  })

  useEffect(() => {
    // Set daily quote immediately (no delay)
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
    const quotes = QUOTES.DASHBOARD_QUOTES
    setDailyQuote(quotes[dayOfYear % quotes.length])

    // Fetch all data in parallel (much faster)
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Helper function to format date as YYYY-MM-DD in LOCAL timezone (not UTC)
      const formatDateLocal = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const today = formatDateLocal(new Date())
      // Fetch current month's data (from 1st of current month to today)
      const currentDate = new Date()
      const startDate = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
      const endDate = today
console.log({endDate})
      // Parallel API calls for maximum speed
      const [historyResponse, settingsResponse, staffResponse, deptResponse] = await Promise.all([
        // Fetch current month's attendance with high pagination limit to get all records
        api.get(`/hrm/attendance?start_date=${startDate}&end_date=${endDate}&per_page=1000&page=1`),
        api.get('/system/settings').catch(() => null), // Non-critical, don't fail on error
        isAdmin ? api.get('/hrm/staff').catch(() => null) : Promise.resolve(null),
        isAdmin ? api.get('/hrm/departments').catch(() => null) : Promise.resolve(null),
      ])

      console.log('=== API RESPONSES ===')
      console.log('History response:', historyResponse)
      console.log('Staff response:', staffResponse)
      console.log('Dept response:', deptResponse)

      // Process HRM settings if available
      if (settingsResponse?.data) {
        const groupedSettings = settingsResponse.data
        const hrmSettingsList = groupedSettings.hrm || []

        const settings: HRMSettings = {
          workStartTime: '09:00',
          workEndTime: '18:00',
          breakDuration: 60,
          gracePeriod: 15,
        }

        hrmSettingsList.forEach((item: any) => {
          if (item.key === 'work_start_time') {
            settings.workStartTime = item.value || '09:00'
          } else if (item.key === 'work_end_time') {
            settings.workEndTime = item.value || '18:00'
          } else if (item.key === 'break_duration_minutes') {
            settings.breakDuration = parseInt(item.value) || 60
          } else if (item.key === 'grace_period_minutes') {
            settings.gracePeriod = parseInt(item.value) || 15
          }
        })

        setHrmSettings(settings)
      }

      // Extract attendance data
      let allAttendanceData: any[] = []
      if (historyResponse.data?.data?.data) {
        allAttendanceData = historyResponse.data.data.data
      } else if (historyResponse.data?.data) {
        allAttendanceData = Array.isArray(historyResponse.data.data) ? historyResponse.data.data : []
      }

      console.log('=== DATA EXTRACTION ===')
      console.log('Date range:', { startDate, endDate, today })
      console.log('All attendance data:', allAttendanceData.length, 'records')
      console.log('First 3 records:', allAttendanceData.slice(0, 3))
      console.log('All dates in data:', allAttendanceData.map(a => a.date))

      // Filter today's attendance
      const todayAttendance = allAttendanceData.filter((a: any) => a.date === today)
      console.log('Today attendance filter results:', todayAttendance.length, 'records for', today)

      // Count present employees (both 'present' and 'late' status)
      const presentCount = todayAttendance.filter((a: any) => {
        const status = (a.status || '').toLowerCase()
        return status === 'present' || status === 'late'
      }).length
      const onBreakCount = todayAttendance.filter((a: any) => {
        const breakIns = a.breakIn || a.break_in
        const breakOuts = a.breakOut || a.break_out
        const breakInCount = Array.isArray(breakIns) ? breakIns.length : 0
        const breakOutCount = Array.isArray(breakOuts) ? breakOuts.length : 0
        return breakInCount > breakOutCount
      }).length

      console.log('Dashboard - Stats:', { presentCount, onBreakCount })

      // Build stats object
      const statsData: DashboardStats = {
        total_staff: 0,
        total_departments: 0,
        today_attendance: presentCount,
        on_break: onBreakCount,
        pending_payroll: 0,
      }

      // Process staff data
      if (staffResponse?.data?.data?.data) {
        const staffData = staffResponse.data.data.data
        statsData.total_staff = Array.isArray(staffData) ? staffData.length : 0
      }

      // Process department data
      if (deptResponse?.data?.data) {
        const deptData = deptResponse.data.data
        statsData.total_departments = Array.isArray(deptData) ? deptData.length : 0
      }

      setStats(statsData)

      // Build recent activity from today's attendance
      const activityData: RecentActivity[] = todayAttendance.slice(0, 5).map((a: any) => ({
        id: a.id,
        user_name: a.user?.name || 'Unknown',
        action: (a.clockOut || a.clock_out) ? 'Clocked out' : (a.clockIn || a.clock_in) ? 'Clocked in' : 'No activity',
        timestamp: a.clockIn || a.clock_in || a.date,
      }))
      setRecentActivity(activityData)

      // Extract current user's TODAY attendance from the data we already fetched (no extra API call)
      if (user?.id) {
        const myRecord = allAttendanceData.find((a: any) => {
          const recordUserId = a.userId || a.user_id
          const recordDate = a.date
          return String(recordUserId) === String(user.id) && recordDate === today
        })

        console.log('=== MY ATTENDANCE CHECK ===')
        console.log('Current user ID:', user.id)
        console.log('Today:', today)
        console.log('My record found:', myRecord ? 'YES' : 'NO')
        if (myRecord) {
          console.log('My record data:', myRecord)
        }

        if (myRecord) {
          const normalizedRecord: MyAttendance = {
            id: myRecord.id,
            user_id: myRecord.userId || myRecord.user_id,
            date: myRecord.date,
            clock_in: myRecord.clockIn || myRecord.clock_in,
            clock_out: myRecord.clockOut || myRecord.clock_out,
            break_in: myRecord.breakIn || myRecord.break_in,
            break_out: myRecord.breakOut || myRecord.break_out,
            break_notes: myRecord.breakNotes || myRecord.break_notes,
            status: myRecord.status,
            note: myRecord.note,
          }
          setMyAttendance(normalizedRecord)
        } else {
          setMyAttendance(null)
        }

        // Filter to current user's records for history (current month)
        const userHistory = allAttendanceData
          .filter((a: any) => (a.userId === user.id || a.user_id === user.id))
          .map((record: any) => ({
            id: record.id,
            user_id: record.userId || record.user_id,
            date: record.date,
            clock_in: record.clockIn || record.clock_in,
            clock_out: record.clockOut || record.clock_out,
            break_in: record.breakIn || record.break_in,
            break_out: record.breakOut || record.break_out,
            status: record.status,
            note: record.note,
          }))
          .sort((a: MyAttendance, b: MyAttendance) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setAttendanceHistory(userHistory)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatTime(timeString: string | null | undefined): string {
    if (!timeString) return '--'

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

  // Calculate late time in minutes
  const calculateLateTime = (clockInTime: string): number | null => {
    if (!clockInTime) return null

    // Parse clock in time
    let clockInDate: Date
    if (clockInTime.includes('T') || clockInTime.includes('-')) {
      clockInDate = new Date(clockInTime)
    } else {
      const [hours, minutes] = clockInTime.split(':').map(Number)
      clockInDate = new Date(2000, 0, 1, hours, minutes)
    }

    // Parse work start time
    const [workHours, workMinutes] = hrmSettings.workStartTime.split(':').map(Number)
    const workStartDate = new Date(2000, 0, 1, workHours, workMinutes)

    // Add grace period to work start time
    const workStartWithGrace = new Date(workStartDate.getTime() + hrmSettings.gracePeriod * 60000)

    // Calculate difference in minutes
    const diffMs = clockInDate.getTime() - workStartWithGrace.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    return diffMinutes > 0 ? diffMinutes : null
  }

  // Format late time
  const formatLateTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  // Calculate working hours with overtime
  const calculateWorkingHoursWithOvertime = (
    clockIn: string,
    clockOut?: string,
    breakIns?: string[],
    breakOuts?: string[]
  ): { total: string; overtime: string | null } => {
    if (!clockOut) return { total: '-', overtime: null }

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
        const breakInTime = breakIns[i]
        const breakOutTime = breakOuts[i]

        if (breakInTime && breakOutTime) {
          let breakIn: Date
          let breakOut: Date

          if (breakInTime.includes('T') || breakInTime.includes('-')) {
            breakIn = new Date(breakInTime)
          } else {
            const [hours, minutes] = breakInTime.split(':').map(Number)
            breakIn = new Date(2000, 0, 1, hours, minutes)
          }

          if (breakOutTime.includes('T') || breakOutTime.includes('-')) {
            breakOut = new Date(breakOutTime)
          } else {
            const [hours, minutes] = breakOutTime.split(':').map(Number)
            breakOut = new Date(2000, 0, 1, hours, minutes)
          }

          const breakDuration = breakOut.getTime() - breakIn.getTime()
          totalWorkTime -= breakDuration
        }
      }
    }

    // Calculate total hours worked
    const totalHours = Math.floor(totalWorkTime / (1000 * 60 * 60))
    const totalMinutes = Math.floor((totalWorkTime % (1000 * 60 * 60)) / (1000 * 60))
    const totalFormatted = `${totalHours}h ${totalMinutes}m`

    // Calculate standard working hours (from settings)
    const [workStartHours, workStartMinutes] = hrmSettings.workStartTime.split(':').map(Number)
    const [workEndHours, workEndMinutes] = hrmSettings.workEndTime.split(':').map(Number)

    const workStartDate = new Date(2000, 0, 1, workStartHours, workStartMinutes)
    const workEndDate = new Date(2000, 0, 1, workEndHours, workEndMinutes)

    // Subtract break duration from standard working hours
    const standardWorkTime = workEndDate.getTime() - workStartDate.getTime() - (hrmSettings.breakDuration * 60000)

    // Calculate overtime
    const overtimeWorkTime = totalWorkTime - standardWorkTime

    if (overtimeWorkTime > 0) {
      const overtimeHours = Math.floor(overtimeWorkTime / (1000 * 60 * 60))
      const overtimeMinutes = Math.floor((overtimeWorkTime % (1000 * 60 * 60)) / (1000 * 60))
      return {
        total: totalFormatted,
        overtime: `+${overtimeHours}h ${overtimeMinutes}m ${t('hrm.attendance.tableHeaders.overtime')}`
      }
    }

    return { total: totalFormatted, overtime: null }
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
  const formatBreakTimes = (breakIns: string[] | undefined, breakOuts: string[] | undefined, breakNotes?: string[]) => {
    if (!breakIns || breakIns.length === 0) return '--'

    const ins = Array.isArray(breakIns) ? breakIns : []
    const outs = Array.isArray(breakOuts) ? breakOuts : []
    const notes = Array.isArray(breakNotes) ? breakNotes : []

    return ins.map((breakIn, i) => {
      const inTime = formatTime(breakIn)
      const outTime = i < outs.length ? formatTime(outs[i]) : 'Active'
      const duration = i < outs.length ? calculateBreakDuration(breakIn, outs[i]) : null
      const isActive = i >= outs.length
      const note = notes[i] || null

      return (
        <Group key={i} gap={4} wrap="nowrap">
          <IconCoffee size={14} style={{ color: isActive ? '#f59e0b' : '#6b7280' }} />
          <Text className="text-xs md:text-sm" c="dimmed">
            {inTime} - {outTime}
            {duration && (
              <Text span c="orange" fw={500}> ({duration})</Text>
            )}
            {note && (
              <Text span c="blue" fw={500}> - {note}</Text>
            )}
          </Text>
        </Group>
      )
    })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1}>{t('dashboard.adminTitle')}</Title>
            <Text c="dimmed">{t('dashboard.adminSubtitle')}</Text>
          </Box>
          {dailyQuote && (
            <Paper
              withBorder
              p="md"
              radius="lg"
              maw={450}
              bg="var(--mantine-color-blue-light)"
            >
              <Text size="md" fw={600} lh={1.4} c="var(--mantine-color-blue-filled)">
                "{dailyQuote}"
              </Text>
            </Paper>
          )}
        </Group>

        {/* Stats Cards - Show immediately with loading state */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Card padding="lg" radius="md" withBorder shadow="sm">
            {loading ? (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.totalStaff')}
                  </Text>
                  <Loader size="sm" />
                </Stack>
                <ThemeIcon color="blue" size={40} radius="md">
                  <IconUsers size={24} />
                </ThemeIcon>
              </Group>
            ) : (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.totalStaff')}
                  </Text>
                  <Text size="xl" fw={500}>
                    {stats?.total_staff || 0}
                  </Text>
                </Stack>
                <ThemeIcon color="blue" size={40} radius="md">
                  <IconUsers size={24} />
                </ThemeIcon>
              </Group>
            )}
          </Card>

          <Card padding="lg" radius="md" withBorder shadow="sm">
            {loading ? (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.departments')}
                  </Text>
                  <Loader size="sm" />
                </Stack>
                <ThemeIcon color="cyan" size={40} radius="md">
                  <IconBuilding size={24} />
                </ThemeIcon>
              </Group>
            ) : (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.departments')}
                  </Text>
                  <Text size="xl" fw={500}>
                    {stats?.total_departments || 0}
                  </Text>
                </Stack>
                <ThemeIcon color="cyan" size={40} radius="md">
                  <IconBuilding size={24} />
                </ThemeIcon>
              </Group>
            )}
          </Card>

          <Card padding="lg" radius="md" withBorder shadow="sm">
            {loading ? (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.todayPresent')} - 101
                  </Text>
                  <Loader size="sm" />
                </Stack>
                <ThemeIcon color="green" size={40} radius="md">
                  <IconCalendarClock size={24} />
                </ThemeIcon>
              </Group>
            ) : (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.todayPresent')} - 102
                  </Text>
                  <Text size="xl" fw={500}>
                    {stats?.today_attendance || 0}
                  </Text>
                </Stack>
                <ThemeIcon color="green" size={40} radius="md">
                  <IconCalendarClock size={24} />
                </ThemeIcon>
              </Group>
            )}
          </Card>

          <Card padding="lg" radius="md" withBorder shadow="sm">
            {loading ? (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.onBreak')}
                  </Text>
                  <Loader size="sm" />
                </Stack>
                <ThemeIcon color="yellow" size={40} radius="md">
                  <IconCoffee size={24} />
                </ThemeIcon>
              </Group>
            ) : (
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    {t('dashboard.onBreak')}
                  </Text>
                  <Text size="xl" fw={500}>
                    {stats?.on_break || 0}
                  </Text>
                </Stack>
                <ThemeIcon color="yellow" size={40} radius="md">
                  <IconCoffee size={24} />
                </ThemeIcon>
              </Group>
            )}
          </Card>
        </SimpleGrid>

        {/* My Attendance Actions */}
        <AttendanceActions myAttendance={myAttendance} onRefresh={fetchDashboardData} />

        {/* Today's Status Card */}
        {myAttendance && (
          <Card withBorder p="md" radius="md" shadow="sm">
            <Group justify="space-between" align="flex-start">
              <Box className="flex-1">
                <Text className="text-sm md:text-base" c="dimmed">{t('hrm.attendance.todaysStatus')}</Text>
                <Group mt="xs" wrap="nowrap">
                  <Stack gap={4}>
                    <Badge
                      color={
                        myAttendance.status === 'present' ? 'green' :
                        myAttendance.status === 'late' ? 'yellow' :
                        myAttendance.status === 'absent' ? 'red' :
                        'blue'
                      }
                      className="text-lg md:text-xl lg:text-2xl"
                    >
                      {myAttendance.status.toUpperCase()}
                    </Badge>
                    {myAttendance.status === 'late' && myAttendance.clock_in && (() => {
                      const lateMinutes = calculateLateTime(myAttendance.clock_in)
                      return lateMinutes !== null ? (
                        <Text className="text-xs md:text-sm" c="orange" fw={500}>
                          {formatLateTime(lateMinutes)} late
                        </Text>
                      ) : null
                    })()}
                  </Stack>
                  <Text className="text-lg md:text-xl lg:text-2xl" fw={500}>
                    In: {formatTime(myAttendance.clock_in)}
                  </Text>
                  {myAttendance.clock_out && (
                    <Text className="text-lg md:text-xl lg:text-2xl" fw={500}>
                      Out: {formatTime(myAttendance.clock_out)}
                    </Text>
                  )}
                </Group>
                {myAttendance.break_in && myAttendance.break_in.length > 0 && (
                  <Stack mt="xs" gap={2}>
                    <Text className="text-xs md:text-sm" c="dimmed" fw={500}>{t('hrm.attendance.breaks')}:</Text>
                    <Stack gap={2}>
                      {formatBreakTimes(myAttendance.break_in, myAttendance.break_out, myAttendance.break_notes)}
                    </Stack>
                  </Stack>
                )}
              </Box>
              {myAttendance.clock_in && myAttendance.clock_out && (() => {
                const { total, overtime } = calculateWorkingHoursWithOvertime(
                  myAttendance.clock_in,
                  myAttendance.clock_out,
                  myAttendance.break_in,
                  myAttendance.break_out
                )
                return (
                  <Box>
                    <Text className="text-sm md:text-base" c="dimmed">{t('hrm.attendance.workingHours')}</Text>
                    <Stack gap={4}>
                      <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
                        {total}
                      </Text>
                      {overtime && (
                        <Text className="text-sm md:text-base lg:text-lg" c="green" fw={600}>
                          {overtime}
                        </Text>
                      )}
                    </Stack>
                  </Box>
                )
              })()}
            </Group>
          </Card>
        )}

        {/* Attendance History */}
        <Paper withBorder p="md" radius="lg">
          <Title order={3} mb="md">{t('dashboard.myAttendanceHistory')}</Title>

          {attendanceHistory.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('dashboard.date')}</Table.Th>
                  <Table.Th>{t('dashboard.clockIn')}</Table.Th>
                  <Table.Th>{t('dashboard.clockOut')}</Table.Th>
                  <Table.Th>{t('dashboard.breaks')}</Table.Th>
                  <Table.Th>{t('dashboard.totalHours')}</Table.Th>
                  <Table.Th>{t('dashboard.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {attendanceHistory.map((record) => {
                  // Calculate total hours
                  let totalHours = '--'
                  if (record.clock_in && record.clock_out) {
                    try {
                      // Extract just the date part (YYYY-MM-DD) from the ISO string
                      const dateOnly = record.date.split('T')[0]
                      const clockIn = new Date(`${dateOnly}T${record.clock_in}`)
                      const clockOut = new Date(`${dateOnly}T${record.clock_out}`)

                      if (!isNaN(clockIn.getTime()) && !isNaN(clockOut.getTime())) {
                        const diffMs = clockOut.getTime() - clockIn.getTime()
                        const hours = Math.floor(diffMs / (1000 * 60 * 60))
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                        totalHours = `${hours}h ${minutes}m`
                      }
                    } catch (error) {
                      totalHours = '--'
                    }
                  }

                  // Format break times
                  const breakTimes = []
                  const breakIns = Array.isArray(record.break_in) ? record.break_in : []
                  const breakOuts = Array.isArray(record.break_out) ? record.break_out : []

                  for (let i = 0; i < breakIns.length; i++) {
                    const breakInTime = formatTime(breakIns[i])
                    const breakOutTime = i < breakOuts.length ? formatTime(breakOuts[i]) : t('dashboard.active')
                    breakTimes.push(`${breakInTime} - ${breakOutTime}`)
                  }

                  return (
                    <Table.Tr key={record.id}>
                      <Table.Td fw={500}>{formatDate(record.date)}</Table.Td>
                      <Table.Td>{record.clock_in ? formatTime(record.clock_in) : '--'}</Table.Td>
                      <Table.Td>{record.clock_out ? formatTime(record.clock_out) : '--'}</Table.Td>
                      <Table.Td>
                        {breakTimes.length > 0 ? (
                          <Stack gap={2}>
                            {breakTimes.map((time, idx) => (
                              <Text key={idx} size="sm" c="dimmed">
                                ☕ {time}
                              </Text>
                            ))}
                          </Stack>
                        ) : (
                          <Text c="dimmed">--</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{totalHours}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={record.clock_out ? 'green' : record.clock_in ? 'blue' : 'gray'}
                          variant="light"
                        >
                          {record.clock_out ? t('dashboard.completed') : record.clock_in ? t('dashboard.inProgress') : t('dashboard.noRecord')}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          ) : (
            <Alert variant="light" color="blue" radius="md" icon={<IconAlertCircle size={16} />}>
              {t('dashboard.noAttendanceHistoryLast30Days')}
            </Alert>
          )}
        </Paper>
      </Stack>
    </Box>
  )
}
