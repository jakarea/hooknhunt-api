import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Paper,
  TextInput,
  Select,
  Textarea,
  SimpleGrid,
  Anchor,
  LoadingOverlay,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconCheck,
  IconUser,
  IconBuilding,
  IconInfoCircle,
  IconPhone,
  IconMail,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'

interface FormData {
  // Basic Info
  name: string
  phone: string
  email: string

  // Lead Source
  source: string

  // Notes
  notes: string
}

const initialFormData: FormData = {
  name: '',
  phone: '',
  email: '',
  source: 'manual',
  notes: '',
}

interface FieldErrors {
  [key: string]: string
}

const sourceOptions = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
]

export default function CreateLeadPage() {
  const navigate = useNavigate()

  // State
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const errors: FieldErrors = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!/^01[3-9]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number format (e.g., 01712345678)'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      notifications.show({
        title: 'Validation Error',
        message: 'Please fix the errors and try again',
        color: 'red',
      })
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    try {
      const response = await api.post('/crm/leads', {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\s/g, ''),
        email: formData.email.trim() || null,
        source: formData.source,
        notes: formData.notes.trim() || null,
      })

      if (response.data?.status) {
        notifications.show({
          title: 'Success',
          message: `Lead "${formData.name}" created successfully!`,
          color: 'green',
          icon: <IconCheck size={20} />,
        })

        // Redirect to leads list after a short delay
        setTimeout(() => {
          navigate('/crm/leads')
        }, 1500)
      } else {
        throw new Error(response.data?.message || 'Failed to create lead')
      }
    } catch (error: any) {
      console.error('Error creating lead:', error)

      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors: FieldErrors = {}
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          backendErrors[key] = Array.isArray(messages) ? messages[0] : String(messages)
        })
        setFieldErrors(backendErrors)
      }

      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create lead. Please try again.',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | null | boolean) => {
    const normalizedValue = value === null ? '' : value
    setFormData((prev) => ({ ...prev, [field]: normalizedValue }))

    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Breadcrumbs */}
        <Group>
          <Anchor component={Link} to="/dashboard" c="dimmed">
            Dashboard
          </Anchor>
          <IconChevronRight size={14} />
          <Anchor component={Link} to="/crm" c="dimmed">
            CRM
          </Anchor>
          <IconChevronRight size={14} />
          <Anchor component={Link} to="/crm/leads" c="dimmed">
            Leads
          </Anchor>
          <IconChevronRight size={14} />
          <Text c="red">Add Lead</Text>
        </Group>

        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">
              Add New Lead
            </Title>
            <Text c="dimmed">Create a new sales lead</Text>
          </Box>
          <Button
            component={Link}
            to="/crm/leads"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Leads
          </Button>
        </Group>

        {/* Form */}
        <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" component="form" onSubmit={handleSubmit} pos="relative">
          <LoadingOverlay visible={submitting} overlayProps={{ blur: 2 }} />
          <Stack>
            {/* Lead Information */}
            <Box>
              <Group gap="xs" mb="md">
                <IconUser size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Lead Information</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <TextInput
                  label="Name"
                  placeholder="Enter lead name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  withAsterisk
                  error={fieldErrors.name}
                />

                <TextInput
                  label="Phone Number"
                  placeholder="e.g., 01712345678"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                  withAsterisk
                  leftSection={<IconPhone size={16} />}
                  error={fieldErrors.phone}
                />

                <TextInput
                  label="Email Address"
                  type="email"
                  placeholder="email@example.com (optional)"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  leftSection={<IconMail size={16} />}
                  error={fieldErrors.email}
                />
              </SimpleGrid>
            </Box>

            {/* Lead Source */}
            <Box>
              <Group gap="xs" mb="md">
                <IconBuilding size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>Lead Source</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <Select
                  label="How did they find us?"
                  placeholder="Select lead source"
                  data={sourceOptions}
                  value={formData.source}
                  onChange={(value) => handleInputChange('source', value || 'manual')}
                  error={fieldErrors.source}
                />
              </SimpleGrid>
            </Box>

            {/* Additional Notes */}
            <Box>
              <Group gap="xs" mb="md">
                <IconInfoCircle size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Additional Notes</Title>
              </Group>
              <Textarea
                placeholder="Add any notes about this lead..."
                minRows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </Box>

            {/* Submit Buttons */}
            <Group justify="flex-end">
              <Button
                type="button"
                variant="default"
                onClick={() => navigate('/crm/leads')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} leftSection={<IconCheck size={16} />}>
                Create Lead
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
