import { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Group,
  Button,
  SimpleGrid,
  Image,
  Text,
  TextInput,
  Paper,
  Checkbox,
  ActionIcon,
  Menu,
  Breadcrumbs,
  Anchor,
  ScrollArea,
  Select,
} from '@mantine/core'
import {
  IconSearch,
  IconUpload,
  IconPhoto,
  IconRefresh,
  IconDots,
  IconInfoCircle,
  IconFolder,
  IconFolderPlus,
  IconChevronRight,
  IconTrash,
  IconEdit,
  IconFile,
  IconArrowMoveRight,
} from '@tabler/icons-react'
import { showNotification } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useTranslation } from 'react-i18next'
import { getMediaFiles, uploadMediaFiles, getMediaFolders, bulkDeleteMediaFiles, bulkMoveMediaFiles, type MediaFile, type MediaFolder } from '@/utils/api'

interface MediaSelectorModalProps {
  opened: boolean
  onClose: () => void
  onSelect: (mediaFile: MediaFile) => void
  onSelectMultiple?: (mediaFiles: MediaFile[]) => void
  multiple?: boolean
  currentSelection?: number[]
}

/**
 * WordPress-style Media Library Selector Modal
 * Same UI as /cms/media page
 *
 * Allows users to:
 * - Upload new images to media library
 * - Browse existing media files
 * - Select single or multiple images
 * - Search media
 */
export function MediaSelectorModal({
  opened,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
  currentSelection = [],
}: MediaSelectorModalProps) {
  const { t } = useTranslation()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>(currentSelection)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [createFolderModalOpened, setCreateFolderModalOpened] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [previewOpened, setPreviewOpened] = useState(false)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [editingFileName, setEditingFileName] = useState('')
  const [editingAltText, setEditingAltText] = useState('')
  const [savingFileChanges, setSavingFileChanges] = useState(false)
  const [moveModalOpened, setMoveModalOpened] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null)

  // Load media files when modal opens
  useEffect(() => {
    if (opened) {
      loadAllMediaFolders()
      loadAllMediaFiles()
      setSelectedFileIds(currentSelection)
    }
  }, [opened, currentSelection, currentFolder])

  /**
   * Load all media folders
   */
  const loadAllMediaFolders = async () => {
    try {
      const response = await getMediaFolders()
      if (response && (response.data || Array.isArray(response))) {
        const foldersData = Array.isArray(response) ? response : response.data
        setFolders(foldersData)
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  /**
   * Load all media files from the media library
   */
  const loadAllMediaFiles = async () => {
    setLoading(true)
    try {
      const response = await getMediaFiles({
        folderId: currentFolder ?? undefined,
        page: 1,
        per_page: 100,
      })

      if (response && response.data) {
        const filesData = Array.isArray(response.data) ? response.data : response.data.data || []
        // Filter only image files
        const imageFiles = filesData.filter((file: MediaFile) =>
          file.mimeType?.startsWith('image/')
        )
        setMediaFiles(imageFiles)
      }
    } catch (error) {
      showNotification({
        title: t('common.error'),
        message: t('cms.mediaPage.errorLoading'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Upload new image to media library
   */
  const handleUploadNewImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    setUploading(true)

    try {
      await uploadMediaFiles(files, currentFolder ?? undefined)

      showNotification({
        title: t('common.success'),
        message: t('cms.mediaPage.filesUploadedMessage', { count: 1 }),
        color: 'green',
      })

      // Reload media files to show newly uploaded image
      await loadAllMediaFiles()

      // Reset file input
      event.target.value = ''
    } catch (error) {
      showNotification({
        title: t('common.error'),
        message: t('cms.mediaSelector.errorUploadingFile'),
        color: 'red',
      })
    } finally {
      setUploading(false)
    }
  }

  /**
   * Create new folder
   */
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification({
        title: t('common.error'),
        message: t('cms.mediaPage.folderNameRequired'),
        color: 'red',
      })
      return
    }

    setCreatingFolder(true)
    try {
      const response = await fetch('/api/v2/media/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolder ?? undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showNotification({
          title: t('common.success'),
          message: t('cms.mediaSelector.folderCreatedSuccess'),
          color: 'green',
        })
        setCreateFolderModalOpened(false)
        setNewFolderName('')
        await loadAllMediaFolders()
      } else {
        throw new Error(data.message || t('cms.mediaSelector.failedToCreateFolder'))
      }
    } catch (error: any) {
      showNotification({
        title: t('common.error'),
        message: error.message || t('cms.mediaSelector.failedToCreateFolder'),
        color: 'red',
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  /**
   * Get folder path for breadcrumbs
   */
  const getFolderPath = (folderId: number | null): MediaFolder[] => {
    if (!folderId) return []
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return []
    return [...getFolderPath(folder.parentId ?? null), folder]
  }

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Check if file is image
   */
  const isImage = (mimeType?: string | null): boolean => {
    if (!mimeType) return false
    return mimeType.startsWith('image/')
  }

  /**
   * Handle opening preview modal - initialize editing fields
   */
  const handleOpenPreview = (file: MediaFile) => {
    setPreviewFile(file)
    setEditingFileName(file.filename || '')
    setEditingAltText(file.altText || '')
    setPreviewOpened(true)
  }

  /**
   * Handle save file changes (name and alt text)
   */
  const handleSaveFileChanges = async () => {
    if (!previewFile) return

    setSavingFileChanges(true)
    try {
      const response = await fetch(`/api/v2/media/files/${previewFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          filename: editingFileName,
          alt_text: editingAltText,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showNotification({
          title: t('common.success'),
          message: t('cms.mediaSelector.fileUpdateSuccess'),
          color: 'green',
        })

        // Update local state
        setPreviewFile({
          ...previewFile,
          filename: editingFileName,
          altText: editingAltText,
        })

        // Refresh files list
        await loadAllMediaFiles()
      } else {
        throw new Error(data.message || t('cms.mediaSelector.failedToUpdateFile'))
      }
    } catch (error: any) {
      showNotification({
        title: t('common.error'),
        message: error.message || t('cms.mediaSelector.failedToUpdateFile'),
        color: 'red',
      })
    } finally {
      setSavingFileChanges(false)
    }
  }

  /**
   * Handle delete single file
   */
  const handleDeleteFile = (mediaFile: MediaFile) => {
    modals.openConfirmModal({
      title: t('cms.mediaSelector.deleteSingleConfirm'),
      children: (
        <Text size="sm">
          {t('cms.mediaSelector.deleteSingleConfirmMessage')}
        </Text>
      ),
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await bulkDeleteMediaFiles([mediaFile.id])

          showNotification({
            title: t('common.success'),
            message: t('cms.mediaSelector.fileDeleted'),
            color: 'green',
          })

          // If the deleted file was in preview, close preview
          if (previewFile?.id === mediaFile.id) {
            setPreviewOpened(false)
            setPreviewFile(null)
          }

          // If the deleted file was selected, remove it from selection
          if (selectedFileIds.includes(mediaFile.id)) {
            setSelectedFileIds(selectedFileIds.filter(id => id !== mediaFile.id))
          }

          // Refresh files list
          await loadAllMediaFiles()
        } catch (error) {
          showNotification({
            title: t('common.error'),
            message: t('cms.mediaSelector.failedToDelete'),
            color: 'red',
          })
        }
      },
    })
  }

  /**
   * Handle bulk delete selected files
   */
  const handleBulkDelete = () => {
    if (selectedFileIds.length === 0) return

    modals.openConfirmModal({
      title: t('cms.mediaPage.deleteConfirm'),
      children: (
        <Text size="sm">
          {t('cms.mediaPage.deleteConfirmMessage', { count: selectedFileIds.length })}
        </Text>
      ),
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await bulkDeleteMediaFiles(selectedFileIds)

          showNotification({
            title: t('common.success'),
            message: t('cms.mediaSelector.filesDeleted'),
            color: 'green',
          })

          setSelectedFileIds([])
          await loadAllMediaFiles()
        } catch (error) {
          showNotification({
            title: t('common.error'),
            message: t('cms.mediaSelector.failedToDeleteFiles'),
            color: 'red',
          })
        }
      },
    })
  }

  /**
   * Handle bulk move selected files
   */
  const handleBulkMove = async () => {
    if (selectedFileIds.length === 0) return

    try {
      await bulkMoveMediaFiles(selectedFileIds, targetFolderId)

      showNotification({
        title: t('common.success'),
        message: t('cms.mediaSelector.filesMoved'),
        color: 'green',
      })

      setMoveModalOpened(false)
      setTargetFolderId(null)
      setSelectedFileIds([])
      await loadAllMediaFiles()
    } catch (error: any) {
      showNotification({
        title: t('common.error'),
        message: error.response?.data?.message || t('cms.mediaSelector.failedToMove'),
        color: 'red',
      })
    }
  }

  /**
   * Toggle selection of a media file
   */
  const toggleFileSelection = (mediaFileId: number) => {
    if (multiple) {
      // Multi-select mode for gallery
      if (selectedFileIds.includes(mediaFileId)) {
        setSelectedFileIds(selectedFileIds.filter((id) => id !== mediaFileId))
      } else {
        setSelectedFileIds([...selectedFileIds, mediaFileId])
      }
    } else {
      // Single-select mode for thumbnail
      setSelectedFileIds([mediaFileId])
    }
  }

  /**
   * Select/deselect all files
   */
  const toggleSelectAll = () => {
    if (selectedFileIds.length === filteredMediaFiles.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(filteredMediaFiles.map(f => f.id))
    }
  }

  /**
   * Confirm selection and call callback
   */
  const confirmSelection = () => {
    const selectedMediaFiles = mediaFiles.filter((file) =>
      selectedFileIds.includes(file.id)
    )

    if (selectedMediaFiles.length === 0) {
      showNotification({
        title: t('common.warning'),
        message: t('catalog.products.validation.thumbnailRequired'),
        color: 'yellow',
      })
      return
    }

    if (multiple && onSelectMultiple) {
      // Multiple selection for gallery
      onSelectMultiple(selectedMediaFiles)
    } else if (!multiple && onSelect) {
      // Single selection for thumbnail
      onSelect(selectedMediaFiles[0])
    }

    closeModalAndReset()
  }

  /**
   * Close modal and reset state
   */
  const closeModalAndReset = () => {
    setSelectedFileIds([])
    setSearchQuery('')
    setCurrentFolder(null)
    onClose()
  }

  /**
   * Filter media files by search query
   */
  const filterMediaFiles = (files: MediaFile[]) => {
    if (!searchQuery.trim()) {
      return files
    }

    const lowerCaseSearchQuery = searchQuery.toLowerCase()

    return files.filter((file) =>
      file.originalFilename?.toLowerCase().includes(lowerCaseSearchQuery) ||
      file.filename?.toLowerCase().includes(lowerCaseSearchQuery)
    )
  }

  /**
   * Filter folders by search query
   */
  const filterFolders = (folderList: MediaFolder[]) => {
    const subfolders = folderList.filter(f => f.parentId === currentFolder)
    if (!searchQuery.trim()) {
      return subfolders
    }
    return subfolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const filteredMediaFiles = filterMediaFiles(mediaFiles)
  const filteredFolders = filterFolders(folders)
  const allSelected = filteredMediaFiles.length > 0 && selectedFileIds.length === filteredMediaFiles.length

  return (
    <Modal
      opened={opened}
      onClose={closeModalAndReset}
      title={
        <Group gap="sm">
          <IconPhoto size={20} />
          <Text size="lg" fw={600}>
            {multiple ? t('cms.mediaSelector.titleMultiple') : t('cms.mediaSelector.title')}
          </Text>
        </Group>
      }
      size="xl"
    >
      <Stack gap="md">
        {/* Top action bar - EXACT same as CMS media page */}
        <Group justify="space-between">
          <Group gap="sm">
            {selectedFileIds.length > 0 && (
              <>
                <Button
                  variant="light"
                  color="gray"
                  size="sm"
                  onClick={() => setSelectedFileIds([])}
                >
                  {t('cms.mediaPage.clearSelection')} ({selectedFileIds.length})
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  size="sm"
                  leftSection={<IconArrowMoveRight size={16} />}
                  onClick={() => setMoveModalOpened(true)}
                >
                  {t('cms.mediaPage.moveFiles')}
                </Button>
                <Button
                  color="red"
                  size="sm"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleBulkDelete}
                >
                  {t('cms.mediaPage.delete')} ({selectedFileIds.length})
                </Button>
              </>
            )}
            <Button
              component="label"
              size="sm"
              leftSection={<IconUpload size={16} />}
              loading={uploading}
            >
              {t('cms.mediaSelector.uploadNewImage')}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleUploadNewImage}
              />
            </Button>
          </Group>

          <ActionIcon
            variant="light"
            size="lg"
            onClick={() => {
              loadAllMediaFolders()
              loadAllMediaFiles()
            }}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Group>

        {/* Folder Navigation - EXACT same as CMS media page */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Group gap="sm">
              <IconFolder size={20} c="blue" />
              <Breadcrumbs>
                <Anchor
                  size="sm"
                  onClick={() => {
                    setCurrentFolder(null)
                    setSelectedFileIds([])
                  }}
                  c={currentFolder === null ? 'blue' : 'dimmed'}
                >
                  {t('cms.mediaPage.allFiles')}
                </Anchor>
                {getFolderPath(currentFolder).map((folder) => (
                  <Anchor
                    key={folder.id}
                    size="sm"
                    onClick={() => {
                      setCurrentFolder(folder.id)
                      setSelectedFileIds([])
                    }}
                    c={currentFolder === folder.id ? 'blue' : 'dimmed'}
                  >
                    {folder.name}
                  </Anchor>
                ))}
              </Breadcrumbs>
            </Group>

            <Button
              size="xs"
              variant="light"
              leftSection={<IconFolderPlus size={14} />}
              onClick={() => setCreateFolderModalOpened(true)}
            >
              {t('cms.mediaPage.newFolder')}
            </Button>
          </Group>
        </Paper>

        {/* Search section - Same as CMS media page */}
        <Paper withBorder p="md" radius="md">
          <Group>
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder={t('cms.mediaSelector.searchImages')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              w={{ base: '100%', sm: 300 }}
              size="sm"
            />
          </Group>
        </Paper>

        {/* Select all checkbox for multi-select */}
        {multiple && filteredMediaFiles.length > 0 && (
          <Group gap="xs">
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
              label={t('cms.mediaPage.selectAll')}
            />
          </Group>
        )}

        {/* Media grid - Same layout as CMS media page */}
        <ScrollArea.Autosize mah={500}>
          {loading ? (
            <Text ta="center" c="dimmed" py="xl">{t('cms.mediaSelector.loadingMedia')}</Text>
          ) : filteredFolders.length === 0 && filteredMediaFiles.length === 0 ? (
            <Paper withBorder p="xl" style={{ textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack align="center" gap="sm">
                <IconPhoto size={48} style={{ color: '#ADB5BD' }} />
                <Text c="dimmed">
                  {searchQuery
                    ? t('cms.mediaSelector.noImagesSearch')
                    : t('cms.mediaSelector.noImages')}
                </Text>
                {!searchQuery && (
                  <Text size="xs" c="dimmed">
                    {t('cms.mediaSelector.uploadFirstImage')}
                  </Text>
                )}
              </Stack>
            </Paper>
          ) : (
            <Stack gap="md">
              {/* Folders - show subfolders of current folder */}
              {filteredFolders.length > 0 && (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
                  {filteredFolders.map((folder) => (
                    <Paper
                      key={folder.id}
                      withBorder
                      p="md"
                      radius="md"
                      pos="relative"
                    >
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            pos="absolute"
                            top={8}
                            right={8}
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          <Menu.Label>{t('cms.mediaPage.folderActions')}</Menu.Label>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              showNotification({
                                title: t('common.info'),
                                message: t('cms.mediaSelector.folderRenameNotImplemented'),
                                color: 'blue',
                              })
                            }}
                          >
                            {t('cms.mediaPage.rename')}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation()
                              showNotification({
                                title: t('common.info'),
                                message: t('cms.mediaSelector.folderDeleteNotImplemented'),
                                color: 'blue',
                              })
                            }}
                          >
                            {t('cms.mediaPage.deleteFolder')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>

                      <Stack
                        gap="xs"
                        align="center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setCurrentFolder(folder.id)
                          setSelectedFileIds([])
                        }}
                      >
                        <IconFolder size={40} c="blue" />
                        <Text size="sm" fw={500} ta="center" lineClamp={1}>
                          {folder.name}
                        </Text>
                        {folder.mediaFilesCount !== undefined && (
                          <Text size="xs" c="dimmed">
                            {folder.mediaFilesCount} {t('cms.mediaPage.filesCount')}
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}

              {/* Files Grid */}
              {filteredMediaFiles.length > 0 && (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
                  {filteredMediaFiles.map((mediaFile) => (
                    <Paper
                      key={mediaFile.id}
                      withBorder
                      p="xs"
                      radius="md"
                      pos="relative"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleFileSelection(mediaFile.id)}
                    >
                      {/* Checkbox - Same position as CMS media page */}
                      <Checkbox
                        checked={selectedFileIds.includes(mediaFile.id)}
                        style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFileSelection(mediaFile.id)
                        }}
                      />

                      {/* Image - Same height as CMS media page */}
                      <Image
                        src={mediaFile.url}
                        alt={mediaFile.originalFilename}
                        height={120}
                        fit="contain"
                        radius="md"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPreview(mediaFile)
                        }}
                        styles={{ image: { cursor: 'pointer' } }}
                      />

                      {/* Filename */}
                      <Text size="xs" mt="xs" lineClamp={1}>
                        {mediaFile.originalFilename || mediaFile.filename}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {mediaFile.size ? `${(mediaFile.size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </Text>
                    </Paper>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {/* Action buttons */}
        <Group justify="flex-end">
          <Button variant="default" onClick={closeModalAndReset}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmSelection}
            disabled={selectedFileIds.length === 0}
          >
            {multiple
              ? t('cms.mediaSelector.useSelectedFiles', { count: selectedFileIds.length })
              : t('cms.mediaSelector.useSelectedFile')}
          </Button>
        </Group>
      </Stack>

      {/* File Preview Modal */}
      <Modal
        opened={previewOpened}
        onClose={() => {
          setPreviewOpened(false)
          setPreviewFile(null)
        }}
        title={previewFile?.originalFilename || t('cms.mediaPage.preview')}
        size="xl"
        centered
      >
        {previewFile && (
          <Group gap="xl" align="flex-start">
            {/* Image Preview */}
            <Stack flex={1} align="center" gap="md">
              {isImage(previewFile.mimeType) ? (
                <Image
                  src={previewFile.url}
                  alt={previewFile.originalFilename}
                  maw="100%"
                  radius="md"
                />
              ) : (
                <Paper withBorder p="xl" w="100%">
                  <Group gap="xs">
                    <IconFile size={32} />
                    <Stack gap={0}>
                      <Text fw={500}>{previewFile.originalFilename}</Text>
                      <Text size="sm" c="dimmed">
                        {formatFileSize(previewFile.size)}
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              )}
            </Stack>

            {/* File Info Sidebar */}
            <Stack gap="md" style={{ minWidth: 300, maxWidth: 350 }}>
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Text className="text-base md:text-lg lg:text-xl" fw={600}>{t('cms.mediaPage.fileInformation')}</Text>

                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">{t('cms.mediaPage.originalName')}</Text>
                    <Text size="sm">{previewFile.originalFilename}</Text>
                  </Stack>

                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">{t('cms.mediaPage.fileSize')}</Text>
                    <Text size="sm">{formatFileSize(previewFile.size)}</Text>
                  </Stack>

                  {previewFile.width && previewFile.height && (
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">{t('cms.mediaPage.dimensions')}</Text>
                      <Text size="sm">{previewFile.width} × {previewFile.height} px</Text>
                    </Stack>
                  )}

                  {previewFile.mimeType && (
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">{t('cms.mediaPage.type')}</Text>
                      <Text size="sm">{previewFile.mimeType}</Text>
                    </Stack>
                  )}

                  <Stack gap="xs">
                    <Text size="xs" c="dimmed">{t('cms.mediaPage.uploaded')}</Text>
                    <Text size="sm">{new Date(previewFile.createdAt).toLocaleDateString()}</Text>
                  </Stack>
                </Stack>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Text className="text-base md:text-lg lg:text-xl" fw={600}>{t('cms.mediaPage.editDetails')}</Text>

                  <TextInput
                    label={t('cms.mediaPage.fileName')}
                    placeholder={t('cms.mediaPage.fileNamePlaceholder')}
                    value={editingFileName}
                    onChange={(e) => setEditingFileName(e.target.value)}
                  />

                  <TextInput
                    label={t('cms.mediaPage.altText')}
                    placeholder={t('cms.mediaPage.altTextPlaceholder')}
                    value={editingAltText}
                    onChange={(e) => setEditingAltText(e.target.value)}
                  />

                  <Group gap="sm">
                    <Button
                      onClick={handleSaveFileChanges}
                      loading={savingFileChanges}
                      disabled={!editingFileName.trim()}
                      flex={1}
                    >
                      {t('cms.mediaPage.saveChanges')}
                    </Button>
                    <Button
                      variant="light"
                      onClick={() => {
                        if (previewFile) {
                          setEditingFileName(previewFile.filename || '')
                          setEditingAltText(previewFile.altText || '')
                        }
                      }}
                    >
                      {t('cms.mediaPage.reset')}
                    </Button>
                  </Group>

                  <Button
                    color="red"
                    onClick={() => previewFile && handleDeleteFile(previewFile)}
                  >
                    {t('common.delete')}
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Group>
        )}
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        opened={createFolderModalOpened}
        onClose={() => {
          setCreateFolderModalOpened(false)
          setNewFolderName('')
        }}
        title={t('cms.mediaPage.createFolder')}
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label={t('cms.mediaPage.folderName')}
            placeholder={t('cms.mediaPage.folderNamePlaceholder')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
            autoFocus
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setCreateFolderModalOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateFolder} loading={creatingFolder}>
              {t('cms.mediaPage.createFolder')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Move Files Modal */}
      <Modal
        opened={moveModalOpened}
        onClose={() => {
          setMoveModalOpened(false)
          setTargetFolderId(null)
        }}
        title={t('cms.mediaPage.moveFiles', { count: selectedFileIds.length })}
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t('cms.mediaPage.selectDestination')}</Text>

          <Select
            placeholder={t('cms.mediaSelector.selectFolder')}
            data={[
              { value: '', label: t('cms.mediaPage.allFiles') },
              ...folders.map((folder) => ({
                value: folder.id.toString(),
                label: folder.name,
              })),
            ]}
            value={targetFolderId?.toString() ?? ''}
            onChange={(value) => setTargetFolderId(value ? Number(value) : null)}
            clearable
            searchable
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setMoveModalOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBulkMove} disabled={!targetFolderId && targetFolderId !== 0}>
              {t('cms.mediaPage.moveFiles')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  )
}
