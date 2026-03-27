# 🎨 Frontend Engineering (React 18 + Next.js 16)

**📖 Back to main**: [instruction/global-lean.md](./global-lean.md)
**💻 Code Examples**: [instruction/examples/frontend.md](./examples/frontend.md)

---

## 📋 READ THIS WHEN

You are working on:
- ✅ Writing React components (Admin Panel)
- ✅ Writing Next.js pages (Storefront)
- ✅ API integration
- ✅ State management (Zustand)
- ✅ Performance optimization
- ✅ TypeScript types
- ✅ Form handling
- ✅ Data fetching

---

## 🎯 PROJECT STRUCTURE

### Two Separate Frontends

#### 1. Admin Panel (`resources/js/`)
- **Tech**: React 18 + Vite + Mantine UI + TypeScript
- **Deployment**: With Laravel (shared hosting)
- **UI Library**: Mantine UI (ONLY for admin)
- **State**: Zustand
- **Navigation**: React Router v7
- **Translations**: `resources/js/locales/`

#### 2. Storefront (`storefront/`)
- **Tech**: Next.js 16 (App Router) + React 19
- **Deployment**: Vercel (separate from Laravel)
- **UI Library**: Pure React + Tailwind (NO Mantine!)
- **State**: Zustand
- **Navigation**: Next.js App Router
- **Translations**: `storefront/src/locales/`

---

## 🔒 CRITICAL RULE

### ⚠️ Admin ≠ Storefront

They are **COMPLETELY DIFFERENT** projects:

| Feature | Admin Panel | Storefront |
|---------|-------------|------------|
| **Framework** | React 18 + Vite | Next.js 16 |
| **UI Library** | Mantine UI | Pure React + Tailwind |
| **Deployment** | Shared hosting (cPanel) | Vercel |
| **Translations** | `resources/js/locales/` | `storefront/src/locales/` |
| **Routing** | React Router v7 | Next.js App Router |
| **Optimization** | Code splitting | Server Components |

**NEVER**:
- ❌ Use Mantine in storefront
- ❌ Use Next.js in admin panel
- ❌ Share translation files
- ❌ Mix navigation patterns

---

## 💻 CODE CRAFT

### 1. Type-Safety (MANDATORY)

**Rule**: NO `any` types - Use proper TypeScript + Zod

**❌ WRONG**:
```typescript
const [products, setProducts] = useState<any[]>([])
const response: any = await getProducts()
```

**✅ CORRECT**:
```typescript
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

**Benefits**:
- Catch errors at compile time
- Better IDE autocomplete
- Self-documenting code
- Runtime validation with Zod

---

### 2. Immutability (MANDATORY)

**Rule**: Never mutate state - always return new objects

**❌ WRONG** (Direct mutation):
```typescript
const addItem = (item) => {
  state.items.push(item) // Mutates!
  state.total += item.price // Mutates!
}
```

**✅ CORRECT** (Immutable):
```typescript
const addItem = (item: Item) => ({
  ...state,
  items: [...state.items, item],
  total: state.total + item.price,
})
```

**Zustand Example**:
```typescript
// ❌ WRONG
const useStore = create((set) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      state.items.push(item) // DON'T DO THIS
      return state
    })
  }
}))

// ✅ CORRECT
const useStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    ...state,
    items: [...state.items, item],
  })),
}))
```

---

### 3. Optimistic UI Updates

**Rule**: Update UI instantly, rollback on error (NO spinners)

**❌ WRONG** (Blocks everything):
```typescript
const handleDelete = async (id: number) => {
  setLoading(true) // Blocks UI!
  await deleteItem(id)
  setLoading(false)
  fetchItems() // Re-fetch everything
}
```

**✅ CORRECT** (Optimistic):
```typescript
const handleDelete = (id: number) => {
  // Save original for rollback
  const originalItem = items.find(item => item.id === id)

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

---

### 4. Skeleton Loading States

**Rule**: Use shimmer/skeleton (not blocking spinners)

**❌ WRONG**:
```typescript
if (loading) {
  return <Loader size="xl" />
}
```

**✅ CORRECT**:
```typescript
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

**Benefits**:
- Better perceived performance
- User sees content structure
- App feels faster

---

### 5. Zero Layout Shift (CLS)

**Rule**: Always set `aspect-ratio` or `min-height` for images

**❌ WRONG** (Layout shifts):
```typescript
<img src={product.thumbnail} alt={product.name} />
```

**✅ CORRECT** (No shift):
```typescript
<img
  src={product.thumbnail}
  alt={product.name}
  className="aspect-square w-full h-auto"
  style={{ minHeight: '200px' }}
/>
```

---

### 6. Stale-While-Revalidate (SWR)

**Rule**: Show cached data first, revalidate in background

**❌ WRONG** (Always wait):
```typescript
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
```

**✅ CORRECT** (SWR pattern):
```typescript
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

---

## 🚀 PERFORMANCE

### Server Components (Storefront)

**Rule**: Use Next.js Server Components by default

**✅ Server Component** (Default):
```typescript
// app/products/page.tsx - No "use client" directive
async function ProductsPage() {
  const products = await fetchProducts() // Runs on server
  return <ProductList products={products} />
}
```

**❌ Client Component** (Only when needed):
```typescript
'use client'
export function ProductFilters() {
  const [filters, setFilters] = useState() // Needs interactivity
  // ...
}
```

**Benefits**:
- Reduced client-side JavaScript
- Faster initial page load
- Better SEO
- Server-side data fetching

---

### Bundle Budgeting

**Limits**:
- Initial JS: < 200KB gzipped
- Route chunks: < 100KB gzipped
- Vendor bundle: < 300KB gzipped

**Before adding any library**:
```bash
# Check bundle size
npm install package-name
npm run build

# Check on bundlephobia.com
# https://bundlephobia.com/package/package-name
```

**Heavy libraries to AVOID**:
- ❌ `moment` (67 KB) → Use `dayjs` (2 KB)
- ❌ `lodash` (70 KB) → Use `lodash-es` (24 KB) or native methods
- ❌ `bootstrap` (150 KB) → Use `tailwindcss` (JIT, ~10 KB)

---

## 🎨 UI RULES

### Admin Panel (Mantine UI)
- ✅ Mantine components only
- ✅ Tailwind CSS only
- ✅ Tabler Icons only
- ✅ Design: Calm, Clean, Non-aggressive

### Storefront (Pure React + Tailwind)
- ✅ React components + Tailwind only
- ✅ NO Mantine UI
- ✅ Modern e-commerce design
- ✅ Mobile-first

---

## 📱 RESPONSIVE DESIGN

### Mobile-First
- Mobile = baseline, Desktop = enhancement
- NO hover states (tap/click/press only)
- Finger-friendly touch targets (min 44px)

### Data Rendering
- Desktop (md+) → Table view
- Mobile (<md) → Card view
- Use: `hidden md:block` and `block md:hidden`

---

## 🔤 TYPOGRAPHY

Mobile baseline. Desktop scales up:

- Body: `text-sm md:text-base`
- Section: `text-base md:text-lg lg:text-xl`
- Page: `text-lg md:text-xl lg:text-2xl`
- Always pair with: `leading-normal` or `leading-relaxed`

---

## 📋 FRONTEND CHECKLIST

Before committing code:

### TypeScript
- [ ] NO `any` types
- [ ] Proper interfaces/types defined
- [ ] Zod validation for API data

### Performance
- [ ] Bundle size checked
- [ ] Server Components used (storefront)
- [ ] Code splitting implemented
- [ ] Lazy loading for heavy components

### UX
- [ ] Optimistic UI updates
- [ ] Skeleton loading states
- [ ] No layout shift (CLS)
- [ ] Helpful error messages
- [ ] Micro-interactions on actions
- [ ] Keyboard navigation works

### Code Quality
- [ ] Immutable state updates
- [ ] No console.log statements
- [ ] Proper TypeScript types
- [ ] Components < 200 lines
- [ ] Descriptive variable/function names

---

## 💡 CODE EXAMPLES

See [instruction/examples/frontend.md](./examples/frontend.md) for:
- Type-safe components
- Zod validation
- Optimistic updates
- Skeleton states
- SWR implementation
- Server Components
- Keyboard navigation

---

## 📚 RELATED FILES

- **Main Reference**: [instruction/global-lean.md](./global-lean.md)
- **Backend Rules**: [instruction/backend.md](./backend.md)
- **UX Patterns**: [instruction/ux.md](./ux.md)
- **Full Docs**: [instruction/global.md](./global.md)

---

**Last Updated**: 2026-03-27
**Focus**: React 18 + Next.js 16 Frontend Development
