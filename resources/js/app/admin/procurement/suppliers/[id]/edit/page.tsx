'use client'

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  Paper,
  TextInput,
  Textarea,
  Switch,
  Box,
  Anchor,
  Breadcrumbs,
  ActionIcon,
  Image,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getSuppliers, updateSupplier } from '@/utils/api'

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  name: string
  email: string
  phone: string
  whatsapp: string
  shopName: string
  shopUrl: string
  contactPerson: string
  wechatId: string
  wechatQrUrl: string
  wechatQrFile: File | null
  wechatQrFileCurrent: string | null
  alipayId: string
  alipayQrUrl: string
  alipayQrFile: File | null
  alipayQrFileCurrent: string | null
  address: string
  isActive: boolean
}

interface Supplier {
  id: number
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  shopName: string | null
  shopUrl: string | null
  contactPerson: string | null
  wechatId: string | null
  wechatQrFile: string | null
  wechatQrUrl: string | null
  alipayId: string | null
  alipayQrFile: string | null
  alipayQrUrl: string | null
  address: string | null
  isActive: boolean
  walletBalance: number
  creditLimit: number
}

// ============================================================================
// PURE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates supplier name
 */
const validateName = (name: string): boolean => {
  return name.trim().length > 0
}

/**
 * Validates email format
 */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates URL format
 */
const validateUrl = (url: string): boolean => {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// PURE DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transforms API supplier data to form data format
 */
const transformSupplierToFormData = (supplier: Supplier): FormData => ({
  name: supplier.name || '',
  email: supplier.email || '',
  phone: supplier.phone || '',
  whatsapp: supplier.whatsapp || '',
  shopName: supplier.shopName || '',
  shopUrl: supplier.shopUrl || '',
  contactPerson: supplier.contactPerson || '',
  wechatId: supplier.wechatId || '',
  wechatQrUrl: supplier.wechatQrUrl || '',
  wechatQrFile: null,
  wechatQrFileCurrent: supplier.wechatQrFile || null,
  alipayId: supplier.alipayId || '',
  alipayQrUrl: supplier.alipayQrUrl || '',
  alipayQrFile: null,
  alipayQrFileCurrent: supplier.alipayQrFile || null,
  address: supplier.address || '',
  isActive: supplier.isActive ?? true,
})

/**
 * Converts form data to API payload with snake_case field names
 */
const transformFormDataToPayload = (data: FormData): FormData => {
  const payload = new FormData() as any

  // Field mapping: camelCase -> snake_case
  const fieldMapping: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    whatsapp: 'whatsapp',
    shopName: 'shop_name',
    shopUrl: 'shop_url',
    contactPerson: 'contact_person',
    wechatId: 'wechat_id',
    wechatQrUrl: 'wechat_qr_url',
    alipayId: 'alipay_id',
    alipayQrUrl: 'alipay_qr_url',
    address: 'address',
    isActive: 'is_active',
  }

  // Add all text fields with correct field names
  Object.keys(fieldMapping).forEach(camelKey => {
    const snakeKey = fieldMapping[camelKey]
    const value = data[camelKey as keyof FormData]

    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'boolean') {
        payload.append(snakeKey, value ? '1' : '0')
      } else {
        payload.append(snakeKey, String(value))
      }
    }
  })

  // Add files if present
  if (data.wechatQrFile) {
    payload.append('wechat_qr_file', data.wechatQrFile)
  }
  if (data.alipayQrFile) {
    payload.append('alipay_qr_file', data.alipayQrFile)
  }

  return payload
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditSupplierPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    shopName: '',
    shopUrl: '',
    contactPerson: '',
    wechatId: '',
    wechatQrUrl: '',
    wechatQrFile: null,
    wechatQrFileCurrent: null,
    alipayId: '',
    alipayQrUrl: '',
    alipayQrFile: null,
    alipayQrFileCurrent: null,
    address: '',
    isActive: true,
  })
  const [submitting, setSubmitting] = useState(false)

  // QR code preview states
  const [wechatQrPreview, setWechatQrPreview] = useState<string | null>(null)
  const [alipayQrPreview, setAlipayQrPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!hasPermission('procurement.suppliers.edit')) {
      navigate('/dashboard')
      return
    }

    if (id) {
      fetchSupplier()
    }
  }, [id])

  const fetchSupplier = async () => {
    try {
      setLoading(true)
      const response: any = await getSuppliers({ per_page: 100 })
      const suppliersData = response?.data?.data || response?.data || []
      const suppliersList = Array.isArray(suppliersData) ? suppliersData : []

      const found = suppliersList.find((s: Supplier) => s.id === parseInt(id))
      if (found) {
        setSupplier(found)
        setFormData(transformSupplierToFormData(found))
      } else {
        notifications.show({
          title: t('common.error') || 'Error',
          message: 'Supplier not found',
          color: 'red',
        })
        navigate('/procurement/suppliers')
      }
    } catch (error: any) {
      console.error('Failed to load supplier:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to load supplier',
        color: 'red',
      })
      navigate('/procurement/suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validation
    const errors: Record<string, string> = {}

    if (!validateName(formData.name)) {
      errors.name = t('procurement.suppliersPage.form.validation.nameRequired') || 'Supplier name is required'
    }

    if (!validateEmail(formData.email)) {
      errors.email = t('procurement.suppliersPage.form.validation.emailInvalid') || 'Please enter a valid email address'
    }

    if (formData.shopUrl && !validateUrl(formData.shopUrl)) {
      errors.shopUrl = t('procurement.suppliersPage.form.validation.urlInvalid') || 'Please enter a valid URL'
    }

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, message]) => {
        notifications.show({
          title: t('common.error') || 'Error',
          message,
          color: 'red',
        })
      })
      return
    }

    try {
      setSubmitting(true)
      const payload = transformFormDataToPayload(formData)
      await updateSupplier(Number(id), payload)

      notifications.show({
        title: t('common.success') || 'Success',
        message: t('procurement.suppliersPage.notifications.updatedMessage', { name: formData.name }) || 'Supplier updated successfully',
        color: 'green',
      })

      navigate('/procurement/suppliers')
    } catch (error: any) {
      console.error('Failed to update supplier:', error)
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.response?.data?.message || error.message || 'Failed to update supplier',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Text>Loading...</Text>
        </Stack>
      </Box>
    )
  }

  const breadcrumbItems = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.suppliers'), href: '/procurement/suppliers' },
    { title: supplier?.name || t('procurement.suppliers') || 'Suppliers', href: `/procurement/suppliers/${id}` },
    { title: t('common.edit') || 'Edit' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* Breadcrumbs */}
          <Breadcrumbs separator={<IconChevronRight size={16} />}>
            {breadcrumbItems}
          </Breadcrumbs>

          {/* Header */}
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={0}>
              <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
                {t('procurement.suppliersPage.editSupplier') || 'Edit Supplier'}
              </Text>
              {supplier && (
                <Text size="sm" c="dimmed">
                  {t('procurement.suppliersPage.form.title') || 'Supplier Information'}
                </Text>
              )}
            </Stack>

            <Group gap="sm">
              <Button
                type="button"
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate(`/procurement/suppliers/${id}`)}
              >
                {t('common.back') || 'Back'}
              </Button>
              <Button type="submit" loading={submitting}>
                {t('procurement.suppliersPage.form.update') || 'Update Supplier'}
              </Button>
            </Group>
          </Group>

          {/* Wallet Info (Read Only) */}
          {supplier && (
            <Paper withBorder p="md" radius="md" bg="light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-8))">
              <Stack gap="md">
                <Text fw={600} size="lg">Wallet Information</Text>
                <Group grow>
                  <Stack gap={0}>
                    <Text size="sm" c="dimmed">Wallet Balance</Text>
                    <Text size="md" fw={600}>
                      ৳{parseFloat(String(supplier.walletBalance || 0)).toFixed(2)}
                    </Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="sm" c="dimmed">Credit Limit</Text>
                    <Text size="md" fw={600}>
                      ৳{parseFloat(String(supplier.creditLimit || 0)).toFixed(2)}
                    </Text>
                  </Stack>
                </Group>
              </Stack>
            </Paper>
          )}

          {/* Basic Information */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">
                {t('procurement.suppliersPage.form.basicInfo') || 'Basic Information'}
              </Text>

              <TextInput
                label={t('procurement.suppliersPage.form.name') || 'Supplier Name'}
                placeholder={t('procurement.suppliersPage.form.namePlaceholder') || 'Enter supplier name'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                size="md"
              />

              <TextInput
                label={t('procurement.suppliersPage.form.email') || 'Email'}
                placeholder={t('procurement.suppliersPage.form.emailPlaceholder') || 'email@example.com'}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                size="md"
              />

              <TextInput
                label={t('procurement.suppliersPage.form.phone') || 'Phone Number'}
                placeholder={t('procurement.suppliersPage.form.phonePlaceholder') || 'Enter phone number'}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                size="md"
              />

              <TextInput
                label={t('procurement.suppliersPage.form.whatsapp') || 'WhatsApp Number'}
                placeholder={t('procurement.suppliersPage.form.whatsappPlaceholder') || 'Enter WhatsApp number'}
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                size="md"
              />
            </Stack>
          </Paper>

          {/* Shop Information */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">
                {t('procurement.suppliersPage.form.shopInfo') || 'Shop Information'}
              </Text>

              <TextInput
                label={t('procurement.suppliersPage.form.shopName') || 'Shop Name'}
                placeholder={t('procurement.suppliersPage.form.shopNamePlaceholder') || 'Enter shop name'}
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                size="md"
              />

              <TextInput
                label={t('procurement.suppliersPage.form.shopUrl') || 'Shop URL'}
                placeholder={t('procurement.suppliersPage.form.shopUrlPlaceholder') || 'https://example.com'}
                value={formData.shopUrl}
                onChange={(e) => setFormData({ ...formData, shopUrl: e.target.value })}
                size="md"
              />

              <TextInput
                label={t('procurement.suppliersPage.form.contactPerson') || 'Contact Person'}
                placeholder={t('procurement.suppliersPage.form.contactPersonPlaceholder') || 'Name of contact person'}
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                size="md"
              />

              <Textarea
                label={t('procurement.suppliersPage.form.address') || 'Address'}
                placeholder={t('procurement.suppliersPage.form.addressPlaceholder') || 'Enter full address'}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                minRows={2}
                size="md"
              />

              <Switch
                label={t('procurement.suppliersPage.form.isActive') || 'Active Supplier'}
                description={t('procurement.suppliersPage.form.isActiveDescription') || 'Enable this supplier for orders'}
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
                size="md"
              />
            </Stack>
          </Paper>

          {/* Payment Information */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Text fw={600} size="lg">
                {t('procurement.suppliersPage.form.paymentInfo') || 'Payment Information'}
              </Text>

              {/* WeChat Pay */}
              <Stack gap="sm" p="sm" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" style={{ borderRadius: '8px' }}>
                <Text size="sm" fw={500}>WeChat Pay</Text>

                <TextInput
                  label={t('procurement.suppliersPage.form.wechatId') || 'WeChat ID'}
                  placeholder={t('procurement.suppliersPage.form.wechatIdPlaceholder') || 'Enter WeChat ID'}
                  value={formData.wechatId}
                  onChange={(e) => setFormData({ ...formData, wechatId: e.target.value })}
                  size="md"
                />

                <TextInput
                  label={t('procurement.suppliersPage.form.wechatQrUrl') || 'WeChat QR Code URL'}
                  placeholder={t('procurement.suppliersPage.form.wechatQrUrlPlaceholder') || 'https://example.com/qr.jpg'}
                  value={formData.wechatQrUrl}
                  onChange={(e) => setFormData({ ...formData, wechatQrUrl: e.target.value })}
                  size="md"
                />

                {formData.wechatQrFileCurrent && (
                  <Group gap="sm">
                    <Text size="sm" c="dimmed">Current: {formData.wechatQrFileCurrent}</Text>
                  </Group>
                )}

                <Group>
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconUpload size={14} />}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/svg'
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setFormData({ ...formData, wechatQrFile: file })
                          // Generate preview
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setWechatQrPreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }
                      input.click()
                    }}
                  >
                    {t('procurement.suppliersPage.form.wechatQrFile') || 'Upload New QR Code'}
                  </Button>

                  {formData.wechatQrFile && (
                    <Group gap="xs">
                      <Text size="sm">{formData.wechatQrFile.name}</Text>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="light"
                        onClick={() => {
                          setFormData({ ...formData, wechatQrFile: null })
                          setWechatQrPreview(null)
                        }}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>

                {/* QR Code Preview */}
                {(wechatQrPreview || formData.wechatQrFileCurrent) && (
                  <Box mt="sm">
                    <Text size="xs" c="dimmed" mb="xs">
                      {wechatQrPreview ? 'New QR Code Preview:' : 'Current QR Code:'}
                    </Text>
                    <Image
                      src={
                        wechatQrPreview ||
                        (formData.wechatQrFileCurrent?.startsWith('http')
                          ? formData.wechatQrFileCurrent
                          : `${window.location.origin}/storage/${formData.wechatQrFileCurrent}`)
                      }
                      alt="WeChat QR Code"
                      w={150}
                      h={150}
                      fit="contain"
                      radius="md"
                    />
                  </Box>
                )}
              </Stack>

              {/* Alipay */}
              <Stack gap="sm" p="sm" bg="light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-8))" style={{ borderRadius: '8px' }}>
                <Text size="sm" fw={500}>Alipay</Text>

                <TextInput
                  label={t('procurement.suppliersPage.form.alipayId') || 'Alipay ID'}
                  placeholder={t('procurement.suppliersPage.form.alipayIdPlaceholder') || 'Enter Alipay ID'}
                  value={formData.alipayId}
                  onChange={(e) => setFormData({ ...formData, alipayId: e.target.value })}
                  size="md"
                />

                <TextInput
                  label={t('procurement.suppliersPage.form.alipayQrUrl') || 'Alipay QR Code URL'}
                  placeholder={t('procurement.suppliersPage.form.alipayQrUrlPlaceholder') || 'https://example.com/qr.jpg'}
                  value={formData.alipayQrUrl}
                  onChange={(e) => setFormData({ ...formData, alipayQrUrl: e.target.value })}
                  size="md"
                />

                {formData.alipayQrFileCurrent && (
                  <Group gap="sm">
                    <Text size="sm" c="dimmed">Current: {formData.alipayQrFileCurrent}</Text>
                  </Group>
                )}

                <Group>
                  <Button
                    variant="light"
                    size="sm"
                    leftSection={<IconUpload size={14} />}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/jpeg,image/png,image/jpg,image/gif,image/svg'
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setFormData({ ...formData, alipayQrFile: file })
                          // Generate preview
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setAlipayQrPreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }
                      input.click()
                    }}
                  >
                    {t('procurement.suppliersPage.form.alipayQrFile') || 'Upload New QR Code'}
                  </Button>

                  {formData.alipayQrFile && (
                    <Group gap="xs">
                      <Text size="sm">{formData.alipayQrFile.name}</Text>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="light"
                        onClick={() => {
                          setFormData({ ...formData, alipayQrFile: null })
                          setAlipayQrPreview(null)
                        }}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>

                {/* QR Code Preview */}
                {(alipayQrPreview || formData.alipayQrFileCurrent) && (
                  <Box mt="sm">
                    <Text size="xs" c="dimmed" mb="xs">
                      {alipayQrPreview ? 'New QR Code Preview:' : 'Current QR Code:'}
                    </Text>
                    <Image
                      src={
                        alipayQrPreview ||
                        (formData.alipayQrFileCurrent?.startsWith('http')
                          ? formData.alipayQrFileCurrent
                          : `${window.location.origin}/storage/${formData.alipayQrFileCurrent}`)
                      }
                      alt="Alipay QR Code"
                      w={150}
                      h={150}
                      fit="contain"
                      radius="md"
                    />
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Box>
  )
}
