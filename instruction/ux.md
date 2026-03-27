# 🧘 UX Engineering - Mental Peace & Cognitive Load

**📖 Back to main**: [instruction/global-lean.md](./global-lean.md)
**💻 Code Examples**: [instruction/examples/frontend.md](./examples/frontend.md)

---

## 📋 READ THIS WHEN

You are working on:
- ✅ Designing user flows
- ✅ Implementing loading states
- ✅ Error handling and messages
- ✅ Form interactions
- ✅ Feedback animations
- ✅ Mobile UX optimization
- ✅ Keyboard navigation

---

## 🎯 CORE PHILOSOPHY

**ERP = Long-usage Software → Mental Peace = Feature**

If a feature feels:
- Aggressive, Cluttered, Unstable, Confusing (mobile), Stressful

→ **It MUST be redesigned**

**Mobile UX = baseline**
**Mental peace = feature**
**Performance < 1 second**
**Clarity = law**

---

## ✨ UX ENGINEERING PRINCIPLES

### 1. Optimistic UI Updates (TOP 1% UX)

**Rule**: NO full-page spinners - Update UI instantly, rollback on error

**Why**: Spinners = defeat. Instant feedback = premium feel.

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

**Benefits**:
- Instant user feedback
- App feels faster
- Better perceived performance
- Rollback on error

---

### 2. Skeleton States vs. Spinners

**Rule**: Use shimmer/skeleton loading (not blocking spinners)

**Why**: Skeleton screens show content structure - feels faster even with same load time.

**❌ WRONG**:
```typescript
if (loading) {
  return <Loader size="xl" /> // Blocks entire page
}
```

**✅ CORRECT**:
```typescript
if (loading) {
  return (
    <Stack gap="md">
      <Skeleton height={40} width="30%" /> {/* Title */}
      <Skeleton height={60} /> {/* Filter bar */}
      <Skeleton height={200} /> {/* Content row */}
      <Skeleton height={200} /> {/* Content row */}
    </Stack>
  )
}
```

**Mantine Skeleton**:
```typescript
import { Skeleton } from '@mantine/core'

<Skeleton height={40} width="30%" />
<Skeleton height={200} radius="md" />
```

**Benefits**:
- Better perceived performance
- User sees what's coming
- No "blank screen" feeling
- Professional look

---

### 3. Zero Layout Shift (CLS)

**Rule**: Always set `aspect-ratio` or `min-height` for images

**Why**: Content jumping around = bad UX, hurts Core Web Vitals.

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

**Mantine Image**:
```typescript
<Image
  src={product.thumbnail}
  alt={product.name}
  width={200}
  height={200}
  fit="cover"
/>
```

**Benefits**:
- No content jumping
- Better Core Web Vitals
- Professional feel
- Predictable layout

---

### 4. Micro-interactions

**Rule**: Every action has small animation (Framer Motion or Mantine transitions)

**Why**: Makes app feel "premium" and polished.

**Examples**:
- Button press (scale down slightly)
- Modal open/close (fade in/out)
- Status change (color transition)
- Hover effects (smooth color change)

**Mantine Transitions**:
```typescript
import { MantineTransition } from '@mantine/core'

// Modal fade
<MantineTransition transition="fade" duration={300} mounted={opened}>
  <YourModal />
</MantineTransition>

// Modal slide
<MantineTransition
  transition="slide-up"
  duration={300}
  mounted={opened}
>
  <YourModal />
</MantineTransition>
```

**Button Animations**:
```typescript
import { Button } from '@mantine/core'

<Button
  styles={{
    root: {
      transition: 'all 150ms ease',
      '&:active': { transform: 'scale(0.98)' },
      '&:hover': { backgroundColor: 'lightblue' },
    }
  }}
>
  Click Me
</Button>
```

**Benefits**:
- Premium feel
- Clear user feedback
- Delightful experience
- Professional polish

---

### 5. Error Empathy (Human-Centric)

**Rule**: Solution-oriented error messages (NOT "An error occurred")

**Why**: "An error occurred" = useless. Help user solve problem.

**❌ WRONG**:
```typescript
notifications.show({
  title: t('errors.general'), // "An error occurred"
  message: error.message,
})
```

**✅ CORRECT**:
```typescript
// Specific, actionable errors
notifications.show({
  title: 'Payment Failed',
  message: 'Your card has expired. Please use a different card.',
})

notifications.show({
  title: 'Email Already Exists',
  message: 'This email is already registered. Try logging in instead.',
})

notifications.show({
  title: 'Network Timeout',
  message: 'Connection timed out. Check your internet and try again.',
})
```

**Benefits**:
- User knows what to do
- Reduces frustration
- Fewer support requests
- Better experience

---

### 6. Keyboard First (Admin Panel)

**Rule**: Every form must work without mouse (Tab, Enter, Arrow keys)

**Why**: 10x productivity boost for power users.

**❌ WRONG** (Mouse required):
```typescript
<form onSubmit={handleSubmit}>
  <TextInput label="Name" />
  <TextInput label="Email" />
  <Button type="submit">Submit</Button>
</form>
```

**✅ CORRECT** (Keyboard friendly):
```typescript
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
        // Move to next field
        e.currentTarget.nextElementSibling?.querySelector('input')?.focus()
      }
    }}
  />
  <TextInput
    label="Email"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    }}
  />
  <Button type="submit">Submit</Button>
</form>
```

**Benefits**:
- Power user productivity
- Accessibility (WCAG compliant)
- Professional feel
- Desktop workflow efficiency

---

### 7. Destructive Actions

**Rule**: Always show confirmation dialog (Mantine modals)

**❌ WRONG**:
```typescript
const confirmed = window.confirm('Are you sure?') // Browser alert
```

**✅ CORRECT**:
```typescript
import { modals } from '@mantine/modals'

modals.openConfirmModal({
  title: 'Delete Product?',
  children: (
    <Text size="sm">
      Are you sure you want to delete "{product.name}"? This action cannot be undone.
    </Text>
  ),
  labels: {
    confirm: 'Delete',
    cancel: 'Cancel',
  },
  confirmProps: { color: 'red' },
  onConfirm: async () => {
    await deleteProduct(product.id)
    notifications.show({
      title: 'Deleted',
      message: 'Product deleted successfully',
      color: 'green',
    })
  }
})
```

**Benefits**:
- Clear confirmation
- Calm, non-threatening
- Professional appearance
- Prevents accidents

---

### 8. Feedback (Success/Error/Loading)

**Rule**: Always provide feedback for user actions

**Success**:
```typescript
notifications.show({
  title: 'Product Created',
  message: 'Product has been created successfully',
  color: 'green',
})
```

**Error** (with empathy):
```typescript
notifications.show({
  title: 'Creation Failed',
  message: 'Could not create product. Please check your connection and try again.',
  color: 'red',
})
```

**Loading** (smooth transitions):
```typescript
// Use skeleton states (see above)
// NO flashing/blinking
// Smooth transitions between states
```

---

## 📱 MOBILE-FIRST UX

### Principles
- Mobile = baseline, Desktop = enhancement
- NO hover states (tap/click/press only)
- Finger-friendly touch targets (min 44px)
- Forms scroll when keyboard opens

### Touch Targets
```typescript
// ❌ TOO SMALL
<Button size="xs">Click</Button> // < 44px

// ✅ CORRECT SIZE
<Button size="sm">Click</Button> // >= 44px
```

### Data Rendering
- Desktop (md+) → Table view
- Mobile (<md) → Card view
- Use: `hidden md:block` and `block md:hidden`

---

## 📊 CORE WEB VITALS

### Metrics to Track
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### How to Achieve
- ✅ Skeleton loading states
- ✅ Zero layout shift (aspect-ratio)
- ✅ Optimistic UI updates
- ✅ Code splitting
- ✅ Lazy loading
- ✅ Image optimization

---

## 📋 UX CHECKLIST

Before committing code:

### Loading States
- [ ] Skeleton UI used (not spinners)
- [ ] Smooth transitions (no flashing)
- [ ] Perceived performance optimized

### Error Handling
- [ ] Helpful error messages (not "An error occurred")
- [ ] Solution-oriented feedback
- [ ] Rollback on optimistic update failure

### Interactions
- [ ] Micro-interactions on actions
- [ ] Confirmation dialogs for destructive actions
- [ ] Success feedback on mutations
- [ ] Keyboard navigation works

### Mobile
- [ ] Touch targets >= 44px
- [ ] No hover states (tap/click only)
- [ ] Responsive data rendering (table/card)
- [ ] Forms scroll when keyboard opens

### Performance
- [ ] Zero layout shift (aspect-ratio)
- [ ] Optimistic UI updates
- [ ] No blocking operations

---

## 💡 CODE EXAMPLES

See [instruction/examples/frontend.md](./examples/frontend.md) for:
- Optimistic UI implementation
- Skeleton loading states
- Zero CLS techniques
- Micro-interactions
- Error empathy patterns
- Keyboard navigation

---

## 📚 RELATED FILES

- **Main Reference**: [instruction/global-lean.md](./global-lean.md)
- **Backend Rules**: [instruction/backend.md](./backend.md)
- **Frontend Rules**: [instruction/frontend.md](./frontend.md)
- **Full Docs**: [instruction/global.md](./global.md)

---

**Last Updated**: 2026-03-27
**Focus**: User Experience & Mental Peace
