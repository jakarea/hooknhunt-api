<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\Order\OrderCreated;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Lazychat AI Order Creation Test Suite
 *
 * Tests for receiving orders from Lazychat AI.
 *
 * Run: php artisan test --filter LazychatOrderCreationTest
 */
class LazychatOrderCreationTest extends TestCase
{
    use RefreshDatabase;

    protected $validToken = 'test-lazychat-token-12345';
    protected $endpoint = '/api/order/create';

    protected function setUp(): void
    {
        parent::setUp();
        // Set the expected token in config for testing
        Config::set('lazychat.api_token', $this->validToken);
    }

    /** @test */
    public function lazychat_order_creation_requires_authentication()
    {
        $response = $this->postJson($this->endpoint, [
            'id' => 71,
            'contact' => [
                'name' => 'Test Customer',
                'phone' => '01700000000',
                'address_1' => 'Test Address',
            ],
            'total_price' => 1198,
            'deliveryCharge' => 0,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => 'unpaid',
            'line_items' => [
                [
                    'product_id' => '1',
                    'sku' => 'TEST-SKU',
                    'name' => 'Test Product',
                    'price' => 599,
                    'quantity' => 2,
                ],
            ],
        ]);

        $response->assertStatus(401);
        $response->assertJson([
            'success' => false,
            'error' => 'Authentication required',
        ]);
    }

    /** @test */
    public function lazychat_order_creation_with_valid_token()
    {
        // Create a test product with variant
        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'is_active' => true,
            'stock' => 50,
            'price' => 599,
        ]);

        $payload = [
            'id' => 71,
            'contact' => [
                'name' => 'Test Customer',
                'phone' => '01700000000',
                'address_1' => 'Gulshan, Dhaka',
            ],
            'total_price' => 1198,
            'deliveryCharge' => 0,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => 'unpaid',
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'variation_id' => $variant->id,
                    'sku' => $variant->sku,
                    'name' => 'Cosrx Salicylic Acid Daily Gentle Cleanser (50ml)',
                    'price' => 599,
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
            'message' => 'Order created successfully',
        ]);

        // Assert order was created
        $this->assertDatabaseHas('sales_orders', [
            'invoice_no' => 'LZ-71-',
        ]);

        // Assert stock was decremented
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock' => 48, // 50 - 2
        ]);
    }

    /** @test */
    public function lazychat_order_creates_new_customer()
    {
        Event::fake([OrderCreated::class]);

        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'is_active' => true,
            'stock' => 10,
            'price' => 100,
        ]);

        $newPhone = '01800000000'; // Phone that doesn't exist

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 72,
                'contact' => [
                    'name' => 'New Customer',
                    'phone' => $newPhone,
                    'address_1' => 'New Address',
                ],
                'total_price' => 100,
                'deliveryCharge' => 50,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'variation_id' => $variant->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 100,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Assert new customer was created
        $this->assertDatabaseHas('customers', [
            'phone' => $newPhone,
            'name' => 'New Customer',
        ]);

        // Assert OrderCreated event was dispatched
        Event::assertDispatched(OrderCreated::class);
    }

    /** @test */
    public function lazychat_order_with_existing_customer()
    {
        Event::fake([OrderCreated::class]);

        // Create existing customer
        $customer = Customer::factory()->create([
            'phone' => '01700000000',
            'name' => 'Existing Customer',
        ]);

        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 20,
            'price' => 500,
        ]);

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 73,
                'contact' => [
                    'name' => 'Updated Customer Name', // Lazychat might send different name
                    'phone' => '01700000000',
                    'address_1' => 'Updated Address',
                ],
                'total_price' => 500,
                'deliveryCharge' => 60,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'variation_id' => $variant->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 500,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Should use existing customer (no duplicate created)
        $this->assertDatabaseHas('customers', [
            'phone' => '01700000000',
        ]);
    }

    /** @test */
    public function lazychat_order_validation_fails_for_invalid_data()
    {
        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 74,
                'contact' => [
                    'name' => '', // Empty name
                    'phone' => 'invalid', // Invalid phone
                    'address_1' => '', // Empty address
                ],
                'total_price' => -100, // Invalid price
                'deliveryCharge' => 'invalid', // Invalid charge
                'payment_method' => 'invalid_method',
                'line_items' => [], // Empty items
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'error' => 'Validation failed',
        ]);
    }

    /** @test */
    public function lazychat_order_with_insufficient_stock()
    {
        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 3, // Only 3 in stock
            'price' => 100,
        ]);

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 75,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000001',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 500, // Requesting 5 items
                'deliveryCharge' => 0,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 100,
                        'quantity' => 5, // Requesting more than available
                    ],
                ],
            ]);

        $response->assertStatus(500);
    }

    /** @test */
    public function lazychat_order_includes_note_in_payload()
    {
        Event::fake([OrderCreated::class]);

        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 10,
            'price' => 200,
        ]);

        $customNote = 'This is a custom note from LazyChat AI';

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 76,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000002',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 200,
                'deliveryCharge' => 40,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'note' => $customNote,
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 200,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Assert note was saved
        $this->assertDatabaseHas('sales_orders', [
            'note' => $customNote,
        ]);
    }

    /** @test */
    public function lazychat_order_generates_unique_invoice_number()
    {
        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 5,
            'price' => 300,
        ]);

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 77,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000003',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 300,
                'deliveryCharge' => 50,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 300,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $invoiceNo = $response->json('data.invoice_no');

        // Assert invoice format is LZ-{id}-{random}
        $this->assertStringStartsWith('LZ-77-', $invoiceNo);

        // Assert invoice is unique
        $this->assertDatabaseHas('sales_orders', [
            'invoice_no' => $invoiceNo,
        ])->assertCount(1);
    }

    /** @test */
    public function lazychat_order_dispatches_webback_for_stock_sync()
    {
        Event::fake([OrderCreated::class]);

        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 15,
            'price' => 400,
        ]);

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 78,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000004',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 400,
                'deliveryCharge' => 60,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 400,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Assert OrderCreated event was dispatched (for webhook to LazyChat)
        Event::assertDispatched(OrderCreated::class);
    }

    /** @test */
    public function lazychat_order_handles_multiple_line_items()
    {
        $product1 = Product::factory()->create(['status' => 'published']);
        $variant1 = ProductVariant::factory()->create([
            'product_id' => $product1->id,
            'channel' => 'retail',
            'stock' => 10,
            'price' => 200,
        ]);

        $product2 = Product::factory()->create(['status' => 'published']);
        $variant2 = ProductVariant::factory()->create([
            'product_id' => $product2->id,
            'channel' => 'retail',
            'stock' => 20,
            'price' => 300,
        ]);

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 79,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000005',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 500,
                'deliveryCharge' => 0,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product1->id,
                        'variation_id' => $variant1->id,
                        'sku' => $variant1->sku,
                        'name' => 'Product 1',
                        'price' => 200,
                        'quantity' => 1,
                    ],
                    [
                        'product_id' => $product2->id,
                        'variation_id' => $variant2->id,
                        'sku' => $variant2->sku,
                        'name' => 'Product 2',
                        'price' => 300,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Assert both order items were created
        $orderId = $response->json('data.order_id');
        $this->assertDatabaseHas('sales_order_items', [
            'sales_order_id' => $orderId,
        ])->assertCount(2);
    }

    /** @test */
    public function lazychat_order_fallback_to_first_variant_if_no_variation_id()
    {
        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 8,
            'price' => 150,
        ]);

        // Request without variation_id
        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 80,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000006',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 150,
                'deliveryCharge' => 0,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 150,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        // Should have created order with the first active retail variant
        $orderId = $response->json('data.order_id');
        $orderItem = SalesOrderItem::where('sales_order_id', $orderId)->first();

        $this->assertEquals($variant->id, $orderItem->product_variant_id);
    }

    /** @test */
    public function lazychat_order_handles_missing_variant_gracefully()
    {
        $product = Product::factory()->create(['status' => 'published']);
        // No variants created

        $response = $this->withToken($this->validToken)
            ->postJson($this->endpoint, [
                'id' => 81,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000007',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 100,
                'deliveryCharge' => 0,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => 'NO-VARIANT',
                        'name' => 'Product Without Variant',
                        'price' => 100,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(500);
        $response->assertJson([
            'success' => false,
            'error' => 'Failed to create order',
        ]);
    }

    /** @test */
    public function invalid_token_rejected_with_403()
    {
        $product = Product::factory()->create(['status' => 'published']);
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'channel' => 'retail',
            'stock' => 5,
            'price' => 100,
        ]);

        $response = $this->withToken('invalid-token')
            ->postJson($this->endpoint, [
                'id' => 82,
                'contact' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000008',
                    'address_1' => 'Test Address',
                ],
                'total_price' => 100,
                'deliveryCharge' => 0,
                'payment_method' => 'cod',
                'payment_status' => 'unpaid',
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'sku' => $variant->sku,
                        'name' => 'Test Product',
                        'price' => 100,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'error' => 'Authentication failed',
        ]);
    }
}
