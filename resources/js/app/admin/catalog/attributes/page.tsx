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
  Select,
  ColorInput,
  NumberInput,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconTag,
  IconList,
  IconX,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  type Attribute,
} from '@/utils/api'

// Attribute type options for the select dropdown
const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Text', key: 'typeText' },
  { value: 'number', label: 'Number', key: 'typeNumber' },
  { value: 'select', label: 'Select (Dropdown)', key: 'typeSelect' },
  { value: 'multiselect', label: 'Multi Select', key: 'typeMultiselect' },
  { value: 'color', label: 'Color (with Swatch)', key: 'typeColor' },
  { value: 'date', label: 'Date', key: 'typeDate' },
  { value: 'boolean', label: 'Boolean (Yes/No)', key: 'typeBoolean' },
] as const

// Helper function to get translated type label
const getTypeLabel = (type: Attribute['type'], t: (key: string) => string) => {
  const typeConfig = ATTRIBUTE_TYPES.find(attr => attr.value === type)
  return typeConfig ? t(`catalog.attributesPage.form.${typeConfig.key}`) : type
}

export default function AttributesPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentAttribute, setCurrentAttribute] = useState<Attribute | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: 'text' as Attribute['type'],
    isRequired: false,
    isVisible: true,
    sortOrder: 0,
  })

  // Options state (for inline management)
  const [options, setOptions] = useState<Array<{
    id?: number
    value: string
    label: string
    swatchValue: string
    sortOrder: number
  }>>([])

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch attributes
  const fetchAttributes = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await getAttributes()

      // Handle response
      let attributesData: Attribute[] = []

      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          attributesData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          attributesData = response.data
        }
      }

      setAttributes(attributesData)
    } catch (error) {
      notifications.show({
        title: t('catalog.attributesPage.notifications.errorLoading'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
      setAttributes([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    fetchAttributes(true)
  }, [fetchAttributes])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      type: 'text',
      isRequired: false,
      isVisible: true,
      sortOrder: 0,
    })
    setOptions([])
    setErrors({})
    setEditMode(false)
    setCurrentAttribute(null)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (attribute: Attribute) => {
    setFormData({
      name: attribute.name || '',
      displayName: attribute.displayName || '',
      type: attribute.type,
      isRequired: attribute.isRequired || false,
      isVisible: attribute.isVisible !== false,
      sortOrder: attribute.sortOrder || 0,
    })
    // Load options
    if (attribute.options && attribute.options.length > 0) {
      setOptions(attribute.options.map(opt => ({
        id: opt.id,
        value: opt.value,
        label: opt.label || opt.value,
        swatchValue: opt.swatchValue || '',
        sortOrder: opt.sortOrder,
      })))
    } else {
      setOptions([])
    }
    setEditMode(true)
    setCurrentAttribute(attribute)
    setModalOpened(true)
  }

  // Add new option
  const addOption = () => {
    setOptions([
      ...options,
      { value: '', label: '', swatchValue: '', sortOrder: options.length },
    ])
  }

  // Remove option
  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  // Update option field
  const updateOption = (index: number, field: string, value: string | number) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setOptions(newOptions)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.attributesPage.form.validation.nameRequired')
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = t('catalog.attributesPage.form.validation.displayNameRequired')
    }

    // Validate options for select/multiselect/color types
    if (['select', 'multiselect', 'color'].includes(formData.type)) {
      if (options.length === 0) {
        newErrors.options = 'At least one option is required for this type'
      } else {
        options.forEach((opt, index) => {
          if (!opt.value.trim()) {
            newErrors[`option_${index}`] = t('catalog.attributesPage.form.validation.optionValueRequired')
          }
        })
      }
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
      const dataToSend: any = {
        name: formData.name,
        display_name: formData.displayName,
        type: formData.type,
        is_required: formData.isRequired,
        is_visible: formData.isVisible,
        sort_order: formData.sortOrder,
      }

      // Add options if type requires it
      if (['select', 'multiselect', 'color'].includes(formData.type)) {
        dataToSend.options = options.map((opt, index) => ({
          id: opt.id,
          value: opt.value,
          label: opt.label || opt.value,
          swatch_value: opt.swatchValue || null,
          sort_order: index,
        }))
      }

      if (editMode && currentAttribute) {
        await updateAttribute(currentAttribute.id, dataToSend)
        notifications.show({
          title: t('catalog.attributesPage.notifications.updated'),
          message: t('catalog.attributesPage.notifications.updatedMessage', { name: formData.displayName }),
          color: 'green',
        })
      } else {
        await createAttribute(dataToSend)
        notifications.show({
          title: t('catalog.attributesPage.notifications.created'),
          message: t('catalog.attributesPage.notifications.createdMessage', { name: formData.displayName }),
          color: 'green',
        })
      }

      setModalOpened(false)
      resetForm()
      await fetchAttributes(false)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')

      notifications.show({
        title: editMode
          ? t('catalog.attributesPage.notifications.errorUpdating')
          : t('catalog.attributesPage.notifications.errorCreating'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = (attribute: Attribute) => {
    modals.openConfirmModal({
      title: t('catalog.attributesPage.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('catalog.attributesPage.notifications.deleteConfirmMessage', { name: attribute.displayName })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteAttribute(attribute.id)
          notifications.show({
            title: t('catalog.attributesPage.notifications.deleted'),
            message: t('catalog.attributesPage.notifications.deletedMessage', { name: attribute.displayName }),
            color: 'green',
          })
          await fetchAttributes(false)
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')
          notifications.show({
            title: t('catalog.attributesPage.notifications.errorDeleting'),
            message: errorMessage,
            color: 'red',
          })
        }
      },
    })
  }

  // Refresh
  const handleRefresh = () => {
    fetchAttributes(false)
    notifications.show({
      title: t('catalog.attributesPage.notifications.refreshed'),
      message: t('catalog.attributesPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }

  // Filter attributes based on search
  const filteredAttributes = attributes.filter((attribute) => {
    if (!debouncedSearch) return true
    const search = debouncedSearch.toLowerCase()
    return (
      attribute.name.toLowerCase().includes(search) ||
      attribute.displayName.toLowerCase().includes(search)
    )
  })

  // Get type badge color
  const getTypeBadgeColor = (type: Attribute['type']) => {
    const colors: Record<Attribute['type'], string> = {
      text: 'blue',
      number: 'cyan',
      select: 'green',
      multiselect: 'lime',
      color: 'pink',
      date: 'orange',
      boolean: 'purple',
    }
    return colors[type] || 'gray'
  }

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
            {t('catalog.attributesPage.title')}
          </Text>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('catalog.attributesPage.subtitle')}
          </Text>
        </div>
        <Button
          onClick={openCreateModal}
          leftSection={<IconPlus size={16} />}
        >
          {t('catalog.attributesPage.addAttribute')}
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p={{ base: 'xs', md: 'md' }} radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('catalog.attributesPage.searchPlaceholder')}
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
              <Table.Th>{t('catalog.attributesPage.tableHeaders.name')}</Table.Th>
              <Table.Th>{t('catalog.attributesPage.tableHeaders.displayName')}</Table.Th>
              <Table.Th>{t('catalog.attributesPage.tableHeaders.type')}</Table.Th>
              <Table.Th>{t('catalog.attributesPage.tableHeaders.options')}</Table.Th>
              <Table.Th>{t('catalog.attributesPage.tableHeaders.isVisible')}</Table.Th>
              <Table.Th className="text-right">{t('catalog.attributesPage.tableHeaders.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAttributes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed" py="xl">
                    {t('catalog.attributesPage.noAttributesFound')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAttributes.map((attribute) => (
                <Table.Tr key={attribute.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconTag size={16} style={{ color: 'var(--mantine-color-blue-6)' }} />
                      <Text fw={600} size="sm">{attribute.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{attribute.displayName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={getTypeBadgeColor(attribute.type)} variant="light">
                      {getTypeLabel(attribute.type, t)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {attribute.options && attribute.options.length > 0 ? (
                      <Group gap="xs">
                        <IconList size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size="sm" c="dimmed">{attribute.options.length}</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {attribute.isVisible ? (
                      <Badge size="sm" color="green" variant="light">Yes</Badge>
                    ) : (
                      <Badge size="sm" color="gray" variant="light">No</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => openEditModal(attribute)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(attribute)}
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
        {filteredAttributes.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Text ta="center" c="dimmed">
              {t('catalog.attributesPage.noAttributesFound')}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {filteredAttributes.map((attribute) => (
              <Paper key={attribute.id} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <IconTag size={18} style={{ color: 'var(--mantine-color-blue-6)' }} />
                    <Text fw={600} className="text-sm md:text-base">{attribute.name}</Text>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={() => openEditModal(attribute)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(attribute)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.attributesPage.tableHeaders.displayName')}</Text>
                    <Text size="sm">{attribute.displayName}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.attributesPage.tableHeaders.type')}</Text>
                    <Badge size="sm" color={getTypeBadgeColor(attribute.type)} variant="light">
                      {getTypeLabel(attribute.type, t)}
                    </Badge>
                  </Group>
                  {attribute.options && attribute.options.length > 0 && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">{t('catalog.attributesPage.tableHeaders.options')}</Text>
                      <Group gap="xs">
                        <IconList size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text size="sm">{attribute.options.length}</Text>
                      </Group>
                    </Group>
                  )}
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
              ? t('catalog.attributesPage.form.update')
              : t('catalog.attributesPage.form.create')}
          </Text>
        }
        size="lg"
        centered
        radius="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              required
              label={t('catalog.attributesPage.form.name')}
              placeholder={t('catalog.attributesPage.form.namePlaceholder')}
              description={t('catalog.attributesPage.form.nameDescription')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              error={errors.name}
              size="md"
            />

            <TextInput
              required
              label={t('catalog.attributesPage.form.displayName')}
              placeholder={t('catalog.attributesPage.form.displayNamePlaceholder')}
              description={t('catalog.attributesPage.form.displayNameDescription')}
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              error={errors.displayName}
              size="md"
            />

            <Select
              required
              label={t('catalog.attributesPage.form.type')}
              description={t('catalog.attributesPage.form.typeDescription')}
              data={ATTRIBUTE_TYPES.map(type => ({
                value: type.value,
                label: t(`catalog.attributesPage.form.${type.key}`),
              }))}
              value={formData.type}
              onChange={(value) => {
                setFormData({ ...formData, type: value as Attribute['type'] })
                // Clear options if switching to non-select type
                if (value && !['select', 'multiselect', 'color'].includes(value as Attribute['type'])) {
                  setOptions([])
                }
              }}
              size="md"
            />

            <Group>
              <Switch
                label={t('catalog.attributesPage.form.isRequired')}
                description={t('catalog.attributesPage.form.isRequiredDescription')}
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.currentTarget.checked })}
                size="md"
              />
              <Switch
                label={t('catalog.attributesPage.form.isVisible')}
                description={t('catalog.attributesPage.form.isVisibleDescription')}
                checked={formData.isVisible}
                onChange={(e) => setFormData({ ...formData, isVisible: e.currentTarget.checked })}
                size="md"
              />
            </Group>

            <NumberInput
              label={t('catalog.attributesPage.form.sortOrder')}
              description={t('catalog.attributesPage.form.sortOrderDescription')}
              value={formData.sortOrder}
              onChange={(value) => setFormData({ ...formData, sortOrder: typeof value === 'number' ? value : 0 })}
              min={0}
              size="md"
            />

            {/* Options Section - Only for select/multiselect/color types */}
            {['select', 'multiselect', 'color'].includes(formData.type) && (
              <Stack gap="sm" mt="md">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>{t('catalog.attributesPage.form.options')}</Text>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={addOption}
                  >
                    {t('catalog.attributesPage.form.addOption')}
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">{t('catalog.attributesPage.form.optionsDescription')}</Text>

                {options.map((option, index) => (
                  <Paper key={index} withBorder p="xs" radius="md">
                    <Group gap="xs">
                      <TextInput
                        placeholder={t('catalog.attributesPage.form.optionValue')}
                        value={option.value}
                        onChange={(e) => updateOption(index, 'value', e.target.value)}
                        error={errors[`option_${index}`]}
                        size="sm"
                        styles={{ root: { flex: 1 } }}
                      />
                      <TextInput
                        placeholder={t('catalog.attributesPage.form.optionLabel')}
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        size="sm"
                        styles={{ root: { flex: 1 } }}
                      />
                      {formData.type === 'color' && (
                        <ColorInput
                          placeholder="#000000"
                          value={option.swatchValue}
                          onChange={(value) => updateOption(index, 'swatchValue', value)}
                          size="sm"
                          styles={{ root: { flex: 1, minWidth: 100 } }}
                        />
                      )}
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                size="md"
                onClick={() => {
                  setModalOpened(false)
                  resetForm()
                }}
              >
                {t('catalog.attributesPage.form.cancel')}
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
                size="md"
              >
                {editMode
                  ? t('catalog.attributesPage.form.update')
                  : t('catalog.attributesPage.form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
