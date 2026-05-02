import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Modal, Stack, Group, Text, Paper, Badge, Image, Box, Button,
  Breadcrumbs, Skeleton, ScrollArea, ActionIcon, Tooltip,
} from '@mantine/core'
import { IconChevronRight, IconPhoto } from '@tabler/icons-react'
import { useCategoriesStore } from '@/stores/categoriesStore'
import type { Category } from '@/utils/api'

interface CategorySelectorModalProps {
  opened: boolean
  onClose: () => void
  onSelect: (category: Category) => void
  selectedId?: number | null
}

export function CategorySelectorModal({ opened, onClose, onSelect, selectedId }: CategorySelectorModalProps) {
  const { t } = useTranslation()

  const {
    rootCategories,
    currentChildren,
    selectedCategory,
    navigationPath,
    loading,
    loadingChildren,
    fetchRootCategories,
    navigateToCategory,
    navigateBack,
    navigateToRoot,
  } = useCategoriesStore()

  // Load root categories when modal opens
  useEffect(() => {
    if (opened && rootCategories.length === 0) {
      fetchRootCategories()
    }
  }, [opened, rootCategories.length, fetchRootCategories])

  const handleSelectCategory = (category: Category) => {
    onSelect(category)
    onClose()
    // Reset to root after selection
    setTimeout(() => navigateToRoot(), 300)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="lg">
          {t('catalog.categoriesPage.selectCategory') || 'Select Category'}
        </Text>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Breadcrumb navigation */}
        {navigationPath.length > 0 && (
          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              onClick={navigateBack}
            >
              {t('common.back') || 'Back'}
            </Button>
            <Breadcrumbs separator={<IconChevronRight size={12} />}>
              {navigationPath.slice(0, -1).map((item, i) => (
                <Text
                  key={i}
                  size="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const targetCategory = i === 0
                      ? rootCategories.find(c => c.id === item.id)
                      : currentChildren.find(c => c.id === item.id)
                    if (targetCategory) navigateToCategory(targetCategory)
                  }}
                >
                  {item.name}
                </Text>
              ))}
              <Text size="sm" fw={500}>
                {navigationPath[navigationPath.length - 1]?.name}
              </Text>
            </Breadcrumbs>
          </Group>
        )}

        {/* Split View */}
        <Group align="flex-start" gap="sm" style={{ minHeight: 400 }}>
          {/* Left Panel - Parent Categories */}
          <Paper withBorder p="xs" radius="md" style={{ flex: 1, minWidth: 280 }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  {t('catalog.categoriesPage.rootCategories') || 'Categories'}
                </Text>
                <Badge size="xs" circle>{rootCategories.length}</Badge>
              </Group>

              <ScrollArea h={350}>
                {loading ? (
                  <Stack gap="xs">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={50} radius="sm" />
                    ))}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    {rootCategories.map((category) => (
                      <Paper
                        key={category.id}
                        withBorder
                        p="xs"
                        radius="sm"
                        style={{
                          cursor: 'pointer',
                          borderColor: selectedCategory?.id === category.id ? 'var(--mantine-color-blue-4)' : undefined,
                          backgroundColor: selectedId === category.id ? 'var(--mantine-color-blue-0)' : undefined,
                        }}
                        onClick={() => navigateToCategory(category)}
                      >
                        <Group gap="sm" wrap="nowrap">
                          {category.image?.url ? (
                            <Image src={category.image.url} h={32} w={32} radius="sm" fit="cover" />
                          ) : (
                            <Box h={32} w={32} style={{ borderRadius: '4px', border: '1px dashed var(--mantine-color-gray-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconPhoto size={16} style={{ color: 'var(--mantine-color-gray-4)' }} />
                            </Box>
                          )}
                          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate>
                              {category.name}
                            </Text>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" c="dimmed">
                                {category.productsCount || 0} {t('catalog.categoriesPage.tableHeaders.products') || 'products'}
                              </Text>
                            </Group>
                          </Stack>
                          <IconChevronRight size={14} c="dimmed" style={{ flexShrink: 0 }} />
                        </Group>
                        {selectedId === category.id && (
                          <ActionIcon
                            size="xs"
                            color="blue"
                            variant="light"
                            mt="xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectCategory(category)
                            }}
                          >
                            ✓
                          </ActionIcon>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Stack>
          </Paper>

          {/* Right Panel - Children */}
          <Paper withBorder p="xs" radius="md" style={{ flex: 1, minWidth: 280 }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  {selectedCategory?.name || (t('catalog.categoriesPage.selectCategory') || 'Select category')}
                </Text>
                {selectedCategory && (
                  <Badge size="xs">{currentChildren.length}</Badge>
                )}
              </Group>

              <ScrollArea h={350}>
                {loadingChildren ? (
                  <Stack gap="xs">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={50} radius="sm" />
                    ))}
                  </Stack>
                ) : selectedCategory ? (
                  <Stack gap="xs">
                    {/* Parent category as selectable item */}
                    <Paper
                      withBorder
                      p="xs"
                      radius="sm"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedId === selectedCategory.id ? 'var(--mantine-color-blue-0)' : undefined,
                      }}
                      onClick={() => handleSelectCategory(selectedCategory)}
                    >
                      <Group gap="sm">
                        <Text size="sm" fw={500} style={{ flex: 1 }}>
                          {selectedCategory.name}
                        </Text>
                        {selectedId === selectedCategory.id && (
                          <Text size="xs" c="blue">✓</Text>
                        )}
                      </Group>
                    </Paper>

                    {currentChildren.length > 0 && (
                      <Text size="xs" fw={500} c="dimmed" mt="xs">
                        {t('catalog.categoriesPage.childrenCategories') || 'Subcategories'}
                      </Text>
                    )}

                    {currentChildren.map((child) => (
                      <Paper
                        key={child.id}
                        withBorder
                        p="xs"
                        radius="sm"
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedId === child.id ? 'var(--mantine-color-blue-0)' : undefined,
                        }}
                        onClick={() => {
                          // If has children, navigate; otherwise select
                          // We'll know after clicking if it has children
                        }}
                      >
                        <Group gap="sm" justify="space-between">
                          <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                            {child.image?.url ? (
                              <Image src={child.image.url} h={28} w={28} radius="sm" fit="cover" />
                            ) : (
                              <Box h={28} w={28} style={{ borderRadius: '4px', border: '1px dashed var(--mantine-color-gray-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <IconPhoto size={14} style={{ color: 'var(--mantine-color-gray-4)' }} />
                              </Box>
                            )}
                            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                              <Text size="sm" fw={500} truncate>
                                {child.name}
                              </Text>
                              <Group gap={4} wrap="nowrap">
                                <Text size="xs" c="dimmed">
                                  {child.productsCount || 0} products
                                </Text>
                              </Group>
                            </Stack>
                          </Group>
                          <Group gap="xs">
                            {selectedId === child.id && (
                              <Text size="xs" c="blue">✓</Text>
                            )}
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectCategory(child)
                              }}
                            >
                              {t('common.select') || 'Select'}
                            </ActionIcon>
                          </Group>
                        </Group>
                        <Button
                          size="xs"
                          variant="light"
                          fullWidth
                          mt="xs"
                          leftSection={<IconChevronRight size={12} />}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigateToCategory(child)
                          }}
                        >
                          {child.productsCount > 0 ? (
                            `${child.productsCount} ${t('catalog.categoriesPage.tableHeaders.products') || 'products'}`
                          ) : (
                            t('catalog.categoriesPage.viewSubcategories') || 'View subcategories'
                          )}
                        </Button>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Text ta="center" c="dimmed" size="sm" py="xl">
                    {t('catalog.categoriesPage.selectCategoryHint') || 'Click a category on the left to view its subcategories'}
                  </Text>
                )}
              </ScrollArea>
            </Stack>
          </Paper>
        </Group>
      </Stack>
    </Modal>
  )
}
