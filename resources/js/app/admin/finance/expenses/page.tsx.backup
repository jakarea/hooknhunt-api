'use client'

import { useState, useMemo } from 'react'
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
} from '@mantine/core'
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
import { Link } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { modals } from '@mantine/modals'

interface ExpenseAccount {
  id: number
  name: string
  code: string
}

interface PaidBy {
  id: number
  name: string
}

interface Expense {
  id: number
  title: string
  expense_date: string
  amount: number
  is_approved: boolean
  account: ExpenseAccount
  paid_by: PaidBy
  reference_number?: string
  notes?: string
}

type ExpenseStatus = 'all' | 'pending' | 'approved'

// Mock data for development
const mockAccounts: ExpenseAccount[] = [
  { id: 1, name: 'Office Supplies', code: 'OS' },
  { id: 2, name: 'Utilities', code: 'UTIL' },
  { id: 3, name: 'Rent', code: 'RENT' },
  { id: 4, name: 'Salaries', code: 'SAL' },
  { id: 5, name: 'Marketing', code: 'MKT' },
  { id: 6, name: 'Travel', code: 'TRV' },
  { id: 7, name: 'Maintenance', code: 'MAINT' },
  { id: 8, name: 'Miscellaneous', code: 'MISC' },
]

const mockPaidBy: PaidBy[] = [
  { id: 1, name: 'Ahmed Hassan' },
  { id: 2, name: 'Fatima Rahman' },
  { id: 3, name: 'Karim Uddin' },
]

const mockExpenses: Expense[] = [
  {
    id: 1,
    title: 'Office stationery purchase',
    expense_date: '2024-01-15',
    amount: 5500,
    is_approved: true,
    account: mockAccounts[0],
    paid_by: mockPaidBy[0],
    reference_number: 'EXP-2024-001',
    notes: 'Pens, papers, folders',
  },
  {
    id: 2,
    title: 'Electricity bill - January',
    expense_date: '2024-01-14',
    amount: 12500,
    is_approved: true,
    account: mockAccounts[1],
    paid_by: mockPaidBy[1],
    reference_number: 'EXP-2024-002',
  },
  {
    id: 3,
    title: 'Office rent - January',
    expense_date: '2024-01-10',
    amount: 50000,
    is_approved: false,
    account: mockAccounts[2],
    paid_by: mockPaidBy[2],
    reference_number: 'EXP-2024-003',
  },
  {
    id: 4,
    title: 'Facebook advertising',
    expense_date: '2024-01-12',
    amount: 8000,
    is_approved: false,
    account: mockAccounts[4],
    paid_by: mockPaidBy[0],
    reference_number: 'EXP-2024-004',
  },
  {
    id: 5,
    title: 'Business trip to Chittagong',
    expense_date: '2024-01-11',
    amount: 15000,
    is_approved: true,
    account: mockAccounts[5],
    paid_by: mockPaidBy[1],
    reference_number: 'EXP-2024-005',
    notes: 'Train tickets, accommodation',
  },
  {
    id: 6,
    title: 'Office cleaning supplies',
    expense_date: '2024-01-09',
    amount: 3200,
    is_approved: true,
    account: mockAccounts[0],
    paid_by: mockPaidBy[2],
    reference_number: 'EXP-2024-006',
  },
  {
    id: 7,
    title: 'Air conditioner repair',
    expense_date: '2024-01-08',
    amount: 4500,
    is_approved: false,
    account: mockAccounts[6],
    paid_by: mockPaidBy[0],
    reference_number: 'EXP-2024-007',
  },
  {
    id: 8,
    title: 'Internet bill',
    expense_date: '2024-01-07',
    amount: 2500,
    is_approved: true,
    account: mockAccounts[1],
    paid_by: mockPaidBy[1],
    reference_number: 'EXP-2024-008',
  },
  {
    id: 9,
    title: 'Staff refreshments',
    expense_date: '2024-01-06',
    amount: 1800,
    is_approved: false,
    account: mockAccounts[7],
    paid_by: mockPaidBy[2],
    reference_number: 'EXP-2024-009',
  },
  {
    id: 10,
    title: 'Printer toner cartridge',
    expense_date: '2024-01-05',
    amount: 6500,
    is_approved: true,
    account: mockAccounts[0],
    paid_by: mockPaidBy[0],
    reference_number: 'EXP-2024-010',
  },
  {
    id: 11,
    title: 'Courier services',
    expense_date: '2024-01-04',
    amount: 2200,
    is_approved: true,
    account: mockAccounts[7],
    paid_by: mockPaidBy[1],
    reference_number: 'EXP-2024-011',
  },
  {
    id: 12,
    title: 'Google Ads campaign',
    expense_date: '2024-01-03',
    amount: 15000,
    is_approved: false,
    account: mockAccounts[4],
    paid_by: mockPaidBy[2],
    reference_number: 'EXP-2024-012',
  },
]

export default function ExpensesPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance expenses view permission
  if (!hasPermission('finance_expenses_view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Expenses.</Text>
        </Paper>
      </Stack>
    )
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return mockExpenses.filter((expense) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          expense.title?.toLowerCase().includes(searchLower) ||
          expense.reference_number?.toLowerCase().includes(searchLower) ||
          expense.notes?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Account filter
      if (selectedAccount && expense.account.id !== parseInt(selectedAccount)) {
        return false
      }

      // Status filter
      if (selectedStatus === 'pending' && expense.is_approved) return false
      if (selectedStatus === 'approved' && !expense.is_approved) return false

      // Date filter
      if (startDate) {
        const expenseDate = new Date(expense.expense_date)
        if (expenseDate < startDate) return false
      }

      if (endDate) {
        const expenseDate = new Date(expense.expense_date)
        if (expenseDate > endDate) return false
      }

      return true
    })
  }, [searchQuery, selectedAccount, selectedStatus, startDate, endDate])

  // Pagination
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredExpenses.slice(start, start + itemsPerPage)
  }, [filteredExpenses, currentPage])

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const pendingAmount = filteredExpenses
      .filter((e) => !e.is_approved)
      .reduce((sum, e) => sum + e.amount, 0)
    const approvedAmount = filteredExpenses
      .filter((e) => e.is_approved)
      .reduce((sum, e) => sum + e.amount, 0)
    const pendingCount = filteredExpenses.filter((e) => !e.is_approved).length

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
    notifications.show({
      title: t('finance.banksPage.expensesPage.notification.refreshed'),
      message: t('finance.banksPage.expensesPage.notification.refreshedMessage'),
      color: 'blue',
    })
    setCurrentPage(1)
  }

  // Handle approve
  const handleApprove = (expenseId: number) => {
    notifications.show({
      title: t('finance.banksPage.expensesPage.notification.approved'),
      message: t('finance.banksPage.expensesPage.notification.approvedMessage', { id: expenseId }),
      color: 'green',
    })
  }

  // Handle edit
  const handleEdit = (expenseId: number) => {
    notifications.show({
      title: t('finance.banksPage.expensesPage.notification.edit'),
      message: t('finance.banksPage.expensesPage.notification.editMessage', { id: expenseId }),
      color: 'blue',
    })
  }

  // Handle delete
  const handleDelete = (expenseId: number, expenseTitle: string) => {
    modals.openConfirmModal({
      title: t('finance.banksPage.expensesPage.deleteConfirm.title'),
      children: (
        <Text size="sm">
          {t('finance.banksPage.expensesPage.deleteConfirm.message')}{' '}
          <Text span fw={600} c="blue">
            "{expenseTitle}"
          </Text>
          ?
        </Text>
      ),
      labels: {
        confirm: t('finance.banksPage.expensesPage.deleteConfirm.confirm'),
        cancel: t('finance.banksPage.expensesPage.deleteConfirm.cancel'),
      },
      confirmProps: { color: 'red' },
      onCancel: () => {
        // User cancelled - do nothing
      },
      onConfirm: () => {
        // Show success notification after confirmation
        notifications.show({
          title: t('finance.banksPage.expensesPage.notification.deleteSuccess'),
          message: t('finance.banksPage.expensesPage.notification.deleteSuccessMessage', {
            title: expenseTitle,
          }),
          color: 'green',
        })
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
      mockAccounts.map((account) => ({
        value: account.id.toString(),
        label: `${account.name} (${account.code})`,
      })),
    []
  )

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: t('finance.banksPage.expensesPage.pending') },
    { value: 'approved', label: t('finance.banksPage.expensesPage.approved') },
  ]

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
              <ActionIcon variant="light" size="lg" onClick={handleRefresh}>
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
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group mb="xs">
              <Text size="xs" c="dimmed">{t('finance.banksPage.expensesPage.totalExpenses')}</Text>
            </Group>
            <Text size="xl" fw={700}>
              <NumberFormatter value={statistics.total_amount} prefix="৳" thousandSeparator />
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              {statistics.total_count} {t('finance.banksPage.expensesPage.transactions')}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group mb="xs">
              <Badge color="green" size="sm" variant="light">{t('finance.banksPage.expensesPage.approved')}</Badge>
            </Group>
            <Text size="xl" fw={700} c="green">
              <NumberFormatter value={statistics.approved_amount} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group mb="xs">
              <Badge color="yellow" size="sm" variant="light">{t('finance.banksPage.expensesPage.pending')}</Badge>
            </Group>
            <Text size="xl" fw={700} c="yellow">
              <NumberFormatter value={statistics.pending_amount} prefix="৳" thousandSeparator />
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
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
            style={{ flex: 1 }}
          />

          <Select
            placeholder={t('finance.banksPage.expensesPage.selectAccount')}
            data={accountOptions}
            value={selectedAccount}
            onChange={setSelectedAccount}
            clearable
            searchable
            style={{ flex: 1 }}
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
            onChange={(value) => setStartDate(value as Date | null)}
            maxDate={endDate || undefined}
            clearable
            style={{ width: 150 }}
          />

          <DateInput
            placeholder={t('finance.banksPage.expensesPage.endDate')}
            value={endDate}
            onChange={(value) => setEndDate(value as Date | null)}
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
                  <Table.Th style={{ textAlign: 'right' }}>{t('finance.banksPage.expensesPage.tableHeaders.amount')}</Table.Th>
                  <Table.Th>{t('finance.banksPage.expensesPage.tableHeaders.status')}</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>{t('finance.banksPage.expensesPage.tableHeaders.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedExpenses.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Box py="xl" ta="center">
                        <Text c="dimmed">{t('finance.banksPage.expensesPage.noExpenses')}</Text>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <Table.Tr key={expense.id}>
                      <Table.Td>
                        <Text size="sm">{formatDate(expense.expense_date)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {expense.title}
                          {expense.notes && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {expense.notes}
                            </Text>
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed" fw={500}>
                          {expense.reference_number || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="blue" variant="light" size="sm">
                          {expense.account.name}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{expense.paid_by.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} ta="right">
                          <NumberFormatter value={expense.amount} prefix="৳" thousandSeparator />
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={expense.is_approved ? 'green' : 'yellow'}
                          variant="light"
                          size="sm"
                        >
                          {expense.is_approved ? t('finance.banksPage.expensesPage.approved') : t('finance.banksPage.expensesPage.pending')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="center">
                          {!expense.is_approved && (
                            <ActionIcon
                              size="sm"
                              color="green"
                              variant="light"
                              onClick={() => handleApprove(expense.id)}
                              title={t('finance.banksPage.expensesPage.actions.approve')}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            size="sm"
                            color="blue"
                            variant="light"
                            onClick={() => handleEdit(expense.id)}
                            title={t('finance.banksPage.expensesPage.actions.edit')}
                          >
                            <IconPencil size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="light"
                            onClick={() => handleDelete(expense.id, expense.title)}
                            title={t('finance.banksPage.expensesPage.actions.delete')}
                          >
                            <IconTrash size={14} />
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
                    color={expense.is_approved ? 'green' : 'yellow'}
                    variant="light"
                    size="sm"
                  >
                    {expense.is_approved ? t('finance.banksPage.expensesPage.approved') : t('finance.banksPage.expensesPage.pending')}
                  </Badge>
                  <Text size="xs" c="dimmed">{formatDate(expense.expense_date)}</Text>
                </Group>

                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>
                    {expense.title}
                  </Text>
                  <Text size="sm" fw={700}>
                    <NumberFormatter value={expense.amount} prefix="৳" thousandSeparator />
                  </Text>
                </Group>

                {expense.reference_number && (
                  <Text size="xs" c="dimmed" mb="xs">
                    Ref: {expense.reference_number}
                  </Text>
                )}

                {expense.notes && (
                  <Text size="xs" c="dimmed" mb="xs">
                    {expense.notes}
                  </Text>
                )}

                <Group mb="xs">
                  <Badge color="blue" variant="light" size="sm">
                    {expense.account.name}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    By {expense.paid_by.name}
                  </Text>
                </Group>

                <Group justify="flex-end" mt="xs">
                  {!expense.is_approved && (
                    <ActionIcon
                      size="sm"
                      color="green"
                      variant="light"
                      onClick={() => handleApprove(expense.id)}
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    size="sm"
                    color="blue"
                    variant="light"
                    onClick={() => handleEdit(expense.id)}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="light"
                    onClick={() => handleDelete(expense.id, expense.title)}
                  >
                    <IconTrash size={14} />
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
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </Box>
  )
}
