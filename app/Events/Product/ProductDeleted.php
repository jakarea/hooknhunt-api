<?php

namespace App\Events\Product;

use App\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Product Deleted Event
 *
 * Fired when a product is soft deleted.
 * Triggers Lazychat webhook with deleted_at timestamp.
 *
 * Note: This is a soft delete - product can be restored.
 * When restored, ProductUpdated event is fired with deleted_at: null.
 *
 * @package App\Events\Product
 */
class ProductDeleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The product instance.
     */
    public Product $product;

    /**
     * Create a new event instance.
     *
     * @param Product $product The product that was deleted
     */
    public function __construct(Product $product)
    {
        $this->product = $product;
    }
}
