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
    if (!form.title.trim()) e.title = 'Title is required'
    if (form.mediaType === 'image' && !form.imageUrl) e.imageUrl = 'Image is required'
    if (form.mediaType === 'video' && !form.videoUrl?.trim()) e.videoUrl = 'Video URL is required'
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
          <Text size="lg" fw={700}>{mode === 'create' ? 'Create Slider' : 'Edit Slider'}</Text>
          <Button variant="default" onClick={() => navigate('/website/sliders')}>Cancel</Button>
        </Group>

        {/* Media Type */}
        <Select
          label="Media Type"
          data={[
            { value: 'image', label: 'Image' },
            { value: 'video', label: 'YouTube Video' },
          ]}
          value={form.mediaType}
          onChange={(v) => updateField('mediaType', (v as SliderMediaType) || 'image')}
        />

        {/* Image Upload */}
        {form.mediaType === 'image' && (
          <Box>
            <Text size="sm" fw={500} mb={4}>Image</Text>
            {form.imageUrl ? (
              <Box pos="relative">
                <Image src={form.imageUrl} h={180} radius="md" fit="cover" />
                <Group mt="xs" gap="xs">
                  <Button size="xs" variant="light" onClick={handleImageSelect}>Change</Button>
                  <Button size="xs" variant="subtle" color="red" onClick={() => updateField('imageUrl', null)}>Remove</Button>
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
                <Text size="xs">Select Image</Text>
              </Button>
            )}
            {errors.imageUrl && <Text size="xs" c="red" mt={4}>{errors.imageUrl}</Text>}
          </Box>
        )}

        {/* Video URL */}
        {form.mediaType === 'video' && (
          <TextInput
            label="YouTube Video URL"
            placeholder="https://youtube.com/watch?v=..."
            value={form.videoUrl || ''}
            onChange={(e) => updateField('videoUrl', e.currentTarget.value)}
            error={errors.videoUrl}
          />
        )}

        {/* Content */}
        <TextInput
          label="Capsule Title"
          placeholder="e.g. New Arrival"
          value={form.capsuleTitle || ''}
          onChange={(e) => updateField('capsuleTitle', e.currentTarget.value)}
        />

        <TextInput
          label="Title"
          placeholder="e.g. Explore the Wild"
          required
          value={form.title}
          onChange={(e) => updateField('title', e.currentTarget.value)}
          error={errors.title}
        />

        <TextInput
          label="Subtitle"
          placeholder="e.g. Premium fishing gear for every adventure"
          value={form.subTitle || ''}
          onChange={(e) => updateField('subTitle', e.currentTarget.value)}
        />

        <TagsInput
          label="Features"
          placeholder="Type and press Enter to add"
          value={featuresTags}
          onChange={(tags) => updateField('features', tags.join(', '))}
        />

        {/* CTAs */}
        <Text size="sm" fw={600} mt="xs">CTA Buttons</Text>

        <SimpleGrid cols={2} spacing="xs">
          <TextInput
            label="CTA 1 Label"
            placeholder="Shop Now"
            value={form.cta1Label || ''}
            onChange={(e) => updateField('cta1Label', e.currentTarget.value)}
          />
          <TextInput
            label="CTA 1 Link"
            placeholder="/products"
            value={form.cta1Link || ''}
            onChange={(e) => updateField('cta1Link', e.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={2} spacing="xs">
          <TextInput
            label="CTA 2 Label"
            placeholder="Learn More"
            value={form.cta2Label || ''}
            onChange={(e) => updateField('cta2Label', e.currentTarget.value)}
          />
          <TextInput
            label="CTA 2 Link"
            placeholder="/about"
            value={form.cta2Link || ''}
            onChange={(e) => updateField('cta2Link', e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* Active Toggle */}
        <Switch
          label="Active"
          checked={form.isActive ?? true}
          onChange={(e) => updateField('isActive', e.currentTarget.checked)}
        />

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => navigate('/website/sliders')}>Cancel</Button>
          <Button loading={submitting} onClick={handleSubmit}>
            {mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
