'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Button,
  TextInput,
  Select,
  Breadcrumbs,
  Anchor,
  Card,
  Badge,
  ActionIcon,
  Modal,
  NumberInput,
  Switch,
  ColorInput,
  SimpleGrid,
  Divider,
  Tooltip,
  rem
} from '@mantine/core'
import {
  IconTag,
  IconPlus,
  IconEdit,
  IconTrash,
  IconGripVertical,
  IconDots,
  IconX,
  IconChevronDown,
  IconColorPicker,
  IconShirt,
  IconRuler
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'

// Types
interface VariantAttributeOption {
  id: string
  value: string
  label: string
  swatchValue?: string
  sortOrder: number
}

interface VariantAttribute {
  id: string
  name: string
  displayName: string
  type: 'select' | 'color'
  isRequired: boolean
  sortOrder: number
  options: VariantAttributeOption[]
}

// Static data for demo
const staticAttributes: VariantAttribute[] = [
  {
    id: '1',
    name: 'size',
    displayName: 'Size',
    type: 'select',
    isRequired: true,
    sortOrder: 1,
    options: [
      { id: '1-1', value: 'xs', label: 'XS', sortOrder: 1 },
      { id: '1-2', value: 's', label: 'S', sortOrder: 2 },
      { id: '1-3', value: 'm', label: 'M', sortOrder: 3 },
      { id: '1-4', value: 'l', label: 'L', sortOrder: 4 },
      { id: '1-5', value: 'xl', label: 'XL', sortOrder: 5 },
      { id: '1-6', value: 'xxl', label: 'XXL', sortOrder: 6 },
    ]
  },
  {
    id: '2',
    name: 'color',
    displayName: 'Color',
    type: 'color',
    isRequired: true,
    sortOrder: 2,
    options: [
      { id: '2-1', value: 'red', label: 'Red', swatchValue: '#EF4444', sortOrder: 1 },
      { id: '2-2', value: 'blue', label: 'Blue', swatchValue: '#3B82F6', sortOrder: 2 },
      { id: '2-3', value: 'green', label: 'Green', swatchValue: '#10B981', sortOrder: 3 },
      { id: '2-4', value: 'yellow', label: 'Yellow', swatchValue: '#F59E0B', sortOrder: 4 },
      { id: '2-5', value: 'black', label: 'Black', swatchValue: '#000000', sortOrder: 5 },
      { id: '2-6', value: 'white', label: 'White', swatchValue: '#FFFFFF', sortOrder: 6 },
    ]
  },
  {
    id: '3',
    name: 'material',
    displayName: 'Material',
    type: 'select',
    isRequired: false,
    sortOrder: 3,
    options: [
      { id: '3-1', value: 'cotton', label: 'Cotton', sortOrder: 1 },
      { id: '3-2', value: 'silk', label: 'Silk', sortOrder: 2 },
      { id: '3-3', value: 'leather', label: 'Leather', sortOrder: 3 },
      { id: '3-4', value: 'wool', label: 'Wool', sortOrder: 4 },
      { id: '3-5', value: 'polyester', label: 'Polyester', sortOrder: 5 },
    ]
  },
  {
    id: '4',
    name: 'pattern',
    displayName: 'Pattern',
    type: 'select',
    isRequired: false,
    sortOrder: 4,
    options: [
      { id: '4-1', value: 'solid', label: 'Solid', sortOrder: 1 },
      { id: '4-2', value: 'striped', label: 'Striped', sortOrder: 2 },
      { id: '4-3', value: 'checked', label: 'Checked', sortOrder: 3 },
      { id: '4-4', value: 'floral', label: 'Floral', sortOrder: 4 },
    ]
  }
]

export default function VariantAttributesPage() {
  const { t } = useTranslation()
  const [attributes, setAttributes] = useState<VariantAttribute[]>(staticAttributes)
  const [modalOpened, setModalOpened] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<VariantAttribute | null>(null)
  const [deleteModalOpened, setDeleteModalOpened] = useState(false)
  const [attributeToDelete, setAttributeToDelete] = useState<VariantAttribute | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: 'select' as 'select' | 'color',
    isRequired: false,
    sortOrder: 0
  })

  // Options form state
  const [options, setOptions] = useState<VariantAttributeOption[]>([])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      type: 'select',
      isRequired: false,
      sortOrder: 0
    })
    setOptions([])
    setEditingAttribute(null)
  }

  // Open add modal
  const handleAdd = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const handleEdit = (attribute: VariantAttribute) => {
    setEditingAttribute(attribute)
    setFormData({
      name: attribute.name,
      displayName: attribute.displayName,
      type: attribute.type,
      isRequired: attribute.isRequired,
      sortOrder: attribute.sortOrder
    })
    setOptions([...attribute.options])
    setModalOpened(true)
  }

  // Open delete confirmation
  const handleDeleteClick = (attribute: VariantAttribute) => {
    setAttributeToDelete(attribute)
    setDeleteModalOpened(true)
  }

  // Confirm delete
  const confirmDelete = () => {
    if (attributeToDelete) {
      setAttributes(attributes.filter(a => a.id !== attributeToDelete.id))
      notifications.show({
        title: 'Success',
        message: `"${attributeToDelete.displayName}" has been deleted`,
        color: 'green'
      })
      setDeleteModalOpened(false)
      setAttributeToDelete(null)
    }
  }

  // Save attribute (create or update)
  const handleSave = () => {
    if (!formData.name || !formData.displayName) {
      notifications.show({
        title: 'Validation Error',
        message: 'Name and Display Name are required',
        color: 'red'
      })
      return
    }

    if (editingAttribute) {
      // Update existing
      setAttributes(attributes.map(attr =>
        attr.id === editingAttribute.id
          ? {
              ...attr,
              ...formData,
              options: options
            }
          : attr
      ))
      notifications.show({
        title: 'Success',
        message: `"${formData.displayName}" has been updated`,
        color: 'green'
      })
    } else {
      // Create new
      const newAttribute: VariantAttribute = {
        id: Date.now().toString(),
        ...formData,
        options: options
      }
      setAttributes([...attributes, newAttribute])
      notifications.show({
        title: 'Success',
        message: `"${formData.displayName}" has been created`,
        color: 'green'
      })
    }

    setModalOpened(false)
    resetForm()
  }

  // Add new option
  const handleAddOption = () => {
    const newOption: VariantAttributeOption = {
      id: `new-${Date.now()}`,
      value: '',
      label: '',
      swatchValue: formData.type === 'color' ? '#000000' : undefined,
      sortOrder: options.length + 1
    }
    setOptions([...options, newOption])
  }

  // Update option
  const handleUpdateOption = (id: string, field: keyof VariantAttributeOption, value: any) => {
    setOptions(options.map(opt =>
      opt.id === id ? { ...opt, [field]: value } : opt
    ))
  }

  // Remove option
  const handleRemoveOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id))
  }

  // Get attribute icon based on name/type
  const getAttributeIcon = (attribute: VariantAttribute) => {
    if (attribute.name === 'size') return <IconRuler size={20} />
    if (attribute.name === 'color') return <IconColorPicker size={20} />
    if (attribute.name === 'material' || attribute.name === 'pattern') return <IconShirt size={20} />
    return <IconTag size={20} />
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor href="/admin/catalog">Catalog</Anchor>
          <Text>Variant Attributes</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconTag size={32} className="text-blue-600" />
            <div>
              <Title order={1}>Variant Attributes</Title>
              <Text size="sm" c="dimmed">
                Manage variant options like Size, Color, Material for products
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleAdd}
          >
            Add Attribute
          </Button>
        </Group>

        {/* Info Banner */}
        <Paper withBorder p="md" bg="blue.0">
          <Group>
            <IconColorPicker size={20} className="text-blue-600" />
            <Text size="sm">
              <strong>Tip:</strong> These attributes are used to create product variants.
              Define options here, then use them when creating product variants.
            </Text>
          </Group>
        </Paper>

        {/* Attributes List */}
        <Stack gap="md">
          {attributes.map((attribute) => (
            <Card key={attribute.id} withBorder shadow="sm">
              <Stack gap="sm">
                {/* Attribute Header */}
                <Group justify="space-between">
                  <Group gap="md">
                    <ActionIcon
                      variant="light"
                      size="lg"
                      className="cursor-grab"
                    >
                      <IconGripVertical size={20} className="text-gray-400" />
                    </ActionIcon>
                    <Box className="text-blue-600">
                      {getAttributeIcon(attribute)}
                    </Box>
                    <div>
                      <Group gap="xs">
                        <Text className="text-base md:text-lg" fw={600}>
                          {attribute.displayName}
                        </Text>
                        {attribute.isRequired && (
                          <Badge size="xs" color="red" variant="light">Required</Badge>
                        )}
                        <Badge size="xs" color={attribute.type === 'color' ? 'grape' : 'blue'} variant="light">
                          {attribute.type === 'color' ? 'Color' : 'Select'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">Code: {attribute.name}</Text>
                    </div>
                  </Group>
                  <Group gap="xs">
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEdit(attribute)}
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteClick(attribute)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                {/* Options Display */}
                <Box>
                  <Text size="sm" fw={500} mb="xs">
                    Options ({attribute.options.length})
                  </Text>
                  <SimpleGrid
                    cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
                    spacing="xs"
                  >
                    {attribute.options.map((option) => (
                      <Badge
                        key={option.id}
                        leftSection={
                          attribute.type === 'color' && option.swatchValue ? (
                            <Box
                              w={12}
                              h={12}
                              style={{
                                backgroundColor: option.swatchValue,
                                border: '1px solid #e5e7eb',
                                borderRadius: '2px'
                              }}
                            />
                          ) : null
                        }
                        variant="light"
                        size="lg"
                        style={{ justifyContent: 'flex-start' }}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </SimpleGrid>
                </Box>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Text fw={600}>
            {editingAttribute ? 'Edit Attribute' : 'Add New Attribute'}
          </Text>
        }
        size="lg"
      >
        <Stack gap="md">
          {/* Basic Fields */}
          <TextInput
            label="Display Name*"
            placeholder="e.g., Size, Color, Material"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.currentTarget.value })}
            description="User-friendly name shown in UI"
          />

          <TextInput
            label="Code Name*"
            placeholder="e.g., size, color, material"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value.toLowerCase().replace(/\s+/g, '_') })}
            description="Internal code (lowercase, underscores)"
          />

          <Select
            label="Type*"
            data={[
              { value: 'select', label: 'Select (Dropdown)' },
              { value: 'color', label: 'Color (with Swatches)' }
            ]}
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: (value as 'select' | 'color') || 'select' })}
          />

          <Group>
            <Switch
              label="Required"
              checked={formData.isRequired}
              onChange={(e) => setFormData({ ...formData, isRequired: e.currentTarget.checked })}
              description="Must be selected when creating variants"
            />
            <NumberInput
              label="Sort Order"
              value={formData.sortOrder}
              onChange={(value) => setFormData({ ...formData, sortOrder: value || 0 })}
              min={0}
              w={120}
            />
          </Group>

          <Divider label="Options" labelPosition="center" />

          {/* Options List */}
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" fw={500}>Options ({options.length})</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={handleAddOption}
              >
                Add Option
              </Button>
            </Group>

            {options.length === 0 ? (
              <Paper withBorder p="xl" bg="gray.0">
                <Text c="dimmed" ta="center" size="sm">
                  No options added yet. Click "Add Option" to create one.
                </Text>
              </Paper>
            ) : (
              <Stack gap="xs">
                {options.map((option, index) => (
                  <Paper key={option.id} withBorder p="xs" bg="gray.0">
                    <Group>
                      <IconGripVertical size={16} className="text-gray-400" />
                      <Badge size="sm" variant="light">{index + 1}</Badge>

                      <SimpleGrid cols={{ base: 1, md: formData.type === 'color' ? 3 : 2 }} style={{ flex: 1 }}>
                        <TextInput
                          placeholder="Value (e.g., red, s)"
                          label="Value"
                          size="xs"
                          value={option.value}
                          onChange={(e) => handleUpdateOption(option.id, 'value', e.currentTarget.value)}
                        />
                        <TextInput
                          placeholder="Label (e.g., Red, Small)"
                          label="Label"
                          size="xs"
                          value={option.label}
                          onChange={(e) => handleUpdateOption(option.id, 'label', e.currentTarget.value)}
                        />
                        {formData.type === 'color' && (
                          <ColorInput
                            label="Swatch Color"
                            size="xs"
                            value={option.swatchValue}
                            onChange={(value) => handleUpdateOption(option.id, 'swatchValue', value)}
                          />
                        )}
                      </SimpleGrid>

                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => handleRemoveOption(option.id)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAttribute ? 'Update' : 'Create'} Attribute
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title={
          <Text fw={600}>Delete Attribute?</Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete <strong>"{attributeToDelete?.displayName}"</strong>?
          </Text>
          <Text size="sm" c="red">
            This will also remove all {attributeToDelete?.options.length} options associated with this attribute.
            This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setDeleteModalOpened(false)}
            >
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
