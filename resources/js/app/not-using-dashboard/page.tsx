import { useState, useEffect } from 'react'
import { Paper, Text, Title, Box, Stack, Group, Button, Alert, Table, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconClock, IconClockCheck, IconLogout, IconCoffee, IconCoffeeOff } from '@tabler/icons-react'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

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
  const [loading, setLoading] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])

  useEffect(() => {
    if (user?.id) {
      fetchTodayAttendance()
      fetchAttendanceHistory()
    }
  }, [user?.id])

  if (!user) {
    return (
      <Box p="xl">
        <Text>Loading...</Text>
      </Box>
    )
  }

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.get(`/hrm/attendance?start_date=${today}&end_date=${today}&user_id=${user.id}`)

      if (response.data?.data?.data && response.data.data.data.length > 0) {
        setTodayAttendance(response.data.data.data[0])
      }
    } catch (error) {
    }
  }

  const fetchAttendanceHistory = async () => {
    try {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

      const response = await api.get(`/hrm/attendance?start_date=${startOfMonth}&end_date=${endOfMonth}&user_id=${user.id}`)

      if (response.data?.data?.data) {
        setAttendanceHistory(response.data.data.data)
      }
    } catch (err) {
    }
  }

  const handleClockIn = async () => {
    try {
      setLoading(true)
      await api.post('/hrm/clock-in')
      notifications.show({
        title: 'Success',
        message: 'Clocked in successfully at ' + new Date().toLocaleTimeString(),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = 'Failed to clock in'
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
        // If already clocked in, fetch attendance
        if (errorMessage.includes('Already clocked in')) {
          fetchTodayAttendance()
          fetchAttendanceHistory()
        }
      }
      notifications.show({
        title: 'Error',
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
        title: 'Success',
        message: 'Clocked out successfully at ' + new Date().toLocaleTimeString(),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = 'Failed to clock out'
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: 'Error',
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
        title: 'Success',
        message: 'Break started at ' + new Date().toLocaleTimeString(),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = 'Failed to start break'
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: 'Error',
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
        title: 'Success',
        message: 'Break ended at ' + new Date().toLocaleTimeString(),
        color: 'green',
      })
      fetchTodayAttendance()
      fetchAttendanceHistory()
    } catch (error: unknown) {
      let errorMessage = 'Failed to end break'
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: 'Error',
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        <Box>
          <Title order={1}>Dashboard</Title>
          <Text c="dimmed">Welcome back, {user?.name}</Text>
        </Box>

        {/* Today's Attendance */}
        <Alert variant="light" color="blue" radius="lg" p="md">
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Text fw={600} size="lg">Today's Attendance</Text>
              {todayAttendance ? (
                <Text size="sm" c="dimmed">
                  {todayAttendance.clock_in && (
                    <>Clocked in at: {formatTime(todayAttendance.clock_in)}</>
                  )}
                  {todayAttendance.clock_out && (
                    <> • Clocked out at: {formatTime(todayAttendance.clock_out)}</>
                  )}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">No attendance recorded for today</Text>
              )}
            </Stack>
            <Group>
              {!todayAttendance?.clock_in ? (
                // Not clocked in yet - show Clock In button
                <Button
                  leftSection={<IconClock size={16} />}
                  onClick={handleClockIn}
                  loading={loading}
                  color="green"
                  size="lg"
                >
                  Clock In
                </Button>
              ) : todayAttendance?.clock_out ? (
                // Clocked out - show completed button
                <Button
                  leftSection={<IconLogout size={16} />}
                  disabled
                  size="lg"
                  variant="light"
                >
                  Completed for Today
                </Button>
              ) : (
                // Clocked in but not clocked out
                <>
                  {(() => {
                    // Check if currently on break
                    const breakInCount = Array.isArray(todayAttendance?.break_in) ? todayAttendance.break_in.length : 0
                    const breakOutCount = Array.isArray(todayAttendance?.break_out) ? todayAttendance.break_out.length : 0
                    const isOnBreak = breakInCount > breakOutCount

                    if (isOnBreak) {
                      // Currently on break - show Break Out button
                      return (
                        <Button
                          leftSection={<IconCoffeeOff size={16} />}
                          onClick={handleBreakOut}
                          loading={loading}
                          color="orange"
                          size="lg"
                        >
                          End Break
                        </Button>
                      )
                    } else {
                      // Not on break - show Break In and Clock Out buttons
                      return (
                        <>
                          <Button
                            leftSection={<IconCoffee size={16} />}
                            onClick={handleBreakIn}
                            loading={loading}
                            color="yellow"
                            size="lg"
                            variant="light"
                          >
                            Take Break
                          </Button>
                          <Button
                            leftSection={<IconClockCheck size={16} />}
                            onClick={handleClockOut}
                            loading={loading}
                            color="red"
                            size="lg"
                          >
                            Clock Out
                          </Button>
                        </>
                      )
                    }
                  })()}
                </>
              )}
            </Group>
          </Group>
        </Alert>

        {/* Attendance History Table */}
        <Paper withBorder p="md" radius="lg">
          <Title order={3} mb="md">Attendance History (This Month)</Title>

          {attendanceHistory.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Clock In</Table.Th>
                  <Table.Th>Clock Out</Table.Th>
                  <Table.Th>Breaks</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Note</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {attendanceHistory.map((record) => {
                  const breakCount = Array.isArray(record.break_in) ? record.break_in.length : 0
                  return (
                    <Table.Tr key={record.id}>
                      <Table.Td>{formatDate(record.date)}</Table.Td>
                      <Table.Td>{formatTime(record.clock_in)}</Table.Td>
                      <Table.Td>{formatTime(record.clock_out)}</Table.Td>
                      <Table.Td>{breakCount > 0 ? `${breakCount} break(s)` : '-'}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            record.status === 'present' ? 'green' :
                            record.status === 'late' ? 'yellow' :
                            'gray'
                          }
                        >
                          {record.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{record.note || '-'}</Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" ta="center">No attendance history found</Text>
          )}
        </Paper>
      </Stack>
    </Box>
  )
}
