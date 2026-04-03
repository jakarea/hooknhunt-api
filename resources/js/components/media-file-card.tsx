import {
  Paper,
  Image,
  Text,
  Box,
  ActionIcon,
  Menu,
} from '@mantine/core'
import {
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
  IconCheck,
  IconArrowMoveRight,
} from '@tabler/icons-react'
import type { MediaFile } from '@/utils/api'

interface MediaFileCardProps {
  file: MediaFile
  isSelected: boolean
  onSelect: () => void
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: () => void
}

export function MediaFileCard({
  file,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
  onDelete,
  onMove,
}: MediaFileCardProps) {
  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      pos="relative"
      style={{
        cursor: 'pointer',
        outline: isSelected
          ? '2px solid var(--mantine-color-blue-filled)'
          : '2px solid transparent',
        outlineOffset: '-2px',
      }}
      onClick={onSelect}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <Box
          pos="absolute"
          top={6}
          left={6}
          bg="blue"
          style={{
            borderRadius: '50%',
            zIndex: 10,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconCheck size={12} color="white" />
        </Box>
      )}

      {/* 3-dot menu */}
      <Box pos="absolute" top={4} right={4} style={{ zIndex: 10 }}>
        <Menu position="bottom-end" withinPortal shadow="md">
          <Menu.Target>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              bg="white"
              radius="xl"
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={14} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />} onClick={(e) => { e.stopPropagation(); onPreview() }}>
              Preview
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={(e) => { e.stopPropagation(); onEdit() }}>
              Edit
            </Menu.Item>
            <Menu.Item leftSection={<IconArrowMoveRight size={14} />} onClick={(e) => { e.stopPropagation(); onMove() }}>
              Move to folder
            </Menu.Item>
            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>

      {/* Image */}
      <Image
        src={file.url}
        alt={file.originalFilename}
        height={120}
        fit="contain"
        radius="md"
      />

      {/* Filename */}
      <Text size="xs" mt="xs" lineClamp={1}>
        {file.originalFilename || file.filename}
      </Text>
      <Text size="xs" c="dimmed">
        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}
      </Text>
    </Paper>
  )
}
