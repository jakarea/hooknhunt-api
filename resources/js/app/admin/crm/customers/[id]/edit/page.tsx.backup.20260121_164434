import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { bangladeshDivisions } from '@/data/bangladesh-divisions'
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
  PasswordInput,
  Textarea,
  SimpleGrid,
  Checkbox,
  Radio,
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
  IconDeviceMobile,
  IconId,
  IconMapPin,
  IconBriefcase,
  IconSettings,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'

interface FormData {
  // Basic Info
  name: string
  email: string
  phone: string
  password: string

  // Customer Type
  type: 'retail' | 'wholesale'

  // Business Info (for wholesale)
  trade_license_no: string
  tax_id: string

  // Personal Details
  dob: string
  gender: string
  address: string
  division: string
  district: string
  thana: string

  // Preferences
  preferred_language: string
  marketing_consent: boolean

  // Notes
  notes: string
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  type: 'retail',
  trade_license_no: '',
  tax_id: '',
  dob: '',
  gender: '',
  address: '',
  division: '',
  district: '',
  thana: '',
  preferred_language: 'en',
  marketing_consent: false,
  notes: '',
}

interface FieldErrors {
  [key: string]: string
}

export default function EditCustomerPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [customerName, setCustomerName] = useState('')
  const [roles, setRoles] = useState<{ id: number; slug: string }[]>([])

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get('/user-management/roles?type=customer')
        if (response.data?.status) {
          setRoles(response.data.data || [])
        }
      } catch (error) {
        console.error('Error fetching roles:', error)
      }
    }
    fetchRoles()
  }, [])

  // Get role ID dynamically by slug
  const getRoleId = () => {
    const slug = formData.type === 'retail' ? 'retail_customer' : 'wholesale_customer'
    const role = roles.find(r => r.slug === slug)
    return role?.id
  }

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return

      try {
        setLoading(true)
        const response = await api.get(`/user-management/users/${id}`)

        console.log('Customer edit response:', response.data)

        if (response.data?.status && response.data?.data?.user) {
          const user = response.data.data.user
          const profile = response.data.data.user.customerProfile

          console.log('User data:', user)
          console.log('Customer profile:', profile)

          setCustomerName(user.name)

          // Determine type from role slug or profile
          const type = user.role?.slug === 'wholesale_customer' ? 'wholesale' : 'retail'

          setFormData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '', // Don't populate password for security
            type: type as 'retail' | 'wholesale',
            trade_license_no: profile?.trade_license_no || '',
            tax_id: profile?.tax_id || '',
            dob: profile?.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
            gender: profile?.gender || '',
            address: profile?.address || '',
            division: profile?.division || '',
            district: profile?.district || '',
            thana: profile?.thana || '',
            preferred_language: profile?.preferred_language || 'en',
            marketing_consent: profile?.marketing_consent || false,
            notes: profile?.notes || '',
          })
        } else {
          throw new Error('Failed to fetch customer')
        }
      } catch (error) {
        console.error('Error fetching customer:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load customer data. Please try again.',
          color: 'red',
        })
        navigate('/crm/customers')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [id, navigate])

  // Derived state for cascading dropdowns
  const selectedDivision = bangladeshDivisions.find(d => d.name === formData.division)
  const availableDistricts = selectedDivision?.districts || []
  // Remove duplicate districts by name
  const uniqueDistricts = availableDistricts.filter((district, index, self) =>
    index === self.findIndex((d) => d.name === district.name)
  )
  const selectedDistrict = uniqueDistricts.find(d => d.name === formData.district)
  const availableThanas = selectedDistrict?.thanas || []
  // Remove duplicate thanas by name
  const uniqueThanas = availableThanas.filter((thana, index, self) =>
    index === self.findIndex((t) => t.name === thana.name)
  )

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id) return

    // Validate
    const errors: FieldErrors = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required'
    } else if (!/^01[3-9]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number format (e.g., 01712345678)'
    }
    // Password is optional for updates
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    // Validate role_id
    const roleId = getRoleId()
    if (!roleId) {
      errors.role_id = 'Invalid customer type selected.'
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
      // Log for debugging
      console.log('Form data:', formData)
      console.log('Selected role_id:', roleId)

      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.replace(/\s/g, ''),
        role_id: roleId,
      }

      // Only include password if provided
      if (formData.password) {
        updateData.password = formData.password
      }

      // Add profile fields
      updateData.profile = {
        type: formData.type,
        trade_license_no: formData.trade_license_no || null,
        tax_id: formData.tax_id || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        address: formData.address || null,
        division: formData.division || null,
        district: formData.district || null,
        thana: formData.thana || null,
      }

      updateData.customer_profile = {
        type: formData.type,
        preferred_language: formData.preferred_language,
        marketing_consent: formData.marketing_consent,
        notes: formData.notes,
      }

      const response = await api.put(`/user-management/users/${id}`, updateData)

      if (response.data?.status) {
        notifications.show({
          title: 'Success',
          message: `Customer "${formData.name}" updated successfully!`,
          color: 'green',
          icon: <IconCheck size={20} />,
        })

        // Redirect to customers list after a short delay
        setTimeout(() => {
          navigate('/crm/customers')
        }, 1500)
      } else {
        throw new Error(response.data?.message || 'Failed to update customer')
      }
    } catch (error: any) {
      console.error('Error updating customer:', error)

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
        message: error.response?.data?.message || 'Failed to update customer. Please try again.',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | number | null | boolean) => {
    // Convert null to empty string for consistency
    const normalizedValue = value === null ? '' : value

    setFormData((prev) => {
      const updated = { ...prev, [field]: normalizedValue }

      // Clear dependent fields when division changes
      if (field === 'division') {
        updated.district = ''
        updated.thana = ''
      }
      // Clear dependent field when district changes
      if (field === 'district') {
        updated.thana = ''
      }

      return updated
    })
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="lg" pos="relative">
          <LoadingOverlay visible overlayProps={{ blur: 2 }} />
          <Box style={{ height: '400px' }} />
        </Paper>
      </Box>
    )
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
          <Anchor component={Link} to="/crm/customers" c="dimmed">
            Customers
          </Anchor>
          <IconChevronRight size={14} />
          <Anchor component={Link} to={`/crm/customers/${id}`} c="dimmed">
            {customerName}
          </Anchor>
          <IconChevronRight size={14} />
          <Text c="red">Edit</Text>
        </Group>

        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={1} className="text-lg md:text-xl lg:text-2xl">
              Edit Customer
            </Title>
            <Text c="dimmed">Update customer information and profile</Text>
          </Box>
          <Button
            component={Link}
            to="/crm/customers"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Customers
          </Button>
        </Group>

        {/* Form */}
        <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" component="form" onSubmit={handleSubmit} pos="relative">
          <LoadingOverlay visible={submitting} overlayProps={{ blur: 2 }} />
          <Stack>
            {/* Customer Type (Read-only) */}
            <Box>
              <Group gap="xs" mb="md">
                <IconBriefcase size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Customer Type</Title>
              </Group>
              <Radio.Group
                value={formData.type}
                onChange={(value) => handleInputChange('type', value as 'retail' | 'wholesale')}
              >
                <Group gap="xl">
                  <Radio
                    value="retail"
                    label="Retail Customer"
                    description="Individual customers"
                    color="red"
                    disabled
                  />
                  <Radio
                    value="wholesale"
                    label="Wholesale Customer"
                    description="Business/B2B customers"
                    color="red"
                    disabled
                  />
                </Group>
              </Radio.Group>
              <Text size="xs" c="dimmed" mt="xs">
                Customer type cannot be changed after creation.
              </Text>
            </Box>

            {/* Account Information */}
            <Box>
              <Group gap="xs" mb="md">
                <IconUser size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Account Information</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <TextInput
                  label="Full Name"
                  placeholder="Enter customer name"
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
                  error={fieldErrors.phone}
                />

                <TextInput
                  label="Email Address"
                  type="email"
                  placeholder="customer@example.com (optional)"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={fieldErrors.email}
                />

                <Box style={{ gridColumn: '1 / -1' }}>
                  <PasswordInput
                    label="Password"
                    placeholder="Leave blank to keep current password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    error={fieldErrors.password}
                    rightSection={
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={generatePassword}
                        leftSection={<IconDeviceMobile size={14} />}
                      >
                        Generate
                      </Button>
                    }
                  />
                </Box>
              </SimpleGrid>
            </Box>

            {/* Personal Details */}
            <Box>
              <Group gap="xs" mb="md">
                <IconId size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Personal Details</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <TextInput
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
                  error={fieldErrors.dob}
                />

                <Select
                  label="Gender"
                  placeholder="Select gender"
                  data={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={formData.gender}
                  onChange={(value) => handleInputChange('gender', value || '')}
                  clearable
                  error={fieldErrors.gender}
                />
              </SimpleGrid>
            </Box>

            {/* Address Information */}
            <Box>
              <Group gap="xs" mb="md">
                <IconMapPin size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Address Information</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <TextInput
                  label="Address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  error={fieldErrors.address}
                  style={{ gridColumn: '1 / -1' }}
                />

                <Select
                  label="Division"
                  placeholder="Select division"
                  data={bangladeshDivisions.map(d => ({ value: d.name, label: d.name }))}
                  value={formData.division}
                  onChange={(value) => handleInputChange('division', value)}
                  searchable
                  clearable
                  error={fieldErrors.division}
                />

                <Select
                  label="District"
                  placeholder="Select district"
                  data={uniqueDistricts.map(d => ({ value: d.name, label: d.name }))}
                  value={formData.district}
                  onChange={(value) => handleInputChange('district', value)}
                  searchable
                  clearable
                  disabled={!formData.division}
                  error={fieldErrors.district}
                />

                <Select
                  label="Thana"
                  placeholder="Select thana"
                  data={uniqueThanas.map(t => ({ value: t.name, label: t.name }))}
                  value={formData.thana}
                  onChange={(value) => handleInputChange('thana', value)}
                  searchable
                  clearable
                  disabled={!formData.district}
                  error={fieldErrors.thana}
                />
              </SimpleGrid>
            </Box>

            {/* Business Information */}
            <Box>
              <Group gap="xs" mb="md">
                <IconBuilding size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                <Title order={4}>Business Information (Optional)</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <TextInput
                  label="Trade License Number"
                  placeholder="Enter trade license number (optional)"
                  value={formData.trade_license_no}
                  onChange={(e) => handleInputChange('trade_license_no', e.target.value)}
                  error={fieldErrors.trade_license_no}
                />

                <TextInput
                  label="Tax ID"
                  placeholder="Enter tax ID (optional)"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  error={fieldErrors.tax_id}
                />
              </SimpleGrid>
              <Text size="xs" c="dimmed" mt="xs">
                These fields are optional for all customers. Required for wholesale business accounts.
              </Text>
            </Box>

            {/* Preferences */}
            <Box>
              <Group gap="xs" mb="md">
                <IconSettings size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Preferences</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <Select
                  label="Preferred Language"
                  placeholder="Select language"
                  data={[
                    { value: 'en', label: 'English' },
                    { value: 'bn', label: 'বাংলা (Bengali)' },
                  ]}
                  value={formData.preferred_language}
                  onChange={(value) => handleInputChange('preferred_language', value || 'en')}
                />

                <Checkbox
                  label="Marketing Consent"
                  description="Customer agrees to receive marketing emails & SMS"
                  checked={formData.marketing_consent}
                  onChange={(e) => handleInputChange('marketing_consent', e.currentTarget.checked)}
                  color="red"
                  mt="md"
                />
              </SimpleGrid>
            </Box>

            {/* Notes */}
            <Box>
              <Group gap="xs" mb="md">
                <IconInfoCircle size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                <Title order={4}>Additional Notes</Title>
              </Group>
              <Textarea
                placeholder="Add any notes about this customer..."
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
                onClick={() => navigate('/crm/customers')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} leftSection={<IconCheck size={16} />}>
                Update Customer
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  )
}
