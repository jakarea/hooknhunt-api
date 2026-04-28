<?php

namespace App\Events\Product;

use App\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Product Created Event
 *
 * Fired when a new product is created in the system.
 * Triggers Lazychat webhook to sync the new product.
 *
 * @package App\Events\Product
 */
class ProductCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The product instance.
     */
    public Product $product;

    /**
     * Create a new event instance.
     *
     * @param Product $product The product that was created
     */
    public function __construct(Product $product)
    {
        $this->product = $product;
    }
}
