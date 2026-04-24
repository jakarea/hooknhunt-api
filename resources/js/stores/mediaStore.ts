import { create } from 'zustand'
import { api } from '@/lib/api'
import { notifications } from '@mantine/notifications'
import {
  getMediaFiles,
  uploadMediaFiles,
  getMediaFolders,
  bulkDeleteMediaFiles,
  bulkMoveMediaFiles,
  type MediaFile,
  type MediaFolder,
} from '@/utils/api'

// ─── Pure Helpers ────────────────────────────────
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const isImageFile = (mimeType?: string | null): boolean =>
  !!mimeType && mimeType.startsWith('image/')

export const filterFilesBySearch = (files: MediaFile[], query: string): MediaFile[] => {
  if (!query.trim()) return files
  const q = query.toLowerCase()
  return files.filter(
    (f) =>
      f.originalFilename?.toLowerCase().includes(q) ||
      f.filename?.toLowerCase().includes(q),
  )
}

export const filterFoldersByParent = (
  folders: MediaFolder[],
  parentId: number | null,
  query: string,
): MediaFolder[] => {
  const children = folders.filter((f) => f.parentId === parentId)
  if (!query.trim()) return children
  const q = query.toLowerCase()
  return children.filter((f) => f.name.toLowerCase().includes(q))
}

export const getFolderPath = (
  folders: MediaFolder[],
  folderId: number | null,
): MediaFolder[] => {
  if (!folderId) return []
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) return []
  return [...getFolderPath(folders, folder.parentId ?? null), folder]
}

// ─── Store ───────────────────────────────────────
interface MediaStoreState {
  // Data
  files: MediaFile[]
  folders: MediaFolder[]
  selectedFileIds: number[]
  singleActionFileIds: number[]

  // UI state
  loading: boolean
  loadingMore: boolean
  uploading: boolean
  searchQuery: string
  currentFolder: number | null
  hasMoreFiles: boolean

  // Cache state - store files per folder
  filesCache: Record<number | null, MediaFile[]>

  // Preview
  previewOpened: boolean
  previewFile: MediaFile | null
  editingFileName: string
  editingAltText: string
  savingFileChanges: boolean

  // Modals
  moveModalOpened: boolean
  targetFolderId: number | null
  createFolderModalOpened: boolean
  newFolderName: string
  creatingFolder: boolean

  // Actions
  loadFiles: () => Promise<void>
  loadMoreFiles: () => Promise<void>
  loadFolders: () => Promise<void>
  uploadFiles: (files: FileList, folderId: number | null) => Promise<void>
  setSearchQuery: (q: string) => void
  setCurrentFolder: (id: number | null) => void
  toggleFileSelection: (id: number, multiple: boolean) => void
  selectAll: (ids: number[]) => void
  clearSelection: () => void
  deleteFiles: (ids: number[]) => Promise<void>
  moveFiles: (ids: number[], targetFolderId: number | null) => Promise<void>
  createFolder: (name: string, parentId: number | null) => Promise<boolean>
  openPreview: (file: MediaFile) => void
  closePreview: () => void
  saveFileChanges: () => Promise<void>
  resetEditingFields: () => void
  openMoveModal: (fileIds?: number[]) => void
  closeMoveModal: () => void
  openCreateFolderModal: () => void
  closeCreateFolderModal: () => void
  setNewFolderName: (name: string) => void
  setTargetFolderId: (id: number | null) => void
  setEditingFileName: (name: string) => void
  setEditingAltText: (text: string) => void
  resetState: () => void
  invalidateCache: (folderId?: number | null) => void
}

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  // Data
  files: [],
  folders: [],
  selectedFileIds: [],
  singleActionFileIds: [],

  // UI state
  loading: false,
  loadingMore: false,
  uploading: false,
  searchQuery: '',
  currentFolder: null,
  hasMoreFiles: true,

  // Cache - store files per folder to avoid reloading
  filesCache: {},

  // Preview
  previewOpened: false,
  previewFile: null,
  editingFileName: '',
  editingAltText: '',
  savingFileChanges: false,

  // Modals
  moveModalOpened: false,
  targetFolderId: null,
  createFolderModalOpened: false,
  newFolderName: '',
  creatingFolder: false,

  // ─── Actions ─────────────────────────────────

  loadFiles: async () => {
    const folderId = get().currentFolder
    const cache = get().filesCache

    // Check if we have cached data for this folder
    if (cache[folderId] && cache[folderId].length > 0) {
      set({ files: cache[folderId], loading: false, hasMoreFiles: false })
      return
    }

    set({ loading: true, hasMoreFiles: true })
    try {
      const response = await getMediaFiles({
        folderId: folderId ?? undefined,
        page: 1,
        per_page: 24,
      })
      if (response?.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data || []
        const filtered = raw.filter((f: MediaFile) => isImageFile(f.mimeType))
        set({
          files: filtered,
          filesCache: { ...cache, [folderId]: filtered },
          hasMoreFiles: filtered.length >= 24,
        })
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load files', color: 'red' })
    } finally {
      set({ loading: false })
    }
  },

  loadMoreFiles: async () => {
    const { loadingMore, hasMoreFiles, currentFolder, files } = get()
    if (loadingMore || !hasMoreFiles) return

    set({ loadingMore: true })
    try {
      const currentPage = Math.ceil(files.length / 24) + 1
      const response = await getMediaFiles({
        folderId: currentFolder ?? undefined,
        page: currentPage,
        per_page: 24,
      })
      if (response?.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data || []
        const newFiles = raw.filter((f: MediaFile) => isImageFile(f.mimeType))
        const updatedFiles = [...files, ...newFiles]
        set((state) => ({
          files: updatedFiles,
          filesCache: { ...state.filesCache, [currentFolder]: updatedFiles },
          hasMoreFiles: newFiles.length >= 24,
          loadingMore: false,
        }))
      }
    } catch {
      set({ loadingMore: false })
    }
  },

  invalidateCache: (folderId?: number | null) => {
    set((state) => {
      const newCache = { ...state.filesCache }
      if (folderId !== undefined) {
        delete newCache[folderId]
      } else {
        // Invalidate current folder cache
        delete newCache[state.currentFolder]
      }
      return { filesCache: newCache }
    })
  },

  loadFolders: async () => {
    try {
      const response = await getMediaFolders()
      if (response) {
        const data = Array.isArray(response) ? response : response.data
        if (data) set({ folders: data })
      }
    } catch {
      // silent
    }
  },

  uploadFiles: async (fileList, folderId) => {
    set({ uploading: true })
    try {
      await uploadMediaFiles(fileList, folderId ?? undefined)
      notifications.show({
        title: 'Success',
        message: `${fileList.length} file(s) uploaded`,
        color: 'green',
      })
      // Invalidate cache and reload
      get().invalidateCache(folderId)
      await get().loadFiles()
    } catch {
      notifications.show({ title: 'Error', message: 'Upload failed', color: 'red' })
    } finally {
      set({ uploading: false })
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCurrentFolder: (id) => set({ currentFolder: id, selectedFileIds: [] }),

  toggleFileSelection: (id, multiple) => {
    set((s) => {
      if (multiple) {
        const has = s.selectedFileIds.includes(id)
        return { selectedFileIds: has ? s.selectedFileIds.filter((x) => x !== id) : [...s.selectedFileIds, id] }
      }
      return { selectedFileIds: [id] }
    })
  },

  selectAll: (ids) => set({ selectedFileIds: ids }),
  clearSelection: () => set({ selectedFileIds: [], singleActionFileIds: [] }),

  deleteFiles: async (ids) => {
    try {
      await bulkDeleteMediaFiles(ids)
      notifications.show({ title: 'Deleted', message: `${ids.length} file(s) deleted`, color: 'green' })
      const { previewFile, currentFolder } = get()
      if (previewFile && ids.includes(previewFile.id)) {
        set({ previewOpened: false, previewFile: null })
      }
      set((s) => ({
        selectedFileIds: s.selectedFileIds.filter((x) => !ids.includes(x)),
      }))
      // Invalidate cache and reload
      get().invalidateCache(currentFolder)
      await get().loadFiles()
    } catch {
      notifications.show({ title: 'Error', message: 'Delete failed', color: 'red' })
    }
  },

  moveFiles: async (fileIds, targetFolderId) => {
    try {
      const { currentFolder } = get()
      await bulkMoveMediaFiles(fileIds, targetFolderId)
      notifications.show({ title: 'Moved', message: `${fileIds.length} file(s) moved`, color: 'green' })
      set({ moveModalOpened: false, targetFolderId: null, singleActionFileIds: [], selectedFileIds: [] })
      // Invalidate cache for both source and target folders
      get().invalidateCache(currentFolder)
      get().invalidateCache(targetFolderId)
      await get().loadFiles()
    } catch {
      notifications.show({ title: 'Error', message: 'Move failed', color: 'red' })
    }
  },

  createFolder: async (name, parentId) => {
    if (!name.trim()) return false
    set({ creatingFolder: true })
    try {
      const res = await api.post('/media/folders', { name, parent_id: parentId ?? undefined })
      if (res.status >= 200 && res.status < 300) {
        notifications.show({ title: 'Created', message: 'Folder created', color: 'green' })
        set({ createFolderModalOpened: false, newFolderName: '' })
        await get().loadFolders()
        return true
      }
      return false
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to create folder', color: 'red' })
      return false
    } finally {
      set({ creatingFolder: false })
    }
  },

  openPreview: (file) =>
    set({ previewFile: file, editingFileName: file.filename || '', editingAltText: file.altText || '', previewOpened: true }),

  closePreview: () => set({ previewOpened: false, previewFile: null }),

  saveFileChanges: async () => {
    const { previewFile, editingFileName, editingAltText } = get()
    if (!previewFile) return
    set({ savingFileChanges: true })
    try {
      // Send the update to the API
      await api.put(`/media/files/${previewFile.id}`, {
        filename: editingFileName,
        alt_text: editingAltText,
      })

      // After successful API call, fetch the updated file to get the correct data
      const updatedFileResponse = await api.get(`/media/files/${previewFile.id}`)
      // Handle nested response structure (response.data or response.data.data)
      const updatedFile = updatedFileResponse.data.data || updatedFileResponse.data

      notifications.show({ title: 'Saved', message: 'File updated', color: 'green' })

      // Update the preview file and files list with the actual data from the API
      set((state) => ({
        previewFile: updatedFile,
        files: state.files.map((f) => f.id === previewFile.id ? updatedFile : f),
      }))
    } catch (error) {
      console.error('Save failed:', error)
      notifications.show({ title: 'Error', message: 'Update failed', color: 'red' })
    } finally {
      set({ savingFileChanges: false })
    }
  },

  resetEditingFields: () => {
    const { previewFile } = get()
    if (previewFile) {
      set({ editingFileName: previewFile.filename || '', editingAltText: previewFile.altText || '' })
    }
  },

  openMoveModal: (fileIds) =>
    set({ singleActionFileIds: fileIds ?? [], moveModalOpened: true }),

  closeMoveModal: () =>
    set({ moveModalOpened: false, targetFolderId: null, singleActionFileIds: [] }),

  openCreateFolderModal: () => set({ createFolderModalOpened: true }),
  closeCreateFolderModal: () => set({ createFolderModalOpened: false, newFolderName: '' }),
  setNewFolderName: (name) => set({ newFolderName: name }),
  setTargetFolderId: (id) => set({ targetFolderId: id }),
  setEditingFileName: (name) => set({ editingFileName: name }),
  setEditingAltText: (text) => set({ editingAltText: text }),

  resetState: () =>
    set({
      selectedFileIds: [],
      singleActionFileIds: [],
      searchQuery: '',
      currentFolder: null,
    }),
}))
