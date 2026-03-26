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
  Button,
  Badge,
  Collapse,
  NumberFormatter,
} from '@mantine/core'
import {
  IconSearch,
  IconDownload,
  IconPrinter,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'

interface Account {
  id: number
  code: string
  name: string
}

interface CreatedBy {
  id: number
  name: string
}

interface JournalItem {
  id: number
  account: Account
  debit: number
  credit: number
}

interface JournalEntry {
  id: number
  entry_number: string
  date: string
  description: string
  created_by: CreatedBy
  items: JournalItem[]
}

// Mock data for development
const mockAccounts: Account[] = [
  { id: 1, code: '1000', name: 'Cash' },
  { id: 2, code: '1020', name: 'Bank Accounts' },
  { id: 3, code: '1100', name: 'Accounts Receivable' },
  { id: 4, code: '1200', name: 'Inventory' },
  { id: 5, code: '2000', name: 'Accounts Payable' },
  { id: 6, code: '3000', name: 'Owner\'s Equity' },
  { id: 7, code: '4000', name: 'Sales Revenue' },
  { id: 8, code: '5000', name: 'Cost of Goods Sold' },
  { id: 9, code: '5100', name: 'Operating Expenses' },
  { id: 10, code: '5200', name: 'Utilities Expense' },
]

const mockJournalEntries: JournalEntry[] = [
  {
    id: 1,
    entry_number: 'JE-2024-001',
    date: '2024-01-15',
    description: 'Sales to customer - Invoice #INV-001',
    created_by: { id: 1, name: 'Ahmed Hassan' },
    items: [
      { id: 1, account: mockAccounts[2], debit: 50000, credit: 0 },
      { id: 2, account: mockAccounts[6], debit: 0, credit: 50000 },
    ],
  },
  {
    id: 2,
    entry_number: 'JE-2024-002',
    date: '2024-01-15',
    description: 'Payment received from customer',
    created_by: { id: 1, name: 'Ahmed Hassan' },
    items: [
      { id: 3, account: mockAccounts[1], debit: 35000, credit: 0 },
      { id: 4, account: mockAccounts[2], debit: 0, credit: 35000 },
    ],
  },
  {
    id: 3,
    entry_number: 'JE-2024-003',
    date: '2024-01-14',
    description: 'Purchase inventory from supplier',
    created_by: { id: 2, name: 'Fatima Rahman' },
    items: [
      { id: 5, account: mockAccounts[3], debit: 75000, credit: 0 },
      { id: 6, account: mockAccounts[4], debit: 0, credit: 75000 },
    ],
  },
  {
    id: 4,
    entry_number: 'JE-2024-004',
    date: '2024-01-14',
    description: 'Payment to supplier',
    created_by: { id: 2, name: 'Fatima Rahman' },
    items: [
      { id: 7, account: mockAccounts[4], debit: 50000, credit: 0 },
      { id: 8, account: mockAccounts[1], debit: 0, credit: 50000 },
    ],
  },
  {
    id: 5,
    entry_number: 'JE-2024-005',
    date: '2024-01-13',
    description: 'Office rent payment',
    created_by: { id: 3, name: 'Karim Uddin' },
    items: [
      { id: 9, account: mockAccounts[8], debit: 60000, credit: 0 },
      { id: 10, account: mockAccounts[1], debit: 0, credit: 60000 },
    ],
  },
  {
    id: 6,
    entry_number: 'JE-2024-006',
    date: '2024-01-13',
    description: 'Utility bill payment',
    created_by: { id: 3, name: 'Karim Uddin' },
    items: [
      { id: 11, account: mockAccounts[9], debit: 12500, credit: 0 },
      { id: 12, account: mockAccounts[1], debit: 0, credit: 12500 },
    ],
  },
  {
    id: 7,
    entry_number: 'JE-2024-007',
    date: '2024-01-12',
    description: 'Cash sales',
    created_by: { id: 1, name: 'Ahmed Hassan' },
    items: [
      { id: 13, account: mockAccounts[0], debit: 25000, credit: 0 },
      { id: 14, account: mockAccounts[6], debit: 0, credit: 25000 },
    ],
  },
  {
    id: 8,
    entry_number: 'JE-2024-008',
    date: '2024-01-12',
    description: 'Owner investment',
    created_by: { id: 2, name: 'Fatima Rahman' },
    items: [
      { id: 15, account: mockAccounts[1], debit: 500000, credit: 0 },
      { id: 16, account: mockAccounts[5], debit: 0, credit: 500000 },
    ],
  },
  {
    id: 9,
    entry_number: 'JE-2024-009',
    date: '2024-01-11',
    description: 'Cost of goods sold for January sales',
    created_by: { id: 3, name: 'Karim Uddin' },
    items: [
      { id: 17, account: mockAccounts[7], debit: 45000, credit: 0 },
      { id: 18, account: mockAccounts[3], debit: 0, credit: 45000 },
    ],
  },
  {
    id: 10,
    entry_number: 'JE-2024-010',
    date: '2024-01-11',
    description: 'Office supplies purchase',
    created_by: { id: 1, name: 'Ahmed Hassan' },
    items: [
      { id: 19, account: mockAccounts[8], debit: 8500, credit: 0 },
      { id: 20, account: mockAccounts[1], debit: 0, credit: 8500 },
    ],
  },
]

export default function GeneralLedgerPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports general ledger permission
  if (!hasPermission('finance_reports_general_ledger')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view General Ledger Report.</Text>
        </Card>
      </Stack>
    )
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())

  // Toggle entry expansion
  const toggleEntry = (entryId: number) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  // Filter journal entries
  const filteredEntries = useMemo(() => {
    return mockJournalEntries.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          entry.description?.toLowerCase().includes(searchLower) ||
          entry.entry_number?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Account filter
      if (selectedAccount) {
        const hasAccount = entry.items.some(
          (item) => item.account.id === parseInt(selectedAccount)
        )
        if (!hasAccount) return false
      }

      // Date filter
      if (startDate) {
        const entryDate = new Date(entry.date)
        if (entryDate < startDate) return false
      }

      if (endDate) {
        const entryDate = new Date(entry.date)
        if (entryDate > endDate) return false
      }

      return true
    })
  }, [searchQuery, selectedAccount, startDate, endDate])

  // Pagination
  const itemsPerPage = 5
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEntries.slice(start, start + itemsPerPage)
  }, [filteredEntries, currentPage])

  // Calculate totals
  const totals = useMemo(() => {
    let totalDebit = 0
    let totalCredit = 0

    filteredEntries.forEach((entry) => {
      entry.items.forEach((item) => {
        totalDebit += item.debit
        totalCredit += item.credit
      })
    })

    return { totalDebit, totalCredit }
  }, [filteredEntries])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle export
  const handleExport = () => {
    notifications.show({
      title: t('generalLedgerPage.notification.exportSuccess'),
      message: t('generalLedgerPage.notification.exportSuccessMessage'),
      color: 'green',
    })
  }

  // Handle print
  const handlePrint = () => {
    window.print()
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
        label: `${account.code} - ${account.name}`,
      })),
    []
  )

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1}>{t('generalLedgerPage.title')}</Title>
              <Text c="dimmed">{t('generalLedgerPage.subtitle')}</Text>
            </Box>
            <Group>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('generalLedgerPage.exportExcel')}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={handlePrint}>
                {t('generalLedgerPage.print')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Filters */}
        <Card withBorder p="md" radius="md">
          <Group>
            <TextInput
              placeholder={t('generalLedgerPage.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="flex-1"
            />

            <Select
              placeholder={t('generalLedgerPage.selectAccount')}
              data={accountOptions}
              value={selectedAccount}
              onChange={setSelectedAccount}
              clearable
              searchable
              style={{ width: 250 }}
            />

            <DateInput
              placeholder={t('generalLedgerPage.startDate')}
              value={startDate}
              onChange={(value) => setStartDate(value as Date | null)}
              maxDate={endDate || undefined}
              clearable
              style={{ width: 150 }}
            />

            <DateInput
              placeholder={t('generalLedgerPage.endDate')}
              value={endDate}
              onChange={(value) => setEndDate(value as Date | null)}
              minDate={startDate || undefined}
              clearable
              style={{ width: 150 }}
            />
          </Group>
        </Card>

        {/* Summary Card */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text className="text-sm md:text-base" c="dimmed">
              {t('generalLedgerPage.showingEntries', { count: filteredEntries.length })}
            </Text>
            <Group gap="xl">
              <Text className="text-sm md:text-base">
                <Text span fw={600} c="teal">{t('generalLedgerPage.totalDebit')}:</Text> ৳{totals.totalDebit.toLocaleString()}
              </Text>
              <Text className="text-sm md:text-base">
                <Text span fw={600} c="orange">{t('generalLedgerPage.totalCredit')}:</Text> ৳{totals.totalCredit.toLocaleString()}
              </Text>
              <Badge color={totals.totalDebit === totals.totalCredit ? 'green' : 'red'} variant="light">
                {totals.totalDebit === totals.totalCredit ? t('generalLedgerPage.balanced') : t('generalLedgerPage.notBalanced')}
              </Badge>
            </Group>
          </Group>
        </Card>

        {/* Journal Entries */}
        <Stack gap="sm">
          {paginatedEntries.length === 0 ? (
            <Card withBorder p="xl" ta="center" shadow="sm">
              <Text c="dimmed">{t('generalLedgerPage.noEntries')}</Text>
            </Card>
          ) : (
            paginatedEntries.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id)
              const entryDebit = entry.items.reduce((sum, item) => sum + item.debit, 0)
              const entryCredit = entry.items.reduce((sum, item) => sum + item.credit, 0)

              return (
                <Card key={entry.id} withBorder p="0" radius="md" shadow="sm">
                  {/* Entry Header */}
                  <Card
                    withBorder
                    p="sm"
                    radius={0}
                    onClick={() => toggleEntry(entry.id)}
                    style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-gray-0)' }}
                  >
                    <Group justify="space-between">
                      <Group gap="xl">
                        <Text className="text-sm md:text-base" fw={600} c="blue">
                          {entry.entry_number}
                        </Text>
                        <Text className="text-sm md:text-base">{formatDate(entry.date)}</Text>
                        <Text className="text-sm md:text-base" miw={300} maw={500} lineClamp={1}>
                          {entry.description}
                        </Text>
                        <Text className="text-xs md:text-sm" c="dimmed">
                          {t('generalLedgerPage.entryDetails', { name: entry.created_by.name })}
                        </Text>
                      </Group>
                      <Group gap="md">
                        <Text className="text-sm md:text-base" fw={600} c="teal">
                          {t('generalLedgerPage.dr')}: ৳{entryDebit.toLocaleString()}
                        </Text>
                        <Text className="text-sm md:text-base" fw={600} c="orange">
                          {t('generalLedgerPage.cr')}: ৳{entryCredit.toLocaleString()}
                        </Text>
                        {isExpanded ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </Group>
                    </Group>
                  </Card>

                  {/* Entry Items */}
                  <Collapse in={isExpanded}>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('generalLedgerPage.tableHeaders.account')}</Table.Th>
                          <Table.Th>{t('generalLedgerPage.tableHeaders.description')}</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>{t('generalLedgerPage.tableHeaders.debit')}</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>{t('generalLedgerPage.tableHeaders.credit')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {entry.items.map((item) => (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Badge variant="light" className="text-sm md:text-base">
                                {item.account.code}
                              </Badge>
                              <Text className="text-sm md:text-base" ml="xs">{item.account.name}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text className="text-sm md:text-base" c="dimmed">{entry.description}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text className="text-sm md:text-base" ta="right" fw={600} c="teal">
                                {item.debit > 0 ? (
                                  <NumberFormatter value={item.debit} prefix="৳" thousandSeparator />
                                ) : (
                                  '-'
                                )}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text className="text-sm md:text-base" ta="right" fw={600} c="orange">
                                {item.credit > 0 ? (
                                  <NumberFormatter value={item.credit} prefix="৳" thousandSeparator />
                                ) : (
                                  '-'
                                )}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Collapse>
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
              onChange={handlePageChange}
              className="text-sm md:text-base"
            />
          </Group>
        )}
      </Stack>
    </Box>
  )
}
