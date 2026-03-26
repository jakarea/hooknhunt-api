'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  Select,
  Card,
  Table,
  Pagination,
  Badge,
  Button,
  ActionIcon,
  SimpleGrid,
  NumberFormatter,
  Skeleton,
} from '@mantine/core'
import { usePermissions } from '@/hooks/usePermissions'
import {
  IconSearch,
  IconRefresh,
  IconDownload,
  IconArrowUp,
  IconArrowDown,
  IconArrowsExchange,
  IconReceipt,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import {
  getTransactions,
  getTransactionStatistics,
  getBanks,
  type UnifiedTransaction,
  type TransactionType,
} from '@/utils/api'

export default function TransactionsPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance transactions view permission
  if (!hasPermission('finance.transactions.index')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Transactions.</Text>
        </Card>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<TransactionType>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Fetch transactions
  const fetchTransactions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const filters: any = {
        page: currentPage,
        per_page: 50,
      }
      if (searchQuery) filters.search = searchQuery
      if (selectedBank) filters.bank_id = parseInt(selectedBank)
      if (selectedType !== 'all') filters.type = selectedType
      if (startDate) filters.start_date = startDate.toISOString().split('T')[0]
      if (endDate) filters.end_date = endDate.toISOString().split('T')[0]

      const response = await getTransactions(filters)

      console.log('DEBUG: Raw response:', response)

      // Handle response structure - backend returns { data: { transactions: [], meta: {} } }
      let transactionsData: UnifiedTransaction[] = []
      let meta: any = null

      if (response && typeof response === 'object') {
        if ('data' in response) {
          const innerData = response.data
          console.log('DEBUG: response.data:', innerData)

          if (typeof innerData === 'object' && 'transactions' in innerData) {
            // Backend returns { data: { transactions: [], meta: {} } }
            transactionsData = innerData.transactions || []
            meta = innerData.meta || null
          } else if ('meta' in innerData) {
            // Handle case where data includes meta directly
            meta = innerData.meta
            if (Array.isArray(innerData.transactions)) {
              transactionsData = innerData.transactions
            }
          } else if (Array.isArray(innerData)) {
            transactionsData = innerData
          }
        } else if (Array.isArray(response)) {
          transactionsData = response
        }
      }

      console.log('DEBUG: transactionsData count:', transactionsData.length)
      console.log('DEBUG: First transaction:', transactionsData[0])
      console.log('DEBUG: transactionDate of first:', transactionsData[0]?.transactionDate)

      setTransactions(transactionsData)
      if (meta) {
        setTotalPages(meta.lastPage || 1)
        setTotalItems(meta.total || 0)
      }
    } catch (error) {
      notifications.show({
        title: t('finance.banksPage.transactionsPage.notification.errorLoading'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
      setTransactions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchQuery, selectedBank, selectedType, startDate, endDate, currentPage, t])

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const filters: any = {}
      if (selectedBank) filters.bank_id = parseInt(selectedBank)
      if (startDate) filters.start_date = startDate.toISOString().split('T')[0]
      if (endDate) filters.end_date = endDate.toISOString().split('T')[0]

      const response = await getTransactionStatistics(filters)

      // Backend returns { status: true, data: { ...statistics } }
      if (response && typeof response === 'object') {
        if ('data' in response) {
          setStatistics(response.data)
        } else {
          setStatistics(response)
        }
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }, [selectedBank, startDate, endDate])

  // Fetch banks for dropdown
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await getBanks()
        let banksData: any[] = []
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            banksData = response.data
          } else if (Array.isArray(response)) {
            banksData = response
          }
        }
        setBanks(banksData)
      } catch (error) {
        console.error('Failed to fetch banks:', error)
      }
    }
    fetchBanks()
  }, [])

  // Initial load
  useEffect(() => {
    fetchTransactions(true)
    fetchStatistics()
  }, [])

  // Refresh when filters change (reset to page 1)
  useEffect(() => {
    setCurrentPage(1)
    fetchTransactions(false)
    fetchStatistics()
  }, [searchQuery, selectedBank, selectedType, startDate, endDate])

  // Refresh when page changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchTransactions(false)
    }
  }, [currentPage])

  // Manual refresh
  const handleRefresh = () => {
    fetchTransactions(false)
    fetchStatistics()
    notifications.show({
      title: t('finance.banksPage.transactionsPage.notification.refreshed'),
      message: t('finance.banksPage.transactionsPage.notification.refreshedMessage'),
      color: 'blue',
    })
  }

  // Handle export
  const handleExport = () => {
    const headers = [
      t('finance.banksPage.transactionsPage.tableHeaders.date'),
      t('finance.banksPage.transactionsPage.tableHeaders.type'),
      t('finance.banksPage.transactionsPage.tableHeaders.description'),
      t('finance.banksPage.transactionsPage.tableHeaders.reference'),
      t('finance.banksPage.transactionsPage.tableHeaders.amount'),
    ]

    const rows = transactions.map((t) => [
      t.transactionDate,
      t.type,
      t.description || '',
      t.referenceNumber || '',
      t.amount?.toString() || '0',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    notifications.show({
      title: t('finance.banksPage.transactionsPage.notification.exportSuccess'),
      message: t('finance.banksPage.transactionsPage.notification.exportSuccessMessage'),
      color: 'green',
    })
  }

  // Get transaction type badge color, label and icon
  const getTypeBadge = (transaction: UnifiedTransaction) => {
    const isExpense = transaction.transactionType === 'expense'
    const type = transaction.type

    const config: Record<string, { color: string; label: string; icon: any }> = {
      deposit: {
        color: 'green',
        label: t('finance.banksPage.transactionsPage.transactionTypes.deposit'),
        icon: IconArrowUp
      },
      withdrawal: {
        color: 'red',
        label: t('finance.banksPage.transactionsPage.transactionTypes.withdrawal'),
        icon: IconArrowDown
      },
      transfer_in: {
        color: 'cyan',
        label: t('finance.banksPage.transactionsPage.transactionTypes.transferIn'),
        icon: IconArrowDown
      },
      transfer_out: {
        color: 'orange',
        label: t('finance.banksPage.transactionsPage.transactionTypes.transferOut'),
        icon: IconArrowUp
      },
      expense: {
        color: 'violet',
        label: t('finance.banksPage.transactionsPage.transactionTypes.expense') || 'Expense',
        icon: IconReceipt
      },
    }

    const baseConfig = config[type] || {
      color: 'gray',
      label: t('finance.banksPage.transactionsPage.transactionTypes.unknown'),
      icon: IconArrowsExchange
    }

    // Add bank name to label if available
    const fullLabel = transaction.bank?.name
      ? `${baseConfig.label} (${transaction.bank.name})`
      : baseConfig.label

    return { ...baseConfig, fullLabel }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Format amount
  const formatAmount = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return num.toLocaleString()
  }

  // Check if transaction is inflow
  const isInflow = (transaction: UnifiedTransaction) => {
    if (transaction.transactionType === 'expense') return false
    return ['deposit', 'transfer_in'].includes(transaction.type)
  }

  // Bank options for select
  const bankOptions = useMemo(
    () =>
      banks.map((bank) => ({
        value: bank.id.toString(),
        label: bank.name,
      })),
    [banks]
  )

  // Type options (including expense)
  const typeOptions = [
    { value: 'all', label: t('finance.banksPage.transactionsPage.typeLabels.all') },
    { value: 'deposit', label: t('finance.banksPage.transactionsPage.typeLabels.deposits') },
    { value: 'withdrawal', label: t('finance.banksPage.transactionsPage.typeLabels.withdrawals') },
    { value: 'transfer_in', label: t('finance.banksPage.transactionsPage.typeLabels.transfersIn') },
    { value: 'transfer_out', label: t('finance.banksPage.transactionsPage.typeLabels.transfersOut') },
    { value: 'expense', label: t('finance.banksPage.transactionsPage.typeLabels.expenses') || 'Expenses' },
    { value: 'bank', label: t('finance.banksPage.transactionsPage.typeLabels.bankTransactions') || 'Bank Transactions' },
  ]

  // Loading state
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Skeleton height={40} width="100%" />
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={100} radius="md" />
            ))}
          </SimpleGrid>
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
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                {t('finance.banksPage.transactionsPage.title')}
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                All financial transactions including bank transactions and expenses
              </Text>
            </Box>
            <Group>
              <ActionIcon variant="light" onClick={handleRefresh} loading={refreshing}>
                <IconRefresh size={18} />
              </ActionIcon>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('finance.banksPage.transactionsPage.export')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Statistics Cards */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconArrowUp size={20} style={{ color: 'var(--mantine-color-green-6)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Total Inflow</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
              <NumberFormatter value={statistics?.total_inflow || 0} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconArrowDown size={20} style={{ color: 'var(--mantine-color-red-6)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Total Outflow</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
              <NumberFormatter value={statistics?.total_outflow || 0} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconArrowsExchange size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Net Flow</Text>
            </Group>
            <Text
              className="text-xl md:text-2xl lg:text-3xl"
              fw={700}
              c={(statistics?.net_flow || 0) >= 0 ? 'green' : 'red'}
            >
              <NumberFormatter value={statistics?.net_flow || 0} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconRefresh size={20} style={{ color: 'var(--mantine-color-purple-6)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Transactions</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{totalItems || statistics?.transaction_count || 0}</Text>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <SimpleGrid cols={{ base: 1, md: 5 }} spacing="md">
          <TextInput
            placeholder={t('finance.banksPage.transactionsPage.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />

          <Select
            placeholder={t('finance.banksPage.transactionsPage.selectBank')}
            data={bankOptions}
            value={selectedBank}
            onChange={setSelectedBank}
            clearable
            searchable
          />

          <Select
            placeholder={t('finance.banksPage.transactionsPage.selectType')}
            data={typeOptions}
            value={selectedType}
            onChange={(value) => setSelectedType(value as TransactionType)}
          />

          <DateInput
            placeholder={t('finance.banksPage.transactionsPage.startDate')}
            value={startDate}
            onChange={setStartDate}
            maxDate={endDate || undefined}
            clearable
          />

          <DateInput
            placeholder={t('finance.banksPage.transactionsPage.endDate')}
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            clearable
          />
        </SimpleGrid>

        {/* Desktop Table */}
        <Card withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} shadow="sm">
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.banksPage.transactionsPage.tableHeaders.date')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.transactionsPage.tableHeaders.type')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.transactionsPage.tableHeaders.description')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.transactionsPage.tableHeaders.reference')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t('finance.banksPage.transactionsPage.tableHeaders.amount')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transactions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Box py="xl" ta="center">
                        <Text c="dimmed">{t('finance.banksPage.transactionsPage.noTransactions')}</Text>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  transactions.map((transaction) => {
                    const typeConfig = getTypeBadge(transaction)
                    return (
                      <Table.Tr key={transaction.id}>
                        <Table.Td>
                          <Text className="text-sm md:text-base">{formatDate(transaction.transactionDate)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={typeConfig.color} variant="light" leftSection={<typeConfig.icon size={12} />}>
                            {typeConfig.fullLabel}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text className="text-sm md:text-base">{transaction.description || '-'}</Text>
                          {transaction.expenseData?.account && (
                            <Text size="xs" c="dimmed">Account: {transaction.expenseData.account.name}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text className="text-sm md:text-base" c="dimmed">
                            {transaction.referenceNumber || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            className="text-sm md:text-base"
                            fw={600}
                            ta="right"
                            c={isInflow(transaction) ? 'green' : 'red'}
                          >
                            {isInflow(transaction) ? '+' : '-'}৳{' '}
                            {formatAmount(transaction.amount)}
                          </Text>
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
        <Stack display={{ base: 'block', md: 'none' }}>
          {transactions.length === 0 ? (
            <Card withBorder p="xl" ta="center" shadow="sm">
              <Text c="dimmed">{t('finance.banksPage.transactionsPage.noTransactions')}</Text>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const typeConfig = getTypeBadge(transaction)
              return (
                <Card key={transaction.id} shadow="sm" p="sm" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Badge color={typeConfig.color} variant="light" leftSection={<typeConfig.icon size={12} />}>
                      {typeConfig.fullLabel}
                    </Badge>
                    <Text size="xs" c="dimmed">{formatDate(transaction.transactionDate)}</Text>
                  </Group>

                  <Group justify="space-between" mb="xs">
                    <Text fw={500} truncate style={{ maxWidth: '60%' }}>
                      {transaction.description || '-'}
                    </Text>
                    <Text
                      fw={700}
                      c={isInflow(transaction) ? 'green' : 'red'}
                    >
                      {isInflow(transaction) ? '+' : '-'}৳{' '}
                      {formatAmount(transaction.amount)}
                    </Text>
                  </Group>

                  {transaction.referenceNumber && (
                    <Text size="xs" c="dimmed">
                      Ref: {transaction.referenceNumber}
                    </Text>
                  )}

                  {transaction.expenseData?.account && (
                    <Text size="xs" c="dimmed">
                      Account: {transaction.expenseData.account.name}
                    </Text>
                  )}
                </Card>
              )
            })
          )}
        </Stack>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="flex-end">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
            />
          </Group>
        )}
      </Stack>
    </Box>
  )
}
