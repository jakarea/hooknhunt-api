import * as React from 'react'
import {
  Box,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Select,
  Switch,
  TagsInput,
  Image,
  SimpleGrid,
} from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { IconPhoto } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import { useSliderStore } from '@/stores/sliderStore'
import type { SliderFormData, SliderMediaType } from '@/utils/websiteApi'

// ─── Form Defaults ───────────────────────────────
export const emptyForm: SliderFormData = {
  mediaType: 'image',
  imageUrl: null,
  videoUrl: null,
  capsuleTitle: '',
  title: '',
  subTitle: '',
  features: '',
  cta1Label: '',
  cta1Link: '',
  cta2Label: '',
  cta2Link: '',
  isActive: true,
}

// ─── Shared Slider Form ──────────────────────────
export function SliderForm({
  mode,
  initialData,
}: {
  mode: 'create' | 'edit'
  initialData?: SliderFormData
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addSlider, editSlider, submitting } = useSliderStore()
  const { openSingleSelect } = useMediaSelector()

  const [form, setForm] = React.useState<SliderFormData>(initialData || emptyForm)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const updateField = <K extends keyof SliderFormData>(key: K, value: SliderFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const { [key]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleImageSelect = () => {
    openSingleSelect((file) => {
      updateField('imageUrl', file.url)
    })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = t('sliders.titleRequired')
    if (form.mediaType === 'image' && !form.imageUrl) e.imageUrl = t('sliders.imageRequired')
    if (form.mediaType === 'video' && !form.videoUrl?.trim()) e.videoUrl = t('sliders.videoUrlRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const success = mode === 'create'
      ? await addSlider(form)
      : await editSlider((initialData as any)._id, form)
    if (success) navigate('/website/sliders')
  }

  const featuresTags = form.features
    ? form.features.split(',').map((f) => f.trim()).filter(Boolean)
    : []

  return (
    <Box p={{ base: 'md', md: 'xl' }} maw={720}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Text size="lg" fw={700}>{mode === 'create' ? t('sliders.createSlider') : t('sliders.editSlider')}</Text>
          <Button variant="default" onClick={() => navigate('/website/sliders')}>{t('sliders.cancel')}</Button>
        </Group>

        {/* Media Type */}
        <Select
          label={t('sliders.mediaType')}
          data={[
            { value: 'image', label: t('sliders.image') },
            { value: 'video', label: t('sliders.youtubeVideo') },
          ]}
          value={form.mediaType}
          onChange={(v) => updateField('mediaType', (v as SliderMediaType) || 'image')}
        />

        {/* Image Upload */}
        {form.mediaType === 'image' && (
          <Box>
            <Text size="sm" fw={500} mb={4}>{t('sliders.imageLabel')}</Text>
            {form.imageUrl ? (
              <Box pos="relative">
                <Image src={form.imageUrl} h={180} radius="md" fit="cover" />
                <Group mt="xs" gap="xs">
                  <Button size="xs" variant="light" onClick={handleImageSelect}>{t('sliders.change')}</Button>
                  <Button size="xs" variant="subtle" color="red" onClick={() => updateField('imageUrl', null)}>{t('sliders.remove')}</Button>
                </Group>
              </Box>
            ) : (
              <Button
                variant="default"
                fullWidth
                h={140}
                onClick={handleImageSelect}
                styles={{ inner: { flexDirection: 'column', gap: 8 } }}
              >
                <IconPhoto size={28} />
                <Text size="xs">{t('sliders.selectImage')}</Text>
              </Button>
            )}
            {errors.imageUrl && <Text size="xs" c="red" mt={4}>{errors.imageUrl}</Text>}
          </Box>
        )}

        {/* Video URL */}
        {form.mediaType === 'video' && (
          <TextInput
            label={t('sliders.youtubeUrl')}
            placeholder={t('sliders.youtubeUrlPlaceholder')}
            value={form.videoUrl || ''}
            onChange={(e) => updateField('videoUrl', e.currentTarget.value)}
            error={errors.videoUrl}
          />
        )}

        {/* Content */}
        <TextInput
          label={t('sliders.capsuleTitle')}
          placeholder={t('sliders.capsuleTitlePlaceholder')}
          value={form.capsuleTitle || ''}
          onChange={(e) => updateField('capsuleTitle', e.currentTarget.value)}
        />

        <TextInput
          label={t('sliders.titleLabel')}
          placeholder={t('sliders.titlePlaceholder')}
          required
          value={form.title}
          onChange={(e) => updateField('title', e.currentTarget.value)}
          error={errors.title}
        />

        <TextInput
          label={t('sliders.subtitleLabel')}
          placeholder={t('sliders.subtitlePlaceholder')}
          value={form.subTitle || ''}
          onChange={(e) => updateField('subTitle', e.currentTarget.value)}
        />

        <TagsInput
          label={t('sliders.features')}
          placeholder={t('sliders.featuresPlaceholder')}
          value={featuresTags}
          onChange={(tags) => updateField('features', tags.join(', '))}
        />

        {/* CTAs */}
        <Text size="sm" fw={600} mt="xs">{t('sliders.ctaButtons')}</Text>

        <SimpleGrid cols={2} spacing="xs">
          <TextInput
            label={t('sliders.cta1Label')}
            placeholder={t('sliders.cta1LabelPlaceholder')}
            value={form.cta1Label || ''}
            onChange={(e) => updateField('cta1Label', e.currentTarget.value)}
          />
          <TextInput
            label={t('sliders.cta1Link')}
            placeholder={t('sliders.cta1LinkPlaceholder')}
            value={form.cta1Link || ''}
            onChange={(e) => updateField('cta1Link', e.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="xs">
          <TextInput
            label={t('sliders.cta2Label')}
            placeholder={t('sliders.cta2LabelPlaceholder')}
            value={form.cta2Label || ''}
            onChange={(e) => updateField('cta2Label', e.currentTarget.value)}
          />
          <TextInput
            label={t('sliders.cta2Link')}
            placeholder={t('sliders.cta2LinkPlaceholder')}
            value={form.cta2Link || ''}
            onChange={(e) => updateField('cta2Link', e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* Active Toggle */}
        <Switch
          label={t('sliders.active')}
          checked={form.isActive ?? true}
          onChange={(e) => updateField('isActive', e.currentTarget.checked)}
        />

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => navigate('/website/sliders')}>{t('sliders.cancel')}</Button>
          <Button loading={submitting} onClick={handleSubmit}>
            {mode === 'create' ? t('sliders.create') : t('sliders.update')}
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
