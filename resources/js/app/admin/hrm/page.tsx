import { useState, useEffect } from 'react'
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
  Card,
  SimpleGrid,
  Avatar,
  LoadingOverlay,
  Progress,
  ThemeIcon,
} from '@mantine/core'
import {
  IconUsers,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconX,
  IconClock,
  IconTrendingUp,
  IconCash,
  IconArrowRight,
  IconUserPlus,
  IconCalendarEvent,
  IconChartBar,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import dayjs from 'dayjs'

interface HRMStats {
  staff: {
    total: number
    active: number
    onLeave: number
    thisMonth: number
    byDepartment: Array<{
      name: string
      count: number
    }>
  }
  departments: {
    total: number
  }
  attendance: {
    todayPresent: number
    todayAbsent: number
    todayLate: number
    todayTotal: number
    attendanceRate: number
  }
  leaves: {
    pending: number
    approved: number
    rejected: number
    thisMonth: number
  }
  payroll: {
    thisMonth: number
    totalPaid: number
  }
  recentHires: Array<{
    id: number
    name: string
    department: string
    designation: string
    joiningDate: string
    phone: string
  }>
  upcomingLeaves: Array<{
    id: number
    staffName: string
    department: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
  }>
}

export default function HRMDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<HRMStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/hrm/stats')

      if (response.data?.status) {
        setStats(response.data.data)
      } else {
        throw new Error('Failed to fetch HRM stats')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching HRM stats:', error)
      }
      notifications.show({
        title: t('common.error'),
        message: t('hrm.dashboard.errorLoading'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '৳0'
    return `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`
  }

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY')
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" ta="center">
          <LoadingOverlay visible />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Paper>
      </Box>
    )
  }

  if (!stats) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="red">{t('hrm.dashboard.errorLoading')}</Text>
        </Paper>
      </Box>
    )
  }

  const maxStaffInDept = Math.max(...stats.staff.byDepartment.map((d) => d.count), 1)

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">
            {t('hrm.dashboard.title')}
          </Title>
          <Text c="dimmed" className="text-sm md:text-base">
            {t('hrm.dashboard.subtitle')}
          </Text>
        </Box>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          {/* Total Staff */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="blue" className="text-base md:text-lg" radius="md">
                <IconUsers size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.dashboard.totalStaff')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats.staff.total}</Text>
            <Group mt="xs" gap={4}>
              <IconTrendingUp size={14} color="var(--mantine-color-green-6)" />
              <Text className="text-xs md:text-sm" c="green">{stats.staff.active} {t('hrm.staff.active')}</Text>
            </Group>
          </Card>

          {/* Today's Attendance */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="green" className="text-base md:text-lg" radius="md">
                <IconCheck size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.dashboard.todayAttendance')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">{stats.attendance.todayPresent}</Text>
            <Group mt="xs" gap={4}>
              <Text className="text-xs md:text-sm" c="dimmed">{stats.attendance.attendanceRate}% {t('hrm.dashboard.present')}</Text>
            </Group>
          </Card>

          {/* On Leave */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="orange" className="text-base md:text-lg" radius="md">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.dashboard.onLeave')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">{stats.staff.onLeave}</Text>
            <Group mt="xs" gap={4}>
              <Text className="text-xs md:text-sm" c="dimmed">{stats.leaves.pending} {t('hrm.dashboard.pendingRequests')}</Text>
            </Group>
          </Card>

          {/* Departments */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="grape" className="text-base md:text-lg" radius="md">
                <IconBuilding size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.departments.title')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats.departments.total}</Text>
            <Group mt="xs" gap={4}>
              <Text className="text-xs md:text-sm" c="dimmed">{stats.staff.byDepartment.length} {t('hrm.dashboard.active')}</Text>
            </Group>
          </Card>
        </SimpleGrid>

        {/* Staff by Department & Attendance Overview */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Staff by Department */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" justify="space-between">
              <Group gap="xs">
                <IconChartBar size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>{t('hrm.dashboard.staffByDepartment')}</Title>
              </Group>
            </Group>
            <Stack gap="sm">
              {stats.staff.byDepartment.length === 0 ? (
                <Text className="text-sm md:text-base" c="dimmed" ta="center">{t('hrm.dashboard.noDepartments')}</Text>
              ) : (
                stats.staff.byDepartment.map((dept) => (
                  <Box key={dept.name}>
                    <Group justify="space-between" mb={4}>
                      <Text className="text-sm md:text-base" fw={500}>{dept.name}</Text>
                      <Group gap={4}>
                        <Text className="text-sm md:text-base" fw={600}>{dept.count}</Text>
                        <Text className="text-xs md:text-sm" c="dimmed">
                          {stats.staff.total > 0 ? `${Math.round((dept.count / stats.staff.total) * 100)}%` : '0%'}
                        </Text>
                      </Group>
                    </Group>
                    <Progress
                      value={stats.staff.total > 0 ? (dept.count / maxStaffInDept) * 100 : 0}
                      color="blue"
                      className="text-sm md:text-base"
                      radius="md"
                    />
                  </Box>
                ))
              )}
            </Stack>
          </Card>

          {/* Leave Summary */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" gap="xs">
              <IconCalendarEvent size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Title order={4}>{t('hrm.dashboard.leaveSummary')}</Title>
            </Group>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('hrm.dashboard.pendingRequests')}</Text>
                <Badge color="yellow" variant="light">{stats.leaves.pending}</Badge>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('hrm.dashboard.approvedThisMonth')}</Text>
                <Badge color="green" variant="light">{stats.leaves.approved}</Badge>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('hrm.dashboard.rejected')}</Text>
                <Badge color="red" variant="light">{stats.leaves.rejected}</Badge>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('hrm.dashboard.totalThisMonth')}</Text>
                <Text className="text-sm md:text-base" fw={600}>{stats.leaves.thisMonth}</Text>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Attendance Details */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group gap="xs" mb="sm">
              <IconCheck size={18} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text className="text-sm md:text-base" c="dimmed">{t('hrm.dashboard.presentToday')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">{stats.attendance.todayPresent}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group gap="xs" mb="sm">
              <IconX size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
              <Text className="text-sm md:text-base" c="dimmed">{t('hrm.dashboard.absentToday')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">{stats.attendance.todayAbsent}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group gap="xs" mb="sm">
              <IconClock size={18} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Text className="text-sm md:text-base" c="dimmed">{t('hrm.dashboard.lateToday')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">{stats.attendance.todayLate}</Text>
          </Card>
        </SimpleGrid>

        {/* Recent Hires & Upcoming Leaves */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Recent Hires */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" justify="space-between">
              <Group gap="xs">
                <IconUserPlus size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>{t('hrm.dashboard.recentHires')}</Title>
              </Group>
              <Button
                component={Link}
                to="/hrm/staff"
                variant="light"
                className="text-xs md:text-sm"
                rightSection={<IconArrowRight size={14} />}
              >
                {t('crm.dashboard.viewAll')}
              </Button>
            </Group>
            <Stack gap="sm">
              {stats.recentHires.length === 0 ? (
                <Text className="text-sm md:text-base" c="dimmed" ta="center">{t('hrm.dashboard.noRecentHires')}</Text>
              ) : (
                stats.recentHires.map((hire) => (
                  <Paper key={hire.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Avatar className="text-xs md:text-sm" radius="xl" color="blue">
                          {hire.name.charAt(0)}
                        </Avatar>
                        <Text fw={600} className="text-sm md:text-base">{hire.name}</Text>
                      </Group>
                      <Badge className="text-xs md:text-sm" variant="light">{hire.designation}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text className="text-xs md:text-sm" c="dimmed">{hire.department}</Text>
                      <Text className="text-xs md:text-sm" c="dimmed">{formatDate(hire.joiningDate)}</Text>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Card>

          {/* Upcoming Leaves */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" gap="xs">
              <IconCalendar size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Title order={4}>{t('hrm.dashboard.upcomingLeaves')}</Title>
            </Group>
            <Stack gap="sm">
              {stats.upcomingLeaves.length === 0 ? (
                <Text className="text-sm md:text-base" c="dimmed" ta="center">{t('hrm.dashboard.noUpcomingLeaves')}</Text>
              ) : (
                stats.upcomingLeaves.map((leave) => (
                  <Paper key={leave.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Avatar className="text-xs md:text-sm" radius="xl" color="orange">
                          {leave.staffName.charAt(0)}
                        </Avatar>
                        <Text fw={600} className="text-sm md:text-base">{leave.staffName}</Text>
                      </Group>
                      <Badge className="text-xs md:text-sm" color="orange" variant="light">{leave.days} {t('hrm.dashboard.days')}</Badge>
                    </Group>
                    <Text className="text-xs md:text-sm" mb="xs">{leave.department}</Text>
                    <Group justify="space-between">
                      <Text className="text-xs md:text-sm" c="dimmed">{leave.leaveType}</Text>
                      <Group gap={4}>
                        <IconCalendar size={12} style={{ color: 'var(--mantine-color-orange-6)' }} />
                        <Text className="text-xs md:text-sm" c="orange">
                          {formatDate(leave.startDate)}
                        </Text>
                      </Group>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Payroll Overview */}
        <Card withBorder p="md" radius="md">
          <Group mb="md" gap="xs">
            <IconCash size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
            <Title order={4}>{t('hrm.dashboard.payrollOverview')}</Title>
          </Group>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            <Box>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.dashboard.thisMonth')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="green">{formatCurrency(stats.payroll.thisMonth)}</Text>
            </Box>
            <Box>
              <Text className="text-xs md:text-sm" c="dimmed">{t('hrm.dashboard.totalPaidYTD')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={600}>{formatCurrency(stats.payroll.totalPaid)}</Text>
            </Box>
          </SimpleGrid>
        </Card>

        {/* Quick Actions */}
        <Card withBorder p="md" radius="md">
          <Title order={4} mb="md">{t('hrm.dashboard.quickActions')}</Title>
          <SimpleGrid cols={{ base: 2, md: 4, lg: 6 }}>
            <Button
              component={Link}
              to="/hrm/staff"
              variant="light"
              leftSection={<IconUsers size={16} />}
            >
              {t('hrm.staff.view')}
            </Button>
            <Button
              component={Link}
              to="/hrm/staff/create"
              variant="light"
              leftSection={<IconUserPlus size={16} />}
            >
              {t('hrm.staff.add')}
            </Button>
            <Button
              component={Link}
              to="/hrm/departments"
              variant="light"
              leftSection={<IconBuilding size={16} />}
            >
              {t('hrm.departments.title')}
            </Button>
            <Button
              component={Link}
              to="/hrm/attendance"
              variant="light"
              leftSection={<IconCalendar size={16} />}
            >
              {t('hrm.attendance.title')}
            </Button>
            <Button
              component={Link}
              to="/hrm/leaves"
              variant="light"
              leftSection={<IconCalendarEvent size={16} />}
            >
              {t('hrm.leaves.title')}
            </Button>
            <Button
              component={Link}
              to="/hrm/payroll"
              variant="light"
              leftSection={<IconCash size={16} />}
            >
              {t('hrm.payroll.title')}
            </Button>
          </SimpleGrid>
        </Card>
      </Stack>
    </Box>
  )
}
