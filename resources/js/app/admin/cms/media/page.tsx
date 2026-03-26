import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Paper,
  Button,
  Stack,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Image,
  Checkbox,
  Modal,
  SimpleGrid,
  Alert,
  Breadcrumbs,
  Anchor,
  Badge,
  Loader,
  rem,
  Menu,
  MultiSelect,
  Select,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconUpload,
  IconTrash,
  IconFolder,
  IconFolderPlus,
  IconPhoto,
  IconX,
  IconChevronRight,
  IconFile,
  IconDots,
  IconEdit,
  IconArrowMoveRight,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { usePermissions } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/AccessDenied'
import {
  getMediaFolders,
  createMediaFolder,
  getMediaFiles,
  uploadMediaFiles,
  bulkDeleteMediaFiles,
  bulkMoveMediaFiles,
  deleteMediaFolder,
  updateMediaFolder,
  type MediaFile,
  type MediaFolder,
} from '@/utils/api'

export default function MediaLibraryPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  // Page-level permission check
  if (!hasPermission('cms.media.view')) {
    return <AccessDenied message={t('cms.mediaPage.accessDenied')} />
  }

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [files, setFiles] = useState<MediaFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [folderModalOpened, setFolderModalOpened] = useState(false)
  const [previewOpened, setPreviewOpened] = useState(false)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [folderName, setFolderName] = useState('')
  const [renameModalOpened, setRenameModalOpened] = useState(false)
  const [folderToRename, setFolderToRename] = useState<MediaFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [moveModalOpened, setMoveModalOpened] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null)
  const [editingFileName, setEditingFileName] = useState('')
  const [editingAltText, setEditingAltText] = useState('')
  const [savingFileChanges, setSavingFileChanges] = useState(false)

  // Role permissions
  const [viewRoles, setViewRoles] = useState<string[]>([])
  const [editRoles, setEditRoles] = useState<string[]>([])

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'seller', label: 'Seller' },
    { value: 'store_keeper', label: 'Store Keeper' },
    { value: 'marketer', label: 'Marketer' },
    { value: 'supervisor', label: 'Supervisor' },
  ]

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    try {
      const response = await getMediaFolders()
      if (response?.status && Array.isArray(response.data)) {
        setFolders(response.data)
      } else if (Array.isArray(response)) {
        setFolders(response)
      }
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('cms.mediaPage.errorLoadingFolders'),
        color: 'red',
      })
    }
  }, [])

  // Fetch files
  const fetchFiles = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)

      const response = await getMediaFiles({
        folderId: currentFolder ?? undefined,
        page: 1,
        per_page: 100,
      })

      let filesData: MediaFile[] = []
      if (response?.status && response.data) {
        const data = response.data
        if (Array.isArray(data.data)) {
          filesData = data.data
        } else if (Array.isArray(data)) {
          filesData = data
        }
      } else if (Array.isArray(response)) {
        filesData = response
      }

      setFiles(filesData)
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('cms.mediaPage.errorLoading'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [currentFolder])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  useEffect(() => {
    fetchFiles(true)
  }, [fetchFiles])

  // Handle file selection
  const toggleFileSelection = (id: number) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedFiles(new Set(files.map((f) => f.id)))
  }

  const clearSelection = () => {
    setSelectedFiles(new Set())
  }

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      notifications.show({
        title: t('cms.mediaPage.validationError'),
        message: t('cms.mediaPage.folderNameRequired'),
        color: 'red',
      })
      return
    }

    try {
      const result = await createMediaFolder({
        name: folderName,
        parentId: currentFolder ?? undefined,
        viewRoles,
        editRoles,
      })

      notifications.show({
        title: t('cms.mediaPage.folderCreated'),
        message: t('cms.mediaPage.folderCreatedMessage'),
        color: 'green',
      })

      setFolderModalOpened(false)
      setFolderName('')
      setViewRoles([])
      setEditRoles([])
      await fetchFolders()
    } catch (error: any) {
      notifications.show({
        title: t('common.error'),
        message: error.response?.data?.message || t('cms.mediaPage.errorCreatingFolder'),
        color: 'red',
      })
    }
  }

  // Handle file upload
  const handleFileUpload = async (uploadedFiles: FileList) => {
    setUploading(true)
    try {
      await uploadMediaFiles(uploadedFiles, currentFolder ?? undefined)

      notifications.show({
        title: t('cms.mediaPage.filesUploaded'),
        message: t('cms.mediaPage.filesUploadedMessage', { count: uploadedFiles.length }),
        color: 'green',
      })

      await fetchFiles(false)
    } catch (error: any) {
      console.error('Upload error:', error)

      // Handle validation errors with detailed messages
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const errorMessages: string[] = []
        const failedFileIndices = new Set<number>()

        // Parse validation errors
        Object.keys(validationErrors).forEach(key => {
          // Extract file index from key (e.g., "files.0" -> 0, "files.2" -> 2)
          const match = key.match(/^files\.(\d+)(\..*)?$/)
          if (match) {
            const fileIndex = parseInt(match[1])
            failedFileIndices.add(fileIndex)
          }
        })

        // Build detailed error message
        if (failedFileIndices.size > 0) {
          const failedFiles = Array.from(failedFileIndices)
            .map(index => {
              const file = uploadedFiles[index]
              return file ? `• ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : `• File #${index + 1}`
            })
            .join('\n')

          errorMessages.push(`The following files failed to upload:\n${failedFiles}`)
        }

        // Check specific error types
        const hasMimeError = Object.keys(validationErrors).some(key => key.includes('mimes'))
        const hasSizeError = Object.keys(validationErrors).some(key => key.includes('max'))

        if (hasMimeError) {
          errorMessages.push('\n❌ Invalid file type')
          errorMessages.push('\n✅ Allowed formats:')
          errorMessages.push('   • Images: JPEG, PNG, GIF, SVG, WebP')
          errorMessages.push('   • Documents: PDF, DOC, DOCX, XLS, XLSX')
        }

        if (hasSizeError) {
          errorMessages.push('\n❌ File too large')
          errorMessages.push('\n✅ Maximum size: 10 MB per file')
        }

        // Show the detailed error in a modal for better readability
        modals.open({
          title: 'Upload Failed',
          children: (
            <Stack gap="sm">
              <Text size="sm" c="red" fw={500}>Some files could not be uploaded</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                {errorMessages.join('')}
              </Text>
              <Text size="xs" c="dimmed" mt="md">
                Please correct the issues and try again.
              </Text>
              <Button mt="md" onClick={() => modals.closeAll()}>
                Got it
              </Button>
            </Stack>
          ),
          size: 'lg',
          centered: true,
        })
      } else {
        // Fallback for other errors
        notifications.show({
          title: t('common.error'),
          message: error.response?.data?.message || t('cms.mediaPage.errorUploading'),
          color: 'red',
        })
      }
    } finally {
      setUploading(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return

    modals.openConfirmModal({
      title: t('cms.mediaPage.deleteConfirm'),
      children: (
        <Text className="text-sm md:text-base">
          {t('cms.mediaPage.deleteConfirmMessage', { count: selectedFiles.size })}
        </Text>
      ),
      labels: { confirm: t('cms.mediaPage.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await bulkDeleteMediaFiles(Array.from(selectedFiles))

          notifications.show({
            title: t('cms.mediaPage.filesDeleted'),
            message: t('cms.mediaPage.filesDeletedMessage', { count: selectedFiles.size }),
            color: 'green',
          })

          setSelectedFiles(new Set())
          await fetchFiles(false)
        } catch (error) {
          notifications.show({
            title: t('common.error'),
            message: t('cms.mediaPage.errorDeleting'),
            color: 'red',
          })
        }
      },
    })
  }

  // Handle bulk move
  const handleBulkMove = async () => {
    if (selectedFiles.size === 0) return

    try {
      await bulkMoveMediaFiles(Array.from(selectedFiles), targetFolderId)

      notifications.show({
        title: t('cms.mediaPage.filesMoved'),
        message: t('cms.mediaPage.filesMovedMessage', { count: selectedFiles.size }),
        color: 'green',
      })

      setMoveModalOpened(false)
      setTargetFolderId(null)
      setSelectedFiles(new Set())
      await fetchFiles(false)
    } catch (error: any) {
      notifications.show({
        title: t('cms.mediaPage.moveFailed'),
        message: error.response?.data?.message || t('cms.mediaPage.errorDeleting'),
        color: 'red',
      })
    }
  }

  // Handle save file changes (name and alt text)
  const handleSaveFileChanges = async () => {
    if (!previewFile) return

    setSavingFileChanges(true)
    try {
      // Call API to update file
      // Note: Backend endpoint exists at updateFile in MediaController
      await fetch(`/api/v2/media/files/${previewFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          filename: editingFileName,
          alt_text: editingAltText,
        }),
      }).then(res => res.json())

      notifications.show({
        title: t('cms.mediaPage.fileUpdated'),
        message: t('cms.mediaPage.fileUpdatedMessage'),
        color: 'green',
      })

      // Update local state
      setPreviewFile({
        ...previewFile,
        filename: editingFileName,
        altText: editingAltText,
      })

      // Refresh files list
      await fetchFiles(false)
    } catch (error: any) {
      notifications.show({
        title: t('cms.mediaPage.updateFailed'),
        message: error.response?.data?.message || t('cms.mediaPage.errorDeleting'),
        color: 'red',
      })
    } finally {
      setSavingFileChanges(false)
    }
  }

  // Handle opening preview modal - initialize editing fields
  const handleOpenPreview = (file: MediaFile) => {
    setPreviewFile(file)
    setEditingFileName(file.filename || '')
    setEditingAltText(file.altText || '')
    setPreviewOpened(true)
  }

  // Handle folder delete
  const handleDeleteFolder = (folder: MediaFolder) => {
    modals.openConfirmModal({
      title: t('cms.mediaPage.deleteFolder'),
      children: (
        <Stack gap="sm">
          <Text className="text-sm md:text-base">
            {t('cms.mediaPage.deleteFolderConfirm', { name: folder.name })}
          </Text>
          <Text className="text-xs md:text-sm" c="orange">
            {t('cms.mediaPage.deleteFolderWarning')}
          </Text>
        </Stack>
      ),
      labels: { confirm: t('cms.mediaPage.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMediaFolder(folder.id)

          notifications.show({
            title: t('cms.mediaPage.folderDeleted'),
            message: t('cms.mediaPage.folderDeletedMessage'),
            color: 'green',
          })

          // If we deleted the current folder, go to parent
          if (currentFolder === folder.id) {
            setCurrentFolder(folder.parentId ?? null)
          }

          await fetchFolders()
        } catch (error: any) {
          notifications.show({
            title: t('common.error'),
            message: error.response?.data?.message || t('cms.mediaPage.errorDeletingFolder'),
            color: 'red',
          })
        }
      },
    })
  }

  // Handle folder rename
  const handleRenameFolder = (folder: MediaFolder) => {
    setFolderToRename(folder)
    setNewFolderName(folder.name)
    setViewRoles(folder.viewRoles || [])
    setEditRoles(folder.editRoles || [])
    setRenameModalOpened(true)
  }

  const confirmRenameFolder = async () => {
    if (!folderToRename || !newFolderName.trim()) {
      notifications.show({
        title: t('cms.mediaPage.validationError'),
        message: t('cms.mediaPage.folderNameRequired'),
        color: 'red',
      })
      return
    }

    try {
      await updateMediaFolder(folderToRename.id, {
        name: newFolderName,
        viewRoles,
        editRoles,
      })

      notifications.show({
        title: t('cms.mediaPage.folderUpdated'),
        message: t('cms.mediaPage.folderUpdatedMessage'),
        color: 'green',
      })

      setRenameModalOpened(false)
      setFolderToRename(null)
      setNewFolderName('')
      setViewRoles([])
      setEditRoles([])
      await fetchFolders()
    } catch (error: any) {
      notifications.show({
        title: t('cms.mediaPage.updateFailed'),
        message: error.response?.data?.message || t('cms.mediaPage.errorUpdatingFolder'),
        color: 'red',
      })
    }
  }

  // Get folder path for breadcrumbs
  const getFolderPath = (folderId: number | null): MediaFolder[] => {
    if (!folderId) return []
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return []
    return [...getFolderPath(folder.parentId ?? null), folder]
  }

  // Get folder full path string
  const getFolderFullPath = (folderId: number | null): string => {
    const pathFolders = getFolderPath(folderId)
    return pathFolders.map(f => f.name).join(' / ')
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Check if file is image
  const isImage = (mimeType?: string | null): boolean => {
    if (!mimeType) return false
    return mimeType.startsWith('image/')
  }

  // Loading state
  if (loading) {
    return (
      <Stack p="xl" gap="md" align="center">
        <Loader size="xl" />
        <Text className="text-sm md:text-base" c="dimmed">{t('cms.mediaPage.loading')}</Text>
      </Stack>
    )
  }

  return (
    <Stack p="xl" gap="md" className="min-h-[calc(100vh-100px)]">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div className="flex-1">
          <Group gap="xs">
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
              {t('cms.mediaPage.title')}
            </Text>
          </Group>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('cms.mediaPage.subtitle')}
          </Text>
        </div>

        <Group gap="sm">
          {selectedFiles.size > 0 && (
            <>
              <Button
                variant="light"
                color="gray"
                size="sm"
                onClick={clearSelection}
              >
                {t('cms.mediaPage.clearSelection')} ({selectedFiles.size})
              </Button>
              {hasPermission('cms.media.files.move') && (
                <Button
                  variant="light"
                  color="blue"
                  size="sm"
                  leftSection={<IconArrowMoveRight size={16} />}
                  onClick={() => setMoveModalOpened(true)}
                >
                  {t('cms.mediaPage.moveFiles', { count: selectedFiles.size })}
                </Button>
              )}
              {hasPermission('cms.media.files.delete') && (
                <Button
                  color="red"
                  size="sm"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleBulkDelete}
                >
                  {t('cms.mediaPage.delete')} ({selectedFiles.size})
                </Button>
              )}
            </>
          )}

          {hasPermission('cms.media.files.upload') && (
            <Menu position="bottom-end">
              <Menu.Target>
                <Button
                  component="label"
                  size="sm"
                  leftSection={<IconUpload size={16} />}
                  loading={uploading}
                >
                  {t('cms.mediaPage.uploadFiles')}
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = e.target.files
                      if (files && files.length > 0) {
                        handleFileUpload(files)
                      }
                    }}
                  />
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>File Upload Guidelines</Menu.Label>
                <Menu.Item disabled>
                  <Stack gap={4}>
                    <Group gap={8}>
                      <Text size="xs" c="dimmed">✅ Allowed formats:</Text>
                    </Group>
                    <Text size="xs" pl={28} c="dimmed">Images: JPEG, PNG, GIF, SVG, WebP</Text>
                    <Text size="xs" pl={28} c="dimmed">Documents: PDF, DOC, DOCX, XLS, XLSX</Text>
                    <Group gap={8} mt={4}>
                      <Text size="xs" c="dimmed">📏 Max size: 10 MB per file</Text>
                    </Group>
                  </Stack>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}

          <ActionIcon
            variant="light"
            size="lg"
            onClick={() => {
              fetchFolders()
              fetchFiles(false)
            }}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Folder Navigation */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconFolder size={20} c="blue" />
            <Breadcrumbs>
              <Anchor
                size="sm"
                onClick={() => {
                  setCurrentFolder(null)
                  setSelectedFiles(new Set())
                }}
                c={currentFolder === null ? 'blue' : 'dimmed'}
              >
                {t('cms.mediaPage.allFiles')}
              </Anchor>
              {getFolderPath(currentFolder).map((folder, index, arr) => (
                <Anchor
                  key={folder.id}
                  size="sm"
                  onClick={() => {
                    setCurrentFolder(folder.id)
                    setSelectedFiles(new Set())
                  }}
                  c={currentFolder === folder.id ? 'blue' : 'dimmed'}
                >
                  {folder.name}
                </Anchor>
              ))}
            </Breadcrumbs>
          </Group>

          {hasPermission('cms.media.folders.create') && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconFolderPlus size={14} />}
              onClick={() => setFolderModalOpened(true)}
            >
              {t('cms.mediaPage.newFolder')}
            </Button>
          )}
        </Group>
      </Paper>

      {/* Search and Filters */}
      <Paper withBorder p="md" radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('cms.mediaPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w={{ base: '100%', sm: 300 }}
            size="sm"
          />
        </Group>
      </Paper>

      {/* Content */}
      <Stack gap="md" className="flex-1">
        {/* Folders - show subfolders of current folder */}
        {folders.filter(f => f.parentId === currentFolder).length > 0 && (
          <SimpleGrid
            cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
            spacing="md"
          >
            {folders
              .filter(f => f.parentId === currentFolder)
              .map((folder) => (
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
                    {hasPermission('cms.media.folders.edit') && (
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenameFolder(folder)
                        }}
                      >
                        {t('cms.mediaPage.rename')}
                      </Menu.Item>
                    )}
                    {hasPermission('cms.media.folders.delete') && (
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFolder(folder)
                        }}
                      >
                        {t('cms.mediaPage.deleteFolder')}
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>

                <Stack
                  gap="xs"
                  align="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setCurrentFolder(folder.id)
                    setSelectedFiles(new Set())
                  }}
                >
                  <IconFolder size={40} c="blue" />
                  <Text className="text-sm md:text-base" fw={500} ta="center" lineClamp={1}>
                    {folder.name}
                  </Text>
                  {folder.mediaFilesCount !== undefined && (
                    <Text className="text-xs md:text-sm" c="dimmed">
                      {folder.mediaFilesCount} {t('cms.mediaPage.files')}
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        )}

        {/* Files Grid */}
        {files.length > 0 ? (
          <>
            {selectedFiles.size > 0 && files.length > 0 && (
              <Group gap="xs">
                <Checkbox
                  checked={selectedFiles.size === files.length}
                  indeterminate={selectedFiles.size > 0 && selectedFiles.size < files.length}
                  onChange={() => {
                    selectedFiles.size === files.length ? clearSelection() : selectAll()
                  }}
                  label={t('cms.mediaPage.selectAll')}
                />
              </Group>
            )}

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
              {files
                .filter((file) => {
                  if (!debouncedSearch) return true
                  const query = debouncedSearch.toLowerCase()
                  return (
                    file.originalFilename.toLowerCase().includes(query) ||
                    file.filename.toLowerCase().includes(query)
                  )
                })
                .map((file) => (
                  <Paper
                    key={file.id}
                    withBorder
                    p="xs"
                    radius="md"
                    pos="relative"
                    style={{ cursor: 'pointer' }}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {isImage(file.mimeType) ? (
                      <Image
                        src={file.url}
                        alt={file.originalFilename}
                        height={120}
                        fit="contain"
                        radius="md"
                        onClick={() => handleOpenPreview(file)}
                        styles={{ image: { cursor: 'pointer' } }}
                      />
                    ) : (
                      <Stack
                        h={120}
                        align="center"
                        justify="center"
                        gap="xs"
                        onClick={() => handleOpenPreview(file)}
                      >
                        <IconFile size={40} c="dimmed" />
                        <Text size="xs" c="dimmed" lineClamp={2} ta="center">
                          {file.originalFilename}
                        </Text>
                      </Stack>
                    )}

                    <Text size="xs" c="dimmed" mt="xs" lineClamp={1}>
                      {file.originalFilename}
                    </Text>
                    <Group gap={4} mt={4}>
                      <Text size="xs" c="dimmed">
                        {formatFileSize(file.size)}
                      </Text>
                    </Group>
                  </Paper>
                ))}
            </SimpleGrid>
          </>
        ) : (
          <Alert variant="light" color="gray">
            <Text className="text-sm md:text-base" ta="center" c="dimmed">
              {t('cms.mediaPage.noFilesFound')}
            </Text>
          </Alert>
        )}
      </Stack>

      {/* Create Folder Modal */}
      <Modal
        opened={folderModalOpened}
        onClose={() => {
          setFolderModalOpened(false)
          setFolderName('')
          setViewRoles([])
          setEditRoles([])
        }}
        title={t('cms.mediaPage.createFolder')}
        size="sm"
        centered
      >
        <Stack gap="md">
          <TextInput
            label={t('cms.mediaPage.folderName')}
            placeholder={t('cms.mediaPage.folderNamePlaceholder')}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            required
            autoFocus
          />

          <MultiSelect
            label={t('cms.mediaPage.viewRoles')}
            placeholder={t('cms.mediaPage.viewRolesPlaceholder')}
            data={roleOptions}
            value={viewRoles}
            onChange={setViewRoles}
            clearable
          />

          <MultiSelect
            label={t('cms.mediaPage.editRoles')}
            placeholder={t('cms.mediaPage.editRolesPlaceholder')}
            data={roleOptions}
            value={editRoles}
            onChange={setEditRoles}
            clearable
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setFolderModalOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateFolder}>{t('cms.mediaPage.createFolder')}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        opened={renameModalOpened}
        onClose={() => {
          setRenameModalOpened(false)
          setFolderToRename(null)
          setNewFolderName('')
          setViewRoles([])
          setEditRoles([])
        }}
        title={t('cms.mediaPage.renameFolder')}
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

          <MultiSelect
            label={t('cms.mediaPage.viewRoles')}
            placeholder={t('cms.mediaPage.viewRolesPlaceholder')}
            data={roleOptions}
            value={viewRoles}
            onChange={setViewRoles}
            clearable
          />

          <MultiSelect
            label={t('cms.mediaPage.editRoles')}
            placeholder={t('cms.mediaPage.editRolesPlaceholder')}
            data={roleOptions}
            value={editRoles}
            onChange={setEditRoles}
            clearable
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setRenameModalOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmRenameFolder}>{t('cms.mediaPage.rename')}</Button>
          </Group>
        </Stack>
      </Modal>

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
                <Alert variant="light" w="100%">
                  <Group gap="xs">
                    <IconFile size={32} />
                    <Stack gap={0}>
                      <Text className="text-sm md:text-base" fw={500}>{previewFile.originalFilename}</Text>
                      <Text className="text-xs md:text-sm" c="dimmed">
                        {formatFileSize(previewFile.size)}
                      </Text>
                    </Stack>
                  </Group>
                </Alert>
              )}
            </Stack>

            {/* File Info Sidebar */}
            <Stack gap="md" className="min-w-[300px] max-w-[350px]">
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Text className="text-base md:text-lg lg:text-xl" fw={600}>{t('cms.mediaPage.fileInformation')}</Text>

                  <Stack gap="xs">
                    <Text className="text-xs md:text-sm" c="dimmed">{t('cms.mediaPage.originalName')}</Text>
                    <Text className="text-sm md:text-base">{previewFile.originalFilename}</Text>
                  </Stack>

                  <Stack gap="xs">
                    <Text className="text-xs md:text-sm" c="dimmed">{t('cms.mediaPage.fileSize')}</Text>
                    <Text className="text-sm md:text-base">{formatFileSize(previewFile.size)}</Text>
                  </Stack>

                  {previewFile.width && previewFile.height && (
                    <Stack gap="xs">
                      <Text className="text-xs md:text-sm" c="dimmed">{t('cms.mediaPage.dimensions')}</Text>
                      <Text className="text-sm md:text-base">{previewFile.width} × {previewFile.height} px</Text>
                    </Stack>
                  )}

                  {previewFile.mimeType && (
                    <Stack gap="xs">
                      <Text className="text-xs md:text-sm" c="dimmed">{t('cms.mediaPage.type')}</Text>
                      <Text className="text-sm md:text-base">{previewFile.mimeType}</Text>
                    </Stack>
                  )}

                  <Stack gap="xs">
                    <Text className="text-xs md:text-sm" c="dimmed">{t('cms.mediaPage.uploaded')}</Text>
                    <Text className="text-sm md:text-base">{new Date(previewFile.createdAt).toLocaleDateString()}</Text>
                  </Stack>
                </Stack>
              </Paper>

              {hasPermission('cms.media.files.edit') && (
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
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Group>
        )}
      </Modal>

      {/* Move Files Modal */}
      <Modal
        opened={moveModalOpened}
        onClose={() => {
          setMoveModalOpened(false)
          setTargetFolderId(null)
        }}
        title={t('cms.mediaPage.moveFiles', { count: selectedFiles.size })}
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text className="text-sm md:text-base">{t('cms.mediaPage.selectDestination')}</Text>

          <Select
            placeholder={t('cms.mediaPage.selectAll')}
            data={[
              { value: '', label: t('cms.mediaPage.allFiles') },
              ...folders.map((folder) => ({
                value: folder.id.toString(),
                label: getFolderFullPath(folder.id) || folder.name,
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
            <Button onClick={handleBulkMove}>
              {t('cms.mediaPage.moveFiles')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
