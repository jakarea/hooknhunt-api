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
  Alert,
  Textarea,
  NativeSelect,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { IconRefresh, IconEye, IconPencil, IconTrash, IconPlus, IconReceipt, IconCoin, IconCheck, IconFile, IconAlertTriangle, IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import {
  getVatTaxLedgers,
  getVatTaxLedger,
  createVatTaxLedger,
  updateVatTaxLedger,
  deleteVatTaxLedger,
  markVatTaxAsPaid,
  markVatTaxAsFiled,
  getVatTaxSummary,
  getVatTaxNetCalculation,
  type VatTaxLedger,
  type VatTaxSummary,
} from '@/utils/api'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'

type LedgerFormData = {
  transactionType: string
  taxType: string
  baseAmount: string | number
  taxRate: string | number
  taxAmount: string | number
  direction: string
  flowType: string
  transactionDate: Date | null
  chartAccountId: string | number
  fiscalYear: string
  taxPeriod: string
  challanNumber: string
  challanDate: Date | null
  description: string
  notes: string
}

const getTaxTypes = (t: any) => [
  { value: 'vat', label: t('finance.vatTaxPage.taxTypes.vat') },
  { value: 'tax', label: t('finance.vatTaxPage.taxTypes.tax') },
  { value: 'ait', label: t('finance.vatTaxPage.taxTypes.ait') },
]

const getTransactionTypes = (t: any) => [
  { value: 'purchase', label: t('finance.vatTaxPage.transactionTypes.purchase') },
  { value: 'sale', label: t('finance.vatTaxPage.transactionTypes.sale') },
  { value: 'expense', label: t('finance.vatTaxPage.transactionTypes.expense') },
  { value: 'adjustment', label: t('finance.vatTaxPage.transactionTypes.adjustment') },
]

const getDirections = (t: any) => [
  { value: 'input', label: t('finance.vatTaxPage.directions.input') },
  { value: 'output', label: t('finance.vatTaxPage.directions.output') },
]

const getFlowTypes = (t: any) => [
  { value: 'debit', label: t('finance.vatTaxPage.flowTypes.debit') },
  { value: 'credit', label: t('finance.vatTaxPage.flowTypes.credit') },
]

const getStatuses = (t: any) => [
  { value: 'pending', label: t('finance.vatTaxPage.statuses.pending') },
  { value: 'filed', label: t('finance.vatTaxPage.statuses.filed') },
  { value: 'paid', label: t('finance.vatTaxPage.statuses.paid') },
]

export default function VatTaxLedgerPage() {
  const { t } = useTranslation()
  const [ledgers, setLedgers] = useState<VatTaxLedger[]>([])
  const [summary, setSummary] = useState<VatTaxSummary | null>(null)
  const [netCalculation, setNetCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [paidModalOpened, setPaidModalOpened] = useState(false)
  const [filedModalOpened, setFiledModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<VatTaxLedger | null>(null)
  const [actionEntryId, setActionEntryId] = useState<number | null>(null)
  const [filterTaxType, setFilterTaxType] = useState<string | null>(null)
  const [filterDirection, setFilterDirection] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const form = useForm<LedgerFormData>({
    initialValues: {
      transactionType: 'expense',
      taxType: 'vat',
      baseAmount: '',
      taxRate: '',
      taxAmount: '',
      direction: 'input',
      flowType: 'credit',
      transactionDate: new Date(),
      chartAccountId: '',
      fiscalYear: '',
      taxPeriod: '',
      challanNumber: '',
      challanDate: null,
      description: '',
      notes: '',
    },
    validate: {
      transactionType: (value) => (!value ? t('finance.vatTaxPage.validation.transactionTypeRequired') : null),
      taxType: (value) => (!value ? t('finance.vatTaxPage.validation.taxTypeRequired') : null),
      baseAmount: (value) => (value === '' ? t('finance.vatTaxPage.validation.baseAmountRequired') : null),
      taxRate: (value) => (value === '' ? t('finance.vatTaxPage.validation.taxRateRequired') : null),
      taxAmount: (value) => (value === '' ? t('finance.vatTaxPage.validation.taxAmountRequired') : null),
      direction: (value) => (!value ? t('finance.vatTaxPage.validation.directionRequired') : null),
      flowType: (value) => (!value ? t('finance.vatTaxPage.validation.flowTypeRequired') : null),
      transactionDate: (value) => (!value ? t('finance.vatTaxPage.validation.transactionDateRequired') : null),
    },
  })

  const paidForm = useForm({
    paymentDate: new Date(),
    paymentReference: '',
  })

  const filedForm = useForm({
    filingDate: new Date(),
    acknowledgementNumber: '',
  })

  // Auto-calculate tax amount when base amount and rate change
  useEffect(() => {
    const base = parseFloat(form.values.baseAmount as string) || 0
    const rate = parseFloat(form.values.taxRate as string) || 0
    const taxAmount = (base * rate) / 100
    form.setFieldValue('taxAmount', taxAmount.toFixed(2))
  }, [form.values.baseAmount, form.values.taxRate])

  const fetchLedgers = useCallback(async () => {
    try {
      setLoading(true)
      const filters: Record<string, any> = {}
      if (filterTaxType) filters.tax_type = filterTaxType
      if (filterDirection) filters.direction = filterDirection
      if (filterStatus) filters.status = filterStatus
      if (searchQuery) filters.search = searchQuery

      const response = await getVatTaxLedgers(filters)
      let data: VatTaxLedger[] = []

      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data
        } else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data) {
          data = response.data.data as any[]
        }
      }

      setLedgers(data)
    } catch (error) {
      notifications.show({ title: t('common.error') || 'Error', message: t('finance.vatTaxPage.notification.fetchError'), color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [filterTaxType, filterDirection, filterStatus, searchQuery])

  const fetchSummary = async () => {
    try {
      const response = await getVatTaxSummary()
      if (response && typeof response === 'object' && 'data' in response) {
        setSummary(response.data)
      }
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  const fetchNetCalculation = async () => {
    try {
      const response = await getVatTaxNetCalculation()
      if (response && typeof response === 'object' && 'data' in response) {
        setNetCalculation(response.data)
      }
    } catch (error) {
      console.error('Failed to load net calculation:', error)
    }
  }

  useEffect(() => {
    fetchLedgers()
    fetchSummary()
    fetchNetCalculation()
  }, [fetchLedgers])

  const handleSubmit = async (values: LedgerFormData) => {
    try {
      const payload = {
        transaction_type: values.transactionType,
        tax_type: values.taxType,
        base_amount: parseFloat(values.baseAmount as string),
        tax_rate: parseFloat(values.taxRate as string),
        tax_amount: parseFloat(values.taxAmount as string),
        direction: values.direction,
        flow_type: values.flowType,
        transaction_date: values.transactionDate ? new Date(values.transactionDate).toISOString().split('T')[0] : undefined,
        chart_account_id: values.chartAccountId ? parseInt(values.chartAccountId as string) : undefined,
        fiscal_year: values.fiscalYear || undefined,
        tax_period: values.taxPeriod || undefined,
        challan_number: values.challanNumber || undefined,
        challan_date: values.challanDate ? new Date(values.challanDate).toISOString().split('T')[0] : undefined,
        description: values.description || undefined,
        notes: values.notes || undefined,
      }

      if (editId) {
        await updateVatTaxLedger(editId, payload)
        notifications.show({ title: t('common.success') || 'Success', message: t('finance.vatTaxPage.notification.updateSuccess'), color: 'green' })
      } else {
        await createVatTaxLedger(payload)
        notifications.show({ title: t('common.success') || 'Success', message: t('finance.vatTaxPage.notification.createSuccess'), color: 'green' })
      }

      setModalOpened(false)
      form.reset()
      setEditId(null)
      fetchLedgers()
      fetchSummary()
      fetchNetCalculation()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.vatTaxPage.notification.createError'),
        color: 'red',
      })
    }
  }

  const openCreateModal = () => {
    setEditId(null)
    form.reset()
    setModalOpened(true)
  }

  const openEditModal = async (ledger: VatTaxLedger) => {
    setEditId(ledger.id)
    form.setValues({
      transactionType: ledger.transactionType,
      taxType: ledger.taxType,
      baseAmount: ledger.baseAmount,
      taxRate: ledger.taxRate,
      taxAmount: ledger.taxAmount,
      direction: ledger.direction,
      flowType: ledger.flowType,
      transactionDate: new Date(ledger.transactionDate),
      chartAccountId: ledger.chartAccountId?.toString() || '',
      fiscalYear: ledger.fiscalYear || '',
      taxPeriod: ledger.taxPeriod || '',
      challanNumber: ledger.challanNumber || '',
      challanDate: ledger.challanDate ? new Date(ledger.challanDate) : null,
      description: ledger.description || '',
      notes: ledger.notes || '',
    })
    setModalOpened(true)
  }

  const openViewModal = async (ledgerId: number) => {
    try {
      const response = await getVatTaxLedger(ledgerId)
      if (response && typeof response === 'object' && 'data' in response) {
        setSelectedEntry(response.data)
        setViewModalOpened(true)
      }
    } catch (error) {
      notifications.show({ title: t('common.error') || 'Error', message: t('finance.vatTaxPage.notification.loadError'), color: 'red' })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: t('common.delete') || 'Delete Entry',
      children: <Text size="sm">{t('finance.vatTaxPage.notification.deleteConfirm')}</Text>,
      labels: { confirm: t('common.delete') || 'Delete', cancel: t('common.cancel') || 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteVatTaxLedger(id)
          notifications.show({ title: t('common.success') || 'Success', message: t('finance.vatTaxPage.notification.deleteSuccess'), color: 'green' })
          fetchLedgers()
          fetchSummary()
          fetchNetCalculation()
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('finance.vatTaxPage.notification.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }

  const openPaidModal = (ledgerId: number) => {
    setActionEntryId(ledgerId)
    paidForm.reset()
    setPaidModalOpened(true)
  }

  const handleMarkAsPaid = async (values: { paymentDate: Date | null; paymentReference: string }) => {
    if (!actionEntryId) return

    try {
      await markVatTaxAsPaid(actionEntryId, {
        payment_date: values.paymentDate ? new Date(values.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        payment_reference: values.paymentReference,
      })

      notifications.show({ title: t('common.success') || 'Success', message: t('finance.vatTaxPage.notification.paidSuccess'), color: 'green' })
      setPaidModalOpened(false)
      setActionEntryId(null)
      paidForm.reset()
      fetchLedgers()
      fetchSummary()
      fetchNetCalculation()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.vatTaxPage.notification.paidError'),
        color: 'red',
      })
    }
  }

  const openFiledModal = (ledgerId: number) => {
    setActionEntryId(ledgerId)
    filedForm.reset()
    setFiledModalOpened(true)
  }

  const handleMarkAsFiled = async (values: { filingDate: Date | null; acknowledgementNumber: string }) => {
    if (!actionEntryId) return

    try {
      await markVatTaxAsFiled(actionEntryId, {
        filing_date: values.filingDate ? new Date(values.filingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        acknowledgement_number: values.acknowledgementNumber || undefined,
      })

      notifications.show({ title: t('common.success') || 'Success', message: t('finance.vatTaxPage.notification.filedSuccess'), color: 'green' })
      setFiledModalOpened(false)
      setActionEntryId(null)
      filedForm.reset()
      fetchLedgers()
      fetchSummary()
      fetchNetCalculation()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.vatTaxPage.notification.filedError'),
        color: 'red',
      })
    }
  }

  const getTaxTypeBadge = (taxType: string) => {
    if (taxType === 'vat') return <Badge color="blue">{t('finance.vatTaxPage.taxTypes.vat')}</Badge>
    if (taxType === 'tax') return <Badge color="orange">{t('finance.vatTaxPage.taxTypes.tax')}</Badge>
    if (taxType === 'ait') return <Badge color="purple">AIT</Badge>
    return <Badge>{taxType}</Badge>
  }

  const getDirectionBadge = (direction: string) => {
    if (direction === 'input') {
      return <Badge leftSection={<IconArrowDownRight size={12} />} color="green" variant="light">{t('finance.vatTaxPage.directions.input').split(' ')[0]}</Badge>
    }
    return <Badge leftSection={<IconArrowUpRight size={12} />} color="red" variant="light">{t('finance.vatTaxPage.directions.output').split(' ')[0]}</Badge>
  }

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <Badge color="yellow">{t('finance.vatTaxPage.statuses.pending')}</Badge>
    if (status === 'filed') return <Badge color="blue">{t('finance.vatTaxPage.statuses.filed')}</Badge>
    if (status === 'paid') return <Badge color="green">{t('finance.vatTaxPage.statuses.paid')}</Badge>
    return <Badge>{status}</Badge>
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Group>
            <IconReceipt size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <div>
              <Title order={2}>{t('finance.vatTaxPage.title')}</Title>
              <Text c="dimmed" size="sm">{t('finance.vatTaxPage.subtitle')}</Text>
            </div>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            {t('finance.vatTaxPage.addEntry')}
          </Button>
        </Flex>

        {/* Alert for net payable */}
        {netCalculation && netCalculation.total_net_payable > 0 && (
          <Alert variant="light" color="orange" title={t('finance.vatTaxPage.netPayableAlert.title')} icon={<IconCoin />}>
            <Text size="sm">
              {t('finance.vatTaxPage.netPayableAlert.message', { amount: netCalculation.total_net_payable.toFixed(2) })}
            </Text>
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.vatTaxPage.summary.vatCollected')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="green">
                {summary.vat.collected.toFixed(2)}৳
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.vatTaxPage.summary.vatPaid')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="red">
                {summary.vat.paid.toFixed(2)}৳
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.vatTaxPage.summary.taxCollected')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="green">
                {summary.tax.collected.toFixed(2)}৳
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.vatTaxPage.summary.netPayable')}
              </Text>
              <Text size="xl" fw={700} mt={5} c={summary.total.net_payable > 0 ? 'red' : 'green'}>
                {summary.total.net_payable.toFixed(2)}৳
              </Text>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Group>
            <TextInput
              placeholder={t('finance.vatTaxPage.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconReceipt size={16} />}
              style={{ flex: 1 }}
            />
            <Select
              placeholder={t('finance.vatTaxPage.filters.filterType')}
              clearable
              data={getTaxTypes(t)}
              value={filterTaxType}
              onChange={setFilterTaxType}
              w={120}
            />
            <Select
              placeholder={t('finance.vatTaxPage.filters.filterDirection')}
              clearable
              data={getDirections(t)}
              value={filterDirection}
              onChange={setFilterDirection}
              w={150}
            />
            <Select
              placeholder={t('finance.vatTaxPage.filters.filterStatus')}
              clearable
              data={getStatuses(t)}
              value={filterStatus}
              onChange={setFilterStatus}
              w={120}
            />
            <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchLedgers}>
              {t('finance.vatTaxPage.filters.refresh')}
            </Button>
          </Group>
        </Paper>

        {/* Ledgers Table */}
        <Paper p="0" withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.vatTaxPage.table.date')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.type')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.direction')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.baseAmount')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.taxRate')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.taxAmount')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.status')}</Table.Th>
                  <Table.Th>{t('finance.vatTaxPage.table.challanNo')}</Table.Th>
                  <Table.Th ta="center">{t('finance.vatTaxPage.table.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={9} ta="center">
                      <Text c="dimmed">{t('finance.vatTaxPage.table.loading')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : ledgers.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={9} ta="center">
                      <Text c="dimmed">{t('finance.vatTaxPage.table.noEntriesFound')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  ledgers.map((ledger) => (
                    <Table.Tr key={ledger.id}>
                      <Table.Td>
                        <Text size="sm">{new Date(ledger.transactionDate).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>{getTaxTypeBadge(ledger.taxType)}</Table.Td>
                      <Table.Td>{getDirectionBadge(ledger.direction)}</Table.Td>
                      <Table.Td>
                        <Text ta="right">{parseFloat(ledger.baseAmount || 0).toFixed(2)}৳</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{parseFloat(ledger.taxRate || 0)}%</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right" fw={500}>
                          {parseFloat(ledger.taxAmount || 0).toFixed(2)}৳
                        </Text>
                      </Table.Td>
                      <Table.Td>{getStatusBadge(ledger.status)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{ledger.challanNumber || '-'}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <Tooltip label={t('finance.vatTaxPage.table.viewDetails')}>
                            <ActionIcon size="sm" variant="light" color="blue" onClick={() => openViewModal(ledger.id)}>
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {ledger.status === 'pending' && (
                            <>
                              <Tooltip label={t('finance.vatTaxPage.table.edit')}>
                                <ActionIcon size="sm" variant="light" color="orange" onClick={() => openEditModal(ledger)}>
                                  <IconPencil size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t('finance.vatTaxPage.table.markAsFiled')}>
                                <ActionIcon size="sm" variant="light" color="blue" onClick={() => openFiledModal(ledger.id)}>
                                  <IconFile size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t('finance.vatTaxPage.table.delete')}>
                                <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDelete(ledger.id)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}
                          {ledger.status === 'filed' && (
                            <Tooltip label={t('finance.vatTaxPage.table.markAsPaid')}>
                              <ActionIcon size="sm" variant="light" color="green" onClick={() => openPaidModal(ledger.id)}>
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
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
        <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editId ? t('finance.vatTaxPage.modal.editTitle') : t('finance.vatTaxPage.modal.newTitle')} size="lg">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Group grow>
                <NativeSelect label={t('finance.vatTaxPage.modal.transactionType')} data={getTransactionTypes(t)} required {...form.getInputProps('transactionType')} />
                <NativeSelect label={t('finance.vatTaxPage.modal.taxType')} data={getTaxTypes(t)} required {...form.getInputProps('taxType')} />
              </Group>

              <Group grow>
                <NativeSelect label={t('finance.vatTaxPage.modal.direction')} data={getDirections(t)} required {...form.getInputProps('direction')} />
                <NativeSelect label={t('finance.vatTaxPage.modal.flowType')} data={getFlowTypes(t)} required {...form.getInputProps('flowType')} />
              </Group>

              <Group grow>
                <NumberInput label={t('finance.vatTaxPage.modal.baseAmount')} required prefix="৳" decimalScale={2} {...form.getInputProps('baseAmount')} />
                <NumberInput label={t('finance.vatTaxPage.modal.taxRate')} required suffix="%" decimalScale={2} min={0} max={100} {...form.getInputProps('taxRate')} />
              </Group>

              <NumberInput
                label={t('finance.vatTaxPage.modal.taxAmount')}
                required
                prefix="৳"
                decimalScale={2}
                {...form.getInputProps('taxAmount')}
                description={t('finance.vatTaxPage.modal.taxAmountDescription')}
              />

              <DatePicker label={t('finance.vatTaxPage.modal.transactionDate')} required {...form.getInputProps('transactionDate')} />

              <Group grow>
                <TextInput label={t('finance.vatTaxPage.modal.fiscalYear')} placeholder={t('finance.vatTaxPage.modal.fiscalYearPlaceholder')} {...form.getInputProps('fiscalYear')} />
                <TextInput label={t('finance.vatTaxPage.modal.taxPeriod')} placeholder={t('finance.vatTaxPage.modal.taxPeriodPlaceholder')} {...form.getInputProps('taxPeriod')} />
              </Group>

              <Group grow>
                <TextInput label={t('finance.vatTaxPage.modal.challanNumber')} {...form.getInputProps('challanNumber')} />
                <DatePicker label={t('finance.vatTaxPage.modal.challanDate')} {...form.getInputProps('challanDate')} />
              </Group>

              <Textarea label={t('finance.vatTaxPage.modal.description')} placeholder={t('finance.vatTaxPage.modal.descriptionPlaceholder')} {...form.getInputProps('description')} />
              <Textarea label={t('finance.vatTaxPage.modal.notes')} placeholder={t('finance.vatTaxPage.modal.notesPlaceholder')} {...form.getInputProps('notes')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setModalOpened(false)}>
                  {t('finance.vatTaxPage.modal.cancel')}
                </Button>
                <Button type="submit">{editId ? t('finance.vatTaxPage.modal.update') : t('finance.vatTaxPage.modal.create')}</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Mark as Paid Modal */}
        <Modal opened={paidModalOpened} onClose={() => setPaidModalOpened(false)} title={t('finance.vatTaxPage.modal.paidTitle')} size="sm">
          <form onSubmit={paidForm.onSubmit(handleMarkAsPaid)}>
            <Stack>
              <DatePicker label={t('finance.vatTaxPage.modal.paymentDate')} required {...paidForm.getInputProps('paymentDate')} />
              <TextInput label={t('finance.vatTaxPage.modal.paymentReference')} required placeholder={t('finance.vatTaxPage.modal.paymentReferencePlaceholder')} {...paidForm.getInputProps('paymentReference')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setPaidModalOpened(false)}>
                  {t('finance.vatTaxPage.modal.cancel')}
                </Button>
                <Button type="submit" color="green">
                  {t('finance.vatTaxPage.modal.markAsPaid')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Mark as Filed Modal */}
        <Modal opened={filedModalOpened} onClose={() => setFiledModalOpened(false)} title={t('finance.vatTaxPage.modal.filedTitle')} size="sm">
          <form onSubmit={filedForm.onSubmit(handleMarkAsFiled)}>
            <Stack>
              <DatePicker label={t('finance.vatTaxPage.modal.filingDate')} required {...filedForm.getInputProps('filingDate')} />
              <TextInput label={t('finance.vatTaxPage.modal.acknowledgementNumber')} placeholder={t('finance.vatTaxPage.modal.acknowledgementNumberPlaceholder')} {...filedForm.getInputProps('acknowledgementNumber')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setFiledModalOpened(false)}>
                  {t('finance.vatTaxPage.modal.cancel')}
                </Button>
                <Button type="submit" color="blue">
                  {t('finance.vatTaxPage.modal.markAsFiled')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* View Details Modal */}
        <Modal opened={viewModalOpened} onClose={() => setViewModalOpened(false)} title={t('finance.vatTaxPage.modal.viewTitle')} size="md">
          {selectedEntry && (
            <Stack>
              <Group grow>
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.taxType')}
                  </Text>
                  {getTaxTypeBadge(selectedEntry.taxType)}
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.direction')}
                  </Text>
                  {getDirectionBadge(selectedEntry.direction)}
                </Box>
              </Group>

              <Group grow>
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.baseAmount')}
                  </Text>
                  <Text size="lg" fw={500}>
                    {parseFloat(selectedEntry.baseAmount || 0).toFixed(2)}৳
                  </Text>
                </Box>
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.taxRate')}
                  </Text>
                  <Text size="md">{parseFloat(selectedEntry.taxRate || 0)}%</Text>
                </Box>
              </Group>

              <Paper withBorder p="sm" radius="md">
                <Text fw={500} mb="xs">
                  {t('finance.vatTaxPage.modal.view.taxAmount')}
                </Text>
                <Text size="xl" fw={700} c="blue">
                  {parseFloat(selectedEntry.taxAmount || 0).toFixed(2)}৳
                </Text>
              </Paper>

              <Paper withBorder p="sm" radius="md">
                <Text fw={500} mb="xs">
                  {t('finance.vatTaxPage.modal.view.transactionDetails')}
                </Text>
                <SimpleGrid cols={2}>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.vatTaxPage.modal.view.transactionDate')}
                    </Text>
                    <Text size="md">{new Date(selectedEntry.transactionDate).toLocaleDateString()}</Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.vatTaxPage.modal.view.status')}
                    </Text>
                    {getStatusBadge(selectedEntry.status)}
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.vatTaxPage.modal.view.fiscalYear')}
                    </Text>
                    <Text size="md">{selectedEntry.fiscalYear || '-'}</Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.vatTaxPage.modal.view.taxPeriod')}
                    </Text>
                    <Text size="md">{selectedEntry.taxPeriod || '-'}</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              {selectedEntry.challanNumber && (
                <Paper withBorder p="sm" radius="md">
                  <Text fw={500} mb="xs">
                    {t('finance.vatTaxPage.modal.view.challanDetails')}
                  </Text>
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.vatTaxPage.modal.view.challanNumber')}
                      </Text>
                      <Text size="md">{selectedEntry.challanNumber}</Text>
                    </Box>
                    {selectedEntry.challanDate && (
                      <Box>
                        <Text size="sm" c="dimmed">
                          {t('finance.vatTaxPage.modal.view.challanDate')}
                        </Text>
                        <Text size="md">{new Date(selectedEntry.challanDate).toLocaleDateString()}</Text>
                      </Box>
                    )}
                  </SimpleGrid>
                </Paper>
              )}

              {selectedEntry.isPaid && (
                <Paper withBorder p="sm" radius="md" bg="green.0">
                  <Text fw={500} mb="xs" c="green">
                    {t('finance.vatTaxPage.modal.view.paymentDetails')}
                  </Text>
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.vatTaxPage.modal.view.paymentDate')}
                      </Text>
                      <Text size="md">{selectedEntry.paymentDate ? new Date(selectedEntry.paymentDate).toLocaleDateString() : '-'}</Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.vatTaxPage.modal.view.paymentReference')}
                      </Text>
                      <Text size="md">{selectedEntry.paymentReference || '-'}</Text>
                    </Box>
                  </SimpleGrid>
                </Paper>
              )}

              {selectedEntry.description && (
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.description')}
                  </Text>
                  <Text size="sm">{selectedEntry.description}</Text>
                </Box>
              )}

              {selectedEntry.notes && (
                <Box>
                  <Text size="sm" c="dimmed">
                    {t('finance.vatTaxPage.modal.view.notes')}
                  </Text>
                  <Text size="sm">{selectedEntry.notes}</Text>
                </Box>
              )}
            </Stack>
          )}
        </Modal>
      </Stack>
    </Box>
  )
}
