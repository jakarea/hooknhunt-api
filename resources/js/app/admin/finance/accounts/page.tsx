'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  Card,
  Paper,
  Table,
  Tabs,
  Badge,
  Button,
  ActionIcon,
  Switch,
  NumberFormatter,
  Skeleton,
  Select,
  Loader,
  SimpleGrid,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconPencil,
  IconCheck,
  IconX,
  IconScale,
  IconChevronRight,
  IconBook,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { useFinanceStore } from '@/stores/financeStore'
import { modals } from '@mantine/modals'
import {
  getAccounts,
  deleteAccount,
  getAccountBalanceSummary,
  getTrialBalance,
  getAccountStatistics,
  type ChartOfAccount,
} from '@/utils/api'

type AccountType = 'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export default function AccountsPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const addRecentAccount = useFinanceStore((state) => state.addRecentAccount)

  // Permission check - user needs finance accounts view permission
  if (!hasPermission('finance_accounts_view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>{t('common.accessDenied')}</Title>
          <Text c="dimmed">{t('finance.accountsPage.accessDenied')}</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<AccountType>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'trial-balance' | 'summary'>('list')
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(false)
  const [balanceSummary, setBalanceSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [trialBalanceDate, setTrialBalanceDate] = useState<Date | null>(new Date())

  // Fetch accounts
  const fetchAccounts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await getAccounts()

      // Handle nested response structure - try multiple patterns
      let accountsData: ChartOfAccount[] = []

      if (Array.isArray(response)) {
        accountsData = response
      } else if (response && typeof response === 'object') {
        // Pattern 1: { data: [...] }
        if ('data' in response && Array.isArray(response.data)) {
          accountsData = response.data
        }
        // Pattern 2: { data: { data: [...] } }
        else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
          accountsData = response.data.data
        }
        // Pattern 3: { data: { status: true, data: [...] } }
        else if ('data' in response && response.data && typeof response.data === 'object' && 'status' in response.data && Array.isArray(response.data.data)) {
          accountsData = response.data.data
        }
      }


      // Convert 'income' to 'revenue' and handle field naming
      accountsData = accountsData.map((acc: any) => {
        const processed: any = {
          id: acc.id,
          name: acc.name,
          code: acc.code,
          type: acc.type === 'income' ? 'revenue' : acc.type,
          balance: acc.balance || 0,
          // Handle both camelCase (from API) and snake_case (if backend changes)
          isActive: acc.isActive ?? acc.is_active ?? true,
          parent_id: acc.parent_id ?? null,
          description: acc.description ?? null,
        }
        return processed
      })

      setAccounts(accountsData)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('common.somethingWentWrong') || 'Failed to load accounts',
        color: 'red',
      })
      setAccounts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  // Fetch trial balance
  const fetchTrialBalance = useCallback(async () => {
    try {
      setTrialBalanceLoading(true)
      const params: any = {
        include_zero_balance: false,
      }
      if (trialBalanceDate) {
        params.as_of_date = trialBalanceDate.toISOString().split('T')[0]
      }
      const response = await getTrialBalance(params)
      setTrialBalanceData(response.data)
    } catch (error) {
      console.error('Error fetching trial balance:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('common.somethingWentWrong') || 'Failed to load trial balance',
        color: 'red',
      })
    } finally {
      setTrialBalanceLoading(false)
    }
  }, [t, trialBalanceDate])

  // Fetch balance summary
  const fetchBalanceSummary = useCallback(async () => {
    try {
      setSummaryLoading(true)
      const response = await getAccountBalanceSummary()
      setBalanceSummary(response.data)
    } catch (error) {
      console.error('Error fetching balance summary:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('common.somethingWentWrong') || 'Failed to load balance summary',
        color: 'red',
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [t])

  // Initial load
  useEffect(() => {
    fetchAccounts(true)
  }, [])

  // Fetch trial balance when switching to that view
  useEffect(() => {
    if (viewMode === 'trial-balance' && !trialBalanceData) {
      fetchTrialBalance()
    }
  }, [viewMode, trialBalanceData, fetchTrialBalance])

  // Fetch balance summary when switching to that view
  useEffect(() => {
    if (viewMode === 'summary' && !balanceSummary) {
      fetchBalanceSummary()
    }
  }, [viewMode, balanceSummary, fetchBalanceSummary])

  // Get account type configuration
  const getTypeConfig = (type: ChartOfAccount['type']) => {
    const configs = {
      asset: { color: 'green', label: t('finance.accountsPage.types.asset') },
      liability: { color: 'red', label: t('finance.accountsPage.types.liability') },
      equity: { color: 'blue', label: t('finance.accountsPage.types.equity') },
      revenue: { color: 'cyan', label: t('finance.accountsPage.types.revenue') },
      expense: { color: 'orange', label: t('finance.accountsPage.types.expense') },
    }
    return configs[type]
  }

  // Filter accounts based on current filters
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          account.name?.toLowerCase().includes(searchLower) ||
          account.code?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Type filter (tabs)
      if (activeTab !== 'all' && account.type !== activeTab) {
        return false
      }

      // Active status filter
      if (!showInactive && !account.isActive) {
        return false
      }

      return true
    })
  }, [accounts, searchQuery, activeTab, showInactive])

  // Calculate statistics
  const statistics = useMemo(() => {
    const assets = filteredAccounts
      .filter((a) => a.type === 'asset')
      .reduce((sum, a) => sum + a.balance, 0)
    const liabilities = filteredAccounts
      .filter((a) => a.type === 'liability')
      .reduce((sum, a) => sum + a.balance, 0)
    const equity = filteredAccounts
      .filter((a) => a.type === 'equity')
      .reduce((sum, a) => sum + a.balance, 0)
    const revenue = filteredAccounts
      .filter((a) => a.type === 'revenue')
      .reduce((sum, a) => sum + a.balance, 0)
    const expenses = filteredAccounts
      .filter((a) => a.type === 'expense')
      .reduce((sum, a) => sum + a.balance, 0)

    return {
      total_assets: assets,
      total_liabilities: liabilities,
      total_equity: equity,
      total_revenue: revenue,
      total_expenses: expenses,
      net_income: revenue - expenses,
      total_count: filteredAccounts.length,
    }
  }, [filteredAccounts])

  // Track recent accounts in Zustand store
  useEffect(() => {
    if (filteredAccounts.length > 0 && !loading) {
      filteredAccounts.slice(0, 5).forEach(account => {
        addRecentAccount({
          id: account.id,
          name: account.name,
          code: account.code,
          type: account.type,
          viewedAt: new Date().toISOString()
        })
      })
    }
  }, [filteredAccounts, loading, addRecentAccount])

  // Handle refresh
  const handleRefresh = () => {
    fetchAccounts(false)
    notifications.show({
      title: t('finance.accountsPage.notification.refreshed'),
      message: t('finance.accountsPage.notification.refreshedMessage'),
      color: 'blue',
    })
  }

  // Handle edit
  const handleEdit = (accountId: number) => {
    // TODO: Navigate to edit page or open modal
    notifications.show({
      title: t('finance.accountsPage.notification.edit'),
      message: t('finance.accountsPage.notification.editMessage', { id: accountId }),
      color: 'blue',
    })
  }

  // Handle delete
  const handleDelete = async (accountId: number, accountName: string, accountCode: string) => {
    modals.openConfirmModal({
      title: 'Delete Account',
      children: (
        <Text className="text-sm md:text-base">
          Are you sure you want to delete account{' '}
          <Text span fw={600} c="blue">
            {accountCode} - {accountName}
          </Text>
          ? This action cannot be undone.
        </Text>
      ),
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      confirmProps: { color: 'red' },
      onCancel: () => {},
      onConfirm: async () => {
        try {
          await deleteAccount(accountId)
          notifications.show({
            title: 'Account Deleted',
            message: `Account ${accountCode} - ${accountName} has been deleted.`,
            color: 'green',
          })
          fetchAccounts(false)
        } catch (error: any) {
          notifications.show({
            title: t('common.error'),
            message: error.response?.data?.message || 'Failed to delete account. It may have existing transactions.',
            color: 'red',
          })
        }
      },
    })
  }

  // Format account code with monospace
  const formatCode = (code: string) => {
    return <Text className="font-mono" fw={600}>{code}</Text>
  }

  // Loading state
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Skeleton height={40} width="100%" />
          <Group>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={100} style={{ flex: 1 }} />
            ))}
          </Group>
          <Skeleton height={60} radius="md" />
          <Skeleton height={400} radius="md" />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">{t('finance.accountsPage.title')}</Title>
              <Text c="dimmed" className="text-sm md:text-base">{t('finance.accountsPage.subtitle')}</Text>
            </Box>
            <Group>
              <ActionIcon variant="light" className="text-lg md:text-xl lg:text-2xl" onClick={handleRefresh} loading={refreshing}>
                <IconRefresh size={18} />
              </ActionIcon>
              <Button
                leftSection={<IconPlus size={16} />}
                component={Link}
                to="/finance/accounts/create"
              >
                {t('finance.accountsPage.addAccount')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* View Mode Selector */}
        <Card withBorder p="sm" radius="md">
          <Group>
            <Text className="text-sm md:text-base" fw={600}>View:</Text>
            <Group gap="xs">
              <Button
                variant={viewMode === 'list' ? 'filled' : 'light'}
                size="sm"
                leftSection={<IconBook size={14} />}
                onClick={() => setViewMode('list')}
              >
                Accounts List
              </Button>
              <Button
                variant={viewMode === 'trial-balance' ? 'filled' : 'light'}
                size="sm"
                leftSection={<IconScale size={14} />}
                onClick={() => setViewMode('trial-balance')}
              >
                Trial Balance
              </Button>
              <Button
                variant={viewMode === 'summary' ? 'filled' : 'light'}
                size="sm"
                leftSection={<IconChevronRight size={14} />}
                onClick={() => setViewMode('summary')}
              >
                Balance Summary
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Statistics Cards - Only show in list view */}
        <Group>
          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="green" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.assets')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
              <NumberFormatter value={statistics.total_assets} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="red" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.liabilities')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">
              <NumberFormatter value={statistics.total_liabilities} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="blue" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.equity')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="blue">
              <NumberFormatter value={statistics.total_equity} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="cyan" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.revenue')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="cyan">
              <NumberFormatter value={statistics.total_revenue} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="orange" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.expenses')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">
              <NumberFormatter value={statistics.total_expenses} prefix="৳" thousandSeparator />
            </Text>
          </Card>
        </Group>

        {/* Filters */}
        <Group>
          <TextInput
            placeholder={t('finance.accountsPage.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="flex-1"
          />

          <Group gap="sm">
            <Switch
              label={t('finance.accountsPage.showInactive')}
              checked={showInactive}
              onChange={(event) => setShowInactive(event.currentTarget.checked)}
              color="gray"
            />
          </Group>
        </Group>

        {/* List View */}
        {viewMode === 'list' && (
          <>
        {/* Statistics Cards - Only show in list view */}
        <Group>
          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="green" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.assets')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
              <NumberFormatter value={statistics.total_assets} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="red" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.liabilities')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">
              <NumberFormatter value={statistics.total_liabilities} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="blue" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.equity')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="blue">
              <NumberFormatter value={statistics.total_equity} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="cyan" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.revenue')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="cyan">
              <NumberFormatter value={statistics.total_revenue} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="orange" className="text-sm md:text-base" variant="light">{t('finance.accountsPage.types.expenses')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="orange">
              <NumberFormatter value={statistics.total_expenses} prefix="৳" thousandSeparator />
            </Text>
          </Card>
        </Group>

        {/* Filters */}
        <Group>
          <TextInput
            placeholder={t('finance.accountsPage.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="flex-1"
          />

          <Group gap="sm">
            <Switch
              label={t('finance.accountsPage.showInactive')}
              checked={showInactive}
              onChange={(event) => setShowInactive(event.currentTarget.checked)}
              color="gray"
            />
          </Group>
        </Group>

        {/* Tabs for account types */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value as AccountType)}>
          <Tabs.List>
            <Tabs.Tab value="all">{t('finance.accountsPage.tabs.all')} ({accounts.length})</Tabs.Tab>
            <Tabs.Tab value="asset">{t('finance.accountsPage.tabs.assets')} ({accounts.filter(a => a.type === 'asset').length})</Tabs.Tab>
            <Tabs.Tab value="liability">{t('finance.accountsPage.tabs.liabilities')} ({accounts.filter(a => a.type === 'liability').length})</Tabs.Tab>
            <Tabs.Tab value="equity">{t('finance.accountsPage.tabs.equity')} ({accounts.filter(a => a.type === 'equity').length})</Tabs.Tab>
            <Tabs.Tab value="revenue">{t('finance.accountsPage.tabs.revenue')} ({accounts.filter(a => a.type === 'revenue' || a.type === 'income').length})</Tabs.Tab>
            <Tabs.Tab value="expense">{t('finance.accountsPage.tabs.expenses')} ({accounts.filter(a => a.type === 'expense').length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab}>
            {/* Desktop Table View */}
            <Card withBorder p="0" radius="md" mt="md" shadow="sm" display={{ base: 'none', md: 'block' }}>
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('finance.accountsPage.tableHeaders.code')}</Table.Th>
                      <Table.Th>{t('finance.accountsPage.tableHeaders.accountName')}</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>{t('finance.accountsPage.tableHeaders.type')}</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>{t('finance.accountsPage.tableHeaders.balance')}</Table.Th>
                      <Table.Th>{t('finance.accountsPage.tableHeaders.status')}</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>{t('finance.accountsPage.tableHeaders.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredAccounts.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">{t('finance.accountsPage.noAccounts')}</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredAccounts.map((account) => {
                        const typeConfig = getTypeConfig(account.type)
                        return (
                          <Table.Tr key={account.id}>
                            <Table.Td>{formatCode(account.code)}</Table.Td>
                            <Table.Td>
                              <Text className="text-sm md:text-base" fw={500}>
                                {account.name}
                                {account.parent_id && (
                                  <Text className="text-xs md:text-sm" c="dimmed" mt={2}>
                                    {t('finance.accountsPage.subAccount')}
                                  </Text>
                                )}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text className="text-sm md:text-base" c="dimmed">
                                {account.description || '-'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={typeConfig.color} variant="light" className="text-sm md:text-base">
                                {typeConfig.label}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text
                                className="text-sm md:text-base"
                                fw={600}
                                ta="right"
                                c={account.balance >= 0 ? 'green' : 'red'}
                              >
                                <NumberFormatter value={Math.abs(account.balance)} prefix="৳" thousandSeparator />
                                {account.balance < 0 && ' (Cr)'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {account.isActive ? (
                                <Badge color="green" variant="light" className="text-sm md:text-base" leftSection={<IconCheck size={12} />}>
                                  {t('finance.accountsPage.active')}
                                </Badge>
                              ) : (
                                <Badge color="gray" variant="light" className="text-sm md:text-base" leftSection={<IconX size={12} />}>
                                  {t('finance.accountsPage.inactive')}
                                </Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" justify="center">
                                <ActionIcon
                                  className="text-sm md:text-base"
                                  color="blue"
                                  variant="light"
                                  onClick={() => handleEdit(account.id)}
                                  title={t('common.edit')}
                                >
                                  <IconPencil size={14} />
                                </ActionIcon>
                                <ActionIcon
                                  className="text-sm md:text-base"
                                  color="red"
                                  variant="light"
                                  onClick={() => handleDelete(account.id, account.name, account.code)}
                                  title={t('common.delete')}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        )
                      })
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>

            {/* Mobile Card View */}
            <Stack display={{ base: 'block', md: 'none' }} mt="md">
              {filteredAccounts.length === 0 ? (
                <Card withBorder p="xl" ta="center" shadow="sm">
                  <Text c="dimmed">{t('finance.accountsPage.noAccounts')}</Text>
                </Card>
              ) : (
                filteredAccounts.map((account) => {
                  const typeConfig = getTypeConfig(account.type)
                  return (
                    <Card key={account.id} shadow="sm" p="sm" radius="md" withBorder>
                      {/* Header: Code + Status Badge */}
                      <Group justify="space-between" mb="xs">
                        <Text fw={700} className="font-mono">
                          {account.code}
                        </Text>
                        {account.isActive ? (
                          <Badge color="green" variant="light" className="text-sm md:text-base" leftSection={<IconCheck size={12} />}>
                            {t('finance.accountsPage.active')}
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light" className="text-sm md:text-base" leftSection={<IconX size={12} />}>
                            {t('finance.accountsPage.inactive')}
                          </Badge>
                        )}
                      </Group>

                      {/* Account Name */}
                      <Group justify="space-between" mb="xs">
                        <Text className="text-sm md:text-base" fw={500}>
                          {account.name}
                        </Text>
                        <Badge color={typeConfig.color} variant="light" className="text-sm md:text-base">
                          {typeConfig.label}
                        </Badge>
                      </Group>

                      {/* Sub-account indicator */}
                      {account.parent_id && (
                        <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                          {t('finance.accountsPage.subAccount')}
                        </Text>
                      )}

                      {/* Description */}
                      {account.description && (
                        <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                          {account.description}
                        </Text>
                      )}

                      {/* Balance */}
                      <Group justify="space-between" mb="xs">
                        <Text className="text-xs md:text-sm" c="dimmed">{t('finance.accountsPage.tableHeaders.balance')}</Text>
                        <Text
                          className="text-sm md:text-base"
                          fw={700}
                          c={account.balance >= 0 ? 'green' : 'red'}
                        >
                          <NumberFormatter value={Math.abs(account.balance)} prefix="৳" thousandSeparator />
                          {account.balance < 0 && ' (Cr)'}
                        </Text>
                      </Group>

                      {/* Actions */}
                      <Group justify="flex-end" mt="xs">
                        <ActionIcon
                          className="text-sm md:text-base"
                          color="blue"
                          variant="light"
                          onClick={() => handleEdit(account.id)}
                        >
                          <IconPencil size={14} />
                        </ActionIcon>
                        <ActionIcon
                          className="text-sm md:text-base"
                          color="red"
                          variant="light"
                          onClick={() => handleDelete(account.id, account.name, account.code)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  )
                })
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Summary Stats */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text className="text-sm md:text-base" c="dimmed">
              {t('finance.accountsPage.totalAccounts')}: {statistics.total_count}
            </Text>
            {activeTab === 'all' && (
              <Group gap="xl">
                <Text className="text-sm md:text-base">
                  <Text span fw={600} c="green">{t('finance.accountsPage.netIncome')}:</Text> ৳{statistics.net_income.toLocaleString()}
                </Text>
              </Group>
            )}
          </Group>
        </Card>
          </>
        )}

        {/* Trial Balance View */}
        {viewMode === 'trial-balance' && (
          <Stack>
            <Group justify="space-between">
              <Title order={2} className="text-base md:text-lg lg:text-xl">Trial Balance Report</Title>
              <Group>
                <DatePickerInput
                  placeholder="As of date"
                  value={trialBalanceDate}
                  onChange={setTrialBalanceDate}
                  clearable
                />
                <Button onClick={fetchTrialBalance} loading={trialBalanceLoading}>
                  <IconRefresh size={16} />
                </Button>
              </Group>
            </Group>

            {trialBalanceLoading ? (
              <Card withBorder p="xl">
                <Loader />
              </Card>
            ) : trialBalanceData ? (
              <>
                {/* Trial Balance Summary */}
                <Group>
                  <Card withBorder p="md" className="flex-1">
                    <Text className="text-sm md:text-base" c="dimmed">Total Debit</Text>
                    <Text className="text-xl md:text-2xl" fw={700} c="blue">
                      ৳{(trialBalanceData.total_debit || trialBalanceData.totalDebit || 0)?.toLocaleString()}
                    </Text>
                  </Card>
                  <Card withBorder p="md" className="flex-1">
                    <Text className="text-sm md:text-base" c="dimmed">Total Credit</Text>
                    <Text className="text-xl md:text-2xl" fw={700} c="orange">
                      ৳{(trialBalanceData.total_credit || trialBalanceData.totalCredit || 0)?.toLocaleString()}
                    </Text>
                  </Card>
                  <Card withBorder p="md" className="flex-1">
                    <Text className="text-sm md:text-base" c="dimmed">Difference</Text>
                    <Text className="text-xl md:text-2xl" fw={700} c={trialBalanceData.difference === 0 ? 'green' : 'red'}>
                      ৳{Math.abs(trialBalanceData.difference || 0).toLocaleString()}
                    </Text>
                  </Card>
                  <Card withBorder p="md" className="flex-1">
                    <Text className="text-sm md:text-base" c="dimmed">Status</Text>
                    <Badge
                      color={trialBalanceData.is_balanced ? 'green' : 'red'}
                      className="text-sm md:text-base"
                      variant="light"
                    >
                      {trialBalanceData.is_balanced ? 'Balanced' : 'Not Balanced'}
                    </Badge>
                  </Card>
                </Group>

                {/* Trial Balance Table */}
                <Card withBorder p="0" radius="md">
                  <Table.ScrollContainer minWidth={800}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Code</Table.Th>
                          <Table.Th>Account Name</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th ta="right">Debit</Table.Th>
                          <Table.Th ta="right">Credit</Table.Th>
                          <Table.Th ta="right">Balance</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {trialBalanceData.accounts?.map((account: any) => (
                          <Table.Tr key={account.id}>
                            <Table.Td><Text className="font-mono">{account.code}</Text></Table.Td>
                            <Table.Td>{account.name}</Table.Td>
                            <Table.Td>
                              <Badge color={
                                account.type === 'asset' ? 'green' :
                                account.type === 'liability' ? 'red' :
                                account.type === 'equity' ? 'blue' :
                                account.type === 'income' ? 'cyan' : 'orange'
                              } variant="light">
                                {account.type_label || account.type}
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="right">
                              {account.debit > 0 && (
                                <NumberFormatter value={account.debit} prefix="৳" thousandSeparator />
                              )}
                            </Table.Td>
                            <Table.Td ta="right">
                              {account.credit > 0 && (
                                <NumberFormatter value={account.credit} prefix="৳" thousandSeparator />
                              )}
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text fw={600} c={account.balance >= 0 ? 'green' : 'red'}>
                                <NumberFormatter value={Math.abs(account.balance)} prefix="৳" thousandSeparator />
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </Card>
              </>
            ) : null}
          </Stack>
        )}

        {/* Balance Summary View */}
        {viewMode === 'summary' && (
          <Stack>
            <Title order={2} className="text-base md:text-lg lg:text-xl">Balance Summary</Title>

            {summaryLoading ? (
              <Card withBorder p="xl">
                <Loader />
              </Card>
            ) : balanceSummary ? (
              <>
                {/* Accounting Equation */}
                <Card withBorder p="md" radius="md">
                  <Group mb="md">
                    <IconScale size={20} />
                    <Text className="text-base md:text-lg" fw={600}>Accounting Equation</Text>
                  </Group>
                  <Group>
                    <Text className="text-sm md:text-base">
                      Assets (৳{balanceSummary.accounting_equation?.assets?.toLocaleString() || 0}) ={' '}
                      Liabilities (৳{balanceSummary.accounting_equation?.liabilities?.toLocaleString() || 0}) +{' '}
                      Equity (৳{balanceSummary.accounting_equation?.equity?.toLocaleString() || 0})
                    </Text>
                  </Group>
                  {balanceSummary.accounting_equation && (
                    <Badge
                      color={balanceSummary.accounting_equation.is_balanced ? 'green' : 'red'}
                      className="text-sm md:text-base"
                      mt="sm"
                    >
                      {balanceSummary.accounting_equation.is_balanced ? 'Balanced ✓' : 'Not Balanced ✗'}
                    </Badge>
                  )}
                </Card>

                {/* Totals by Type */}
                <Title order={3} className="text-sm md:text-base">Totals by Account Type</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  {balanceSummary.totals_by_type?.map((item: any) => (
                    <Card key={item.type} withBorder p="md" radius="md">
                      <Group mb="xs">
                        <Badge
                          color={
                            item.type === 'asset' ? 'green' :
                            item.type === 'liability' ? 'red' :
                            item.type === 'equity' ? 'blue' :
                            item.type === 'income' ? 'cyan' : 'orange'
                          }
                          variant="light"
                        >
                          {item.label}
                        </Badge>
                      </Group>
                      <Text className="text-xl md:text-2xl" fw={700}>
                        <NumberFormatter value={item.amount} prefix="৳" thousandSeparator />
                      </Text>
                    </Card>
                  ))}
                </SimpleGrid>

                {/* Summary Stats */}
                <Card withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <Text className="text-sm md:text-base">Total Accounts: {balanceSummary.total_accounts}</Text>
                    {balanceSummary.net_income !== undefined && (
                      <Text className="text-sm md:text-base">
                        <Text span fw={600} c="green">Net Income:</Text> ৳{balanceSummary.net_income?.toLocaleString() || 0}
                      </Text>
                    )}
                  </Group>
                </Card>
              </>
            ) : null}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
