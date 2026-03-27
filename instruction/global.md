---

# 🌍 GLOBAL ENGINEERING MODE

## 🎯 PROJECT STRUCTURE (IMPORTANT: 2 SEPARATE PROJECTS)

This is a **hybrid monorepo** containing:

### **Project 1: Laravel API + Admin Panel** (`hooknhunt-api/`)
- **Backend:** Laravel 12 REST API
- **Admin Panel:** React 18 + Vite + Mantine UI (in `resources/js/` subfolder)
- **Deployment:** Shared cPanel hosting
- **Tech Stack:**
  - Backend: Laravel 12, PSR-12, Clean Architecture
  - Admin: React 18, TypeScript, Zustand, React Router v7, Tailwind CSS, Mantine UI
- **Translations:** `resources/js/locales/en/` and `locales/bn/`

### **Project 2: Next.js Storefront** (`storefront/`)
- **Frontend:** Next.js 16 (App Router) + React 19
- **Deployment:** Vercel (COMPLETELY SEPARATE from Laravel)
- **Tech Stack:**
  - Next.js 16, React 19, TypeScript
  - Tailwind CSS (NO Mantine UI!)
  - Zustand state management
- **Translations:** `src/locales/en/` and `locales/bn/` (SEPARATE from admin!)
- **API:** Connects to Laravel backend via API rewrites

---

## 🔧 TECH STACK SUMMARY

**Laravel API + Admin Panel (hooknhunt-api/):**
- Backend: Laravel 12 (REST API, PSR-12, Clean Architecture)
- Admin: React 18 + Vite + Mantine UI + TypeScript
- State: Zustand stores
- Navigation: React Router v7
- Translations: `resources/js/locales/`

**Next.js Storefront (storefront/):**
- Framework: Next.js 16 (App Router) + React 19
- UI: Pure React + Tailwind CSS (NO Mantine!)
- State: Zustand stores
- Navigation: Next.js App Router with `<Link>`
- Translations: `src/locales/` (COMPLETELY SEPARATE from admin)
- Deployment: Vercel (NOT with Laravel)

---

# 🏆 TOP 1% ENGINEERING PRINCIPLES

This project follows **TOP 1% engineering standards** for maintainability, scalability, and developer experience.

## Core Principles (Non-Negotiable)

### 🏛 Architecture: Domain-Driven & Contract-First
1. **Domain-Driven Design (DDD) Lite**: Folder structure organized by business domains (Billing, Inventory, Auth), not just technical layers
2. **Contract-First Development**: OpenAPI/Swagger schema defined BEFORE code
3. **DTOs (Data Transfer Objects)**: Never pass `$request->all()` - always use typed DTOs
4. **Event-Driven Side Effects**: All Mail/SMS/Notifications via Queue + Events (never block main request)

### 💻 Code Craft: Robustness & Predictability
5. **Railway Oriented Programming**: Use Result objects (Success/Failure) for user errors, not exceptions
6. **Type-Safety**: NO `any` types - use Discriminated Unions, Generics, and **Zod for runtime validation**
7. **Immutability**: Never mutate data - always return new objects/arrays

### ✨ UX Engineering: Cognitive Load & Flow
8. **Optimistic UI Updates**: No full-page spinners - update UI instantly, rollback on error
9. **Skeleton States**: Use shimmer/skeleton loading (not blocking spinners)
10. **Zero Layout Shift (CLS)**: Always set `aspect-ratio` or `min-height` for images
11. **Micro-interactions**: Every action has small animation (Framer Motion or Mantine transitions)

### 🚀 Performance: The "Sub-Second" Rule
12. **Edge-Ready & RSC First**: Next.js Server Components by default, minimal client JS
13. **Atomic Transactions**: Always use `DB::transaction()` for multi-table updates
14. **Stale-While-Revalidate (SWR)**: Show cached data first, revalidate in background

### 🧘 UX Mental Peace: Beyond Functions
15. **Error Empathy**: Solution-oriented error messages (NOT "An error occurred")
16. **Keyboard First**: Admin forms must work without mouse (Tab, Enter, Arrow keys)

## Quick Reference Checklist

### Backend (Laravel 12)
- [ ] Use DTOs (Data Transfer Objects) - NO `$request->all()`
- [ ] All side effects in Queue/Events - NEVER block request
- [ ] Use `DB::transaction()` for multi-table operations
- [ ] Return Result objects for user errors (not exceptions)
- [ ] Organize by Domain (DDD), not just technical layers
- [ ] Define OpenAPI/Swagger schema before coding

### Frontend (React 18 + Next.js 16)
- [ ] NO `any` types - always use proper TypeScript types
- [ ] Zod validation for ALL API data
- [ ] Optimistic UI updates - NO full-page spinners
- [ ] Skeleton/Shimmer loading states
- [ ] `aspect-ratio` or `min-height` for all images
- [ ] Immutable state updates (Zustand)
- [ ] SWR pattern for data fetching
- [ ] Keyboard navigation for all forms

### Performance
- [ ] Bundle size check before adding any library
- [ ] Use Server Components by default (Next.js)
- [ ] Minimize client-side JavaScript
- [ ] Code splitting with dynamic imports
- [ ] Lazy load heavy components

---

# 🏗 BACKEND (Laravel API - hooknhunt-api/)

## Architecture (TOP 1% ENGINEERING)

### Domain-Driven Design (DDD) Lite
- **Folder Structure**: Organize by **Domain** (Billing, Inventory, Auth, Procurement), not just Controller/Service
- **Benefit**: Codebase scales without complexity explosion
- **Example Structure**:
```
app/
├── Domain/
│   ├── Procurement/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Repositories/
│   │   ├── DTOs/
│   │   └── Models/
│   └── Finance/
│       ├── Controllers/
│       ├── Services/
│       └── Repositories/
```

### Contract-First Development
- **API Schema First**: Define OpenAPI/Swagger spec BEFORE writing code
- **Frontend & Backend**: Both follow the same "Contract"
- **Benefit**: Prevents integration issues, clear data structures
- **Tool**: Use `laravel-swagger` or manual OpenAPI specs in `docs/api/`

### DTOs (Data Transfer Objects) - MANDATORY
- **NO $request->all()**: Never pass raw request to service layer
- **Always Use Typed DTOs**: Predictable data flow, type safety
- **Example**:
```php
// ❌ WRONG - Direct request passing
public function createOrder(Request $request, OrderService $service) {
    return $service->create($request->all());
}

// ✅ CORRECT - Using DTO
public function createOrder(CreateOrderRequest $request, OrderService $service) {
    $orderData = new CreateOrderDTO($request->validated());
    return $service->createOrder($orderData);
}

// DTO Example
class CreateOrderDTO {
    public function __construct(
        public readonly string $customerName,
        public readonly float $totalAmount,
        public readonly array $items,
    ) {}
}
```

### Event-Driven Side Effects
- **Rule**: Main request must NEVER wait for Mail/SMS/Notification
- **Use**: Laravel Queue + Events/Listeners for all side effects
- **Goal**: Main request completes in < 100ms
- **Example**:
```php
// ❌ WRONG - Blocking request
public function createOrder($data) {
    $order = Order::create($data);
    Mail::to($order->customer)->send(new OrderConfirmation($order)); // Blocks!
    SMS::send($order->phone, 'Order created'); // Blocks!
    return $order;
}

// ✅ CORRECT - Event-driven
public function createOrder(CreateOrderDTO $data) {
    $order = Order::create($data->toArray());
    OrderCreated::dispatch($order); // Non-blocking
    return $order;
}

// Listener (runs in background queue)
class SendOrderConfirmation implements ShouldQueue {
    public function handle(OrderCreated $event) {
        Mail::to($event->order->customer)->send(new OrderConfirmation($event->order));
        SMS::send($event->order->phone, 'Order created');
    }
}
```

### Clean Architecture
- **Layers**: Controller → Service → Repository → Model
- **Thin Controllers**: Only HTTP handling, validation
- **Business Logic**: In services (testable, reusable)
- **Data Access**: In repositories (isolated queries)
- **SOLID Principles**: Single responsibility, dependency injection
- **PSR-12 Coding Standard**: Mandatory

## Security (NON-NEGOTIABLE)
- Form Request validation on ALL inputs
- Mass assignment protection (guarded/fillable)
- Authentication + Authorization (Policies/Gates)
- Never expose exceptions to client
- API must NEVER crash due to client behavior

## Performance
- Prevent N+1 (eager loading)
- Select only required columns
- Pagination for large datasets
- Use chunking for heavy processing
- **Atomic Transactions**: Always use `DB::transaction()` for multi-table updates
  - Partial save = architectural failure
  - All-or-nothing data consistency

---

# 💻 CODE CRAFT: Robustness & Predictability

## Railway Oriented Programming (Error Handling)
- **Rule**: Exceptions only for "Unrecoverable" errors
- **User Errors**: Use LogicResponse/Result objects (Success/Failure)
- **Benefit**: Predictable error flow, no hidden exceptions
- **Example**:
```php
// ❌ WRONG - Exceptions for everything
try {
    $order = $this->createOrder($data);
} catch (InsufficientStockException $e) {
    return response()->json(['error' => $e->getMessage()], 400);
}

// ✅ CORRECT - Result objects
class OrderService {
    public function createOrder(CreateOrderDTO $data): Result {
        if (!$this->hasEnoughStock($data->items)) {
            return Result::failure('Insufficient stock for selected items');
        }

        $order = DB::transaction(fn() => Order::create($data->toArray()));
        return Result::success($order);
    }
}

// Controller
public function store(CreateOrderRequest $request, OrderService $service) {
    $result = $service->createOrder(new CreateOrderDTO($request->validated()));

    if ($result->isFailure()) {
        return $this->sendError($result->getError(), null, 422);
    }

    return $this->sendSuccess($result->getData(), 'Order created', 201);
}
```

## Type-Safety (Frontend) - CRITICAL
- **NO `any` Type**: Using `any` means you surrendered
- **Use**: Discriminated Unions and Generics
- **Runtime Validation**: Zod is MANDATORY for API data
- **Example**:
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

## Immutability (Mandatory)
- **Avoid Mutation**: Never modify objects/arrays directly
- **Return New**: Always return new objects/arrays
- **Especially Important**: Zustand stores and Laravel Collections
- **Example**:
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

```php
// ❌ WRONG - Collection mutation
$products->transform(function ($product) {
    $product->price_with_tax = $product->price * 1.1;
    return $product;
});

// ✅ CORRECT - New collection
$productsWithTax = $products->map(function ($product) {
    return (object) [
        'id' => $product->id,
        'name' => $product->name,
        'price_with_tax' => $product->price * 1.1,
    ];
});
```

## Error Handling
```json
{
  success: boolean,
  message: string,
  data: object | array | null,
  meta?: pagination
}
```

---

# 📱 FRONTEND PROJECTS (TWO SEPARATE)

## 🎛 ADMIN PANEL (hooknhunt-api/resources/js/)

**Tech:** React 18 + Vite + Mantine UI + TypeScript
**Deployment:** With Laravel (shared hosting)

### UI Rules (STRICT)
- ✅ Mantine UI components only (no custom UI if Mantine has it)
- ✅ Tailwind CSS only (no inline styles)
- ✅ Tabler Icons only
- ✅ Design: Calm, Clean, Non-aggressive

### Mobile-First
- Mobile = baseline, Desktop = enhancement
- NO hover states (tap/click/press only)
- Finger-friendly touch targets
- Forms scroll when keyboard opens

### Responsive Data Rendering
- Desktop (md+) → Table view
- Mobile (<md) → Card view
- Use: `hidden md:block` and `block md:hidden`

### State Management (Zustand)
- Small, modular, predictable stores
- Selective selectors only
- Isolate side effects from UI

### Performance (CRITICAL)
- Assume low-end Android device
- useMemo, useCallback, Memoized components
- Never re-render full pages unnecessarily
- Optimize render cycles

### Navigation (STANDARD)
- ✅ `useNavigate()` hook (React Router)
- ❌ NEVER `window.location.href` (causes reloads)

### Translations
- Location: `resources/js/locales/en/` and `resources/js/locales/bn/`
- Use: `useTranslation()` hook from `react-i18next`

---

## 🛒 STOREFRONT (storefront/)

**Tech:** Next.js 16 (App Router) + React 19 + TypeScript
**Deployment:** Vercel (SEPARATE from Laravel)
**IMPORTANT:** This is a COMPLETELY DIFFERENT project from admin panel!

### UI Rules (STRICT)
- ✅ React components + Tailwind CSS only
- ✅ NO Mantine UI (storefront uses pure React + Tailwind)
- ✅ Design: Modern e-commerce, mobile-first
- ✅ Responsive design mandatory

### Mobile-First
- Mobile = baseline, Desktop = enhancement
- Touch-friendly interactions
- Finger-friendly tap targets (min 44px)

### Performance (CRITICAL)
- Assume low-end mobile devices
- Next.js Image optimization
- Code splitting with dynamic imports
- Lazy loading for components

### Navigation
- ✅ Next.js App Router (file-based routing)
- ✅ `<Link>` component for navigation (NOT `<a>` tags)
- ❌ NEVER `window.location.href` (causes full page reload)

### Translations (CRITICAL - DIFFERENT FROM ADMIN!)
- Location: `storefront/src/locales/en/` and `storefront/src/locales/bn/`
- Configuration: `storefront/src/lib/i18n.ts`
- Use: `useTranslation()` hook from `react-i18next`
- ⚠️ **NEVER** mix with admin panel translations

### API Integration
- API rewrites in `next.config.ts` proxy `/api/v1/*` to Laravel backend
- Update `NEXT_PUBLIC_API_URL` in `.env.local` for different environments
- Base URL defaults to: `http://192.168.0.166:8000/api/v1`

---

# 🧘 UX MENTAL PEACE (NON-NEGOTIABLE)

ERP = long-usage software → Mental peace = feature

## Optimistic UI Updates (TOP 1% UX)
- **NO Full-Page Spinners**: Spinners = defeat
- **Immediate Feedback**: User action → UI updates instantly → API call in background
- **Rollback on Error**: If API fails, revert UI change
- **Example**:
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

## Skeleton States vs. Spinners
- **Shimmer Effect**: Use skeleton screens during initial load
- **Perceived Performance**: App feels faster even if same load time
- **Use Mantine**: `<Skeleton height={40} />` component
- **Example**:
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

## Zero Layout Shift (CLS)
- **Problem**: Content jumps around when images load
- **Solution**: Always set `aspect-ratio` or `min-height`
- **Example**:
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

## Micro-interactions (Premium Feel)
- **Every Action**: Small animation (Framer Motion or Mantine transitions)
- **Examples**: Button press, status change, modal open/close
- **Benefit**: App feels "premium" and polished
- **Example**:
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

## Error Empathy (Human-Centric)
- **FORBIDDEN**: "An error occurred" message
- **REQUIRED**: Solution-oriented error messages
- **Example**:
```typescript
// ❌ WRONG - Useless error
{t('errors.general')} // "An error occurred"

// ✅ CORRECT - Helpful error
// "Your card has expired. Please use a different card."
// "Email already exists. Try logging in instead."
// "Network timeout. Check your connection and try again."
```

## Keyboard First (Admin Panel)
- **Goal**: Every form must work without mouse
- **Required**: Tab, Enter, Arrow keys navigation
- **Benefit**: 10x productivity boost for power users
- **Example**:
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

## Destructive Actions
- Always show confirmation dialog (Mantine `modals.openConfirmModal`)
- Calm, clear, non-threatening wording
- **NO `window.confirm()`** - Use Mantine modals only

## Feedback
- ✅ Success: Toast after create/update/delete
- ❌ Error: Human-readable, non-technical, calm (see Error Empathy above)
- 🔄 Loading: Smooth transitions, no flashing/blinking (use Skeleton UI)

---

# 🔤 Typography (Tailwind ONLY)

Mobile baseline. Desktop scales up.

- Body: `text-sm md:text-base`
- Section: `text-base md:text-lg lg:text-xl`
- Page: `text-lg md:text-xl lg:text-2xl`
- Always pair with: `leading-normal` or `leading-relaxed`

---

# 🌍 i18n (MANDATORY - DIFFERENT FOR EACH PROJECT)

All user-facing text MUST be translatable via `t()` function.

## Admin Panel Translations (hooknhunt-api/resources/js/)
**Location:**
- `resources/js/locales/en/[module-name].json`
- `resources/js/locales/bn/[module-name].json`

**Configuration:** `resources/js/lib/i18n.ts`

**Applies to:** Admin panel buttons, labels, toasts, errors, confirmations, dialogs

## Storefront Translations (storefront/)
**Location:**
- `storefront/src/locales/en/[module-name].json`
- `storefront/src/locales/bn/[module-name].json`

**Configuration:** `storefront/src/lib/i18n.ts`

**⚠️ CRITICAL:** These are TWO SEPARATE translation systems!
- Admin panel uses: `resources/js/lib/i18n.ts`
- Storefront uses: `src/lib/i18n.ts`
- NEVER share translation files between them
- Each project has its own `en/` and `bn/` folders

---

# 🛡 CODE QUALITY

## Updated Code Quality Constraint (Laravel Example)

```php
// ❌ MIDDLE TALENT (Eloquent directly in Service)
public function createOrder($data) {
    return Order::create($data);
}

// ✅ TOP 1% ARCHITECT (Using DTOs, Transactions, and Events)
public function createOrder(CreateOrderDTO $orderData): Order {
    return DB::transaction(function () use ($orderData) {
        $order = $this->repository->store($orderData);
        OrderCreated::dispatch($order);
        return $order;
    });
}
```

## Backend
- Testable, Deterministic, Secure, Performant
- Use Result objects for user errors (not exceptions)
- Event-driven side effects (queues, not blocking)

## Frontend
- Fully TypeScript safe (no `any`)
- Zod validation for all API data
- ESLint clean
- Predictable rendering
- No hidden side effects

## Code Organization Principles (CRITICAL)

### Pure Functions (MANDATORY)
- **Always prefer pure functions** over methods with side effects
- Pure functions: Same input → Same output (no external state modification)
- Benefits: Testable, predictable, easy to debug
- Example:
```php
// ❌ WRONG - Impure (modifies external state)
function calculateTotal($items) {
  global $discount;
  $this->total = array_sum($items) * $discount;
}

// ✅ CORRECT - Pure function
function calculateTotal(array $items, float $discount): float {
  return array_sum($items) * $discount;
}
```

### Small, Focused Functions (MANDATORY)
- **Single Responsibility**: Each function does ONE thing well
- **Maximum 20-30 lines** per function (excluding validation/comments)
- If function grows beyond 50 lines → **BREAK IT DOWN**
- Extract complex logic into private helper methods

### Descriptive Naming (MANDATORY)
- **Function names**: Must describe WHAT they do, not HOW
  - ✅ `calculateTotalWithTax()`, `getUserPermissions()`
  - ❌ `process()`, `handle()`, `data()`
- **Variable names**: Must describe PURPOSE and SCOPE
  - ✅ `$userPermissions`, `$totalAmountWithTax`
  - ❌ `$data`, `$tmp`, `$arr`
- **Boolean variables**: Use `is/has/can/should` prefixes
  - ✅ `$isActive`, `$hasPermission`, `$canEdit`
  - ❌ `$active`, `$permission`, `$edit`

### Handling Large Functions (BREAK DOWN RULE)
When a function becomes too big (>50 lines), immediately:

1. **Extract validation** → Separate `validate*()` method or Form Request class
2. **Extract data fetching** → Separate repository method
3. **Extract business logic** → Separate service method
4. **Extract transformations** → Small helper functions

Example:
```php
// ❌ WRONG - 100+ line controller method
public function processOrder(Request $request) {
  // 20 lines validation
  // 30 lines database queries
  // 40 lines business logic
  // 10 lines formatting
}

// ✅ CORRECT - Broken down into small functions
public function processOrder(Request $request, OrderService $service) {
  $validated = $this->validateOrder($request);  // Form Request
  return $service->processOrder($validated);    // Service layer
}
```

---

---

# 🚀 PERFORMANCE: The "Sub-Second" Rule

## Edge-Ready & Server Components (Storefront)
- **Default**: Use Next.js Server Components (RSC) by default
- **Goal**: Minimize client-side JavaScript
- **Example**:
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

## Stale-While-Revalidate (SWR)
- **Strategy**: Show cached data first → revalidate in background
- **Benefit**: Instant perceived performance
- **Example**:
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

## Bundle Budgeting (Critical)
- **Rule**: Every library addition = bundle size cost
- **Tool**: Run `npm run build` and check bundle size
- **Budget**:
  - Initial JS: < 200KB gzipped
  - Each route chunk: < 100KB gzipped
  - Total vendor bundle: < 300KB gzipped
- **Example**:
```json
// package.json - Use bundlephobia.com before adding
{
  "dependencies": {
    // ✅ Good: Small libraries
    "zustand": "4.5.0", // ~3KB

    // ❌ Bad: Huge libraries
    "moment": "2.29.0", // ~70KB - Use dayjs (~2KB) instead
    "lodash": "4.17.0" // ~70KB - Use lodash-es (~24KB) or native methods
  }
}
```

---

# 📚 ARCHITECTURE DECISION RECORDS (ADR)

## What is ADR?
- **Purpose**: Document WHY you made technical decisions
- **Location**: `docs/adr/` folder
- **Format**: Short markdown files (001-laravel-12.md, 002-mantine-ui.md)

## Why ADR Matters?
- **Large Teams**: Prevents "why did we do this?" questions
- **Onboarding**: New devs understand architecture quickly
- **Future Self**: You'll forget WHY you chose X over Y

## ADR Template
```markdown
# ADR-001: Use Laravel 12 for Backend

## Status
Accepted

## Context
We need a backend framework for the ERP system.

## Decision
Use Laravel 12 for the backend API.

## Consequences
**Positive:**
- Largest ecosystem in PHP
- Built-in queues, events, validation
- Easy to hire developers

**Negative:**
- Heavier than micro-frameworks
- PHP ecosystem (smaller than JS/Python)

## Alternatives Considered
- Node.js (Express) - Rejected: Too much boilerplate
- Python (Django) - Rejected: Slower performance
```

## Required ADRs for This Project
1. `001-laravel-12.md` - Why Laravel 12 for backend
2. `002-react-18-vite.md` - Why React + Vite for admin panel
3. `003-nextjs-16.md` - Why Next.js 16 for storefront
4. `004-mantine-ui.md` - Why Mantine UI for admin (but NOT storefront)
5. `005-zustand.md` - Why Zustand over Redux/Context
6. `006-domain-driven.md` - Why DDD folder structure

## How to Create an ADR

1. Create file in `docs/adr/` folder: `000-<slug>.md`
2. Use the template above
3. Keep it SHORT (1 page max)
4. Update status: Proposed → Accepted → Deprecated
5. Link related ADRs

**Example command:**
```bash
# Create new ADR
cat > docs/adr/007-choose-library.md << 'EOF'
# ADR-007: Use [Library Name]

## Status
Proposed

## Context
We need to solve [problem].

## Decision
Use [Library Name] because...

## Consequences
**Positive:**
- Benefit 1
- Benefit 2

**Negative:**
- Drawback 1
- Drawback 2

## Alternatives Considered
- [Alternative 1] - Rejected: Reason
- [Alternative 2] - Rejected: Reason
EOF
```

---

# ✅ FINAL ASSUMPTION

If a feature feels:
- Aggressive, Cluttered, Unstable, Confusing (mobile), Stressful

→ It MUST be redesigned

**Mobile UX = baseline**
**Mental peace = feature**
**Security = mandatory**
**Performance = default (< 1 second)**
**Clarity = law**

---

# 📋 CODE REVIEW CHECKLIST

Before merging any PR, verify:

## Backend (Laravel)
- [ ] Uses DTOs (no `$request->all()`)
- [ ] Side effects in Queue/Events (no blocking)
- [ ] Atomic transactions for multi-table updates
- [ ] Result objects for user errors
- [ ] OpenAPI/Swagger documented
- [ ] PSR-12 compliant
- [ ] No `env()` calls outside config files
- [ ] All inputs validated (Form Request)

## Frontend (React/Next.js)
- [ ] NO `any` types
- [ ] Zod validation for API data
- [ ] Optimistic UI updates
- [ ] Skeleton loading states
- [ ] No console.log statements
- [ ] Proper TypeScript types
- [ ] Immutable state updates
- [ ] Keyboard navigation works
- [ ] Responsive design tested
- [ ] No layout shift (CLS)

## Performance
- [ ] Bundle size checked
- [ ] No unnecessary dependencies
- [ ] Server Components used where possible
- [ ] Code splitting implemented
- [ ] Images optimized (Next.js Image or aspect-ratio)

## UX
- [ ] Error messages are helpful (not "An error occurred")
- [ ] Loading states are clear (skeleton, not spinner)
- [ ] Micro-interactions on actions
- [ ] Confirmation dialogs for destructive actions
- [ ] Success feedback on all mutations

---

---
