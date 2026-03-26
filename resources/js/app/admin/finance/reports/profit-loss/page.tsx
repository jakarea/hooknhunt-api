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
  Progress,
  NumberFormatter,
  Collapse,
} from '@mantine/core'
import {
  IconDownload,
  IconPrinter,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { DateInput } from '@mantine/dates'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'

interface AccountItem {
  id: number
  code: string
  name: string
  amount: number
  percentage?: number
}

// Mock data for development
const mockRevenue: AccountItem[] = [
  { id: 1, code: '4100', name: 'Product Sales', amount: 7200000 },
  { id: 2, code: '4200', name: 'Service Revenue', amount: 1300000 },
  { id: 3, code: '4310', name: 'Interest Income', amount: 45000 },
  { id: 4, code: '4320', name: 'Discount Received', amount: 85000 },
]

const mockCOGS: AccountItem[] = [
  { id: 5, code: '5000', name: 'Cost of Goods Sold', amount: 5200000 },
]

const mockOperatingExpenses: AccountItem[] = [
  { id: 6, code: '5110', name: 'Rent Expense', amount: 600000 },
  { id: 7, code: '5120', name: 'Utilities Expense', amount: 150000 },
  { id: 8, code: '5130', name: 'Salaries and Wages', amount: 800000 },
  { id: 9, code: '5140', name: 'Office Supplies', amount: 85000 },
  { id: 10, code: '5150', name: 'Marketing Expenses', amount: 150000 },
  { id: 11, code: '5200', name: 'Depreciation Expense', amount: 275000 },
  { id: 12, code: '5300', name: 'Interest Expense', amount: 95000 },
  { id: 13, code: '5400', name: 'Tax Expense', amount: 450000 },
]

const mockOtherExpenses: AccountItem[] = [
  { id: 14, code: '5500', name: 'Loss on Asset Disposal', amount: 25000 },
]

const mockOtherIncome: AccountItem[] = [
  { id: 15, code: '4300', name: 'Other Income', amount: 120000 },
]

export default function ProfitLossPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports profit loss permission
  if (!hasPermission('finance_reports_profit_loss')) {
    return (
      <Stack p="xl">
        <Card withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Profit & Loss Report.</Text>
        </Card>
      </Stack>
    )
  }

  const [startDate, setStartDate] = useState<Date | null>(new Date('2024-01-01'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2024-12-31'))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['revenue', 'cogs', 'expenses']))

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
    const totalRevenue = mockRevenue.reduce((sum, item) => sum + item.amount, 0)
    const totalCOGS = mockCOGS.reduce((sum, item) => sum + item.amount, 0)
    const grossProfit = totalRevenue - totalCOGS

    const totalOperatingExpenses = mockOperatingExpenses.reduce((sum, item) => sum + item.amount, 0)
    const operatingIncome = grossProfit - totalOperatingExpenses

    const totalOtherIncome = mockOtherIncome.reduce((sum, item) => sum + item.amount, 0)
    const totalOtherExpenses = mockOtherExpenses.reduce((sum, item) => sum + item.amount, 0)

    const netProfit = operatingIncome + totalOtherIncome - totalOtherExpenses
    const totalExpenses = totalCOGS + totalOperatingExpenses + totalOtherExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalOperatingExpenses,
      operatingIncome,
      totalOtherIncome,
      totalOtherExpenses,
      netProfit,
      totalExpenses,
      profitMargin,
    }
  }, [])

  // Handle export
  const handleExport = () => {
    notifications.show({
      title: t('finance.profitLossPage.notification.exportSuccess'),
      message: t('finance.profitLossPage.notification.exportSuccessMessage'),
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

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Group justify="space-between">
            <Box>
              <Title order={1}>{t('finance.profitLossPage.title')}</Title>
              <Text c="dimmed">{t('finance.profitLossPage.subtitle')}</Text>
            </Box>
            <Group>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('finance.profitLossPage.exportExcel')}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={handlePrint}>
                {t('finance.profitLossPage.print')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Filters */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Group>
              <DateInput
                label={t('finance.profitLossPage.startDate')}
                placeholder={t('finance.profitLossPage.startDatePlaceholder')}
                value={startDate}
                onChange={(value) => setStartDate(value as Date | null)}
                maxDate={endDate || undefined}
                clearable
                style={{ width: 180 }}
              />
              <DateInput
                label={t('finance.profitLossPage.endDate')}
                placeholder={t('finance.profitLossPage.endDatePlaceholder')}
                value={endDate}
                onChange={(value) => setEndDate(value as Date | null)}
                minDate={startDate || undefined}
                clearable
                style={{ width: 180 }}
              />
            </Group>
            <Text className="text-sm md:text-base" c="dimmed">
              {t('finance.profitLossPage.period')}: {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </Group>
        </Card>

        {/* Summary Cards */}
        <Group>
          <Card withBorder p="md" radius="md" style={{ flex: 1, borderTop: '4px solid var(--mantine-color-green-filled)' }}>
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.profitLossPage.totalRevenue')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
              <NumberFormatter value={calculations.totalRevenue} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ flex: 1, borderTop: '4px solid var(--mantine-color-red-filled)' }}>
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.profitLossPage.totalExpenses')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">
              <NumberFormatter value={calculations.totalExpenses} prefix="৳" thousandSeparator />
            </Text>
          </Card>

          <Card
            withBorder
            p="md"
            radius="md"
            style={{
              flex: 1,
              borderTop: `4px solid ${calculations.netProfit >= 0 ? 'var(--mantine-color-green-filled)' : 'var(--mantine-color-red-filled)'}`
            }}
          >
            <Group mb="xs">
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.profitLossPage.netProfitLoss')}</Text>
            </Group>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c={calculations.netProfit >= 0 ? 'green' : 'red'}>
              <NumberFormatter value={calculations.netProfit} prefix="৳" thousandSeparator />
            </Text>
            <Text className="text-xs md:text-sm" c="dimmed" mt="xs">
              {t('finance.profitLossPage.margin')}: {calculations.profitMargin.toFixed(1)}%
            </Text>
          </Card>
        </Group>

        {/* Revenue Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="sm"
            radius={0}
            onClick={() => toggleSection('revenue')}
            style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-green-0)' }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('revenue') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                <Text className="text-sm md:text-base" fw={600} c="green">{t('finance.profitLossPage.revenue')}</Text>
              </Group>
              <Text className="text-sm md:text-base" fw={700} c="green">
                <NumberFormatter value={calculations.totalRevenue} prefix="৳" thousandSeparator />
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('revenue')}>
            <Table>
              <Table.Tbody>
                {mockRevenue.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text className="text-sm md:text-base" c="dimmed">{item.code}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{item.name}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text className="text-sm md:text-base" fw={600} c="green">
                        <NumberFormatter value={item.amount} prefix="৳" thousandSeparator />
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Collapse>
        </Card>

        {/* COGS Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="sm"
            radius={0}
            onClick={() => toggleSection('cogs')}
            style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-orange-0)' }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('cogs') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                <Text className="text-sm md:text-base" fw={600} c="orange">{t('finance.profitLossPage.costOfGoodsSold')}</Text>
              </Group>
              <Text className="text-sm md:text-base" fw={700} c="red">
                (<NumberFormatter value={calculations.totalCOGS} prefix="৳" thousandSeparator />)
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('cogs')}>
            <Table>
              <Table.Tbody>
                {mockCOGS.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text className="text-sm md:text-base" c="dimmed">{item.code}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{item.name}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text className="text-sm md:text-base" fw={600} c="red">
                        (<NumberFormatter value={item.amount} prefix="৳" thousandSeparator />)
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Collapse>
        </Card>

        {/* Gross Profit */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text className="text-sm md:text-base" fw={600}>{t('finance.profitLossPage.grossProfit')}</Text>
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="green">
              <NumberFormatter value={calculations.grossProfit} prefix="৳" thousandSeparator />
            </Text>
          </Group>
          <Progress
            value={calculations.totalRevenue > 0 ? (calculations.grossProfit / calculations.totalRevenue) * 100 : 0}
            color="green"
            className="text-sm md:text-base"
            mt="xs"
          />
          <Text className="text-xs md:text-sm" c="dimmed" mt="xs">
            {t('finance.profitLossPage.grossMargin')}: {calculations.totalRevenue > 0 ? ((calculations.grossProfit / calculations.totalRevenue) * 100).toFixed(1) : 0}%
          </Text>
        </Card>

        {/* Operating Expenses Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="sm"
            radius={0}
            onClick={() => toggleSection('expenses')}
            style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-red-0)' }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('expenses') ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                <Text className="text-sm md:text-base" fw={600} c="red">{t('finance.profitLossPage.operatingExpenses')}</Text>
              </Group>
              <Text className="text-sm md:text-base" fw={700} c="red">
                (<NumberFormatter value={calculations.totalOperatingExpenses} prefix="৳" thousandSeparator />)
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('expenses')}>
            <Table>
              <Table.Tbody>
                {mockOperatingExpenses.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text className="text-sm md:text-base" c="dimmed">{item.code}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{item.name}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text className="text-sm md:text-base" fw={600} c="red">
                        (<NumberFormatter value={item.amount} prefix="৳" thousandSeparator />)
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Collapse>
        </Card>

        {/* Operating Income */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <Text className="text-sm md:text-base" fw={600}>{t('finance.profitLossPage.operatingIncome')}</Text>
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c={calculations.operatingIncome >= 0 ? 'green' : 'red'}>
              <NumberFormatter value={calculations.operatingIncome} prefix="৳" thousandSeparator />
            </Text>
          </Group>
        </Card>

        {/* Other Income/Expenses */}
        <Card withBorder p="md" radius="md">
          <Stack gap="sm">
            {mockOtherIncome.map((item) => (
              <Group key={item.id} justify="space-between">
                <Text className="text-sm md:text-base">{item.code} - {item.name}</Text>
                <Text className="text-sm md:text-base" fw={600} c="green">
                  + <NumberFormatter value={item.amount} prefix="৳" thousandSeparator />
                </Text>
              </Group>
            ))}
            {mockOtherExpenses.map((item) => (
              <Group key={item.id} justify="space-between">
                <Text className="text-sm md:text-base">{item.code} - {item.name}</Text>
                <Text className="text-sm md:text-base" fw={600} c="red">
                  - <NumberFormatter value={item.amount} prefix="৳" thousandSeparator />
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Net Profit Summary */}
        <Card
          withBorder
          p="xl"
          radius="md"
          style={{
            backgroundColor: calculations.netProfit >= 0 ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)',
            borderTop: `4px solid ${calculations.netProfit >= 0 ? 'var(--mantine-color-green-filled)' : 'var(--mantine-color-red-filled)'}`
          }}
        >
          <Group justify="space-between" mb="md">
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>{t('finance.profitLossPage.netProfit')}</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={900} c={calculations.netProfit >= 0 ? 'green' : 'red'}>
              <NumberFormatter value={calculations.netProfit} prefix="৳" thousandSeparator />
            </Text>
          </Group>
          <Group justify="space-between">
            <Text className="text-sm md:text-base" c="dimmed">{t('finance.profitLossPage.profitMargin')}</Text>
            <Text className="text-sm md:text-base" fw={600} c={calculations.netProfit >= 0 ? 'green' : 'red'}>
              {calculations.profitMargin.toFixed(2)}%
            </Text>
          </Group>
          <Progress
            value={Math.min(Math.abs(calculations.profitMargin), 100)}
            color={calculations.netProfit >= 0 ? 'green' : 'red'}
            className="text-lg md:text-xl lg:text-2xl"
            mt="md"
          />
        </Card>
      </Stack>
    </Box>
  )
}
