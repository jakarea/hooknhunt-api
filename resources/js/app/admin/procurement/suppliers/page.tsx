import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Paper,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Card,
  ActionIcon,
  Badge,
  Table,
  Skeleton,
  Alert,
  ScrollArea,
  Menu,
  Box,
  Anchor,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconDots,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { usePermissions } from '@/hooks/usePermissions'
import { getSuppliers, deleteSupplier, type Supplier } from '@/utils/api'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SuppliersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [statusFilter, setStatusFilter] = useState<string | null>('all')

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSuppliers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const params: Parameters<typeof getSuppliers>[0] = {
        search: debouncedSearch || undefined,
        page: 1,
        per_page: 50,
      }

      if (statusFilter && statusFilter !== 'all') {
        params.is_active = statusFilter === 'active'
      }

      const response = await getSuppliers(params)

      // Handle multiple possible response structures
      let suppliers: Supplier[] = []

      // Case 1: Response has status field (API wrapper)
      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status && response.data) {
          const data = response.data
          // Case 1a: { status: true, data: { data: [...], ... } }
          if (typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            suppliers = data.data
          }
          // Case 1b: { status: true, data: [...] }
          else if (Array.isArray(data)) {
            suppliers = data
          }
        }
      }
      // Case 2: Direct array response
      else if (Array.isArray(response)) {
        suppliers = response
      }
      // Case 3: Paginated response without status wrapper { data: [...], ... }
      else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        suppliers = response.data
      }

      setSuppliers(suppliers)
    } catch (error) {
      notifications.show({
        title: t('procurement.suppliersPage.notifications.errorLoading'),
        message: error instanceof Error ? error.message : t('common.somethingWentWrong'),
        color: 'red',
      })
      setSuppliers([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearch, statusFilter, t])

  useEffect(() => {
    fetchSuppliers(true)
  }, [fetchSuppliers])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDelete = (supplier: Supplier) => {
    modals.openConfirmModal({
      title: t('procurement.suppliersPage.notifications.deleteConfirm'),
      children: (
        <Text className="text-sm md:text-base">
          {t('procurement.suppliersPage.notifications.deleteConfirmMessage', { name: supplier.name })}
        </Text>
      ),
      labels: {
        confirm: t('common.delete'),
        cancel: t('common.cancel'),
      },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteSupplier(supplier.id)
          notifications.show({
            title: t('procurement.suppliersPage.notifications.deleted'),
            message: t('procurement.suppliersPage.notifications.deletedMessage', { name: supplier.name }),
            color: 'green',
          })
          await fetchSuppliers(false)
        } catch (error) {
          notifications.show({
            title: t('procurement.suppliersPage.notifications.errorDeleting'),
            message: error instanceof Error ? error.message : t('common.somethingWentWrong'),
            color: 'red',
          })
        }
      },
    })
  }

  const handleRefresh = () => {
    fetchSuppliers(false)
    notifications.show({
      title: t('procurement.suppliersPage.notifications.refreshed'),
      message: t('procurement.suppliersPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <Stack p="xl" gap="md">
        <Skeleton height={40} width="100%" />
        <Skeleton height={200} radius="md" />
        <Skeleton height={400} radius="md" />
      </Stack>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Stack p="xl" gap="md">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
              {t('procurement.suppliersPage.title')}
            </Text>
          </Group>
          <Text className="text-sm md:text-base" c="dimmed">
            {t('procurement.suppliersPage.subtitle')}
          </Text>
        </div>
        {hasPermission('procurement.suppliers.create') && (
          <Button
            onClick={() => navigate('/procurement/suppliers/create')}
            leftSection={<IconPlus size={16} />}
          >
            {t('procurement.suppliersPage.addSupplier')}
          </Button>
        )}
      </Group>

      {/* Filters */}
      <Paper withBorder p={{ base: 'xs', md: 'md' }} radius="md">
        <Group>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t('procurement.suppliersPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            w={{ base: '100%', sm: 300 }}
            className="text-sm md:text-base"
          />

          <Select
            placeholder={t('common.filter')}
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: t('procurement.suppliersPage.filterAll') },
              { value: 'active', label: t('procurement.suppliersPage.filterActive') },
              { value: 'inactive', label: t('procurement.suppliersPage.filterInactive') },
            ]}
            w={{ base: '100%', sm: 150 }}
            className="text-sm md:text-base"
          />

          <Button
            onClick={handleRefresh}
            loading={refreshing}
            variant="light"
            className="text-sm md:text-base"
            leftSection={<IconRefresh size={16} />}
          >
            {t('common.refresh')}
          </Button>
        </Group>
      </Paper>

      {/* Desktop Table View */}
      <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }}>
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.name')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.email')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.phone')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.whatsapp')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.shopName')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.contactPerson')}</Table.Th>
                <Table.Th>{t('procurement.suppliersPage.tableHeaders.status')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {suppliers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="xl">
                      {t('procurement.suppliersPage.noSuppliersFound')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                suppliers.map((supplier) => (
                  <Table.Tr key={supplier.id}>
                    <Table.Td>
                      <Text
                        fw={600}
                        className="text-sm md:text-base"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                      >
                        {supplier.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.phone || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      {supplier.whatsapp ? (
                        <Anchor
                          href={`https://wa.me/${supplier.whatsapp.replace(/[^\d+]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm md:text-base"
                        >
                          {supplier.whatsapp}
                        </Anchor>
                      ) : (
                        <Text className="text-sm md:text-base">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.shopName || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.contactPerson || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={supplier.isActive ? 'green' : 'gray'}
                        variant="light"
                        className="text-sm md:text-base"
                      >
                        {supplier.isActive
                          ? t('procurement.suppliersPage.active')
                          : t('procurement.suppliersPage.inactive')}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Mobile Card View */}
      <Stack display={{ base: 'flex', md: 'none' }} gap="sm">
        {suppliers.length === 0 ? (
          <Alert variant="light" color="gray">
            {t('procurement.suppliersPage.noSuppliersFound')}
          </Alert>
        ) : (
          suppliers.map((supplier) => (
            <Card key={supplier.id} shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                {/* Header with name and actions */}
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      fw={700}
                      className="text-lg md:text-xl lg:text-2xl"
                      truncate
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                    >
                      {supplier.name}
                    </Text>
                    {supplier.shopName && (
                      <Text className="text-sm md:text-base" c="dimmed" truncate>
                        {supplier.shopName}
                      </Text>
                    )}
                  </Box>
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" className="text-lg md:text-xl lg:text-2xl">
                        <IconDots size={18} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>{t('procurement.suppliersPage.tableHeaders.actions')}</Menu.Label>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                      >
                        {t('procurement.suppliersPage.actions.view')}
                      </Menu.Item>
                      {hasPermission('procurement.suppliers.edit') && (
                        <Menu.Item
                          leftSection={<IconEdit size={14} />}
                          onClick={() => navigate(`/procurement/suppliers/${supplier.id}/edit`)}
                        >
                          {t('procurement.suppliersPage.actions.edit')}
                        </Menu.Item>
                      )}
                      {hasPermission('procurement.suppliers.delete') && (
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => handleDelete(supplier)}
                        >
                          {t('procurement.suppliersPage.actions.delete')}
                        </Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                {/* Contact Info */}
                <Stack gap={4}>
                  {supplier.email && (
                    <Text className="text-sm md:text-base" truncate>
                      {supplier.email}
                    </Text>
                  )}
                  {supplier.phone && (
                    <Text className="text-sm md:text-base" truncate>
                      {supplier.phone}
                    </Text>
                  )}
                  {supplier.whatsapp && (
                    <Anchor
                      href={`https://wa.me/${supplier.whatsapp.replace(/[^\d+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base"
                      truncate
                    >
                      {supplier.whatsapp}
                    </Anchor>
                  )}
                  {supplier.contactPerson && (
                    <Text className="text-sm md:text-base" truncate>
                      {supplier.contactPerson}
                    </Text>
                  )}
                </Stack>

                {/* Status Badge */}
                <Box>
                  <Badge
                    color={supplier.isActive ? 'green' : 'gray'}
                    variant="light"
                    className="text-sm md:text-base"
                  >
                    {supplier.isActive
                      ? t('procurement.suppliersPage.active')
                      : t('procurement.suppliersPage.inactive')}
                  </Badge>
                </Box>
              </Stack>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  )
}
