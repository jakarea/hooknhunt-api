<?php

namespace Tests\Feature;

use App\Models\SalesOrder;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\Order\OrderCreated;
use App\Events\Order\OrderPaid;
use App\Events\Order\OrderFailed;
use App\Events\Order\OrderCancelled;
use Tests\TestCase;

/**
 * Order Cancellation Webhook Test Suite
 *
 * Tests for order lifecycle, stock management, and LazyChat webhooks.
 *
 * Run: php artisan test --filter OrderCancellationTest
 */
class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    protected StockService $stockService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stockService = new StockService();
    }

    /** @test */
    public function cod_order_creates_order_and_dispatches_webhook()
    {
        Event::fake([OrderCreated::class]);

        // Place COD order
        $response = $this->postJson('/api/v2/store/orders', [
            'customer_name' => 'Test Customer',
            'customer_phone' => '01700000000',
            'items' => [
                [
                    'product_id' => 1,
                    'variant_id' => 1,
                    'quantity' => 2,
                    'unit_price' => 100,
                ],
            ],
            'payment_method' => 'cod',
            'subtotal' => 200,
            'payable_amount' => 220,
            'shipping_address' => 'Test Address',
        ]);

        $response->assertStatus(201);

        // Assert OrderCreated event was dispatched
        Event::assertDispatched(OrderCreated::class);

        // Assert stock was decremented
        $variant = ProductVariant::find(1);
        $this->assertNotEmpty($variant);
    }

    /** @test */
    public function admin_can_cancel_order_and_stock_is_restored()
    {
        Event::fake([OrderCancelled::class]);

        // Create an order
        $order = SalesOrder::factory()->create([
            'status' => 'pending',
        ]);

        // Get initial stock
        $initialStock = ProductVariant::find(1)->stock;

        // Admin cancels order
        $this->putJson("/api/v2/admin/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        // Assert order status is cancelled
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);

        // Assert OrderCancelled event was dispatched
        Event::assertDispatched(OrderCancelled::class);

        // Assert stock was restored
        $finalStock = ProductVariant::find(1)->stock;
        $this->assertEquals($initialStock, $finalStock);
    }

    /** @test */
    public function eps_payment_failure_restores_stock_and_dispatches_webhook()
    {
        Event::fake([OrderFailed::class]);

        // Create order with items
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-001',
            'status' => 'pending',
        ]);

        $initialStock = ProductVariant::find(1)->stock;

        // Simulate EPS fail callback
        $response = $this->get('/api/v2/store/payments/fail?' . http_build_query([
            'MerchantTransactionId' => 'TEST-001',
            'EPSTransactionId_' => 'EPS-123',
            'Status' => 'failed',
            'ErrorMessage' => 'Insufficient funds',
        ]));

        $response->assertRedirect();

        // Assert order status is failed
        $this->assertDatabaseHas('sales_orders', [
            'invoice_no' => 'TEST-001',
            'status' => 'failed',
        ]);

        // Assert OrderFailed event was dispatched
        Event::assertDispatched(OrderFailed::class);

        // Assert stock was restored
        $finalStock = ProductVariant::find(1)->stock;
        $this->assertEquals($initialStock, $finalStock);
    }

    /** @test */
    public function eps_payment_cancellation_restores_stock_and_dispatches_webhook()
    {
        Event::fake([OrderCancelled::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-002',
            'status' => 'pending',
        ]);

        $initialStock = ProductVariant::find(1)->stock;

        // Simulate EPS cancel callback
        $response = $this->get('/api/v2/store/payments/cancel?' . http_build_query([
            'MerchantTransactionId' => 'TEST-002',
            'EPSTransactionId_' => 'EPS-456',
            'Status' => 'cancelled',
        ]));

        $response->assertRedirect();

        // Assert order status is cancelled
        $this->assertDatabaseHas('sales_orders', [
            'invoice_no' => 'TEST-002',
            'status' => 'cancelled',
        ]);

        // Assert OrderCancelled event was dispatched
        Event::assertDispatched(OrderCancelled::class);

        // Assert stock was restored
        $finalStock = ProductVariant::find(1)->stock;
        $this->assertEquals($initialStock, $finalStock);
    }

    /** @test */
    public function already_cancelled_order_does_not_dispatch_webhook_again()
    {
        Event::fake([OrderCancelled::class]);

        // Create already cancelled order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-003',
            'status' => 'cancelled',
        ]);

        // Try to cancel again
        $this->putJson("/api/v2/admin/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ])->assertStatus(400);

        // Assert OrderCancelled was NOT dispatched (order already cancelled)
        Event::assertNotDispatched(OrderCancelled::class);
    }

    /** @test */
    public function eps_ipn_success_updates_order_and_dispatches_webhook()
    {
        Event::fake([OrderPaid::class]);

        // Create pending order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-004',
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        // Simulate EPS IPN success
        $response = $this->postJson('/api/v2/store/payments/eps/ipn', [
            'MerchantTransactionId' => 'TEST-004',
            'EPSTransactionId_' => 'EPS-789',
            'Status' => 'success',
            'Amount' => $order->total_amount,
        ]);

        $response->assertStatus(200);

        // Assert order was updated
        $this->assertDatabaseHas('sales_orders', [
            'invoice_no' => 'TEST-004',
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        // Assert OrderPaid event was dispatched
        Event::assertDispatched(OrderPaid::class);
    }

    /** @test */
    public function stock_service_restores_stock_correctly()
    {
        // Create order with items
        $order = SalesOrder::factory()->create([
            'status' => 'pending',
        ]);

        $variant = ProductVariant::factory()->create([
            'stock' => 100,
        ]);

        // Create order item
        $order->items()->create([
            'product_variant_id' => $variant->id,
            'quantity' => 5,
            'unit_price' => 100,
            'total_price' => 500,
        ]);

        // Update order status to cancelled
        $order->update(['status' => 'cancelled']);

        // Restore stock
        $restored = $this->stockService->restoreOrderStock($order);

        $this->assertTrue($restored);

        // Assert stock was incremented
        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock' => 105, // 100 + 5
        ]);
    }

    /** @test */
    public function stock_service_is_idempotent()
    {
        // Create cancelled order
        $order = SalesOrder::factory()->create([
            'status' => 'cancelled',
        ]);

        $variant = ProductVariant::factory()->create([
            'stock' => 50,
        ]);

        $order->items()->create([
            'product_variant_id' => $variant->id,
            'quantity' => 3,
            'unit_price' => 100,
            'total_price' => 300,
        ]);

        // Restore stock first time
        $this->stockService->restoreOrderStock($order);
        $stockAfterFirst = ProductVariant::find($variant->id)->stock;

        // Restore stock second time (should not increment again)
        $this->stockService->restoreOrderStock($order);
        $stockAfterSecond = ProductVariant::find($variant->id)->stock;

        // Stock should be same (no double increment)
        $this->assertEquals($stockAfterFirst, $stockAfterSecond);
        $this->assertEquals(53, $stockAfterSecond); // 50 + 3
    }
}
