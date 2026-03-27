# ADR-005: Use Zustand for State Management

## Status
Accepted

## Context
We need a state management solution for:
- Admin panel (React 18)
- Storefront (Next.js 16)
- Global state (auth, permissions, cart, etc.)
- Simple, predictable data flow

## Decision
Use **Zustand** for all state management (both admin and storefront).

## Consequences

### Positive
- **Simple API**: No providers, actions, reducers, dispatchers
- **TypeScript first**: Built-in type safety
- **Tiny bundle**: ~1KB (vs Redux ~10KB)
- **No boilerplate**: Create store in 5 lines
- **Easy to learn**: Simpler than Redux/Context
- **DevTools**: Built-in middleware support
- **Performance**: Selective re-renders by default

### Negative
- **Smaller ecosystem**: Fewer middleware than Redux
- **Less structured**: Can become messy if not organized well

## Why Zustand Over Alternatives?

### Redux Toolkit
**Rejected**: Too much boilerplate. Overkill for our needs. Bundle size 10x larger.

### React Context
**Rejected**: Performance issues (re-renders all consumers). No DevTools. Harder to debug.

### Jotai
**Rejected**: Atomic model is harder to reason about. Smaller ecosystem than Zustand.

### Recoil
**Rejected**: Facebook experimental (less stable). Heavier bundle. More complex API.

## Best Practices (How to Use Zustand)

### DO:
- Create small, modular stores (one per feature)
- Use selectors for selective re-renders
- Keep stores flat (avoid deep nesting)
- Use TypeScript for type safety

### DON'T:
- Create one giant store for everything
- Store non-serializable data (functions, Promises)
- Mutate state directly (use `set` function)

## Example Store

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  token: string | null
  permissions: string[]
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, permissions: [] }),
    }),
    { name: 'auth-storage' }
  )
)
```

## References
- https://zustand-demo.pmnd.rs
- https://docs.pmnd.rs/zustand/getting-started/introduction
