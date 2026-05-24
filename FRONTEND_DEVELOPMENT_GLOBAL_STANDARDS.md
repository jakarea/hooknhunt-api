# Frontend Development Global Standards
## Hook & Hunt E-Commerce Platform - Official Development Guidelines

**Version:** 1.0.0  
**Last Updated:** 2025-05-24  
**Status:** **MANDATORY FOR ALL FRONTEND DEVELOPERS**

---

## 🎯 MISSION STATEMENT

Build a **world-class, production-ready e-commerce frontend** that is:
- ⚡ **Blazing fast** (Vercel-competitive performance)
- 🔒 **Secure by default**
- 🧩 **100% modular & independent**
- 📖 **Human-readable & maintainable**
- 🚀 **SPA-first** (zero page reloads)

---

## 📋 TABLE OF CONTENTS

1. [Naming Conventions](#1-naming-conventions)
2. [Code Structure & Modularity](#2-code-structure--modularity)
3. [State Management (Zustand)](#3-state-management-zustand)
4. [API Integration](#4-api-integration)
5. [Error Handling](#5-error-handling)
6. [Performance Optimization](#6-performance-optimization)
7. [Security Standards](#7-security-standards)
8. [Development Workflow](#8-development-workflow)
9. [Testing & Validation](#9-testing--validation)
10. [Code Review Checklist](#10-code-review-checklist)

---

## 1. NAMING CONVENTIONS

### **1.1 File & Folder Naming**

```
✅ CORRECT:
components/product/ProductCard.tsx
hooks/useProductList.ts
stores/useCartStore.ts
utils/imageHelper.ts
types/api.types.ts
features/auth/login/

❌ WRONG:
components/ProductCard.tsx
hooks/useProductList.ts
stores/cartStore.ts
utils/helper.ts
```

**Rules:**
- **Lowercase** with **hyphens** for folders
- **PascalCase** for **components**
- **camelCase** with **use prefix** for hooks
- **camelCase** with **Store suffix** for Zustand stores
- **camelCase** for **utility functions**
- **kebab-case** for **feature folders**

### **1.2 Variable & Function Naming**

```typescript
// ✅ PURE FUNCTIONS - Verb + Noun pattern
function getUserById(id: string): User | null { }
function calculateCartTotal(items: CartItem[]): number { }
function formatImageUrl(path: string | null): string { }
function validateEmail(email: string): boolean { }

// ✅ ASYNC FUNCTIONS - Same pattern with async
async function fetchProducts(): Promise<Product[]> { }
async function submitOrder(data: OrderData): Promise<OrderResponse> { }

// ✅ BOOLEANS - is/has/should prefix
const isActive: boolean = true
const hasVariants: boolean = false
const shouldRefresh: boolean = true

// ✅ CONSTANTS - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://hooknhunt-api.test'
const MAX_RETRIES = 3
const DEFAULT_PAGE_SIZE = 20

// ❌ WRONG
function getData() { } // Too vague
function user() { } // Not a verb
const active = true // Missing prefix
const apiUrl = '...' // Not constant
```

### **1.3 Component Naming**

```typescript
// ✅ PascalCase for components
function ProductCard({ product }: Props) { }
function UserLoginForm() { }
function OrderSummary() { }

// ✅ HOC pattern - with prefix
function withAuthProtection(Component: React.ComponentType) { }
function withLoadingState(Component: React.ComponentType) { }

// ✅ Context providers - Provider suffix
function AuthProvider({ children }: Props) { }
function CartProvider({ children }: Props) { }
```

### **1.4 Type & Interface Naming**

```typescript
// ✅ PascalCase for types
type Product = { }
type CartItem = { }
type ApiResponse<T> = { }

// ✅ Interface for shapes with behavior
interface IUserService {
  login(): Promise<void>
  logout(): void
}

// ✅ Generic types - T prefix
type ApiResponse<T> = {
  data: T
  status: boolean
}

// ✅ Props interfaces - Props suffix
interface ProductCardProps {
  product: Product
  onAddToCart?: () => void
}

// ❌ WRONG
type product = { } // Lowercase
interface IProduct { } // No I prefix (not C#)
type user_data = { } // Snake case
```

### **1.5 Enum & Constant Naming**

```typescript
// ✅ PascalCase for enums
enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

// ✅ Descriptive string unions (preferred over enums)
type MediaType = 'image' | 'video'
type UserRole = 'admin' | 'customer' | 'guest'

// ✅ Constant objects - PascalCase
const OrderStatusLabels = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
} as const
```

---

## 2. CODE STRUCTURE & MODULARITY

### **2.1 Feature-Based Architecture**

```
src/
├── features/                    # Feature modules (100% independent)
│   ├── auth/                   # Authentication feature
│   │   ├── components/         # Auth-only components
│   │   ├── hooks/              # Auth-only hooks
│   │   ├── stores/             # Auth state
│   │   ├── services/           # API calls
│   │   ├── types/              # Auth types
│   │   └── index.ts            # Public API
│   ├── products/               # Products feature
│   │   └── ...
│   ├── cart/                   # Cart feature
│   │   └── ...
│   └── orders/                 # Orders feature
│       └── ...
├── shared/                     # Shared utilities (no feature logic)
│   ├── ui/                     # Reusable UI components
│   ├── hooks/                  # Shared hooks (useForm, useDebounce)
│   ├── utils/                  # Pure utilities
│   └── types/                  # Shared types
└── config/                     # Configuration
```

### **2.2 Module Independence Rules**

```typescript
// ✅ CORRECT - Module exports clean API
// features/auth/index.ts
export { useAuth } from './hooks/useAuth'
export { AuthProvider } from './components/AuthProvider'
export type { User, LoginCredentials } from './types'

// ✅ CORRECT - Other features import from module API
import { useAuth } from '@/features/auth'

// ❌ WRONG - Importing internal files
import { useAuthInternal } from '@/features/auth/hooks/useAuthInternal'
```

### **2.3 Component Structure (Single Responsibility)**

```typescript
// ✅ CORRECT - Small, focused components
components/
├── ProductCard/
│   ├── ProductCard.tsx          # Main component
│   ├── ProductCard.types.ts    # Types
│   ├── ProductCard.test.tsx    # Tests
│   └── index.ts                # Export
├── ProductImage/
│   ├── ProductImage.tsx
│   └── ProductImage.types.ts
└── ProductPrice/
    ├── ProductPrice.tsx
    └── ProductPrice.types.ts

// ❌ WRONG - Large, multi-purpose component
components/
└── Product.tsx                  # 1000+ lines, does everything
```

### **2.4 Barrel Exports (index.ts)**

```typescript
// ✅ CORRECT - Clean public API for each module
// features/products/components/index.ts
export { ProductCard } from './ProductCard'
export { ProductList } from './ProductList'
export { ProductGrid } from './ProductGrid'
export type { ProductCardProps } from './ProductCard/ProductCard.types'

// ✅ Usage - Clean imports
import { ProductCard, ProductList } from '@/features/products/components'
```

---

## 3. STATE MANAGEMENT (ZUSTAND)

### **3.1 Store Structure**

```typescript
// ✅ CORRECT - Flat, focused stores
stores/
├── useAuthStore.ts      # Authentication only
├── useCartStore.ts      # Cart & checkout only
├── useProductStore.ts   # Products & filtering only
└── useUIStore.ts        # UI state (modals, sidebars)

// ❌ WRONG - Large, multi-purpose store
stores/
└── useGlobalStore.ts    # 500+ lines, handles everything
```

### **3.2 Store Template**

```typescript
// stores/useCartStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  product_id: string
  quantity: number
  image_url: string
  product_name: string
  price: number
}

interface CartState {
  // State
  items: CartItem[]
  isLoaded: boolean
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  hydrate: () => Promise<void>
  
  // Computed
  subtotal: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      isLoaded: false,
      
      // Actions - Pure functions only
      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.product_id === item.product_id)
        if (existing) {
          return {
            items: state.items.map(i =>
              i.product_id === item.product_id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          }
        }
        return {
          items: [...state.items, { ...item, id: crypto.randomUUID() }]
        }
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, quantity } : item
        ).filter(item => item.quantity > 0)
      })),
      
      clearCart: () => set({ items: [] }),
      
      hydrate: async () => {
        const { data } = await api.get('/cart')
        set({ items: data, isLoaded: true })
      },
      
      // Computed values
      subtotal: () => get().items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      ),
      
      totalItems: () => get().items.reduce((sum, item) => 
        sum + item.quantity, 0
      ),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
)
```

### **3.3 Store Rules**

1. **One concern per store** (auth, cart, products, UI)
2. **Pure functions only** - no side effects in actions
3. **Async actions in thunks** - use actions for async logic
4. **Persist only necessary data** - use `partialize`
5. **No computed state in store** - use selectors instead

```typescript
// ✅ CORRECT - Selector for computed values
function useCartSubtotal() {
  return useCartStore(state => state.subtotal())
}

// ❌ WRONG - Stored computed value
interface CartState {
  subtotal: number  // This changes too often, don't store
}
```

### **3.4 Async Actions Pattern**

```typescript
// ✅ CORRECT - Async actions with error handling
interface ProductState {
  products: Product[]
  isLoading: boolean
  error: string | null
  
  fetchProducts: () => Promise<void>
  searchProducts: (query: string) => Promise<void>
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  
  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/api/v2/store/products')
      set({ products: response.data.data, isLoading: false })
    } catch (error) {
      set({ 
        error: handleApiError(error),
        isLoading: false 
      })
    }
  },
  
  searchProducts: async (query) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/api/v2/store/search?q=${query}`)
      set({ products: response.data.data, isLoading: false })
    } catch (error) {
      set({ 
        error: handleApiError(error),
        isLoading: false 
      })
    }
  },
}))
```

---

## 4. API INTEGRATION

### **4.1 API Service Layer**

```typescript
// services/api.ts
import axios, { AxiosError, AxiosResponse } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hooknhunt-api.test'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Typed API response
interface ApiResponse<T> {
  status: boolean
  message: string
  data: T
  errors: Record<string, string[]> | null
}

interface ApiErrorResponse {
  message: string
  errors?: Record<string, string[]>
}

// Generic API methods
export const apiService = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<T>>(url, { params }).then(res => res.data),
  
  post: <T>(url: string, data: unknown) =>
    api.post<ApiResponse<T>>(url, data).then(res => res.data),
  
  put: <T>(url: string, data: unknown) =>
    api.put<ApiResponse<T>>(url, data).then(res => res.data),
  
  patch: <T>(url: string, data: unknown) =>
    api.patch<ApiResponse<T>>(url, data).then(res => res.data),
  
  delete: <T>(url: string) =>
    api.delete<ApiResponse<T>>(url).then(res => res.data),
}
```

### **4.2 Feature-Based API Services**

```typescript
// features/products/services/api.ts
import { apiService } from '@/services/api'

export interface ProductSearchParams {
  page?: number
  per_page?: number
  category_id?: string
  search?: string
  sort_by?: string
}

export const productApi = {
  // List products
  list: (params: ProductSearchParams = {}) =>
    apiService.get<ProductListResponse>('/api/v2/store/products', params),
  
  // Get single product
  get: (slug: string) =>
    apiService.get<Product>(`/api/v2/store/products/${slug}`),
  
  // Get featured products
  featured: (limit = 12) =>
    apiService.get<Product[]>('/api/v2/store/products/featured', { limit }),
  
  // Search products
  search: (query: string, params?: ProductSearchParams) =>
    apiService.get<Product[]>('/api/v2/store/search', { q: query, ...params }),
  
  // Get product suggestions
  suggestions: (query: string) =>
    apiService.get<Suggestion[]>('/api/v2/store/search/suggestions', { q: query }),
}
```

### **4.3 API Response Type Definitions**

```typescript
// types/api.types.ts

// ✅ Use exact API response structure
export interface Product {
  id: number
  name: string
  slug: string
  retailName: string
  nameBn: string
  
  // Image - Standardized format
  image_url: string
  image_id: number | null
  
  // Gallery
  gallery_images: Array<{
    image_url: string
  }>
  
  // Pricing
  price: number
  actual_price: number
  originalPrice: number
  compare_at_price: number
  
  // Stock
  stock: number
  inventory_quantity: number
  variant_count: number
}

export interface Category {
  id: number
  name: string
  slug: string
  
  // Image - Standardized format
  image_url: string
  image_id: number | null
}

export interface Slider {
  id: number
  media_type: 'image' | 'video'
  image_url: string | null
  video_url: string | null
  
  // Content
  capsule_title: string
  title: string
  sub_title: string
  features_list: string[]
  
  // CTAs
  cta1_label: string
  cta1_link: string
  cta2_label: string
  cta2_link: string
}

export interface Review {
  id: number
  rating: number
  review_text: string
  is_featured: boolean
  created_at: string
  
  // Image - Standardized format
  image_url: string
  image_id: number | null
}
```

### **4.4 API Call Patterns**

```typescript
// ✅ CORRECT - Using hooks for data fetching
function useProducts(params: ProductSearchParams = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let cancelled = false
    
    async function fetchProducts() {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await productApi.list(params)
        if (!cancelled) {
          setProducts(response.data.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(handleApiError(err))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    
    fetchProducts()
    
    return () => {
      cancelled = true
    }
  }, [JSON.stringify(params)])
  
  return { products, isLoading, error }
}

// ❌ WRONG - Direct API calls in components
function ProductList() {
  useEffect(() => {
    axios.get('/api/products').then(res => {
      setProducts(res.data)
    })
  }, [])
}
```

---

## 5. ERROR HANDLING

### **5.1 Error Types**

```typescript
// utils/errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    public errors: Record<string, string[]>
  ) {
    super('Validation failed')
    this.name = 'ValidationError'
  }
}
```

### **5.2 Error Handler**

```typescript
// utils/errorHandler.ts

export function handleApiError(error: unknown): string {
  // Network error
  if (error instanceof AxiosError && !error.response) {
    return 'Network error. Please check your connection.'
  }
  
  // API error
  if (error instanceof AxiosError && error.response) {
    const data = error.response.data as ApiErrorResponse
    
    // Validation errors
    if (error.response.status === 422 && data.errors) {
      return Object.values(data.errors).flat().join(', ')
    }
    
    // Other errors
    return data.message || 'An error occurred'
  }
  
  // Unknown error
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}
```

### **5.3 Error Display Component**

```typescript
// components/ui/ErrorAlert.tsx

interface ErrorAlertProps {
  error: string | null
  onDismiss?: () => void
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="ml-3">
            <X className="h-5 w-5 text-red-600" />
          </button>
        )}
      </div>
    </div>
  )
}
```

### **5.4 Error Boundaries**

```typescript
// components/ErrorBoundary.tsx

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
    // Log to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }
    
    return this.props.children
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-600">{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}
```

---

## 6. PERFORMANCE OPTIMIMIZATION

### **6.1 Code Splitting**

```typescript
// ✅ CORRECT - Route-based code splitting
import { lazy } from 'react'

const HomePage = lazy(() => import('@/features/home/HomePage'))
const ProductPage = lazy(() => import('@/features/products/ProductPage'))
const CartPage = lazy(() => import('@/features/cart/CartPage'))
const CheckoutPage = lazy(() => import('@/features/checkout/CheckoutPage'))

// ❌ WRONG - Importing everything upfront
import { HomePage } from '@/features/home/HomePage'
import { ProductPage } from '@/features/products/ProductPage'
```

### **6.2 Component Memoization**

```typescript
// ✅ CORRECT - Memoize expensive components
export const ProductCard = React.memo(function ProductCard({ product }: Props) {
  return (
    <div className="product-card">
      <img src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  )
})

// ✅ CORRECT - Memoize callbacks
function ProductList({ products }: Props) {
  const addToCart = useCallback((productId: string) => {
    cartStore.addItem(productId)
  }, [])
  
  return products.map(product => (
    <ProductCard 
      key={product.id} 
      product={product}
      onAddToCart={addToCart}
    />
  ))
}
```

### **6.3 Image Optimization**

```typescript
// ✅ CORRECT - Next.js Image with optimization
import Image from 'next/image'

function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={400}
      loading="lazy"
      placeholder="blur"
      blurDataURL="/placeholder.jpg"
    />
  )
}

// ✅ CORRECT - Progressive image loading
function ProgressiveImage({ src, alt }: Props) {
  const [imgSrc, setImgSrc] = useState('/placeholder.jpg')
  
  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => setImgSrc(src)
  }, [src])
  
  return <img src={imgSrc} alt={alt} className={imgSrc === src ? 'loaded' : 'loading'} />
}
```

### **6.4 List Virtualization**

```typescript
// ✅ CORRECT - Use react-window for long lists
import { FixedSizeList } from 'react-window'

function ProductList({ products }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={200}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ProductCard product={products[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

### **6.5 Debouncing & Throttling**

```typescript
// hooks/useDebounce.ts

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

// Usage
function SearchBar() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  
  useEffect(() => {
    if (debouncedQuery) {
      productApi.search(debouncedQuery).then(setResults)
    }
  }, [debouncedQuery])
  
  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search products..."
    />
  )
}
```

---

## 7. SECURITY STANDARDS

### **7.1 XSS Prevention**

```typescript
// ✅ CORRECT - React auto-escapes
function ProductDescription({ description }: { description: string }) {
  return <p>{description}</p>  // Auto-escaped
}

// ❌ WRONG - Dangerous innerHTML
function ProductDescription({ description }: { description: string }) {
  return <p dangerouslySetInnerHTML={{ __html: description }} />
}

// ✅ CORRECT - If you must use HTML (sanitize first)
import DOMPurify from 'dompurify'

function RichTextContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html)
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

### **7.2 CSRF Protection**

```typescript
// ✅ CORRECT - Include CSRF token
api.interceptors.request.use((config) => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (token) {
    config.headers['X-CSRF-TOKEN'] = token
  }
  return config
})
```

### **7.3 Secure Data Storage**

```typescript
// ✅ CORRECT - Use secure storage
const SECURE_STORAGE = {
  
  // For auth tokens - use httpOnly cookies (set by server)
  
  // For non-sensitive data - use localStorage
  setPreferences: (key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value))
  },
  
  getPreferences: <T>(key: string): T | null => {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  },
  
  // For temporary data - use sessionStorage
  setTemporaryData: (key: string, value: unknown) => {
    sessionStorage.setItem(key, JSON.stringify(value))
  },
  
  // NEVER store sensitive data in localStorage/sessionStorage
}

// ❌ WRONG
localStorage.setItem('password', password)  // NEVER DO THIS
localStorage.setItem('creditCard', cardNumber)  // NEVER DO THIS
```

### **7.4 Input Validation**

```typescript
// utils/validation.ts

export const validators = {
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  },
  
  phone: (phone: string): boolean => {
    return /^01[3-9]\d{8}$/.test(phone)
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },
  
  // Sanitize user input
  sanitizeString: (input: string): string => {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  },
}
```

---

## 8. DEVELOPMENT WORKFLOW

### **8.1 Task Planning Process**

**MANDATORY FOR ALL TASKS:**

```
1. UNDERSTAND REQUIREMENTS
   ├─ Read task description completely
   ├─ Identify all affected modules
   ├─ List required API endpoints
   └─ Note any breaking changes

2. QUESTIONS & CLARIFICATIONS
   ├─ Ask questions before starting
   ├─ Confirm API field names (check documentation)
   ├─ Verify module boundaries
   └─ Get approval for approach

3. CREATE TASK TODO LIST
   ├─ Break down into sub-tasks
   ├─ Estimate complexity
   ├─ Identify dependencies
   └─ Order by priority

4. VALIDATE PLAN
   ├─ Review with team/senior dev
   ├─ Check for edge cases
   ├─ Verify performance impact
   └─ Get final approval

5. EXECUTE
   ├─ Follow todo list order
   ├─ Test each sub-task
   ├─ Commit frequently
   └─ Update progress

6. CODE REVIEW
   ├─ Self-review before PR
   ├─ Check all requirements met
   ├─ Verify no regressions
   └─ Document changes
```

### **8.2 Pre-Task Checklist**

Before starting ANY task, confirm:

- [ ] I understand the complete requirement
- [ ] I know which modules are affected
- [ ] I have the latest API documentation
- [ ] I know the exact field names to use
- [ ] I've asked all unclear questions
- [ ] I have a plan with todo list
- [ ] I've estimated complexity correctly
- [ ] I know the acceptance criteria

### **8.3 Git Commit Standards**

```bash
# Commit message format
<type>(<scope>): <subject>

<body>

<footer>

# Types
feat:     New feature
fix:      Bug fix
refactor: Code refactoring (no behavior change)
perf:     Performance improvement
style:    Code style changes (formatting)
test:     Adding or updating tests
docs:     Documentation only
chore:    Maintenance tasks

# Examples
feat(products): add product image lazy loading

- Implemented Intersection Observer for images
- Added placeholder blur effect
- Improved LCP by 40%

Fixes #123

fix(auth): resolve token refresh race condition

The token refresh logic had a race condition where
multiple simultaneous requests could trigger multiple
refresh attempts. This fix uses a singleton pattern
to ensure only one refresh happens at a time.

Closes #456
```

---

## 9. TESTING & VALIDATION

### **9.1 Component Testing**

```typescript
// components/ProductCard/ProductCard.test.tsx

import { render, screen } from '@testing-library/react'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    slug: 'test-product',
    image_url: 'https://example.com/image.jpg',
    image_id: 123,
    price: 99.99,
    actual_price: 99.99,
    originalPrice: 99.99,
    compare_at_price: 99.99,
    stock: 10,
    inventory_quantity: 10,
    variant_count: 1,
    retailName: 'Test Product',
    nameBn: 'টেস্ট প্রোডাক্ট',
    gallery_images: [],
  }
  
  it('renders product name correctly', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })
  
  it('renders product image with correct src', () => {
    render(<ProductCard product={mockProduct} />)
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })
  
  it('renders price correctly', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })
  
  it('shows out of stock when inventory is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 }
    render(<ProductCard product={outOfStockProduct} />)
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })
})
```

### **9.2 Integration Testing**

```typescript
// features/products/services/api.test.ts

import { productApi } from './api'
import { api } from '@/services/api'

vi.mock('@/services/api')

describe('productApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('list', () => {
    it('fetches products with correct params', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, name: 'Product' }],
          total: 1,
          last_page: 1,
        }
      }
      
      vi.mocked(api.get).mockResolvedValueOnce(mockResponse)
      
      const result = await productApi.list({ page: 1, per_page: 20 })
      
      expect(api.get).toHaveBeenCalledWith('/api/v2/store/products', {
        page: 1,
        per_page: 20,
      })
      expect(result.data).toEqual([{ id: 1, name: 'Product' }])
    })
  })
})
```

### **9.3 E2E Testing Checklist**

Before marking task complete:

- [ ] Feature works on Chrome
- [ ] Feature works on Firefox
- [ ] Feature works on Safari
- [ ] Feature works on Mobile (iOS)
- [ ] Feature works on Mobile (Android)
- [ ] No console errors
- [ ] No network errors
- [ ] Images load correctly
- [ ] Forms validate properly
- [ ] Loading states display
- [ ] Error states display
- [ ] Page performance is good (Lighthouse score > 90)

---

## 10. CODE REVIEW CHECKLIST

### **10.1 Before Submitting PR**

**Code Quality:**
- [ ] Code follows naming conventions
- [ ] Functions are pure (no side effects)
- [ ] Components are small (< 200 lines)
- [ ] No duplicate code
- [ ] No commented-out code
- [ ] No console.log statements

**Performance:**
- [ ] No unnecessary re-renders
- [ ] Images are lazy-loaded
- [ ] Large lists are virtualized
- [ ] Code splitting implemented
- [ ] No memory leaks

**Security:**
- [ ] No XSS vulnerabilities
- [ ] Input validation on forms
- [ ] API errors handled properly
- [ ] Sensitive data not exposed
- [ ] CSRF protection in place

**Testing:**
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Manual testing completed
- [ ] Edge cases covered

**Documentation:**
- [ ] Complex functions commented
- [ ] Props documented
- [ ] API integration documented
- [ ] Breaking changes noted

---

## 🚀 QUICK REFERENCE

### **Common Patterns**

```typescript
// ✅ Component template
function ComponentName({ prop }: Props) {
  // 1. Hooks
  const [state, setState] = useState()
  const store = useSomeStore()
  
  // 2. Effects
  useEffect(() => {
    // Side effects here
    return () => {
      // Cleanup
    }
  }, [])
  
  // 3. Handlers
  const handleClick = useCallback(() => {
    // Handle click
  }, [])
  
  // 4. Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

// ✅ Hook template
function useHookName() {
  const [state, setState] = useState()
  
  useEffect(() => {
    // Effect
  }, [])
  
  return { state, setState }
}

// ✅ Store template
export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      // State
      state: initialValue,
      
      // Actions
      action: (payload) => set((state) => ({
        ...state,
        state: payload
      })),
    })),
    { name: 'feature-storage' }
  )
)
```

---

## 📚 ADDITIONAL RESOURCES

- **Next.js Docs:** https://nextjs.org/docs
- **Zustand Docs:** https://zustand-demo.pmnd.rs
- **React Docs:** https://react.dev
- **TypeScript Docs:** https://www.typescriptlang.org/docs
- **Vercel Deployment:** https://vercel.com/docs

---

## 📞 EMERGENCY CONTACTS

For critical questions blocking development:

1. **Tech Lead:** [Contact info]
2. **Senior Frontend Dev:** [Contact info]
3. **Backend Lead:** [Contact info]

---

## 📝 VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-05-24 | Initial version - Image URL standardization |

---

**Remember:** When in doubt, ASK. It's better to spend 5 minutes clarifying than 5 hours fixing the wrong implementation.

**Quality over speed.** A slow, correct solution is better than a fast, broken one.

**Test everything.** If you didn't test it, it doesn't work.

**Document your code.** Future you will thank present you.
