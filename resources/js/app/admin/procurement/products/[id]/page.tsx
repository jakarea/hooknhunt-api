'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Badge,
  Box,
  Anchor,
  Breadcrumbs,
  Skeleton,
  Container,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconChevronRight,
  IconPhoto,
  IconBuilding,
  IconTag,
  IconWorld,
  IconLink,
  IconEdit,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getProcurementProduct } from '@/utils/api'

export default function ProcurementProductDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response: any = await getProcurementProduct(id)
      console.log('🔍 Raw API response:', response)
      const fullProduct = response?.data || response
      console.log('🔍 Product data:', fullProduct)
      console.log('🔍 Product name:', fullProduct?.name)
      setProduct(fullProduct)
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

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width="50%" />
          <Skeleton height={20} width="30%" />
          <Skeleton height={200} mt="md" />
          <Skeleton height={100} mt="md" />
        </Stack>
      </Box>
    )
  }

  if (!product) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Text>Product not found</Text>
      </Box>
    )
  }

  const items = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.products'), href: '/procurement/products' },
    { title: product.name, href: `/procurement/products/${id}` },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={16} />}>{items}</Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Group gap="sm" align="center">
              <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
                {product.name}
              </Text>
              <Badge
                color={product.status === 'published' ? 'green' : 'gray'}
                variant="light"
              >
                {t(`common.${product.status}`) || product.status}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {t('procurement.productsPage.productId')}: {product.id} • Created{' '}
              {new Date(product.createdAt).toLocaleDateString()}
            </Text>
          </Stack>

          <Button
            leftSection={<IconEdit size={16} />}
            onClick={() => navigate(`/procurement/products/${id}/edit`)}
          >
            {t('common.edit') || 'Edit'}
          </Button>
        </Group>

        {/* Product Info */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text fw={600} size="lg">
              {t('procurement.productsPage.productInfo') || 'Product Information'}
            </Text>

            {/* Thumbnail */}
            {product.thumbnail && (
              <Group gap="md" align="flex-start">
                <IconPhoto size={20} className="mt-1" />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {t('procurement.productsPage.thumbnail') || 'Thumbnail'}
                  </Text>
                  <img
                    src={product.thumbnail.fullUrl}
                    alt={product.name}
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                </Stack>
              </Group>
            )}

            {/* Category */}
            {product.category && (
              <Group gap="md">
                <IconTag size={20} />
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    {t('procurement.productsPage.category') || 'Category'}
                  </Text>
                  <Text size="md">{product.category.name}</Text>
                </Stack>
              </Group>
            )}

            {/* Brand */}
            {product.brand && (
              <Group gap="md">
                <IconBuilding size={20} />
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    {t('procurement.productsPage.brand') || 'Brand'}
                  </Text>
                  <Text size="md">{product.brand.name}</Text>
                </Stack>
              </Group>
            )}

            {/* Slug */}
            {product.slug && (
              <Group gap="md">
                <IconWorld size={20} />
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    {t('procurement.productsPage.slug') || 'Slug'}
                  </Text>
                  <Text size="md" className="break-all">
                    {product.slug}
                  </Text>
                </Stack>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Suppliers Section */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text fw={600} size="lg">
              {t('procurement.productsPage.suppliers') || 'Suppliers'}
            </Text>

            {product.suppliers && product.suppliers.length > 0 ? (
              <Stack gap="md">
                {product.suppliers.map((supplier: any) => (
                  <Paper withBorder p="sm" radius="sm" key={supplier.id}>
                    <Stack gap="sm">
                      {/* Supplier Header */}
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={0}>
                          <Text fw={600} size="md">
                            {supplier.name}
                          </Text>
                          {supplier.email && (
                            <Text size="sm" c="dimmed">
                              {supplier.email}
                            </Text>
                          )}
                          {supplier.phone && (
                            <Text size="sm" c="dimmed">
                              {supplier.phone}
                            </Text>
                          )}
                        </Stack>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                        >
                          {t('procurement.suppliersPage.viewSupplier') || 'View Details'}
                        </Button>
                      </Group>

                      {/* Product URLs */}
                      {supplier.productLinks && supplier.productLinks.length > 0 ? (
                        <Stack gap="xs" mt="xs">
                          <Group gap="xs">
                            <IconLink size={16} />
                            <Text size="sm" fw={500}>
                              {t('procurement.productsPage.productUrls') || 'Product URLs'} ({supplier.productLinks.length})
                            </Text>
                          </Group>
                          <Stack gap="xs">
                            {supplier.productLinks.map((url: string, urlIndex: number) => (
                              <Anchor
                                key={urlIndex}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                className="flex items-center gap-xs break-all"
                              >
                                <IconLink size={14} />
                                {url}
                              </Anchor>
                            ))}
                          </Stack>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" italic>
                          {t('procurement.productsPage.noProductUrls') || 'No product URLs added'}
                        </Text>
                      )}

                      {/* Additional supplier info */}
                      {supplier.shopName && (
                        <Text size="sm" mt="xs">
                          <Text span fw={500}>
                            {t('procurement.suppliersPage.shopName') || 'Shop Name'}:{' '}
                          </Text>
                          {supplier.shopName}
                        </Text>
                      )}

                      {supplier.shopUrl && (
                        <Anchor
                          href={supplier.shopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                          className="flex items-center gap-xs"
                        >
                          <IconWorld size={14} />
                          {supplier.shopUrl}
                        </Anchor>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" italic>
                {t('procurement.productsPage.noSuppliers') || 'No suppliers linked to this product'}
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
