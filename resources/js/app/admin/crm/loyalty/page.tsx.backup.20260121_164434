import { useMemo, useState } from 'react'
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
  TextInput,
  ActionIcon,
  SimpleGrid,
  Table,
  Switch,
  Tabs,
  Alert,
  Avatar,
} from '@mantine/core'
import {
  IconPlus,
  IconSearch,
  IconPencil,
  IconTrash,
  IconEye,
  IconCoin,
  IconGift,
  IconTrophy,
  IconSettings,
  IconUsers,
  IconReceipt,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'

// Mock loyalty rules
const mockLoyaltyRules = [
  {
    id: 1,
    name: 'Points per Purchase',
    type: 'earning',
    points_per_currency: 1,
    min_purchase: 100,
    max_points_per_transaction: 500,
    status: 'active',
    description: 'Earn 1 point for every 1 BDT spent',
  },
  {
    id: 2,
    name: 'Birthday Bonus',
    type: 'earning',
    points_per_currency: 0,
    min_purchase: 0,
    max_points_per_transaction: 0,
    bonus_points: 100,
    status: 'active',
    description: 'Get 100 bonus points on birthday',
  },
  {
    id: 3,
    name: 'Referral Bonus',
    type: 'earning',
    points_per_currency: 0,
    min_purchase: 0,
    max_points_per_transaction: 0,
    bonus_points: 200,
    status: 'active',
    description: 'Earn 200 points for each successful referral',
  },
  {
    id: 4,
    name: 'Points Redemption',
    type: 'redemption',
    points_value: 100,
    currency_value: 10,
    status: 'active',
    description: 'Redeem 100 points for 10 BDT discount',
  },
]

// Mock customer tiers
const mockTiers = [
  {
    id: 1,
    name: 'Bronze',
    min_points: 0,
    max_points: 999,
    benefits: ['1% cashback', 'Free shipping on orders over 500 BDT', 'Birthday bonus'],
    color: 'CD7F32',
    icon: '🥉',
  },
  {
    id: 2,
    name: 'Silver',
    min_points: 1000,
    max_points: 4999,
    benefits: ['2% cashback', 'Free shipping on all orders', 'Priority support', 'Birthday bonus'],
    color: 'C0C0C0',
    icon: '🥈',
  },
  {
    id: 3,
    name: 'Gold',
    min_points: 5000,
    max_points: 9999,
    benefits: ['3% cashback', 'Free shipping & express delivery', '24/7 support', 'Exclusive discounts', 'Birthday bonus'],
    color: 'FFD700',
    icon: '🥇',
  },
  {
    id: 4,
    name: 'Platinum',
    min_points: 10000,
    max_points: null,
    benefits: ['5% cashback', 'Free express delivery', 'Personal account manager', 'Early access to sales', 'Exclusive rewards', 'Birthday bonus'],
    color: 'E5E4E2',
    icon: '💎',
  },
]

// Mock rewards
const mockRewards = [
  {
    id: 1,
    name: '500 BDT Voucher',
    points_required: 5000,
    description: 'Get 500 BDT discount on your next purchase',
    type: 'voucher',
    status: 'active',
    stock: 100,
    redeemed: 45,
  },
  {
    id: 2,
    name: 'Free Product',
    points_required: 10000,
    description: 'Redeem for any product worth 1000 BDT',
    type: 'product',
    status: 'active',
    stock: 50,
    redeemed: 12,
  },
  {
    id: 3,
    name: 'Free Shipping',
    points_required: 500,
    description: 'Free shipping on next order',
    type: 'shipping',
    status: 'active',
    stock: null,
    redeemed: 234,
  },
]

// Mock points transactions
const mockPointsTransactions = [
  {
    id: 1,
    customer_id: 1,
    customer_name: 'John Doe',
    type: 'earned',
    points: 450,
    description: 'Purchase: INV-2024-1234',
    balance_after: 450,
    date: '2024-12-29 10:15',
  },
  {
    id: 2,
    customer_id: 2,
    customer_name: 'Jane Smith',
    type: 'redeemed',
    points: -500,
    description: 'Redeemed: 500 BDT Voucher',
    balance_after: 2350,
    date: '2024-12-28 14:20',
  },
  {
    id: 3,
    customer_id: 1,
    customer_name: 'John Doe',
    type: 'earned',
    points: 100,
    description: 'Birthday Bonus',
    balance_after: 550,
    date: '2024-12-25 09:00',
  },
  {
    id: 4,
    customer_id: 5,
    customer_name: 'Charlie Brown',
    type: 'earned',
    points: 200,
    description: 'Referral Bonus',
    balance_after: 5400,
    date: '2024-12-20 16:45',
  },
]

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'tiers' | 'rewards' | 'transactions'>('rules')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter functions
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return mockLoyaltyRules
    const query = searchQuery.toLowerCase()
    return mockLoyaltyRules.filter((rule) =>
      rule.name.toLowerCase().includes(query) ||
      rule.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const filteredRewards = useMemo(() => {
    if (!searchQuery.trim()) return mockRewards
    const query = searchQuery.toLowerCase()
    return mockRewards.filter((reward) =>
      reward.name.toLowerCase().includes(query) ||
      reward.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return mockPointsTransactions
    const query = searchQuery.toLowerCase()
    return mockPointsTransactions.filter((txn) =>
      txn.customer_name.toLowerCase().includes(query) ||
      txn.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Delete handler
  const openDeleteModal = (type: string, _id: number, name: string) => {
    modals.openConfirmModal({
      title: `Delete ${type}`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500))
          notifications.show({
            title: `${type} Deleted`,
            message: `${name} has been deleted successfully`,
            color: 'green',
          })
        } catch {
          notifications.show({
            title: 'Error',
            message: `Failed to delete ${type.toLowerCase()}. Please try again.`,
            color: 'red',
          })
        }
      },
    })
  }

  // Calculate stats
  const totalMembers = useMemo(() => {
    return mockTiers.reduce((sum, tier) => {
      // Mock distribution
      const distribution = [150, 80, 45, 20]
      return sum + (distribution[mockTiers.indexOf(tier)] || 0)
    }, 0)
  }, [])

  const activeRewards = useMemo(() => {
    return mockRewards.filter((r) => r.status === 'active').length
  }, [])

  const activeRules = useMemo(() => {
    return mockLoyaltyRules.filter((r) => r.status === 'active').length
  }, [])

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Stack >
        {/* Header */}
        <Box>
          <Title order={1} className="text-lg md:text-xl lg:text-2xl">Loyalty Program</Title>
          <Text c="dimmed" className="text-sm md:text-base">Manage customer loyalty rules, tiers, and rewards</Text>
        </Box>

        {/* Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconUsers size={20} style={{ color: 'var(--mantine-color-blue-filled)' }} />
              <Text size="xs" c="dimmed">Total Members</Text>
            </Group>
            <Text size="xl" fw={700}>{totalMembers}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconTrophy size={20} style={{ color: 'var(--mantine-color-yellow-filled)' }} />
              <Text size="xs" c="dimmed">Active Tiers</Text>
            </Group>
            <Text size="xl" fw={700}>{mockTiers.length}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconSettings size={20} style={{ color: 'var(--mantine-color-green-filled)' }} />
              <Text size="xs" c="dimmed">Active Rules</Text>
            </Group>
            <Text size="xl" fw={700}>{activeRules}</Text>
          </Card>

          <Card withBorder p="md" radius="md">
            <Group  mb="xs">
              <IconGift size={20} style={{ color: 'var(--mantine-color-red-filled)' }} />
              <Text size="xs" c="dimmed">Active Rewards</Text>
            </Group>
            <Text size="xl" fw={700}>{activeRewards}</Text>
          </Card>
        </SimpleGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value as 'rules' | 'tiers' | 'rewards' | 'transactions')}>
          <Tabs.List>
            <Tabs.Tab value="rules" leftSection={<IconSettings size={14} />}>
              Rules
            </Tabs.Tab>
            <Tabs.Tab value="tiers" leftSection={<IconTrophy size={14} />}>
              Tiers
            </Tabs.Tab>
            <Tabs.Tab value="rewards" leftSection={<IconGift size={14} />}>
              Rewards
            </Tabs.Tab>
            <Tabs.Tab value="transactions" leftSection={<IconReceipt size={14} />}>
              Transactions
            </Tabs.Tab>
          </Tabs.List>

          {/* Rules Tab */}
          <Tabs.Panel value="rules">
            <Stack  mt="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Search rules..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: '400px' }}
                  size="md"
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    notifications.show({
                      title: 'Create Rule',
                      message: 'Create loyalty rule modal would open here',
                      color: 'blue',
                    })
                  }}
                >
                  Add Rule
                </Button>
              </Group>

              {/* Info Alert */}
              <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  Configure how customers earn and redeem loyalty points. Rules are automatically applied to customer transactions.
                </Text>
              </Alert>

              {/* Rules Grid */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {filteredRules.map((rule) => (
                  <Card key={rule.id} withBorder p="md" radius="md">
                    <Stack >
                      <Group justify="space-between">
                        <Group >
                          <Avatar color={rule.type === 'earning' ? 'green' : 'orange'} size="sm">
                            {rule.type === 'earning' ? <IconPlus size={14} /> : <IconCoin size={14} />}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm">{rule.name}</Text>
                            <Badge
                              size="xs"
                              color={rule.type === 'earning' ? 'green' : 'orange'}
                              variant="light"
                            >
                              {rule.type === 'earning' ? 'Earning' : 'Redemption'}
                            </Badge>
                          </Box>
                        </Group>
                        <Switch
                          checked={rule.status === 'active'}
                          onChange={() => {
                            notifications.show({
                              title: 'Rule Updated',
                              message: `${rule.name} has been ${rule.status === 'active' ? 'disabled' : 'enabled'}`,
                              color: 'green',
                            })
                          }}
                          size="sm"
                        />
                      </Group>

                      <Text size="sm" c="dimmed">{rule.description}</Text>

                      {rule.type === 'earning' && (
                        <>
                          {(rule.points_per_currency ?? 0) > 0 && (
                            <Group >
                              <Text size="xs" c="dimmed">Points per 1 BDT:</Text>
                              <Text size="sm" fw={600}>{rule.points_per_currency}</Text>
                            </Group>
                          )}
                          {(rule.bonus_points ?? 0) > 0 && (
                            <Group >
                              <Text size="xs" c="dimmed">Bonus points:</Text>
                              <Text size="sm" fw={600}>{rule.bonus_points}</Text>
                            </Group>
                          )}
                        </>
                      )}

                      {rule.type === 'redemption' && (
                        <Group >
                          <Text size="xs" c="dimmed">Redemption rate:</Text>
                          <Text size="sm" fw={600}>{rule.points_value} points = ৳{rule.currency_value}</Text>
                        </Group>
                      )}

                      <Group  mt="xs">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPencil size={14} />}
                          style={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => openDeleteModal('Rule', rule.id, rule.name)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* Tiers Tab */}
          <Tabs.Panel value="tiers">
            <Stack  mt="md">
              <Alert variant="light" color="yellow" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                  Customer tiers are automatically assigned based on accumulated loyalty points. Higher tiers unlock exclusive benefits.
                </Text>
              </Alert>

              {/* Tiers Display */}
              <Stack >
                {mockTiers.map((tier, index) => (
                  <Card
                    key={tier.id}
                    withBorder
                    p={{ base: 'sm', md: 'xl' }}
                    radius="lg"
                    style={{
                      borderLeft: `4px solid #${tier.color}`,
                      background: index === 3 ? 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)' : 'white',
                    }}
                  >
                    <Stack >
                      {/* Header */}
                      <Group justify="space-between" wrap="wrap">
                        <Group >
                          <Text size="xl">{tier.icon}</Text>
                          <Box>
                            <Group  mb="xs">
                              <Title order={4} className="text-base md:text-lg lg:text-xl">{tier.name}</Title>
                              {index === 3 && (
                                <Badge color="yellow" variant="filled" size="sm">Premium</Badge>
                              )}
                            </Group>
                            <Text size="sm" c="dimmed">
                              {tier.min_points.toLocaleString()} - {tier.max_points ? tier.max_points.toLocaleString() : '∞'} points
                            </Text>
                          </Box>
                        </Group>
                        <Group >
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconPencil size={14} />}
                          >
                            Edit Benefits
                          </Button>
                        </Group>
                      </Group>

                      {/* Benefits */}
                      <Box>
                        <Text size="sm" fw={600} mb="xs">Benefits:</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                          {tier.benefits.map((benefit, idx) => (
                            <Group key={idx} >
                              <IconCheck size={14} color="green" />
                              <Text size="sm">{benefit}</Text>
                            </Group>
                          ))}
                        </SimpleGrid>
                      </Box>

                      {/* Member count - mock */}
                      <Box pt="xs">
                        <Text size="xs" c="dimmed">
                          {index === 0 && '150 members'}
                          {index === 1 && '80 members'}
                          {index === 2 && '45 members'}
                          {index === 3 && '20 members'}
                        </Text>
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Tabs.Panel>

          {/* Rewards Tab */}
          <Tabs.Panel value="rewards">
            <Stack  mt="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Search rewards..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: '400px' }}
                  size="md"
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    notifications.show({
                      title: 'Create Reward',
                      message: 'Create reward modal would open here',
                      color: 'blue',
                    })
                  }}
                >
                  Add Reward
                </Button>
              </Group>

              {/* Rewards Grid */}
              <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
                {filteredRewards.map((reward) => (
                  <Card key={reward.id} withBorder p="md" radius="md" shadow="sm">
                    <Stack >
                      {/* Icon */}
                      <Box
                        p="md"
                        style={{
                          backgroundColor: 'var(--mantine-color-red-0)',
                          borderRadius: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <IconGift size={40} style={{ color: 'var(--mantine-color-red-filled)' }} />
                      </Box>

                      {/* Title */}
                      <Text fw={700} size="lg" ta="center">{reward.name}</Text>

                      {/* Points */}
                      <Box
                        p="xs"
                        style={{
                          backgroundColor: 'var(--mantine-color-yellow-0)',
                          borderRadius: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <Text size="xs" c="dimmed">Points Required</Text>
                        <Text fw={700} size="xl" c="var(--mantine-color-yellow-filled)">
                          {reward.points_required.toLocaleString()}
                        </Text>
                      </Box>

                      {/* Description */}
                      <Text size="sm" c="dimmed" ta="center">{reward.description}</Text>

                      {/* Stock */}
                      {reward.stock !== null && (
                        <Group justify="center" >
                          <Text size="xs" c="dimmed">Available:</Text>
                          <Text size="sm" fw={600}>{reward.stock - reward.redeemed}</Text>
                          <Text size="xs" c="dimmed">/ {reward.stock}</Text>
                        </Group>
                      )}

                      {/* Status */}
                      <Badge
                        color={reward.status === 'active' ? 'green' : 'gray'}
                        variant="light"
                        fullWidth
                        ta="center"
                      >
                        {reward.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>

                      {/* Actions */}
                      <Group >
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconEye size={14} />}
                          style={{ flex: 1 }}
                        >
                          View
                        </Button>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => openDeleteModal('Reward', reward.id, reward.name)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* Transactions Tab */}
          <Tabs.Panel value="transactions">
            <Stack  mt="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="Search transactions..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: '400px' }}
                  size="md"
                />
              </Group>

              {/* Desktop Table */}
              <Paper withBorder p="0" radius="md" display={{ base: 'none', md: 'block' }}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Points</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Balance After</Table.Th>
                      <Table.Th>Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredTransactions.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Box py="xl" ta="center">
                            <Text c="dimmed">No transactions found</Text>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filteredTransactions.map((txn) => (
                        <Table.Tr key={txn.id}>
                          <Table.Td>
                            <Text fw={600} size="sm">{txn.customer_name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={txn.type === 'earned' ? 'green' : 'red'}
                              variant="light"
                              size="sm"
                            >
                              {txn.type === 'earned' ? 'Earned' : 'Redeemed'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              fw={700}
                              size="sm"
                              c={txn.type === 'earned' ? 'green' : 'red'}
                            >
                              {txn.type === 'earned' ? '+' : ''}{txn.points}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{txn.description}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600} size="sm">{txn.balance_after}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{txn.date}</Text>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>

              {/* Mobile Cards */}
              <Stack  display={{ base: 'block', md: 'none' }}>
                {filteredTransactions.length === 0 ? (
                  <Paper withBorder p="xl" ta="center">
                    <Text c="dimmed">No transactions found</Text>
                  </Paper>
                ) : (
                  filteredTransactions.map((txn) => (
                    <Card key={txn.id} shadow="sm" p="sm" radius="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600} size="sm">{txn.customer_name}</Text>
                        <Badge
                          color={txn.type === 'earned' ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {txn.type === 'earned' ? 'Earned' : 'Redeemed'}
                        </Badge>
                      </Group>
                      <Text size="sm" mb="xs">{txn.description}</Text>
                      <Group justify="space-between">
                        <Text
                          fw={700}
                          size="lg"
                          c={txn.type === 'earned' ? 'green' : 'red'}
                        >
                          {txn.type === 'earned' ? '+' : ''}{txn.points}
                        </Text>
                        <Box style={{ textAlign: 'right' }}>
                          <Text size="xs" c="dimmed">Balance: {txn.balance_after}</Text>
                          <Text size="xs" c="dimmed">{txn.date}</Text>
                        </Box>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  )
}
