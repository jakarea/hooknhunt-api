import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Paper,
  Card,
  SimpleGrid,
  Avatar,
  Table,
  LoadingOverlay,
  Select,
  TextInput,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconArrowDown,
  IconArrowUp,
  IconWallet,
  IconTrendingUp,
  IconTrendingDown,
  IconReceipt,
  IconRefresh,
  IconDownload,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import dayjs from 'dayjs'

interface WalletDetail {
  id: number
  customerId: number
  customerName: string
  customerEmail: string | null
  customerPhone: string
  balance: number
  totalCredits: number
  totalDebits: number
  lastTransaction: string
  status: string
  isActive: boolean
  isFrozen: boolean
  recentTransactions: Transaction[]
}

interface Transaction {
  id: number
  walletId?: number
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  sourceType: string
  sourceId: number | null
  createdAt: string
  createdBy: string
}

export default function CustomerWalletPage() {
  const { id } = useParams<{ id: string }>()
  const [wallet, setWallet] = useState<WalletDetail | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string | null>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch wallet details
  const fetchWalletDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      const response = await api.get(`/wallet/${id}`)

      if (response.data?.status) {
        setWallet(response.data.data)
        setTransactions(response.data.data.recentTransactions || [])
      } else {
        throw new Error('Failed to fetch wallet details')
      }
    } catch (error) {
      console.error('Error fetching wallet details:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load wallet details',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch all transactions
  const fetchAllTransactions = async () => {
    if (!id) return []

    try {
      const params = new URLSearchParams({
        per_page: '100',
      })

      if (typeFilter && typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await api.get(`/wallet/transactions?${params.toString()}`)

      if (response.data?.status) {
        const data: any = response.data.data
        const allTransactions = Array.isArray(data) ? data : data.data || []

        // Filter transactions for this wallet
        return allTransactions.filter((txn: Transaction) => txn.walletId === parseInt(id))
      }
      return []
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return []
    }
  }

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchWalletDetails()
    const allTxns = await fetchAllTransactions()
    setTransactions(allTxns)
    setRefreshing(false)
  }

  // Initial fetch
  useEffect(() => {
    fetchWalletDetails()
  }, [id])

  // Fetch when filters change
  useEffect(() => {
    const loadTransactions = async () => {
      const allTxns = await fetchAllTransactions()
      setTransactions(allTxns)
    }
    loadTransactions()
  }, [typeFilter, searchQuery, id])

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '৳0.00'
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date/time
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return dayjs(dateString).format('MMM D, YYYY h:mm A')
    } catch {
      return 'Invalid Date'
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!wallet || transactions.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No transactions to export',
        color: 'red',
      })
      return
    }

    const headers = [
      'Date',
      'Type',
      'Description',
      'Amount',
      'Balance Before',
      'Balance After',
      'Source',
      'Created By',
    ]

    const rows = transactions.map((txn) => {
      return [
        formatDateTime(txn.createdAt),
        txn.type === 'credit' ? 'Credit (Add)' : 'Debit (Reduce)',
        `"${txn.description}"`,
        txn.amount,
        txn.balanceBefore,
        txn.balanceAfter,
        txn.sourceType,
        txn.createdBy,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `wallet_transactions_${wallet.customerName.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    notifications.show({
      title: 'Export Successful',
      message: `Exported ${transactions.length} transactions to CSV`,
      color: 'green',
    })
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" ta="center">
          <LoadingOverlay visible />
          <Text c="dimmed">Loading wallet details...</Text>
        </Paper>
      </Box>
    )
  }

  if (!wallet) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="red">Wallet not found</Text>
        </Paper>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="light"
              size="md"
              component={Link}
              to="/crm/wallet"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Wallets
            </Button>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">
              Wallet Details
            </Title>
          </Group>
          <Group>
            <Button
              variant="light"
              size="md"
              onClick={handleRefresh}
              loading={refreshing}
              leftSection={<IconRefresh size={16} />}
            >
              Refresh
            </Button>
            <Button
              variant="light"
              size="md"
              onClick={exportToCSV}
              leftSection={<IconDownload size={16} />}
            >
              Export CSV
            </Button>
          </Group>
        </Group>

        {/* Customer Info Card */}
        <Card withBorder p="md" radius="md">
          <Group>
            <Avatar
              src={null}
              alt={wallet.customerName}
              radius="xl"
              size="lg"
              color="red"
            >
              {(wallet.customerName || 'N').charAt(0)}
            </Avatar>
            <Box style={{ flex: 1 }}>
              <Group mb="xs">
                <Text fw={700} size="xl">{wallet.customerName || 'Unknown Customer'}</Text>
                <Badge
                  color={wallet.balance >= 0 ? 'green' : 'red'}
                  variant="light"
                  size="lg"
                >
                  {wallet.balance >= 0 ? 'Active' : 'Due'}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {wallet.customerPhone || 'N/A'} {wallet.customerEmail && `• ${wallet.customerEmail}`}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Customer ID: {wallet.customerId}
              </Text>
            </Box>
          </Group>
        </Card>

        {/* Balance Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconWallet size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
              <Text size="xs" c="dimmed">Current Balance</Text>
            </Group>
            <Text
              size="xl"
              fw={700}
              c={wallet.balance >= 0 ? 'green' : 'red'}
            >
              {formatCurrency(wallet.balance)}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconTrendingUp size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text size="xs" c="dimmed">Total Credits</Text>
            </Group>
            <Text size="xl" fw={700} c="green">
              {formatCurrency(wallet.totalCredits)}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconTrendingDown size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
              <Text size="xs" c="dimmed">Total Debits</Text>
            </Group>
            <Text size="xl" fw={700} c="red">
              {formatCurrency(wallet.totalDebits)}
            </Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconReceipt size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Text size="xs" c="dimmed">Total Transactions</Text>
            </Group>
            <Text size="xl" fw={700}>
              {transactions.length}
            </Text>
          </Card>
        </SimpleGrid>

        {/* Transactions Section */}
        <Stack>
          <Group justify="space-between">
            <Title order={2} size="lg">Transaction History</Title>
          </Group>

          {/* Filters */}
          <Group>
            <TextInput
              placeholder="Search by description..."
              leftSection={<IconReceipt size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: '300px' }}
              size="md"
            />
            <Select
              placeholder="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              data={[
                { value: 'all', label: 'All Transactions' },
                { value: 'credit', label: 'Credits (Add Funds)' },
                { value: 'debit', label: 'Debits (Reduce Funds)' },
              ]}
              size="md"
              style={{ minWidth: '180px' }}
              clearable
            />
          </Group>

          {/* Mobile: Card View */}
          <Stack display={{ base: 'block', md: 'none' }}>
            {transactions.length === 0 ? (
              <Paper withBorder p="xl" ta="center">
                <Text c="dimmed">No transactions found</Text>
              </Paper>
            ) : (
              transactions.map((txn) => (
                <Card key={txn.id} shadow="sm" p="sm" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Badge
                      color={txn.type === 'credit' ? 'green' : 'red'}
                      variant="light"
                      size="sm"
                      leftSection={
                        txn.type === 'credit' ? (
                          <IconArrowUp size={12} />
                        ) : (
                          <IconArrowDown size={12} />
                        )
                      }
                    >
                      {txn.type === 'credit' ? 'Credit (Add)' : 'Debit (Reduce)'}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {formatDateTime(txn.createdAt)}
                    </Text>
                  </Group>
                  <Text size="sm" mb="xs">{txn.description}</Text>
                  <Group justify="space-between" mb="xs">
                    <Text
                      fw={700}
                      size="lg"
                      c={txn.type === 'credit' ? 'green' : 'red'}
                    >
                      {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </Text>
                    <Group>
                      <Text size="xs" c="dimmed">Balance: </Text>
                      <Text fw={600} size="sm">{formatCurrency(txn.balanceAfter)}</Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Before: {formatCurrency(txn.balanceBefore)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      By {txn.createdBy}
                    </Text>
                  </Group>
                </Card>
              ))
            )}
          </Stack>

          {/* Desktop: Table View */}
          <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }}>
            <Table.ScrollContainer minWidth={1000}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Balance Before</Table.Th>
                    <Table.Th>Balance After</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Created By</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Box py="xl" ta="center">
                          <Text c="dimmed">No transactions found</Text>
                        </Box>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    transactions.map((txn) => (
                      <Table.Tr key={txn.id}>
                        <Table.Td>
                          <Text size="sm">{formatDateTime(txn.createdAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={txn.type === 'credit' ? 'green' : 'red'}
                            variant="light"
                            size="sm"
                            leftSection={
                              txn.type === 'credit' ? (
                                <IconArrowUp size={12} />
                              ) : (
                                <IconArrowDown size={12} />
                              )
                            }
                          >
                            {txn.type === 'credit' ? 'Credit' : 'Debit'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{txn.description}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            fw={700}
                            size="sm"
                            c={txn.type === 'credit' ? 'green' : 'red'}
                          >
                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatCurrency(txn.balanceBefore)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">{formatCurrency(txn.balanceAfter)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{txn.sourceType}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{txn.createdBy}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Stack>
      </Stack>
    </Box>
  )
}
