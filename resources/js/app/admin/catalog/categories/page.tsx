import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
  Alert,
  Modal,
  Select,
  Switch,
  Badge,
  Anchor,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconFolder,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import {
  getCategories,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/utils/api'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    parent_id: null as number | null,
    image_id: null as number | null,
    is_active: true,
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch categories
  const fetchCategories = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await getCategories({
        search: debouncedSearch || undefined,
        page: 1,
        per_page: 50,
      })

      // Handle multiple possible response structures
      let categoriesData: Category[] = []

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status && response.data) {
          const data = response.data
          if (typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            categoriesData = data.data
          } else if (Array.isArray(data)) {
            categoriesData = data
          }
        }
      } else if (Array.isArray(response)) {
        categoriesData = response
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        categoriesData = response.data
      }

      setCategories(categoriesData)
    } catch (error) {
      notifications.show({
        title: t('catalog.categoriesPage.notifications.errorLoading'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
      setCategories([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearch, t])

  // Fetch category tree for parent dropdown
  const fetchCategoryTree = useCallback(async () => {
    try {
      const response = await getCategoryTree()

      // Handle multiple possible response structures
      let treeData: Category[] = []

      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          treeData = response
        } else if ('data' in response && Array.isArray(response.data)) {
          treeData = response.data
        } else if ('status' in response && response.data && Array.isArray(response.data)) {
          treeData = response.data
        }
      }

      setCategoryTree(treeData)
    } catch (error) {
      console.error('Failed to load category tree:', error)
      setCategoryTree([])
    }
  }, [])

  useEffect(() => {
    fetchCategories(true)
    fetchCategoryTree()
  }, [fetchCategories, fetchCategoryTree])

  // Build flat list of categories for Select dropdown with hierarchy indicator
  const buildCategoryOptions = (): { value: string; label: string }[] => {
    const options = [{ value: '', label: t('catalog.categoriesPage.noParent') }]

    const addCategory = (category: Category, level = 0) => {
      const indent = '━'.repeat(level)
      options.push({
        value: String(category.id),
        label: `${indent} ${category.name}`,
      })

      if (category.children && category.children.length > 0) {
        category.children.forEach((child) => addCategory(child, level + 1))
      }
    }

    // Safety check: ensure categoryTree is an array
    if (Array.isArray(categoryTree)) {
      categoryTree.forEach((category) => addCategory(category))
    }

    return options
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      parent_id: null,
      image_id: null,
      is_active: true,
    })
    setErrors({})
    setEditMode(false)
    setCurrentCategory(null)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (category: Category) => {
    setFormData({
      name: category.name || '',
      parent_id: category.parent_id || null,
      image_id: category.image_id || null,
      is_active: category.is_active ?? true,
    })
    setEditMode(true)
    setCurrentCategory(category)
    setModalOpened(true)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.categoriesPage.form.validation.nameRequired')
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
        parent_id: formData.parent_id || undefined,
        image_id: formData.image_id || undefined,
        is_active: formData.is_active,
      }

      if (editMode && currentCategory) {
        await updateCategory(currentCategory.id, dataToSend)
        notifications.show({
          title: t('catalog.categoriesPage.notifications.updated'),
          message: t('catalog.categoriesPage.notifications.updatedMessage', { name: formData.name }),
          color: 'green',
        })
      } else {
        await createCategory(dataToSend)
        notifications.show({
          title: t('catalog.categoriesPage.notifications.created'),
          message: t('catalog.categoriesPage.notifications.createdMessage', { name: formData.name }),
          color: 'green',
        })
      }

      setModalOpened(false)
      resetForm()
      await fetchCategories(false)
      await fetchCategoryTree()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')

      notifications.show({
        title: editMode
          ? t('catalog.categoriesPage.notifications.errorUpdating')
          : t('catalog.categoriesPage.notifications.errorCreating'),
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = (category: Category) => {
    modals.openConfirmModal({
      title: t('catalog.categoriesPage.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('catalog.categoriesPage.notifications.deleteConfirmMessage', { name: category.name })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteCategory(category.id)
          notifications.show({
            title: t('catalog.categoriesPage.notifications.deleted'),
            message: t('catalog.categoriesPage.notifications.deletedMessage', { name: category.name }),
            color: 'green',
          })
          await fetchCategories(false)
          await fetchCategoryTree()
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || t('common.somethingWentWrong')
          notifications.show({
            title: t('catalog.categoriesPage.notifications.errorDeleting'),
            message: errorMessage,
            color: 'red',
          })
        }
      },
    })
  }

  // Refresh
  const handleRefresh = () => {
    fetchCategories(false)
    fetchCategoryTree()
    notifications.show({
      title: t('catalog.categoriesPage.notifications.refreshed'),
      message: t('catalog.categoriesPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }

  // Get parent category name
  const getParentName = (category: Category): string => {
    if (!category.parent) return t('catalog.categoriesPage.noParent')
    return category.parent.name
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
            {t('catalog.categoriesPage.title')}
          </Text>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('catalog.categoriesPage.subtitle')}
          </Text>
        </div>
        <Button
          onClick={openCreateModal}
          leftSection={<IconPlus size={16} />}
        >
          {t('catalog.categoriesPage.addCategory')}
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p={{ base: 'xs', md: 'md' }} radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('catalog.categoriesPage.searchPlaceholder')}
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
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.name')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.slug')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.parent')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.products')}</Table.Th>
              <Table.Th className="text-right">{t('catalog.categoriesPage.tableHeaders.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categories.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">
                    {t('catalog.categoriesPage.noCategoriesFound')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              categories.map((category) => (
                <Table.Tr key={category.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconFolder size={16} c="blue" />
                      <Text fw={600} size="sm">{category.name}</Text>
                      {category.is_active === false && (
                        <Badge size="xs" color="red" variant="light">
                          {t('catalog.categoriesPage.inactive')}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" className="hidden lg:block">{category.slug}</Text>
                    <Text size="sm" c="dimmed" className="lg:hidden">...</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{getParentName(category)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Anchor
                      size="sm"
                      onClick={() => navigate(`/catalog/products?category=${category.id}`)}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      <Text fw={500}>
                        {category.products_count ?? 0}
                      </Text>
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => openEditModal(category)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(category)}
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
        {categories.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Text ta="center" c="dimmed">
              {t('catalog.categoriesPage.noCategoriesFound')}
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {categories.map((category) => (
              <Paper key={category.id} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <IconFolder size={18} c="blue" />
                    <Text fw={600} className="text-sm md:text-base">{category.name}</Text>
                    {category.is_active === false && (
                      <Badge size="xs" color="red" variant="light">
                        {t('catalog.categoriesPage.inactive')}
                      </Badge>
                    )}
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={() => openEditModal(category)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(category)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.slug')}</Text>
                    <Text size="sm" truncate className="max-w-[150px]">{category.slug}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.parent')}</Text>
                    <Text size="sm">{getParentName(category)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.products')}</Text>
                    <Anchor
                      size="sm"
                      onClick={() => navigate(`/catalog/products?category=${category.id}`)}
                    >
                      <Text fw={500}>{category.products_count ?? 0}</Text>
                    </Anchor>
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
              ? t('catalog.categoriesPage.form.update')
              : t('catalog.categoriesPage.form.create')}
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
              label={t('catalog.categoriesPage.form.name')}
              placeholder={t('catalog.categoriesPage.form.namePlaceholder')}
              description={t('catalog.categoriesPage.form.nameDescription')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              size="md"
            />

            <Select
              label={t('catalog.categoriesPage.form.parent')}
              placeholder={t('catalog.categoriesPage.form.parentPlaceholder')}
              description={t('catalog.categoriesPage.form.parentDescription')}
              data={buildCategoryOptions()}
              value={formData.parent_id ? String(formData.parent_id) : ''}
              onChange={(value) => setFormData({ ...formData, parent_id: value ? Number(value) : null })}
              clearable
              size="md"
              searchable
            />

            <Switch
              label={t('catalog.categoriesPage.form.isActive')}
              description={t('catalog.categoriesPage.form.isActiveDescription')}
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
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
                {t('catalog.categoriesPage.form.cancel')}
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
                size="md"
              >
                {editMode
                  ? t('catalog.categoriesPage.form.update')
                  : t('catalog.categoriesPage.form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
