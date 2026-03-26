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
  Alert,
  NumberFormatter,
  Collapse,
} from '@mantine/core'
import {
  IconDownload,
  IconPrinter,
  IconCheck,
  IconX,
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
}

// Mock data for development
const mockAssets: AccountItem[] = [
  // Current Assets
  { id: 1, code: '1000', name: 'Cash', amount: 150000 },
  { id: 2, code: '1010', name: 'Cash on Hand', amount: 50000 },
  { id: 3, code: '1020', name: 'Bank Accounts', amount: 1100000 },
  { id: 4, code: '1100', name: 'Accounts Receivable', amount: 450000 },
  { id: 5, code: '1200', name: 'Inventory', amount: 890000 },
  { id: 6, code: '1300', name: 'Prepaid Expenses', amount: 75000 },
  // Non-Current Assets
  { id: 7, code: '1500', name: 'Fixed Assets', amount: 2500000 },
  { id: 8, code: '1510', name: 'Office Equipment', amount: 350000 },
  { id: 9, code: '1520', name: 'Computer Equipment', amount: 450000 },
  { id: 10, code: '1530', name: 'Furniture and Fixtures', amount: 275000 },
  { id: 11, code: '1540', name: 'Vehicles', amount: 850000 },
  { id: 12, code: '1600', name: 'Less: Accumulated Depreciation', amount: -450000 },
]

const mockLiabilities: AccountItem[] = [
  // Current Liabilities
  { id: 13, code: '2000', name: 'Accounts Payable', amount: 320000 },
  { id: 14, code: '2100', name: 'Accrued Expenses', amount: 85000 },
  { id: 15, code: '2200', name: 'Taxes Payable', amount: 125000 },
  { id: 16, code: '2300', name: 'Short-term Loans', amount: 500000 },
  // Non-Current Liabilities
  { id: 17, code: '2500', name: 'Long-term Liabilities', amount: 1500000 },
  { id: 18, code: '2510', name: 'Bank Loans', amount: 1200000 },
  { id: 19, code: '2520', name: 'Lease Obligations', amount: 300000 },
]

const mockEquity: AccountItem[] = [
  { id: 20, code: '3000', name: 'Owners Equity', amount: 2000000 },
  { id: 21, code: '3100', name: 'Share Capital', amount: 2000000 },
  { id: 22, code: '3200', name: 'Retained Earnings', amount: 1200000 },
  { id: 23, code: '3300', name: 'Current Year Earnings', amount: 300000 },
]

export default function BalanceSheetPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance reports balance sheet permission
  if (!hasPermission('finance_reports_balance_sheet')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Balance Sheet Report.</Text>
        </Paper>
      </Stack>
    )
  }

  const [asOfDate, setAsOfDate] = useState<Date | null>(new Date())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['assets', 'liabilities', 'equity']))

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
  const totals = useMemo(() => {
    const totalAssets = mockAssets.reduce((sum, item) => sum + item.amount, 0)
    const totalLiabilities = mockLiabilities.reduce((sum, item) => sum + item.amount, 0)
    const totalEquity = mockEquity.reduce((sum, item) => sum + item.amount, 0)
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
    }
  }, [])

  // Handle export
  const handleExport = () => {
    notifications.show({
      title: t('finance.balanceSheetPage.notification.exportSuccess'),
      message: t('finance.balanceSheetPage.notification.exportSuccessMessage'),
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

  // Render account list
  const renderAccountList = (accounts: AccountItem[], color: string) => (
    <Table>
      <Table.Tbody>
        {accounts.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td width={80}>
              <Text className="text-sm md:text-base" c="dimmed">{item.code}</Text>
            </Table.Td>
            <Table.Td>
              <Text className="text-sm md:text-base">{item.name}</Text>
            </Table.Td>
            <Table.Td ta="right">
              <Text className="text-sm md:text-base" fw={600} c={item.amount < 0 ? 'red' : color}>
                {item.amount < 0 ? (
                  <NumberFormatter value={Math.abs(item.amount)} thousandSeparator />
                ) : (
                  <NumberFormatter value={item.amount} thousandSeparator />
                )}
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
              <Title order={1}>{t('finance.balanceSheetPage.title')}</Title>
              <Text c="dimmed">{t('finance.balanceSheetPage.subtitle')}</Text>
            </Box>
            <Group>
              <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
                {t('finance.balanceSheetPage.exportExcel')}
              </Button>
              <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={handlePrint}>
                {t('finance.balanceSheetPage.print')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Filters */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between">
            <DateInput
              label={t('finance.balanceSheetPage.asOfDate')}
              placeholder={t('finance.balanceSheetPage.asOfDatePlaceholder')}
              value={asOfDate}
              onChange={setAsOfDate}
              clearable
              style={{ width: 200 }}
            />
            <Text className="text-sm md:text-base" c="dimmed">
              {t('finance.balanceSheetPage.asOf')} {formatDate(asOfDate)}
            </Text>
          </Group>
        </Card>

        {/* ASSETS Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="md"
            radius={0}
            onClick={() => toggleSection('assets')}
            style={{
              cursor: 'pointer',
              backgroundColor: 'var(--mantine-color-green-filled)',
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('assets') ? <IconChevronDown size={20} color="white" /> : <IconChevronRight size={20} color="white" />}
                <Title order={3} c="white">{t('finance.balanceSheetPage.assets')}</Title>
              </Group>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="white">
                {totals.totalAssets.toLocaleString()}
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('assets')}>
            <Box p="md">
              <Text className="text-xs md:text-sm" fw={700} c="dimmed" mb="sm" mt="sm">{t('finance.balanceSheetPage.currentAssets')}</Text>
              {renderAccountList(mockAssets.slice(0, 6), 'green')}
              <Text className="text-xs md:text-sm" fw={700} c="dimmed" mb="sm" mt="lg">{t('finance.balanceSheetPage.nonCurrentAssets')}</Text>
              {renderAccountList(mockAssets.slice(6), 'green')}
            </Box>
          </Collapse>
        </Card>

        {/* LIABILITIES Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="md"
            radius={0}
            onClick={() => toggleSection('liabilities')}
            style={{
              cursor: 'pointer',
              backgroundColor: 'var(--mantine-color-red-filled)',
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('liabilities') ? <IconChevronDown size={20} color="white" /> : <IconChevronRight size={20} color="white" />}
                <Title order={3} c="white">{t('finance.balanceSheetPage.liabilities')}</Title>
              </Group>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="white">
                {totals.totalLiabilities.toLocaleString()}
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('liabilities')}>
            <Box p="md">
              <Text className="text-xs md:text-sm" fw={700} c="dimmed" mb="sm" mt="sm">{t('finance.balanceSheetPage.currentLiabilities')}</Text>
              {renderAccountList(mockLiabilities.slice(0, 4), 'red')}
              <Text className="text-xs md:text-sm" fw={700} c="dimmed" mb="sm" mt="lg">{t('finance.balanceSheetPage.nonCurrentLiabilities')}</Text>
              {renderAccountList(mockLiabilities.slice(4), 'red')}
            </Box>
          </Collapse>
        </Card>

        {/* EQUITY Section */}
        <Card withBorder p="0" radius="md" shadow="sm">
          <Card
            withBorder
            p="md"
            radius={0}
            onClick={() => toggleSection('equity')}
            style={{
              cursor: 'pointer',
              backgroundColor: 'var(--mantine-color-blue-filled)',
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Group justify="space-between">
              <Group>
                {expandedSections.has('equity') ? <IconChevronDown size={20} color="white" /> : <IconChevronRight size={20} color="white" />}
                <Title order={3} c="white">{t('finance.balanceSheetPage.equity')}</Title>
              </Group>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="white">
                {totals.totalEquity.toLocaleString()}
              </Text>
            </Group>
          </Card>
          <Collapse in={expandedSections.has('equity')}>
            <Box p="md">
              {renderAccountList(mockEquity, 'blue')}
            </Box>
          </Collapse>
        </Card>

        {/* Summary Totals Card */}
        <Card withBorder p="md" radius="md" shadow="sm">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text className="text-sm md:text-base" fw={600}>{t('finance.balanceSheetPage.totalAssets')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="green">
                {totals.totalAssets.toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text className="text-sm md:text-base" fw={600}>{t('finance.balanceSheetPage.totalLiabilities')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="red">
                {totals.totalLiabilities.toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text className="text-sm md:text-base" fw={600}>{t('finance.balanceSheetPage.totalEquity')}</Text>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c="blue">
                {totals.totalEquity.toLocaleString()}
              </Text>
            </Group>
            <Group justify="space-between" style={{ borderTop: '2px solid var(--mantine-color-gray-3)', paddingTop: 'var(--mantine-spacing-sm)' }}>
              <Text className="text-sm md:text-base" fw={700}>{t('finance.balanceSheetPage.totalLiabilitiesAndEquity')}</Text>
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={900} c="red">
                {totals.totalLiabilitiesAndEquity.toLocaleString()}
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* Verification Alert */}
        {totals.isBalanced ? (
          <Alert
            variant="light"
            color="teal"
            title={t('finance.balanceSheetPage.verification')}
            icon={<IconCheck size={20} />}
          >
            <Group gap="xl">
              <Text className="text-sm md:text-base">
                {t('finance.balanceSheetPage.balanced')}
              </Text>
              <Text className="text-sm md:text-base" fw={600}>
                {totals.totalAssets.toLocaleString()} = {totals.totalLiabilities.toLocaleString()} + {totals.totalEquity.toLocaleString()}
              </Text>
            </Group>
          </Alert>
        ) : (
          <Alert
            variant="light"
            color="red"
            title={t('finance.balanceSheetPage.notBalanced')}
            icon={<IconX size={20} />}
          >
            <Group gap="xl">
              <Text className="text-sm md:text-base">
                {t('finance.balanceSheetPage.assetsEqualLiabilities')}
              </Text>
              <Group gap="md">
                <Text className="text-sm md:text-base">
                  Assets: <Text span fw={600} c="green">{totals.totalAssets.toLocaleString()}</Text>
                </Text>
                <Text className="text-sm md:text-base">
                  Liab + Equity: <Text span fw={600} c="red">{totals.totalLiabilitiesAndEquity.toLocaleString()}</Text>
                </Text>
              </Group>
            </Group>
          </Alert>
        )}
      </Stack>
    </Box>
  )
}
