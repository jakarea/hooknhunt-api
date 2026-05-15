import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  ActionIcon,
  Paper,
  SimpleGrid,
  TextInput,
  Select,
  LoadingOverlay,
  Switch,
  Image,
  Anchor,
  Menu,
  Avatar,
} from '@mantine/core'
import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconCopy,
  IconCheck,
  IconDots,
  IconTrash,
  IconPencil,
  IconLink,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/authStore'

interface ProductCommission {
  id: number
  productId: number
  productName: string
  productCode: string
  productPrice?: number
  productImage?: string
  affiliateId: number | null
  affiliateName: string
  affiliateReferralCode?: string
  commissionRate: number
  isActive: boolean
  type: 'global' | 'specific'
  createdAt: string
}

interface Product {
  id: number
  name: string
  productCode: string
  price?: number
  image?: string
}

interface Affiliate {
  id: number
  user_id: number
  name: string
  referralCode?: string
}

interface PaginatedResponse {
  commissions: ProductCommission[]
  pagination: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export default function ProductCommissionsPage() {
  const { t } = useTranslation()
  const { hasPermission, isSuperAdmin } = usePermissions()
  const { user } = useAuthStore()

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [commissions, setCommissions] = useState<ProductCommission[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [userAffiliateCode, setUserAffiliateCode] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>('all')
  const [activeFilter, setActiveFilter] = useState<string | null>('all')
  const [page, setPage] = useState(1)

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

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

  const fetchCommissions = async (showLoading = true, loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true)
      } else if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const params: Record<string, string | number> = {
        page: loadMore ? page : 1,
        per_page: 24,
      }

      if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim()
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter
      if (activeFilter && activeFilter !== 'all') params.is_active = activeFilter

      const response = await api.get<PaginatedResponse>('/admin/product-commissions', { params })
      const innerData = response.data?.data
      const newCommissions = innerData?.commissions || []

      if (loadMore) {
        setCommissions(prev => [...prev, ...newCommissions])
        setPage(prev => prev + 1)
      } else {
        setCommissions(newCommissions)
        setPage(2)
      }

      setHasMore(newCommissions.length === 24)
    } catch (error) {
      console.error('Failed to fetch commissions:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load commissions.',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/catalog/products?limit=1000')
      const paginatedData = response.data?.data || response.data
      let productsData = []
      if (paginatedData?.data && Array.isArray(paginatedData.data)) {
        productsData = paginatedData.data
      } else if (Array.isArray(paginatedData)) {
        productsData = paginatedData
      }
      setProducts(productsData)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    }
  }

  const fetchAffiliates = async () => {
    try {
      const response = await api.get('/admin/affiliates?limit=1000')
      const affiliatesData = response.data.data?.affiliates || response.data.data?.data || response.data.affiliates || []
      setAffiliates(Array.isArray(affiliatesData) ? affiliatesData : [])
    } catch (error) {
      console.error('Failed to fetch affiliates:', error)
      setAffiliates([])
    }
  }

  const openCommissionModal = (commission?: ProductCommission) => {
    const isEdit = !!commission

    modals.open({
      title: isEdit ? 'Edit Product Commission' : 'Add Product Commission',
      children: (
        <CommissionForm
          commission={commission}
          products={products}
          affiliates={affiliates}
          onSuccess={() => {
            fetchCommissions(false)
            modals.closeAll()
          }}
        />
      ),
    })
  }

  const deleteCommission = (id: number, productName: string) => {
    modals.openConfirmModal({
      title: 'Delete Commission',
      children: (
        <Text size="sm">
          Are you sure you want to delete the commission for <b>{productName}</b>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/admin/product-commissions/${id}`)
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

  const copyAffiliateLink = (referralCode: string, productName: string) => {
    const link = `${window.location.origin}/?ref=${referralCode}`
    navigator.clipboard.writeText(link).then(() => {
      notifications.show({
        title: 'Link Copied!',
        message: `Affiliate link for ${productName} copied to clipboard`,
        color: 'green',
      })
    })
  }

  const fetchUserAffiliateCode = async () => {
    if (!user?.id) return

    try {
      const response = await api.get<{ success: boolean; data: { referral_code?: string } }>('/affiliate/check')
      if (response.data.success && response.data.data?.referral_code) {
        setUserAffiliateCode(response.data.data.referral_code)
      }
    } catch (error) {
      // User is not an affiliate, that's fine
      setUserAffiliateCode(null)
    }
  }

  useEffect(() => {
    fetchCommissions()
    fetchProducts()
    fetchAffiliates()
    fetchUserAffiliateCode()
  }, [])

  useEffect(() => {
    if (page === 1) {
      fetchCommissions()
    } else {
      setPage(1)
    }
  }, [debouncedSearchQuery, typeFilter, activeFilter])

  const calculateCommissionAmount = (price: number = 0, rate: number) => {
    return (price * rate) / 100
  }

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchCommissions(false, true)
        }
      },
      { threshold: 1.0 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, loadingMore, page])

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Product Commissions</Title>
          <Text c="dimmed">Manage product-specific commission rates</Text>
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

      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="Search by product name or code..."
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

      <LoadingOverlay visible={loading} />

      {commissions.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed" size="lg">No commissions found</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {commissions.map((commission) => {
            const commissionAmount = calculateCommissionAmount(commission.productPrice, commission.commissionRate)
            const affiliateLink = `${window.location.origin}/?ref=${commission.affiliateReferralCode || 'REF'}`

            return (
              <Paper
                key={commission.id}
                withBorder
                p="md"
                radius="md"
                style={{ position: 'relative' }}
              >
                <Menu position="bottom-end" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size={14} />}
                      onClick={() => openCommissionModal(commission)}
                    >
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => deleteCommission(commission.id, commission.productName)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                <Stack gap="sm">
                  {/* Product Image */}
                  {commission.productImage ? (
                    <Image
                      src={commission.productImage}
                      alt={commission.productName}
                      height={120}
                      radius="md"
                      fit="cover"
                    />
                  ) : (
                    <Paper
                      h={120}
                      radius="md"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text size="xl" fw={700} c="white" ta="center">
                        {commission.productName?.substring(0, 2).toUpperCase()}
                      </Text>
                    </Paper>
                  )}

                  {/* Product Name & Code */}
                  <div>
                    <Text fw={600} lineClamp={1}>{commission.productName}</Text>
                    <Text size="xs" c="dimmed">{commission.productCode}</Text>
                  </div>

                  {/* Price */}
                  {commission.productPrice !== undefined && (
                    <Text size="lg" fw={700} c="blue">
                      ৳{commission.productPrice.toFixed(2)}
                    </Text>
                  )}

                  {/* Commission Badge */}
                  <Badge
                    size="lg"
                    color={commission.type === 'global' ? 'blue' : 'grape'}
                    variant="light"
                    leftSection={
                      <Text span fw={700} size="sm">
                        {commission.commissionRate}%
                      </Text>
                    }
                  >
                    {commission.type === 'global' ? 'Global' : 'Specific'}
                  </Badge>

                  {/* Commission Amount */}
                  {commission.productPrice && (
                    <Group justify="space-between" align="center">
                      <Text size="sm" c="dimmed">Commission:</Text>
                      <Text fw={600} c="green">৳{commissionAmount.toFixed(2)}</Text>
                    </Group>
                  )}

                  {/* Status */}
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">Status:</Text>
                    {commission.isActive ? (
                      <Badge color="green" variant="light" size="sm">Active</Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="sm">Inactive</Badge>
                    )}
                  </Group>

                  {/* Affiliate Info */}
                  {commission.type === 'specific' && commission.affiliateName && (
                    <Group gap="xs" align="center">
                      <Avatar size="xs" radius="xl" color="blue">
                        {commission.affiliateName?.substring(0, 2).toUpperCase()}
                      </Avatar>
                      <Text size="sm" fw={500}>{commission.affiliateName}</Text>
                    </Group>
                  )}

                  {/* Copy Link Button - Show if user is affiliate and commission is global OR if user is the specific affiliate OR if admin */}
                  {(() => {
                    const isAdmin = isSuperAdmin()
                    const isGlobal = commission.type === 'global'
                    const isSpecificAffiliate = commission.type === 'specific' && commission.affiliateReferralCode === userAffiliateCode

                    const showButton = (isGlobal && userAffiliateCode) || isSpecificAffiliate || isAdmin
                    const referralCodeToUse = isGlobal ? userAffiliateCode : commission.affiliateReferralCode

                    return showButton && referralCodeToUse ? (
                      <Button
                        size="sm"
                        variant="light"
                        fullWidth
                        leftSection={<IconCopy size={14} />}
                        onClick={() => copyAffiliateLink(referralCodeToUse!, commission.productName)}
                      >
                        Copy Affiliate Link
                      </Button>
                    ) : null
                  })()}
                </Stack>
              </Paper>
            )
          })}
        </SimpleGrid>
      )}

      {/* Infinite Scroll Loading Indicator */}
      <div ref={observerTarget} style={{ minHeight: '60px' }}>
        {loadingMore && (
          <Group justify="center" p="md">
            <Paper p="md" withBorder>
              <Stack gap="xs" align="center">
                <Text size="sm" c="dimmed">Loading more commissions...</Text>
              </Stack>
            </Paper>
          </Group>
        )}
        {!hasMore && commissions.length > 0 && (
          <Text c="dimmed" ta="center" p="md">
            No more commissions to load
          </Text>
        )}
      </div>
    </Stack>
  )
}

/**
 * Commission Form Component
 */
function CommissionForm({
  commission,
  products,
  affiliates,
  onSuccess,
}: {
  commission?: ProductCommission
  products: Product[]
  affiliates: Affiliate[]
  onSuccess: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const [productId, setProductId] = useState(commission?.productId?.toString() || '')
  const [affiliateId, setAffiliateId] = useState(commission?.affiliateId?.toString() || '')
  const [commissionRate, setCommissionRate] = useState(commission?.commissionRate || 5)
  const [isActive, setIsActive] = useState(commission?.isActive ?? true)

  const handleSubmit = async () => {
    if (!productId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a product.',
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
        product_id: parseInt(productId),
        affiliate_id: affiliateId ? parseInt(affiliateId) : null,
        commission_rate: parseFloat(commissionRate),
        is_active: isActive,
      }

      if (commission) {
        await api.put(`/admin/product-commissions/${commission.id}`, data)
        notifications.show({
          title: 'Success',
          message: 'Commission updated successfully.',
          color: 'green',
        })
      } else {
        await api.post('/admin/product-commissions', data)
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

  const productOptions = products.map((p) => ({
    value: p.id.toString(),
    label: `${p.name} (${p.productCode})`,
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
        label="Product"
        placeholder="Select product"
        data={productOptions}
        value={productId}
        onChange={(value) => setProductId(value as string)}
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

      <TextInput
        label="Commission Rate (%)"
        placeholder="5.00"
        value={commissionRate}
        onChange={(e) => setCommissionRate(parseFloat(e.currentTarget.value) || 0)}
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
