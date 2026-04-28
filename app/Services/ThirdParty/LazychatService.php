<?php

namespace App\Services\ThirdParty;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

/**
 * Lazychat Integration Service
 *
 * Handles product synchronization with Lazychat retail platform.
 * Transforms product data to Lazychat format and sends webhooks.
 *
 * @package App\Services\ThirdParty
 */
class LazychatService
{
    private bool $enabled;
    private int $timeout;
    private int $maxRetries;
    private int $retryDelay;

    /**
     * Create a new service instance.
     * Loads configuration from config/lazychat.php
     */
    public function __construct()
    {
        $this->enabled = Config::get('lazychat.enabled', true);
        $this->timeout = Config::get('lazychat.retry.timeout_seconds', 10);
        $this->maxRetries = Config::get('lazychat.retry.max_attempts', 3);
        $this->retryDelay = Config::get('lazychat.retry.delay_seconds', 30);
    }

    /**
     * Get create/update webhook URL and token.
     */
    private function getCreateUpdateWebhook(): array
    {
        return [
            'url' => Config::get('lazychat.webhooks.create_update_url'),
            'token' => Config::get('lazychat.webhooks.create_update_token'),
        ];
    }

    /**
     * Get delete webhook URL and token.
     */
    private function getDeleteWebhook(): array
    {
        return [
            'url' => Config::get('lazychat.webhooks.delete_url'),
            'token' => Config::get('lazychat.webhooks.delete_token'),
        ];
    }

    /**
     * Transform a Product to Lazychat format.
     *
     * SECURITY: Only sends retail-safe data.
     * NEVER includes: purchase_cost, wholesale prices, internal fields
     *
     * @param Product $product The product to transform
     * @return array Formatted data for Lazychat
     */
    public function transformProductForLazychat(Product $product): array
    {
        // Load necessary relations
        $product->load(['category', 'brand', 'thumbnail']);

        // Get only retail variants (never wholesale)
        $retailVariants = $product->variants()
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->get();

        // Get first variant for product-level SKU
        $firstVariant = $retailVariants->first();

        // Build product URL
        $productUrl = url('/products/' . $product->slug);

        // Build images array (thumbnail + gallery)
        $images = [];
        if ($product->thumbnail) {
            $images[] = ['url' => $product->thumbnail->full_url];
        }
        if (!empty($product->gallery_images_urls)) {
            foreach ($product->gallery_images_urls as $url) {
                $images[] = ['url' => $url];
            }
        }

        // Build categories array
        $categories = [];
        if ($product->category) {
            $categories[] = [
                'id' => $product->category->id,
                'title' => $product->category->name,
                'slug' => $product->category->slug,
            ];
        }

        // Build SEO tags (use empty array if null)
        $tags = $product->seo_tags ?? [];

        // Map attributes from variant data
        $attributes = $this->extractAttributes($retailVariants);

        return [
            'id' => $product->id,
            'title' => $product->retail_name ?? $product->name,
            'slug' => $product->slug,
            'url' => $productUrl,
            'description' => $product->description ?? '',
            'summary' => $product->short_description ?? '',
            'published' => $product->status === 'published',
            'is_draft' => $product->status === 'draft',
            'featured' => false,
            'purchasable' => $product->status === 'published',
            'sku' => $firstVariant ? $firstVariant->sku : '',
            'brand' => $product->brand?->name ?? '',
            'weight' => (string) ($firstVariant?->weight ?? 0),
            'tags' => $tags,
            'note' => null,
            'categories' => $categories,
            'images' => $images,
            'attributes' => $attributes,
            'pricing' => [
                'regular_price' => $firstVariant ? number_format($firstVariant->price, 2, '.', '') : '0.00',
                'sale_prices' => $this->getSalePrices($retailVariants),
            ],
            'inventory' => [
                'stock_status' => $retailVariants->sum('stock') > 0,
                'stocks' => $this->getStockData($retailVariants),
            ],
            'variations' => $this->transformVariants($retailVariants),
            'created_at' => $product->created_at?->toIso8601String(),
            'updated_at' => $product->updated_at?->toIso8601String(),
            // Include deleted_at for soft deletes (null if not deleted)
            'deleted_at' => $product->deleted_at?->toIso8601String(),
        ];
    }

    /**
     * Extract unique attributes from retail variants.
     * Collects all unique size, color, material values.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function extractAttributes($variants): array
    {
        $attributes = [];
        $attributeId = 1;

        // Extract sizes
        $sizes = $variants->pluck('size')->filter()->unique()->values();
        if ($sizes->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Size',
                'values' => $sizes->toArray(),
            ];
        }

        // Extract colors
        $colors = $variants->pluck('color')->filter()->unique()->values();
        if ($colors->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Color',
                'values' => $colors->toArray(),
            ];
        }

        // Extract materials
        $materials = $variants->pluck('material')->filter()->unique()->values();
        if ($materials->isNotEmpty()) {
            $attributes[] = [
                'id' => $attributeId++,
                'name' => 'Material',
                'values' => $materials->toArray(),
            ];
        }

        return $attributes;
    }

    /**
     * Get sale prices from variants.
     * Returns array of prices that have active offers.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function getSalePrices($variants): array
    {
        $salePrices = [];

        foreach ($variants as $variant) {
            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $salePrices[] = number_format($variant->offer_price, 2, '.', '');
            }
        }

        return $salePrices;
    }

    /**
     * Get stock data for inventory.
     * Returns array of stock entries with quantity and date.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function getStockData($variants): array
    {
        $stocks = [];
        $totalStock = $variants->sum('stock');

        if ($totalStock > 0) {
            $stocks[] = [
                'quantity' => $totalStock,
                'date' => now()->toDateString(),
                'note' => 'Current stock',
            ];
        }

        return $stocks;
    }

    /**
     * Transform variants to Lazychat format.
     * Only includes retail-safe fields.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function transformVariants($variants): array
    {
        $transformed = [];

        foreach ($variants as $variant) {
            $variantData = [
                'id' => $variant->id,
                'title' => $variant->variant_name,
                'sku' => $variant->sku,
                'published' => $variant->is_active,
                'weight' => (string) $variant->weight,
                'pricing' => [
                    'regular_price' => number_format($variant->price, 2, '.', ''),
                    'sale_prices' => [],
                ],
                'inventory' => [
                    'stock_status' => $variant->stock > 0,
                    'stocks' => [],
                ],
                'images' => [],
                'attributes' => [],
                'created_at' => $variant->created_at?->toIso8601String(),
                'updated_at' => $variant->updated_at?->toIso8601String(),
            ];

            // Add sale price if exists
            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $variantData['pricing']['sale_prices'][] = number_format($variant->offer_price, 2, '.', '');
            }

            // Add stock data
            if ($variant->stock > 0) {
                $variantData['inventory']['stocks'][] = [
                    'quantity' => $variant->stock,
                    'date' => now()->toDateString(),
                    'note' => '',
                ];
            }

            // Add variant image if exists
            if ($variant->thumbnail) {
                $variantData['images'][] = ['url' => $variant->thumbnail];
            }

            // Add attributes
            $attributeId = 1;
            if ($variant->size) {
                $variantData['attributes'][] = [
                    'id' => $attributeId++,
                    'name' => 'Size',
                    'value' => $variant->size,
                ];
            }
            if ($variant->color) {
                $variantData['attributes'][] = [
                    'id' => $attributeId++,
                    'name' => 'Color',
                    'value' => $variant->color,
                ];
            }
            if ($variant->material) {
                $variantData['attributes'][] = [
                    'id' => $attributeId++,
                    'name' => 'Material',
                    'value' => $variant->material,
                ];
            }

            $transformed[] = $variantData;
        }

        return $transformed;
    }

    /**
     * Send webhook to Lazychat synchronously.
     * Used by the queue job for actual HTTP call.
     *
     * @param string $topic Webhook topic (product/create, product/update, product/delete)
     * @param array $data Product data or product_id for delete
     * @return array Result with success status and response
     */
    public function sendWebhook(string $topic, array $data): array
    {
        // Skip if integration is disabled
        if (!$this->enabled) {
            return [
                'success' => true,
                'message' => 'Lazychat integration is disabled',
                'skipped' => true,
            ];
        }

        // Determine webhook URL and token based on topic
        if ($topic === 'product/delete') {
            $webhook = $this->getDeleteWebhook();
        } else {
            $webhook = $this->getCreateUpdateWebhook();
        }

        try {
            Log::info('Lazychat webhook sending', [
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'url' => $webhook['url'],
            ]);

            $response = Http::timeout($this->timeout)
                ->withToken($webhook['token'])
                ->withHeaders([
                    'X-Webhook-Topic' => $topic,
                    'Accept' => 'application/json',
                ])
                ->post($webhook['url'], $data);

            $success = $response->successful();

            Log::info('Lazychat webhook response', [
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'status' => $response->status(),
                'success' => $success,
                'body' => $response->body(),
            ]);

            return [
                'success' => $success,
                'status_code' => $response->status(),
                'response_body' => $response->body(),
                'message' => $success ? 'Webhook sent successfully' : 'Webhook failed',
            ];

        } catch (\Exception $e) {
            Log::error('Lazychat webhook error', [
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Webhook request failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Send product delete webhook with minimal payload.
     *
     * @param int $productId
     * @return array
     */
    public function sendProductDeleteWebhook(int $productId): array
    {
        return $this->sendWebhook('product/delete', [
            'product_id' => (string) $productId,
        ]);
    }

    /**
     * Check if integration is enabled.
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }
}
