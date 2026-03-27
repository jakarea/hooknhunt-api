# 🔧 Backend Engineering (Laravel 12)

**📖 Back to main**: [instruction/global-lean.md](./global-lean.md)
**💻 Code Examples**: [instruction/examples/backend.md](./examples/backend.md)

---

## 📋 READ THIS WHEN

You are working on:
- ✅ Writing Laravel controllers, services, repositories
- ✅ Creating DTOs (Data Transfer Objects)
- ✅ Implementing events and listeners
- ✅ Database operations and migrations
- ✅ API endpoints
- ✅ Queue jobs
- ✅ Validation logic

---

## 🏛 ARCHITECTURE PRINCIPLES

### 1. Domain-Driven Design (DDD) Lite

**Folder Structure** (Organize by Business Domain):
```
app/Domain/
├── Procurement/
│   ├── Controllers/
│   │   ├── ProcurementController.php
│   │   └── PurchaseOrderController.php
│   ├── Services/
│   │   ├── ProcurementService.php
│   │   └── PurchaseOrderService.php
│   ├── Repositories/
│   │   ├── ProcurementRepository.php
│   │   └── PurchaseOrderRepository.php
│   ├── DTOs/
│   │   ├── CreateProcurementProductDTO.php
│   │   └── UpdatePurchaseOrderDTO.php
│   └── Models/
│       ├── ProcurementProduct.php
│       └── PurchaseOrder.php
├── Finance/
│   ├── Controllers/
│   ├── Services/
│   ├── Repositories/
│   └── Models/
└── Catalog/
    ├── Controllers/
    ├── Services/
    └── Repositories/
```

**Benefits**:
- Codebase scales without complexity
- Clear domain boundaries
- Easy to find related code
- Team collaboration friendly

---

### 2. Contract-First Development

**Rule**: Define OpenAPI/Swagger spec BEFORE writing code

**Example Workflow**:
```bash
# 1. Define API spec
docs/api/procurement.yaml:
  /api/v2/procurement/products:
    post:
      summary: Create procurement product
      requestBody:
        schema:
          type: object
          properties:
            name: {type: string}
            category_id: {type: integer}
            suppliers: {type: array}

# 2. Generate DTO from spec
# 3. Implement controller
# 4. Test against spec
```

**Benefits**:
- Frontend and backend follow same contract
- Prevents integration issues
- Clear data structures
- Auto-generated documentation

---

### 3. DTOs (Data Transfer Objects) - MANDATORY

**Rule**: NEVER pass `$request->all()` to service layer

**❌ WRONG**:
```php
public function createOrder(Request $request, OrderService $service) {
    return $service->create($request->all()); // Untyped, unsafe
}
```

**✅ CORRECT**:
```php
// Form Request
class CreateOrderRequest extends FormRequest {
    public function rules() {
        return [
            'customer_name' => 'required|string|max:255',
            'total_amount' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
        ];
    }
}

// DTO
class CreateOrderDTO {
    public function __construct(
        public readonly string $customerName,
        public readonly float $totalAmount,
        public readonly array $items,
    ) {}
}

// Controller
public function createOrder(CreateOrderRequest $request, OrderService $service) {
    $orderData = new CreateOrderDTO(...$request->validated());
    return $service->createOrder($orderData);
}
```

**Benefits**:
- Type safety
- Predictable data flow
- Easy to test
- Self-documenting

---

### 4. Event-Driven Side Effects

**Rule**: Main request must NEVER wait for Mail/SMS/Notification

**❌ WRONG** (Blocks request):
```php
public function createOrder($data) {
    $order = Order::create($data);
    Mail::to($order->customer)->send(new OrderConfirmation($order)); // Blocks!
    SMS::send($order->phone, 'Order created'); // Blocks!
    return $order;
}
```

**✅ CORRECT** (Non-blocking):
```php
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

**Benefits**:
- Main request completes in < 100ms
- Better user experience
- Retry logic built-in
- Scalable

---

### 5. Clean Architecture Layers

**Flow**: Controller → Service → Repository → Model

```
┌─────────────┐
│  Controller │ ← HTTP handling, validation only
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │ ← Business logic
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │ ← Data access
└──────┬──────┘
       │
┌──────▼──────┐
│    Model    │ ← Eloquent ORM
└─────────────┘
```

**Controller** (Thin):
```php
public function store(CreateOrderRequest $request, OrderService $service) {
    $result = $service->createOrder(new CreateOrderDTO($request->validated()));

    if ($result->isFailure()) {
        return $this->sendError($result->getError(), null, 422);
    }

    return $this->sendSuccess($result->getData(), 'Order created', 201);
}
```

**Service** (Business Logic):
```php
class OrderService {
    public function createOrder(CreateOrderDTO $data): Result {
        return DB::transaction(function () use ($data) {
            if (!$this->hasEnoughStock($data->items)) {
                return Result::failure('Insufficient stock');
            }

            $order = $this->repository->store($data);
            OrderCreated::dispatch($order);

            return Result::success($order);
        });
    }
}
```

**Repository** (Data Access):
```php
class OrderRepository {
    public function store(CreateOrderDTO $data): Order {
        return Order::create([
            'customer_name' => $data->customerName,
            'total_amount' => $data->totalAmount,
        ]);
    }
}
```

---

## 💻 CODE CRAFT

### Railway Oriented Programming

**Rule**: Use Result objects for user errors (not exceptions)

**❌ WRONG** (Exceptions for everything):
```php
try {
    $order = $this->createOrder($data);
} catch (InsufficientStockException $e) {
    return response()->json(['error' => $e->getMessage()], 400);
}
```

**✅ CORRECT** (Result objects):
```php
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

**Result Class**:
```php
class Result {
    private function __construct(
        private readonly bool $success,
        private readonly mixed $data,
        private readonly ?string $error = null,
    ) {}

    public static function success(mixed $data): self {
        return new self(true, $data);
    }

    public static function failure(string $error): self {
        return new self(false, null, $error);
    }

    public function isSuccess(): bool {
        return $this->success;
    }

    public function isFailure(): bool {
        return !$this->success;
    }

    public function getData(): mixed {
        return $this->data;
    }

    public function getError(): ?string {
        return $this->error;
    }
}
```

---

### Immutability (PHP)

**Rule**: Never mutate collections - always return new

**❌ WRONG**:
```php
$products->transform(function ($product) {
    $product->price_with_tax = $product->price * 1.1; // Mutates!
    return $product;
});
```

**✅ CORRECT**:
```php
$productsWithTax = $products->map(function ($product) {
    return (object) [
        'id' => $product->id,
        'name' => $product->name,
        'price_with_tax' => $product->price * 1.1,
    ];
});
```

---

## 🔒 SECURITY (NON-NEGOTIABLE)

- ✅ Form Request validation on ALL inputs
- ✅ Mass assignment protection (guarded/fillable)
- ✅ Authentication + Authorization (Policies/Gates)
- ✅ Never expose exceptions to client
- ✅ API must NEVER crash due to client behavior

---

## ⚡ PERFORMANCE

- ✅ Prevent N+1 (eager loading)
- ✅ Select only required columns
- ✅ Pagination for large datasets
- ✅ Use chunking for heavy processing
- ✅ **Atomic Transactions**: Always `DB::transaction()` for multi-table updates

---

## 📋 BACKEND CHECKLIST

Before committing code:

- [ ] Uses DTOs (no `$request->all()`)
- [ ] Side effects in Queue/Events (no blocking)
- [ ] `DB::transaction()` for multi-table updates
- [ ] Result objects for user errors
- [ ] OpenAPI/Swagger documented
- [ ] PSR-12 compliant
- [ ] No `env()` calls outside config files
- [ ] All inputs validated (Form Request)
- [ ] Functions < 50 lines (break down if larger)
- [ ] Descriptive function/variable names

---

## 💡 CODE EXAMPLES

See [instruction/examples/backend.md](./examples/backend.md) for:
- DTO implementation examples
- Event-driven code samples
- Result objects
- Service/Repository patterns
- Immutability in PHP

---

## 📚 RELATED FILES

- **Main Reference**: [instruction/global-lean.md](./global-lean.md)
- **Frontend Rules**: [instruction/frontend.md](./frontend.md)
- **UX Patterns**: [instruction/ux.md](./ux.md)
- **Full Docs**: [instruction/global.md](./global.md)

---

**Last Updated**: 2026-03-27
**Focus**: Laravel 12 Backend Development
