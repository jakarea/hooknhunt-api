'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  TextInput,
  Select,
  Paper,
  ScrollArea,
  ActionIcon,
  Menu,
  Badge,
  Box,
  Divider,
  Drawer,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconPlus,
  IconDots,
  IconSearch,
  IconTrash,
  IconEdit,
  IconEye,
  IconPhoto,
  IconRefresh,
} from '@tabler/icons-react'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  getProcurementProducts,
  getProcurementProduct,
  createProcurementProduct,
  updateProcurementProduct,
  deleteProcurementProduct,
  updateProcurementProductStatus,
  getCategories,
  getBrands,
  getSuppliers,
  type ProcurementProductSupplier,
} from '@/utils/api'

interface SupplierWithLink {
  supplierId: string
  productLinks: string[]
}

export default function ProcurementProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [opened, { open, close }] = useDisclosure(false)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [editingId, setEditingId] = useState<number | null>(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    brandId: '',
    thumbnailId: '',
    suppliers: [] as SupplierWithLink[],
    status: 'draft',
  })

  // Dropdown data
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response: any = await getProcurementProducts({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter as 'draft' | 'published' : undefined,
        page: pagination.page,
        per_page: 20,
      })

      console.log('Procurement products response:', response)

      // Handle different response structures
      let productsData: any[] = []

      // Case 1: Laravel paginated response wrapped in ApiResponse trait
      // Structure: { data: { data: [...], current_page: 1, last_page: 1, total: 10 } }
      if (response?.data?.data && Array.isArray(response.data.data)) {
        productsData = response.data.data
        setPagination({
          page: response.data.current_page || 1,
          totalPages: response.data.last_page || 1,
          total: response.data.total || 0,
        })
      }
      // Case 2: Direct Laravel paginator (unwrapped)
      // Structure: { data: [...], current_page: 1, last_page: 1, total: 10 }
      else if (response?.data && Array.isArray(response.data)) {
        productsData = response.data
        setPagination({
          page: response.current_page || 1,
          totalPages: response.last_page || 1,
          total: response.total || 0,
        })
      }
      // Case 3: Direct array response (unpaginated)
      else if (Array.isArray(response)) {
        productsData = response
      }
      // Fallback: Empty array
      else {
        console.warn('Unexpected response structure:', response)
        productsData = []
      }

      setProducts(productsData)
    } catch (error: any) {
      console.error('Failed to fetch products:', error)
      setProducts([]) // Always set to empty array on error
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to load products',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [categoriesData, brandsData, suppliersData] = await Promise.all([
          getCategories({ per_page: 100 }),
          getBrands({ per_page: 100 }),
          getSuppliers({ is_active: true, per_page: 100 }),
        ])

        console.log('Dropdown data:', { categoriesData, brandsData, suppliersData })

        // Transform categories - ensure it's always an array
        if (Array.isArray(categoriesData?.data)) {
          setCategories(categoriesData.data)
        } else if (Array.isArray(categoriesData?.data?.data)) {
          setCategories(categoriesData.data.data)
        } else if (Array.isArray(categoriesData)) {
          setCategories(categoriesData)
        } else {
          setCategories([])
        }

        // Transform brands - ensure it's always an array
        if (Array.isArray(brandsData?.data)) {
          setBrands(brandsData.data)
        } else if (Array.isArray(brandsData?.data?.data)) {
          setBrands(brandsData.data.data)
        } else if (Array.isArray(brandsData)) {
          setBrands(brandsData)
        } else {
          setBrands([])
        }

        // Transform suppliers - ensure it's always an array
        if (Array.isArray(suppliersData?.data)) {
          setSuppliers(suppliersData.data)
        } else if (Array.isArray(suppliersData?.data?.data)) {
          setSuppliers(suppliersData.data.data)
        } else if (Array.isArray(suppliersData)) {
          setSuppliers(suppliersData)
        } else {
          setSuppliers([])
        }
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error)
        // Set empty arrays on error to prevent crashes
        setCategories([])
        setBrands([])
        setSuppliers([])
      }
    }

    fetchDropdownData()
  }, [])

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts()
  }, [search, statusFilter, pagination.page])

  const openCreateDrawer = () => {
    setEditingId(null)
    setFormData({
      name: '',
      categoryId: '',
      brandId: '',
      thumbnailId: '',
      suppliers: [],
      status: 'draft',
    })
    open()
  }

  const openEditDrawer = async (product: any) => {
    try {
      setLoading(true)
      const response: any = await getProcurementProduct(product.id)

      // Handle ApiResponse wrapper: { data: { product_data } }
      const fullProduct = response?.data || response

      // Extract IDs from nested category/brand objects
      const categoryId = fullProduct.category?.id || fullProduct.category_id
      const brandId = fullProduct.brand?.id || fullProduct.brand_id
      const thumbnailId = fullProduct.thumbnail?.id || fullProduct.thumbnail_id

      setEditingId(product.id)
      setFormData({
        name: fullProduct.name || '',
        categoryId: categoryId?.toString() || '',
        brandId: brandId?.toString() || '',
        thumbnailId: thumbnailId?.toString() || '',
        suppliers: (fullProduct.suppliers || []).map((s: any) => ({
          supplierId: s.id?.toString() || '',
          productLinks: Array.isArray(s.productLinks) ? s.productLinks : [],
        })),
        status: fullProduct.status || 'draft',
      })
      open()
    } catch (error: any) {
      console.error('Failed to load product:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to load product details',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const addSupplier = () => {
    setFormData({
      ...formData,
      suppliers: [
        ...formData.suppliers,
        { supplierId: '', productLinks: [''] },
      ],
    })
  }

  const removeSupplier = (index: number) => {
    const newSuppliers = formData.suppliers.filter((_, i) => i !== index)
    setFormData({ ...formData, suppliers: newSuppliers })
  }

  const updateSupplier = (index: number, field: keyof SupplierWithLink, value: any) => {
    const newSuppliers = [...formData.suppliers]
    newSuppliers[index] = { ...newSuppliers[index], [field]: value }
    setFormData({ ...formData, suppliers: newSuppliers })
  }

  const addProductLink = (supplierIndex: number) => {
    const newSuppliers = [...formData.suppliers]
    newSuppliers[supplierIndex].productLinks.push('')
    setFormData({ ...formData, suppliers: newSuppliers })
  }

  const removeProductLink = (supplierIndex: number, linkIndex: number) => {
    const newSuppliers = [...formData.suppliers]
    newSuppliers[supplierIndex].productLinks = newSuppliers[supplierIndex].productLinks.filter(
      (_, i) => i !== linkIndex
    )
    setFormData({ ...formData, suppliers: newSuppliers })
  }

  const updateProductLink = (supplierIndex: number, linkIndex: number, value: string) => {
    const newSuppliers = [...formData.suppliers]
    newSuppliers[supplierIndex].productLinks[linkIndex] = value
    setFormData({ ...formData, suppliers: newSuppliers })
  }

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Product name is required',
        color: 'red',
      })
      return
    }

    if (!formData.categoryId) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Category is required',
        color: 'red',
      })
      return
    }

    if (formData.suppliers.length === 0) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'At least one supplier is required',
        color: 'red',
      })
      return
    }

    // Validate suppliers
    for (const supplier of formData.suppliers) {
      if (!supplier.supplierId) {
        notifications.show({
          title: t('common.error') || 'Error',
          message: 'Please select a supplier for all entries',
          color: 'red',
        })
        return
      }
    }

    try {
      setSubmitting(true)

      // Transform suppliers for API
      const suppliersData: ProcurementProductSupplier[] = formData.suppliers.map(s => ({
        supplierId: parseInt(s.supplierId),
        productLinks: s.productLinks.filter(link => link.trim() !== '') || undefined,
      }))

      // Parse IDs safely, ensure no NaN values
      const categoryId = parseInt(formData.categoryId)
      if (!categoryId || isNaN(categoryId)) {
        notifications.show({
          title: t('common.error') || 'Error',
          message: 'Please select a valid category',
          color: 'red',
        })
        return
      }

      const payload = {
        name: formData.name,
        categoryId: categoryId,
        brandId: formData.brandId ? parseInt(formData.brandId) : undefined,
        thumbnailId: formData.thumbnailId ? parseInt(formData.thumbnailId) : undefined,
        suppliers: suppliersData,
        status: formData.status as 'draft' | 'published',
      }

      if (editingId) {
        await updateProcurementProduct(editingId, payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: 'Product updated successfully',
          color: 'green',
        })
      } else {
        await createProcurementProduct(payload)
        notifications.show({
          title: t('common.success') || 'Success',
          message: 'Product created successfully',
          color: 'green',
        })
      }

      close()
      fetchProducts()
    } catch (error: any) {
      console.error('Failed to save product:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to save product',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleView = (id: number) => {
    navigate(`/procurement/products/${id}`)
  }

  const handleDelete = async (id: number) => {
    // Show confirmation modal
    const confirmed = window.confirm('Are you sure you want to delete this product?')
    if (!confirmed) return

    try {
      setLoading(true)
      await deleteProcurementProduct(id)
      notifications.show({
        title: t('common.success') || 'Success',
        message: 'Product deleted successfully',
        color: 'green',
      })
      fetchProducts()
    } catch (error: any) {
      console.error('Failed to delete product:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to delete product',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    try {
      await updateProcurementProductStatus(id, newStatus)
      notifications.show({
        title: t('common.success') || 'Success',
        message: `Status changed to ${newStatus}`,
        color: 'green',
      })
      fetchProducts()
    } catch (error: any) {
      console.error('Failed to update status:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to update status',
        color: 'red',
      })
    }
  }

  // Transform data for dropdowns - with safety checks
  const categoryOptions = (categories || []).map(c => ({ value: c.id.toString(), label: c.name }))
  const brandOptions = (brands || []).map(b => ({ value: b.id.toString(), label: b.name }))
  const supplierOptions = (suppliers || []).map(s => ({ value: s.id.toString(), label: s.name }))

  return (
    <Stack p={{ base: 'md', md: 'xl' }} gap="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
            {t('procurement.productsPage.title', 'Procurement Products')}
          </Text>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('procurement.productsPage.subtitle', 'Manage products for purchase from suppliers')} ({pagination.total} total)
          </Text>
        </div>
        <Group gap="sm">
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={fetchProducts}
            loading={loading}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateDrawer}>
            {t('common.add', 'Add Product')}
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md" radius={0}>
        <Group>
          <TextInput
            placeholder={t('common.search', 'Search') + '...'}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value)
              setPagination({ ...pagination, page: 1 })
            }}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Status"
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value || 'all')
              setPagination({ ...pagination, page: 1 })
            }}
            style={{ width: 150 }}
          />
        </Group>
      </Paper>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Paper withBorder radius={0} p="md">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                  {t('procurement.productsPage.name', 'Name')}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                  {t('procurement.productsPage.category', 'Category')}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                  {t('procurement.productsPage.brand', 'Brand')}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                  {t('procurement.productsPage.suppliers', 'Suppliers')}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>
                  {t('procurement.productsPage.status', 'Status')}
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(products) && products.map((product) => (
                <tr
                  key={product.id}
                  style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <Group gap="sm">
                      {product.thumbnail ? (
                        <Box w={40} h={40} bg="gray.0">
                          <IconPhoto size={24} color="dimmed" />
                        </Box>
                      ) : (
                        <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconPhoto size={20} color="gray.4" />
                        </Box>
                      )}
                      <Text size="sm" fw={500}>
                        {product.name}
                      </Text>
                    </Group>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Text size="sm">{product.category?.name || '-'}</Text>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Text size="sm">{product.brand?.name || '-'}</Text>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Group gap={4}>
                      {product.suppliers?.map((s: any) => (
                        <Badge key={s.id} size="xs" variant="light">
                          {s.name}
                        </Badge>
                      ))}
                    </Group>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge
                      size="sm"
                      color={product.status === 'published' ? 'green' : 'gray'}
                      variant="light"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleStatusChange(product.id, product.status)}
                    >
                      {product.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <IconDots size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEye size={14} />} onClick={() => handleView(product.id)}>
                          {t('common.view', 'View')}
                        </Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEditDrawer(product)}>
                          {t('common.edit', 'Edit')}
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => handleDelete(product.id)}
                        >
                          {t('common.delete', 'Delete')}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>
                    <Text c="dimmed">{t('common.noData', 'No products found')}</Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Paper>
      </div>

      {/* Desktop Pagination */}
      {pagination.totalPages > 1 && (
        <div className="hidden md:block">
          <Paper withBorder p="md" radius={0}>
            <Group justify="flex-between">
              <Text size="sm" c="dimmed">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </Group>
            </Group>
          </Paper>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="block md:hidden">
        <Stack gap="sm">
          {Array.isArray(products) && products.map((product) => (
            <Paper key={product.id} withBorder p="md" radius={0}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Group gap="sm">
                    <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconPhoto size={20} color="gray.4" />
                    </Box>
                    <Text size="sm" fw={500}>
                      {product.name}
                    </Text>
                  </Group>
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDots size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => handleView(product.id)}>
                        {t('common.view', 'View')}
                      </Menu.Item>
                      <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEditDrawer(product)}>
                        {t('common.edit', 'Edit')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDelete(product.id)}
                      >
                        {t('common.delete', 'Delete')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
                <Group gap="xs">
                  <Badge size="xs" variant="light">{product.category?.name}</Badge>
                  <Badge size="xs" variant="light">{product.brand?.name}</Badge>
                  <Badge
                    size="xs"
                    color={product.status === 'published' ? 'green' : 'gray'}
                    variant="light"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStatusChange(product.id, product.status)}
                  >
                    {product.status}
                  </Badge>
                </Group>
                <Group gap={4} mt="xs">
                  {product.suppliers?.map((s: any) => (
                    <Badge key={s.id} size="xs" variant="outline">
                      {s.name}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            </Paper>
          ))}
          {products.length === 0 && !loading && (
            <Paper withBorder p="xl" radius={0}>
              <Text c="dimmed" ta="center">
                {t('common.noData', 'No products found')}
              </Text>
            </Paper>
          )}
        </Stack>

        {/* Mobile Pagination */}
        {pagination.totalPages > 1 && (
          <div className="block md:hidden">
            <Paper withBorder p="md" mt="md" radius={0}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Page {pagination.page} of {pagination.totalPages}
                </Text>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Next
                  </Button>
                </Group>
              </Group>
            </Paper>
          </div>
        )}
      </div>

      {/* Right-side Drawer Form */}
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="xl"
        padding="xl"
        radius={0}
        title={
          <Text size="lg" fw={600}>
            {editingId
              ? t('procurement.productsPage.editProduct', 'Edit Product')
              : t('procurement.productsPage.addProduct', 'Add Product')
            }
          </Text>
        }
      >
        <ScrollArea.Autosize mah="calc(100vh - 100px)">
          <Stack gap="md">
            {/* Basic Information */}
            <Stack gap="sm">
              <Text size="sm" fw={600}>{t('procurement.productsPage.basicInfo', 'Basic Information')}</Text>

              <TextInput
                label={t('procurement.productsPage.name', 'Product Name')}
                placeholder={t('procurement.productsPage.namePlaceholder', 'Enter product name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
                required
              />

              <Select
                label={t('procurement.productsPage.category', 'Category')}
                placeholder={t('procurement.productsPage.selectCategory', 'Select category')}
                data={categoryOptions}
                value={formData.categoryId}
                onChange={(value) => setFormData({ ...formData, categoryId: value || '' })}
                required
                searchable
              />

              <Select
                label={t('procurement.productsPage.brand', 'Brand')}
                placeholder={t('procurement.productsPage.selectBrand', 'Select brand')}
                data={brandOptions}
                value={formData.brandId}
                onChange={(value) => setFormData({ ...formData, brandId: value || '' })}
                searchable
              />

              <Button
                variant="light"
                leftSection={<IconPhoto size={16} />}
                fullWidth
              >
                {formData.thumbnailId
                  ? t('procurement.productsPage.changeThumbnail', 'Change Thumbnail')
                  : t('procurement.productsPage.selectThumbnail', 'Select Thumbnail')
                }
              </Button>
            </Stack>

            <Divider />

            {/* Suppliers Section */}
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600}>{t('procurement.productsPage.suppliers', 'Suppliers')}</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addSupplier}
                >
                  {t('common.add', 'Add')}
                </Button>
              </Group>

              {formData.suppliers.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  {t('procurement.productsPage.noSuppliers', 'No suppliers added yet')}
                </Text>
              )}

              {formData.suppliers.map((supplier, supplierIndex) => (
                <Paper key={supplierIndex} withBorder p="sm" radius={0}>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm" fw={500}>
                        {t('procurement.productsPage.supplier', 'Supplier')} {supplierIndex + 1}
                      </Text>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        onClick={() => removeSupplier(supplierIndex)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>

                    <Select
                      placeholder={t('procurement.productsPage.selectSupplier', 'Select supplier')}
                      data={supplierOptions}
                      value={supplier.supplierId}
                      onChange={(value) => updateSupplier(supplierIndex, 'supplierId', value || '')}
                      required
                      searchable
                    />

                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="xs" fw={500}>
                          {t('procurement.productsPage.productLinks', 'Product URLs')}
                        </Text>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => addProductLink(supplierIndex)}
                        >
                          {t('common.add', 'Add URL')}
                        </Button>
                      </Group>

                      {supplier.productLinks.map((link, linkIndex) => (
                        <Group key={linkIndex} gap="xs">
                          <TextInput
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => updateProductLink(supplierIndex, linkIndex, e.currentTarget.value)}
                            style={{ flex: 1 }}
                            size="xs"
                          />
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="subtle"
                            onClick={() => removeProductLink(supplierIndex, linkIndex)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Divider />

            {/* Status */}
            <Select
              label={t('procurement.productsPage.status', 'Status')}
              data={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as 'draft' | 'published' })}
            />

            {/* Actions */}
            <Group gap="sm">
              <Button variant="default" onClick={close} flex={1} disabled={submitting}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSubmit} flex={1} loading={submitting}>
                {editingId
                  ? t('common.update', 'Update')
                  : t('common.create', 'Create')
                }
              </Button>
            </Group>
          </Stack>
        </ScrollArea.Autosize>

        <LoadingOverlay visible={submitting} overlayProps={{ blur: 2 }} />
      </Drawer>
    </Stack>
  )
}
