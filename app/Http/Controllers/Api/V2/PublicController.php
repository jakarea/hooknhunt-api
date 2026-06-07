<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Traits\ImageHelper;
use App\Services\Website\DeliveryChargeCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PublicController extends Controller
{
    use ApiResponse, ImageHelper;

    /**
     * Get active payment gateway configuration.
     */
    public function getActivePaymentGateway(): JsonResponse
    {
        try {
            $sslcommerzEnabled = config('payments.sslcommerz.enabled', false);
            $epsEnabled = config('payments.eps.enabled', false);

            $activeGateway = null;
            if ($epsEnabled) {
                $activeGateway = 'eps';
            } elseif ($sslcommerzEnabled) {
                $activeGateway = 'sslcommerz';
            }

            return $this->sendSuccess([
                'activeGateway' => $activeGateway,
                'sslcommerz' => $sslcommerzEnabled,
                'eps' => $epsEnabled,
            ], 'Payment gateway configuration retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error getting payment gateway config', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve payment gateway configuration.', null, 500);
        }
    }

    /**
     * Get delivery settings configuration.
     * Public endpoint for frontend to access delivery charge rules.
     */
    public function getDeliverySettings(): JsonResponse
    {
        try {
            $settings = DeliveryChargeCalculator::getSettingsForAdmin();

            return $this->sendSuccess($settings, 'Delivery settings retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error getting delivery settings', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve delivery settings.', null, 500);
        }
    }

    /**
     * Calculate delivery charge based on weight and location.
     */
    public function calculateDeliveryCharge(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'weight' => 'required|numeric|min:0',
                'division' => 'required|string',
                'order_amount' => 'nullable|numeric|min:0',
            ]);

            // Get delivery charge calculation
            $weight = (float) $validated['weight'];
            $division = $validated['division'];
            $orderAmount = (float) ($validated['order_amount'] ?? 0);

            // Check if location is inside Dhaka
            $insideDhaka = in_array(strtolower($division), ['dhaka', 'dhaka district']);

            // Base weight and charges (configurable)
            $baseWeight = 1.0; // kg
            $baseCharge = $insideDhaka ? 60 : 120;

            // Additional weight calculation
            if ($weight > $baseWeight) {
                $additionalWeight = ceil($weight - $baseWeight);
                $perKgRate = $insideDhaka ? 40 : 80;
                $additionalCharge = $additionalWeight * $perKgRate;
            } else {
                $additionalCharge = 0;
            }

            $totalCharge = $baseCharge + $additionalCharge;

            // Check for progressive delivery (discount based on order amount)
            $progressiveDelivery = [
                'enabled' => false,
                'order_amount' => $orderAmount,
                'min_amount' => 0,
                'discount_percentage' => 0,
                'discount_amount' => 0,
                'amount_needed_for_free' => 0,
                'is_free' => false,
                'motivational_message' => null,
            ];

            $freeDeliveryThreshold = config('orders.free_delivery_threshold', 0);

            if ($freeDeliveryThreshold > 0 && $orderAmount > 0) {
                $progressiveDelivery['enabled'] = true;
                $progressiveDelivery['min_amount'] = $freeDeliveryThreshold;

                if ($orderAmount >= $freeDeliveryThreshold) {
                    $totalCharge = 0;
                    $progressiveDelivery['is_free'] = true;
                    $progressiveDelivery['discount_amount'] = $baseCharge + $additionalCharge;
                    $progressiveDelivery['motivational_message'] = 'Congratulations! You qualify for free delivery!';
                } else {
                    $amountNeeded = $freeDeliveryThreshold - $orderAmount;
                    $progressiveDelivery['amount_needed_for_free'] = $amountNeeded;
                    $progressiveDelivery['motivational_message'] = "Add ৳{$amountNeeded} more to qualify for free delivery!";
                }
            }

            $isFlatRate = $weight <= $baseWeight;

            return $this->sendSuccess([
                'charge' => $totalCharge,
                'breakdown' => [
                    'total_weight' => $weight,
                    'base_weight' => $baseWeight,
                    'zone' => $insideDhaka ? 'inside_dhaka' : 'outside_dhaka',
                    'is_inside_dhaka' => $insideDhaka,
                    'is_flat_rate' => $isFlatRate,
                    'base_charge' => $baseCharge,
                    'additional_kg' => $isFlatRate ? 0 : ceil($weight - $baseWeight),
                    'per_kg_rate' => $insideDhaka ? 40 : 80,
                    'total_charge' => $totalCharge,
                    'free_delivery' => $totalCharge === 0,
                    'progressive_delivery' => $progressiveDelivery,
                ],
            ], 'Delivery charge calculated successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error calculating delivery charge', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to calculate delivery charge.', null, 500);
        }
    }

    /**
     * Submit contact form (creates lead).
     */
    public function submitContactForm(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
                'subject' => 'required|string|max:255',
                'message' => 'required|string',
                'priority' => 'nullable|in:low,medium,high',
            ]);

            // Create lead in CRM system
            $leadId = DB::table('crm_leads')->insertGetId([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'subject' => $validated['subject'],
                'message' => $validated['message'],
                'priority' => $validated['priority'] ?? 'medium',
                'source' => 'website_contact_form',
                'status' => 'new',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->sendSuccess([
                'lead_id' => $leadId,
                'message' => 'Thank you for contacting us! We will get back to you soon.'
            ], 'Contact form submitted successfully.', 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error submitting contact form', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to submit contact form. Please try again.', null, 500);
        }
    }

    /**
     * Search products suggestions.
     */
    public function searchSuggestions(Request $request): JsonResponse
    {
        try {
            $query = $request->input('q', '');
            $limit = min((int) $request->input('limit', 10), 50);

            if (strlen($query) < 2) {
                return $this->sendSuccess([], 'Query too short.');
            }

            $suggestions = DB::table('products as p')
                ->join('product_variants as pv', 'p.id', '=', 'pv.product_id')
                ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
                ->where('p.status', 'published')
                ->where('pv.is_active', true)
                ->where('pv.stock', '>', 0)
                ->where(function ($q) use ($query) {
                    $q->where('p.name', 'like', "%{$query}%")
                      ->orWhere('p.product_code', 'like', "%{$query}%");
                })
                ->select([
                    'p.id',
                    'p.name',
                    'p.slug',
                    'pv.price',
                    'm.path as image',
                    DB::raw('(SELECT GROUP_CONCAT(c.name SEPARATOR ", ")
                        FROM categories c
                        INNER JOIN product_category pc ON c.id = pc.category_id
                        WHERE pc.product_id = p.id
                        LIMIT 1) as category')
                ])
                ->groupBy('p.id', 'p.name', 'p.slug', 'pv.price', 'm.path', 'category')
                ->limit($limit)
                ->get();

            // Transform suggestions for response
            $suggestionsData = $suggestions->map(function ($product) {
                $imagePath = $product->image;
                $imageUrl = null;

                if ($imagePath) {
                    $imageUrl = $this->getImageUrl($imagePath);
                }

                // Fallback to placeholder if no image
                if (!$imageUrl) {
                    $imageUrl = config('app.url') . '/storage/placeholder.jpg';
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'image_url' => $imageUrl,
                    'category' => $product->category,
                    'price' => (float) $product->price,
                ];
            });

            return $this->sendSuccess($suggestionsData, 'Search suggestions retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error getting search suggestions', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve search suggestions.', null, 500);
        }
    }

    /**
     * Search products.
     */
    public function searchProducts(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'q' => 'required|string|min:2',
                'category_id' => 'nullable|integer|exists:categories,id',
                'per_page' => 'nullable|integer|min:1|max:100',
                'page' => 'nullable|integer|min:1',
            ]);

            $query = $validated['q'];
            $perPage = (int) ($validated['per_page'] ?? 20);
            $page = (int) ($validated['page'] ?? 1);

            $productsQuery = DB::table('products as p')
                ->leftJoin('catalog_product_images as cp', 'p.thumbnail_id', '=', 'cp.id')
                ->leftJoin('media_files as mf', function($join) {
                    $join->on('p.thumbnail_id', '=', 'mf.id')
                         ->whereNull('cp.id');
                })
                ->where('p.status', 'published')
                ->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('product_variants as pv')
                        ->whereColumn('pv.product_id', '=', 'p.id')
                        ->where('pv.is_active', true)
                        ->where('pv.stock', '>', 0)
                        ->limit(1);
                })
                ->where(function ($q) use ($query) {
                    $q->where('p.name', 'like', "%{$query}%")
                      ->orWhere('p.product_code', 'like', "%{$query}%");
                })
                ->select([
                    'p.id',
                    'p.name',
                    'p.slug',
                    'p.thumbnail_id',
                    DB::raw('(SELECT MIN(pv2.price) FROM product_variants pv2 WHERE pv2.product_id = p.id AND pv2.is_active = 1 AND pv2.stock > 0) as price'),
                    DB::raw('COALESCE(cp.path, mf.path) as thumbnail_path'),
                    DB::raw('COALESCE(cp.url, mf.url) as thumbnail_url'),
                ]);

            if (!empty($validated['category_id'])) {
                $productsQuery->join('product_category as pc', 'p.id', '=', 'pc.product_id')
                    ->where('pc.category_id', $validated['category_id']);
            }

            $total = $productsQuery->count();

            $products = $productsQuery
                ->offset(($page - 1) * $perPage)
                ->limit($perPage)
                ->get();

            $lastPage = (int) ceil($total / $perPage);

            // Transform products for response
            $productsData = $products->map(function ($product) {
                // Use thumbnail_url first (COALESCE result), fallback to thumbnail_path
                $imageUrl = null;

                if ($product->thumbnail_url && (str_starts_with($product->thumbnail_url, 'http://') || str_starts_with($product->thumbnail_url, 'https://'))) {
                    $imageUrl = $product->thumbnail_url;
                } elseif ($product->thumbnail_path) {
                    $imageUrl = $this->getImageUrl($product->thumbnail_path);
                }

                // Fallback to first gallery image if no thumbnail
                if (!$imageUrl && !$product->thumbnail_id) {
                    $galleryIds = DB::table('products')->where('id', $product->id)->value('gallery_images');
                    if ($galleryIds) {
                        $ids = json_decode($galleryIds, true);
                        if (is_array($ids) && !empty($ids)) {
                            $firstGalleryImage = DB::table('catalog_product_images')
                                ->where('id', $ids[0])
                                ->value('url');
                            if ($firstGalleryImage) {
                                $imageUrl = $firstGalleryImage;
                            }
                        }
                    }
                }

                // Final fallback to placeholder if no image
                if (!$imageUrl) {
                    $imageUrl = config('app.url') . '/storage/placeholder.jpg';
                }

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'price' => (float) $product->price,
                    'imageUrl' => $imageUrl,
                ];
            });

            $response = [
                'data' => $productsData,
                'total' => $total,
                'current_page' => $page,
                'last_page' => $lastPage,
            ];

            return $this->sendSuccess($response, 'Products retrieved successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Error searching products', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to search products.', null, 500);
        }
    }

    /**
     * Get tracking scripts configuration (Facebook Pixel, GA, GTM).
     */
    public function getTrackingSettings(): JsonResponse
    {
        try {
            $settings = DB::table('settings')
                ->whereIn('key', [
                    'facebook_pixel_id',
                    'facebook_pixel_code',
                    'google_analytics_id',
                    'google_analytics_code',
                    'google_tag_manager_id',
                    'google_tag_manager_code',
                ])
                ->pluck('value', 'key');

            return $this->sendSuccess([
                'facebook' => [
                    'pixelId' => $settings['facebook_pixel_id'] ?? null,
                    'pixelCode' => $settings['facebook_pixel_code'] ?? null,
                ],
                'google' => [
                    'analyticsId' => $settings['google_analytics_id'] ?? null,
                    'analyticsCode' => $settings['google_analytics_code'] ?? null,
                    'tagManagerId' => $settings['google_tag_manager_id'] ?? null,
                    'tagManagerCode' => $settings['google_tag_manager_code'] ?? null,
                ],
            ], 'Tracking settings retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error getting tracking settings', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve tracking settings.', null, 500);
        }
    }
}
