'use client'

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Stack, Group, Title, Text, Button, Card, Grid, Badge, Paper,
  SimpleGrid, Skeleton,
} from '@mantine/core'
import {
  IconArrowLeft, IconMail, IconPhone, IconCode, IconTarget, IconDots,
  IconClick, IconCalendar, IconCopy, IconCheck,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'

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
  applicationDetails?: {
    businessName?: string
    businessType?: string
    website?: string
    niche?: string
    monthlyTraffic?: string
    description?: string
    status?: string
  }
}

export default function AffiliateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (!hasPermission('crm.affiliates.view')) {
      navigate('/marketing/affiliates')
      return
    }
    fetchAffiliate()
  }, [id])

  const fetchAffiliate = async () => {
    if (!id) return
    try {
      setLoading(true)
      const response = await api.get(`/crm/affiliates/${id}`)
      setAffiliate(response.data.data)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error?.response?.data?.message || 'Failed to load affiliate',
        color: 'red',
      })
      navigate('/marketing/affiliates')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    notifications.show({
      title: 'Copied',
      message: `${field} copied to clipboard`,
      color: 'green',
      autoClose: 2000,
    })
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <Stack p="xl">
        <Skeleton height={40} width={200} />
        <Skeleton height={300} />
      </Stack>
    )
  }

  if (!affiliate) {
    return (
      <Stack p="xl">
        <Paper withBorder p="xl" shadow="sm" ta="center">
          <Title order={3}>Affiliate Not Found</Title>
          <Text c="dimmed" mt="md">The affiliate you're looking for doesn't exist.</Text>
          <Button mt="md" onClick={() => navigate('/marketing/affiliates')}>
            Back to Affiliates
          </Button>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack p="xl" gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/marketing/affiliates')}>
          Back
        </Button>
        <Title flex={1}>{affiliate.name}</Title>
        <Badge size="lg" color={affiliate.isApproved ? 'green' : 'yellow'}>
          {affiliate.isApproved ? 'Approved' : 'Pending'}
        </Badge>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder shadow="sm" p="md">
            <Card.Section p="md" pb={0}>
              <Title order={4}>Contact Information</Title>
            </Card.Section>
            <Card.Section p="md">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap={8} mb={4}>
                      <IconMail size={16} />
                      <Text size="sm" c="dimmed">Email</Text>
                    </Group>
                    <Text fw={500} size="sm">{affiliate.email}</Text>
                  </div>
                  <Button size="xs" variant="subtle" onClick={() => copyToClipboard(affiliate.email, 'Email')}>
                    {copiedField === 'Email' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </Button>
                </Group>

                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap={8} mb={4}>
                      <IconPhone size={16} />
                      <Text size="sm" c="dimmed">Phone</Text>
                    </Group>
                    <Text fw={500} size="sm">{affiliate.phone}</Text>
                  </div>
                  <Button size="xs" variant="subtle" onClick={() => copyToClipboard(affiliate.phone, 'Phone')}>
                    {copiedField === 'Phone' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </Button>
                </Group>

                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap={8} mb={4}>
                      <IconCalendar size={16} />
                      <Text size="sm" c="dimmed">Joined</Text>
                    </Group>
                    <Text fw={500} size="sm">{new Date(affiliate.joinedAt).toLocaleDateString()}</Text>
                  </div>
                </Group>
              </Stack>
            </Card.Section>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder shadow="sm" p="md">
            <Card.Section p="md" pb={0}>
              <Title order={4}>Referral Information</Title>
            </Card.Section>
            <Card.Section p="md">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap={8} mb={4}>
                      <IconCode size={16} />
                      <Text size="sm" c="dimmed">Referral Code</Text>
                    </Group>
                    <Text fw={500} size="sm" style={{ fontFamily: 'monospace' }}>{affiliate.referralCode}</Text>
                  </div>
                  <Button size="xs" variant="subtle" onClick={() => copyToClipboard(affiliate.referralCode, 'Referral Code')}>
                    {copiedField === 'Referral Code' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </Button>
                </Group>

                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group gap={8} mb={4}>
                      <IconTarget size={16} />
                      <Text size="sm" c="dimmed">Commission Rate</Text>
                    </Group>
                    <Text fw={500} size="sm">{affiliate.commissionRate}%</Text>
                  </div>
                </Group>

                <div>
                  <Group gap={8} mb={4}>
                    <IconDots size={16} />
                    <Text size="sm" c="dimmed">Referral Link</Text>
                  </Group>
                  <Group gap={4}>
                    <Text fw={500} size="xs" style={{ fontFamily: 'monospace', flex: 1, overflow: 'auto' }}>
                      {affiliate.referralLink}
                    </Text>
                    <Button size="xs" variant="subtle" onClick={() => copyToClipboard(affiliate.referralLink, 'Referral Link')}>
                      {copiedField === 'Referral Link' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </Button>
                  </Group>
                </div>
              </Stack>
            </Card.Section>
          </Card>
        </Grid.Col>
      </Grid>

      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
        <Card withBorder shadow="sm" p="md">
          <Group justify="space-between" mb="md">
            <Title order={5} size="h6">Total Earned</Title>
            <Text c="dimmed" size="xs">৳</Text>
          </Group>
          <Text size="xl" fw={700}>{(affiliate.totalEarned ?? 0).toFixed(2)}</Text>
          <Text size="xs" c="dimmed" mt="xs">Withdrawn: ৳{(affiliate.withdrawnAmount ?? 0).toFixed(2)}</Text>
        </Card>

        <Card withBorder shadow="sm" p="md">
          <Group justify="space-between" mb="md">
            <Title order={5} size="h6">Available Balance</Title>
            <Text c="dimmed" size="xs">৳</Text>
          </Group>
          <Text size="xl" fw={700} c="green">{(affiliate.availableBalance ?? 0).toFixed(2)}</Text>
        </Card>

        <Card withBorder shadow="sm" p="md">
          <Group justify="space-between" mb="md">
            <Title order={5} size="h6">Total Clicks</Title>
            <IconClick size={16} />
          </Group>
          <Text size="xl" fw={700}>{affiliate.totalClicks ?? 0}</Text>
        </Card>

        <Card withBorder shadow="sm" p="md">
          <Group justify="space-between" mb="md">
            <Title order={5} size="h6">Conversion Rate</Title>
          </Group>
          <Text size="xl" fw={700}>{((affiliate.conversionRate ?? 0).toFixed(1))}%</Text>
          <Text size="xs" c="dimmed" mt="xs">{affiliate.totalConversions ?? 0} conversions</Text>
        </Card>
      </SimpleGrid>

      {affiliate.applicationDetails && (
        <Card withBorder shadow="sm" p="md">
          <Card.Section p="md" pb={0}>
            <Title order={4}>Application Details</Title>
          </Card.Section>
          <Card.Section p="md">
            <Grid>
              {affiliate.applicationDetails.businessName && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Business Name</Text>
                    <Text fw={500}>{affiliate.applicationDetails.businessName}</Text>
                  </div>
                </Grid.Col>
              )}
              {affiliate.applicationDetails.businessType && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Business Type</Text>
                    <Text fw={500}>{affiliate.applicationDetails.businessType}</Text>
                  </div>
                </Grid.Col>
              )}
              {affiliate.applicationDetails.website && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Website</Text>
                    <Text fw={500} component="a" href={affiliate.applicationDetails.website} target="_blank">
                      {affiliate.applicationDetails.website}
                    </Text>
                  </div>
                </Grid.Col>
              )}
              {affiliate.applicationDetails.niche && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Niche</Text>
                    <Text fw={500}>{affiliate.applicationDetails.niche}</Text>
                  </div>
                </Grid.Col>
              )}
              {affiliate.applicationDetails.monthlyTraffic && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Monthly Traffic</Text>
                    <Text fw={500}>{affiliate.applicationDetails.monthlyTraffic}</Text>
                  </div>
                </Grid.Col>
              )}
              {affiliate.applicationDetails.description && (
                <Grid.Col span={12}>
                  <div>
                    <Text size="sm" c="dimmed" mb={4}>Description</Text>
                    <Text fw={500} style={{ whiteSpace: 'pre-wrap' }}>
                      {affiliate.applicationDetails.description}
                    </Text>
                  </div>
                </Grid.Col>
              )}
            </Grid>
          </Card.Section>
        </Card>
      )}
    </Stack>
  )
}
