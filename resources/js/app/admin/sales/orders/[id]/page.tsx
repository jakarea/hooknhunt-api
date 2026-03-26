import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Paper,
  Card,
  SimpleGrid,
  Table,
  Timeline,
  Avatar,
  Anchor,
  Breadcrumbs,
  Alert,
  Divider,
  Progress,
} from '@mantine/core'
import {
  IconChevronRight,
  IconArrowLeft,
  IconPackage,
  IconTruck,
  IconCheck,
  IconClock,
  IconEdit,
  IconPrinter,
  IconRefresh,
  IconX,
  IconMapPin,
  IconPhone,
  IconMail,
  IconCreditCard,
  IconReceipt,
  IconCoin,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'

// Mock order data
const mockOrder = {
  id: 'INV-2024-1234',
  customer_id: 1,
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '+880 1712-345678',
  status: 'shipped',
  payment_status: 'paid',
  payment_method: 'bkash',
  subtotal: 4500.00,
  shipping_fee: 60.00,
  discount: 0.00,
  total: 4560.00,
  created_at: '2024-12-28 10:15',
  updated_at: '2024-12-28 14:30',
  delivery_date: '2024-12-30',
  notes: 'Please call before delivery',

  // Shipping address
  shipping_address: {
    full_name: 'John Doe',
    phone: '+880 1712-345678',
    address: 'House 12, Road 5',
    area: 'Dhanmondi',
    city: 'Dhaka',
    zip: '1209',
  },

  // Order items
  items: [
    {
      id: 1,
      product_id: 101,
      product_name: 'Men\'s Casual Shirt',
      variant: 'Blue, L',
      sku: 'SHIRT-BLUE-L-001',
      quantity: 2,
      price: 1200.00,
      total: 2400.00,
      image: null,
    },
    {
      id: 2,
      product_id: 205,
      product_name: 'Cotton T-Shirt',
      variant: 'White, M',
      sku: 'TSHIRT-WHT-M-002',
      quantity: 1,
      price: 800.00,
      total: 800.00,
      image: null,
    },
    {
      id: 3,
      product_id: 310,
      product_name: 'Denim Jeans',
      variant: 'Black, 32',
      sku: 'JEANS-BLK-32-003',
      quantity: 1,
      price: 1300.00,
      total: 1300.00,
      image: null,
    },
  ],

  // Order timeline
  timeline: [
    {
      id: 1,
      status: 'pending',
      title: 'Order Placed',
      description: 'Order has been placed successfully',
      date: '2024-12-28 10:15',
      icon: <IconReceipt size={16} />,
      color: 'gray',
      completed: true,
    },
    {
      id: 2,
      status: 'confirmed',
      title: 'Order Confirmed',
      description: 'Order has been confirmed and being processed',
      date: '2024-12-28 10:30',
      icon: <IconCheck size={16} />,
      color: 'blue',
      completed: true,
    },
    {
      id: 3,
      status: 'processing',
      title: 'Processing',
      description: 'Items are being packed',
      date: '2024-12-28 11:00',
      icon: <IconPackage size={16} />,
      color: 'cyan',
      completed: true,
    },
    {
      id: 4,
      status: 'shipped',
      title: 'Shipped',
      description: 'Order has been shipped via Pathao Courier',
      date: '2024-12-28 14:30',
      tracking_number: 'PTH-7845302948',
      icon: <IconTruck size={16} />,
      color: 'indigo',
      completed: true,
    },
    {
      id: 5,
      status: 'out_for_delivery',
      title: 'Out for Delivery',
      description: 'Package is out for delivery',
      date: null,
      icon: <IconTruck size={16} />,
      color: 'purple',
      completed: false,
    },
    {
      id: 6,
      status: 'delivered',
      title: 'Delivered',
      description: 'Package has been delivered successfully',
      date: null,
      icon: <IconCheck size={16} />,
      color: 'green',
      completed: false,
    },
  ],

  // Courier info
  courier: {
    name: 'Pathao Courier',
    phone: '+880 1710-000000',
    tracking_url: 'https://pathao.com/track/PTH-7845302948',
  },
}

export default function OrderDetailsPage() {
  const order = mockOrder

  const [loading, setLoading] = useState(false)

  // Format currency
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pending'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Calculate progress
  const completedSteps = useMemo(() => {
    return order.timeline.filter((step) => step.completed).length
  }, [order.timeline])

  const totalSteps = order.timeline.length
  const progress = (completedSteps / totalSteps) * 100

  // Status update handler
  const handleStatusUpdate = () => {
    modals.openConfirmModal({
      title: 'Update Order Status',
      centered: true,
      children: (
        <Stack >
          <Text size="sm">Update order status for {order.id}?</Text>
          {/* In real app, would show status dropdown here */}
        </Stack>
      ),
      labels: { confirm: 'Update', cancel: 'Cancel' },
      onConfirm: async () => {
        try {
          setLoading(true)
          await new Promise(resolve => setTimeout(resolve, 500))
          notifications.show({
            title: 'Status Updated',
            message: `Order ${order.id} status has been updated`,
            color: 'green',
          })
          setLoading(false)
        } catch {
          setLoading(false)
          notifications.show({
            title: 'Error',
            message: 'Failed to update order status',
            color: 'red',
          })
        }
      },
    })
  }

  // Cancel order handler
  const handleCancelOrder = () => {
    modals.openConfirmModal({
      title: 'Cancel Order',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to cancel order <strong>{order.id}</strong>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Cancel Order', cancel: 'Close' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          setLoading(true)
          await new Promise(resolve => setTimeout(resolve, 500))
          notifications.show({
            title: 'Order Cancelled',
            message: `Order ${order.id} has been cancelled`,
            color: 'green',
          })
          setLoading(false)
        } catch {
          setLoading(false)
          notifications.show({
            title: 'Error',
            message: 'Failed to cancel order',
            color: 'red',
          })
        }
      },
    })
  }

  // Print invoice
  const handlePrintInvoice = () => {
    notifications.show({
      title: 'Printing Invoice',
      message: 'Invoice is being generated...',
      color: 'blue',
    })
  }

  // Header section
  const orderHeader = useMemo(() => (
    <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Stack gap="md">
        {/* Top row: Order ID and status */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Group  mb="xs">
              <Title order={2}>{order.id}</Title>
              <Badge
                color={
                  order.status === 'delivered' ? 'green' :
                  order.status === 'shipped' ? 'indigo' :
                  order.status === 'processing' ? 'cyan' :
                  order.status === 'confirmed' ? 'blue' :
                  order.status === 'cancelled' ? 'red' : 'gray'
                }
                variant="light"
                size="lg"
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <Badge
                color={order.payment_status === 'paid' ? 'green' : 'red'}
                variant="light"
                size="lg"
              >
                {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Placed on {formatDate(order.created_at)}
            </Text>
          </Box>

          <Group >
            <Button
              variant="default"
              size="sm"
              component={Link}
              to="/sales/orders"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Orders
            </Button>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrintInvoice}
            >
              Print Invoice
            </Button>
          </Group>
        </Group>

        {/* Order notes */}
        {order.notes && (
          <Alert variant="light" color="blue" icon={<IconEdit size={14} />}>
            <Text size="sm"><strong>Note:</strong> {order.notes}</Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  ), [order])

  // Progress bar
  const orderProgress = useMemo(() => (
    <Card withBorder p="md" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={600}>Order Progress</Text>
        <Text size="xs" c="dimmed">{completedSteps} of {totalSteps} steps completed</Text>
      </Group>
      <Progress
        value={progress}
        color={
          order.status === 'delivered' ? 'green' :
          order.status === 'shipped' ? 'indigo' :
          'blue'
        }
        size="lg"
      />
    </Card>
  ), [order, completedSteps, totalSteps, progress])

  // Timeline section
  const orderTimeline = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">Order Timeline</Title>
      <Timeline bulletSize={32} lineWidth={2}>
        {order.timeline.map((step, index) => (
          <Timeline.Item
            key={step.id}
            bullet={<Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{step.icon}</Box>}
            color={step.completed ? step.color : 'gray'}
            opacity={step.completed ? 1 : 0.5}
          >
            <Stack gap={0}>
              <Group >
                <Text fw={600} size="sm">{step.title}</Text>
                {step.completed && (
                  <Badge size="xs" color={step.color} variant="light">Completed</Badge>
                )}
                {index === completedSteps && (
                  <Badge size="xs" color="blue" variant="filled">Current</Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">{step.description}</Text>
              {step.date && (
                <Group  mt="xs">
                  <IconClock size={12} style={{ color: 'var(--mantine-color-gray-5)' }} />
                  <Text size="xs" c="dimmed">{formatDate(step.date)}</Text>
                </Group>
              )}
              {step.tracking_number && (
                <Group  mt="xs">
                  <Text size="xs" fw={600}>Tracking:</Text>
                  <Anchor
                    href={order.courier.tracking_url}
                    target="_blank"
                    size="xs"
                  >
                    {step.tracking_number}
                  </Anchor>
                </Group>
              )}
            </Stack>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  ), [order, completedSteps])

  // Customer info
  const customerInfo = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">Customer Information</Title>
      <Stack >
        <Group >
          <Avatar
            src={null}
            alt={order.customer_name}
            radius="xl"
            size="lg"
            color="red"
          >
            {order.customer_name.charAt(0)}
          </Avatar>
          <Box>
            <Text fw={600} size="lg">{order.customer_name}</Text>
            <Text size="sm" c="dimmed">Customer ID: #{order.customer_id}</Text>
          </Box>
        </Group>

        <Stack >
          <Group >
            <IconMail size={16} style={{ color: 'var(--mantine-color-red-filled)' }} />
            <Text size="sm">{order.customer_email}</Text>
          </Group>
          <Group >
            <IconPhone size={16} style={{ color: 'var(--mantine-color-red-filled)' }} />
            <Text size="sm">{order.customer_phone}</Text>
          </Group>
        </Stack>

        <Button
          variant="light"
          size="sm"
          component={Link}
          to={`/crm/customers/${order.customer_id}`}
          leftSection={<IconEdit size={14} />}
          fullWidth
        >
          View Customer Profile
        </Button>
      </Stack>
    </Card>
  ), [order])

  // Shipping address
  const shippingAddress = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Group  mb="md">
        <IconMapPin size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
        <Title order={4} className="text-base md:text-lg lg:text-xl">Shipping Address</Title>
      </Group>
      <Stack >
        <Text fw={600} size="sm">{order.shipping_address.full_name}</Text>
        <Text size="sm">{order.shipping_address.phone}</Text>
        <Text size="sm">{order.shipping_address.address}</Text>
        <Text size="sm">{order.shipping_address.area}, {order.shipping_address.city}</Text>
        <Text size="sm">{order.shipping_address.zip}</Text>
      </Stack>

      <Divider my="sm" />

      <Box>
        <Text size="xs" c="dimmed" mb="xs">Courier</Text>
        <Group >
          <Text fw={600} size="sm">{order.courier.name}</Text>
          <Text size="sm" c="dimmed">•</Text>
          <Text size="sm">{order.courier.phone}</Text>
        </Group>
      </Box>
    </Card>
  ), [order])

  // Payment info
  const paymentInfo = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Group  mb="md">
        <IconCreditCard size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
        <Title order={4} className="text-base md:text-lg lg:text-xl">Payment Information</Title>
      </Group>
      <SimpleGrid cols={2} spacing="md">
        <Box>
          <Text size="xs" c="dimmed">Payment Method</Text>
          <Text fw={600} size="sm" style={{ textTransform: 'capitalize' }}>{order.payment_method}</Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">Payment Status</Text>
          <Badge
            color={order.payment_status === 'paid' ? 'green' : 'red'}
            variant="light"
            size="sm"
          >
            {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
          </Badge>
        </Box>
      </SimpleGrid>
    </Card>
  ), [order])

  // Order items table
  const orderItems = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">Order Items ({order.items.length})</Title>

      <Box display={{ base: 'none', md: 'block' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Variant</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {order.items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Group >
                    <Avatar
                      src={item.image}
                      alt={item.product_name}
                      radius="sm"
                      size="sm"
                      color="red"
                    >
                      {item.product_name.charAt(0)}
                    </Avatar>
                    <Anchor
                      component={Link}
                      to={`/catalog/products/${item.product_id}`}
                      size="sm"
                      fw={600}
                    >
                      {item.product_name}
                    </Anchor>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.sku}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.variant}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatCurrency(item.price)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light">{item.quantity}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={600} size="sm">{formatCurrency(item.total)}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Mobile items list */}
      <Stack  display={{ base: 'block', md: 'none' }}>
        {order.items.map((item) => (
          <Paper key={item.id} withBorder p="sm" radius="md">
            <Group justify="space-between" mb="xs">
              <Group >
                <Avatar
                  src={item.image}
                  alt={item.product_name}
                  radius="sm"
                  size="sm"
                  color="red"
                >
                  {item.product_name.charAt(0)}
                </Avatar>
                <Text fw={600} size="sm">{item.product_name}</Text>
              </Group>
              <Badge size="xs" variant="light">x{item.quantity}</Badge>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">{item.variant}</Text>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{formatCurrency(item.price)} each</Text>
              <Text fw={600} size="sm">{formatCurrency(item.total)}</Text>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Card>
  ), [order])

  // Price breakdown
  const priceBreakdown = useMemo(() => (
    <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
      <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">Price Breakdown</Title>
      <Stack >
        <Group justify="space-between">
          <Text size="sm">Subtotal</Text>
          <Text size="sm">{formatCurrency(order.subtotal)}</Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm">Shipping Fee</Text>
          <Text size="sm">{formatCurrency(order.shipping_fee)}</Text>
        </Group>
        {order.discount > 0 && (
          <Group justify="space-between">
            <Text size="sm" c="red">Discount</Text>
            <Text size="sm" c="red">-{formatCurrency(order.discount)}</Text>
          </Group>
        )}
        <Divider />
        <Group justify="space-between">
          <Text fw={700} size="lg">Total</Text>
          <Text fw={700} size="lg" c="red">{formatCurrency(order.total)}</Text>
        </Group>
        <Group  mt="xs">
          <IconCoin size={14} style={{ color: 'var(--mantine-color-red-filled)' }} />
          <Text size="xs" c="dimmed">Paid via {order.payment_method}</Text>
        </Group>
      </Stack>
    </Card>
  ), [order])

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={14} />}>
          <Anchor component={Link} to="/dashboard" c="dimmed">Dashboard</Anchor>
          <Anchor component={Link} to="/sales" c="dimmed">Sales</Anchor>
          <Anchor component={Link} to="/sales/orders" c="dimmed">Orders</Anchor>
          <Text c="red">{order.id}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">Order Details</Title>
          <Text c="dimmed" className="text-sm md:text-base">View and manage order information</Text>
        </Box>

        {/* Order Header */}
        {orderHeader}

        {/* Progress */}
        {orderProgress}

        {/* Timeline */}
        {orderTimeline}

        <Divider label="Order Information" labelPosition="left" />

        {/* Info Grid */}
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
          {customerInfo}
          {shippingAddress}
          {paymentInfo}
        </SimpleGrid>

        <Divider label="Order Items & Pricing" labelPosition="left" />

        {/* Items and Pricing */}
        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          <div style={{ gridColumn: '1 / -1' }}>{orderItems}</div>
          {priceBreakdown}
        </SimpleGrid>

        {/* Actions */}
        <Group justify="flex-end" >
          <Button
            variant="light"
            color="red"
            leftSection={<IconX size={16} />}
            onClick={handleCancelOrder}
            disabled={order.status === 'delivered' || order.status === 'cancelled'}
          >
            Cancel Order
          </Button>
          <Button
            variant="filled"
            leftSection={<IconRefresh size={16} />}
            onClick={handleStatusUpdate}
            loading={loading}
          >
            Update Status
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
