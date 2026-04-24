'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Table,
  Badge,
  Button,
  ActionIcon,
  TextInput,
  Select,
  Skeleton,
  Alert,
  Card,
  SimpleGrid,
  Flex,
  Image,
  Tooltip,
  Menu,
  Switch,
  Anchor,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconPhoto,
  IconCopy,
  IconTrash,
  IconEdit,
  IconEye,
  IconPackages,
  IconAlertCircle,
  IconDots,
  IconCube,
  IconGripVertical,
} from '@tabler/icons-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { modals } from '@mantine/modals'
import {
  getProducts,
  deleteProduct,
  duplicateProduct,
  updateProductStatus,
  getCategoriesDropdown,
  getBrandsDropdown,
  reorderProducts,
  type Product,
  type ProductFilters,
  type ProductSortBy,
} from '@/utils/api'

type StatusType = 'all' | 'draft' | 'published' | 'archived'

type SortByType = ProductSortBy | 'all'

export default function ProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission, isSuperAdmin } = usePermissions()

  // Permission check
  if (!isSuperAdmin() && !hasPermission('catalog.products.view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3} className="text-xl md:text-2xl">{t('common.accessDenied')}</Title>
          <Text c="dimmed" className="text-sm md:text-base">{t('catalog.productsPage.accessDenied')}</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [brands, setBrands] = useState<Array<{ value: string; label: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useState<StatusType>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortByType>('all')
  const [pagination, setPagination] = useState({ page: 1, total: 0, perPage: 100 })
  const [duplicatedProductId, setDuplicatedProductId] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const filters: ProductFilters = {
        search: debouncedSearch || undefined,
        category_id: categoryFilter ? parseInt(categoryFilter) : undefined,
        brand_id: brandFilter ? parseInt(brandFilter) : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort_by: sortBy === 'all' ? undefined : sortBy,
        per_page: pagination.perPage,
        page: pagination.page,
      }

      const response = await getProducts(filters)

      // Handle paginated response
      if (response.data) {
        setProducts(response.data.data || response.data)
        if (response.data.total) {
          setPagination((prev) => ({ ...prev, total: response.data.total }))
        }
      } else {
        setProducts(response.data || [])
      }
    } catch (error) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('catalog.productsPage.notification.fetchError') || 'Failed to load products',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter, brandFilter, statusFilter, sortBy, pagination.page])

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        getCategoriesDropdown(),
        getBrandsDropdown(),
      ])

      if (catsRes.data) {
        setCategories(catsRes.data.map((c: any) => ({ value: c.id.toString(), label: c.name })))
      }

      if (brandsRes.data) {
        setBrands(brandsRes.data.map((b: any) => ({ value: b.id.toString(), label: b.name })))
      }
    } catch (error) {
      console.error('Failed to load dropdown data:', error)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  // Read category from URL params on mount
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    if (categoryFromUrl) {
      setCategoryFilter(categoryFromUrl)
    }
  }, [searchParams])

  // Update URL when category filter changes
  useEffect(() => {
    if (categoryFilter) {
      setSearchParams({ category: categoryFilter })
    } else {
      setSearchParams({})
    }
  }, [categoryFilter, setSearchParams])

  // Handle publish/draft toggle (immediate update with revert on error)
  const handlePublishToggle = async (productId: number, currentStatus: string) => {
    if (!isSuperAdmin() && !hasPermission('catalog.products.update')) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'You do not have permission to update product status',
        color: 'red',
      })
      return
    }

    const newStatus = currentStatus === 'published' ? 'draft' : 'published'

    // Optimistic update - immediately update UI
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === productId ? { ...p, status: newStatus } : p
      )
    )

    try {
      await updateProductStatus(productId, newStatus)
      // Success - UI already updated
    } catch (error: any) {
      // Revert on error
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, status: currentStatus } : p
        )
      )
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Failed to update product status',
        color: 'red',
      })
    }
  }

  // Stock indicator helper
  const getStockBadge = (product: Product) => {
    const totalStock = product.variants?.reduce((sum, v) => sum + (v.currentStock || 0), 0) || 0
    const lowStockThreshold = 10

    if (totalStock === 0) {
      return (
        <Badge color="red" leftSection={<IconAlertCircle size={12} />}>
          {t('catalog.productsPage.stock.outOfStock') || 'Out of Stock'}
        </Badge>
      )
    }

    if (totalStock <= lowStockThreshold) {
      return (
        <Badge color="orange" leftSection={<IconAlertCircle size={12} />}>
          {t('catalog.productsPage.stock.lowStock', { count: totalStock }) || `${totalStock} left`}
        </Badge>
      )
    }

    return (
      <Badge color="teal" leftSection={<IconCube size={12} />}>
        {t('catalog.productsPage.stock.inStock', { count: totalStock }) || `${totalStock} in stock`}
      </Badge>
    )
  }

  // Handle delete
  const handleDelete = (product: Product) => {
    if (!isSuperAdmin() && !hasPermission('catalog.products.delete')) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('catalog.productsPage.notification.deletePermission') || "You don't have permission to delete products",
        color: 'red',
      })
      return
    }

    modals.openConfirmModal({
      title: t('catalog.productsPage.notification.deleteTitle') || 'Delete Product',
      children: (
        <Text size="sm">
          {t('catalog.productsPage.notification.deleteConfirm', { name: product.name }) ||
           `Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        </Text>
      ),
      labels: {
        confirm: t('common.delete') || 'Delete',
        cancel: t('common.cancel') || 'Cancel',
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteProduct(product.id)

          // Optimistic update - remove deleted product from state immediately
          setProducts((prevProducts) => prevProducts.filter((p) => p.id !== product.id))

          notifications.show({
            title: t('common.success') || 'Success',
            message: t('catalog.productsPage.notification.deleteSuccess') || 'Product deleted successfully',
            color: 'green',
          })
        } catch (error: any) {
          notifications.show({
            title: t('common.error') || 'Error',
            message: error.response?.data?.message || t('catalog.productsPage.notification.deleteError') || 'Failed to delete product',
            color: 'red',
          })
        }
      },
    })
  }

  // Handle duplicate
  const handleDuplicate = async (product: Product) => {
    if (!isSuperAdmin() && !hasPermission('catalog.products.create')) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: t('catalog.productsPage.notification.duplicatePermission') || "You don't have permission to duplicate products",
        color: 'red',
      })
      return
    }

    try {
      const response = await duplicateProduct(product.id)

      // Optimistic update - insert duplicated product right after the original
      const duplicatedProduct = response.data || response
      setProducts((prevProducts) => {
        const productIndex = prevProducts.findIndex((p) => p.id === product.id)
        if (productIndex === -1) {
          return [duplicatedProduct, ...prevProducts]
        }
        const newProducts = [...prevProducts]
        newProducts.splice(productIndex + 1, 0, duplicatedProduct)
        return newProducts
      })

      // Highlight the duplicated product
      setDuplicatedProductId(duplicatedProduct.id)

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setDuplicatedProductId(null)
      }, 3000)

      notifications.show({
        title: t('common.success') || 'Success',
        message: t('catalog.productsPage.notification.duplicateSuccess') || 'Product duplicated successfully',
        color: 'green',
      })
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || t('catalog.productsPage.notification.duplicateError') || 'Failed to duplicate product',
        color: 'red',
      })
    }
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setIsDragging(true)

      const oldIndex = products.findIndex((p) => p.id === active.id)
      const newIndex = products.findIndex((p) => p.id === over.id)

      // Optimistic update - reorder immediately
      const newProducts = arrayMove(products, oldIndex, newIndex)
      setProducts(newProducts)

      try {
        // Prepare data for API - use existing sort_order values as base
        const minSortOrder = Math.min(...products.map((p) => p.sortOrder || 0))

        const reorderData = newProducts.map((product, index) => ({
          id: product.id,
          sort_order: minSortOrder + index,
        }))

        await reorderProducts(reorderData)
        // Success - UI already updated, no need to refetch
      } catch (error: any) {
        // Revert on error
        setProducts(products)
        notifications.show({
          title: t('common.error') || 'Error',
          message: error.response?.data?.message || 'Failed to reorder products',
          color: 'red',
        })
      } finally {
        setIsDragging(false)
      }
    }
  }

  // Sortable Row Component
  interface SortableRowProps {
    product: Product
    duplicatedProductId: number | null
    getStockBadge: (product: Product) => React.ReactNode
    onPublishToggle: (productId: number, currentStatus: string) => void
    onDelete: (product: Product) => void
    onDuplicate: (product: Product) => void
    onNavigate: (path: string) => void
    isSuperAdmin: () => boolean
    hasPermission: (permission: string) => boolean
    t: (key: string) => string
  }

  function SortableRow({
    product,
    duplicatedProductId,
    getStockBadge,
    onPublishToggle,
    onDelete,
    onDuplicate,
    onNavigate,
    isSuperAdmin,
    hasPermission,
    t,
  }: SortableRowProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <Table.Tr
        ref={setNodeRef}
        style={style}
        bg={duplicatedProductId === product.id ? 'teal.0' : undefined}
      >
        <Table.Td style={{ width: '50px' }}>
          <ActionIcon
            {...attributes}
            {...listeners}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            variant="subtle"
            color="gray"
          >
            <IconGripVertical size={18} />
          </ActionIcon>
        </Table.Td>
        <Table.Td>
          <Group gap="sm">
            <Box
              w={40}
              h={40}
              className="bg-gray-100 rounded flex items-center justify-center"
            >
              {product.thumbnail ? (
                <Image
                  src={product.thumbnail.fullUrl}
                  alt={product.name}
                  w={40}
                  h={40}
                  fit="cover"
                  radius="sm"
                />
              ) : (
                <IconPhoto size={20} className="text-gray-400" />
              )}
            </Box>
            <Box>
              <Anchor
                className="text-sm md:text-base fw={500}"
                lineClamp={1}
                href={`/catalog/products/${product.id}`}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  onNavigate(`/catalog/products/${product.id}`)
                }}
              >
                {product.name?.length > 66
                  ? product.name.substring(0, 66) + '...'
                  : product.name}
              </Anchor>
              {product.variants && product.variants.length > 0 && (
                <Text className="text-xs md:text-sm" c="dimmed">
                  {product.variants.length} {t('catalog.productsPage.table.variants') || 'variant(s)'}
                </Text>
              )}
            </Box>
          </Group>
        </Table.Td>
        <Table.Td>
          {product.category ? (
            <Text className="text-sm md:text-base">{product.category.name}</Text>
          ) : (
            <Text className="text-sm md:text-base" c="dimmed">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          {product.brand ? (
            <Text className="text-sm md:text-base">{product.brand.name}</Text>
          ) : (
            <Text className="text-sm md:text-base" c="dimmed">-</Text>
          )}
        </Table.Td>
        <Table.Td>{getStockBadge(product)}</Table.Td>
        <Table.Td>
          <Switch
            checked={product.status === 'published'}
            onChange={() => onPublishToggle(product.id, product.status)}
            color="red"
            size="md"
            disabled={!isSuperAdmin() && !hasPermission('catalog.products.update')}
          />
        </Table.Td>
        <Table.Td ta="center">
          <Group gap="xs" justify="center" wrap="nowrap">
            <Tooltip label={t('common.edit') || 'Edit'}>
              <ActionIcon
                size="lg"
                variant="light"
                color="blue"
                onClick={() => onNavigate(`/catalog/products/${product.id}/edit`)}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('catalog.productsPage.menu.duplicate') || 'Duplicate'}>
              <ActionIcon
                size="lg"
                variant="light"
                color="gray"
                onClick={() => onDuplicate(product)}
              >
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>
            <Menu shadow="md" width={160} position="bottom-end">
              <Menu.Target>
                <ActionIcon size="lg" variant="light">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{t('catalog.productsPage.menu.actions') || 'Actions'}</Menu.Label>
                <Menu.Item
                  leftSection={<IconEye size={16} />}
                  onClick={() => onNavigate(`/catalog/products/${product.id}`)}
                >
                  {t('catalog.productsPage.menu.viewDetails') || 'View Details'}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  c="red"
                  onClick={() => onDelete(product)}
                >
                  {t('common.delete') || 'Delete'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      </Table.Tr>
    )
  }

  // Memoized product cards for mobile
  const productCards = useMemo(() => {
    return products.map((product) => (
      <Card
        key={product.id}
        withBorder
        p="md"
        shadow="sm"
        bg={duplicatedProductId === product.id ? 'teal.0' : undefined}
        style={{
          transition: 'background-color 0.3s ease',
          border: duplicatedProductId === product.id ? '2px solid #20c997' : undefined,
        }}
      >
        <Stack gap="sm">
          {/* Product Image & Basic Info */}
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <Box
                w={60}
                h={60}
                className="bg-gray-100 rounded-md flex items-center justify-center"
              >
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail.fullUrl}
                    alt={product.name}
                    w={60}
                    h={60}
                    fit="cover"
                    radius="md"
                  />
                ) : (
                  <IconPhoto size={24} className="text-gray-400" />
                )}
              </Box>
              <Box>
                <Anchor
                  className="text-sm md:text-base fw={500}"
                  lineClamp={1}
                  href={`/catalog/products/${product.id}`}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    navigate(`/catalog/products/${product.id}`)
                  }}
                >
                  {product.name?.length > 66
                    ? product.name.substring(0, 66) + '...'
                    : product.name}
                </Anchor>
                {product.category && (
                  <Text className="text-xs md:text-sm" c="dimmed">
                    {product.category.name}
                  </Text>
                )}
                {product.brand && (
                  <Text className="text-xs md:text-sm" c="dimmed">
                    {product.brand.name}
                  </Text>
                )}
              </Box>
            </Group>
            <Switch
              checked={product.status === 'published'}
              onChange={() => handlePublishToggle(product.id, product.status)}
              color="red"
              size="md"
              disabled={!isSuperAdmin() && !hasPermission('catalog.products.update')}
            />
          </Group>

          {/* Stock Info */}
          <Group justify="space-between">
            <Text className="text-xs md:text-sm" c="dimmed">
              {t('catalog.productsPage.table.variants') || 'Variants'}:
            </Text>
            <Text className="text-xs md:text-sm" fw={500}>
              {product.variants?.length || 0}
            </Text>
          </Group>

          {/* Stock Badge */}
          {getStockBadge(product)}

          {/* Actions */}
          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              radius="xl"
              leftSection={<IconEdit size={14} />}
              onClick={() => navigate(`/catalog/products/${product.id}/edit`)}
              className="flex-1"
            >
              {t('common.edit') || 'Edit'}
            </Button>
            <Menu shadow="md" width={160} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="light" size="lg">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{t('catalog.productsPage.menu.actions') || 'Actions'}</Menu.Label>
                <Menu.Item
                  leftSection={<IconCopy size={16} />}
                  onClick={() => handleDuplicate(product)}
                >
                  {t('catalog.productsPage.menu.duplicate') || 'Duplicate'}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconEye size={16} />}
                  onClick={() => navigate(`/catalog/products/${product.id}`)}
                >
                  {t('catalog.productsPage.menu.viewDetails') || 'View Details'}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  c="red"
                  onClick={() => handleDelete(product)}
                >
                  {t('common.delete') || 'Delete'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Stack>
      </Card>
    ))
  }, [products, getStockBadge, handleDelete, handleDuplicate, navigate, t, duplicatedProductId])

  // Loading state
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          {/* Header Skeleton */}
          <Group justify="space-between">
            <Skeleton height={40} width={200} />
            <Skeleton height={36} width={120} />
          </Group>

          {/* Filters Skeleton */}
          <Skeleton height={50} radius="md" />

          {/* Table Skeleton */}
          <Paper withBorder p="0">
            {[1, 2, 3, 4, 5].map((i) => (
              <Group key={i} p="md" gap="md">
                <Skeleton height={48} width={48} circle />
                <Skeleton height={16} flex={1} />
                <Skeleton height={16} width={100} />
                <Skeleton height={16} width={80} />
                <Skeleton height={30} width={30} />
              </Group>
            ))}
          </Paper>
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Flex justify="space-between" align="center" direction={{ base: 'column', sm: 'row' }} gap="sm">
          <Group>
            <IconPackages size={32} className="text-blue-600" />
            <div>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                {t('catalog.productsPage.title') || 'All Products'}
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                {t('catalog.productsPage.subtitle') || 'Manage your product catalog'}
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => navigate('/catalog/products/create')}
            className="text-sm md:text-base"
          >
            {t('catalog.productsPage.addProduct') || 'Add Product'}
          </Button>
        </Flex>

        {/* Filters */}
        <Paper withBorder p="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }}>
            <TextInput
              placeholder={t('catalog.productsPage.filters.searchPlaceholder') || 'Search products...'}
              leftSection={<IconSearch size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <Select
              placeholder={t('catalog.productsPage.filters.status') || 'Status'}
              clearable
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusType)}
              data={[
                { value: 'all', label: t('catalog.productsPage.filters.allStatus') || 'All Status' },
                { value: 'draft', label: t('catalog.productsPage.status.draft') || 'Draft' },
                { value: 'published', label: t('catalog.productsPage.status.published') || 'Published' },
                { value: 'archived', label: t('catalog.productsPage.status.archived') || 'Archived' },
              ]}
            />
            <Select
              placeholder={t('catalog.productsPage.filters.category') || 'Category'}
              clearable
              searchable
              value={categoryFilter}
              onChange={setCategoryFilter}
              data={categories}
            />
            <Select
              placeholder={t('catalog.productsPage.filters.brand') || 'Brand'}
              clearable
              searchable
              value={brandFilter}
              onChange={setBrandFilter}
              data={brands}
            />
            <Select
              placeholder={t('catalog.productsPage.filters.sortBy') || 'Sort By'}
              clearable
              value={sortBy}
              onChange={(v) => setSortBy(v as SortByType)}
              data={[
                { value: 'all', label: t('catalog.productsPage.filters.defaultSort') || 'Default' },
                { value: 'created_at_desc', label: t('catalog.productsPage.sort.lastCreated') || 'Last Created' },
                { value: 'created_at_asc', label: t('catalog.productsPage.sort.firstCreated') || 'First Created' },
                { value: 'updated_at_desc', label: t('catalog.productsPage.sort.lastUpdated') || 'Last Updated' },
                { value: 'updated_at_asc', label: t('catalog.productsPage.sort.firstUpdated') || 'First Updated' },
                { value: 'price_desc', label: t('catalog.productsPage.sort.mostExpensive') || 'Most Expensive' },
                { value: 'price_asc', label: t('catalog.productsPage.sort.cheapest') || 'Cheapest' },
              ]}
            />
          </SimpleGrid>
        </Paper>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Paper withBorder p="0">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '50px' }}></Table.Th>
                  <Table.Th>{t('catalog.productsPage.table.product') || 'Product'}</Table.Th>
                  <Table.Th>{t('catalog.productsPage.table.category') || 'Category'}</Table.Th>
                  <Table.Th>{t('catalog.productsPage.table.brand') || 'Brand'}</Table.Th>
                  <Table.Th>{t('catalog.productsPage.table.stock') || 'Stock'}</Table.Th>
                  <Table.Th>{t('catalog.productsPage.table.publish') || 'Publish'}</Table.Th>
                  <Table.Th ta="center">{t('catalog.productsPage.table.actions') || 'Actions'}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table.Tbody>
                  {products.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} ta="center">
                        <Stack py="xl" align="center" gap="sm">
                          <IconPackages size={48} className="text-gray-300" />
                          <Text c="dimmed" className="text-sm md:text-base">
                            {t('catalog.productsPage.table.noProducts') || 'No products found'}
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    <SortableContext
                      items={products.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {products.map((product) => (
                        <SortableRow
                          key={product.id}
                          product={product}
                          duplicatedProductId={duplicatedProductId}
                          getStockBadge={getStockBadge}
                          onPublishToggle={handlePublishToggle}
                          onDelete={handleDelete}
                          onDuplicate={handleDuplicate}
                          onNavigate={navigate}
                          isSuperAdmin={isSuperAdmin}
                          hasPermission={hasPermission}
                          t={t}
                        />
                      ))}
                    </SortableContext>
                  )}
                </Table.Tbody>
              </DndContext>
            </Table>
          </Paper>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            {productCards}
          </SimpleGrid>
        </div>

        {/* Pagination (if needed) */}
        {pagination.total > pagination.perPage && (
          <Group justify="center" mt="md">
            <Button
              variant="light"
              disabled={pagination.page === 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              {t('common.previous') || 'Previous'}
            </Button>
            <Text className="text-sm md:text-base">
              {t('catalog.productsPage.pagination.page', {
                current: pagination.page,
                total: Math.ceil(pagination.total / pagination.perPage)
              }) || `Page ${pagination.page} of ${Math.ceil(pagination.total / pagination.perPage)}`}
            </Text>
            <Button
              variant="light"
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.perPage)}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              {t('common.next') || 'Next'}
            </Button>
          </Group>
        )}
      </Stack>
    </Box>
  )
}
