import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Text, LoadingOverlay } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useSliderStore } from '@/stores/sliderStore'
import { SliderForm } from '../../slider-form'
import type { SliderFormData } from '@/utils/websiteApi'

export default function EditSliderPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { sliders, fetchSliders, loading } = useSliderStore()
  const [notFound, setNotFound] = React.useState(false)

  React.useEffect(() => {
    if (sliders.length === 0) {
      fetchSliders()
    }
  }, [sliders.length, fetchSliders])

  const slider = React.useMemo(
    () => sliders.find((s) => s.id === Number(id)),
    [sliders, id],
  )

  React.useEffect(() => {
    if (!loading && sliders.length > 0 && !slider) {
      setNotFound(true)
    }
  }, [loading, sliders.length, slider])

  if (notFound) {
    return (
      <Box p="xl" ta="center">
        <Text c="dimmed">{t('sliders.sliderNotFound')}</Text>
        <Text
          size="sm"
          c="blue"
          style={{ cursor: 'pointer' }}
          mt="xs"
          onClick={() => navigate('/website/sliders')}
        >
          {t('sliders.backToSliders')}
        </Text>
      </Box>
    )
  }

  if (loading || !slider) {
    return <Box pos="relative" h={200}><LoadingOverlay visible /></Box>
  }

  const initialData: SliderFormData & { _id: number } = {
    _id: slider.id,
    mediaType: slider.mediaType,
    imageUrl: slider.imageUrl,
    videoUrl: slider.videoUrl,
    capsuleTitle: slider.capsuleTitle || '',
    title: slider.title,
    subTitle: slider.subTitle || '',
    features: slider.features || '',
    cta1Label: slider.cta1Label || '',
    cta1Link: slider.cta1Link || '',
    cta2Label: slider.cta2Label || '',
    cta2Link: slider.cta2Link || '',
    isActive: slider.isActive,
  }

  return <SliderForm mode="edit" initialData={initialData} />
}
