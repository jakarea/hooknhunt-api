import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  TextInput,
  NumberInput,
  Checkbox,
  Paper,
  SimpleGrid,
  Grid,
  Breadcrumbs,
  Anchor,
  Alert,
  LoadingOverlay,
} from '@mantine/core'
import { IconChevronRight, IconDeviceFloppy, IconInfoCircle, IconSearch } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'

interface Permission {
  id: number
  name: string
  key: string | null
  slug: string
  group_name: string
  module_name: string
}

interface PermissionGroup {
  groupName: string
  modules: ModulePermissions[]
}

interface ModulePermissions {
  module_name: string
  permissions: Permission[]
}

interface ValidationErrors {
  roleName?: string
  description?: string
  position?: string
}

export default function EditRolePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [position, setPosition] = useState(1)
  const [usersCount, setUsersCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPermissionSlugs, setSelectedPermissionSlugs] = useState<string[]>([])
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch role data and permissions on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        setInitialLoading(true)
        setError(null)

        // Fetch role data
        const roleResponse = await api.get(`/hrm/roles/${id}`)

        if (roleResponse.data?.data) {
          const role = roleResponse.data.data
          setRoleName(role.name)
          setRoleDescription(role.description || '')
          setPosition(role.position || 1)
          setUsersCount(role.users?.length || 0)

          // Extract permission slugs from role (filter out nulls)
          const slugs = role.permissions?.map((p: Permission) => p.slug).filter((slug: string): slug is string => slug !== null) || []
          setSelectedPermissionSlugs(slugs)
        }

        // Fetch all permissions
        const permsResponse = await api.get('/hrm/permissions/grouped')

        if (permsResponse.data?.data) {
          // Transform API response into PermissionGroup format
          const groups: PermissionGroup[] = []

          Object.keys(permsResponse.data.data).forEach((groupName) => {
            const groupData = permsResponse.data.data[groupName]

            // Check if groupData is an object (HRM structure) or array (other modules)
            if (Array.isArray(groupData)) {
              // Array structure: Direct array of permissions
              const modules: ModulePermissions[] = [
                {
                  module_name: groupName,
                  permissions: groupData
                    .filter((perm: { slug: string | null }) => perm.slug !== null)
                    .map((perm: { id: number; name: string; slug: string; key: string | null; group_name: string; module_name: string }) => ({
                      id: perm.id,
                      name: perm.name,
                      slug: perm.slug,
                      key: perm.key,
                      group_name: perm.group_name,
                      module_name: perm.module_name,
                    })),
                },
              ]

              groups.push({
                groupName,
                modules,
              })
            } else {
              // Object structure: Has sub-modules (like HRM)
              const modules: ModulePermissions[] = Object.keys(groupData).map((moduleName) => ({
                module_name: moduleName,
                permissions: groupData[moduleName]
                  .filter((perm: { slug: string | null }) => perm.slug !== null)
                  .map((perm: { id: number; name: string; slug: string; key: string | null; group_name: string; module_name: string }) => ({
                    id: perm.id,
                    name: perm.name,
                    slug: perm.slug,
                    key: perm.key,
                    group_name: perm.group_name,
                    module_name: perm.module_name,
                  })),
              }))

              groups.push({
                groupName,
                modules,
              })
            }
          })

          setPermissionGroups(groups)
        }
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err)
        const errorObj = err as { response?: { data?: { message?: string } } }
        setError(errorObj.response?.data?.message || 'Failed to load role data')
        notifications.show({
          title: 'Error',
          message: 'Failed to load role data',
          color: 'red',
        })
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Memoized filtered groups for performance
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return permissionGroups

    const query = searchQuery.toLowerCase()
    return permissionGroups
      .map((group) => ({
        ...group,
        modules: group.modules
          .map((module) => ({
            ...module,
            permissions: module.permissions.filter(
              (perm) =>
                perm.name.toLowerCase().includes(query) ||
                perm.slug.toLowerCase().includes(query) ||
                group.groupName.toLowerCase().includes(query) ||
                module.module_name.toLowerCase().includes(query)
            ),
          }))
          .filter((module) => module.permissions.length > 0),
      }))
      .filter((group) => group.modules.length > 0)
  }, [searchQuery, permissionGroups])

  // Memoized total permissions count
  const totalSelectedPermissions = useMemo(() => selectedPermissionSlugs.length, [selectedPermissionSlugs])
  const totalPermissions = useMemo(() =>
    permissionGroups.reduce((sum, group) =>
      sum + group.modules.reduce((moduleSum, module) => moduleSum + module.permissions.length, 0), 0),
    [permissionGroups]
  )

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {}

    if (!roleName.trim()) {
      errors.roleName = 'Role name is required'
    } else if (roleName.trim().length < 3) {
      errors.roleName = 'Role name must be at least 3 characters'
    } else if (roleName.trim().length > 100) {
      errors.roleName = 'Role name must not exceed 100 characters'
    }

    if (roleDescription.length > 500) {
      errors.description = 'Description must not exceed 500 characters'
    }

    if (!position || position < 1) {
      errors.position = 'Position must be at least 1'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [roleName, roleDescription, position])

  // Handle select all permissions
  const handleSelectAll = useCallback(() => {
    const allSlugs = permissionGroups.flatMap((group) =>
      group.modules.flatMap((module) =>
        module.permissions.map((perm) => perm.slug)
      )
    )
    setSelectedPermissionSlugs(allSlugs)
  }, [permissionGroups])

  // Handle deselect all permissions
  const handleDeselectAll = useCallback(() => {
    setSelectedPermissionSlugs([])
  }, [])

  // Handle bulk select by permission type at GROUP level
  const handleGroupBulkSelectByType = useCallback((group: PermissionGroup, permissionType: string) => {
    const typePatterns: Record<string, string[]> = {
      'View': ['index', 'view'],
      'Show': ['index', 'view'],
      'Create': ['create'],
      'Edit': ['edit', 'update'],
      'Delete': ['delete', 'destroy'],
    }

    const patterns = typePatterns[permissionType] || []
    const matchingPermissions = group.modules.flatMap((module) =>
      module.permissions.filter((perm) =>
        patterns.some((pattern) => perm.slug.toLowerCase().includes(pattern))
      )
    )

    const matchingSlugs = matchingPermissions.map((perm) => perm.slug)

    // Check if all matching permissions are already selected
    const allSelected = matchingSlugs.length > 0 && matchingSlugs.every((slug) => selectedPermissionSlugs.includes(slug))

    if (allSelected) {
      // Deselect matching permissions
      setSelectedPermissionSlugs((prev) => prev.filter((slug) => !matchingSlugs.includes(slug)))
    } else {
      // Select matching permissions
      setSelectedPermissionSlugs((prev) => [
        ...prev.filter((slug) => !matchingSlugs.includes(slug)),
        ...matchingSlugs,
      ])
    }
  }, [selectedPermissionSlugs])

  // Check if all permissions of a specific type in group are selected
  const hasAllPermissionsOfTypeInGroup = useCallback((group: PermissionGroup, permissionType: string) => {
    const typePatterns: Record<string, string[]> = {
      'View': ['index', 'view'],
      'Show': ['index', 'view'],
      'Create': ['create'],
      'Edit': ['edit', 'update'],
      'Delete': ['delete', 'destroy'],
    }

    const patterns = typePatterns[permissionType] || []
    const matchingPermissions = group.modules.flatMap((module) =>
      module.permissions.filter((perm) =>
        patterns.some((pattern) => perm.slug.toLowerCase().includes(pattern))
      )
    )

    const matchingSlugs = matchingPermissions.map((perm) => perm.slug)
    return matchingSlugs.length > 0 && matchingSlugs.every((slug) => selectedPermissionSlugs.includes(slug))
  }, [selectedPermissionSlugs])

  // Handle module select all
  const handleModuleSelectAll = useCallback((module: ModulePermissions) => {
    const moduleSlugs = module.permissions.map((perm) => perm.slug)
    const allSelected = moduleSlugs.every((slug) => selectedPermissionSlugs.includes(slug))

    if (allSelected) {
      // Deselect all in module
      setSelectedPermissionSlugs((prev) => prev.filter((slug) => !moduleSlugs.includes(slug)))
    } else {
      // Select all in module
      setSelectedPermissionSlugs((prev) => [
        ...prev.filter((slug) => !moduleSlugs.includes(slug)),
        ...moduleSlugs,
      ])
    }
  }, [selectedPermissionSlugs])

  // Handle permission toggle
  const handlePermissionToggle = useCallback((permissionSlug: string) => {
    setSelectedPermissionSlugs((prev) =>
      prev.includes(permissionSlug)
        ? prev.filter((slug) => slug !== permissionSlug)
        : [...prev, permissionSlug]
    )
  }, [])

  // Check if module has any permissions selected
  const hasAnyPermissionInModule = useCallback((module: ModulePermissions) => {
    return module.permissions.some((perm) => selectedPermissionSlugs.includes(perm.slug))
  }, [selectedPermissionSlugs])

  // Check if module has all permissions selected
  const hasAllPermissionsInModule = useCallback((module: ModulePermissions) => {
    return module.permissions.every((perm) => selectedPermissionSlugs.includes(perm.slug))
  }, [selectedPermissionSlugs])

  // Handle save
  const handleSave = async () => {
    if (!id || !validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await api.put(`/hrm/roles/${id}`, {
        name: roleName.trim(),
        description: roleDescription.trim() || null,
        position: position,
        permissions: selectedPermissionSlugs,
      })

      if (response.data.status) {
        notifications.show({
          title: 'Success',
          message: 'Role updated successfully',
          color: 'green',
        })
        // Update local state with returned permissions
        if (response.data.data?.permissions) {
          const slugs = response.data.data.permissions.map((p: Permission) => p.slug).filter((slug: string): slug is string => slug !== null)
          setSelectedPermissionSlugs(slugs)
        }
      } else {
        throw new Error(response.data.message || 'Failed to update role')
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      notifications.show({
        title: 'Error',
        message: (error as any).response?.data?.message || (error as any).message || 'Failed to update role. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    navigate('/hrm/roles')
  }

  if (initialLoading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="lg">
          <LoadingOverlay visible />
          <Box h={300} />
        </Paper>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={14} />}>
          <Anchor href="/dashboard" c="dimmed">Dashboard</Anchor>
          <Anchor href="/hrm/roles" c="dimmed">Roles</Anchor>
          <Text c="red">Edit Role</Text>
        </Breadcrumbs>

        {/* Header */}
        <Box>
          <Title order={1}>Edit Role</Title>
          <Text c="dimmed">Update role and permissions</Text>
        </Box>

        <Stack>
          {/* Role Information Section */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
            <Stack>
              <Title order={3}>Role Information</Title>

              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <TextInput
                    label="Role Name"
                    placeholder="Enter role name"
                    value={roleName}
                    onChange={(e) => {
                      setRoleName(e.currentTarget.value)
                      setValidationErrors((prev) => ({ ...prev, roleName: undefined }))
                    }}
                    error={validationErrors.roleName}
                    required
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <NumberInput
                    label="Position"
                    placeholder="Enter position"
                    value={position}
                    onChange={(value) => {
                      setPosition(value || 1)
                      setValidationErrors((prev) => ({ ...prev, position: undefined }))
                    }}
                    error={validationErrors.position}
                    min={1}
                    required
                    size="md"
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Description"
                    placeholder="Enter role description"
                    value={roleDescription}
                    onChange={(e) => {
                      setRoleDescription(e.currentTarget.value)
                      setValidationErrors((prev) => ({ ...prev, description: undefined }))
                    }}
                    error={validationErrors.description}
                    size="md"
                  />
                </Grid.Col>
              </Grid>

              {usersCount > 0 && (
                <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Active Role">
                  This role is assigned to {usersCount} user{usersCount > 1 ? 's' : ''}. Changes will affect these users immediately.
                </Alert>
              )}

              <Group justify="space-between" mt="md">
                <Text size="sm" c="dimmed">
                  {totalSelectedPermissions} of {totalPermissions} permissions selected
                </Text>
                <Group>
                  <Button variant="default" onClick={handleCancel} size="md" disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    leftSection={<IconDeviceFloppy size={16} />}
                    disabled={!roleName.trim() || loading}
                    loading={loading}
                    size="md"
                  >
                    Save Changes
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Paper>

          {/* Permissions Section */}
          <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
            <Stack>
              <Group justify="space-between">
                <div>
                  <Title order={3}>Permissions</Title>
                  <Text size="sm" c="dimmed">Select permissions for this role</Text>
                </div>
                <Group>
                  <Button variant="light" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="light" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </Group>
              </Group>

              <TextInput
                placeholder="Search permissions..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="md"
              />

              {filteredGroups.length === 0 ? (
                <Box py="xl" ta="center">
                  <Text c="dimmed">No permissions found matching "{searchQuery}"</Text>
                </Box>
              ) : (
                <Stack gap="lg">
                  {filteredGroups.map((group) => (
                    <Box key={group.groupName}>
                      <Group justify="space-between" mb="md">
                        <Text fw={700} size="lg">{group.groupName}</Text>
                        <Group gap="xs">
                          <Checkbox
                            label="Show"
                            size="sm"
                            checked={hasAllPermissionsOfTypeInGroup(group, 'Show')}
                            onChange={() => handleGroupBulkSelectByType(group, 'Show')}
                            styles={{ label: { fontSize: '12px', fontWeight: 600 } }}
                          />
                          <Checkbox
                            label="Create"
                            size="sm"
                            checked={hasAllPermissionsOfTypeInGroup(group, 'Create')}
                            onChange={() => handleGroupBulkSelectByType(group, 'Create')}
                            styles={{ label: { fontSize: '12px', fontWeight: 600 } }}
                          />
                          <Checkbox
                            label="Edit"
                            size="sm"
                            checked={hasAllPermissionsOfTypeInGroup(group, 'Edit')}
                            onChange={() => handleGroupBulkSelectByType(group, 'Edit')}
                            styles={{ label: { fontSize: '12px', fontWeight: 600 } }}
                          />
                          <Checkbox
                            label="Delete"
                            size="sm"
                            checked={hasAllPermissionsOfTypeInGroup(group, 'Delete')}
                            onChange={() => handleGroupBulkSelectByType(group, 'Delete')}
                            styles={{ label: { fontSize: '12px', fontWeight: 600 } }}
                          />
                        </Group>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                        {group.modules.map((module) => {
                          const hasAny = hasAnyPermissionInModule(module)
                          const hasAll = hasAllPermissionsInModule(module)

                          return (
                            <Paper
                              key={`${group.groupName}-${module.module_name}`}
                              withBorder
                              p="md"
                              radius="md"
                              bd={hasAny ? '2px solid var(--mantine-color-blue-4)' : undefined}
                              bg={hasAny ? 'light-dark(var(--mantine-color-blue-0), rgba(66, 153, 225, 0.1))' : undefined}
                            >
                              <Stack>
                                {/* Module Header */}
                                <Group justify="space-between" wrap="nowrap">
                                  <Text fw={600} size="sm">{module.module_name}</Text>
                                  <Button
                                    variant="light"
                                    size="compact-xs"
                                    onClick={() => handleModuleSelectAll(module)}
                                  >
                                    {hasAll ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </Group>

                                {/* Permissions List */}
                                <Stack gap={4}>
                                  {module.permissions.map((permission) => (
                                    <Checkbox
                                      key={permission.id}
                                      label={permission.name}
                                      checked={selectedPermissionSlugs.includes(permission.slug)}
                                      onChange={() => handlePermissionToggle(permission.slug)}
                                      size="sm"
                                    />
                                  ))}
                                </Stack>
                              </Stack>
                            </Paper>
                          )
                        })}
                      </SimpleGrid>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Stack>
    </Box>
  )
}
