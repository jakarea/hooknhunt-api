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
  IconArrowLeft,
  IconSparkles
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getCategories, getBrands, getProduct, type Category, type Brand, type MediaFile } from '@/utils/api'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { useUIStore } from '@/stores/uiStore'

// Utility function to decode HTML entities (handles multiple levels of encoding)
const decodeHTMLEntities = (text: string): string => {
  if (!text) return ''
  let decoded = text
  let maxIterations = 5 // Prevent infinite loops
  let iteration = 0
  while (iteration < maxIterations && (
    decoded.includes('&amp;') ||
    decoded.includes('&lt;') ||
    decoded.includes('&gt;') ||
    decoded.includes('&quot;') ||
    decoded.includes('&#039;') ||
    decoded.includes('&#x27;') ||
    decoded.includes('&apos;')
  )) {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = decoded
    decoded = textarea.value
    iteration++
  }
  return decoded
}
import { apiMethods } from '@/lib/api'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GalleryImage {
  id: string
  mediaId: number
  url: string
  order: number
}

// Sortable Gallery Image (drag & drop)
function SortableGalleryImage({
  image,
  index,
  onRemove,
}: {
  image: GalleryImage
  index: number
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    position: 'relative' as const,
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners} w={80}>
      <Paper shadow="sm" p={4} withBorder>
        <Image
          src={image.url}
          alt={`Gallery ${index + 1}`}
          height={80}
          radius="md"
          fit="cover"
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
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          onRemove(image.id)
        }}
      >
        <IconTrash size={12} />
      </ActionIcon>
    </Box>
  )
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
  thumbnail?: string | null
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
  const [retailNameBn, setRetailNameBn] = useState('')
  const [wholesaleNameBn, setWholesaleNameBn] = useState('')
  const [includesInTheBoxBn, setIncludesInTheBoxBn] = useState('')
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
  const [descriptionBn, setDescriptionBn] = useState('')
  const [highlightsBn, setHighlightsBn] = useState<string[]>([])
  const [includesInTheBox, setIncludesInTheBox] = useState('')

  // SEO state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoTags, setSeoTags] = useState('')

  // Quill editor refs
  const descriptionQuillRef = useRef<any>(null)
  const highlightsQuillRef = useRef<any>(null)
  const includesInTheBoxQuillRef = useRef<any>(null)
  const descriptionBnQuillRef = useRef<any>(null)
  const highlightsBnQuillRef = useRef<any>(null)

  // Media state
  const [featuredImage, setFeaturedImage] = useState<{ mediaId: number; url: string } | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  // DnD sensors for gallery reordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleGalleryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setGalleryImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id)
      const newIndex = prev.findIndex((img) => img.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const updated = [...prev]
      const [moved] = updated.splice(oldIndex, 1)
      updated.splice(newIndex, 0, moved)
      return updated.map((img, idx) => ({ ...img, order: idx }))
    })
  }

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

  // Track if initial data has been loaded (to prevent auto-fill during population)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // ============================================================================
  // QUIOR EDITOR INITIALIZATION
  // ============================================================================

  // Initialize Quill editors after product data is loaded
  useEffect(() => {
    if (isLoading) return

    const initializeQuillEditors = async () => {
      // Custom Image Format for Quill 2.x with resize support
      const BaseImageFormat: any = Quill.import('formats/image')
      class ImageFormat extends BaseImageFormat {
        static create(value: string) {
          const node = super.create(value) as HTMLImageElement
          node.classList.add('richtext_image')
          node.setAttribute('contenteditable', 'false')
          return node
        }
      }
      Quill.register(ImageFormat, true)

      // Add custom CSS for Quill editor heights and dark mode
      const styleId = 'quill-custom-heights-v2'
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
          #description-editor .ql-editor {
            min-height: 400px;
            max-height: 800px;
            overflow-y: auto;
            resize: vertical;
          }

          #description-bn-editor .ql-editor {
            min-height: 400px;
            max-height: 800px;
            overflow-y: auto;
            resize: vertical;
          }

          #highlights-editor .ql-editor {
            min-height: 200px;
            max-height: 800px;
            overflow-y: auto;
            resize: vertical;
          }

          #highlights-bn-editor .ql-editor {
            min-height: 200px;
            max-height: 800px;
            overflow-y: auto;
            resize: vertical;
          }

          /* Hide numbered list button from highlights editor */
          #highlights-editor .ql-list[value="ordered"] {
            display: none !important;
          }

          /* Hide indent/outdent buttons to prevent nested lists */
          #highlights-editor .ql-indent {
            display: none !important;
          }

          #highlights-editor .ql-outdent {
            display: none !important;
          }

          /* Dark mode support */
          [data-mantine-color-scheme="dark"] #description-editor .ql-toolbar,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-toolbar,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-toolbar,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-toolbar {
            background-color: #2C2E33;
            border-color: #45474E;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-container,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-container,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-container,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-container {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-editor.ql-blank::before,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-editor.ql-blank::before,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-editor.ql-blank::before,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-editor.ql-blank::before {
            color: #6c6c6c;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-stroke,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-stroke,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-stroke,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-stroke {
            stroke: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-fill,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-fill,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-fill,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-fill {
            fill: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-picker,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-picker {
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-options,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-picker-options,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-options,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-picker-options {
            background-color: #25262B;
            border-color: #45474E;
            color: #C1C2C5;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item:hover,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-picker-item:hover,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-item:hover,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-picker-item:hover {
            background-color: #373A40;
          }

          [data-mantine-color-scheme="dark"] #description-editor .ql-picker-item.ql-selected,
          [data-mantine-color-scheme="dark"] #description-bn-editor .ql-picker-item.ql-selected,
          [data-mantine-color-scheme="dark"] #highlights-editor .ql-picker-item.ql-selected,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor .ql-picker-item.ql-selected {
            background-color: #228BE6;
            color: white;
          }

          [data-mantine-color-scheme="dark"] #description-editor a,
          [data-mantine-color-scheme="dark"] #description-bn-editor a,
          [data-mantine-color-scheme="dark"] #highlights-editor a,
          [data-mantine-color-scheme="dark"] #highlights-bn-editor a {
            color: #228BE6;
          }

          /* Richtext image styles - base class for all images */
          .richtext_image {
            max-width: 100%;
            height: auto;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border-radius: 4px;
            display: inline-block;
          }

          .richtext_image:hover {
            box-shadow: 0 0 0 2px rgba(34, 139, 230, 0.5);
          }

          /* Selected image with resize handles */
          .richtext_image.selected {
            outline: 2px solid #228BE6;
            outline-offset: 2px;
          }

          /* Resize handles for selected images */
          .richtext-image-resize-handle {
            position: absolute;
            background: #228BE6;
            border: 2px solid white;
            z-index: 1000;
          }

          /* Corner handles - round */
          .richtext-image-resize-handle.nw,
          .richtext-image-resize-handle.ne,
          .richtext-image-resize-handle.sw,
          .richtext-image-resize-handle.se {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }

          .richtext-image-resize-handle.nw {
            top: -6px;
            left: -6px;
            cursor: nwse-resize;
          }

          .richtext-image-resize-handle.ne {
            top: -6px;
            right: -6px;
            cursor: nesw-resize;
          }

          .richtext-image-resize-handle.sw {
            bottom: -6px;
            left: -6px;
            cursor: nesw-resize;
          }

          .richtext-image-resize-handle.se {
            bottom: -6px;
            right: -6px;
            cursor: nwse-resize;
          }

          /* Edge handles - rectangular */
          .richtext-image-resize-handle.top,
          .richtext-image-resize-handle.bottom {
            width: 24px;
            height: 8px;
            left: 50%;
            transform: translateX(-50%);
            border-radius: 4px;
            cursor: ns-resize;
          }

          .richtext-image-resize-handle.top {
            top: -4px;
          }

          .richtext-image-resize-handle.bottom {
            bottom: -4px;
          }

          .richtext-image-resize-handle.left,
          .richtext-image-resize-handle.right {
            width: 8px;
            height: 24px;
            top: 50%;
            transform: translateY(-50%);
            border-radius: 4px;
            cursor: ew-resize;
          }

          .richtext-image-resize-handle.left {
            left: -4px;
          }

          .richtext-image-resize-handle.right {
            right: -4px;
          }

          /* Delete button for selected images */
          .richtext-image-delete-btn {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 24px;
            height: 24px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            z-index: 1001;
            user-select: none;
          }

          /* Size display for selected images */
          .richtext-image-size-display {
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1001;
            white-space: nowrap;
          }

        `
      document.head.appendChild(style)

      // Helper function to make images resizable and selectable
      const setupImageInteractions = (quillInstance: any) => {
        console.log('🔧 setupImageInteractions called for:', quillInstance)
        const editor = quillInstance.root
        const editorContainer = editor.parentElement
        console.log('📝 Editor root:', editor, 'Container:', editorContainer)

        // Store current selected image and its UI elements
        let selectedImage: HTMLImageElement | null = null
        let uiElements: {
          handles: HTMLDivElement[]
          deleteBtn: HTMLDivElement | null
          sizeDisplay: HTMLDivElement | null
        } = {
          handles: [],
          deleteBtn: null,
          sizeDisplay: null
        }

        // Remove all existing UI elements
        const cleanupImageUI = () => {
          console.log('🧹 Cleaning up UI')
          uiElements.handles.forEach(handle => handle.remove())
          if (uiElements.deleteBtn) uiElements.deleteBtn.remove()
          if (uiElements.sizeDisplay) uiElements.sizeDisplay.remove()
          uiElements = { handles: [], deleteBtn: null, sizeDisplay: null }
          selectedImage = null
        }

        // Update UI elements position based on image position
        const updateUIPosition = () => {
          if (!selectedImage || !editorContainer) return

          const imgRect = selectedImage.getBoundingClientRect()
          const containerRect = editorContainer.getBoundingClientRect()

          // Calculate relative position
          const relativeTop = imgRect.top - containerRect.top
          const relativeLeft = imgRect.left - containerRect.left

          // Update resize handles positions
          const positions = [
            // Corner handles
            { name: 'nw', top: relativeTop - 6, left: relativeLeft - 6 },
            { name: 'ne', top: relativeTop - 6, left: relativeLeft + imgRect.width - 6 },
            { name: 'sw', top: relativeTop + imgRect.height - 6, left: relativeLeft - 6 },
            { name: 'se', top: relativeTop + imgRect.height - 6, left: relativeLeft + imgRect.width - 6 },
            // Edge handles
            { name: 'top', top: relativeTop - 4, left: relativeLeft + imgRect.width / 2 },
            { name: 'bottom', top: relativeTop + imgRect.height - 4, left: relativeLeft + imgRect.width / 2 },
            { name: 'left', top: relativeTop + imgRect.height / 2, left: relativeLeft - 4 },
            { name: 'right', top: relativeTop + imgRect.height / 2, left: relativeLeft + imgRect.width - 4 }
          ]

          positions.forEach((pos, index) => {
            if (uiElements.handles[index]) {
              uiElements.handles[index].style.top = `${pos.top}px`
              uiElements.handles[index].style.left = `${pos.left}px`
            }
          })

          // Update delete button position
          if (uiElements.deleteBtn) {
            uiElements.deleteBtn.style.top = `${relativeTop - 12}px`
            uiElements.deleteBtn.style.left = `${relativeLeft + imgRect.width - 12}px`
          }

          // Update size display position
          if (uiElements.sizeDisplay) {
            uiElements.sizeDisplay.style.top = `${relativeTop + imgRect.height + 5}px`
            uiElements.sizeDisplay.style.left = `${relativeLeft + imgRect.width / 2}px`
          }
        }

        // Add resize handles and delete button to selected image
        const addImageUI = (img: HTMLImageElement) => {
          console.log('➕ Adding UI to image:', img)
          cleanupImageUI()

          selectedImage = img

          if (!editorContainer) {
            console.log('❌ No editor container found')
            return
          }

          // Ensure container has position relative for absolute positioning
          if (getComputedStyle(editorContainer).position === 'static') {
            editorContainer.style.position = 'relative'
          }

          // Add resize handles
          const positions = ['nw', 'ne', 'sw', 'se', 'top', 'bottom', 'left', 'right']
          positions.forEach(pos => {
            const handle = document.createElement('div')
            handle.className = `richtext-image-resize-handle ${pos}`
            handle.dataset.position = pos
            editorContainer.appendChild(handle)
            uiElements.handles.push(handle)
            console.log(`✅ Added resize handle: ${pos}`)
          })

          // Add delete button
          const deleteBtn = document.createElement('div')
          deleteBtn.className = 'richtext-image-delete-btn'
          deleteBtn.textContent = '×'
          deleteBtn.title = 'Delete image'
          editorContainer.appendChild(deleteBtn)
          uiElements.deleteBtn = deleteBtn
          console.log('✅ Added delete button')

          // Add size display
          const sizeDisplay = document.createElement('div')
          sizeDisplay.className = 'richtext-image-size-display'
          sizeDisplay.textContent = `${img.offsetWidth} × ${img.offsetHeight}`
          editorContainer.appendChild(sizeDisplay)
          uiElements.sizeDisplay = sizeDisplay
          console.log('✅ Added size display:', sizeDisplay.textContent)

          // Update positions
          setTimeout(() => updateUIPosition(), 0)

          // Verify all elements were added
          setTimeout(() => {
            console.log('🔍 Verification - Handles in container:', editorContainer.querySelectorAll('.richtext-image-resize-handle').length,
              'Delete btn:', !!editorContainer.querySelector('.richtext-image-delete-btn'),
              'Size display:', !!editorContainer.querySelector('.richtext-image-size-display'))
          }, 100)
        }

        // Handle image click for selection
        editor.addEventListener('click', (e: any) => {
          const target = e.target

          // Check if clicking on image
          if (target && target.tagName === 'IMG' && target.classList.contains('richtext_image')) {
            console.log('🖼️ Clicked on richtext_image')
            e.preventDefault()
            e.stopPropagation()
            const img = target as HTMLImageElement

            // Toggle selection
            if (selectedImage === img) {
              console.log('❌ Deselecting image')
              img.classList.remove('selected')
              cleanupImageUI()
            } else {
              console.log('✅ Selecting image')
              // Remove selected class from previous image
              if (selectedImage) {
                selectedImage.classList.remove('selected')
              }
              img.classList.add('selected')
              addImageUI(img)
            }
          } else {
            console.log('🌫️ Clicked elsewhere, deselecting all images')
            // Deselect image when clicking elsewhere
            if (selectedImage) {
              selectedImage.classList.remove('selected')
              cleanupImageUI()
            }
          }
        })

        // Handle clicks on UI elements (at container level since elements are there)
        if (editorContainer) {
          editorContainer.addEventListener('click', (e: any) => {
            const target = e.target
            console.log('🖱️ Container click on:', target, 'classes:', target?.className)

            // Check if clicking on resize handle
            if (target.classList.contains('richtext-image-resize-handle')) {
              console.log('✋ Clicked on resize handle:', target.dataset.position)
              e.preventDefault()
              e.stopPropagation()
              return // Let the mousedown handler deal with it
            }

            // Check if clicking on delete button
            if (target.classList.contains('richtext-image-delete-btn')) {
              console.log('🗑️ Clicked on delete button')
              e.preventDefault()
              e.stopPropagation()
              if (selectedImage) {
                const blot = Quill.find(selectedImage)
                if (blot && blot !== quillInstance) {
                  (blot as any).remove()
                }
                cleanupImageUI()
              }
              return
            }
          })
        }

        // Handle resize dragging (at container level)
        if (editorContainer) {
          editorContainer.addEventListener('mousedown', (e: any) => {
            if (e.target.classList.contains('richtext-image-resize-handle')) {
              console.log('🎯 Started resizing with handle:', e.target.dataset.position)
              e.preventDefault()
              e.stopPropagation()
              const handle = e.target
              const position = handle.dataset.position
              const img = selectedImage

              if (!img) return

              const startX = e.clientX
              const startY = e.clientY
              const startWidth = img.offsetWidth
              const startHeight = img.offsetHeight

              const aspectRatio = startWidth / startHeight

              const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX
                const deltaY = moveEvent.clientY - startY

                let newWidth = startWidth
                let newHeight = startHeight

                // Corner handles - always maintain aspect ratio
                if (['nw', 'ne', 'sw', 'se'].includes(position)) {
                  if (position === 'se' || position === 'ne') {
                    newWidth = startWidth + deltaX
                  } else if (position === 'sw' || position === 'nw') {
                    newWidth = startWidth - deltaX
                  }

                  // Maintain aspect ratio automatically for corners
                  newHeight = newWidth / aspectRatio
                }
                // Edge handles - resize only one dimension
                else if (position === 'top') {
                  newHeight = startHeight - deltaY
                } else if (position === 'bottom') {
                  newHeight = startHeight + deltaY
                } else if (position === 'left') {
                  newWidth = startWidth - deltaX
                } else if (position === 'right') {
                  newWidth = startWidth + deltaX
                }

                // Minimum size
                if (newWidth < 50) newWidth = 50
                if (newHeight < 50) newHeight = 50

                img.style.width = `${newWidth}px`
                img.style.height = `${newHeight}px`

                // Update UI positions
                updateUIPosition()

                // Update size display
                if (uiElements.sizeDisplay) {
                  uiElements.sizeDisplay.textContent = `${Math.round(newWidth)} × ${Math.round(newHeight)}`
                }
              }

              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove)
                document.removeEventListener('mouseup', onMouseUp)
                console.log('✅ Finished resizing')
              }

              document.addEventListener('mousemove', onMouseMove)
              document.addEventListener('mouseup', onMouseUp)
            }
          })
        }

        // Handle keyboard delete
        editor.addEventListener('keydown', (e: any) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && !quillInstance.getSelection()) {
            if (selectedImage) {
              e.preventDefault()
              const blot = Quill.find(selectedImage)
              if (blot && blot !== quillInstance) {
                (blot as any).remove()
              }
              cleanupImageUI()
            }
          }
        })

        // Handle image double-click to replace
        editor.addEventListener('dblclick', (e: any) => {
          const target = e.target
          if (target && target.tagName === 'IMG' && target.classList.contains('richtext_image')) {
            e.preventDefault()
            const blot = Quill.find(target)
            if (blot) {
              openSingleSelect((mediaFile: MediaFile) => {
                const img = target as HTMLImageElement
                img.src = mediaFile.url
                img.classList.remove('selected')
                cleanupImageUI()
              })
            }
          }
        })
      }

      // Description Editor
      const descriptionContainer = document.getElementById('description-editor')
      if (descriptionContainer && !descriptionQuillRef.current && description) {
        const quill1 = new Quill('#description-editor', {
          theme: 'snow',
          placeholder: 'Enter product description...',
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

        const toolbar = quill1.getModule('toolbar')
        if (toolbar) {
          toolbar.addHandler('image', () => {
            openSingleSelect((mediaFile: MediaFile) => {
              const range = quill1.getSelection(true)
              quill1.insertEmbed(range.index, 'image', mediaFile.url)
            })
          })
        }

        // Handle double-click on images to replace them
        quill1.root.addEventListener('dblclick', (e: any) => {
          const target = e.target
          if (target && target.tagName === 'IMG' && target.classList.contains('richtext_image')) {
            e.preventDefault()
            const blot = Quill.find(target)
            if (blot) {
              openSingleSelect((mediaFile: MediaFile) => {
                const img = target as HTMLImageElement
                img.src = mediaFile.url
                quill1.update()
              })
            }
          }
        })

        quill1.root.innerHTML = description
        quill1.on('text-change', () => {
          clearError('description')
          setDescription(quill1.root.innerHTML)
        })
        quill1.on('selection-change', (range: any) => {
          if (range && collapseSidebarIfNeeded) {
            collapseSidebarIfNeeded()
          }
        })
        descriptionQuillRef.current = quill1

        // Setup image interactions
        console.log('🚀 Calling setupImageInteractions for description editor')
        setupImageInteractions(quill1)
      } else if (descriptionQuillRef.current && description) {
        descriptionQuillRef.current.root.innerHTML = description
      }

      // Highlights Editor
      const highlightsContainer = document.getElementById('highlights-editor')
      console.log('🔍 Highlights Editor Container:', {
        container: highlightsContainer,
        highlightsList: highlightsList,
        editorRef: highlightsQuillRef.current
      })
      if (highlightsContainer && !highlightsQuillRef.current) {
        let isProgrammaticUpdate = false
        const quill2 = new Quill('#highlights-editor', {
          theme: 'snow',
          placeholder: '• Add key product highlights, features, or benefits...',
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
          const items: string[] = []
          temp.querySelectorAll('li').forEach((li) => {
            const text = li.textContent?.trim() || ''
            if (text) items.push(text)
          })
          return items
        }

        const arrayToListHtml = (items: string[]): string => {
          const nonEmpty = items.filter(item => item.trim() !== '')
          if (nonEmpty.length === 0) return ''
          return `<ul>${nonEmpty.map(item => `<li>${item}</li>`).join('')}</ul>`
        }

        const updateHighlightsState = () => {
          if (isProgrammaticUpdate) return
          const html = quill2.root.innerHTML
          const items = parseListItems(html)
          if (items.length > 20) {
            notifications.show({
              title: 'Maximum Limit Reached',
              message: 'You can only add up to 20 highlights.',
              color: 'yellow'
            })
            const truncated = items.slice(0, 20)
            setHighlightsList(truncated)
            isProgrammaticUpdate = true
            quill2.root.innerHTML = arrayToListHtml(truncated)
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          } else {
            setHighlightsList(items)
          }
        }

        if (highlightsList.length > 0) {
          isProgrammaticUpdate = true
          const html = arrayToListHtml(highlightsList)
          console.log('📌 Setting initial highlights HTML:', html)
          // Use Quill's clipboard API for better HTML parsing
          quill2.clipboard.dangerouslyPasteHTML(html)
          setTimeout(() => { isProgrammaticUpdate = false }, 0)
        } else {
          setTimeout(() => {
            isProgrammaticUpdate = true
            quill2.format('list', 'bullet')
            setTimeout(() => { isProgrammaticUpdate = false }, 0)
          }, 100)
        }

        quill2.on('text-change', (_delta: any, _old: any, source: any) => {
          if (source === 'user') updateHighlightsState()
        })
        quill2.root.addEventListener('input', () => updateHighlightsState())
        quill2.on('selection-change', (range: any) => {
          if (range && range.length === 0) {
            const format = quill2.getFormat()
            if (!format.list) quill2.format('list', 'bullet')
            if (collapseSidebarIfNeeded) collapseSidebarIfNeeded()
          }
        })
        highlightsQuillRef.current = quill2

        // Setup image interactions
        console.log('🚀 Calling setupImageInteractions for highlights editor')
        setupImageInteractions(quill2)
      } else if (highlightsQuillRef.current) {
        // Update existing editor with loaded highlights
        console.log('🔄 Updating existing highlights editor:', {
          highlightsList: highlightsList,
          currentHTML: highlightsQuillRef.current.root.innerHTML
        })
        const nonEmpty = highlightsList.filter(item => item.trim() !== '')
        console.log('📝 Non-empty highlights:', nonEmpty)
        if (nonEmpty.length > 0) {
          const html = `<ul>${nonEmpty.map(item => `<li>${item}</li>`).join('')}</ul>`
          console.log('📄 Setting HTML via clipboard:', html)
          // Use Quill's clipboard API for better HTML parsing
          highlightsQuillRef.current.clipboard.dangerouslyPasteHTML(html)
          console.log('✅ HTML set via clipboard, current content:', highlightsQuillRef.current.root.innerHTML)
        } else {
          // Enable bullet list format for empty editor
          setTimeout(() => {
            if (highlightsQuillRef.current) {
              highlightsQuillRef.current.format('list', 'bullet')
            }
          }, 50)
        }
      }

      // Bangla Description Editor
      const descriptionBnContainer = document.getElementById('description-bn-editor')
      if (descriptionBnContainer && !descriptionBnQuillRef.current) {
        const quillBn1 = new Quill('#description-bn-editor', {
          theme: 'snow',
          placeholder: 'পণ্যের বিস্তারিত বিবরণ লিখুন...',
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

        const toolbarBn1 = quillBn1.getModule('toolbar')
        if (toolbarBn1) {
          toolbarBn1.addHandler('image', () => {
            openSingleSelect((mediaFile: MediaFile) => {
              const range = quillBn1.getSelection(true)
              quillBn1.insertEmbed(range.index, 'image', mediaFile.url)
            })
          })
        }

        // Handle double-click on images to replace them (Bangla)
        quillBn1.root.addEventListener('dblclick', (e: any) => {
          const target = e.target
          if (target && target.tagName === 'IMG' && target.classList.contains('richtext_image')) {
            e.preventDefault()
            const blot = Quill.find(target)
            if (blot) {
              openSingleSelect((mediaFile: MediaFile) => {
                const img = target as HTMLImageElement
                img.src = mediaFile.url
                quillBn1.update()
              })
            }
          }
        })

        quillBn1.root.innerHTML = descriptionBn
        quillBn1.on('text-change', () => {
          setDescriptionBn(quillBn1.root.innerHTML)
        })
        quillBn1.on('selection-change', (range: any) => {
          if (range && collapseSidebarIfNeeded) collapseSidebarIfNeeded()
        })
        descriptionBnQuillRef.current = quillBn1

        // Setup image interactions
        console.log('🚀 Calling setupImageInteractions for Bangla description editor')
        setupImageInteractions(quillBn1)
      } else if (descriptionBnQuillRef.current && descriptionBn) {
        descriptionBnQuillRef.current.root.innerHTML = descriptionBn
      }

      // Bangla Highlights Editor
      const highlightsBnContainer = document.getElementById('highlights-bn-editor')
      if (highlightsBnContainer && !highlightsBnQuillRef.current) {
        let isProgrammaticUpdateBn = false
        const quillBn2 = new Quill('#highlights-bn-editor', {
          theme: 'snow',
          placeholder: '• পণ্যের মূল বৈশিষ্ট্য বুলেট পয়েন্ট হিসেবে লিখুন...',
          modules: {
            toolbar: [
              [{ 'list': 'bullet' }],
              ['clean']
            ]
          }
        })

        const parseListItemsBn = (html: string): string[] => {
          const temp = document.createElement('div')
          temp.innerHTML = html
          const items: string[] = []
          temp.querySelectorAll('li').forEach((li) => {
            const text = li.textContent?.trim() || ''
            if (text) items.push(text)
          })
          return items
        }

        const updateHighlightsBnState = () => {
          if (isProgrammaticUpdateBn) return
          const html = quillBn2.root.innerHTML
          const items = parseListItemsBn(html)
          if (items.length > 20) {
            const truncated = items.slice(0, 20)
            setHighlightsBn(truncated)
            isProgrammaticUpdateBn = true
            quillBn2.root.innerHTML = `<ul>${truncated.map(item => `<li>${item}</li>`).join('')}</ul>`
            setTimeout(() => { isProgrammaticUpdateBn = false }, 0)
          } else {
            setHighlightsBn(items)
          }
        }

        if (highlightsBn.length > 0) {
          isProgrammaticUpdateBn = true
          const html = `<ul>${highlightsBn.map(item => `<li>${item}</li>`).join('')}</ul>`
          console.log('📌 Setting initial Bangla highlights HTML:', html)
          quillBn2.clipboard.dangerouslyPasteHTML(html)
          setTimeout(() => { isProgrammaticUpdateBn = false }, 0)
        } else {
          setTimeout(() => {
            isProgrammaticUpdateBn = true
            quillBn2.format('list', 'bullet')
            setTimeout(() => { isProgrammaticUpdateBn = false }, 0)
          }, 100)
        }

        quillBn2.on('text-change', (_delta: any, _old: any, source: any) => {
          if (source === 'user') updateHighlightsBnState()
        })
        quillBn2.root.addEventListener('input', () => updateHighlightsBnState())
        quillBn2.on('selection-change', (range: any) => {
          if (range && range.length === 0) {
            const format = quillBn2.getFormat()
            if (!format.list) quillBn2.format('list', 'bullet')
            if (collapseSidebarIfNeeded) collapseSidebarIfNeeded()
          }
        })
        highlightsBnQuillRef.current = quillBn2

        // Setup image interactions
        console.log('🚀 Calling setupImageInteractions for Bangla highlights editor')
        setupImageInteractions(quillBn2)
      } else if (highlightsBnQuillRef.current) {
        // Update existing Bangla editor with loaded highlights
        console.log('🔄 Updating existing Bangla highlights editor:', {
          highlightsBn: highlightsBn,
          currentHTML: highlightsBnQuillRef.current.root.innerHTML
        })
        const nonEmpty = highlightsBn.filter(item => item.trim() !== '')
        console.log('📝 Non-empty Bangla highlights:', nonEmpty)
        if (nonEmpty.length > 0) {
          const html = `<ul>${nonEmpty.map(item => `<li>${item}</li>`).join('')}</ul>`
          console.log('📄 Setting Bangla HTML via clipboard:', html)
          highlightsBnQuillRef.current.clipboard.dangerouslyPasteHTML(html)
          console.log('✅ Bangla HTML set, current content:', highlightsBnQuillRef.current.root.innerHTML)
        } else {
          // Enable bullet list format for empty editor
          setTimeout(() => {
            if (highlightsBnQuillRef.current) {
              highlightsBnQuillRef.current.format('list', 'bullet')
            }
          }, 50)
        }
      }
    }

    // Small delay to ensure DOM is ready
    setTimeout(initializeQuillEditors, 100)
  }, [isLoading, description, highlightsList, descriptionBn, highlightsBn])

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
      if (descriptionBnQuillRef.current) {
        descriptionBnQuillRef.current = null
      }
      if (highlightsBnQuillRef.current) {
        highlightsBnQuillRef.current = null
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
        const firstRetailVariant = productData.variants?.find((v: any) => {
          const channel = v.channel || ''
          return channel.toLowerCase() === 'retail'
        })

        if (firstRetailVariant) {
          setEnablePreorder(!!firstRetailVariant.allowPreorder)
          setExpectedDeliveryDate(firstRetailVariant.expectedDelivery || null)
        } else {
          setEnablePreorder(false)
          setExpectedDeliveryDate(null)
        }

        // Decode HTML entities in description before setting it
        const description = decodeHTMLEntities(productData.description || '')
        setDescription(description)

        // Decode HTML entities in highlights
        const decodedHighlights = (productData.highlights || []).map((highlight: string) => decodeHTMLEntities(highlight))
        setHighlightsList(decodedHighlights)
        setIncludesInTheBox(Array.isArray(productData.inTheBox || productData.includes_in_the_box)
          ? (productData.inTheBox || productData.includes_in_the_box).join(', ')
          : (productData.inTheBox || productData.includes_in_the_box || ''))

        // Bangla fields
        setRetailNameBn(productData.retailNameBn || productData.retail_name_bn || '')
        setWholesaleNameBn(productData.wholesaleNameBn || productData.wholesale_name_bn || '')

        // Decode HTML entities in Bangla description
        const descriptionBn = decodeHTMLEntities(productData.descriptionBn || productData.description_bn || '')
        setDescriptionBn(descriptionBn)

        // Decode HTML entities in Bangla highlights
        const decodedHighlightsBn = (productData.highlightsBn || productData.highlights_bn || []).map((highlight: string) => decodeHTMLEntities(highlight))
        setHighlightsBn(decodedHighlightsBn)
        setIncludesInTheBoxBn(productData.includesInTheBoxBn || productData.includes_in_box_bn || '')

        // SEO
        setSeoTitle(productData.seoTitle || productData.metaTitle || '')
        setSeoDescription(productData.seoDescription || productData.metaDescription || '')
        setSeoTags(productData.seoTags || '')

        // Featured image
        if (productData.thumbnail || productData.featuredImage) {
          const thumb = productData.thumbnail || productData.featuredImage
          setFeaturedImage({
            mediaId: thumb.id,
            url: thumb.full_url || thumb.url
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
                  stock: 0,
                  thumbnail: null
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
              stock: variant.current_stock || variant.stock || 0,
              thumbnail: variant.thumbnail || null
            }))
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
  const handleSelectFeaturedImage = useCallback(() => {
    openSingleSelect((mediaFile: MediaFile) => {
      setFeaturedImage({
        mediaId: mediaFile.id,
        url: mediaFile.url
      })
      clearError('featuredImage')
    })
  }, [openSingleSelect])

  const handleRemoveFeaturedImage = useCallback(() => {
    setFeaturedImage(null)
  }, [])

  // Gallery images handler
  const handleSelectGalleryImages = useCallback(() => {
    openMultipleSelect((mediaFiles: MediaFile[]) => {
      if (mediaFiles && mediaFiles.length > 0) {
        const newImages: GalleryImage[] = mediaFiles.map((media, index) => ({
          id: `new-${Date.now()}-${index}`,
          mediaId: media.id,
          url: media.url,
          order: galleryImages.length + index
        }))
        setGalleryImages(prev => [...prev, ...newImages])
        clearError('galleryImages')
      }
    })
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
      sellerSku: defaultValues.sellerSku,
      thumbnail: null
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
    const pc = typeof defaultValues.purchaseCost === 'number' ? defaultValues.purchaseCost : parseFloat(String(defaultValues.purchaseCost)) || 0
    const rp = typeof defaultValues.price === 'number' ? defaultValues.price : parseFloat(String(defaultValues.price)) || 0
    const wp = typeof defaultValues.wholesalePrice === 'number' ? defaultValues.wholesalePrice : parseFloat(String(defaultValues.wholesalePrice)) || 0
    const sop = typeof defaultValues.specialPrice === 'number' ? defaultValues.specialPrice : undefined
    const wop = typeof defaultValues.wholesaleOfferPrice === 'number' ? defaultValues.wholesaleOfferPrice : undefined
    const w = typeof defaultValues.weight === 'number' ? defaultValues.weight : parseFloat(String(defaultValues.weight)) || 0

    setVariants(prev => prev.map(v => ({
      ...v,
      // Only apply defaults to empty/zero fields — leave existing data untouched
      ...(defaultValues.name && !v.name.trim() ? { name: defaultValues.name } : {}),
      ...(defaultValues.sellerSku && !v.sellerSku.trim() ? { sellerSku: defaultValues.sellerSku } : {}),
      ...(!v.purchaseCost ? { purchaseCost: pc } : {}),
      ...(!v.price ? { price: rp } : {}),
      ...(!v.wholesalePrice ? { wholesalePrice: wp } : {}),
      ...(v.specialPrice === undefined || v.specialPrice === 0 ? { specialPrice: sop } : {}),
      ...(v.wholesaleOfferPrice === undefined || v.wholesaleOfferPrice === 0 ? { wholesaleOfferPrice: wop } : {}),
      ...(!v.wholesaleMoq ? { wholesaleMoq: defaultValues.wholesaleMoq } : {}),
      ...(!v.weight ? { weight: w } : {}),
      ...(!v.stock ? { stock: defaultValues.stock } : {}),
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
        retailNameBn: retailNameBn || undefined,
        wholesaleNameBn: wholesaleNameBn || undefined,
        category: parseInt(category!),
        brand: parseInt(brand!),
        status,
        videoUrl,
        enableWarranty,
        warrantyDetails,
        enablePreorder,
        expectedDeliveryDate,
        description,
        descriptionBn: descriptionBn || undefined,
        highlights: highlightsList.filter(h => h.trim()).length > 0 ? highlightsList : null,
        highlightsBn: highlightsBn.filter(h => h.trim()).length > 0 ? highlightsBn : null,
        includesInTheBox: includesInTheBox.trim() ? includesInTheBox.trim() : null,
        includesInTheBoxBn: includesInTheBoxBn.trim() ? includesInTheBoxBn.trim() : null,
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
          stock: parseInt(v.stock.toString()),
          thumbnail: v.thumbnail || null
        }))
      }

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
    retailNameBn,
    wholesaleNameBn,
    category,
    brand,
    status,
    videoUrl,
    enableWarranty,
    warrantyDetails,
    enablePreorder,
    expectedDeliveryDate,
    description,
    descriptionBn,
    highlightsList,
    highlightsBn,
    includesInTheBox,
    includesInTheBoxBn,
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

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <Box>
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
                        <Group justify="flex-end" mt={4}>
                          <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                            Enhance with AI
                          </Button>
                        </Group>
                      </Box>
                      <Box>
                        <TextInput
                          label={t('catalog.productsCreate.retailNameBn') || 'Retail Name Bangla'}
                          placeholder="খুচরা নাম লিখুন"
                          value={retailNameBn}
                          onChange={(e) => setRetailNameBn(e.currentTarget.value)}
                          onFocus={collapseSidebarIfNeeded}
                        />
                        <Group justify="flex-end" mt={4}>
                          <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                            Enhance with AI
                          </Button>
                        </Group>
                      </Box>
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
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
                      <TextInput
                        label={t('catalog.productsCreate.wholesaleNameBn') || 'Wholesale Name Bangla'}
                        placeholder="পাইকারি নাম লিখুন"
                        value={wholesaleNameBn}
                        onChange={(e) => setWholesaleNameBn(e.currentTarget.value)}
                        onFocus={collapseSidebarIfNeeded}
                      />
                    </SimpleGrid>

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
                      <DndContext
                        sensors={dndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleGalleryDragEnd}
                      >
                        <SortableContext
                          items={galleryImages.map((img) => img.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <Group gap="xs" wrap="nowrap">
                            {galleryImages.map((image, index) => (
                              <SortableGalleryImage
                                key={image.id}
                                image={image}
                                index={index}
                                onRemove={handleRemoveGalleryImage}
                              />
                            ))}
                          </Group>
                        </SortableContext>
                      </DndContext>
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
                        <Box style={{ display: 'grid', gridTemplateColumns: '44px 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr 36px', gap: '8px', alignItems: 'start' }}>
                          {/* Thumbnail placeholder */}
                          <Box />

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
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.purchaseCost') || 'COST'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.purchaseCost}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, purchaseCost: typeof value === 'number' ? value : prev.purchaseCost }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
                              size="xs"
                            />
                          </Stack>

                          {/* Retail Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.retailPrice') || 'RETAIL'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.price}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, price: typeof value === 'number' ? value : prev.price }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
                              size="xs"
                            />
                            <Text size="xs" c={defaultValues.price - defaultValues.purchaseCost < 0 ? 'red' : 'green'}>
                              {defaultValues.price - defaultValues.purchaseCost > 0 ? '+' : ''}{(defaultValues.price - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.price - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                            </Text>
                          </Stack>

                          {/* Wholesale Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.wholesalePrice') || 'WS PRICE'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.wholesalePrice}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesalePrice: typeof value === 'number' ? value : prev.wholesalePrice }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
                              size="xs"
                            />
                            <Text size="xs" c={defaultValues.wholesalePrice - defaultValues.purchaseCost < 0 ? 'red' : 'green'}>
                              {defaultValues.wholesalePrice - defaultValues.purchaseCost > 0 ? '+' : ''}{(defaultValues.wholesalePrice - defaultValues.purchaseCost).toFixed(2)} ({defaultValues.purchaseCost > 0 ? ((defaultValues.wholesalePrice - defaultValues.purchaseCost) / defaultValues.purchaseCost * 100).toFixed(0) : 0}%)
                            </Text>
                          </Stack>

                          {/* Retail Offer Price */}
                          <Stack gap={4}>
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'R. OFFER'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.specialPrice}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, specialPrice: typeof value === 'number' ? value : prev.specialPrice }))}
                              onBlur={() => setDefaultValues(prev => ({ ...prev, specialPrice: prev.specialPrice || undefined }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
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
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, wholesaleOfferPrice: typeof value === 'number' ? value : prev.wholesaleOfferPrice }))}
                              onBlur={() => setDefaultValues(prev => ({ ...prev, wholesaleOfferPrice: prev.wholesaleOfferPrice || undefined }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
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
                            <Text size="xs" fw={500} c="dimmed">{t('catalog.productsCreate.weight') || 'WT'}</Text>
                            <NumberInput
                              placeholder="0"
                              value={defaultValues.weight}
                              onChange={(value) => setDefaultValues(prev => ({ ...prev, weight: typeof value === 'number' ? value : prev.weight }))}
                              onFocus={collapseSidebarIfNeeded}
                              min={0}
                              step={0.01}
                              decimalScale={2}
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
                          {/* Delete placeholder */}
                          <Box />
                        </Box>
                      </Paper>
                    </Stack>


                    {/* Table Header */}
                    <Box className="overflow-x-auto">
                      <Box style={{ minWidth: '900px' }}>
                        {/* Header Row */}
                        <Box style={{ display: 'grid', gridTemplateColumns: '44px 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr 36px', gap: '8px', alignItems: 'start' }} mb="xs" px="sm">
                          <Text size="xs" fw={600} c="dimmed">{'IMG'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.variantName') || 'VARIANT NAME'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.sellerSku') || 'SKU'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.purchaseCost') || 'COST'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.retailPrice') || 'RETAIL'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesalePrice') || 'WS PRICE'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.retailOfferPrice') || 'R. OFFER'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleOfferPrice') || 'WS OFFER'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.wholesaleMoq') || 'MOQ'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.weight') || 'WT'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{t('catalog.productsCreate.stock') || 'STOCK'}</Text>
                          <Text size="xs" fw={600} c="dimmed">{''}</Text>
                        </Box>

                        {/* Variant Rows */}
                        <Stack gap="xs">
                          {variants.map((variant, index) => (
                            <Paper key={variant.id} withBorder p="xs">
                              <Box style={{ display: 'grid', gridTemplateColumns: '44px 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr 1fr 36px', gap: '8px', alignItems: 'start' }}>
                                {/* Thumbnail */}
                                <Box
                                  style={{ width: 44, height: 44, cursor: 'pointer', borderRadius: 4, overflow: 'hidden', border: '1px dashed var(--mantine-color-gray-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: variant.thumbnail ? 'transparent' : 'var(--mantine-color-gray-0)' }}
                                  onClick={() => openSingleSelect((mediaFile: MediaFile) => {
                                    handleUpdateVariant(variant.id, 'thumbnail', mediaFile.url)
                                  })}
                                >
                                  {variant.thumbnail ? (
                                    <Image src={variant.thumbnail} w={44} h={44} fit="cover" radius={4} />
                                  ) : (
                                    <IconPhoto size={18} color="var(--mantine-color-gray-5)" />
                                  )}
                                </Box>

                                {/* Variant Name */}
                                <Group gap="xs" style={{ minWidth: 0 }}>
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
                                  error={errors[`variant.${index}.sellerSku`]}
                                />

                                {/* Purchase Cost */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.purchaseCost}
                                  onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'purchaseCost', value)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  step={0.01}
                                  decimalScale={2}
                                  size="sm"
                                  error={errors[`variant.${index}.purchaseCost`]}
                                />

                                {/* Retail Price */}
                                <Stack gap={4}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.price}
                                    onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'price', value)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    step={0.01}
                                    decimalScale={2}
                                    size="sm"
                                    error={errors[`variant.${index}.price`]}
                                  />
                                  {variant.price > 0 && (
                                    <Text size="xs" c={(variant.price - variant.purchaseCost) < 0 ? 'red' : 'green'}>
                                      {(variant.price - variant.purchaseCost) > 0 ? '+' : ''}{(variant.price - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.price - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                    </Text>
                                  )}
                                </Stack>

                                {/* Wholesale Price */}
                                <Stack gap={4}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.wholesalePrice}
                                    onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'wholesalePrice', value)}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    step={0.01}
                                    decimalScale={2}
                                    size="sm"
                                    error={errors[`variant.${index}.wholesalePrice`]}
                                  />
                                  {variant.wholesalePrice > 0 && (
                                    <Text size="xs" c={(variant.wholesalePrice - variant.purchaseCost) < 0 ? 'red' : 'green'}>
                                      {(variant.wholesalePrice - variant.purchaseCost) > 0 ? '+' : ''}{(variant.wholesalePrice - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.wholesalePrice - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                    </Text>
                                  )}
                                </Stack>

                                {/* Retail Offer Price */}
                                <Stack gap={4}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.specialPrice}
                                    onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'specialPrice', value)}
                                    onBlur={(e) => { const v = variant.specialPrice; if (!v) handleUpdateVariant(variant.id, 'specialPrice', undefined) }}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    step={0.01}
                                    decimalScale={2}
                                    size="sm"
                                    error={errors[`variant.${index}.specialPrice`]}
                                  />
                                  {variant.specialPrice > 0 && (
                                    <Text size="xs" c={(variant.specialPrice - variant.purchaseCost) < 0 ? 'red' : 'green'}>
                                      {(variant.specialPrice - variant.purchaseCost) > 0 ? '+' : ''}{(variant.specialPrice - variant.purchaseCost).toFixed(2)} ({variant.purchaseCost > 0 ? ((variant.specialPrice - variant.purchaseCost) / variant.purchaseCost * 100).toFixed(0) : 0}%)
                                    </Text>
                                  )}
                                </Stack>

                                {/* Wholesale Offer Price */}
                                <Stack gap={4}>
                                  <NumberInput
                                    placeholder="0"
                                    value={variant.wholesaleOfferPrice}
                                    onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'wholesaleOfferPrice', value)}
                                    onBlur={(e) => { const v = variant.wholesaleOfferPrice; if (!v) handleUpdateVariant(variant.id, 'wholesaleOfferPrice', undefined) }}
                                    onFocus={collapseSidebarIfNeeded}
                                    min={0}
                                    step={0.01}
                                    decimalScale={2}
                                    size="sm"
                                    error={errors[`variant.${index}.wholesaleOfferPrice`]}
                                  />
                                  {variant.wholesaleOfferPrice > 0 && (
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
                                  error={errors[`variant.${index}.wholesaleMoq`]}
                                />

                                {/* Weight */}
                                <NumberInput
                                  placeholder="0"
                                  value={variant.weight}
                                  onChange={(value) => typeof value === 'number' && handleUpdateVariant(variant.id, 'weight', value)}
                                  onFocus={collapseSidebarIfNeeded}
                                  min={0}
                                  step={0.01}
                                  decimalScale={2}
                                  size="sm"
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
                                  error={errors[`variant.${index}.stock`]}
                                />

                                {/* Delete */}
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
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                    <Group justify="flex-end">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={handleAddVariant}
                      >
                        {t('catalog.productsCreate.addVariant') || 'Add Variant'}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
                <Card withBorder p="md" shadow="sm">
                  <Stack gap="xl">
                    <Group>
                      <IconCoin size={20} className="text-blue-600" />
                      <Text className="text-base md:text-lg" fw={600}>
                        {t('catalog.productsCreate.descriptionAndHighlights') || 'Product Description & Highlights'}
                      </Text>
                    </Group>

                    {/* Description - English */}
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
                      <Group justify="flex-end">
                        <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                          Enhance with AI
                        </Button>
                      </Group>
                      {errors.description && (
                        <Text size="xs" c="red">{errors.description}</Text>
                      )}
                    </Stack>

                    {/* Highlights - English */}
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={500}>
                          {t('catalog.productsCreate.productHighlights') || 'Product Highlights'} <Text span c="red">*</Text>
                        </Text>
                        <Text size="xs" c="dimmed">
                          {highlightsList.filter(h => h.trim()).length}/20
                        </Text>
                      </Group>

                      <Box
                        id="highlights-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />

                      <Group justify="flex-end">
                        <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                          Enhance with AI
                        </Button>
                      </Group>

                      <Text size="xs" c="dimmed">
                        {t('catalog.productsCreate.highlightsTip') || 'Add key product highlights, features, or benefits as bullet points. Maximum 20 items.'}
                      </Text>
                    </Stack>

                    {/* Description - Bangla */}
                    <Stack gap="sm">
                      <Text size="sm" fw={500}>
                        পণ্যের বিবরণ (বাংলা)
                      </Text>
                      <Box
                        id="description-bn-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />
                      <Group justify="flex-end">
                        <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                          Enhance with AI
                        </Button>
                      </Group>
                    </Stack>

                    {/* Highlights - Bangla */}
                    <Stack gap="sm">
                      <Text size="sm" fw={500}>
                        পণ্যের হাইলাইটস (বাংলা)
                      </Text>
                      <Box
                        id="highlights-bn-editor"
                        style={{
                          borderRadius: '4px'
                        }}
                      />
                      <Group justify="flex-end">
                        <Button size="compact-xs" variant="subtle" color="violet" leftSection={<IconSparkles size={12} />}>
                          Enhance with AI
                        </Button>
                      </Group>
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
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput
                        label={t('catalog.productsCreate.includesInTheBox') || 'What\'s Included in the Box'}
                        placeholder={t('catalog.productsCreate.includesInTheBoxPlaceholder') || 'e.g. USB Cable, User Manual, Warranty Card'}
                        value={includesInTheBox}
                        onChange={(e) => setIncludesInTheBox(e.currentTarget.value)}
                        onFocus={collapseSidebarIfNeeded}
                      />
                      <TextInput
                        label="What's Included in the Box (Bangla)"
                        placeholder="যেমন: USB ক্যাবল, ব্যবহারকারী নির্দেশিকা, ওয়ারেন্টি কার্ড"
                        value={includesInTheBoxBn}
                        onChange={(e) => setIncludesInTheBoxBn(e.currentTarget.value)}
                        onFocus={collapseSidebarIfNeeded}
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
                          <Paper withBorder p="lg" bg={colorScheme === 'dark' ? 'dark.7' : 'white'} style={{ cursor: 'pointer' }}>
                            <Stack gap={4}>
                              {/* Site Info Row */}
                              <Group gap={6} wrap="nowrap">
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

                                <Text size="xs" c={colorScheme === 'dark' ? '#C1C2C5' : '#202124'}>
                                  hooknhunt.com
                                </Text>

                                <Text size="xs" c={colorScheme === 'dark' ? '#909296' : '#5f6368'}>›</Text>

                                <Text size="xs" c={colorScheme === 'dark' ? '#C1C2C5' : '#202124'} truncate>
                                  Products › {(seoTitle || 'Product Name').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}
                                </Text>
                              </Group>

                              {/* Title */}
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

                              {/* Description */}
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
