<?php

namespace App\Events\Product;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Variant Stock Changed Event
 *
 * Dispatched when product variant stock changes.
 * This triggers ProductUpdated webhook to LazyChat so catalog stays in sync.
 *
 * Triggered by:
 * - Order cancellation (stock restored)
 * - Manual stock adjustment by admin
 * - Inventory batch updates
 */
class VariantStockChanged
{
    use Dispatchable, SerializesModels;

    public Product $product;
    public ProductVariant $variant;
    public int $oldStock;
    public int $newStock;
    public string $reason;

    /**
     * Create a new event instance.
     *
     * @param Product $product The product owning the variant
     * @param ProductVariant $variant The variant whose stock changed
     * @param int $oldStock Previous stock level
     * @param int $newStock New stock level
     * @param string $reason Reason for stock change
     */
    public function __construct(
        Product $product,
        ProductVariant $variant,
        int $oldStock,
        int $newStock,
        string $reason = 'manual_update'
    ) {
        $this->product = $product;
        $this->variant = $variant;
        $this->oldStock = $oldStock;
        $this->newStock = $newStock;
        $this->reason = $reason;
    }
}
