<?php

namespace App\Modules\Catalog\Events\Product;

use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Models\ProductVariant;
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
 * - \App\Modules\Inventory\Models\Inventory batch updates
 */
class VariantStockChanged
{
    use Dispatchable, SerializesModels;

    public \App\Modules\Catalog\Models\Product $product;
    public \App\Modules\Catalog\Models\ProductVariant $variant;
    public int $oldStock;
    public int $newStock;
    public string $reason;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Catalog\Models\Product $product The product owning the variant
     * @param \App\Modules\Catalog\Models\ProductVariant $variant The variant whose stock changed
     * @param int $oldStock Previous stock level
     * @param int $newStock New stock level
     * @param string $reason Reason for stock change
     */
    public function __construct(
        \App\Modules\Catalog\Models\Product $product,
        \App\Modules\Catalog\Models\ProductVariant $variant,
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
