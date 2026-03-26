import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  IconDownload,
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
  break_notes?: string[]
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

interface HRMSettings {
  workStartTime: string
  workEndTime: string
  breakDuration: number
  gracePeriod: number
}

type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'

export default function AttendancePage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today')
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().slice(0, 10))
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

  // HRM Settings for late calculation
  const [hrmSettings, setHrmSettings] = useState<HRMSettings>({
    workStartTime: '09:00',
    workEndTime: '18:00',
    breakDuration: 60,
    gracePeriod: 15,
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

  // Fetch HRM settings for late calculation
  const fetchHRMSettings = async () => {
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
    } catch (error) {
      // Use defaults if fetch fails
      console.error('Failed to fetch HRM settings:', error)
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

  // Get date range based on preset
  const getDateRange = (): { start: string; end: string } => {
    const today = new Date()

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    switch (dateRangePreset) {
      case 'today':
        const todayStr = formatDate(today)
        return { start: todayStr, end: todayStr }

      case 'this_week': {
        const startOfWeek = new Date(today)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
        startOfWeek.setDate(diff)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) }
      }

      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) }

      case 'this_year':
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        const endOfYear = new Date(today.getFullYear(), 11, 31)
        return { start: formatDate(startOfYear), end: formatDate(endOfYear) }

      case 'custom':
        return { start: customStartDate, end: customEndDate }

      default:
        const todayStrDefault = formatDate(today)
        return { start: todayStrDefault, end: todayStrDefault }
    }
  }

  // Fetch attendance records
  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      const params: Record<string, string> = {
        start_date: start,
        end_date: end,
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
        break_notes: record.breakNotes || record.break_notes,
        status: record.status,
        note: record.note,
        created_at: record.createdAt || record.created_at,
        updated_at: record.updatedAt || record.updated_at,
        user: record.user,
        updater: record.updater,
      }))

      setAttendance(normalizedAttendance)

      // Fetch today's attendance for current user (same approach as dashboard)
      if (user?.id) {
        try {
          const now = new Date()
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

          // Fetch all attendance for today (without user filter to avoid permission issues)
          const myAttendanceResponse = await api.get(`/hrm/attendance?start_date=${today}&end_date=${today}`)

          // API returns paginated data with camelCase fields
          let myAttendanceData = []

          if (myAttendanceResponse.data?.data?.data) {
            myAttendanceData = myAttendanceResponse.data.data.data
          } else if (myAttendanceResponse.data?.data) {
            myAttendanceData = Array.isArray(myAttendanceResponse.data.data) ? myAttendanceResponse.data.data : []
          }


          // Find my attendance - handle both camelCase/snake_case and string/number
          const myRecord = myAttendanceData.find((a: any) => {
            const recordUserId = a.userId || a.user_id
            return String(recordUserId) === String(user.id)
          })

          if (myRecord) {

            // Convert camelCase to snake_case for consistency
            const normalizedRecord: Attendance = {
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
              created_at: myRecord.createdAt || myRecord.created_at,
              updated_at: myRecord.updatedAt || myRecord.updated_at,
              user: myRecord.user,
              updater: myRecord.updater,
            }
            setTodayAttendance(normalizedRecord)
          } else {
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
      const response = await api.get('/user-management/users', {
        params: {
          type: 'staff',
          status: 'active',
          per_page: 100 // Get more employees for dropdown
        }
      })
      // Handle paginated response: { data: { data: [...], current_page, ... } }
      const employeesData = response.data.data?.data || response.data.data || []
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to fetch employees:', error)
      setEmployees([]) // Ensure employees is always an array
    }
  }

  // Initial load
  useEffect(() => {
    fetchHRMSettings()
    fetchAttendance()
    fetchEmployees()
  }, [statusFilter, employeeFilter, dateRangePreset, customStartDate, customEndDate])

  // Handle refresh
  const handleRefresh = () => {
    fetchAttendance()
  }

  // Open employee history page
  const openEmployeeHistory = (employeeId: number) => {
    navigate(`/hrm/employee-attendance/${employeeId}`)
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

    // CSV Headers - include Employee column for admin
    const headers = isAdmin
      ? ['Employee', 'Date', 'Clock In', 'Clock Out', 'Breaks', 'Working Hours', 'Status', 'Note']
      : ['Date', 'Clock In', 'Clock Out', 'Breaks', 'Working Hours', 'Status', 'Note']

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

      const rowData = isAdmin
        ? [
            record.user?.name || 'N/A',
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
          ]
        : [
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
          ]

      return rowData.join(',')
    })

    // Combine headers and data
    const csvContent = [headers.join(','), ...csvData].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    const { start, end } = getDateRange()

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `attendance_report_${start}_to_${end}.csv`
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

    const { start, end } = getDateRange()

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
          <h1>Attendance Report</h1>
          <p><strong>Date Range:</strong> ${start === end ? start : `${start} to ${end}`}</p>
          <p><strong>Total Records:</strong> ${attendance.length} |
             <strong>Present:</strong> ${attendance.filter(a => a.status === 'present' || a.status === 'late').length} |
             <strong>Late:</strong> ${attendance.filter(a => a.status === 'late').length} |
             <strong>Absent:</strong> ${attendance.filter(a => a.status === 'absent').length} |
             <strong>Leave:</strong> ${attendance.filter(a => a.status === 'leave').length}</p>
          <table>
            <thead>
              <tr>
                ${isAdmin ? '<th>Employee</th>' : ''}
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
                    ${isAdmin ? `<td>${record.user?.name || 'N/A'}</td>` : ''}
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
            <Box className="flex-1">
              <AttendanceActions myAttendance={todayAttendance} onRefresh={fetchAttendance} />
            </Box>
            <Group>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconDownload size={16} />}
                onClick={downloadCSV}
                disabled={attendance.length === 0}
              >
                CSV
              </Button>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconDownload size={16} />}
                onClick={downloadPDF}
                disabled={attendance.length === 0}
              >
                PDF
              </Button>
              <ActionIcon
                variant="light"
                className="text-lg md:text-xl lg:text-2xl"
                onClick={handleRefresh}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        {/* Today's Status Card */}
        {todayAttendance && (
          <Card withBorder p="md" radius="md" shadow="sm">
            <Group justify="space-between" align="flex-start">
              <Box className="flex-1">
                <Text className="text-sm md:text-base" c="dimmed">{t('hrm.attendance.todaysStatus')}</Text>
                <Group mt="xs" wrap="nowrap">
                  <Stack gap={4}>
                    <Badge
                      color={
                        todayAttendance.status === 'present' ? 'green' :
                        todayAttendance.status === 'late' ? 'yellow' :
                        todayAttendance.status === 'absent' ? 'red' :
                        'blue'
                      }
                      className="text-lg md:text-xl lg:text-2xl"
                    >
                      {todayAttendance.status.toUpperCase()}
                    </Badge>
                    {todayAttendance.status === 'late' && todayAttendance.clock_in && (() => {
                      const lateMinutes = calculateLateTime(todayAttendance.clock_in)
                      return lateMinutes !== null ? (
                        <Text className="text-xs md:text-sm" c="orange" fw={500}>
                          {formatLateTime(lateMinutes)} late
                        </Text>
                      ) : null
                    })()}
                  </Stack>
                  <Text className="text-lg md:text-xl lg:text-2xl" fw={500}>
                    In: {formatTime(todayAttendance.clock_in)}
                  </Text>
                  {todayAttendance.clock_out && (
                    <Text className="text-lg md:text-xl lg:text-2xl" fw={500}>
                      Out: {formatTime(todayAttendance.clock_out)}
                    </Text>
                  )}
                </Group>
                {todayAttendance.break_in && todayAttendance.break_in.length > 0 && (
                  <Stack mt="xs" gap={2}>
                    <Text className="text-xs md:text-sm" c="dimmed" fw={500}>{t('hrm.attendance.breaks')}:</Text>
                    <Stack gap={2}>
                      {formatBreakTimes(todayAttendance.break_in, todayAttendance.break_out, todayAttendance.break_notes)}
                    </Stack>
                  </Stack>
                )}
              </Box>
              {todayAttendance.clock_in && todayAttendance.clock_out && (() => {
                const { total, overtime } = calculateWorkingHoursWithOvertime(
                  todayAttendance.clock_in,
                  todayAttendance.clock_out,
                  todayAttendance.break_in,
                  todayAttendance.break_out
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

        {/* Stats */}
        <Stack  display={{ base: 'none', md: 'flex' }}>
          <Group >
            <Card withBorder p="md" radius="md" className="flex-1">
              <Group >
                <IconCheck size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
                <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.attendance.presentDays')}</Text>
              </Group>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{presentDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" className="flex-1">
              <Group >
                <IconClock size={20} style={{ color: 'var(--mantine-color-yellow-filled)' }} />
                <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.attendance.lateDays')}</Text>
              </Group>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{lateDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" className="flex-1">
              <Group >
                <IconX size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.attendance.absentDays')}</Text>
              </Group>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{absentDays}</Text>
            </Card>

            <Card withBorder p="md" radius="md" className="flex-1">
              <Group >
                <IconCalendar size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.attendance.leaveDays')}</Text>
              </Group>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{leaveDays}</Text>
            </Card>
          </Group>
        </Stack>

        {/* Filters */}
        <Group justify="space-between">
          <Group >
            <Select
              label={t('hrm.attendance.dateRange')}
              data={[
                { value: 'today', label: t('hrm.attendance.today') },
                { value: 'this_week', label: t('hrm.attendance.thisWeek') },
                { value: 'this_month', label: t('hrm.attendance.thisMonth') },
                { value: 'this_year', label: t('hrm.attendance.thisYear') },
                { value: 'custom', label: t('hrm.attendance.customRange') },
              ]}
              value={dateRangePreset}
              onChange={(value) => setDateRangePreset(value as DateRangePreset)}
              style={{ width: '150px' }}
              className="text-base md:text-lg"
            />
            {dateRangePreset === 'custom' && (
              <>
                <TextInput
                  type="date"
                  label={t('hrm.attendance.startDate')}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.currentTarget.value)}
                  style={{ width: '150px' }}
                  className="text-base md:text-lg"
                />
                <TextInput
                  type="date"
                  label={t('hrm.attendance.endDate')}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.currentTarget.value)}
                  style={{ width: '150px' }}
                  className="text-base md:text-lg"
                />
              </>
            )}
            <Select
              placeholder={t('hrm.attendance.filterByStatus')}
              label={t('hrm.attendance.status.label')}
              data={statusOptions}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: '150px' }}
              className="text-base md:text-lg"
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
                className="text-base md:text-lg"
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
                        <Text
                          fw={500}
                          className="text-sm md:text-base"
                          c="blue"
                          style={{ cursor: 'pointer' }}
                          onClick={() => record.user && openEmployeeHistory(record.user_id)}
                        >
                          {record.user?.name || 'N/A'}
                        </Text>
                      </Table.Td>
                    )}
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
                      <Stack gap={4}>
                        {formatBreakTimes(record.break_in, record.break_out, record.break_notes)}
                      </Stack>
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
                            <Text fw={500} className="text-sm md:text-base">
                              {total}
                            </Text>
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
                      <Stack gap={2}>
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
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base" c="dimmed">{record.note || '-'}</Text>
                    </Table.Td>
                    {isAdmin && (
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          className="text-sm md:text-base"
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
              <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.employee')} *</Text>
              <Select
                placeholder={t('hrm.attendance.selectEmployee')}
                data={employees.map(emp => ({ value: String(emp.id), label: emp.name }))}
                value={formData.user_id}
                onChange={(value) => setFormData({ ...formData, user_id: value })}
                searchable
                className="text-base md:text-lg"
                disabled
              />
            </Stack>

            <Stack >
              <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.date')} *</Text>
              <TextInput
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.currentTarget.value })}
                className="text-base md:text-lg"
              />
            </Stack>

            <Group >
              <Stack  className="flex-1">
                <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.clockIn')}</Text>
                <TextInput
                  type="time"
                  value={formData.clock_in || ''}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.currentTarget.value })}
                  className="text-base md:text-lg"
                />
              </Stack>

              <Stack  className="flex-1">
                <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.clockOut')}</Text>
                <TextInput
                  type="time"
                  value={formData.clock_out || ''}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.currentTarget.value })}
                  className="text-base md:text-lg"
                />
              </Stack>
            </Group>

            <Stack >
              <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.status.label')} *</Text>
              <Select
                placeholder={t('hrm.attendance.selectStatus')}
                data={statusFormOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
                className="text-base md:text-lg"
              />
            </Stack>

            <Stack >
              <Text className="text-sm md:text-base" fw={500}>{t('hrm.attendance.note')}</Text>
              <Textarea
                placeholder={t('hrm.attendance.enterNote')}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.currentTarget.value })}
                className="text-base md:text-lg"
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
