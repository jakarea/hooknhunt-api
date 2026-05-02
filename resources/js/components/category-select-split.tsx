'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, Stack, Group, Text, Paper, Button, Input, Breadcrumbs, ScrollArea } from '@mantine/core'
import { IconChevronDown, IconPhoto, IconSearch, IconX } from '@tabler/icons-react'
import { getCategoryPath } from '@/utils/api'
import type { Category } from '@/utils/api'

interface CategorySelectSplitProps {
  value: string | null
  onChange: (value: string | null) => void
  error?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

interface BreadcrumbItem {
  id: number
  name: string
}

// Helper to decode HTML entities
const decodeHTMLEntities = (text: string): string => {
  if (!text) return ''
  let decoded = text
  let maxIterations = 5
  let iteration = 0
  while (iteration < maxIterations && (decoded.includes('&') || decoded.includes('<') || decoded.includes('>'))) {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = decoded
    const newDecoded = textarea.value
    if (newDecoded === decoded) break
    decoded = newDecoded
    iteration++
  }
  return decoded
}

// Recursive function to render category tree with indentation
function renderCategoryTree(
  categories: Category[],
  level: number = 0,
  selectedId: string | null,
  onSelect: (category: Category) => void,
  searchQuery: string = ''
): React.ReactNode {
  console.log('renderCategoryTree called with', categories.length, 'categories, level:', level)

  return categories
    .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map((category) => {
      console.log('Rendering category:', category.name, 'has children:', category.children?.length || 0)
      return (
        <div key={category.id}>
        <Group
          gap="xs"
          onClick={() => onSelect(category)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: selectedId === category.id.toString() ? 'var(--mantine-color-blue-0)' : 'transparent',
            color: selectedId === category.id.toString() ? 'var(--mantine-color-blue-6)' : 'inherit',
            borderRadius: 4,
            marginLeft: level * 20,
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedId === category.id.toString() ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-gray-1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedId === category.id.toString() ? 'var(--mantine-color-blue-0)' : 'transparent'}
        >
          {category.image?.url ? (
            <img src={category.image.url} alt="" style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover' }} />
          ) : (
            <IconPhoto size={20} style={{ color: 'var(--mantine-color-gray-4)' }} />
          )}
          <Text size="sm" fw={500} style={{ flex: 1 }}>
            {decodeHTMLEntities(category.name)}
          </Text>
          {selectedId === category.id.toString() && <Text size="xs" c="blue">✓</Text>}
        </Group>

        {/* Render children recursively */}
        {category.children && category.children.length > 0 && renderCategoryTree(
          category.children,
          level + 1,
          selectedId,
          onSelect,
          searchQuery
        )}
      </div>
      )
    })
}

export function CategorySelectSplit({
  value,
  onChange,
  error,
  label,
  required,
  disabled = false,
}: CategorySelectSplitProps) {
  const { t } = useTranslation()

  const [opened, setOpened] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [storedBreadcrumbPath, setStoredBreadcrumbPath] = useState<BreadcrumbItem[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])

  // Load all categories as tree when dropdown opens
  useEffect(() => {
    if (opened && allCategories.length === 0) {
      console.log('Loading category tree...')
      fetch('/api/v2/catalog/helpers/categories/tree')
        .then(res => res.json())
        .then(data => {
          console.log('Tree data received:', data)
          if (data?.data && Array.isArray(data.data)) {
            console.log('Setting categories:', data.data.length)
            setAllCategories(data.data)
          }
        })
        .catch(err => console.error('Failed to load category tree:', err))
    }
  }, [opened, allCategories.length])

  // Update stored breadcrumb path when value changes
  useEffect(() => {
    if (!value) {
      setStoredBreadcrumbPath([])
      return
    }

    const valueNum = parseInt(value.toString())

    // Fetch from API
    const fetchPath = async () => {
      try {
        const response = await getCategoryPath(valueNum)
        if (response?.path && Array.isArray(response.path)) {
          const path = response.path.map((item: any) => ({
            id: item.id,
            name: decodeHTMLEntities(item.name)
          }))
          setStoredBreadcrumbPath(path)
        }
      } catch (error) {
        console.error('Failed to fetch category path:', error)
      }
    }

    fetchPath()
  }, [value])

  const handleSelect = (category: Category) => {
    onChange(category.id.toString())
    setOpened(false)
  }

  const handleClear = () => {
    onChange(null)
  }

  return (
    <Stack gap={4}>
      {label && (
        <Text size="sm" fw={500}>
          {label} {required && <Text span c="red">*</Text>}
        </Text>
      )}

      {/* Breadcrumb path of selected category */}
      {storedBreadcrumbPath.length > 0 && (
        <Breadcrumbs separator={<IconChevronDown size={12} />}>
          {storedBreadcrumbPath.map((item) => (
            <Text key={item.id} size="xs">
              {item.name}
            </Text>
          ))}
        </Breadcrumbs>
      )}

      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        width={300}
        withinPortal={true}
        disabled={disabled}
        zIndex={1000}
      >
        <Popover.Target>
          <Group gap="xs">
            <Button
              variant="default"
              style={{ flex: 1, height: 36, justifyContent: 'space-between' }}
              onClick={() => setOpened(!opened)}
              disabled={disabled}
              rightSection={<IconChevronDown size={14} />}
            >
              {storedBreadcrumbPath.length > 0 ? (
                <Text size="sm">
                  {decodeHTMLEntities(storedBreadcrumbPath[storedBreadcrumbPath.length - 1].name)}
                </Text>
              ) : (
                <Text size="sm" c="dimmed">{t('catalog.productsCreate.selectCategory') || 'Select category'}</Text>
              )}
            </Button>
            {value && (
              <Button
                variant="light"
                size="sm"
                onClick={handleClear}
                color="gray"
                style={{ height: 36 }}
              >
                <IconX size={16} />
              </Button>
            )}
          </Group>
        </Popover.Target>

        <Popover.Dropdown p={0}>
          <Paper withBorder shadow="sm" radius="md">
            {/* Header with search */}
            <Stack gap={0} p="xs" mb="xs">
              <Input
                placeholder={t('catalog.categoriesPage.searchPlaceholder') || 'Search categories...'}
                leftSection={<IconSearch size={14} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="xs"
              />
            </Stack>

            {/* Category Tree */}
            <ScrollArea.Autosize mah={400} type="auto">
              <Stack gap={0} p="xs">
                {allCategories.length === 0 ? (
                  <Text ta="center" c="dimmed" size="xs" py="md">
                    {t('catalog.categoriesPage.noCategoriesFound') || 'No categories found'}
                  </Text>
                ) : (
                  renderCategoryTree(allCategories, 0, value, handleSelect, searchQuery)
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Paper>
        </Popover.Dropdown>
      </Popover>

      {error && (
        <Text size="xs" c="red">{error}</Text>
      )}
    </Stack>
  )
}
