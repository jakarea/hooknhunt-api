<?php

namespace App\Modules\Catalog\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * ProductDeleted Event
 *
 * Fired when a product is deleted in the Catalog module.
 * Other modules can listen to this event to remove synced product data.
 */
class ProductDeleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var int The ID of the product that was deleted
     */
    public int $productId;

    /**
     * @var string|null The slug of the product (for reference)
     */
    public ?string $productSlug;

    /**
     * Create a new event instance.
     */
    public function __construct(int $productId, ?string $productSlug = null)
    {
        $this->productId = $productId;
        $this->productSlug = $productSlug;
    }

    /**
     * Get the product ID
     */
    public function getProductId(): int
    {
        return $this->productId;
    }
}
