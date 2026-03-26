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
  Select,
  TextInput,
  Badge,
  Box,
  Anchor,
  Breadcrumbs,
  Skeleton,
  ActionIcon,
  rem,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconPhoto,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getProcurementProduct,
  updateProcurementProduct,
  getCategoriesDropdown,
  getBrandsDropdown,
  getSuppliers,
} from '@/utils/api'

interface Supplier {
  id: number
  name: string
  email?: string
  phone?: string
}

interface ProcurementProductSupplier {
  supplierId: number
  productLinks?: string[]
}

export default function EditProcurementProductPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [brandId, setBrandId] = useState<number | null>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [suppliers, setSuppliers] = useState<ProcurementProductSupplier[]>([])

  // Dropdown options
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([])
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // New supplier link input
  const [newProductLinks, setNewProductLinks] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    if (!hasPermission('procurement.products.edit')) {
      navigate('/dashboard')
      return
    }

    if (id) {
      fetchProduct()
      fetchDropdowns()
    }
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response: any = await getProcurementProduct(Number(id))
      const fullProduct = response?.data || response

      setProduct(fullProduct)
      setName(fullProduct.name || '')
      setCategoryId(fullProduct.categoryId || null)
      setBrandId(fullProduct.brandId || null)
      setStatus(fullProduct.status || 'draft')

      // Transform suppliers to our format
      if (fullProduct.suppliers && fullProduct.suppliers.length > 0) {
        const transformedSuppliers = fullProduct.suppliers.map((s: any) => ({
          supplierId: s.id,
          productLinks: s.productLinks || [],
        }))
        setSuppliers(transformedSuppliers)
      }
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

  const fetchDropdowns = async () => {
    try {
      setLoadingDropdowns(true)

      const [categoriesRes, brandsRes, suppliersRes]: any = await Promise.all([
        getCategoriesDropdown(),
        getBrandsDropdown(),
        getSuppliers({ per_page: 100 }),
      ])

      const categoriesData = categoriesRes?.data || categoriesRes || []
      const brandsData = brandsRes?.data || brandsRes || []
      const suppliersData = suppliersRes?.data?.data || suppliersRes?.data || suppliersRes || []

      console.log('🔍 Suppliers API response:', suppliersRes)
      console.log('🔍 Suppliers data extracted:', suppliersData)

      setCategories(
        categoriesData.map((c: any) => ({ value: String(c.id), label: c.name }))
      )
      setBrands(brandsData.map((b: any) => ({ value: String(b.id), label: b.name })))
      setAllSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
    } catch (error: any) {
      console.error('Failed to load dropdowns:', error)
    } finally {
      setLoadingDropdowns(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Product name is required',
        color: 'red',
      })
      return
    }

    if (!categoryId) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Category is required',
        color: 'red',
      })
      return
    }

    if (suppliers.length === 0) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'At least one supplier is required',
        color: 'red',
      })
      return
    }

    try {
      setSaving(true)
      await updateProcurementProduct(Number(id), {
        name: name.trim(),
        categoryId,
        brandId,
        suppliers,
        status,
      })

      notifications.show({
        title: t('common.success') || 'Success',
        message: 'Product updated successfully',
        color: 'green',
      })

      navigate(`/procurement/products/${id}`)
    } catch (error: any) {
      console.error('Failed to update product:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || error.message || 'Failed to update product',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  const addSupplier = () => {
    // Find suppliers that are not already added
    const existingSupplierIds = suppliers.map((s) => s.supplierId)
    const availableSuppliers = Array.isArray(allSuppliers)
      ? allSuppliers.filter((s) => !existingSupplierIds.includes(s.id))
      : []

    if (availableSuppliers.length === 0) {
      notifications.show({
        title: t('common.warning') || 'Warning',
        message: 'No more suppliers available to add',
        color: 'yellow',
      })
      return
    }

    // Add the first available supplier
    const newSupplier = availableSuppliers[0]
    setSuppliers([
      ...suppliers,
      {
        supplierId: newSupplier.id,
        productLinks: [],
      },
    ])
  }

  const removeSupplier = (supplierId: number) => {
    setSuppliers(suppliers.filter((s) => s.supplierId !== supplierId))
    setNewProductLinks((prev) => {
      const updated = { ...prev }
      delete updated[supplierId]
      return updated
    })
  }

  const addProductLink = (supplierId: number) => {
    const link = newProductLinks[supplierId]
    if (!link || !link.trim()) return

    setSuppliers(
      suppliers.map((s) => {
        if (s.supplierId === supplierId) {
          return {
            ...s,
            productLinks: [...(s.productLinks || []), link.trim()],
          }
        }
        return s
      })
    )

    setNewProductLinks((prev) => ({
      ...prev,
      [supplierId]: '',
    }))
  }

  const removeProductLink = (supplierId: number, index: number) => {
    setSuppliers(
      suppliers.map((s) => {
        if (s.supplierId === supplierId) {
          return {
            ...s,
            productLinks: s.productLinks?.filter((_, i) => i !== index) || [],
          }
        }
        return s
      })
    )
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width="30%" />
          <Skeleton height={400} />
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
    { title: name || product.name, href: `/procurement/products/${id}` },
    { title: t('common.edit') },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  // Get available suppliers for dropdown
  const existingSupplierIds = suppliers.map((s) => s.supplierId)
  const availableSuppliers = Array.isArray(allSuppliers)
    ? allSuppliers.filter((s) => !existingSupplierIds.includes(s.id))
    : []

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Breadcrumbs */}
          <Breadcrumbs separator={<IconChevronRight size={16} />}>{items}</Breadcrumbs>

          {/* Header */}
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Group gap="sm" align="center">
                <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
                  {t('procurement.productsPage.editProduct') || 'Edit Product'}
                </Text>
                <Badge
                  color={status === 'published' ? 'green' : 'gray'}
                  variant="light"
                >
                  {t(`common.${status}`) || status}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {t('procurement.productsPage.productId')}: {product.id}
              </Text>
            </Stack>

            <Group gap="sm">
              <Button
                type="button"
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate(`/procurement/products/${id}`)}
              >
                {t('common.back') || 'Back'}
              </Button>
              <Button
                type="submit"
                loading={saving}
                disabled={loadingDropdowns}
              >
                {t('common.save') || 'Save'}
              </Button>
            </Group>
          </Group>

          {/* Basic Information */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">
                {t('procurement.productsPage.basicInfo') || 'Basic Information'}
              </Text>

              {/* Product Name */}
              <TextInput
                label={t('procurement.productsPage.name') || 'Product Name'}
                placeholder={t('procurement.productsPage.namePlaceholder') || 'Enter product name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                size="md"
              />

              {/* Category & Brand */}
              <Group grow>
                <Select
                  label={t('procurement.productsPage.category') || 'Category'}
                  placeholder={t('procurement.productsPage.selectCategory') || 'Select category'}
                  data={categories}
                  value={categoryId ? String(categoryId) : null}
                  onChange={(value) => setCategoryId(value ? Number(value) : null)}
                  required
                  searchable
                  size="md"
                />

                <Select
                  label={t('procurement.productsPage.brand') || 'Brand'}
                  placeholder={t('procurement.productsPage.selectBrand') || 'Select brand'}
                  data={brands}
                  value={brandId ? String(brandId) : null}
                  onChange={(value) => setBrandId(value ? Number(value) : null)}
                  searchable
                  clearable
                  size="md"
                />
              </Group>

              {/* Status */}
              <Select
                label={t('procurement.productsPage.status') || 'Status'}
                data={[
                  { value: 'draft', label: t('procurement.productsPage.statusOptions.draft') || 'Draft' },
                  { value: 'published', label: t('procurement.productsPage.statusOptions.published') || 'Published' },
                ]}
                value={status}
                onChange={(value) => setStatus(value as 'draft' | 'published')}
                size="md"
              />
            </Stack>
          </Paper>

          {/* Suppliers */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={600} size="lg">
                  {t('procurement.productsPage.suppliers') || 'Suppliers'}
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={addSupplier}
                  disabled={availableSuppliers.length === 0}
                  size="sm"
                >
                  {t('common.add') || 'Add'}
                </Button>
              </Group>

              {suppliers.length === 0 ? (
                <Text size="sm" c="dimmed" italic>
                  {t('procurement.productsPage.noSuppliers') || 'No suppliers added yet'}
                </Text>
              ) : (
                <Stack gap="md">
                  {suppliers.map((supplierItem) => {
                    const supplier = allSuppliers.find(
                      (s) => s.id === supplierItem.supplierId
                    )
                    if (!supplier) return null

                    return (
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
                            </Stack>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => removeSupplier(supplier.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>

                          {/* Product Links */}
                          <Stack gap="xs" mt="xs">
                            <Group gap="xs">
                              <IconPhoto size={16} />
                              <Text size="sm" fw={500}>
                                {t('procurement.productsPage.productUrls') || 'Product URLs'} ({supplierItem.productLinks?.length || 0})
                              </Text>
                            </Group>

                            {/* Existing Links */}
                            {supplierItem.productLinks &&
                              supplierItem.productLinks.length > 0 && (
                                <Stack gap="xs">
                                  {supplierItem.productLinks.map(
                                    (link: string, linkIndex: number) => (
                                      <Paper
                                        withBorder
                                        p="xs"
                                        radius="sm"
                                        key={linkIndex}
                                      >
                                        <Group justify="space-between" gap="sm">
                                          <Text
                                            size="sm"
                                            className="flex-1 break-all"
                                          >
                                            {link}
                                          </Text>
                                          <ActionIcon
                                            color="red"
                                            variant="subtle"
                                            size="sm"
                                            onClick={() =>
                                              removeProductLink(
                                                supplier.id,
                                                linkIndex
                                              )
                                            }
                                          >
                                            <IconTrash size={14} />
                                          </ActionIcon>
                                        </Group>
                                      </Paper>
                                    )
                                  )}
                                </Stack>
                              )}

                            {/* Add New Link */}
                            <Group gap="sm">
                              <TextInput
                                placeholder="https://..."
                                value={
                                  newProductLinks[supplier.id] || ''
                                }
                                onChange={(e) =>
                                  setNewProductLinks((prev) => ({
                                    ...prev,
                                    [supplier.id]: e.target.value,
                                  }))
                                }
                                style={{ flex: 1 }}
                                size="sm"
                              />
                              <Button
                                size="sm"
                                onClick={() => addProductLink(supplier.id)}
                              >
                                {t('common.add') || 'Add'}
                              </Button>
                            </Group>
                          </Stack>
                        </Stack>
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Box>
  )
}
