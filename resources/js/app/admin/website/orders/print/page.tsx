'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box, Stack, Group, Title, Text, Button, Card, Skeleton, Alert,
  Container, SimpleGrid, Badge, Progress,
} from '@mantine/core'
import { IconPrinter, IconArrowLeft, IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { getWebsiteOrder, formatCurrency, statusColors, statusLabels, paymentStatusColors } from '@/utils/websiteApi'
import type { WebsiteOrderDetail } from '@/utils/websiteApi'

type OrderData = WebsiteOrderDetail & {
  allowedNextStatuses?: string[]
  isEditable?: boolean
  canSendToCourier?: boolean
}

export default function BulkPrintPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [failedOrders, setFailedOrders] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [invoicesHTML, setInvoicesHTML] = useState('')
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })

  // Parse order IDs from URL
  const idsParam = searchParams.get('ids')
  const orderIds = idsParam ? idsParam.split(',').map(Number) : []

  // Batch fetch to avoid overwhelming the server
  const fetchOrdersInBatches = async (ids: number[], batchSize = 5): Promise<{
    successful: OrderData[]
    failed: number[]
  }> => {
    const successful: OrderData[] = []
    const failed: number[] = []

    setLoadingProgress({ loaded: 0, total: ids.length })

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)

      // Process each batch
      const promises = batch.map(async (id) => {
        try {
          const response = await getWebsiteOrder(id)
          // getWebsiteOrder returns: { success: true, data: {...} }
          // We need response.data which is the actual order
          const orderData = response.data
          return { id, success: true, data: orderData }
        } catch (error: any) {
          return { id, success: false, error }
        }
      })

      const results = await Promise.allSettled(promises)

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { id, success, data, error } = result.value
          if (success && data) {
            successful.push(data)
          } else {
            failed.push(id)
          }
        } else {
          // Should not happen since we catch errors inside
          const id = batch[results.indexOf(result)]
          failed.push(id)
        }
      })

      setLoadingProgress({ loaded: i + batchSize, total: ids.length })

      // Add small delay between batches (except last batch)
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    return { successful, failed }
  }

  useEffect(() => {
    if (orderIds.length === 0) {
      setError('No orders selected for printing')
      setLoading(false)
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        setFailedOrders([])

        const { successful, failed } = await fetchOrdersInBatches(orderIds)

        setOrders(successful)
        setFailedOrders(failed)

        if (failed.length > 0) {
          notifications.show({
            title: 'Partial Success',
            message: `Loaded ${successful.length} orders. ${failed.length} failed. Check console for details.`,
            color: 'yellow',
          })
        }

        if (successful.length > 0) {
          // Generate combined invoice HTML
          const combinedHTML = generateCombinedInvoiceHTML(successful)
          setInvoicesHTML(combinedHTML)
        } else {
          setError('Failed to load any orders. Check browser console for error details.')
        }
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error'
        setError(`Failed to load orders: ${errorMessage}`)
        notifications.show({
          title: 'Error',
          message: `Failed to load orders: ${errorMessage}`,
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [orderIds])

  const handlePrint = () => {
    if (!printFrameRef.current) return

    setPrinting(true)
    try {
      const iframe = printFrameRef.current
      if (iframe.contentWindow) {
        iframe.contentWindow.print()
      }
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to open print dialog', color: 'red' })
    } finally {
      setTimeout(() => setPrinting(false), 1000)
    }
  }

  const totalAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const successCount = orders.filter(o => o.paymentStatus === 'paid').length
  const pendingCount = orders.filter(o => o.paymentStatus !== 'paid').length

  return (
    <Box p={{ base: 'md', xl: 'xl' }}>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/website/orders')}>
              Back to Orders
            </Button>
            <div>
              <Title order={2}>Print Invoices ({orderIds.length})</Title>
              <Text c="dimmed" size="sm">Preview and print multiple invoices</Text>
            </div>
          </Group>
          <Group>
            <Button
              size="lg"
              leftSection={<IconPrinter size={20} />}
              onClick={handlePrint}
              loading={printing}
              disabled={loading || orders.length === 0}
            >
              Print All Invoices
            </Button>
          </Group>
        </Group>

        {/* Summary */}
        {(orders.length > 0 || failedOrders.length > 0) && (
          <SimpleGrid cols={{ base: 1, sm: 5 }}>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Requested</Text>
              <Text fw={700} size="lg">{orderIds.length}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Loaded</Text>
              <Text fw={700} size="lg" c={failedOrders.length > 0 ? 'yellow' : 'green'}>{orders.length}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Failed</Text>
              <Text fw={700} size="lg" c={failedOrders.length > 0 ? 'red' : 'gray'}>{failedOrders.length}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Total Amount</Text>
              <Text fw={700} size="lg" c="green">{formatCurrency(totalAmount)}</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Payment Status</Text>
              <Group gap={4}>
                <Text fw={700} size="lg" c="green">{successCount} paid</Text>
                <Text size="xs" c="dimmed">/</Text>
                <Text fw={700} size="lg" c="orange">{pendingCount} unpaid</Text>
              </Group>
            </Card>
          </SimpleGrid>
        )}

        {/* Loading Progress */}
        {loading && (
          <Alert icon={<IconAlertTriangle size={16} />} color="blue" title="Loading Orders">
            <Text>Fetching orders: {loadingProgress.loaded} / {loadingProgress.total}</Text>
            <Progress value={(loadingProgress.loaded / loadingProgress.total) * 100} mt="xs" />
          </Alert>
        )}

        {/* Failed Orders Alert */}
        {failedOrders.length > 0 && !loading && (
          <Alert icon={<IconAlertTriangle size={16} />} color="yellow" title="Some Orders Failed to Load">
            <Text size="sm">Failed to load {failedOrders.length} order(s): {failedOrders.join(', ')}</Text>
            <Text size="xs" c="dimmed" mt="xs">These orders may not exist or there was a server error.</Text>
          </Alert>
        )}

        {/* Error */}
        {error && !loading && (
          <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Stack gap="sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={400} radius="md" />
            ))}
          </Stack>
        )}

        {/* Invoice Previews */}
        {!loading && orders.length > 0 && (
          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="xl">
            {orders.map((order) => (
              <Card key={order.id} withBorder shadow="sm" style={{ overflow: 'hidden' }}>
                <Stack gap="sm" mb="md">
                  <Group justify="space-between">
                    <Text fw={700} size="lg">#{order.invoiceNo}</Text>
                    <Group gap="xs">
                      <Badge color={statusColors[order.status as keyof typeof statusColors]} variant="light">
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                      <Badge color={paymentStatusColors[order.paymentStatus]} variant="outline">
                        {order.paymentStatus}
                      </Badge>
                    </Group>
                  </Group>
                  <Group>
                    <Text size="sm" c="dimmed">{order.customerInfo?.name || 'Guest'}</Text>
                    <Text size="sm" c="dimmed">•</Text>
                    <Text size="sm" fw={600}>{formatCurrency(order.totalAmount)}</Text>
                  </Group>
                </Stack>

                {/* Mini Preview */}
                <Box
                  style={{
                    height: 300,
                    overflow: 'hidden',
                    background: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: 4,
                    position: 'relative',
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateInvoiceHTML(order).replace(
                        /<style>[\s\S]*?<\/style>/,
                        '<style>*{transform:scale(0.4);transform-origin:top left;width:250%;height:250%;}</style>'
                      ),
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </Box>

                <Button
                  variant="light"
                  size="sm"
                  fullWidth
                  mt="sm"
                  onClick={() => window.open(`/website/orders/${order.id}/print`, '_blank')}
                >
                  Open Full Invoice
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Hidden iframe for printing */}
      <iframe
        ref={printFrameRef}
        srcDoc={invoicesHTML}
        style={{ display: 'none' }}
        title="Print Invoices"
      />
    </Box>
  )
}

// Generate professional invoice HTML for printing
function generateInvoiceHTML(order: OrderData): string {
  const orderDate = new Date(order.timestamps?.createdAt || (order as any).createdAt)
  const shipping = order.shipping
  const items = order.items || []

  const totalWeight = items.reduce((sum, item) => sum + ((item.variantWeight || 0) * item.quantity), 0)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${order.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      margin-top: 25mm;
      margin-bottom: 25mm;
      margin-left: 15mm;
      margin-right: 15mm;
      size: A4;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      color: #000;
      line-height: 1.4;
      background: white;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .invoice {
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 15px;
      padding-top: 20px;
      padding-bottom: 20px;
      background: white;
    }
    .header {
      text-align: center;
      margin-top: 10px;
      margin-bottom: 20px;
      padding: 15px 10px;
      padding-bottom: 12px;
      border-bottom: 2px solid #000;
    }
    .header h1 {
      font-size: 24px;
      color: #000;
      margin-bottom: 5px;
      font-weight: 700;
    }
    .header p {
      color: #333;
      font-size: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-box {
      border: 1px solid #ddd;
      padding: 10px;
      background: #fafafa;
    }
    .info-box h3 {
      font-size: 11px;
      color: #555;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .info-box p {
      font-size: 12px;
      margin: 3px 0;
    }
    .info-box strong {
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 12px;
    }
    table th {
      background: #eee;
      border: 1px solid #333;
      color: #000;
      padding: 8px 6px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
    }
    table td {
      padding: 8px 6px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    table tr:last-child td {
      border-bottom: 1px solid #333;
    }
    .totals {
      margin-left: auto;
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-row.grand-total {
      background: #000;
      color: #fff;
      padding: 10px 12px;
      font-weight: 700;
      font-size: 13px;
      margin-top: 5px;
      border: 1px solid #000;
    }
    .footer {
      margin-top: 20px;
      margin-bottom: 15px;
      padding: 15px 10px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>INVOICE</h1>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>Invoice Details</h3>
        <p><strong>Invoice #:</strong> ${order.invoiceNo}</p>
        <p><strong>Date:</strong> ${orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <p><strong>Status:</strong> ${order.statusLabel || order.status}</p>
      </div>
      <div class="info-box">
        <h3>Customer Details</h3>
        <p><strong>${order.customerInfo?.name || 'Guest'}</strong></p>
        <p>${order.customerInfo?.phone || ''}</p>
      </div>
    </div>

    ${shipping?.address ? `
    <div class="info-box" style="margin-bottom: 15px;">
      <h3>Shipping Address</h3>
      <p>${shipping.address}, ${shipping.thana || ''}, ${shipping.district || ''}, ${shipping.division || ''}</p>
    </div>
    ` : ''}

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <strong>${item.productName}</strong><br>
              <span style="font-size: 11px; color: #666;">${item.variantName}</span>
            </td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.totalPrice)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Sub Total</span>
        <span>${formatCurrency(order.subTotal)}</span>
      </div>
      ${order.discountAmount > 0 ? `
      <div class="total-row">
        <span>Discount</span>
        <span style="color: green;">-${formatCurrency(order.discountAmount)}</span>
      </div>
      ` : ''}
      <div class="total-row">
        <span>Delivery Charge</span>
        <span>${formatCurrency(order.deliveryCharge)}</span>
      </div>
      <div class="total-row grand-total">
        <span>Total</span>
        <span>${formatCurrency(order.totalAmount)}</span>
      </div>
      <div class="total-row">
        <span>Paid</span>
        <span style="color: ${order.paymentStatus === 'paid' ? 'green' : 'orange'};">${formatCurrency(order.paidAmount)}</span>
      </div>
      ${order.dueAmount > 0 ? `
      <div class="total-row">
        <span>Due</span>
        <span style="color: red; font-weight: 600;">${formatCurrency(order.dueAmount)}</span>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// Generate combined HTML for printing all invoices
function generateCombinedInvoiceHTML(orderData: OrderData[]): string {
  const invoiceHTMLs = orderData.map(order => generateInvoiceHTML(order))

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print Invoices (${orderData.length})</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .invoice-page {
      page-break-after: always;
      min-height: 297mm;
    }
    .invoice-page:last-child {
      page-break-after: avoid;
    }
  </style>
</head>
<body>
  ${invoiceHTMLs.map(html => `
    <div class="invoice-page">
      ${html.replace(/<!DOCTYPE html><html>[\s\S]*?<body>|<\/body><\/html>/g, '')}
    </div>
  `).join('')}
</body>
</html>
  `.trim()
}
