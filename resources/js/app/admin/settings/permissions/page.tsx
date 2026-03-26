import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  TextInput,
  Badge,
  SimpleGrid,
  LoadingOverlay,
  Alert,
  Checkbox,
} from '@mantine/core'
import { IconSearch, IconLock } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

interface Permission {
  id: number
  name: string
  key: string | null
  slug: string | null
  group_name: string
  module_name: string
}

interface ModulePermissions {
  module_name: string
  permissions: Permission[]
}

interface GroupedPermissions {
  [group: string]: ModulePermissions[]
}

export default function PermissionsListPage() {
  const { hasPermission, isSuperAdmin } = usePermissions()

  // ALL hooks must be declared before any conditional logic or early returns
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[]>([])

  // Fetch permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true)
        const response = await api.get('/hrm/permissions/grouped')

        if (response.data?.data) {
          // Transform the object structure into flattened array
          const allPerms: Permission[] = []
          Object.keys(response.data.data).forEach((groupName) => {
            const groupData = response.data.data[groupName]

            // Check if groupData is an object with module names as keys
            if (typeof groupData === 'object' && !Array.isArray(groupData)) {
              // Object structure: { "Attendance": [{permissions}], "Departments": [{permissions}] }
              Object.keys(groupData).forEach((moduleName) => {
                groupData[moduleName].forEach((perm: Permission) => {
                  allPerms.push(perm)
                })
              })
            } else if (Array.isArray(groupData)) {
              // Array structure: [{module_name: "...", permissions: [...]}]
              groupData.forEach((module: ModulePermissions) => {
                module.permissions.forEach((perm: Permission) => {
                  allPerms.push(perm)
                })
              })
            }
          })
          setPermissions(allPerms)
        }
      } catch (error: unknown) {
        console.error('Failed to fetch permissions:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load permissions',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  // Transform permissions data into grouped structure
  const groupedPermissions = useMemo(() => {
    const groups: GroupedPermissions = {}

    permissions.forEach((perm) => {
      const groupName = perm.group_name || 'Other'
      if (!groups[groupName]) {
        groups[groupName] = []
      }

      // Find or create module
      let module = groups[groupName].find((m) => m.module_name === perm.module_name)
      if (!module) {
        module = { module_name: perm.module_name || 'Other', permissions: [] }
        groups[groupName].push(module)
      }

      module.permissions.push(perm)
    })

    return groups
  }, [permissions])

  // Filter permissions based on search (only by group and module name)
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedPermissions
    }

    const query = searchQuery.toLowerCase()
    const filtered: GroupedPermissions = {}

    Object.keys(groupedPermissions).forEach((groupName) => {
      if (groupName.toLowerCase().includes(query)) {
        filtered[groupName] = groupedPermissions[groupName]
        return
      }

      const modules = groupedPermissions[groupName].filter((module) =>
        module.module_name.toLowerCase().includes(query)
      )

      if (modules.length > 0) {
        filtered[groupName] = modules
      }
    })

    return filtered
  }, [groupedPermissions, searchQuery])

  // Permission check - only super admins or users with role management permission can view
  if (!isSuperAdmin() && !hasPermission('hrm.roles.index')) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack>
          <Alert variant="light" color="red" icon={<IconLock size={20} />}>
            <Stack gap={0}>
              <Title order={3} c="red.6">Access Denied</Title>
              <Text>You don't have permission to view system permissions.</Text>
              <Text size="sm" c="dimmed">
                Required: Super Admin or "View Roles" permission
              </Text>
            </Stack>
          </Alert>
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Box>
            <Title order={2}>System Permissions</Title>
            <Text c="dimmed">View all system permissions grouped by module</Text>
          </Box>
        </Group>

        {/* Search */}
        <Paper withBorder p="md" radius="md">
          <TextInput
            placeholder="Search by group or module name..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </Paper>

        {/* Permissions List */}
        <Box pos="relative">
          <LoadingOverlay visible={loading} />
          {Object.keys(filteredGroups).length === 0 ? (
            <Paper p="xl" ta="center" radius="md" withBorder>
              <Text c="dimmed">No permissions found matching your search</Text>
            </Paper>
          ) : (
            <Stack gap="xl">
              {Object.keys(filteredGroups).map((groupName) => (
                <Box key={groupName}>
                  {/* Group Header */}
                  <Group mb="md" justify="space-between" align="center">
                    <Text fw={700} size="xl">
                      {groupName}
                    </Text>
                    <Badge size="lg" variant="light" color="blue">
                      {filteredGroups[groupName].reduce(
                        (acc, module) => acc + module.permissions.length,
                        0
                      )}{' '}
                      permissions
                    </Badge>
                  </Group>

                  {/* Modules Grid */}
                  <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                    {filteredGroups[groupName].map((module) => (
                      <Paper
                        key={module.module_name}
                        withBorder
                        p="md"
                        radius="md"
                        shadow="xs"
                      >
                        <Stack gap="md">
                          {/* Module Header */}
                          <Group justify="space-between">
                            <Text fw={600} size="sm">{module.module_name}</Text>
                            <Badge size="sm" variant="outline">
                              {module.permissions.length}
                            </Badge>
                          </Group>

                          {/* Permissions List - Checkboxes like in Roles Edit page */}
                          <Stack gap={4}>
                            {module.permissions.map((permission) => (
                              <Checkbox
                                key={permission.id}
                                label={permission.name}
                                checked={false}
                                disabled
                                size="sm"
                                styles={{
                                  label: {
                                    fontSize: '13px',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
