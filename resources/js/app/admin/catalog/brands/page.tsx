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
  Card,
  ActionIcon,
  Table,
  Skeleton,
  Alert,
  Modal,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconWorld,
  IconPhoto,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { getBrands, createBrand, updateBrand, deleteBrand, type Brand } from '@/utils/api'

export default function BrandsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    logoId: null as number | null,
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch brands
  const fetchBrands = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await getBrands({
        search: debouncedSearch || undefined,
        page: 1,
        per_page: 50,
      })

      // Handle multiple possible response structures
      let brandsData: Brand[] = []

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status && response.data) {
          const data = response.data
          if (typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            brandsData = data.data
          } else if (Array.isArray(data)) {
            brandsData = data
          }
        }
      } else if (Array.isArray(response)) {
        brandsData = response
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        brandsData = response.data
      }

      setBrands(brandsData)
    } catch (error) {
      notifications.show({
        title: t('catalog.brandsPage.notifications.errorLoading'),
        message: t('common.somethingWentWrong'),
        color: 'red',
      })
      setBrands([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearch, t])

  useEffect(() => {
    fetchBrands(true)
  }, [fetchBrands])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      website: '',
      logoId: null,
    })
    setErrors({})
    setEditMode(false)
    setCurrentBrand(null)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (brand: Brand) => {
    setFormData({
      name: brand.name || '',
      website: brand.website || '',
      logoId: brand.logoId || null,
    })
    setEditMode(true)
    setCurrentBrand(brand)
    setModalOpened(true)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('catalog.brandsPage.form.validation.nameRequired')
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = t('catalog.brandsPage.form.validation.urlInvalid')
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
        website: formData.website || undefined,
        logoId: formData.logoId || undefined,
      }

      if (editMode && currentBrand) {
        await updateBrand(currentBrand.id, dataToSend)
        notifications.show({
          title: t('catalog.brandsPage.notifications.updated'),
          message: t('catalog.brandsPage.notifications.updatedMessage', { name: formData.name }),
          color: 'green',
        })
      } else {
        await createBrand(dataToSend)
        notifications.show({
          title: t('catalog.brandsPage.notifications.created'),
          message: t('catalog.brandsPage.notifications.createdMessage', { name: formData.name }),
          color: 'green',
        })
      }

      setModalOpened(false)
      resetForm()
      await fetchBrands(false)
    } catch (error: any) {
      notifications.show({
        title: editMode
          ? t('catalog.brandsPage.notifications.errorUpdating')
          : t('catalog.brandsPage.notifications.errorCreating'),
        message: error.response?.data?.message || t('common.somethingWentWrong'),
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = (brand: Brand) => {
    modals.openConfirmModal({
      title: t('catalog.brandsPage.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('catalog.brandsPage.notifications.deleteConfirmMessage', { name: brand.name })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteBrand(brand.id)
          notifications.show({
            title: t('catalog.brandsPage.notifications.deleted'),
            message: t('catalog.brandsPage.notifications.deletedMessage', { name: brand.name }),
            color: 'green',
          })
          await fetchBrands(false)
        } catch (error) {
          notifications.show({
            title: t('catalog.brandsPage.notifications.errorDeleting'),
            message: t('common.somethingWentWrong'),
            color: 'red',
          })
        }
      },
    })
  }

  // Refresh
  const handleRefresh = () => {
    fetchBrands(false)
    notifications.show({
      title: t('catalog.brandsPage.notifications.refreshed'),
      message: t('catalog.brandsPage.notifications.refreshedMessage'),
      color: 'blue',
    })
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
          <Group gap="xs">
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
              {t('catalog.brandsPage.title')}
            </Text>
          </Group>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('catalog.brandsPage.subtitle')}
          </Text>
        </div>
        <Button
          onClick={openCreateModal}
          leftSection={<IconPlus size={16} />}
        >
          {t('catalog.brandsPage.addBrand')}
        </Button>
      </Group>

      {/* Filters */}
      <Paper withBorder p={{ base: 'xs', md: 'md' }} radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('catalog.brandsPage.searchPlaceholder')}
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

      {/* Table View */}
      <Paper withBorder p="0" radius="md">
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('catalog.brandsPage.tableHeaders.name')}</Table.Th>
              <Table.Th>{t('catalog.brandsPage.tableHeaders.slug')}</Table.Th>
              <Table.Th>{t('catalog.brandsPage.tableHeaders.website')}</Table.Th>
              <Table.Th className="text-right">{t('catalog.brandsPage.tableHeaders.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {brands.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center" c="dimmed" py="xl">
                    {t('catalog.brandsPage.noBrandsFound')}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              brands.map((brand) => (
                <Table.Tr key={brand.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">{brand.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{brand.slug}</Text>
                  </Table.Td>
                  <Table.Td>
                    {brand.website ? (
                      <Group gap="xs">
                        <IconWorld size={14} c="dimmed" />
                        <Text size="sm" truncate style={{ maxWidth: 200 }}>
                          {brand.website}
                        </Text>
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => openEditModal(brand)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(brand)}
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
              ? t('catalog.brandsPage.form.update')
              : t('catalog.brandsPage.form.create')}
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
              label={t('catalog.brandsPage.form.name')}
              placeholder={t('catalog.brandsPage.form.namePlaceholder')}
              description={t('catalog.brandsPage.form.nameDescription')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              size="md"
            />

            <TextInput
              leftSection={<IconWorld size={18} />}
              label={t('catalog.brandsPage.form.website')}
              placeholder={t('catalog.brandsPage.form.websitePlaceholder')}
              description={t('catalog.brandsPage.form.websiteDescription')}
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              error={errors.website}
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
                {t('catalog.brandsPage.form.cancel')}
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
                size="md"
              >
                {editMode
                  ? t('catalog.brandsPage.form.update')
                  : t('catalog.brandsPage.form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
