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
  Progress,
  Textarea,
  NativeSelect,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { IconRefresh, IconEye, IconPencil, IconTrash, IconPlus, IconBuilding, IconChartLine, IconTrashOff, IconCoin } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'
import { getFixedAssets, getFixedAsset, createFixedAsset, updateFixedAsset, deleteFixedAsset, disposeFixedAsset, getFixedAssetsSummary, getAssetCategories, type FixedAsset } from '@/utils/api'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'

type AssetFormData = {
  name: string
  category: string
  subcategory: string
  location: string
  serialNumber: string
  description: string
  purchasePrice: string | number
  purchaseDate: Date | null
  supplier: string
  invoiceNumber: string
  salvageValue: string | number
  usefulLife: string | number
  depreciationMethod: string
  depreciationRate: string | number
  warrantyExpiry: Date | null
  notes: string
}

const getCategories = (t: any) => [
  { value: 'furniture', label: t('finance.fixedAssetsPage.categories.furniture') },
  { value: 'equipment', label: t('finance.fixedAssetsPage.categories.equipment') },
  { value: 'vehicle', label: t('finance.fixedAssetsPage.categories.vehicle') },
  { value: 'computer', label: t('finance.fixedAssetsPage.categories.computer') },
  { value: 'machinery', label: t('finance.fixedAssetsPage.categories.machinery') },
  { value: 'building', label: t('finance.fixedAssetsPage.categories.building') },
  { value: 'land', label: t('finance.fixedAssetsPage.categories.land') },
  { value: 'software', label: t('finance.fixedAssetsPage.categories.software') },
  { value: 'other', label: t('finance.fixedAssetsPage.categories.other') },
]

const getDepreciationMethods = (t: any) => [
  { value: 'straight_line', label: t('finance.fixedAssetsPage.depreciationMethods.straight_line') },
  { value: 'declining_balance', label: t('finance.fixedAssetsPage.depreciationMethods.declining_balance') },
  { value: 'units_of_production', label: t('finance.fixedAssetsPage.depreciationMethods.units_of_production') },
  { value: 'none', label: t('finance.fixedAssetsPage.depreciationMethods.none') },
]

const getDisposalStatuses = (t: any) => [
  { value: 'disposed', label: t('finance.fixedAssetsPage.disposalStatuses.disposed') },
  { value: 'sold', label: t('finance.fixedAssetsPage.disposalStatuses.sold') },
  { value: 'scrapped', label: t('finance.fixedAssetsPage.disposalStatuses.scrapped') },
  { value: 'lost', label: t('finance.fixedAssetsPage.disposalStatuses.lost') },
]

export default function FixedAssetsPage() {
  const { t } = useTranslation()
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [disposeModalOpened, setDisposeModalOpened] = useState(false)
  const [viewModalOpened, setViewModalOpened] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [viewAsset, setViewAsset] = useState<FixedAsset | null>(null)
  const [disposeAssetId, setDisposeAssetId] = useState<number | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [summary, setSummary] = useState<any>(null)

  const form = useForm<AssetFormData>({
    initialValues: {
      name: '',
      category: 'Equipment',
      subcategory: '',
      location: '',
      serialNumber: '',
      description: '',
      purchasePrice: '',
      purchaseDate: null,
      supplier: '',
      invoiceNumber: '',
      salvageValue: 0,
      usefulLife: 5,
      depreciationMethod: 'straight_line',
      depreciationRate: 0,
      warrantyExpiry: null,
      notes: '',
    },
    validate: {
      name: (value) => (!value ? t('finance.fixedAssetsPage.validation.nameRequired') : null),
      category: (value) => (!value ? t('finance.fixedAssetsPage.validation.categoryRequired') : null),
      purchasePrice: (value) => (value === '' ? t('finance.fixedAssetsPage.validation.purchasePriceRequired') : null),
      purchaseDate: (value) => (!value ? t('finance.fixedAssetsPage.validation.purchaseDateRequired') : null),
      usefulLife: (value) => (value === '' ? t('finance.fixedAssetsPage.validation.usefulLifeRequired') : null),
    },
  })

  const disposeForm = useForm({
    initialValues: {
      status: 'disposed',
      disposalDate: null as Date | null,
      disposalValue: '',
      disposalReason: '',
      disposalReference: '',
    },
    validate: {
      status: (value) => (!value ? t('finance.fixedAssetsPage.validation.disposalTypeRequired') : null),
      disposalDate: (value) => (!value ? t('finance.fixedAssetsPage.validation.disposalDateRequired') : null),
    },
  })

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const filters: Record<string, any> = {}
      if (filterCategory) filters.category = filterCategory
      if (filterStatus) filters.status = filterStatus
      if (filterLocation) filters.location = filterLocation
      if (searchQuery) filters.search = searchQuery

      const response = await getFixedAssets(filters)
      let data: FixedAsset[] = []

      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          data = response.data
        } else if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data) {
          data = response.data.data as any[]
        }
      }

      setAssets(data)
    } catch (error) {
      notifications.show({ title: t('common.error') || 'Error', message: t('finance.fixedAssetsPage.notification.fetchError'), color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterStatus, filterLocation, searchQuery])

  const fetchSummary = async () => {
    try {
      const response = await getFixedAssetsSummary()
      if (response && typeof response === 'object' && 'data' in response) {
        setSummary(response.data)
      }
    } catch (error) {
      console.error('Failed to load summary:', error)
    }
  }

  useEffect(() => {
    fetchAssets()
    fetchSummary()
  }, [fetchAssets])

  const handleSubmit = async (values: AssetFormData) => {
    try {
      const payload: any = {
        name: values.name,
        category: values.category,
        subcategory: values.subcategory || undefined,
        location: values.location || undefined,
        serial_number: values.serialNumber || undefined,
        description: values.description || undefined,
        purchase_price: typeof values.purchasePrice === 'number' ? values.purchasePrice : parseFloat(values.purchasePrice as string || '0'),
        purchase_date: values.purchaseDate ? new Date(values.purchaseDate).toISOString().split('T')[0] : undefined,
        supplier: values.supplier || undefined,
        invoice_number: values.invoiceNumber || undefined,
        salvage_value: typeof values.salvageValue === 'number' ? values.salvageValue : parseFloat(values.salvageValue as string || '0'),
        useful_life: typeof values.usefulLife === 'number' ? values.usefulLife : parseInt(values.usefulLife as string || '5'),
        depreciation_method: values.depreciationMethod,
        depreciation_rate: values.depreciationMethod === 'declining_balance' ? (typeof values.depreciationRate === 'number' ? values.depreciationRate : parseFloat(values.depreciationRate as string || '0')) : 0,
        warranty_expiry: values.warrantyExpiry ? new Date(values.warrantyExpiry).toISOString().split('T')[0] : undefined,
        notes: values.notes || undefined,
      }

      if (editId) {
        await updateFixedAsset(editId, payload)
        notifications.show({ title: t('common.success') || 'Success', message: t('finance.fixedAssetsPage.notification.updateSuccess'), color: 'green' })
      } else {
        await createFixedAsset(payload)
        notifications.show({ title: t('common.success') || 'Success', message: t('finance.fixedAssetsPage.notification.createSuccess'), color: 'green' })
      }

      setModalOpened(false)
      form.reset()
      setEditId(null)
      fetchAssets()
      fetchSummary()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.fixedAssetsPage.notification.createError'),
        color: 'red',
      })
    }
  }

  const openCreateModal = () => {
    setEditId(null)
    form.reset()
    setModalOpened(true)
  }

  const openEditModal = async (asset: FixedAsset) => {
    setEditId(asset.id)
    form.setValues({
      name: asset.name,
      category: asset.category,
      subcategory: asset.subcategory || '',
      location: asset.location || '',
      serialNumber: asset.serialNumber || '',
      description: asset.description || '',
      purchasePrice: asset.purchasePrice,
      purchaseDate: new Date(asset.purchaseDate),
      supplier: asset.supplier || '',
      invoiceNumber: asset.invoiceNumber || '',
      salvageValue: asset.salvageValue,
      usefulLife: asset.usefulLife,
      depreciationMethod: asset.depreciationMethod,
      depreciationRate: asset.depreciationRate,
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
      notes: asset.notes || '',
    })
    setModalOpened(true)
  }

  const openViewModal = async (assetId: number) => {
    try {
      const response = await getFixedAsset(assetId)
      if (response && typeof response === 'object' && 'data' in response) {
        setViewAsset(response.data)
        setViewModalOpened(true)
      }
    } catch (error) {
      notifications.show({ title: t('common.error') || 'Error', message: t('finance.fixedAssetsPage.notification.loadError'), color: 'red' })
    }
  }

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: t('common.delete') || 'Delete Asset',
      children: <Text size="sm">{t('finance.fixedAssetsPage.notification.deleteConfirm')}</Text>,
      labels: { confirm: t('common.delete') || 'Delete', cancel: t('common.cancel') || 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteFixedAsset(id)
          notifications.show({ title: t('common.success') || 'Success', message: t('finance.fixedAssetsPage.notification.deleteSuccess'), color: 'green' })
          fetchAssets()
          fetchSummary()
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('finance.fixedAssetsPage.notification.deleteError'),
            color: 'red',
          })
        }
      },
    })
  }

  const openDisposeModal = (assetId: number) => {
    setDisposeAssetId(assetId)
    disposeForm.reset()
    setDisposeModalOpened(true)
  }

  const handleDispose = async (values: any) => {
    if (!disposeAssetId) return

    try {
      await disposeFixedAsset(disposeAssetId, {
        status: values.status,
        disposal_date: values.disposalDate ? new Date(values.disposalDate).toISOString().split('T')[0] : undefined,
        disposal_value: values.disposalValue ? parseFloat(values.disposalValue) : undefined,
        disposal_reason: values.disposalReason,
        disposal_reference: values.disposalReference,
      })

      notifications.show({ title: t('common.success') || 'Success', message: t('finance.fixedAssetsPage.notification.disposeSuccess'), color: 'green' })
      setDisposeModalOpened(false)
      setDisposeAssetId(null)
      disposeForm.reset()
      fetchAssets()
      fetchSummary()
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('finance.fixedAssetsPage.notification.disposeError'),
        color: 'red',
      })
    }
  }

  const getDepreciationMethodLabel = (method: string) => {
    const methods = getDepreciationMethods(t)
    return methods.find((m) => m.value === method)?.label || method
  }

  const getStatusBadge = (asset: FixedAsset) => {
    if (asset.status === 'active' && asset.isFullyDepreciated) {
      return <Badge color="gray">{t('finance.fixedAssetsPage.statusBadges.fullyDepreciated')}</Badge>
    }
    if (asset.status === 'active') {
      return <Badge color="green">{t('finance.fixedAssetsPage.statusBadges.active')}</Badge>
    }
    if (asset.status === 'sold') return <Badge color="blue">{t('finance.fixedAssetsPage.statusBadges.sold')}</Badge>
    if (asset.status === 'disposed') return <Badge color="yellow">{t('finance.fixedAssetsPage.statusBadges.disposed')}</Badge>
    if (asset.status === 'scrapped') return <Badge color="orange">{t('finance.fixedAssetsPage.statusBadges.scrapped')}</Badge>
    if (asset.status === 'lost') return <Badge color="red">{t('finance.fixedAssetsPage.statusBadges.lost')}</Badge>
    return <Badge>{asset.status}</Badge>
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Group>
            <IconBuilding size={32} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <div>
              <Title order={2}>{t('finance.fixedAssetsPage.title')}</Title>
              <Text c="dimmed" size="sm">{t('finance.fixedAssetsPage.subtitle')}</Text>
            </div>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            {t('finance.fixedAssetsPage.addAsset')}
          </Button>
        </Flex>

        {/* Summary Cards */}
        {summary && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.fixedAssetsPage.summary.totalAssets')}
              </Text>
              <Text size="xl" fw={700} mt={5}>
                {summary.totalAssets ?? 0}
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.fixedAssetsPage.summary.activeAssets')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="green">
                {summary.activeAssets ?? 0}
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.fixedAssetsPage.summary.totalValue')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="blue">
                {summary.totalPurchaseValue?.toFixed(2) ?? '0.00'}৳
              </Text>
            </Card>
            <Card padding="lg" radius="md" withBorder>
              <Text c="dimmed" size="sm" fw={500}>
                {t('finance.fixedAssetsPage.summary.netBookValue')}
              </Text>
              <Text size="xl" fw={700} mt={5} c="cyan">
                {summary.totalNetBookValue?.toFixed(2) ?? '0.00'}৳
              </Text>
            </Card>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Group>
            <TextInput
              placeholder={t('finance.fixedAssetsPage.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconChartLine size={16} />}
              style={{ flex: 1 }}
            />
            <Select
              placeholder={t('finance.fixedAssetsPage.filters.categoryPlaceholder')}
              clearable
              data={getCategories(t)}
              value={filterCategory}
              onChange={setFilterCategory}
              w={150}
            />
            <Select
              placeholder={t('finance.fixedAssetsPage.filters.statusPlaceholder')}
              clearable
              data={[
                { value: 'active', label: t('finance.fixedAssetsPage.statusBadges.active') },
                { value: 'disposed', label: t('finance.fixedAssetsPage.statusBadges.disposed') },
                { value: 'sold', label: t('finance.fixedAssetsPage.statusBadges.sold') },
                { value: 'scrapped', label: t('finance.fixedAssetsPage.statusBadges.scrapped') },
                { value: 'lost', label: t('finance.fixedAssetsPage.statusBadges.lost') },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              w={120}
            />
            <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchAssets}>
              {t('finance.fixedAssetsPage.filters.refresh')}
            </Button>
          </Group>
        </Paper>

        {/* Assets Table */}
        <Paper p="0" withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('finance.fixedAssetsPage.table.assetCode')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.name')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.category')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.purchaseDate')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.purchasePrice')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.depreciation')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.netBookValue')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.progress')}</Table.Th>
                  <Table.Th>{t('finance.fixedAssetsPage.table.status')}</Table.Th>
                  <Table.Th ta="center">{t('finance.fixedAssetsPage.table.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={10} ta="center">
                      <Text c="dimmed">{t('finance.fixedAssetsPage.table.loading')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : assets.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={10} ta="center">
                      <Text c="dimmed">{t('finance.fixedAssetsPage.table.noAssetsFound')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  assets.map((asset) => (
                    <Table.Tr key={asset.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {asset.assetCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{asset.name}</Text>
                        {asset.location && (
                          <Text size="xs" c="dimmed">
                            {asset.location}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{asset.category}</Text>
                        {asset.subcategory && (
                          <Text size="xs" c="dimmed">
                            {asset.subcategory}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{new Date(asset.purchaseDate).toLocaleDateString()}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right">{parseFloat(asset.purchasePrice || 0).toFixed(2)}৳</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right" size="sm" c="red">
                          {parseFloat(asset.accumulatedDepreciation || 0).toFixed(2)}৳
                        </Text>
                        <Text ta="right" size="xs" c="dimmed">
                          {getDepreciationMethodLabel(asset.depreciationMethod)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text ta="right" fw={500} c={parseFloat(asset.netBookValue || 0) > 0 ? 'green' : 'gray'}>
                          {parseFloat(asset.netBookValue || 0).toFixed(2)}৳
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {asset.depreciationMethod !== 'none' && (
                          <Box w={80}>
                            <Progress
                              value={asset.depreciationProgress || 0}
                              size="sm"
                              color={asset.isFullyDepreciated ? 'gray' : 'blue'}
                            />
                            <Text size="xs" c="dimmed" mt={2}>
                              {Math.round(asset.depreciationProgress || 0)}%
                            </Text>
                          </Box>
                        )}
                      </Table.Td>
                      <Table.Td>{getStatusBadge(asset)}</Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center">
                          <Tooltip label={t('finance.fixedAssetsPage.table.viewDetails')}>
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="blue"
                              onClick={() => openViewModal(asset.id)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {asset.status === 'active' && (
                            <>
                              <Tooltip label={t('finance.fixedAssetsPage.table.edit')}>
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  color="orange"
                                  onClick={() => openEditModal(asset)}
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t('finance.fixedAssetsPage.table.dispose')}>
                                <ActionIcon
                                  size="sm"
                                  variant="light"
                                  color="red"
                                  onClick={() => openDisposeModal(asset.id)}
                                >
                                  <IconTrashOff size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip label={t('finance.fixedAssetsPage.table.delete')}>
                            <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDelete(asset.id)}>
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
          title={editId ? t('finance.fixedAssetsPage.modal.editTitle') : t('finance.fixedAssetsPage.modal.newTitle')}
          size="lg"
        >
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Group grow>
                <TextInput label={t('finance.fixedAssetsPage.modal.name')} placeholder={t('finance.fixedAssetsPage.modal.namePlaceholder')} required {...form.getInputProps('name')} />
                <Select label={t('finance.fixedAssetsPage.modal.category')} data={getCategories(t)} required {...form.getInputProps('category')} />
              </Group>

              <Group grow>
                <TextInput label="Subcategory" placeholder="e.g., Executive Desk" {...form.getInputProps('subcategory')} />
                <TextInput label={t('finance.fixedAssetsPage.modal.location')} placeholder={t('finance.fixedAssetsPage.modal.locationPlaceholder')} {...form.getInputProps('location')} />
              </Group>

              <Group grow>
                <TextInput label={t('finance.fixedAssetsPage.modal.serialNumber')} placeholder={t('finance.fixedAssetsPage.modal.serialNumberPlaceholder')} {...form.getInputProps('serialNumber')} />
                <DatePicker label={t('finance.fixedAssetsPage.modal.purchaseDate')} required {...form.getInputProps('purchaseDate')} />
              </Group>

              <Group grow>
                <NumberInput label={t('finance.fixedAssetsPage.modal.purchasePrice') + ' (৳)'} required prefix="৳" decimalScale={2} {...form.getInputProps('purchasePrice')} />
                <NumberInput label={t('finance.fixedAssetsPage.modal.salvageValue') + ' (৳)'} prefix="৳" decimalScale={2} {...form.getInputProps('salvageValue')} />
              </Group>

              <Group grow>
                <NumberInput label={t('finance.fixedAssetsPage.modal.usefulLife')} required min={1} max={100} {...form.getInputProps('usefulLife')} />
                <Select
                  label={t('finance.fixedAssetsPage.modal.depreciationMethod')}
                  required
                  data={getDepreciationMethods(t)}
                  {...form.getInputProps('depreciationMethod')}
                />
              </Group>

              {form.values.depreciationMethod === 'declining_balance' && (
                <NumberInput label="Depreciation Rate (%)" placeholder="e.g., 10" min={0} max={100} {...form.getInputProps('depreciationRate')} />
              )}

              <Group grow>
                <TextInput label={t('finance.fixedAssetsPage.modal.supplier')} placeholder={t('finance.fixedAssetsPage.modal.supplierPlaceholder')} {...form.getInputProps('supplier')} />
                <TextInput label={t('finance.fixedAssetsPage.modal.invoiceNumber')} placeholder={t('finance.fixedAssetsPage.modal.invoiceNumberPlaceholder')} {...form.getInputProps('invoiceNumber')} />
              </Group>

              <DatePicker label="Warranty Expiry" placeholder="Warranty end date" {...form.getInputProps('warrantyExpiry')} />

              <Textarea label="Description" placeholder="Asset details" {...form.getInputProps('description')} />
              <Textarea label={t('finance.fixedAssetsPage.modal.notes')} placeholder={t('finance.fixedAssetsPage.modal.notesPlaceholder')} {...form.getInputProps('notes')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setModalOpened(false)}>
                  {t('finance.fixedAssetsPage.modal.cancel')}
                </Button>
                <Button type="submit">{editId ? t('finance.fixedAssetsPage.modal.update') : t('finance.fixedAssetsPage.modal.create')}</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* Dispose Modal */}
        <Modal opened={disposeModalOpened} onClose={() => setDisposeModalOpened(false)} title={t('finance.fixedAssetsPage.modal.disposeTitle')} size="md">
          <form onSubmit={disposeForm.onSubmit(handleDispose)}>
            <Stack>
              <NativeSelect label={t('finance.fixedAssetsPage.modal.dispose.disposalType')} data={getDisposalStatuses(t)} {...disposeForm.getInputProps('status')} />
              <DatePicker label={t('finance.fixedAssetsPage.modal.dispose.disposalDate')} required {...disposeForm.getInputProps('disposalDate')} />
              <NumberInput label={t('finance.fixedAssetsPage.modal.dispose.disposalValue') + ' (৳)'} prefix="৳" decimalScale={2} {...disposeForm.getInputProps('disposalValue')} />
              <Textarea label={t('finance.fixedAssetsPage.modal.dispose.reason')} placeholder={t('finance.fixedAssetsPage.modal.dispose.reasonPlaceholder')} {...disposeForm.getInputProps('disposalReason')} />
              <TextInput label={t('finance.fixedAssetsPage.modal.dispose.reference')} placeholder={t('finance.fixedAssetsPage.modal.dispose.referencePlaceholder')} {...disposeForm.getInputProps('disposalReference')} />

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setDisposeModalOpened(false)}>
                  {t('finance.fixedAssetsPage.modal.cancel')}
                </Button>
                <Button type="submit" color="red">
                  {t('finance.fixedAssetsPage.modal.confirmDispose')}
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        {/* View Details Modal */}
        <Modal opened={viewModalOpened} onClose={() => setViewModalOpened(false)} title={t('finance.fixedAssetsPage.modal.viewTitle')} size="lg">
          {viewAsset && (
            <ScrollArea.Autosize mah={600}>
              <Stack>
                <Group grow>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.fixedAssetsPage.modal.assetCode')}
                    </Text>
                    <Text size="lg" fw={500}>
                      {viewAsset.assetCode}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.fixedAssetsPage.modal.name')}
                    </Text>
                    <Text size="lg" fw={500}>
                      {viewAsset.name}
                    </Text>
                  </Box>
                </Group>

                <Group grow>
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.fixedAssetsPage.modal.category')}
                    </Text>
                    <Text size="md">{viewAsset.category}</Text>
                  </Box>
                  <Box>
                    <Text size="sm" c="dimmed">
                      Subcategory
                    </Text>
                    <Text size="md">{viewAsset.subcategory || '-'}</Text>
                  </Box>
                </Group>

                <Box>
                  <Text size="sm" c="dimmed">
                    Description
                  </Text>
                  <Text size="sm">{viewAsset.description || '-'}</Text>
                </Box>

                <Paper withBorder p="sm" radius="md">
                  <Text fw={500} mb="xs">
                    {t('finance.fixedAssetsPage.modal.view.financialDetails')}
                  </Text>
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.view.purchasePrice')}
                      </Text>
                      <Text size="md" fw={500}>
                        {parseFloat(viewAsset.purchasePrice || 0).toFixed(2)}৳
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.purchaseDate')}
                      </Text>
                      <Text size="md">{new Date(viewAsset.purchaseDate).toLocaleDateString()}</Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.salvageValue')}
                      </Text>
                      <Text size="md">{parseFloat(viewAsset.salvageValue || 0).toFixed(2)}৳</Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.view.usefulLife')}
                      </Text>
                      <Text size="md">{viewAsset.usefulLife} years</Text>
                    </Box>
                  </SimpleGrid>
                </Paper>

                <Paper withBorder p="sm" radius="md">
                  <Text fw={500} mb="xs">
                    {t('finance.fixedAssetsPage.modal.view.depreciationDetails')}
                  </Text>
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.view.depreciationMethod')}
                      </Text>
                      <Text size="md">{getDepreciationMethodLabel(viewAsset.depreciationMethod)}</Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.view.accumulatedDepreciation')}
                      </Text>
                      <Text size="md" c="red" fw={500}>
                        {parseFloat(viewAsset.accumulatedDepreciation || 0).toFixed(2)}৳
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        {t('finance.fixedAssetsPage.modal.view.netBookValue')}
                      </Text>
                      <Text size="md" c="green" fw={500}>
                        {parseFloat(viewAsset.netBookValue || 0).toFixed(2)}৳
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Remaining Life
                      </Text>
                      <Text size="md">{viewAsset.remaining_life} years</Text>
                    </Box>
                  </SimpleGrid>

                  <Progress
                    value={viewAsset.depreciation_progress || 0}
                    size="lg"
                    color={viewAsset.is_fully_depreciated ? 'gray' : 'blue'}
                    mt="md"
                  />
                  <Text size="sm" c="dimmed" mt={4}>
                    {Math.round(viewAsset.depreciation_progress || 0)}% depreciated
                  </Text>
                </Paper>

                {viewAsset.depreciation_schedule && viewAsset.depreciation_schedule.length > 0 && (
                  <Paper withBorder p="sm" radius="md">
                    <Text fw={500} mb="xs">
                      {t('finance.fixedAssetsPage.modal.view.schedule')}
                    </Text>
                    <ScrollArea>
                      <Table striped fontSize="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Year</Table.Th>
                            <Table.Th>{t('finance.fixedAssetsPage.modal.view.depreciationExpense')}</Table.Th>
                            <Table.Th>{t('finance.fixedAssetsPage.modal.view.accumulatedDepreciation')}</Table.Th>
                            <Table.Th>{t('finance.fixedAssetsPage.modal.view.bookValue')}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {viewAsset.depreciation_schedule.map((item) => (
                            <Table.Tr key={item.year}>
                              <Table.Td>{item.year}</Table.Td>
                              <Table.Td>{parseFloat(item.depreciation || 0).toFixed(2)}৳</Table.Td>
                              <Table.Td>{parseFloat(item.accumulated || 0).toFixed(2)}৳</Table.Td>
                              <Table.Td>{parseFloat(item.book_value || 0).toFixed(2)}৳</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Paper>
                )}

                {viewAsset.supplier && (
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.fixedAssetsPage.modal.view.supplier')}
                    </Text>
                    <Text size="sm">{viewAsset.supplier}</Text>
                  </Box>
                )}

                {viewAsset.notes && (
                  <Box>
                    <Text size="sm" c="dimmed">
                      {t('finance.fixedAssetsPage.modal.view.notes')}
                    </Text>
                    <Text size="sm">{viewAsset.notes}</Text>
                  </Box>
                )}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Modal>
      </Stack>
    </Box>
  )
}
