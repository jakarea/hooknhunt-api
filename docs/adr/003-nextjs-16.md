# ADR-003: Use Next.js 16 for Storefront

## Status
Accepted

## Context
We need a modern, fast storefront (customer-facing) with:
- SEO optimization (critical for e-commerce)
- Fast initial page load
- Server-side rendering (SSR)
- Static site generation (SSG)
- Edge deployment capability

## Decision
Use **Next.js 16 (App Router)** for the storefront.

## Consequences

### Positive
- **Best SEO**: Server-side rendering by default
- **Fastest performance**: Automatic code splitting, image optimization, font optimization
- **Edge deployment**: Can deploy to Vercel Edge (global CDN)
- **React Server Components**: Reduce client-side JavaScript by 40%+
- **App Router**: Modern, intuitive file-based routing
- **Built-in optimizations**: Image, Font, Script optimization out of the box

### Negative
- **Separate deployment**: Cannot deploy with Laravel (requires Vercel/Node.js)
- **Learning curve**: App Router is different from Pages Router
- **API routes**: Need to proxy to Laravel backend (API rewrites)

## Alternatives Considered

### Laravel Blade + Vue/React (Inertia.js)
**Rejected**: Slower than Next.js SSR. Not as SEO-friendly. Harder to optimize for Core Web Vitals.

### React 18 + Vite (SPA)
**Rejected**: Poor SEO (client-side only). Slower initial load. No server-side rendering.

### Astro + React
**Rejected**: Smaller ecosystem. Harder to hire Astro developers. Less mature than Next.js.

## Why Not Use Admin Panel for Storefront?
- **Different deployment**: Admin panel = shared hosting, Storefront = Vercel Edge
- **Different needs**: Admin = internal tool (SPA OK), Storefront = public (SEO critical)
- **Different tech**: Admin = Mantine UI (not SEO-friendly), Storefront = Pure React + Tailwind
- **Performance**: Storefront needs SSR/SSG for SEO, Admin doesn't

## Architecture
```
Storefront (Next.js 16 on Vercel)
    ↓ (API rewrites)
Laravel API (hooknhunt-api)
```

## References
- https://nextjs.org/docs
- https://vercel.com/docs
