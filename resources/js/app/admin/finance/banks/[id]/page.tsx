import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Button,
  Badge,
  Card,
  SimpleGrid,
  Table,
  ActionIcon,
  LoadingOverlay,
  Alert,
  Modal,
  NumberInput,
  TextInput,
  Textarea,
  Select,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconEye,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrowsExchange,
  IconBuildingBank,
  IconWallet,
  IconPhone,
  IconBrandCashapp,
  IconRocket,
  IconRefresh,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getBank, deleteBank, getBanks, createDeposit, createWithdrawal, createTransfer, getAccounts, type BankAccount } from '@/utils/api'

interface BankDetail extends BankAccount {
  totalDeposits: number
  totalWithdrawals: number
  netFlow: number
  transactions?: Array<{
    id: number
    type: string
    amount: number
    balanceBefore: number
    balanceAfter: number
    description: string
    transactionDate: string
    createdAt: string
  }>
}

export default function BankDetailsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance banks view permission
  if (!hasPermission('finance_banks_view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Bank Account details.</Text>
          <Button
            component={Link}
            to="/finance/banks"
            leftSection={<IconArrowLeft size={16} />}
            mt="md"
          >
            Back to Banks
          </Button>
        </Paper>
      </Stack>
    )
  }
  const [bank, setBank] = useState<BankDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [depositOpened, { open: openDeposit, close: closeDeposit }] = useDisclosure(false)
  const [withdrawOpened, { open: openWithdraw, close: closeWithdraw }] = useDisclosure(false)
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false)

  // Form states
  const [depositAmount, setDepositAmount] = useState<number | ''>('')
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('')
  const [withdrawAccountId, setWithdrawAccountId] = useState<string | null>(null)
  const [transferAmount, setTransferAmount] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [selectedTransferBank, setSelectedTransferBank] = useState<string | null>(null)
  const [allBanks, setAllBanks] = useState<BankAccount[]>([])
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([])

  const fetchBankDetails = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const response = await getBank(parseInt(id))
      setBank(response.data as BankDetail)
    } catch (err: any) {
      console.error('Error fetching bank details:', err)
      setError(err.message || 'Failed to load bank details')
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to load bank details',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBankDetails()
    fetchAllBanks()
    fetchChartOfAccounts()
  }, [id])

  const fetchAllBanks = async () => {
    try {
      const response = await getBanks({ status: 'active' })
      setAllBanks(response.data || [])
    } catch (err) {
      console.error('Error fetching banks:', err)
    }
  }

  const fetchChartOfAccounts = async () => {
    try {
      const response = await getAccounts()

      let accounts: any[] = []

      // Handle paginated response structure
      if (response?.data) {
        if (Array.isArray(response.data)) {
          accounts = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          accounts = response.data.data
        }
      }

      // Filter for expense accounts only
      const expenseAccounts = accounts.filter((acc: any) =>
        acc.type === 'expense' && acc.isActive !== false
      )

      setChartOfAccounts(expenseAccounts)
    } catch (err) {
      console.error('Error fetching chart of accounts:', err)
    }
  }

  const handleDelete = async () => {
    if (!bank) return

    if (window.confirm('Are you sure you want to delete "' + bank.name + '"?')) {
      try {
        await deleteBank(bank.id)
        notifications.show({
          title: 'Success',
          message: 'Bank account deleted successfully',
          color: 'green',
        })
        window.location.href = '/finance/banks'
      } catch (err: any) {
        notifications.show({
          title: 'Error',
          message: err.message || 'Failed to delete bank account',
          color: 'red',
        })
      }
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || depositAmount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid amount',
        color: 'red',
      })
      return
    }

    if (!bank) return

    try {
      await createDeposit(bank.id, {
        amount: Number(depositAmount),
        transaction_date: new Date().toISOString().split('T')[0],
        description: description || undefined,
      })
      notifications.show({
        title: 'Success',
        message: `Deposit of ${formatCurrency(Number(depositAmount))} successful`,
        color: 'green',
      })
      setDepositAmount('')
      setDescription('')
      closeDeposit()
      fetchBankDetails()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process deposit',
        color: 'red',
      })
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid amount',
        color: 'red',
      })
      return
    }

    if (!withdrawAccountId) {
      notifications.show({
        title: 'Error',
        message: 'Please select an expense account',
        color: 'red',
      })
      return
    }

    if (!bank || withdrawAmount > bank.currentBalance) {
      notifications.show({
        title: 'Error',
        message: 'Insufficient balance',
        color: 'red',
      })
      return
    }

    try {
      await createWithdrawal(bank.id, {
        amount: Number(withdrawAmount),
        transaction_date: new Date().toISOString().split('T')[0],
        account_id: Number(withdrawAccountId),
        description: description || undefined,
      })
      notifications.show({
        title: 'Success',
        message: `Withdrawal of ${formatCurrency(Number(withdrawAmount))} successful`,
        color: 'green',
      })
      setWithdrawAmount('')
      setWithdrawAccountId(null)
      setDescription('')
      closeWithdraw()
      fetchBankDetails()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process withdrawal',
        color: 'red',
      })
    }
  }

  const handleTransfer = async () => {
    if (!transferAmount || transferAmount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid amount',
        color: 'red',
      })
      return
    }

    if (!selectedTransferBank) {
      notifications.show({
        title: 'Error',
        message: 'Please select a destination bank',
        color: 'red',
      })
      return
    }

    if (!bank || transferAmount > bank.currentBalance) {
      notifications.show({
        title: 'Error',
        message: 'Insufficient balance',
        color: 'red',
      })
      return
    }

    try {
      await createTransfer(bank.id, {
        to_bank_id: Number(selectedTransferBank),
        amount: Number(transferAmount),
        transaction_date: new Date().toISOString().split('T')[0],
        description: description || undefined,
      })
      notifications.show({
        title: 'Success',
        message: `Transfer of ${formatCurrency(Number(transferAmount))} successful`,
        color: 'green',
      })
      setTransferAmount('')
      setSelectedTransferBank(null)
      setDescription('')
      closeTransfer()
      fetchBankDetails()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process transfer',
        color: 'red',
      })
    }
  }

  const getTypeConfig = (type: string) => ({
    cash: { icon: <IconWallet size={24} />, color: 'green', label: 'Cash' },
    bank: { icon: <IconBuildingBank size={24} />, color: 'blue', label: 'Bank' },
    bkash: { icon: <IconPhone size={24} />, color: 'pink', label: 'bKash' },
    nagad: { icon: <IconBrandCashapp size={24} />, color: 'orange', label: 'Nagad' },
    rocket: { icon: <IconRocket size={24} />, color: 'grape', label: 'Rocket' },
    other: { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' },
  })[type] || { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) {
      return '৳0.00'
    }
    return '৳' + amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return 'green'
      case 'withdrawal':
      case 'transfer_out':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" pos="relative">
          <LoadingOverlay visible={loading} />
          <div className="h-96" />
        </Paper>
      </Stack>
    )
  }

  if (error || !bank) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Text c="red">{error || 'Bank not found'}</Text>
          <Button onClick={() => fetchBankDetails()} mt="md">Retry</Button>
        </Paper>
      </Stack>
    )
  }

  const config = getTypeConfig(bank.type)

  return (
    <Stack p="xl">
      <Group justify="space-between" align="flex-start">
        <Group gap="md">
          <Button
            component={Link}
            to="/finance/banks"
            variant="light"
            className="text-lg md:text-xl lg:text-2xl"
          >
            <IconArrowLeft size={16} />
          </Button>
          <div>
            <Group gap="xs" mb="xs">
              <Title order={1}>{bank.name}</Title>
              <ActionIcon
                variant="light"
                className="text-lg md:text-xl lg:text-2xl"
                onClick={fetchBankDetails}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Group>
            <Group gap="xs">
              <Badge color={config.color} variant="light" className="text-lg md:text-xl lg:text-2xl">
                {config.label}
              </Badge>
              <Badge color={bank.status === 'active' ? 'green' : 'gray'} variant="dot" className="text-lg md:text-xl lg:text-2xl">
                {bank.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </Group>
          </div>
        </Group>
        <Group gap="xs">
          <Button
            component={Link}
            to={"/finance/banks/" + bank.id + "/edit"}
            leftSection={<IconEdit size={16} />}
            variant="light"
          >
            Edit
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            color="red"
            variant="light"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md" shadow="sm">
          <Stack gap="xs">
            <Text className="text-sm md:text-base" c="dimmed">Current Balance</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c={config.color}>
              {formatCurrency(bank.currentBalance || 0)}
            </Text>
          </Stack>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Stack gap="xs">
            <Text className="text-sm md:text-base" c="dimmed">Total Deposits</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="green">
              {formatCurrency(bank.totalDeposits || 0)}
            </Text>
          </Stack>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Stack gap="xs">
            <Text className="text-sm md:text-base" c="dimmed">Total Withdrawals</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c="red">
              {formatCurrency(bank.totalWithdrawals || 0)}
            </Text>
          </Stack>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Stack gap="xs">
            <Text className="text-sm md:text-base" c="dimmed">Net Flow</Text>
            <Text className="text-xl md:text-2xl lg:text-3xl" fw={700} c={(bank.netFlow || 0) >= 0 ? 'green' : 'red'}>
              {formatCurrency(bank.netFlow || 0)}
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Paper withBorder p="xl" shadow="sm">
        <Title order={3} mb="md">Account Information</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Stack gap="md">
            <Group justify="space-between">
              <Text className="text-sm md:text-base" c="dimmed">Account Name</Text>
              <Text className="text-sm md:text-base" fw={500}>{bank.name}</Text>
            </Group>
            {bank.account_number && (
              <Group justify="space-between">
                <Text className="text-sm md:text-base" c="dimmed">Account Number</Text>
                <Text className="text-sm md:text-base" fw={500}>{bank.account_number}</Text>
              </Group>
            )}
            {bank.account_name && (
              <Group justify="space-between">
                <Text className="text-sm md:text-base" c="dimmed">Account Holder</Text>
                <Text className="text-sm md:text-base" fw={500}>{bank.account_name}</Text>
              </Group>
            )}
          </Stack>
          <Stack gap="md">
            {bank.branch && (
              <Group justify="space-between">
                <Text className="text-sm md:text-base" c="dimmed">Branch</Text>
                <Text className="text-sm md:text-base" fw={500}>{bank.branch}</Text>
              </Group>
            )}
            {bank.phone && (
              <Group justify="space-between">
                <Text className="text-sm md:text-base" c="dimmed">Phone</Text>
                <Text className="text-sm md:text-base" fw={500}>{bank.phone}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text className="text-sm md:text-base" c="dimmed">Status</Text>
              <Badge color={bank.status === 'active' ? 'green' : 'gray'} variant="dot">
                {bank.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </Group>
          </Stack>
        </SimpleGrid>
        {bank.notes && (
          <>
            <Title order={4} mt="md" mb="xs">Notes</Title>
            <Text className="text-sm md:text-base">{bank.notes}</Text>
          </>
        )}
      </Paper>

      <Paper withBorder p="xl" shadow="sm">
        <Title order={3} mb="md">Quick Actions</Title>
        <Group grow>
          <Button
            variant="light"
            color="green"
            className="text-base md:text-lg"
            leftSection={<IconArrowDownLeft size={16} />}
            onClick={openDeposit}
          >
            Deposit
          </Button>
          <Button
            variant="light"
            color="red"
            className="text-base md:text-lg"
            leftSection={<IconArrowUpRight size={16} />}
            onClick={openWithdraw}
          >
            Withdraw
          </Button>
          <Button
            variant="light"
            color="blue"
            className="text-base md:text-lg"
            leftSection={<IconArrowsExchange size={16} />}
            onClick={openTransfer}
          >
            Transfer
          </Button>
          <Button
            variant="light"
            className="text-base md:text-lg"
            leftSection={<IconEye size={16} />}
            component={Link}
            to="/finance/transactions"
          >
            All Transactions
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="xl" shadow="sm">
        <Group justify="space-between" mb="md">
          <Title order={3}>Recent Transactions</Title>
          <Button
            variant="light"
            className="text-sm md:text-base"
            component={Link}
            to="/finance/transactions"
          >
            View All
          </Button>
        </Group>

        {bank.transactions && bank.transactions.length > 0 ? (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Before</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>After</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bank.transactions.map((transaction) => (
                <Table.Tr key={transaction.id}>
                  <Table.Td>{formatDate(transaction.transactionDate)}</Table.Td>
                  <Table.Td>
                    <Badge color={getTransactionTypeColor(transaction.type)} variant="light">
                      {getTransactionTypeLabel(transaction.type)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{transaction.description}</Table.Td>
                  <Table.Td>{formatCurrency(transaction.balanceBefore || 0)}</Table.Td>
                  <Table.Td>
                    <Text
                      fw={700}
                      c={['deposit', 'transfer_in'].includes(transaction.type) ? 'green' : 'red'}
                    >
                      {['deposit', 'transfer_in'].includes(transaction.type) ? '+' : '-'}
                      {formatCurrency(transaction.amount || 0)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{formatCurrency(transaction.balanceAfter || 0)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Alert variant="light" color="blue">
            No transactions found for this account.
          </Alert>
        )}
      </Paper>

      {/* Deposit Modal */}
      <Modal opened={depositOpened} onClose={closeDeposit} title="Deposit Funds" centered>
        <Stack>
          <TextInput
            label="Account"
            value={bank?.name || ''}
            disabled
          />
          <NumberInput
            label="Amount"
            placeholder="Enter amount"
            prefix="৳"
            thousandSeparator=","
            min={0}
            value={depositAmount}
            onChange={(value) => setDepositAmount(value)}
          />
          <Textarea
            label="Description"
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDeposit}>Cancel</Button>
            <Button color="green" onClick={handleDeposit}>Confirm Deposit</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Withdraw Modal */}
      <Modal opened={withdrawOpened} onClose={closeWithdraw} title="Withdraw Funds" centered>
        <Stack>
          <TextInput
            label="Account"
            value={bank?.name || ''}
            disabled
          />
          <Text className="text-sm md:text-base" c="dimmed">
            Available Balance: {bank ? formatCurrency(bank.currentBalance) : '৳0.00'}
          </Text>
          <NumberInput
            label="Amount"
            placeholder="Enter amount"
            prefix="৳"
            thousandSeparator=","
            min={0}
            value={withdrawAmount}
            onChange={(value) => setWithdrawAmount(value)}
          />
          <Select
            label="Expense Account"
            placeholder={chartOfAccounts.length === 0 ? "No expense accounts available" : "Select expense account"}
            data={chartOfAccounts.map((acc) => ({
              value: acc.id.toString(),
              label: `${acc.code} - ${acc.name}`
            }))}
            value={withdrawAccountId}
            onChange={setWithdrawAccountId}
            searchable
            disabled={chartOfAccounts.length === 0}
          />
          {chartOfAccounts.length === 0 && (
            <Text className="text-xs md:text-sm" c="orange">
              No expense accounts found. Please create expense accounts in the Chart of Accounts first.
            </Text>
          )}
          <Textarea
            label="Description"
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeWithdraw}>Cancel</Button>
            <Button color="red" onClick={handleWithdraw}>Confirm Withdrawal</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Modal */}
      <Modal opened={transferOpened} onClose={closeTransfer} title="Transfer Funds" centered>
        <Stack>
          <TextInput
            label="From Account"
            value={bank?.name || ''}
            disabled
          />
          <Text className="text-sm md:text-base" c="dimmed">
            Available Balance: {bank ? formatCurrency(bank.currentBalance) : '৳0.00'}
          </Text>
          <Select
            label="To Account"
            placeholder="Select destination account"
            data={allBanks
              .filter((b) => b.id !== bank?.id)
              .map((b) => ({ value: b.id.toString(), label: b.name }))}
            value={selectedTransferBank}
            onChange={setSelectedTransferBank}
          />
          <NumberInput
            label="Amount"
            placeholder="Enter amount"
            prefix="৳"
            thousandSeparator=","
            min={0}
            value={transferAmount}
            onChange={(value) => setTransferAmount(value)}
          />
          <Textarea
            label="Description"
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeTransfer}>Cancel</Button>
            <Button color="blue" onClick={handleTransfer}>Confirm Transfer</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
