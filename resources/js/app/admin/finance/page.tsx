'use client'

import { useState, useEffect, useCallback } from 'react'
import { Title, Text, Stack, Paper, Group, Grid, Card, Badge, Button, Table, SimpleGrid, Skeleton } from '@mantine/core'
import { IconDashboard, IconCoin, IconWallet, IconBuildingBank, IconMoneybag, IconPlus, IconArrowRight, IconRefresh, IconCheck, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { notifications } from '@mantine/notifications'
import {
  getFinanceDashboard,
  getBankTransactions,
  getExpenses,
  approveExpense,
  type BankTransaction,
  type Expense,
} from '@/utils/api'

type DashboardData = {
  banksSummary: {
    totalBalance: number
    accountCount: number
    byType: {
      cash: { count: number; totalBalance: number | string }
      bank: { count: number; totalBalance: number | string }
      bkash: { count: number; totalBalance: number | string }
      nagad: { count: number; totalBalance: number | string }
      rocket: { count: number; totalBalance: number | string }
    }
  }
  recentTransactions: BankTransaction[]
  expenses: {
    pendingCount: number
    pendingAmount: number | string
  }
  revenueVsExpenses: {
    revenue: number
    expenses: number
    netIncome: number
    startDate: string
    endDate: string
  }
}

export default function FinanceDashboardPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance dashboard view permission
  if (!hasPermission('finance.dashboard.index')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to access the Finance Dashboard.</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<BankTransaction[]>([])
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      // Fetch main dashboard data
      const dashboardResponse = await getFinanceDashboard()

      // Extract data from Laravel API response: { status: true, data: { banksSummary: ... } }
      const data = dashboardResponse?.data || null

      setDashboardData(data)

      // Fetch recent transactions (last 5)
      const transactionsResponse = await getBankTransactions({})
      let transactionsData: BankTransaction[] = []

      if (transactionsResponse && typeof transactionsResponse === 'object') {
        if ('data' in transactionsResponse) {
          const innerData = transactionsResponse.data
          if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
            transactionsData = innerData.data
          } else if (Array.isArray(innerData)) {
            transactionsData = innerData
          }
        } else if (Array.isArray(transactionsResponse)) {
          transactionsData = transactionsResponse
        }
      }

      // Take only first 5 transactions
      setRecentTransactions(transactionsData.slice(0, 5))

      // Fetch pending expenses
      const expensesResponse = await getExpenses({ is_approved: false, per_page: 5 })
      let expensesData: Expense[] = []

      if (expensesResponse && typeof expensesResponse === 'object') {
        if ('data' in expensesResponse) {
          const innerData = expensesResponse.data
          if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
            expensesData = innerData.data
          } else if (Array.isArray(innerData)) {
            expensesData = innerData
          }
        } else if (Array.isArray(expensesResponse)) {
          expensesData = expensesResponse
        }
      }

      // Convert is_approved from 0/1 to boolean if needed
      expensesData = expensesData.map((exp: any) => ({
        ...exp,
        isApproved: exp.isApproved ?? exp.is_approved ?? false,
      }))

      setPendingExpenses(expensesData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('common.somethingWentWrong') || 'Failed to load dashboard data',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  // Initial load
  useEffect(() => {
    fetchDashboardData(true)
  }, [fetchDashboardData])

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboardData(false)
    notifications.show({
      title: 'Refreshed',
      message: 'Dashboard data has been refreshed',
      color: 'blue',
    })
  }

  // Handle approve expense
  const handleApproveExpense = async (expenseId: number) => {
    try {
      await approveExpense(expenseId)
      notifications.show({
        title: 'Expense Approved',
        message: 'Expense has been approved and posted to ledger.',
        color: 'green',
      })
      fetchDashboardData(false)
    } catch (error: any) {
      console.error('Failed to approve expense:', error)
      const errorMessage = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Failed to approve expense'
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      })
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <Stack p="xl">
        <Skeleton height={40} width="100%" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={120} radius="md" />
          ))}
        </SimpleGrid>
        <Skeleton height={200} radius="md" />
        <Skeleton height={300} radius="md" />
      </Stack>
    )
  }

  return (
    <Stack p="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{t('finance.dashboardPage.title')}</Title>
          <Text c="dimmed">{t('finance.dashboardPage.subtitle')}</Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleRefresh}
          loading={refreshing}
          variant="light"
        >
          {t('finance.dashboardPage.refresh')}
        </Button>
      </Group>

      {/* Statistics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconWallet size={24} color="green" />
            <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.totalCash')}</Text>
          </Group>
          <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
            {formatCurrency(dashboardData?.banksSummary?.byType?.cash?.totalBalance ?? 0)}
          </Text>
        </Card>

        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconBuildingBank size={24} color="blue" />
            <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.totalBankBalance')}</Text>
          </Group>
          <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="blue">
            {formatCurrency(dashboardData?.banksSummary?.byType?.bank?.totalBalance ?? 0)}
          </Text>
        </Card>

        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconMoneybag size={24} color="purple" />
            <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.bkashBalance')}</Text>
          </Group>
          <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="purple">
            {formatCurrency(dashboardData?.banksSummary?.byType?.bkash?.totalBalance ?? 0)}
          </Text>
        </Card>

        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconCoin size={24} color="orange" />
            <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.totalBalance')}</Text>
          </Group>
          <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">
            {formatCurrency(dashboardData?.banksSummary?.totalBalance ?? 0)}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <Paper withBorder p="md" shadow="sm">
        <Text fw={600} mb="xs">{t('finance.dashboardPage.quickActions')}</Text>
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          <Button
            component={Link}
            to="/finance/expenses/create"
            variant="light"
            leftSection={<IconPlus size={16} />}
            fullWidth
          >
            {t('finance.dashboardPage.newExpense')}
          </Button>
          <Button
            component={Link}
            to="/finance/banks/create"
            variant="light"
            leftSection={<IconDashboard size={16} />}
            fullWidth
          >
            {t('finance.dashboardPage.addBank')}
          </Button>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={handleRefresh}
            fullWidth
          >
            {t('finance.dashboardPage.refreshData')}
          </Button>
          <Button
            component={Link}
            to="/finance/accounts"
            variant="light"
            c="green"
            leftSection={<IconCheck size={16} />}
            fullWidth
          >
            {t('finance.dashboardPage.allAccounts')}
          </Button>
        </SimpleGrid>
      </Paper>

      {/* Revenue vs Expenses */}
      <Paper withBorder p="md" shadow="sm" mt="md">
        <Group justify="space-between" mb="xs">
          <Text fw={600}>{t('finance.dashboardPage.revenueVsExpenses')} (Current Month)</Text>
          <Badge color="blue">{t('finance.dashboardPage.monthlyView')}</Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }}>
          {/* Revenue Card */}
          <Card withBorder p="md">
            <Group gap="xs" mb="sm">
              <Group gap="xs">
                <IconTrendingUp size={20} color="green" />
                <Text className="text-sm md:text-base" c="dimmed">{t('finance.dashboardPage.totalRevenue')}</Text>
              </Group>
              <Text size="xxl" fw={700} c="green">
                {formatCurrency(dashboardData?.revenueVsExpenses?.revenue || 0)}
              </Text>
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('finance.dashboardPage.fromLastMonth')}
              </Text>
            </Group>

            {/* Revenue Breakdown */}
            <Stack gap={4} mt="sm">
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.salesRevenue')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.wholesaleRevenue')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.darazRevenue')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
            </Stack>
          </Card>

          {/* Expenses Card */}
          <Card withBorder p="md">
            <Group gap="xs" mb="sm">
              <Group gap="xs">
                <IconTrendingDown size={20} color="red" />
                <Text className="text-sm md:text-base" c="dimmed">{t('finance.dashboardPage.totalExpenses')}</Text>
              </Group>
              <Text size="xxl" fw={700} c="red">
                {formatCurrency(dashboardData?.revenueVsExpenses?.expenses || 0)}
              </Text>
              <Text className="text-xs md:text-sm" c="dimmed">
                {t('finance.dashboardPage.fromLastMonth')}
              </Text>
            </Group>

            {/* Expenses Breakdown */}
            <Stack gap={4} mt="sm">
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.costOfGoodsSold')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.operationalExpenses')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.administrative')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
              <Group justify="space-between">
                <Text className="text-xs md:text-sm">{t('finance.dashboardPage.financeCharges')}</Text>
                <Text className="text-xs md:text-sm" fw={500}>—</Text>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Net Profit Summary */}
        <Card withBorder p="md" mt="xs">
          <Group justify="space-between">
            <Group gap="xs">
              <IconCoin size={20} color="gray" />
              <Text className="text-sm md:text-base" c="dimmed">{t('finance.dashboardPage.netProfit')} (Current Month)</Text>
            </Group>
            <Badge
              color={(dashboardData?.revenueVsExpenses?.netIncome || 0) >= 0 ? 'green' : 'red'}
              className="text-lg md:text-xl lg:text-2xl"
              variant="filled"
            >
              {(dashboardData?.revenueVsExpenses?.netIncome || 0) >= 0 ? t('finance.dashboardPage.profit') : t('finance.dashboardPage.loss')}: {formatCurrency(Math.abs(dashboardData?.revenueVsExpenses?.netIncome || 0))}
            </Badge>
          </Group>
        </Card>
      </Paper>

      {/* Recent Transactions */}
      <Paper withBorder p="md" shadow="sm" mt="md">
        <Group justify="space-between" mb="xs">
          <Text fw={600}>{t('finance.dashboardPage.recentTransactions')}</Text>
          <Button
            component={Link}
            to="/finance/transactions"
            variant="subtle"
            className="text-xs md:text-sm"
            rightSection={<IconArrowRight size={14} />}
          >
            {t('finance.dashboardPage.viewAll')}
          </Button>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('finance.dashboardPage.date')}</Table.Th>
              <Table.Th>{t('finance.dashboardPage.bank')}</Table.Th>
              <Table.Th>{t('finance.dashboardPage.type')}</Table.Th>
              <Table.Th>{t('finance.dashboardPage.amount')}</Table.Th>
              <Table.Th>{t('finance.dashboardPage.balance')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentTransactions.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="xl">No recent transactions</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              recentTransactions.map((tx) => (
                <Table.Tr key={tx.id}>
                  <Table.Td>{formatDate(tx.transactionDate)}</Table.Td>
                  <Table.Td>{tx.bank?.name || '-'}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={tx.type === 'deposit' ? 'green' : tx.type === 'withdrawal' ? 'red' : 'blue'}
                      variant="light"
                    >
                      {t(`finance.banksPage.transactionsPage.transactionTypes.${tx.type.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`) || tx.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      fw={600}
                      c={['deposit', 'transfer_in'].includes(tx.type) ? 'green' : 'red'}
                    >
                      {formatCurrency(tx.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{formatCurrency(tx.balanceAfter)}</Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Pending Expenses */}
      {pendingExpenses.length > 0 && (
        <Paper withBorder p="md" shadow="sm" mt="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600}>{t('finance.dashboardPage.pendingExpenses')}</Text>
            <Badge className="text-xs md:text-sm">{pendingExpenses.length} {t('finance.dashboardPage.pending')}</Badge>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('finance.dashboardPage.title')}</Table.Th>
                <Table.Th>{t('finance.dashboardPage.category')}</Table.Th>
                <Table.Th>{t('finance.dashboardPage.amount')}</Table.Th>
                <Table.Th>{t('finance.dashboardPage.date')}</Table.Th>
                <Table.Th>{t('finance.dashboardPage.paidBy')}</Table.Th>
                <Table.Th>{t('finance.dashboardPage.action')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pendingExpenses.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>{expense.title}</Table.Td>
                  <Table.Td>{expense.account?.name || '-'}</Table.Td>
                  <Table.Td fw={600}>{formatCurrency(expense.amount)}</Table.Td>
                  <Table.Td>{formatDate(expense.expenseDate)}</Table.Td>
                  <Table.Td>{expense.paidBy?.name || '-'}</Table.Td>
                  <Table.Td>
                    <Button
                      className="text-xs md:text-sm"
                      variant="light"
                      color="green"
                      onClick={() => handleApproveExpense(expense.id)}
                    >
                      {t('finance.dashboardPage.approve')}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Summary Stats */}
      <SimpleGrid cols={{ base: 1, md: 3 }} mt="md">
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconDashboard size={40} />
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.totalBalance')}</Text>
              <Text className="text-xl md:text-2xl lg:text-3xl font-mono" fw={700}>
                {formatCurrency(dashboardData?.banksSummary?.totalBalance || 0)}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconCoin size={40} />
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.activeBankAccounts')}</Text>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
                {dashboardData?.banksSummary?.accountCount || 0} {t('finance.dashboardPage.accounts')}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <IconRefresh size={40} />
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.dashboardPage.totalTransactions')}</Text>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
                {recentTransactions.length} {t('finance.dashboardPage.records')}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}
