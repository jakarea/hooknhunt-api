'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ActionIcon,
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
import { useMediaSelector } from '@/hooks/useMediaSelector'
import {
  createProcurementProduct,
  getCategoriesDropdown,
  getBrandsDropdown,
  getSuppliers,
} from '@/utils/api'

// ============================================================================
// TYPES
// ============================================================================

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

interface FormSupplier {
  supplierId: number | null
  supplierName: string
  productLinks: string[]
}

// ============================================================================
// PURE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that product name is not empty
 */
const validateProductName = (name: string): boolean => {
  return name.trim().length > 0
}

/**
 * Validates that category is selected
 */
const validateCategory = (categoryId: number | null): boolean => {
  return categoryId !== null
}

/**
 * Validates that at least one supplier is added
 */
const validateSuppliersList = (suppliers: FormSupplier[]): boolean => {
  return suppliers.length > 0
}

/**
 * Validates that all added suppliers have valid IDs
 */
const validateAllSuppliersHaveIds = (suppliers: FormSupplier[]): boolean => {
  return suppliers.every((s) => s.supplierId !== null && s.supplierId !== undefined)
}

// ============================================================================
// PURE DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transforms categories array to Select options
 */
const transformCategoriesToSelectOptions = (
  categories: any[]
): { value: string; label: string }[] => {
  return categories.map((c: any) => ({
    value: String(c.id),
    label: c.name,
  }))
}

/**
 * Transforms brands array to Select options
 */
const transformBrandsToSelectOptions = (
  brands: any[]
): { value: string; label: string }[] => {
  return brands.map((b: any) => ({
    value: String(b.id),
    label: b.name,
  }))
}

/**
 * Transforms suppliers array to Select options
 */
const transformSuppliersToSelectOptions = (
  suppliers: Supplier[]
): { value: string; label: string }[] => {
  return suppliers.map((s) => ({
    value: String(s.id),
    label: s.name,
  }))
}

/**
 * Transforms form suppliers to API format
 */
const transformSuppliersForAPI = (
  suppliers: FormSupplier[]
): ProcurementProductSupplier[] => {
  return suppliers
    .filter((s) => s.supplierId !== null)
    .map((s) => ({
      supplierId: s.supplierId!,
      productLinks: s.productLinks.filter((link) => link.trim()) || undefined,
    }))
}

/**
 * Gets list of supplier IDs that are already added
 */
const getAddedSupplierIds = (suppliers: FormSupplier[]): number[] => {
  return suppliers
    .filter((s) => s.supplierId !== null)
    .map((s) => s.supplierId!)
}

/**
 * Filters out suppliers that are already added
 */
const getAvailableSuppliers = (
  allSuppliers: Supplier[],
  addedSupplierIds: number[]
): Supplier[] => {
  return allSuppliers.filter((s) => !addedSupplierIds.includes(s.id))
}

/**
 * Adds a new supplier to the list
 */
const addSupplierToList = (
  currentSuppliers: FormSupplier[],
  supplierId: number,
  supplierName: string
): FormSupplier[] => {
  return [
    ...currentSuppliers,
    {
      supplierId,
      supplierName,
      productLinks: [],
    },
  ]
}

/**
 * Removes a supplier from the list by ID
 */
const removeSupplierFromList = (
  suppliers: FormSupplier[],
  supplierIdToRemove: number
): FormSupplier[] => {
  return suppliers.filter((s) => s.supplierId !== supplierIdToRemove)
}

/**
 * Adds a product link to a specific supplier
 */
const addProductLinkToSupplier = (
  suppliers: FormSupplier[],
  supplierId: number,
  linkToAdd: string
): FormSupplier[] => {
  if (!linkToAdd || !linkToAdd.trim()) {
    return suppliers
  }

  return suppliers.map((s) => {
    if (s.supplierId === supplierId) {
      return {
        ...s,
        productLinks: [...s.productLinks, linkToAdd.trim()],
      }
    }
    return s
  })
}

/**
 * Removes a product link from a specific supplier
 */
const removeProductLinkFromSupplier = (
  suppliers: FormSupplier[],
  supplierId: number,
  linkIndexToRemove: number
): FormSupplier[] => {
  return suppliers.map((s) => {
    if (s.supplierId === supplierId) {
      return {
        ...s,
        productLinks: s.productLinks.filter((_, index) => index !== linkIndexToRemove),
      }
    }
    return s
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateProcurementProductPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const { openSingleSelect } = useMediaSelector()

  // Form state
  const [name, setName] = useState<string>('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [brandId, setBrandId] = useState<number | null>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [suppliers, setSuppliers] = useState<FormSupplier[]>([])
  const [thumbnailId, setThumbnailId] = useState<number | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')

  // Dropdown options state
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [brands, setBrands] = useState<{ value: string; label: string }[]>([])
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([])

  // UI state
  const [saving, setSaving] = useState<boolean>(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(false)

  // New supplier selection state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

  // New product link input state (temp storage before adding)
  const [newProductLinks, setNewProductLinks] = useState<{ [key: number]: string }>({})

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (!hasPermission('procurement.products.create')) {
      navigate('/dashboard')
      return
    }

    fetchDropdowns()
  }, [])

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchDropdowns = async () => {
    try {
      setLoadingDropdowns(true)

      const [categoriesRes, brandsRes, suppliersRes]: any[] = await Promise.all([
        getCategoriesDropdown(),
        getBrandsDropdown(),
        getSuppliers({ per_page: 100 }),
      ])

      const categoriesData = categoriesRes?.data || categoriesRes || []
      const brandsData = brandsRes?.data || brandsRes || []
      const suppliersData = suppliersRes?.data?.data || suppliersRes?.data || suppliersRes || []

      setCategories(transformCategoriesToSelectOptions(categoriesData))
      setBrands(transformBrandsToSelectOptions(brandsData))
      setAllSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
    } catch (error: any) {
      console.error('Failed to load dropdowns:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Failed to load form options',
        color: 'red',
      })
    } finally {
      setLoadingDropdowns(false)
    }
  }

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateProductName(name)) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Product name is required',
        color: 'red',
      })
      return
    }

    if (!validateCategory(categoryId)) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Category is required',
        color: 'red',
      })
      return
    }

    if (!validateSuppliersList(suppliers)) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'At least one supplier is required',
        color: 'red',
      })
      return
    }

    if (!validateAllSuppliersHaveIds(suppliers)) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Please select suppliers for all entries',
        color: 'red',
      })
      return
    }

    try {
      setSaving(true)

      const payload = {
        name: name.trim(),
        categoryId: categoryId as number,
        brandId: brandId || undefined,
        thumbnailId: thumbnailId || undefined,
        suppliers: transformSuppliersForAPI(suppliers),
        status,
      }

      const response: any = await createProcurementProduct(payload)
      const newProduct = response?.data || response

      notifications.show({
        title: t('common.success') || 'Success',
        message: 'Product created successfully',
        color: 'green',
      })

      const productId = newProduct?.id
      if (productId) {
        navigate(`/procurement/products/${productId}`)
      } else {
        navigate('/procurement/products')
      }
    } catch (error: any) {
      console.error('Failed to create product:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || error.message || 'Failed to create product',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handles adding a selected supplier to the product
   */
  const handleAddSupplier = () => {
    if (!selectedSupplierId) {
      notifications.show({
        title: t('common.warning') || 'Warning',
        message: 'Please select a supplier first',
        color: 'yellow',
      })
      return
    }

    const supplierId = parseInt(selectedSupplierId)
    const supplier = allSuppliers.find((s) => s.id === supplierId)

    if (!supplier) {
      notifications.show({
        title: t('common.error') || 'Error',
        message: 'Selected supplier not found',
        color: 'red',
      })
      return
    }

    const updatedSuppliers = addSupplierToList(suppliers, supplierId, supplier.name)
    setSuppliers(updatedSuppliers)
    setSelectedSupplierId(null) // Reset selection
  }

  /**
   * Handles removing a supplier from the product
   */
  const handleRemoveSupplier = (supplierId: number) => {
    setSuppliers(removeSupplierFromList(suppliers, supplierId))

    // Clean up new product links input for this supplier
    setNewProductLinks((prev) => {
      const updated = { ...prev }
      delete updated[supplierId]
      return updated
    })
  }

  /**
   * Handles adding a product link to a supplier
   */
  const handleAddProductLink = (supplierId: number) => {
    const link = newProductLinks[supplierId]
    if (!link || !link.trim()) {
      return
    }

    setSuppliers(addProductLinkToSupplier(suppliers, supplierId, link))

    // Clear the input for this supplier
    setNewProductLinks((prev) => ({
      ...prev,
      [supplierId]: '',
    }))
  }

  /**
   * Handles removing a product link from a supplier
   */
  const handleRemoveProductLink = (supplierId: number, linkIndex: number) => {
    setSuppliers(removeProductLinkFromSupplier(suppliers, supplierId, linkIndex))
  }

  /**
   * Handles opening the media selector to choose a thumbnail
   */
  const handleSelectThumbnail = () => {
    openSingleSelect((mediaFile) => {
      setThumbnailId(mediaFile.id)
      setThumbnailUrl(mediaFile.url)
    }, thumbnailId ? [thumbnailId] : [])
  }

  /**
   * Handles removing the selected thumbnail
   */
  const handleRemoveThumbnail = () => {
    setThumbnailId(null)
    setThumbnailUrl('')
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const addedSupplierIds = getAddedSupplierIds(suppliers)
  const availableSuppliers = getAvailableSuppliers(allSuppliers, addedSupplierIds)
  const availableSupplierOptions = transformSuppliersToSelectOptions(availableSuppliers)

  const breadcrumbItems = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.products'), href: '/procurement/products' },
    { title: t('procurement.productsPage.addProduct') || 'Add Product' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Breadcrumbs */}
          <Breadcrumbs separator={<IconChevronRight size={16} />}>
            {breadcrumbItems}
          </Breadcrumbs>

          {/* Header */}
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Group gap="sm" align="center">
                <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
                  {t('procurement.productsPage.addProduct') || 'Add Product'}
                </Text>
                <Badge
                  color={status === 'published' ? 'green' : 'gray'}
                  variant="light"
                >
                  {t(`procurement.productsPage.statuses.${status}`) || status}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {t('procurement.productsPage.subtitle') ||
                  'Create a new product for purchase from suppliers'}
              </Text>
            </Stack>

            <Group gap="sm">
              <Button
                type="button"
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/procurement/products')}
              >
                {t('common.back') || 'Back'}
              </Button>
              <Button
                type="submit"
                loading={saving}
                disabled={loadingDropdowns}
              >
                {t('common.create') || 'Create'}
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
                  disabled={loadingDropdowns}
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
                  disabled={loadingDropdowns}
                />
              </Group>

              {/* Status & Thumbnail */}
              <Group grow>
                <Select
                  label={t('procurement.productsPage.status') || 'Status'}
                  data={[
                    {
                      value: 'draft',
                      label: t('procurement.productsPage.statuses.draft') || 'Draft',
                    },
                    {
                      value: 'published',
                      label: t('procurement.productsPage.statuses.published') || 'Published',
                    },
                  ]}
                  value={status}
                  onChange={(value) => setStatus(value as 'draft' | 'published')}
                  size="md"
                  styles={{ root: { flex: 8 } }}
                />

                <Stack gap="sm" styles={{ root: { flex: 4 } }}>
                  <Text size="sm" fw={600}>
                    {t('procurement.productsPage.thumbnail') || 'Product Image'}
                  </Text>
                  {thumbnailUrl ? (
                    <Group gap="sm">
                      <img
                        src={thumbnailUrl}
                        alt="Product thumbnail"
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <Button
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={handleRemoveThumbnail}
                      >
                        {t('common.remove') || 'Remove'}
                      </Button>
                    </Group>
                  ) : (
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={<IconPhoto size={14} />}
                      onClick={handleSelectThumbnail}
                    >
                      {t('procurement.productsPage.selectThumbnail') || 'Select Image'}
                    </Button>
                  )}
                </Stack>
              </Group>
            </Stack>
          </Paper>

          {/* Suppliers */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">
                {t('procurement.productsPage.suppliers') || 'Suppliers'}
              </Text>

              {/* Add Supplier Section */}
              <Paper withBorder p="sm" radius="sm" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
                <Stack gap="sm">
                  <Text size="sm" fw={500}>
                    {t('procurement.productsPage.selectSupplier') || 'Select Supplier to Add'}
                  </Text>
                  <Group gap="sm">
                    <Select
                      placeholder={t('procurement.productsPage.searchSupplier')}
                      data={availableSupplierOptions}
                      value={selectedSupplierId}
                      onChange={setSelectedSupplierId}
                      searchable
                      clearable
                      style={{ flex: 1 }}
                      disabled={availableSupplierOptions.length === 0 || loadingDropdowns}
                      nothingFoundMessage={
                        loadingDropdowns
                          ? 'Loading suppliers...'
                          : availableSupplierOptions.length === 0
                          ? 'All suppliers have been added'
                          : 'No suppliers found'
                      }
                    />
                    <Button
                      leftSection={<IconPlus size={14} />}
                      onClick={handleAddSupplier}
                      disabled={!selectedSupplierId || availableSupplierOptions.length === 0}
                      size="sm"
                    >
                      {t('common.add') || 'Add'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {/* Added Suppliers List */}
              {suppliers.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('procurement.productsPage.noSuppliers') || 'No suppliers added yet'}
                </Text>
              ) : (
                <Stack gap="md">
                  {suppliers.map((supplierItem) => {
                    if (supplierItem.supplierId === null) return null

                    return (
                      <Paper withBorder p="sm" radius="sm" key={supplierItem.supplierId}>
                        <Stack gap="sm">
                          {/* Supplier Header */}
                          <Group justify="space-between" wrap="nowrap">
                            <Stack gap={0}>
                              <Text fw={600} size="md">
                                {supplierItem.supplierName}
                              </Text>
                            </Stack>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleRemoveSupplier(supplierItem.supplierId!)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>

                          {/* Product Links */}
                          <Stack gap="xs" mt="xs">
                            <Group gap="xs">
                              <IconPhoto size={16} />
                              <Text size="sm" fw={500}>
                                {t('procurement.productsPage.productLinks') ||
                                  'Product URLs'}{' '}
                                ({supplierItem.productLinks?.length || 0})
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
                                              handleRemoveProductLink(
                                                supplierItem.supplierId!,
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
                                value={newProductLinks[supplierItem.supplierId!] || ''}
                                onChange={(e) =>
                                  setNewProductLinks((prev) => ({
                                    ...prev,
                                    [supplierItem.supplierId!]: e.target.value,
                                  }))
                                }
                                style={{ flex: 1 }}
                                size="sm"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddProductLink(supplierItem.supplierId!)}
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
