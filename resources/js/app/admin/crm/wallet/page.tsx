import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  TextInput,
  Select,
  SimpleGrid,
  Avatar,
  Table,
  LoadingOverlay,
  NumberInput,
} from '@mantine/core'
import {
  IconPlus,
  IconSearch,
  IconWallet,
  IconCoin,
  IconTrendingUp,
  IconTrendingDown,
  IconEye,
  IconCalendar,
  IconReceipt,
  IconRefresh,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { modals } from '@mantine/modals'
import { useDebouncedValue } from '@mantine/hooks'

// Add Funds Modal Component
function AddFundsModal({
  wallet,
  onSuccess,
}: {
  wallet?: Wallet
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(wallet?.customerId || null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(customerSearch, 300)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch customers for search
  const fetchCustomers = async (query: string) => {
    if (!query || query.length < 2) {
      setCustomerOptions([])
      return
    }

    try {
      setSearchingCustomers(true)
      const response = await api.get(`/user-management/users?type=customer&search=${query}&per_page=20`)

      if (response.data?.status) {
        const data: PaginatedResponse<any> = response.data.data
        const customers = Array.isArray(data) ? data : data.data || []

        setCustomerOptions(
          customers.map((customer: any) => ({
            value: customer.id.toString(),
            label: `${customer.name} (${customer.phone || customer.email || 'N/A'}) - ID: ${customer.id}`,
          }))
        )
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setSearchingCustomers(false)
    }
  }

  // Fetch customers when search changes
  useEffect(() => {
    if (!wallet) {
      fetchCustomers(debouncedSearch)
    }
  }, [debouncedSearch])

  const handleSubmit = async () => {
    try {
      const customerId = wallet ? wallet.customerId : selectedCustomerId

      if (!customerId || customerId <= 0) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please select a customer',
          color: 'red',
        })
        return
      }

      if (!amount || amount <= 0) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please enter a valid amount',
          color: 'red',
        })
        return
      }

      setLoading(true)

      const response = await api.post('/wallet/add-funds', {
        user_id: customerId,
        amount: amount,
        description: description || 'Manual adjustment by admin',
      })

      if (response.data?.status) {
        notifications.show({
          title: 'Success',
          message: `৳${amount.toLocaleString()} added to wallet`,
          color: 'green',
        })
        modals.closeAll()
        onSuccess()
      } else {
        throw new Error('Failed to add funds')
      }
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add funds',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack>
      {!wallet && (
        <Select
          label="Search Customer"
          placeholder="Type name, email or phone to search..."
          searchable
          clearable
          searchValue={customerSearch}
          onSearchChange={setCustomerSearch}
          value={selectedCustomerId?.toString() || null}
          onChange={(value) => setSelectedCustomerId(value ? parseInt(value) : null)}
          data={customerOptions}
          nothingFoundMessage={customerSearch.length < 2 ? 'Type at least 2 characters' : 'No customers found'}
          limit={10}
          maxDropdownHeight={200}
          disabled={searchingCustomers}
        />
      )}
      <NumberInput
        label="Amount (৳)"
        placeholder="Enter amount"
        min={0.01}
        step={100}
        decimalScale={2}
        value={amount}
        onChange={(value) => setAmount(value as number)}
        autoFocus={!!wallet}
      />
      <TextInput
        label="Description"
        placeholder="e.g., Refund for order #1234"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
      />
      {!wallet && (
        <Text className="text-xs md:text-sm" c="dimmed">
          Search by customer name, email or phone number
        </Text>
      )}
      <Group justify="flex-end" mt="md">
        <Button variant="light" onClick={() => modals.closeAll()}>
          Cancel
        </Button>
        <Button color="green" onClick={handleSubmit} loading={loading}>
          Add Funds
        </Button>
      </Group>
    </Stack>
  )
}

interface Wallet {
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
}

interface WalletTransaction {
  id: number
  walletId: number
  customerName: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
  createdBy: string
}

interface WalletStats {
  totalBalance: number
  totalCredits: number
  totalDebits: number
  activeWallets: number
  frozenWallets: number
  positiveBalanceWallets: number
  negativeBalanceWallets: number
}

interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function WalletPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<string | null>('all')
  const [activeTab, setActiveTab] = useState<'wallets' | 'transactions'>('wallets')
  const [currentPage, setCurrentPage] = useState(1)

  // Data states
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [stats, setStats] = useState<WalletStats | null>(null)

  // Loading states
  const [walletsLoading, setWalletsLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Pagination
  const [totalWalletPages, setTotalWalletPages] = useState(1)
  const itemsPerPage = 10

  // Fetch wallets
  const fetchWallets = async (page = 1) => {
    try {
      setWalletsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: itemsPerPage.toString(),
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      if (balanceFilter && balanceFilter !== 'all') {
        params.append('balance', balanceFilter)
      }

      const response = await api.get(`/wallet?${params.toString()}`)

      if (response.data?.status) {
        const data: PaginatedResponse<Wallet> = response.data.data
        setWallets(Array.isArray(data) ? data : data.data || [])

        // Handle pagination
        if (data.current_page) {
          setTotalWalletPages(data.last_page || 1)
          setCurrentPage(data.current_page)
        }
      } else {
        throw new Error('Failed to fetch wallets')
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load wallets. Please try again.',
        color: 'red',
      })
      setWallets([])
    } finally {
      setWalletsLoading(false)
    }
  }

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      const params = new URLSearchParams({
        per_page: '50',
      })

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const response = await api.get(`/wallet/transactions?${params.toString()}`)

      if (response.data?.status) {
        const data: PaginatedResponse<WalletTransaction> = response.data.data
        setTransactions(Array.isArray(data) ? data : data.data || [])
      } else {
        throw new Error('Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load transactions. Please try again.',
        color: 'red',
      })
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const response = await api.get('/wallet/stats')

      if (response.data?.status) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchWallets(1)
    fetchTransactions()
    fetchStats()
  }, [])

  // Fetch when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'wallets') {
        fetchWallets(1)
      } else {
        fetchTransactions()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, balanceFilter, activeTab])

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '৳0.00'
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date/time
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Invalid Date'
    }
  }

  // Add funds modal
  const openAddFundsModal = (wallet?: Wallet) => {
    modals.open({
      title: wallet ? `Add Funds to ${wallet.customerName}'s Wallet` : 'Add Funds to Customer Wallet',
      centered: true,
      size: 'lg',
      children: (
        <AddFundsModal
          wallet={wallet}
          onSuccess={() => {
            fetchWallets(currentPage)
            fetchStats()
          }}
        />
      ),
    })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">Customer Wallets</Title>
          <Text c="dimmed" className="text-sm md:text-base">Manage customer wallet balances and transactions</Text>
        </Box>

        {/* Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconWallet size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Total Balance</Text>
            </Group>
            {statsLoading ? (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="dimmed">Loading...</Text>
            ) : (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{formatCurrency(stats?.totalBalance || 0)}</Text>
            )}
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconTrendingUp size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Total Credits</Text>
            </Group>
            {statsLoading ? (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="dimmed">Loading...</Text>
            ) : (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">{formatCurrency(stats?.totalCredits || 0)}</Text>
            )}
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconTrendingDown size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Total Debits</Text>
            </Group>
            {statsLoading ? (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="dimmed">Loading...</Text>
            ) : (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">{formatCurrency(stats?.totalDebits || 0)}</Text>
            )}
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconCoin size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Text className="text-xs md:text-sm" c="dimmed">Active Wallets</Text>
            </Group>
            {statsLoading ? (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="dimmed">Loading...</Text>
            ) : (
              <Text className="text-xl md:text-2xl lg:text-3xl" fw={700}>{stats?.activeWallets || 0}</Text>
            )}
          </Card>
        </SimpleGrid>

        {/* Tabs */}
        <Box>
          <Group>
            <Button
              variant={activeTab === 'wallets' ? 'filled' : 'light'}
              onClick={() => setActiveTab('wallets')}
            >
              Wallets ({wallets.length})
            </Button>
            <Button
              variant={activeTab === 'transactions' ? 'filled' : 'light'}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions ({transactions.length})
            </Button>
          </Group>
        </Box>

        {/* Filters */}
        <Group justify="space-between" wrap="wrap">
          <Group style={{ flex: 1, maxWidth: '100%' }}>
            <TextInput
              placeholder="Search by customer name..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: '400px' }}
              className="text-base md:text-lg"
            />
            <Select
              placeholder="Filter by balance"
              value={balanceFilter}
              onChange={setBalanceFilter}
              data={[
                { value: 'all', label: 'All Balances' },
                { value: 'positive', label: 'Positive Balance' },
                { value: 'zero', label: 'Zero Balance' },
                { value: 'negative', label: 'Negative Balance (Due)' },
              ]}
              className="text-base md:text-lg"
              style={{ minWidth: '180px' }}
              clearable
            />
            <Button
              variant="light"
              className="text-base md:text-lg"
              onClick={() => {
                fetchWallets(currentPage)
                fetchTransactions()
                fetchStats()
              }}
            >
              <IconRefresh size={16} />
            </Button>
          </Group>
          <Button
            color="green"
            className="text-base md:text-lg"
            leftSection={<IconPlus size={16} />}
            onClick={() => openAddFundsModal()}
          >
            Add Funds
          </Button>
        </Group>

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <>
            {/* Mobile: Card View */}
            <Stack display={{ base: 'block', md: 'none' }}>
              {walletsLoading ? (
                <Paper withBorder p="xl" ta="center">
                  <Text c="dimmed">Loading wallets...</Text>
                </Paper>
              ) : wallets.length === 0 ? (
                <Paper withBorder p="xl" ta="center">
                  <Text c="dimmed">No wallets found</Text>
                </Paper>
              ) : (
                wallets.map((wallet) => (
                  <Card key={wallet.id} shadow="sm" p="md" radius="md" withBorder>
                    <Stack>
                      {/* Header */}
                      <Group justify="space-between">
                        <Group>
                          <Avatar
                            src={null}
                            alt={wallet.customerName || 'Customer'}
                            radius="xl"
                            className="text-sm md:text-base"
                            color="red"
                          >
                            {(wallet.customerName || 'N').charAt(0)}
                          </Avatar>
                          <Box>
                            <Text fw={600} className="text-sm md:text-base">{wallet.customerName || 'Unknown Customer'}</Text>
                            <Text className="text-xs md:text-sm" c="dimmed">{wallet.customerPhone || 'N/A'}</Text>
                          </Box>
                        </Group>
                        <Badge
                          color={wallet.balance >= 0 ? 'green' : 'red'}
                          variant="light"
                        >
                          {wallet.balance >= 0 ? 'Active' : 'Due'}
                        </Badge>
                      </Group>

                      {/* Balance */}
                      <Box
                        p="sm"
                        style={{
                          backgroundColor: wallet.balance >= 0 ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)',
                          borderRadius: '8px',
                        }}
                      >
                        <Text className="text-xs md:text-sm" c="dimmed">Current Balance</Text>
                        <Text
                          className="text-xl md:text-2xl lg:text-3xl"
                          fw={700}
                          c={wallet.balance >= 0 ? 'green' : 'red'}
                        >
                          {formatCurrency(wallet.balance)}
                        </Text>
                      </Box>

                      {/* Stats */}
                      <SimpleGrid cols={2}>
                        <Box>
                          <Text className="text-xs md:text-sm" c="dimmed">Total Credits</Text>
                          <Text className="text-sm md:text-base" fw={500} c="green">{formatCurrency(wallet.totalCredits)}</Text>
                        </Box>
                        <Box>
                          <Text className="text-xs md:text-sm" c="dimmed">Total Debits</Text>
                          <Text className="text-sm md:text-base" fw={500} c="red">{formatCurrency(wallet.totalDebits)}</Text>
                        </Box>
                      </SimpleGrid>

                      {/* Last transaction */}
                      <Group>
                        <IconCalendar size={14} style={{ color: 'var(--mantine-color-gray-5)' }} />
                        <Text className="text-xs md:text-sm" c="dimmed">
                          Last: {formatDateTime(wallet.lastTransaction)}
                        </Text>
                      </Group>

                      {/* Actions */}
                      <Group>
                        <Button
                          variant="light"
                          className="text-xs md:text-sm flex-1"
                          component={Link}
                          to={`/crm/wallet/${wallet.id}`}
                          leftSection={<IconEye size={14} />}
                        >
                          View Wallet
                        </Button>
                        <Button
                          variant="light"
                          className="text-xs md:text-sm flex-1"
                          color="green"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => openAddFundsModal(wallet)}
                        >
                          Add Funds
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>

            {/* Desktop: Table View */}
            <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} pos="relative">
              <LoadingOverlay visible={walletsLoading} overlayProps={{ blur: 2 }} />
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Balance</Table.Th>
                      <Table.Th>Total Credits</Table.Th>
                      <Table.Th>Total Debits</Table.Th>
                      <Table.Th>Last Transaction</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {wallets.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">No wallets found</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      wallets.map((wallet) => (
                        <Table.Tr key={wallet.id}>
                          <Table.Td>
                            <Group>
                              <Avatar
                                src={null}
                                alt={wallet.customerName || 'Customer'}
                                radius="xl"
                                className="text-sm md:text-base"
                                color="red"
                              >
                                {(wallet.customerName || 'N').charAt(0)}
                              </Avatar>
                              <Box>
                                <Text fw={600} className="text-sm md:text-base">{wallet.customerName || 'Unknown Customer'}</Text>
                                <Text className="text-xs md:text-sm" c="dimmed">{wallet.customerPhone || 'N/A'}</Text>
                              </Box>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              fw={700}
                              className="text-sm md:text-base"
                              c={wallet.balance >= 0 ? 'green' : 'red'}
                            >
                              {formatCurrency(wallet.balance)}
                            </Text>
                            {wallet.balance < 0 && (
                              <Badge className="text-xs md:text-sm" color="red" variant="light" mt="xs">Due</Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base" c="green">{formatCurrency(wallet.totalCredits)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base" c="red">{formatCurrency(wallet.totalDebits)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{formatDateTime(wallet.lastTransaction)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={wallet.balance >= 0 ? 'green' : 'red'}
                              variant="light"
                              className="text-sm md:text-base"
                            >
                              {wallet.balance >= 0 ? 'Active' : 'Due'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group>
                              <Button
                                variant="light"
                                className="text-xs md:text-sm"
                                color="gray"
                                component={Link}
                                to={`/crm/wallet/${wallet.id}`}
                                leftSection={<IconEye size={14} />}
                              >
                                View
                              </Button>
                              <Button
                                variant="filled"
                                className="text-xs md:text-sm"
                                color="green"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => openAddFundsModal(wallet)}
                              >
                                Add Funds
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>

            {/* Pagination */}
            {totalWalletPages > 1 && (
              <Group justify="flex-end">
                <Button
                  variant="light"
                  className="text-sm md:text-base"
                  disabled={currentPage === 1}
                  onClick={() => fetchWallets(currentPage - 1)}
                >
                  Previous
                </Button>
                <Text className="text-sm md:text-base" c="dimmed">
                  Page {currentPage} of {totalWalletPages}
                </Text>
                <Button
                  variant="light"
                  className="text-sm md:text-base"
                  disabled={currentPage === totalWalletPages}
                  onClick={() => fetchWallets(currentPage + 1)}
                >
                  Next
                </Button>
              </Group>
            )}
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {/* Mobile: Card View */}
            <Stack display={{ base: 'block', md: 'none' }}>
              {transactionsLoading ? (
                <Paper withBorder p="xl" ta="center">
                  <Text c="dimmed">Loading transactions...</Text>
                </Paper>
              ) : transactions.length === 0 ? (
                <Paper withBorder p="xl" ta="center">
                  <Text c="dimmed">No transactions found</Text>
                </Paper>
              ) : (
                transactions.map((txn) => (
                  <Card key={txn.id} shadow="sm" p="sm" radius="md" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group>
                        <IconReceipt size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
                        <Text fw={600} className="text-sm md:text-base">{txn.customerName}</Text>
                      </Group>
                      <Badge
                        color={txn.type === 'credit' ? 'green' : 'red'}
                        variant="light"
                        className="text-sm md:text-base"
                      >
                        {txn.type === 'credit' ? 'Credit' : 'Debit'}
                      </Badge>
                    </Group>
                    <Text className="text-sm md:text-base" mb="xs">{txn.description}</Text>
                    <Group justify="space-between">
                      <Text
                        fw={700}
                        className="text-lg md:text-xl lg:text-2xl"
                        c={txn.type === 'credit' ? 'green' : 'red'}
                      >
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </Text>
                      <Box style={{ textAlign: 'right' }}>
                        <Text className="text-xs md:text-sm" c="dimmed">Balance: {formatCurrency(txn.balanceAfter)}</Text>
                        <Text className="text-xs md:text-sm" c="dimmed">{formatDateTime(txn.createdAt)}</Text>
                      </Box>
                    </Group>
                    <Text className="text-xs md:text-sm" c="dimmed" mt="xs">By {txn.createdBy}</Text>
                  </Card>
                ))
              )}
            </Stack>

            {/* Desktop: Table View */}
            <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} pos="relative">
              <LoadingOverlay visible={transactionsLoading} overlayProps={{ blur: 2 }} />
              <Table.ScrollContainer minWidth={1000}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Balance After</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>By</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {transactions.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">No transactions found</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      transactions.map((txn) => (
                        <Table.Tr key={txn.id}>
                          <Table.Td>
                            <Text fw={600} className="text-sm md:text-base">{txn.customerName}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={txn.type === 'credit' ? 'green' : 'red'}
                              variant="light"
                              className="text-sm md:text-base"
                            >
                              {txn.type === 'credit' ? 'Credit' : 'Debit'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{txn.description}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              fw={700}
                              className="text-sm md:text-base"
                              c={txn.type === 'credit' ? 'green' : 'red'}
                            >
                              {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} className="text-sm md:text-base">{formatCurrency(txn.balanceAfter)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{formatDateTime(txn.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text className="text-sm md:text-base">{txn.createdBy}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          </>
        )}
      </Stack>
    </Box>
  )
}
