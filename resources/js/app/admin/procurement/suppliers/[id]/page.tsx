import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Stack,
  Group,
  Text,
  Paper,
  Button,
  Badge,
  ScrollArea,
  Divider,
  SimpleGrid,
  Card,
  Alert,
  Box,
  Image,
  ActionIcon,
  Menu,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconMail,
  IconPhone,
  IconBrandWhatsapp,
  IconUsers,
  IconWorld,
  IconMapPin,
  IconCoin,
  IconDots,
  IconPhoto,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import {
  getSuppliers,
  deleteSupplier,
  getProcurementProductsBySupplier,
  getPurchaseOrders,
  type Supplier
} from '@/utils/api'

export default function SupplierDetailsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [lostItems, setLostItems] = useState<any[]>([])
  const [lostItemsLoading, setLostItemsLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchSupplier(id)
    }
  }, [id])

  useEffect(() => {
    if (supplier?.id) {
      fetchProducts(supplier.id)
      fetchLostItems(supplier.id)
    }
  }, [supplier])

  const fetchLostItems = async (supplierId: number) => {
    try {
      setLostItemsLoading(true)
      const response: any = await getPurchaseOrders({ supplier_id: supplierId, per_page: 100 })
      const ordersData = response?.data?.data || response?.data || []
      const orders = Array.isArray(ordersData) ? ordersData : []

      // Extract lost items from all orders
      const allLostItems: any[] = []
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.lostQuantity && item.lostQuantity > 0) {
              allLostItems.push({
                orderId: order.id,
                orderNumber: order.poNumber,
                orderDate: order.orderDate || order.createdAt,
                productId: item.productId,
                productName: item.product?.name || item.productName || 'Unknown Product',
                lostQuantity: item.lostQuantity,
                lostItemPrice: item.lostItemPrice,
                chinaPrice: item.chinaPrice,
                bdPrice: item.bdPrice,
              })
            }
          })
        }
      })

      setLostItems(allLostItems)
    } catch (error) {
      console.error('Failed to fetch lost items:', error)
    } finally {
      setLostItemsLoading(false)
    }
  }

  const fetchProducts = async (supplierId: number) => {
    try {
      setProductsLoading(true)
      const response: any = await getProcurementProductsBySupplier(supplierId, { per_page: 50 })
      const productsData = response?.data?.data || response?.data || []
      setProducts(Array.isArray(productsData) ? productsData : [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setProductsLoading(false)
    }
  }

  const fetchSupplier = async (supplierId: string) => {
    try {
      setLoading(true)
      const response = await getSuppliers({ per_page: 1 })
      let supplierData: Supplier[] = []

      // Handle response structure
      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status && response.data) {
          const data = response.data
          if (typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            supplierData = data.data
          } else if (Array.isArray(data)) {
            supplierData = data
          }
        }
      } else if (Array.isArray(response)) {
        supplierData = response
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        supplierData = response.data
      }

      const found = supplierData.find((s) => s.id === parseInt(supplierId))
      if (found) {
        setSupplier(found)
      } else {
        notifications.show({
          title: 'Supplier not found',
          message: 'The requested supplier could not be found',
          color: 'red',
        })
        navigate('/procurement/suppliers')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to load supplier',
        color: 'red',
      })
      navigate('/procurement/suppliers')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (!supplier) return

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
          navigate('/procurement/suppliers')
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

  if (loading) {
    return (
      <Stack p="xl" gap="md">
        <Text className="text-lg md:text-xl lg:text-2xl">{t('procurement.suppliersPage.details.loading')}</Text>
      </Stack>
    )
  }

  if (!supplier) {
    return (
      <Stack p="xl" gap="md">
        <Alert variant="light" color="red">
          {t('procurement.suppliersPage.details.notFound')}
        </Alert>
      </Stack>
    )
  }

  const baseUrl = window.location.origin

  return (
    <Stack p="xl" gap="md">
      {/* Header */}
      <div>
        <Text className="text-lg md:text-xl lg:text-2xl" fw={700}>
          {supplier.name}
        </Text>
        {supplier.shopName && (
          <Text className="text-sm md:text-base" c="dimmed">
            {supplier.shopName}
          </Text>
        )}
      </div>

      {/* Status Badge */}
      <Group>
        <Badge
          color={supplier.isActive ? 'green' : 'gray'}
          variant="light"
          size="lg"
          className="text-sm md:text-base"
        >
          {supplier.isActive ? t('procurement.suppliersPage.active') : t('procurement.suppliersPage.inactive')}
        </Badge>
      </Group>

      {/* Main Content */}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {/* Left Column */}
        <Stack gap="md">
          {/* Basic Information */}
          <Paper withBorder p="md" radius="md">
            <Group gap="sm" mb="md">
              <IconBuilding size={20} c="blue" />
              <Text fw={600} className="text-base md:text-lg">{t('procurement.suppliersPage.form.basicInfo')}</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.details.companyName')}</Text>
                <Text className="text-sm md:text-base">{supplier.name}</Text>
              </Stack>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.shopName')}</Text>
                <Text className="text-sm md:text-base">{supplier.shopName || '-'}</Text>
              </Stack>
              {supplier.shopUrl && (
                <Stack gap="xs">
                  <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.details.website')}</Text>
                  <Text
                    className="text-sm md:text-base"
                    component="a"
                    href={supplier.shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--mantine-color-blue-filled)' }}
                  >
                    {supplier.shopUrl}
                  </Text>
                </Stack>
              )}
              {supplier.address && (
                <Stack gap="xs" style={{ gridColumn: '1 / -1' }}>
                  <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.address')}</Text>
                  <Text className="text-sm md:text-base">{supplier.address}</Text>
                </Stack>
              )}
            </SimpleGrid>
          </Paper>

          {/* Contact Information */}
          <Paper withBorder p="md" radius="md">
            <Group gap="sm" mb="md">
              <IconUsers size={20} c="blue" />
              <Text fw={600} className="text-base md:text-lg">{t('procurement.suppliersPage.form.contactInfo')}</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.email')}</Text>
                <Group gap="xs">
                  <IconMail size={14} c="dimmed" />
                  <Text className="text-sm md:text-base">{supplier.email}</Text>
                </Group>
              </Stack>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.phone')}</Text>
                <Group gap="xs">
                  <IconPhone size={14} c="dimmed" />
                  <Text className="text-sm md:text-base">{supplier.phone || '-'}</Text>
                </Group>
              </Stack>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.whatsapp')}</Text>
                <Group gap="xs">
                  <IconBrandWhatsapp size={14} c="dimmed" />
                  <Text className="text-sm md:text-base">{supplier.whatsapp || '-'}</Text>
                </Group>
              </Stack>
              <Stack gap="xs">
                <Text className="text-xs md:text-sm" c="dimmed">{t('procurement.suppliersPage.form.contactPerson')}</Text>
                <Group gap="xs">
                  <IconUsers size={14} c="dimmed" />
                  <Text className="text-sm md:text-base">{supplier.contactPerson || '-'}</Text>
                </Group>
              </Stack>
            </SimpleGrid>
          </Paper>

          {/* Lost Items History */}
          <Paper withBorder p="md" radius="md">
            <Group gap="sm" mb="md">
              <IconCoin size={20} c="orange" />
              <Text fw={600} className="text-base md:text-lg">{t('procurement.suppliersPage.details.lostItemsHistory')}</Text>
              <Badge size="sm">{lostItems.length}</Badge>
            </Group>

            {lostItemsLoading ? (
              <Text className="text-sm" c="dimmed">{t('procurement.suppliersPage.details.loadingLostItems')}</Text>
            ) : lostItems.length === 0 ? (
              <Text className="text-sm" c="dimmed">{t('procurement.suppliersPage.details.noLostItems')}</Text>
            ) : (
              <Stack gap="md">
                {/* Summary Card - Total Lost Value */}
                <Paper withBorder p="sm" radius="sm" bg="red.0">
                  <Group justify="space-between">
                    <Text size="sm" fw={600} c="red">
                      <IconAlertTriangle size={16} style={{ display: 'inline', marginRight: 4 }} />
                      {t('procurement.suppliersPage.details.totalLostCost')}
                    </Text>
                    <Text size="lg" fw={700} c="red">
                      ৳{Number(
                        lostItems.reduce((sum, item) => {
                          const price = item.lostItemPrice || (item.bdPrice || 0)
                          return sum + (price * item.lostQuantity)
                        }, 0)
                      ).toFixed(2)}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {t('procurement.suppliersPage.details.totalLostDescription')}
                  </Text>
                </Paper>

                {/* Lost Items List */}
                <ScrollArea h={400}>
                  <Stack gap="sm">
                    {lostItems.map((item, index) => (
                      <Paper
                        key={index}
                        withBorder
                        p="sm"
                        radius="md"
                        className="hover:shadow-sm transition-shadow"
                      >
                        {/* Desktop View */}
                        <Box className="hidden md:block">
                          <Group justify="space-between" align="center">
                            {/* Product Info */}
                            <Group gap="md" flex="1">
                              <Text className="text-sm" fw={600} style={{ minWidth: 200 }}>
                                {item.productName}
                              </Text>
                              <Badge size="sm" color="orange" variant="light">
                                {t('procurement.suppliersPage.details.lost')}: {item.lostQuantity}
                              </Badge>
                            </Group>

                            {/* Order Info */}
                            <Group gap="lg" style={{ minWidth: 200 }}>
                              <Stack gap={2}>
                                <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.orderNumber')}</Text>
                                <Text
                                  className="text-sm"
                                  fw={500}
                                  c="blue"
                                  component="a"
                                  href={`/procurement/orders/${item.orderId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ cursor: 'pointer' }}
                                >
                                  {item.orderNumber}
                                  <IconExternalLink size={12} style={{ marginLeft: 4 }} />
                                </Text>
                              </Stack>
                              <Stack gap={2}>
                                <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.orderDate')}</Text>
                                <Text className="text-sm">
                                  {item.orderDate ? new Date(item.orderDate).toLocaleDateString() : 'N/A'}
                                </Text>
                              </Stack>
                            </Group>

                            {/* Cost Info */}
                            <Stack gap={2} align="flex-end" style={{ minWidth: 150 }}>
                              <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.lostCost')}</Text>
                              <Text className="text-sm" fw={700} c="red">
                                {item.lostItemPrice
                                  ? `৳${Number(item.lostItemPrice).toFixed(2)}`
                                  : item.chinaPrice
                                    ? `¥${Number(item.chinaPrice).toFixed(2)}`
                                    : '-'
                                }
                              </Text>
                              {item.bdPrice && (
                                <Text className="text-xs" c="dimmed">
                                  ৳{Number(item.bdPrice).toFixed(2)}/{t('procurement.suppliersPage.details.unit')}
                                </Text>
                              )}
                            </Stack>
                          </Group>
                        </Box>

                        {/* Mobile View */}
                        <Box className="block md:hidden">
                          <Stack gap="xs">
                            <Group justify="space-between" align="center">
                              <Text className="text-sm" fw={600} style={{ flex: 1 }}>
                                {item.productName}
                              </Text>
                              <Badge size="sm" color="orange" variant="light">
                                {t('procurement.suppliersPage.details.lost')}: {item.lostQuantity}
                              </Badge>
                            </Group>

                            <Divider />

                            <SimpleGrid cols={2}>
                              <Stack gap={2}>
                                <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.orderNumber')}</Text>
                                <Text
                                  className="text-sm"
                                  fw={500}
                                  c="blue"
                                  component="a"
                                  href={`/procurement/orders/${item.orderId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.orderNumber}
                                  <IconExternalLink size={12} style={{ marginLeft: 4 }} />
                                </Text>
                              </Stack>
                              <Stack gap={2} align="flex-end">
                                <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.orderDate')}</Text>
                                <Text className="text-sm">
                                  {item.orderDate ? new Date(item.orderDate).toLocaleDateString() : 'N/A'}
                                </Text>
                              </Stack>
                            </SimpleGrid>

                            <Divider />

                            <Group justify="space-between" align="center">
                              <Text className="text-xs" c="dimmed">{t('procurement.suppliersPage.details.lostCost')}</Text>
                              <Text className="text-sm" fw={700} c="red">
                                {item.lostItemPrice
                                  ? `৳${Number(item.lostItemPrice).toFixed(2)}`
                                  : item.chinaPrice
                                    ? `¥${Number(item.chinaPrice).toFixed(2)}`
                                    : '-'
                                }
                              </Text>
                            </Group>
                          </Stack>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            )}
          </Paper>
        </Stack>

        {/* Right Column - Payment Information */}
        {(supplier.wechatId || supplier.wechatQrFile || supplier.alipayId || supplier.alipayQrFile) && (
          <Paper withBorder p="md" radius="md">
            <Group gap="sm" mb="md">
              <IconCoin size={20} c="green" />
              <Text fw={600} className="text-base md:text-lg">{t('procurement.suppliersPage.form.paymentInfo')}</Text>
            </Group>
            <Stack gap="md">
              {/* WeChat Pay and Alipay Side by Side */}
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                {/* WeChat Pay */}
                {(supplier.wechatId || supplier.wechatQrFile) && (
                  <Card withBorder p="sm" radius="sm" bg="gray.0">
                    <Text fw={500} className="text-sm md:text-base" mb="xs">{t('procurement.suppliersPage.details.wechatPay')}</Text>
                    {supplier.wechatId && (
                      <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                        {t('procurement.suppliersPage.details.wechatId')}: {supplier.wechatId}
                      </Text>
                    )}
                    {supplier.wechatQrFile && (
                      <Box>
                        <Text className="text-xs md:text-sm" c="dimmed" mb="xs">{t('procurement.suppliersPage.details.qrCode')}:</Text>
                        <Image
                          src={supplier.wechatQrFile.startsWith('http') ? supplier.wechatQrFile : `${baseUrl}/storage/${supplier.wechatQrFile}`}
                          alt="WeChat QR Code"
                          w={200}
                          h={200}
                          fit="contain"
                          radius="md"
                          withPlaceholder
                          fallbackSrc={<IconPhoto size={40} c="dimmed" />}
                        />
                      </Box>
                    )}
                  </Card>
                )}

                {/* Alipay */}
                {(supplier.alipayId || supplier.alipayQrFile) && (
                  <Card withBorder p="sm" radius="sm" bg="blue.0">
                    <Text fw={500} className="text-sm md:text-base" mb="xs">{t('procurement.suppliersPage.details.alipay')}</Text>
                    {supplier.alipayId && (
                      <Text className="text-xs md:text-sm" c="dimmed" mb="xs">
                        {t('procurement.suppliersPage.details.alipayId')}: {supplier.alipayId}
                      </Text>
                    )}
                    {supplier.alipayQrFile && (
                      <Box>
                        <Text className="text-xs md:text-sm" c="dimmed" mb="xs">{t('procurement.suppliersPage.details.qrCode')}:</Text>
                        <Image
                          src={supplier.alipayQrFile.startsWith('http') ? supplier.alipayQrFile : `${baseUrl}/storage/${supplier.alipayQrFile}`}
                          alt="Alipay QR Code"
                          w={200}
                          h={200}
                          fit="contain"
                          radius="md"
                          withPlaceholder
                          fallbackSrc={<IconPhoto size={40} c="dimmed" />}
                        />
                      </Box>
                    )}
                  </Card>
                )}
              </SimpleGrid>
            </Stack>
          </Paper>
        )}
      </SimpleGrid>

      {/* Products Section */}
      <Paper withBorder p="md" radius="md">
        <Group gap="sm" mb="md">
          <IconPhoto size={20} c="blue" />
          <Text fw={600} className="text-base md:text-lg">
            {t('procurement.suppliersPage.products')}
          </Text>
          <Badge size="sm">{products.length}</Badge>
        </Group>

        {productsLoading ? (
          <Text className="text-sm md:text-base" c="dimmed">
            {t('procurement.suppliersPage.details.loadingProducts')}
          </Text>
        ) : products.length === 0 ? (
          <Text className="text-sm md:text-base" c="dimmed">
            {t('procurement.suppliersPage.details.noProductsLinked')}
          </Text>
        ) : (
          <Stack gap="sm">
            {products.map((product) => (
              <Paper
                key={product.id}
                withBorder
                p="sm"
                radius="sm"
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/procurement/products/${product.id}`)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" flex="1">
                    {product.thumbnail && (
                      <Image
                        src={product.thumbnail.fullUrl}
                        alt={product.name}
                        w={50}
                        h={50}
                        radius="md"
                        fit="cover"
                        withPlaceholder
                      />
                    )}
                    <Stack gap={0} flex="1">
                      <Group gap="xs" align="center">
                        <Text fw={500} className="text-sm md:text-base">
                          {product.name}
                        </Text>
                        <Badge
                          size="xs"
                          color={product.status === 'published' ? 'green' : 'gray'}
                          variant="light"
                        >
                          {product.status}
                        </Badge>
                      </Group>
                      <Group gap="xs">
                        {product.category && (
                          <Text className="text-xs md:text-sm" c="dimmed">
                            {product.category.name}
                          </Text>
                        )}
                        {product.suppliers && product.suppliers.length > 0 && (
                          <>
                            <Text className="text-xs md:text-sm" c="dimmed">
                              •
                            </Text>
                            {product.suppliers[0].cost_price && (
                              <Text className="text-xs md:text-sm" c="dimmed">
                                Cost: {product.suppliers[0].cost_price}
                              </Text>
                            )}
                            {product.suppliers[0].supplier_sku && (
                              <Text className="text-xs md:text-sm" c="dimmed">
                                • SKU: {product.suppliers[0].supplier_sku}
                              </Text>
                            )}
                          </>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  <ActionIcon size="sm" variant="light">
                    <IconArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
