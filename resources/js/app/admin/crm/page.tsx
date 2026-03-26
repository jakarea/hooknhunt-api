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
  Card,
  SimpleGrid,
  Avatar,
  LoadingOverlay,
  Progress,
  ThemeIcon,
} from '@mantine/core'
import {
  IconUsers,
  IconTrendingUp,
  IconCoin,
  IconCalendar,
  IconPhone,
  IconMail,
  IconClock,
  IconCheck,
  IconChartBar,
  IconActivity,
  IconArrowRight,
  IconWallet,
  IconUserCircle,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import dayjs from 'dayjs'

interface CRMStats {
  leads: {
    total: number
    new: number
    contacted: number
    qualified: number
    proposal: number
    negotiation: number
    converted: number
    lost: number
    today: number
    thisMonth: number
    conversionRate: number
  }
  customers: {
    total: number
    active: number
    thisMonth: number
  }
  wallet: {
    totalBalance: number
    totalCredits: number
    totalDebits: number
    activeWallets: number
  }
  recentLeads: RecentLead[]
  recentActivities: RecentActivity[]
}

interface RecentLead {
  id: number
  name: string
  phone: string
  email: string | null
  status: string
  source: string
  createdAt: string
}

interface RecentActivity {
  id: number
  leadName: string
  type: string
  summary: string
  scheduleAt: string | null
  createdAt: string
}

export default function CRMDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<CRMStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/crm/stats')

      if (response.data?.status) {
        setStats(response.data.data)
      } else {
        throw new Error('Failed to fetch CRM stats')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching CRM stats:', error)
      }
      notifications.show({
        title: t('common.error'),
        message: t('crm.dashboard.errorLoading'),
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

  const getLeadSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      manual: t('crm.leads.source.manual'),
      website: t('crm.leads.source.website'),
      referral: t('crm.leads.source.referral'),
      trade_show: t('crm.leads.source.tradeShow'),
      cold_call: t('crm.leads.source.coldCall'),
      social_media: t('crm.leads.source.socialMedia'),
      advertisement: t('crm.leads.source.advertisement'),
      other: t('crm.leads.source.other'),
    }
    return labels[source] || source
  }

  const leadsByStatus = useMemo(() => {
    if (!stats) return []

    return [
      { label: t('crm.leads.status.new'), value: stats.leads.new, color: 'blue' },
      { label: t('crm.leads.status.contacted'), value: stats.leads.contacted, color: 'cyan' },
      { label: t('crm.leads.status.qualified'), value: stats.leads.qualified, color: 'green' },
      { label: t('crm.leads.status.proposal'), value: stats.leads.proposal, color: 'yellow' },
      { label: t('crm.leads.status.negotiation'), value: stats.leads.negotiation, color: 'orange' },
      { label: t('crm.leads.status.converted'), value: stats.leads.converted, color: 'teal' },
      { label: t('crm.leads.status.lost'), value: stats.leads.lost, color: 'red' },
    ]
  }, [stats, t])

  const maxLeadsInStatus = useMemo(() => {
    return Math.max(...leadsByStatus.map((s) => s.value))
  }, [leadsByStatus])

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
          <Text c="red">{t('crm.dashboard.errorLoading')}</Text>
        </Paper>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">
            {t('crm.dashboard.title')}
          </Title>
          <Text c="dimmed" className="text-sm md:text-base">
            {t('crm.dashboard.subtitle')}
          </Text>
        </Box>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          {/* Total Leads */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="blue" className="text-base md:text-lg" radius="md">
                <IconUserCircle size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('crm.dashboard.totalLeads')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats.leads.total}</Text>
            <Group mt="xs" gap={4}>
              <IconTrendingUp size={14} color="var(--mantine-color-green-6)" />
              <Text className="text-xs md:text-sm" c="green">{stats.leads.thisMonth} {t('crm.dashboard.thisMonth')}</Text>
            </Group>
          </Card>

          {/* Converted */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="teal" className="text-base md:text-lg" radius="md">
                <IconCheck size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('crm.dashboard.converted')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="teal">{stats.leads.converted}</Text>
            <Group mt="xs" gap={4}>
              <IconTrendingUp size={14} color="var(--mantine-color-teal-6)" />
              <Text className="text-xs md:text-sm" c="teal">{stats.leads.conversionRate}% {t('crm.dashboard.conversionRate')}</Text>
            </Group>
          </Card>

          {/* Total Customers */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="grape" className="text-base md:text-lg" radius="md">
                <IconUsers size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('crm.customers.title')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats.customers.total}</Text>
            <Group mt="xs" gap={4}>
              <IconTrendingUp size={14} color="var(--mantine-color-green-6)" />
              <Text className="text-xs md:text-sm" c="green">{stats.customers.active} {t('hrm.staff.active')}</Text>
            </Group>
          </Card>

          {/* Wallet Balance */}
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <ThemeIcon color="orange" className="text-base md:text-lg" radius="md">
                <IconWallet size={20} />
              </ThemeIcon>
              <Text className="text-xs md:text-sm" c="dimmed">{t('crm.wallet.balance')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">{formatCurrency(stats.wallet.totalBalance)}</Text>
            <Group mt="xs" gap={4}>
              <Text className="text-xs md:text-sm" c="dimmed">{stats.wallet.activeWallets} {t('crm.dashboard.wallets')}</Text>
            </Group>
          </Card>
        </SimpleGrid>

        {/* Pipeline Overview */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Sales Pipeline */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" justify="space-between">
              <Group gap="xs">
                <IconChartBar size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>{t('crm.dashboard.salesPipeline')}</Title>
              </Group>
            </Group>
            <Stack gap="sm">
              {leadsByStatus.map((status) => (
                <Box key={status.label}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Badge color={status.color} variant="light" className="text-xs md:text-sm">
                        {status.label}
                      </Badge>
                      <Text className="text-sm md:text-base" fw={600}>{status.value}</Text>
                    </Group>
                    <Text className="text-xs md:text-sm" c="dimmed">
                      {maxLeadsInStatus > 0 ? `${Math.round((status.value / stats.leads.total) * 100)}%` : '0%'}
                    </Text>
                  </Group>
                  <Progress
                    value={maxLeadsInStatus > 0 ? (status.value / maxLeadsInStatus) * 100 : 0}
                    color={status.color}
                    className="text-sm md:text-base"
                    radius="md"
                  />
                </Box>
              ))}
            </Stack>
          </Card>

          {/* Recent Activity */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" gap="xs">
              <IconActivity size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Title order={4}>{t('crm.dashboard.recentActivity')}</Title>
            </Group>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('crm.dashboard.todaysLeads')}</Text>
                <Badge color="blue" variant="light">{stats.leads.today}</Badge>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('crm.dashboard.thisMonth')}</Text>
                <Badge color="green" variant="light">{stats.leads.thisMonth}</Badge>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('crm.wallet.totalCredits')}</Text>
                <Text className="text-sm md:text-base" fw={600} c="green">{formatCurrency(stats.wallet.totalCredits)}</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-sm md:text-base">{t('crm.wallet.totalDebits')}</Text>
                <Text className="text-sm md:text-base" fw={600} c="red">{formatCurrency(stats.wallet.totalDebits)}</Text>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Recent Leads & Activities */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Recent Leads */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" justify="space-between">
              <Group gap="xs">
                <IconUserCircle size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>{t('crm.dashboard.recentLeads')}</Title>
              </Group>
              <Button
                component={Link}
                to="/crm/leads"
                variant="light"
                className="text-xs md:text-sm"
                rightSection={<IconArrowRight size={14} />}
              >
                {t('crm.dashboard.viewAll')}
              </Button>
            </Group>
            <Stack gap="sm">
              {stats.recentLeads.length === 0 ? (
                <Text className="text-sm md:text-base" c="dimmed" ta="center">{t('crm.dashboard.noRecentLeads')}</Text>
              ) : (
                stats.recentLeads.map((lead) => (
                  <Paper key={lead.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Avatar className="text-xs md:text-sm" radius="xl" color="blue">
                          {lead.name.charAt(0)}
                        </Avatar>
                        <Text fw={600} className="text-sm md:text-base">{lead.name}</Text>
                      </Group>
                      <Badge color={getStatusColor(lead.status)} variant="light" className="text-xs md:text-sm">
                        {t(`crm.leads.status.${lead.status}`)}
                      </Badge>
                    </Group>
                    <Group gap="md" mb="xs">
                      <Group gap={4}>
                        <IconPhone size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                        <Text className="text-xs md:text-sm">{lead.phone}</Text>
                      </Group>
                      {lead.email && (
                        <Group gap={4}>
                          <IconMail size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                          <Text className="text-xs md:text-sm" truncate>{lead.email}</Text>
                        </Group>
                      )}
                    </Group>
                    <Group justify="space-between">
                      <Text className="text-xs md:text-sm" c="dimmed">{getLeadSourceLabel(lead.source)}</Text>
                      <Text className="text-xs md:text-sm" c="dimmed">{formatDate(lead.createdAt)}</Text>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Card>

          {/* Recent Activities */}
          <Card withBorder p="md" radius="md">
            <Group mb="md" justify="space-between">
              <Group gap="xs">
                <IconClock size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
                <Title order={4}>{t('crm.dashboard.recentActivities')}</Title>
              </Group>
            </Group>
            <Stack gap="sm">
              {stats.recentActivities.length === 0 ? (
                <Text className="text-sm md:text-base" c="dimmed" ta="center">{t('crm.dashboard.noRecentActivities')}</Text>
              ) : (
                stats.recentActivities.map((activity) => (
                  <Paper key={activity.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <ThemeIcon className="text-xs md:text-sm" radius="md" color={activity.type === 'call' ? 'blue' : 'gray'}>
                          <IconPhone size={12} />
                        </ThemeIcon>
                        <Text fw={600} className="text-sm md:text-base">{activity.leadName}</Text>
                      </Group>
                      <Badge className="text-xs md:text-sm" variant="light">{activity.type}</Badge>
                    </Group>
                    <Text className="text-sm md:text-base" mb="xs" lineClamp={2}>{activity.summary}</Text>
                    <Group justify="space-between">
                      <Text className="text-xs md:text-sm" c="dimmed">{formatDate(activity.createdAt)}</Text>
                      {activity.scheduleAt && (
                        <Group gap={4}>
                          <IconCalendar size={12} style={{ color: 'var(--mantine-color-orange-6)' }} />
                          <Text className="text-xs md:text-sm" c="orange">
                            {dayjs(activity.scheduleAt).format('MMM D')}
                          </Text>
                        </Group>
                      )}
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Card withBorder p="md" radius="md">
          <Title order={4} mb="md">{t('crm.dashboard.quickActions')}</Title>
          <SimpleGrid cols={{ base: 2, md: 4, lg: 6 }}>
            <Button
              component={Link}
              to="/crm/leads"
              variant="light"
              leftSection={<IconUserCircle size={16} />}
            >
              {t('crm.leads.view')}
            </Button>
            <Button
              component={Link}
              to="/crm/leads/create"
              variant="light"
              leftSection={<IconTrendingUp size={16} />}
            >
              {t('crm.leads.add')}
            </Button>
            <Button
              component={Link}
              to="/crm/customers"
              variant="light"
              leftSection={<IconUsers size={16} />}
            >
              {t('crm.customers.title')}
            </Button>
            <Button
              component={Link}
              to="/crm/wallet"
              variant="light"
              leftSection={<IconWallet size={16} />}
            >
              {t('crm.wallet.title')}
            </Button>
            <Button
              component={Link}
              to="/marketing/campaigns"
              variant="light"
              leftSection={<IconChartBar size={16} />}
            >
              Campaigns
            </Button>
            <Button
              component={Link}
              to="/crm/loyalty"
              variant="light"
              leftSection={<IconCoin size={16} />}
            >
              {t('crm.loyalty.title')}
            </Button>
          </SimpleGrid>
        </Card>
      </Stack>
    </Box>
  )
}
