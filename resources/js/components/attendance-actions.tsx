import { useState, useEffect } from 'react'
import {
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Overlay,
  Container,
  ThemeIcon,
  Alert,
  Modal,
  Textarea,
} from '@mantine/core'
import {
  IconClock,
  IconClockCheck,
  IconCoffee,
  IconCoffeeOff,
  IconLock,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { useTranslation } from 'react-i18next'

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

interface AttendanceActionsProps {
  myAttendance: MyAttendance | null
  onRefresh: () => void
}

export default function AttendanceActions({ myAttendance, onRefresh }: AttendanceActionsProps) {
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState(false)
  const [breakDuration, setBreakDuration] = useState(0)
  const [breakModalOpened, setBreakModalOpened] = useState(false)
  const [breakNote, setBreakNote] = useState('')
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null)

  // Update break duration every second when on break or modal is open
  useEffect(() => {
    const breakIns = Array.isArray(myAttendance?.break_in) ? myAttendance.break_in : []
    const breakOuts = Array.isArray(myAttendance?.break_out) ? myAttendance.break_out : []
    const isOnBreak = myAttendance?.clock_in && !myAttendance?.clock_out && breakIns.length > breakOuts.length

    // Use breakStartTime from modal if open, otherwise use last break_in from database
    const timeSource = breakModalOpened && breakStartTime ? breakStartTime : (isOnBreak && breakIns.length > 0 ? breakIns[breakIns.length - 1] : null)

    if (!timeSource) {
      setBreakDuration(0)
      return
    }

    // Parse the break_in time - could be full ISO or just HH:MM:SS
    let breakInTime: Date
    if (timeSource.includes('T') || timeSource.includes('-')) {
      // Full datetime string - use as-is
      breakInTime = new Date(timeSource)
    } else {
      // Time only (HH:MM:SS) - create local date to avoid timezone issues
      const [hours, minutes, seconds] = timeSource.split(':').map(Number)
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
  }, [myAttendance, breakModalOpened, breakStartTime])

  const handleClockIn = async () => {
    try {
      setActionLoading(true)
      await api.post('/hrm/clock-in')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.clockedIn', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
    } catch (error: unknown) {
      let errorMessage = t('dashboard.errors.clockInFailed')
      if (error && typeof error === 'object' && 'response' in error) {
        errorMessage = (error as any).response?.data?.message || errorMessage
      }
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setActionLoading(false)
      // Always refresh attendance data, even if there was an error
      // (User might already be clocked in from a previous action)
      await onRefresh()
    }
  }

  const handleBreakIn = async () => {
    // Record the break start time locally (NOT saved to DB yet)
    const now = new Date()
    setBreakStartTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))

    // Just open modal - don't call API yet
    setBreakModalOpened(true)
  }

  const submitBreakIn = async () => {
    if (!breakNote.trim()) {
      notifications.show({
        title: t('common.warning'),
        message: 'Please enter a break note',
        color: 'yellow',
      })
      return
    }

    // Now save the break to database with the actual start time (when modal opened) and note
    try {
      setActionLoading(true)

      // Use the breakStartTime captured when modal opened
      const startTime = breakStartTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

      await api.post('/hrm/break-in', {
        note: breakNote.trim(),
        break_time: startTime // Send the exact time when modal opened
      })

      setBreakModalOpened(false)
      setBreakNote('')
      // Don't clear breakStartTime yet - we need it for timer continuity
      // It will be cleared when break ends or on next refresh

      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.breakStarted', { time: startTime }),
        color: 'green',
      })
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
      setBreakStartTime(null)
    } finally {
      setActionLoading(false)
      // Only refresh if successfully saved
      await onRefresh()
    }
  }

  const handleBreakOut = async () => {
    try {
      setActionLoading(true)
      await api.post('/hrm/break-out')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.breakEnded', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
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
      setActionLoading(false)
      // Always refresh attendance data
      await onRefresh()
    }
  }

  const handleClockOut = async () => {
    try {
      setActionLoading(true)
      await api.post('/hrm/clock-out')
      notifications.show({
        title: t('common.success'),
        message: t('dashboard.success.clockedOut', { time: new Date().toLocaleTimeString() }),
        color: 'green',
      })
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
      setActionLoading(false)
      // Always refresh attendance data
      await onRefresh()
    }
  }

  function formatTime(timeString: string): string {
    if (!timeString) return '--:--'

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

  function formatBreakDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const formatNum = (num: number) => num.toString().padStart(2, '0')

    if (hours > 0) {
      return `${formatNum(hours)}:${formatNum(minutes)}:${formatNum(secs)}`
    }
    return `${formatNum(minutes)}:${formatNum(secs)}`
  }

  return (
    <>
      <Paper withBorder p="md" radius="lg">
        <Group justify="space-between" align="center">
          <Group gap={0}>
            <Stack gap={0}>
              <Title order={3} mb={0}>{t('dashboard.myAttendanceActions')}</Title>
              <Text size="sm" c="dimmed">
                {myAttendance ? (
                  <>
                    {myAttendance.clock_in && <>{t('dashboard.clockedInAt', { time: formatTime(myAttendance.clock_in) })}</>}
                    {myAttendance.clock_out && <> • {t('dashboard.clockedOutAt', { time: formatTime(myAttendance.clock_out) })}</>}
                  </>
                ) : (
                  <>{t('dashboard.noAttendanceToday')}</>
                )}
              </Text>
            </Stack>
          </Group>
          <Group>
            {!myAttendance?.clock_in ? (
              // Not clocked in yet - show Clock In button
              <Button
                leftSection={<IconClock size={16} />}
                onClick={handleClockIn}
                loading={actionLoading}
                color="green"
                size="lg"
              >
                {t('dashboard.clockIn')}
              </Button>
            ) : myAttendance?.clock_out ? (
              // Clocked out - show completed button
              <Button
                leftSection={<IconClockCheck size={16} />}
                disabled
                size="lg"
                variant="light"
              >
                {t('dashboard.completedForToday')}
              </Button>
            ) : (
              // Clocked in but not clocked out - check if on break
              (() => {
                const breakInCount = Array.isArray(myAttendance?.break_in) ? myAttendance.break_in.length : 0
                const breakOutCount = Array.isArray(myAttendance?.break_out) ? myAttendance.break_out.length : 0
                const isOnBreak = breakInCount > breakOutCount

                if (isOnBreak) {
                  // Currently on break - show Break Out button
                  return (
                    <Button
                      leftSection={<IconCoffeeOff size={16} />}
                      onClick={handleBreakOut}
                      loading={actionLoading}
                      color="orange"
                      size="lg"
                    >
                      {t('dashboard.endBreak')}
                    </Button>
                  )
                } else {
                  // Not on break - show both Take Break AND Clock Out buttons
                  return (
                    <>
                      <Button
                        leftSection={<IconCoffee size={16} />}
                        onClick={handleBreakIn}
                        loading={actionLoading}
                        color="yellow"
                        size="lg"
                        variant="light"
                      >
                        {t('dashboard.takeBreak')}
                      </Button>
                      <Button
                        leftSection={<IconClockCheck size={16} />}
                        onClick={handleClockOut}
                        loading={actionLoading}
                        color="red"
                        size="lg"
                      >
                        {t('dashboard.clockOut')}
                      </Button>
                    </>
                  )
                }
              })()
            )}
          </Group>
        </Group>
      </Paper>

      {/* Break Overlay - Shows when user is on break */}
      {(() => {
        const breakInCount = Array.isArray(myAttendance?.break_in) ? myAttendance.break_in.length : 0
        const breakOutCount = Array.isArray(myAttendance?.break_out) ? myAttendance.break_out.length : 0
        const isOnBreak = myAttendance?.clock_in && !myAttendance?.clock_out && breakInCount > breakOutCount

        // Don't show overlay if modal is open (modal is on top)
        if (!isOnBreak || breakModalOpened) return null

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
                  {(() => {
                    const breakInCount = Array.isArray(myAttendance?.break_in) ? myAttendance.break_in.length : 0
                    const breakNotes = Array.isArray(myAttendance?.break_notes) ? myAttendance.break_notes : []
                    const currentBreakNote = breakInCount > 0 && breakNotes.length >= breakInCount ? breakNotes[breakInCount - 1] : null

                    return currentBreakNote ? (
                      <Text c="white" size="md" mt="sm" fw={500} style={{
                        background: 'rgba(249, 115, 22, 0.2)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                      }}>
                        {currentBreakNote}
                      </Text>
                    ) : null
                  })()}
                  {myAttendance?.clock_in && (
                    <Text c="yellow" size="sm" mt="md">
                      {t('dashboard.clockedInAt', { time: formatTime(myAttendance.clock_in) })}
                    </Text>
                  )}
                </Stack>

                <Button
                  leftSection={<IconCoffeeOff size={20} />}
                  onClick={handleBreakOut}
                  loading={actionLoading}
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

      {/* Break Note Modal */}
      <Modal
        opened={breakModalOpened}
        onClose={() => {
          // User closed modal without confirming - cancel the break completely
          setBreakModalOpened(false)
          setBreakNote('')
          setBreakStartTime(null) // Clear the captured start time
        }}
        title={t('dashboard.takeBreak')}
        centered
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Your break has started! Please enter a note for your break (e.g., Lunch break, Coffee break, Personal break)
          </Text>
          <Textarea
            label="Break Note"
            placeholder="Enter break note..."
            value={breakNote}
            onChange={(e) => setBreakNote(e.currentTarget.value)}
            required
            minRows={3}
            autosize
            autoFocus
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                // Cancel the break - just close modal and reset
                setBreakModalOpened(false)
                setBreakNote('')
                setBreakStartTime(null)
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={submitBreakIn}
              loading={actionLoading}
              color="yellow"
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
