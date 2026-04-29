<?php

namespace App\Services;

use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Events\Product\VariantStockChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Stock Service
 *
 * Handles stock management for orders.
 * Restores stock when orders are cancelled or returned.
 *
 * @package App\Services
 */
class StockService
{
    /**
     * Restore stock for a cancelled/returned order.
     *
     * This method:
     * 1. Increments ProductVariant stock for each item
     * 2. Is idempotent - safe to call multiple times for same order
     * 3. Uses database transactions for atomicity
     *
     * @param SalesOrder $order The order to restore stock for
     * @return bool True if stock was restored, false if already restored or not needed
     */
    public function restoreOrderStock(SalesOrder $order): bool
    {
        // Only restore stock for orders that can be cancelled/returned
        if (!in_array($order->status, ['cancelled', 'returned'])) {
            Log::warning('Stock restoration skipped - invalid order status', [
                'order_id' => $order->id,
                'status' => $order->status,
            ]);
            return false;
        }

        // Load order items
        $items = $order->items;
        if ($items->isEmpty()) {
            Log::warning('Stock restoration skipped - no items found', [
                'order_id' => $order->id,
            ]);
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                // Get the variant
                $variant = ProductVariant::find($item->product_variant_id);

                if (!$variant) {
                    Log::warning('Variant not found for stock restoration', [
                        'order_id' => $order->id,
                        'variant_id' => $item->product_variant_id,
                    ]);
                    continue;
                }

                // Get current stock before increment
                $oldStock = (int) $variant->stock;

                // Restore stock (increment)
                $variant->increment('stock', $item->quantity);

                // Get new stock
                $newStock = $oldStock + $item->quantity;

                // Load the product relation
                $variant->load('product');

                // Dispatch VariantStockChanged event for LazyChat sync
                event(new VariantStockChanged(
                    $variant->product,
                    $variant,
                    $oldStock,
                    $newStock,
                    'order_cancelled'
                ));

                Log::info('Stock restored for variant', [
                    'order_id' => $order->id,
                    'variant_id' => $variant->id,
                    'sku' => $variant->sku,
                    'quantity_restored' => $item->quantity,
                    'old_stock' => $oldStock,
                    'new_stock' => $newStock,
                ]);
            }

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Stock restoration failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Deduct stock for order items.
     * Used when order is placed.
     *
     * @param SalesOrder $order
     * @return bool
     */
    public function deductOrderStock(SalesOrder $order): bool
    {
        $items = $order->items;
        if ($items->isEmpty()) {
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                $variant = ProductVariant::find($item->product_variant_id);

                if (!$variant) {
                    continue;
                }

                // Check if enough stock available
                if ($variant->stock < $item->quantity) {
                    throw new \Exception("Insufficient stock for variant: {$variant->sku}");
                }

                // Get current stock before decrement
                $oldStock = (int) $variant->stock;

                // Deduct stock
                $variant->decrement('stock', $item->quantity);

                // Get new stock
                $newStock = $oldStock - $item->quantity;

                // Load the product relation
                $variant->load('product');

                // Dispatch VariantStockChanged event for LazyChat sync
                event(new VariantStockChanged(
                    $variant->product,
                    $variant,
                    $oldStock,
                    $newStock,
                    'order_placed'
                ));
            }

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Stock deduction failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
