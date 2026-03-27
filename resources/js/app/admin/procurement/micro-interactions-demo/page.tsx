/**
 * Demo page showcasing all micro-interactions for Suppliers module.
 *
 * This demonstrates the animated components and interactions.
 */

import { useState } from 'react'
import { Stack, Group, Text, TextInput, Switch, Paper, SimpleGrid } from '@mantine/core'
import { Button as MantineButton } from '@mantine/core'
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconCheck,
  IconX,
  IconSearch,
} from '@tabler/icons-react'
import {
  AnimatedCard,
  AnimatedButton,
  SkeletonLoader,
  AnimatedListItem,
  StatusNotification,
  LoadingSpinner,
  CountUpNumber,
  AnimatedProgressBar,
  AnimatedToggle,
  ExpandableSection,
  StaggeredList,
} from '@/components/ui/AnimatedComponents'

/**
 * Demo page for micro-interactions
 */
export default function MicroInteractionsDemo() {
  const [isLoading, setIsLoading] = useState(false)
  const [toggleValue, setToggleValue] = useState(true)
  const [progressValue, setProgressValue] = useState(0)

  const handleLoad = () => {
    setIsLoading(true)
    setProgressValue(0)

    const interval = setInterval(() => {
      setProgressValue((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsLoading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const items = [
    <Paper key="1" p="md" shadow="sm" withBorder>
      <Text>Item 1</Text>
    </Paper>,
    <Paper key="2" p="md" shadow="sm" withBorder>
      <Text>Item 2</Text>
    </Paper>,
    <Paper key="3" p="md" shadow="sm" withBorder>
      <Text>Item 3</Text>
    </Paper>,
  ]

  return (
    <Stack p="xl" gap="xl">
      {/* Header */}
      <div>
        <Text size="xl" fw={600}>Micro-Interactions Demo</Text>
        <Text size="sm" c="dimmed">Suppliers module UX enhancements</Text>
      </div>

      {/* Animated Cards */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Animated Cards</Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          <AnimatedCard hover>
            <Stack gap="xs">
              <Text fw={600}>Card 1</Text>
              <Text size="sm" c="dimmed">Hover me!</Text>
            </Stack>
          </AnimatedCard>
          <AnimatedCard hover delay={0.1}>
            <Stack gap="xs">
              <Text fw={600}>Card 2</Text>
              <Text size="sm" c="dimmed">Delayed fade-in</Text>
            </Stack>
          </AnimatedCard>
          <AnimatedCard hover delay={0.2}>
            <Stack gap="xs">
              <Text fw={600}>Card 3</Text>
              <Text size="sm" c="dimmed">Staggered animation</Text>
            </Stack>
          </AnimatedCard>
        </SimpleGrid>
      </Paper>

      {/* Animated Buttons */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Animated Buttons</Text>
        <Group>
          <AnimatedButton
            leftSection={<IconPlus size={16} />}
            onClick={() => console.log('Add clicked')}
          >
            Add Supplier
          </AnimatedButton>
          <AnimatedButton
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => console.log('Delete clicked')}
          >
            Delete
          </AnimatedButton>
          <AnimatedButton
            color="green"
            leftSection={<IconCheck size={16} />}
            loading={isLoading}
            onClick={handleLoad}
          >
            Load Data
          </AnimatedButton>
          <AnimatedButton
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => console.log('Refresh clicked')}
          >
            Refresh
          </AnimatedButton>
        </Group>
      </Paper>

      {/* Loading States */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Loading States</Text>
        <Stack gap="md">
          {/* Skeleton Loader */}
          <div>
            <Text size="sm" fw={600} mb="xs">Skeleton Loader</Text>
            <SkeletonLoader count={3} height={60} />
          </div>

          {/* Loading Spinner */}
          <div>
            <Text size="sm" fw={600} mb="xs">Loading Spinner</Text>
            <LoadingSpinner size={32} label="Loading suppliers..." />
          </div>

          {/* Progress Bar */}
          <div>
            <Text size="sm" fw={600} mb="xs">Progress Bar</Text>
            <AnimatedProgressBar
              value={progressValue}
              label="Loading progress"
              showLabel
            />
          </div>
        </Stack>
      </Paper>

      {/* Animated List Items */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Animated List Items</Text>
        <Stack gap="xs">
          <AnimatedListItem index={0}>
            <Group justify="space-between">
              <Text>Supplier 1</Text>
              <Text size="sm" c="dimmed">Active</Text>
            </Group>
          </AnimatedListItem>
          <AnimatedListItem index={1}>
            <Group justify="space-between">
              <Text>Supplier 2</Text>
              <Text size="sm" c="dimmed">Inactive</Text>
            </Group>
          </AnimatedListItem>
          <AnimatedListItem index={2}>
            <Group justify="space-between">
              <Text>Supplier 3</Text>
              <Text size="sm" c="dimmed">Active</Text>
            </Group>
          </AnimatedListItem>
        </Stack>
      </Paper>

      {/* Status Notifications */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Status Notifications</Text>
        <Stack gap="sm">
          <StatusNotification
            type="success"
            title="Success!"
            message="Supplier created successfully"
          />
          <StatusNotification
            type="error"
            title="Error!"
            message="Failed to create supplier"
          />
          <StatusNotification
            type="warning"
            title="Warning!"
            message="Please check your input"
          />
        </Stack>
      </Paper>

      {/* Count-Up Numbers */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Count-Up Numbers</Text>
        <Group>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={600}>
              <CountUpNumber end={150} prefix="৳" />
            </Text>
            <Text size="xs" c="dimmed">Suppliers</Text>
          </Stack>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={600}>
              <CountUpNumber end={45} suffix="%" />
            </Text>
            <Text size="xs" c="dimmed">Active</Text>
          </Stack>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={600}>
              <CountUpNumber end={105} prefix="#" />
            </Text>
            <Text size="xs" c="dimmed">Orders</Text>
          </Stack>
        </Group>
      </Paper>

      {/* Animated Toggle */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Animated Toggle</Text>
        <Group>
          <AnimatedToggle
            checked={toggleValue}
            onChange={setToggleValue}
            label="Active Supplier"
          />
          <AnimatedToggle
            checked={!toggleValue}
            onChange={(v) => setToggleValue(!v)}
            label="Receive Notifications"
          />
        </Group>
      </Paper>

      {/* Expandable Section */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Expandable Section</Text>
        <ExpandableSection label="Advanced Options" defaultOpen={false}>
          <Stack gap="sm" mt="sm">
            <TextInput placeholder="Option 1" />
            <TextInput placeholder="Option 2" />
            <TextInput placeholder="Option 3" />
          </Stack>
        </ExpandableSection>
      </Paper>

      {/* Staggered List */}
      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Staggered List Animation</Text>
        <StaggeredList items={items} />
      </Paper>
    </Stack>
  )
}
