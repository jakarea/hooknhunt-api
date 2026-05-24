'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, TextInput, Badge, Button, ActionIcon,
  Skeleton, Card, SimpleGrid, Pagination, Image, Alert, Rating, Container,
} from '@mantine/core'
import { IconSearch, IconRefresh, IconStar, IconTrash, IconEdit, IconPhoto, IconPlus } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useDebouncedValue } from '@mantine/hooks'
import { Link } from 'react-router-dom'
import {
  getReviews, deleteReview, toggleReviewFeatured,
  type Review, type ReviewFilters,
} from '@/utils/websiteApi'

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(12)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      const filters: ReviewFilters = {
        search: debouncedSearch || undefined,
        page,
        per_page: perPage,
      }
      const res = await getReviews(filters)
      setReviews(res.data || [])
      setTotalPages(res.meta?.last_page || 1)
      setTotal(res.meta?.total || 0)
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load reviews', color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page, perPage])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Delete review
  const handleDelete = (review: Review) => {
    modals.openConfirmModal({
      title: 'Delete Review',
      children: <Text size="sm">Are you sure you want to delete this review? This action cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteReview(review.id)
          notifications.show({ title: 'Success', message: 'Review deleted successfully', color: 'green' })
          fetchReviews()
        } catch {
          notifications.show({ title: 'Error', message: 'Failed to delete review', color: 'red' })
        }
      },
    })
  }

  // Toggle featured
  const handleToggleFeatured = async (review: Review) => {
    try {
      await toggleReviewFeatured(review.id)
      notifications.show({ title: 'Success', message: 'Review featured status updated', color: 'green' })
      fetchReviews()
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update featured status', color: 'red' })
    }
  }

  return (
    <Box p={{ base: 'md', xl: 'xl' }}>
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Group justify="space-between" mb="xs">
            <div>
              <Title order={2}>Customer Reviews</Title>
              <Text c="dimmed" size="sm" mt={4}>Manage customer reviews from various platforms</Text>
            </div>
            <Group gap="sm">
              <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={fetchReviews}>
                Refresh
              </Button>
              <Button component={Link} to="/website/reviews/create" leftSection={<IconPlus size={16} />}>
                Add Review
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Search & Stats Bar */}
        <Group justify="space-between">
          <TextInput
            placeholder="Search reviews by text or product name..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Group gap="md" c="dimmed">
            <Text size="sm">Total: <Text span fw={500} c="bright">{total}</Text> reviews</Text>
          </Group>
        </Group>

        {/* Loading state */}
        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            {[...Array(8)].map((_, i) => (
              <Card key={i} shadow="sm" padding="0" withBorder>
                <Skeleton height={180} />
                <Stack p="md" gap="sm">
                  <Skeleton height={16} width="40%" />
                  <Skeleton height={48} />
                  <Skeleton height={12} width="60%" />
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <>
            {/* Reviews Grid */}
            {reviews.length === 0 ? (
              <Container py="xl">
                <Stack align="center" gap="sm">
                  <Alert variant="light" color="gray" w="100%" ta="center">
                    <Stack gap={4}>
                      <Text fw={500}>No reviews found</Text>
                      <Text size="sm" c="dimmed">
                        {search ? 'Try adjusting your search terms' : 'Add your first review to get started'}
                      </Text>
                      {!search && (
                        <Button component={Link} to="/website/reviews/create" mt="md">
                          Create First Review
                        </Button>
                      )}
                    </Stack>
                  </Alert>
                </Stack>
              </Container>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
                {reviews.map((review) => (
                  <Card key={review.id} shadow="sm" padding="0" withBorder>
                    {/* Screenshot */}
                    <Box h={180} bg="gray.0" pos="relative">
                      {review.screenshot ? (
                        <Image
                          src={review.screenshot.fullUrl}
                          alt="Review screenshot"
                          height={180}
                          width="100%"
                          fit="cover"
                        />
                      ) : (
                        <Box
                          h={180}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          c="gray.4"
                        >
                          <IconPhoto size={40} />
                        </Box>
                      )}

                      {/* Rating Badge */}
                      <Badge
                        pos="absolute"
                        top={12}
                        right={12}
                        bg="white"
                        c="yellow.6"
                        radius="sm"
                        size="lg"
                        shadow="sm"
                      >
                        <Group gap={6}>
                          <IconStar size={14} fill="currentColor" />
                          <Text span fw={600}>{review.rating}</Text>
                        </Group>
                      </Badge>

                      {/* Featured Badge */}
                      {review.is_featured && (
                        <Badge
                          pos="absolute"
                          top={12}
                          left={12}
                          color="yellow"
                          radius="sm"
                          size="sm"
                        >
                          Featured
                        </Badge>
                      )}
                    </Box>

                    {/* Content */}
                    <Stack p="md" gap="sm">
                      {/* Review Text */}
                      <Text size="sm" lineClamp={3} lh={1.5}>
                        {review.review_text}
                      </Text>

                      {/* Linked Products */}
                      {review.products.length > 0 && (
                        <Stack gap={6}>
                          <Text size="xs" c="dimmed" fw={500} tt="uppercase">Linked Products</Text>
                          <Group gap={6} wrap>
                            {review.products.map((product) => (
                              <Badge key={product.id} variant="light" size="xs" radius="sm">
                                {product.name}
                              </Badge>
                            ))}
                          </Group>
                        </Stack>
                      )}

                      {/* Actions */}
                      <Group justify="space-between" mt={4}>
                        <Group gap="xs">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            component={Link}
                            to={`/website/reviews/edit/${review.id}`}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(review)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                        <Button
                          size="xs"
                          variant={review.is_featured ? 'filled' : 'light'}
                          color={review.is_featured ? 'yellow' : 'gray'}
                          radius="sm"
                          onClick={() => handleToggleFeatured(review)}
                        >
                          {review.is_featured ? 'Featured' : 'Feature'}
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box py="md">
                <Group justify="center">
                  <Pagination
                    total={totalPages}
                    value={page}
                    onChange={setPage}
                  />
                </Group>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Box>
  )
}
