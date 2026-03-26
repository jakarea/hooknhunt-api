'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Skeleton,
  Card,
  SimpleGrid,
  Flex,
  Tooltip,
  Menu,
  Anchor,
} from '@mantine/core'
import {
  IconSearch,
  IconPhoto,
  IconDots,
  IconPackages,
  IconCube,
  IconTag,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getProducts,
  type Product,
  type ProductFilters,
} from '@/utils/api'

export default function VariantsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions()

  // Permission check
  if (!isSuperAdmin() && !hasPermission('catalog.products.view')) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3} className="text-xl md:text-2xl">Access Denied</Title>
          <Text c="dimmed" className="text-sm md:text-base">You do not have permission to view variants</Text>
        </Paper>
      </Stack>
    )
  }

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  // Fetch products with variants
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const filters: ProductFilters = {
        search: debouncedSearch || undefined,
        per_page: 100, // Fetch more to get all variants
        page: 1,
      }

      const response = await getProducts(filters)

      // Handle paginated response
      if (response.data) {
        const productsData = response.data.data || response.data
        // Filter products that have variants
        setProducts(productsData.filter((p: Product) => p.variants && p.variants.length > 0))
      } else {
        const productsData = response.data || []
        setProducts(productsData.filter((p: Product) => p.variants && p.variants.length > 0))
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load variants',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Flatten all variants with product info
  const allVariants = useMemo(() => {
    const flattened: Array<{
      id: number
      productId: number
      productName: string
      productSlug: string
      productThumbnail?: any
      category?: any
      brand?: any
      variantName: string
      sku: string
      channel: string
      price: number
      stock: number
      wholesalePrice?: number
      wholesaleMoq?: number
      landedCost?: number
      weight?: number
      purchaseCost: number
      retailOfferDiscountType?: string | null
      retailOfferDiscountValue?: number | null
      wholesaleOfferDiscountType?: string | null
      wholesaleOfferDiscountValue?: number | null
    }> = []

    products.forEach((product) => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant: any) => {
          const channel = variant.channel || 'retail'
          flattened.push({
            id: variant.id,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            productThumbnail: product.thumbnail,
            category: product.category,
            brand: product.brand,
            variantName: variant.variantName || variant.customName || variant.name || '-',
            sku: variant.sku || variant.customSku || '-',
            channel: channel,
            price: parseFloat(String(variant.price || variant.retailPrice || variant.defaultRetailPrice || 0)),
            stock: parseInt(String(variant.currentStock || variant.stock || 0)),
            wholesalePrice: channel === 'wholesale' ? parseFloat(String(variant.price || variant.wholesalePrice || 0)) : undefined,
            wholesaleMoq: variant.wholesaleMoq,
            landedCost: variant.landedCost ? parseFloat(String(variant.landedCost)) : undefined,
            weight: variant.weight ? parseFloat(String(variant.weight)) : undefined,
            purchaseCost: parseFloat(String(variant.purchaseCost || 0)),
            retailOfferDiscountType: variant.retailOfferDiscountType || null,
            retailOfferDiscountValue: variant.retailOfferDiscountValue ? parseFloat(String(variant.retailOfferDiscountValue)) : null,
            wholesaleOfferDiscountType: variant.wholesaleOfferDiscountType || null,
            wholesaleOfferDiscountValue: variant.wholesaleOfferDiscountValue ? parseFloat(String(variant.wholesaleOfferDiscountValue)) : null,
          })
        })
      }
    })

    return flattened
  }, [products])

  // Group variants by variant name (merging retail/wholesale)
  const groupedVariants = useMemo(() => {
    const mergedVariants: Array<{
      id: string
      productId: number
      productName: string
      productSlug: string
      productThumbnail?: any
      category?: any
      brand?: any
      variantName: string
      retailSku: string
      wholesaleSku: string
      retailPrice: number
      wholesalePrice: number
      wholesaleMoq: number
      stock: number
      landedCost: number
      weight: number
      retailVariantId?: number
      wholesaleVariantId?: number
      // New fields for calculated selling prices and profits
      retailSellingPrice: number
      retailProfitAmount: number
      retailProfitPercent: number
      wholesaleSellingPrice: number
      wholesaleProfitAmount: number
      wholesaleProfitPercent: number
    }> = []

    // Group by variant name first
    const byVariantName: Record<string, typeof allVariants> = {}
    allVariants.forEach((variant) => {
      if (!byVariantName[variant.variantName]) {
        byVariantName[variant.variantName] = []
      }
      byVariantName[variant.variantName].push(variant)
    })

    // Merge retail and wholesale variants
    Object.entries(byVariantName).forEach(([variantName, variants]) => {
      const retailVariant = variants.find((v) => v.channel.toLowerCase() === 'retail')
      const wholesaleVariant = variants.find((v) => v.channel.toLowerCase() === 'wholesale')

      const firstVariant = variants[0]

      // Calculate retail selling price and profit
      let retailSellingPrice = retailVariant?.price || 0
      if (retailVariant?.retailOfferDiscountType && retailVariant?.retailOfferDiscountValue) {
        if (retailVariant.retailOfferDiscountType === 'percentage') {
          retailSellingPrice = retailSellingPrice * (1 - retailVariant.retailOfferDiscountValue / 100)
        } else {
          retailSellingPrice = retailSellingPrice - retailVariant.retailOfferDiscountValue
        }
      }
      const retailPurchaseCost = retailVariant?.purchaseCost || 0
      const retailProfitAmount = retailSellingPrice - retailPurchaseCost
      const retailProfitPercent = retailPurchaseCost > 0
        ? (retailProfitAmount / retailPurchaseCost) * 100
        : 0

      // Calculate wholesale selling price and profit
      let wholesaleSellingPrice = wholesaleVariant?.wholesalePrice || wholesaleVariant?.price || 0
      if (wholesaleVariant?.wholesaleOfferDiscountType && wholesaleVariant?.wholesaleOfferDiscountValue) {
        if (wholesaleVariant.wholesaleOfferDiscountType === 'percentage') {
          wholesaleSellingPrice = wholesaleSellingPrice * (1 - wholesaleVariant.wholesaleOfferDiscountValue / 100)
        } else {
          wholesaleSellingPrice = wholesaleSellingPrice - wholesaleVariant.wholesaleOfferDiscountValue
        }
      }
      const wholesalePurchaseCost = wholesaleVariant?.purchaseCost || 0
      const wholesaleProfitAmount = wholesaleSellingPrice - wholesalePurchaseCost
      const wholesaleProfitPercent = wholesalePurchaseCost > 0
        ? (wholesaleProfitAmount / wholesalePurchaseCost) * 100
        : 0

      mergedVariants.push({
        id: `merged-${variantName}`,
        productId: firstVariant.productId,
        productName: firstVariant.productName,
        productSlug: firstVariant.productSlug,
        productThumbnail: firstVariant.productThumbnail,
        category: firstVariant.category,
        brand: firstVariant.brand,
        variantName: variantName,
        retailSku: retailVariant?.sku || '',
        wholesaleSku: wholesaleVariant?.sku || '',
        retailPrice: retailVariant?.price || 0,
        wholesalePrice: wholesaleVariant?.wholesalePrice || wholesaleVariant?.price || 0,
        wholesaleMoq: wholesaleVariant?.wholesaleMoq || 0,
        stock: (retailVariant?.stock || 0) + (wholesaleVariant?.stock || 0),
        landedCost: retailVariant?.landedCost || 0,
        weight: retailVariant?.weight || 0,
        retailVariantId: retailVariant?.id,
        wholesaleVariantId: wholesaleVariant?.id,
        retailSellingPrice,
        retailProfitAmount,
        retailProfitPercent,
        wholesaleSellingPrice,
        wholesaleProfitAmount,
        wholesaleProfitPercent,
      })
    })

    return mergedVariants
  }, [allVariants])

  // Calculate total variants count
  const totalVariantsCount = useMemo(() => {
    return groupedVariants.length
  }, [groupedVariants])

  // Calculate total products with variants
  const totalProductsWithVariants = useMemo(() => {
    const uniqueProducts = new Set(groupedVariants.map(v => v.productId))
    return uniqueProducts.size
  }, [groupedVariants])

  // Memoized variant cards for mobile
  const variantCards = useMemo(() => {
    return groupedVariants.map((variant) => (
      <Card key={variant.id} withBorder p="md" shadow="sm">
        <Stack gap="sm">
          {/* Product Header */}
          <Group gap="sm">
            <Box
              w={60}
              h={60}
              className="bg-gray-100 rounded-md flex items-center justify-center"
            >
              {variant.productThumbnail ? (
                <Box
                  component="img"
                  src={variant.productThumbnail.fullUrl}
                  alt={variant.productName}
                  w={60}
                  h={60}
                  style={{ objectFit: 'cover', borderRadius: '6px' }}
                />
              ) : (
                <IconPhoto size={24} className="text-gray-400" />
              )}
            </Box>
            <Box style={{ flex: 1 }}>
              <Anchor
                className="text-sm md:text-base fw={500}"
                lineClamp={1}
                onClick={() => window.location.href = `/catalog/products/${variant.productId}`}
              >
                {variant.productName?.length > 80
                  ? variant.productName.substring(0, 80) + '...'
                  : variant.productName}
              </Anchor>
              <Group gap="xs" mt={2}>
                {variant.category && (
                  <Text className="text-xs md:text-sm" c="dimmed">
                    {variant.category.name}
                  </Text>
                )}
                <Badge size="xs" color="blue">
                  {variant.variantName}
                </Badge>
              </Group>
            </Box>
          </Group>

          {/* Variant Details */}
          <Paper withBorder p="xs" bg="gray.0">
            <Stack gap={0}>
              {/* Retail */}
              <Group justify="space-between">
                <Text size="sm" fw={500}>Retail</Text>
                <Text size="sm" fw={500} c="blue">${variant.retailSellingPrice.toFixed(2)}</Text>
              </Group>
              <Text size="xs" c={variant.retailProfitAmount >= 0 ? 'green' : 'red'} mt={-4}>
                {variant.retailProfitAmount >= 0 ? '+' : ''}${Math.round(variant.retailProfitAmount)} ({Math.round(variant.retailProfitPercent)}%)
              </Text>

              {/* Wholesale */}
              {variant.wholesaleSellingPrice > 0 && (
                <>
                  <Group justify="space-between" mt="xs">
                    <Text size="sm" fw={500} c="green">Wholesale</Text>
                    <Text size="sm" fw={500} c="green">${variant.wholesaleSellingPrice.toFixed(2)}</Text>
                  </Group>
                  <Text size="xs" c={variant.wholesaleProfitAmount >= 0 ? 'green' : 'red'} mt={-4}>
                    {variant.wholesaleProfitAmount >= 0 ? '+' : ''}${Math.round(variant.wholesaleProfitAmount)} ({Math.round(variant.wholesaleProfitPercent)}%)
                  </Text>
                </>
              )}

              {variant.wholesaleMoq > 0 && (
                <Text size="xs" c="dimmed" mt="xs">
                  MOQ: {variant.wholesaleMoq}
                </Text>
              )}
              <Text size="xs" c={variant.stock > 0 ? 'green' : 'red'} mt="xs">
                Stock: {variant.stock}
              </Text>
            </Stack>
          </Paper>

          {/* Action */}
          <Button
            variant="light"
            size="xs"
            radius="xl"
            leftSection={<IconTag size={14} />}
            onClick={() => window.location.href = `/catalog/products/${variant.productId}/edit`}
            fullWidth
          >
            Manage Variants
          </Button>
        </Stack>
      </Card>
    ))
  }, [groupedVariants])

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
        <Flex justify="flex-start" align="center" direction={{ base: 'column', sm: 'row' }} gap="sm">
          <Group>
            <IconTag size={32} className="text-blue-600" />
            <div>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                Product Variants
              </Title>
              <Text c="dimmed" className="text-sm md:text-base">
                Manage product variants and SKUs ({totalVariantsCount} variants from {totalProductsWithVariants} products)
              </Text>
            </div>
          </Group>
        </Flex>

        {/* Filters */}
        <Paper withBorder p="md">
          <TextInput
            placeholder="Search products..."
            leftSection={<IconSearch size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </Paper>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Paper withBorder p="0">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Variant Name</Table.Th>
                  <Table.Th>Retail Price</Table.Th>
                  <Table.Th>Wholesale Price</Table.Th>
                  <Table.Th>Stock</Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groupedVariants.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} ta="center">
                      <Stack py="xl" align="center" gap="sm">
                        <IconTag size={48} className="text-gray-300" />
                        <Text c="dimmed" className="text-sm md:text-base">
                          No variants found
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  groupedVariants.map((variant) => (
                    <Table.Tr key={variant.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Box
                            w={40}
                            h={40}
                            className="bg-gray-100 rounded flex items-center justify-center"
                          >
                            {variant.productThumbnail ? (
                              <Box
                                component="img"
                                src={variant.productThumbnail.fullUrl}
                                alt={variant.productName}
                                w={40}
                                h={40}
                                style={{ objectFit: 'cover', borderRadius: '4px' }}
                              />
                            ) : (
                              <IconPhoto size={20} className="text-gray-400" />
                            )}
                          </Box>
                          <Box>
                            <Anchor
                              className="text-sm md:text-base fw={500} lineClamp={1}"
                              onClick={(e) => {
                                e.preventDefault()
                                window.location.href = `/catalog/products/${variant.productId}`
                              }}
                            >
                              {variant.productName?.length > 80
                                ? variant.productName.substring(0, 80) + '...'
                                : variant.productName}
                            </Anchor>
                            {variant.category && (
                              <Text className="text-xs md:text-sm" c="dimmed">
                                {variant.category.name}
                              </Text>
                            )}
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text className="text-sm md:text-base">{variant.variantName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text className="text-sm md:text-base" fw={500} c="blue">
                            ${variant.retailSellingPrice.toFixed(2)}
                          </Text>
                          <Text
                            size="xs"
                            c={variant.retailProfitAmount >= 0 ? 'green' : 'red'}
                          >
                            {variant.retailProfitAmount >= 0 ? '+' : ''}${Math.round(variant.retailProfitAmount)} ({Math.round(variant.retailProfitPercent)}%)
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text className="text-sm md:text-base" fw={500} c="green">
                            ${variant.wholesaleSellingPrice.toFixed(2)}
                          </Text>
                          <Text
                            size="xs"
                            c={variant.wholesaleProfitAmount >= 0 ? 'green' : 'red'}
                          >
                            {variant.wholesaleProfitAmount >= 0 ? '+' : ''}${Math.round(variant.wholesaleProfitAmount)} ({Math.round(variant.wholesaleProfitPercent)}%)
                          </Text>
                        </Stack>
                      </Table.Td>
                      
                      <Table.Td>
                        <Text
                          className="text-sm md:text-base"
                          c={variant.stock > 0 ? 'green' : 'red'}
                        >
                          {variant.stock}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <Tooltip label="Edit Product">
                            <ActionIcon
                              size="lg"
                              variant="light"
                              color="blue"
                              onClick={() => window.location.href = `/catalog/products/${variant.productId}/edit`}
                            >
                              <IconTag size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="View Details">
                            <ActionIcon
                              size="lg"
                              variant="light"
                              color="gray"
                              onClick={() => window.location.href = `/catalog/products/${variant.productId}`}
                            >
                              <IconPackages size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            {variantCards}
          </SimpleGrid>
        </div>

        {/* Empty state */}
        {groupedVariants.length === 0 && !loading && (
          <Paper withBorder p="xl" ta="center">
            <Stack align="center" gap="sm">
              <IconTag size={64} className="text-gray-300" />
              <Text className="text-base md:text-lg" fw={500}>
                No variants found
              </Text>
              <Text className="text-sm md:text-base" c="dimmed">
                Products with variants will appear here
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
