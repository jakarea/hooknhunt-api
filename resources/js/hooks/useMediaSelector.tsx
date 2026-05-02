import { useState, useCallback, createContext, useContext } from 'react'
import { MediaSelectorModal } from '@/components/media-selector-modal'
import type { MediaFile } from '@/utils/api'

interface MediaSelectorContextValue {
  openSingleSelect: (onSelect: (file: MediaFile) => void, currentSelection?: number[], folderId?: number | null) => void
  openMultipleSelect: (onSelect: (files: MediaFile[]) => void, currentSelection?: number[], folderId?: number | null) => void
}

const MediaSelectorContext = createContext<MediaSelectorContextValue | undefined>(undefined)

interface MediaSelectorState {
  opened: boolean
  mode: 'single' | 'multiple'
  currentSelection: number[]
  folderId: number | null
  onSelect: (file: MediaFile) => void
  onSelectMultiple: (files: MediaFile[]) => void
}

/**
 * Global Media Selector Provider
 *
 * Provides a global media selector modal that can be used from anywhere in the application.
 *
 * Usage:
 * ```tsx
 * import { useMediaSelector } from '@/hooks/useMediaSelector'
 *
 * function MyComponent() {
 *   const { openSingleSelect, openMultipleSelect } = useMediaSelector()
 *
 *   const handleSelectThumbnail = () => {
 *     openSingleSelect((mediaFile) => {
 *       console.log('Selected:', mediaFile)
 *       setSelectedThumbnail(mediaFile)
 *     })
 *   }
 *
 *   return (
 *     <Button onClick={handleSelectThumbnail}>Select Thumbnail</Button>
 *   )
 * }
 * ```
 */
export function GlobalMediaSelectorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MediaSelectorState>({
    opened: false,
    mode: 'single',
    currentSelection: [],
    folderId: null,
    onSelect: () => {},
    onSelectMultiple: () => {},
  })

  const openSingleSelect = useCallback((onSelect: (file: MediaFile) => void, currentSelection: number[] = [], folderId: number | null = null) => {
    setState({
      opened: true,
      mode: 'single',
      currentSelection,
      folderId,
      onSelect,
      onSelectMultiple: () => {},
    })
  }, [])

  const openMultipleSelect = useCallback((onSelect: (files: MediaFile[]) => void, currentSelection: number[] = [], folderId: number | null = null) => {
    setState({
      opened: true,
      mode: 'multiple',
      currentSelection,
      folderId,
      onSelect: () => {},
      onSelectMultiple: onSelect,
    })
  }, [])

  const close = useCallback(() => {
    setState({
      opened: false,
      mode: 'single',
      currentSelection: [],
      folderId: null,
      onSelect: () => {},
      onSelectMultiple: () => {},
    })
  }, [])

  const contextValue: MediaSelectorContextValue = {
    openSingleSelect,
    openMultipleSelect,
  }

  return (
    <MediaSelectorContext.Provider value={contextValue}>
      {children}
      <MediaSelectorModal
        opened={state.opened}
        onClose={close}
        onSelect={state.onSelect}
        onSelectMultiple={state.onSelectMultiple}
        multiple={state.mode === 'multiple'}
        currentSelection={state.currentSelection}
        initialFolderId={state.folderId}
      />
    </MediaSelectorContext.Provider>
  )
}

/**
 * Hook to access the global media selector
 *
 * Provides convenient methods to open the media selector modal
 * for single or multiple file selection.
 */
export function useMediaSelector() {
  const context = useContext(MediaSelectorContext)

  if (!context) {
    throw new Error('useMediaSelector must be used within GlobalMediaSelectorProvider')
  }

  return context
}

/**
 * Global Media Selector Component (alias for backward compatibility)
 *
 * This component is deprecated. Use GlobalMediaSelectorProvider instead.
 * @deprecated Use GlobalMediaSelectorProvider wrapper instead
 */
export function GlobalMediaSelector() {
  // This is now a no-op since we use the provider pattern
  return null
}
