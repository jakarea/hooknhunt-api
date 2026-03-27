# ADR-002: Use React 18 + Vite for Admin Panel

## Status
Accepted

## Context
We need a modern, fast frontend for the admin panel with:
- TypeScript support
- Fast development experience (HMR)
- Production-optimized builds
- Component-based architecture
- Easy state management

## Decision
Use **React 18 + Vite** for the admin panel frontend.

## Consequences

### Positive
- **Fast HMR**: Vite's dev server is instant (no bundling during dev)
- **Production-optimized**: Automatic code splitting, tree-shaking
- **TypeScript first-class**: Native TS support
- **Largest ecosystem**: Most UI libraries, components, tools
- **Concurrent features**: React 18's automatic batching, transitions
- **Easy deployment**: Static files can be served by Laravel/public

### Negative
- **Client-side rendering**: Slower initial load than SSR
- **Bundle size**: Need to optimize with code splitting
- **More complex than Blade**: Requires build step, npm, etc.

## Alternatives Considered

### Laravel Blade + Alpine.js
**Rejected**: Harder to maintain complex UI logic. No TypeScript. Limited component reusability.

### Vue 3 + Vite
**Rejected**: Smaller ecosystem than React. Harder to hire Vue developers. Fewer enterprise UI libraries.

### Svelte + Vite
**Rejected**: Smaller ecosystem. Harder to hire Svelte developers. Less mature tooling.

## Why Not Next.js for Admin Panel?
- Admin panel is **internal tool** (not public-facing)
- Deployed **with Laravel** on shared hosting (cPanel)
- Next.js requires Node.js server or Vercel deployment
- React SPA + Vite = simpler deployment (static files)

## References
- https://react.dev
- https://vitejs.dev
- https://vitejs.dev/guide/why.html
