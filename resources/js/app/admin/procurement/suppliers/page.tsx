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
  Box,
  Card,
  ActionIcon,
  Badge,
  Table,
  Skeleton,
  Alert,
  SimpleGrid,
  NumberInput,
  Switch,
  Textarea,
  Divider,
  ScrollArea,
  Tabs,
  Avatar,
  Tooltip,
  Drawer,
  Menu,
  Progress,
  FileInput,
  Image,
} from '@mantine/core'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconPhone,
  IconMail,
  IconBrandWhatsapp,
  IconBuilding,
  IconWorld,
  IconUsers,
  IconCoin,
  IconMapPin,
  IconUpload,
  IconX,
  IconPhoto,
  IconDots,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useDebouncedValue } from '@mantine/hooks'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, type Supplier } from '@/utils/api'

export default function SuppliersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, 500)
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null)
  const [modalOpened, setModalOpened] = useState(false)

  // File preview states
  const [wechatQrPreview, setWechatQrPreview] = useState<string | null>(null)
  const [alipayQrPreview, setAlipayQrPreview] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    contact_person: '',
    shop_name: '',
    shop_url: '',
    wechat_id: '',
    wechat_qr_url: '',
    wechat_qr_file: null as File | null,
    alipay_id: '',
    alipay_qr_url: '',
    alipay_qr_file: null as File | null,
    address: '',
    is_active: true,
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch suppliers
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

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      contact_person: '',
      shop_name: '',
      shop_url: '',
      wechat_id: '',
      wechat_qr_url: '',
      wechat_qr_file: null,
      alipay_id: '',
      alipay_qr_url: '',
      alipay_qr_file: null,
      address: '',
      is_active: true,
    })
    setWechatQrPreview(null)
    setAlipayQrPreview(null)
    setErrors({})
    setEditMode(false)
    setCurrentSupplier(null)
  }

  // Open create modal
  const openCreateModal = () => {
    resetForm()
    setModalOpened(true)
  }

  // Open edit modal
  const openEditModal = (supplier: Supplier) => {
    // Convert API response (camelCase) to form state (snake_case for backend)
    const formDataToUpdate = {
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      whatsapp: supplier.whatsapp || '',
      contact_person: supplier.contactPerson || '',
      shop_name: supplier.shopName || '',
      shop_url: supplier.shopUrl || '',
      wechat_id: supplier.wechatId || '',
      wechat_qr_url: supplier.wechatQrUrl || '',
      wechat_qr_file: null,
      alipay_id: supplier.alipayId || '',
      alipay_qr_url: supplier.alipayQrUrl || '',
      alipay_qr_file: null,
      address: supplier.address || '',
      is_active: supplier.isActive === true || supplier.isActive === 1,
    }

    setFormData(formDataToUpdate)

    // Convert relative image paths to full URLs for preview
    const baseUrl = window.location.origin
    const wechatUrl = supplier.wechatQrFile
      ? (supplier.wechatQrFile.startsWith('http') ? supplier.wechatQrFile : `${baseUrl}/storage/${supplier.wechatQrFile}`)
      : null
    const alipayUrl = supplier.alipayQrFile
      ? (supplier.alipayQrFile.startsWith('http') ? supplier.alipayQrFile : `${baseUrl}/storage/${supplier.alipayQrFile}`)
      : null

    setWechatQrPreview(wechatUrl)
    setAlipayQrPreview(alipayUrl)

    setEditMode(true)
    setCurrentSupplier(supplier)
    setModalOpened(true)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('procurement.suppliersPage.form.validation.nameRequired')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('procurement.suppliersPage.form.validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('procurement.suppliersPage.form.validation.emailInvalid')
    }

    if (formData.shop_url && !/^https?:\/\/.+/.test(formData.shop_url)) {
      newErrors.shop_url = t('procurement.suppliersPage.form.validation.urlInvalid')
    }

    if (formData.wechat_qr_url && !/^https?:\/\/.+/.test(formData.wechat_qr_url)) {
      newErrors.wechat_qr_url = t('procurement.suppliersPage.form.validation.urlInvalid')
    }

    if (formData.alipay_qr_url && !/^https?:\/\/.+/.test(formData.alipay_qr_url)) {
      newErrors.alipay_qr_url = t('procurement.suppliersPage.form.validation.urlInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      // Check if we have files to upload
      const hasFiles = formData.wechat_qr_file || formData.alipay_qr_file

      if (hasFiles) {
        // Use FormData for file uploads
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('email', formData.email)
        if (formData.phone) formDataToSend.append('phone', formData.phone)
        if (formData.whatsapp) formDataToSend.append('whatsapp', formData.whatsapp)
        if (formData.contact_person) formDataToSend.append('contact_person', formData.contact_person)
        if (formData.shop_name) formDataToSend.append('shop_name', formData.shop_name)
        if (formData.shop_url) formDataToSend.append('shop_url', formData.shop_url)
        if (formData.wechat_id) formDataToSend.append('wechat_id', formData.wechat_id)
        if (formData.alipay_id) formDataToSend.append('alipay_id', formData.alipay_id)
        if (formData.address) formDataToSend.append('address', formData.address)
        formDataToSend.append('is_active', formData.is_active ? '1' : '0')

        if (formData.wechat_qr_file) {
          formDataToSend.append('wechat_qr_file', formData.wechat_qr_file)
        }
        if (formData.alipay_qr_file) {
          formDataToSend.append('alipay_qr_file', formData.alipay_qr_file)
        }

        if (editMode && currentSupplier) {
          await updateSupplier(currentSupplier.id, formDataToSend as any)
        } else {
          await createSupplier(formDataToSend as any)
        }
      } else {
        // Use JSON for regular form submission
        const dataToSend = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          whatsapp: formData.whatsapp || undefined,
          contact_person: formData.contact_person || undefined,
          shop_name: formData.shop_name || undefined,
          shop_url: formData.shop_url || undefined,
          wechat_id: formData.wechat_id || undefined,
          alipay_id: formData.alipay_id || undefined,
          address: formData.address || undefined,
          is_active: formData.is_active,
        }

        if (editMode && currentSupplier) {
          await updateSupplier(currentSupplier.id, dataToSend)
        } else {
          await createSupplier(dataToSend)
        }
      }

      notifications.show({
        title: editMode
          ? t('procurement.suppliersPage.notifications.updated')
          : t('procurement.suppliersPage.notifications.created'),
        message: t('procurement.suppliersPage.notifications.updatedMessage', { name: formData.name }),
        color: 'green',
      })
      setModalOpened(false)
      resetForm()
      await fetchSuppliers(false)
    } catch (error) {
      notifications.show({
        title: editMode
          ? t('procurement.suppliersPage.notifications.errorUpdating')
          : t('procurement.suppliersPage.notifications.errorCreating'),
        message: error instanceof Error ? error.message : t('common.somethingWentWrong'),
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
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

  // Refresh
  const handleRefresh = () => {
    fetchSuppliers(false)
    notifications.show({
      title: t('procurement.suppliersPage.notifications.refreshed'),
      message: t('procurement.suppliersPage.notifications.refreshedMessage'),
      color: 'blue',
    })
  }

  // Loading skeleton
  if (loading) {
    return (
      <Stack p="xl" gap="md">
        <Skeleton height={40} width="100%" />
        <Skeleton height={200} radius="md" />
        <Skeleton height={400} radius="md" />
      </Stack>
    )
  }

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
        <Button
          onClick={openCreateModal}
          leftSection={<IconPlus size={16} />}
        >
          {t('procurement.suppliersPage.addSupplier')}
        </Button>
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
                <Table.Th className="text-right">{t('procurement.suppliersPage.tableHeaders.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {suppliers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text ta="center" c="dimmed" py="xl">
                      {t('procurement.suppliersPage.noSuppliersFound')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                suppliers.map((supplier) => (
                  <Table.Tr key={supplier.id}>
                    <Table.Td>
                      <Text fw={600} className="text-sm md:text-base">{supplier.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.phone || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text className="text-sm md:text-base">{supplier.whatsapp || '-'}</Text>
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
                    <Table.Td>
                      <Group gap="xs" justify="right">
                        <Menu shadow="md" width={200} position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" className="text-sm md:text-base">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>

                          <Menu.Dropdown>
                            <Menu.Label>Actions</Menu.Label>
                            <Menu.Item
                              leftSection={<IconEye size={14} />}
                              onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
                            >
                              View
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => openEditModal(supplier)}
                            >
                              Edit
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconTrash size={14} />}
                              color="red"
                              onClick={() => handleDelete(supplier)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
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
                    <Text fw={700} className="text-lg md:text-xl lg:text-2xl" truncate>
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
                      <Menu.Label>Actions</Menu.Label>
                      <Menu.Item
                        leftSection={<IconEye size={14} />}
                        onClick={() => {/* TODO: Implement view functionality */}}
                      >
                        View
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={() => openEditModal(supplier)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={() => handleDelete(supplier)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <Divider />

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
                    <Text className="text-sm md:text-base" truncate>
                      {supplier.whatsapp}
                    </Text>
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

      {/* Create/Edit Drawer */}
      <Drawer
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false)
          resetForm()
        }}
        position="right"
        size={{ base: '100%', md: '600px', lg: '700px' }}
        title={
          <Stack gap={4}>
            <Text className="text-lg md:text-xl lg:text-2xl" fw={600}>
              {editMode
                ? t('procurement.suppliersPage.drawer.updateTitle')
                : t('procurement.suppliersPage.drawer.createTitle')}
            </Text>
            <Text className="text-sm md:text-base" c="dimmed">
              {editMode
                ? t('procurement.suppliersPage.drawer.updateDescription')
                : t('procurement.suppliersPage.drawer.createDescription')}
            </Text>
          </Stack>
        }
        className="text-xl md:text-2xl lg:text-3xl"
        radius={0}
        transitionProps={{ transition: 'slide-left', duration: 300 }}
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="xl">
            <Stack gap="lg">
                {/* Basic Information Section */}
                <Paper withBorder p="md" radius={0} bg="gray.0">
                  <Group gap="sm" mb="md">
                    <IconBuilding size={20} c="blue" />
                    <Text fw={600} className="text-sm md:text-base">{t('procurement.suppliersPage.form.basicInfo')}</Text>
                  </Group>
                  <Stack gap="md">
                    <TextInput
                      required
                      label={t('procurement.suppliersPage.form.name')}
                      placeholder={t('procurement.suppliersPage.form.namePlaceholderExample')}
                      description={t('procurement.suppliersPage.form.nameDescription')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={errors.name}
                      className="text-base md:text-lg"
                      styles={{
                        input: { fontSize: '16px' }
                      }}
                    />

                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <TextInput
                        leftSection={<IconBuilding size={18} />}
                        label={t('procurement.suppliersPage.form.shopName')}
                        placeholder={t('procurement.suppliersPage.form.shopNamePlaceholderSimple')}
                        value={formData.shop_name}
                        onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                        className="text-base md:text-lg"
                      />

                      <TextInput
                        leftSection={<IconWorld size={18} />}
                        label={t('procurement.suppliersPage.drawer.website')}
                        placeholder={t('procurement.suppliersPage.form.shopUrlPlaceholder')}
                        value={formData.shop_url}
                        onChange={(e) => setFormData({ ...formData, shop_url: e.target.value })}
                        error={errors.shop_url}
                        className="text-base md:text-lg"
                      />
                    </SimpleGrid>

                    <Textarea
                      label={t('procurement.suppliersPage.form.address')}
                      placeholder={t('procurement.suppliersPage.form.addressPlaceholderSimple')}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      minRows={2}
                      maxRows={4}
                      className="text-base md:text-lg"
                    />

                    <Switch
                      label={t('procurement.suppliersPage.form.isActive')}
                      description={t('procurement.suppliersPage.form.isActiveDescriptionSimple')}
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
                      className="text-lg md:text-xl lg:text-2xl"
                    />
                  </Stack>
                </Paper>

                {/* Contact Information Section */}
                <Paper withBorder p="md" radius={0} bg="blue.0">
                  <Group gap="sm" mb="md">
                    <IconUsers size={20} c="blue" />
                    <Text fw={600} className="text-sm md:text-base">{t('procurement.suppliersPage.form.contactInfo')}</Text>
                  </Group>
                  <Stack gap="md">
                    <TextInput
                      required
                      type="email"
                      leftSection={<IconMail size={18} />}
                      label={t('procurement.suppliersPage.form.email')}
                      placeholder="email@company.com"
                      description="Business email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      className="text-base md:text-lg"
                    />

                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <TextInput
                        leftSection={<IconPhone size={18} />}
                        label={t('procurement.suppliersPage.form.phone')}
                        placeholder="+86 123 4567 8901"
                        description="Primary contact phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="text-base md:text-lg"
                      />

                      <TextInput
                        leftSection={<IconBrandWhatsapp size={18} />}
                        label="WhatsApp"
                        placeholder="+86 123 4567 8901"
                        description="For quick messaging"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="text-base md:text-lg"
                      />
                    </SimpleGrid>

                    <TextInput
                      leftSection={<IconUsers size={18} />}
                      label={t('procurement.suppliersPage.form.contactPerson')}
                      placeholder="Name of contact person"
                      description="Primary point of contact"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="text-base md:text-lg"
                    />
                  </Stack>
                </Paper>

                {/* Payment Information Section */}
                <Paper withBorder p="md" radius={0} bg="green.0">
                  <Group gap="sm" mb="md">
                    <IconCoin size={20} c="green" />
                    <Text fw={600} className="text-sm md:text-base">{t('procurement.suppliersPage.form.paymentInfo')}</Text>
                  </Group>
                  <Stack gap="xs">
                    <Text className="text-sm md:text-base" c="dimmed">
                      Add payment details for Chinese suppliers (optional)
                    </Text>
                    <Stack gap="md">
                      {/* WeChat Section */}
                      <Stack gap="sm">
                        <Group gap="xs">
                          <IconCoin size={18} c="green" />
                          <Text fw={500} className="text-sm md:text-base">{t('procurement.suppliersPage.drawer.wechatPay')}</Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                          <TextInput
                            label={t('procurement.suppliersPage.details.wechatId')}
                            placeholder={t('procurement.suppliersPage.form.wechatIdPlaceholderSimple')}
                            value={formData.wechat_id}
                            onChange={(e) => setFormData({ ...formData, wechat_id: e.target.value })}
                            className="text-base md:text-lg"
                          />

                          <FileInput
                            label={t('procurement.suppliersPage.details.wechatQrFile')}
                            placeholder={t('procurement.suppliersPage.drawer.uploadQrCode')}
                            accept="image/png,image/jpeg,image/jpg"
                            leftSection={<IconUpload size={16} />}
                            value={formData.wechat_qr_file}
                            onChange={(file) => {
                              setFormData({ ...formData, wechat_qr_file: file })
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setWechatQrPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setWechatQrPreview(null)
                              }
                            }}
                            className="text-base md:text-lg"
                            clearable
                          />
                        </SimpleGrid>

                        {/* WeChat QR Preview */}
                        {(wechatQrPreview || formData.wechat_qr_url) && (
                          <Paper withBorder p="sm" radius={0} bg="white">
                            <Group gap="sm" align="flex-start">
                              <Box>
                                <Image
                                  src={wechatQrPreview || formData.wechat_qr_url}
                                  alt="WeChat QR Code"
                                  w={150}
                                  h={150}
                                  fit="contain"
                                  radius="md"
                                  withPlaceholder
                                  placeholder={<IconPhoto size={40} c="dimmed" />}
                                />
                              </Box>
                              <Stack gap="xs" className="flex-1">
                                <Text className="text-sm md:text-base" fw={500}>Preview</Text>
                                <Text className="text-xs md:text-sm" c="dimmed">
                                  {wechatQrPreview ? 'New image to be uploaded' : 'Currently uploaded image'}
                                </Text>
                                <Button
                                  className="text-xs md:text-sm"
                                  variant="light"
                                  color="red"
                                  leftSection={<IconX size={14} />}
                                  onClick={() => {
                                    setFormData({ ...formData, wechat_qr_file: null })
                                    setWechatQrPreview(null)
                                  }}
                                >
                                  {t('procurement.suppliersPage.drawer.removePreview')}
                                </Button>
                              </Stack>
                            </Group>
                          </Paper>
                        )}
                      </Stack>

                      <Divider />

                      {/* Alipay Section */}
                      <Stack gap="sm">
                        <Group gap="xs">
                          <IconCoin size={18} c="blue" />
                          <Text fw={500} className="text-sm md:text-base">{t('procurement.suppliersPage.drawer.alipay')}</Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                          <TextInput
                            label={t('procurement.suppliersPage.details.alipayId')}
                            placeholder={t('procurement.suppliersPage.form.alipayIdPlaceholderSimple')}
                            value={formData.alipay_id}
                            onChange={(e) => setFormData({ ...formData, alipay_id: e.target.value })}
                            className="text-base md:text-lg"
                          />

                          <FileInput
                            label={t('procurement.suppliersPage.details.alipayQrFile')}
                            placeholder={t('procurement.suppliersPage.drawer.uploadQrCode')}
                            accept="image/png,image/jpeg,image/jpg"
                            leftSection={<IconUpload size={16} />}
                            value={formData.alipay_qr_file}
                            onChange={(file) => {
                              setFormData({ ...formData, alipay_qr_file: file })
                              if (file) {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setAlipayQrPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setAlipayQrPreview(null)
                              }
                            }}
                            className="text-base md:text-lg"
                            clearable
                          />
                        </SimpleGrid>

                        {/* Alipay QR Preview */}
                        {(alipayQrPreview || formData.alipay_qr_url) && (
                          <Paper withBorder p="sm" radius={0} bg="white">
                            <Group gap="sm" align="flex-start">
                              <Box>
                                <Image
                                  src={alipayQrPreview || formData.alipay_qr_url}
                                  alt="Alipay QR Code"
                                  w={150}
                                  h={150}
                                  fit="contain"
                                  radius="md"
                                  withPlaceholder
                                  placeholder={<IconPhoto size={40} c="dimmed" />}
                                />
                              </Box>
                              <Stack gap="xs" className="flex-1">
                                <Text className="text-sm md:text-base" fw={500}>Preview</Text>
                                <Text className="text-xs md:text-sm" c="dimmed">
                                  {alipayQrPreview ? 'New image to be uploaded' : 'Currently uploaded image'}
                                </Text>
                                <Button
                                  className="text-xs md:text-sm"
                                  variant="light"
                                  color="red"
                                  leftSection={<IconX size={14} />}
                                  onClick={() => {
                                    setFormData({ ...formData, alipay_qr_file: null })
                                    setAlipayQrPreview(null)
                                  }}
                                >
                                  Remove
                                </Button>
                              </Stack>
                            </Group>
                          </Paper>
                        )}
                      </Stack>
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>

            {/* Action Buttons */}
            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                className="text-base md:text-lg"
                onClick={() => {
                  setModalOpened(false)
                  resetForm()
                }}
              >
                {t('procurement.suppliersPage.form.cancel')}
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
                className="text-base md:text-lg"
                px="xl"
              >
                {editMode
                  ? t('procurement.suppliersPage.form.update')
                  : t('procurement.suppliersPage.form.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>
    </Stack>
  )
}
