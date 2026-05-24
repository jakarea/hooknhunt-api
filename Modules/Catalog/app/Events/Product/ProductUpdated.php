<?php

namespace App\Modules\Catalog\Events\Product;

use App\Modules\Catalog\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * \App\Modules\Catalog\Models\Product Updated Event
 *
 * Fired when an existing product is updated.
 * Triggers Lazychat webhook to sync the changes.
 * Also fired when product is soft deleted (with deleted_at).
 *
 * @package App\Events\Product
 */
class ProductUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The product instance.
     */
    public \App\Modules\Catalog\Models\Product $product;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Catalog\Models\Product $product The product that was updated
     */
    public function __construct(\App\Modules\Catalog\Models\Product $product)
    {
        $this->product = $product;
    }
}
