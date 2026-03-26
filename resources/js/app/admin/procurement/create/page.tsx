'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Stack,
  Text,
  Group,
  Button,
  Paper,
  Select,
  TextInput,
  NumberInput,
  Badge,
  Box,
  Table,
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Skeleton,
  Alert,
  Checkbox,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getSuppliers,
  getProcurementProductsBySupplier,
  getCurrencies,
  createPurchaseOrder,
} from '@/utils/api'

interface Product {
  id: number
  name: string
  category?: { name: string }
  suppliers?: Array<{
    cost_price?: number
    supplier_sku?: string
  }>
}

interface OrderItem {
  productId: number
  productName: string
  categoryName: string
  quantity: number
  chinaPrice: number
  lineTotalRmb: number
  lineTotalBdt: number
  selected: boolean
}

export default function CreatePurchaseOrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  // Form state
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [exchangeRate, setExchangeRate] = useState<number>(0)
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(true)

  // Suppliers and products
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // UI states
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!hasPermission('procurement.orders.create')) {
      navigate('/dashboard')
      return
    }

    fetchSuppliers()
    fetchExchangeRate()
  }, [])

  // Fetch exchange rate for CNY
  const fetchExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true)
      const response: any = await getCurrencies({ is_active: true })
      const currencies = response?.data || response || []

      // Find CNY currency
      const cnyCurrency = Array.isArray(currencies)
        ? currencies.find((c: any) => c.code === 'CNY')
        : []

      if (cnyCurrency && cnyCurrency.exchangeRate) {
        setExchangeRate(cnyCurrency.exchangeRate)
      } else {
        notifications.show({
          title: 'Warning',
          message: 'CNY exchange rate not found. Please set it manually.',
          color: 'yellow',
        })
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
    } finally {
      setLoadingExchangeRate(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      const response: any = await getSuppliers({ per_page: 100, is_active: true })
      const suppliersData = response?.data?.data || response?.data || response || []
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load suppliers',
        color: 'red',
      })
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const fetchSupplierProducts = async (sid: number) => {
    try {
      setLoadingProducts(true)
      const response: any = await getProcurementProductsBySupplier(sid, { per_page: 100 })
      const productsData = response?.data?.data || response?.data || []
      setProducts(Array.isArray(productsData) ? productsData : [])

      // Auto-add all products with initial values
      const initialItems: OrderItem[] = Array.isArray(productsData)
        ? productsData.map((p: Product) => ({
            productId: p.id,
            productName: p.name,
            categoryName: p.category?.name || 'N/A',
            quantity: 0,
            chinaPrice: p.suppliers?.[0]?.cost_price || 0,
            lineTotalRmb: 0,
            lineTotalBdt: 0,
            selected: false,
          }))
        : []

      setOrderItems(initialItems)
    } catch (error) {
      console.error('Failed to load products:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load products',
        color: 'red',
      })
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleSupplierChange = (value: string | null) => {
    const sid = value ? Number(value) : null
    setSupplierId(sid)

    if (sid) {
      fetchSupplierProducts(sid)
    } else {
      setProducts([])
      setOrderItems([])
    }
  }

  const updateItemQuantity = (index: number, value: number | string) => {
    const qty = typeof value === 'string' ? parseFloat(value) || 0 : value
    const newItems = [...orderItems]
    newItems[index].quantity = qty
    newItems[index].lineTotalRmb = qty * newItems[index].chinaPrice
    newItems[index].lineTotalBdt = newItems[index].lineTotalRmb * exchangeRate
    setOrderItems(newItems)
  }

  const updateItemPrice = (index: number, value: number | string) => {
    const price = typeof value === 'string' ? parseFloat(value) || 0 : value
    const newItems = [...orderItems]
    newItems[index].chinaPrice = price
    newItems[index].lineTotalRmb = newItems[index].quantity * price
    newItems[index].lineTotalBdt = newItems[index].lineTotalRmb * exchangeRate
    setOrderItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index)
    setOrderItems(newItems)
  }

  const toggleItemSelection = (index: number) => {
    const newItems = [...orderItems]
    newItems[index].selected = !newItems[index].selected
    setOrderItems(newItems)
  }

  const toggleSelectAll = () => {
    const allSelected = orderItems.every(item => item.selected)
    const newItems = orderItems.map(item => ({ ...item, selected: !allSelected }))
    setOrderItems(newItems)
  }

  const calculateTotals = () => {
    const totalRmb = orderItems.reduce((sum, item) => item.selected ? sum + item.lineTotalRmb : sum, 0)
    const totalBdt = totalRmb * exchangeRate
    return { totalRmb, totalBdt }
  }

  const handleSubmit = async () => {
    if (!supplierId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a supplier',
        color: 'red',
      })
      return
    }

    const validItems = orderItems.filter(item => item.selected && item.quantity > 0 && item.chinaPrice > 0)

    if (validItems.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please add at least one product with quantity and price',
        color: 'red',
      })
      return
    }

    try {
      setSubmitting(true)
      await createPurchaseOrder({
        supplierId,
        orderDate,
        exchangeRate,
        items: validItems,
      })

      notifications.show({
        title: 'Success',
        message: 'Purchase order created successfully',
        color: 'green',
      })

      navigate('/procurement/orders')
    } catch (error: any) {
      console.error('Failed to create PO:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to create purchase order',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const { totalRmb, totalBdt } = calculateTotals()

  const items = [
    { title: t('nav.dashboard'), href: '/dashboard' },
    { title: t('procurement.orders'), href: '/procurement/orders' },
    { title: 'Create PO' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index}>
      {item.title}
    </Anchor>
  ))

  if (loadingSuppliers) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Stack gap="md">
          <Skeleton height={40} width="30%" />
          <Skeleton height={400} />
        </Stack>
      </Box>
    )
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack gap="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={16} />}>{items}</Breadcrumbs>

        {/* Header */}
        <Group justify="space-between">
          <Stack gap={0}>
            <Text size="xl" fw={600} className="text-lg md:text-xl lg:text-2xl">
              {t('procurement.createPO') || 'Create Purchase Order'}
            </Text>
            <Text size="sm" c="dimmed">
              Create a new purchase order from Chinese suppliers
            </Text>
          </Stack>

          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/procurement/orders')}
            >
              {t('common.back') || 'Back'}
            </Button>
            <Button
              loading={submitting}
              disabled={!supplierId || orderItems.length === 0}
              leftSection={<IconPlus size={16} />}
              onClick={handleSubmit}
            >
              {t('common.create') || 'Create'} PO
            </Button>
          </Group>
        </Group>

        {/* Basic Information */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Text fw={600} size="lg">Order Information</Text>

            <Group grow>
              <Select
                label="Supplier"
                placeholder="Select supplier"
                data={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                value={supplierId ? String(supplierId) : null}
                onChange={handleSupplierChange}
                searchable
                required
              />

              <TextInput
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </Group>

            
          </Stack>
        </Paper>

        {/* Products Table */}
        {supplierId && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">
                  Products ({orderItems.length})
                </Text>
                {loadingProducts && <Skeleton height={20} width={100} />}
              </Group>

              {orderItems.length === 0 ? (
                <Alert color="blue">No products found for this supplier</Alert>
              ) : (
                <>
                  {/* Table - Desktop */}
                  <Box className="hidden md:block">
                    <Group mb="sm">
                      <Checkbox
                        label="Select All"
                        checked={orderItems.length > 0 && orderItems.every(item => item.selected)}
                        onChange={toggleSelectAll}
                        color="cyan"
                        size="md"
                        styles={{
                          input: {
                            borderColor: '#00bcd4',
                            '&:hover': {
                              borderColor: '#00bcd4',
                            },
                          },
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {orderItems.filter(item => item.selected).length} of {orderItems.length} selected
                      </Text>
                    </Group>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ width: 50 }}></Table.Th>
                          <Table.Th>Product</Table.Th>
                          <Table.Th style={{ width: 120 }}>Quantity</Table.Th>
                          <Table.Th style={{ width: 150 }}>
                            Unit Price (RMB)
                          </Table.Th>
                          <Table.Th style={{ width: 150 }} ta="right">
                            Line Total (RMB)
                          </Table.Th>
                          <Table.Th style={{ width: 10 }}></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {orderItems.map((item, index) => (
                          <Table.Tr
                            key={item.productId}
                            style={{ opacity: item.selected ? 1 : 0.5 }}
                          >
                            <Table.Td>
                              <Checkbox
                                checked={item.selected}
                                onChange={() => toggleItemSelection(index)}
                                color="cyan"
                                size="md"
                                styles={{
                                  input: {
                                    borderColor: '#00bcd4',
                                    '&:hover': {
                                      borderColor: '#00bcd4',
                                    },
                                  },
                                }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={0}>
                                <Text size="sm" fw={500}>
                                  {item.productName}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {item.categoryName}
                                </Text>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                size="xs"
                                value={item.quantity}
                                onChange={(v) => updateItemQuantity(index, v)}
                                min={0}
                                hideControls
                              />
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                size="xs"
                                value={item.chinaPrice}
                                onChange={(v) => updateItemPrice(index, v)}
                                min={0}
                                precision={2}
                                hideControls
                              />
                            </Table.Td>
                            <Table.Td ta="right">
                              <Stack gap={0}>
                                <Text size="sm" fw={600}>
                                  ¥{item.lineTotalRmb.toFixed(2)}
                                </Text>
                                {item.lineTotalRmb > 0 && (
                                  <Text size="xs" c="dimmed">
                                    ৳{item.lineTotalBdt.toFixed(2)}
                                  </Text>
                                )}
                              </Stack>
                            </Table.Td>
                            <Table.Td p={8}>
                              <ActionIcon
                                color="red"
                                variant="light"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Box>

                  {/* Cards - Mobile */}
                  <Box className="block md:hidden">
                    <Group mb="sm">
                      <Checkbox
                        label="Select All"
                        checked={orderItems.length > 0 && orderItems.every(item => item.selected)}
                        onChange={toggleSelectAll}
                        color="cyan"
                        size="md"
                        styles={{
                          input: {
                            borderColor: '#00bcd4',
                            '&:hover': {
                              borderColor: '#00bcd4',
                            },
                          },
                        }}
                      />
                      <Text size="sm" c="dimmed">
                        {orderItems.filter(item => item.selected).length} of {orderItems.length} selected
                      </Text>
                    </Group>
                    <Stack gap="sm">
                      {orderItems.map((item, index) => (
                        <Paper
                          withBorder
                          p="sm"
                          radius="sm"
                          key={item.productId}
                          style={{ opacity: item.selected ? 1 : 0.6 }}
                        >
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Checkbox
                                checked={item.selected}
                                onChange={() => toggleItemSelection(index)}
                                label={item.productName}
                                color="cyan"
                                size="md"
                                styles={{
                                  input: {
                                    borderColor: '#00bcd4',
                                    '&:hover': {
                                      borderColor: '#00bcd4',
                                    },
                                  },
                                }}
                              />
                              <ActionIcon
                                color="red"
                                variant="light"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>

                            {item.selected && (
                              <>
                                <Text size="xs" c="dimmed">{item.categoryName}</Text>
                                <Group grow>
                                  <NumberInput
                                    label="Quantity"
                                    size="xs"
                                    value={item.quantity}
                                    onChange={(v) => updateItemQuantity(index, v)}
                                    min={0}
                                  />
                                  <NumberInput
                                    label="Unit Price (RMB)"
                                    size="xs"
                                    value={item.chinaPrice}
                                    onChange={(v) => updateItemPrice(index, v)}
                                    min={0}
                                    precision={2}
                                  />
                                </Group>

                                {item.lineTotalRmb > 0 && (
                                  <Stack gap={0}>
                                    <Text size="sm" fw={600} ta="right">
                                      Total: ¥{item.lineTotalRmb.toFixed(2)}
                                    </Text>
                                    <Text size="xs" c="dimmed" ta="right">
                                      ৳{item.lineTotalBdt.toFixed(2)}
                                    </Text>
                                  </Stack>
                                )}
                              </>
                            )}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>

                  {/* Totals */}
                  <Paper withBorder p="md" radius="sm" bg="gray.0">
                    <Group justify="space-between" align="flex-end">
                      <Text size="lg" fw={600}>
                        Grand Total
                      </Text>
                      <Stack gap={0} align="end">
                        <Text size="xl" fw={700} className="text-xl md:text-2xl">
                          ¥{totalRmb.toFixed(2)}
                        </Text>
                        <Text size="sm" c="dimmed">
                          ৳{totalBdt.toFixed(2)} BDT
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}
