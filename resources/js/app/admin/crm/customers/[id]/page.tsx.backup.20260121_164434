import { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Box,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Badge,
  Paper,
  SimpleGrid,
  Card,
  Avatar,
  Anchor,
  Breadcrumbs,
  Tabs,
  Timeline,
  LoadingOverlay,
  Alert,
} from '@mantine/core'
import {
  IconChevronRight,
  IconEdit,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconShoppingBag,
  IconWallet,
  IconCoin,
  IconArrowLeft,
  IconPackage,
  IconClock,
  IconCheck,
  IconTrendingUp,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'

// Types based on backend API response
interface User {
  id: number
  name: string
  email: string | null
  phone: string
  roleId?: number | null
  isActive: boolean
  phoneVerifiedAt?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  role?: {
    id: number
    name: string
    slug: string
    description?: string | null
  }
  profile?: {
    id: number
    userId: number
    departmentId?: number | null
    designation?: string | null
    joiningDate?: string | null
    baseSalary?: number | null
    address?: string | null
    city?: string | null
    dob?: string | null
    gender?: string | null
  }
  customerProfile?: {
    id: number
    userId: number
    type?: string
    source?: string
    preferredLanguage?: string
    preferred_language?: string
    marketingConsent?: boolean
    marketing_consent?: boolean
    loyaltyTier?: string
    loyalty_tier?: string
    loyaltyPoints?: number
    loyalty_points?: number
    totalOrders?: number
    total_orders?: number
    totalSpent?: number
    total_spent?: number
    notes?: string
    dob?: string | null
    gender?: string | null
    address?: string | null
    division?: string | null
    district?: string | null
    thana?: string | null
    trade_license_no?: string | null
    tax_id?: string | null
  }
}

interface ApiResponse {
  status: boolean
  message: string
  data: User | { user: User; role_permissions?: any; granted_permissions?: any; blocked_permissions?: any }
}

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wallet' | 'activity'>('overview')

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return

      setLoading(true)
      try {
        const response = await api.get<ApiResponse>(`/user-management/users/${id}`)

        // Backend returns { data: { user: {...}, ... } }
        const data = response.data?.data
        const userData = data && typeof data === 'object' && 'user' in data ? (data as { user: User }).user : data as User

        if (response.data?.status && userData) {
          setCustomer(userData)
        } else {
          throw new Error('Failed to fetch customer')
        }
      } catch (error) {
        console.error('Error fetching customer:', error)
        notifications.show({
          title: 'Error',
          message: 'Failed to load customer details. Please try again.',
          color: 'red',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [id])

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '৳0.00'
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Determine customer type based on role
  const customerType = useMemo(() => {
    if (!customer?.role) return 'Unknown'
    if (customer.role.slug === 'wholesale_customer') return 'Wholesale'
    if (customer.role.slug === 'retail_customer') return 'Retail'
    return customer.role.name
  }, [customer])

  // Loading state - return early
  if (loading) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Paper withBorder p="xl" radius="lg">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
          <Box h={300} />
        </Paper>
      </Box>
    )
  }

  // Error state - return early
  if (!customer) {
    return (
      <Box p={{ base: 'md', md: 'xl' }}>
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Customer Not Found">
          The requested customer could not be found.{' '}
          <Anchor component={Link} to="/crm/customers">
            Return to customers list
          </Anchor>
        </Alert>
      </Box>
    )
  }

  // Now we know customer exists, safely destructure
  const { name, email, phone, isActive, phoneVerifiedAt, lastLoginAt, createdAt, profile } = customer

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<IconChevronRight size={14} />}>
          <Anchor component={Link} to="/dashboard" c="dimmed">
            Dashboard
          </Anchor>
          <Anchor component={Link} to="/crm" c="dimmed">
            CRM
          </Anchor>
          <Anchor component={Link} to="/crm/customers" c="dimmed">
            Customers
          </Anchor>
          <Text c="red">{name}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">
            Customer Profile
          </Title>
          <Text c="dimmed" className="text-sm md:text-base">
            View and manage customer information
          </Text>
        </Box>

        {/* Profile Header */}
        <Paper withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group wrap="wrap">
              <Avatar
                src={null}
                alt={name}
                radius="xl"
                size="xl"
                color="red"
              >
                {name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Group mb="xs">
                  <Title order={2}>{name}</Title>
                  <Badge
                    color={isActive ? 'green' : 'gray'}
                    variant="light"
                    size="lg"
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge color={customerType === 'Wholesale' ? 'blue' : 'gray'} variant="light">
                    {customerType}
                  </Badge>
                </Group>
                <Group mb="sm">
                  {email && (
                    <Group>
                      <IconMail size={16} />
                      <Text size="sm">{email}</Text>
                    </Group>
                  )}
                  <Group>
                    <IconPhone size={16} />
                    <Text size="sm">{phone}</Text>
                  </Group>
                </Group>
                <Group>
                  <Text size="sm" c="dimmed">
                    Member since {formatDate(createdAt)}
                  </Text>
                  {phoneVerifiedAt && (
                    <Badge size="xs" color="green" variant="light">
                      <IconCheck size={10} style={{ marginRight: 4 }} />
                      Verified
                    </Badge>
                  )}
                </Group>
              </Box>
            </Group>
            <Group>
              <Button
                variant="default"
                size="sm"
                component={Link}
                to="/crm/customers"
                leftSection={<IconArrowLeft size={16} />}
              >
                Back
              </Button>
              <Button
                component={Link}
                to={`/crm/customers/${customer.id}/edit`}
                leftSection={<IconEdit size={16} />}
              >
                Edit Customer
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 2, md: 3, lg: 6 }} spacing="md">
          <Card withBorder p="md" radius="md" style={{ opacity: 0.5 }}>
            <Group mb="xs">
              <IconWallet size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
              <Text size="xs" c="dimmed">Wallet Balance</Text>
            </Group>
            <Text size="xl" fw={700}>৳0.00</Text>
            <Text size="xs" c="dimmed" mt={2}>Coming Soon</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconShoppingBag size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text size="xs" c="dimmed">Total Orders</Text>
            </Group>
            <Text size="xl" fw={700}>{customer.customerProfile?.total_orders || customer.customerProfile?.totalOrders || 0}</Text>
            <Text size="xs" c="dimmed" mt={2}>All time</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconCoin size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
              <Text size="xs" c="dimmed">Total Spent</Text>
            </Group>
            <Text size="md" fw={700}>{formatCurrency(customer.customerProfile?.total_spent || customer.customerProfile?.totalSpent || 0)}</Text>
            <Text size="xs" c="dimmed" mt={2}>All time</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group mb="xs">
              <IconPackage size={20} style={{ color: 'var(--mantine-color-orange-filled)' }} />
              <Text size="xs" c="dimmed">Loyalty Points</Text>
            </Group>
            <Text size="xl" fw={700}>{customer.customerProfile?.loyalty_points || customer.customerProfile?.loyaltyPoints || 0}</Text>
            <Badge size="xs" color="grape" variant="light" mt={2}>
              {customer.customerProfile?.loyalty_tier || customer.customerProfile?.loyaltyTier || 'Bronze'}
            </Badge>
          </Card>

          <Card withBorder p="md" radius="md" style={{ opacity: 0.5 }}>
            <Group mb="xs">
              <IconTrendingUp size={20} style={{ color: 'var(--mantine-color-cyan-filled)' }} />
              <Text size="xs" c="dimmed">Avg Order Value</Text>
            </Group>
            <Text size="xl" fw={700}>৳0.00</Text>
            <Text size="xs" c="dimmed" mt={2}>Coming Soon</Text>
          </Card>

          <Card withBorder p="md" radius="md" style={{ opacity: 0.5 }}>
            <Group mb="xs">
              <IconCalendar size={20} style={{ color: 'var(--mantine-color-violet-filled)' }} />
              <Text size="xs" c="dimmed">Last Order</Text>
            </Group>
            <Text size="sm" fw={700} lineClamp={1}>
              Never
            </Text>
            <Text size="xs" c="dimmed" mt={2}>Coming Soon</Text>
          </Card>
        </SimpleGrid>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(value) =>
            setActiveTab(value as 'overview' | 'orders' | 'wallet' | 'activity')
          }
        >
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconPackage size={14} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="wallet" leftSection={<IconWallet size={14} />}>
              Wallet
            </Tabs.Tab>
            <Tabs.Tab value="activity" leftSection={<IconClock size={14} />}>
              Activity
            </Tabs.Tab>
          </Tabs.List>

          {/* Overview Tab */}
          <Tabs.Panel value="overview">
            <Stack mt="md">
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                {/* Personal Information */}
                <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">
                    Personal Information
                  </Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Group>
                      <IconMail size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Email</Text>
                        <Text fw={500} size="sm">
                          {email || 'Not provided'}
                        </Text>
                      </Box>
                    </Group>
                    <Group>
                      <IconPhone size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Phone</Text>
                        <Text fw={500} size="sm">{phone}</Text>
                      </Box>
                    </Group>
                    <Group>
                      <IconCalendar size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Member Since</Text>
                        <Text fw={500} size="sm">{formatDate(createdAt)}</Text>
                      </Box>
                    </Group>
                    <Group>
                      <IconCheck size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Account Status</Text>
                        <Badge
                          color={isActive ? 'green' : 'gray'}
                          variant="light"
                          size="sm"
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Box>
                    </Group>
                    <Group>
                      <IconCalendar size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Last Login</Text>
                        <Text fw={500} size="sm">{formatDateTime(lastLoginAt)}</Text>
                      </Box>
                    </Group>
                    <Group>
                      <IconCalendar size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      <Box>
                        <Text size="xs" c="dimmed">Phone Verified</Text>
                        <Text fw={500} size="sm">{formatDate(phoneVerifiedAt)}</Text>
                      </Box>
                    </Group>
                  </SimpleGrid>

                  {/* Customer Profile fields */}
                  {customer.customerProfile && (
                    <>
                      <Title order={5} mt="md" mb="sm">
                        Customer Details
                      </Title>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {(customer.customerProfile.dob || customer.customerProfile.gender) && (
                          <>
                            {customer.customerProfile.dob && (
                              <Group>
                                <IconCalendar size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Date of Birth</Text>
                                  <Text fw={500} size="sm">{formatDate(customer.customerProfile.dob)}</Text>
                                </Box>
                              </Group>
                            )}
                            {customer.customerProfile.gender && (
                              <Group>
                                <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Gender</Text>
                                  <Text fw={500} size="sm" style={{ textTransform: 'capitalize' }}>
                                    {customer.customerProfile.gender}
                                  </Text>
                                </Box>
                              </Group>
                            )}
                          </>
                        )}

                        {customer.customerProfile.address && (
                          <Group style={{ gridColumn: '1 / -1' }}>
                            <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Address</Text>
                              <Text fw={500} size="sm">{customer.customerProfile.address}</Text>
                            </Box>
                          </Group>
                        )}

                        {(customer.customerProfile.division || customer.customerProfile.district || customer.customerProfile.thana) && (
                          <>
                            {customer.customerProfile.division && (
                              <Group>
                                <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Division</Text>
                                  <Text fw={500} size="sm">{customer.customerProfile.division}</Text>
                                </Box>
                              </Group>
                            )}
                            {customer.customerProfile.district && (
                              <Group>
                                <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">District</Text>
                                  <Text fw={500} size="sm">{customer.customerProfile.district}</Text>
                                </Box>
                              </Group>
                            )}
                            {customer.customerProfile.thana && (
                              <Group>
                                <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Thana</Text>
                                  <Text fw={500} size="sm">{customer.customerProfile.thana}</Text>
                                </Box>
                              </Group>
                            )}
                          </>
                        )}

                        {(customer.customerProfile.trade_license_no || customer.customerProfile.tax_id) && (
                          <>
                            {customer.customerProfile.trade_license_no && (
                              <Group>
                                <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Trade License No.</Text>
                                  <Text fw={500} size="sm">{customer.customerProfile.trade_license_no}</Text>
                                </Box>
                              </Group>
                            )}
                            {customer.customerProfile.tax_id && (
                              <Group>
                                <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-blue-filled)' }} />
                                <Box>
                                  <Text size="xs" c="dimmed">Tax ID</Text>
                                  <Text fw={500} size="sm">{customer.customerProfile.tax_id}</Text>
                                </Box>
                              </Group>
                            )}
                          </>
                        )}

                        {customer.customerProfile.preferred_language && (
                          <Group>
                            <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Preferred Language</Text>
                              <Text fw={500} size="sm">
                                {customer.customerProfile.preferred_language === 'en' ? 'English' : 'বাংলা (Bengali)'}
                              </Text>
                            </Box>
                          </Group>
                        )}

                        {customer.customerProfile.marketing_consent !== undefined && (
                          <Group>
                            <IconCheck size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Marketing Consent</Text>
                              <Badge
                                color={customer.customerProfile.marketing_consent ? 'green' : 'gray'}
                                variant="light"
                                size="sm"
                              >
                                {customer.customerProfile.marketing_consent ? 'Accepted' : 'Declined'}
                              </Badge>
                            </Box>
                          </Group>
                        )}
                      </SimpleGrid>
                    </>
                  )}

                  {/* Staff Profile fields (if exists) */}
                  {profile && (
                    <>
                      <Title order={5} mt="md" mb="sm">
                        Staff Information
                      </Title>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {profile.designation && (
                          <Group>
                            <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Designation</Text>
                              <Text fw={500} size="sm">{profile.designation}</Text>
                            </Box>
                          </Group>
                        )}
                        {profile.city && (
                          <Group>
                            <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">City</Text>
                              <Text fw={500} size="sm">{profile.city}</Text>
                            </Box>
                          </Group>
                        )}
                        {profile.address && (
                          <Group>
                            <IconMapPin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Address</Text>
                              <Text fw={500} size="sm">{profile.address}</Text>
                            </Box>
                          </Group>
                        )}
                        {profile.baseSalary && (
                          <Group>
                            <IconCoin size={18} style={{ color: 'var(--mantine-color-red-filled)' }} />
                            <Box>
                              <Text size="xs" c="dimmed">Base Salary</Text>
                              <Text fw={500} size="sm">{formatCurrency(profile.baseSalary)}</Text>
                            </Box>
                          </Group>
                        )}
                      </SimpleGrid>
                    </>
                  )}
                </Card>

                {/* Addresses */}
                <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                  <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">
                    Notes
                  </Title>
                  {customer.customerProfile?.notes ? (
                    <Text size="sm">{customer.customerProfile.notes}</Text>
                  ) : (
                    <Alert icon={<IconInfoCircle size={16} />} color="blue">
                      <Text size="sm">No notes added for this customer.</Text>
                    </Alert>
                  )}
                </Card>
              </SimpleGrid>

              {/* Recent Orders */}
              <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                <Group justify="space-between" mb="md">
                  <Title order={4} className="text-base md:text-lg lg:text-xl">
                    Recent Orders
                  </Title>
                </Group>
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                  <Text size="sm">
                    Order history will be displayed here once the sales module is fully integrated.
                  </Text>
                </Alert>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* Wallet Tab */}
          <Tabs.Panel value="wallet">
            <Stack mt="md">
              <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">
                  Wallet Transactions
                </Title>
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                  <Text size="sm">
                    The wallet system is coming soon. Customers will be able to maintain a balance
                    and use it for purchases.
                  </Text>
                </Alert>
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* Activity Tab */}
          <Tabs.Panel value="activity">
            <Stack mt="md">
              <Card withBorder p={{ base: 'md', md: 'xl' }} radius="lg">
                <Title order={4} className="text-base md:text-lg lg:text-xl" mb="md">
                  Activity Log
                </Title>
                <Timeline bulletSize={24}>
                  <Timeline.Item bullet={<IconClock size={12} />} color="red">
                    <Text fw={600} size="sm">Account Created</Text>
                    <Text size="sm" c="dimmed">Customer account was created</Text>
                    <Text size="xs" c="dimmed">{formatDateTime(createdAt)}</Text>
                  </Timeline.Item>
                  {phoneVerifiedAt && (
                    <Timeline.Item bullet={<IconCheck size={12} />} color="green">
                      <Text fw={600} size="sm">Phone Verified</Text>
                      <Text size="sm" c="dimmed">Phone number was verified</Text>
                      <Text size="xs" c="dimmed">{formatDateTime(phoneVerifiedAt)}</Text>
                    </Timeline.Item>
                  )}
                  {lastLoginAt && (
                    <Timeline.Item bullet={<IconCalendar size={12} />} color="blue">
                      <Text fw={600} size="sm">Last Login</Text>
                      <Text size="sm" c="dimmed">Last logged into the system</Text>
                      <Text size="xs" c="dimmed">{formatDateTime(lastLoginAt)}</Text>
                    </Timeline.Item>
                  )}
                </Timeline>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  )
}
