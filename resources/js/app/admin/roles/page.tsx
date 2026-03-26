import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Paper,
  Card,
  Grid,
} from '@mantine/core'
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'

// Mock data - using directly until API is ready
const mockRoles = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Full system access',
    permissions: {
      dashboard: { create: true, read: true, update: true, delete: true },
      products: { create: true, read: true, update: true, delete: true },
      inventory: { create: true, read: true, update: true, delete: true },
    },
    users_count: 2,
  },
  {
    id: 2,
    name: 'Admin',
    description: 'Administrative access',
    permissions: {
      dashboard: { create: false, read: true, update: false, delete: false },
      products: { create: true, read: true, update: true, delete: false },
      inventory: { create: true, read: true, update: true, delete: false },
    },
    users_count: 5,
  },
  {
    id: 3,
    name: 'Seller',
    description: 'Point of sale access',
    permissions: {
      dashboard: { create: false, read: true, update: false, delete: false },
      products: { create: false, read: true, update: false, delete: false },
      sales: { create: true, read: true, update: true, delete: false },
    },
    users_count: 12,
  },
]

export default function RolesPage() {
  const { t } = useTranslation()
  const roles = mockRoles

  // Memoized desktop table rows
  const desktopRows = useMemo(() => {
    return roles.map((role) => (
      <Table.Tr key={role.id}>
        <Table.Td>
          <Text fw={600}>{role.name}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            {role.description}
          </Text>
        </Table.Td>
        <Table.Td>
          <Badge variant="light">
            {Object.values(role.permissions).reduce(
              (acc, perms) =>
                acc +
                Object.values(perms).filter(Boolean).length,
              0
            )}{' '}
            {t('roles.title')}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{role.users_count} {t('settings.users')}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color="green" variant="light">
            Active
          </Badge>
        </Table.Td>
        <Table.Td>
          <Group >
            <ActionIcon
              variant="subtle"
              color="blue"
              component={Link}
              to={`/roles/${role.id}/edit`}
              aria-label={t('roles.editRoleAction')}
            >
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => openDeleteModal(role.name)}
              aria-label={t('roles.deleteRoleAction')}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    ))
  }, [roles, t])

  // Memoized mobile cards
  const mobileCards = useMemo(() => {
    return roles.map((role) => (
      <Card key={role.id} shadow="sm" p={{ base: 'lg', md: 'md' }} radius="md" withBorder mb="md">
        <Stack >
          {/* Header with name and actions */}
          <Group justify="space-between">
            <Text fw={700} size="lg">
              {role.name}
            </Text>
            <Group >
              <ActionIcon
                variant="subtle"
                color="blue"
                component={Link}
                to={`/roles/${role.id}/edit`}
                aria-label={t('roles.editRoleAction')}
              >
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => openDeleteModal(role.name)}
                aria-label={t('roles.deleteRoleAction')}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Description */}
          <Text size="sm" c="dimmed">
            {role.description}
          </Text>

          {/* Details */}
          <Grid>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">{t('roles.userPermissions')}</Text>
              <Badge variant="light" mt={4}>
                {Object.values(role.permissions).reduce(
                  (acc, perms) =>
                    acc +
                    Object.values(perms).filter(Boolean).length,
                  0
                )}{' '}
                {t('roles.title')}
              </Badge>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">{t('settings.users')}</Text>
              <Text size="sm" fw={500} mt={4}>
                {role.users_count}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">Status</Text>
              <Box mt={4}>
                <Badge color="green" variant="light">Active</Badge>
              </Box>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>
    ))
  }, [roles, t])

  const openDeleteModal = (name: string) => {
    modals.openConfirmModal({
      title: t('roles.deleteRole'),
      centered: true,
      children: (
        <Text size="sm">
          {t('roles.warningMessage')} <strong>{name}</strong>?
        </Text>
      ),
      labels: {
        confirm: t('roles.deleteRole'),
        cancel: t('roles.cancelButton'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500))
          notifications.show({
            title: t('roles.roleDeleted'),
            message: `${name} ${t('roles.roleDeleted')}`,
            color: 'green',
          })
        } catch {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete role. Please try again.',
            color: 'red',
          })
        }
      },
    })
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Title order={1}>{t('roles.manageRoles')}</Title>
          <Text c="dimmed">{t('roles.manageRoles')}</Text>
        </Box>

        {/* Actions */}
        <Group justify="flex-end">
          <Button
            component={Link}
            to="/roles/create"
            leftSection={<IconPlus size={16} />}
          >
            {t('roles.createRole')}
          </Button>
        </Group>

        {/* Mobile: Card View */}
        <Stack  display={{ base: 'block', md: 'none' }}>
          {mobileCards}
        </Stack>

        {/* Desktop: Table View */}
        <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }} style={{ overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('roles.roleName')}</Table.Th>
                  <Table.Th>{t('roles.description')}</Table.Th>
                  <Table.Th>{t('roles.userPermissions')}</Table.Th>
                  <Table.Th>{t('settings.users')}</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {roles.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Box py="xl" ta="center">
                        <Text c="dimmed">No roles found</Text>
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  desktopRows
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    </Box>
  )
}
