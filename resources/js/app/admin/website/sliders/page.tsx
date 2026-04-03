import * as React from 'react'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Card,
  ActionIcon,
  Switch,
  Image,
  SimpleGrid,
  LoadingOverlay,
  Tooltip,
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { modals } from '@mantine/modals'
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconVideo,
} from '@tabler/icons-react'
import { useSliderStore } from '@/stores/sliderStore'
import type { WebsiteSlider } from '@/utils/websiteApi'

export default function WebsiteSlidersPage() {
  const { sliders, loading, fetchSliders, removeSlider, reorder, toggleActive } = useSliderStore()
  const navigate = useNavigate()

  React.useEffect(() => {
    fetchSliders()
  }, [fetchSliders])

  const confirmDelete = (slider: WebsiteSlider) => {
    modals.openConfirmModal({
      title: 'Delete Slider',
      children: <Text size="sm">Remove "{slider.title}"? This cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => removeSlider(slider.id),
    })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const reordered = [...sliders]
    ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
    reorder(reordered.map((s, i) => ({ id: s.id, sortOrder: i })))
  }

  const handleMoveDown = (index: number) => {
    if (index === sliders.length - 1) return
    const reordered = [...sliders]
    ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
    reorder(reordered.map((s, i) => ({ id: s.id, sortOrder: i })))
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Text size="lg" fw={700}>Module Sliders</Text>
            <Text size="sm" c="dimmed">Manage storefront hero slides</Text>
          </Box>
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/website/sliders/create')}>
            Add Slider
          </Button>
        </Group>

        {/* Loading */}
        {loading && <LoadingOverlay visible />}

        {/* Empty State */}
        {!loading && sliders.length === 0 && (
          <Card withBorder p="xl" ta="center">
            <Text c="dimmed" size="sm">No sliders yet. Click "Add Slider" to create one.</Text>
          </Card>
        )}

        {/* Slider Cards */}
        {!loading && sliders.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {sliders.map((slider, index) => (
              <SliderCard
                key={slider.id}
                slider={slider}
                index={index}
                total={sliders.length}
                onEdit={() => navigate(`/website/sliders/${slider.id}/edit`)}
                onDelete={() => confirmDelete(slider)}
                onToggle={() => toggleActive(slider.id)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Box>
  )
}

// ─── Slider Card Component ───────────────────────
function SliderCard({
  slider,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  slider: WebsiteSlider
  index: number
  total: number
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <Card withBorder p={0} style={{ overflow: 'hidden' }}>
      {/* Preview */}
      <Box h={140} pos="relative" bg="gray.1">
        {slider.mediaType === 'image' && slider.imageUrl ? (
          <Image src={slider.imageUrl} h={140} fit="cover" />
        ) : (
          <Group h={140} justify="center">
            <IconVideo size={32} color="gray" />
          </Group>
        )}
        <Box pos="absolute" top={8} right={8}>
          <Badge size="sm" color={slider.isActive ? 'green' : 'gray'} variant="filled">
            {slider.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </Box>
        <Box pos="absolute" top={8} left={8}>
          <Badge size="sm" variant="dark" color="dark">
            #{index + 1}
          </Badge>
        </Box>
      </Box>

      {/* Content */}
      <Box p="sm">
        {slider.capsuleTitle && (
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
            {slider.capsuleTitle}
          </Text>
        )}
        <Text size="sm" fw={600} lineClamp={1}>
          {slider.title}
        </Text>
        {slider.subTitle && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {slider.subTitle}
          </Text>
        )}
      </Box>

      {/* Actions */}
      <Group px="sm" pb="sm" gap={4} justify="space-between">
        <Group gap={4}>
          <Tooltip label="Move up">
            <ActionIcon size="sm" variant="subtle" disabled={index === 0} onClick={onMoveUp}>
              <IconChevronUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Move down">
            <ActionIcon size="sm" variant="subtle" disabled={index === total - 1} onClick={onMoveDown}>
              <IconChevronDown size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group gap={4}>
          <Switch
            size="xs"
            checked={slider.isActive}
            onChange={onToggle}
            aria-label="Toggle active"
          />
          <ActionIcon size="sm" variant="subtle" color="blue" onClick={onEdit}>
            <IconPencil size={14} />
          </ActionIcon>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}
