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
  Grid,
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
  IconEyeOff,
  IconExternalLink,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getProduct, updateProduct, getProducts, deleteProduct } from '@/utils/api'
import { useCrossSaleStore } from '@/modules/catalog/stores/crossSaleStore'
import { useUpSaleStore } from '@/modules/catalog/stores/upSaleStore'

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
  url: string
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
  thumbnail?: string | null
  thumbnailUrl?: string | null
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
  productCode?: number | null
  warrantyEnabled?: boolean | null
  warrantyDetails?: string | null
  highlights?: string[] | null
  highlightsBn?: string[] | null
  attributes?: string[] | null
  attributesBn?: string[] | null
  includesInBox?: string[] | string | null
  includesInBoxBn?: string[] | null
  videoUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoTags?: string[] | null
  thumbnail?: MediaFile | null
  thumbnailUrl?: string | null
  category?: Category | null
  brand?: Brand | null
  variants?: ProductVariant[] | null
  galleryImages?: number[] | null // Internal IDs
  galleryImagesUrls?: string[] | null // Public URLs for display
  crossSaleProducts?: Array<{ id: number; name: string; slug: string; thumbnailUrl?: string | null }>
  upSaleProducts?: Array<{ id: number; name: string; slug: string; thumbnailUrl?: string | null }>
  thankYou?: boolean
  hideFromWebsite?: boolean
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Get the slug or id from URL params
  const slugOrId = id || ''

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

  // ============================================================================
  // ALL HOOKS MUST BE CALLED AT THE TOP (Rules of Hooks)
  // ============================================================================

  // PERFORMANCE: Memoized callback for fetchProduct
  const fetchProduct = useCallback(async () => {
    if (!slugOrId) return

    try {
      setLoading(true)
      setError(null)
      // Use slug for API call - backend accepts both ID and slug
      const response = await getProduct(slugOrId)

      // Handle different response structures
      // getProduct returns { status: true, message: "...", data: {...product...} }
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
  }, [slugOrId, t])

  // Delete product - open confirmation modal
  const handleDeleteProduct = useCallback(() => {
    setDeleteModalOpen(true)
  }, [])

  // Confirm and execute delete
  const confirmDeleteProduct = useCallback(async () => {
    if (!product) return

    try {
      await deleteProduct(product.id)
      notifications.show({
        title: t('common.success') || 'Success',
        message: 'Product deleted successfully',
        color: 'green',
      })
      setDeleteModalOpen(false)
      navigate('/catalog/products')
    } catch (error: any) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || 'Failed to delete product',
        color: 'red',
      })
    }
  }, [product, navigate, t])

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

  // Toggle hide from website status
  const handleToggleHideFromWebsite = useCallback(async (checked: boolean) => {
    if (!product) return
    const previous = product.hideFromWebsite
    setProduct({ ...product, hideFromWebsite: checked })
    try {
      await updateProduct(product.id, { hideFromWebsite: checked })
      notifications.show({ title: 'Updated', message: checked ? 'Hidden from website' : 'Visible on website', color: 'green' })
    } catch {
      setProduct({ ...product, hideFromWebsite: previous })
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
      notifications.show({ title: 'Error', message: 'Failed to remove up-sale product', color: 'red' })
    }
  }, [product, fetchProduct])

  // PERFORMANCE: Memoized status configuration
  const statusConfig = useMemo<Record<string, { color: string; label: string }>>(() => ({
    draft: { color: 'gray', label: t('catalog.productsDetail.status.draft') || 'Draft' },
    published: { color: 'green', label: t('catalog.productsDetail.status.published') || 'Published' },
    archived: { color: 'red', label: t('catalog.productsDetail.status.archived') || 'Archived' },
  }), [t])

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
        <Badge color="red">
          0
        </Badge>
      )
    }
    if (stock <= alertLevel) {
      return (
        <Badge color="orange" leftSection={<IconCube size={12} />}>
          {t('catalog.productsDetail.variants.lowStock', { count: stock })}
        </Badge>
      )
    }
    return (
      <Badge color="teal" leftSection={<IconCube size={12} />}>
        {t('catalog.productsDetail.variants.inStock', { count: stock })}
      </Badge>
    )
  }, [t])

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
  }, [t])

  const getActiveStatusBadge = useCallback((isActive: boolean) => {
    return (
      <Badge color={isActive ? 'teal' : 'red'} variant="light" size="sm" leftSection={isActive ? <IconCheck size={10} /> : <IconX size={10} />}>
        {isActive ? t('catalog.productsDetail.variants.active') || 'Active' : t('catalog.productsDetail.variants.inactive') || 'Inactive'}
      </Badge>
    )
  }, [t])

  // PERFORMANCE: Memoized breadcrumb items
  const breadcrumbItems = useMemo(() => {
    if (!product) return []
    return [
      { title: t('catalog.productsDetail.breadcrumbs.dashboard'), href: '/dashboard' },
      { title: t('catalog.productsDetail.breadcrumbs.catalog'), href: '/catalog' },
      { title: t('catalog.productsDetail.breadcrumbs.products'), href: '/catalog/products' },
      { title: decodeHTMLEntities(product.name), href: `/catalog/products/${product.slug}` },
    ].map((item, index) => (
      <Anchor href={item.href} key={index} className="text-sm md:text-base">
        {item.title}
      </Anchor>
    ))
  }, [t, product])

  // PERFORMANCE: Memoized variant table rows (desktop)
  const variantTableRows = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null

    return product.variants.map((variant) => (
      <Table.Tr
        key={variant.id}
        style={{
          backgroundColor: ((variant.currentStock ?? variant.stock ?? 0) === 0) ? 'rgba(253, 186, 116, 0.12)' : undefined
        }}
      >
        <Table.Td>
          <Text className="text-sm" fw={600} c="blue">
            {variant.id}
          </Text>
        </Table.Td>
        <Table.Td>
          {variant.thumbnail || variant.thumbnailUrl ? (
            <Image src={variant.thumbnail || variant.thumbnailUrl} width={30} height={30} fit="cover" radius="md" style={{ width: 30, height: 30, minWidth: 30, minHeight: 30 }} />
          ) : (
            <Box w={30} h={30} display="flex" bg="gray.0" style={{ border: '1px dashed #ced4da', borderRadius: '6px', minWidth: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center' }}>
              <IconPhoto size={14} c="gray.4" />
            </Box>
          )}
        </Table.Td>
        <Table.Td>
          <Stack gap="xs">
            <Text className="text-sm md:text-base" fw={500}>
              {variant.variantName}
            </Text>
            {!variant.isActive && (
              <Badge color="red" size="xs">
                {t('catalog.productsDetail.variants.inactive') || 'Inactive'}
              </Badge>
            )}
            {variant.allowPreorder && (
              <Group gap="xs" align="center">
                <Badge color="blue" size="xs" leftSection={<IconClock size={10} />}>
                  {t('catalog.productsDetail.variants.preorder') || 'Preorder'}
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
  }, [product?.variants, t, getStockBadge, getChannelBadge])

  // PERFORMANCE: Memoized variant cards (mobile)
  const variantCards = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null

    return product.variants.map((variant) => (
      <Paper withBorder p="sm" radius="sm" key={variant.id}>
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="flex-start" className="flex-1">
              {variant.thumbnail || variant.thumbnailUrl ? (
                <Image src={variant.thumbnail || variant.thumbnailUrl} width={30} height={30} fit="cover" radius="md" style={{ width: 30, height: 30, minWidth: 30, minHeight: 30 }} />
              ) : (
                <Box w={30} h={30} display="flex" bg="gray.0" style={{ border: '1px dashed #ced4da', borderRadius: '6px', flexShrink: 0, minWidth: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center' }}>
                  <IconPhoto size={14} c="gray.4" />
                </Box>
              )}
              <Stack gap={0} className="flex-1">
                <Group gap="xs" align="center" wrap="nowrap">
                  <Text className="text-sm md:text-base" fw={500}>
                    {variant.variantName}
                  </Text>
                  {!variant.isActive && (
                    <Badge color="red" size="xs">
                      {t('catalog.productsDetail.variants.inactive') || 'Inactive'}
                    </Badge>
                  )}
                </Group>
              <Text className="text-xs" c="dimmed">
                {variant.sku}
              </Text>
              {variant.allowPreorder && (
                <Group gap="xs" align="center">
                  <Badge color="blue" size="xs" leftSection={<IconClock size={8} />}>
                    {t('catalog.productsDetail.variants.preorder') || 'Preorder'}
                  </Badge>
                  {variant.expectedDelivery && (
                    <Text className="text-xs" c="dimmed">
                      {new Date(variant.expectedDelivery).toLocaleDateString()}
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
          </Group>
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
                {t('catalog.productsDetail.variants.cost') || 'Cost'}
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
                  {t('catalog.productsDetail.variants.material') || 'Material'}
                </Text>
                <Text className="text-sm">{variant.material}</Text>
              </Box>
            )}
            {variant.color && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  {t('catalog.productsDetail.variants.color') || 'Color'}
                </Text>
                <Text className="text-sm">{variant.color}</Text>
              </Box>
            )}
            {variant.pattern && (
              <Box>
                <Text className="text-xs" c="dimmed">
                  {t('catalog.productsDetail.variants.pattern') || 'Pattern'}
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
  }, [product?.variants, t, getStockBadge, getChannelBadge])

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
    <Box p={{ base: 'sm', md: 'lg', xl: 'xl' }}>
      <Stack gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs separator=">" style={{ fontSize: '14px' }}>{breadcrumbItems}</Breadcrumbs>

        {/* Header */}
        <Paper withBorder p="sm" radius="md">
          <Stack gap="xs">
            {/* Title row with icon */}
            <Group gap="sm" align="center" wrap="nowrap">
              <IconPackages size={24} className="text-blue-600" />
              <Title order={2} className="text-lg md:text-xl lg:text-2xl">
                {decodeHTMLEntities(product.retailName || product.name)}
              </Title>
            </Group>

            {/* Channel Names */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.retailNameEnglish') || 'Retail Name (English)'}</Text>
                <Text className="text-sm md:text-base" fw={500}>{decodeHTMLEntities(product.retailName || product.name)}</Text>
                {product.retailNameBn && (
                  <>
                    <Text size="xs" fw={500} c="dimmed" mt="xs">{t('catalog.productsDetail.retailNameBangla') || 'Retail Name (Bangla)'}</Text>
                    <Text className="text-sm md:text-base">{product.retailNameBn}</Text>
                  </>
                )}
              </Stack>
              {(product.wholesaleName || product.wholesaleNameBn) && (
                <Stack gap={4}>
                  <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.wholesaleNameEnglish') || 'Wholesale Name (English)'}</Text>
                  {product.wholesaleName && (
                    <Text className="text-sm md:text-base" fw={500}>{decodeHTMLEntities(product.wholesaleName)}</Text>
                  )}
                  {product.wholesaleNameBn && (
                    <>
                      <Text size="xs" fw={500} c="dimmed" mt="xs">{t('catalog.productsDetail.wholesaleNameBangla') || 'Wholesale Name (Bangla)'}</Text>
                      <Text className="text-sm md:text-base">{product.wholesaleNameBn}</Text>
                    </>
                  )}
                </Stack>
              )}
            </SimpleGrid>

            {/* Metadata row */}
            <Group gap="sm" align="center">
              <Text size="sm" c="dimmed">
                ID: {product.id}
              </Text>
              {product.productCode && (
                <>
                  <Text size="xs" c="gray.4">
                    •
                  </Text>
                  <Text size="sm" c="dimmed">
                    Code: {product.productCode}
                  </Text>
                  <Text size="xs" c="gray.4">
                    •
                  </Text>
                </>
              )}
              <Text size="sm" c="dimmed">
                {new Date(product.createdAt).toLocaleDateString()}
              </Text>
            </Group>
            {/* Status badge and actions row */}
            <Group justify="space-between" align="center">
              {getStatusBadge(product.status)}
              <Group gap="xs">
                {product.slug && (
                  <Button
                    size="xs"
                    variant="light"
                    component="a"
                    href={`https://www.hooknhunt.com/products/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    leftSection={<IconExternalLink size={14} />}
                  >
                    View on Website
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => window.open(`/catalog/products/${product.slug}/edit`, '_blank')}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => handleDeleteProduct()}
                >
                  Delete
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Warranty & Package Information */}
        {(product.warrantyEnabled === true && product.warrantyDetails) || (product.includesInBox && (Array.isArray(product.includesInBox) ? product.includesInBox.length > 0 : product.includesInBox.trim())) ? (
          <>
            {/* Warranty Card */}
            {product.warrantyEnabled === true && product.warrantyDetails && (
              <Paper withBorder p="sm" radius="sm">
                <Group gap="sm" align="flex-start">
                  <IconShield size={20} style={{ color: '#16a34a' }} />
                  <Stack gap={4} className="flex-1">
                    <Text size="xs" fw={500} c="dimmed">
                      {t('catalog.productsDetail.warranty.label') || 'Warranty'}
                    </Text>
                    <div
                      className="text-sm html-content"
                      dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.warrantyDetails) }}
                    />
                  </Stack>
                </Group>
              </Paper>
            )}

            {/* What's in the Box Card */}
            {((Array.isArray(product.includesInBox) && product.includesInBox.length > 0) || (Array.isArray(product.includesInBoxBn) && product.includesInBoxBn.length > 0)) && (
              <Paper withBorder p="sm" radius="sm">
                <Group gap="sm" align="flex-start">
                  <IconBox size={20} style={{ color: '#2563eb' }} />
                  <Stack gap="xs" className="flex-1">
                    <Text size="xs" fw={500} c="dimmed">
                      {t('catalog.productsDetail.package.label') || "What's in the Box"}
                    </Text>
                    <Grid>
                      {/* English */}
                      {Array.isArray(product.includesInBox) && product.includesInBox.length > 0 && (
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Stack gap="xs">
                            {product.includesInBox.map((item, index) => (
                              <Group key={`en-${index}`} gap={6} align="flex-start">
                                <IconCheck size={12} style={{ color: '#2563eb' }} />
                                <Text size="sm">{item}</Text>
                              </Group>
                            ))}
                          </Stack>
                        </Grid.Col>
                      )}
                      {/* Bangla */}
                      {Array.isArray(product.includesInBoxBn) && product.includesInBoxBn.length > 0 && (
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Stack gap="xs">
                            {product.includesInBoxBn.map((item, index) => (
                              <Group key={`bn-${index}`} gap={6} align="flex-start">
                                <IconCheck size={12} style={{ color: '#2563eb' }} />
                                <Text size="sm">{item}</Text>
                              </Group>
                            ))}
                          </Stack>
                        </Grid.Col>
                      )}
                    </Grid>
                  </Stack>
                </Group>
              </Paper>
            )}
          </>
        ) : null}

        {/* Product Information Card */}
        <Paper withBorder p="sm" radius="sm">
          <Text fw={600} size="sm" mb="xs">
            {t('catalog.productsDetail.productInformation.title')}
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
            {/* Thumbnail Image */}
            <Group gap="sm" align="flex-start">
              <IconPhoto size={18} className="text-gray-500 mt-0.5" />
              <Stack gap="xs" className="flex-1">
                <Text size="xs" c="dimmed">
                  {t('catalog.productsDetail.productInformation.thumbnail')}
                </Text>
                {product.thumbnailUrl && (
                  <Box
                    w={80}
                    h={80}
                    style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}
                  >
                    <Image
                      src={product.thumbnailUrl}
                      alt={product.name}
                      w="100%"
                      h="100%"
                      fit="cover"
                      radius="sm"
                    />
                  </Box>
                )}
              </Stack>
            </Group>

            {/* Category */}
            {product.category && (
              <Group gap="sm" align="flex-start">
                <IconTag size={18} className="text-gray-500 mt-0.5" />
                <Stack gap={0} className="flex-1">
                  <Text size="xs" c="dimmed">
                    {t('catalog.productsDetail.productInformation.category')}
                  </Text>
                  <Anchor href={`/catalog/categories/${product.category.id}`} size="sm">
                    {product.category.name}
                  </Anchor>
                </Stack>
              </Group>
            )}

            {/* Brand */}
            {product.brand && (
              <Group gap="sm" align="flex-start">
                <IconBuilding size={18} className="text-gray-500 mt-0.5" />
                <Stack gap={0} className="flex-1">
                  <Text size="xs" c="dimmed">
                    {t('catalog.productsDetail.productInformation.brand')}
                  </Text>
                  <Anchor href={`/catalog/brands/${product.brand.id}`} size="sm">
                    {product.brand.name}
                  </Anchor>
                </Stack>
              </Group>
            )}

            {/* Slug */}
            {product.slug && (
              <Group gap="sm" align="flex-start">
                <IconWorld size={18} className="text-gray-500 mt-0.5" />
                <Stack gap={0} className="flex-1">
                  <Text size="xs" c="dimmed">
                    {t('catalog.productsDetail.productInformation.urlSlug')}
                  </Text>
                  <Text size="sm" fw={500} className="break-all">
                    {product.slug}
                  </Text>
                </Stack>
              </Group>
            )}
          </SimpleGrid>

          {/* Video URL */}
          {product.videoUrl && (
            <Group gap="sm" align="flex-start" mt="xs">
              <IconWorld size={18} className="text-gray-500 mt-0.5" />
              <Stack gap={0} className="flex-1">
                <Text size="xs" fw={500} c="dimmed">
                  {t('catalog.productsDetail.productInformation.videoUrl')}
                </Text>
                <Anchor href={product.videoUrl} target="_blank" rel="noopener noreferrer" size="sm" className="break-all">
                  {product.videoUrl}
                </Anchor>
              </Stack>
            </Group>
          )}
        </Paper>

        {/* SEO Information */}
        {(product.seoTitle || product.seoDescription || (product.seoTags && product.seoTags.length > 0)) && (
          <Paper withBorder p="sm" radius="sm">
            <Group gap="sm" align="center" mb="xs">
              <IconSearch size={18} className="text-gray-500" />
              <Text fw={600} size="sm">
                {t('catalog.productsDetail.seo.title') || 'SEO Information'}
              </Text>
            </Group>
            <Stack gap="xs" ml={34}>
              {product.seoTitle && (
                <Stack gap="xs">
                  <Text size="xs" fw={500} c="dimmed">
                    {t('catalog.productsDetail.seo.title') || 'SEO Title'}
                  </Text>
                  <Text size="sm">{product.seoTitle}</Text>
                </Stack>
              )}
              {product.seoDescription && (
                <Stack gap="xs">
                  <Text size="xs" fw={500} c="dimmed">
                    {t('catalog.productsDetail.seo.description') || 'SEO Description'}
                  </Text>
                  <Text size="sm">{product.seoDescription}</Text>
                </Stack>
              )}
              {product.seoTags && Array.isArray(product.seoTags) && product.seoTags.length > 0 && (
                <Stack gap="xs">
                  <Text size="xs" fw={500} c="dimmed">
                    {t('catalog.productsDetail.seo.tags') || 'SEO Tags'}
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {product.seoTags.map((tag, index) => (
                      <Badge key={index} variant="light" size="xs" leftSection={<IconTag size={10} />}>
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
          <Paper withBorder p="sm" radius="sm">
            <Text fw={600} size="sm" mb="xs">
              {t('catalog.productsDetail.variants.title') || 'Product Variants'} ({product.variants.length})
            </Text>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>{t('catalog.productsDetail.variants.image') || 'Image'}</Table.Th>
                    <Table.Th>{t('catalog.productsDetail.variants.variant') || 'Variant'}</Table.Th>
                    <Table.Th>{t('catalog.productsDetail.variants.sku') || 'SKU'}</Table.Th>
                    <Table.Th ta="right">Retail / Wholesale Price</Table.Th>
                    <Table.Th ta="right">{t('catalog.productsDetail.variants.cost') || 'Cost'}</Table.Th>
                    <Table.Th ta="right">{t('catalog.productsDetail.variants.profit') || 'Profit'}</Table.Th>
                    <Table.Th>{t('catalog.productsDetail.variants.stock') || 'Stock'}</Table.Th>
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
          <Paper withBorder p="sm" radius="sm">
            <Text fw={600} size="sm" mb="xs">
              {t('catalog.productsDetail.gallery.title')} ({product.galleryImagesUrls.length})
            </Text>

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="xs">
              {galleryImages}
            </SimpleGrid>
          </Paper>
        )}

        {/* Product Attributes */}
        {((Array.isArray(product.attributes) && product.attributes.length > 0) || (Array.isArray(product.attributesBn) && product.attributesBn.length > 0)) && (
          <Paper withBorder p="sm" radius="sm">
            <Group gap="sm" align="center" mb="xs">
              <IconBulb size={18} style={{ color: '#2563eb' }} />
              <Text fw={600} size="sm">
                {t('catalog.productsDetail.productInformation.attributes') || 'Product Attributes'}
              </Text>
            </Group>
            <Grid>
              {/* English Attributes */}
              {Array.isArray(product.attributes) && product.attributes.length > 0 && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.attributesEnglish') || 'Attributes (English)'}</Text>
                    {product.attributes.map((attribute, index) => (
                      <Group key={`en-${index}`} gap={6} align="flex-start">
                        <IconCheck size={12} style={{ color: '#2563eb' }} />
                        <Text size="sm">{attribute}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Grid.Col>
              )}
              {/* Bangla Attributes */}
              {Array.isArray(product.attributesBn) && product.attributesBn.length > 0 && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.attributesBangla') || 'Attributes (বাংলা)'}</Text>
                    {product.attributesBn.map((attribute, index) => (
                      <Group key={`bn-${index}`} gap={6} align="flex-start">
                        <IconCheck size={12} style={{ color: '#2563eb' }} />
                        <Text size="sm">{attribute}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Grid.Col>
              )}
            </Grid>
          </Paper>
        )}

        {/* Product Highlights */}
        {((Array.isArray(product.highlights) && product.highlights.length > 0) || (Array.isArray(product.highlightsBn) && product.highlightsBn.length > 0)) && (
          <Paper withBorder p="sm" radius="sm">
            <Group gap="sm" align="center" mb="xs">
              <IconBulb size={18} style={{ color: '#ca8a04' }} />
              <Text fw={600} size="sm">
                {t('catalog.productsDetail.highlights.title') || 'Product Highlights'}
              </Text>
            </Group>
            <Grid>
              {/* English Highlights */}
              {Array.isArray(product.highlights) && product.highlights.length > 0 && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.highlightsEnglish') || 'Highlights (English)'}</Text>
                    {product.highlights.map((highlight, index) => (
                      <Group key={`en-${index}`} gap={6} align="flex-start">
                        <IconCheck size={12} style={{ color: '#16a34a' }} />
                        <Text size="sm">{highlight}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Grid.Col>
              )}
              {/* Bangla Highlights */}
              {Array.isArray(product.highlightsBn) && product.highlightsBn.length > 0 && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.highlightsBangla') || 'Highlights (বাংলা)'}</Text>
                    {product.highlightsBn.map((highlight, index) => (
                      <Group key={`bn-${index}`} gap={6} align="flex-start">
                        <IconCheck size={12} style={{ color: '#16a34a' }} />
                        <Text size="sm">{highlight}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Grid.Col>
              )}
            </Grid>
          </Paper>
        )}

        {/* Description */}
        {(product.description || product.descriptionBn) && (
          <Paper withBorder p="sm" radius="sm">
            <Text fw={600} size="sm" mb="xs">
              {t('catalog.productsDetail.productInformation.description')}
            </Text>
            <Grid>
              {/* English Description */}
              {product.description && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.descriptionEnglish') || 'Description (English)'}</Text>
                    <Box
                      className="text-sm html-content wrap-break-word overflow-hidden product-description"
                      dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.description) }}
                    />
                  </Stack>
                </Grid.Col>
              )}
              {/* Bangla Description */}
              {product.descriptionBn && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="xs">
                    <Text size="xs" fw={500} c="dimmed">{t('catalog.productsDetail.descriptionBangla') || 'Description (বাংলা)'}</Text>
                    <Box
                      className="text-sm html-content wrap-break-word overflow-hidden product-description"
                      dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.descriptionBn) }}
                    />
                  </Stack>
                </Grid.Col>
              )}
            </Grid>
          </Paper>
        )}

        {/* Cross Sale Products Section */}
        <Paper withBorder p="sm" radius="sm">
          <Group justify="space-between" align="center" mb="xs">
            <Group gap="xs" align="center">
              <IconShoppingBag size={18} style={{ color: '#7c3aed' }} />
              <Text fw={600} size="sm">
                {t('catalog.productsDetail.crossSale.title')} ({crossSaleCount}/3)
              </Text>
            </Group>
          </Group>

          <Text c="dimmed" size="xs" mb="xs">
            {t('catalog.productsDetail.crossSale.description')} {t('catalog.productsDetail.crossSale.maxProducts', { count: 3 })}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
            {/* Render existing cross-sale products */}
            {product.crossSaleProducts?.map((cs) => (
              <Paper
                key={cs.id}
                withBorder
                p="xs"
                radius="sm"
                className="hover:border-violet-300 transition-colors"
              >
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Box
                    w={48}
                    h={48}
                    style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}
                  >
                    {cs.thumbnailUrl ? (
                      <Image
                        src={cs.thumbnailUrl}
                        alt={cs.name}
                        w="100%"
                        h="100%"
                        fit="cover"
                        radius="xs"
                      />
                    ) : (
                      <Stack align="center" justify="center" h="100%">
                        <IconPhoto size={16} className="text-gray-400" />
                      </Stack>
                    )}
                  </Box>
                  <Stack gap={0} className="flex-1 min-w-0">
                    <Text size="sm" fw={500} lineClamp={1}>
                      {cs.name}
                    </Text>
                    <Anchor
                      size="xs"
                      c="dimmed"
                      href={`/catalog/products/${cs.slug}`}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/catalog/products/${cs.slug}`)
                      }}
                    >
                      View product
                    </Anchor>
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="red.6"
                    size="xs"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveCrossSale(cs.id)
                    }}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

            {/* Empty Add Slot */}
            {crossSaleCount < 3 && (
              <Paper
                withBorder
                p="sm"
                radius="sm"
                className="border-dashed border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50/30 transition-colors cursor-pointer"
                onClick={() => openModal(product.id, product.crossSaleProducts?.map((p) => p.id) ?? [])}
              >
                <Stack align="center" justify="center" h="100%" py="xs">
                  <Box style={{ backgroundColor: '#f3f4f6', borderRadius: '50%', padding: '6px' }}>
                    <IconPlus size={16} className="text-gray-500" />
                  </Box>
                  <Text size="xs" c="dimmed" fw={500}>
                    {t('catalog.productsDetail.crossSale.addProduct')}
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
          title={t('catalog.productsDetail.crossSale.title')}
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
                            style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}
                          >
                            {p.thumbnailUrl ? (
                              <Image
                                src={p.thumbnailUrl}
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
        <Paper withBorder p="sm" radius="sm">
          <Group justify="space-between" align="center" mb="xs">
            <Group gap="xs" align="center">
              <IconTrendingUp size={18} style={{ color: '#0d9488' }} />
              <Text fw={600} size="sm">
                {t('catalog.productsDetail.upSale.title')} ({upSaleCount}/3)
              </Text>
            </Group>
          </Group>

          <Text c="dimmed" size="xs" mb="xs">
            {t('catalog.productsDetail.upSale.description')} {t('catalog.productsDetail.upSale.maxProducts', { count: 3 })}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
            {/* Render existing up-sale products */}
            {product.upSaleProducts?.map((us) => (
              <Paper
                key={us.id}
                withBorder
                p="xs"
                radius="sm"
                className="hover:border-teal-300 transition-colors"
              >
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Box
                    w={48}
                    h={48}
                    style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}
                  >
                    {us.thumbnailUrl ? (
                      <Image
                        src={us.thumbnailUrl}
                        alt={us.name}
                        w="100%"
                        h="100%"
                        fit="cover"
                        radius="xs"
                      />
                    ) : (
                      <Stack align="center" justify="center" h="100%">
                        <IconPhoto size={16} className="text-gray-400" />
                      </Stack>
                    )}
                  </Box>
                  <Stack gap={0} className="flex-1 min-w-0">
                    <Text size="sm" fw={500} lineClamp={1}>
                      {us.name}
                    </Text>
                    <Anchor
                      size="xs"
                      c="dimmed"
                      href={`/catalog/products/${us.slug}`}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/catalog/products/${us.slug}`)
                      }}
                    >
                      View product
                    </Anchor>
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="red.6"
                    size="xs"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveUpSale(us.id)
                    }}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

            {/* Empty Add Slot */}
            {upSaleCount < 3 && (
              <Paper
                withBorder
                p="sm"
                radius="sm"
                className="border-dashed border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/30 transition-colors cursor-pointer"
                onClick={() => openUpSaleModal(product.id, product.upSaleProducts?.map((p) => p.id) ?? [])}
              >
                <Stack align="center" justify="center" h="100%" py="xs">
                  <Box style={{ backgroundColor: '#f3f4f6', borderRadius: '50%', padding: '6px' }}>
                    <IconPlus size={16} className="text-gray-500" />
                  </Box>
                  <Text size="xs" c="dimmed" fw={500}>
                    {t('catalog.productsDetail.upSale.addProduct')}
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
          title={t('catalog.productsDetail.upSale.title')}
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
                            style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}
                          >
                            {p.thumbnailUrl ? (
                              <Image
                                src={p.thumbnailUrl}
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

        {/* Thank You Product & Hide From Website Toggles - Side by Side */}
        <Group grow>
          {/* Thank You Product Toggle */}
          <Paper withBorder p="sm" radius="sm">
            <Group justify="space-between" align="center" gap="xs">
              <Group gap="xs" align="center">
                <IconHeart size={16} style={{ color: '#db2777' }} />
                <div>
                  <Text fw={600} size="sm">
                    {t('catalog.productsDetail.thankYou.title')}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {t('catalog.productsDetail.thankYou.description')}
                  </Text>
                </div>
              </Group>
              <Switch
                checked={product.thankYou ?? false}
                onChange={(event) => handleToggleThankYou(event.currentTarget.checked)}
                size="sm"
              />
            </Group>
          </Paper>

          {/* Hide From Website Toggle */}
          <Paper withBorder p="sm" radius="sm">
            <Group justify="space-between" align="center" gap="xs">
              <Group gap="xs" align="center">
                <IconEyeOff size={16} style={{ color: '#6366f1' }} />
                <div>
                  <Text fw={600} size="sm">
                    {t('catalog.productsDetail.hideFromWebsite.title')}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {t('catalog.productsDetail.hideFromWebsite.description')}
                  </Text>
                </div>
              </Group>
              <Switch
                checked={product.hideFromWebsite ?? false}
                onChange={(event) => handleToggleHideFromWebsite(event.currentTarget.checked)}
                size="sm"
              />
            </Group>
          </Paper>
        </Group>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={
            <Group gap="xs" align="center">
              <IconTrash size={20} color="red" />
              <Text fw={600}>Delete Product</Text>
            </Group>
          }
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to delete <Text fw={600} span>{product?.name}</Text>? This action cannot be undone.
            </Text>
            <Text size="xs" c="dimmed">
              This will permanently delete the product and all its variants. This action cannot be undone.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button
                variant="default"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={confirmDeleteProduct}
              >
                Delete Product
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  )
}
