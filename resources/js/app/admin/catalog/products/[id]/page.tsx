'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Badge,
  Image,
  Table,
  Anchor,
  Breadcrumbs,
  SimpleGrid,
  Title,
  Skeleton,
  ActionIcon,
  Modal,
  TextInput,
  Loader,
  ScrollArea,
  Switch,
  Divider,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconPhoto,
  IconTag,
  IconTags,
  IconBuilding,
  IconWorld,
  IconEdit,
  IconPackages,
  IconTrash,
  IconCube,
  IconPlus,
  IconX,
  IconBox,
  IconShield,
  IconSearch,
  IconCalendar,
  IconWeight,
  IconClock,
  IconAlertCircle,
  IconRefresh,
  IconBulb,
  IconScale,
  IconShoppingBag,
  IconInfoCircle,
  IconCheck,
  IconDiscount,
  IconTrendingUp,
  IconHeart,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getProduct, updateProduct, getProducts } from '@/utils/api'
import { useCrossSaleStore } from '@/stores/crossSaleStore'
import { useUpSaleStore } from '@/stores/upSaleStore'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Decode HTML entities in case content is double-escaped
 */
const decodeHTMLEntities = (text: string): string => {
  const textArea = document.createElement('textarea')
  // Decode multiple levels of encoding (handles double/triple-encoded HTML entities)
  let decoded = text
  let previous = ''
  while (decoded !== previous) {
    previous = decoded
    textArea.innerHTML = decoded
    decoded = textArea.value
  }
  return decoded
}

// ============================================================================
// TYPE DEFINITIONS - Full Type Safety (No 'any')
// ============================================================================

interface MediaFile {
  id: number
  fullUrl: string
  fileName: string
  mimeType: string
  size: number
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Brand {
  id: number
  name: string
  slug: string
}

interface ChannelSetting {
  id: number
  channel: 'RETAIL_WEB' | 'WHOLESALE_WEB' | 'DARAZ' | 'POS'
  isActive: boolean
  price?: number | null
}

interface ProductVariant {
  id: number
  variantName: string
  variantSlug: string
  channel: 'retail' | 'wholesale' | 'daraz' | 'pos'
  sku: string
  customSku?: string | null
  color?: string | null
  size?: string | null
  material?: string | null
  weight?: string | null
  pattern?: string | null
  unitId?: number | null
  unitValue?: number | string | null
  allowPreorder: boolean
  expectedDelivery?: string | null
  price: number | string
  purchaseCost: number | string
  offerPrice?: number | string | null
  offerStarts?: string | null
  offerEnds?: string | null
  currentStock?: number | null
  stockAlertLevel?: number | null
  moq?: number | null
  isActive: boolean
  channelSettings?: ChannelSetting[]
  // Paired channel fields (from show endpoint)
  retailPrice?: number | string
  retailOfferPrice?: number | string | null
  retailOfferStarts?: string | null
  retailOfferEnds?: string | null
  wholesalePrice?: number | string
  wholesaleOfferPrice?: number | string | null
  wholesaleOfferStarts?: string | null
  wholesaleOfferEnds?: string | null
}

interface ProductDetail {
  id: number
  name: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  retailName?: string | null
  wholesaleName?: string | null
  retailNameBn?: string | null
  wholesaleNameBn?: string | null
  description?: string | null
  descriptionBn?: string | null
  shortDescription?: string | null
  warrantyEnabled?: boolean | null
  warrantyDetails?: string | null
  highlights?: string[] | null
  highlightsBn?: string[] | null
  includesInTheBox?: string[] | string | null
  includesInTheBoxBn?: string | null
  videoUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoTags?: string[] | null
  thumbnail?: MediaFile | null
  category?: Category | null
  brand?: Brand | null
  variants?: ProductVariant[] | null
  galleryImages?: number[] | null // Internal IDs
  galleryImagesUrls?: string[] | null // Public URLs for display
  crossSaleProducts?: Array<{ id: number; name: string; slug: string; thumbnailUrl?: string | null }>
  upSaleProducts?: Array<{ id: number; name: string; slug: string; thumbnailUrl?: string | null }>
  thankYou?: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// MAIN COMPONENT - Performance Optimized & Type Safe
// ============================================================================

export default function ProductDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cross-sale store
  const {
    modalOpen,
    selectedIds,
    products: modalProducts,
    loading: modalLoading,
    searchQuery,
    openModal,
    closeModal,
    setSearchQuery,
    fetchProducts,
    toggleSelect,
    save,
  } = useCrossSaleStore()

  // Debounced search for modal
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchProducts(), 300)
  }, [setSearchQuery, fetchProducts])

  // Cross-sale count for display
  const crossSaleCount = product?.crossSaleProducts?.length ?? 0

  // Up-sale store
  const {
    modalOpen: upSaleModalOpen,
    selectedIds: upSaleSelectedIds,
    products: upSaleModalProducts,
    loading: upSaleModalLoading,
    searchQuery: upSaleSearchQuery,
    openModal: openUpSaleModal,
    closeModal: closeUpSaleModal,
    setSearchQuery: setUpSaleSearchQuery,
    fetchProducts: fetchUpSaleProducts,
    toggleSelect: toggleUpSaleSelect,
    save: saveUpSale,
  } = useUpSaleStore()

  // Debounced search for up-sale modal
  const upSaleSearchTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleUpSaleSearchChange = useCallback((value: string) => {
    setUpSaleSearchQuery(value)
    if (upSaleSearchTimer.current) clearTimeout(upSaleSearchTimer.current)
    upSaleSearchTimer.current = setTimeout(() => fetchUpSaleProducts(), 300)
  }, [setUpSaleSearchQuery, fetchUpSaleProducts])

  // Up-sale count
  const upSaleCount = product?.upSaleProducts?.length ?? 0

  // Description language toggle
  const [descLang, setDescLang] = useState<'en' | 'bn'>('en')

  // Translation namespace prefix
  const ns = 'products'

  // ============================================================================
  // ALL HOOKS MUST BE CALLED AT THE TOP (Rules of Hooks)
  // ============================================================================

  // PERFORMANCE: Memoized callback for fetchProduct
  const fetchProduct = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const response = await getProduct(Number(id))

      // Handle different response structures
      let productData: ProductDetail
      if (response?.data) {
        productData = response.data as ProductDetail
      } else if (response) {
        productData = response as ProductDetail
      } else {
        throw new Error('No data received')
      }

      // Variants come pre-paired from backend (retail + wholesale merged)
      setProduct(productData)
    } catch (err: unknown) {
      console.error('Failed to load product:', err)

      // Type-safe error handling
      const errorResponse = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = errorResponse?.response?.data?.message || errorResponse?.message || t('common.somethingWentWrong')

      setError(errorMessage)
      notifications.show({
        title: t('common.error') || 'Error',
        message: errorMessage,
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [id, t])

  // useEffect for data fetching
  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // Toggle thank-you product status
  const handleToggleThankYou = useCallback(async (checked: boolean) => {
    if (!product) return
    const previous = product.thankYou
    setProduct({ ...product, thankYou: checked })
    try {
      await updateProduct(product.id, { thankYou: checked })
      notifications.show({ title: 'Updated', message: checked ? 'Marked as thank-you product' : 'Removed thank-you flag', color: 'green' })
    } catch {
      setProduct({ ...product, thankYou: previous })
      notifications.show({ title: 'Error', message: 'Failed to update', color: 'red' })
    }
  }, [product])

  const handleRemoveCrossSale = useCallback(async (csId: number) => {
    if (!product) return
    const crossSaleStr = (product.crossSaleProducts ?? [])
      .filter((p) => p.id !== csId)
      .map((p) => p.id)
      .join(',')

    // Optimistic update — remove from local state immediately
    const previousProducts = product.crossSaleProducts
    setProduct({
      ...product,
      crossSaleProducts: previousProducts?.filter((p) => p.id !== csId) ?? [],
    })

    try {
      await updateProduct(product.id, { crossSale: crossSaleStr })
      notifications.show({ title: 'Removed', message: 'Cross-sale product removed', color: 'green' })
      fetchProduct()
    } catch (err) {
      // Revert on failure
      setProduct({ ...product, crossSaleProducts: previousProducts })
      console.error('Failed to remove cross-sale:', err)
      notifications.show({ title: 'Error', message: 'Failed to remove cross-sale product', color: 'red' })
    }
  }, [product, fetchProduct])

  // Remove an up-sale product directly (optimistic update)
  const handleRemoveUpSale = useCallback(async (usId: number) => {
    if (!product) return
    const upSaleStr = (product.upSaleProducts ?? [])
      .filter((p) => p.id !== usId)
      .map((p) => p.id)
      .join(',')

    // Optimistic update — remove from local state immediately
    const previousProducts = product.upSaleProducts
    setProduct({
      ...product,
      upSaleProducts: previousProducts?.filter((p) => p.id !== usId) ?? [],
    })

    try {
      await updateProduct(product.id, { upSale: upSaleStr })
      notifications.show({ title: 'Removed', message: 'Up-sale product removed', color: 'green' })
      fetchProduct()
    } catch (err) {
      // Revert on failure
      setProduct({ ...product, upSaleProducts: previousProducts })
      console.error('Failed to remove up-sale:', err)
      notifications.show({ title: 'Error', message: 'Failed to remove up-sale product', color: 'red' })
    }
  }, [product, fetchProduct])

  // PERFORMANCE: Memoized status configuration
  const statusConfig = useMemo<Record<string, { color: string; label: string }>>(() => ({
    draft: { color: 'gray', label: t(`${ns}.detail.status.draft`) },
    published: { color: 'green', label: t(`${ns}.detail.status.published`) },
    archived: { color: 'red', label: t(`${ns}.detail.status.archived`) },
  }), [t, ns])

  // PERFORMANCE: Memoized badge callbacks
  const getStatusBadge = useCallback((status: string) => {
    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge
        color={config.color}
        size="md"
        variant="filled"
        radius="sm"
      >
        {config.label}
      </Badge>
    )
  }, [statusConfig])

  const getStockBadge = useCallback((stock: number, alertLevel: number) => {
    if (stock === 0) {
      return (
        <Badge color="red" leftSection={<IconX size={12} />}>
          {t(`${ns}.detail.variants.outOfStock`)}
        </Badge>
      )
    }
    if (stock <= alertLevel) {
      return (
        <Badge color="orange" leftSection={<IconCube size={12} />}>
          {stock} {t(`${ns}.detail.variants.lowStock`)}
        </Badge>
      )
    }
    return (
      <Badge color="teal" leftSection={<IconCube size={12} />}>
        {stock} {t(`${ns}.detail.variants.inStock`)}
      </Badge>
    )
  }, [t, ns])

  const getChannelBadge = useCallback((channel: string, isActive: boolean) => {
    const channelColors: Record<string, string> = {
      retail: 'blue',
      wholesale: 'green',
      daraz: 'orange',
      pos: 'purple'
    }
    return (
      <Badge
        color={isActive ? channelColors[channel] || 'blue' : 'gray'}
        variant="light"
        size="sm"
      >
        {channel.toUpperCase()}
      </Badge>
    )
  }, [t, ns])

  const getActiveStatusBadge = useCallback((isActive: boolean) => {
    return (
      <Badge color={isActive ? 'teal' : 'red'} variant="light" size="sm" leftSection={isActive ? <IconCheck size={10} /> : <IconX size={10} />}>
        {isActive ? t(`${ns}.detail.variants.active`) || 'Active' : t(`${ns}.detail.variants.inactive`) || 'Inactive'}
      </Badge>
    )
  }, [t, ns])

  // PERFORMANCE: Memoized breadcrumb items
  const breadcrumbItems = useMemo(() => {
    if (!product) return []
    return [
      { title: t(`${ns}.detail.breadcrumbs.dashboard`), href: '/dashboard' },
      { title: t(`${ns}.detail.breadcrumbs.catalog`), href: '/catalog' },
      { title: t(`${ns}.detail.breadcrumbs.products`), href: '/catalog/products' },
      { title: decodeHTMLEntities(product.name), href: `/catalog/products/${product.id}` },
    ].map((item, index) => (
      <Anchor href={item.href} key={index} className="text-sm md:text-base">
        {item.title}
      </Anchor>
    ))
  }, [t, ns, product])

  // PERFORMANCE: Memoized variant table rows (desktop)
  const variantTableRows = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null

    return product.variants.map((variant) => (
      <Table.Tr key={variant.id}>
        <Table.Td>
          <Stack gap="xs">
            <Text className="text-sm md:text-base" fw={500}>
              {variant.variantName}
            </Text>
            {!variant.isActive && (
              <Badge color="red" size="xs">
                {t(`${ns}.detail.variants.inactive`) || 'Inactive'}
              </Badge>
            )}
            {variant.allowPreorder && (
              <Group gap="xs" align="center">
                <Badge color="blue" size="xs" leftSection={<IconClock size={10} />}>
                  {t(`${ns}.detail.variants.preorder`) || 'Preorder'}
                </Badge>
                {variant.expectedDelivery && (
                  <Text className="text-xs" c="dimmed">
                    {new Date(variant.expectedDelivery).toLocaleDateString()}
                  </Text>
                )}
              </Group>
            )}
          </Stack>
        </Table.Td>
        <Table.Td>
          <Stack gap={0}>
            <Text className="text-xs md:text-sm" fw={500}>
              {variant.sku}
            </Text>
            {variant.customSku && (
              <Text className="text-xs" c="dimmed">
                Custom: {variant.customSku}
              </Text>
            )}
            <Text className="text-xs" c="dimmed">
              {variant.variantSlug}
            </Text>
          </Stack>
        </Table.Td>
        <Table.Td>
          <Stack gap={0}>
            {variant.color && (
              <Text className="text-xs md:text-sm">
                <Text span c="dimmed">
                  {t(`${ns}.detail.variants.color`)}:
                </Text>{' '}
                {variant.color}
              </Text>
            )}
            {variant.size && (
              <Text className="text-xs md:text-sm">
                <Text span c="dimmed">
                  {t(`${ns}.detail.variants.size`)}:
                </Text>{' '}
                {variant.size}
              </Text>
            )}
            {variant.material && (
              <Text className="text-xs md:text-sm">
                <Text span c="dimmed">
                  {t(`${ns}.detail.variants.material`)}:
                </Text>{' '}
                {variant.material}
              </Text>
            )}
            {variant.pattern && (
              <Text className="text-xs md:text-sm">
                <Text span c="dimmed">
                  {t(`${ns}.detail.variants.pattern`) || 'Pattern'}:
                </Text>{' '}
                {variant.pattern}
              </Text>
            )}
            {variant.weight && (
              <Group gap="xs" align="center">
                <IconWeight size={12} className="text-gray-500" />
                <Text className="text-xs" c="dimmed">
                  {Number(variant.weight) > 1000
                    ? `${(Number(variant.weight) / 1000).toFixed(2)} kg`
                    : `${variant.weight} g`
                  }
                </Text>
              </Group>
            )}
            {variant.unitValue && variant.unitValue !== 1 && (
              <Group gap="xs" align="center">
                <IconScale size={12} className="text-gray-500" />
                <Text className="text-xs" c="dimmed">
                  {variant.unitValue} {variant.unitId ? `unit` : ''}
                </Text>
              </Group>
            )}
          </Stack>
        </Table.Td>
        <Table.Td ta="right">
          <Stack gap="xs">
            {/* Retail Price */}
            <Box>
              <Text className="text-xs" c="dimmed">Retail</Text>
              <Stack gap={0}>
                {variant.retailOfferPrice && Number(variant.retailOfferPrice) > 0 && Number(variant.retailOfferPrice) < Number(variant.retailPrice) ? (
                  <>
                    <Text className="text-xs" c="dimmed" td="line-through">
                     ৳{Number(variant.retailPrice)?.toFixed(2)}
                    </Text>
                    <Text className="text-sm" c="red" fw={500}>
                     ৳{Number(variant.retailOfferPrice)?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm md:text-base" fw={500}>
                    ৳{Number(variant.retailPrice)?.toFixed(2) || '0.00'}
                  </Text>
                )}
              </Stack>
            </Box>
            {/* Wholesale Price */}
            <Box>
              <Text className="text-xs" c="dimmed">Wholesale</Text>
              <Stack gap={0}>
                {variant.wholesaleOfferPrice && Number(variant.wholesaleOfferPrice) > 0 && Number(variant.wholesaleOfferPrice) < Number(variant.wholesalePrice) ? (
                  <>
                    <Text className="text-xs" c="dimmed" td="line-through">
                      ৳{Number(variant.wholesalePrice)?.toFixed(2)}
                    </Text>
                    <Text className="text-sm" c="green" fw={500}>
                      ৳{Number(variant.wholesaleOfferPrice)?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm md:text-base" fw={500} c="green">
                    ৳{Number(variant.wholesalePrice)?.toFixed(2) || '0.00'}
                  </Text>
                )}
              </Stack>
            </Box>
          </Stack>
        </Table.Td>
        <Table.Td ta="right">
          <Text className="text-sm md:text-base">
            ৳{Number(variant.purchaseCost)?.toFixed(2) || '0.00'}
          </Text>
        </Table.Td>
        <Table.Td ta="right">
          <Stack gap="xs">
            <Box>
              <Text className="text-xs" c="dimmed">Retail ({Math.round(((Number(variant.retailOfferPrice || variant.retailPrice || 0) - Number(variant.purchaseCost || 0)) / (Number(variant.purchaseCost || 1))) * 100)}%)</Text>
              <Text className="text-sm" fw={500} c="blue">
                ৳{(Number(variant.retailOfferPrice || variant.retailPrice || 0) - Number(variant.purchaseCost || 0)).toFixed(2)} 
              </Text>
            </Box>
            <Box>
              <Text className="text-xs" c="dimmed">Wholesale ({Math.round(((Number(variant.wholesaleOfferPrice || variant.wholesalePrice || 0) - Number(variant.purchaseCost || 0)) / (Number(variant.purchaseCost || 1))) * 100)}%)</Text>
              <Text className="text-sm" fw={500} c="green">
                ৳{(Number(variant.wholesaleOfferPrice || variant.wholesalePrice || 0) - Number(variant.purchaseCost || 0)).toFixed(2)} 
              </Text>
            </Box>
          </Stack>
        </Table.Td>
        <Table.Td>
          {getStockBadge(variant.currentStock || 0, variant.stockAlertLevel || 5)}
        </Table.Td>
      </Table.Tr>
    ))
  }, [product?.variants, t, ns, getStockBadge, getChannelBadge])

  // PERFORMANCE: Memoized variant cards (mobile)
  const variantCards = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null

    return product.variants.map((variant) => (
      <Paper withBorder p="sm" radius="sm" key={variant.id}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap={0} className="flex-1">
              <Group gap="xs" align="center" wrap="nowrap">
                <Text className="text-sm md:text-base" fw={500}>
                  {variant.variantName}
                </Text>
                {!variant.isActive && (
                  <Badge color="red" size="xs">
                    {t(`${ns}.detail.variants.inactive`) || 'Inactive'}
                  </Badge>
                )}
              </Group>
              <Text className="text-xs" c="dimmed">
                {variant.sku}
              </Text>
              {variant.allowPreorder && (
                <Group gap="xs" align="center">
                  <Badge color="blue" size="xs" leftSection={<IconClock size={8} />}>
                    {t(`${ns}.detail.variants.preorder`) || 'Preorder'}
                  </Badge>
                  {variant.expectedDelivery && (
                    <Text className="text-xs" c="dimmed">
                      {new Date(variant.expectedDelivery).toLocaleDateString()}
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
            {getStockBadge(variant.currentStock || 0, variant.stockAlertLevel || 5)}
          </Group>

          <SimpleGrid cols={2}>
            {/* Retail Price */}
            <Box>
              <Text className="text-xs" c="dimmed">
                Retail Price
              </Text>
              <Stack gap={0}>
                {variant.retailOfferPrice && Number(variant.retailOfferPrice) > 0 && Number(variant.retailOfferPrice) < Number(variant.retailPrice) ? (
                  <>
                    <Text className="text-xs" c="dimmed" td="line-through">
                      ৳{Number(variant.retailPrice)?.toFixed(2)}
                    </Text>
                    <Text className="text-sm" c="red" fw={500}>
                      ৳{Number(variant.retailOfferPrice)?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm" fw={500}>
                    ৳{Number(variant.retailPrice)?.toFixed(2) || '0.00'}
                  </Text>
                )}
              </Stack>
            </Box>
            {/* Wholesale Price */}
            <Box>
              <Text className="text-xs" c="dimmed">
                Wholesale Price
              </Text>
              <Stack gap={0}>
                {variant.wholesaleOfferPrice && Number(variant.wholesaleOfferPrice) > 0 && Number(variant.wholesaleOfferPrice) < Number(variant.wholesalePrice) ? (
                  <>
                    <Text className="text-xs" c="dimmed" td="line-through">
                      ৳{Number(variant.wholesalePrice)?.toFixed(2)}
                    </Text>
                    <Text className="text-sm" c="green" fw={500}>
                      ৳{Number(variant.wholesaleOfferPrice)?.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text className="text-sm" fw={500} c="green">
                    ৳{Number(variant.wholesalePrice)?.toFixed(2) || '0.00'}
                  </Text>
                )}
              </Stack>
            </Box>
            <Box>
              <Text className="text-xs" c="dimmed">
                {t(`${ns}.detail.variants.cost`) || 'Cost'}
              </Text>
              <Text className="text-sm" fw={500}>
                ৳{Number(variant.purchaseCost)?.toFixed(2) || '0.00'}
              </Text>
            </Box>
            {(variant.moq && variant.moq > 1) && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  Wholesale MOQ
                </Text>
                <Text className="text-sm">{variant.moq}</Text>
              </Box>
            )}
            {variant.material && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  {t(`${ns}.detail.variants.material`) || 'Material'}
                </Text>
                <Text className="text-sm">{variant.material}</Text>
              </Box>
            )}
            {variant.color && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  {t(`${ns}.detail.variants.color`) || 'Color'}
                </Text>
                <Text className="text-sm">{variant.color}</Text>
              </Box>
            )}
            {variant.pattern && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  {t(`${ns}.detail.variants.pattern`) || 'Pattern'}
                </Text>
                <Text className="text-sm">{variant.pattern}</Text>
              </Box>
            )}
          </SimpleGrid>

          {variant.retailOfferPrice && Number(variant.retailOfferPrice) > 0 && Number(variant.retailOfferPrice) < Number(variant.retailPrice) && (
            <Group gap="xs" bg="red.0" p="xs" radius="sm">
              <IconDiscount size={16} className="text-red-600" />
              <Text className="text-xs" c="red">
                Offer: ৳{(Number(variant.retailPrice) - Number(variant.retailOfferPrice)).toFixed(2)} off
                {variant.retailOfferEnds && ` until ${new Date(variant.retailOfferEnds).toLocaleDateString()}`}
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    ))
  }, [product?.variants, t, ns, getStockBadge, getChannelBadge])

  // PERFORMANCE: Memoized gallery images
  const galleryImages = useMemo(() => {
    if (!product?.galleryImagesUrls || product.galleryImagesUrls.length === 0) return null

    return product.galleryImagesUrls.map((imageUrl, index) => (
      <Image
        key={index}
        src={imageUrl}
        alt={`Gallery image ${index + 1}`}
      />
    ))
  }, [product?.galleryImagesUrls])

  // ============================================================================
  // CONDITIONAL RENDERING (After all hooks are called)
  // ============================================================================

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

          {/* Info Card Skeleton */}
          <Skeleton height={200} radius="md" />

          {/* Variants Skeleton */}
          <Skeleton height={300} radius="md" />

          {/* Gallery Skeleton */}
          <Skeleton height={200} radius="md" />
        </Stack>
      </Box>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Stack py="xl" align="center" gap="sm">
            <IconAlertCircle size={48} className="text-red-500" />
            <Title order={3} className="text-lg md:text-xl">
              {error || t('common.noData') || 'Product not found'}
            </Title>
            <Text c="dimmed" className="text-sm md:text-base">
              {t('common.somethingWentWrong') || 'Something went wrong'}
            </Text>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={() => fetchProduct()}
              mt="md"
            >
              {t('common.refresh') || 'Retry'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    )
  }

  // ============================================================================
  // MAIN RENDER (Product loaded successfully)
  // ============================================================================
  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={16} />}>{breadcrumbItems}</Breadcrumbs>

        {/* Header */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            {/* Title row with icon */}
            <Group gap="sm" align="center" wrap="nowrap">
              <IconPackages size={28} className="text-blue-600" />
              <Title order={2} className="text-lg md:text-xl lg:text-2xl">
                {decodeHTMLEntities(product.retailName || product.name)}
              </Title>
            </Group>

            {/* Channel Names */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">Retail Name</Text>
                <Text className="text-sm md:text-base" fw={500}>{decodeHTMLEntities(product.retailName || product.name)}</Text>
                {product.retailNameBn && (
                  <Text className="text-sm" c="dimmed">{product.retailNameBn}</Text>
                )}
              </Stack>
              {(product.wholesaleName || product.wholesaleNameBn) && (
                <Stack gap={4}>
                  <Text size="xs" fw={500} c="dimmed">Wholesale Name</Text>
                  {product.wholesaleName && (
                    <Text className="text-sm md:text-base" fw={500}>{decodeHTMLEntities(product.wholesaleName)}</Text>
                  )}
                  {product.wholesaleNameBn && (
                    <Text className="text-sm" c="dimmed">{product.wholesaleNameBn}</Text>
                  )}
                </Stack>
              )}
            </SimpleGrid>

            {/* Metadata row */}
            <Group gap="sm" align="center">
              <Text className="text-sm md:text-base" c="dimmed">
                {t(`${ns}.detail.header.productId`)}: {product.id}
              </Text>
              <Text size="xs" c="gray.4">
                •
              </Text>
              <Text className="text-sm md:text-base" c="dimmed">
                {t(`${ns}.detail.header.created`)} {new Date(product.createdAt).toLocaleDateString()}
              </Text>
            </Group>

            {/* Short Description */}
            {product.shortDescription && (
              <Box
                className="text-sm md:text-base html-content"
                dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.shortDescription) }}
              />
            )}

            {/* Status badge and actions row */}
            <Group justify="space-between" align="center" wrap={{ base: 'wrap', sm: 'nowrap' }}>
              {getStatusBadge(product.status)}
              <Group gap="sm">
                <Button
                  variant="light"
                  size="sm"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => window.history.back()}
                >
                  {t(`${ns}.detail.header.back`)}
                </Button>
                <Button
                  size="sm"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => navigate(`/catalog/products/${product.id}/edit`)}
                >
                  {t(`${ns}.detail.header.editProduct`)}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Warranty & Package Information */}
        {(product.warrantyEnabled && product.warrantyDetails) || (product.includesInTheBox && (Array.isArray(product.includesInTheBox) ? product.includesInTheBox.length > 0 : product.includesInTheBox.trim())) ? (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {/* Warranty Card */}
            {product.warrantyEnabled && product.warrantyDetails && (
              <Paper withBorder p="md" radius="md">
                <Group gap="md" align="flex-start">
                  <Box className="bg-green-50 p-2 rounded-md">
                    <IconShield size={24} className="text-green-600" />
                  </Box>
                  <Stack gap={0} className="flex-1">
                    <Text className="text-sm md:text-base" fw={500} c="dimmed">
                      {t(`${ns}.detail.warranty.label`) || 'Warranty'}
                    </Text>
                    <div
                      className="text-base md:text-lg html-content"
                      dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.warrantyDetails) }}
                    />
                  </Stack>
                </Group>
              </Paper>
            )}

            {/* What's in the Box Card */}
            {(product.includesInTheBox && (Array.isArray(product.includesInTheBox) ? product.includesInTheBox.length > 0 : product.includesInTheBox.trim())) && (
              <Paper withBorder p="md" radius="md">
                <Group gap="md" align="flex-start">
                  <Box className="bg-blue-50 p-2 rounded-md">
                    <IconBox size={24} className="text-blue-600" />
                  </Box>
                  <Stack gap="xs" className="flex-1">
                    <Text className="text-sm md:text-base" fw={500} c="dimmed">
                      {t(`${ns}.detail.package.label`) || "What's in the Box"}
                    </Text>
                    <Stack gap="xs">
                      {Array.isArray(product.includesInTheBox)
                        ? product.includesInTheBox.map((item, index) => (
                            <Group key={index} gap="xs" align="center">
                              <IconCheck size={14} className="text-blue-600" />
                              <Text className="text-sm md:text-base">{item}</Text>
                            </Group>
                          ))
                        : product.includesInTheBox.split(',').map((item, index) => (
                            <Group key={index} gap="xs" align="center">
                              <IconCheck size={14} className="text-blue-600" />
                              <Text className="text-sm md:text-base">{item.trim()}</Text>
                            </Group>
                          ))
                      }
                    </Stack>
                    {product.includesInTheBoxBn && (
                      <>
                        <Text className="text-sm md:text-base" fw={500} c="dimmed" mt="xs">
                          What's in the Box (Bangla)
                        </Text>
                        <Text className="text-sm md:text-base">{product.includesInTheBoxBn}</Text>
                      </>
                    )}
                  </Stack>
                </Group>
              </Paper>
            )}
          </SimpleGrid>
        ) : null}

        {/* Product Information Card */}
        <Paper withBorder p="md" radius="md">
          <Text fw={600} className="text-base md:text-lg mb-4">
            {t(`${ns}.detail.productInformation.title`)}
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {/* Thumbnail Image */}
            <Group gap="md" align="flex-start">
              <IconPhoto size={24} className="text-gray-500 mt-1" />
              <Stack gap="xs" className="flex-1">
                <Text className="text-sm md:text-base" fw={500} c="dimmed">
                  {t(`${ns}.detail.productInformation.thumbnail`)}
                </Text>
                {product.thumbnail && (
                  <Box
                    w={{ base: 100, sm: 120 }}
                    h={{ base: 100, sm: 120 }}
                    className="bg-gray-100 rounded-md overflow-hidden"
                  >
                    <Image
                      src={product.thumbnail.fullUrl}
                      alt={product.name}
                      w="100%"
                      h="100%"
                      fit="cover"
                      radius="md"
                    />
                  </Box>
                )}
              </Stack>
            </Group>

            {/* Category */}
            {product.category && (
              <Group gap="md" align="flex-start">
                <IconTag size={24} className="text-gray-500 mt-1" />
                <Stack gap={0} className="flex-1">
                  <Text className="text-sm md:text-base" c="dimmed">
                    {t(`${ns}.detail.productInformation.category`)}
                  </Text>
                  <Anchor
                    href={`/catalog/categories/${product.category.id}`}
                    className="text-base md:text-lg"
                  >
                    {product.category.name}
                  </Anchor>
                </Stack>
              </Group>
            )}

            {/* Brand */}
            {product.brand && (
              <Group gap="md" align="flex-start">
                <IconBuilding size={24} className="text-gray-500 mt-1" />
                <Stack gap={0} className="flex-1">
                  <Text className="text-sm md:text-base" c="dimmed">
                    {t(`${ns}.detail.productInformation.brand`)}
                  </Text>
                  <Anchor
                    href={`/catalog/brands/${product.brand.id}`}
                    className="text-base md:text-lg"
                  >
                    {product.brand.name}
                  </Anchor>
                </Stack>
              </Group>
            )}

            {/* Slug */}
            {product.slug && (
              <Group gap="md" align="flex-start">
                <IconWorld size={24} className="text-gray-500 mt-1" />
                <Stack gap={0} className="flex-1">
                  <Text className="text-sm md:text-base" c="dimmed">
                    {t(`${ns}.detail.productInformation.urlSlug`)}
                  </Text>
                  <Text className="text-sm md:text-base break-all" fw={500}>
                    {product.slug}
                  </Text>
                </Stack>
              </Group>
            )}
          </SimpleGrid>

          {/* Video URL */}
          {product.videoUrl && (
            <Group gap="md" align="flex-start" mt="md">
              <IconWorld size={24} className="text-gray-500 mt-1" />
              <Stack gap={0} className="flex-1">
                <Text className="text-sm md:text-base" fw={500} c="dimmed">
                  {t(`${ns}.detail.productInformation.videoUrl`)}
                </Text>
                <Anchor
                  href={product.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm md:text-base break-all"
                >
                  {product.videoUrl}
                </Anchor>
              </Stack>
            </Group>
          )}
        </Paper>

        {/* SEO Information */}
        {(product.seoTitle || product.seoDescription || (product.seoTags && product.seoTags.length > 0)) && (
          <Paper withBorder p="md" radius="md">
            <Group gap="md" align="center" mb="md">
              <IconSearch size={24} className="text-gray-500" />
              <Text fw={600} className="text-base md:text-lg">
                {t(`${ns}.detail.seo.title`) || 'SEO Information'}
              </Text>
            </Group>
            <Stack gap="md" ml={46}>
              {product.seoTitle && (
                <Stack gap="xs">
                  <Text className="text-sm" fw={500} c="dimmed">
                    {t(`${ns}.detail.seo.title`) || 'SEO Title'}
                  </Text>
                  <Text className="text-sm md:text-base">{product.seoTitle}</Text>
                </Stack>
              )}
              {product.seoDescription && (
                <Stack gap="xs">
                  <Text className="text-sm" fw={500} c="dimmed">
                    {t(`${ns}.detail.seo.description`) || 'SEO Description'}
                  </Text>
                  <Text className="text-sm md:text-base">{product.seoDescription}</Text>
                </Stack>
              )}
              {product.seoTags && product.seoTags.length > 0 && (
                <Stack gap="xs">
                  <Text className="text-sm" fw={500} c="dimmed">
                    {t(`${ns}.detail.seo.tags`) || 'SEO Tags'}
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {product.seoTags.map((tag, index) => (
                      <Badge key={index} variant="light" size="sm" leftSection={<IconTag size={12} />}>
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {/* Product Variants Section */}
        {product.variants && product.variants.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="center" mb="md">
              <Text fw={600} className="text-base md:text-lg">
                {t(`${ns}.detail.variants.title`)} ({product.variants.length})
              </Text>
            </Group>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t(`${ns}.detail.variants.variant`) || 'Variant'}</Table.Th>
                    <Table.Th>{t(`${ns}.detail.variants.sku`) || 'SKU'}</Table.Th>
                    <Table.Th>{t(`${ns}.detail.variants.attributes`) || 'Attributes'}</Table.Th>
                    <Table.Th ta="right">Retail / Wholesale Price</Table.Th>
                    <Table.Th ta="right">{t(`${ns}.detail.variants.cost`) || 'Cost'}</Table.Th>
                    <Table.Th ta="right">{t(`${ns}.detail.variants.profit`) || 'Profit'}</Table.Th>
                    <Table.Th>{t(`${ns}.detail.variants.stock`) || 'Stock'}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {variantTableRows}
                </Table.Tbody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden">
              <Stack gap="sm">
                {variantCards}
              </Stack>
            </div>
          </Paper>
        )}

        {/* Gallery Images Section */}
        {product.galleryImagesUrls && product.galleryImagesUrls.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="center" mb="md">
              <Text fw={600} className="text-base md:text-lg">
                {t(`${ns}.detail.gallery.title`)} ({product.galleryImagesUrls.length})
              </Text>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="sm">
              {galleryImages}
            </SimpleGrid>
          </Paper>
        )}

        {/* Product Highlights */}
        {((product.highlights && product.highlights.length > 0) || (product.highlightsBn && product.highlightsBn.length > 0)) && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="center" mb="sm">
              <Group gap="md" align="center">
                <Box className="bg-yellow-50 p-2 rounded-md">
                  <IconBulb size={24} className="text-yellow-600" />
                </Box>
                <Text fw={600} className="text-base md:text-lg">
                  {t(`${ns}.detail.highlights.title`) || 'Product Highlights'}
                </Text>
              </Group>
              {product.highlightsBn && product.highlightsBn.length > 0 && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setDescLang(prev => prev === 'en' ? 'bn' : 'en')}
                >
                  {descLang === 'en' ? 'বাংলা' : 'English'}
                </Button>
              )}
            </Group>
            <Stack gap="xs" ml={46}>
              {(descLang === 'en' ? product.highlights : product.highlightsBn)?.map((highlight, index) => (
                <Group key={index} gap="xs" align="flex-start">
                  <IconCheck size={16} className="text-green-600 mt-1" />
                  <Text className="text-sm md:text-base">{highlight}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Description */}
        {(product.description || product.descriptionBn) && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="center" mb="md">
              <Text fw={600} className="text-base md:text-lg">
                {t(`${ns}.detail.productInformation.description`)}
              </Text>
              {product.descriptionBn && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setDescLang(prev => prev === 'en' ? 'bn' : 'en')}
                >
                  {descLang === 'en' ? 'বাংলা' : 'English'}
                </Button>
              )}
            </Group>
            <Box
              className="text-sm md:text-base html-content wrap-break-word overflow-hidden product-description"
              dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(descLang === 'en' ? (product.description || '') : (product.descriptionBn || '')) }}
            />
          </Paper>
        )}

        {/* Cross Sale Products Section */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center" mb="md">
            <Group gap="sm" align="center">
              <IconShoppingBag size={22} className="text-violet-600" />
              <Text fw={600} className="text-base md:text-lg">
                Cross Sale Products ({crossSaleCount}/3)
              </Text>
            </Group>
          </Group>

          <Text c="dimmed" className="text-sm mb-4">
            Products recommended as cross-sell when customers view this product. Max 3 products.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {/* Render existing cross-sale products */}
            {product.crossSaleProducts?.map((cs) => (
              <Paper
                key={cs.id}
                withBorder
                p="sm"
                radius="md"
                className="hover:border-violet-300 transition-colors"
              >
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <Box
                    w={56}
                    h={56}
                    className="bg-gray-100 rounded-md overflow-hidden shrink-0"
                  >
                    {cs.thumbnailUrl ? (
                      <Image
                        src={cs.thumbnailUrl}
                        alt={cs.name}
                        w="100%"
                        h="100%"
                        fit="cover"
                        radius="sm"
                      />
                    ) : (
                      <Stack align="center" justify="center" h="100%">
                        <IconPhoto size={20} className="text-gray-400" />
                      </Stack>
                    )}
                  </Box>
                  <Stack gap={2} className="flex-1 min-w-0">
                    <Text className="text-sm" fw={500} lineClamp={1}>
                      {cs.name}
                    </Text>
                    <Anchor
                      className="text-xs"
                      c="dimmed"
                      href={`/catalog/products/${cs.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/catalog/products/${cs.id}`)
                      }}
                    >
                      View product
                    </Anchor>
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveCrossSale(cs.id)
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

            {/* Empty Add Slot */}
            {crossSaleCount < 3 && (
              <Paper
                withBorder
                p="md"
                radius="md"
                className="border-dashed border-2 border-gray-300 hover:border-violet-400 hover:bg-violet-50/30 transition-colors cursor-pointer"
                onClick={() => openModal(product.id, product.crossSaleProducts?.map((p) => p.id) ?? [])}
              >
                <Stack align="center" justify="center" h="100%" py="sm">
                  <Box className="bg-gray-100 rounded-full p-2">
                    <IconPlus size={20} className="text-gray-500" />
                  </Box>
                  <Text className="text-xs md:text-sm" c="dimmed" fw={500}>
                    Add Product
                  </Text>
                </Stack>
              </Paper>
            )}
          </SimpleGrid>
        </Paper>

        {/* Cross Sale Product Selection Modal */}
        <Modal
          opened={modalOpen}
          onClose={closeModal}
          title="Select Cross Sale Products"
          size="90%"
          centered
        >
          <Stack gap="md">
            <TextInput
              placeholder="Search products by name..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.currentTarget.value)}
            />

            <Group gap="xs" align="center">
              <Text className="text-sm" c="dimmed">
                Selected: {selectedIds.length}/3
              </Text>
            </Group>

            <ScrollArea mah={450}>
              {modalLoading ? (
                <Stack align="center" py="xl">
                  <Loader size="md" />
                  <Text c="dimmed" className="text-sm">Loading products...</Text>
                </Stack>
              ) : modalProducts.length === 0 ? (
                <Stack align="center" py="xl">
                  <IconPhoto size={40} className="text-gray-300" />
                  <Text c="dimmed" className="text-sm">No products found</Text>
                </Stack>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="sm">
                  {modalProducts.map((p) => {
                    const isSelected = selectedIds.includes(p.id)
                    const isSelf = p.id === product.id
                    const isDisabled = isSelf || (!isSelected && selectedIds.length >= 3)
                    const variantCount = p.variants?.length ?? 0
                    const wholesaleVariant = p.variants?.find((v: any) => v.channel === 'wholesale')
                    const retailVariant = p.variants?.find((v: any) => v.channel === 'retail')
                    const displayPrice = wholesaleVariant?.price ?? retailVariant?.price ?? p.variants?.[0]?.price

                    return (
                      <Paper
                        key={p.id}
                        withBorder
                        p="sm"
                        radius="md"
                        className={`transition-colors ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' :
                          isSelected ? 'border-violet-500 bg-violet-50 cursor-pointer' :
                          'hover:border-gray-400 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && toggleSelect(p.id)}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <Box
                            w={52}
                            h={52}
                            className="bg-gray-100 rounded-md overflow-hidden shrink-0"
                          >
                            {p.thumbnail?.fullUrl ? (
                              <Image
                                src={p.thumbnail.fullUrl}
                                alt={p.name}
                                w="100%"
                                h="100%"
                                fit="cover"
                                radius="sm"
                              />
                            ) : (
                              <Stack align="center" justify="center" h="100%">
                                <IconPhoto size={20} className="text-gray-400" />
                              </Stack>
                            )}
                          </Box>
                          <Stack gap={2} className="flex-1 min-w-0">
                            <Text className="text-sm" fw={500} lineClamp={1}>
                              {p.name}
                            </Text>
                            <Group gap="xs" wrap="nowrap">
                              {displayPrice != null && (
                                <Text className="text-xs" fw={600} c="violet">
                                  ৳{Number(displayPrice).toFixed(0)}
                                </Text>
                              )}
                              <Badge size="xs" variant="light" color="gray" radius="sm">
                                {variantCount} variant{variantCount !== 1 ? 's' : ''}
                              </Badge>
                            </Group>
                            {p.category?.name && (
                              <Text className="text-xs" c="dimmed">{p.category.name}</Text>
                            )}
                          </Stack>
                          {isSelected && (
                            <Badge color="violet" variant="filled" size="sm">
                              <IconCheck size={12} />
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    )
                  })}
                </SimpleGrid>
              )}
            </ScrollArea>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const ok = await save()
                  if (ok) {
                    closeModal()
                    fetchProduct() // refresh page data
                  }
                }}
              >
                Save Selection
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Up Sale Products Section */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center" mb="md">
            <Group gap="sm" align="center">
              <IconTrendingUp size={22} className="text-teal-600" />
              <Text fw={600} className="text-base md:text-lg">
                Up Sale Products ({upSaleCount}/3)
              </Text>
            </Group>
          </Group>

          <Text c="dimmed" className="text-sm mb-4">
            Products suggested as upgrades or premium alternatives. Max 3 products.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {/* Render existing up-sale products */}
            {product.upSaleProducts?.map((us) => (
              <Paper
                key={us.id}
                withBorder
                p="sm"
                radius="md"
                className="hover:border-teal-300 transition-colors"
              >
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <Box
                    w={56}
                    h={56}
                    className="bg-gray-100 rounded-md overflow-hidden shrink-0"
                  >
                    {us.thumbnailUrl ? (
                      <Image
                        src={us.thumbnailUrl}
                        alt={us.name}
                        w="100%"
                        h="100%"
                        fit="cover"
                        radius="sm"
                      />
                    ) : (
                      <Stack align="center" justify="center" h="100%">
                        <IconPhoto size={20} className="text-gray-400" />
                      </Stack>
                    )}
                  </Box>
                  <Stack gap={2} className="flex-1 min-w-0">
                    <Text className="text-sm" fw={500} lineClamp={1}>
                      {us.name}
                    </Text>
                    <Anchor
                      className="text-xs"
                      c="dimmed"
                      href={`/catalog/products/${us.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/catalog/products/${us.id}`)
                      }}
                    >
                      View product
                    </Anchor>
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveUpSale(us.id)
                    }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

            {/* Empty Add Slot */}
            {upSaleCount < 3 && (
              <Paper
                withBorder
                p="md"
                radius="md"
                className="border-dashed border-2 border-gray-300 hover:border-teal-400 hover:bg-teal-50/30 transition-colors cursor-pointer"
                onClick={() => openUpSaleModal(product.id, product.upSaleProducts?.map((p) => p.id) ?? [])}
              >
                <Stack align="center" justify="center" h="100%" py="sm">
                  <Box className="bg-gray-100 rounded-full p-2">
                    <IconPlus size={20} className="text-gray-500" />
                  </Box>
                  <Text className="text-xs md:text-sm" c="dimmed" fw={500}>
                    Add Product
                  </Text>
                </Stack>
              </Paper>
            )}
          </SimpleGrid>
        </Paper>

        {/* Up Sale Product Selection Modal */}
        <Modal
          opened={upSaleModalOpen}
          onClose={closeUpSaleModal}
          title="Select Up Sale Products"
          size="90%"
          centered
        >
          <Stack gap="md">
            <TextInput
              placeholder="Search products by name..."
              leftSection={<IconSearch size={16} />}
              value={upSaleSearchQuery}
              onChange={(e) => handleUpSaleSearchChange(e.currentTarget.value)}
            />

            <Group gap="xs" align="center">
              <Text className="text-sm" c="dimmed">
                Selected: {upSaleSelectedIds.length}/3
              </Text>
            </Group>

            <ScrollArea mah={450}>
              {upSaleModalLoading ? (
                <Stack align="center" py="xl">
                  <Loader size="md" />
                  <Text c="dimmed" className="text-sm">Loading products...</Text>
                </Stack>
              ) : upSaleModalProducts.length === 0 ? (
                <Stack align="center" py="xl">
                  <IconPhoto size={40} className="text-gray-300" />
                  <Text c="dimmed" className="text-sm">No products found</Text>
                </Stack>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="sm">
                  {upSaleModalProducts.map((p) => {
                    const isSelected = upSaleSelectedIds.includes(p.id)
                    const isSelf = p.id === product.id
                    const isDisabled = isSelf || (!isSelected && upSaleSelectedIds.length >= 3)
                    const variantCount = p.variants?.length ?? 0
                    const wholesaleVariant = p.variants?.find((v: any) => v.channel === 'wholesale')
                    const retailVariant = p.variants?.find((v: any) => v.channel === 'retail')
                    const displayPrice = wholesaleVariant?.price ?? retailVariant?.price ?? p.variants?.[0]?.price

                    return (
                      <Paper
                        key={p.id}
                        withBorder
                        p="sm"
                        radius="md"
                        className={`transition-colors ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' :
                          isSelected ? 'border-teal-500 bg-teal-50 cursor-pointer' :
                          'hover:border-gray-400 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && toggleUpSaleSelect(p.id)}
                      >
                        <Group gap="sm" wrap="nowrap">
                          <Box
                            w={52}
                            h={52}
                            className="bg-gray-100 rounded-md overflow-hidden shrink-0"
                          >
                            {p.thumbnail?.fullUrl ? (
                              <Image
                                src={p.thumbnail.fullUrl}
                                alt={p.name}
                                w="100%"
                                h="100%"
                                fit="cover"
                                radius="sm"
                              />
                            ) : (
                              <Stack align="center" justify="center" h="100%">
                                <IconPhoto size={20} className="text-gray-400" />
                              </Stack>
                            )}
                          </Box>
                          <Stack gap={2} className="flex-1 min-w-0">
                            <Text className="text-sm" fw={500} lineClamp={1}>
                              {p.name}
                            </Text>
                            <Group gap="xs" wrap="nowrap">
                              {displayPrice != null && (
                                <Text className="text-xs" fw={600} c="teal">
                                  ৳{Number(displayPrice).toFixed(0)}
                                </Text>
                              )}
                              <Badge size="xs" variant="light" color="gray" radius="sm">
                                {variantCount} variant{variantCount !== 1 ? 's' : ''}
                              </Badge>
                            </Group>
                            {p.category?.name && (
                              <Text className="text-xs" c="dimmed">{p.category.name}</Text>
                            )}
                          </Stack>
                          {isSelected && (
                            <Badge color="teal" variant="filled" size="sm">
                              <IconCheck size={12} />
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    )
                  })}
                </SimpleGrid>
              )}
            </ScrollArea>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeUpSaleModal}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const ok = await saveUpSale()
                  if (ok) {
                    closeUpSaleModal()
                    fetchProduct()
                  }
                }}
              >
                Save Selection
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Thank You Product Toggle */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <Group gap="sm" align="center">
              <Box className="bg-pink-50 p-2 rounded-md">
                <IconHeart size={22} className="text-pink-600" />
              </Box>
              <div>
                <Text fw={600} className="text-base md:text-lg">
                  Thank You Product
                </Text>
                <Text c="dimmed" className="text-xs">
                  Mark this product to be shown on order confirmation page
                </Text>
              </div>
            </Group>
            <Switch
              checked={product.thankYou ?? false}
              onChange={(event) => handleToggleThankYou(event.currentTarget.checked)}
              size="md"
              onLabel="Yes"
              offLabel="No"
            />
          </Group>
        </Paper>
      </Stack>
    </Box>
  )
}
