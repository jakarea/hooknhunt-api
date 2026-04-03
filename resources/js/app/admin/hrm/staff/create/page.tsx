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
  FileInput,
  Image,
  ActionIcon,
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
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
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

  // Documents
  profile_photo_id: number | null
  national_id: number | null
  resume: number | null
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

  // Documents
  profile_photo_id: null,
  national_id: null,
  resume: null,
}

interface FieldErrors {
  [key: string]: string
}

export default function CreateStaffPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission, isSuperAdmin } = usePermissions()

  // ALL hooks must be declared before any conditional logic or early returns
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Document upload state
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [docPreviews, setDocPreviews] = useState<{
    profile_photo_id: { file: File; url: string } | null
    national_id: { file: File; url: string } | null
    resume: { file: File; url: string } | null
  }>({
    profile_photo_id: null,
    national_id: null,
    resume: null,
  })

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

  // Handle document file uploads
  const handleDocUpload = async (field: keyof FormData, file: File | null) => {
    if (!file) {
      setDocPreviews((prev) => ({ ...prev, [field]: null }))
      setFormData((prev) => ({ ...prev, [field]: null }))
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setDocPreviews((prev) => ({ ...prev, [field]: { file, url: previewUrl } }))
  }

  // Handle clearing a document
  const handleClearDocument = (field: keyof FormData) => {
    setDocPreviews((prev) => ({ ...prev, [field]: null }))
    setFormData((prev) => ({ ...prev, [field]: null }))
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return t('hrm.staff.validation.nameRequired')
    if (!formData.phone.trim()) return t('hrm.staff.validation.phoneRequired')
    if (!formData.role_id) return t('hrm.staff.validation.roleRequired')
    if (!formData.department_id) return t('hrm.staff.validation.departmentRequired')
    if (!formData.designation.trim()) return t('hrm.staff.validation.designationRequired')
    if (!formData.joining_date) return t('hrm.staff.validation.joiningDateRequired')
    if (!formData.base_salary || formData.base_salary <= 0) return t('hrm.staff.validation.baseSalaryRequired')

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return t('hrm.staff.validation.emailInvalid')
    }
    if (formData.office_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.office_email)) {
      return t('hrm.staff.validation.officeEmailInvalid')
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
      setUploadingDocs(true)

      // Upload documents first
      const docUploads = {
        profile_photo_id: null as number | null,
        national_id: null as number | null,
        resume: null as number | null,
      }

      // Upload profile photo
      if (docPreviews.profile_photo_id?.file) {
        const formData = new FormData()
        formData.append('files[]', docPreviews.profile_photo_id.file)
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        if (uploadRes.data?.data?.[0]?.id) {
          docUploads.profile_photo_id = uploadRes.data.data[0].id
        }
      }

      // Upload national ID
      if (docPreviews.national_id?.file) {
        const formData = new FormData()
        formData.append('files[]', docPreviews.national_id.file)
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        if (uploadRes.data?.data?.[0]?.id) {
          docUploads.national_id = uploadRes.data.data[0].id
        }
      }

      // Upload resume
      if (docPreviews.resume?.file) {
        const formData = new FormData()
        formData.append('files[]', docPreviews.resume.file)
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        if (uploadRes.data?.data?.[0]?.id) {
          docUploads.resume = uploadRes.data.data[0].id
        }
      }

      setUploadingDocs(false)

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

        // Document uploads
        profile_photo_id: docUploads.profile_photo_id,
        national_id: docUploads.national_id,
        resume: docUploads.resume,
      }

      await api.post('/hrm/staff', payload)

      notifications.show({
        title: t('common.success'),
        message: t('hrm.staff.created'),
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
      setUploadingDocs(false)
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
                {t('hrm.staff.createTitle')}
              </Title>
              <Text c="dimmed">{t('hrm.staff.createSubtitle')}</Text>
            </Box>
            <Button
              component={Link}
              to="/hrm/staff"
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
            >
              {t('common.back')}
            </Button>
          </Group>

          {/* Form */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" component="form" onSubmit={handleSubmit}>
            <Stack>
              {/* Account Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconUser size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                  <Title order={4}>{t('hrm.staff.accountInfo')}</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label={t('hrm.staff.fullName')}
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.name}
                  />

                  <TextInput
                    label={t('hrm.staff.phoneNumber')}
                    placeholder="01XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.phone}
                  />

                  <TextInput
                    label={t('hrm.staff.personalEmail')}
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={fieldErrors.email}
                  />

                  <Select
                    label={t('hrm.staff.role')}
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
                  <Title order={4}>{t('hrm.staff.personalDetails')}</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <Select
                    label={t('hrm.staff.gender')}
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
                    label={t('hrm.staff.dateOfBirth')}
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    error={fieldErrors.dob}
                  />

                  <TextInput
                    label={t('hrm.staff.whatsappNumber')}
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
                  <Title order={4}>{t('hrm.staff.bankInfo')}</Title>
                  <Text size="xs" c="dimmed">{t('hrm.staff.bankInfoSubtitle')}</Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <TextInput
                    label={t('hrm.staff.accountHolderName')}
                    placeholder={t('hrm.staff.enterAccountHolderName')}
                    value={formData.bank_account_name}
                    onChange={(e) => handleInputChange('bank_account_name', e.target.value)}
                    error={fieldErrors.bank_account_name}
                  />

                  <TextInput
                    label={t('hrm.staff.bankAccountNumber')}
                    placeholder={t('hrm.staff.enterBankAccountNumber')}
                    value={formData.bank_account_number}
                    onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                    error={fieldErrors.bank_account_number}
                  />

                  <TextInput
                    label={t('hrm.staff.bankName')}
                    placeholder={t('hrm.staff.enterBankName')}
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    error={fieldErrors.bank_name}
                  />

                  <TextInput
                    label={t('hrm.staff.branchName')}
                    placeholder={t('hrm.staff.enterBranchName')}
                    value={formData.bank_branch}
                    onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                    error={fieldErrors.bank_branch}
                  />
                </SimpleGrid>
              </Box>

              {/* Document Uploads */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconUpload size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                  <Title order={4}>{t('hrm.staff.documents')}</Title>
                  <Text size="xs" c="dimmed">{t('hrm.staff.uploadDocuments')}</Text>
                </Group>
                <SimpleGrid cols={{ base: 1, md: 3 }}>
                  {/* Profile Photo */}
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>{t('hrm.staff.profilePhoto')}</Text>
                    {docPreviews.profile_photo_id ? (
                      <Group gap="xs">
                        <Avatar src={docPreviews.profile_photo_id.url} size={40} radius="xl" />
                        <Text size="xs" style={{ flex: 1 }} lineClamp={1}>
                          {docPreviews.profile_photo_id.file.name}
                        </Text>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => handleClearDocument('profile_photo_id')}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <FileInput
                        accept="image/*"
                        onChange={(file) => handleDocUpload('profile_photo_id', file)}
                        leftSection={<IconUpload size={14} />}
                        size="xs"
                      />
                    )}
                  </Stack>

                  {/* National ID */}
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>{t('hrm.staff.nationalId')}</Text>
                    {docPreviews.national_id ? (
                      <Group gap="xs">
                        <IconId size={24} />
                        <Text size="xs" style={{ flex: 1 }} lineClamp={1}>
                          {docPreviews.national_id.file.name}
                        </Text>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => handleClearDocument('national_id')}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <FileInput
                        accept="image/*"
                        onChange={(file) => handleDocUpload('national_id', file)}
                        leftSection={<IconUpload size={14} />}
                        size="xs"
                      />
                    )}
                  </Stack>

                  {/* Resume (PDF) */}
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>{t('hrm.staff.resume')}</Text>
                    {docPreviews.resume ? (
                      <Group gap="xs">
                        <IconId size={24} />
                        <Text size="xs" style={{ flex: 1 }} lineClamp={1}>
                          {docPreviews.resume.file.name}
                        </Text>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => handleClearDocument('resume')}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <FileInput
                        accept=".pdf,application/pdf"
                        onChange={(file) => handleDocUpload('resume', file)}
                        leftSection={<IconUpload size={14} />}
                        size="xs"
                      />
                    )}
                  </Stack>
                </SimpleGrid>
              </Box>

              {/* Professional Information */}
              <Box>
                <Group gap="xs" mb="md">
                  <IconBriefcase size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
                  <Title order={4}>{t('hrm.staff.professionalInfo')}</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <Select
                    label={t('hrm.staff.department')}
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
                    label={t('hrm.staff.designation')}
                    placeholder="Software Engineer"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    required
                    withAsterisk
                    error={fieldErrors.designation}
                  />

                  <TextInput
                    label={t('hrm.staff.joiningDate')}
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
                  <Title order={4}>{t('hrm.staff.salaryInfo')}</Title>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                  <NumberInput
                    label={t('hrm.staff.baseSalary')}
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
                    label={t('hrm.staff.houseRent')}
                    placeholder="5000"
                    value={formData.house_rent ?? ''}
                    onChange={(value) => handleInputChange('house_rent', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.house_rent}
                  />

                  <NumberInput
                    label={t('hrm.staff.medicalAllowance')}
                    placeholder="2000"
                    value={formData.medical_allowance ?? ''}
                    onChange={(value) => handleInputChange('medical_allowance', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.medical_allowance}
                  />

                  <NumberInput
                    label={t('hrm.staff.conveyanceAllowance')}
                    placeholder="2000"
                    value={formData.conveyance_allowance ?? ''}
                    onChange={(value) => handleInputChange('conveyance_allowance', value)}
                    min={0}
                    prefix="৳"
                    decimalScale={2}
                    error={fieldErrors.conveyance_allowance}
                  />

                  <NumberInput
                    label={t('hrm.staff.overtimeHourlyRate')}
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
                <Button
                  type="submit"
                  loading={submitting || uploadingDocs}
                  leftSection={<IconCheck size={16} />}
                >
                  {uploadingDocs ? t('hrm.staff.uploadingDocuments') : submitting ? t('hrm.staff.creatingStaff') : t('hrm.staff.create')}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Box>
  )
}
