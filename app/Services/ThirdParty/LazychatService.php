<?php

namespace App\Services\ThirdParty;

use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;
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

    /**
     * Create a new service instance.
     * Loads configuration from config/lazychat.php
     */
    public function __construct()
    {
        $this->enabled = Config::get('lazychat.enabled', true);
        $this->timeout = Config::get('lazychat.retry.timeout_seconds', 10);
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

        // Build product URL (use frontend domain for product pages)
        $productUrl = config('app.frontend_url') . '/products/' . $product->slug;

        // Build images array (thumbnail + gallery)
        // Compute URLs directly - DO NOT use appends to avoid memory exhaustion
        $images = [];
        if ($product->thumbnail) {
            $thumbnailUrl = $product->thumbnail->url;
            if (empty($thumbnailUrl) || !str_starts_with($thumbnailUrl, 'http')) {
                $thumbnailUrl = url($product->thumbnail->path ?? '');
            }
            $images[] = ['url' => $thumbnailUrl];
        }
        // Get gallery image URLs using direct SQL query
        if (!empty($product->gallery_images) && is_array($product->gallery_images)) {
            $galleryUrls = DB::table('media_files')
                ->whereIn('id', $product->gallery_images)
                ->select('id', 'path', 'url')
                ->get()
                ->keyBy('id');

            // Preserve order from gallery_images array
            foreach ($product->gallery_images as $imageId) {
                if (isset($galleryUrls[$imageId])) {
                    $file = $galleryUrls[$imageId];
                    $url = ($file->url && str_starts_with($file->url, 'http'))
                        ? $file->url
                        : url($file->path ?? '');
                    $images[] = ['url' => $url];
                }
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

        // Build SEO tags as array (use empty array if null)
        $tags = $product->seo_tags ?? [];

        // Map attributes from variant data
        $attributes = $this->extractAttributes($retailVariants);

        return [
            'id' => $product->id,
            'title' => $product->retail_name ?? $product->name,
            'slug' => $product->slug,
            'url' => $productUrl,
            'description' => $product->description ?? '',
            'summary' => '',
            'published' => $product->status === 'published',
            'is_draft' => $product->status === 'draft',
            'featured' => false,
            'purchasable' => $product->status === 'published' && $retailVariants->sum('stock') > 0,
            'sku' => $firstVariant ? $firstVariant->sku : '',
            'brand' => $product->brand?->name ?? '',
            'weight' => (string) ($firstVariant?->weight ?? 0),
            'tags' => is_array($tags) ? $tags : [],
            'note' => null,
            'categories' => $categories,
            'images' => $images,
            'attributes' => $attributes ?? [],
            'pricing' => [
                'regular_price' => $firstVariant ? number_format($firstVariant->price, 2, '.', '') : '0.00',
                'sale_prices' => $this->getSalePrices($retailVariants),
            ],
            'inventory' => [
                'stock_status' => $retailVariants->sum('stock') > 0,
                'stocks' => [],
            ],
            'variations' => $this->transformVariants($retailVariants),
            'created_at' => $product->created_at?->toIso8601String(),
            'updated_at' => $product->updated_at?->toIso8601String(),
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
     * Returns array of objects with sale_price, on_sale_from, on_sale_to.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function getSalePrices($variants): array
    {
        $salePrices = [];

        foreach ($variants as $variant) {
            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $salePrices[] = [
                    'sale_price' => number_format($variant->offer_price, 2, '.', ''),
                    'on_sale_from' => null,
                    'on_sale_to' => null,
                ];
            }
        }

        return $salePrices;
    }

    /**
     * Transform variants to Lazychat format.
     * Matches exact specification from Notion documentation.
     *
     * @param \Illuminate\Database\Eloquent\Collection $variants
     * @return array
     */
    private function transformVariants($variants): array
    {
        $transformed = [];

        foreach ($variants as $variant) {
            // Build images array
            $variantImages = [];
            if ($variant->thumbnail) {
                $variantImages[] = ['url' => $variant->thumbnail];
            }

            // Build attributes array
            $variantAttributes = [];
            $attributeId = 1;
            if ($variant->size) {
                $variantAttributes[] = [
                    'id' => $attributeId++,
                    'name' => 'Size',
                    'value' => $variant->size,
                ];
            }
            if ($variant->color) {
                $variantAttributes[] = [
                    'id' => $attributeId++,
                    'name' => 'Color',
                    'value' => $variant->color,
                ];
            }
            if ($variant->material) {
                $variantAttributes[] = [
                    'id' => $attributeId++,
                    'name' => 'Material',
                    'value' => $variant->material,
                ];
            }

            // Build stock data
            $stocks = [];
            if ($variant->stock > 0) {
                $stocks[] = [
                    'quantity' => $variant->stock,
                    'date' => now()->toDateString(),
                    'note' => '',
                ];
            }

            $variantData = [
                'id' => $variant->id,
                'title' => $variant->variant_name,
                'sku' => $variant->sku ?? null,
                'published' => $variant->is_active,
                'weight' => $variant->weight != null ? (string) $variant->weight : null,
                'pricing' => [
                    'regular_price' => number_format($variant->price, 2, '.', ''),
                    'sale_prices' => [],
                ],
                'inventory' => [
                    'stock_status' => $variant->stock > 0,
                    'stocks' => $stocks,
                ],
                'images' => $variantImages,
                'attributes' => $variantAttributes,
                'created_at' => $variant->created_at?->toIso8601String(),
                'updated_at' => $variant->updated_at?->toIso8601String(),
            ];

            // Add sale price if exists
            if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
                $variantData['pricing']['sale_prices'] = [
                    [
                        'sale_price' => number_format($variant->offer_price, 2, '.', ''),
                        'on_sale_from' => null,
                        'on_sale_to' => null,
                    ]
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
            // Log full payload for debugging
            Log::info('Lazychat webhook sending', [
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'url' => $webhook['url'],
                'payload_size' => strlen(json_encode($data)),
            ]);

            // Log detailed payload to file for debugging
            $debugFile = storage_path('logs/lazychat-payloads.log');
            $debugData = [
                'timestamp' => now()->toIso8601String(),
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'payload' => $data,
            ];
            file_put_contents($debugFile, json_encode($debugData) . "\n\n", FILE_APPEND);

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

            // Log Lazychat response to file for debugging
            $debugFile = storage_path('logs/lazychat-responses.log');
            $debugData = [
                'timestamp' => now()->toIso8601String(),
                'topic' => $topic,
                'product_id' => $data['id'] ?? $data['product_id'] ?? null,
                'response_status' => $response->status(),
                'response_body' => $response->body(),
                'success' => $success,
            ];
            file_put_contents($debugFile, json_encode($debugData) . "\n\n", FILE_APPEND);

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

    /**
     * Transform a SalesOrder to Lazychat format.
     *
     * Sends order data including customer info, items, payment status.
     * Does NOT include sensitive payment details.
     *
     * @param SalesOrder $order The order to transform
     * @return array Formatted data for Lazychat
     */
    public function transformOrderForLazychat(SalesOrder $order): array
    {
        // Load necessary relations
        $order->load(['items.variant.product.thumbnail', 'customer']);

        // Extract shipping and customer data from external_data
        $externalData = $order->external_data ?? [];
        $shipping = $externalData['shipping'] ?? [];
        $customer = $externalData['customer'] ?? [];
        $payment = $externalData['payment'] ?? [];

        // Build items array
        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'id' => $item->id,
                'product_id' => $item->variant?->product_id,
                'variant_id' => $item->product_variant_id,
                'product_name' => $item->variant?->product?->retail_name ?? $item->variant?->product?->name ?? 'Product',
                'variant_name' => $item->variant?->variant_name,
                'sku' => $item->variant?->sku,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
                'image' => $item->variant?->thumbnail ?? $item->variant?->product?->thumbnail?->full_url,
            ];
        }

        return [
            'order_id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'channel' => $order->channel,
            'sub_total' => (float) $order->sub_total,
            'discount_amount' => (float) ($order->discount_amount ?? 0),
            'delivery_charge' => (float) ($order->delivery_charge ?? 0),
            'total_amount' => (float) $order->total_amount,
            'paid_amount' => (float) $order->paid_amount,
            'due_amount' => (float) $order->due_amount,
            'note' => $order->note,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),

            // Customer info
            'customer' => [
                'id' => $order->customer_id,
                'name' => $customer['name'] ?? $order->customer?->name,
                'phone' => $customer['phone'] ?? $order->customer?->phone,
                'email' => $customer['email'] ?? $order->customer?->email,
                'type' => $order->customer?->type ?? 'retail',
            ],

            // Shipping address
            'shipping' => [
                'address' => $shipping['address'] ?? null,
                'district' => $shipping['district'] ?? null,
                'division' => $shipping['division'] ?? null,
                'thana' => $shipping['thana'] ?? null,
            ],

            // Payment info (no sensitive details)
            'payment' => [
                'method' => $payment['method'] ?? 'cod',
            ],

            // Order items
            'items' => $items,
        ];
    }

    /**
     * Send order webhook to Lazychat.
     *
     * @param string $topic Webhook topic (order/create, order/paid, etc.)
     * @param array $data Order data
     * @return array Result with success status and response
     */
    public function sendOrderWebhook(string $topic, array $data): array
    {
        // Skip if integration is disabled
        if (!$this->enabled) {
            return [
                'success' => true,
                'message' => 'Lazychat integration is disabled',
                'skipped' => true,
            ];
        }

        // Use the create/update webhook for orders (same endpoint)
        $webhook = $this->getCreateUpdateWebhook();

        try {
            Log::info('Lazychat order webhook sending', [
                'topic' => $topic,
                'order_id' => $data['order_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
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

            Log::info('Lazychat order webhook response', [
                'topic' => $topic,
                'order_id' => $data['order_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'status' => $response->status(),
                'success' => $success,
                'body' => $response->body(),
            ]);

            return [
                'success' => $success,
                'status_code' => $response->status(),
                'response_body' => $response->body(),
                'message' => $success ? 'Order webhook sent successfully' : 'Order webhook failed',
            ];

        } catch (\Exception $e) {
            Log::error('Lazychat order webhook error', [
                'topic' => $topic,
                'order_id' => $data['order_id'] ?? null,
                'invoice_no' => $data['invoice_no'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Order webhook request failed: ' . $e->getMessage(),
            ];
        }
    }
}
