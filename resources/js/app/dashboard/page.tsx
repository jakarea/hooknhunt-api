import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Paper,
  Text,
  Title,
  Box,
  Stack,
  Group,
  Button,
  Alert,
  Table,
  Badge,
  Overlay,
  Container,
  ThemeIcon,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconClock, IconClockCheck, IconCoffee, IconCoffeeOff, IconLock } from '@tabler/icons-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { QUOTES } from '@/config/quotes'
import i18n from '@/lib/i18n'

interface Attendance {
  id: number
  user_id: number
  date: string
  clock_in: string
  clock_out?: string | null
  break_in?: string[]
  break_out?: string[]
  status: string
  note?: string | null
  current_status?: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [dailyQuote, setDailyQuote] = useState('')
  const [breakDuration, setBreakDuration] = useState(0)

  useEffect(() => {
    if (user?.id) {
      fetchTodayAttendance()
      fetchAttendanceHistory()
    }
    // Set daily quote based on day of year
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
    const quotes = QUOTES.DASHBOARD_QUOTES
    setDailyQuote(quotes[dayOfYear % quotes.length])
  }, [user?.id])

  // Update break duration every second when on break
  useEffect(() => {
    const breakIns = Array.isArray(todayAttendance?.break_in) ? todayAttendance.break_in : []
    const breakOuts = Array.isArray(todayAttendance?.break_out) ? todayAttendance.break_out : []
    const isOnBreak = todayAttendance?.clock_in && !todayAttendance?.clock_out && breakIns.length > breakOuts.length

    if (!isOnBreak || breakIns.length === 0) {
      setBreakDuration(0)
      return
    }

    // Get the most recent break_in time
    const lastBreakIn = breakIns[breakIns.length - 1]

    if (!lastBreakIn) {
      setBreakDuration(0)
      return
    }

    // Parse the break_in time - could be full ISO or just HH:MM:SS
    let breakInTime: Date
    if (lastBreakIn.includes('T') || lastBreakIn.includes('-')) {
      // Full datetime string - use as-is
      breakInTime = new Date(lastBreakIn)
    } else {
      // Time only (HH:MM:SS) - create local date to avoid timezone issues
      const [hours, minutes, seconds] = lastBreakIn.split(':').map(Number)
      breakInTime = new Date()
      breakInTime.setHours(hours, minutes, seconds || 0, 0)
    }

    // Validate the date
    if (isNaN(breakInTime.getTime())) {
      setBreakDuration(0)
      return
    }

    // Calculate initial duration
    const updateDuration = () => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - breakInTime.getTime()) / 1000)
      setBreakDuration(diff > 0 ? diff : 0)
    }

    // Update immediately and then every second
    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [todayAttendance])

  if (!user) {
    return (
      <Box p="xl">
        <Text>{t('roles.loading')}</Text>
      </Box>
    )
  }

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      // Fetch all attendance and filter to avoid permission issues
      const response = await api.get(`/hrm/attendance?start_date=${today}&end_date=${today}`)

      let attendanceData = []
      if (response.data?.data?.data) {
        attendanceData = response.data.data.data
      } else if (response.data?.data) {
        attendanceData = Array.isArray(response.data.data) ? response.data.data : []
      }

      // Find my attendance - API returns camelCase
      const myRecord = attendanceData.find((a: any) => a.userId === user.id || a.user_id === user.id)

      if (myRecord) {
        // Convert camelCase to snake_case
        setTodayAttendance({
          id: myRecord.id,
          user_id: myRecord.userId || myRecord.user_id,
          date: myRecord.date,
          clock_in: myRecord.clockIn || myRecord.clock_in,
          clock_out: myRecord.clockOut || myRecord.clock_out,
          break_in: myRecord.breakIn || myRecord.break_in,
          break_out: myRecord.breakOut || myRecord.break_out,
          status: myRecord.status,
          note: myRecord.note,
          current_status: myRecord.currentStatus,
        })
      } else {
        setTodayAttendance(null)
      }
    } catch (error) {
      setTodayAttendance(null)
    }
  }

  const fetchAttendanceHistory = async () => {
    try {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

      const response = await api.get(`/hrm/attendance?start_date=${startOfMonth}&end_date=${endOfMonth}`)

      let historyData = []
      if (response.data?.data?.data) {
        historyData = response.data.data.data
      } else if (response.data?.data) {
        historyData = Array.isArray(response.data.data) ? response.data.data : []
      }

      // Filter to current user's records and normalize camelCase
      const userHistory = historyData
        .filter((a: any) => a.userId === user.id || a.user_id === user.id)
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
          current_status: record.currentStatus,
        }))

      setAttendanceHistory(userHistory)
    } catch (err) {
    }
  }

  const handleClockIn = async () => {
    try {
      setLoading(true)
      await api.post('/hrm/clock-in')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.clockedIn', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = t('dashboard.errors.clockInFailed')
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
        // If already clocked in, fetch attendance
        if (errorMessage.includes('Already clocked in')) {
          fetchTodayAttendance()
          fetchAttendanceHistory()
        }
      }
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    try {
      setLoading(true)
      await api.post('/hrm/clock-out')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.clockedOut', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = t('dashboard.errors.clockOutFailed')
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBreakIn = async () => {
    try {
      setLoading(true)
      await api.post('/hrm/break-in')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.breakStarted', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = t('dashboard.errors.breakStartFailed')
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBreakOut = async () => {
    try {
      setLoading(true)
      await api.post('/hrm/break-out')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.breakEnded', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = t('dashboard.errors.breakEndFailed')
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  function formatTime(timeString: string | null | undefined): string {
    if (!timeString) return '--:--'

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

  function calculateBreakDuration(breakIn: string, breakOut: string | null | undefined): string {
    if (!breakIn || !breakOut) return '--:--'

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


      if (totalMinutes <= 0) return '--:--'

      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    } catch (error) {
      console.error('Error calculating duration:', error)
      return '--:--'
    }
  }

  function formatBreakDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // Convert to Bengali numerals if language is Bengali
    const toBengaliNumerals = (num: number) => {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
      return num.toString().split('').map(digit => {
        const num = parseInt(digit, 10)
        return isNaN(num) ? digit : bengaliDigits[num]
      }).join('')
    }

    const formatNum = (num: number) => {
      const str = num.toString().padStart(2, '0')
      return i18n.language === 'bn' ? toBengaliNumerals(num) : str
    }

    if (hours > 0) {
      return `${formatNum(hours)}:${formatNum(minutes)}:${formatNum(secs)}`
    }
    return `${formatNum(minutes)}:${formatNum(secs)}`
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1}>{t('dashboard.title')}</Title>
            <Text c="dimmed">{t('dashboard.welcomeBack', { name: user?.name })}</Text>
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

        {/* Today's Attendance */}
        <Alert variant="light" color="blue" radius="lg" p="md">
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Text fw={600} size="lg">{t('dashboard.todaysAttendance')}</Text>
              {todayAttendance ? (
                <Text size="sm" c="dimmed">
                  {todayAttendance.clock_in && (
                    <>{t('dashboard.clockedInAt', { time: formatTime(todayAttendance.clock_in) })}</>
                  )}
                  {todayAttendance.clock_out && (
                    <> • {t('dashboard.clockedOutAt', { time: formatTime(todayAttendance.clock_out) })}</>
                  )}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">{t('dashboard.noAttendanceToday')}</Text>
              )}
            </Stack>
            <Group>
              <Button
                leftSection={<IconClock size={16} />}
                onClick={handleClockIn}
                loading={loading}
                color="green"
                size="lg"
              >
                {t('dashboard.clockIn')}
              </Button>
              <Button
                leftSection={<IconCoffee size={16} />}
                onClick={handleBreakIn}
                loading={loading}
                color="yellow"
                size="lg"
                variant="light"
              >
                {t('dashboard.breakIn')}
              </Button>
              <Button
                leftSection={<IconCoffeeOff size={16} />}
                onClick={handleBreakOut}
                loading={loading}
                color="orange"
                size="lg"
                variant="light"
              >
                {t('dashboard.breakOut')}
              </Button>
              <Button
                leftSection={<IconClockCheck size={16} />}
                onClick={handleClockOut}
                loading={loading}
                color="red"
                size="lg"
              >
                {t('dashboard.clockOut')}
              </Button>
            </Group>
          </Group>
        </Alert>

        {/* Attendance History Table */}
        <Paper withBorder p="md" radius="lg">
          <Title order={3} mb="md">{t('dashboard.attendanceHistory')}</Title>

          {attendanceHistory.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('dashboard.date')}</Table.Th>
                  <Table.Th>{t('dashboard.clockIn')}</Table.Th>
                  <Table.Th>{t('dashboard.clockOut')}</Table.Th>
                  <Table.Th>{t('dashboard.breaks')}</Table.Th>
                  <Table.Th>{t('dashboard.status')}</Table.Th>
                  <Table.Th>{t('dashboard.note')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {attendanceHistory.map((record) => {
                  // Format break times with duration
                  const breakTimes = []
                  const breakIns = Array.isArray(record.break_in) ? record.break_in : []
                  const breakOuts = Array.isArray(record.break_out) ? record.break_out : []


                  for (let i = 0; i < breakIns.length; i++) {
                    const breakInTime = formatTime(breakIns[i])
                    const breakOutTime = i < breakOuts.length ? formatTime(breakOuts[i]) : t('dashboard.active')
                    const duration = i < breakOuts.length ? calculateBreakDuration(breakIns[i], breakOuts[i]) : null
                    breakTimes.push(`${breakInTime} - ${breakOutTime} ${duration ? `: ${duration}` : ''}`)
                  }

                  return (
                    <Table.Tr key={record.id}>
                      <Table.Td>{formatDate(record.date)}</Table.Td>
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
                      <Table.Td>
                        <Badge
                          color={
                            record.status === 'present' ? 'green' :
                            record.status === 'late' ? 'yellow' :
                            'gray'
                          }
                        >
                          {t(`dashboard.${record.status}`)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{record.note || '-'}</Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" ta="center">{t('dashboard.noAttendanceHistory')}</Text>
          )}
        </Paper>

        {/* Break Overlay - Shows when user is on break */}
        {(() => {
          const breakInCount = Array.isArray(todayAttendance?.break_in) ? todayAttendance.break_in.length : 0
          const breakOutCount = Array.isArray(todayAttendance?.break_out) ? todayAttendance.break_out.length : 0
          const isOnBreak = todayAttendance?.clock_in && !todayAttendance?.clock_out && breakInCount > breakOutCount

          if (!isOnBreak) return null

          return (
            <Overlay
              color="#000"
              backgroundOpacity={0.85}
              zIndex={1000}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Container size="sm" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack align="center" gap="xl" maw={600}>
                  <ThemeIcon color="yellow" size={80} radius="50%">
                    <IconCoffee size={40} />
                  </ThemeIcon>

                  <Stack align="center" gap={0}>
                    <Title order={1} c="white">{t('dashboard.youreOnBreak')}</Title>
                    <Text c="dimmed" size="lg" ta="center">
                      {t('dashboard.breakMessage')}
                    </Text>
                    {todayAttendance?.clock_in && (
                      <Text c="yellow" size="sm" mt="md">
                        {t('dashboard.clockedInAt', { time: formatTime(todayAttendance.clock_in) })}
                      </Text>
                    )}
                  </Stack>

                  {/* Daily Quote - Relaxing Design */}
                  {dailyQuote && (
                    <Paper
                      p="lg"
                      radius="lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <Stack align="center" gap="xs">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          💭 {t('dashboard.quoteOfTheDay')}
                        </Text>
                        <Text size="xl" fw={600} ta="center" lh={1.4} style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                          "{dailyQuote}"
                        </Text>
                      </Stack>
                    </Paper>
                  )}

                  <Button
                    leftSection={<IconCoffeeOff size={20} />}
                    onClick={handleBreakOut}
                    loading={loading}
                    color="orange"
                    size="xl"
                    radius="xl"
                  >
                    {t('dashboard.endBreak')}
                  </Button>

                  {/* Break Timer */}
                  <Paper
                    p="lg"
                    radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(249, 115, 22, 0.3)',
                      boxShadow: '0 0 30px rgba(249, 115, 22, 0.2)',
                    }}
                  >
                    <Stack align="center" gap="xs">
                      <Text size="sm" c="orange" fw={600} tt="uppercase">
                        ⏱️ {t('dashboard.breakDuration')}
                      </Text>
                      <Text
                        size="48px"
                        fw={900}
                        style={{
                          fontFamily: 'monospace',
                          color: '#ffffff',
                          textShadow: '0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4)',
                          letterSpacing: '4px',
                          lineHeight: 1,
                        }}
                      >
                        {formatBreakDuration(breakDuration)}
                      </Text>
                      <Text size="xs" c="dimmed" mt="xs">
                        {t('dashboard.hoursMinutesSeconds')}
                      </Text>
                    </Stack>
                  </Paper>

                  <Alert variant="light" color="yellow" radius="md" w="100%">
                    <Group gap="xs">
                      <IconLock size={16} />
                      <Text size="sm">
                        {t('dashboard.systemLocked')}
                      </Text>
                    </Group>
                  </Alert>
                </Stack>
              </Container>
            </Overlay>
          )
        })()}
      </Stack>
    </Box>
  )
}
