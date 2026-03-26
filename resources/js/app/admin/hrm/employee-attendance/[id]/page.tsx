import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Card,
  Table,
  LoadingOverlay,
  Select,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconArrowLeft, IconCalendar, IconDownload } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'

interface AttendanceRecord {
  id: number
  user_id: number
  date: string
  clock_in: string
  clock_out?: string
  break_in?: string[]
  break_out?: string[]
  break_notes?: string[]
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
  note?: string
  user?: {
    id: number
    name: string
  }
}

type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'

interface HRMSettings {
  workStartTime: string
  workEndTime: string
  breakDuration: number
  gracePeriod: number
}

export default function EmployeeAttendancePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [employeeName, setEmployeeName] = useState('')
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today')
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().slice(0, 10))

  // Helper function to get date range based on preset
  const getDateRange = (): { start: string; end: string } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    switch (dateRangePreset) {
      case 'today':
        return {
          start: formatDate(today),
          end: formatDate(today),
        }
      case 'this_week':
        const dayOfWeek = today.getDay()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - dayOfWeek)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return {
          start: formatDate(startOfWeek),
          end: formatDate(endOfWeek),
        }
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return {
          start: formatDate(startOfMonth),
          end: formatDate(endOfMonth),
        }
      case 'this_year':
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        return {
          start: formatDate(startOfYear),
          end: formatDate(endOfYear),
        }
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate,
        }
      default:
        return {
          start: formatDate(today),
          end: formatDate(today),
        }
    }
  }

  const [dateRange, setDateRange] = useState(getDateRange())

  // HRM Settings for calculations
  const [hrmSettings, setHrmSettings] = useState<HRMSettings>({
    workStartTime: '09:00',
    workEndTime: '18:00',
    breakDuration: 60,
    gracePeriod: 15,
  })

  // Fetch HRM settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/system/settings')
        const groupedSettings = response.data
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
      } catch (error: unknown) {
        console.error('Failed to fetch HRM settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // Fetch employee attendance
  useEffect(() => {
    if (!id) return

    const fetchAttendance = async () => {
      try {
        setLoading(true)
        const params: Record<string, string> = {
          user_id: id,
        }

        const currentRange = getDateRange()
        if (currentRange.start && currentRange.end) {
          params.start_date = currentRange.start
          params.end_date = currentRange.end
        }

        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter
        }

        const response = await api.get('/hrm/attendance', { params })
        console.log('Employee attendance response:', response.data)

        // Handle different response structures
        let attendanceData = response.data?.data?.data || response.data?.data || response.data || []

        // If it's an object with data property
        if (attendanceData.data && Array.isArray(attendanceData.data)) {
          attendanceData = attendanceData.data
        }

        console.log('Normalized attendance data:', attendanceData)

        const normalizedAttendance = (Array.isArray(attendanceData) ? attendanceData : []).map((record: any) => ({
          id: record.id,
          user_id: record.userId || record.user_id,
          date: record.date,
          clock_in: record.clockIn || record.clock_in,
          clock_out: record.clockOut || record.clock_out,
          break_in: record.breakIn || record.break_in,
          break_out: record.breakOut || record.break_out,
          break_notes: record.breakNotes || record.break_notes,
          status: record.status,
          note: record.note,
          user: record.user,
        }))

        setAttendance(normalizedAttendance)

        // Set employee name from first record or fetch separately
        if (normalizedAttendance.length > 0 && normalizedAttendance[0].user) {
          setEmployeeName(normalizedAttendance[0].user.name)
        } else {
          // Fetch employee name if no attendance records
          try {
            const userResponse = await api.get(`/hrm/staff/${id}`)
            // API returns { data: { user: {...} } }
            const userData = userResponse.data?.data?.user || userResponse.data?.data || {}
            setEmployeeName(userData.name || userData.first_name || 'Employee')
          } catch (err) {
            console.error('Failed to fetch employee name:', err)
            setEmployeeName('Employee')
          }
        }
      } catch (error: unknown) {
        console.error('Failed to fetch attendance:', error)
        notifications.show({
          title: t('common.error'),
          message: t('hrm.attendance.error.loadFailed'),
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [id, dateRangePreset, customStartDate, customEndDate, statusFilter])

  // Calculate late time
  const calculateLateTime = (clockInTime: string): number | null => {
    if (!clockInTime) return null

    let clockInDate: Date
    if (clockInTime.includes('T') || clockInTime.includes('-')) {
      clockInDate = new Date(clockInTime)
    } else {
      const [hours, minutes] = clockInTime.split(':').map(Number)
      clockInDate = new Date(2000, 0, 1, hours, minutes)
    }

    const [workHours, workMinutes] = hrmSettings.workStartTime.split(':').map(Number)
    const workStartDate = new Date(2000, 0, 1, workHours, workMinutes)
    const workStartWithGrace = new Date(workStartDate.getTime() + hrmSettings.gracePeriod * 60000)

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

    const totalHours = Math.floor(totalWorkTime / (1000 * 60 * 60))
    const totalMinutes = Math.floor((totalWorkTime % (1000 * 60 * 60)) / (1000 * 60))
    const totalFormatted = `${totalHours}h ${totalMinutes}m`

    // Calculate standard working hours
    const [workStartHours, workStartMinutes] = hrmSettings.workStartTime.split(':').map(Number)
    const [workEndHours, workEndMinutes] = hrmSettings.workEndTime.split(':').map(Number)

    const workStartDate = new Date(2000, 0, 1, workStartHours, workStartMinutes)
    const workEndDate = new Date(2000, 0, 1, workEndHours, workEndMinutes)
    const standardWorkTime = workEndDate.getTime() - workStartDate.getTime() - (hrmSettings.breakDuration * 60000)

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

  // Format time
  const formatTime = (timeString: string | null | undefined): string => {
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

  // Download as CSV
  const downloadCSV = () => {
    if (attendance.length === 0) {
      notifications.show({
        title: t('common.warning'),
        message: 'No data to export',
        color: 'yellow',
      })
      return
    }

    // CSV Headers
    const headers = [
      'Date',
      'Clock In',
      'Clock Out',
      'Breaks',
      'Working Hours',
      'Status',
      'Note',
    ]

    // CSV Data
    const csvData = attendance.map((record) => {
      const { total, overtime } = calculateWorkingHoursWithOvertime(
        record.clock_in,
        record.clock_out,
        record.break_in,
        record.break_out
      )

      const breaks = record.break_in && record.break_in.length > 0
        ? `${record.break_in.length} breaks`
        : '0'

      return [
        new Date(record.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        formatTime(record.clock_in),
        formatTime(record.clock_out),
        breaks,
        total,
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
        record.note || '',
      ].join(',')
    })

    // Combine headers and data
    const csvContent = [headers.join(','), ...csvData].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${employeeName.replace(/\s+/g, '_')}_attendance_${dateRange.start}_to_${dateRange.end}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    notifications.show({
      title: t('common.success'),
      message: 'Attendance report downloaded successfully',
      color: 'green',
    })
  }

  // Download as PDF
  const downloadPDF = () => {
    if (attendance.length === 0) {
      notifications.show({
        title: t('common.warning'),
        message: 'No data to export',
        color: 'yellow',
      })
      return
    }

    // Create a simple HTML table for PDF
    const tableContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .present { color: green; font-weight: bold; }
            .late { color: orange; font-weight: bold; }
            .absent { color: red; font-weight: bold; }
            .leave { color: blue; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Attendance Report: ${employeeName}</h1>
          <p><strong>Date Range:</strong> ${dateRange.start === dateRange.end ? dateRange.start : `${dateRange.start} to ${dateRange.end}`}</p>
          <p><strong>Present Days:</strong> ${attendance.filter((a) => a.status === 'present' || a.status === 'late').length} |
             <strong>Late Days:</strong> ${attendance.filter((a) => a.status === 'late').length} |
             <strong>Absent Days:</strong> ${attendance.filter((a) => a.status === 'absent').length} |
             <strong>Leave Days:</strong> ${attendance.filter((a) => a.status === 'leave').length}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Breaks</th>
                <th>Working Hours</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.map((record) => {
                const { total, overtime } = calculateWorkingHoursWithOvertime(
                  record.clock_in,
                  record.clock_out,
                  record.break_in,
                  record.break_out
                )

                const breaks = record.break_in && record.break_in.length > 0
                  ? `${record.break_in.length} breaks`
                  : '0'

                return `
                  <tr>
                    <td>${new Date(record.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}</td>
                    <td>${formatTime(record.clock_in)}</td>
                    <td>${formatTime(record.clock_out)}</td>
                    <td>${breaks}</td>
                    <td>${total}${overtime ? `<br><small style="color: green">${overtime}</small>` : ''}</td>
                    <td class="${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</td>
                    <td>${record.note || '-'}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    // Create a new window and print
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(tableContent)
      printWindow.document.close()
      printWindow.focus()

      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print()
      }, 250)

      notifications.show({
        title: t('common.success'),
        message: 'PDF ready for printing. Save as PDF from the print dialog.',
        color: 'green',
      })
    }
  }

  // Stats
  const presentDays = attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const lateDays = attendance.filter((a) => a.status === 'late').length
  const absentDays = attendance.filter((a) => a.status === 'absent').length
  const leaveDays = attendance.filter((a) => a.status === 'leave').length

  const statusOptions = [
    { value: 'all', label: t('hrm.attendance.filterAllStatus') },
    { value: 'present', label: t('hrm.attendance.status.present') },
    { value: 'late', label: t('hrm.attendance.status.late') },
    { value: 'absent', label: t('hrm.attendance.status.absent') },
  ]

  const dateRangeOptions = [
    { value: 'today', label: t('hrm.attendance.today') },
    { value: 'this_week', label: t('hrm.attendance.thisWeek') },
    { value: 'this_month', label: t('hrm.attendance.thisMonth') },
    { value: 'this_year', label: t('hrm.attendance.thisYear') },
    { value: 'custom', label: t('hrm.attendance.customRange') },
  ]

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="subtle"
              onClick={() => navigate(-1)}
              leftSection={<IconArrowLeft size={18} />}
            >
              {t('common.back')}
            </Button>
            <Box>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
                {employeeName || t('hrm.attendance.employeeAttendance')} - {t('hrm.attendance.attendanceHistory')}
              </Text>
              {dateRange.start && dateRange.end && (
                <Text className="text-sm md:text-base" c="dimmed">
                  {dateRange.start === dateRange.end ? dateRange.start : `${dateRange.start} to ${dateRange.end}`}
                </Text>
              )}
            </Box>
          </Group>
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={downloadCSV}
              disabled={attendance.length === 0}
            >
              Download CSV
            </Button>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={downloadPDF}
              disabled={attendance.length === 0}
            >
              Download PDF
            </Button>
          </Group>
        </Group>

        {/* Stats */}
        <Group>
          <Card withBorder p="sm" radius="md" className="flex-1">
            <Group>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.attendance.presentDays')}</Text>
              <Text className="text-lg md:text-xl" fw={700}>{presentDays}</Text>
            </Group>
          </Card>

          <Card withBorder p="sm" radius="md" className="flex-1">
            <Group>
              <Text className="text-xs md:text-sm" c="orange">{t('hrm.attendance.lateDays')}</Text>
              <Text className="text-lg md:text-xl" fw={700}>{lateDays}</Text>
            </Group>
          </Card>

          <Card withBorder p="sm" radius="md" className="flex-1">
            <Group>
              <Text className="text-xs md:text-sm" c="red">{t('hrm.attendance.absentDays')}</Text>
              <Text className="text-lg md:text-xl" fw={700}>{absentDays}</Text>
            </Group>
          </Card>

          <Card withBorder p="sm" radius="md" className="flex-1">
            <Group>
              <Text className="text-xs md:text-sm" c="blue">{t('hrm.attendance.leaveDays')}</Text>
              <Text className="text-lg md:text-xl" fw={700}>{leaveDays}</Text>
            </Group>
          </Card>
        </Group>

        {/* Date Range Filter */}
        <Group align="flex-end">
          <Select
            leftSection={<IconCalendar size={16} />}
            label={t('hrm.attendance.dateRange')}
            placeholder={t('hrm.attendance.dateRange')}
            data={dateRangeOptions}
            value={dateRangePreset}
            onChange={(value) => setDateRangePreset(value as DateRangePreset)}
            className="text-base md:text-lg"
            style={{ maxWidth: '200px' }}
          />
          {dateRangePreset === 'custom' && (
            <>
              <DateInput
                label={t('hrm.attendance.startDate')}
                placeholder={t('hrm.attendance.startDate')}
                value={customStartDate ? new Date(customStartDate) : null}
                onChange={(value) => setCustomStartDate(value ? value.toISOString().slice(0, 10) : '')}
                className="text-base md:text-lg"
                style={{ maxWidth: '200px' }}
              />
              <DateInput
                label={t('hrm.attendance.endDate')}
                placeholder={t('hrm.attendance.endDate')}
                value={customEndDate ? new Date(customEndDate) : null}
                onChange={(value) => setCustomEndDate(value ? value.toISOString().slice(0, 10) : '')}
                className="text-base md:text-lg"
                style={{ maxWidth: '200px' }}
              />
            </>
          )}
        </Group>

        {/* Status Filter */}
        <Select
          placeholder={t('hrm.attendance.filterByStatus')}
          data={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ maxWidth: '200px' }}
          className="text-base md:text-lg"
        />

        {/* Table */}
        <Card withBorder p="0" radius="md" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('hrm.attendance.tableHeaders.date')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.clockIn')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.clockOut')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.breaks')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.workingHours')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.status')}</Table.Th>
                <Table.Th>{t('hrm.attendance.tableHeaders.note')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {attendance.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Box py="xl" ta="center">
                      <Text c="dimmed">{t('hrm.attendance.noAttendanceFound')}</Text>
                    </Box>
                  </Table.Td>
                </Table.Tr>
              ) : (
                attendance.map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>
                      <Text className="text-sm md:text-base">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} className="text-sm md:text-base">{formatTime(record.clock_in)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} className="text-sm md:text-base">{formatTime(record.clock_out)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {record.break_in && record.break_in.length > 0 ? `${record.break_in.length} breaks` : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {record.clock_out ? (() => {
                        const { total, overtime } = calculateWorkingHoursWithOvertime(
                          record.clock_in,
                          record.clock_out,
                          record.break_in,
                          record.break_out
                        )
                        return (
                          <Stack gap={2}>
                            <Text fw={500} className="text-sm md:text-base">{total}</Text>
                            {overtime && (
                              <Text className="text-xs" c="green" fw={500}>
                                {overtime}
                              </Text>
                            )}
                          </Stack>
                        )
                      })() : (
                        <Text fw={500} className="text-sm md:text-base">-</Text>
                      )}
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
                        className="text-sm md:text-base"
                      >
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                      {record.status === 'late' && record.clock_in && (() => {
                        const lateMinutes = calculateLateTime(record.clock_in)
                        return lateMinutes !== null ? (
                          <Text className="text-xs" c="orange" fw={500}>
                            {formatLateTime(lateMinutes)} late
                          </Text>
                        ) : null
                      })()}
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base" c="dimmed">{record.note || '-'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Box>
  )
}
