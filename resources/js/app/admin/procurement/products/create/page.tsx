'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Stack, Group, Title, Text, Paper, Button, TextInput, Textarea, Select, NumberInput, Breadcrumbs, Anchor, Card, SimpleGrid, Divider, ActionIcon, MultiSelect, Modal, Image } from '@mantine/core'
import { IconPhoto, IconX, IconPackages, IconTrash, IconDeviceFloppy, IconPlus, IconUsers, IconUpload, IconFolder } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getSuppliers, type Supplier } from '@/utils/api'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import type { MediaFile } from '@/utils/api'

export default function CreateProductPage() {
  const { t } = useTranslation()
  const { openSingleSelect } = useMediaSelector()

  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('draft')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [supplierUrl, setSupplierUrl] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [suppliersLoading, setSuppliersLoading] = useState(true)

  // Media library state
  const [selectedThumbnailMediaId, setSelectedThumbnailMediaId] = useState<number | null>(null)

  const [variants, setVariants] = useState([
    { id: '1', sku: '', customSku: '', variantName: '', size: '', color: '', unit: '', retailPrice: 0, wholesalePrice: 0, purchaseCost: 0, alertQty: 5 }
  ])

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setSuppliersLoading(true)
        const response = await getSuppliers({ is_active: true, per_page: 100 })
        const suppliersData = Array.isArray(response) ? response : (response?.data || [])
        setSuppliers(suppliersData)
      } catch (error) {
        console.error('Failed to fetch suppliers:', error)
        notifications.show({
          title: t('common.error') || 'Error',
          message: 'Failed to load suppliers',
          color: 'red'
        })
      } finally {
        setSuppliersLoading(false)
      }
    }
    fetchSuppliers()
  }, [])

  // Media library handlers
  const handle_open_thumbnail_media_selector = () => {
    openSingleSelect((mediaFile) => {
      setSelectedThumbnailMediaId(mediaFile.id)
      setThumbnailPreview(mediaFile.url)
    }, selectedThumbnailMediaId ? [selectedThumbnailMediaId] : [])
  }

  const handleRemoveImage = () => {
    setThumbnailPreview(null)
    setSelectedThumbnailMediaId(null)
  }

  const handleAddVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), sku: '', customSku: '', variantName: '', size: '', color: '', unit: '', retailPrice: 0, wholesalePrice: 0, purchaseCost: 0, alertQty: 5 }])
  }

  const handleRemoveVariant = (id: string) => {
    if (variants.length > 1) setVariants(variants.filter((v) => v.id !== id))
    else notifications.show({ title: t('common.warning') || 'Warning', message: 'At least one variant is required', color: 'yellow' })
  }

  const handleVariantChange = (id: string, field: string, value: any) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    notifications.show({ title: t('common.success') || 'Success', message: 'Product saved successfully', color: 'green' })
  }

  // Transform suppliers for MultiSelect
  const supplierOptions = Array.isArray(suppliers) ? suppliers.map((supplier) => ({
    value: supplier.id.toString(),
    label: supplier.name
  })) : []

  return (
    <Box p="md">
      <Stack gap="md">
        <Breadcrumbs>
          <Anchor href="/admin/procurement/products">{t('procurement.products') || 'Products'}</Anchor>
          <Text>{t('procurement.productsCreate.title') || 'Add Product'}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Group>
            <IconPackages size={32} className="text-blue-600" />
            <Title order={1}>{t('procurement.productsCreate.title') || 'Add New Product'}</Title>
          </Group>
        </Group>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Card withBorder p="md" shadow="sm">
              <Stack gap="md">
                <Group>
                  <IconPackages size={20} className="text-blue-600" />
                  <Text className="text-base md:text-lg" fw={600}>
                    {t('procurement.productsCreate.basicInfo') || 'Basic Information'}
                  </Text>
                </Group>
                <Divider />

                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label={t('procurement.productsCreate.productName') || 'Product Name'}
                    placeholder="Enter product name"
                    value={productName}
                    onChange={(e) => setProductName(e.currentTarget.value)}
                    required
                  />
                  <Select
                    label={t('procurement.productsCreate.category') || 'Category'}
                    placeholder="Select category"
                    data={[{ value: '1', label: 'Electronics' }, { value: '2', label: 'Clothing' }]}
                    value={category}
                    onChange={setCategory}
                    required
                    searchable
                  />
                  <Select
                    label={t('procurement.productsCreate.brand') || 'Brand'}
                    placeholder="Select brand"
                    data={[{ value: '1', label: 'Apple' }, { value: '2', label: 'Samsung' }]}
                    value={brand}
                    onChange={setBrand}
                    searchable
                  />
                </SimpleGrid>

                <Textarea
                  label={t('procurement.productsCreate.description') || 'Description'}
                  placeholder="Enter product description"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  minRows={3}
                />

                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <TextInput
                    label={t('procurement.productsCreate.videoUrl') || 'Video URL'}
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.currentTarget.value)}
                  />
                  <Select
                    label={t('procurement.productsCreate.status') || 'Status'}
                    data={[
                      { value: 'draft', label: t('procurement.productsPage.status.draft') || 'Draft' },
                      { value: 'published', label: t('procurement.productsPage.status.published') || 'Published' },
                      { value: 'archived', label: t('procurement.productsPage.status.archived') || 'Archived' },
                    ]}
                    value={status}
                    onChange={(value) => setStatus(value || 'draft')}
                  />
                </SimpleGrid>
              </Stack>
            </Card>

            <Card withBorder p="md" shadow="sm">
              <Stack gap="md">
                <Group>
                  <IconUsers size={20} className="text-blue-600" />
                  <Text className="text-base md:text-lg" fw={600}>
                    {t('procurement.productsCreate.supplierInfo') || 'Supplier Information'}
                  </Text>
                </Group>
                <Divider />

                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  <MultiSelect
                    label={t('procurement.productsCreate.suppliers') || 'Suppliers'}
                    placeholder="Select suppliers"
                    description="Select multiple suppliers for this product"
                    data={supplierOptions}
                    value={selectedSuppliers}
                    onChange={setSelectedSuppliers}
                    searchable
                    nothingFoundMessage="No suppliers found"
                    disabled={suppliersLoading}
                  />
                  <TextInput
                    label={t('procurement.productsCreate.supplierUrl') || 'Supplier URL'}
                    placeholder="https://supplier.com/product/..."
                    description="Product URL from supplier"
                    value={supplierUrl}
                    onChange={(e) => setSupplierUrl(e.currentTarget.value)}
                  />
                </SimpleGrid>
              </Stack>
            </Card>

            <Card withBorder p="md" shadow="sm">
              <Stack gap="md">
                <Group>
                  <IconPhoto size={20} className="text-blue-600" />
                  <Text className="text-base md:text-lg" fw={600}>
                    {t('procurement.productsCreate.productImage') || 'Product Image'}
                  </Text>
                </Group>
                <Divider />

                <Stack gap="sm">
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconUpload size={14} />}
                    onClick={handle_open_thumbnail_media_selector}
                  >
                    Upload Thumbnail
                  </Button>

                  {!thumbnailPreview ? (
                    <Paper
                      withBorder
                      p="xl"
                      className="border-dashed"
                      h={200}
                      display="flex"
                      style={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Stack align="center" gap="sm">
                        <IconPhoto size={48} className="text-gray-400" />
                        <Text c="dimmed">{t('procurement.productsCreate.noImageSelected') || 'No image selected'}</Text>
                        <Text size="xs" c="dimmed">Upload an image or select from media library</Text>
                      </Stack>
                    </Paper>
                  ) : (
                    <Box pos="relative" className="inline-block">
                      <Paper shadow="sm" p="xs">
                        <img src={thumbnailPreview} alt="Preview" className="w-48 h-48 object-cover rounded-md" />
                      </Paper>
                      <ActionIcon
                        pos="absolute"
                        top={-8}
                        right={-8}
                        color="red"
                        variant="filled"
                        size="sm"
                        onClick={handleRemoveImage}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Card>

            <Card withBorder p="md" shadow="sm">
              <Stack gap="md">
                <Group justify="space-between">
                  <Group>
                    <IconPackages size={20} className="text-blue-600" />
                    <Text className="text-base md:text-lg" fw={600}>
                      {t('procurement.productsCreate.variants') || 'Product Variants'}
                    </Text>
                  </Group>
                  <Button
                    leftSection={<IconPlus size={14} />}
                    size="xs"
                    variant="light"
                    onClick={handleAddVariant}
                  >
                    {t('procurement.productsCreate.addVariant') || 'Add Variant'}
                  </Button>
                </Group>
                <Divider />

                <Stack gap="sm">
                  {variants.map((variant, index) => (
                    <Paper key={variant.id} withBorder p="sm" radius="md">
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Text className="text-sm md:text-base" fw={600}>
                            {t('procurement.productsCreate.variant')} {index + 1}
                          </Text>
                          {variants.length > 1 && (
                            <ActionIcon
                              color="red"
                              variant="light"
                              size="sm"
                              onClick={() => handleRemoveVariant(variant.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          )}
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                          <TextInput
                            label="SKU"
                            placeholder="PROD-001"
                            value={variant.sku}
                            onChange={(e) => handleVariantChange(variant.id, 'sku', e.currentTarget.value)}
                            required
                          />
                          <TextInput
                            label={t('procurement.productsCreate.customSku') || 'Custom SKU'}
                            placeholder="Owner code"
                            value={variant.customSku}
                            onChange={(e) => handleVariantChange(variant.id, 'customSku', e.currentTarget.value)}
                          />
                          <TextInput
                            label={t('procurement.productsCreate.variantName') || 'Variant Name'}
                            placeholder="Red - XL"
                            value={variant.variantName}
                            onChange={(e) => handleVariantChange(variant.id, 'variantName', e.currentTarget.value)}
                          />
                          <Select
                            label={t('procurement.productsCreate.unit') || 'Unit'}
                            placeholder="Select unit"
                            data={[{ value: 'pcs', label: 'Pieces' }, { value: 'kg', label: 'Kilogram' }]}
                            value={variant.unit}
                            onChange={(value) => handleVariantChange(variant.id, 'unit', value)}
                          />
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                          <TextInput
                            label={t('procurement.productsCreate.size') || 'Size'}
                            placeholder="XL"
                            value={variant.size}
                            onChange={(e) => handleVariantChange(variant.id, 'size', e.currentTarget.value)}
                          />
                          <TextInput
                            label={t('procurement.productsCreate.color') || 'Color'}
                            placeholder="Red"
                            value={variant.color}
                            onChange={(e) => handleVariantChange(variant.id, 'color', e.currentTarget.value)}
                          />
                          <NumberInput
                            label={t('procurement.productsCreate.retailPrice') || 'Retail Price'}
                            placeholder="0.00"
                            min={0}
                            decimalScale={2}
                            value={variant.retailPrice}
                            onChange={(value) => handleVariantChange(variant.id, 'retailPrice', value)}
                            required
                          />
                          <NumberInput
                            label={t('procurement.productsCreate.wholesalePrice') || 'Wholesale Price'}
                            placeholder="0.00"
                            min={0}
                            decimalScale={2}
                            value={variant.wholesalePrice}
                            onChange={(value) => handleVariantChange(variant.id, 'wholesalePrice', value)}
                          />
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                          <NumberInput
                            label={t('procurement.productsCreate.purchaseCost') || 'Purchase Cost'}
                            placeholder="0.00"
                            min={0}
                            decimalScale={2}
                            value={variant.purchaseCost}
                            onChange={(value) => handleVariantChange(variant.id, 'purchaseCost', value)}
                          />
                          <NumberInput
                            label={t('procurement.productsCreate.alertQty') || 'Alert Quantity'}
                            placeholder="5"
                            min={0}
                            value={variant.alertQty}
                            onChange={(value) => handleVariantChange(variant.id, 'alertQty', value)}
                          />
                        </SimpleGrid>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Card>

            <Group justify="flex-end" gap="sm">
              <Button
                variant="light"
                onClick={() => { window.location.href = '/admin/procurement/products' }}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={16} />}
              >
                {t('procurement.productsCreate.saveProduct') || 'Save Product'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Box>
  )
}
