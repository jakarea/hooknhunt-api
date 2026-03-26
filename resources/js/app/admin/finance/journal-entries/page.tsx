import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Table,
  Badge,
  NumberFormatter,
  ActionIcon,
  TextInput,
  Select,
  Menu,
  ScrollArea,
  Grid,
  Alert,
  Modal,
  Box,
} from '@mantine/core'
import {
  IconBook,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconRefresh,
  IconDots,
  IconSearch,
  IconFilter,
  IconX,
  IconArrowsLeftRight,
  IconScale,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  reverseJournalEntry,
  getNextJournalEntryNumber,
  getJournalEntryStatistics,
  getAccounts,
  type JournalEntry,
  type JournalItem,
  type ChartOfAccount,
} from '@/utils/api'
import { useForm } from '@mantine/form'
import { DateInput } from '@mantine/dates'

export default function JournalEntriesPage() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [reverseModalOpened, setReverseModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [nextNumber, setNextNumber] = useState<string>('')

  // Filters
  const [filters, setFilters] = useState({
    entry_number: '',
    start_date: '',
    end_date: '',
    is_reversed: '',
    search: '',
  })

  // Form for create/edit
  const form = useForm({
    initialValues: {
      entry_number: '',
      date: new Date(),
      description: '',
      items: [
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
      ],
    },
    validate: {
      entry_number: (val: string) => (val ? null : t('finance.journalEntriesPage.validation.entryNumberRequired')),
      date: (val: Date) => (val ? null : t('finance.journalEntriesPage.validation.dateRequired')),
      items: {
        account_id: (val: string) => (val ? null : t('finance.journalEntriesPage.validation.accountRequired')),
      },
    },
  })

  // Form for reverse
  const reverseForm = useForm({
    initialValues: {
      reason: '',
    },
  })

  useEffect(() => {
    fetchEntries()
    fetchAccounts()
    fetchNextNumber()
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getJournalEntries({
        ...filters,
        entry_number: filters.entry_number || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        is_reversed: filters.is_reversed === 'true' ? true : filters.is_reversed === 'false' ? false : undefined,
        search: filters.search || undefined,
      })
      // Handle nested response structure
      const entriesData = response?.data || response || []
      setEntries(Array.isArray(entriesData) ? entriesData : entriesData?.data || [])
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || t('finance.journalEntriesPage.notification.fetchError'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await getAccounts()
      // Handle nested response structure
      const accountsData = response?.data || response || []
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error)
      setAccounts([])
    }
  }, [])

  const fetchNextNumber = useCallback(async () => {
    try {
      const response = await getNextJournalEntryNumber()
      setNextNumber(response.data?.next_entry_number || 'JE-000001')
      form.setFieldValue('entry_number', response.data?.next_entry_number || 'JE-000001')
    } catch (error: any) {
      console.error('Failed to fetch next number:', error)
    }
  }, [])

  const handleOpenCreate = useCallback(() => {
    setEditId(null)
    form.reset()
    fetchNextNumber()
    form.setValues({
      entry_number: nextNumber,
      date: new Date(),
      description: '',
      items: [
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
      ],
    })
    setModalOpened(true)
  }, [nextNumber, form])

  const handleOpenEdit = useCallback(async (id: number) => {
    try {
      console.log('Fetching journal entry:', id)
      const response = await getJournalEntry(id)
      console.log('API response:', response)

      const entry = response.data?.data || response.data
      console.log('Entry data:', entry)

      if (!entry) {
        throw new Error('No entry data received')
      }

      setEditId(id)

      // Map items safely with default values
      const items = entry.items?.map((item: any) => ({
        account_id: item.account_id?.toString() || item.account?.id?.toString() || '',
        debit: item.debit?.toString() || '0',
        credit: item.credit?.toString() || '0',
      })) || [
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
      ]

      form.setValues({
        entry_number: entry.entryNumber || entry.entry_number || '',
        date: entry.date ? new Date(entry.date) : new Date(),
        description: entry.description || '',
        items,
      })
      setModalOpened(true)
    } catch (error: any) {
      console.error('Failed to load journal entry:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to load journal entry',
        color: 'red',
      })
    }
  }, [form])

  const handleOpenView = useCallback(async (id: number) => {
    try {
      const response = await getJournalEntry(id)
      setSelectedEntry(response.data.data || response.data)
      setViewModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('finance.journalEntriesPage.notification.loadError'),
        color: 'red',
      })
    }
  }, [])

  const handleOpenReverse = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry)
    reverseForm.reset()
    setReverseModalOpened(true)
  }, [reverseForm])

  const handleSubmit = useCallback(async (values: typeof form.values) => {
    // Validate items
    const validItems = values.items.filter(item => item.account_id && (item.debit || item.credit))

    if (validItems.length < 2) {
      notifications.show({
        title: t('common.error') || 'Validation Error',
        message: t('finance.journalEntriesPage.validation.atLeastTwoItems'),
        color: 'red',
      })
      return
    }

    // Check if each item has either debit or credit (not both)
    for (const item of validItems) {
      const debit = parseFloat(item.debit) || 0
      const credit = parseFloat(item.credit) || 0

      if (debit > 0 && credit > 0) {
        notifications.show({
          title: t('common.error') || 'Validation Error',
          message: t('finance.journalEntriesPage.notification.unbalancedError'),
          color: 'red',
        })
        return
      }

      if (debit === 0 && credit === 0) {
        notifications.show({
          title: t('common.error') || 'Validation Error',
          message: t('finance.journalEntriesPage.validation.mustBalance'),
          color: 'red',
        })
        return
      }
    }

    // Calculate totals
    const totalDebit = validItems.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0)
    const totalCredit = validItems.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      notifications.show({
        title: t('common.error') || 'Validation Error',
        message: t('finance.journalEntriesPage.notification.unbalancedError'),
        color: 'red',
      })
      return
    }

    try {
      const payload = {
        entry_number: values.entry_number,
        date: values.date.toISOString().split('T')[0],
        description: values.description || null,
        items: validItems.map(item => ({
          account_id: parseInt(item.account_id),
          debit: parseFloat(item.debit) || 0,
          credit: parseFloat(item.credit) || 0,
        })),
      }

      if (editId) {
        await updateJournalEntry(editId, payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: t('finance.journalEntriesPage.notification.updateSuccess'),
          color: 'green',
        })
      } else {
        await createJournalEntry(payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: t('finance.journalEntriesPage.notification.createSuccess'),
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchEntries()
      fetchNextNumber()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.journalEntriesPage.notification.createError'),
        color: 'red',
      })
    }
  }, [editId, reverseForm, fetchEntries, fetchNextNumber])

  const handleDelete = useCallback((id: number) => {
    modals.openConfirmModal({
      title: t('common.delete') || 'Delete Journal Entry',
      children: (
        <Text size="sm">{t('finance.journalEntriesPage.notification.deleteConfirm')}</Text>
      ),
      labels: { confirm: t('common.delete') || 'Delete', cancel: t('common.cancel') || 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteJournalEntry(id)
          notifications.show({
            title: t('common.success') || 'Success',
            message: t('finance.journalEntriesPage.notification.deleteSuccess'),
            color: 'green',
          })
          fetchEntries()
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('finance.journalEntriesPage.notification.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }, [fetchEntries])

  const handleReverse = useCallback(async () => {
    if (!selectedEntry) return

    try {
      await reverseJournalEntry(selectedEntry.id, {
        reason: reverseForm.values.reason || null,
      })
      notifications.show({
        title: t('common.success') || 'Success',
        message: t('finance.journalEntriesPage.notification.reverseSuccess'),
        color: 'green',
      })
      setReverseModalOpened(false)
      fetchEntries()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.journalEntriesPage.notification.reverseError'),
        color: 'red',
      })
    }
  }, [selectedEntry, reverseForm, fetchEntries, editId])

  const addJournalItem = useCallback(() => {
    form.insertListItem('items', { account_id: '', debit: '', credit: '' })
  }, [form])

  const removeJournalItem = useCallback((index: number) => {
    if (form.values.items.length > 2) {
      form.removeListItem('items', index)
    } else {
      notifications.show({
        title: t('common.error') || 'Validation Error',
        message: t('finance.journalEntriesPage.validation.atLeastTwoItems'),
        color: 'red',
      })
    }
  }, [form])

  const calculateTotals = useCallback(() => {
    const totalDebit = form.values.items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0)
    const totalCredit = form.values.items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0)
    return { totalDebit, totalCredit }
  }, [form.values])

  const totals = useMemo(() => calculateTotals(), [calculateTotals])

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconBook size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>{t('finance.journalEntriesPage.title')}</Text>
              <Text size="sm" c="dimmed">{t('finance.journalEntriesPage.subtitle')}</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            {t('finance.journalEntriesPage.addEntry')}
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                placeholder={t('finance.journalEntriesPage.filters.searchPlaceholder')}
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <TextInput
                placeholder={t('finance.journalEntriesPage.filters.entryNumber')}
                value={filters.entry_number}
                onChange={(e) => setFilters({ ...filters, entry_number: e.target.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 2 }}>
              <DateInput
                placeholder={t('finance.journalEntriesPage.filters.startDate')}
                value={filters.start_date ? new Date(filters.start_date) : null}
                onChange={(value) => setFilters({ ...filters, start_date: value ? value.toISOString().split('T')[0] : '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 2 }}>
              <DateInput
                placeholder={t('finance.journalEntriesPage.filters.endDate')}
                value={filters.end_date ? new Date(filters.end_date) : null}
                onChange={(value) => setFilters({ ...filters, end_date: value ? value.toISOString().split('T')[0] : '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                placeholder={t('finance.journalEntriesPage.filters.status')}
                data={[
                  { value: '', label: 'All' },
                  { value: 'false', label: 'Active' },
                  { value: 'true', label: t('finance.journalEntriesPage.statusBadges.reversed') },
                ]}
                value={filters.is_reversed}
                onChange={(value) => setFilters({ ...filters, is_reversed: value || '' })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 1 }}>
              <Group>
                <Button variant="light" onClick={fetchEntries} loading={loading}>
                  <IconFilter size={16} />
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => setFilters({ entry_number: '', start_date: '', end_date: '', is_reversed: '', search: '' })}
                >
                  <IconX size={16} />
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Balance Check Alert */}
        {Math.abs(totals.totalDebit - totals.totalCredit) > 0.01 && modalOpened && (
          <Alert color="red" icon={<IconScale size={16} />}>
            {t('finance.journalEntriesPage.alert.unbalanced')} Debit: {totals.totalDebit.toFixed(2)}, Credit: {totals.totalCredit.toFixed(2)}
          </Alert>
        )}

        {/* Table - Desktop View */}
        <Paper withBorder display={{ base: 'none', md: 'block' }}>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.journalEntriesPage.table.entryNumber')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.date')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.description')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.debits')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.credits')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.status')}</Table.Th>
                  <Table.Th>{t('finance.journalEntriesPage.table.createdBy')}</Table.Th>
                  <Table.Th ta="right">{t('finance.journalEntriesPage.table.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} ta="center">
                      <Text c="dimmed">{t('finance.journalEntriesPage.table.loading')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : entries.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} ta="center">
                      <Text c="dimmed">{t('finance.journalEntriesPage.table.noEntriesFound')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  entries.map((entry) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td>
                        <Text fw={500}>{entry.entryNumber || entry.entry_number}</Text>
                      </Table.Td>
                      <Table.Td>{new Date(entry.date).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>{entry.description || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="green">
                          <NumberFormatter value={entry.totalDebit || entry.total_debit || 0} decimalScale={2} thousandSeparator prefix="BDT " />
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="red">
                          <NumberFormatter value={entry.totalCredit || entry.total_credit || 0} decimalScale={2} thousandSeparator prefix="BDT " />
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {entry.isReversed || entry.is_reversed ? (
                          <Badge color="orange" variant="light">{t('finance.journalEntriesPage.statusBadges.reversed')}</Badge>
                        ) : (
                          <Badge color="green" variant="light">{t('finance.journalEntriesPage.statusBadges.balanced')}</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{entry.creator?.name || '-'}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Group gap="xs" justify="flex-end">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenView(entry.id)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          {!entry.is_reversed && (
                            <>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="yellow"
                                onClick={() => handleOpenEdit(entry.id)}
                              >
                                <IconPencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="orange"
                                onClick={() => handleOpenReverse(entry)}
                              >
                                <IconRefresh size={16} />
                              </ActionIcon>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="red"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </>
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

        {/* Mobile Card View */}
        <Stack display={{ base: 'block', md: 'none' }}>
          {loading ? (
            <Paper withBorder p="md">
              <Text ta="center" c="dimmed">Loading...</Text>
            </Paper>
          ) : entries.length === 0 ? (
            <Paper withBorder p="md">
              <Text ta="center" c="dimmed">No journal entries found</Text>
            </Paper>
          ) : (
            entries.map((entry) => (
              <Paper key={entry.id} withBorder p="md" mb="sm" shadow="sm">
                <Stack gap="sm">
                  {/* Header: Entry #, Date, Status */}
                  <Group justify="space-between">
                    <Text className="text-sm md:text-base" fw={500}>
                      {entry.entryNumber || entry.entry_number}
                    </Text>
                    <Badge
                      color={entry.isReversed || entry.is_reversed ? 'orange' : 'green'}
                      variant="light"
                      className="text-xs md:text-sm"
                    >
                      {entry.isReversed || entry.is_reversed ? t('finance.journalEntriesPage.statusBadges.reversed') : t('finance.journalEntriesPage.statusBadges.balanced')}
                    </Badge>
                  </Group>
                  <Text className="text-xs md:text-sm" c="dimmed">
                    {new Date(entry.date).toLocaleDateString()}
                    {entry.creator?.name && ` • Created by ${entry.creator.name}`}
                  </Text>

                  {/* Description */}
                  <Text className="text-sm md:text-base">
                    {entry.description || '-'}
                  </Text>

                  {/* Debit & Credit */}
                  <Group>
                    <Paper p="xs" className="flex-1" bg="green.0">
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.journalEntriesPage.table.debit')}</Text>
                      <Text className="text-sm md:text-base" fw={600} c="green">
                        <NumberFormatter
                          value={entry.totalDebit || entry.total_debit || 0}
                          decimalScale={2}
                          thousandSeparator
                          prefix="৳"
                        />
                      </Text>
                    </Paper>
                    <Paper p="xs" className="flex-1" bg="red.0">
                      <Text className="text-xs md:text-sm" c="dimmed">{t('finance.journalEntriesPage.table.credit')}</Text>
                      <Text className="text-sm md:text-base" fw={600} c="red">
                        <NumberFormatter
                          value={entry.totalCredit || entry.total_credit || 0}
                          decimalScale={2}
                          thousandSeparator
                          prefix="৳"
                        />
                      </Text>
                    </Paper>
                  </Group>

                  {/* Actions */}
                  <Group justify="flex-end">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="blue"
                      onClick={() => handleOpenView(entry.id)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    {!entry.is_reversed && (
                      <>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="yellow"
                          onClick={() => handleOpenEdit(entry.id)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="orange"
                          onClick={() => handleOpenReverse(entry)}
                        >
                          <IconRefresh size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={<Text fw={500}>{editId ? t('finance.journalEntriesPage.modal.editTitle') : t('finance.journalEntriesPage.modal.newTitle')}</Text>}
        size="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group>
              <TextInput
                label={t('finance.journalEntriesPage.modal.entryNumber')}
                required
                {...form.getInputProps('entry_number')}
                style={{ flex: 1 }}
              />
              <DateInput
                label={t('finance.journalEntriesPage.modal.date')}
                required
                value={form.values.date}
                onChange={(value) => form.setFieldValue('date', value as Date)}
                style={{ flex: 1 }}
              />
            </Group>

            <TextInput
              label={t('finance.journalEntriesPage.modal.description')}
              placeholder={t('finance.journalEntriesPage.modal.descriptionPlaceholder')}
              {...form.getInputProps('description')}
            />

            <Text fw={500} size="sm">{t('finance.journalEntriesPage.modal.journalItems')}</Text>

            {form.values.items.map((item, index) => (
              <Group key={index} gap="md">
                <Select
                  placeholder={t('finance.journalEntriesPage.modal.selectAccount')}
                  data={accounts.map(acc => ({
                    value: acc.id.toString(),
                    label: `${acc.code || acc.account_code} - ${acc.name || acc.account_name}`,
                  }))}
                  {...form.getInputProps(`items.${index}.account_id`)}
                  style={{ flex: 2 }}
                  searchable
                />
                <TextInput
                  placeholder={t('finance.journalEntriesPage.modal.debit')}
                  type="number"
                  step="0.01"
                  {...form.getInputProps(`items.${index}.debit`)}
                  style={{ flex: 1 }}
                />
                <TextInput
                  placeholder={t('finance.journalEntriesPage.modal.credit')}
                  type="number"
                  step="0.01"
                  {...form.getInputProps(`items.${index}.credit`)}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => removeJournalItem(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}

            <Button variant="light" onClick={addJournalItem} fullWidth>
              <IconPlus size={16} style={{ marginRight: 8 }} />
              {t('finance.journalEntriesPage.modal.addItem')}
            </Button>

            {/* Totals */}
            <Group>
              <Paper flex={1} p="sm" withBorder bg="green.0">
                <Text size="sm" c="green">{t('finance.journalEntriesPage.modal.totalDebit')}</Text>
                <Text size="lg" fw={500}>
                  <NumberFormatter value={totals.totalDebit} decimalScale={2} thousandSeparator />
                </Text>
              </Paper>
              <Paper flex={1} p="sm" withBorder bg="red.0">
                <Text size="sm" c="red">{t('finance.journalEntriesPage.modal.totalCredit')}</Text>
                <Text size="lg" fw={500}>
                  <NumberFormatter value={totals.totalCredit} decimalScale={2} thousandSeparator />
                </Text>
              </Paper>
              <Paper flex={1} p="sm" withBorder bg={Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'blue.0' : 'orange.0'}>
                <Text size="sm">{t('finance.journalEntriesPage.modal.difference')}</Text>
                <Text size="lg" fw={500}>
                  <NumberFormatter value={Math.abs(totals.totalDebit - totals.totalCredit)} decimalScale={2} thousandSeparator />
                </Text>
              </Paper>
            </Group>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>{t('finance.journalEntriesPage.modal.cancel')}</Button>
              <Button type="submit">{editId ? t('finance.journalEntriesPage.modal.update') : t('finance.journalEntriesPage.modal.create')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        title={<Text fw={500}>{t('finance.journalEntriesPage.viewModal.title')}</Text>}
        size="lg"
      >
        {selectedEntry && (
          <Stack>
            <Group>
              <div>
                <Text size="xs" c="dimmed">{t('finance.journalEntriesPage.viewModal.entryNumber')}</Text>
                <Text fw={500}>{selectedEntry.entryNumber || selectedEntry.entry_number}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{t('finance.journalEntriesPage.viewModal.date')}</Text>
                <Text>{new Date(selectedEntry.date).toLocaleDateString()}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{t('finance.journalEntriesPage.viewModal.status')}</Text>
                {selectedEntry.isReversed || selectedEntry.is_reversed ? (
                  <Badge color="orange" variant="light">{t('finance.journalEntriesPage.statusBadges.reversed')}</Badge>
                ) : (
                  <Badge color="green" variant="light">{t('finance.journalEntriesPage.statusBadges.active')}</Badge>
                )}
              </div>
            </Group>

            {selectedEntry.description && (
              <>
                <Text size="xs" c="dimmed">{t('finance.journalEntriesPage.viewModal.description')}</Text>
                <Text>{selectedEntry.description}</Text>
              </>
            )}

            <Text fw={500} size="sm">{t('finance.journalEntriesPage.viewModal.journalItems')}</Text>

            <Paper withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('finance.journalEntriesPage.viewModal.account')}</Table.Th>
                    <Table.Th ta="right">{t('finance.journalEntriesPage.viewModal.debit')}</Table.Th>
                    <Table.Th ta="right">{t('finance.journalEntriesPage.viewModal.credit')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedEntry.items?.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        {item.account?.code || item.account?.account_code} - {item.account?.name || item.account?.account_name}
                      </Table.Td>
                      <Table.Td ta="right">
                        {item.debit > 0 ? (
                          <Text c="green">
                            <NumberFormatter value={item.debit} decimalScale={2} thousandSeparator />
                          </Text>
                        ) : '-'}
                      </Table.Td>
                      <Table.Td ta="right">
                        {item.credit > 0 ? (
                          <Text c="red">
                            <NumberFormatter value={item.credit} decimalScale={2} thousandSeparator />
                          </Text>
                        ) : '-'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr fw={500}>
                    <Table.Td>{t('finance.journalEntriesPage.viewModal.total')}</Table.Td>
                    <Table.Td ta="right">
                      <Text c="green">
                        <NumberFormatter value={selectedEntry.totalDebit || selectedEntry.total_debit || 0} decimalScale={2} thousandSeparator />
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text c="red">
                        <NumberFormatter value={selectedEntry.totalCredit || selectedEntry.total_credit || 0} decimalScale={2} thousandSeparator />
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>

            <Group justify="flex-end">
              <Button onClick={() => setViewModalOpened(false)}>{t('finance.journalEntriesPage.viewModal.close')}</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Reverse Modal */}
      <Modal
        opened={reverseModalOpened}
        onClose={() => setReverseModalOpened(false)}
        title={<Text fw={500}>{t('finance.journalEntriesPage.reverseModal.title')}</Text>}
        size="md"
      >
        <Stack>
          {selectedEntry && (
            <>
              <Text size="sm">
                {t('finance.journalEntriesPage.reverseModal.confirmMessage', { entryNumber: selectedEntry.entryNumber || selectedEntry.entry_number })}
              </Text>
              <Text size="sm" c="dimmed">
                {t('finance.journalEntriesPage.reverseModal.description')}
              </Text>

              <TextInput
                label={t('finance.journalEntriesPage.reverseModal.reason')}
                placeholder={t('finance.journalEntriesPage.reverseModal.reasonPlaceholder')}
                {...reverseForm.getInputProps('reason')}
              />

              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => setReverseModalOpened(false)}>{t('finance.journalEntriesPage.reverseModal.cancel')}</Button>
                <Button
                  color="orange"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleReverse}
                >
                  {t('finance.journalEntriesPage.reverseModal.reverseEntry')}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Box>
  )
}
