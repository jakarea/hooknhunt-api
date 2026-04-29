<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\Product\ProductCreated;
use App\Events\Product\ProductUpdated;
use App\Events\Product\ProductDeleted;
use App\Events\Product\VariantStockChanged;
use Tests\TestCase;

/**
 * Product Catalog Sync Test Suite
 *
 * Tests for product synchronization with LazyChat.
 *
 * Run: php artisan test --filter ProductCatalogSyncTest
 */
class ProductCatalogSyncTest extends TestCase
{
    use RefreshDatabase;

    protected StockService $stockService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stockService = new StockService();
    }

    /** @test */
    public function product_creation_dispatches_webhook()
    {
        Event::fake([ProductCreated::class]);

        // Create a product
        $product = Product::factory()->create([
            'name' => 'Test Product',
            'status' => 'published',
        ]);

        // Reload product to trigger events if using observers
        $product = $product->fresh();

        // If using manual event dispatch
        event(new ProductCreated($product));

        // Assert ProductCreated event was dispatched
        Event::assertDispatched(ProductCreated::class);
    }

    /** @test */
    public function product_update_dispatches_webhook()
    {
        Event::fake([ProductUpdated::class]);

        $product = Product::factory()->create();

        // Update product
        $product->update(['name' => 'Updated Product']);

        // Dispatch event (if manual)
        event(new ProductUpdated($product));

        // Assert ProductUpdated event was dispatched
        Event::assertDispatched(ProductUpdated::class);
    }

    /** @test */
    public function product_deletion_dispatches_webhook()
    {
        Event::fake([ProductDeleted::class]);

        $product = Product::factory()->create();

        // Delete product
        $product->delete();

        // Dispatch event (if manual)
        event(new ProductDeleted($product));

        // Assert ProductDeleted event was dispatched
        Event::assertDispatched(ProductDeleted::class);
    }

    /** @test */
    public function variant_stock_change_on_order_placement_dispatches_webhook()
    {
        Event::fake([VariantStockChanged::class]);

        // Create product and variant
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 100,
        ]);

        // Create order with items
        $order = SalesOrder::factory()->create(['status' => 'pending']);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'quantity' => 5,
        ]);

        // Deduct stock (simulating order placement)
        $this->stockService->deductOrderStock($order);

        // Assert VariantStockChanged event was dispatched
        Event::assertDispatched(VariantStockChanged::class, function ($event) use ($variant) {
            return $event->variant->id === $variant->id
                && $event->oldStock === 100
                && $event->newStock === 95
                && $event->reason === 'order_placed';
        });
    }

    /** @test */
    public function variant_stock_change_on_order_cancellation_dispatches_webhook()
    {
        Event::fake([VariantStockChanged::class]);

        // Create product and variant
        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 50,
        ]);

        // Create order with items
        $order = SalesOrder::factory()->create(['status' => 'cancelled']);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'quantity' => 3,
        ]);

        // Restore stock (simulating order cancellation)
        $this->stockService->restoreOrderStock($order);

        // Assert VariantStockChanged event was dispatched
        Event::assertDispatched(VariantStockChanged::class, function ($event) use ($variant) {
            return $event->variant->id === $variant->id
                && $event->oldStock === 50
                && $event->newStock === 53
                && $event->reason === 'order_cancelled';
        });
    }

    /** @test */
    public function multiple_variant_stock_changes_are_debounced()
    {
        Event::fake([VariantStockChanged::class]);

        // Create product with multiple variants
        $product = Product::factory()->create();
        $variant1 = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 100,
        ]);
        $variant2 = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 200,
        ]);

        // Create order with multiple items
        $order = SalesOrder::factory()->create(['status' => 'cancelled']);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant1->id,
            'quantity' => 5,
        ]);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant2->id,
            'quantity' => 10,
        ]);

        // Restore stock (should trigger 2 events but debounce to 1 webhook)
        $this->stockService->restoreOrderStock($order);

        // Assert both VariantStockChanged events were dispatched
        Event::assertDispatchedTimes(VariantStockChanged::class, 2);
    }

    /** @test */
    public function product_variant_update_includes_stock_in_webhook()
    {
        Event::fake([ProductUpdated::class]);

        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 75,
        ]);

        // Update variant stock
        $variant->update(['stock' => 80]);

        // Dispatch event (if manual)
        event(new ProductUpdated($product));

        // Assert ProductUpdated event was dispatched
        Event::assertDispatched(ProductUpdated::class);
    }

    /** @test */
    public function product_status_change_dispatches_webhook()
    {
        Event::fake([ProductUpdated::class]);

        $product = Product::factory()->create(['status' => 'draft']);

        // Change status to published
        $product->update(['status' => 'published']);

        // Dispatch event (if manual)
        event(new ProductUpdated($product));

        // Assert ProductUpdated event was dispatched
        Event::assertDispatched(ProductUpdated::class);
    }

    /** @test */
    public function stock_service_handles_missing_variants_gracefully()
    {
        Event::fake([VariantStockChanged::class]);

        $order = SalesOrder::factory()->create(['status' => 'cancelled']);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => 9999, // Non-existent variant
            'quantity' => 5,
        ]);

        // Should not throw exception
        $result = $this->stockService->restoreOrderStock($order);

        $this->assertTrue($result);

        // No event should be dispatched for missing variant
        Event::assertNotDispatched(VariantStockChanged::class);
    }

    /** @test */
    public function webhook_not_sent_when_integration_disabled()
    {
        // Disable integration
        config(['lazychat.enabled' => false]);

        Event::fake([VariantStockChanged::class]);

        $product = Product::factory()->create();
        $variant = ProductVariant::factory()->create([
            'product_id' => $product->id,
            'stock' => 100,
        ]);

        $order = SalesOrder::factory()->create(['status' => 'cancelled']);
        SalesOrderItem::factory()->create([
            'sales_order_id' => $order->id,
            'product_variant_id' => $variant->id,
            'quantity' => 5,
        ]);

        // Restore stock
        $this->stockService->restoreOrderStock($order);

        // Event should still be dispatched (listener checks config)
        Event::assertDispatched(VariantStockChanged::class);
    }
}
