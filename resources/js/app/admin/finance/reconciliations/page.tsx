import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Group,
  Paper,
  Table,
  Text,
  Title,
  Button,
  Badge,
  Stack,
  Select,
  TextInput,
  NumberInput,
  Modal,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Container,
  SimpleGrid,
  Card,
  Flex,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { IconRefresh, IconCheck, IconX, IconEye, IconPencil, IconTrash, IconPlus, IconScale } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { getBankAccountReconciliations, getBankAccounts, createBankAccountReconciliation, updateBankAccountReconciliation, deleteBankAccountReconciliation, reconcileBankAccount, resetBankAccountReconciliation, getBookBalance, type BankAccountReconciliation, type BankAccountAccount } from '@/utils/api'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'

type ReconciliationFormData = {
  bankId: string | number
  statementDate: Date | null
  statementNumber?: string
  openingBalance: string | number
  closingBalance: string | number
  depositsInTransit: string | number
  outstandingChecks: string | number
  bankCharges: string | number
  interestEarned: string | number
  otherAdjustments: string | number
  notes?: string
}

export default function BankAccountReconciliationsPage() {
  const { t } = useTranslation()
  const [reconciliations, setReconciliations] = useState<BankAccountReconciliation[]>([])
  const [banks, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [filterBankAccount, setFilterBankAccount] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [autoBookBalance, setAutoBookBalance] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)

  const form = useForm<ReconciliationFormData>({
    initialValues: {
      bankId: '',
      statementDate: null,
      statementNumber: '',
      openingBalance: '',
      closingBalance: '',
      depositsInTransit: 0,
      outstandingChecks: 0,
      bankCharges: 0,
      interestEarned: 0,
      otherAdjustments: 0,
      notes: '',
    },
    validate: {
      bankId: (value) => (!value ? 'BankAccount is required' : null),
      statementDate: (value) => (!value ? 'Statement date is required' : null),
      openingBalance: (value) => (value === '' ? 'Opening balance is required' : null),
      closingBalance: (value) => (value === '' ? 'Closing balance is required' : null),
    },
  })

  const fetchReconciliations = useCallback(async () => {
    try {
      setLoading(true)
      const filters: Record<string, any> = {}
      if (filterBankAccount) filters.bank_id = parseInt(filterBankAccount)
      if (filterStatus !== null) filters.is_reconciled = filterStatus === 'reconciled'

      const response = await getBankAccountReconciliations(filters)
      let data: BankAccountReconciliation[] = []

      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data
        } else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data) {
          data = response.data.data as any[]
        }
      }

      setReconciliations(data)
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load reconciliations', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [filterBankAccount, filterStatus])

  const fetchBankAccounts = async () => {
    try {
      const response = await getBankAccounts()
      let data: BankAccount[] = []

      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data
        } else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data) {
          data = response.data.data as any[]
        }
      }

      setBankAccounts(data)
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load banks', color: 'red' })
    }
  }

  useEffect(() => {
    fetchReconciliations()
    fetchBankAccounts()
  }, [fetchReconciliations])

  const loadBookBalance = async (bankId: number) => {
    try {
      setCalculating(true)
      const response = await getBookBalance(bankId)
      let balance = 0

      if (response && typeof response === 'object') {
        if ('data' in response && response.data) {
          balance = response.data.book_balance || 0
        } else if ('book_balance' in response) {
          balance = response.book_balance || 0
        }
      }

      setAutoBookBalance(balance)
    } catch (error) {
      console.error('Failed to load book balance:', error)
    } finally {
      setCalculating(false)
    }
  }

  const handleBankAccountChange = async (value: string | null) => {
    if (value) {
      form.setFieldValue('bankId', parseInt(value))
      await loadBookBalance(parseInt(value))
    }
  }

  const calculateTotals = () => {
    const opening = parseFloat(form.values.openingBalance as string) || 0
    const closing = parseFloat(form.values.closingBalance as string) || 0
    const deposits = parseFloat(form.values.depositsInTransit as string) || 0
    const checks = parseFloat(form.values.outstandingChecks as string) || 0
    const charges = parseFloat(form.values.bankCharges as string) || 0
    const interest = parseFloat(form.values.interestEarned as string) || 0
    const other = parseFloat(form.values.otherAdjustments as string) || 0

    const adjustedBalance = autoBookBalance + deposits - checks - charges + interest + other
    const difference = adjustedBalance - closing

    return { opening, closing, adjustedBalance, difference, bookBalance: autoBookBalance }
  }

  const handleSubmit = async (values: ReconciliationFormData) => {
    try {
      const { opening, closing, adjustedBalance, difference } = calculateTotals()

      const payload = {
        bank_id: parseInt(values.bankId as string),
        statement_date: values.statementDate ? new Date(values.statementDate).toISOString().split('T')[0] : undefined,
        statement_number: values.statementNumber,
        opening_balance: opening,
        closing_balance: closing,
        deposits_in_transit: parseFloat(values.depositsInTransit as string) || 0,
        outstanding_checks: parseFloat(values.outstandingChecks as string) || 0,
        bank_charges: parseFloat(values.bankCharges as string) || 0,
        interest_earned: parseFloat(values.interestEarned as string) || 0,
        other_adjustments: parseFloat(values.otherAdjustments as string) || 0,
        notes: values.notes,
      }

      if (editId) {
        await updateBankAccountReconciliation(editId, payload)
        notifications.show({ title: 'Success', message: 'Reconciliation updated successfully', color: 'green' })
      } else {
        await createBankAccountReconciliation(payload)
        notifications.show({ title: 'Success', message: 'Reconciliation created successfully', color: 'green' })
      }

      setModalOpened(false)
      form.reset()
      setEditId(null)
      fetchReconciliations()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save reconciliation',
        color: 'red',
      })
    }
  }

  const openCreateModal = () => {
    setEditId(null)
    form.reset()
    setAutoBookBalance(0)
    setModalOpened(true)
  }

  const openEditModal = (reconciliation: BankAccountReconciliation) => {
    setEditId(reconciliation.id)
    form.setValues({
      bankId: reconciliation.bankId,
      statementDate: new Date(reconciliation.statementDate),
      statementNumber: reconciliation.statementNumber || '',
      openingBalance: reconciliation.openingBalance,
      closingBalance: reconciliation.closingBalance,
      depositsInTransit: reconciliation.depositsInTransit,
      outstandingChecks: reconciliation.outstandingChecks,
      bankCharges: reconciliation.bankCharges,
      interestEarned: reconciliation.interestEarned,
      otherAdjustments: reconciliation.otherAdjustments,
      notes: reconciliation.notes || '',
    })
    setAutoBookBalance(reconciliation.bookBalance)
    setModalOpened(true)
  }

  const handleReconcile = async (id: number) => {
    try {
      await reconcileBankAccount(id)
      notifications.show({ title: 'Success', message: 'BankAccount reconciled successfully', color: 'green' })
      fetchReconciliations()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to reconcile',
        color: 'red',
      })
    }
  }

  const handleReset = async (id: number) => {
    try {
      await resetBankAccountReconciliation(id)
      notifications.show({ title: 'Success', message: 'Reconciliation reset successfully', color: 'green' })
      fetchReconciliations()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to reset',
        color: 'red',
      })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: 'Delete Reconciliation',
      children: <Text size="sm">Are you sure you want to delete this reconciliation? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteBankAccountReconciliation(id)
          notifications.show({ title: 'Success', message: 'Reconciliation deleted successfully', color: 'green' })
          fetchReconciliations()
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: error.response?.data?.message || 'Failed to delete',
            color: 'red',
          })
        }
      },
    })
  }

  const totals = calculateTotals()
  const isBalanced = Math.abs(totals.difference) < 0.01

  // Calculate summary stats
  const totalReconciliations = reconciliations.length
  const reconciledCount = reconciliations.filter((r) => r.isReconciled).length
  const pendingCount = totalReconciliations - reconciledCount
  const totalDifference = reconciliations.reduce((sum, r) => sum + Math.abs(r.difference), 0)

  const viewingReconciliation = reconciliations.find((r) => r.id === viewingId)

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Group>
            <IconScale size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <div>
              <Title order={2}>BankAccount Reconciliation Statement</Title>
              <Text c="dimmed" size="sm">Compare book balance with bank statement</Text>
            </div>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            New Reconciliation
          </Button>
        </Flex>

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Card padding="lg" radius="md" withBorder>
            <Text c="dimmed" size="sm" fw={500}>
              Total Statements
            </Text>
            <Text size="xl" fw={700} mt={5}>
              {totalReconciliations}
            </Text>
          </Card>
          <Card padding="lg" radius="md" withBorder>
            <Text c="dimmed" size="sm" fw={500}>
              Reconciled
            </Text>
            <Text size="xl" fw={700} mt={5} c="green">
              {reconciledCount}
            </Text>
          </Card>
          <Card padding="lg" radius="md" withBorder>
            <Text c="dimmed" size="sm" fw={500}>
              Pending
            </Text>
            <Text size="xl" fw={700} mt={5} c="orange">
              {pendingCount}
            </Text>
          </Card>
          <Card padding="lg" radius="md" withBorder>
            <Text c="dimmed" size="sm" fw={500}>
              Total Difference
            </Text>
            <Text size="xl" fw={700} mt={5} c={totalDifference > 0 ? 'red' : 'green'}>
              {totalDifference.toFixed(2)}৳
            </Text>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Group>
            <Select
              placeholder="Filter by BankAccount"
              clearable
              data={banks.map((b) => ({ value: b.id.toString(), label: b.name }))}
              value={filterBankAccount}
              onChange={setFilterBankAccount}
              w={200}
            />
            <Select
              placeholder="Filter by Status"
              clearable
              data={[
                { value: 'reconciled', label: 'Reconciled' },
                { value: 'pending', label: 'Pending' },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              w={150}
            />
            <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchReconciliations}>
              Refresh
            </Button>
          </Group>
        </Paper>

        {/* Reconciliations Table */}
        <Paper p="0" withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>BankAccount</Table.Th>
                  <Table.Th>Book Balance</Table.Th>
                  <Table.Th>Statement Balance</Table.Th>
                  <Table.Th>Adjusted Balance</Table.Th>
                  <Table.Th>Difference</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} ta="center">
                      <Text c="dimmed">Loading...</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : reconciliations.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} ta="center">
                      <Text c="dimmed">No reconciliations found</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  reconciliations.map((reconciliation) => (
                    <Table.Tr key={reconciliation.id}>
                      <Table.Td>
                        <Text size="sm">{new Date(reconciliation.statementDate).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {reconciliation.bank?.name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right">{reconciliation.bookBalance.toFixed(2)}৳</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right">{reconciliation.closingBalance.toFixed(2)}৳</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right">{reconciliation.adjustedBalance.toFixed(2)}৳</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          ta="right"
                          fw={500}
                          c={Math.abs(reconciliation.difference) < 0.01 ? 'green' : 'red'}
                        >
                          {reconciliation.difference.toFixed(2)}৳
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {reconciliation.isReconciled ? (
                          <Badge color="green" leftSection={<IconCheck size={12} />}>
                            Reconciled
                          </Badge>
                        ) : Math.abs(reconciliation.difference) < 0.01 ? (
                          <Badge color="lime">Balanced</Badge>
                        ) : (
                          <Badge color="orange">Pending</Badge>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center">
                          <Tooltip label="View Details">
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="blue"
                              onClick={() => setViewingId(reconciliation.id)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {!reconciliation.isReconciled && (
                            <>
                              <Tooltip label="Edit">
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  color="orange"
                                  onClick={() => openEditModal(reconciliation)}
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>
                              </Tooltip>
                              {Math.abs(reconciliation.difference) < 0.01 && (
                                <Tooltip label="Reconcile">
                                  <ActionIcon
                                    size="sm"
                                    variant="light"
                                    color="green"
                                    onClick={() => handleReconcile(reconciliation.id)}
                                  >
                                    <IconCheck size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </>
                          )}
                          {reconciliation.isReconciled && (
                            <Tooltip label="Reset">
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="yellow"
                                onClick={() => handleReset(reconciliation.id)}
                              >
                                <IconRefresh size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Delete">
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="red"
                              onClick={() => handleDelete(reconciliation.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>

        {/* Create/Edit Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title={editId ? 'Edit Reconciliation' : 'New Reconciliation'}
          size="lg"
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Select
                label="BankAccount"
                placeholder="Select bank"
                data={banks.map((b) => ({ value: b.id.toString(), label: b.name }))}
                required
                {...form.getInputProps('bankId')}
                onChange={(value) => handleBankAccountChange(value)}
              />

              <Group grow>
                <DatePicker
                  label="Statement Date"
                  placeholder="Pick date"
                  required
                  {...form.getInputProps('statementDate')}
                />
                <TextInput label="Statement Number" placeholder="Optional" {...form.getInputProps('statementNumber')} />
              </Group>

              {calculating ? (
                <Text size="sm" c="dimmed">
                  Loading book balance...
                </Text>
              ) : (
                <Box>
                  <Text size="sm" fw={500}>
                    Book Balance (System)
                  </Text>
                  <Text size="lg" c="blue">
                    {autoBookBalance.toFixed(2)}৳
                  </Text>
                </Box>
              )}

              <Group grow>
                <NumberInput label="Opening Balance" placeholder="0.00" required prefix="৳" decimalScale={2} {...form.getInputProps('openingBalance')} />
                <NumberInput label="Closing Balance" placeholder="0.00" required prefix="৳" decimalScale={2} {...form.getInputProps('closingBalance')} />
              </Group>

              <Paper withBorder p="md" radius="md">
                <Text fw={500} mb="sm">
                  Adjustments
                </Text>
                <Stack gap="xs">
                  <Group grow>
                    <NumberInput label="Deposits in Transit" placeholder="0.00" prefix="৳" decimalScale={2} {...form.getInputProps('depositsInTransit')} />
                    <NumberInput label="Outstanding Checks" placeholder="0.00" prefix="৳" decimalScale={2} {...form.getInputProps('outstandingChecks')} />
                  </Group>
                  <Group grow>
                    <NumberInput label="BankAccount Charges" placeholder="0.00" prefix="৳" decimalScale={2} {...form.getInputProps('bankCharges')} />
                    <NumberInput label="Interest Earned" placeholder="0.00" prefix="৳" decimalScale={2} {...form.getInputProps('interestEarned')} />
                  </Group>
                  <NumberInput label="Other Adjustments" placeholder="0.00" prefix="৳" decimalScale={2} {...form.getInputProps('otherAdjustments')} />
                </Stack>
              </Paper>

              <Paper withBorder p="md" radius="md" bg={isBalanced ? 'rgba(139, 195, 74, 0.1)' : 'rgba(255, 152, 0, 0.1)'}>
                <Group grow>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Adjusted Balance
                    </Text>
                    <Text size="xl" fw={700}>
                      {totals.adjustedBalance.toFixed(2)}৳
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Difference
                    </Text>
                    <Text size="xl" fw={700} c={isBalanced ? 'green' : 'red'}>
                      {totals.difference.toFixed(2)}৳
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Status
                    </Text>
                    <Badge size="lg" color={isBalanced ? 'green' : 'red'}>
                      {isBalanced ? 'Balanced' : 'Not Balanced'}
                    </Badge>
                  </Box>
                </Group>
              </Paper>

              <TextInput label="Notes" placeholder="Optional notes" {...form.getInputProps('notes')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setModalOpened(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isBalanced}>
                  {editId ? 'Update' : 'Create'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* View Details Modal */}
        <Modal opened={!!viewingId} onClose={() => setViewingId(null)} title="Reconciliation Details" size="md">
          {viewingReconciliation && (
            <Stack>
              <Box>
                <Text size="sm" c="dimmed">
                  BankAccount
                </Text>
                <Text size="lg" fw={500}>
                  {viewingReconciliation.bank?.name}
                </Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">
                  Statement Date
                </Text>
                <Text size="lg">{new Date(viewingReconciliation.statementDate).toLocaleDateString()}</Text>
              </Box>
              <SimpleGrid cols={2}>
                <Box>
                  <Text size="sm" c="dimmed">
                    Opening Balance
                  </Text>
                  <Text size="md" fw={500}>
                    {viewingReconciliation.openingBalance.toFixed(2)}৳
                  </Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    Closing Balance
                  </Text>
                  <Text size="md" fw={500}>
                    {viewingReconciliation.closingBalance.toFixed(2)}৳
                  </Text>
                </Box>
              </SimpleGrid>
              <Box>
                <Text size="sm" c="dimmed">
                  Book Balance (System)
                </Text>
                <Text size="md" fw={500}>
                  {viewingReconciliation.bookBalance.toFixed(2)}৳
                </Text>
              </Box>
              <Paper withBorder p="sm" radius="md">
                <Text fw={500} mb="xs">
                  Adjustments
                </Text>
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="sm">Deposits in Transit</Text>
                    <Text size="sm">{viewingReconciliation.depositsInTransit.toFixed(2)}৳</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Outstanding Checks</Text>
                    <Text size="sm">{viewingReconciliation.outstandingChecks.toFixed(2)}৳</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">BankAccount Charges</Text>
                    <Text size="sm">{viewingReconciliation.bankCharges.toFixed(2)}৳</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Interest Earned</Text>
                    <Text size="sm">{viewingReconciliation.interestEarned.toFixed(2)}৳</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Other Adjustments</Text>
                    <Text size="sm">{viewingReconciliation.otherAdjustments.toFixed(2)}৳</Text>
                  </Group>
                </Stack>
              </Paper>
              <SimpleGrid cols={2}>
                <Box>
                  <Text size="sm" c="dimmed">
                    Adjusted Balance
                  </Text>
                  <Text size="lg" fw={700}>
                    {viewingReconciliation.adjustedBalance.toFixed(2)}৳
                  </Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    Difference
                  </Text>
                  <Text size="lg" fw={700} c={Math.abs(viewingReconciliation.difference) < 0.01 ? 'green' : 'red'}>
                    {viewingReconciliation.difference.toFixed(2)}৳
                  </Text>
                </Box>
              </SimpleGrid>
              {viewingReconciliation.notes && (
                <Box>
                  <Text size="sm" c="dimmed">
                    Notes
                  </Text>
                  <Text size="sm">{viewingReconciliation.notes}</Text>
                </Box>
              )}
              {viewingReconciliation.reconciledAt && (
                <Box>
                  <Text size="sm" c="dimmed">
                    Reconciled At
                  </Text>
                  <Text size="sm">{new Date(viewingReconciliation.reconciledAt).toLocaleString()}</Text>
                </Box>
              )}
            </Stack>
          )}
        </Modal>
      </Stack>
    </Box>
  )
}
