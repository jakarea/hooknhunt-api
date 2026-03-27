# 🌍 GLOBAL ENGINEERING MODE (Lean Version)

**Full documentation**: See [global-instruction.md](./global-instruction.md) for detailed explanations
**Code examples**: See [docs/examples/](./docs/examples/) for working code samples

---

## 🎯 PROJECT STRUCTURE

### Project 1: Laravel API + Admin Panel (`hooknhunt-api/`)
- **Backend**: Laravel 12 REST API
- **Admin**: React 18 + Vite + Mantine UI (in `resources/js/`)
- **Deployment**: Shared cPanel hosting

### Project 2: Next.js Storefront (`storefront/`)
- **Frontend**: Next.js 16 (App Router) + React 19
- **Deployment**: Vercel (COMPLETELY SEPARATE from Laravel)

---

## 🏆 TOP 1% ENGINEERING PRINCIPLES (16 Core Rules)

### 🏛 Architecture: Domain-Driven & Contract-First
1. **Domain-Driven Design (DDD)**: Folder structure by business domain (Billing, Inventory, Auth)
2. **Contract-First**: OpenAPI/Swagger schema BEFORE code
3. **DTOs**: Never use `$request->all()` - always typed DTOs
4. **Event-Driven**: Mail/SMS/Notifications via Queue + Events (never block)

**Code examples**: `docs/examples/backend-examples.md`

### 💻 Code Craft: Robustness
5. **Railway Oriented Programming**: Result objects for user errors (not exceptions)
6. **Type-Safety**: NO `any` types - Zod validation mandatory
7. **Immutability**: Never mutate - always return new objects

**Code examples**: `docs/examples/backend-examples.md` & `docs/examples/frontend-examples.md`

### ✨ UX Engineering: Cognitive Load
8. **Optimistic UI**: Instant update, rollback on error (NO spinners)
9. **Skeleton States**: Shimmer loading (not blocking spinners)
10. **Zero CLS**: Always `aspect-ratio` or `min-height` for images
11. **Micro-interactions**: Animations on every action

**Code examples**: `docs/examples/frontend-examples.md`

### 🚀 Performance: Sub-Second Rule
12. **Edge-Ready**: Next.js Server Components by default
13. **Atomic Transactions**: `DB::transaction()` for multi-table updates
14. **SWR**: Show cached data first, revalidate in background

**Code examples**: `docs/examples/frontend-examples.md`

### 🧘 UX Mental Peace
15. **Error Empathy**: Solution-oriented messages (NOT "An error occurred")
16. **Keyboard First**: Forms work without mouse (Tab, Enter, Arrow)

**Code examples**: `docs/examples/frontend-examples.md`

---

## 📋 QUICK REFERENCE CHECKLIST

### Backend (Laravel 12)
- [ ] Use DTOs (NO `$request->all()`)
- [ ] Side effects in Queue/Events
- [ ] `DB::transaction()` for multi-table
- [ ] Result objects for errors
- [ ] DDD folder structure
- [ ] OpenAPI/Swagger defined

### Frontend (React 18 + Next.js 16)
- [ ] NO `any` types
- [ ] Zod validation for API data
- [ ] Optimistic UI updates
- [ ] Skeleton loading states
- [ ] `aspect-ratio` for images
- [ ] Immutable state (Zustand)
- [ ] SWR pattern
- [ ] Keyboard navigation

### Performance
- [ ] Bundle size checked (bundlephobia.com)
- [ ] Server Components by default
- [ ] Code splitting
- [ ] Lazy loading

---

## 🏗 BACKEND ARCHITECTURE

### DDD Folder Structure
```
app/Domain/
├── Procurement/
│   ├── Controllers/
│   ├── Services/
│   ├── Repositories/
│   ├── DTOs/
│   └── Models/
└── Finance/
    └── ...
```

### Clean Architecture Layers
- **Controller**: HTTP handling, validation only
- **Service**: Business logic
- **Repository**: Data access
- **Model**: Eloquent ORM

**Full architecture docs**: `global-instruction.md` lines 110-201

---

## 📱 FRONTEND PROJECTS

### Admin Panel (resources/js/)
- **Tech**: React 18 + Vite + Mantine UI + TypeScript
- **UI**: Mantine components only, Tailwind CSS
- **State**: Zustand stores
- **Nav**: React Router v7

### Storefront (storefront/)
- **Tech**: Next.js 16 (App Router) + React 19
- **UI**: Pure React + Tailwind (NO Mantine!)
- **State**: Zustand stores
- **Nav**: Next.js App Router

**Full frontend docs**: `global-instruction.md` lines 338-421

---

## 🧘 UX MENTAL PEACE

### Optimistic UI
- Update UI instantly
- API call in background
- Rollback on error

### Skeleton States
- Use `<Skeleton>` from Mantine
- Shimmer effect
- Better perceived performance

### Error Empathy
- ❌ "An error occurred"
- ✅ "Your card has expired. Please use a different card."

**Full UX docs**: `global-instruction.md` lines 424-575

---

## 🛡 CODE QUALITY

### Pure Functions (Mandatory)
- Same input → Same output
- No external state modification
- Testable, predictable

### Small Functions (Mandatory)
- Max 20-30 lines per function
- If >50 lines → BREAK IT DOWN
- Extract: validation, data fetching, business logic

### Descriptive Naming
- Functions: Describe WHAT, not HOW
  - ✅ `calculateTotalWithTax()`
  - ❌ `process()`
- Variables: Describe PURPOSE
  - ✅ `$userPermissions`
  - ❌ `$data`

**Full code quality docs**: `global-instruction.md` lines 617-710

---

## 🚀 PERFORMANCE

### Bundle Budgeting
- Initial JS: < 200KB gzipped
- Route chunks: < 100KB gzipped
- Vendor bundle: < 300KB gzipped
- Check: bundlephobia.com

**Guide**: `docs/bundle-budget.md`

### SWR Pattern
- Show cached data first
- Revalidate in background
- Use `useSWR` hook

### Server Components
- Default in Next.js 16
- Minimize client JS
- Use `'use client'` only when needed

**Full performance docs**: `global-instruction.md` lines 715-792

---

## 📚 ARCHITECTURE DECISION RECORDS (ADR)

**Location**: `docs/adr/`

**Required ADRs**:
1. `001-laravel-12.md` - Why Laravel 12
2. `002-react-18-vite.md` - Why React + Vite
3. `003-nextjs-16.md` - Why Next.js 16
4. `004-mantine-ui.md` - Why Mantine (admin only)
5. `005-zustand.md` - Why Zustand
6. `006-domain-driven.md` - Why DDD

**Template**: See `global-instruction.md` lines 796-880

---

## 📋 CODE REVIEW CHECKLIST

### Backend
- [ ] DTOs used (no `$request->all()`)
- [ ] Queue/Events for side effects
- [ ] `DB::transaction()` for multi-table
- [ ] Result objects for errors
- [ ] PSR-12 compliant
- [ ] Form Request validation

### Frontend
- [ ] NO `any` types
- [ ] Zod validation
- [ ] Optimistic UI
- [ ] Skeleton loading
- [ ] No console.log
- [ ] Immutable updates
- [ ] Keyboard nav works
- [ ] No layout shift

### Performance
- [ ] Bundle size checked
- [ ] Server Components used
- [ ] Code splitting
- [ ] Images optimized

### UX
- [ ] Helpful error messages
- [ ] Skeleton loading
- [ ] Micro-interactions
- [ ] Confirmation dialogs
- [ ] Success feedback

**Full checklist**: `global-instruction.md` lines 899-937

---

## ✅ FINAL ASSUMPTION

If a feature feels:
- Aggressive, Cluttered, Unstable, Confusing, Stressful

→ **It MUST be redesigned**

**Mobile UX = baseline**
**Mental peace = feature**
**Security = mandatory**
**Performance < 1 second**
**Clarity = law**

---

## 📖 DOCUMENTATION INDEX

| File | Tokens | Purpose |
|------|--------|---------|
| `global-instruction-lean.md` | **~2,500** | Quick reference (THIS FILE) |
| `global-instruction.md` | ~7,000 | Full documentation |
| `docs/examples/backend-examples.md` | ~1,500 | Backend code samples |
| `docs/examples/frontend-examples.md` | ~1,800 | Frontend code samples |
| `docs/bundle-budget.md` | ~2,000 | Bundle optimization |
| `docs/adr/*.md` | ~1,000 each | Architecture decisions |

**Strategy**: Use lean file for reference, load detailed files only when needed.

---

**Last Updated**: 2026-03-27
**Version**: 2.0 (Lean)
