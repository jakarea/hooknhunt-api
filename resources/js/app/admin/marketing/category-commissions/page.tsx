import { useState, useEffect } from 'react'
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Paper,
  TextInput,
  Select,
  LoadingOverlay,
  NumberInput,
  Switch,
} from '@mantine/core'
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface CategoryCommission {
  id: number
  categoryId: number
  categoryName: string
  affiliateId: number | null
  affiliateName: string
  commissionRate: number
  isActive: boolean
  type: 'global' | 'specific'
  createdAt: string
}

interface Category {
  id: number
  name: string
}

interface Affiliate {
  id: number
  user_id: number
  name: string
}

interface PaginatedResponse {
  commissions: CategoryCommission[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export default function CategoryCommissionsPage() {
  const { t } = useTranslation()
  const { hasPermission, isSuperAdmin } = usePermissions()

  if (!isSuperAdmin() && !hasPermission('crm.affiliates.index')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" ta="center">
          <Title order={3}>Access Denied</Title>
          <Text c="dimmed">You don't have permission to view this page.</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [commissions, setCommissions] = useState<CategoryCommission[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>('all')
  const [activeFilter, setActiveFilter] = useState<string | null>('all')

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    last_page: 0,
  })

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'global', label: 'Global (All Affiliates)' },
    { value: 'specific', label: 'Specific Affiliate' },
  ]

  const activeOptions = [
    { value: 'all', label: 'All Status' },
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ]

  /**
   * Fetch commissions list
   */
  const fetchCommissions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const params: Record<string, string | number> = {
        page: pagination.page,
        per_page: pagination.per_page,
      }

      if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim()
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter
      if (activeFilter && activeFilter !== 'all') params.is_active = activeFilter

      const response = await api.get<PaginatedResponse>('/admin/category-commissions', { params })
      console.log('===== Category Commissions Debug =====')
      console.log('Full axios response:', response)
      console.log('response.data:', response.data)
      console.log('response.data.success:', response.data?.success)
      console.log('response.data.data:', response.data?.data)

      // The API returns { success: true, data: { commissions: [...], pagination: {...} } }
      // axios gives us response.data = { success: true, data: {...} }
      // So we need response.data.data to get our actual data
      const innerData = response.data?.data
      console.log('Extracted innerData:', innerData)
      console.log('innerData.commissions:', innerData?.commissions)
      console.log('innerData.pagination:', innerData?.pagination)

      setCommissions(innerData?.commissions || [])
      setPagination({
        page: innerData?.pagination?.current_page || 1,
        per_page: innerData?.pagination?.per_page || 20,
        total: innerData?.pagination?.total || 0,
        last_page: innerData?.pagination?.last_page || 1,
      })
      console.log('===================================')
    } catch (error) {
      console.error('Failed to fetch commissions:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load commissions.',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * Fetch categories for dropdown
   */
  const fetchCategories = async () => {
    try {
      const response = await api.get('/catalog/categories?limit=1000')
      // Handle paginated response structure
      const categoriesData = response.data.data?.data || response.data.data || response.data.categories || []
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      setCategories([])
    }
  }

  /**
   * Fetch affiliates for dropdown
   */
  const fetchAffiliates = async () => {
    try {
      const response = await api.get('/admin/affiliates?limit=1000')
      // Handle paginated response structure
      const affiliatesData = response.data.data?.affiliates || response.data.data?.data || response.data.affiliates || []
      setAffiliates(Array.isArray(affiliatesData) ? affiliatesData : [])
    } catch (error) {
      console.error('Failed to fetch affiliates:', error)
      setAffiliates([])
    }
  }

  /**
   * Open create/edit modal
   */
  const openCommissionModal = (commission?: CategoryCommission) => {
    const isEdit = !!commission

    modals.open({
      title: isEdit ? 'Edit Category Commission' : 'Add Category Commission',
      children: (
        <CommissionForm
          commission={commission}
          categories={categories}
          affiliates={affiliates}
          onSuccess={() => {
            fetchCommissions(false)
            modals.closeAll()
          }}
        />
      ),
    })
  }

  /**
   * Delete commission
   */
  const deleteCommission = (id: number, categoryName: string) => {
    modals.openConfirmModal({
      title: 'Delete Commission',
      children: (
        <Text size="sm">
          Are you sure you want to delete the commission for <b>{categoryName}</b>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/admin/category-commissions/${id}`)
          notifications.show({
            title: 'Success',
            message: 'Commission deleted successfully.',
            color: 'green',
          })
          fetchCommissions(false)
        } catch (error) {
          console.error('Failed to delete commission:', error)
          notifications.show({
            title: 'Error',
            message: 'Failed to delete commission.',
            color: 'red',
          })
        }
      },
    })
  }

  // Initial load
  useEffect(() => {
    fetchCommissions()
    fetchCategories()
    fetchAffiliates()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (pagination.page === 1) {
      fetchCommissions()
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }))
    }
  }, [debouncedSearchQuery, typeFilter, activeFilter])

  // Refetch when page changes
  useEffect(() => {
    if (!loading) fetchCommissions()
  }, [pagination.page])

  return (
    <Stack gap="md" p="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Category Commissions</Title>
          <Text c="dimmed">Manage category-specific commission rates</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => fetchCommissions(false)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => openCommissionModal()}
          >
            Add Commission
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="Search by category name..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            w={200}
          />
          <Select
            data={activeOptions}
            value={activeFilter}
            onChange={setActiveFilter}
            w={150}
          />
        </Group>
      </Paper>

      {/* Table */}
      <Paper withBorder>
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Affiliate</Table.Th>
              <Table.Th>Commission</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {commissions.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7} ta="center">
                  <Text c="dimmed" py="xl">No commissions found</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              commissions.map((commission) => (
                <Table.Tr key={commission.id}>
                  <Table.Td>
                    <Text fw={500}>{commission.categoryName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={commission.type === 'global' ? 'blue' : 'grape'}
                      variant="light"
                    >
                      {commission.type === 'global' ? 'Global' : 'Specific'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{commission.affiliateName}</Table.Td>
                  <Table.Td>
                    <Text fw={500}>{commission.commissionRate}%</Text>
                  </Table.Td>
                  <Table.Td>
                    {commission.isActive ? (
                      <Badge color="green" variant="light">Active</Badge>
                    ) : (
                      <Badge color="gray" variant="light">Inactive</Badge>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Group gap="xs" justify="right">
                      <ActionIcon
                        color="blue"
                        variant="light"
                        size="sm"
                        onClick={() => openCommissionModal(commission)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => deleteCommission(commission.id, commission.categoryName)}
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

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <Group justify="space-between" p="md">
            <Text size="sm" c="dimmed">
              Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
              {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="light"
                size="sm"
                disabled={pagination.page === pagination.last_page}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Group>
          </Group>
        )}
      </Paper>
    </Stack>
  )
}

/**
 * Commission Form Component
 */
function CommissionForm({
  commission,
  categories,
  affiliates,
  onSuccess,
}: {
  commission?: CategoryCommission
  categories: Category[]
  affiliates: Affiliate[]
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const [categoryId, setCategoryId] = useState(commission?.categoryId?.toString() || '')
  const [affiliateId, setAffiliateId] = useState(commission?.affiliateId?.toString() || '')
  const [commissionRate, setCommissionRate] = useState(commission?.commissionRate || 5)
  const [isActive, setIsActive] = useState(commission?.isActive ?? true)

  const handleSubmit = async () => {
    if (!categoryId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a category.',
        color: 'red',
      })
      return
    }

    if (!commissionRate || commissionRate < 0 || commissionRate > 100) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid commission rate (0-100).',
        color: 'red',
      })
      return
    }

    try {
      setSubmitting(true)

      const data = {
        category_id: parseInt(categoryId),
        affiliate_id: affiliateId ? parseInt(affiliateId) : null,
        commission_rate: parseFloat(commissionRate),
        is_active: isActive,
      }

      if (commission) {
        await api.put(`/admin/category-commissions/${commission.id}`, data)
        notifications.show({
          title: 'Success',
          message: 'Commission updated successfully.',
          color: 'green',
        })
      } else {
        await api.post('/admin/category-commissions', data)
        notifications.show({
          title: 'Success',
          message: 'Commission created successfully.',
          color: 'green',
        })
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to save commission:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save commission. Please try again.',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id.toString(),
    label: c.name,
  }))

  const affiliateOptions = [
    { value: '', label: 'All Affiliates (Global)' },
    ...affiliates.map((a) => ({
      value: a.id.toString(),
      label: a.name,
    })),
  ]

  return (
    <Stack gap="md">
      <Select
        label="Category"
        placeholder="Select category"
        data={categoryOptions}
        value={categoryId}
        onChange={(value) => setCategoryId(value as string)}
        required
      />

      <Select
        label="Affiliate"
        placeholder="All Affiliates (Global) or Specific"
        data={affiliateOptions}
        value={affiliateId}
        onChange={(value) => setAffiliateId(value as string)}
        description="Leave empty for all affiliates"
      />

      <NumberInput
        label="Commission Rate (%)"
        placeholder="5.00"
        value={commissionRate}
        onChange={(value) => setCommissionRate(value as number)}
        min={0}
        max={100}
        step={0.01}
        required
      />

      <Switch
        label="Active"
        checked={isActive}
        onChange={(e) => setIsActive(e.currentTarget.checked)}
        description="Whether this commission is currently active"
      />

      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={modals.closeAll}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          {commission ? 'Update' : 'Create'}
        </Button>
      </Group>
    </Stack>
  )
}
