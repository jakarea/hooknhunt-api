'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Box, Stack, Group, Title, Text, Button, Textarea,
  Switch, MultiSelect, Image, Alert, Rating, AspectRatio,
  Breadcrumbs, Anchor, Badge, NumberInput, Card, Divider,
} from '@mantine/core'
import { IconSearch, IconStar, IconPhoto, IconUpload, IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate } from 'react-router-dom'
import { useMediaSelector } from '@/hooks/useMediaSelector'
import {
  createReview, searchProducts,
} from '@/utils/websiteApi'
import type { MediaFile } from '@/utils/api'
import { createMediaFolder, getMediaFolders } from '@/utils/api'

export default function CreateReviewPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [isFeatured, setIsFeatured] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [screenshotId, setScreenshotId] = useState<number | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<MediaFile | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])

  // Product search
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<Array<{ value: string; label: string }>>([])

  // Media selector
  const { openSingleSelect } = useMediaSelector()
  const [reviewsFolderId, setReviewsFolderId] = useState<number | null>(null)

  // Find or create Reviews folder
  const ensureReviewsFolder = useCallback(async (): Promise<number | null> => {
    try {
      const response = await getMediaFolders()
      const folders = response.data || []
      const reviewsFolder = folders.find((f: any) => f.name === 'Reviews' && f.parentId === null)

      if (reviewsFolder) {
        setReviewsFolderId(reviewsFolder.id)
        return reviewsFolder.id
      }

      const createResponse = await createMediaFolder({ name: 'Reviews' })
      const newFolderId = createResponse.data?.id
      if (newFolderId) {
        setReviewsFolderId(newFolderId)
        return newFolderId
      }

      return null
    } catch (error) {
      return null
    }
  }, [])

  const fetchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([])
      return
    }
    try {
      const res = await searchProducts(query)
      const productList = (res.data || []).map((p: any) => ({
        value: String(p.id),
        label: p.name,
      }))
      setProducts(productList)
    } catch {
      setProducts([])
    }
  }

  // Handle screenshot selection
  const handleSelectScreenshot = async () => {
    const folderId = await ensureReviewsFolder()
    openSingleSelect((mediaFile) => {
      setSelectedScreenshot(mediaFile)
      setScreenshotId(mediaFile.id)
    }, [], folderId)
  }

  // Submit form
  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      notifications.show({ title: 'Error', message: 'Review text is required', color: 'red' })
      return
    }

    try {
      setSubmitting(true)
      const data = {
        screenshotId: screenshotId || null,
        reviewText: reviewText,
        rating,
        isFeatured: isFeatured,
        sortOrder: sortOrder,
        productIds: selectedProducts.length > 0 ? selectedProducts : undefined,
      }

      await createReview(data)
      notifications.show({ title: 'Success', message: 'Review created successfully', color: 'green' })
      navigate('/website/reviews')
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save review',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box p={{ base: 'md', xl: 'xl' }}>
      <Stack gap="xl">
        {/* Header with Breadcrumbs */}
        <Stack gap="md">
          <Breadcrumbs>
            <Anchor component={Link} to="/website/reviews" size="sm">
              Reviews
            </Anchor>
            <Text size="sm">Create Review</Text>
          </Breadcrumbs>

          <Group justify="space-between">
            <div>
              <Title order={2}>Add New Review</Title>
              <Text c="dimmed" size="sm" mt={4}>Create a customer review from various platforms</Text>
            </div>
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/website/reviews')}
            >
              Back to Reviews
            </Button>
          </Group>
        </Stack>

        {/* Form Card */}
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <Stack gap="xl">
            {/* Screenshot Selection */}
            <Stack gap="sm">
              <Text size="sm" fw={500}>Screenshot Image</Text>

              {selectedScreenshot ? (
                <Box maw={600}>
                  <Card withBorder padding="0">
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        src={selectedScreenshot.url}
                        alt="Selected screenshot"
                        fit="contain"
                        radius="sm"
                        bg="gray.0"
                      />
                    </AspectRatio>
                    <Group p="md" gap="sm">
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconUpload size={14} />}
                        onClick={handleSelectScreenshot}
                      >
                        Change Image
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => {
                          setSelectedScreenshot(null)
                          setScreenshotId(null)
                        }}
                      >
                        Remove
                      </Button>
                    </Group>
                  </Card>
                </Box>
              ) : (
                <Card withBorder padding="lg" maw={600} sx={{ cursor: 'pointer' }} onClick={handleSelectScreenshot}>
                  <Stack gap="md" align="center" py="xl">
                    <Box
                      p="xl"
                      bg="gray.0"
                      c="dimmed"
                      style={{ borderRadius: '50%' }}
                    >
                      <IconPhoto size={40} />
                    </Box>
                    <Stack gap={4} align="center" ta="center">
                      <Text size="lg" fw={500}>Choose Screenshot</Text>
                      <Text size="sm" c="dimmed">Click to browse or upload from Media Library</Text>
                    </Stack>
                    <Button
                      variant="light"
                      leftSection={<IconUpload size={16} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectScreenshot()
                      }}
                    >
                      Select Image
                    </Button>
                  </Stack>
                </Card>
              )}
            </Stack>

            {/* Review Text */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Review Text</Text>
              <Textarea
                placeholder="Enter the customer's review text..."
                required
                withAsterisk
                minRows={5}
                autosize
                value={reviewText}
                onChange={(e) => setReviewText(e.currentTarget.value)}
              />
            </Stack>

            {/* Rating */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Customer Rating</Text>
              <Rating value={rating} onChange={setRating} fractions={1} size="xl" />
              <Text size="xs" c="dimmed">Select the star rating given by the customer (1-5 stars)</Text>
            </Stack>

            {/* Products Multi-Select */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Linked Products</Text>
              <MultiSelect
                label="Search and select products"
                placeholder="Type at least 2 characters to search..."
                description="Select products that are being reviewed"
                searchable
                clearable
                nothingFoundMessage="No products found. Try a different search term."
                data={products}
                value={selectedProducts.map(String)}
                onChange={(vals) => setSelectedProducts(vals.map(Number))}
                onSearchChange={(query) => {
                  setProductSearch(query)
                  fetchProducts(query)
                }}
                getCreateLabel={(query) => `Search for "${query}"`}
                creatable={false}
              />
              {selectedProducts.length > 0 && (
                <Group gap="xs" wrap>
                  {selectedProducts.map((productId) => {
                    const product = products.find((p) => p.value === String(productId))
                    return product ? (
                      <Badge key={productId} variant="light" radius="sm" leftSection={<IconCheck size={10} />}>
                        {product.label}
                      </Badge>
                    ) : null
                  })}
                </Group>
              )}
            </Stack>

            {/* Featured Switch */}
            <Stack gap="xs">
              <Switch
                label="Featured Review"
                description="This review will be displayed on the homepage and other featured sections"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.currentTarget.checked)}
                color="yellow"
                size="lg"
              />
            </Stack>

            {/* Sort Order */}
            {isFeatured && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>Display Order</Text>
                <NumberInput
                  description="Lower numbers appear first (for featured reviews)"
                  placeholder="e.g., 0"
                  value={sortOrder}
                  onChange={(val) => setSortOrder(val === '' ? 0 : val)}
                  min={0}
                  maw={200}
                />
              </Stack>
            )}

            {/* Form Actions */}
            <Box>
              <Divider my="md" />
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => navigate('/website/reviews')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  leftSection={<IconCheck size={16} />}
                >
                  Create Review
                </Button>
              </Group>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
