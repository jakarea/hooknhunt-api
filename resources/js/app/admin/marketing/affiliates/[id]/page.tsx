import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Paper,
  Tabs,
  Grid,
  LoadingOverlay,
  Alert,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconRefresh,
  IconCoin,
  IconUsers,
  IconChartBar,
  IconReceipt,
  IconClick,
  IconShoppingCart,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'

interface AffiliateDetail {
  id: number
  userId: number
  name: string
  email: string
  phone: string
  referralCode: string
  referralLink: string
  commissionRate: number
  totalEarned: number
  withdrawnAmount: number
  availableBalance: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  isApproved: boolean
  joinedAt: string
  lastConversionAt: string | null
  productCommissions: Array<{
    id: number
    productId: number
    productName: string
    commissionRate: number
    isActive: boolean
  }>
  categoryCommissions: Array<{
    id: number
    categoryId: number
    categoryName: string
    commissionRate: number
    isActive: boolean
  }>
}

interface Earning {
  id: number
  orderId: number
  orderInvoice: string
  orderAmount: number
  commissionAmount: number
  status: string
  createdAt: string
}

interface Payout {
  id: number
  amount: number
  paymentMethod: string
  paymentDetails: string
  status: string
  adminNotes: string
  rejectionReason: string
  approvedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface Referral {
  id: number
  referralCode: string
  ipAddress: string
  landingPage: string
  clickedAt: string
  convertedAt: string | null
  orderId: number | null
  orderInvoice: string
  orderAmount: number | null
  commissionAmount: number | null
  status: string
}

export default function AffiliateDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  const [error, setError] = useState<string | null>(null)

  const fetchAffiliate = async (showLoading = true) => {
    if (!id) {
      setError('No ID provided')
      return
    }

    try {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      setError(null)
      const response = await api.get<{ success: boolean; data: AffiliateDetail }>(`/admin/affiliates/${id}`)
      setAffiliate(response.data.data)
    } catch (error: any) {
      setError(error?.message || 'Failed to load affiliate details')
      notifications.show({
        title: 'Error',
        message: 'Failed to load affiliate details. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAffiliate()
  }, [id])

  if (loading) {
    return (
      <Stack p="xl">
        <LoadingOverlay visible={true} />
      </Stack>
    )
  }

  if (error || !affiliate) {
    return (
      <Stack p="xl" gap="md">
        <Text c="red" size="lg">Failed to load affiliate data</Text>
        {error && <Text c="red">{error}</Text>}
        <Button onClick={() => fetchAffiliate()}>Retry</Button>
      </Stack>
    )
  }

  const renderStatCard = (label: string, value: string | number, icon: React.ReactNode) => (
    <Paper withBorder p="md" radius="md">
      <Group>
        <div style={{ backgroundColor: 'var(--mantine-color-blue-0)', padding: '8px', borderRadius: '8px' }}>
          <div style={{ color: 'var(--mantine-color-blue-filled)' }}>{icon}</div>
        </div>
        <div>
          <Text size="xs" c="dimmed">{label}</Text>
          <Text size="lg" fw={600}>{value}</Text>
        </div>
      </Group>
    </Paper>
  )

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Group>
          <ActionIcon
            component={Link}
            to="/marketing/affiliates"
            variant="light"
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div>
            <Title order={2}>{affiliate.name}</Title>
            <Text c="dimmed">{affiliate.email} • {affiliate.phone}</Text>
          </div>
        </Group>
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={() => fetchAffiliate(false)}
          loading={refreshing}
        >
          Refresh
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 6, md: 3 }}>
          {renderStatCard('Total Earned', `৳${affiliate.totalEarned.toFixed(2)}`, <IconCoin size={20} />)}
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 3 }}>
          {renderStatCard('Available Balance', `৳${affiliate.availableBalance.toFixed(2)}`, <IconCoin size={20} />)}
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 3 }}>
          {renderStatCard('Total Clicks', affiliate.totalClicks, <IconClick size={20} />)}
        </Grid.Col>
        <Grid.Col span={{ base: 6, md: 3 }}>
          {renderStatCard('Conversions', affiliate.totalConversions, <IconShoppingCart size={20} />)}
        </Grid.Col>
      </Grid>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">Referral Information</Title>
        <Stack gap="xs">
          <Group>
            <Text size="sm" c="dimmed" w={150}>Referral Code:</Text>
            <Text fw={500}>{affiliate.referralCode}</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={150}>Referral Link:</Text>
            <Text size="sm" fw={500} style={{ wordBreak: 'break-all' }}>{affiliate.referralLink}</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={150}>Commission Rate:</Text>
            <Badge color="blue" variant="light">{affiliate.commissionRate}%</Badge>
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={150}>Status:</Text>
            {affiliate.isApproved ? (
              <Badge color="green" variant="light">Approved</Badge>
            ) : (
              <Badge color="yellow" variant="light">Pending</Badge>
            )}
          </Group>
          <Group>
            <Text size="sm" c="dimmed" w={150}>Joined:</Text>
            <Text size="sm">{new Date(affiliate.joinedAt).toLocaleDateString()}</Text>
          </Group>
          {affiliate.lastConversionAt && (
            <Group>
              <Text size="sm" c="dimmed" w={150}>Last Conversion:</Text>
              <Text size="sm">{new Date(affiliate.lastConversionAt).toLocaleDateString()}</Text>
            </Group>
          )}
        </Stack>
      </Paper>

      <Paper withBorder>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>Overview</Tabs.Tab>
            <Tabs.Tab value="earnings" leftSection={<IconCoin size={16} />}>Earnings</Tabs.Tab>
            <Tabs.Tab value="payouts" leftSection={<IconReceipt size={16} />}>Payouts</Tabs.Tab>
            <Tabs.Tab value="referrals" leftSection={<IconUsers size={16} />}>Referrals</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" p="md">
            <Stack>
              {affiliate.productCommissions && affiliate.productCommissions.length > 0 && (
                <div>
                  <Title order={4} mb="sm">Product Commissions</Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Product</Table.Th>
                        <Table.Th>Rate</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {affiliate.productCommissions.map((commission) => (
                        <Table.Tr key={commission.id}>
                          <Table.Td>{commission.productName}</Table.Td>
                          <Table.Td>{commission.commissionRate}%</Table.Td>
                          <Table.Td>
                            {commission.isActive ? (
                              <Badge color="green" variant="light">Active</Badge>
                            ) : (
                              <Badge color="gray" variant="light">Inactive</Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              )}

              {affiliate.categoryCommissions && affiliate.categoryCommissions.length > 0 && (
                <div>
                  <Title order={4} mb="sm">Category Commissions</Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Category</Table.Th>
                        <Table.Th>Rate</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {affiliate.categoryCommissions.map((commission) => (
                        <Table.Tr key={commission.id}>
                          <Table.Td>{commission.categoryName}</Table.Td>
                          <Table.Td>{commission.commissionRate}%</Table.Td>
                          <Table.Td>
                            {commission.isActive ? (
                              <Badge color="green" variant="light">Active</Badge>
                            ) : (
                              <Badge color="gray" variant="light">Inactive</Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              )}

              {(!affiliate.productCommissions || affiliate.productCommissions.length === 0) &&
               (!affiliate.categoryCommissions || affiliate.categoryCommissions.length === 0) && (
                <Alert color="blue">
                  This affiliate uses the default commission rate of {affiliate.commissionRate}%. No product or category specific commissions are set.
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="earnings" p="md">
            <EarningsTab affiliateId={affiliate.id} />
          </Tabs.Panel>

          <Tabs.Panel value="payouts" p="md">
            <PayoutsTab affiliateId={affiliate.id} />
          </Tabs.Panel>

          <Tabs.Panel value="referrals" p="md">
            <ReferralsTab affiliateId={affiliate.id} />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  )
}

function EarningsTab({ affiliateId }: { affiliateId: number }) {
  const [loading, setLoading] = useState(true)
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter

      const response = await api.get<{ data: { earnings: Earning[] } }>(`/admin/affiliates/${affiliateId}/earnings`, { params })
      setEarnings(response.data.data.earnings || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [statusFilter])

  return (
    <Stack>
      <Group>
        <Text size="sm">Filter by status:</Text>
        <Button
          size="xs"
          variant={statusFilter === 'all' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          size="xs"
          variant={statusFilter === 'pending' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
        </Button>
        <Button
          size="xs"
          variant={statusFilter === 'approved' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
        </Button>
      </Group>

      <LoadingOverlay visible={loading} />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Order</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Commission</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Date</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {earnings.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5} ta="center">
                <Text c="dimmed" py="xl">No earnings found</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            earnings.map((earning) => (
              <Table.Tr key={earning.id}>
                <Table.Td>{earning.orderInvoice}</Table.Td>
                <Table.Td>৳{earning.orderAmount.toFixed(2)}</Table.Td>
                <Table.Td fw={500}>৳{earning.commissionAmount.toFixed(2)}</Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      earning.status === 'paid' ? 'green' :
                      earning.status === 'approved' ? 'blue' :
                      'yellow'
                    }
                    variant="light"
                  >
                    {earning.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{new Date(earning.createdAt).toLocaleDateString()}</Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

function PayoutsTab({ affiliateId }: { affiliateId: number }) {
  const [loading, setLoading] = useState(true)
  const [payouts, setPayouts] = useState<Payout[]>([])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      const response = await api.get<{ data: { payouts: Payout[] } }>(`/admin/affiliates/${affiliateId}/payouts`)
      setPayouts(response.data.data.payouts || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayouts()
  }, [])

  return (
    <Stack>
      <LoadingOverlay visible={loading} />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Method</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Notes</Table.Th>
            <Table.Th>Date</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {payouts.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5} ta="center">
                <Text c="dimmed" py="xl">No payout requests</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            payouts.map((payout) => (
              <Table.Tr key={payout.id}>
                <Table.Td fw={500}>৳{payout.amount.toFixed(2)}</Table.Td>
                <Table.Td>{payout.paymentMethod.replace('_', ' ')}</Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      payout.status === 'completed' ? 'green' :
                      payout.status === 'approved' ? 'blue' :
                      payout.status === 'processing' ? 'grape' :
                      payout.status === 'rejected' ? 'red' :
                      'yellow'
                    }
                    variant="light"
                  >
                    {payout.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {payout.rejectionReason && (
                    <Text size="xs" c="red">{payout.rejectionReason}</Text>
                  )}
                  {payout.adminNotes && (
                    <Text size="xs" c="dimmed">{payout.adminNotes}</Text>
                  )}
                </Table.Td>
                <Table.Td>{new Date(payout.createdAt).toLocaleDateString()}</Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}

function ReferralsTab({ affiliateId }: { affiliateId: number }) {
  const [loading, setLoading] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [statusFilter, setStatusFilter] = useState<string | null>('all')

  const fetchReferrals = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter

      const response = await api.get<{ data: { referrals: Referral[] } }>(`/admin/affiliates/${affiliateId}/referrals`, { params })
      setReferrals(response.data.data.referrals || [])
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferrals()
  }, [statusFilter])

  return (
    <Stack>
      <Group>
        <Text size="sm">Filter by status:</Text>
        <Button
          size="xs"
          variant={statusFilter === 'all' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          size="xs"
          variant={statusFilter === 'clicked' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('clicked')}
        >
          Clicked
        </Button>
        <Button
          size="xs"
          variant={statusFilter === 'converted' ? 'filled' : 'light'}
          onClick={() => setStatusFilter('converted')}
        >
          Converted
        </Button>
      </Group>

      <LoadingOverlay visible={loading} />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>IP Address</Table.Th>
            <Table.Th>Landing Page</Table.Th>
            <Table.Th>Clicked At</Table.Th>
            <Table.Th>Order</Table.Th>
            <Table.Th>Commission</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {referrals.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6} ta="center">
                <Text c="dimmed" py="xl">No referrals found</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            referrals.map((referral) => (
              <Table.Tr key={referral.id}>
                <Table.Td>{referral.ipAddress}</Table.Td>
                <Table.Td size="sm" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {referral.landingPage}
                </Table.Td>
                <Table.Td>{new Date(referral.clickedAt).toLocaleString()}</Table.Td>
                <Table.Td>
                  {referral.orderInvoice ? (
                    <Text size="sm">{referral.orderInvoice}</Text>
                  ) : (
                    <Text size="sm" c="dimmed">-</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {referral.commissionAmount ? (
                    <Text fw={500}>৳{referral.commissionAmount.toFixed(2)}</Text>
                  ) : (
                    <Text c="dimmed">-</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={referral.status === 'converted' ? 'green' : 'gray'}
                    variant="light"
                  >
                    {referral.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
