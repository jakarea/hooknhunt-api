import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack, Text, Group, Button, Paper, Box, Anchor, Breadcrumbs, Badge, Skeleton, Grid, Image,
} from '@mantine/core'
import { IconChevronRight, IconArrowLeft, IconEdit, IconTrash, IconPhoto, IconLink } from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { getCategory, deleteCategory } from '@/utils/api'
import type { Category } from '@/utils/api'

// ============================================================================
// PURE HELPERS
// ============================================================================

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CategoryDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const removeCategory = useCategoriesStore((s) => s.removeCategory)
  const getCategoryById = useCategoriesStore((s) => s.getCategoryById)

  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return

    const loadCategory = async () => {
      setLoading(true)
      try {
        // Try store first
        const existing = getCategoryById(Number(id))
        if (existing) {
          setCategory(existing)
          setLoading(false)
          return
        }

        // Fetch from API
        const response = await getCategory(Number(id))
        const data = response?.data ?? response
        if (data) setCategory(data)
      } catch {
        notifications.show({
          title: t('common.error'),
          message: t('catalog.categoriesPage.notifications.errorLoading'),
          color: 'red',
        })
        navigate('/catalog/categories')
      } finally {
        setLoading(false)
      }
    }

    loadCategory()
  }, [id, getCategoryById, navigate, t])

  const handleDelete = () => {
    if (!category) return

    modals.openConfirmModal({
      title: t('catalog.categoriesPage.notifications.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('catalog.categoriesPage.notifications.deleteConfirmMessage', { name: category.name })}
        </Text>
      ),
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setDeleting(true)
        try {
          await removeCategory(category.id)
          notifications.show({
            title: t('catalog.categoriesPage.notifications.deleted'),
            message: t('catalog.categoriesPage.notifications.deletedMessage', { name: category.name }),
            color: 'green',
          })
          navigate('/catalog/categories')
        } catch (error: any) {
          notifications.show({
            title: t('catalog.categoriesPage.notifications.errorDeleting'),
            message: error.response?.data?.message || t('common.somethingWentWrong'),
            color: 'red',
          })
        } finally {
          setDeleting(false)
        }
      },
    })
  }

  const breadcrumbs = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('catalog.categoriesPage.title'), href: '/catalog/categories' },
    { title: category?.name || t('common.loading') },
  ].map((item, i) => (
    <Anchor key={i} onClick={() => item.href && navigate(item.href)} style={{ cursor: item.href ? 'pointer' : 'default' }}>
      {item.title}
    </Anchor>
  ))

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="lg">
          <Skeleton height={20} width="30%" />
          <Skeleton height={40} width="60%" />
          <Skeleton height={200} radius="md" />
        </Stack>
      </Box>
    )
  }

  if (!category) return null

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        <Breadcrumbs separator={<IconChevronRight size={16} />}>{breadcrumbs}</Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm">
            {category.image?.url ? (
              <Image src={category.image.url} h={56} w={56} radius="md" fit="cover" />
            ) : (
              <Box
                h={56} w={56}
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px dashed var(--mantine-color-gray-4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPhoto size={28} style={{ color: 'var(--mantine-color-gray-4)' }} />
              </Box>
            )}
            <Stack gap={0}>
              <Group gap="xs">
                <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>{category.name}</Text>
                <Badge color={category.is_active !== false ? 'green' : 'red'} variant="light">
                  {category.is_active !== false ? t('catalog.categoriesPage.active') : t('catalog.categoriesPage.inactive')}
                </Badge>
              </Group>
              <Text className="text-sm md:text-base" c="dimmed">{t('catalog.categoriesPage.subtitle')}</Text>
            </Stack>
          </Group>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/catalog/categories')}>
              {t('common.back')}
            </Button>
            <Button variant="light" leftSection={<IconEdit size={16} />} onClick={() => navigate(`/catalog/categories/${category.id}/edit`)}>
              {t('common.edit')}
            </Button>
            <Button variant="light" color="red" leftSection={<IconTrash size={16} />} loading={deleting} onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </Group>
        </Group>

        {/* Details */}
        <Paper withBorder p="md" radius="md">
          <Group align="flex-start" wrap="nowrap">
            <Stack gap="md" style={{ flex: 1 }}>
              <Text fw={600} size="lg">{t('catalog.categoriesPage.title')}</Text>
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">{t('catalog.categoriesPage.form.name')}</Text>
                  <Text fw={500}>{category.name}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Group gap="xs">
                    <IconLink size={14} />
                    <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.slug')}</Text>
                  </Group>
                  <Text fw={500} className="text-sm">{category.slug}</Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.parent')}</Text>
                  <Text fw={500}>
                    {category.parent
                      ? <Anchor onClick={() => navigate(`/catalog/categories/${category.parent!.id}`)} className="cursor-pointer">{category.parent.name}</Anchor>
                      : t('catalog.categoriesPage.noParent')}
                  </Text>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">{t('catalog.categoriesPage.tableHeaders.products')}</Text>
                  <Anchor fw={500} onClick={() => navigate(`/catalog/products?category=${category.id}`)} className="cursor-pointer">
                    {category.productsCount ?? 0} {t('catalog.categoriesPage.tableHeaders.products')}
                  </Anchor>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">{t('catalog.categoriesPage.form.isActive')}</Text>
                  <Badge color={category.is_active !== false ? 'green' : 'red'} variant="light">
                    {category.is_active !== false ? t('catalog.categoriesPage.active') : t('catalog.categoriesPage.inactive')}
                  </Badge>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Text size="sm" c="dimmed">{t('common.date')}</Text>
                  <Text fw={500} className="text-sm">{formatDate(category.created_at)}</Text>
                </Grid.Col>
              </Grid>
            </Stack>
            {category.image?.url && (
              <Image src={category.image.url} h={160} w={160} radius="md" fit="cover" />
            )}
          </Group>
        </Paper>

        {/* Children Categories */}
        {category.children && category.children.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={600} size="lg">{t('catalog.categoriesPage.childrenCategories', { defaultValue: 'Sub-categories' })}</Text>
              <Group gap="xs">
                {category.children.map((child) => (
                  <Badge
                    key={child.id}
                    variant="light"
                    color="blue"
                    size="lg"
                    className="cursor-pointer"
                    onClick={() => navigate(`/catalog/categories/${child.id}`)}
                  >
                    {child.name}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
