'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Button,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Checkbox,
  Breadcrumbs,
  Anchor,
  Card,
  Divider,
  ActionIcon,
  Image,
  Badge,
  Grid,
  SimpleGrid,
  Table,
  Accordion
} from '@mantine/core'
import {
  IconPhoto,
  IconX,
  IconPackages,
  IconDeviceFloppy,
  IconUpload,
  IconChevronUp,
  IconChevronDown,
  IconTrash,
  IconVideo,
  IconPlus,
  IconTag,
  IconBox,
  IconCoin
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getSuppliers, getCategories, getBrands, getAttributes, type Supplier, type Category, type Brand, type Attribute } from '@/utils/api'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { useUIStore } from '@/stores/uiStore'
import type { MediaFile } from '@/utils/api'

interface GalleryImage {
  id: string
  mediaId: number
  url: string
  order: number
}

interface ChannelPricing {
  active: boolean
  customName: string
  price: number
  offerPrice: number
  offerStarts: string
  offerEnds: string
  sku: string
  freeItems: number
  moq: number
  allowPreorder: boolean
  expectedDelivery: string
}

interface ProductVariant {
  id: string
  name: string
  retail: ChannelPricing
  wholesale: ChannelPricing
  daraz: ChannelPricing
  pos: ChannelPricing
}

// Channel Pricing Card Component
interface ChannelPricingCardProps {
  channelName: string
  channelKey: keyof ProductVariant
  icon: string
  variant: ProductVariant
  variantId: string
  onUpdate: (variantId: string, channel: keyof ProductVariant, field: keyof ChannelPricing, value: any) => void
  collapseSidebar: () => void
}

function ChannelPricingCard({
  channelName,
  channelKey,
  icon,
  variant,
  variantId,
  onUpdate,
  collapseSidebar
}: ChannelPricingCardProps) {
  const channel = variant[channelKey] as ChannelPricing

  if (!channel.active) {
    // Inactive state - show collapsed card with activation switch
    return (
      <Card withBorder p="sm" bg="gray.0" style={{ opacity: 0.7 }}>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Text size="lg">{icon}</Text>
            <Text size="sm" fw={500} c="dimmed">{channelName}</Text>
            <Badge size="xs" color="gray" variant="outline">Inactive</Badge>
          </Group>
          <Switch
            label="Activate"
            checked={false}
            onChange={(e) => onUpdate(variantId, channelKey, 'active', e.currentTarget.checked)}
            size="sm"
          />
        </Group>
      </Card>
    )
  }

  // Active state - show full pricing form
  return (
    <Card withBorder p="md" style={{ borderColor: '#228BE6' }}>
      <Stack gap="sm">
        {/* Channel Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Text size="xl">{icon}</Text>
            <Text size="md" fw={600} c="blue">{channelName}</Text>
            <Badge size="sm" color="green">Active</Badge>
          </Group>
          <Switch
            label="Active"
            checked={channel.active}
            onChange={(e) => onUpdate(variantId, channelKey, 'active', e.currentTarget.checked)}
            size="sm"
            color="green"
          />
        </Group>

        {/* Pricing Form */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {/* Custom Name */}
          <TextInput
            label="Custom Name"
            placeholder="Product name for this channel"
            value={channel.customName}
            onChange={(e) => onUpdate(variantId, channelKey, 'customName', e.currentTarget.value)}
            onFocus={collapseSidebar}
            size="sm"
          />

          {/* Price */}
          <NumberInput
            label="Price"
            placeholder="0.00"
            value={channel.price}
            onChange={(v) => onUpdate(variantId, channelKey, 'price', typeof v === 'number' ? v : 0)}
            onFocus={collapseSidebar}
            min={0}
            size="sm"
            leftSection={<Text size="sm">৳</Text>}
          />

          {/* Offer Price */}
          <NumberInput
            label="Offer Price"
            placeholder="0.00"
            value={channel.offerPrice}
            onChange={(v) => onUpdate(variantId, channelKey, 'offerPrice', typeof v === 'number' ? v : 0)}
            onFocus={collapseSidebar}
            min={0}
            size="sm"
            leftSection={<Text size="sm">৳</Text>}
          />

          {/* Offer Start Date */}
          <TextInput
            label="Offer Starts"
            type="date"
            value={channel.offerStarts}
            onChange={(e) => onUpdate(variantId, channelKey, 'offerStarts', e.currentTarget.value)}
            onFocus={collapseSidebar}
            size="sm"
          />

          {/* Offer End Date */}
          <TextInput
            label="Offer Ends"
            type="date"
            value={channel.offerEnds}
            onChange={(e) => onUpdate(variantId, channelKey, 'offerEnds', e.currentTarget.value)}
            onFocus={collapseSidebar}
            size="sm"
          />

          {/* SKU */}
          <TextInput
            label="SKU"
            placeholder="e.g., RET-001"
            value={channel.sku}
            onChange={(e) => onUpdate(variantId, channelKey, 'sku', e.currentTarget.value)}
            onFocus={collapseSidebar}
            size="sm"
          />

          {/* Free Items */}
          <NumberInput
            label="Free Items"
            placeholder="0"
            value={channel.freeItems}
            onChange={(v) => onUpdate(variantId, channelKey, 'freeItems', typeof v === 'number' ? v : 0)}
            onFocus={collapseSidebar}
            min={0}
            size="sm"
          />

          {/* MOQ */}
          <NumberInput
            label="Min Order Qty (MOQ)"
            placeholder="1"
            value={channel.moq}
            onChange={(v) => onUpdate(variantId, channelKey, 'moq', typeof v === 'number' ? v : 1)}
            onFocus={collapseSidebar}
            min={1}
            size="sm"
            description="Minimum quantity per order"
          />

          {/* Allow Preorder */}
          <Switch
            label="Allow Preorder"
            description="Show preorder option on this channel"
            checked={channel.allowPreorder}
            onChange={(e) => onUpdate(variantId, channelKey, 'allowPreorder', e.currentTarget.checked)}
            size="sm"
          />

          {/* Expected Delivery (conditional) */}
          {channel.allowPreorder && (
            <TextInput
              label="Expected Delivery"
              type="date"
              value={channel.expectedDelivery}
              onChange={(e) => onUpdate(variantId, channelKey, 'expectedDelivery', e.currentTarget.value)}
              onFocus={collapseSidebar}
              size="sm"
            />
          )}
        </SimpleGrid>
      </Stack>
    </Card>
  )
}

export default function CreateProductPage() {
  const { t } = useTranslation()
  const { openSingleSelect, openMultipleSelect } = useMediaSelector()

  // Collapse sidebar on input focus
  const collapseSidebarIfNeeded = () => {
    // Get fresh state from store
    const state = useUIStore.getState()
    console.log('🔍 collapseSidebarIfNeeded called', {
      sidebarCollapsed: state.sidebarCollapsed,
      willToggle: !state.sidebarCollapsed
    })
    if (!state.sidebarCollapsed) {
      console.log('📉 Toggling sidebar to collapsed')
      state.toggleSidebar()
    } else {
      console.log('✅ Sidebar already collapsed, skipping')
    }
  }

  // Form state
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('draft')
  const [videoUrl, setVideoUrl] = useState('')
  const [enablePreorder, setEnablePreorder] = useState(false)
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [highlightsList, setHighlightsList] = useState<string[]>([''])

  // SEO state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoTags, setSeoTags] = useState('')

  // Quill editor refs
  const descriptionQuillRef = useRef<any>(null)

  // Media state
  const [featuredImage, setFeaturedImage] = useState<{ mediaId: number; url: string } | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // Helper function to create default channel pricing
  const createDefaultChannelPricing = (isActive: boolean = false): ChannelPricing => ({
    active: isActive,
    customName: '',
    price: 0,
    offerPrice: 0,
    offerStarts: '',
    offerEnds: '',
    sku: '',
    freeItems: 0,
    moq: 1,
    allowPreorder: false,
    expectedDelivery: ''
  })

  // Global channel settings (apply to ALL variants)
  const [globalChannelSettings, setGlobalChannelSettings] = useState<Record<string, ChannelPricing>>({
    retail: createDefaultChannelPricing(true),
    wholesale: createDefaultChannelPricing(false),
    daraz: createDefaultChannelPricing(false),
    pos: createDefaultChannelPricing(false)
  })

  // Variants state (inherits from global settings)
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      id: '1',
      name: '',
      retail: createDefaultChannelPricing(true),
      wholesale: createDefaultChannelPricing(false),
      daraz: createDefaultChannelPricing(false),
      pos: createDefaultChannelPricing(false)
    }
  ])

  // Override tracking (which variants have custom settings per channel)
  const [variantOverrides, setVariantOverrides] = useState<Record<string, Record<string, string[]>>>({})

  // Helper to check if a field is overridden for a variant
  const isFieldOverridden = (variantId: string, channel: string, field: string): boolean => {
    return variantOverrides[variantId]?.[channel]?.includes(field) || false
  }

  // Variant types state
  const [variantTypes, setVariantTypes] = useState<Attribute[]>([])
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<number[]>([])
  const [selectedVariantValues, setSelectedVariantValues] = useState<Record<number, number[]>>({})
  const [variantTypesLoading, setVariantTypesLoading] = useState(true)

  // API data state
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [brandsLoading, setBrandsLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        setCategoriesLoading(true)
        try {
          const categoriesResponse = await getCategories({ per_page: 100 })
          const categoriesData = categoriesResponse?.data?.data || []
          setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        } catch (catError) {
          console.error('❌ Failed to fetch categories:', catError)
          setCategories([])
        }

        // Fetch brands
        setBrandsLoading(true)
        try {
          const brandsResponse = await getBrands({ per_page: 100 })
          const brandsData = brandsResponse?.data?.data || []
          setBrands(Array.isArray(brandsData) ? brandsData : [])
        } catch (brandError) {
          console.error('❌ Failed to fetch brands:', brandError)
          setBrands([])
        }

        // Fetch variant types (attributes)
        setVariantTypesLoading(true)
        try {
          const attributesResponse = await getAttributes()
          const attributesData = Array.isArray(attributesResponse)
            ? attributesResponse
            : (attributesResponse?.data || [])
          // Filter only select and color types
          const variantAttrs = Array.isArray(attributesData)
            ? attributesData.filter((attr: Attribute) =>
                attr.type === 'select' || attr.type === 'color'
              )
            : []
          setVariantTypes(variantAttrs)
        } catch (attrError) {
          console.error('❌ Failed to fetch variant types:', attrError)
          setVariantTypes([])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        notifications.show({
          title: t('common.error') || 'Error',
          message: t('catalog.productsCreate.notification.loadingError') || 'Failed to load required data',
          color: 'red'
        })
      } finally {
        setCategoriesLoading(false)
        setBrandsLoading(false)
        setVariantTypesLoading(false)
      }
    }
    fetchData()
  }, [])

  // Initialize Quill editors
  useEffect(() => {
    // Load Quill CSS and JS dynamically
    const loadQuill = async () => {
      // Check if Quill is already loaded
      if (typeof window !== 'undefined' && !(window as any).Quill) {
        // Load Quill CSS
        const quillCss = document.createElement('link')
        quillCss.rel = 'stylesheet'
        quillCss.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css'
        document.head.appendChild(quillCss)

        // Load Quill JS
        const quillScript = document.createElement('script')
        quillScript.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js'
        quillScript.async = true
        quillScript.onload = () => {
          initializeEditors()
        }
        document.body.appendChild(quillScript)
      } else if (typeof window !== 'undefined') {
        // Quill already loaded, initialize immediately
        setTimeout(initializeEditors, 100)
      }
    }

    const initializeEditors = () => {
      if (typeof window === 'undefined' || !(window as any).Quill) return

      const Quill = (window as any).Quill

      // Add custom CSS for Quill editor heights and dark mode
      const styleId = 'quill-custom-heights'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.innerHTML = `
          #description-editor .ql-editor {
            min-height: 200px;
            max-height: 200px;
            overflow-y: auto;
          }

          /* Dark mode support */
          [data-mantine-color-scheme="dark"] #description-editor .ql-toolbar {
            background-color: #2C2E33;
            border-color: #45474E;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-container {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-editor.ql-blank::before {
            color: #6c6c6c;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-stroke {
            stroke: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-fill {
            fill: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker {
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-options {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item:hover {
            background-color: #373A40;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item.ql-selected {
            background-color: #228BE6;
            color: white;
          }

          [data-mantine-color-scheme="dark"] #description-editor a {
            color: #228BE6;
          }
        `
        document.head.appendChild(style)
      }

      // Initialize Description Editor
      const descriptionContainer = document.getElementById('description-editor-container')
      if (descriptionContainer && !descriptionQuillRef.current) {
        descriptionContainer.innerHTML = '<div id="description-editor"></div>'
        const quill1 = new Quill('#description-editor', {
          theme: 'snow',
          placeholder: t('catalog.productsCreate.productDescriptionPlaceholder') || 'Enter detailed product description...',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['link'],
              ['clean']
            ]
          }
        })

        quill1.on('text-change', () => {
          setDescription(quill1.root.innerHTML)
        })

        // Collapse sidebar when Quill editor gains focus
        quill1.on('selection-change', (range: any) => {
          if (range && collapseSidebarIfNeeded) {
            collapseSidebarIfNeeded()
          }
        })

        descriptionQuillRef.current = quill1
      }

    }

    loadQuill()

    // Cleanup
    return () => {
      if (descriptionQuillRef.current) {
        descriptionQuillRef.current = null
      }
    }
  }, [])

  // Featured image handlers
  const handleSelectFeaturedImage = () => {
    openSingleSelect((mediaFile: MediaFile) => {
      setFeaturedImage({ mediaId: mediaFile.id, url: mediaFile.url })
    }, featuredImage ? [featuredImage.mediaId] : [])
  }

  const handleRemoveFeaturedImage = () => {
    setFeaturedImage(null)
  }

  // Gallery images handlers
  const handleSelectGalleryImages = () => {
    const currentSelection = galleryImages.map(img => img.mediaId)
    openMultipleSelect((mediaFiles: MediaFile[]) => {
      const newImages: GalleryImage[] = mediaFiles.map((file, index) => ({
        id: Date.now().toString() + index,
        mediaId: file.id,
        url: file.url,
        order: galleryImages.length + index
      }))
      setGalleryImages([...galleryImages, ...newImages].slice(0, 6)) // Max 6 images
    }, currentSelection)
  }

  const handleRemoveGalleryImage = (id: string) => {
    setGalleryImages(galleryImages.filter(img => img.id !== id))
    // Reorder remaining images
    setGalleryImages(prev => prev.map((img, index) => ({ ...img, order: index })))
  }

  const handleMoveImage = (id: string, direction: 'up' | 'down') => {
    const index = galleryImages.findIndex(img => img.id === id)
    if (index < 0) return

    const newGallery = [...galleryImages]
    if (direction === 'up' && index > 0) {
      ;[newGallery[index], newGallery[index - 1]] = [newGallery[index - 1], newGallery[index]]
    } else if (direction === 'down' && index < galleryImages.length - 1) {
      ;[newGallery[index], newGallery[index + 1]] = [newGallery[index + 1], newGallery[index]]
    }

    // Update order
    setGalleryImages(newGallery.map((img, idx) => ({ ...img, order: idx })))
  }

  // Variant handlers
  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        id: Date.now().toString(),
        name: '',
        retail: createDefaultChannelPricing(true),
        wholesale: createDefaultChannelPricing(false),
        daraz: createDefaultChannelPricing(false),
        pos: createDefaultChannelPricing(false)
      }
    ])
  }

  const handleRemoveVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter(v => v.id !== id))
    } else {
      notifications.show({
        title: t('catalog.productsCreate.cannotRemove') || 'Cannot Remove',
        message: t('catalog.productsCreate.atLeastOneVariantRequired') || 'At least one variant is required',
        color: 'yellow'
      })
    }
  }

  const handleUpdateVariant = (id: string, field: 'name', value: string) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v))
  }

  // Update global channel setting and sync to ALL variants
  const handleUpdateGlobalChannel = (
    channel: string,
    field: keyof ChannelPricing,
    value: any
  ) => {
    // Update global setting
    setGlobalChannelSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value
      }
    }))

    // Sync to all variants
    setVariants(variants.map(v => ({
      ...v,
      [channel]: {
        ...v[channel as keyof ProductVariant],
        [field]: value
      }
    })))
  }

  // Update individual variant channel (with override tracking)
  const handleUpdateVariantChannel = (
    variantId: string,
    channel: keyof ProductVariant,
    field: keyof ChannelPricing,
    value: any
  ) => {
    // Mark field as overridden for this variant
    setVariantOverrides(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [channel]: [...(prev[variantId]?.[channel] || []), field]
      }
    }))

    // Update the variant
    setVariants(variants.map(v => {
      if (v.id === variantId) {
        return {
          ...v,
          [channel]: {
            ...v[channel],
            [field]: value
          }
        }
      }
      return v
    }))
  }

  // Reset variant channel to global settings
  const handleResetVariantChannel = (variantId: string, channel: keyof ProductVariant) => {
    // Remove overrides for this variant/channel
    setVariantOverrides(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [channel]: []
      }
    }))

    // Reset to global settings
    setVariants(variants.map(v => {
      if (v.id === variantId) {
        return {
          ...v,
          [channel]: { ...globalChannelSettings[channel] }
        }
      }
      return v
    }))
  }

  // Toggle variant type selection
  const handleToggleVariantType = (typeId: number) => {
    setSelectedVariantTypes(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    )
  }

  // Select/deselect all values for a variant type
  const handleToggleAllValues = (typeId: number) => {
    const type = variantTypes.find(t => t.id === typeId)
    if (!type) return

    const allValueIds = type.options?.map(o => o.id) || []
    const currentSelected = selectedVariantValues[typeId] || []

    if (currentSelected.length === allValueIds.length) {
      // Deselect all
      setSelectedVariantValues(prev => ({ ...prev, [typeId]: [] }))
    } else {
      // Select all
      setSelectedVariantValues(prev => ({ ...prev, [typeId]: allValueIds }))
    }
  }

  // Toggle individual value
  const handleToggleValue = (typeId: number, valueId: number) => {
    setSelectedVariantValues(prev => {
      const current = prev[typeId] || []
      if (current.includes(valueId)) {
        return { ...prev, [typeId]: current.filter(id => id !== valueId) }
      } else {
        return { ...prev, [typeId]: [...current, valueId] }
      }
    })
  }

  // Apply default values to all variants (retail channel only)
  const handleApplyDefaultsToAll = () => {
    setVariants(variants.map(v => ({
      ...v,
      retail: {
        ...v.retail,
        price: 100,
        offerPrice: 0,
        sku: '',
        freeItems: 0,
        moq: 1
      }
    })))
    notifications.show({
      title: 'Defaults Applied',
      message: `Applied default values to ${variants.length} variant(s)`,
      color: 'green'
    })
  }

  // Highlights list handlers
  const handleAddHighlight = () => {
    setHighlightsList([...highlightsList, ''])
  }

  const handleRemoveHighlight = (index: number) => {
    if (highlightsList.length > 1) {
      setHighlightsList(highlightsList.filter((_, i) => i !== index))
    }
  }

  const handleUpdateHighlight = (index: number, value: string) => {
    const newList = [...highlightsList]
    newList[index] = value
    setHighlightsList(newList)
  }

  // Generate variant combinations (pure function)
  const generateVariantCombinations = (): ProductVariant[] => {
    // Check if we have valid selections
    const validTypes = selectedVariantTypes.filter(typeId => {
      const values = selectedVariantValues[typeId] || []
      return values.length > 0
    })

    if (validTypes.length === 0) {
      // Return empty variant if nothing selected - inherits from global settings
      return [{
        id: '1',
        name: '',
        retail: { ...globalChannelSettings.retail },
        wholesale: { ...globalChannelSettings.wholesale },
        daraz: { ...globalChannelSettings.daraz },
        pos: { ...globalChannelSettings.pos }
      }]
    }

    // Generate all combinations using Cartesian product
    interface VariantCombo {
      typeId: number
      valueId: number
    }

    const combinations: Array<{ name: string; attributes: VariantCombo[] }> = []

    const generateCombinations = (currentIndex: number, current: VariantCombo[]) => {
      // Base case: when we've selected values for all valid types
      if (currentIndex === validTypes.length) {
        // Generate name from the selected values
        const labels = current.map(combo => {
          const type = variantTypes.find(t => t.id === combo.typeId)
          const option = type?.options?.find(o => o.id === combo.valueId)
          return option?.label || option?.value || ''
        })
        combinations.push({ name: labels.join(' - '), attributes: current })
        return
      }

      const typeId = validTypes[currentIndex]
      const type = variantTypes.find(t => t.id === typeId)
      const valueIds = selectedVariantValues[typeId] || []

      valueIds.forEach((valueId) => {
        generateCombinations(
          currentIndex + 1,
          [...current, { typeId, valueId }]
        )
      })
    }

    generateCombinations(0, [])

    // Convert combinations to variants - inherits global settings
    return combinations.map((combo, index) => ({
      id: `generated-${Date.now()}-${index}`,
      name: combo.name,
      retail: { ...globalChannelSettings.retail },
      wholesale: { ...globalChannelSettings.wholesale },
      daraz: { ...globalChannelSettings.daraz },
      pos: { ...globalChannelSettings.pos }
    }))
  }

  // Auto-generate variants when selections change
  useEffect(() => {
    const generatedVariants = generateVariantCombinations()
    setVariants(generatedVariants)
  }, [selectedVariantTypes, selectedVariantValues])

  // Check if all values selected for a type
  const areAllValuesSelected = (typeId: number): boolean => {
    const type = variantTypes.find(t => t.id === typeId)
    const allValueIds = type?.options?.map(o => o.id) || []
    const currentSelected = selectedVariantValues[typeId] || []
    return currentSelected.length === allValueIds.length && allValueIds.length > 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    notifications.show({
      title: t('common.success') || 'Success',
      message: t('catalog.productsCreate.notification.saved'),
      color: 'green'
    })
  }

  // Transform data for Select components
  const categoryOptions = Array.isArray(categories)
    ? categories.map(cat => ({
        value: cat.id.toString(),
        label: cat.name
      }))
    : []

  const brandOptions = Array.isArray(brands)
    ? brands.map(brand => ({
        value: brand.id.toString(),
        label: brand.name
      }))
    : []

  return (
    <Box p="md">
      <Stack gap="md">
        <Breadcrumbs>
          <Anchor href="/admin/catalog/products">{t('catalog.products') || 'Products'}</Anchor>
          <Text>{t('catalog.productsCreate.title') || 'Add Product'}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Group>
            <IconPackages size={32} className="text-blue-600" />
            <Title order={1}>{t('catalog.productsCreate.title') || 'Add New Product'}</Title>
          </Group>
        </Group>

        <form onSubmit={handleSubmit}>
          {/* Full Width Layout */}
          <Grid>
            <Grid.Col span={12}>
              <Stack gap="md">
                {/* Basic Information Card - All Fields */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="md">
                    <Group>
                      <IconPackages size={20} className="text-blue-600" />
                      <Text className="text-base md:text-lg" fw={600}>
                        {t('catalog.productsCreate.basicInfo') || 'Basic Information'}
                      </Text>
                    </Group>
                    <Divider />

                    <TextInput
                      label={t('catalog.productsCreate.productName') || 'Product Name'}
                      placeholder={t('catalog.productsCreate.productNamePlaceholder') || 'Enter product name'}
                      value={productName}
                      onChange={(e) => setProductName(e.currentTarget.value)}
                      onFocus={collapseSidebarIfNeeded}
                      required
                    />

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <Select
                        label={t('catalog.productsCreate.category') || 'Category'}
                        placeholder={t('catalog.productsCreate.selectCategory') || 'Select category'}
                        data={categoryOptions}
                        value={category}
                        onChange={setCategory}
                        onFocus={collapseSidebarIfNeeded}
                        required
                        searchable
                        disabled={categoriesLoading}
                        nothingFoundMessage={t('catalog.categoriesPage.noCategoriesFound') || 'No categories found'}
                        clearable
                      />
                      <Select
                        label={t('catalog.productsCreate.brand') || 'Brand'}
                        placeholder={t('catalog.productsCreate.selectBrand') || 'Select brand'}
                        data={brandOptions}
                        value={brand}
                        onChange={setBrand}
                        onFocus={collapseSidebarIfNeeded}
                        required
                        searchable
                        disabled={brandsLoading}
                        nothingFoundMessage={t('catalog.brandsPage.noBrandsFound') || 'No brands found'}
                        clearable
                      />
                    </SimpleGrid>

                    <Divider />

                    {/* Preorder Settings */}
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <Switch
                        label={t('catalog.productsCreate.enablePreorder') || 'Enable Preorder'}
                        description={t('catalog.productsCreate.enablePreorderDescription') || 'Allow customers to order this product before it\'s in stock'}
                        checked={enablePreorder}
                        onChange={(e) => setEnablePreorder(e.currentTarget.checked)}
                        size="md"
                      />

                      {enablePreorder && (
                        <TextInput
                          type="date"
                          label={t('catalog.productsCreate.expectedDeliveryDate') || 'Expected Delivery Date'}
                          placeholder={t('catalog.productsCreate.expectedDeliveryDatePlaceholder') || 'Select expected delivery date'}
                          value={expectedDeliveryDate || ''}
                          onChange={(e) => setExpectedDeliveryDate(e.currentTarget.value)}
                          onFocus={collapseSidebarIfNeeded}
                          size="md"
                        />
                      )}
                    </SimpleGrid>

                    <Divider />

                    {/* Featured Image Section */}
                    <Group justify="space-between">
                      <Group>
                        <IconPhoto size={20} className="text-blue-600" />
                        <Text className="text-base md:text-lg" fw={600}>
                          {t('catalog.productsCreate.featuredImage') || 'Featured Image'}
                        </Text>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconUpload size={14} />}
                        onClick={handleSelectFeaturedImage}
                      >
                        {t('catalog.productsCreate.selectFeaturedImage') || 'Select Image'}
                      </Button>
                    </Group>

                    {!featuredImage ? (
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
                          <Text c="dimmed">{t('catalog.productsCreate.noFeaturedImageSelected') || 'No featured image selected'}</Text>
                          <Text size="xs" c="dimmed">{t('catalog.productsCreate.featuredImageDescription') || 'Select from media library'}</Text>
                        </Stack>
                      </Paper>
                    ) : (
                      <Box pos="relative" maw={200}>
                        <Paper shadow="sm" p="xs">
                          <Image
                            src={featuredImage.url}
                            alt={t('catalog.productsCreate.featured') || 'Featured'}
                            height={200}
                            radius="md"
                          />
                        </Paper>
                        <ActionIcon
                          pos="absolute"
                          top={-8}
                          right={-8}
                          color="red"
                          variant="filled"
                          size="sm"
                          onClick={handleRemoveFeaturedImage}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                        <Badge
                          pos="absolute"
                          top={8}
                          left={8}
                          color="blue"
                          variant="filled"
                        >
                          {t('catalog.productsCreate.featured') || 'Featured'}
                        </Badge>
                      </Box>
                    )}

                    <Divider />

                    {/* Gallery Images Section */}
                    <Group justify="space-between">
                      <Group>
                        <IconPhoto size={20} className="text-blue-600" />
                        <Text className="text-base md:text-lg" fw={600}>
                          {t('catalog.productsCreate.galleryImages') || 'Gallery Images'}
                        </Text>
                        <Badge size="sm" variant="light">
                          {galleryImages.length}/6
                        </Badge>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconUpload size={14} />}
                        onClick={handleSelectGalleryImages}
                        disabled={galleryImages.length >= 6}
                      >
                        {t('catalog.productsCreate.addGalleryImages') || 'Add Images'}
                      </Button>
                    </Group>

                    {galleryImages.length === 0 ? (
                      <Paper
                        withBorder
                        p="xl"
                        className="border-dashed"
                        h={150}
                        display="flex"
                        style={{ alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Stack align="center" gap="sm">
                          <IconPhoto size={32} className="text-gray-400" />
                          <Text c="dimmed" size="sm">{t('catalog.productsCreate.noGalleryImages') || 'No gallery images'}</Text>
                          <Text size="xs" c="dimmed">{t('catalog.productsCreate.addUpTo6Images') || 'Add up to 6 images'}</Text>
                        </Stack>
                      </Paper>
                    ) : (
                      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                        {galleryImages.map((image, index) => (
                          <Box key={image.id} pos="relative">
                            <Paper shadow="sm" p="xs" withBorder>
                              <Image
                                src={image.url}
                                alt={`Gallery ${index + 1}`}
                                height={100}
                                radius="md"
                              />
                            </Paper>

                            <Badge
                              pos="absolute"
                              top={4}
                              left={4}
                              size="sm"
                              variant="filled"
                              color="gray"
                            >
                              {index + 1}
                            </Badge>

                            <ActionIcon
                              pos="absolute"
                              top={4}
                              right={4}
                              color="red"
                              variant="filled"
                              size="sm"
                              onClick={() => handleRemoveGalleryImage(image.id)}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>

                            <Stack pos="absolute" bottom={4} right={4} gap={2}>
                              <ActionIcon
                                color="blue"
                                variant="filled"
                                size={20}
                                disabled={index === 0}
                                onClick={() => handleMoveImage(image.id, 'up')}
                              >
                                <IconChevronUp size={14} />
                              </ActionIcon>
                              <ActionIcon
                                color="blue"
                                variant="filled"
                                size={20}
                                disabled={index === galleryImages.length - 1}
                                onClick={() => handleMoveImage(image.id, 'down')}
                              >
                                <IconChevronDown size={14} />
                              </ActionIcon>
                            </Stack>
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}

                    <Group>
                      <TextInput
                        label={t('catalog.productsCreate.videoUrl') || 'YouTube URL'}
                        placeholder={t('catalog.productsCreate.videoUrlPlaceholder') || 'https://youtube.com/watch?v=...'}
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.currentTarget.value)}
                        onFocus={collapseSidebarIfNeeded}
                        style={{ flex: 1 }}
                        leftSection={<IconVideo size={16} />}
                      />
                      <Select
                        label={t('catalog.productsCreate.status') || 'Status'}
                        data={[
                          { value: 'draft', label: t('catalog.productsPage.status.draft') || 'Draft' },
                          { value: 'published', label: t('catalog.productsPage.status.published') || 'Published' },
                          { value: 'archived', label: t('catalog.productsPage.status.archived') || 'Archived' }
                        ]}
                        value={status}
                        onChange={(value) => setStatus(value || 'draft')}
                        onFocus={collapseSidebarIfNeeded}
                        w={150}
                      />
                    </Group>

                  </Stack>
                </Card>

                {/* Price, Stock & Variants Section */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group>
                        <IconTag size={20} className="text-blue-600" />
                        <Text className="text-base md:text-lg" fw={600}>
                          {t('catalog.productsCreate.priceStockVariants') || 'Price, Stock & Variants'}
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlus size={14} />}
                          onClick={handleAddVariant}
                        >
                          {t('catalog.productsCreate.addVariant') || 'Add Variant'}
                        </Button>
                      </Group>
                    </Group>

                    <Text size="sm" c="dimmed">
                      {t('catalog.productsCreate.priceStockVariantsDescription') || 'You can add variants to a product that has more than one option, such as size or color.'}
                    </Text>

                    {/* Variant Types Selection */}
                    {!variantTypesLoading && variantTypes.length > 0 && (
                      <>
                        <Text size="sm" fw={500} mt="md">{t('catalog.productsCreate.selectVariantTypes') || 'Select Variant Types to Generate Combinations'}:</Text>
                        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="sm">
                          {variantTypes.map((type) => {
                            const isSelected = selectedVariantTypes.includes(type.id)
                            const typeOptions = type.options || []
                            const selectedValues = selectedVariantValues[type.id] || []
                            const allSelected = areAllValuesSelected(type.id)

                            return (
                              <Card
                                key={type.id}
                                withBorder
                                p="sm"
                                style={{
                                  borderColor: isSelected ? '#228BE6' : undefined
                                }}
                              >
                                <Stack gap="xs">
                                  {/* Header */}
                                  <Group justify="space-between">
                                    <Group gap="sm">
                                      <Switch
                                        checked={isSelected}
                                        onChange={() => handleToggleVariantType(type.id)}
                                        size="sm"
                                      />
                                      <Text fw={600} size="sm">{type.displayName}</Text>
                                    </Group>
                                    <Badge size="xs" variant="light">
                                      {typeOptions.length} {t('catalog.productsCreate.values') || 'values'}
                                    </Badge>
                                  </Group>

                                  {/* Values Selection - Show when type is selected */}
                                  {isSelected && (
                                    <>
                                      <Group gap="xs" mt="xs">
                                        <Text size="xs" c="dimmed">{t('catalog.productsCreate.selectValues') || 'Select values'}:</Text>
                                        <Button
                                          size="xs"
                                          variant="subtle"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleToggleAllValues(type.id)
                                          }}
                                        >
                                          {allSelected ? t('catalog.productsCreate.deselectAll') || 'Deselect All' : t('catalog.productsCreate.selectAll') || 'Select All'}
                                        </Button>
                                      </Group>

                                      {typeOptions.length === 0 ? (
                                        <Text size="xs" c="dimmed">{t('catalog.productsCreate.noValuesAvailable') || 'No values available'}</Text>
                                      ) : (
                                        <SimpleGrid cols={2} spacing="xs">
                                          {typeOptions.map((option) => (
                                            <Checkbox
                                              key={option.id}
                                              size="xs"
                                              label={option.label || option.value}
                                              checked={selectedValues.includes(option.id)}
                                              onChange={(e) => {
                                                e.stopPropagation()
                                                handleToggleValue(type.id, option.id)
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          ))}
                                        </SimpleGrid>
                                      )}
                                    </>
                                  )}
                                </Stack>
                              </Card>
                            )
                          })}
                        </SimpleGrid>

                        {/* Auto-generated preview */}
                        {selectedVariantTypes.length > 0 && variants.length > 0 && (
                          <Text size="xs" c="dimmed" ta="center" mt="md">
                            {t('catalog.productsCreate.generatedVariants', { count: variants.length, types: selectedVariantTypes.length }) || `Generated ${variants.length} variant${variants.length !== 1 ? 's' : ''} from ${selectedVariantTypes.length} variant type(s)`}
                          </Text>
                        )}

                        <Divider />
                      </>
                    )}

                    {!variantTypesLoading && variantTypes.length === 0 && (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        {t('catalog.productsCreate.noVariantTypes') || 'No variant types available.'} <Anchor href="/admin/catalog/variant-attributes" target="_blank">
                          {t('catalog.productsCreate.variantAttributesLink') || 'Variant Attributes'}
                        </Anchor>
                      </Text>
                    )}

                    {/* Global Channel Settings - Applies to ALL Variants */}
                    <Card withBorder p="md" bg="gradient.0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <Stack gap="md">
                        <Group justify="space-between" align="center" c="white">
                          <Group gap="sm">
                            <IconDeviceFloppy size={24} style={{ color: 'white' }} />
                            <Text size="lg" fw={600} c="white">Global Channel Settings</Text>
                            <Badge size="sm" color="white" c="black">Applies to All Variants</Badge>
                          </Group>
                        </Group>

                        <Text size="sm" c="white">
                          Configure pricing once. All variants will inherit these settings automatically.
                        </Text>

                        <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }}>
                          {/* RETAIL */}
                          <Card p="sm" bg="white">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Text size="lg">🛒</Text>
                                  <Text size="sm" fw={600}>Retail</Text>
                                </Group>
                                <Switch
                                  checked={globalChannelSettings.retail.active}
                                  onChange={(e) => handleUpdateGlobalChannel('retail', 'active', e.currentTarget.checked)}
                                  size="sm"
                                  color="green"
                                />
                              </Group>
                              {globalChannelSettings.retail.active && (
                                <Stack gap="xs" mt="xs">
                                  <NumberInput
                                    size="xs"
                                    label="Price"
                                    value={globalChannelSettings.retail.price}
                                    onChange={(v) => handleUpdateGlobalChannel('retail', 'price', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="Offer"
                                    value={globalChannelSettings.retail.offerPrice}
                                    onChange={(v) => handleUpdateGlobalChannel('retail', 'offerPrice', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="MOQ"
                                    value={globalChannelSettings.retail.moq}
                                    onChange={(v) => handleUpdateGlobalChannel('retail', 'moq', typeof v === 'number' ? v : 1)}
                                    min={1}
                                  />
                                </Stack>
                              )}
                            </Stack>
                          </Card>

                          {/* WHOLESALE */}
                          <Card p="sm" bg="white">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Text size="lg">📦</Text>
                                  <Text size="sm" fw={600}>Wholesale</Text>
                                </Group>
                                <Switch
                                  checked={globalChannelSettings.wholesale.active}
                                  onChange={(e) => handleUpdateGlobalChannel('wholesale', 'active', e.currentTarget.checked)}
                                  size="sm"
                                  color="green"
                                />
                              </Group>
                              {globalChannelSettings.wholesale.active && (
                                <Stack gap="xs" mt="xs">
                                  <NumberInput
                                    size="xs"
                                    label="Price"
                                    value={globalChannelSettings.wholesale.price}
                                    onChange={(v) => handleUpdateGlobalChannel('wholesale', 'price', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="Offer"
                                    value={globalChannelSettings.wholesale.offerPrice}
                                    onChange={(v) => handleUpdateGlobalChannel('wholesale', 'offerPrice', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="MOQ"
                                    value={globalChannelSettings.wholesale.moq}
                                    onChange={(v) => handleUpdateGlobalChannel('wholesale', 'moq', typeof v === 'number' ? v : 1)}
                                    min={1}
                                    description="Min order"
                                  />
                                </Stack>
                              )}
                            </Stack>
                          </Card>

                          {/* DARAZ */}
                          <Card p="sm" bg="white">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Text size="lg">🏪</Text>
                                  <Text size="sm" fw={600}>Daraz</Text>
                                </Group>
                                <Switch
                                  checked={globalChannelSettings.daraz.active}
                                  onChange={(e) => handleUpdateGlobalChannel('daraz', 'active', e.currentTarget.checked)}
                                  size="sm"
                                  color="green"
                                />
                              </Group>
                              {globalChannelSettings.daraz.active && (
                                <Stack gap="xs" mt="xs">
                                  <NumberInput
                                    size="xs"
                                    label="Price"
                                    value={globalChannelSettings.daraz.price}
                                    onChange={(v) => handleUpdateGlobalChannel('daraz', 'price', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="Offer"
                                    value={globalChannelSettings.daraz.offerPrice}
                                    onChange={(v) => handleUpdateGlobalChannel('daraz', 'offerPrice', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="MOQ"
                                    value={globalChannelSettings.daraz.moq}
                                    onChange={(v) => handleUpdateGlobalChannel('daraz', 'moq', typeof v === 'number' ? v : 1)}
                                    min={1}
                                    description="Min order"
                                  />
                                </Stack>
                              )}
                            </Stack>
                          </Card>

                          {/* POS */}
                          <Card p="sm" bg="white">
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Text size="lg">🏟️</Text>
                                  <Text size="sm" fw={600}>POS</Text>
                                </Group>
                                <Switch
                                  checked={globalChannelSettings.pos.active}
                                  onChange={(e) => handleUpdateGlobalChannel('pos', 'active', e.currentTarget.checked)}
                                  size="sm"
                                  color="green"
                                />
                              </Group>
                              {globalChannelSettings.pos.active && (
                                <Stack gap="xs" mt="xs">
                                  <NumberInput
                                    size="xs"
                                    label="Price"
                                    value={globalChannelSettings.pos.price}
                                    onChange={(v) => handleUpdateGlobalChannel('pos', 'price', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="Offer"
                                    value={globalChannelSettings.pos.offerPrice}
                                    onChange={(v) => handleUpdateGlobalChannel('pos', 'offerPrice', typeof v === 'number' ? v : 0)}
                                    leftSection={<Text size="xs">৳</Text>}
                                  />
                                  <NumberInput
                                    size="xs"
                                    label="MOQ"
                                    value={globalChannelSettings.pos.moq}
                                    onChange={(v) => handleUpdateGlobalChannel('pos', 'moq', typeof v === 'number' ? v : 1)}
                                    min={1}
                                    description="Min order"
                                  />
                                </Stack>
                              )}
                            </Stack>
                          </Card>
                        </SimpleGrid>
                      </Stack>
                    </Card>

                    {/* Variant Cards with Channel Override */}
                    <Stack gap="lg">
                      {variants.map((variant, index) => (
                        <Card key={variant.id} withBorder shadow="sm">
                          <Stack gap="md">
                            {/* Variant Header */}
                            <Group justify="space-between" align="center">
                              <Group gap="sm">
                                <IconTag size={20} style={{ color: '#228BE6' }} />
                                <Text className="text-base md:text-lg" fw={600}>
                                  {variant.name || `Variant ${index + 1}`}
                                </Text>
                                {variant.name && (
                                  <Badge size="sm" color="blue">{variant.name}</Badge>
                                )}
                              </Group>
                              {variants.length > 1 && (
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="lg"
                                  onClick={() => handleRemoveVariant(variant.id)}
                                >
                                  <IconTrash size={18} />
                                </ActionIcon>
                              )}
                            </Group>

                            {/* Variant Name Input */}
                            <TextInput
                              label="Variant Name"
                              placeholder="e.g., Size M - Red"
                              value={variant.name}
                              onChange={(e) => handleUpdateVariant(variant.id, 'name', e.currentTarget.value)}
                              onFocus={collapseSidebarIfNeeded}
                              size="sm"
                              description="Name for this variant combination"
                            />

                            {/* Active Channels Summary */}
                            <Card withBorder p="sm" bg="gray.0">
                              <Text size="xs" fw={600} mb="xs">Active Channels (Inherits Global Settings)</Text>
                              <SimpleGrid cols={{ base: 2, md: 4 }}>
                                {variant.retail.active && (
                                  <Badge size="lg" color="green" variant="light">🛒 Retail: ৳{variant.retail.price}</Badge>
                                )}
                                {variant.wholesale.active && (
                                  <Badge size="lg" color="blue" variant="light">📦 Wholesale: ৳{variant.wholesale.price}</Badge>
                                )}
                                {variant.daraz.active && (
                                  <Badge size="lg" color="orange" variant="light">🏪 Daraz: ৳{variant.daraz.price}</Badge>
                                )}
                                {variant.pos.active && (
                                  <Badge size="lg" color="purple" variant="light">🏟️ POS: ৳{variant.pos.price}</Badge>
                                )}
                              </SimpleGrid>
                            </Card>

                            {/* Channel Override Sections */}
                            <Accordion multiple={false}>
                              {/* Retail Override */}
                              <Accordion.Item value="retail">
                                <Accordion.Control>
                                  <Group justify="space-between">
                                    <Text size="sm" fw={600}>🛒 Retail Settings</Text>
                                    <Badge size="xs" color="gray">Inherits from global</Badge>
                                  </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <Card withBorder p="sm" bg="blue.0">
                                    <Text size="xs" c="dimmed" mb="sm">
                                      Customize settings for this variant. Leave empty to use global settings.
                                    </Text>
                                    {/* TODO: Add override form here */}
                                  </Card>
                                </Accordion.Panel>
                              </Accordion.Item>

                              {/* Wholesale Override */}
                              <Accordion.Item value="wholesale">
                                <Accordion.Control>
                                  <Group justify="space-between">
                                    <Text size="sm" fw={600}>📦 Wholesale Settings</Text>
                                    <Badge size="xs" color="gray">Inherits from global</Badge>
                                  </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <Card withBorder p="sm" bg="blue.0">
                                    <Text size="xs" c="dimmed" mb="sm">
                                      Customize settings for this variant. Leave empty to use global settings.
                                    </Text>
                                    {/* TODO: Add override form here */}
                                  </Card>
                                </Accordion.Panel>
                              </Accordion.Item>

                              {/* Daraz Override */}
                              <Accordion.Item value="daraz">
                                <Accordion.Control>
                                  <Group justify="space-between">
                                    <Text size="sm" fw={600}>🏪 Daraz Settings</Text>
                                    <Badge size="xs" color="gray">Inherits from global</Badge>
                                  </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <Card withBorder p="sm" bg="blue.0">
                                    <Text size="xs" c="dimmed" mb="sm">
                                      Customize settings for this variant. Leave empty to use global settings.
                                    </Text>
                                    {/* TODO: Add override form here */}
                                  </Card>
                                </Accordion.Panel>
                              </Accordion.Item>

                              {/* POS Override */}
                              <Accordion.Item value="pos">
                                <Accordion.Control>
                                  <Group justify="space-between">
                                    <Text size="sm" fw={600}>🏟️ POS Settings</Text>
                                    <Badge size="xs" color="gray">Inherits from global</Badge>
                                  </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                  <Card withBorder p="sm" bg="blue.0">
                                    <Text size="xs" c="dimmed" mb="sm">
                                      Customize settings for this variant. Leave empty to use global settings.
                                    </Text>
                                    {/* TODO: Add override form here */}
                                  </Card>
                                </Accordion.Panel>
                              </Accordion.Item>
                            </Accordion>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </Stack>
                </Card>

                {/* Product Description & Highlights Section */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="xl">
                    <Group>
                      <IconCoin size={20} style={{ color: '#228BE6' }} />
                      <Text className="text-base md:text-lg" fw={600}>
                        {t('catalog.productsCreate.descriptionAndHighlights') || 'Product Description & Highlights'}
                      </Text>
                    </Group>

                    {/* Description */}
                    <Stack gap="sm">
                      <Text size="sm" fw={500}>
                        {t('catalog.productsCreate.productDescription') || 'Product Description'} <Text span c="red">*</Text>
                      </Text>
                      <Box
                        id="description-editor-container"
                        style={{
                          borderRadius: '4px'
                        }}
                      />
                    </Stack>

                    {/* Highlights */}
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={500}>
                          {t('catalog.productsCreate.productHighlights') || 'Product Highlights'} <Text span c="red">*</Text>
                        </Text>
                        <Button
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={handleAddHighlight}
                          variant="light"
                        >
                          {t('common.add') || 'Add'}
                        </Button>
                      </Group>

                      <Stack gap="xs">
                        {highlightsList.map((highlight, index) => (
                          <Group key={index} gap="xs" wrap="nowrap">
                            <Text size="sm" c="dimmed">{index + 1}.</Text>
                            <TextInput
                              placeholder={t('catalog.productsCreate.highlightPlaceholder') || 'Enter a highlight (e.g., "Premium quality material")'}
                              value={highlight}
                              onChange={(e) => handleUpdateHighlight(index, e.target.value)}
                              onFocus={collapseSidebarIfNeeded}
                              style={{ flex: 1 }}
                              size="sm"
                            />
                            {highlightsList.length > 1 && (
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => handleRemoveHighlight(index)}
                                size={30}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                        ))}
                      </Stack>

                      <Text size="xs" c="dimmed">
                        {t('catalog.productsCreate.highlightsTip') || 'Add key product highlights, features, or benefits. Click Add to create more items.'}
                      </Text>
                    </Stack>
                  </Stack>
                </Card>

                {/* SEO Section */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="xl">
                    <Group>
                      <IconTag size={20} className="text-purple-600" />
                      <Text className="text-base md:text-lg" fw={600}>
                        {t('catalog.productsCreate.seoSection') || 'SEO (Search Engine Optimization)'}
                      </Text>
                    </Group>

                    {/* Two-column layout: Inputs | Preview */}
                    <Grid>
                      {/* Left: Input Fields */}
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="md">
                          {/* SEO Title */}
                          <Stack gap="sm">
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500}>
                                {t('catalog.productsCreate.seoTitle') || 'SEO Title'}
                              </Text>
                              <Text size="xs" c={seoTitle.length > 60 ? 'red' : seoTitle.length > 50 ? 'yellow' : 'dimmed'}>
                                {seoTitle.length}/60
                              </Text>
                            </Group>
                            <TextInput
                              placeholder={t('catalog.productsCreate.seoTitlePlaceholder') || 'Best Product Name for SEO - Your Brand'}
                              value={seoTitle}
                              onChange={(e) => setSeoTitle(e.currentTarget.value)}
                              onFocus={collapseSidebarIfNeeded}
                              maxLength={60}
                            />
                            <Text size="xs" c="dimmed">
                              {t('catalog.productsCreate.seoTitleTip') || 'Recommended: 50-60 characters. This appears in search results.'}
                            </Text>
                          </Stack>

                          {/* SEO Description */}
                          <Stack gap="sm">
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={500}>
                                {t('catalog.productsCreate.seoDescription') || 'SEO Description'}
                              </Text>
                              <Text size="xs" c={seoDescription.length > 160 ? 'red' : seoDescription.length > 120 ? 'yellow' : 'dimmed'}>
                                {seoDescription.length}/160
                              </Text>
                            </Group>
                            <TextInput
                              placeholder={t('catalog.productsCreate.seoDescriptionPlaceholder') || 'A compelling description that encourages users to click...'}
                              value={seoDescription}
                              onChange={(e) => setSeoDescription(e.currentTarget.value)}
                              onFocus={collapseSidebarIfNeeded}
                              maxLength={160}
                            />
                            <Text size="xs" c="dimmed">
                              {t('catalog.productsCreate.seoDescriptionTip') || 'Recommended: 120-160 characters. This appears below your title in search results.'}
                            </Text>
                          </Stack>

                          {/* SEO Tags */}
                          <Stack gap="sm">
                            <Text size="sm" fw={500}>
                              {t('catalog.productsCreate.seoTags') || 'SEO Tags'}
                            </Text>
                            <TextInput
                              placeholder={t('catalog.productsCreate.seoTagsPlaceholder') || 'product, category, brand, feature, benefit'}
                              value={seoTags}
                              onChange={(e) => setSeoTags(e.currentTarget.value)}
                              onFocus={collapseSidebarIfNeeded}
                            />
                            <Text size="xs" c="dimmed">
                              {t('catalog.productsCreate.seoTagsTip') || 'Comma-separated search keywords. Examples: product type, features, benefits, use cases.'}
                            </Text>
                          </Stack>
                        </Stack>
                      </Grid.Col>

                      {/* Right: Google Search Preview */}
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <Stack gap="sm">
                          <Text size="sm" fw={500} c="dimmed">
                            {t('catalog.productsCreate.googlePreview') || 'Google Search Preview'}
                          </Text>
                          <Paper withBorder p="lg" bg="white" style={{ cursor: 'pointer' }}>
                            <Stack gap={4}>
                              {/* Site Info Row */}
                              <Group gap={6} wrap="nowrap">
                                {/* Site Icon */}
                                <Box
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: '#f1f3f4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Text size="xs" fw={700} c="#5f6368">H</Text>
                                </Box>

                                {/* Domain Name */}
                                <Text size="xs" c="#202124">
                                  hooknhunt.com
                                </Text>

                                {/* Arrow */}
                                <Text size="xs" c="#5f6368">›</Text>

                                {/* Breadcrumb */}
                                <Text size="xs" c="#202124" truncate>
                                  Products › {(seoTitle || 'Product Name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}
                                </Text>
                              </Group>

                              {/* Title - Large and Blue */}
                              <Text
                                size="xl"
                                fw={400}
                                c="#1a0dab"
                                style={{
                                  lineHeight: '1.3',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {seoTitle || t('catalog.productsCreate.seoTitlePlaceholder') || 'Best Product Name for SEO - Your Brand'}
                              </Text>

                              {/* Description - Below Title */}
                              <Text
                                size="sm"
                                c="#4d5156"
                                style={{
                                  lineHeight: '1.58',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {seoDescription || t('catalog.productsCreate.seoDescriptionPlaceholder') || 'A compelling description that encourages users to click...'}
                              </Text>
                            </Stack>
                          </Paper>

                          {/* Preview Tips */}
                          <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={500} c="dimmed">
                              {t('catalog.productsCreate.previewTips') || 'Preview Tips:'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              • {t('catalog.productsCreate.previewTip1') || 'Title appears in blue and links to your page'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              • {t('catalog.productsCreate.previewTip2') || 'Description appears below the title in gray'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              • {t('catalog.productsCreate.previewTip3') || 'URL is automatically generated from the title'}
                            </Text>
                          </Stack>
                        </Stack>
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Submit Buttons */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button
              variant="light"
              onClick={() => { window.location.href = '/admin/catalog/products' }}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              leftSection={<IconDeviceFloppy size={16} />}
            >
              {t('catalog.productsCreate.saveProduct') || 'Save Product'}
            </Button>
          </Group>
        </form>
      </Stack>
    </Box>
  )
}
