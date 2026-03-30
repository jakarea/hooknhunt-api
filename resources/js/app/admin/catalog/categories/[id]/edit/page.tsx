import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack, Text, Group, Button, Paper, TextInput, Select, Switch, Box, Anchor, Breadcrumbs, Skeleton, Image,
} from '@mantine/core'
import { IconChevronRight, IconArrowLeft, IconPhoto } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { getCategory } from '@/utils/api'

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

interface FormData {
  name: string
  parent_id: number | null
  is_active: boolean
  image_id: number | null
  imageUrl: string | null
}

const createInitialFormData = (): FormData => ({
  name: '',
  parent_id: null,
  is_active: true,
  image_id: null,
  imageUrl: null,
})

const validateForm = (name: string, t: (key: string) => string): Record<string, string> => {
  const errors: Record<string, string> = {}
  if (!name.trim()) errors.name = t('catalog.categoriesPage.form.validation.nameRequired')
  return errors
}

const buildCategoryOptions = (
  tree: { id: number; name: string; children?: any[] }[],
  t: (key: string) => string,
): { value: string; label: string }[] => {
  const options = [{ value: '', label: t('catalog.categoriesPage.noParent') }]

  const addCategory = (category: { id: number; name: string; children?: any[] }, level = 0) => {
    const indent = '━'.repeat(level)
    options.push({ value: String(category.id), label: `${indent} ${category.name}` })
    category.children?.forEach((child) => addCategory(child, level + 1))
  }

  if (Array.isArray(tree)) tree.forEach((cat) => addCategory(cat))

  return options
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditCategoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { openSingleSelect } = useMediaSelector()

  const editCategory = useCategoriesStore((s) => s.editCategory)
  const categoryTree = useCategoriesStore((s) => s.categoryTree)
  const fetchCategoryTree = useCategoriesStore((s) => s.fetchCategoryTree)
  const getCategoryById = useCategoriesStore((s) => s.getCategoryById)

  const [formData, setFormData] = useState<FormData>(createInitialFormData())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const handleSelectImage = () => {
    openSingleSelect((mediaFile: { id: number; url: string }) => {
      setFormData((prev) => ({ ...prev, image_id: mediaFile.id, imageUrl: mediaFile.url }))
    }, formData.image_id ? [formData.image_id] : [])
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image_id: null, imageUrl: null }))
  }

  // Load category tree for parent dropdown
  useEffect(() => {
    fetchCategoryTree()
  }, [fetchCategoryTree])

  // Load category data
  useEffect(() => {
    if (!id) return

    const loadCategory = async () => {
      setPageLoading(true)
      try {
        // Try store first (avoid extra API call)
        const existing = getCategoryById(Number(id))
        if (existing) {
          setFormData({
            name: existing.name || '',
            parent_id: existing.parent_id ?? null,
            is_active: existing.is_active ?? true,
            image_id: existing.image_id ?? null,
            imageUrl: existing.image?.url ?? null,
          })
          return
        }

        // Fetch from API if not in store
        const response = await getCategory(Number(id))
        const categoryData = response?.data ?? response

        if (categoryData) {
          setFormData({
            name: categoryData.name || '',
            parent_id: categoryData.parent_id ?? null,
            is_active: categoryData.is_active ?? true,
            image_id: categoryData.image_id ?? null,
            imageUrl: categoryData.image?.url ?? null,
          })
        }
      } catch {
        notifications.show({
          title: t('common.error'),
          message: t('catalog.categoriesPage.notifications.errorLoading'),
          color: 'red',
        })
        navigate('/catalog/categories')
      } finally {
        setPageLoading(false)
      }
    }

    loadCategory()
  }, [id, getCategoryById, navigate, t])

  const parentOptions = useMemo(() => buildCategoryOptions(categoryTree, t), [categoryTree, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm(formData.name, t)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await editCategory(Number(id), {
        name: formData.name,
        parent_id: formData.parent_id || undefined,
        is_active: formData.is_active,
        image_id: formData.image_id || undefined,
      })

      notifications.show({
        title: t('catalog.categoriesPage.notifications.updated'),
        message: t('catalog.categoriesPage.notifications.updatedMessage', { name: formData.name }),
        color: 'green',
      })
      navigate('/catalog/categories')
    } catch (error: any) {
      notifications.show({
        title: t('catalog.categoriesPage.notifications.errorUpdating'),
        message: error.response?.data?.message || t('common.somethingWentWrong'),
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const breadcrumbs = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('catalog.categoriesPage.title'), href: '/catalog/categories' },
    { title: t('catalog.categoriesPage.form.update') },
  ].map((item, i) => (
    <Anchor key={i} onClick={() => item.href && navigate(item.href)} style={{ cursor: item.href ? 'pointer' : 'default' }}>
      {item.title}
    </Anchor>
  ))

  if (pageLoading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="lg">
          <Skeleton height={20} width="30%" />
          <Skeleton height={40} width="60%" />
          <Skeleton height={40} width="100%" />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <Breadcrumbs separator={<IconChevronRight size={16} />}>{breadcrumbs}</Breadcrumbs>

          <Group justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Text className="text-lg md:text-xl lg:text-2xl" fw={600}>{t('catalog.categoriesPage.form.update')}</Text>
              <Text className="text-sm md:text-base" c="dimmed">{t('catalog.categoriesPage.subtitle')}</Text>
            </Stack>
            <Group gap="sm">
              <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/catalog/categories')}>
                {t('common.back')}
              </Button>
              <Button type="submit" loading={submitting}>{t('catalog.categoriesPage.form.update')}</Button>
            </Group>
          </Group>

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">{t('catalog.categoriesPage.form.update')}</Text>

              <TextInput
                required
                label={t('catalog.categoriesPage.form.name')}
                placeholder={t('catalog.categoriesPage.form.namePlaceholder')}
                description={t('catalog.categoriesPage.form.nameDescription')}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                error={errors.name}
                size="md"
              />

              <Select
                label={t('catalog.categoriesPage.form.parent')}
                placeholder={t('catalog.categoriesPage.form.parentPlaceholder')}
                description={t('catalog.categoriesPage.form.parentDescription')}
                data={parentOptions}
                value={formData.parent_id ? String(formData.parent_id) : ''}
                onChange={(value) => setFormData({ ...formData, parent_id: value ? Number(value) : null })}
                clearable
                searchable
                size="md"
              />

              <Switch
                label={t('catalog.categoriesPage.form.isActive')}
                description={t('catalog.categoriesPage.form.isActiveDescription')}
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
                size="md"
              />

              {/* Category Image */}
              <Box>
                <Text size="sm" fw={500} mb={4}>{t('catalog.categoriesPage.form.imageId')}</Text>
                <Text size="xs" c="dimmed" mb="xs">{t('catalog.categoriesPage.form.imageIdDescription')}</Text>
                {formData.imageUrl ? (
                  <Group gap="sm" align="flex-start">
                    <Image src={formData.imageUrl} h={80} w={80} radius="md" fit="cover" />
                    <Stack gap={4}>
                      <Button size="xs" variant="light" onClick={handleSelectImage}>
                        {t('common.edit')}
                      </Button>
                      <Button size="xs" variant="light" color="red" onClick={handleRemoveImage}>
                        {t('common.remove')}
                      </Button>
                    </Stack>
                  </Group>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPhoto size={14} />}
                    onClick={handleSelectImage}
                  >
                    {t('catalog.categoriesPage.form.imageId')}
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Box>
  )
}
