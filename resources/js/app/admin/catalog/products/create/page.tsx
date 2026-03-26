'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  useMantineColorScheme
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
  IconCoin,
  IconShoppingBag,
  IconLoader
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getSuppliers, getCategories, getBrands, getAttributes, type Supplier, type Category, type Brand, type Attribute } from '@/utils/api'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { useUIStore } from '@/stores/uiStore'
import { apiMethods } from '@/lib/api'
import type { MediaFile } from '@/utils/api'

interface GalleryImage {
  id: string
  mediaId: number
  url: string
  order: number
}

interface ProductVariant {
  id: string
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

export default function CreateProductPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { openSingleSelect, openMultipleSelect } = useMediaSelector()
  const { colorScheme } = useMantineColorScheme()

  // Loading state
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
  const [retailName, setRetailName] = useState('')
  const [wholesaleName, setWholesaleName] = useState('')
  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('draft')
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

  // Track which fields have been manually edited by the user
  const [manuallyEdited, setManuallyEdited] = useState({
    retailName: false,
    wholesaleName: false,
    customName: false,
    seoTitle: false
  })

  // Auto-fill retail name, wholesale name, custom name, and SEO title from product name
  // Only updates fields that haven't been manually edited by the user
  useEffect(() => {
    if (productName) {
      if (!manuallyEdited.retailName) {
        setRetailName(productName)
      }
      if (!manuallyEdited.wholesaleName) {
        setWholesaleName(productName)
      }
      if (!manuallyEdited.customName) {
        setCustomName(productName)
      }
      if (!manuallyEdited.seoTitle) {
        setSeoTitle(productName)
      }
    }
  }, [productName])

  // Quill editor refs
  const descriptionQuillRef = useRef<any>(null)
  const highlightsQuillRef = useRef<any>(null)
  const includesInTheBoxQuillRef = useRef<any>(null)

  // Media state
  const [featuredImage, setFeaturedImage] = useState<{ mediaId: number; url: string } | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      id: '1',
      retail_id: null,
      wholesale_id: null,
      name: '',
      price: 0,
      wholesalePrice: 0,
      purchaseCost: 0,
      specialPrice: undefined,
      wholesaleOfferPrice: undefined,
      wholesaleMoq: 0,
      weight: 0,
      stock: 0,
      sellerSku: ''
    }
  ])

  // Default values for new variants
  const [defaultValues, setDefaultValues] = useState({
    price: 0,
    wholesalePrice: 0,
    purchaseCost: 0,
    specialPrice: undefined as number | undefined,
    wholesaleOfferPrice: undefined as number | undefined,
    wholesaleMoq: 0,
    weight: 0,
    stock: 0,
    sellerSku: ''
  })

  // Auto-calculate retail and wholesale prices when purchase cost changes
  useEffect(() => {
    if (defaultValues.purchaseCost > 0) {
      const retailPrice = defaultValues.purchaseCost * 1.5 // 50% more
      const wholesalePrice = defaultValues.purchaseCost * 1.2 // 20% more

      setDefaultValues(prev => ({
        ...prev,
        price: retailPrice,
        wholesalePrice: wholesalePrice
      }))
    }
  }, [defaultValues.purchaseCost])

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

          #highlights-editor .ql-editor,
          #includes-in-the-box-editor .ql-editor {
            min-height: 150px;
            max-height: 300px;
            overflow-y: auto;
          }

          /* Hide numbered list button from highlights editor and includes editor */
          #highlights-editor .ql-list[value="ordered"],
          #includes-in-the-box-editor .ql-list[value="ordered"] {
            display: none !important;
          }

          /* Hide indent/outdent buttons to prevent nested lists */
          #highlights-editor .ql-indent,
          #includes-in-the-box-editor .ql-indent {
            display: none !important;
          }

          #highlights-editor .ql-outdent,
          #includes-in-the-box-editor .ql-outdent {
            display: none !important;
          }

          /* Dark mode support */
          [data-mantine-color-scheme="dark"] #description-editor .ql-toolbar,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-toolbar,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-toolbar {
            background-color: #2C2E33;
            border-color: #45474E;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-container,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-container,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-container {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-editor.ql-blank::before,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-editor.ql-blank::before,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-editor.ql-blank::before {
            color: #6c6c6c;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-stroke,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-stroke,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-stroke {
            stroke: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-fill,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-fill,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-fill {
            fill: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-picker {
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-options,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-options,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-picker-options {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item:hover,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-item:hover,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-picker-item:hover {
            background-color: #373A40;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item.ql-selected,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-item.ql-selected,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor .ql-picker-item.ql-selected {
            background-color: #228BE6;
            color: white;
          }

          [data-mantine-color-scheme="dark"] #description-editor a,
          [data-mantine-color-scheme="dark"] #highlights-editor a,
          [data-mantine-color-scheme="dark"] #includes-in-the-box-editor a {
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
          formats: [
            'bold', 'italic', 'underline',
            'header',
            'list', 'bullet',
            'align',
            'link', 'image'
          ],
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline'],
              [{ 'header': [2, 3, 4, 5, 6, false] }],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'align': [] }, { 'align': 'center' }],
              ['link', 'image'],
              ['clean']
            ]
          }
        })

        // Handle image insertion via toolbar button
        const toolbar = quill1.getModule('toolbar')
        if (toolbar) {
          toolbar.addHandler('image', () => {
            openSingleSelect((mediaFile: MediaFile) => {
              const range = quill1.getSelection(true)
              quill1.insertEmbed(range.index, 'image', mediaFile.url)
            })
          })
        }

        // Handle drag-and-drop images
        quill1.root.addEventListener('drop', (e: any) => {
          e.preventDefault()
          const files = e.dataTransfer?.files
          if (files && files.length > 0) {
            const file = files[0]
            if (file.type.startsWith('image/')) {
              // For now, create a local URL
              // TODO: Upload to server and get media library URL
              const reader = new FileReader()
              reader.onload = (event: any) => {
                const range = quill1.getSelection(true)
                quill1.insertEmbed(range.index, 'image', event.target.result)
              }
              reader.readAsDataURL(file)
            }
          }
        })

        // Handle paste events (for images from clipboard)
        quill1.root.addEventListener('paste', (e: any) => {
          const items = e.clipboardData?.items
          if (items) {
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault()
                const file = items[i].getAsFile()
                if (file) {
                  const reader = new FileReader()
                  reader.onload = (event: any) => {
                    const range = quill1.getSelection(true)
                    quill1.insertEmbed(range.index, 'image', event.target.result)
                  }
                  reader.readAsDataURL(file)
                }
                break
              }
            }
          }
        })

        quill1.on('text-change', () => {
          clearError('description')
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

      // Initialize Highlights Editor (bullet list only, max 10 items)
      const highlightsContainer = document.getElementById('highlights-editor-container')
      if (highlightsContainer && !highlightsQuillRef.current) {
        highlightsContainer.innerHTML = '<div id="highlights-editor"></div>'

        // Flag to prevent recursive updates
        let isProgrammaticUpdate = false

        // Create a custom toolbar with only bullet list
        const quill2 = new Quill('#highlights-editor', {
          theme: 'snow',
          placeholder: t('catalog.productsCreate.highlightsPlaceholder') || '• Enter product highlights as bullet points...',
          modules: {
            toolbar: [
              [{ 'list': 'bullet' }],  // Only bullet list
              ['clean']                  // Clear formatting
            ]
          }
        })

        // Auto-enable bullet list format when user starts typing
        const ensureBulletList = () => {
          const format = quill2.getFormat()
          if (!format.list) {
            quill2.format('list', 'bullet')
          }
        }

        // Enable bullet list on editor focus and collapse sidebar
        quill2.on('selection-change', (range: any) => {
          if (range && range.length === 0) {
            // Cursor is positioned (not selecting text)
            ensureBulletList()
            // Collapse sidebar if needed
            if (collapseSidebarIfNeeded) {
              collapseSidebarIfNeeded()
            }
          }
        })

        // Also enable when user starts typing
        quill2.root.addEventListener('keydown', (e) => {
          const format = quill2.getFormat()
          if (!format.list && e.key.length === 1) {
            // User is typing a character (not a special key)
            quill2.format('list', 'bullet', Quill.sources.USER)
          }
        })

        // Parse list items from HTML and update state
        const parseListItems = (html: string): string[] => {
          const temp = document.createElement('div')
          temp.innerHTML = html

          // Get all list items
          const liElements = temp.querySelectorAll('li')
          const items: string[] = []

          liElements.forEach((li) => {
            const text = li.textContent?.trim() || ''
            if (text) {
              items.push(text)
            }
          })

          return items
        }

        // Convert array to HTML list
        const arrayToListHtml = (items: string[]): string => {
          if (items.length === 0 || (items.length === 1 && items[0] === '')) {
            return ''
          }

          const nonEmptyItems = items.filter(item => item.trim() !== '')

          if (nonEmptyItems.length === 0) {
            return ''
          }

          const listItems = nonEmptyItems.map(item => `<li>${item}</li>`).join('')
          return `<ul>${listItems}</ul>`
        }

        // Update highlights state from editor content
        const updateHighlightsState = () => {
          if (isProgrammaticUpdate) return

          const html = quill2.root.innerHTML
          const items = parseListItems(html)

          // Validate max 10 items
          if (items.length > 10) {
            // Show warning and truncate
            notifications.show({
              title: t('catalog.productsCreate.maxHighlightsReached') || 'Maximum Limit Reached',
              message: t('catalog.productsCreate.maxHighlightsMessage') || 'You can only add up to 10 highlights. Extra items have been removed.',
              color: 'yellow'
            })

            // Keep only first 10 items
            const truncatedItems = items.slice(0, 10)
            setHighlightsList(truncatedItems)

            // Update editor to show only 10 items (prevent recursive event)
            isProgrammaticUpdate = true
            const truncatedHtml = arrayToListHtml(truncatedItems)
            quill2.root.innerHTML = truncatedHtml
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          } else {
            setHighlightsList(items)
          }
        }

        // Initialize with existing highlights (if any)
        if (highlightsList.length > 0) {
          const initialHtml = arrayToListHtml(highlightsList)
          if (initialHtml) {
            isProgrammaticUpdate = true
            quill2.root.innerHTML = initialHtml
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          }
        } else {
          // Enable bullet list by default for empty editor
          setTimeout(() => {
            isProgrammaticUpdate = true
            quill2.format('list', 'bullet')
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          }, 100)
        }

        // Listen to text changes
        quill2.on('text-change', (delta: any, _oldContents: any, source: any) => {
          // Only update if the change came from user input
          if (source === 'user') {
            updateHighlightsState()
          }
        })

        // Add input listener as fallback to capture all changes
        quill2.root.addEventListener('input', () => {
          updateHighlightsState()
        })

        // Also listen to editor changes for toolbar clicks
        quill2.on('editor-change', (eventName: string) => {
          if (eventName === 'text-change') {
            updateHighlightsState()
          }
        })

        highlightsQuillRef.current = quill2
      }

      // Initialize "What's Included in the Box" Editor (bullet list only)
      const includesInTheBoxContainer = document.getElementById('includes-in-the-box-editor-container')
      if (includesInTheBoxContainer && !includesInTheBoxQuillRef.current) {
        includesInTheBoxContainer.innerHTML = '<div id="includes-in-the-box-editor"></div>'

        let isProgrammaticUpdate = false

        const quill3 = new Quill('#includes-in-the-box-editor', {
          theme: 'snow',
          placeholder: t('catalog.productsCreate.includesInTheBoxPlaceholder') || '• List items included in the package...',
          modules: {
            toolbar: [
              [{ 'list': 'bullet' }],
              ['clean']
            ]
          }
        })

        const parseListItems = (html: string): string[] => {
          const temp = document.createElement('div')
          temp.innerHTML = html
          const liElements = temp.querySelectorAll('li')
          const items: string[] = []

          liElements.forEach((li) => {
            const text = li.textContent?.trim() || ''
            if (text) {
              items.push(text)
            }
          })

          return items
        }

        const arrayToListHtml = (items: string[]): string => {
          if (items.length === 0 || (items.length === 1 && items[0] === '')) {
            return ''
          }

          const nonEmptyItems = items.filter(item => item.trim() !== '')

          if (nonEmptyItems.length === 0) {
            return ''
          }

          const listItems = nonEmptyItems.map(item => `<li>${item}</li>`).join('')
          return `<ul>${listItems}</ul>`
        }

        const updateIncludesInTheBoxState = () => {
          if (isProgrammaticUpdate) return

          const html = quill3.root.innerHTML
          const items = parseListItems(html)
          setIncludesInTheBox(items)
        }

        if (includesInTheBox.length > 0) {
          const initialHtml = arrayToListHtml(includesInTheBox)
          if (initialHtml) {
            isProgrammaticUpdate = true
            quill3.root.innerHTML = initialHtml
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          }
        } else {
          setTimeout(() => {
            isProgrammaticUpdate = true
            quill3.format('list', 'bullet')
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          }, 100)
        }

        const ensureBulletList = () => {
          const format = quill3.getFormat()
          if (!format.list) {
            quill3.format('list', 'bullet')
          }
        }

        quill3.on('selection-change', (range: any) => {
          if (range && range.length === 0) {
            ensureBulletList()
            if (collapseSidebarIfNeeded) {
              collapseSidebarIfNeeded()
            }
          }
        })

        quill3.root.addEventListener('keydown', (e: any) => {
          const format = quill3.getFormat()
          if (!format.list && e.key.length === 1) {
            quill3.format('list', 'bullet', Quill.sources.USER)
          }
        })

        quill3.on('text-change', (_delta: any, _oldContents: any, source: any) => {
          if (source === 'user') {
            updateIncludesInTheBoxState()
          }
        })

        quill3.root.addEventListener('input', () => {
          updateIncludesInTheBoxState()
        })

        quill3.on('editor-change', (eventName: string) => {
          if (eventName === 'text-change') {
            updateIncludesInTheBoxState()
          }
        })

        includesInTheBoxQuillRef.current = quill3
      }

    }

    loadQuill()

    // Cleanup
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
    const newId = Date.now().toString()
    setVariants([
      ...variants,
      {
        id: newId,
        retail_id: null,
        wholesale_id: null,
        name: '',
        price: 0,
        wholesalePrice: 0,
        purchaseCost: 0,
        specialPrice: undefined,
        wholesaleOfferPrice: undefined,
        wholesaleMoq: 0,
        weight: 0,
        stock: 0,
        sellerSku: ''
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

  const handleUpdateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setVariants(variants.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  // Apply default values to all variants
  const handleApplyDefaultsToAll = () => {
    setVariants(variants.map(v => ({
      ...v,
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
      title: t('catalog.productsCreate.notification.defaultValuesApplied'),
      message: t('catalog.productsCreate.notification.defaultValuesAppliedMessage', { count: variants.length }),
      color: 'green'
    })
  }

  // Highlights list handlers (now managed by Quill editor)
  // These functions are kept for potential future use or backwards compatibility

  const handleSubmit = async (event: React.FormEvent) => {
    try {
      event.preventDefault()

      console.log('📝 Form submit triggered')

    // Clear previous errors
    setErrors({})

    // Validate required fields
    const newErrors: Record<string, string> = {}

    console.log('🔍 Form values:', {
      productName,
      retailName,
      wholesaleName,
      customName,
      category,
      brand,
      status,
      description: description?.substring(0, 50) + '...',
      variantsCount: variants.length,
      firstVariant: variants[0]
    })

    if (!productName || productName.trim() === '') {
      newErrors.productName = t('catalog.productsCreate.validation.productNameRequired') || 'Product name is required'
      console.log('❌ Missing: productName')
    }

    if (!category) {
      newErrors.category = t('catalog.productsCreate.validation.categoryRequired') || 'Please select a category'
      console.log('❌ Missing: category')
    }

    if (!brand) {
      newErrors.brand = t('catalog.productsCreate.validation.brandRequired') || 'Please select a brand'
      console.log('❌ Missing: brand')
    }

    if (!description || description.trim().length < 10) {
      newErrors.description = t('catalog.productsCreate.validation.descriptionTooShort') || 'Description must be at least 10 characters'
      console.log('❌ Missing or too short: description')
    }

    if (variants.length === 0) {
      newErrors.variants = t('catalog.productsCreate.validation.atLeastOneVariant') || 'At least one variant is required'
      console.log('❌ Missing: variants')
    }

    // Validate variants
    variants.forEach((variant, index) => {
      if (!variant.name || variant.name.trim() === '') {
        newErrors[`variant.${index}.name`] = t('catalog.productsCreate.validation.variantNameRequired', { index: index + 1 }) || `Variant ${index + 1} name is required`
        console.log(`❌ Missing: variant.${index}.name`)
      }
    })

    // Check for duplicate variant names
    const variantNames = variants.map(v => v.name.trim()).filter(name => name.length > 0)
    const duplicateNames = variantNames.filter((name, index) => variantNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateNames)]
      newErrors.variants = t('catalog.productsCreate.validation.duplicateVariantNames', { names: uniqueDuplicates.join(', ') }) ||
        `Variant names must be unique. Duplicate(s): ${uniqueDuplicates.join(', ')}`
      console.log('❌ Duplicate variant names:', uniqueDuplicates)
    }

    // If there are errors, set them and stop
    if (Object.keys(newErrors).length > 0) {
      console.log('🚫 Validation errors:', newErrors)
      setErrors(newErrors)

      // Show notification with validation errors
      const errorMessages = Object.values(newErrors).join('\n')
      notifications.show({
        title: t('common.validationError') || 'Validation Error',
        message: errorMessages,
        color: 'red'
      })

      // Scroll to first error
      const firstField = Object.keys(newErrors)[0]
      const element = document.getElementById(firstField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    console.log('✅ Validation passed, submitting...')
    setIsSubmitting(true)

    try {
      // Prepare data for API
      const payload = {
        productName,
        retailName,
        wholesaleName,
        customName,
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
        featuredImage: featuredImage?.mediaId,
        galleryImages: galleryImages.map(img => img.mediaId),
        variants: variants.map(v => ({
          retail_id: v.retail_id || null,
          wholesale_id: v.wholesale_id || null,
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

      console.log('📦 Payload prepared:', payload)

      // Call API
      console.log('🌐 Calling API...')
      const response = await apiMethods.post('/catalog/products', payload)
      console.log('✅ API response:', response)

      // Success
      notifications.show({
        title: t('common.success') || 'Success',
        message: response.message || t('catalog.productsCreate.notification.productCreated') || 'Product created successfully',
        color: 'green'
      })

      // Navigate to products list
      setTimeout(() => {
        navigate('/catalog/products')
      }, 1500)

    } catch (error: any) {
      console.error('API Error:', error)

      // Handle validation errors from server
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const serverErrors = error.response.data.errors
        const formattedErrors: Record<string, string> = {}
        
        Object.keys(serverErrors).forEach(field => {
          formattedErrors[field] = serverErrors[field]?.[0] || 'Validation error'
        })
        
        setErrors(formattedErrors)

        // Scroll to first error
        const firstField = Object.keys(formattedErrors)[0]
        const element = document.getElementById(firstField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        // Handle other errors
        notifications.show({
          title: t('common.error') || 'Error',
          message: error.response?.data?.message || error.message || 'Failed to create product',
          color: 'red'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
    } catch (error: any) {
      console.error('❌ Unexpected error in handleSubmit:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'An unexpected error occurred',
        color: 'red'
      })
    }
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
                      id="productName"
                      label={t('catalog.productsCreate.productName') || 'Product Name'}
                      placeholder={t('catalog.productsCreate.productNamePlaceholder') || 'Enter product name'}
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
                      label={t('catalog.productsCreate.retailName') || 'Retail Name'}
                      placeholder={t('catalog.productsCreate.retailNamePlaceholder') || 'Enter retail name'}
                      value={retailName}
                      onChange={(value) => {
                        if (!manuallyEdited.retailName) {
                          setManuallyEdited(prev => ({ ...prev, retailName: true }))
                        }
                        setRetailName(typeof value === 'string' ? value : value?.currentTarget?.value || '')
                      }}
                      onFocus={collapseSidebarIfNeeded}
                      maxLength={255}
                      required
                    />

                    <TextInput
                      label={t('catalog.productsCreate.wholesaleName') || 'Wholesale Name'}
                      placeholder={t('catalog.productsCreate.wholesaleNamePlaceholder') || 'Enter wholesale name'}
                      value={wholesaleName}
                      onChange={(value) => {
                        if (!manuallyEdited.wholesaleName) {
                          setManuallyEdited(prev => ({ ...prev, wholesaleName: true }))
                        }
                        setWholesaleName(typeof value === 'string' ? value : value?.currentTarget?.value || '')
                      }}
                      onFocus={collapseSidebarIfNeeded}
                      maxLength={255}
                      required
                    />

                    <TextInput
                      label={t('catalog.productsCreate.customName') || 'Custom Name'}
                      placeholder={t('catalog.productsCreate.customNamePlaceholder') || 'Enter custom name'}
                      value={customName}
                      onChange={(value) => {
                        if (!manuallyEdited.customName) {
                          setManuallyEdited(prev => ({ ...prev, customName: true }))
                        }
                        setCustomName(typeof value === 'string' ? value : value?.currentTarget?.value || '')
                      }}
                      onFocus={collapseSidebarIfNeeded}
                      maxLength={255}
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
                        nothingFoundMessage={t('catalog.categoriesPage.noCategoriesFound') || 'No categories found'}
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
                        nothingFoundMessage={t('catalog.brandsPage.noBrandsFound') || 'No brands found'}
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
                                height={80}
                                width={80}
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
                        onChange={(value) => setVideoUrl(typeof value === 'string' ? value : value?.currentTarget?.value || '')}
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

                    {/* Default Values Form */}
                    <Stack gap="xs">
                      <Group justify="space-between" align="center" px="sm">
                        <Text size="xs" fw={600}>{t('catalog.productsCreate.defaultValues') || 'Default Values for New Variants'}</Text>
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconDeviceFloppy size={12} />}
                          onClick={handleApplyDefaultsToAll}
                        >
                          {t('catalog.productsCreate.applyToAll') || 'Apply to All'}
                        </Button>
                      </Group>

                      <Text size="xs" c="blue" px="sm">
                        💡 {t('catalog.productsCreate.autoCalculationTip') || 'Enter Purchase Cost to auto-calculate Retail Price (+50%) and Wholesale Price (+20%)'}
                      </Text>

                      <Paper
                        withBorder
                        p="xs"
                        bg={colorScheme === 'dark' ? 'dark.7' : 'blue.0'}
                      >
                        <SimpleGrid cols={10} spacing="md">
                          {/* Variant Name (empty) */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.variantName') || 'VARIANT NAME'}</Text>
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
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'RETAIL OFFER PRICE'}</Text>
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
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesaleOfferPrice') || 'WHOLESALE OFFER PRICE'}</Text>
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
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesaleMoq') || 'WHOLESALE MOQ'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.wholesaleMoq}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesaleMoq: typeof value === 'number' ? value : 0 }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              size="xs"
                            />
                          </Stack>

                          {/* Weight */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.weight') || 'WEIGHT (g)'}</Text>
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

                          {/* Stock */}
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
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'RETAIL OFFER PRICE'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleOfferPrice') || 'WHOLESALE OFFER PRICE'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleMoq') || 'WHOLESALE MOQ'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.weight') || 'WEIGHT (g)'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.stock') || 'STOCK'}</Text>
                        </SimpleGrid>

                        {/* Variant Rows */}
                        <Stack gap="xs">
                          {variants.map((variant) => (
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
                        id="description-editor-container"
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
                        id="highlights-editor-container"
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
                          label={t('catalog.productsCreate.enableWarranty') || 'Enable Warranty'}
                          description={t('catalog.productsCreate.enableWarrantyDescription') || 'Offer warranty for this product'}
                          checked={enableWarranty}
                          onChange={(e) => setEnableWarranty(e.currentTarget.checked)}
                          size="md"
                        />
                      </Grid.Col>

                      {enableWarranty && (
                        <Grid.Col span={{ base: 12, md: 8.4 }}>
                          <TextInput
                            label={t('catalog.productsCreate.warrantyDetails') || 'Warranty Details'}
                            placeholder={t('catalog.productsCreate.warrantyDetailsPlaceholder') || 'Enter warranty details'}
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
                        id="includes-in-the-box-editor-container"
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
                              onChange={(value) => {
                                if (!manuallyEdited.seoTitle) {
                                  setManuallyEdited(prev => ({ ...prev, seoTitle: true }))
                                }
                                setSeoTitle(typeof value === 'string' ? value : value?.currentTarget?.value || '')
                              }}
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
                          <Paper
                            withBorder
                            p="lg"
                            bg={colorScheme === 'dark' ? 'dark.7' : 'white'}
                            style={{ cursor: 'pointer' }}
                          >
                            <Stack gap={4}>
                              {/* Site Info Row */}
                              <Group gap={6} wrap="nowrap">
                                {/* Site Icon */}
                                <Box
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: colorScheme === 'dark' ? '#373A40' : '#f1f3f4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Text size="xs" fw={700} c={colorScheme === 'dark' ? '#C1C2C5' : '#5f6368'}>H</Text>
                                </Box>

                                {/* Domain Name */}
                                <Text size="xs" c={colorScheme === 'dark' ? '#C1C2C5' : '#202124'}>
                                  hooknhunt.com
                                </Text>

                                {/* Arrow */}
                                <Text size="xs" c={colorScheme === 'dark' ? '#909296' : '#5f6368'}>›</Text>

                                {/* Breadcrumb */}
                                <Text size="xs" c={colorScheme === 'dark' ? '#C1C2C5' : '#202124'} truncate>
                                  Products › {(seoTitle || 'Product Name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}
                                </Text>
                              </Group>

                              {/* Title - Large and Blue */}
                              <Text
                                size="xl"
                                fw={400}
                                c={colorScheme === 'dark' ? '#4dabf7' : '#1a0dab'}
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
                                c={colorScheme === 'dark' ? '#C1C2C5' : '#4d5156'}
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
              onClick={() => navigate('/catalog/products')}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              leftSection={isSubmitting ? <IconLoader size={16} /> : <IconDeviceFloppy size={16} />}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting
                ? (t('catalog.productsCreate.saving') || 'Saving...')
                : (t('catalog.productsCreate.saveProduct') || 'Save Product')
              }
            </Button>
          </Group>
        </form>
      </Stack>
    </Box>
  )
}
