# Backend Code Examples

## DTO Example

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

## Event-Driven Side Effects

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

## Railway Oriented Programming

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

## Clean Architecture

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

## Immutability in PHP

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
