'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Card,
  Table,
  Button,
  Badge,
  Tabs,
  Alert,
  NumberFormatter,
  Skeleton,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconDownload,
  IconPrinter,
  IconCheck,
  IconX,
  IconRefresh,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { usePermissions } from '@/hooks/usePermissions'
import { getTrialBalance } from '@/utils/api'

interface TrialBalanceAccount {
  id: number
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  type_label: string
  debit: number
  credit: number
  balance: number
}

interface TrialBalanceData {
  asOfDate: string
  accounts: TrialBalanceAccount[]
  totalDebit: number
  totalCredit: number
  difference: number
  isBalanced: boolean
  totalDebitBalances: number
  totalCreditBalances: number
}

type AccountType = 'all' | 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export default function TrialBalancePage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports trial balance permission
  if (!hasPermission('finance_reports_trial_balance')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Trial Balance Report.</Text>
        </Card>
      </Stack>
    )
  }

  const [asOfDate, setAsOfDate] = useState<Date | null>(new Date())
  const [activeTab, setActiveTab] = useState<AccountType>('all')
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false)

  // Fetch trial balance data
  const fetchTrialBalance = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (asOfDate) {
        params.as_of_date = asOfDate.toISOString().split('T')[0]
      }
      // Use camelCase as backend accepts both
      params.includeZeroBalance = includeZeroBalance

      const response = await getTrialBalance(params)

      // Handle nested response structure
      const data = response?.data || response
      setTrialBalance(data)

    } catch (error: any) {
      console.error('Failed to fetch trial balance:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load trial balance',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on mount and when date changes
  useEffect(() => {
    fetchTrialBalance()
  }, [asOfDate, includeZeroBalance])

  // Refresh data
  const handleRefresh = () => {
    fetchTrialBalance()
    notifications.show({
      title: 'Refreshing',
      message: 'Trial balance is being updated...',
      color: 'blue',
    })
  }

  // Get account type configuration
  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      asset: { color: 'green', label: 'Asset' },
      liability: { color: 'red', label: 'Liability' },
      equity: { color: 'blue', label: 'Equity' },
      income: { color: 'cyan', label: 'Revenue' },
      expense: { color: 'orange', label: 'Expense' },
    }
    return configs[type] || { color: 'gray', label: type }
  }

  // Filter and sort accounts
  const filteredAccounts = useMemo(() => {
    if (!trialBalance?.accounts) return []

    let accounts = [...trialBalance.accounts]

    // Filter by type
    if (activeTab !== 'all') {
      accounts = accounts.filter((account) => account.type === activeTab)
    }

    // Sort by code
    return accounts.sort((a, b) => a.code.localeCompare(b.code))
  }, [trialBalance, activeTab])

  // Get account counts by type
  const getAccountCount = (type: AccountType) => {
    if (!trialBalance?.accounts) return 0
    if (type === 'all') return trialBalance.accounts.length
    return trialBalance.accounts.filter((acc) => acc.type === type).length
  }

  // Calculate account balance for display
  const getAccountBalance = (account: TrialBalanceAccount) => {
    // Assets and Expenses: Debit balances are positive
    // Liabilities, Equity, and Income: Credit balances are positive
    if (account.type === 'asset' || account.type === 'expense') {
      return account.balance
    } else {
      return account.balance
    }
  }

  // Get balance type (debit or credit)
  const getBalanceType = (account: TrialBalanceAccount) => {
    if (account.type === 'asset' || account.type === 'expense') {
      return account.balance >= 0 ? 'debit' : 'credit'
    } else {
      return account.balance >= 0 ? 'credit' : 'debit'
    }
  }

  // Handle export
  const handleExport = () => {
    notifications.show({
      title: 'Export Coming Soon',
      message: 'Excel export functionality will be available soon.',
      color: 'blue',
    })
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Format date
  const formatDate = (date: Date | null | string) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1}>{t('finance.trialBalancePage.title')}</Title>
              <Text c="dimmed">{t('finance.trialBalancePage.subtitle')}</Text>
            </Box>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('finance.trialBalancePage.exportExcel')}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={handlePrint}>
                {t('finance.trialBalancePage.print')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Filters */}
        <Card withBorder p="md" radius="md" pos="relative">
          {loading && <LoadingOverlay visible />}
          <Group justify="space-between" wrap="flex-wrap">
            <DateInput
              label={t('finance.trialBalancePage.asOfDate')}
              placeholder={t('finance.trialBalancePage.asOfDatePlaceholder')}
              value={asOfDate}
              onChange={setAsOfDate}
              clearable={false}
              style={{ width: 200 }}
              maxDate={new Date()}
            />
            <Group>
              <Text size="sm">Include Zero Balances:</Text>
              <Button
                size="xs"
                variant={includeZeroBalance ? 'filled' : 'light'}
                onClick={() => setIncludeZeroBalance(!includeZeroBalance)}
              >
                {includeZeroBalance ? 'Yes' : 'No'}
              </Button>
            </Group>
            {trialBalance && (
              <Text size="sm" c="dimmed">
                Showing {filteredAccounts.length} of {trialBalance.accounts.length} accounts
              </Text>
            )}
          </Group>
        </Card>

        {/* Tabs for account types */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value as AccountType)}>
          <Tabs.List>
            <Tabs.Tab value="all">
              All ({trialBalance ? trialBalance.accounts.length : 0})
            </Tabs.Tab>
            <Tabs.Tab value="asset">
              Assets ({getAccountCount('asset')})
            </Tabs.Tab>
            <Tabs.Tab value="liability">
              Liabilities ({getAccountCount('liability')})
            </Tabs.Tab>
            <Tabs.Tab value="equity">
              Equity ({getAccountCount('equity')})
            </Tabs.Tab>
            <Tabs.Tab value="income">
              Revenue ({getAccountCount('income')})
            </Tabs.Tab>
            <Tabs.Tab value="expense">
              Expenses ({getAccountCount('expense')})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab}>
            <Card withBorder p="0" radius="md" mt="md" shadow="sm" pos="relative">
              {loading ? (
                <Box p="xl">
                  <Skeleton height={40} mb="sm" />
                  <Skeleton height={40} mb="sm" />
                  <Skeleton height={40} mb="sm" />
                  <Skeleton height={40} mb="sm" />
                  <Skeleton height={40} />
                </Box>
              ) : (
                <Table.ScrollContainer minWidth={900}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Account Code</Table.Th>
                        <Table.Th>Account Name</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th ta="right">Debit</Table.Th>
                        <Table.Th ta="right">Credit</Table.Th>
                        <Table.Th ta="right">Balance</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredAccounts.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={7} ta="center">
                            <Text c="dimmed">No accounts found for this criteria</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        filteredAccounts.map((account) => {
                          const typeConfig = getTypeConfig(account.type)
                          const balanceAmount = Math.abs(getAccountBalance(account))
                          const balanceType = getBalanceType(account)

                          return (
                            <Table.Tr key={account.id}>
                              <Table.Td>
                                <Text style={{ fontFamily: 'monospace' }} fw={600}>
                                  {account.code}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text className="text-sm md:text-base" fw={500}>{account.name}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge color={typeConfig.color} variant="light" className="text-sm md:text-base">
                                  {typeConfig.label}
                                </Badge>
                              </Table.Td>
                              <Table.Td ta="right">
                                {account.debit > 0 ? (
                                  <Text className="text-sm md:text-base" fw={600} c="teal">
                                    <NumberFormatter value={account.debit} prefix="৳" thousandSeparator />
                                  </Text>
                                ) : (
                                  <Text c="dimmed">-</Text>
                                )}
                              </Table.Td>
                              <Table.Td ta="right">
                                {account.credit > 0 ? (
                                  <Text className="text-sm md:text-base" fw={600} c="orange">
                                    <NumberFormatter value={account.credit} prefix="৳" thousandSeparator />
                                  </Text>
                                ) : (
                                  <Text c="dimmed">-</Text>
                                )}
                              </Table.Td>
                              <Table.Td ta="right">
                                {balanceAmount > 0.01 ? (
                                  <Text
                                    className="text-sm md:text-base"
                                    fw={700}
                                    c={balanceType === 'debit' ? 'teal' : 'orange'}
                                  >
                                    <NumberFormatter value={balanceAmount} prefix="৳" thousandSeparator />
                                    <Text span className="text-xs md:text-sm" ml="xs" c="dimmed" fw={400}>
                                      {balanceType}
                                    </Text>
                                  </Text>
                                ) : (
                                  <Text className="text-sm md:text-base" c="dimmed">
                                    -
                                  </Text>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          )
                        })
                      )}

                      {/* Totals Row */}
                      <Table.Tr bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))">
                        <Table.Td colSpan={3}>
                          <Text className="text-sm md:text-base" fw={700}>Total</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text className="text-sm md:text-base" fw={700} c="teal">
                            {trialBalance && (
                              <NumberFormatter value={trialBalance.totalDebit} prefix="৳" thousandSeparator />
                            )}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text className="text-sm md:text-base" fw={700} c="orange">
                            {trialBalance && (
                              <NumberFormatter value={trialBalance.totalCredit} prefix="৳" thousandSeparator />
                            )}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text className="text-sm md:text-base" fw={700}>
                            -
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Card>
          </Tabs.Panel>
        </Tabs>

        {/* Balance Verification Alert */}
        {trialBalance && (
          <>
            {trialBalance.isBalanced ? (
              <Alert
                variant="light"
                color="teal"
                title={`${t('finance.trialBalancePage.title')} - Balanced`}
                icon={<IconCheck size={20} />}
              >
                <Stack gap="xs">
                  <Text className="text-sm md:text-base">
                    Debits and credits are equal as of {formatDate(trialBalance.asOfDate)}
                  </Text>
                  <Group gap="xl">
                    <Text className="text-sm md:text-base" fw={600}>
                      Total: <NumberFormatter value={trialBalance.totalDebit} prefix="৳" thousandSeparator />
                    </Text>
                    <Text className="text-xs md:text-sm" c="dimmed">
                      Difference: <NumberFormatter value={Math.abs(trialBalance.difference)} prefix="৳" thousandSeparator decimalScale={2} />
                    </Text>
                  </Group>
                </Stack>
              </Alert>
            ) : (
              <Alert
                variant="light"
                color="red"
                title={`${t('finance.trialBalancePage.title')} - Not Balanced`}
                icon={<IconX size={20} />}
              >
                <Stack gap="xs">
                  <Text className="text-sm md:text-base">
                    Trial balance is out of balance by{' '}
                    <NumberFormatter value={Math.abs(trialBalance.difference)} prefix="৳" thousandSeparator decimalScale={2} />
                  </Text>
                  <Group gap="xl">
                    <Text className="text-sm md:text-base">
                      Debit: <Text span fw={600} c="teal">৳{(trialBalance.total_debit || trialBalance.totalDebit || 0).toLocaleString()}</Text>
                    </Text>
                    <Text className="text-sm md:text-base">
                      Credit: <Text span fw={600} c="orange">৳{(trialBalance.total_credit || trialBalance.totalCredit || 0).toLocaleString()}</Text>
                    </Text>
                  </Group>
                </Stack>
              </Alert>
            )}
          </>
        )}

        {/* Print-only section - only visible when printing */}
        <div style={{ display: 'none' }} className="print-only">
          <Box p="xl" style={{ backgroundColor: 'white' }}>
            <Stack gap="lg">
              {/* Print Header */}
              <Box>
                <Title order={1} style={{ textAlign: 'center', marginBottom: '10px' }}>
                  {t('finance.trialBalancePage.title')}
                </Title>
                <Text style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
                  As of {formatDate(trialBalance?.asOfDate || null)}
                </Text>
                <Text style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  Showing {filteredAccounts.length} accounts
                </Text>
              </Box>

              {/* Print Table */}
              <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Table.Thead>
                  <Table.Tr style={{ backgroundColor: '#f5f5f5' }}>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Account Code</Table.Th>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Account Name</Table.Th>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Type</Table.Th>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>Debit</Table.Th>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>Credit</Table.Th>
                    <Table.Th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>Balance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredAccounts.map((account) => {
                    const typeConfig = getTypeConfig(account.type)
                    const balanceAmount = Math.abs(getAccountBalance(account))
                    const balanceType = getBalanceType(account)

                    return (
                      <Table.Tr key={account.id}>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {account.code}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <Text>{account.name}</Text>
                        </Table.Td>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <Text>{typeConfig.label}</Text>
                        </Table.Td>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                          {account.debit > 0 ? account.debit.toLocaleString() : '-'}
                        </Table.Td>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                          {account.credit > 0 ? account.credit.toLocaleString() : '-'}
                        </Table.Td>
                        <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>
                          {balanceAmount > 0.01 ? (
                            <Text style={{ fontWeight: 700 }}>
                              {balanceAmount.toLocaleString()} {balanceType}
                            </Text>
                          ) : (
                            '-'
                          )}
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}

                  {/* Totals Row */}
                  <Table.Tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                    <Table.Td colSpan={3} style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>
                      Total
                    </Table.Td>
                    <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {trialBalance?.totalDebit.toLocaleString() || '-'}
                    </Table.Td>
                    <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {trialBalance?.totalCredit.toLocaleString() || '-'}
                    </Table.Td>
                    <Table.Td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      -
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>

              {/* Balance Verification */}
              <Box p="md" style={{ border: '2px solid #333', backgroundColor: '#f9f9f9' }}>
                <Text style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  Balance Check: {trialBalance?.isBalanced ? 'Balanced' : 'Not Balanced'}
                </Text>
                <Text style={{ fontSize: '12px' }}>
                  {trialBalance?.isBalanced
                    ? `Debits equal credits as of ${formatDate(trialBalance?.asOfDate || null)}`
                    : `Difference: ${Math.abs(trialBalance?.difference || 0).toLocaleString()}`
                  }
                </Text>
              </Box>

              {/* Footer */}
              <Text style={{ textAlign: 'center', fontSize: '10px', color: '#999', marginTop: '20px' }}>
                Generated by Hook & Hunt ERP System • {new Date().toLocaleString()}
              </Text>
            </Stack>
          </Box>
        </div>
      </Stack>

      {/* Print-specific styling */}
      <style>{`
        @media print {
          /* Hide everything except print-only section */
          body * {
            visibility: hidden;
          }

          .print-only,
          .print-only * {
            visibility: visible;
          }

          .print-only {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }

          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Page breaks */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </Box>
  )
}
