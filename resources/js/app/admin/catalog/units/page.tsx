import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Paper,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  Box,
  ActionIcon,
  Table,
  Skeleton,
  Modal,
  Switch,
  Badge,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRuler,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  type Unit,
} from '@/utils/api'

export default function UnitsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    allowDecimal: false,
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch units
  const fetchUnits = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await getUnits()

      // Handle multiple possible response structures
      let unitsData: Unit[] = []

      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          unitsData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          unitsData = response.data
        } else if ('status' in response && response.data && Array.isArray(response.data)) {
          unitsData = response.data
        }
      }

      setUnits(unitsData)
    } catch (error) {
      notifications.show({
        title: t('catalog.unitsPage.notifications.errorLoading'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
      setUnits([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    fetchUnits(true)
  }, [fetchUnits])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      allowDecimal: false,
    })
    setErrors({})
    setEditMode(false)
    setCurrentUnit(null)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (unit: Unit) => {
    setFormData({
      name: unit.name || '',
      symbol: unit.symbol || '',
      allowDecimal: unit.allowDecimal || false,
    })
    setEditMode(true)
    setCurrentUnit(unit)
    setModalOpened(true)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.unitsPage.form.validation.nameRequired')
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = t('catalog.unitsPage.form.validation.symbolRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      const dataToSend = {
        name: formData.name,
        symbol: formData.symbol,
        allow_decimal: formData.allowDecimal,
      }

      if (editMode && currentUnit) {
        await updateUnit(currentUnit.id, dataToSend)
        notifications.show({
          title: t('catalog.unitsPage.notifications.updated'),
          message: t('catalog.unitsPage.notifications.updatedMessage', { name: formData.name }),
          color: 'green',
        })
      } else {
        await createUnit(dataToSend)
        notifications.show({
          title: t('catalog.unitsPage.notifications.created'),
          message: t('catalog.unitsPage.notifications.createdMessage', { name: formData.name }),
          color: 'green',
        })
      }

      setModalOpened(false)
      resetForm()
      await fetchUnits(false)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')

      notifications.show({
        title: editMode
          ? t('catalog.unitsPage.notifications.errorUpdating')
          : t('catalog.unitsPage.notifications.errorCreating'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = (unit: Unit) => {
    modals.openConfirmModal({
      title: t('catalog.unitsPage.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('catalog.unitsPage.notifications.deleteConfirmMessage', { name: unit.name })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteUnit(unit.id)
          notifications.show({
            title: t('catalog.unitsPage.notifications.deleted'),
            message: t('catalog.unitsPage.notifications.deletedMessage', { name: unit.name }),
            color: 'green',
          })
          await fetchUnits(false)
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')
          notifications.show({
            title: t('catalog.unitsPage.notifications.errorDeleting'),
            message: errorMessage,
            color: 'red',
          })
        }
      },
    })
  }

  // Refresh
  const handleRefresh = () => {
    fetchUnits(false)
    notifications.show({
      title: t('catalog.unitsPage.notifications.refreshed'),
      message: t('catalog.unitsPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }

  // Filter units based on search
  const filteredUnits = units.filter((unit) => {
    if (!debouncedSearch) return true
    const search = debouncedSearch.toLowerCase()
    return (
      unit.name.toLowerCase().includes(search) ||
      unit.symbol.toLowerCase().includes(search)
    )
  })

  // Loading skeleton
  if (loading) {
    return (
      <Stack p="xl" gap="md">
        <Skeleton height={40} width="100%" />
        <Skeleton height={200} radius="md" />
        <Skeleton height={400} radius="md" />
      </Stack>
    )
  }

  return (
    <Stack p="xl" gap="md">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
            {t('catalog.unitsPage.title')}
          </Text>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('catalog.unitsPage.subtitle')}
          </Text>
        </div>
        <Button
          onClick={openCreateModal}
          leftSection={<IconPlus size={16} />}
        >
          {t('catalog.unitsPage.addUnit')}
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p={{ base: 'xs', md: 'md' }} radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('catalog.unitsPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w={{ base: '100%', sm: 300 }}
            size="sm"
          />

          <Button
            onClick={handleRefresh}
            loading={refreshing}
            variant="light"
            size="sm"
            leftSection={<IconRefresh size={16} />}
          >
            {t('common.refresh')}
          </Button>
        </Group>
      </Paper>

      {/* Table View - Desktop */}
      <Paper withBorder p="0" radius="md" className="hidden md:block">
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('catalog.unitsPage.tableHeaders.name')}</Table.Th>
              <Table.Th>{t('catalog.unitsPage.tableHeaders.symbol')}</Table.Th>
              <Table.Th>{t('catalog.unitsPage.tableHeaders.allowDecimal')}</Table.Th>
              <Table.Th className="text-right">{t('catalog.unitsPage.tableHeaders.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUnits.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed" py="xl">
                    {t('catalog.unitsPage.noUnitsFound')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUnits.map((unit) => (
                <Table.Tr key={unit.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconRuler size={16} c="blue" />
                      <Text fw={600} size="sm">{unit.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500} c="blue">{unit.symbol}</Text>
                  </Table.Td>
                  <Table.Td>
                    {unit.allowDecimal ? (
                      <Badge size="sm" color="green" variant="light">
                        {t('catalog.unitsPage.form.yes')}
                      </Badge>
                    ) : (
                      <Badge size="sm" color="orange" variant="light">
                        {t('catalog.unitsPage.form.no')}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => openEditModal(unit)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(unit)}
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

      {/* Card View - Mobile */}
      <Box className="block md:hidden">
        {filteredUnits.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Text ta="center" c="dimmed">
              {t('catalog.unitsPage.noUnitsFound')}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {filteredUnits.map((unit) => (
              <Paper key={unit.id} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <IconRuler size={18} c="blue" />
                    <Text fw={600} className="text-sm md:text-base">{unit.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={() => openEditModal(unit)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(unit)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.unitsPage.tableHeaders.symbol')}</Text>
                    <Text size="sm" fw={500} c="blue">{unit.symbol}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.unitsPage.tableHeaders.allowDecimal')}</Text>
                    {unit.allowDecimal ? (
                      <Badge size="sm" color="green" variant="light">
                        {t('catalog.unitsPage.form.yes')}
                      </Badge>
                    ) : (
                      <Badge size="sm" color="orange" variant="light">
                        {t('catalog.unitsPage.form.no')}
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Create/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false)
          resetForm()
        }}
        title={
          <Text size="lg" fw={600}>
            {editMode
              ? t('catalog.unitsPage.form.update')
              : t('catalog.unitsPage.form.create')}
          </Text>
        }
        size="md"
        centered
        radius="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              required
              label={t('catalog.unitsPage.form.name')}
              placeholder={t('catalog.unitsPage.form.namePlaceholder')}
              description={t('catalog.unitsPage.form.nameDescription')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              size="md"
            />

            <TextInput
              required
              label={t('catalog.unitsPage.form.symbol')}
              placeholder={t('catalog.unitsPage.form.symbolPlaceholder')}
              description={t('catalog.unitsPage.form.symbolDescription')}
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              error={errors.symbol}
              size="md"
            />

            <Switch
              label={t('catalog.unitsPage.form.allowDecimal')}
              description={t('catalog.unitsPage.form.allowDecimalDescription')}
              checked={formData.allowDecimal}
              onChange={(e) => setFormData({ ...formData, allowDecimal: e.currentTarget.checked })}
              size="md"
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="md"
                onClick={() => {
                  setModalOpened(false)
                  resetForm()
                }}
              >
                {t('catalog.unitsPage.form.cancel')}
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
                size="md"
              >
                {editMode
                  ? t('catalog.unitsPage.form.update')
                  : t('catalog.unitsPage.form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
