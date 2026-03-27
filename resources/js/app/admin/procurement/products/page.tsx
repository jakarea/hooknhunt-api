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
  ActionIcon,
  Menu,
  Badge,
  Box,
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
import { notifications } from '@mantine/notifications'
import {
  getProcurementProducts,
  deleteProcurementProduct,
  updateProcurementProductStatus,
} from '@/utils/api'

export default function ProcurementProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts()
  }, [search, statusFilter, pagination.page])

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
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/procurement/products/create')}
          >
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
                        <img
                          src={product.thumbnail.fullUrl || product.thumbnail.url}
                          alt={product.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconPhoto size={20} color="gray.4" />
                        </Box>
                      )}
                      <Text
                        size="sm"
                        fw={500}
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => navigate(`/procurement/products/${product.id}`)}
                      >
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
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>
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
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail.fullUrl || product.thumbnail.url}
                        alt={product.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                      />
                    ) : (
                      <Box w={40} h={40} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconPhoto size={20} color="gray.4" />
                      </Box>
                    )}
                    <Text
                      size="sm"
                      fw={500}
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/procurement/products/${product.id}`)}
                    >
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
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => navigate(`/procurement/products/${product.id}`)}
                      >
                        {t('common.view', 'View')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => navigate(`/procurement/products/${product.id}/edit`)}
                      >
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
    </Stack>
  )
}
