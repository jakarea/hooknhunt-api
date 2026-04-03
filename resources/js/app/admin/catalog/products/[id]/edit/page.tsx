'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Breadcrumbs,
  Anchor,
  Card,
  Divider,
  ActionIcon,
  Image,
  Badge,
  Grid,
  SimpleGrid,
  Skeleton,
  useMantineColorScheme
} from '@mantine/core'
import {
  IconPhoto,
  IconX,
  IconPackages,
  IconDeviceFloppy,
  IconUpload,
  IconTrash,
  IconVideo,
  IconPlus,
  IconTag,
  IconBox,
  IconCoin,
  IconShoppingBag,
  IconLoader,
  IconArrowLeft
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getCategories, getBrands, getProduct, type Category, type Brand } from '@/utils/api'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { useUIStore } from '@/stores/uiStore'
import { apiMethods } from '@/lib/api'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GalleryImage {
  id: string
  mediaId: number
  url: string
  order: number
}

interface ProductVariant {
  id: string
  dbId?: number
  retail_id?: number | null
  wholesale_id?: number | null
  name: string
  price: number
  wholesalePrice: number
  purchaseCost: number
  specialPrice?: number
  wholesaleOfferPrice?: number
  wholesaleMoq: number
  weight: number
  stock: number
  sellerSku: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditProductPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { openSingleSelect, openMultipleSelect } = useMediaSelector()
  const { colorScheme } = useMantineColorScheme()

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Clear error for a specific field
  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }

  // Collapse sidebar on input focus
  const collapseSidebarIfNeeded = useCallback(() => {
    const state = useUIStore.getState()
    if (!state.sidebarCollapsed) {
      state.toggleSidebar()
    }
  }, [])

  // Form state
  const [productName, setProductName] = useState('')
  const [wholesaleName, setWholesaleName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [status, setStatus] = useState('draft')
  const [videoUrl, setVideoUrl] = useState('')
  const [enableWarranty, setEnableWarranty] = useState(false)
  const [warrantyDetails, setWarrantyDetails] = useState('')
  const [enablePreorder, setEnablePreorder] = useState(false)
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [highlightsList, setHighlightsList] = useState<string[]>([])
  const [includesInTheBox, setIncludesInTheBox] = useState<string[]>([])

  // SEO state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoTags, setSeoTags] = useState('')

  // Quill editor refs
  const descriptionQuillRef = useRef<any>(null)
  const highlightsQuillRef = useRef<any>(null)
  const includesInTheBoxQuillRef = useRef<any>(null)

  // Media state
  const [featuredImage, setFeaturedImage] = useState<{ mediaId: number; url: string } | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([])

  // Default values for new variants
  const [defaultValues, setDefaultValues] = useState({
    name: '',
    price: 0,
    wholesalePrice: 0,
    purchaseCost: 0,
    specialPrice: undefined as number | undefined,
    wholesaleOfferPrice: undefined as number | undefined,
    wholesaleMoq: 6,
    weight: 0,
    stock: 0,
    sellerSku: ''
  })

  // API data state
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [brandsLoading, setBrandsLoading] = useState(true)

  // Track if initial data has been loaded (to prevent auto-fill during population)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // ============================================================================
  // QUIOR EDITOR INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Load Quill from CDN
    const loadQuill = async () => {
      if (typeof window !== 'undefined' && !(window as any).Quill) {
        // Load Quill CSS
        const quillCss = document.createElement('link')
        quillCss.rel = 'stylesheet'
        quillCss.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
        document.head.appendChild(quillCss)

        // Load Quill JS
        const quillScript = document.createElement('script')
        quillScript.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js'
        quillScript.async = true
        document.head.appendChild(quillScript)
      }
    }

    loadQuill()
  }, [])

  // Initialize Quill editors after product data is loaded
  useEffect(() => {
    if (isLoading) return

    const initializeQuillEditors = () => {
      if (typeof window === 'undefined' || !(window as any).Quill) return

      const Quill = (window as any).Quill

      // Description Editor
      const descriptionContainer = document.getElementById('description-editor')
      if (descriptionContainer && !descriptionQuillRef.current && description) {
        const quill1 = new Quill('#description-editor', {
          theme: 'snow',
          placeholder: 'Enter product description...',
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['clean']
            ]
          }
        })
        quill1.root.innerHTML = description
        quill1.on('text-change', () => {
          setDescription(quill1.root.innerHTML)
        })
        descriptionQuillRef.current = quill1
      } else if (descriptionQuillRef.current && description) {
        descriptionQuillRef.current.root.innerHTML = description
      }

      // Highlights Editor
      const highlightsContainer = document.getElementById('highlights-editor')
      if (highlightsContainer && !highlightsQuillRef.current) {
        const quill2 = new Quill('#highlights-editor', {
          theme: 'snow',
          placeholder: '• Add key product highlights, features, or benefits...',
          modules: {
            toolbar: [
              [{ 'list': 'bullet' }],
              ['bold', 'italic'],
              ['clean']
            ]
          }
        })
        // Initialize with bullet list format
        quill2.on('text-change', () => {
          const html = quill2.root.innerHTML
          const text = quill2.getText().trim()
          const lines = text.split('\n').filter(line => line.trim())
          setHighlightsList(lines)
        })
        highlightsQuillRef.current = quill2

        // Set initial content if highlights exist
        if (highlightsList.length > 0) {
          const initialHtml = highlightsList.map(h => `<li>${h}</li>`).join('')
          quill2.root.innerHTML = `<ul>${initialHtml}</ul>`
        }
      }

      // Includes in the Box Editor
      const includesInTheBoxContainer = document.getElementById('includes-in-the-box-editor')
      if (includesInTheBoxContainer && !includesInTheBoxQuillRef.current) {
        const quill3 = new Quill('#includes-in-the-box-editor', {
          theme: 'snow',
          placeholder: '• List items included in the package...',
          modules: {
            toolbar: [
              [{ 'list': 'bullet' }],
              ['bold', 'italic'],
              ['clean']
            ]
          }
        })
        quill3.on('text-change', () => {
          const html = quill3.root.innerHTML
          const text = quill3.getText().trim()
          const lines = text.split('\n').filter(line => line.trim())
          setIncludesInTheBox(lines)
        })
        includesInTheBoxQuillRef.current = quill3

        // Set initial content if includes exist
        if (includesInTheBox.length > 0) {
          const initialHtml = includesInTheBox.map(item => `<li>${item}</li>`).join('')
          quill3.root.innerHTML = `<ul>${initialHtml}</ul>`
        }
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(initializeQuillEditors, 100)
  }, [isLoading, description, highlightsList, includesInTheBox])

  // Cleanup Quill editors on unmount
  useEffect(() => {
    return () => {
      if (descriptionQuillRef.current) {
        descriptionQuillRef.current = null
      }
      if (highlightsQuillRef.current) {
        highlightsQuillRef.current = null
      }
      if (includesInTheBoxQuillRef.current) {
        includesInTheBoxQuillRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          getCategories(),
          getBrands()
        ])

        // DEBUG: Log the API responses
        console.log('📋 Categories Response:', categoriesData)
        console.log('🏷️ Brands Response:', brandsData)

        // Handle categories response
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData)
        } else if (categoriesData?.data && Array.isArray(categoriesData.data)) {
          setCategories(categoriesData.data)
        } else if (categoriesData?.data && typeof categoriesData.data === 'object') {
          // Handle paginated response
          const { data: categoriesArray } = categoriesData.data
          if (Array.isArray(categoriesArray)) {
            setCategories(categoriesArray)
          }
        }

        // Handle brands response
        if (Array.isArray(brandsData)) {
          setBrands(brandsData)
        } else if (brandsData?.data && Array.isArray(brandsData.data)) {
          setBrands(brandsData.data)
        } else if (brandsData?.data && typeof brandsData.data === 'object') {
          // Handle paginated response
          const { data: brandsArray } = brandsData.data
          if (Array.isArray(brandsArray)) {
            setBrands(brandsArray)
          }
        }

        console.log('✅ Loaded Categories:', categories.length)
        console.log('✅ Loaded Brands:', brands.length)

      } catch (error) {
        console.error('Failed to fetch data:', error)
        notifications.show({
          title: t('common.error') || 'Error',
          message: 'Failed to load required data',
          color: 'red'
        })
      } finally {
        setCategoriesLoading(false)
        setBrandsLoading(false)
      }
    }

    fetchData()
  }, [t])

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        const response = await getProduct(Number(id))

        // Handle different response structures
        const productData = response?.data || response

        if (!productData) {
          throw new Error('Product not found')
        }

        // DEBUG: Log the actual product data structure
        console.log('📦 Product Data:', productData)
        console.log('📦 Category:', productData.category, productData.categoryId)
        console.log('📦 Brand:', productData.brand, productData.brandId)

        // Populate form fields - Handle both nested objects and IDs
        setProductName(productData.name || productData.baseName || productData.retailName || '')
        setWholesaleName(productData.wholesaleName || '')

        // Category - check for both nested object and ID
        const categoryId = productData.category?.id || productData.categoryId
        setCategory(categoryId?.toString() || null)

        // Brand - check for both nested object and ID
        const brandId = productData.brand?.id || productData.brandId
        setBrand(brandId?.toString() || null)

        setStatus(productData.status || 'draft')
        setVideoUrl(productData.videoUrl || '')
        setEnableWarranty(!!productData.warrantyEnabled)
        setWarrantyDetails(productData.warrantyDetails || '')

        // Preorder settings are stored in variants, check first variant
        console.log('🔍 All variants:', productData.variants)
        const firstRetailVariant = productData.variants?.find((v: any) => {
          const channel = v.channel || ''
          console.log('Checking variant:', v, 'channel:', channel, 'is retail:', channel.toLowerCase() === 'retail')
          return channel.toLowerCase() === 'retail'
        })
        console.log('✅ Found retail variant:', firstRetailVariant)

        if (firstRetailVariant) {
          setEnablePreorder(!!firstRetailVariant.allowPreorder)
          setExpectedDeliveryDate(firstRetailVariant.expectedDelivery || null)
          console.log('✅ Set preorder:', !!firstRetailVariant.allowPreorder, 'delivery:', firstRetailVariant.expectedDelivery)
        } else {
          setEnablePreorder(false)
          setExpectedDeliveryDate(null)
        }

        // Decode HTML entities in description before setting it
        let description = productData.description || ''
        if (description) {
          // Create a temporary div to decode HTML entities
          const textarea = document.createElement('textarea')
          textarea.innerHTML = description
          description = textarea.value
        }
        setDescription(description)

        setHighlightsList(productData.highlights || [])
        setIncludesInTheBox(productData.inTheBox || productData.includes_in_the_box || [])

        // SEO
        setSeoTitle(productData.seoTitle || productData.metaTitle || '')
        setSeoDescription(productData.seoDescription || productData.metaDescription || '')
        setSeoTags(productData.seoTags || '')

        // Featured image
        if (productData.thumbnail || productData.featuredImage) {
          const thumb = productData.thumbnail || productData.featuredImage
          setFeaturedImage({
            mediaId: thumb.id,
            url: thumb.fullUrl || thumb.url
          })
        }

        // Gallery images - use galleryImagesUrls if available (new API response)
        if (productData.galleryImagesUrls && Array.isArray(productData.galleryImagesUrls)) {
          setGalleryImages(productData.galleryImagesUrls.map((url: string, index: number) => ({
            id: `existing-${index}`,
            mediaId: productData.galleryImages?.[index] || index,
            url: url,
            order: index
          })))
        } else if (productData.galleryImages && Array.isArray(productData.galleryImages) && productData.galleryImages.length > 0) {
          // Fallback for old API response format (array of objects)
          const firstImg = productData.galleryImages[0]
          if (typeof firstImg === 'object' && firstImg !== null) {
            setGalleryImages(productData.galleryImages.map((img: any, index: number) => ({
              id: `existing-${img.id || index}`,
              mediaId: img.id,
              url: img.fullUrl || img.url,
              order: index
            })))
          }
        }

        // Variants - Group/merge by variant_name (retail + wholesale channels)
        if (productData.variants && Array.isArray(productData.variants)) {
          // Check if variants have channel field
          const hasChannelField = productData.variants.some((v: any) => v.channel)

          if (hasChannelField) {
            // Merge by channel
            const variantGroups = new Map<string, any>()

            productData.variants.forEach((variant: any) => {
              const name = variant.variantName || variant.variant_name || variant.name || ''
              const channel = variant.channel || ''

              if (!variantGroups.has(name)) {
                variantGroups.set(name, {
                  id: `merged-${name}`,
                  retail_id: null,
                  wholesale_id: null,
                  name: name,
                  sellerSku: '',
                  purchaseCost: 0,
                  price: 0,
                  specialPrice: 0,
                  wholesalePrice: 0,
                  wholesaleOfferPrice: 0,
                  wholesaleMoq: 6,
                  weight: 0,
                  stock: 0
                })
              }

              const existing = variantGroups.get(name)!

              if (channel === 'retail') {
                existing.retail_id = variant.id
                existing.price = variant.price || 0
                existing.specialPrice = variant.offer_price || variant.offerPrice || 0
                existing.sellerSku = variant.sku || variant.custom_sku || ''
                existing.purchaseCost = variant.purchase_cost || variant.purchaseCost || 0
                existing.weight = variant.weight || 0
                existing.stock = variant.current_stock || variant.stock || 0
              }

              if (channel === 'wholesale') {
                existing.wholesale_id = variant.id
                existing.wholesalePrice = variant.price || 0
                existing.wholesaleOfferPrice = variant.offer_price || variant.offerPrice || 0
                existing.wholesaleMoq = variant.moq || 6
              }
            })

            const mergedVariants = Array.from(variantGroups.values())
            console.log('🔄 Merged Variants:', mergedVariants)
            setVariants(mergedVariants)
          } else {
            // Direct mapping - variants don't have channels
            const mappedVariants = productData.variants.map((variant: any, index: number) => ({
              id: `variant-${variant.id || index}`,
              dbId: variant.id,
              retail_id: variant.retail_id || variant.retailId || null,
              wholesale_id: variant.wholesale_id || variant.wholesaleId || null,
              name: variant.variantName || variant.variant_name || variant.name || '',
              sellerSku: variant.sku || variant.custom_sku || variant.sellerSku || '',
              purchaseCost: variant.purchase_cost || variant.purchaseCost || 0,
              price: variant.retail_price || variant.retailPrice || variant.price || 0,
              specialPrice: variant.retail_offer_price || variant.retailOfferPrice || variant.offer_price || variant.offerPrice || variant.specialPrice || 0,
              wholesalePrice: variant.wholesale_price || variant.wholesalePrice || 0,
              wholesaleOfferPrice: variant.wholesale_offer_price || variant.wholesaleOfferPrice || 0,
              wholesaleMoq: variant.wholesale_moq || variant.wholesaleMoq || variant.moq || 6,
              weight: variant.weight || 0,
              stock: variant.current_stock || variant.stock || 0
            }))
            console.log('📦 Direct Variants:', mappedVariants)
            setVariants(mappedVariants)
          }
        }

        // Mark initial data as loaded
        setInitialDataLoaded(true)

      } catch (error: any) {
        console.error('Failed to load product:', error)
        notifications.show({
          title: t('common.error') || 'Error',
          message: error?.response?.data?.message || error?.message || 'Failed to load product',
          color: 'red'
        })
        setTimeout(() => {
          navigate('/catalog/products')
        }, 2000)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id, t, navigate])

  // Store original values for comparison
  const originalValues = useRef({
    seoTitle: '',
    productName: '',
    wholesaleName: ''
  })

  // Update original values when data is loaded
  useEffect(() => {
    if (initialDataLoaded && !isLoading) {
      originalValues.current = {
        seoTitle: seoTitle,
        productName: productName,
        wholesaleName: wholesaleName
      }
    }
  }, [initialDataLoaded, isLoading, seoTitle, productName, wholesaleName])

  // Auto-fill wholesale name ONLY if it's empty
  useEffect(() => {
    // Only auto-fill after initial data has been loaded
    if (productName && initialDataLoaded) {
      if (!wholesaleName || wholesaleName === originalValues.current.productName) {
        setWholesaleName(productName)
      }

      const shouldUpdateSeo = !seoTitle ||
        seoTitle === originalValues.current.productName ||
        seoTitle === originalValues.current.seoTitle

      if (shouldUpdateSeo) {
        setSeoTitle(productName.slice(0, 60))
      }
    }
  }, [productName, initialDataLoaded, seoTitle])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Featured image handler
  const handleSelectFeaturedImage = useCallback(async () => {
    try {
      const result = await openSingleSelect()
      if (result) {
        setFeaturedImage({
          mediaId: result.id,
          url: result.fullUrl || result.url
        })
        clearError('featuredImage')
      }
    } catch (error) {
      console.error('Failed to select image:', error)
    }
  }, [openSingleSelect])

  const handleRemoveFeaturedImage = useCallback(() => {
    setFeaturedImage(null)
  }, [])

  // Gallery images handler
  const handleSelectGalleryImages = useCallback(async () => {
    try {
      const results = await openMultipleSelect()
      if (results && results.length > 0) {
        const newImages: GalleryImage[] = results.map((media, index) => ({
          id: `new-${Date.now()}-${index}`,
          mediaId: media.id,
          url: media.fullUrl || media.url,
          order: galleryImages.length + index
        }))
        setGalleryImages(prev => [...prev, ...newImages])
        clearError('galleryImages')
      }
    } catch (error) {
      console.error('Failed to select images:', error)
    }
  }, [openMultipleSelect, galleryImages.length])

  const handleRemoveGalleryImage = useCallback((imageId: string) => {
    setGalleryImages(prev => prev.filter(img => img.id !== imageId))
  }, [])

  // Variant handlers
  const handleAddVariant = useCallback(() => {
    const newVariant: ProductVariant = {
      id: `new-${Date.now()}`,
      name: defaultValues.name || '',
      price: defaultValues.price,
      wholesalePrice: defaultValues.wholesalePrice,
      purchaseCost: defaultValues.purchaseCost,
      specialPrice: defaultValues.specialPrice,
      wholesaleOfferPrice: defaultValues.wholesaleOfferPrice,
      wholesaleMoq: defaultValues.wholesaleMoq,
      weight: defaultValues.weight,
      stock: defaultValues.stock,
      sellerSku: defaultValues.sellerSku
    }
    setVariants(prev => [...prev, newVariant])
    clearError('variants')
  }, [defaultValues])

  const handleRemoveVariant = useCallback((variantId: string) => {
    if (variants.length === 1) {
      notifications.show({
        title: t('catalog.productsEdit.notification.cannotRemoveLastVariant') || 'Cannot Remove',
        message: t('catalog.productsEdit.notification.atLeastOneVariant') || 'At least one variant is required',
        color: 'orange'
      })
      return
    }
    setVariants(prev => prev.filter(v => v.id !== variantId))
  }, [variants.length, t])

  const handleUpdateVariant = useCallback((variantId: string, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map(v => {
      if (v.id === variantId) {
        const updated = { ...v, [field]: value }
        if (field === 'purchaseCost' && typeof value === 'number' && value > 0) {
          updated.price = value * 1.5
          updated.wholesalePrice = value * 1.2
        }
        return updated
      }
      return v
    }))
  }, [])

  const handleApplyDefaultsToAll = useCallback(() => {
    setVariants(prev => prev.map(v => ({
      ...v,
      ...(defaultValues.name ? { name: defaultValues.name } : {}),
      price: defaultValues.price,
      wholesalePrice: defaultValues.wholesalePrice,
      purchaseCost: defaultValues.purchaseCost,
      specialPrice: defaultValues.specialPrice,
      wholesaleOfferPrice: defaultValues.wholesaleOfferPrice,
      wholesaleMoq: defaultValues.wholesaleMoq,
      weight: defaultValues.weight,
      stock: defaultValues.stock,
      sellerSku: defaultValues.sellerSku
    })))

    notifications.show({
      title: t('catalog.productsEdit.notification.defaultValuesApplied') || 'Default Values Applied',
      message: t('catalog.productsEdit.notification.defaultValuesAppliedMessage', { count: variants.length }) || `Applied to ${variants.length} variant(s)`,
      color: 'green'
    })
  }, [defaultValues, variants.length, t])

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()

    // Clear previous errors
    setErrors({})

    // Validate required fields
    const newErrors: Record<string, string> = {}

    if (!productName) {
      newErrors.productName = t('catalog.productsEdit.validation.productNameRequired') || 'Product name is required'
    }

    if (!category) {
      newErrors.category = t('catalog.productsEdit.validation.categoryRequired') || 'Please select a category'
    }

    if (!brand) {
      newErrors.brand = t('catalog.productsEdit.validation.brandRequired') || 'Please select a brand'
    }

    if (!description || description.trim().length < 10) {
      newErrors.description = t('catalog.productsEdit.validation.descriptionTooShort') || 'Description must be at least 10 characters'
    }

    if (variants.length === 0) {
      newErrors.variants = t('catalog.productsEdit.validation.atLeastOneVariant') || 'At least one variant is required'
    }

    // Validate variants
    variants.forEach((variant, index) => {
      if (!variant.name || variant.name.trim() === '') {
        newErrors[`variant.${index}.name`] = t('catalog.productsEdit.validation.variantNameRequired', { index: index + 1 }) || `Variant ${index + 1} name is required`
      }
    })

    // Check for duplicate variant names
    const variantNames = variants.map(v => v.name.trim()).filter(name => name.length > 0)
    const duplicateNames = variantNames.filter((name, index) => variantNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateNames)]
      newErrors.variants = t('catalog.productsEdit.validation.duplicateVariantNames', { names: uniqueDuplicates.join(', ') }) ||
        `Variant names must be unique. Duplicate(s): ${uniqueDuplicates.join(', ')}`
    }

    // If there are errors, set them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstField = Object.keys(newErrors)[0]
      const element = document.getElementById(firstField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare data for API
      const payload = {
        productName,
        retailName: productName,
        wholesaleName,
        category: parseInt(category!),
        brand: parseInt(brand!),
        status,
        videoUrl,
        enableWarranty,
        warrantyDetails,
        enablePreorder,
        expectedDeliveryDate,
        description,
        highlights: highlightsList.filter(h => h.trim()).length > 0 ? highlightsList : null,
        includesInTheBox: includesInTheBox.filter(h => h.trim()).length > 0 ? includesInTheBox : null,
        seoTitle,
        seoDescription,
        seoTags,
        featuredImage: featuredImage?.mediaId ?? null,
        galleryImages: galleryImages.map(img => img.mediaId),
        variants: variants.map(v => ({
          retail_id: v.retail_id,
          wholesale_id: v.wholesale_id,
          name: v.name,
          sellerSku: v.sellerSku || null,
          purchaseCost: parseFloat(v.purchaseCost.toString()),
          retailPrice: parseFloat(v.price.toString()),
          wholesalePrice: parseFloat(v.wholesalePrice.toString()),
          retailOfferPrice: v.specialPrice ? parseFloat(v.specialPrice.toString()) : null,
          wholesaleOfferPrice: v.wholesaleOfferPrice ? parseFloat(v.wholesaleOfferPrice.toString()) : null,
          wholesaleMoq: parseInt(v.wholesaleMoq.toString()),
          weight: parseFloat(v.weight.toString()),
          stock: parseInt(v.stock.toString())
        }))
      }

      // DEBUG: Log payload before sending
      console.log('📤 Sending to API:', { productName, wholesaleName })
      console.log('📦 Full payload:', payload)

      // Call API - PUT for update
      const response = await apiMethods.put(`/catalog/products/${id}`, payload)

      // Success
      notifications.show({
        title: t('common.success') || 'Success',
        message: response.message || t('catalog.productsEdit.notification.productUpdated') || 'Product updated successfully',
        color: 'green'
      })

      // Navigate to product detail page
      setTimeout(() => {
        navigate(`/catalog/products/${id}`)
      }, 1500)

    } catch (error: any) {
      console.error('API Error:', error)

      // Handle validation errors from server
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const serverErrors = error.response.data.errors
        const formattedErrors: Record<string, string> = {}

        Object.keys(serverErrors).forEach(field => {
          // Transform backend error keys to match frontend format
          // Backend sends: variants.0.field (plural)
          // Frontend expects: variant.0.field (singular)
          const transformedField = field.replace(/^variants\./, 'variant.')

          // Clean up error message - remove field path prefix like "variants.0."
          let errorMessage = serverErrors[field]?.[0] || 'Validation error'
          errorMessage = errorMessage.replace(/^variants\.\d+\./, '').replace(/^variant\.\d+\./, '')

          formattedErrors[transformedField] = errorMessage
        })

        setErrors(formattedErrors)

        const firstField = Object.keys(formattedErrors)[0]
        const element = document.getElementById(firstField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        notifications.show({
          title: t('common.error') || 'Error',
          message: error.response?.data?.message || error.message || 'Failed to update product',
          color: 'red'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    productName,
    wholesaleName,
    category,
    brand,
    status,
    videoUrl,
    enableWarranty,
    warrantyDetails,
    enablePreorder,
    expectedDeliveryDate,
    description,
    highlightsList,
    includesInTheBox,
    seoTitle,
    seoDescription,
    seoTags,
    featuredImage,
    galleryImages,
    variants,
    id,
    t,
    navigate
  ])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

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

  // DEBUG: Log the dropdown options
  console.log('🔽 Category Options:', categoryOptions)
  console.log('🔽 Brand Options:', brandOptions)
  console.log('🔽 Selected Category:', category)
  console.log('🔽 Selected Brand:', brand)

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isLoading) {
    return (
      <Box p="md">
        <Stack gap="md">
          <Skeleton height={40} width="30%" />
          <Skeleton height={200} radius="md" />
          <Skeleton height={300} radius="md" />
          <Skeleton height={400} radius="md" />
        </Stack>
      </Box>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <Box p="md">
      <Stack gap="md">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor href="/catalog/products">{t('catalog.products') || 'Products'}</Anchor>
          <Anchor href={`/catalog/products/${id}`}>{t('catalog.productsEdit.viewProduct') || 'View Product'}</Anchor>
          <Text>{t('catalog.productsEdit.title') || 'Edit Product'}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <Group>
            <IconPackages size={32} className="text-blue-600" />
            <Title order={1}>{t('catalog.productsEdit.title') || 'Edit Product'}</Title>
          </Group>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/catalog/products/${id}`)}
          >
            {t('catalog.productsEdit.back') || 'Back to Product'}
          </Button>
        </Group>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Grid>
            <Grid.Col span={12}>
              <Stack gap="md">
                {/* Basic Information Card */}
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
                      id="productName"
                      label={t('catalog.productsCreate.retailName') || 'Retail Name'}
                      placeholder={t('catalog.productsCreate.retailNamePlaceholder') || 'Enter retail name'}
                      value={productName}
                      onChange={(value) => {
                        clearError('productName')
                        setProductName(typeof value === 'string' ? value : value?.currentTarget?.value || '')
                      }}
                      onFocus={collapseSidebarIfNeeded}
                      required
                      error={errors.productName}
                    />

                    <TextInput
                      label={t('catalog.productsCreate.wholesaleName') || 'Wholesale Name'}
                      placeholder={t('catalog.productsCreate.wholesaleNamePlaceholder') || 'Enter wholesale name'}
                      value={wholesaleName}
                      onChange={(value) => setWholesaleName(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                      onFocus={collapseSidebarIfNeeded}
                      maxLength={255}
                      required
                      error={errors.wholesaleName}
                    />

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <Select
                        id="category"
                        label={t('catalog.productsCreate.category') || 'Category'}
                        placeholder={t('catalog.productsCreate.selectCategory') || 'Select category'}
                        data={categoryOptions}
                        value={category}
                        onChange={(value) => {
                          clearError('category')
                          setCategory(value)
                        }}
                        onFocus={collapseSidebarIfNeeded}
                        required
                        searchable
                        disabled={categoriesLoading}
                        nothingFoundMessage="No categories found"
                        clearable
                        error={errors.category}
                      />
                      <Select
                        id="brand"
                        label={t('catalog.productsCreate.brand') || 'Brand'}
                        placeholder={t('catalog.productsCreate.selectBrand') || 'Select brand'}
                        data={brandOptions}
                        value={brand}
                        onChange={(value) => {
                          clearError('brand')
                          setBrand(value)
                        }}
                        onFocus={collapseSidebarIfNeeded}
                        required
                        searchable
                        disabled={brandsLoading}
                        nothingFoundMessage="No brands found"
                        clearable
                        error={errors.brand}
                      />
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
                        className="border-dashed items-center justify-center"
                        h={200}
                        display="flex"
                      >
                        <Stack align="center" gap="sm">
                          <IconPhoto size={48} className="text-gray-400" />
                          <Text c="dimmed">{t('catalog.productsCreate.noFeaturedImageSelected') || 'No featured image selected'}</Text>
                          <Text size="xs" c="dimmed">{t('catalog.productsCreate.featuredImageDescription') || 'Select from media library'}</Text>
                        </Stack>
                      </Paper>
                    ) : (
                      <Box pos="relative" maw={120}>
                        <Paper shadow="sm" p="xs">
                          <Image
                            src={featuredImage.url}
                            alt={t('catalog.productsCreate.featured') || 'Featured'}
                            height={120}
                            width={120}
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
                        className="border-dashed items-center justify-center"
                        h={50}
                        display="flex"
                      >
                        <Stack align="center" gap="sm">
                          <IconPhoto size={32} className="text-gray-400" />
                          <Text c="dimmed" size="sm">{t('catalog.productsCreate.noGalleryImages') || 'No gallery images'}</Text>
                          <Text size="xs" c="dimmed">{t('catalog.productsCreate.addUpTo6Images') || 'Add up to 6 images'}</Text>
                        </Stack>
                      </Paper>
                    ) : (
                      <Box
                        style={{
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start'
                        }}
                      >
                        {galleryImages.map((image, index) => (
                          <Box
                            key={image.id}
                            pos="relative"
                            style={{
                              flex: '0 0 calc(16.666% - 10px)',
                              minWidth: '100px',
                              maxWidth: '180px'
                            }}
                          >
                            <Paper shadow="sm" p="xs" style={{ height: '100%' }}>
                              <Image
                                src={image.url}
                                alt={`Gallery ${index + 1}`}
                                height={120}
                                width="100%"
                                fit="cover"
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
                              onClick={() => handleRemoveGalleryImage(image.id)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                            
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Group>
                      <TextInput
                        label={t('catalog.productsCreate.videoUrl') || 'YouTube URL'}
                        placeholder={t('catalog.productsCreate.videoUrlPlaceholder') || 'https://youtube.com/watch?v=...'}
                        value={videoUrl}
                        onChange={(value) => setVideoUrl(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                        onFocus={collapseSidebarIfNeeded}
                        className="flex-1"
                        leftSection={<IconVideo size={16} />}
                        error={errors.videoUrl}
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
                        error={errors.status}
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

                    {/* Default Values Form */}
                    <Stack gap="xs">
                      <Group align="center" px="sm">
                        <Text size="xs" fw={600}>{t('catalog.productsCreate.defaultValues') || 'Default Values for New Variants'}</Text>
                      </Group>

                      <Text size="xs" c="blue" px="sm">
                        {t('catalog.productsCreate.autoCalculationTip') || 'Enter Purchase Cost to auto-calculate Retail Price (+50%) and Wholesale Price (+20%)'}
                      </Text>

                      <Paper
                        withBorder
                        p="xs"
                        bg={colorScheme === 'dark' ? 'dark.7' : 'blue.0'}
                      >
                        <SimpleGrid cols={10} spacing="md">
                          {/* Variant Name */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.variantName') || 'VARIANT NAME'}</Text>
                            <TextInput
                              placeholder={t('catalog.productsCreate.variantNamePlaceholder') || 'Size, Color...'}
                              value={defaultValues.name}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, name: typeof value === 'string' ? value : value?.currentTarget?.value || '' }))}
                              onFocus={collapseSidebarIfNeeded}
                              size="xs"
                            />
                          </Stack>

                          {/* Seller SKU */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.sellerSku') || 'SELLER SKU'}</Text>
                            <TextInput
                              placeholder={t('catalog.productsCreate.sellerSkuPlaceholder') || 'SKU'}
                              value={defaultValues.sellerSku}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, sellerSku: typeof value === 'string' ? value : value?.currentTarget?.value || '' }))}
                              onFocus={collapseSidebarIfNeeded}
                              size="xs"
                            />
                          </Stack>

                          {/* Purchase Cost */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.purchaseCost') || 'PURCHASE COST'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.purchaseCost}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, purchaseCost: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                          </Stack>

                          {/* Retail Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.retailPrice') || 'RETAIL PRICE'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.price}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, price: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                            <Text size="xs" c={defaultValues.price - defaultValues.purchaseCost < 0 ? 'red' : 'green'}>
                              {defaultValues.price - defaultValues.purchaseCost > 0 ? '+' : ''}{(defaultValues.price - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.price - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                            </Text>
                          </Stack>

                          {/* Wholesale Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesalePrice') || 'WHOLESALE PRICE'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.wholesalePrice}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesalePrice: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                            <Text size="xs" c={defaultValues.wholesalePrice - defaultValues.purchaseCost < 0 ? 'red' : 'green'}>
                              {defaultValues.wholesalePrice - defaultValues.purchaseCost > 0 ? '+' : ''}{(defaultValues.wholesalePrice - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.wholesalePrice - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                            </Text>
                          </Stack>

                          {/* Retail Offer Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'RETAIL OFFER'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.specialPrice}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, specialPrice: typeof value === 'number' ? value : undefined }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                            {defaultValues.specialPrice !== undefined && defaultValues.specialPrice > 0 && (
                              <Text size="xs" c={(defaultValues.specialPrice - defaultValues.purchaseCost) < 0 ? 'red' : 'green'}>
                                {(defaultValues.specialPrice - defaultValues.purchaseCost) > 0 ? '+' : ''}{(defaultValues.specialPrice - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.specialPrice - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                              </Text>
                            )}
                          </Stack>

                          {/* Wholesale Offer Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesaleOfferPrice') || 'WS OFFER'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.wholesaleOfferPrice}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesaleOfferPrice: typeof value === 'number' ? value : undefined }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                            {defaultValues.wholesaleOfferPrice !== undefined && defaultValues.wholesaleOfferPrice > 0 && (
                              <Text size="xs" c={(defaultValues.wholesaleOfferPrice - defaultValues.purchaseCost) < 0 ? 'red' : 'green'}>
                                {(defaultValues.wholesaleOfferPrice - defaultValues.purchaseCost) > 0 ? '+' : ''}{(defaultValues.wholesaleOfferPrice - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.wholesaleOfferPrice - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                              </Text>
                            )}
                          </Stack>

                          {/* Wholesale MOQ */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesaleMoq') || 'MOQ'}</Text>
                            <NumberInput
                              placeholder="6"
                              value={defaultValues.wholesaleMoq}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesaleMoq: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                          </Stack>

                          {/* Weight */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.weight') || 'WT(g)'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.weight}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, weight: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                              rightSection={<Text size="xs">g</Text>}
                            />
                          </Stack>

                          {/* Stock + Apply */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.stock') || 'STOCK'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.stock}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, stock: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                            <Button
                              size="xs"
                              variant="light"
                              onClick={handleApplyDefaultsToAll}
                              w="100%"
                            >
                              {t('catalog.productsCreate.applyToAll') || 'Apply'}
                            </Button>
                          </Stack>
                        </SimpleGrid>
                      </Paper>
                    </Stack>


                    {/* Table Header */}
                    <Box className="overflow-x-auto">
                      <Box style={{ minWidth: '900px' }}>
                        {/* Header Row */}
                        <SimpleGrid cols={10} spacing="md" mb="xs" px="sm">
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.variantName') || 'VARIANT NAME'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.sellerSku') || 'SKU'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.purchaseCost') || 'PURCHASE COST'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.retailPrice') || 'RETAIL PRICE'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesalePrice') || 'WHOLESALE PRICE'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'RETAIL OFFER'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleOfferPrice') || 'WS OFFER'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleMoq') || 'MOQ'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.weight') || 'WT(g)'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.stock') || 'STOCK'}</Text>
                        </SimpleGrid>

                        {/* Variant Rows */}
                        <Stack gap="xs">
                          {variants.map((variant, index) => (
                            <Paper key={variant.id} withBorder p="xs">
                              <SimpleGrid cols={10} spacing="md">
                                {/* Variant Name */}
                                <Group gap="xs" style={{ minWidth: 0 }}>
                                  {variants.length > 1 && (
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      size="sm"
                                      onClick={() => handleRemoveVariant(variant.id)}
                                    >
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  )}
                                  <TextInput
                                    placeholder={t('catalog.productsCreate.variantNamePlaceholder') || 'Size, Color...'}
                                    value={variant.name}
                                    onChange={(value) => handleUpdateVariant(variant.id, 'name', typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                                    onFocus={collapseSidebarIfNeeded}
                                    size="sm"
                                    style={{ flex: 1 }}
                                    error={errors[`variant.${index}.name`]}
                                  />
                                </Group>

                                {/* Seller SKU */}
                                <TextInput
                                  placeholder={t('catalog.productsCreate.sellerSkuPlaceholder') || 'SKU'}
                                  value={variant.sellerSku}
                                  onChange={(value) => handleUpdateVariant(variant.id, 'sellerSku', typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                                  onFocus={collapseSidebarIfNeeded}
                                  size="sm"
                                  styles={{ input: { minWidth: 100 } }}
                                  error={errors[`variant.${index}.sellerSku`]}
                                />

                                {/* Purchase Cost */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.purchaseCost}
                                  onChange={(value) => handleUpdateVariant(variant.id, 'purchaseCost', value || 0)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  size="sm"
                                  styles={{ input: { minWidth: 80 } }}
                                  error={errors[`variant.${index}.purchaseCost`]}
                                />

                                {/* Retail Price */}
                                <Stack gap={0}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.price}
                                    onChange={(value) => handleUpdateVariant(variant.id, 'price', value || 0)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    size="sm"
                                    styles={{ input: { minWidth: 80 } }}
                                    error={errors[`variant.${index}.price`]}
                                  />
                                  <Text size="xs" c={variant.price - variant.purchaseCost < 0 ? 'red' : 'green'}>
                                    {variant.price - variant.purchaseCost > 0 ? '+' : ''}{(variant.price - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.price - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                  </Text>
                                </Stack>

                                {/* Wholesale Price */}
                                <Stack gap={0}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.wholesalePrice}
                                    onChange={(value) => handleUpdateVariant(variant.id, 'wholesalePrice', value || 0)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    size="sm"
                                    styles={{ input: { minWidth: 80 } }}
                                    error={errors[`variant.${index}.wholesalePrice`]}
                                  />
                                  <Text size="xs" c={variant.wholesalePrice - variant.purchaseCost < 0 ? 'red' : 'green'}>
                                    {variant.wholesalePrice - variant.purchaseCost > 0 ? '+' : ''}{(variant.wholesalePrice - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.wholesalePrice - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                  </Text>
                                </Stack>

                                {/* Retail Offer Price */}
                                <Stack gap={0}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.specialPrice}
                                    onChange={(value) => handleUpdateVariant(variant.id, 'specialPrice', value || undefined)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    size="sm"
                                    styles={{ input: { minWidth: 80 } }}
                                    error={errors[`variant.${index}.specialPrice`]}
                                  />
                                  {variant.specialPrice !== undefined && variant.specialPrice > 0 && (
                                    <Text size="xs" c={(variant.specialPrice - variant.purchaseCost) < 0 ? 'red' : 'green'}>
                                      {(variant.specialPrice - variant.purchaseCost) > 0 ? '+' : ''}{(variant.specialPrice - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.specialPrice - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                    </Text>
                                  )}
                                </Stack>

                                {/* Wholesale Offer Price */}
                                <Stack gap={0}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.wholesaleOfferPrice}
                                    onChange={(value) => handleUpdateVariant(variant.id, 'wholesaleOfferPrice', value || undefined)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    size="sm"
                                    styles={{ input: { minWidth: 80 } }}
                                    error={errors[`variant.${index}.wholesaleOfferPrice`]}
                                  />
                                  {variant.wholesaleOfferPrice !== undefined && variant.wholesaleOfferPrice > 0 && (
                                    <Text size="xs" c={(variant.wholesaleOfferPrice - variant.purchaseCost) < 0 ? 'red' : 'green'}>
                                      {(variant.wholesaleOfferPrice - variant.purchaseCost) > 0 ? '+' : ''}{(variant.wholesaleOfferPrice - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.wholesaleOfferPrice - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                    </Text>
                                  )}
                                </Stack>

                                {/* Wholesale MOQ */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.wholesaleMoq}
                                  onChange={(value) => handleUpdateVariant(variant.id, 'wholesaleMoq', value || 0)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  size="sm"
                                  styles={{ input: { minWidth: 80 } }}
                                  error={errors[`variant.${index}.wholesaleMoq`]}
                                />

                                {/* Weight */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.weight}
                                  onChange={(value) => handleUpdateVariant(variant.id, 'weight', value || 0)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  size="sm"
                                  styles={{ input: { minWidth: 80 } }}
                                  rightSection={<Text size="xs">g</Text>}
                                  error={errors[`variant.${index}.weight`]}
                                />

                                {/* Stock */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.stock}
                                  onChange={(value) => handleUpdateVariant(variant.id, 'stock', value || 0)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  size="sm"
                                  styles={{ input: { minWidth: 80 } }}
                                  error={errors[`variant.${index}.stock`]}
                                />
                              </SimpleGrid>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>
                </Card>

                {/* Product Description & Highlights Section */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="xl">
                    <Group>
                      <IconCoin size={20} className="text-blue-600" />
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
                        id="description-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />
                      {errors.description && (
                        <Text size="xs" c="red">{errors.description}</Text>
                      )}
                    </Stack>

                    {/* Highlights */}
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={500}>
                          {t('catalog.productsCreate.productHighlights') || 'Product Highlights'} <Text span c="red">*</Text>
                        </Text>
                        <Text size="xs" c="dimmed">
                          {highlightsList.filter(h => h.trim()).length}/10
                        </Text>
                      </Group>

                      <Box
                        id="highlights-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />

                      <Text size="xs" c="dimmed">
                        {t('catalog.productsCreate.highlightsTip') || 'Add key product highlights, features, or benefits as bullet points. Maximum 10 items.'}
                      </Text>
                    </Stack>
                  </Stack>
                </Card>

                {/* Product Settings Section */}
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="md">
                    <Group>
                      <IconTag size={20} className="text-orange-600" />
                      <Text className="text-base md:text-lg" fw={600}>
                        {t('catalog.productsCreate.productSettings') || 'Product Settings'}
                      </Text>
                    </Group>
                    <Divider />

                    {/* Warranty Settings */}
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 3.6 }}>
                        <Switch
                          label="Enable Warranty"
                          description="Offer warranty for this product"
                          checked={enableWarranty}
                          onChange={(e) => setEnableWarranty(e.currentTarget.checked)}
                          size="md"
                        />
                      </Grid.Col>

                      {enableWarranty && (
                        <Grid.Col span={{ base: 12, md: 8.4 }}>
                          <TextInput
                            label="Warranty Details"
                            placeholder="Enter warranty details"
                            value={warrantyDetails}
                            onChange={(value) => setWarrantyDetails(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                            onFocus={collapseSidebarIfNeeded}
                            size="md"
                          />
                        </Grid.Col>
                      )}
                    </Grid>

                    <Divider />

                    {/* What's Included in the Box */}
                    <Stack gap="sm">
                      <Text size="sm" fw={500}>
                        {t('catalog.productsCreate.includesInTheBox') || 'What\'s Included in the Box'}
                      </Text>

                      <Box
                        id="includes-in-the-box-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />

                      <Text size="xs" c="dimmed">
                        {t('catalog.productsCreate.includesInTheBoxTip') || 'List all items included in the product package as bullet points.'}
                      </Text>
                    </Stack>

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
                          onChange={(value) => setExpectedDeliveryDate(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
                          onFocus={collapseSidebarIfNeeded}
                          size="md"
                          error={errors.expectedDeliveryDate}
                        />
                      )}
                    </SimpleGrid>
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
                              onChange={(value) => setSeoTitle(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
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
                              onChange={(value) => setSeoDescription(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
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
                              onChange={(value) => setSeoTags(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
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

                                <Text size="xs" c="#202124">
                                  hooknhunt.com
                                </Text>

                                <Text size="xs" c="#5f6368">›</Text>

                                <Text size="xs" c="#202124" truncate>
                                  Products › {(seoTitle || 'Product Name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}
                                </Text>
                              </Group>

                              {/* Title */}
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

                              {/* Description */}
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

                {/* Submit Actions */}
                <Card withBorder p="md" shadow="sm">
                  <Group justify="flex-end" gap="sm">
                    <Button
                      variant="light"
                      onClick={() => navigate(`/catalog/products/${id}`)}
                      disabled={isSubmitting}
                    >
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      leftSection={isSubmitting ? <IconLoader size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />}
                      loading={isSubmitting}
                    >
                      {isSubmitting
                        ? (t('common.saving') || 'Saving...')
                        : (t('catalog.productsCreate.saveProduct') || 'Save Changes')
                      }
                    </Button>
                  </Group>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </form>
      </Stack>
    </Box>
  )
}
