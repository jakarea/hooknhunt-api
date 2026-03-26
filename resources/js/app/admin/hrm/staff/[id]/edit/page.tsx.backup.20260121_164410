import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { bangladeshDivisions } from '@/data/bangladesh-divisions'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  TextInput,
  Select,
  NumberInput,
  Paper,
  Grid,
  Breadcrumbs,
  Anchor,
  LoadingOverlay,
  Checkbox,
  SimpleGrid,
  Badge,
  Tabs,
  Alert,
  ActionIcon,
  Avatar,
  PasswordInput,
} from '@mantine/core'
import { IconChevronRight, IconDeviceFloppy, IconArrowLeft, IconSearch, IconCheck, IconX, IconRefresh, IconLock, IconUser, IconKey } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/authStore'

  
interface Permission {
  id: number
  name: string
  slug: string
  group_name: string
}

interface PermissionGroup {
  [key: string]: Permission[]
}

interface ValidationErrors {
  name?: string
  phone?: string
  email?: string
  roleId?: string
  designation?: string
  joiningDate?: string
  baseSalary?: string
  password?: string
}

export default function EditStaffPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEditProfile, isSuperAdmin } = usePermissions()
  const { user: currentUser } = useAuthStore()

  // ALL React hooks must be declared before any conditional logic
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  // Data from API
  const [roles, setRoles] = useState<Array<{ value: string; label: string }>>([])
  const [departments, setDepartments] = useState<Array<{ value: string; label: string }>>([])
  const [allPermissions, setAllPermissions] = useState<PermissionGroup>({})

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [designation, setDesignation] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [baseSalary, setBaseSalary] = useState<number | 0>(0)
  const [houseRent, setHouseRent] = useState<number | 0>(0)
  const [medicalAllowance, setMedicalAllowance] = useState<number | 0>(0)
  const [conveyanceAllowance, setConveyanceAllowance] = useState<number | 0>(0)
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState<number | 0>(0)
  const [address, setAddress] = useState('')
  const [division, setDivision] = useState('')
  const [district, setDistrict] = useState('')
  const [thana, setThana] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [officeEmail, setOfficeEmail] = useState('')
  const [officeEmailPassword, setOfficeEmailPassword] = useState('')
  const [grantedPermissions, setGrantedPermissions] = useState<number[]>([])
  const [blockedPermissions, setBlockedPermissions] = useState<number[]>([])
  const [permissionSearch, setPermissionSearch] = useState('')
  const [activePermissionTab, setActivePermissionTab] = useState<'granted' | 'blocked'>('granted')

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Derived state for cascading dropdowns
  const selectedDivisionData = bangladeshDivisions.find(d => d.name === division)
  const availableDistricts = selectedDivisionData?.districts || []
  // Remove duplicate districts by name
  const uniqueDistricts = availableDistricts.filter((district, index, self) =>
    index === self.findIndex((d) => d.name === district.name)
  )
  const selectedDistrictData = uniqueDistricts.find(d => d.name === district)
  const availableThanas = selectedDistrictData?.thanas || []
  // Remove duplicate thanas by name
  const uniqueThanas = availableThanas.filter((thana, index, self) =>
    index === self.findIndex((t) => t.name === thana.name)
  )

  // Helper to clear dependent fields
  const handleDivisionChange = (value: string) => {
    setDivision(value)
    setDistrict('')
    setThana('')
  }

  const handleDistrictChange = (value: string) => {
    setDistrict(value)
    setThana('')
  }

  // Helper function to format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return ''

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }

    // Convert ISO date string or other formats to YYYY-MM-DD
    try {
      const date = new Date(dateString)
      // Get the date parts in local timezone to avoid timezone issues
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      console.error('Invalid date format:', dateString)
      return ''
    }
  }

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch roles
        const rolesRes = await api.get('/hrm/roles?type=staff')
        let rolesData = rolesRes.data.data || []

        // Filter out super_admin role for non-super-admin users
        if (!isSuperAdmin()) {
          rolesData = rolesData.filter((r: { id: number; name: string; slug: string }) => r.slug !== 'super_admin')
        }

        setRoles(rolesData.map((r: { id: number; name: string }) => ({ value: String(r.id), label: r.name })))

        // Fetch departments
        const deptRes = await api.get('/hrm/departments')
        const deptData = deptRes.data.data || []
        setDepartments(deptData.map((d: { id: number; name: string }) => ({ value: String(d.id), label: d.name })))

        // Fetch permissions
        const permRes = await api.get('/hrm/permissions')
        const permData = permRes.data.data || []
        const groupedPermissions: PermissionGroup = {}
        permData.forEach((p: Permission) => {
          if (!groupedPermissions[p.group_name]) {
            groupedPermissions[p.group_name] = []
          }
          groupedPermissions[p.group_name].push(p)
        })
        setAllPermissions(groupedPermissions)
      } catch (error: unknown) {
        console.error('Failed to fetch dropdown data:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load form data. Please refresh.',
          color: 'red',
        })
      }
    }

    fetchDropdownData()
  }, [isSuperAdmin])

  // Fetch user data
  useEffect(() => {
    if (!id) return

    const fetchUserData = async () => {
      try {
        setInitialLoading(true)
        const response = await api.get(`/hrm/staff/${id}`)

        const userData = response.data.data.user

        setName(userData.name)
        setPhone(userData.phone)
        setEmail(userData.email || '')
        setRoleId(String(userData.roleId))
        setIsActive(userData.isActive)

        // Profile data (may be null)
        if (userData.staffProfile) {
          setDesignation(userData.staffProfile.designation || '')
          setDepartmentId(userData.staffProfile.departmentId ? String(userData.staffProfile.departmentId) : '')
          setJoiningDate(formatDateForInput(userData.staffProfile.joiningDate))
          setBaseSalary(userData.staffProfile.baseSalary || 0)
          setHouseRent(userData.staffProfile.houseRent || 0)
          setMedicalAllowance(userData.staffProfile.medicalAllowance || 0)
          setConveyanceAllowance(userData.staffProfile.conveyanceAllowance || 0)
          setOvertimeHourlyRate(userData.staffProfile.overtimeHourlyRate || 0)
          setAddress(userData.staffProfile.address || '')
          setDivision(userData.staffProfile.division || '')
          setDistrict(userData.staffProfile.district || '')
          setThana(userData.staffProfile.thana || '')
          setDob(formatDateForInput(userData.staffProfile.dob))
          setGender(userData.staffProfile.gender || '')
          setWhatsappNumber(userData.staffProfile.whatsappNumber || '')
          setOfficeEmail(userData.staffProfile.officeEmail || '')
          setOfficeEmailPassword(userData.staffProfile.officeEmailPassword || '')
        }

        // Fetch user permissions separately
        try {
          const permResponse = await api.get(`/user-management/users/${id}`)
          const permData = permResponse.data.data
          const granted = permData.grantedPermissions || []
          const blocked = permData.blockedPermissions || []
          setGrantedPermissions(granted.map((p: Permission) => p.id))
          setBlockedPermissions(blocked.map((p: Permission) => p.id))
        } catch (permError) {
          console.error('Failed to fetch permissions:', permError)
          // Continue without permissions
          setGrantedPermissions([])
          setBlockedPermissions([])
        }
      } catch (error: unknown) {
        console.error('Failed to fetch user:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load user data. Please try again.',
          color: 'red',
        })
        navigate('/hrm/staff')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchUserData()
  }, [id, navigate])

  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (!name.trim()) {
      errors.name = 'Name is required'
    } else if (name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters'
    }

    if (!phone.trim()) {
      errors.phone = 'Phone is required'
    } else if (!/^\d{11}$/.test(phone.replace(/\s/g, ''))) {
      errors.phone = 'Phone must be 11 digits'
    }

    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format'
    }

    if (!roleId) {
      errors.roleId = 'Role is required'
    }

    if (joiningDate && new Date(joiningDate) > new Date()) {
      errors.joiningDate = 'Joining date cannot be in the future'
    }

    // Base salary is required by database (NOT NULL constraint)
    if (baseSalary === null || baseSalary === undefined || baseSalary < 0) {
      errors.baseSalary = 'Base salary is required and must be positive'
    }

    if (password && password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Helper function to format date to YYYY-MM-DD for MySQL
  const formatDateForMySQL = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }

    // Convert ISO date string to YYYY-MM-DD
    try {
      const date = new Date(dateString)
      // Get the date parts in local timezone to avoid timezone issues
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      console.error('Invalid date format:', dateString)
      return null
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      // Prepare payload
      const payload: {
        name: string
        phone: string
        email: string | null
        role_id: number
        is_active: boolean
        department_id: number | null
        designation: string | null
        joining_date: string | null
        base_salary: number
        house_rent: number
        medical_allowance: number
        conveyance_allowance: number
        overtime_hourly_rate: number
        address: string | null
        division: string | null
        district: string | null
        thana: string | null
        dob: string | null
        gender: string | null
        whatsapp_number: string | null
        office_email: string | null
        office_email_password: string | null
        password?: string
      } = {
        name,
        phone,
        email: email || null,
        role_id: parseInt(roleId),
        is_active: isActive,
        department_id: departmentId ? parseInt(departmentId) : null,
        designation: designation || null,
        joining_date: formatDateForMySQL(joiningDate),
        base_salary: baseSalary !== null && baseSalary !== undefined ? baseSalary : 0,
        house_rent: houseRent || 0,
        medical_allowance: medicalAllowance || 0,
        conveyance_allowance: conveyanceAllowance || 0,
        overtime_hourly_rate: overtimeHourlyRate || 0,
        address: address || null,
        division: division || null,
        district: district || null,
        thana: thana || null,
        dob: formatDateForMySQL(dob),
        gender: gender || null,
        whatsapp_number: whatsappNumber || null,
        office_email: officeEmail || null,
        office_email_password: officeEmailPassword || null,
      }

      // Only include password if it's provided and user has permission
      if (canEditPassword && password) {
        payload.password = password
      }

      // Update user
      await api.put(`/hrm/staff/${id}`, payload)

      // Sync permissions conditionally - only if there are permissions to sync
      const permissionPromises = []

      if (grantedPermissions.length > 0) {
        permissionPromises.push(
          api.put(`/user-management/users/${id}/permissions/granted`, {
            permissions: grantedPermissions,
          })
        )
      }

      if (blockedPermissions.length > 0) {
        permissionPromises.push(
          api.put(`/user-management/users/${id}/permissions/blocked`, {
            permissions: blockedPermissions,
          })
        )
      }

      // Execute permission sync requests in parallel if any exist
      if (permissionPromises.length > 0) {
        await Promise.all(permissionPromises)
      }

      notifications.show({
        title: 'User Updated',
        message: `${name} has been updated successfully${grantedPermissions.length > 0 || blockedPermissions.length > 0 ? ` with ${grantedPermissions.length} granted and ${blockedPermissions.length} blocked permissions` : ''}`,
        color: 'green',
      })
      navigate(`/hrm/staff/${id}`)
    } catch (error) {
      console.error('Failed to update user:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to update user. Please try again.',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filter permissions for autocomplete search (excluding already selected)
  const searchResults = useMemo(() => {
    if (!permissionSearch.trim()) {
      return []
    }

    const query = permissionSearch.toLowerCase()
    const alreadySelected = [
      ...grantedPermissions,
      ...blockedPermissions
    ]

    // Convert allPermissions object to array format for search
    return Object.entries(allPermissions)
      .map(([groupName, permissions]) => ({
        module: groupName,
        permissions: permissions.filter((perm) =>
          (perm.name.toLowerCase().includes(query) || groupName.toLowerCase().includes(query)) &&
          !alreadySelected.includes(perm.id)
        ),
      }))
      .filter((group) => group.permissions.length > 0)
  }, [permissionSearch, grantedPermissions, blockedPermissions, allPermissions])

  // Add permission from search to current tab
  const addPermissionFromSearch = (permissionId: number) => {
    if (activePermissionTab === 'granted') {
      setGrantedPermissions([...grantedPermissions, permissionId])
      setBlockedPermissions(blockedPermissions.filter((id) => id !== permissionId))
    } else {
      setBlockedPermissions([...blockedPermissions, permissionId])
      setGrantedPermissions(grantedPermissions.filter((id) => id !== permissionId))
    }
    setPermissionSearch('') // Clear search after adding
  }

  // Get permission details by ID
  const getPermissionById = (id: number) => {
    for (const [groupName, permissions] of Object.entries(allPermissions)) {
      const perm = permissions.find(p => p.id === id)
      if (perm) {
        return { ...perm, module: groupName }
      }
    }
    return null
  }

  // Handle cancel
  const handleCancel = () => {
    navigate(`/hrm/staff/${id}`)
  }

  // Check permission - user can edit own profile OR needs staff.edit permission
  const staffId = parseInt(id || '0')
  const hasAccess = canEditProfile(staffId)

  // Check if current user is profile owner or super_admin for password access
  const canEditPassword = currentUser?.id === staffId || isSuperAdmin()

  // Show loading state
  if (initialLoading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Text>Loading user data...</Text>
      </Box>
    )
  }

  // Show access denied UI
  if (!hasAccess) {
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
                <Text size="lg" c="dimmed">
                  You don't have permission to edit this staff profile.
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
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

  // Main form UI
  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={14} />}>
          <Anchor href="/dashboard" c="dimmed">Dashboard</Anchor>
          <Anchor href="/hrm/staff" c="dimmed">Users</Anchor>
          <Anchor href={`/hrm/staff/${id}`} c="dimmed">Profile</Anchor>
          <Text c="red">Edit Staff</Text>
        </Breadcrumbs>

        {/* Header */}
        <Box>
          <Group >
            <Button
              variant="subtle"
              size="sm"
              component={Link}
              to={`/hrm/staff/${id}`}
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Profile
            </Button>
          </Group>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl"> {name}</Title>
          <Text c="dimmed">Update user information and settings</Text>
        </Box>

        {/* Form Sections */}
        <Stack >
          {/* Basic Information */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" pos="relative">
            <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
            <Stack >
              <Title order={3} className="text-base md:text-lg lg:text-xl">Basic Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Full Name"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    error={validationErrors.name}
                    required
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Phone"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.currentTarget.value)}
                    error={validationErrors.phone}
                    required
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    error={validationErrors.email}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Role"
                    placeholder="Select role"
                    data={roles}
                    value={roleId}
                    onChange={(value) => setRoleId(value as string)}
                    error={validationErrors.roleId}
                    required
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Status"
                    placeholder="Select status"
                    data={[
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' },
                    ]}
                    value={String(isActive)}
                    onChange={(value) => setIsActive(value === 'true')}
                    size="md"
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* Professional Information */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" pos="relative">
            <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
            <Stack >
              <Title order={3} className="text-base md:text-lg lg:text-xl">Professional Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Department"
                    placeholder="Select department"
                    data={departments}
                    value={departmentId}
                    onChange={(value) => setDepartmentId(value as string)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Designation"
                    placeholder="Job title"
                    value={designation}
                    onChange={(e) => setDesignation(e.currentTarget.value)}
                    error={validationErrors.designation}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    type="date"
                    label="Joining Date"
                    placeholder="Select joining date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.currentTarget.value)}
                    error={validationErrors.joiningDate}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Base Salary"
                    placeholder="Enter salary"
                    value={baseSalary}
                    onChange={(value) => setBaseSalary(value as number)}
                    error={validationErrors.baseSalary}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="House Rent"
                    placeholder="Enter house rent"
                    value={houseRent}
                    onChange={(value) => setHouseRent(value as number)}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Medical Allowance"
                    placeholder="Enter medical allowance"
                    value={medicalAllowance}
                    onChange={(value) => setMedicalAllowance(value as number)}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Conveyance Allowance"
                    placeholder="Enter conveyance allowance"
                    value={conveyanceAllowance}
                    onChange={(value) => setConveyanceAllowance(value as number)}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Overtime Hourly Rate"
                    placeholder="Enter overtime rate"
                    value={overtimeHourlyRate}
                    onChange={(value) => setOvertimeHourlyRate(value as number)}
                    min={0}
                    size="md"
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* Personal Information */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" pos="relative">
            <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
            <Stack >
              <Title order={3} className="text-base md:text-lg lg:text-xl">Personal Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    type="date"
                    label="Date of Birth"
                    placeholder="Select date of birth"
                    value={dob}
                    onChange={(e) => setDob(e.currentTarget.value)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Select
                    label="Gender"
                    placeholder="Select gender"
                    data={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={gender}
                    onChange={(value) => setGender(value as string)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12 }}>
                  <TextInput
                    label="Address"
                    placeholder="Enter full address"
                    value={address}
                    onChange={(e) => setAddress(e.currentTarget.value)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Division"
                    placeholder="Select division"
                    data={bangladeshDivisions.map(d => ({ value: d.name, label: d.name }))}
                    value={division}
                    onChange={(value) => handleDivisionChange(value || '')}
                    searchable
                    clearable
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="District"
                    placeholder="Select district"
                    data={uniqueDistricts.map(d => ({ value: d.name, label: d.name }))}
                    value={district}
                    onChange={(value) => handleDistrictChange(value || '')}
                    searchable
                    clearable
                    disabled={!division}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Thana"
                    placeholder="Select thana"
                    data={uniqueThanas.map(t => ({ value: t.name, label: t.name }))}
                    value={thana}
                    onChange={(value) => setThana(value || '')}
                    searchable
                    clearable
                    disabled={!district}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="WhatsApp Number"
                    placeholder="01XXXXXXXXX"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.currentTarget.value)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Office Email"
                    type="email"
                    placeholder="staff@company.com"
                    value={officeEmail}
                    onChange={(e) => setOfficeEmail(e.currentTarget.value)}
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Office Email Password"
                    placeholder="Enter office email password"
                    value={officeEmailPassword}
                    onChange={(e) => setOfficeEmailPassword(e.currentTarget.value)}
                    size="md"
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>

          {/* Password Section - Only for profile owner or super_admin */}
          {canEditPassword && (
            <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" pos="relative">
              <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
              <Stack >
                <Group>
                  <IconKey size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                  <Title order={3} className="text-base md:text-lg lg:text-xl">Change Password</Title>
                </Group>

                <Alert variant="light" color="blue" icon={<IconLock size={16} />}>
                  <Text size="sm">
                    Leave password fields empty to keep the current password. Only fill them if you want to change the password.
                  </Text>
                </Alert>

                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <PasswordInput
                      label="New Password"
                      placeholder="Enter new password (optional)"
                      value={password}
                      onChange={(e) => setPassword(e.currentTarget.value)}
                      error={validationErrors.password}
                      size="md"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Confirm new password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.currentTarget.value)}
                      error={password && passwordConfirmation && password !== passwordConfirmation ? 'Passwords do not match' : undefined}
                      size="md"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Paper>
          )}

          {/* Permissions Section */}
          {/* <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg" pos="relative">
            <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
            <Stack > */}
              {/* <Group justify="space-between">
                <Title order={3} className="text-base md:text-lg lg:text-xl">User-Level Permissions</Title>
                <Group >
                  <Badge color="green" size="lg">{grantedPermissions.length} granted</Badge>
                  <Badge color="red" size="lg">{blockedPermissions.length} blocked</Badge>
                </Group>
              </Group> */}

              {/* <Alert variant="light" color="blue" icon={<IconRefresh size={16} />}>
                <Text size="sm">
                  <strong>Granted:</strong> User gets permission even if role doesn't have it.{' '}
                  <strong>Blocked:</strong> User is denied permission even if role has it.{' '}
                  <strong>Inherit:</strong> Permission comes from role.
                </Text>
              </Alert> */}

              {/* Search Autocomplete */}
              {/* <Box pos="relative">
                <TextInput
                  placeholder="Search permissions to add..."
                  leftSection={<IconSearch size={16} />}
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.currentTarget.value)}
                  size="md"
                />

                {/* Search Results Dropdown */}
                {/*  {permissionSearch.trim() && searchResults.length > 0 && (
                  <Paper
                    withBorder
                    shadow="md"
                    mt="xs"
                    p="xs"
                    pos="absolute"
                    w="100%"
                    style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}
                  >
                    <Stack >
                      {searchResults.map((group) => (
                        <Box key={group.module}>
                          <Text size="xs" fw={700} c="dimmed" mb="xs" px="sm">
                            {group.module}
                          </Text>
                          <Stack gap={2}>
                            {group.permissions.map((permission) => (
                              <Group
                                key={permission.id}
                                
                                p="4px 8px"
                                style={{
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'var(--mantine-color-gray-1)',
                                  },
                                }}
                                onClick={() => addPermissionFromSearch(permission.id)}
                              >
                                <Text size="sm">{permission.name}</Text>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color={activePermissionTab === 'granted' ? 'green' : 'red'}
                                >
                                  {activePermissionTab === 'granted' ? 'Grant' : 'Block'}
                                </Badge>
                              </Group>
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}

                {permissionSearch.trim() && searchResults.length === 0 && (
                  <Paper
                    withBorder
                    shadow="md"
                    mt="xs"
                    p="md"
                    pos="absolute"
                    w="100%"
                    style={{ zIndex: 1000 }}
                  >
                    <Text size="sm" c="dimmed" ta="center">
                      No permissions found
                    </Text>
                  </Paper>
                )}
              </Box> */}

              {/* Tabs for Granted and Blocked */}
              {/* <Tabs defaultValue="granted" onChange={(value) => setActivePermissionTab(value as 'granted' | 'blocked')}> */}
                {/* <Tabs.List>
                  <Tabs.Tab value="granted" leftSection={<IconCheck size={14} />}>
                    Granted Permissions ({grantedPermissions.length})
                  </Tabs.Tab>
                  <Tabs.Tab value="blocked" leftSection={<IconX size={14} />}>
                    Blocked Permissions ({blockedPermissions.length})
                  </Tabs.Tab>
                </Tabs.List> */}

                {/* Granted Permissions Tab */}
                {/* <Tabs.Panel value="granted">
                  <Stack  mt="md">
                    {grantedPermissions.length > 0 ? (
                      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
                        {grantedPermissions.map((permId) => {
                          const perm = getPermissionById(permId)
                          if (!perm) return null
                          return (
                            <Paper key={permId} withBorder p="sm" radius="md">
                              <Group justify="space-between" align="center">
                                <Group  style={{ flex: 1 }}>
                                  <Checkbox
                                    checked={true}
                                    onChange={() => setGrantedPermissions(grantedPermissions.filter(id => id !== permId))}
                                    color="green"
                                    label=""
                                    size="sm"
                                  />
                                  <Box style={{ flex: 1 }}>
                                    <Text size="sm" fw={500}>{perm.name}</Text>
                                    <Text size="xs" c="dimmed">{perm.module}</Text>
                                  </Box>
                                </Group>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() => setGrantedPermissions(grantedPermissions.filter(id => id !== permId))}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            </Paper>
                          )
                        })}
                      </SimpleGrid>
                    ) : (
                      <Box py="xl">
                        <Text c="dimmed" ta="center" size="sm">
                          No granted permissions. Use the search above to add permissions.
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </Tabs.Panel> */}

                {/* Blocked Permissions Tab */}
                {/* <Tabs.Panel value="blocked">
                  <Stack  mt="md">
                    {blockedPermissions.length > 0 ? (
                      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
                        {blockedPermissions.map((permId) => {
                          const perm = getPermissionById(permId)
                          if (!perm) return null
                          return (
                            <Paper key={permId} withBorder p="sm" radius="md">
                              <Group justify="space-between" align="center">
                                <Group  style={{ flex: 1 }}>
                                  <Checkbox
                                    checked={true}
                                    onChange={() => setBlockedPermissions(blockedPermissions.filter(id => id !== permId))}
                                    color="red"
                                    label=""
                                    size="sm"
                                  />
                                  <Box style={{ flex: 1 }}>
                                    <Text size="sm" fw={500}>{perm.name}</Text>
                                    <Text size="xs" c="dimmed">{perm.module}</Text>
                                  </Box>
                                </Group>
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  size="sm"
                                  onClick={() => setBlockedPermissions(blockedPermissions.filter(id => id !== permId))}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            </Paper>
                          )
                        })}
                      </SimpleGrid>
                    ) : (
                      <Box py="xl">
                        <Text c="dimmed" ta="center" size="sm">
                          No blocked permissions. Use the search above to add permissions.
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </Tabs.Panel> 
              </Tabs>*/}

              {/* Quick Actions */}
              {/* <Group >
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => {
                    setGrantedPermissions([])
                    setBlockedPermissions([])
                  }}
                >
                  Clear All (Inherit from Role)
                </Button>
              </Group> */}
            {/* </Stack>
          </Paper> */}

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={handleCancel}
              size="md"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              leftSection={<IconDeviceFloppy size={16} />}
              disabled={saving}
              size="md"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Box>
  )
}
