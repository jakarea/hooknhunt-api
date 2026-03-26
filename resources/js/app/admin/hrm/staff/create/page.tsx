import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  NumberInput,
  LoadingOverlay,
  SimpleGrid,
  Anchor,
  Avatar,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconUser,
  IconId,
  IconMapPin,
  IconMail,
  IconBriefcase,
  IconCoin,
  IconBuilding,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Role {
  id: number
  name: string
  slug: string
}

interface Department {
  id: number
  name: string
}

interface FormData {
  // Personal Info
  name: string
  email: string
  phone: string
  gender: string
  dob: string
  address: string
  division: string
  district: string
  thana: string
  whatsapp_number: string

  // Professional Info
  role_id: string | null
  department_id: string | null
  designation: string
  joining_date: string
  base_salary: number | null
  house_rent: number | null
  medical_allowance: number | null
  conveyance_allowance: number | null
  overtime_hourly_rate: number | null

  // Office Info
  office_email: string
  office_email_password: string

  // Bank Account Info (for salary transfer)
  bank_account_name: string
  bank_account_number: string
  bank_name: string
  bank_branch: string
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  gender: '',
  dob: '',
  address: '',
  division: '',
  district: '',
  thana: '',
  whatsapp_number: '',

  role_id: null,
  department_id: null,
  designation: '',
  joining_date: new Date().toISOString().split('T')[0],
  base_salary: null,
  house_rent: null,
  medical_allowance: null,
  conveyance_allowance: null,
  overtime_hourly_rate: null,

  office_email: '',
  office_email_password: '',

  // Bank Account Info
  bank_account_name: '',
  bank_account_number: '',
  bank_name: '',
  bank_branch: '',
}

interface FieldErrors {
  [key: string]: string
}

export default function CreateStaffPage() {
  const navigate = useNavigate()
  const { hasPermission, isSuperAdmin } = usePermissions()

  // ALL hooks must be declared before any conditional logic or early returns
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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

  // Fetch roles and departments
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true)

        // Fetch roles
        const rolesResponse = await api.get('/hrm/roles')
        let rolesData = rolesResponse.data.data || rolesResponse.data || []
        rolesData = Array.isArray(rolesData) ? rolesData : []

        // Filter out super_admin role for non-super-admin users
        if (!isSuperAdmin()) {
          rolesData = rolesData.filter((role: Role) => role.slug !== 'super_admin')
        }

        setRoles(rolesData)

        // Fetch departments
        const deptResponse = await api.get('/hrm/departments')
        const deptData = deptResponse.data.data?.data || deptResponse.data.data || []
        setDepartments(Array.isArray(deptData) ? deptData : [])
      } catch (error: unknown) {
        console.error('Failed to load dropdown data:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load required data. Please refresh.',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDropdownData()
  }, [isSuperAdmin])

  // Permission check: Need hrm.staff.create permission
  if (!hasPermission('hrm.staff.create')) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack >
          <Paper withBorder p="xl" radius="lg">
            <Stack align="center" >
              <Avatar size={80} radius="xl" color="red">
                <IconLock size={40} />
              </Avatar>

              <Stack gap={0} ta="center">
                <Title order={3} c="red.6">
                  Access Denied
                </Title>
                <Text className="text-lg md:text-xl lg:text-2xl" c="dimmed">
                  You don't have permission to create staff.
                </Text>
                <Text className="text-sm md:text-base" c="dimmed" mt="xs">
                  Please contact your administrator if you believe this is an error.
                </Text>
              </Stack>

              <Group  mt="md">
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate('/hrm/staff')}
                >
                  Back to Staff
                </Button>
                <Button
                  variant="filled"
                  leftSection={<IconUser size={16} />}
                  onClick={() => navigate('/profile')}
                >
                  View My Profile
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    )
  }

  // Handle form input changes
  const handleInputChange = (field: keyof FormData, value: string | number | null) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

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
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.phone.trim()) return 'Phone number is required'
    if (!formData.role_id) return 'Role is required'
    if (!formData.department_id) return 'Department is required'
    if (!formData.designation.trim()) return 'Designation is required'
    if (!formData.joining_date) return 'Joining date is required'
    if (!formData.base_salary || formData.base_salary <= 0) return 'Base salary is required'

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Invalid email format'
    }
    if (formData.office_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.office_email)) {
      return 'Invalid office email format'
    }

    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setFieldErrors({})

    // Validate form
    const error = validateForm()
    if (error) {
      notifications.show({
        title: 'Validation Error',
        message: error,
        color: 'red',
      })
      return
    }

    try {
      setSubmitting(true)

      // Prepare payload
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        role_id: parseInt(formData.role_id as string),
        type: 'staff', // Required: staff or customer

        // Staff profile fields at root level (backend expects them here)
        department_id: parseInt(formData.department_id as string),
        designation: formData.designation,
        joining_date: formData.joining_date,
        base_salary: formData.base_salary,
        house_rent: formData.house_rent || 0,
        medical_allowance: formData.medical_allowance || 0,
        conveyance_allowance: formData.conveyance_allowance || 0,
        overtime_hourly_rate: formData.overtime_hourly_rate || 0,
        office_email: formData.office_email || null,
        office_email_password: formData.office_email_password || null,

        // Bank account fields (for salary transfer)
        bank_account_name: formData.bank_account_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_name: formData.bank_name || null,
        bank_branch: formData.bank_branch || null,

        // Personal info fields
        gender: formData.gender || null,
        dob: formData.dob || null,
        address: formData.address || null,
        division: formData.division || null,
        district: formData.district || null,
        thana: formData.thana || null,
        whatsapp_number: formData.whatsapp_number || null,
      }

      await api.post('/hrm/staff', payload)

      notifications.show({
        title: 'Success',
        message: 'Staff created successfully. Login credentials sent via SMS.',
        color: 'green',
        icon: <IconCheck size={16} />,
      })

      // Navigate to staff list
      navigate('/hrm/staff')
    } catch (error) {
      console.error('Failed to create staff:', error)

      // Check for validation errors
      if ((error as any).response?.data?.errors) {
        const errors: FieldErrors = {}
        const validationErrors = (error as any).response.data.errors

        // Convert Laravel validation errors to simple object
        Object.keys(validationErrors).forEach((key) => {
          const messages = validationErrors[key]
          errors[key] = Array.isArray(messages) ? messages[0] : messages
        })

        setFieldErrors(errors)

        notifications.show({
          title: 'Validation Error',
          message: 'Please fix the errors below and try again.',
          color: 'red',
        })
      } else {
        // Extract error message from response
        const errorMessage =
          (error as any).response?.data?.message ||
          (error as any).response?.data?.error ||
          (error as any).message ||
          'Failed to create staff. Please try again.'

        notifications.show({
          title: 'Error',
          message: errorMessage,
          color: 'red',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }} pos="relative">
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

      {!loading && (
        <Stack >
          {/* Breadcrumbs */}
          <Group >
            <Anchor component={Link} to="/dashboard" c="dimmed">
              Dashboard
            </Anchor>
            <IconChevronRight size={14} />
            <Anchor component={Link} to="/hrm/staff" c="dimmed">
              HRM
            </Anchor>
            <IconChevronRight size={14} />
            <Anchor component={Link} to="/hrm/staff" c="dimmed">
              Staff
            </Anchor>
            <IconChevronRight size={14} />
            <Text c="red">Add Staff</Text>
          </Group>

          {/* Header */}
          <Group justify="space-between">
            <Box>
              <Title order={1} className="text-lg md:text-xl lg:text-2xl">
                Add New Staff
              </Title>
              <Text c="dimmed">Create a new staff account and profile</Text>
            </Box>
            <Button
              component={Link}
              to="/hrm/staff"
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Staff
            </Button>
          </Group>

          {/* Form */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" component="form" onSubmit={handleSubmit}>
            <Stack>
              {/* Account Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconUser size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                  <Title order={4}>Account Information</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label="Full Name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.name}
                  />

                  <TextInput
                    label="Phone Number"
                    placeholder="01XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.phone}
                  />

                  <TextInput
                    label="Personal Email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={fieldErrors.email}
                  />

                  <Select
                    label="Role"
                    placeholder="Select role"
                    data={roles.map((role) => ({
                      value: role.id.toString(),
                      label: role.name,
                    }))}
                    value={formData.role_id}
                    onChange={(value) => handleInputChange('role_id', value)}
                    required
                    withAsterisk
                    searchable
                    error={fieldErrors.role_id}
                  />
                </SimpleGrid>
              </Box>

              {/* Personal Details */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconId size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                  <Title order={4}>Personal Details</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
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

                  <TextInput
                    label="Date of Birth"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    error={fieldErrors.dob}
                  />

                  <TextInput
                    label="WhatsApp Number"
                    placeholder="01XXXXXXXXX"
                    value={formData.whatsapp_number}
                    onChange={(e) => handleInputChange('whatsapp_number', e.target.value)}
                    error={fieldErrors.whatsapp_number}
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

              {/* Official Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconMail size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                  <Title order={4}>Official Information</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label="Office Email"
                    type="email"
                    placeholder="staff@company.com"
                    value={formData.office_email}
                    onChange={(e) => handleInputChange('office_email', e.target.value)}
                    error={fieldErrors.office_email}
                  />

                  <TextInput
                    label="Office Email Password"
                    placeholder="Enter office email password"
                    value={formData.office_email_password}
                    onChange={(e) => handleInputChange('office_email_password', e.target.value)}
                    error={fieldErrors.office_email_password}
                  />
                </SimpleGrid>
              </Box>

              {/* Bank Account Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconCoin size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
                  <Title order={4}>Bank Account Information</Title>
                  <Text size="xs" c="dimmed">(For automatic salary transfer)</Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label="Account Holder Name"
                    placeholder="Name as per bank account"
                    value={formData.bank_account_name}
                    onChange={(e) => handleInputChange('bank_account_name', e.target.value)}
                    error={fieldErrors.bank_account_name}
                  />

                  <TextInput
                    label="Bank Account Number"
                    placeholder="Enter bank account number"
                    value={formData.bank_account_number}
                    onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                    error={fieldErrors.bank_account_number}
                  />

                  <TextInput
                    label="Bank Name"
                    placeholder="e.g., Dutch-Bangla Bank, BRAC Bank"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    error={fieldErrors.bank_name}
                  />

                  <TextInput
                    label="Branch Name"
                    placeholder="e.g., Gulshan Avenue Branch"
                    value={formData.bank_branch}
                    onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                    error={fieldErrors.bank_branch}
                  />
                </SimpleGrid>
              </Box>

              {/* Professional Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconBriefcase size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                  <Title order={4}>Professional Information</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <Select
                    label="Department"
                    placeholder="Select department"
                    data={departments.map((dept) => ({
                      value: dept.id.toString(),
                      label: dept.name,
                    }))}
                    value={formData.department_id}
                    onChange={(value) => handleInputChange('department_id', value)}
                    required
                    withAsterisk
                    searchable
                    error={fieldErrors.department_id}
                  />

                  <TextInput
                    label="Designation"
                    placeholder="Software Engineer"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.designation}
                  />

                  <TextInput
                    label="Joining Date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => handleInputChange('joining_date', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.joining_date}
                  />
                </SimpleGrid>
              </Box>

              {/* Salary Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconCoin size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
                  <Title order={4}>Salary Information</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <NumberInput
                    label="Base Salary"
                    placeholder="15000"
                    value={formData.base_salary ?? ''}
                    onChange={(value) => handleInputChange('base_salary', value)}
                    required
                    withAsterisk
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.base_salary}
                  />

                  <NumberInput
                    label="House Rent"
                    placeholder="5000"
                    value={formData.house_rent ?? ''}
                    onChange={(value) => handleInputChange('house_rent', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.house_rent}
                  />

                  <NumberInput
                    label="Medical Allowance"
                    placeholder="2000"
                    value={formData.medical_allowance ?? ''}
                    onChange={(value) => handleInputChange('medical_allowance', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.medical_allowance}
                  />

                  <NumberInput
                    label="Conveyance Allowance"
                    placeholder="2000"
                    value={formData.conveyance_allowance ?? ''}
                    onChange={(value) => handleInputChange('conveyance_allowance', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.conveyance_allowance}
                  />

                  <NumberInput
                    label="Overtime Hourly Rate"
                    placeholder="200"
                    value={formData.overtime_hourly_rate ?? ''}
                    onChange={(value) => handleInputChange('overtime_hourly_rate', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.overtime_hourly_rate}
                  />
                </SimpleGrid>
              </Box>

              {/* Submit Buttons */}
              <Group justify="flex-end" >
                <Button
                  type="button"
                  variant="default"
                  onClick={() => navigate('/hrm/staff')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} leftSection={<IconCheck size={16} />}>
                  Create Staff
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  )
}
