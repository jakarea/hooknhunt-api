import { Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Card,
  SimpleGrid,
  Button,
  Paper,
} from '@mantine/core'
import {
  IconTrendingUp,
  IconScale,
  IconCoin,
  IconBook,
  IconFileDescription,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports view permission
  if (!hasPermission('finance_reports_view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Finance Reports.</Text>
        </Paper>
      </Stack>
    )
  }

  const reportCards = [
    {
      title: t('finance.reportsHubPage.reports.profitLoss.title'),
      description: t('finance.reportsHubPage.reports.profitLoss.description'),
      url: '/finance/reports/profit-loss',
      icon: <IconTrendingUp size={32} />,
      color: 'green',
    },
    {
      title: t('finance.reportsHubPage.reports.balanceSheet.title'),
      description: t('finance.reportsHubPage.reports.balanceSheet.description'),
      url: '/finance/reports/balance-sheet',
      icon: <IconScale size={32} />,
      color: 'blue',
    },
    {
      title: t('finance.reportsHubPage.reports.cashFlow.title'),
      description: t('finance.reportsHubPage.reports.cashFlow.description'),
      url: '/finance/reports/cash-flow',
      icon: <IconCoin size={32} />,
      color: 'cyan',
    },
    {
      title: t('finance.reportsHubPage.reports.trialBalance.title'),
      description: t('finance.reportsHubPage.reports.trialBalance.description'),
      url: '/finance/reports/trial-balance',
      icon: <IconBook size={32} />,
      color: 'orange',
    },
    {
      title: t('finance.reportsHubPage.reports.generalLedger.title'),
      description: t('finance.reportsHubPage.reports.generalLedger.description'),
      url: '/finance/reports/general-ledger',
      icon: <IconFileDescription size={32} />,
      color: 'grape',
    },
  ]

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Title order={1}>{t('finance.reportsHubPage.title')}</Title>
          <Text c="dimmed">{t('finance.reportsHubPage.subtitle')}</Text>
        </Box>

        {/* Reports Grid */}
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {reportCards.map((report) => (
            <Link to={report.url} key={report.title} style={{ textDecoration: 'none' }}>
              <Card
                withBorder
                p="lg"
                radius="md"
                shadow="sm"
                h="100%"
                style={{
                  borderTop: `4px solid var(--mantine-color-${report.color}-filled)`,
                  cursor: 'pointer',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)'
                }}
              >
                <Stack gap="md">
                  <Group gap="sm">
                    <div style={{ color: `var(--mantine-color-${report.color}-filled)` }}>
                      {report.icon}
                    </div>
                    <Title order={3}>{report.title}</Title>
                  </Group>

                  <Text className="text-sm md:text-base" c="dimmed">
                    {report.description}
                  </Text>

                  <Button
                    variant="light"
                    color={report.color}
                    fullWidth
                  >
                    {t('finance.reportsHubPage.viewReport')}
                  </Button>
                </Stack>
              </Card>
            </Link>
          ))}
        </SimpleGrid>

        {/* Info Card */}
        <Card withBorder p="md" radius="md" mt="xl">
          <Text className="text-sm md:text-base" c="dimmed">
            {t('finance.reportsHubPage.infoText')}
          </Text>
        </Card>
      </Stack>
    </Box>
  )
}
