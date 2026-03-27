# 🌍 GLOBAL ENGINEERING MODE - Lean Reference

**👋 START HERE**: This is your main reference file. Read this first, then load specific files as needed.

**📚 Full Documentation**: [instruction/global.md](./global.md) (7,000 tokens - use for deep learning)

**🎯 Need Help?**: See [instruction/index.md](./index.md) for file selection guide

---

## 🎯 PROJECT STRUCTURE (Quick Overview)

### Two Separate Projects
1. **Laravel API + Admin Panel** (`hooknhunt-api/`)
   - Backend: Laravel 12
   - Admin: React 18 + Vite + Mantine UI

2. **Next.js Storefront** (`storefront/`)
   - Frontend: Next.js 16 + React 19
   - Deployment: Vercel (separate from Laravel)

---

## 🏆 TOP 1% ENGINEERING PRINCIPLES (16 Core Rules)

### 🏛 Architecture (4 Rules)
1. **Domain-Driven Design (DDD)**: Folders by business domain, not technical layers
2. **Contract-First**: OpenAPI/Swagger schema BEFORE code
3. **DTOs**: Never use `$request->all()` - always typed DTOs
4. **Event-Driven**: Mail/SMS via Queue + Events (never block)

📖 **Deep Dive**: [instruction/backend.md](./backend.md) | 💻 **Examples**: [instruction/examples/backend.md](./examples/backend.md)

### 💻 Code Craft (3 Rules)
5. **Railway Oriented Programming**: Result objects for errors (not exceptions)
6. **Type-Safety**: NO `any` types - Zod validation mandatory
7. **Immutability**: Never mutate - always return new objects

📖 **Deep Dive**: [instruction/backend.md](./backend.md) | [instruction/frontend.md](./frontend.md)

### ✨ UX Engineering (4 Rules)
8. **Optimistic UI**: Instant update, rollback on error (NO spinners)
9. **Skeleton States**: Shimmer loading (not blocking spinners)
10. **Zero CLS**: Always `aspect-ratio` or `min-height` for images
11. **Micro-interactions**: Animations on every action

📖 **Deep Dive**: [instruction/ux.md](./ux.md) | 💻 **Examples**: [instruction/examples/frontend.md](./examples/frontend.md)

### 🚀 Performance (3 Rules)
12. **Edge-Ready**: Next.js Server Components by default
13. **Atomic Transactions**: `DB::transaction()` for multi-table updates
14. **SWR**: Show cached data first, revalidate in background

📖 **Deep Dive**: [instruction/frontend.md](./frontend.md)

### 🧘 Mental Peace (2 Rules)
15. **Error Empathy**: Solution-oriented messages (NOT "An error occurred")
16. **Keyboard First**: Forms work without mouse (Tab, Enter, Arrow)

📖 **Deep Dive**: [instruction/ux.md](./ux.md)

---

## 🎯 SMART FILE LOADING GUIDE

### 📍 **Where are you working?**

#### 🔧 Backend Development (Laravel)
**Load these files**:
1. `instruction/global-lean.md` (this file)
2. `instruction/backend.md` (+1,500 tokens)
3. `instruction/examples/backend.md` (+1,500 tokens - if needed)

**Total**: ~5,500 tokens (vs 7,000 full)

**When to read**:
- Writing controllers, services, repositories
- Creating DTOs
- Implementing events/listeners
- Database operations

---

#### 🎨 Frontend Development (React/Next.js)
**Load these files**:
1. `instruction/global-lean.md` (this file)
2. `instruction/frontend.md` (+1,800 tokens)
3. `instruction/examples/frontend.md` (+1,800 tokens - if needed)

**Total**: ~6,100 tokens (vs 7,000 full)

**When to read**:
- Writing React components
- API integration
- State management (Zustand)
- Performance optimization

---

#### 🎭 UX/UI Design
**Load these files**:
1. `instruction/global-lean.md` (this file)
2. `instruction/ux.md` (+1,200 tokens)

**Total**: ~3,700 tokens (vs 7,000 full)

**When to read**:
- Designing user flows
- Implementing loading states
- Error handling
- Form interactions

---

#### 📚 Code Review / Architecture
**Load this file**:
1. `instruction/global.md` (7,000 tokens)

**When to read**:
- Comprehensive code review
- Architecture decisions
- Learning all principles
- Onboarding new developers

---

## 📋 QUICK REFERENCE CHECKLIST

### Backend (Laravel 12)
- [ ] Use DTOs (NO `$request->all()`)
- [ ] Side effects in Queue/Events
- [ ] `DB::transaction()` for multi-table
- [ ] Result objects for errors
- [ ] DDD folder structure
- [ ] OpenAPI/Swagger defined

**See**: [instruction/backend.md](./backend.md)

### Frontend (React 18 + Next.js 16)
- [ ] NO `any` types
- [ ] Zod validation for API data
- [ ] Optimistic UI updates
- [ ] Skeleton loading states
- [ ] `aspect-ratio` for images
- [ ] Immutable state (Zustand)
- [ ] SWR pattern
- [ ] Keyboard navigation

**See**: [instruction/frontend.md](./frontend.md)

### Performance
- [ ] Bundle size checked (bundlephobia.com)
- [ ] Server Components by default
- [ ] Code splitting
- [ ] Lazy loading

**See**: [instruction/frontend.md](./frontend.md)

### UX
- [ ] Helpful error messages
- [ ] Skeleton loading
- [ ] Micro-interactions
- [ ] Confirmation dialogs
- [ ] Success feedback

**See**: [instruction/ux.md](./ux.md)

---

## 🏗 BACKEND QUICK REFERENCE

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
```
Controller → Service → Repository → Model
```

**Details**: [instruction/backend.md](./backend.md)

---

## 📱 FRONTEND QUICK REFERENCE

### Admin Panel (resources/js/)
- **Tech**: React 18 + Vite + Mantine UI + TypeScript
- **UI**: Mantine components only
- **State**: Zustand
- **Nav**: React Router v7

### Storefront (storefront/)
- **Tech**: Next.js 16 (App Router) + React 19
- **UI**: Pure React + Tailwind (NO Mantine!)
- **State**: Zustand
- **Nav**: Next.js App Router

**Details**: [instruction/frontend.md](./frontend.md)

---

## 🛡 CODE QUALITY QUICK REFERENCE

### Pure Functions (Mandatory)
- Same input → Same output
- No external state modification
- Testable, predictable

### Small Functions (Mandatory)
- Max 20-30 lines per function
- If >50 lines → BREAK IT DOWN

### Descriptive Naming
- Functions: Describe WHAT, not HOW
  - ✅ `calculateTotalWithTax()`
  - ❌ `process()`
- Variables: Describe PURPOSE
  - ✅ `$userPermissions`
  - ❌ `$data`

**Details**: [instruction/backend.md](./backend.md) or [instruction/frontend.md](./frontend.md)

---

## 📚 ARCHITECTURE DECISION RECORDS (ADR)

**Location**: `docs/adr/`

- `001-laravel-12.md` - Why Laravel 12
- `002-react-18-vite.md` - Why React + Vite
- `003-nextjs-16.md` - Why Next.js 16
- `004-mantine-ui.md` - Why Mantine (admin only)
- `005-zustand.md` - Why Zustand
- `006-domain-driven.md` - Why DDD

**Bundle Budget Guide**: [docs/bundle-budget.md](../docs/bundle-budget.md)

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

## 🎯 HOW TO USE THIS FILE

### **Scenario 1: Starting New Work**
```
You: "Read instruction/global-lean.md"
Me: [Loads this file - 2,500 tokens]
```

### **Scenario 2: Backend Task**
```
You: "Read instruction/global-lean.md"

Me: [Loads this file + detects backend context]
    "I see you're working on backend. Also loading:
     - instruction/backend.md
     - instruction/examples/backend.md"
```

### **Scenario 3: Frontend Task**
```
You: "Read instruction/global-lean.md"

Me: [Loads this file + detects frontend context]
    "I see you're working on frontend. Also loading:
     - instruction/frontend.md
     - instruction/examples/frontend.md"
```

### **Scenario 4: Explicit Request**
```
You: "Read instruction/global-lean.md and instruction/backend.md"

Me: [Loads exactly what you specify - 4,000 tokens]
```

---

## 📖 DOCUMENTATION MAP

```
instruction/
├── index.md (this file - guide)
├── global-lean.md (START HERE - main reference)
├── global.md (full documentation - 7,000 tokens)
├── backend.md (backend-specific - 1,500 tokens)
├── frontend.md (frontend-specific - 1,800 tokens)
├── ux.md (UX patterns - 1,200 tokens)
└── examples/
    ├── backend.md (backend code - 1,500 tokens)
    └── frontend.md (frontend code - 1,800 tokens)
```

---

**💡 Pro Tip**: Just say **"Read instruction/global-lean.md"** and let the file guide you!

---

**Last Updated**: 2026-03-27
**Version**: 3.0 (Smart Folder Structure)
