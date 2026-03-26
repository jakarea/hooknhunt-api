/**
 * EXAMPLE: How to use the Sustainable Permission System
 *
 * This file demonstrates all the ways to use the permission system
 * Copy patterns from here to your components
 */

import { Button, Group, Stack, Paper, Text, Title } from '@mantine/core'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGuard, CanCreateEmployee, CanEditEmployee } from '@/components/permission-guard'
import { ProtectedButton } from '@/components/protected-button'

export default function PermissionExamples() {
  const {
    hasPermission,
    canAccessRoute,
    refreshPermissions,
    permissions
  } = usePermissions()

  return (
    <Stack p="xl">
      <Title order={1}>Permission System Examples</Title>

      {/* Example 1: Basic Permission Check */}
      <Paper p="md" withBorder>
        <Title order={3}>1. Basic Permission Check</Title>
        {hasPermission('employee.create') ? (
          <Button onClick={() => { alert('Creating employee!'); }}>
            Create Employee
          </Button>
        ) : (
          <Text c="red">You don't have permission to create employees</Text>
        )}
      </Paper>

      {/* Example 2: Multiple Permissions (any) */}
      <Paper p="md" withBorder>
        <Title order={3}>2. Multiple Permissions (Any)</Title>
        {hasPermission(['employee.edit', 'employee.delete']) ? (
          <Group>
            <Button onClick={() => { alert('Edit'); }}>Edit Employee</Button>
            <Button color="red" onClick={() => { alert('Delete'); }}>Delete Employee</Button>
          </Group>
        ) : (
          <Text c="red">You need edit or delete permission</Text>
        )}
      </Paper>

      {/* Example 3: Route Access Check */}
      <Paper p="md" withBorder>
        <Title order={3}>3. Route Access Check</Title>
        {canAccessRoute('/hrm/payroll') ? (
          <Text c="green">✅ You can access Payroll</Text>
        ) : (
          <Text c="red">❌ You cannot access Payroll</Text>
        )}
      </Paper>

      {/* Example 4: PermissionGuard Component */}
      <Paper p="md" withBorder>
        <Title order={3}>4. PermissionGuard Component</Title>
        <PermissionGuard permission="employee.create">
          <Button onClick={() => { alert('Create'); }}>Create Employee</Button>
        </PermissionGuard>

        <PermissionGuard
          permissions={['employee.edit', 'employee.delete']}
          fallback={<Text c="red">No edit/delete access</Text>}
        >
          <Group>
            <Button onClick={() => { alert('Edit'); }}>Edit</Button>
            <Button color="red" onClick={() => { alert('Delete'); }}>Delete</Button>
          </Group>
        </PermissionGuard>
      </Paper>

      {/* Example 5: Pre-built Helpers */}
      <Paper p="md" withBorder>
        <Title order={3}>5. Pre-built Helper Components</Title>
        <CanCreateEmployee>
          <Button onClick={() => { alert('Create'); }}>Create Employee</Button>
        </CanCreateEmployee>

        <CanEditEmployee>
          <Button onClick={() => { alert('Edit'); }}>Edit Employee</Button>
        </CanEditEmployee>
      </Paper>

      {/* Example 6: ProtectedButton */}
      <Paper p="md" withBorder>
        <Title order={3}>6. ProtectedButton Component</Title>
        <Group>
          <ProtectedButton
            permission="employee.create"
            onClick={() => alert('Create')}
          >
            Create
          </ProtectedButton>

          <ProtectedButton
            permissions={['employee.edit', 'hrm.manage']}
            onClick={() => alert('Edit')}
          >
            Edit
          </ProtectedButton>

          <ProtectedButton
            permission="employee.delete"
            color="red"
            onClick={() => alert('Delete')}
          >
            Delete
          </ProtectedButton>
        </Group>
      </Paper>

      {/* Example 7: Refresh Permissions */}
      <Paper p="md" withBorder>
        <Title order={3}>7. Refresh Permissions (No Logout!)</Title>
        <Text size="sm" mb="md">
          Total permissions: {permissions.length}
        </Text>
        <Button onClick={() => refreshPermissions()}>
          Refresh Permissions from API
        </Button>
      </Paper>

      {/* Example 8: Debug Mode */}
      <Paper p="md" withBorder>
        <Title order={3}>8. Debug Mode</Title>
        <PermissionGuard
          permission="employee.create"
          debug={true}
        >
        </PermissionGuard>
      </Paper>
    </Stack>
  )
}
