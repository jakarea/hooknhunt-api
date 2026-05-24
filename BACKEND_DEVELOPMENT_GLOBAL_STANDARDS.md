# Backend Development Global Standards
## Hook & Hunt E-Commerce Platform - Official Development Guidelines

**Version:** 1.0.0  
**Last Updated:** 2025-05-24  
**Status:** **MANDATORY FOR ALL BACKEND DEVELOPERS**  
**Framework:** Laravel 11.x | PHP 8.3+

---

## 🎯 MISSION STATEMENT

Build a **world-class, production-ready e-commerce backend** that is:
- ⚡ **Blazing fast** (sub-100ms API responses)
- 🔒 **Secure by default**
- 🧩 **100% modular & independent**
- 📖 **Human-readable & maintainable**
- 🔄 **RESTful & standards-compliant**

---

## 📋 TABLE OF CONTENTS

1. [Naming Conventions](#1-naming-conventions)
2. [Code Structure & Modularity](#2-code-structure--modularity)
3. [API Design Standards](#3-api-design-standards)
4. [Database Standards](#4-database-standards)
5. [Error Handling & Logging](#5-error-handling--logging)
6. [Performance Optimization](#6-performance-optimization)
7. [Security Standards](#7-security-standards)
8. [Development Workflow](#8-development-workflow)
9. [Testing & Validation](#9-testing--validation)
10. [Code Review Checklist](#10-code-review-checklist)

---

## 1. NAMING CONVENTIONS

### **1.1 File & Folder Naming**

```
✅ CORRECT:
Modules/Website/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   └── V2/
│   │   │   │       └── ProductController.php
│   │   ├── Requests/
│   │   │   └── PlaceOrderRequest.php
│   │   └── Resources/
│   │       └── ProductResource.php
│   ├── Models/
│   │   ├── WebsiteProduct.php
│   │   └── WebsiteOrder.php
│   └── Traits/
│       └── ApiResponse.php

❌ WRONG:
Modules/Website/
├── app/
│   ├── Http/Controllers/
│   │   ├── productController.php  // Wrong case
│   │   └── product_controller.php  // Snake case
```

**Rules:**
- **PascalCase** for **Classes** (Controllers, Models, Requests, Resources)
- **camelCase** for **Methods** and **Properties**
- **UPPER_SNAKE_CASE** for **Constants**
- **kebab-case** for **Routes** and **Views**
- **snake_case** for **Database Tables** and **Columns**

### **1.2 Class Naming**

```php
<?php

// ✅ CORRECT - PascalCase for classes
class ProductController extends Controller
{
}

class WebsiteProduct extends Model
{
}

class PlaceOrderRequest extends FormRequest
{
}

class ProductResource extends JsonResource
{
}

class ApiResponse extends Trait
{
}

// ✅ CORRECT - Descriptive, specific names
class CustomerAddressController extends Controller
{
}

// ❌ WRONG - Vague or incorrect naming
class DataController extends Controller  // Too vague
class productController extends Controller  // Wrong case
class Product_Controller extends Controller  // Wrong case
```

### **1.3 Method Naming**

```php
<?php

// ✅ CORRECT - camelCase with verb-first pattern
class ProductController extends Controller
{
    // Get/Fetch pattern - retrieving data
    public function index(): JsonResponse  // List all
    public function show(int $id): JsonResponse  // Show single
    public function getFeatured(): JsonResponse  // Get specific subset
    public function fetchBySlug(string $slug): JsonResponse  // Fetch with criteria
    
    // Store/Create pattern - creating data
    public function store(StoreProductRequest $request): JsonResponse
    public function create(CreateOrderRequest $request): JsonResponse
    
    // Update pattern - updating data
    public function update(UpdateProductRequest $request, int $id): JsonResponse
    
    // Destroy/Delete pattern - deleting data
    public function destroy(int $id): JsonResponse
    
    // Boolean/Check pattern - returning boolean
    public function hasVariants(): bool
    public function canDelete(): bool
    public function shouldSync(): bool
    
    // Is/Has pattern - boolean checks
    public function isActive(): bool
    public function inStock(): bool
    
    // Calculate/Compute pattern - computations
    public function calculateTotal(): float
    public function computeTax(): float
}

// ❌ WRONG
public function getProducts()  // Should be index()
public function product_data()  // Wrong case, should be getProductData()
public function getData()  // Too vague
public function check()  // Not descriptive
public function process()  // Not specific enough
```

### **1.4 Variable Naming**

```php
<?php

// ✅ CORRECT - camelCase with descriptive names
class OrderService
{
    public function processOrder(Order $order): void
    {
        $customerId = $order->customer_id;
        $totalAmount = $order->total_amount;
        $isPaid = $order->is_paid;
        $shouldNotify = $order->should_notify_customer;
        
        $orderItems = $order->items;
        $shippingAddress = $order->shipping_address;
        $paymentMethod = $order->payment_method;
    }
    
    // Collections use descriptive plural names
    public function getActiveProducts(): Collection
    {
        $products = Product::active()->get();
        $featuredProducts = Product::featured()->get();
        $outOfStockItems = collect();
        
        return $products;
    }
}

// ❌ WRONG
$cust_id = $order->cust_id;  // Abbreviations
$amount = $order->amt;  // Not descriptive
$data = $order->data;  // Too vague
$flag = $order->is_paid;  // Not descriptive
$arr = $order->items;  // Abbreviation
```

### **1.5 Constant Naming**

```php
<?php

// ✅ CORRECT - UPPER_SNAKE_CASE with descriptive names
class OrderStatus
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    
    public const MAX_RETRY_ATTEMPTS = 3;
    public const DEFAULT_PAGE_SIZE = 20;
    public const CACHE_TTL_SECONDS = 3600;
    
    // Error codes
    public const ERR_INVALID_INPUT = 'INVALID_INPUT';
    public const ERR_NOT_FOUND = 'NOT_FOUND';
    public const ERR_UNAUTHORIZED = 'UNAUTHORIZED';
}

// ✅ CORRECT - Class-specific constants
class PaymentGateway
{
    private const EPS_MERCHANT_ID = 'your_merchant_id';
    private const EPS_API_URL = 'https://api.example.com';
    private const TIMEOUT_SECONDS = 30;
}

// ❌ WRONG
class OrderStatus
{
    const pending = 'pending';  // Lowercase
    const STATUS_PENDING2 = 'pending';  // Numbered
    const STATUS = 'pending';  // Not specific
}
```

---

## 2. CODE STRUCTURE & MODULARITY

### **2.1 Module Structure**

```
Modules/
├── Website/                          # Website module (100% independent)
│   ├── app/
│   │   ├── Http/Controllers/         # Controllers
│   │   │   └── Api/
│   │   │       └── V2/
│   │   │           ├── ProductController.php
│   │   │           ├── OrderController.php
│   │   │           └── AuthController.php
│   │   ├── Http/Requests/            # Form Requests
│   │   │   └── PlaceOrderRequest.php
│   │   ├── Http/Resources/           # API Resources
│   │   │   └── ProductResource.php
│   │   ├── Models/                   # Models
│   │   │   ├── WebsiteProduct.php
│   │   │   ├── WebsiteOrder.php
│   │   │   └── WebsiteCategory.php
│   │   ├── Services/                 # Business Logic
│   │   │   ├── OrderService.php
│   │   │   └── PaymentService.php
│   │   ├── Traits/                   # Traits
│   │   │   └── ApiResponse.php
│   │   ├── Exceptions/               # Custom Exceptions
│   │   │   └── OrderException.php
│   │   └── Events/                   # Events & Listeners
│   │       ├── OrderCreated.php
│   │       └── OrderCreatedListener.php
│   ├── routes/                       # Routes
│   │   └── api.php
│   ├── database/                     # Database
│   │   ├── migrations/
│   │   └── seeders/
│   └── tests/                        # Tests
│       ├── Unit/
│       └── Feature/
├── Catalog/                          # Catalog module
└── System/                           # System module
```

### **2.2 Controller Structure**

```php
<?php

namespace App\Modules\Website\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Website\Traits\ApiResponse;
use App\Modules\Website\Http\Requests\PlaceOrderRequest;
use App\Modules\Website\Services\OrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    use ApiResponse;
    
    protected OrderService $orderService;
    
    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }
    
    /**
     * Place a new order (guest or authenticated).
     *
     * @param PlaceOrderRequest $request
     * @return JsonResponse
     */
    public function placeOrder(PlaceOrderRequest $request): JsonResponse
    {
        try {
            $order = $this->orderService->placeOrder($request->validated());
            
            return $this->sendSuccess(
                $order->load('items'),
                'Order placed successfully.',
                201
            );
        } catch (OrderException $e) {
            return $this->sendError(
                $e->getMessage(),
                $e->getErrors(),
                $e->getCode()
            );
        }
    }
    
    /**
     * Get order details.
     *
     * @param string $invoiceNo
     * @return JsonResponse
     */
    public function show(string $invoiceNo): JsonResponse
    {
        try {
            $order = WebsiteOrder::where('invoice_no', $invoiceNo)
                ->with(['items', 'statusHistory'])
                ->firstOrFail();
            
            return $this->sendSuccess($order, 'Order retrieved successfully.');
        } catch (ModelNotFoundException $e) {
            return $this->sendError('Order not found.', null, 404);
        }
    }
}
```

### **2.3 Service Layer Pattern**

```php
<?php

namespace App\Modules\Website\Services;

use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Website\Models\WebsiteOrderItem;
use App\Modules\Website\Exceptions\OrderException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    /**
     * Place a new order.
     *
     * @param array $data
     * @return WebsiteOrder
     * @throws OrderException
     */
    public function placeOrder(array $data): WebsiteOrder
    {
        return DB::transaction(function () use ($data) {
            // Create order
            $order = WebsiteOrder::create([
                'customer_id' => $data['customer_id'],
                'total_amount' => $data['total_amount'],
                'status' => OrderStatus::STATUS_PENDING,
                // ... other fields
            ]);
            
            // Create order items
            foreach ($data['items'] as $item) {
                WebsiteOrderItem::create([
                    'sales_order_id' => $order->id,
                    'product_variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['price'],
                    'total_price' => $item['quantity'] * $item['price'],
                ]);
            }
            
            // Update stock
            $this->updateProductStock($data['items']);
            
            // Fire event
            event(new OrderCreated($order));
            
            Log::info('Order placed successfully', [
                'order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
            ]);
            
            return $order;
        });
    }
    
    /**
     * Update product stock after order.
     *
     * @param array $items
     * @return void
     */
    protected function updateProductStock(array $items): void
    {
        foreach ($items as $item) {
            ProductVariant::where('id', $item['variant_id'])
                ->decrement('stock', $item['quantity']);
        }
    }
}
```

### **2.4 Model Structure**

```php
<?php

namespace App\Modules\Website\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebsiteOrder extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $table = 'sales_orders';
    
    protected $guarded = ['id'];
    
    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'external_data' => 'array',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'is_paid' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['status_label', 'due_amount'];
    
    /**
     * Relationships
     */
    
    public function items(): HasMany
    {
        return $this->hasMany(WebsiteOrderItem::class, 'sales_order_id');
    }
    
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
    
    /**
     * Scopes
     */
    
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
    
    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
    
    /**
     * Accessors
     */
    
    public function getStatusLabelAttribute(): string
    {
        return OrderStatus::getLabel($this->status);
    }
    
    public function getDueAmountAttribute(): float
    {
        return max(0, $this->total_amount - $this->paid_amount);
    }
    
    /**
     * Business Logic
     */
    
    public function isPaid(): bool
    {
        return $this->paid_amount >= $this->total_amount;
    }
    
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [
            OrderStatus::STATUS_PENDING,
            OrderStatus::STATUS_PROCESSING,
        ]);
    }
}
```

---

## 3. API DESIGN STANDARDS

### **3.1 RESTful API Conventions**

```php
<?php

// ✅ CORRECT - RESTful route naming
Route::prefix('api/v2/store')->group(function () {
    // Resources - plural
    Route::apiResource('products', ProductController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('orders', OrderController::class)->only(['store', 'show']);
    
    // Nested resources
    Route::apiResource('categories.products', CategoryProductController::class)->only(['index']);
    
    // Specific actions - clear, descriptive names
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/{slug}/related', [ProductController::class, 'related']);
    Route::post('/orders/{invoice_no}/cancel', [OrderController::class, 'cancel']);
    
    // Search endpoints
    Route::get('/search', [SearchController::class, 'products']);
    Route::get('/search/suggestions', [SearchController::class, 'suggestions']);
});

// ❌ WRONG
Route::get('/get-products', [ProductController::class, 'getProducts']);
Route::post('/create-order', [OrderController::class, 'createOrder']);
Route::post('/order/cancel', [OrderController::class, 'cancelOrder']);
```

### **3.2 Response Format Standardization**

```php
<?php

// ✅ CORRECT - Consistent response format
trait ApiResponse
{
    /**
     * Success Response
     *
     * @param mixed $data
     * @param string $message
     * @param int $code
     * @return JsonResponse
     */
    protected function sendSuccess(
        $data = null,
        string $message = 'Success',
        int $code = 200
    ): JsonResponse {
        return response()->json([
            'status' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
        ], $code);
    }
    
    /**
     * Error Response
     *
     * @param string $message
     * @param mixed $errors
     * @param int $code
     * @return JsonResponse
     */
    protected function sendError(
        string $message,
        $errors = null,
        int $code = 400
    ): JsonResponse {
        return response()->json([
            'status' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], $code);
    }
    
    /**
     * Validation Error Response (422)
     *
     * @param array $errors
     * @param string $message
     * @return JsonResponse
     */
    protected function sendValidationError(
        array $errors,
        string $message = 'Validation failed'
    ): JsonResponse {
        return response()->json([
            'status' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], 422);
    }
}

// ✅ SUCCESS RESPONSE EXAMPLE
{
    "status": true,
    "message": "Products retrieved successfully",
    "data": {
        "data": [...],
        "total": 100,
        "current_page": 1,
        "last_page": 5
    },
    "errors": null
}

// ✅ ERROR RESPONSE EXAMPLE
{
    "status": false,
    "message": "Validation failed",
    "data": null,
    "errors": {
        "email": ["The email field is required."],
        "phone": ["The phone must be 11 digits."]
    }
}
```

### **3.3 Resource Response Formatting**

```php
<?php

namespace App\Modules\Website\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'retailName' => $this->retail_name,
            'nameBn' => $this->retail_name_bn,
            
            // Image - Standardized format
            'image_url' => $this->formatImageUrl($this->thumbnail_path),
            'image_id' => $this->thumbnail_id,
            
            // Gallery images
            'gallery_images' => $this->when(
                $this->gallery_images,
                $this->formatGalleryImages($this->gallery_images)
            ),
            
            // Pricing
            'price' => (float) $this->price,
            'actual_price' => (float) $this->offer_price ?? (float) $this->price,
            'originalPrice' => (float) $this->price,
            'compare_at_price' => (float) $this->compare_at_price,
            
            // Stock
            'stock' => (int) $this->stock,
            'in_stock' => $this->stock > 0,
            'variant_count' => $this->variant_count,
        ];
    }
    
    /**
     * Format image URL with full path.
     *
     * @param string|null $path
     * @return string
     */
    protected function formatImageUrl(?string $path): string
    {
        if (!$path) {
            return url('/storage/placeholder.jpg');
        }
        
        if (str_starts_with($path, 'http')) {
            return $path;
        }
        
        return url('/storage/' . ltrim($path, '/'));
    }
    
    /**
     * Format gallery images.
     *
     * @param array $images
     * @return array
     */
    protected function formatGalleryImages(array $images): array
    {
        return collect($images)->map(function ($image) {
            return [
                'image_url' => $this->formatImageUrl($image['path'] ?? null),
                'image_id' => $image['id'] ?? null,
            ];
        })->toArray();
    }
}
```

### **3.4 Pagination Standard**

```php
<?php

// ✅ CORRECT - Consistent pagination format
class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 20), 100);
        $page = (int) $request->input('page', 1);
        
        $query = Product::query();
        $total = $query->count();
        
        $products = $query
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();
        
        $lastPage = (int) ceil($total / $perPage);
        
        return response()->json([
            'status' => true,
            'message' => 'Success',
            'data' => [
                'data' => ProductResource::collection($products),
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => $lastPage,
                'next_page_url' => ($page < $lastPage)
                    ? url()->current() . '?' . http_build_query(['page' => $page + 1, 'per_page' => $perPage])
                    : null,
            ],
            'errors' => null,
        ]);
    }
}
```

---

## 4. DATABASE STANDARDS

### **4.1 Database Conventions**

```sql
-- ✅ CORRECT - Database naming conventions

-- Tables: snake_case, plural
CREATE TABLE website_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    catalog_product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    
    -- Foreign keys: {table}_{column}_foreign
    category_id BIGINT UNSIGNED,
    brand_id BIGINT UNSIGNED,
    thumbnail_id BIGINT UNSIGNED,
    
    -- Indexes: idx_{table}_{columns}
    INDEX idx_website_products_slug (slug),
    INDEX idx_website_products_category (category_id),
    INDEX idx_website_products_status (is_published, is_active),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    FOREIGN KEY (thumbnail_id) REFERENCES media_files(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columns: snake_case, descriptive
-- ✅ Use specific names
product_name VARCHAR(255)
customer_email VARCHAR(255)
order_total_amount DECIMAL(10,2)

-- ❌ Avoid abbreviations
prod_nm VARCHAR(255)
cust_eml VARCHAR(255)
ord_tot DECIMAL(10,2)
```

### **4.2 Migration Standards**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('website_products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('catalog_product_id');
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable();
            $table->text('description')->nullable();
            
            // Foreign keys
            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('brand_id')->nullable();
            $table->unsignedBigInteger('thumbnail_id')->nullable();
            
            // JSON fields
            $table->json('gallery_images')->nullable();
            $table->json('highlights')->nullable();
            
            // Decimal for money
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('compare_at_price', 10, 2)->nullable();
            
            // Boolean flags
            $table->boolean('is_published')->default(false);
            $table->boolean('is_active')->default(true);
            
            // Indexes
            $table->index('slug');
            $table->index('category_id');
            $table->index(['is_published', 'is_active']);
            
            // Foreign key constraints
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
            $table->foreign('brand_id')->references('id')->on('brands')->onDelete('set null');
            $table->foreign('thumbnail_id')->references('id')->on('media_files')->onDelete('set null');
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
        });
    }
    
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_products');
    }
};
```

### **4.3 Query Optimization Standards**

```php
<?php

// ✅ CORRECT - Direct SQL for performance (no N+1)
class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Use direct SQL - only select what's needed
        $products = DB::table('products as p')
            ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
            ->where('p.status', 'published')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', '=', 'p.id')
                    ->where('channel', 'retail')
                    ->where('is_active', true)
                    ->limit(1);
            })
            ->select([
                'p.id',
                'p.name',
                'p.slug',
                'p.retail_name',
                'p.retail_name_bn',
                'm.path as thumbnail_path',
                'm.url as thumbnail_url',
            ])
            ->orderBy('p.created_at', 'desc')
            ->paginate(20);
        
        return $this->sendSuccess($products);
    }
}

// ❌ WRONG - N+1 query problem
class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::with(['category', 'brand', 'thumbnail'])->get();
        
        // This will execute additional queries for each product's relationships
        return $this->sendSuccess($products);
    }
}
```

### **4.4 Denormalization Strategy**

```php
<?php

// ✅ CORRECT - Denormalized data for performance
class WebsiteProduct extends Model
{
    protected $table = 'website_products';
    
    /**
     * Stores denormalized data to avoid joins
     *
     * Stored directly:
     * - category_id, category_name, category_slug
     * - brand_id, brand_name, brand_slug
     * - thumbnail_path (not thumbnail_id)
     * - price, stock (computed values)
     *
     * Updated via event listeners when source data changes
     */
    protected $fillable = [
        'catalog_product_id',
        'name',
        'slug',
        'sku',
        'description',
        'price',
        'compare_at_price',
        'stock',
        'thumbnail_path',
        
        // Denormalized fields
        'category_id',
        'category_name',
        'category_slug',
        'brand_id',
        'brand_name',
        'brand_slug',
    ];
}
```

---

## 5. ERROR HANDLING & LOGGING

### **5.1 Custom Exception Classes**

```php
<?php

namespace App\Modules\Website\Exceptions;

use Exception;

class OrderException extends Exception
{
    protected array $errors = [];
    protected int $statusCode = 400;
    
    public function __construct(
        string $message,
        array $errors = [],
        int $statusCode = 400
    ) {
        parent::__construct($message);
        $this->errors = $errors;
        $this->statusCode = $statusCode;
    }
    
    public function getErrors(): array
    {
        return $this->errors;
    }
    
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
    
    /**
     * Static factory methods for common scenarios
     */
    public static function outOfStock(): self
    {
        return new self(
            'One or more products are out of stock',
            ['items' => ['Selected products are not available in requested quantity']],
            400
        );
    }
    
    public static function invalidPaymentMethod(string $method): self
    {
        return new self(
            'Invalid payment method',
            ['payment_method' => ["The payment method '{$method}' is not available"]],
            400
        );
    }
}
```

### **5.2 Global Exception Handler**

```php
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        // API requests
        if ($request->expectsJson()) {
            return $this->handleApiException($e);
        }
        
        // Web requests
        return parent::render($request, $e);
    }
    
    /**
     * Handle API exceptions.
     */
    protected function handleApiException(Throwable $e): \Illuminate\Http\JsonResponse
    {
        // Validation exceptions
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'data' => null,
                'errors' => $e->errors(),
            ], 422);
        }
        
        // Model not found
        if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'status' => false,
                'message' => 'Resource not found',
                'data' => null,
                'errors' => null,
            ], 404);
        }
        
        // Custom exceptions
        if ($e instanceof \App\Exceptions\OrderException) {
            return response()->json([
                'status' => false,
                'message' => $e->getMessage(),
                'data' => null,
                'errors' => $e->getErrors(),
            ], $e->getStatusCode());
        }
        
        // Generic error (don't expose details in production)
        $isDebug = config('app.debug');
        
        return response()->json([
            'status' => false,
            'message' => $isDebug ? $e->getMessage() : 'An error occurred',
            'data' => null,
            'errors' => $isDebug ? ['trace' => $e->getTrace()] : null,
        ], 500);
    }
}
```

### **5.3 Logging Standards**

```php
<?php

use Illuminate\Support\Facades\Log;

class OrderService
{
    public function placeOrder(array $data): WebsiteOrder
    {
        // Log start of operation
        Log::info('Order placement started', [
            'customer_id' => $data['customer_id'],
            'item_count' => count($data['items']),
        ]);
        
        try {
            DB::transaction(function () use ($data) {
                $order = $this->createOrder($data);
                
                // Log success
                Log::info('Order placed successfully', [
                    'order_id' => $order->id,
                    'invoice_no' => $order->invoice_no,
                    'total_amount' => $order->total_amount,
                ]);
                
                return $order;
            });
        } catch (\Exception $e) {
            // Log error with context
            Log::error('Order placement failed', [
                'customer_id' => $data['customer_id'],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            throw $e;
        }
    }
}

// ✅ CORRECT - Structured logging
Log::info('User logged in', [
    'user_id' => $user->id,
    'ip_address' => $request->ip(),
    'user_agent' => $request->userAgent(),
]);

Log::warning('High order value detected', [
    'order_id' => $order->id,
    'total_amount' => $order->total_amount,
    'threshold' => 100000,
]);

Log::error('Payment gateway error', [
    'order_id' => $order->id,
    'gateway' => 'eps',
    'error_code' => $e->getCode(),
    'error_message' => $e->getMessage(),
]);
```

---

## 6. PERFORMANCE OPTIMIZATION

### **6.1 Database Query Optimization**

```php
<?php

// ✅ CORRECT - Query optimization techniques

// 1. Select only needed columns
$products = DB::table('products')
    ->select(['id', 'name', 'slug', 'price', 'thumbnail_path'])
    ->get();

// 2. Use indexes effectively
$orders = WebsiteOrder::where('customer_id', $customerId)
    ->where('status', 'pending')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get(); // Uses index on (customer_id, status, created_at)

// 3. Avoid N+1 queries
// ❌ WRONG
$orders = Order::all();
foreach ($orders as $order) {
    echo $order->customer->name; // N+1 problem
}

// ✅ CORRECT
$orders = Order::with('customer')->get();
foreach ($orders as $order) {
    echo $order->customer->name;
}

// 4. Use chunking for large operations
Product::chunk(1000, function ($products) {
    foreach ($products as $product) {
        // Process 1000 products at a time
    }
});

// 5. Use eager loading with constraints
$orders = Order::with(['customer:id,name', 'items:product_name,quantity'])->get();
```

### **6.2 Caching Strategy**

```php
<?php

use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    public function featured(): JsonResponse
    {
        // Cache featured products for 1 hour
        $products = Cache::remember('products.featured', 3600, function () {
            return Product::featured()->limit(12)->get();
        });
        
        return $this->sendSuccess($products);
    }
    
    public function show(string $slug): JsonResponse
    {
        // Cache individual product
        $product = Cache::remember("products.{$slug}", 3600, function () use ($slug) {
            return Product::where('slug', $slug)->firstOrFail();
        });
        
        return $this->sendSuccess($product);
    }
    
    /**
     * Clear cache when product is updated
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();
        $product->update($request->validated());
        
        // Clear relevant caches
        Cache::forget("products.{$slug}");
        Cache::forget('products.featured');
        Cache::tags(['products'])->flush();
        
        return $this->sendSuccess($product);
    }
}
```

### **6.3 Queue Jobs for Heavy Tasks**

```php
<?php

namespace App\Jobs;

use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Website\Services\OrderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessOrderPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    protected int $tries = 3;
    protected int $timeout = 30;
    
    public function __construct(
        protected int $orderId
    ) {
    }
    
    public function handle(OrderService $orderService): void
    {
        $order = WebsiteOrder::find($this->orderId);
        
        if (!$order) {
            Log::warning('Order not found for payment processing', [
                'order_id' => $this->orderId,
            ]);
            return;
        }
        
        try {
            $orderService->processPayment($order);
            
            Log::info('Payment processed successfully', [
                'order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
            ]);
        } catch (\Exception $e) {
            Log::error('Payment processing failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            
            $this->release(30); // Retry after 30 seconds
        }
    }
    
    public function failed(\Throwable $exception): void
    {
        Log::error('Payment job failed permanently', [
            'order_id' => $this->orderId,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

---

## 7. SECURITY STANDARDS

### **7.1 Input Validation**

```php
<?php

namespace App\Modules\Website\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class PlaceOrderRequest extends FormRequest
{
    /**
     * Determine if user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // For guest checkout, always return true
        // For authenticated users, check if they can place orders
        return true;
    }
    
    /**
     * Get validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Customer info
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'required|string|regex:/^01[3-9]\d{8}$/',
            
            // Shipping address
            'shipping_address' => 'required|array',
            'shipping_address.full_name' => 'required|string|max:255',
            'shipping_address.phone' => 'required|string|regex:/^01[3-9]\d{8}$/',
            'shipping_address.address_line1' => 'required|string|max:255',
            'shipping_address.city' => 'required|string|max:100',
            'shipping_address.district' => 'required|string|max:100',
            'shipping_address.thana' => 'nullable|string|max:100',
            
            // Order items
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            
            // Payment
            'payment_method' => 'required|string|in:cod,sslcommerz,eps',
            
            // Coupons
            'coupon_code' => 'nullable|string|exists:discounts,code,active,true',
        ];
    }
    
    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'customer_phone.regex' => 'The phone number must be a valid BD number (01XXXXXXXXX)',
            'items.*.variant_id.exists' => 'The selected product is not available',
            'payment_method.in' => 'The selected payment method is not available',
        ];
    }
    
    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'status' => false,
                'message' => 'Validation failed',
                'data' => null,
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
```

### **7.2 SQL Injection Prevention**

```php
<?php

// ✅ CORRECT - Use parameterized queries
$products = DB::select('SELECT * FROM products WHERE category_id = ?', [$categoryId]);

// ✅ CORRECT - Use query builder
$products = DB::table('products')
    ->where('category_id', $categoryId)
    ->where('name', 'like', '%' . $search . '%')
    ->get();

// ✅ CORRECT - Use Eloquent
$products = Product::where('category_id', $categoryId)
    ->where('name', 'like', '%' . $search . '%')
    ->get();

// ❌ WRONG - Direct interpolation (SQL injection risk)
$products = DB::select("SELECT * FROM products WHERE category_id = $categoryId");
```

### **7.3 XSS Prevention**

```php
<?php

// ✅ CORRECT - Laravel auto-escapes output in Blade
// No manual escaping needed in Blade templates

// ✅ CORRECT - For JSON responses, ensure proper encoding
return response()->json($data);

// ✅ CORRECT - Sanitize user input before storing
use Illuminate\Support\Str;

$sanitizedInput = Str::of($input)->trim()->stripTags();
```

### **7.4 Authentication & Authorization**

```php
<?php

// ✅ CORRECT - Middleware for route protection
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user/profile', [ProfileController::class, 'show']);
    Route::post('/user/profile', [ProfileController::class, 'update']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// ✅ CORRECT - Policy-based authorization
class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->customer_id || $user->isAdmin();
    }
    
    public function update(User $user, Order $order): bool
    {
        return $user->id === $order->customer_id || $user->isAdmin();
    }
    
    public function delete(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}

// Use policy in controller
$this->authorize('view', $order);
```

---

## 8. DEVELOPMENT WORKFLOW

### **8.1 Task Planning Process**

**MANDATORY FOR ALL TASKS:**

```
1. UNDERSTAND REQUIREMENTS
   ├─ Read task description completely
   ├─ Identify all affected modules
   ├─ List required database changes
   ├─ Check for breaking API changes
   └─ Note security implications

2. QUESTIONS & CLARIFICATIONS
   ├─ Ask questions before starting
   ├─ Confirm database schema changes
   ├─ Verify API contract with frontend
   ├─ Check module boundaries
   └─ Get approval for approach

3. CREATE TASK TODO LIST
   ├─ Database migrations
   ├─ Model updates
   ├─ Controller changes
   ├─ Service layer updates
   ├─ Tests to write
   └─ Documentation updates

4. VALIDATE PLAN
   ├─ Review with team/senior dev
   ├─ Check for performance impact
   ├─ Verify security implications
   ├─ Test database queries
   └─ Get final approval

5. EXECUTE
   ├─ Create migration first
   ├─ Update models
   ├─ Write services
   ├─ Update controllers
   ├─ Write tests
   └─ Update documentation

6. CODE REVIEW
   ├─ Self-review before PR
   ├─ Run tests locally
   ├─ Check all requirements met
   ├─ Verify no regressions
   └─ Document changes
```

### **8.2 Pre-Task Checklist**

Before starting ANY task, confirm:

- [ ] I understand the complete requirement
- [ ] I know which modules/tables are affected
- [ ] I have reviewed the current code
- [ ] I know the API contract with frontend
- [ ] I've asked all unclear questions
- [ ] I have a plan with todo list
- [ ] I've estimated complexity correctly
- [ ] I know the acceptance criteria

### **8.3 Git Commit Standards**

```bash
# Commit message format
<type>(<scope>): <subject>

<body>

<footer>

# Types
feat:     New feature
fix:      Bug fix
refactor: Code refactoring (no behavior change)
perf:     Performance improvement
style:    Code style changes (formatting)
test:     Adding or updating tests
docs:     Documentation only
chore:    Maintenance tasks

# Examples
feat(products): add product image lazy loading

- Implemented ImageHelper trait for consistent URL formatting
- Added placeholder image fallback
- Updated all product endpoints to use image_url field
- Improved API response time by 40%

Fixes #123

fix(payment): resolve EPS payment IPN validation

The EPS payment IPN endpoint was not properly validating
the transaction signature, allowing fake payment notifications.
This fix adds proper signature validation and transaction verification.

Closes #456

refactor(products): denormalize product category data

- Added category_name, category_slug to website_products table
- Removed unnecessary category relationship
- Updated ProductController to use denormalized data
- Improved query performance by 60%

BREAKING CHANGE: Product category response structure changed.
See API_IMAGE_CHANGES_DOCUMENTATION.md for migration guide.
```

---

## 9. TESTING & VALIDATION

### **9.1 Unit Testing**

```php
<?php

namespace Tests\Unit\Modules\Website;

use Tests\TestCase;
use App\Modules\Website\Services\OrderService;
use App\Modules\Website\Models\WebsiteOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class OrderServiceTest extends TestCase
{
    use RefreshDatabase;
    
    protected OrderService $orderService;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->orderService = new OrderService();
    }
    
    public function test_calculate_order_total(): void
    {
        // Arrange
        $items = [
            ['variant_id' => 1, 'quantity' => 2, 'price' => 100],
            ['variant_id' => 2, 'quantity' => 1, 'price' => 50],
        ];
        
        // Act
        $total = $this->orderService->calculateTotal($items);
        
        // Assert
        $this->assertEquals(250, $total);
    }
    
    public function test_cannot_place_order_with_out_of_stock_items(): void
    {
        // Arrange
        $variant = ProductVariant::factory()->create(['stock' => 5]);
        
        $data = [
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 10, 'price' => 100],
            ],
        ];
        
        // Act & Assert
        $this->expectException(OrderException::class);
        $this->orderService->placeOrder($data);
    }
}
```

### **9.2 Feature Testing**

```php
<?php

namespace Tests\Feature\Modules\Website;

use Tests\TestCase;
use App\Modules\Website\Models\WebsiteProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_get_products_returns_successful_response(): void
    {
        // Arrange
        WebsiteProduct::factory()->count(10)->create();
        
        // Act
        $response = $this->getJson('/api/v2/store/products');
        
        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'message',
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'slug',
                            'image_url',
                            'price',
                        ]
                    ],
                    'total',
                    'current_page',
                    'last_page',
                ],
                'errors',
            ]);
    }
    
    public function test_get_product_by_slug_returns_not_found_for_invalid_slug(): void
    {
        // Act
        $response = $this->getJson('/api/v2/store/products/invalid-slug');
        
        // Assert
        $response->assertStatus(404)
            ->assertJson([
                'status' => false,
                'message' => 'Product not found',
                'data' => null,
            ]);
    }
}
```

### **9.3 API Testing Checklist**

Before marking API task complete:

- [ ] Endpoint returns correct HTTP status codes
- [ ] Response structure matches API documentation
- [ ] All image fields use `image_url` format
- [ ] Pagination works correctly
- [ ] Filtering/sorting works correctly
- [ ] Validation errors return 422 with proper error messages
- [ ] Authentication required endpoints are protected
- [ ] Authorization works correctly
- [ ] Database queries are optimized (check with Laravel Telescope)
- [ ] Response time is under 100ms for simple queries
- [ ] Response time is under 500ms for complex queries
- [ ] No N+1 queries (check query count)
- [ ] Cache is used where appropriate
- [ ] Error scenarios are handled gracefully

---

## 10. CODE REVIEW CHECKLIST

### **10.1 Before Submitting PR**

**Code Quality:**
- [ ] Code follows PSR-12 standards
- [ ] Methods are under 50 lines
- [ ] Classes are under 500 lines
- [ ] No duplicate code
- [ ] No commented-out code
- [ ] No dd() or var_dump() left in code
- [ ] No console.log() or debug prints
- [ ] No hardcoded values (use constants)

**Performance:**
- [ ] Database queries are optimized
- [ ] No N+1 queries
- [ ] Eager loading used correctly
- [ ] Cache implemented where appropriate
- [ ] Heavy jobs use queues
- [ ] Indexes added for new queries

**Security:**
- [ ] Input validation on all user input
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Authentication required on protected routes
- [ ] Authorization checks implemented
- [ ] Sensitive data not logged
- [ ] API rate limiting considered

**Testing:**
- [ ] Unit tests written for business logic
- [ ] Feature tests written for API endpoints
- [ ] Edge cases covered
- [ ] Manual testing completed

**Documentation:**
- [ ] Complex methods documented
- [ ] API changes documented
- [ ] Breaking changes noted
- [ ] Migration file includes comments

---

## 🚀 QUICK REFERENCE

### **Common Patterns**

```php
// ✅ Controller template
class FeatureController extends Controller
{
    use ApiResponse;
    
    protected FeatureService $service;
    
    public function __construct(FeatureService $service)
    {
        $this->service = $service;
    }
    
    public function index(): JsonResponse
    {
        try {
            $data = $this->service->getAll();
            return $this->sendSuccess($data);
        } catch (Exception $e) {
            Log::error('Failed to fetch data', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to fetch data');
        }
    }
}

// ✅ Service template
class FeatureService
{
    public function getAll(): Collection
    {
        return Cache::remember("feature.all", 3600, function () {
            return Model::active()->get();
        });
    }
    
    public function findById(int $id): ?Model
    {
        return Model::find($id);
    }
}

// ✅ Model template
class Feature extends Model
{
    protected $fillable = ['name'];
    protected $casts = ['is_active' => 'boolean'];
    protected $appends = ['display_name'];
    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
    
    public function getDisplayNameAttribute(): string
    {
        return ucfirst($this->name);
    }
}

// ✅ Migration template
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_name', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }
    
    public function down(): void
    {
        Schema::dropIfExists('table_name');
    }
};
```

---

## 📚 ADDITIONAL RESOURCES

- **Laravel Docs:** https://laravel.com/docs/11.x
- **PHP Standards:** https://www.php-fig.org/psr/psr-12/
- **Laravel Best Practices:** https://github.com/alexeymezenin/laravel-best-practices
- **Laravel Package Standards:** https://laravel-package.com/

---

## 📝 VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-05-24 | Initial version - Image URL standardization |

---

**Remember:** When in doubt, ASK. It's better to spend 5 minutes clarifying than 5 hours fixing the wrong implementation.

**Security first.** Never trust user input. Always validate and sanitize.

**Performance matters.** Every query counts. Optimize early.

**Test everything.** If you didn't test it, it doesn't work.

**Document your code.** Future you will thank present you.
