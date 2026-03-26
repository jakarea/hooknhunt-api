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
  NumberFormatter,
  Skeleton,
} from '@mantine/core'
import { useFinanceStore } from '@/stores/financeStore'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconCheck,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { Link, useNavigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { modals } from '@mantine/modals'
import {
  getExpenses,
  getAccounts,
  approveExpense,
  deleteExpense,
  type Expense,
  type ExpenseFilters,
  type ChartOfAccount,
} from '@/utils/api'

type ExpenseStatus = 'all' | 'pending' | 'approved'

export default function ExpensesPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()

  // Zustand store for finance state
  const addRecentExpense = useFinanceStore((state) => state.addRecentExpense)

  // Permission check - user needs finance expenses view permission
  if (!hasPermission('finance_expenses_view')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Expenses.</Text>
        </Card>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch expenses
  const fetchExpenses = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const filters: ExpenseFilters = {}
      if (searchQuery) filters.search = searchQuery
      if (selectedAccount) filters.account_id = parseInt(selectedAccount)
      if (selectedStatus !== 'all') filters.is_approved = selectedStatus === 'approved'
      if (startDate) filters.start_date = startDate.toISOString().split('T')[0]
      if (endDate) filters.end_date = endDate.toISOString().split('T')[0]

      const response = await getExpenses(filters)

      // Handle nested response structure
      let expensesData: Expense[] = []
      if (response && typeof response === 'object') {
        if ('data' in response) {
          const innerData = response.data
          if (typeof innerData === 'object' && 'data' in innerData && Array.isArray(innerData.data)) {
            expensesData = innerData.data
          } else if (Array.isArray(innerData)) {
            expensesData = innerData
          }
        } else if (Array.isArray(response)) {
          expensesData = response
        }
      }

      // Convert is_approved from 0/1 to boolean, and handle snake_case to camelCase
      // API returns camelCase due to CamelCaseResponse middleware
      expensesData = expensesData.map((expense: any) => ({
        ...expense,
        isApproved: expense.is_approved === 1 || expense.is_approved === true
          || expense.isApproved === 1 || expense.isApproved === true,
        expenseDate: expense.expense_date || expense.expenseDate,
        referenceNumber: expense.reference_number || expense.referenceNumber,
        accountId: expense.account_id || expense.accountId,
        paidById: expense.paid_by || expense.paidById,
      }))

      setExpenses(expensesData)
      setCurrentPage(1)
    } catch (error) {
      notifications.show({
        title: t('finance.banksPage.expensesPage.notification.errorLoading') || 'Error Loading',
        message: t('common.somethingWentWrong') || 'Something went wrong',
        color: 'red',
      })
      setExpenses([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchQuery, selectedAccount, selectedStatus, startDate, endDate, t])

  // Fetch accounts for dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await getAccounts()
        let accountsData: ChartOfAccount[] = []
        if (response && typeof response === 'object') {
          if ('data' in response && Array.isArray(response.data)) {
            accountsData = response.data
          } else if (Array.isArray(response)) {
            accountsData = response
          }
        }
        // Filter only expense accounts
        setAccounts(accountsData.filter((acc) => acc.type === 'expense'))
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      }
    }
    fetchAccounts()
  }, [])

  // Track recently viewed expenses (when page first loads)
  useEffect(() => {
    if (expenses.length > 0) {
      // Add first 5 expenses to recent items
      expenses.slice(0, 5).forEach(expense => {
        addRecentExpense({
          id: expense.id,
          title: expense.title,
          amount: parseFloat(expense.amount || '0'),
          viewedAt: new Date().toISOString()
        })
      })
    }
  }, [expenses, addRecentExpense])

  // Initial load
  useEffect(() => {
    fetchExpenses(true)
  }, [])

  // Filter expenses client-side (for date range and additional filtering)
  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      // Date filter
      if (startDate) {
        const expenseDate = new Date(expense.expenseDate)
        if (expenseDate < startDate) return false
      }

      if (endDate) {
        const expenseDate = new Date(expense.expenseDate)
        if (expenseDate > endDate) return false
      }

      return true
    })

    // Sort by created_at desc (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })
  }, [expenses, startDate, endDate])

  // Pagination
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredExpenses.slice(start, start + itemsPerPage)
  }, [filteredExpenses, currentPage])

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
    const pendingAmount = filteredExpenses
      .filter((e) => !e.isApproved)
      .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
    const approvedAmount = filteredExpenses
      .filter((e) => e.isApproved)
      .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
    const pendingCount = filteredExpenses.filter((e) => !e.isApproved).length

    return {
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      approved_amount: approvedAmount,
      pending_count: pendingCount,
      total_count: filteredExpenses.length,
    }
  }, [filteredExpenses])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchExpenses(false)
    notifications.show({
      title: t('finance.banksPage.expensesPage.notification.refreshed'),
      message: t('finance.banksPage.expensesPage.notification.refreshedMessage'),
      color: 'blue',
    })
  }

  // Handle approve
  const handleApprove = async (expenseId: number) => {
    try {
      console.log('Approving expense:', expenseId)
      const response = await approveExpense(expenseId)
      console.log('Approve response:', response)

      notifications.show({
        title: t('finance.banksPage.expensesPage.notification.approved'),
        message: t('finance.banksPage.expensesPage.notification.approvedMessage', { id: expenseId }),
        color: 'green',
      })
      fetchExpenses(false)
    } catch (error: any) {
      console.error('Failed to approve expense:', error)
      // Extract actual error message from API response
      const errorMessage = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || t('common.somethingWentWrong')
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      })
    }
  }

  // Handle edit
  const handleEdit = (expenseId: number) => {
    navigate(`/finance/expenses/${expenseId}/edit`)
  }

  // Handle delete
  const handleDelete = async (expenseId: number, expenseTitle: string) => {
    modals.openConfirmModal({
      title: t('finance.banksPage.expensesPage.deleteConfirm.title') || 'Delete Expense',
      children: (
        <Text className="text-sm md:text-base">
          {t('finance.banksPage.expensesPage.deleteConfirm.message') || 'Are you sure you want to delete'}{' '}
          <Text span fw={600} c="blue">
            "{expenseTitle}"
          </Text>
          ?
        </Text>
      ),
      labels: {
        confirm: t('finance.banksPage.expensesPage.deleteConfirm.confirm') || 'Delete',
        cancel: t('finance.banksPage.expensesPage.deleteConfirm.cancel') || 'Cancel',
      },
      confirmProps: { color: 'red' },
      onCancel: () => {},
      onConfirm: async () => {
        try {
          await deleteExpense(expenseId)
          notifications.show({
            title: t('finance.banksPage.expensesPage.notification.deleteSuccess') || 'Deleted',
            message: t('finance.banksPage.expensesPage.notification.deleteSuccessMessage', {
              title: expenseTitle,
            }),
            color: 'green',
          })
          fetchExpenses(false)
        } catch (error) {
          notifications.show({
            title: t('common.error'),
            message: t('common.somethingWentWrong'),
            color: 'red',
          })
        }
      },
    })
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Account options for select
  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id.toString(),
        label: `${account.name} (${account.code})`,
      })),
    [accounts]
  )

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: t('finance.banksPage.expensesPage.pending') },
    { value: 'approved', label: t('finance.banksPage.expensesPage.approved') },
  ]

  // Loading state
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Skeleton height={40} width="100%" />
          <Group>
            {[1, 2, 3].map((i) => (
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
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                {t('finance.banksPage.expensesPage.title')}
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                {t('finance.banksPage.expensesPage.subtitle')}
              </Text>
            </Box>
            <Group>
              <ActionIcon variant="light" className="text-lg md:text-xl lg:text-2xl" onClick={handleRefresh} loading={refreshing}>
                <IconRefresh size={18} />
              </ActionIcon>
              <Button
                leftSection={<IconPlus size={16} />}
                component={Link}
                to="/finance/expenses/create"
              >
                {t('finance.banksPage.expensesPage.newExpense')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Statistics Cards */}
        <Group>
          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.expensesPage.totalExpenses')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>
              <NumberFormatter value={statistics.total_amount} prefix="৳" thousandSeparator />
            </Text>
            <Text className="text-xs md:text-sm" c="dimmed" mt="xs">
              {statistics.total_count} {t('finance.banksPage.expensesPage.transactions')}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="green" className="text-sm md:text-base" variant="light">{t('finance.banksPage.expensesPage.approved')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
              <NumberFormatter value={statistics.approved_amount} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" className="flex-1">
            <Group mb="xs">
              <Badge color="yellow" className="text-sm md:text-base" variant="light">{t('finance.banksPage.expensesPage.pending')}</Badge>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="yellow">
              <NumberFormatter value={statistics.pending_amount} prefix="৳" thousandSeparator />
            </Text>
            <Text className="text-xs md:text-sm" c="dimmed" mt="xs">
              {statistics.pending_count} {t('finance.banksPage.expensesPage.awaitingApproval')}
            </Text>
          </Card>
        </Group>

        {/* Filters */}
        <Group>
          <TextInput
            placeholder={t('finance.banksPage.expensesPage.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="flex-1"
          />

          <Select
            placeholder={t('finance.banksPage.expensesPage.selectAccount')}
            data={accountOptions}
            value={selectedAccount}
            onChange={setSelectedAccount}
            clearable
            searchable
            className="flex-1"
          />

          <Select
            placeholder={t('finance.banksPage.expensesPage.selectStatus')}
            data={statusOptions}
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value as ExpenseStatus)}
            style={{ width: 150 }}
          />

          <DateInput
            placeholder={t('finance.banksPage.expensesPage.startDate')}
            value={startDate}
            onChange={setStartDate}
            maxDate={endDate || undefined}
            clearable
            style={{ width: 150 }}
          />

          <DateInput
            placeholder={t('finance.banksPage.expensesPage.endDate')}
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            clearable
            style={{ width: 150 }}
          />
        </Group>

        {/* Desktop Table */}
        <Card withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} shadow="sm">
          <Table.ScrollContainer minWidth={1200}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.date')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.title')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.reference')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.account')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.paidBy')}</Table.Th>
                  <Table.Th ta="right">{t('finance.banksPage.expensesPage.tableHeaders.amount')}</Table.Th>
                  <Table.Th ta="right">{t('finance.vat')}</Table.Th>
                  <Table.Th ta="right">{t('finance.tax')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.status')}</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>{t('finance.banksPage.expensesPage.tableHeaders.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedExpenses.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Box py="xl" ta="center">
                        <Text c="dimmed">{t('finance.banksPage.expensesPage.noExpenses')}</Text>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <Table.Tr key={expense.id}>
                      <Table.Td>
                        <Text className="text-sm md:text-base">{formatDate(expense.expenseDate)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm md:text-base" fw={500}>
                          {expense.title}
                          {expense.notes && (
                            <Text className="text-xs md:text-sm" c="dimmed" mt={2}>
                              {expense.notes}
                            </Text>
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-xs md:text-sm" c="dimmed" fw={500}>
                          {expense.referenceNumber || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="blue" variant="light" className="text-sm md:text-base">
                          {expense.account?.name || '-'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm md:text-base">{expense.paidByUser?.name || expense.paidBy?.name || expense.user?.name || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm md:text-base" fw={600} ta="right">
                          <NumberFormatter value={parseFloat(expense.amount || '0')} prefix="৳" thousandSeparator />
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {expense.vatAmount ? (
                          <Text className="text-xs md:text-sm" c="blue" ta="right" fw={500}>
                            {expense.vatPercentage}% ({expense.vatAmount}৳)
                          </Text>
                        ) : (
                          <Text className="text-xs md:text-sm" c="dimmed" ta="right">-</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {expense.taxAmount ? (
                          <Text className="text-xs md:text-sm" c="orange" ta="right" fw={500}>
                            {expense.taxPercentage}% ({expense.taxAmount}৳)
                          </Text>
                        ) : (
                          <Text className="text-xs md:text-sm" c="dimmed" ta="right">-</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={expense.isApproved ? 'green' : 'yellow'}
                          variant="light"
                          className="text-sm md:text-base"
                        >
                          {expense.isApproved ? t('finance.banksPage.expensesPage.approved') : t('finance.banksPage.expensesPage.pending')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="center">
                          {!expense.isApproved && (
                            <ActionIcon
                              className="text-sm md:text-base"
                              color="green"
                              variant="light"
                              onClick={() => handleApprove(expense.id)}
                              title={t('finance.banksPage.expensesPage.actions.approve')}
                            >
                              <IconCheck size={18} />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            className="text-sm md:text-base"
                            color="blue"
                            variant="light"
                            onClick={() => handleEdit(expense.id)}
                            title={t('finance.banksPage.expensesPage.actions.edit')}
                          >
                            <IconPencil size={18} />
                          </ActionIcon>
                          <ActionIcon
                            className="text-sm md:text-base"
                            color="red"
                            variant="light"
                            onClick={() => handleDelete(expense.id, expense.title)}
                            title={t('finance.banksPage.expensesPage.actions.delete')}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        {/* Mobile Card View */}
        <Stack display={{ base: 'block', md: 'none' }}>
          {paginatedExpenses.length === 0 ? (
            <Card withBorder p="xl" ta="center" shadow="sm">
              <Text c="dimmed">{t('finance.banksPage.expensesPage.noExpenses')}</Text>
            </Card>
          ) : (
            paginatedExpenses.map((expense) => (
              <Card key={expense.id} shadow="sm" p="sm" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Badge
                    color={expense.isApproved ? 'green' : 'yellow'}
                    variant="light"
                    className="text-sm md:text-base"
                  >
                    {expense.isApproved ? t('finance.banksPage.expensesPage.approved') : t('finance.banksPage.expensesPage.pending')}
                  </Badge>
                  <Text className="text-xs md:text-sm" c="dimmed">{formatDate(expense.expenseDate)}</Text>
                </Group>

                <Group justify="space-between" mb="xs">
                  <Text className="text-sm md:text-base" fw={500}>
                    {expense.title}
                  </Text>
                  <Text className="text-sm md:text-base" fw={700}>
                    <NumberFormatter value={parseFloat(expense.amount || '0')} prefix="৳" thousandSeparator />
                  </Text>
                </Group>

                {expense.referenceNumber && (
                  <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                    Ref: {expense.referenceNumber}
                  </Text>
                )}

                {expense.notes && (
                  <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                    {expense.notes}
                  </Text>
                )}

                <Group mb="xs">
                  <Badge color="blue" variant="light" className="text-sm md:text-base">
                    {expense.account?.name || '-'}
                  </Badge>
                  <Text className="text-xs md:text-sm" c="dimmed">
                    By {expense.paidByUser?.name || expense.paidBy?.name || expense.user?.name || '-'}
                  </Text>
                </Group>

                {/* VAT & Tax Display - Mobile */}
                {(expense.vatAmount || expense.taxAmount) && (
                  <Group gap="md" mb="xs">
                    {expense.vatAmount && (
                      <Text className="text-xs md:text-sm" c="blue">
                        <Text span fw={600}>VAT:</Text> {expense.vatPercentage}% ({expense.vatAmount}৳)
                      </Text>
                    )}
                    {expense.taxAmount && (
                      <Text className="text-xs md:text-sm" c="orange">
                        <Text span fw={600}>Tax:</Text> {expense.taxPercentage}% ({expense.taxAmount}৳)
                      </Text>
                    )}
                  </Group>
                )}

                <Group justify="flex-end" mt="xs">
                  {!expense.isApproved && (
                    <ActionIcon
                      className="text-sm md:text-base"
                      color="green"
                      variant="light"
                      onClick={() => handleApprove(expense.id)}
                    >
                      <IconCheck size={18} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    className="text-sm md:text-base"
                    color="blue"
                    variant="light"
                    onClick={() => handleEdit(expense.id)}
                  >
                    <IconPencil size={18} />
                  </ActionIcon>
                  <ActionIcon
                    className="text-sm md:text-base"
                    color="red"
                    variant="light"
                    onClick={() => handleDelete(expense.id, expense.title)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Card>
            ))
          )}
        </Stack>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="flex-end">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={handlePageChange}
              className="text-sm md:text-base"
            />
          </Group>
        )}
      </Stack>
    </Box>
  )
}
