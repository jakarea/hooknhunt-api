# Frontend Code Examples

## Type-Safety with Zod

```typescript
// ❌ WRONG - any type
const [products, setProducts] = useState<any[]>([])
const response: any = await getProducts()

// ✅ CORRECT - Proper types + Zod validation
import { z } from 'zod'

// Define schema
const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().positive(),
  status: z.enum(['draft', 'published']),
})

type Product = z.infer<typeof ProductSchema>

// Validate API response
const response = await getProducts()
const validatedProducts = ProductSchema.array().parse(response.data)
setProducts(validatedProducts)
```

## Immutability in TypeScript

```typescript
// ❌ WRONG - Direct mutation
const addItem = (item) => {
  state.items.push(item) // Mutates!
  state.total += item.price // Mutates!
}

// ✅ CORRECT - Immutable updates
const addItem = (item: Item) => ({
  ...state,
  items: [...state.items, item],
  total: state.total + item.price,
})
```

## Optimistic UI Updates

```typescript
// ❌ WRONG - Spinner blocks everything
const handleDelete = async (id: number) => {
  setLoading(true) // Blocks UI!
  await deleteItem(id)
  setLoading(false)
  fetchItems() // Re-fetch everything
}

// ✅ CORRECT - Optimistic update
const handleDelete = (id: number) => {
  // Immediate UI update
  setItems(prev => prev.filter(item => item.id !== id))

  // Background API call
  deleteItem(id).catch(() => {
    // Rollback on error
    setItems(prev => [...prev, originalItem])
    notifications.show({
      title: 'Delete failed',
      message: 'Could not delete item. Please try again.',
      color: 'red',
    })
  })
}
```

## Skeleton Loading States

```typescript
// ❌ WRONG - Full page spinner
if (loading) {
  return <Loader size="xl" />
}

// ✅ CORRECT - Skeleton UI
if (loading) {
  return (
    <Stack gap="md">
      <Skeleton height={40} width="30%" />
      <Skeleton height={60} />
      <Skeleton height={200} />
      <Skeleton height={200} />
    </Stack>
  )
}
```

## Zero Layout Shift

```typescript
// ❌ WRONG - Layout shift
<img src={product.thumbnail} alt={product.name} />

// ✅ CORRECT - No shift
<img
  src={product.thumbnail}
  alt={product.name}
  className="aspect-square w-full h-auto"
  style={{ minHeight: '200px' }}
/>
```

## Micro-interactions

```typescript
import { Button, MantineTransition } from '@mantine/core'

// ✅ Add transition to modals
<MantineTransition transition="fade" duration={300} mounted={opened}>
  <YourModal />
</MantineTransition>

// ✅ Add hover/active states
<Button
  styles={{
    root: {
      transition: 'all 150ms ease',
      '&:active': { transform: 'scale(0.98)' },
    }
  }}
>
  Click Me
</Button>
```

## Keyboard Navigation

```typescript
// ✅ Form submits on Enter key
<form
  onSubmit={(e) => {
    e.preventDefault()
    handleSubmit()
  }}
>
  <TextInput
    label="Name"
    autoFocus // First field auto-focus
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.currentTarget.nextElementSibling?.querySelector('input')?.focus()
      }
    }}
  />
</form>
```

## SWR Pattern

```typescript
// ❌ WRONG - Always wait for fresh data
const [products, setProducts] = useState([])
useEffect(() => {
  const fetch = async () => {
    setLoading(true)
    const data = await getProducts() // Wait...
    setProducts(data)
    setLoading(false)
  }
  fetch()
}, [])

// ✅ CORRECT - SWR pattern
import useSWR from 'swr'

function ProductsList() {
  const { data: products, error, isValidating } = useSWR(
    '/api/products',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute cache
    }
  )

  // Show cached data immediately, revalidate in background
  return <ProductList data={products} loading={isValidating} />
}
```

## Server Components (Next.js)

```typescript
// ✅ Server Component (default)
// app/products/page.tsx - No "use client" directive
async function ProductsPage() {
  const products = await fetchProducts() // Runs on server
  return <ProductList products={products} />
}

// ❌ Client Component (only when needed)
'use client'
export function ProductFilters() {
  const [filters, setFilters] = useState() // Needs interactivity
  // ...
}
```
