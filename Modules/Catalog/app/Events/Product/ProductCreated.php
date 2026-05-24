<?php

namespace App\Modules\Catalog\Events\Product;

use App\Modules\Catalog\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * \App\Modules\Catalog\Models\Product Created Event
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
    public \App\Modules\Catalog\Models\Product $product;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Catalog\Models\Product $product The product that was created
     */
    public function __construct(\App\Modules\Catalog\Models\Product $product)
    {
        $this->product = $product;
    }
}
