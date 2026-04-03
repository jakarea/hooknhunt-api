'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Tooltip,
  ActionIcon,
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
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getProduct } from '@/utils/api'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Decode HTML entities in case content is double-escaped
 */
const decodeHTMLEntities = (text: string): string => {
  const textArea = document.createElement('textarea')
  textArea.innerHTML = text
  return textArea.value
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
}

interface ProductDetail {
  id: number
  name: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  description?: string | null
  shortDescription?: string | null
  warrantyEnabled?: boolean | null
  warrantyDetails?: string | null
  highlights?: string[] | null
  includesInTheBox?: string[] | null
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
      { title: product.name, href: `/catalog/products/${product.id}` },
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
                {product.name}
              </Title>
            </Group>

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
        {(product.warrantyEnabled && product.warrantyDetails) || (product.includesInTheBox && product.includesInTheBox.length > 0) ? (
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
            {product.includesInTheBox && product.includesInTheBox.length > 0 && (
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
                      {product.includesInTheBox.map((item, index) => (
                        <Group key={index} gap="xs" align="center">
                          <IconCheck size={14} className="text-blue-600" />
                          <Text className="text-sm md:text-base">{item}</Text>
                        </Group>
                      ))}
                    </Stack>
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
        {product.highlights && product.highlights.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Group gap="md" align="flex-start" mb="sm">
              <Box className="bg-yellow-50 p-2 rounded-md">
                <IconBulb size={24} className="text-yellow-600" />
              </Box>
              <Text fw={600} className="text-base md:text-lg">
                {t(`${ns}.detail.highlights.title`) || 'Product Highlights'}
              </Text>
            </Group>
            <Stack gap="xs" ml={46}>
              {product.highlights.map((highlight, index) => (
                <Group key={index} gap="xs" align="flex-start">
                  <IconCheck size={16} className="text-green-600 mt-1" />
                  <Text className="text-sm md:text-base">{highlight}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Description */}
        {product.description && (
          <Paper withBorder p="md" radius="md">
            <Text fw={600} className="text-base md:text-lg" mb="md">
              {t(`${ns}.detail.productInformation.description`)}
            </Text>
            <Box
              className="text-sm md:text-base html-content"
              dangerouslySetInnerHTML={{ __html: decodeHTMLEntities(product.description) }}
              styles={{
                // Paragraphs
                '& p': {
                  marginBottom: '0.5rem',
                  lineHeight: '1.6',
                },
                // Lists
                '& ul': {
                  listStyleType: 'disc',
                  marginLeft: '1.5rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.6',
                  paddingLeft: '1rem',
                },
                '& ol': {
                  listStyleType: 'decimal',
                  marginLeft: '1.5rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.6',
                  paddingLeft: '1rem',
                },
                '& ul li': {
                  marginLeft: '0.5rem',
                  marginBottom: '0.25rem',
                },
                '& ol li': {
                  marginLeft: '0.5rem',
                  marginBottom: '0.25rem',
                },
                // Text formatting
                '& strong': {
                  fontWeight: 600,
                },
                '& b': {
                  fontWeight: 600,
                },
                '& em': {
                  fontStyle: 'italic',
                },
                '& i': {
                  fontStyle: 'italic',
                },
                // Headings
                '& h1': {
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                  marginTop: '1rem',
                },
                '& h2': {
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                  marginTop: '0.875rem',
                },
                '& h3': {
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                  marginTop: '0.75rem',
                },
                '& h4': {
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  lineHeight: '1.3',
                  marginTop: '0.625rem',
                },
                // Links
                '& a': {
                  color: '#3b82f6',
                  textDecoration: 'underline',
                },
                // Blockquotes
                '& blockquote': {
                  borderLeft: '4px solid #e5e7eb',
                  paddingLeft: '1rem',
                  marginLeft: 0,
                  marginBottom: '0.5rem',
                  fontStyle: 'italic',
                },
                // Code
                '& code': {
                  backgroundColor: '#f3f4f6',
                  padding: '0.125rem 0.25rem',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875em',
                },
                '& pre': {
                  backgroundColor: '#f3f4f6',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  overflowX: 'auto',
                  marginBottom: '0.5rem',
                },
                '& pre code': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
              }}
            />
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
