import { useEffect, useState } from 'react'
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
  Switch,
  Modal,
  Grid,
  Box,
} from '@mantine/core'
import {
  IconCurrency,
  IconPlus,
  IconPencil,
  IconTrash,
  IconRefresh,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getCurrencies,
  getCurrency,
  getDefaultCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  updateCurrencyExchangeRate,
  type Currency,
} from '@/utils/api'
import { useForm } from '@mantine/form'

export default function CurrenciesPage() {
  const { t } = useTranslation()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [rateModalOpened, setRateModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [rateCurrencyId, setRateCurrencyId] = useState<number | null>(null)

  // Form for create/edit
  const form = useForm({
    initialValues: {
      code: '',
      name: '',
      symbol: '',
      symbol_position: 'left' as 'left' | 'right',
      decimal_places: '2',
      exchange_rate: '',
      is_active: true,
      notes: '',
    },
    validate: {
      code: (val: string) => (val && val.length === 3 ? null : t('finance.currenciesPage.validation.codeRequired')),
      name: (val: string) => (val ? null : t('finance.currenciesPage.validation.nameRequired')),
      symbol: (val: string) => (val ? null : t('finance.currenciesPage.validation.symbolRequired')),
      symbol_position: (val: string) => (val ? null : t('finance.currenciesPage.validation.positionRequired')),
      decimal_places: (val: string) => (val && parseInt(val) >= 0 && parseInt(val) <= 6 ? null : t('finance.currenciesPage.validation.decimalRequired')),
    },
  })

  // Form for exchange rate update
  const rateForm = useForm({
    initialValues: {
      exchange_rate: '',
    },
    validate: {
      exchange_rate: (val: string) => (val && parseFloat(val) >= 0 ? null : t('finance.currenciesPage.validation.ratePositive')),
    },
  })

  useEffect(() => {
    fetchCurrencies()
    fetchDefaultCurrency()
  }, [])

  const fetchCurrencies = async () => {
    setLoading(true)
    try {
      const response = await getCurrencies()
      // Handle both paginated response and direct array
      const currenciesData = Array.isArray(response) ? response : (response.data || [])
      setCurrencies(currenciesData)
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || t('finance.currenciesPage.notification.fetchError'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDefaultCurrency = async () => {
    try {
      const response = await getDefaultCurrency()
      setDefaultCurrency(response.data)
    } catch (error: any) {
      console.error('Failed to fetch default currency:', error)
    }
  }

  const handleOpenCreate = () => {
    setEditId(null)
    form.reset()
    form.setValues({
      code: '',
      name: '',
      symbol: '',
      symbol_position: 'left',
      decimal_places: '2',
      exchange_rate: '',
      is_active: true,
      notes: '',
    })
    setModalOpened(true)
  }

  const handleOpenEdit = async (id: number) => {
    try {
      const response = await getCurrency(id)
      const currency = response.data

      setEditId(id)
      form.setValues({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        symbol_position: currency.symbol_position,
        decimal_places: currency.decimal_places.toString(),
        exchange_rate: currency.exchange_rate?.toString() || '',
        is_active: currency.is_active,
        notes: currency.notes || '',
      })
      setModalOpened(true)
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('finance.currenciesPage.notification.loadError'),
        color: 'red',
      })
    }
  }

  const handleOpenRateModal = (id: number, currentRate: number | null) => {
    setRateCurrencyId(id)
    rateForm.setValues({
      exchange_rate: currentRate?.toString() || '',
    })
    setRateModalOpened(true)
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        code: values.code.toUpperCase(),
        name: values.name,
        symbol: values.symbol,
        symbol_position: values.symbol_position,
        decimal_places: parseInt(values.decimal_places),
        exchange_rate: values.exchange_rate ? parseFloat(values.exchange_rate) : null,
        is_active: values.is_active,
        notes: values.notes || null,
      }

      if (editId) {
        await updateCurrency(editId, payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: t('finance.currenciesPage.notification.updateSuccess'),
          color: 'green',
        })
      } else {
        await createCurrency(payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: t('finance.currenciesPage.notification.createSuccess'),
          color: 'green',
        })
      }

      setModalOpened(false)
      fetchCurrencies()
      fetchDefaultCurrency()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.currenciesPage.notification.saveError'),
        color: 'red',
      })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: t('common.delete') || 'Delete Currency',
      children: (
        <Text size="sm">{t('finance.currenciesPage.notification.deleteConfirm')}</Text>
      ),
      labels: { confirm: t('common.delete') || 'Delete', cancel: t('common.cancel') || 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteCurrency(id)
          notifications.show({
            title: t('common.success') || 'Success',
            message: t('finance.currenciesPage.notification.deleteSuccess'),
            color: 'green',
          })
          fetchCurrencies()
          fetchDefaultCurrency()
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('finance.currenciesPage.notification.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }

  const handleSetDefault = async (id: number) => {
    try {
      await updateCurrency(id, { is_default: true })
      notifications.show({
        title: t('common.success') || 'Success',
        message: t('finance.currenciesPage.notification.defaultUpdateSuccess'),
        color: 'green',
      })
      fetchCurrencies()
      fetchDefaultCurrency()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.currenciesPage.notification.defaultUpdateError'),
        color: 'red',
      })
    }
  }

  const handleRateSubmit = async (values: typeof rateForm.values) => {
    if (!rateCurrencyId) return

    try {
      await updateCurrencyExchangeRate(rateCurrencyId, parseFloat(values.exchange_rate))
      notifications.show({
        title: t('common.success') || 'Success',
        message: t('finance.currenciesPage.notification.rateUpdateSuccess'),
        color: 'green',
      })
      setRateModalOpened(false)
      fetchCurrencies()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.currenciesPage.notification.rateUpdateError'),
        color: 'red',
      })
    }
  }

  const formatAmount = (amount: number, currency: Currency) => {
    const formatted = amount.toFixed(currency.decimalPlaces)
    return currency.symbolPosition === 'left'
      ? `${currency.symbol}${formatted}`
      : `${formatted}${currency.symbol}`
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconCurrency size={32} />
            <Stack gap={0}>
              <Text size="lg" fw={500}>{t('finance.currenciesPage.title')}</Text>
              <Text size="sm" c="dimmed">{t('finance.currenciesPage.subtitle')}</Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            {t('finance.currenciesPage.newCurrency')}
          </Button>
        </Group>

        {/* Default Currency Badge */}
        {defaultCurrency && (
          <Paper p="md" withBorder>
            <Group>
              <Text size="sm" c="dimmed">{t('finance.currenciesPage.defaultCurrency')}</Text>
              <Badge size="lg" color="blue">
                {defaultCurrency.code} - {defaultCurrency.name} {defaultCurrency.symbol}
              </Badge>
            </Group>
          </Paper>
        )}

        {/* Table */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('finance.currenciesPage.table.code')}</Table.Th>
                <Table.Th>{t('finance.currenciesPage.table.name')}</Table.Th>
                <Table.Th>{t('finance.currenciesPage.table.symbol')}</Table.Th>
                <Table.Th>{t('finance.currenciesPage.table.exchangeRate')}</Table.Th>
                <Table.Th>{t('finance.currenciesPage.table.decimalPlaces')}</Table.Th>
                <Table.Th>{t('finance.currenciesPage.table.status')}</Table.Th>
                <Table.Th ta="right">{t('finance.currenciesPage.table.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center">
                    <Text c="dimmed">{t('finance.currenciesPage.table.loading')}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : currencies.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} ta="center">
                    <Text c="dimmed">{t('finance.currenciesPage.table.noCurrenciesFound')}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                currencies.map((currency) => (
                  <Table.Tr key={currency.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <Text fw={500}>{currency.code}</Text>
                        {currency.isDefault && (
                          <Badge size="xs" color="blue">{t('finance.currenciesPage.table.defaultBadge')}</Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{currency.name}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm">{currency.symbol}</Text>
                        <Text size="xs" c="dimmed">({currency.symbolPosition})</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {currency.isDefault ? (
                        <Text c="dimmed">-</Text>
                      ) : currency.exchangeRate ? (
                        <Group gap="xs">
                          <Text>{Number(currency.exchangeRate).toFixed(2)}</Text>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenRateModal(currency.id, Number(currency.exchangeRate))}
                          >
                            <IconRefresh size={14} />
                          </ActionIcon>
                        </Group>
                      ) : (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => handleOpenRateModal(currency.id, null)}
                        >
                          {t('finance.currenciesPage.table.setRate')}
                        </Button>
                      )}
                    </Table.Td>
                    <Table.Td>{currency.decimalPlaces}</Table.Td>
                    <Table.Td>
                      <Badge color={currency.isActive ? 'green' : 'gray'}>
                        {currency.isActive ? t('finance.currenciesPage.table.active') : t('finance.currenciesPage.table.inactive')}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap="xs" justify="flex-end">
                        {!currency.isDefault && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            onClick={() => handleSetDefault(currency.id)}
                            title={t('finance.currenciesPage.table.setAsDefault')}
                          >
                            <IconCurrency size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="yellow"
                          onClick={() => handleOpenEdit(currency.id)}
                          disabled={currency.isDefault}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(currency.id)}
                          disabled={currency.isDefault}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={<Text fw={500}>{editId ? t('finance.currenciesPage.modal.editTitle') : t('finance.currenciesPage.modal.newTitle')}</Text>}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group>
              <TextInput
                label={t('finance.currenciesPage.modal.currencyCode')}
                placeholder={t('finance.currenciesPage.modal.currencyCodePlaceholder')}
                required
                maxLength={3}
                style={{ flex: 1 }}
                {...form.getInputProps('code')}
              />
              <TextInput
                label={t('finance.currenciesPage.modal.currencySymbol')}
                placeholder={t('finance.currenciesPage.modal.currencySymbolPlaceholder')}
                required
                style={{ flex: 1 }}
                {...form.getInputProps('symbol')}
              />
            </Group>

            <TextInput
              label={t('finance.currenciesPage.modal.currencyName')}
              placeholder={t('finance.currenciesPage.modal.currencyNamePlaceholder')}
              required
              {...form.getInputProps('name')}
            />

            <Group>
              <TextInput
                label={t('finance.currenciesPage.modal.decimalPlaces')}
                type="number"
                min={0}
                max={6}
                required
                style={{ flex: 1 }}
                {...form.getInputProps('decimal_places')}
              />
              <Switch
                label={t('finance.currenciesPage.modal.symbolPosition')}
                description={form.values.symbol_position === 'left' ? t('finance.currenciesPage.modal.symbolPositionLeft') : t('finance.currenciesPage.modal.symbolPositionRight')}
                checked={form.values.symbol_position === 'right'}
                onChange={(e) => form.setFieldValue('symbol_position', e.currentTarget.checked ? 'right' : 'left')}
              />
            </Group>

            {!editId && (
              <TextInput
                label={t('finance.currenciesPage.modal.exchangeRate')}
                placeholder={t('finance.currenciesPage.modal.exchangeRatePlaceholder')}
                type="number"
                step="0.000001"
                min={0}
                description={t('finance.currenciesPage.modal.exchangeRateDescription')}
                {...form.getInputProps('exchange_rate')}
              />
            )}

            <Switch
              label={t('finance.currenciesPage.modal.active')}
              checked={form.values.is_active}
              onChange={(e) => form.setFieldValue('is_active', e.currentTarget.checked)}
            />

            <TextInput
              label={t('finance.currenciesPage.modal.notes')}
              placeholder={t('finance.currenciesPage.modal.notesPlaceholder')}
              {...form.getInputProps('notes')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>{t('finance.currenciesPage.modal.cancel')}</Button>
              <Button type="submit">{editId ? t('finance.currenciesPage.modal.update') : t('finance.currenciesPage.modal.create')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Exchange Rate Modal */}
      <Modal
        opened={rateModalOpened}
        onClose={() => setRateModalOpened(false)}
        title={<Text fw={500}>{t('finance.currenciesPage.modal.rateModalTitle')}</Text>}
        size="sm"
      >
        <form onSubmit={rateForm.onSubmit(handleRateSubmit)}>
          <Stack>
            <Text size="sm" c="dimmed">
              {t('finance.currenciesPage.modal.rateModalDescription', { code: defaultCurrency?.code })}
            </Text>
            <TextInput
              label={t('finance.currenciesPage.modal.exchangeRate')}
              placeholder={t('finance.currenciesPage.modal.exchangeRatePlaceholder')}
              type="number"
              step="0.000001"
              min={0}
              required
              {...rateForm.getInputProps('exchange_rate')}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setRateModalOpened(false)}>{t('finance.currenciesPage.modal.cancel')}</Button>
              <Button type="submit">{t('finance.currenciesPage.modal.updateRate')}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  )
}
