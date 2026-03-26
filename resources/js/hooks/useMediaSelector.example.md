# Global Media Selector Hook

The `useMediaSelector` hook provides a global media selector modal that can be used from anywhere in the application.

## Setup

The `GlobalMediaSelector` component is already added to `App.tsx`, so it's available everywhere.

## Usage

### Single File Selection (for thumbnails, avatars, etc.)

```tsx
import { useMediaSelector } from '@/hooks/useMediaSelector'
import type { MediaFile } from '@/utils/api'

function MyComponent() {
  const { openSingleSelect } = useMediaSelector()
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null)

  const handleSelectThumbnail = () => {
    openSingleSelect((mediaFile) => {
      console.log('Selected file:', mediaFile)
      setSelectedImage(mediaFile)
    }, selectedImage ? [selectedImage.id] : []) // Pass current selection
  }

  return (
    <Button onClick={handleSelectThumbnail}>
      Select Thumbnail
    </Button>
  )
}
```

### Multiple File Selection (for galleries, etc.)

```tsx
import { useMediaSelector } from '@/hooks/useMediaSelector'
import type { MediaFile } from '@/utils/api'

function GalleryComponent() {
  const { openMultipleSelect } = useMediaSelector()
  const [selectedImages, setSelectedImages] = useState<MediaFile[]>([])

  const handleSelectGallery = () => {
    openMultipleSelect((mediaFiles) => {
      console.log('Selected files:', mediaFiles)
      setSelectedImages(mediaFiles)
    }, selectedImages.map(f => f.id)) // Pass current selection
  }

  return (
    <Button onClick={handleSelectGallery}>
      Select Gallery Images
    </Button>
  )
}
```

## API

### `useMediaSelector()` Hook Returns

```typescript
{
  isOpen: boolean              // Whether modal is open
  mode: 'single' | 'multiple'   // Current selection mode
  currentSelection: number[]    // Currently selected file IDs
  onSelect: (file) => void     // Single select callback
  onSelectMultiple: (files) => void // Multi-select callback
  openSingleSelect: (callback, currentSelection?) => void
  openMultipleSelect: (callback, currentSelection?) => void
  close: () => void
}
```

### Methods

- **`openSingleSelect(callback, currentSelection?)`**
  - Opens modal for single file selection
  - `callback`: Function called with selected `MediaFile`
  - `currentSelection`: Optional array of currently selected file IDs

- **`openMultipleSelect(callback, currentSelection?)`**
  - Opens modal for multiple file selection
  - `callback`: Function called with array of selected `MediaFile[]`
  - `currentSelection`: Optional array of currently selected file IDs

## MediaFile Type

```typescript
interface MediaFile {
  id: number
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  url: string
  width?: number
  height?: number
  altText?: string
  createdAt: string
  updatedAt: string
}
```

## Features

The media selector modal includes:
- ✅ Folder navigation with breadcrumbs
- ✅ Folder creation
- ✅ Image preview with file details
- ✅ File editing (filename, alt text)
- ✅ Search functionality
- ✅ Single and multi-select modes
- ✅ Upload new images
- ✅ Refresh content
