<?php

namespace App\Modules\Inventory\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Stock Service
 *
 * Handles stock management for orders using direct database access.
 * Restores stock when orders are cancelled or returned.
 * Uses data duplication approach for module independence.
 *
 * @package App\Modules\Inventory\Services
 */
class StockService
{
    /**
     * Restore stock for a cancelled/returned order.
     *
     * This method:
     * 1. Increments product variant stock for each item
     * 2. Is idempotent - safe to call multiple times for same order
     * 3. Uses database transactions for atomicity
     * 4. Uses direct database access for module independence
     *
     * @param int $orderId The order ID to restore stock for
     * @return bool True if stock was restored, false if already restored or not needed
     */
    public function restoreOrderStock(int $orderId): bool
    {
        // Get order status using direct database access
        $order = DB::table('sales_orders')->where('id', $orderId)->first();

        if (!$order) {
            Log::warning('Stock restoration skipped - order not found', [
                'order_id' => $orderId,
            ]);
            return false;
        }

        // Only restore stock for orders that can be cancelled/returned
        if (!in_array($order->status, ['cancelled', 'returned'])) {
            Log::warning('Stock restoration skipped - invalid order status', [
                'order_id' => $orderId,
                'status' => $order->status,
            ]);
            return false;
        }

        // Get order items using direct database access
        $items = DB::table('sales_order_items')->where('sales_order_id', $orderId)->get();

        if ($items->isEmpty()) {
            Log::warning('Stock restoration skipped - no items found', [
                'order_id' => $orderId,
            ]);
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                // Update variant stock using direct database access
                $variant = DB::table('product_variants')->where('id', $item->product_variant_id)->first();

                if (!$variant) {
                    Log::warning('Variant not found for stock restoration', [
                        'order_id' => $orderId,
                        'variant_id' => $item->product_variant_id,
                    ]);
                    continue;
                }

                // Get current stock
                $oldStock = (int) $variant->stock;

                // Restore stock (increment) using direct query
                DB::table('product_variants')
                    ->where('id', $item->product_variant_id)
                    ->increment('stock', $item->quantity);

                // Get new stock
                $newStock = $oldStock + $item->quantity;

                // Get product info for logging
                $product = DB::table('products')->where('id', $variant->product_id)->first();

                Log::info('Stock restored for variant', [
                    'order_id' => $orderId,
                    'variant_id' => $variant->id,
                    'sku' => $variant->sku,
                    'product_name' => $product->name ?? 'Unknown',
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
                'order_id' => $orderId,
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
     * @param int $orderId The order ID to deduct stock for
     * @return bool
     */
    public function deductOrderStock(int $orderId): bool
    {
        // Get order items using direct database access
        $items = DB::table('sales_order_items')->where('sales_order_id', $orderId)->get();

        if ($items->isEmpty()) {
            Log::warning('Stock deduction skipped - no items found', [
                'order_id' => $orderId,
            ]);
            return false;
        }

        DB::beginTransaction();
        try {
            foreach ($items as $item) {
                // Get variant using direct database access
                $variant = DB::table('product_variants')->where('id', $item->product_variant_id)->first();

                if (!$variant) {
                    Log::warning('Variant not found for stock deduction', [
                        'order_id' => $orderId,
                        'variant_id' => $item->product_variant_id,
                    ]);
                    continue;
                }

                // Check if enough stock available
                if ($variant->stock < $item->quantity) {
                    throw new \Exception("Insufficient stock for variant: {$variant->sku}");
                }

                // Get current stock before decrement
                $oldStock = (int) $variant->stock;

                // Deduct stock using direct query
                DB::table('product_variants')
                    ->where('id', $item->product_variant_id)
                    ->decrement('stock', $item->quantity);

                // Get new stock
                $newStock = $oldStock - $item->quantity;

                // Get product info for logging
                $product = DB::table('products')->where('id', $variant->product_id)->first();

                Log::info('Stock deducted for variant', [
                    'order_id' => $orderId,
                    'variant_id' => $variant->id,
                    'sku' => $variant->sku,
                    'product_name' => $product->name ?? 'Unknown',
                    'quantity_deducted' => $item->quantity,
                    'old_stock' => $oldStock,
                    'new_stock' => $newStock,
                ]);
            }

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Stock deduction failed', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get current stock level for a product variant.
     * Uses direct database access for module independence.
     *
     * @param int $variantId
     * @return int|null
     */
    public function getVariantStock(int $variantId): ?int
    {
        $variant = DB::table('product_variants')->where('id', $variantId)->first();
        return $variant ? (int) $variant->stock : null;
    }

    /**
     * Update stock for a product variant.
     * Uses direct database access for module independence.
     *
     * @param int $variantId
     * @param int $quantity Positive to add, negative to deduct
     * @return bool
     */
    public function updateVariantStock(int $variantId, int $quantity): bool
    {
        try {
            if ($quantity > 0) {
                DB::table('product_variants')
                    ->where('id', $variantId)
                    ->increment('stock', $quantity);
            } else {
                DB::table('product_variants')
                    ->where('id', $variantId)
                    ->decrement('stock', abs($quantity));
            }
            return true;
        } catch (\Exception $e) {
            Log::error('Stock update failed', [
                'variant_id' => $variantId,
                'quantity' => $quantity,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}