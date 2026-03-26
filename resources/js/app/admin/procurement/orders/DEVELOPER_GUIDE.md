# Procurement Orders - Developer Quick Reference

## Store Usage Examples

### Reading State
```typescript
// ✅ CORRECT - Use selector hooks (optimized)
const orders = useOrders()
const suppliers = useSuppliers()
const statistics = useStatistics()
const loading = useOrdersLoading()
const filters = useOrdersFilters()
const pagination = useOrdersPagination()

// ❌ AVOID - Using full store (causes unnecessary re-renders)
const state = useProcurementOrdersStore()
```

### Writing State (Using Actions)
```typescript
// ✅ CORRECT - Destructure only actions you need
const {
  setOrders,
  setLoading,
  setStatusFilter,
  setCurrentPage,
} = useOrdersActions()

// Use them in callbacks or effects
useEffect(() => {
  setLoading(true)
  fetchData().then(data => {
    setOrders(data)
    setLoading(false)
  })
}, [setOrders, setLoading])
```

### Complex State Updates
```typescript
// All actions use Immer under the hood - no manual spreading needed
const { setStatusFilter, openDeleteModal } = useOrdersActions()

// Status change automatically resets page to 1
setStatusFilter('draft')

// Open delete modal with order details
openDeleteModal(orderId, 'PO-1234')
```

## Pure Function Examples

### Utility Functions
```typescript
// Safe number conversion
const amount = toNumber(order.totalAmount, 0) // Returns number or 0

// Currency conversion
const bdtAmount = calculateBdt(rmbAmount, exchangeRate)

// Currency formatting
const display = formatRmbAmount(1234.56) // "¥1234.56"

// Permission checks
const canEdit = canEditOrder(order.status, hasPermission('procurement.orders.edit'))
```

### Component Functions
```typescript
// Pure UI component - receives all data as props
<OrderTableRow
  order={order}
  statusLabels={STATUS_LABELS}
  navigate={navigate}
  hasEditPermission={hasEditPermission}
  hasDeletePermission={hasDeletePermission}
  deleting={deletingId}
  onDeleteClick={actions.openDeleteModal}
/>
```

## Common Patterns

### 1. Adding a New Filter
```typescript
// In procurementOrdersStore.ts:
interface OrderFilters {
  // ... existing filters
  newField: string // Add here
}

const initialFilters: OrderFilters = {
  // ... existing
  newField: '', // Add default value
}

// Add setter action
setNewField: (value: string) =>
  set((state) => {
    state.filters.newField = value
    state.pagination.currentPage = 1
  }),

// Add selector hook
export const useOrdersFilters = () =>
  useProcurementOrdersStore((state) => state.filters)

// In page.tsx - Add filter input
<TextInput
  label="New Filter"
  value={filters.newField}
  onChange={(e) => actions.setNewField(e.target.value)}
/>
```

### 2. Adding a New API Call
```typescript
// In page.tsx - Add data fetching function
const fetchNewData = async () => {
  try {
    const response = await apiCall()
    const data = extractArrayFromResponse(response)
    // Update store
    actions.setSomeData(data)
  } catch (error) {
    console.error('Failed:', error)
    notifications.show({
      title: t('common.error'),
      message: t('error.message'),
      color: 'red',
    })
  }
}

// Call in useEffect
useEffect(() => {
  fetchNewData()
}, [fetchNewData])
```

### 3. Creating a New Pure Component
```typescript
// Pure component - no side effects
const NewComponent = ({
  data,
  onAction,
  t,
}: {
  data: SomeType
  onAction: (id: number) => void
  t: (key: string) => string
}) => (
  <Paper p="md">
    <Text>{t('title')}</Text>
    <Button onClick={() => onAction(data.id)}>
      {t('action')}
    </Button>
  </Paper>
)

// Use in main component
<NewComponent
  data={someData}
  onAction={handleSomeAction}
  t={t}
/>
```

### 4. Handling Form State
```typescript
// Local form state (don't put everything in store)
const [localState, setLocalState] = useState({
  tempValue: '',
  showModal: false,
})

// Only sync to store when needed
const handleSubmit = () => {
  // Call API
  createItem(localState.tempValue)
    // Update store on success
    .then(() => actions.addItem(result))
    // Show notification
    .then(() => notifications.show({
      title: 'Success',
      message: 'Item created',
      color: 'green'
    }))
}
```

## Performance Tips

### ✅ DO
- Use specific selector hooks
- Memoize expensive computations with `useMemo`
- Wrap event handlers with `useCallback`
- Use pure functions for data transformation
- Debounce user input (search, filters)

### ❌ DON'T
- Use full store hook in components
- Mutate state directly (always use actions)
- Create new functions on every render
- Perform expensive calculations in render
- Make API calls without debouncing

## Debugging

### Check Store State
```typescript
// In browser console:
import { useProcurementOrdersStore } from '@/stores/procurementOrdersStore'

// Get current state
const state = useProcurementOrdersStore.getState()
console.log('Orders:', state.orders)
console.log('Filters:', state.filters)
console.log('Pagination:', state.pagination)
```

### Track Re-renders
```typescript
// Add to component to track re-renders
useEffect(() => {
  console.log('Component rendered')
})

// Use React DevTools Profiler for detailed analysis
```

### Monitor Selector Changes
```typescript
// Custom hook to monitor selector
const useMonitorSelector = (selector, name) => {
  const value = useProcurementOrdersStore(selector)
  useEffect(() => {
    console.log(`${name} changed:`, value)
  }, [value, name])
  return value
}

// Usage
const orders = useMonitorSelector(s => s.orders, 'orders')
```

## Testing

### Unit Test Example
```typescript
import { calculateBdt, toNumber, formatRmbAmount } from './page'

describe('Utility Functions', () => {
  test('calculateBdt converts currencies', () => {
    expect(calculateBdt(100, 11.5)).toBe(1150)
    expect(calculateBdt(0, 11.5)).toBe(0)
  })

  test('toNumber handles edge cases', () => {
    expect(toNumber('123')).toBe(123)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined, 10)).toBe(10)
  })

  test('formatRmbAmount formats currency', () => {
    expect(formatRmbAmount(1234.5)).toBe('¥1234.50')
    expect(formatRmbAmount(0)).toBe('¥0.00')
  })
})
```

### Store Test Example
```typescript
import { useProcurementOrdersStore } from './procurementOrdersStore'

describe('Procurement Orders Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useProcurementOrdersStore.getState()
      .setOrders([])
      .setSuppliers([])
  })

  test('setStatusFilter resets page to 1', () => {
    const { setStatusFilter, pagination } = useProcurementOrdersStore.getState()

    setStatusFilter('draft')

    expect(pagination.currentPage).toBe(1)
  })
})
```

## Quick Checklist

Before committing changes:
- [ ] All functions have clear JSDoc comments
- [ ] No direct state mutations (use actions)
- [ ] Components use specific selectors, not full store
- [ ] Expensive computations are memoized
- [ ] Event handlers are wrapped in useCallback
- [ ] No TypeScript errors
- [ ] Error handling for all API calls
- [ ] Loading states for async operations
- [ ] User notifications for actions

---

Last Updated: 2025-02-21
