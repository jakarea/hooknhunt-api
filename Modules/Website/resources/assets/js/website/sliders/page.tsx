import * as React from 'react'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  ActionIcon,
  Switch,
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
  IconPlayerPlay,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useSliderStore } from '@/stores/sliderStore'
import type { Slider } from '@/utils/websiteApi'

export default function SlidersPage() {
  const { t } = useTranslation()
  const { sliders, loading, fetchSliders, removeSlider, reorder, toggleActive } = useSliderStore()
  const navigate = useNavigate()

  React.useEffect(() => {
    fetchSliders()
  }, [fetchSliders])

  const confirmDelete = (slider: Slider) => {
    modals.openConfirmModal({
      title: t('sliders.deleteSlider'),
      children: <Text size="sm">{t('sliders.deleteConfirm', { title: slider.title })}</Text>,
      labels: { confirm: t('sliders.delete'), cancel: t('sliders.cancel') },
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
            <Text size="lg" fw={700}>{t('sliders.title')}</Text>
            <Text size="sm" c="dimmed">{t('sliders.subtitle')}</Text>
          </Box>
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/website/sliders/create')}>
            {t('sliders.addSlider')}
          </Button>
        </Group>

        {loading && <LoadingOverlay visible />}

        {!loading && sliders.length === 0 && (
          <Box className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Text c="dimmed" size="sm">{t('sliders.noSliders')}</Text>
          </Box>
        )}

        {!loading && sliders.length > 0 && (
          <Stack gap="md">
            {sliders.map((slider, index) => (
              <SliderPreviewCard
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
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

// ─── Storefront-Style Preview Card ────────────────
function SliderPreviewCard({
  slider,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  slider: Slider
  index: number
  total: number
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const { t } = useTranslation()
  const featuresList = slider.featuresList || []

  const bgStyle: React.CSSProperties = slider.imageUrl
    ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.75), rgba(0,0,0,0.4)), url(${slider.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #1e1b4b 100%)' }

  return (
    <Box className="rounded-xl overflow-hidden shadow-md border border-gray-200">
      {/* Preview Area - Storefront Style */}
      <Box
        className="relative h-[280px] md:h-[320px] flex items-center"
        style={bgStyle}
      >
        {/* Video indicator */}
        {slider.mediaType === 'video' && (
          <Box className="absolute inset-0 flex items-center justify-center">
            <Box className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <IconPlayerPlay size={28} color="white" />
            </Box>
          </Box>
        )}

        {/* Overlay badges */}
        <Box className="absolute top-3 left-3 z-10">
          <Badge size="sm" variant="dark" color="dark">
            #{index + 1}
          </Badge>
        </Box>
        <Box className="absolute top-3 right-3 z-10">
          <Badge size="sm" color={slider.isActive ? 'green' : 'gray'} variant="filled">
            {slider.isActive ? t('sliders.active') : 'Inactive'}
          </Badge>
        </Box>

        {/* Content - Storefront Layout */}
        <Box className="max-w-[1344px] mx-auto px-4 lg:px-8 xl:px-12 w-full">
          <Box className="max-w-2xl">
            {/* Capsule Title */}
            {slider.capsuleTitle && (
              <Box className="mb-3">
                <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#bc1215] to-[#8a0f12] text-white text-xs font-bold rounded-full shadow-lg">
                  {slider.capsuleTitle}
                </span>
              </Box>
            )}

            {/* Title */}
            <h2 className="text-xl md:text-2xl lg:text-4xl font-bold text-white mb-3 leading-tight">
              {slider.title}
            </h2>

            {/* Subtitle */}
            {slider.subTitle && (
              <p className="text-sm md:text-base text-gray-200 mb-4 max-w-xl leading-relaxed">
                {slider.subTitle}
              </p>
            )}

            {/* Features */}
            {featuresList.length > 0 && (
              <Box className="flex flex-wrap gap-2 mb-5">
                {featuresList.map((feature, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-xs rounded-full border border-white/20"
                  >
                    <svg className="w-3 h-3 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </span>
                ))}
              </Box>
            )}

            {/* CTA Buttons */}
            <Box className="flex flex-wrap gap-3">
              {slider.cta1Label && slider.cta1Link && (
                <span className="group px-5 py-2.5 bg-gradient-to-r from-[#bc1215] to-[#8a0f12] text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2">
                  {slider.cta1Label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
              {slider.cta2Label && slider.cta2Link && (
                <span className="px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                  {slider.cta2Label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              )}
              {!slider.cta1Label && (
                <span className="px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                  {t('sliders.viewAll')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Controls Bar */}
      <Box className="bg-white border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Group gap={4}>
          <Tooltip label={t('sliders.moveUp')}>
            <ActionIcon size="sm" variant="subtle" disabled={index === 0} onClick={onMoveUp}>
              <IconChevronUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('sliders.moveDown')}>
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
            aria-label={t('sliders.toggleActive')}
          />
          <ActionIcon size="sm" variant="subtle" color="blue" onClick={onEdit}>
            <IconPencil size={14} />
          </ActionIcon>
          <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  )
}
