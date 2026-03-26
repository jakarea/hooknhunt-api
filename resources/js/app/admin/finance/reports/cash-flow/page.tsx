'use client'

import { useState, useMemo } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Card,
  Table,
  Button,
  NumberFormatter,
  Collapse,
} from '@mantine/core'
import {
  IconDownload,
  IconPrinter,
  IconChevronDown,
  IconChevronRight,
  IconArrowDownLeft,
  IconArrowUpRight,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { DateInput } from '@mantine/dates'
import { usePermissions } from '@/hooks/usePermissions'

interface CashFlowItem {
  id: number
  description: string
  amount: number
}

interface CashFlowSection {
  title: string
  items: CashFlowItem[]
  total: number
}

// Mock data for development
const mockOperatingInflow: CashFlowItem[] = [
  { id: 1, description: 'Cash Sales', amount: 850000 },
  { id: 2, description: 'Accounts Receivable Collections', amount: 2500000 },
  { id: 3, description: 'Interest Received', amount: 45000 },
  { id: 4, description: 'Other Operating Income', amount: 120000 },
]

const mockOperatingOutflow: CashFlowItem[] = [
  { id: 5, description: 'Cash Payments to Suppliers', amount: -3200000 },
  { id: 6, description: 'Salaries and Wages', amount: -800000 },
  { id: 7, description: 'Rent Payment', amount: -600000 },
  { id: 8, description: 'Utilities Payment', amount: -150000 },
  { id: 9, description: 'Office Supplies', amount: -85000 },
  { id: 10, description: 'Marketing Expenses', amount: -150000 },
  { id: 11, description: 'Other Operating Expenses', amount: -95000 },
]

const mockBankTransactions: CashFlowItem[] = [
  { id: 12, description: 'Cash Deposits', amount: 2800000 },
  { id: 13, description: 'Cash Withdrawals', amount: -1500000 },
  { id: 14, description: 'Transfers In', amount: 300000 },
  { id: 15, description: 'Transfers Out', amount: -200000 },
]

export default function CashFlowPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports cash flow permission
  if (!hasPermission('finance_reports_cash_flow')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Cash Flow Report.</Text>
        </Card>
      </Stack>
    )
  }

  const [startDate, setStartDate] = useState<Date | null>(new Date('2024-01-01'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2024-12-31'))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operating', 'bank', 'position']))

  // Beginning balance (mock)
  const beginningBalance = 4500000

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  // Calculate totals
  const calculations = useMemo(() => {
    const totalOperatingInflow = mockOperatingInflow.reduce((sum, item) => sum + item.amount, 0)
    const totalOperatingOutflow = mockOperatingOutflow.reduce((sum, item) => sum + item.amount, 0)
    const netOperatingCashFlow = totalOperatingInflow + totalOperatingOutflow

    const totalBankDeposits = mockBankTransactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0)
    const totalBankWithdrawals = Math.abs(mockBankTransactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0))
    const netBankTransfers = mockBankTransactions.reduce((sum, item) => sum + item.amount, 0)

    const netCashFlow = netOperatingCashFlow + netBankTransfers
    const endingBalance = beginningBalance + netCashFlow

    return {
      totalOperatingInflow,
      totalOperatingOutflow,
      netOperatingCashFlow,
      totalBankDeposits,
      totalBankWithdrawals,
      netBankTransfers,
      netCashFlow,
      endingBalance,
    }
  }, [])

  // Handle export
  const handleExport = () => {
    notifications.show({
      title: t('finance.cashFlowPage.notification.exportSuccess'),
      message: t('finance.cashFlowPage.notification.exportSuccessMessage'),
      color: 'green',
    })
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Render cash flow items
  const renderCashFlowItems = (items: CashFlowItem[], showIcons: boolean = true) => (
    <Table>
      <Table.Tbody>
        {items.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td width={40}>
              {showIcons && (
                item.amount >= 0 ? (
                  <IconArrowUpRight size={14} color="green" style={{ marginLeft: 8 }} />
                ) : (
                  <IconArrowDownLeft size={14} color="red" style={{ marginLeft: 8 }} />
                )
              )}
            </Table.Td>
            <Table.Td>
              <Text className="text-sm md:text-base">{item.description}</Text>
            </Table.Td>
            <Table.Td ta="right">
              <Text className="text-sm md:text-base" fw={600} c={item.amount >= 0 ? 'green' : 'red'}>
                {item.amount >= 0 ? '+' : '-'}
                {Math.abs(item.amount).toLocaleString()}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1}>{t('finance.cashFlowPage.title')}</Title>
              <Text c="dimmed">{t('finance.cashFlowPage.subtitle')}</Text>
            </Box>
            <Group>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('finance.cashFlowPage.exportExcel')}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={handlePrint}>
                {t('finance.cashFlowPage.print')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Filters */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Group>
              <DateInput
                label={t('finance.cashFlowPage.startDate')}
                placeholder={t('finance.cashFlowPage.startDatePlaceholder')}
                value={startDate}
                onChange={(value) => setStartDate(value as Date | null)}
                maxDate={endDate || undefined}
                clearable
                style={{ width: 180 }}
              />
              <DateInput
                label={t('finance.cashFlowPage.endDate')}
                placeholder={t('finance.cashFlowPage.endDatePlaceholder')}
                value={endDate}
                onChange={(value) => setEndDate(value as Date | null)}
                minDate={startDate || undefined}
                clearable
                style={{ width: 180 }}
              />
            </Group>
            <Text className="text-sm md:text-base" c="dimmed">
              {t('finance.cashFlowPage.period')}: {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </Group>
        </Card>

        {/* Summary Cards */}
        <Group>
          <Card withBorder p="md" radius="md" style={{ flex: 1, borderTop: '4px solid var(--mantine-color-teal-filled)' }}>
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.cashFlowPage.netChange')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c={calculations.netCashFlow >= 0 ? 'teal' : 'red'}>
              {calculations.netCashFlow >= 0 ? '+' : '-'}
              {Math.abs(calculations.netCashFlow).toLocaleString()}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ flex: 1, borderTop: '4px solid var(--mantine-color-blue-filled)' }}>
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.cashFlowPage.beginningBalance')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="blue">
              {beginningBalance.toLocaleString()}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ flex: 1, borderTop: '4px solid var(--mantine-color-cyan-filled)' }}>
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.cashFlowPage.endingBalance')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="cyan">
              {calculations.endingBalance.toLocaleString()}
            </Text>
          </Card>
        </Group>

        {/* Operating Activities Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="sm"
            radius={0}
            onClick={() => toggleSection('operating')}
            style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-teal-0)' }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('operating') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                <Text className="text-sm md:text-base" fw={600} c="teal">{t('finance.cashFlowPage.operating')}</Text>
              </Group>
              <Text className="text-sm md:text-base" fw={700} c="teal">
                {calculations.netOperatingCashFlow.toLocaleString()}
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('operating')}>
            <Box p="md">
              <Text className="text-xs md:text-sm" fw={600} c="green" mb="xs">{t('finance.cashFlowPage.operatingInflow')}</Text>
              {renderCashFlowItems(mockOperatingInflow)}
              <Group justify="flex-end" mt="xs" mb="md">
                <Text className="text-sm md:text-base" fw={600} c="green">
                  Total Inflow: {calculations.totalOperatingInflow.toLocaleString()}
                </Text>
              </Group>

              <Text className="text-xs md:text-sm" fw={600} c="red" mb="xs">{t('finance.cashFlowPage.operatingOutflow')}</Text>
              {renderCashFlowItems(mockOperatingOutflow)}
              <Group justify="flex-end" mt="xs">
                <Text className="text-sm md:text-base" fw={600} c="red">
                  Total Outflow: {Math.abs(calculations.totalOperatingOutflow).toLocaleString()}
                </Text>
              </Group>

              <Card withBorder p="xs" radius="sm" bg="teal.0">
                <Group justify="space-between">
                  <Text className="text-sm md:text-base" fw={700} c="teal">{t('finance.cashFlowPage.netOperating')}</Text>
                  <Text className="text-sm md:text-base" fw={700} c="teal">
                    {calculations.netOperatingCashFlow.toLocaleString()}
                  </Text>
                </Group>
              </Card>
            </Box>
          </Collapse>
        </Card>

        {/* Bank Transactions Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="sm"
            radius={0}
            onClick={() => toggleSection('bank')}
            style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-blue-0)' }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('bank') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                <Text className="text-sm md:text-base" fw={600} c="blue">BANK TRANSACTIONS</Text>
              </Group>
              <Text className="text-sm md:text-base" fw={700} c="blue">
                {calculations.netBankTransfers.toLocaleString()}
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('bank')}>
            <Box p="md">
              {renderCashFlowItems(mockBankTransactions)}
              <Card withBorder p="xs" radius="sm" bg="blue.0">
                <Group justify="space-between">
                  <Text className="text-sm md:text-base" fw={700} c="blue">Net Bank Transfers</Text>
                  <Text className="text-sm md:text-base" fw={700} c="blue">
                    {calculations.netBankTransfers.toLocaleString()}
                  </Text>
                </Group>
              </Card>
            </Box>
          </Collapse>
        </Card>

        {/* Cash Position Summary */}
        <Card
          withBorder
          p="md"
          radius="md"
          style={{
            backgroundColor: 'var(--mantine-color-cyan-0)',
            borderTop: '4px solid var(--mantine-color-cyan-filled)',
          }}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Text className="text-sm md:text-base" fw={600}>{t('finance.cashFlowPage.beginningBalance')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="blue">
                {beginningBalance.toLocaleString()}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text className="text-sm md:text-base" fw={600}>{t('finance.cashFlowPage.netChange')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c={calculations.netCashFlow >= 0 ? 'teal' : 'red'}>
                {calculations.netCashFlow >= 0 ? '+' : '-'}
                {Math.abs(calculations.netCashFlow).toLocaleString()}
              </Text>
            </Group>

            <Group justify="space-between" style={{ borderTop: '2px solid var(--mantine-color-gray-3)', paddingTop: 'var(--mantine-spacing-sm)' }}>
              <Text className="text-base md:text-lg" fw={700} c="cyan">{t('finance.cashFlowPage.endingBalance')}</Text>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={900} c="cyan">
                {calculations.endingBalance.toLocaleString()}
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Additional Info */}
        <Card withBorder p="md" radius="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text className="text-sm md:text-base" c="dimmed">Total Cash Inflow</Text>
              <Text className="text-sm md:text-base" fw={600} c="green">
                {calculations.totalOperatingInflow.toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text className="text-sm md:text-base" c="dimmed">Total Cash Outflow</Text>
              <Text className="text-sm md:text-base" fw={600} c="red">
                {Math.abs(calculations.totalOperatingOutflow).toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text className="text-sm md:text-base" c="dimmed">Cash Flow Coverage Ratio</Text>
              <Text className="text-sm md:text-base" fw={600}>
                {calculations.totalOperatingOutflow !== 0 ? (calculations.totalOperatingInflow / Math.abs(calculations.totalOperatingOutflow)).toFixed(2) : '0.00'}x
              </Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Box>
  )
}
