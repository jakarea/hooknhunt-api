import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Paper, TextInput, Button, Stack, Group, Text, Box,
  Table, Skeleton, Badge, Anchor, Image,
} from '@mantine/core'
import {
  IconSearch, IconRefresh, IconPlus, IconPhoto,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { useCategoriesStore } from '@/stores/categoriesStore'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)

  // Store selectors - only subscribe to what's needed
  const categories = useCategoriesStore((s) => s.categories)
  const loading = useCategoriesStore((s) => s.loading)
  const fetchCategories = useCategoriesStore((s) => s.fetchCategories)
  // Fetch categories on search change
  useEffect(() => {
    fetchCategories({ search: debouncedSearch || undefined, page: 1, per_page: 50 })
  }, [debouncedSearch, fetchCategories])

  // Initial load
  useEffect(() => {
    fetchCategories({ page: 1, per_page: 50 })
  }, [fetchCategories])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    fetchCategories({ search: debouncedSearch || undefined, page: 1, per_page: 50 }).finally(() => setRefreshing(false))
    notifications.show({
      title: t('catalog.categoriesPage.notifications.refreshed'),
      message: t('catalog.categoriesPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }, [debouncedSearch, fetchCategories, t])

  // Helper
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
          onClick={() => navigate('/catalog/categories/create')}
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
              <Table.Th w={50}></Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.name')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.slug')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.parent')}</Table.Th>
              <Table.Th>{t('catalog.categoriesPage.tableHeaders.products')}</Table.Th>
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
                    {category.image?.url ? (
                      <Image src={category.image.url} h={36} w={36} radius="sm" fit="cover" />
                    ) : (
                      <Box
                        h={36} w={36}
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          border: '1px dashed var(--mantine-color-gray-4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconPhoto size={18} style={{ color: 'var(--mantine-color-gray-4)' }} />
                      </Box>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Anchor
                        fw={600}
                        size="sm"
                        onClick={() => navigate(`/catalog/categories/${category.id}`)}
                        className="cursor-pointer"
                      >
                        {category.name}
                      </Anchor>
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
                      className="cursor-pointer"
                    >
                      <Text fw={500}>{category.productsCount ?? 0}</Text>
                    </Anchor>
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
                    {category.image?.url ? (
                      <Image src={category.image.url} h={32} w={32} radius="sm" fit="cover" />
                    ) : (
                      <Box
                        h={32} w={32}
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          border: '1px dashed var(--mantine-color-gray-4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconPhoto size={16} style={{ color: 'var(--mantine-color-gray-4)' }} />
                      </Box>
                    )}
                    <Anchor
                      fw={600}
                      className="text-sm md:text-base"
                      onClick={() => navigate(`/catalog/categories/${category.id}`)}
                    >
                      {category.name}
                    </Anchor>
                    {category.is_active === false && (
                      <Badge size="xs" color="red" variant="light">
                        {t('catalog.categoriesPage.inactive')}
                      </Badge>
                    )}
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
                      <Text fw={500}>{category.productsCount ?? 0}</Text>
                    </Anchor>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
