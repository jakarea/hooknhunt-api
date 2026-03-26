import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Modal,
  Group,
  Stack,
  SimpleGrid,
  Image,
  Text,
  ActionIcon,
  Box,
  ScrollArea,
  TextInput,
  LoadingOverlay,
  Alert,
} from '@mantine/core'
import { IconPhoto, IconUpload, IconX, IconSearch, IconCheck } from '@tabler/icons-react'
import { showNotification } from '@mantine/notifications'
import api from '@/lib/api'

interface MediaFile {
  id: number
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  url: string
}

interface MediaSelectorProps {
  opened: boolean
  onClose: () => void
  onSelect: (mediaFile: MediaFile) => void
  onSelectMultiple?: (mediaFiles: MediaFile[]) => void
  multiple?: boolean
  currentSelection?: number[]
}

/**
 * WordPress-style Media Library Selector
 *
 * Allows users to:
 * - Upload new images to media library
 * - Browse existing media files
 * - Select single or multiple images
 * - Search and filter media
 */
export function MediaSelector({
  opened,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
  currentSelection = [],
}: MediaSelectorProps) {
  const { t } = useTranslation()

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<number[]>(currentSelection)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load media files when modal opens
  useEffect(() => {
    if (opened) {
      load_all_media_files_from_library()
      setSelectedFiles(currentSelection)
    }
  }, [opened, currentSelection])

  /**
   * Load all media files from the media library
   */
  const load_all_media_files_from_library = async () => {
    setLoading(true)
    try {
      const response = await api.get('/media/files', {
        params: {
          per_page: 100,
        },
      })

      if (response.data && response.data.data) {
        setMediaFiles(response.data.data)
      }
    } catch (error) {
      show_notification_for_error_loading_media_files()
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle file upload to media library
   */
  const handle_upload_new_image_to_media_library = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    setUploading(true)

    try {
      const file = files[0]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder_id', '') // Root folder

      await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      show_notification_for_successful_upload()

      // Reload media files to show newly uploaded image
      await load_all_media_files_from_library()

      // Reset file input
      event.target.value = ''
    } catch (error) {
      show_notification_for_upload_error()
    } finally {
      setUploading(false)
    }
  }

  /**
   * Toggle selection of a media file
   */
  const toggle_selection_of_media_file = (mediaFileId: number) => {
    if (multiple) {
      // Multi-select mode
      if (selectedFiles.includes(mediaFileId)) {
        setSelectedFiles(selectedFiles.filter((id) => id !== mediaFileId))
      } else {
        setSelectedFiles([...selectedFiles, mediaFileId])
      }
    } else {
      // Single-select mode
      setSelectedFiles([mediaFileId])
    }
  }

  /**
   * Confirm selection and close modal
   */
  const confirm_selection_of_media_files = () => {
    const selectedMediaFiles = mediaFiles.filter((file) =>
      selectedFiles.includes(file.id)
    )

    if (selectedMediaFiles.length === 0) {
      show_notification_for_no_selection()
      return
    }

    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedMediaFiles)
    } else if (!multiple && onSelect) {
      onSelect(selectedMediaFiles[0])
    }

    close_modal_and_reset_selection()
  }

  /**
   * Close modal and reset state
   */
  const close_modal_and_reset_selection = () => {
    setSelectedFiles([])
    setSearchQuery('')
    onClose()
  }

  /**
   * Filter media files by search query
   */
  const filter_media_files_by_search_query = (files: MediaFile[]) => {
    if (!searchQuery.trim()) {
      return files
    }

    const lowerCaseSearchQuery = searchQuery.toLowerCase()

    return files.filter((file) =>
      file.file_name.toLowerCase().includes(lowerCaseSearchQuery)
    )
  }

  /**
   * Format file size for display
   */
  const format_file_size_in_human_readable_format = (bytes: number): string => {
    if (bytes === 0) {
      return '0 Bytes'
    }

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Show notification functions
  const show_notification_for_error_loading_media_files = () => {
    showNotification({
      title: t('common.error'),
      message: 'Failed to load media files',
      color: 'red',
    })
  }

  const show_notification_for_successful_upload = () => {
    showNotification({
      title: t('common.success'),
      message: 'Image uploaded successfully',
      color: 'green',
    })
  }

  const show_notification_for_upload_error = () => {
    showNotification({
      title: t('common.error'),
      message: 'Failed to upload image',
      color: 'red',
    })
  }

  const show_notification_for_no_selection = () => {
    showNotification({
      title: t('common.warning'),
      message: 'Please select an image',
      color: 'yellow',
    })
  }

  const filteredMediaFiles = filter_media_files_by_search_query(mediaFiles)

  return (
    <Modal
      opened={opened}
      onClose={close_modal_and_reset_selection}
      title={multiple ? 'Select Images' : 'Select Image'}
      size="xl"
      withinPortal
    >
      <Stack gap="md">
        {/* Upload button */}
        <Group justify="space-between">
          <Button
            leftSection={<IconUpload size={16} />}
            component="label"
            loading={uploading}
          >
            Upload New Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handle_upload_new_image_to_media_library}
            />
          </Button>

          <TextInput
            placeholder="Search images..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flex: 1 }}
            maxWidth={400}
          />
        </Group>

        {/* Media grid */}
        <Box pos="relative">
          <LoadingOverlay visible={loading} overlayBlur={2} />

          {filteredMediaFiles.length === 0 ? (
            <Alert variant="light" color="blue" title="No images found">
              {searchQuery
                ? 'No images match your search'
                : 'No images in media library. Upload your first image above.'}
            </Alert>
          ) : (
            <ScrollArea.Autosize mah={500}>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {filteredMediaFiles.map((mediaFile) => (
                  <MediaFileCard
                    key={mediaFile.id}
                    mediaFile={mediaFile}
                    isSelected={selectedFiles.includes(mediaFile.id)}
                    onSelect={() => toggle_selection_of_media_file(mediaFile.id)}
                    formatFileSize={format_file_size_in_human_readable_format}
                  />
                ))}
              </SimpleGrid>
            </ScrollArea.Autosize>
          )}
        </Box>

        {/* Action buttons */}
        <Group justify="flex-end">
          <Button variant="default" onClick={close_modal_and_reset_selection}>
            Cancel
          </Button>
          <Button
            onClick={confirm_selection_of_media_files}
            disabled={selectedFiles.length === 0}
          >
            {multiple
              ? `Select ${selectedFiles.length} Images`
              : 'Select Image'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

interface MediaFileCardProps {
  mediaFile: MediaFile
  isSelected: boolean
  onSelect: () => void
  formatFileSize: (bytes: number) => string
}

/**
 * Single media file card component
 */
function MediaFileCard({
  mediaFile,
  isSelected,
  onSelect,
  formatFileSize,
}: MediaFileCardProps) {
  return (
    <Box
      pos="relative"
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      {/* Image preview */}
      <Box
        pos="relative"
        style={{
          borderWidth: isSelected ? '3px' : '1px',
          borderColor: isSelected ? '#228BE6' : '#E9ECEF',
          borderRadius: '8px',
          overflow: 'hidden',
          aspectRatio: '1',
        }}
      >
        <Image
          src={mediaFile.url}
          alt={mediaFile.file_name}
          height="100%"
          width="100%"
          fit="cover"
        />

        {/* Selection indicator */}
        {isSelected && (
          <Box
            pos="absolute"
            top={8}
            right={8}
            style={{
              backgroundColor: '#228BE6',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCheck size={14} color="white" />
          </Box>
        )}
      </Box>

      {/* File info */}
      <Text size="xs" mt="xs" lineClamp={1}>
        {mediaFile.file_name}
      </Text>
      <Text size="xs" c="dimmed">
        {formatFileSize(mediaFile.file_size)}
      </Text>
    </Box>
  )
}
