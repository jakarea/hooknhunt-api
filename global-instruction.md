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

# 🏗 BACKEND (Laravel API - hooknhunt-api/)

## Architecture
- Clean Architecture: Controller → Service → Repository
- Thin controllers, business logic in services
- SOLID principles, dependency injection
- PSR-12 coding standard

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

## Destructive Actions
- Always show confirmation dialog
- Calm, clear, non-threatening wording

## Feedback
- ✅ Success: Toast after create/update/delete
- ❌ Error: Human-readable, non-technical, calm
- 🔄 Loading: Smooth transitions, no flashing/blinking

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

## Backend
- Testable, Deterministic, Secure, Performant

## Frontend
- Fully TypeScript safe (no `any`)
- ESLint clean
- Predictable rendering
- No hidden side effects

---

# ✅ FINAL ASSUMPTION

If a feature feels:
- Aggressive, Cluttered, Unstable, Confusing (mobile), Stressful

→ It MUST be redesigned

**Mobile UX = baseline**
**Mental peace = feature**
**Security = mandatory**
**Performance = default**
**Clarity = law**

---
