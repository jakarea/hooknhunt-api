import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Box,
} from '@mantine/core'
import {
  IconSearch,
  IconUpload,
  IconPhoto,
  IconRefresh,
  IconDots,
  IconFolder,
  IconFolderPlus,
  IconTrash,
  IconEdit,
  IconFile,
  IconArrowMoveRight,
} from '@tabler/icons-react'
import { showNotification } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useTranslation } from 'react-i18next'
import { useMediaStore, formatFileSize, filterFilesBySearch, filterFoldersByParent, getFolderPath, isImageFile } from '@/stores/mediaStore'
import { MediaFileCard } from '@/components/media-file-card'
import { deleteMediaFolder, updateMediaFolder } from '@/utils/api'
import type { MediaFile } from '@/utils/api'

// ─── Props ───────────────────────────────────────
interface MediaSelectorModalProps {
  opened: boolean
  onClose: () => void
  onSelect: (mediaFile: MediaFile) => void
  onSelectMultiple?: (mediaFiles: MediaFile[]) => void
  multiple?: boolean
  currentSelection?: number[]
}

// ─── Main Component ──────────────────────────────
export function MediaSelectorModal({
  opened,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
  currentSelection = [],
}: MediaSelectorModalProps) {
  const { t } = useTranslation()
  const store = useMediaStore()

  // Folder rename state
  const [folderToRename, setFolderToRename] = useState<{ id: number; name: string } | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  // Load data when modal opens or folder changes
  useEffect(() => {
    if (opened) {
      store.loadFolders()
      store.loadFiles()
      if (currentSelection.length > 0) {
        store.clearSelection()
        currentSelection.forEach((id) => store.toggleFileSelection(id, true))
      }
    }
  }, [opened, store.currentFolder])

  // Reset on close
  const handleClose = useCallback(() => {
    store.resetState()
    onClose()
  }, [onClose])

  // ─── Derived data ────────────────────────────
  const filteredFiles = useMemo(
    () => filterFilesBySearch(store.files, store.searchQuery),
    [store.files, store.searchQuery],
  )

  const filteredFolders = useMemo(
    () => filterFoldersByParent(store.folders, store.currentFolder, store.searchQuery),
    [store.folders, store.currentFolder, store.searchQuery],
  )

  const allSelected = filteredFiles.length > 0 && store.selectedFileIds.length === filteredFiles.length

  // ─── Handlers ────────────────────────────────
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      await store.uploadFiles(files, store.currentFolder)
      e.target.value = ''
    },
    [store.currentFolder],
  )

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      store.clearSelection()
    } else {
      store.selectAll(filteredFiles.map((f) => f.id))
    }
  }, [allSelected, filteredFiles])

  const handleConfirm = useCallback(() => {
    const selected = store.files.filter((f) => store.selectedFileIds.includes(f.id))
    if (selected.length === 0) {
      showNotification({ title: t('common.warning'), message: t('catalog.products.validation.thumbnailRequired'), color: 'yellow' })
      return
    }
    if (multiple && onSelectMultiple) onSelectMultiple(selected)
    else if (!multiple && onSelect) onSelect(selected[0])
    handleClose()
  }, [store.files, store.selectedFileIds, multiple, onSelectMultiple, onSelect, handleClose])

  // Handle Enter key to confirm selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && opened && store.selectedFileIds.length > 0) {
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [opened, store.selectedFileIds, handleConfirm])

  const handleBulkDelete = useCallback(() => {
    if (store.selectedFileIds.length === 0) return
    modals.openConfirmModal({
      title: t('cms.mediaPage.deleteConfirm'),
      children: <Text size="sm">{t('cms.mediaPage.deleteConfirmMessage', { count: store.selectedFileIds.length })}</Text>,
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => store.deleteFiles(store.selectedFileIds),
    })
  }, [store.selectedFileIds])

  const handleCreateFolder = useCallback(async () => {
    if (!store.newFolderName.trim()) {
      showNotification({ title: t('common.error'), message: t('cms.mediaPage.folderNameRequired'), color: 'red' })
      return
    }
    await store.createFolder(store.newFolderName, store.currentFolder)
  }, [store.newFolderName, store.currentFolder])

  const handleBulkMove = useCallback(async () => {
    const ids = store.singleActionFileIds.length > 0 ? store.singleActionFileIds : store.selectedFileIds
    if (ids.length === 0) return
    await store.moveFiles(ids, store.targetFolderId)
  }, [store.singleActionFileIds, store.selectedFileIds, store.targetFolderId])

  const handleRefresh = useCallback(() => {
    store.loadFolders()
    store.invalidateCache()
    store.loadFiles()
  }, [store])

  // Folder rename handler
  const handleRenameFolder = useCallback((folder: { id: number; name: string }) => {
    setFolderToRename(folder)
  }, [])

  const confirmRenameFolder = useCallback(async (name: string) => {
    if (!folderToRename || !name.trim()) {
      showNotification({ title: t('cms.mediaPage.validationError'), message: t('cms.mediaPage.folderNameRequired'), color: 'red' })
      return
    }

    try {
      await updateMediaFolder(folderToRename.id, { name })
      showNotification({ title: t('cms.mediaPage.folderUpdated'), message: t('cms.mediaPage.folderUpdatedMessage'), color: 'green' })
      setFolderToRename(null)
      store.loadFolders()
    } catch (error: any) {
      showNotification({ title: t('cms.mediaPage.updateFailed'), message: error.response?.data?.message || t('cms.mediaPage.errorUpdatingFolder'), color: 'red' })
    }
  }, [folderToRename, t, store])

  // Folder delete handler
  const handleDeleteFolder = useCallback((folder: { id: number; name: string }) => {
    modals.openConfirmModal({
      title: t('cms.mediaPage.deleteFolder'),
      children: (
        <Stack gap="sm">
          <Text size="sm">{t('cms.mediaPage.deleteFolderConfirm', { name: folder.name })}</Text>
          <Text size="xs" c="orange">{t('cms.mediaPage.deleteFolderWarning')}</Text>
        </Stack>
      ),
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMediaFolder(folder.id)
          showNotification({ title: t('cms.mediaPage.folderDeleted'), message: t('cms.mediaPage.folderDeletedMessage'), color: 'green' })
          if (store.currentFolder === folder.id) {
            store.setCurrentFolder(null)
          }
          store.loadFolders()
        } catch (error: any) {
          const errorMessage = error.response?.data?.errors?.message || error.response?.data?.message || t('cms.mediaPage.errorDeletingFolder')
          const filesCount = error.response?.data?.errors?.filesCount ?? 0
          const subfoldersCount = error.response?.data?.errors?.subfoldersCount ?? 0

          showNotification({
            title: t('common.error'),
            message: (
              <Stack gap="xs">
                <Text>{errorMessage}</Text>
                {(filesCount > 0 || subfoldersCount > 0) && (
                  <Text size="sm" c="dimmed">
                    {filesCount > 0 && `${filesCount} file${filesCount > 1 ? 's' : ''}`}
                    {filesCount > 0 && subfoldersCount > 0 && ' and '}
                    {subfoldersCount > 0 && `${subfoldersCount} subfolder${subfoldersCount > 1 ? 's' : ''}`}
                  </Text>
                )}
              </Stack>
            ),
            color: 'red',
          })
        }
      },
    })
  }, [t, store])

  // ─── File action handlers (for MediaFileCard) ─
  const fileActions = useMemo(
    () => ({
      onPreview: (file: MediaFile) => store.openPreview(file),
      onEdit: (file: MediaFile) => store.openPreview(file),
      onCopy: (file: MediaFile) => {
        navigator.clipboard.writeText(file.url)
        notifications.show({
          title: t('cms.mediaPage.urlCopied'),
          message: t('cms.mediaPage.urlCopiedMessage'),
          color: 'green',
        })
      },
      onDelete: (file: MediaFile) => {
        modals.openConfirmModal({
          title: t('cms.mediaSelector.deleteSingleConfirm'),
          children: <Text size="sm">{t('cms.mediaSelector.deleteSingleConfirmMessage')}</Text>,
          labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
          confirmProps: { color: 'red' },
          onConfirm: () => store.deleteFiles([file.id]),
        })
      },
      onMove: (file: MediaFile) => store.openMoveModal([file.id]),
    }),
    [t, store],
  )

  // ─── Move file count for modal title ──────────
  const moveFileCount = store.singleActionFileIds.length > 0
    ? store.singleActionFileIds.length
    : store.selectedFileIds.length

  return (
    <Modal opened={opened} onClose={handleClose} size="90%"
      title={
        <Group gap="sm">
          <IconPhoto size={20} />
          <Text size="lg" fw={600}>
            {multiple ? t('cms.mediaSelector.titleMultiple') : t('cms.mediaSelector.title')}
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Action bar */}
        <Group justify="space-between">
          <Group gap="sm">
            {store.selectedFileIds.length > 0 && (
              <>
                <Button variant="light" color="gray" size="sm" onClick={() => store.clearSelection()}>
                  {t('cms.mediaPage.clearSelection')} ({store.selectedFileIds.length})
                </Button>
                <Button variant="light" color="blue" size="sm" leftSection={<IconArrowMoveRight size={16} />} onClick={() => store.openMoveModal()}>
                  {t('cms.mediaPage.moveFiles')}
                </Button>
                <Button color="red" size="sm" leftSection={<IconTrash size={16} />} onClick={handleBulkDelete}>
                  {t('cms.mediaPage.delete')} ({store.selectedFileIds.length})
                </Button>
              </>
            )}
            <Button component="label" size="sm" leftSection={<IconUpload size={16} />} loading={store.uploading}>
              {t('cms.mediaSelector.uploadNewImage')}
              <input type="file" hidden multiple accept="image/*" onChange={handleUpload} />
            </Button>
          </Group>
          <ActionIcon variant="light" size="lg" onClick={handleRefresh}>
            <IconRefresh size={20} />
          </ActionIcon>
        </Group>

        {/* Folder nav */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Group gap="sm">
              <IconFolder size={20} c="blue" />
              <Breadcrumbs>
                <Anchor size="sm" onClick={() => store.setCurrentFolder(null)} c={store.currentFolder === null ? 'blue' : 'dimmed'}>
                  {t('cms.mediaPage.allFiles')}
                </Anchor>
                {getFolderPath(store.folders, store.currentFolder).map((folder) => (
                  <Anchor key={folder.id} size="sm" onClick={() => store.setCurrentFolder(folder.id)} c={store.currentFolder === folder.id ? 'blue' : 'dimmed'}>
                    {folder.name}
                  </Anchor>
                ))}
              </Breadcrumbs>
            </Group>
            <Button size="xs" variant="light" leftSection={<IconFolderPlus size={14} />} onClick={() => store.openCreateFolderModal()}>
              {t('cms.mediaPage.newFolder')}
            </Button>
          </Group>
        </Paper>

        {/* Search */}
        <Paper withBorder p="md" radius="md">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('cms.mediaSelector.searchImages')}
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.currentTarget.value)}
            w={{ base: '100%', sm: 300 }}
            size="sm"
          />
        </Paper>

        {/* Select all */}
        {multiple && filteredFiles.length > 0 && (
          <Group gap="xs">
            <Checkbox checked={allSelected} onChange={handleSelectAll} label={t('cms.mediaPage.selectAll')} />
          </Group>
        )}

        {/* Grid */}
        <ScrollArea.Autosize
          mah={500}
          viewportProps={{
            onScroll: (e: React.UIEvent<HTMLDivElement>) => {
              const target = e.target as HTMLDivElement
              const { scrollTop, scrollHeight, clientHeight } = target
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
              if (isNearBottom && !store.loading && !store.loadingMore && store.hasMoreFiles) {
                store.loadMoreFiles()
              }
            }
          }}
        >
          {store.loading ? (
            <Text ta="center" c="dimmed" py="xl">{t('cms.mediaSelector.loadingMedia')}</Text>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <EmptyState searchQuery={store.searchQuery} />
          ) : (
            <Stack gap="md">
              {/* Folders */}
              {filteredFolders.length > 0 && (
                <SimpleGrid cols={{ base: 2, sm: 4, md: 6, lg: 8 }} spacing="md">
                  {filteredFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => store.setCurrentFolder(folder.id)}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </SimpleGrid>
              )}

              {/* Files */}
              {filteredFiles.length > 0 && (
                <>
                  <SimpleGrid cols={{ base: 2, sm: 4, md: 6, lg: 8 }} spacing="md">
                    {filteredFiles.map((file) => (
                      <MediaFileCard
                        key={file.id}
                        file={file}
                        isSelected={store.selectedFileIds.includes(file.id)}
                        onSelect={() => store.toggleFileSelection(file.id, multiple)}
                        onPreview={() => fileActions.onPreview(file)}
                        onEdit={() => fileActions.onEdit(file)}
                        onCopy={() => fileActions.onCopy(file)}
                        onDelete={() => fileActions.onDelete(file)}
                        onMove={() => fileActions.onMove(file)}
                      />
                    ))}
                  </SimpleGrid>
                  {store.loadingMore && (
                    <Group justify="center" py="md">
                      <IconRefresh size={16} className="animate-spin" />
                      <Text size="sm" c="dimmed">Loading more...</Text>
                    </Group>
                  )}
                </>
              )}
            </Stack>
          )}
        </ScrollArea.Autosize>

        {/* Confirm buttons */}
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={store.selectedFileIds.length === 0}>
            {multiple ? t('cms.mediaSelector.useSelectedFiles', { count: store.selectedFileIds.length }) : t('cms.mediaSelector.useSelectedFile')}
            {store.selectedFileIds.length > 0 && <Text size="xs" ml="xs" c="dimmed">(Enter)</Text>}
          </Button>
        </Group>
      </Stack>

      {/* Preview sub-modal */}
      <FilePreviewModal />
      {/* Create folder sub-modal */}
      <CreateFolderSubModal onConfirm={handleCreateFolder} />
      {/* Rename folder sub-modal */}
      <RenameFolderSubModal
        folder={folderToRename}
        onConfirm={confirmRenameFolder}
        onCancel={() => {
          setFolderToRename(null)
          setNewFolderName('')
        }}
      />
      {/* Move files sub-modal */}
      <MoveFilesSubModal fileCount={moveFileCount} onConfirm={handleBulkMove} />
    </Modal>
  )
}

// ─── Sub-components ──────────────────────────────

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <Paper withBorder p="xl" style={{ textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack align="center" gap="sm">
        <IconPhoto size={48} style={{ color: '#ADB5BD' }} />
        <Text c="dimmed">{searchQuery ? 'No images found' : 'No images yet'}</Text>
        {!searchQuery && <Text size="xs" c="dimmed">Upload your first image</Text>}
      </Stack>
    </Paper>
  )
}

function FolderCard({ folder, onClick, onRename, onDelete }: {
  folder: { id: number; name: string; mediaFilesCount?: number }
  onClick: () => void
  onRename: (folder: { id: number; name: string }) => void
  onDelete: (folder: { id: number; name: string }) => void
}) {
  const { t } = useTranslation()

  return (
    <Paper withBorder p="md" radius="md" pos="relative">
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon pos="absolute" top={8} right={8} size="sm" variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{t('cms.mediaPage.folderActions')}</Menu.Label>
          <Menu.Item
            leftSection={<IconEdit size={14} />}
            onClick={(e) => {
              e.stopPropagation()
              onRename(folder)
            }}
          >
            {t('cms.mediaPage.rename')}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folder)
            }}
          >
            {t('cms.mediaPage.deleteFolder')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Stack gap="xs" align="center" style={{ cursor: 'pointer' }} onClick={onClick}>
        <IconFolder size={40} c="blue" />
        <Text size="sm" fw={500} ta="center" lineClamp={1}>{folder.name}</Text>
        {folder.mediaFilesCount !== undefined && <Text size="xs" c="dimmed">{folder.mediaFilesCount} {t('cms.mediaPage.files')}</Text>}
      </Stack>
    </Paper>
  )
}

function FilePreviewModal() {
  const store = useMediaStore()
  const { t } = useTranslation()
  const file = store.previewFile

  return (
    <Modal opened={store.previewOpened} onClose={store.closePreview} title={file?.originalFilename || t('cms.mediaPage.preview')} size="xl" centered>
      {file && (
        <Group gap="xl" align="flex-start">
          <Stack flex={1} align="center" gap="md">
            {isImageFile(file.mimeType) ? (
              <Image src={file.url} alt={file.originalFilename} maw="100%" radius="md" />
            ) : (
              <Paper withBorder p="xl" w="100%">
                <Group gap="xs">
                  <IconFile size={32} />
                  <Stack gap={0}>
                    <Text fw={500}>{file.filename || file.originalFilename}</Text>
                    <Text size="sm" c="dimmed">{formatFileSize(file.size)}</Text>
                  </Stack>
                </Group>
              </Paper>
            )}
          </Stack>

          <Stack gap="md" style={{ minWidth: 300, maxWidth: 350 }}>
            {/* Info */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={600}>File Information</Text>
                <Stack gap="xs"><Text size="xs" c="dimmed">Name</Text><Text size="sm">{file.filename || file.originalFilename}</Text></Stack>
                <Stack gap="xs"><Text size="xs" c="dimmed">Size</Text><Text size="sm">{formatFileSize(file.size)}</Text></Stack>
                {file.width && file.height && <Stack gap="xs"><Text size="xs" c="dimmed">Dimensions</Text><Text size="sm">{file.width} x {file.height} px</Text></Stack>}
                {file.mimeType && <Stack gap="xs"><Text size="xs" c="dimmed">Type</Text><Text size="sm">{file.mimeType}</Text></Stack>}
                <Stack gap="xs"><Text size="xs" c="dimmed">Uploaded</Text><Text size="sm">{new Date(file.createdAt).toLocaleDateString()}</Text></Stack>
              </Stack>
            </Paper>

            {/* Edit */}
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={600}>Edit Details</Text>
                <TextInput label="File name" value={store.editingFileName} onChange={(e) => store.setEditingFileName(e.target.value)} />
                <TextInput label="Alt text" value={store.editingAltText} onChange={(e) => store.setEditingAltText(e.target.value)} />
                <Group gap="sm">
                  <Button onClick={store.saveFileChanges} loading={store.savingFileChanges} disabled={!store.editingFileName.trim()} flex={1}>Save</Button>
                  <Button variant="light" onClick={store.resetEditingFields}>Reset</Button>
                </Group>
                <Button color="red" onClick={() => { store.closePreview(); store.deleteFiles([file.id]) }}>Delete</Button>
              </Stack>
            </Paper>
          </Stack>
        </Group>
      )}
    </Modal>
  )
}

function CreateFolderSubModal({ onConfirm }: { onConfirm: () => void }) {
  const store = useMediaStore()
  const { t } = useTranslation()

  return (
    <Modal opened={store.createFolderModalOpened} onClose={store.closeCreateFolderModal} title={t('cms.mediaPage.createFolder')} size="sm" centered>
      <Stack gap="md">
        <TextInput label={t('cms.mediaPage.folderName')} placeholder={t('cms.mediaPage.folderNamePlaceholder')} value={store.newFolderName} onChange={(e) => store.setNewFolderName(e.target.value)} required autoFocus />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={store.closeCreateFolderModal}>{t('common.cancel')}</Button>
          <Button onClick={onConfirm} loading={store.creatingFolder}>{t('cms.mediaPage.createFolder')}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function RenameFolderSubModal({ folder, onConfirm, onCancel }: {
  folder: { id: number; name: string } | null
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(folder?.name || '')

  useEffect(() => {
    setName(folder?.name || '')
  }, [folder])

  return (
    <Modal opened={!!folder} onClose={onCancel} title={t('cms.mediaPage.renameFolder')} size="sm" centered>
      <Stack gap="md">
        <TextInput
          label={t('cms.mediaPage.folderName')}
          placeholder={t('cms.mediaPage.folderName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button onClick={() => onConfirm(name)}>{t('cms.mediaPage.renameFolder')}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function MoveFilesSubModal({ fileCount, onConfirm }: { fileCount: number; onConfirm: () => void }) {
  const store = useMediaStore()
  const { t } = useTranslation()

  // Use 'root' as a special value for root folder (null)
  const selectValue = store.targetFolderId === null ? 'root' : store.targetFolderId?.toString() ?? ''

  return (
    <Modal opened={store.moveModalOpened} onClose={store.closeMoveModal} title={t('cms.mediaPage.moveFiles', { count: fileCount })} size="sm" centered>
      <Stack gap="md">
        <Text size="sm">{t('cms.mediaPage.selectDestination')}</Text>
        <Select
          placeholder={t('cms.mediaSelector.selectFolder')}
          data={[
            { value: 'root', label: t('cms.mediaPage.allFiles') },
            ...store.folders.map((f) => ({ value: f.id.toString(), label: f.name })),
          ]}
          value={selectValue}
          onChange={(v) => store.setTargetFolderId(v === 'root' ? null : (v ? Number(v) : null))}
          searchable
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={store.closeMoveModal}>{t('common.cancel')}</Button>
          <Button onClick={onConfirm}>{t('cms.mediaPage.moveFiles')}</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
