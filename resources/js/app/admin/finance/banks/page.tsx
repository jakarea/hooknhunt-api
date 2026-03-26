import { useState, useEffect, useMemo, useCallback } from 'react'
import { Title, Text, Stack, Paper, Group, Badge, Button, Card, SimpleGrid, TextInput, SegmentedControl, ActionIcon, Menu, Modal, NumberInput, Select, Textarea, ThemeIcon, LoadingOverlay } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconPlus, IconSearch, IconDotsVertical, IconArrowUpRight, IconArrowDownLeft, IconArrowsExchange, IconEdit, IconTrash, IconBuildingBank, IconWallet, IconBrandCashapp, IconPhone, IconRocket, IconEye, IconRefresh } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { getBanks, deleteBank, getBanksSummary, createDeposit, createWithdrawal, createTransfer, getAccounts, type BankAccount, type BankSummary } from '@/utils/api'
import { usePermissions } from '@/hooks/usePermissions'
import { useFinanceStore } from '@/stores/financeStore'

export default function BanksPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Permission check - user needs finance banks view permission
  if (!hasPermission('finance_banks_view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view Bank Accounts.</Text>
        </Paper>
      </Stack>
    )
  }

  // Zustand store for finance state
  const addRecentBank = useFinanceStore((state) => state.addRecentBank)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [depositOpened, { open: openDeposit, close: closeDeposit }] = useDisclosure(false)
  const [withdrawOpened, { open: openWithdraw, close: closeWithdraw }] = useDisclosure(false)
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false)
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null)

  // API states
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [summary, setSummary] = useState<BankSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states for modals
  const [depositAmount, setDepositAmount] = useState<number | ''>('')
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('')
  const [withdrawAccountId, setWithdrawAccountId] = useState<string | null>(null)
  const [transferAmount, setTransferAmount] = useState<number | ''>('')
  const [selectedTransferBank, setSelectedTransferBank] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([])

  // Fetch banks and summary
  const fetchBanks = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Fetch banks and summary in parallel
      const [banksData, summaryData] = await Promise.all([
        getBanks({ search, type: typeFilter as any, status: 'active' }),
        getBanksSummary()
      ])


      setBanks(banksData.data || [])
      setSummary(summaryData.data || summaryData)
    } catch (err: any) {
      console.error('Error fetching banks:', err)
      setError(err.message || 'Failed to load banks')
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to load banks',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchBanks()
    fetchChartOfAccounts()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchBanks()
    }
  }, [search, typeFilter])

  // Track recently viewed banks (when page first loads)
  useEffect(() => {
    if (banks.length > 0 && !loading) {
      // Add first 5 banks to recent items
      banks.slice(0, 5).forEach(bank => {
        addRecentBank({
          id: bank.id,
          name: bank.name,
          type: bank.type,
          viewedAt: new Date().toISOString()
        })
      })
    }
  }, [banks, loading, addRecentBank])

  // Fetch chart of accounts
  const fetchChartOfAccounts = useCallback(async () => {
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

      const expenseAccounts = accounts.filter((acc: any) =>
        acc.type === 'expense' && acc.isActive !== false
      )
      setChartOfAccounts(expenseAccounts)
    } catch (err) {
      console.error('Error fetching chart of accounts:', err)
    }
  }, [])

  // Type icons and colors
  const getTypeConfig = useCallback((t: (key: string) => string, type: string) => ({
    cash: { icon: <IconWallet size={24} />, color: 'green', label: t('finance.banksPage.filterCash') },
    bank: { icon: <IconBuildingBank size={24} />, color: 'blue', label: t('finance.banksPage.filterBank') },
    bkash: { icon: <IconPhone size={24} />, color: 'pink', label: t('finance.banksPage.filterBkash') },
    nagad: { icon: <IconBrandCashapp size={24} />, color: 'orange', label: t('finance.banksPage.filterNagad') },
    rocket: { icon: <IconRocket size={24} />, color: 'grape', label: t('finance.banksPage.filterRocket') },
    other: { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' }
  })[type] || { icon: <IconBuildingBank size={24} />, color: 'gray', label: 'Other' }, [])

  // Format currency
  const formatCurrency = useCallback((amount: number | null | undefined) => {
    if (amount === null || amount === undefined) {
      return '৳0.00'
    }
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [])

  // Filter banks (client-side filtering as backup) - memoized for performance
  const filteredBanks = useMemo(() => {
    return banks.filter((bank) => {
      const matchesSearch = bank.name.toLowerCase().includes(search.toLowerCase()) ||
        bank.accountNumber?.toLowerCase().includes(search.toLowerCase()) ||
        bank.notes?.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || bank.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [banks, search, typeFilter])

  // Handle delete with confirmation
  const handleDelete = async (bank: BankAccount) => {
    modals.openConfirmModal({
      title: t('finance.banksPage.deleteConfirm.title'),
      children: (
        <Stack gap="xs">
          <Text className="text-sm md:text-base">
            {t('finance.banksPage.deleteConfirm.message')}{' '}
            <Text span fw={600} c="blue">
              "{bank.name}"
            </Text>
            ?
          </Text>
          {(bank.currentBalance || 0) > 0 && (
            <Text className="text-sm md:text-base" c="yellow">
              ⚠️ {t('finance.banksPage.deleteConfirm.hasBalance')}: {formatCurrency(bank.currentBalance || 0)}
            </Text>
          )}
          <Text className="text-xs md:text-sm" c="dimmed">
            {t('finance.banksPage.deleteConfirm.warning')}
          </Text>
        </Stack>
      ),
      labels: {
        confirm: t('finance.banksPage.deleteConfirm.confirm'),
        cancel: t('finance.banksPage.deleteConfirm.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteBank(bank.id)
          notifications.show({
            title: t('finance.banksPage.notification.deleteSuccess'),
            message: t('finance.banksPage.notification.deleteSuccessMessage', { name: bank.name }),
            color: 'green',
          })
          // Refresh the list
          fetchBanks()
        } catch (err: any) {
          notifications.show({
            title: 'Error',
            message: err.message || 'Failed to delete bank',
            color: 'red',
          })
        }
      },
    })
  }

  // Handle quick actions
  const handleDeposit = (bank: BankAccount) => {
    setSelectedBank(bank)
    openDeposit()
  }

  const handleWithdraw = (bank: BankAccount) => {
    setSelectedBank(bank)
    openWithdraw()
  }

  const handleTransfer = (bank: BankAccount) => {
    setSelectedBank(bank)
    openTransfer()
  }

  const handleDepositSubmit = async () => {
    if (!depositAmount || depositAmount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid amount',
        color: 'red',
      })
      return
    }

    if (!selectedBank) return

    try {
      await createDeposit(selectedBank.id, {
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
      fetchBanks()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process deposit',
        color: 'red',
      })
    }
  }

  const handleWithdrawSubmit = async () => {
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

    if (!selectedBank || withdrawAmount > selectedBank.currentBalance) {
      notifications.show({
        title: 'Error',
        message: 'Insufficient balance',
        color: 'red',
      })
      return
    }

    try {
      await createWithdrawal(selectedBank.id, {
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
      fetchBanks()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process withdrawal',
        color: 'red',
      })
    }
  }

  const handleTransferSubmit = async () => {
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

    if (!selectedBank || transferAmount > selectedBank.currentBalance) {
      notifications.show({
        title: 'Error',
        message: 'Insufficient balance',
        color: 'red',
      })
      return
    }

    try {
      await createTransfer(selectedBank.id, {
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
      fetchBanks()
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to process transfer',
        color: 'red',
      })
    }
  }

  if (loading) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm">
          <LoadingOverlay visible={loading} />
          <div style={{ height: '400px' }} />
        </Paper>
      </Stack>
    )
  }

  if (error && banks.length === 0) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Text c="red">{error}</Text>
          <Button onClick={() => fetchBanks()} mt="md">Retry</Button>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack p="xl">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <Title order={1}>{t('finance.banksPage.title')}</Title>
            <ActionIcon
              variant="light"
              className="text-lg md:text-xl lg:text-2xl"
              onClick={() => fetchBanks(true)}
              loading={refreshing}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
          <Text c="dimmed">{t('finance.banksPage.subtitle')}</Text>
        </div>
        <Button
          component={Link}
          to="/finance/banks/create"
          leftSection={<IconPlus size={16} />}
        >
          {t('finance.banksPage.addAccount')}
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md" shadow="sm">
        <Group justify="space-between">
          <TextInput
            placeholder={t('finance.banksPage.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={300}
          />
          <SegmentedControl
            value={typeFilter}
            onChange={setTypeFilter}
            data={[
              { label: t('finance.banksPage.filterAll'), value: 'all' },
              { label: t('finance.banksPage.filterCash'), value: 'cash' },
              { label: t('finance.banksPage.filterBank'), value: 'bank' },
              { label: t('finance.banksPage.filterBkash'), value: 'bkash' },
              { label: t('finance.banksPage.filterNagad'), value: 'nagad' },
              { label: t('finance.banksPage.filterRocket'), value: 'rocket' }
            ]}
          />
        </Group>
      </Paper>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <ThemeIcon color="green" className="text-lg md:text-xl lg:text-2xl" variant="light">
              <IconWallet size={20} />
            </ThemeIcon>
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.filterCash')}</Text>
              <Text fw={700}>{formatCurrency(summary?.byType?.cash?.totalBalance || 0)}</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <ThemeIcon color="blue" className="text-lg md:text-xl lg:text-2xl" variant="light">
              <IconBuildingBank size={20} />
            </ThemeIcon>
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.filterBank')}</Text>
              <Text fw={700}>{formatCurrency(summary?.byType?.bank?.totalBalance || 0)}</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <ThemeIcon color="pink" className="text-lg md:text-xl lg:text-2xl" variant="light">
              <IconPhone size={20} />
            </ThemeIcon>
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.filterBkash')}</Text>
              <Text fw={700}>{formatCurrency(summary?.byType?.bkash?.totalBalance || 0)}</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <ThemeIcon color="orange" className="text-lg md:text-xl lg:text-2xl" variant="light">
              <IconBrandCashapp size={20} />
            </ThemeIcon>
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.filterNagad')}</Text>
              <Text fw={700}>{formatCurrency(summary?.byType?.nagad?.totalBalance || 0)}</Text>
            </div>
          </Group>
        </Card>
        <Card withBorder p="md" shadow="sm">
          <Group gap="xs">
            <ThemeIcon color="grape" className="text-lg md:text-xl lg:text-2xl" variant="light">
              <IconRocket size={20} />
            </ThemeIcon>
            <div>
              <Text className="text-xs md:text-sm" c="dimmed">{t('finance.banksPage.filterRocket')}</Text>
              <Text fw={700}>{formatCurrency(summary?.byType?.rocket?.totalBalance || 0)}</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Bank Cards Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {filteredBanks.map((bank) => {
          const config = getTypeConfig(t, bank.type)
          return (
            <Card key={bank.id} withBorder shadow="sm" padding="lg" radius="md">
              {/* Card Header */}
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <ThemeIcon color={config.color} className="text-xl md:text-2xl lg:text-3xl" variant="light" radius="md">
                    {config.icon}
                  </ThemeIcon>
                  <div>
                    <Text fw={600}>{bank.name}</Text>
                    <Badge color={config.color} variant="light" className="text-sm md:text-base">
                      {config.label}
                    </Badge>
                  </div>
                </Group>
                <Group gap="xs">
                  <Badge color={bank.status === 'active' ? 'green' : 'gray'} variant="dot">
                    {bank.status === 'active' ? t('finance.banksPage.active') : t('finance.banksPage.inactive')}
                  </Badge>
                  <Menu shadow="md" width={150} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="lg">
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        component={Link}
                        to={`/finance/banks/${bank.id}`}
                      >
                        {t('finance.banksPage.viewDetails')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        component={Link}
                        to={`/finance/banks/${bank.id}/edit`}
                      >
                        {t('finance.banksPage.edit')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDelete(bank)}
                      >
                        {t('finance.banksPage.delete')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>

              {/* Account Info */}
              <Stack gap="xs" mb="md">
                {bank.account_number && (
                  <Group justify="space-between">
                    <Text className="text-sm md:text-base" c="dimmed">{t('finance.banksPage.accountNo')}</Text>
                    <Text className="text-sm md:text-base" fw={500}>{bank.account_number}</Text>
                  </Group>
                )}
                {bank.branch && (
                  <Group justify="space-between">
                    <Text className="text-sm md:text-base" c="dimmed">{t('finance.banksPage.branch')}</Text>
                    <Text className="text-sm md:text-base" fw={500}>{bank.branch}</Text>
                  </Group>
                )}
                <Group justify="space-between">
                  <Text className="text-sm md:text-base" c="dimmed">{t('finance.banksPage.balance')}</Text>
                  <Text className="text-lg md:text-xl lg:text-2xl" fw={700} c={config.color}>
                    {formatCurrency(bank.currentBalance || 0)}
                  </Text>
                </Group>
              </Stack>

              {/* Quick Actions */}
              <Group grow>
                <Button
                  variant="light"
                  color="green"
                  className="text-xs md:text-sm"
                  leftSection={<IconArrowDownLeft size={14} />}
                  onClick={() => handleDeposit(bank)}
                >
                  {t('finance.banksPage.deposit')}
                </Button>
                <Button
                  variant="light"
                  color="red"
                  className="text-xs md:text-sm"
                  leftSection={<IconArrowUpRight size={14} />}
                  onClick={() => handleWithdraw(bank)}
                >
                  {t('finance.banksPage.withdraw')}
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  className="text-xs md:text-sm"
                  leftSection={<IconArrowsExchange size={14} />}
                  onClick={() => handleTransfer(bank)}
                >
                  {t('finance.banksPage.transfer')}
                </Button>
              </Group>
            </Card>
          )
        })}
      </SimpleGrid>

      {/* Empty State */}
      {filteredBanks.length === 0 && !loading && (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">{t('finance.banksPage.noAccountsFound')}</Text>
        </Paper>
      )}

      {/* Deposit Modal */}
      <Modal opened={depositOpened} onClose={closeDeposit} title={t('finance.banksPage.depositModal.title')} centered>
        <Stack>
          <TextInput
            label={t('finance.banksPage.depositModal.account')}
            value={selectedBank?.name || ''}
            disabled
          />
          <NumberInput
            label={t('finance.banksPage.depositModal.amount')}
            placeholder={t('finance.banksPage.depositModal.amountPlaceholder')}
            prefix="৳"
            thousandSeparator=","
            min={0}
            value={depositAmount}
            onChange={(value) => setDepositAmount(value)}
          />
          <Textarea
            label={t('finance.banksPage.depositModal.description')}
            placeholder={t('finance.banksPage.depositModal.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDeposit}>{t('finance.banksPage.depositModal.cancel')}</Button>
            <Button color="green" onClick={handleDepositSubmit}>{t('finance.banksPage.depositModal.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Withdraw Modal */}
      <Modal opened={withdrawOpened} onClose={closeWithdraw} title={t('finance.banksPage.withdrawModal.title')} centered>
        <Stack>
          <TextInput
            label={t('finance.banksPage.depositModal.account')}
            value={selectedBank?.name || ''}
            disabled
          />
          <Text className="text-sm md:text-base" c="dimmed">
            {t('finance.banksPage.withdrawModal.availableBalance')} {selectedBank ? formatCurrency(selectedBank.currentBalance) : '৳0.00'}
          </Text>
          <NumberInput
            label={t('finance.banksPage.withdrawModal.amount')}
            placeholder={t('finance.banksPage.withdrawModal.amountPlaceholder')}
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
            label={t('finance.banksPage.withdrawModal.description')}
            placeholder={t('finance.banksPage.withdrawModal.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeWithdraw}>{t('finance.banksPage.withdrawModal.cancel')}</Button>
            <Button color="red" onClick={handleWithdrawSubmit}>{t('finance.banksPage.withdrawModal.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Modal */}
      <Modal opened={transferOpened} onClose={closeTransfer} title={t('finance.banksPage.transferModal.title')} centered>
        <Stack>
          <TextInput
            label={t('finance.banksPage.transferModal.fromAccount')}
            value={selectedBank?.name || ''}
            disabled
          />
          <Text className="text-sm md:text-base" c="dimmed">
            {t('finance.banksPage.withdrawModal.availableBalance')} {selectedBank ? formatCurrency(selectedBank.currentBalance) : '৳0.00'}
          </Text>
          <Select
            label={t('finance.banksPage.transferModal.toAccount')}
            placeholder={t('finance.banksPage.transferModal.toAccountPlaceholder')}
            data={banks
              .filter((b) => b.id !== selectedBank?.id)
              .map((b) => ({ value: b.id.toString(), label: b.name }))}
            value={selectedTransferBank}
            onChange={setSelectedTransferBank}
          />
          <NumberInput
            label={t('finance.banksPage.depositModal.amount')}
            placeholder={t('finance.banksPage.depositModal.amountPlaceholder')}
            prefix="৳"
            thousandSeparator=","
            min={0}
            value={transferAmount}
            onChange={(value) => setTransferAmount(value)}
          />
          <Textarea
            label={t('finance.banksPage.depositModal.description')}
            placeholder={t('finance.banksPage.depositModal.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeTransfer}>{t('finance.banksPage.depositModal.cancel')}</Button>
            <Button color="blue" onClick={handleTransferSubmit}>{t('finance.banksPage.transferModal.confirm')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
