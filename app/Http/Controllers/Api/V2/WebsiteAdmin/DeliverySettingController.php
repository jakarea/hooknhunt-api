<?php

namespace App\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\Website\DeliveryChargeCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DeliverySettingController extends Controller
{
    /**
     * Get all delivery settings.
     * GET /api/v2/website-admin/delivery-settings
     */
    public function index(): JsonResponse
    {
        $settings = DeliveryChargeCalculator::getSettingsForAdmin();

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Update delivery settings.
     * PUT /api/v2/website-admin/delivery-settings
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->all();
        $deliveryMode = $data['delivery_mode'] ?? 'standard';
        $flatEnabled = $deliveryMode === 'flat_rate';
        $freeEnabled = $deliveryMode === 'free_delivery';
        $progressiveEnabled = $deliveryMode === 'progressive_delivery';

        $validator = Validator::make($request->all(), [
            'base_weight' => 'required|numeric|min:0.5|max:50',
            'delivery_mode' => 'required|in:standard,flat_rate,free_delivery,progressive_delivery',

            'inside_dhaka.base_charge' => 'required|numeric|min:0',
            'inside_dhaka.per_kg_charge' => 'required|numeric|min:0',

            'outside_dhaka.base_charge' => 'required|numeric|min:0',
            'outside_dhaka.per_kg_charge' => 'required|numeric|min:0',

            'flat_rate.enabled' => 'boolean',
            'flat_rate.base_charge' => $flatEnabled ? 'required|numeric|min:0' : 'nullable|numeric|min:0',
            'flat_rate.per_kg_charge' => $flatEnabled ? 'required|numeric|min:0' : 'nullable|numeric|min:0',

            'free_delivery.enabled' => 'boolean',

            'progressive_delivery.enabled' => 'boolean',
            'progressive_delivery.min_amount' => $progressiveEnabled ? 'required|numeric|min:0' : 'nullable|numeric|min:0',
            'progressive_delivery.mode' => 'nullable|string|in:linear,tiered',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $request->all();

        // Update settings
        // Update settings
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_base_weight'],
            ['value' => $data['base_weight']]
        );

        // Save delivery mode (ensures only one is active)
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_mode'],
            ['value' => $data['delivery_mode']]
        );

        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_inside_dhaka_base_charge'],
            ['value' => $data['inside_dhaka']['base_charge']]
        );
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_inside_dhaka_per_kg_charge'],
            ['value' => $data['inside_dhaka']['per_kg_charge']]
        );

        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_outside_dhaka_base_charge'],
            ['value' => $data['outside_dhaka']['base_charge']]
        );
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_outside_dhaka_per_kg_charge'],
            ['value' => $data['outside_dhaka']['per_kg_charge']]
        );

        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_flat_enabled'],
            ['value' => $flatEnabled]
        );

        // Only save flat_rate charges if enabled
        if ($flatEnabled) {
            Setting::updateOrCreate(
                ['group' => 'delivery', 'key' => 'delivery_flat_base_charge'],
                ['value' => $data['flat_rate']['base_charge']]
            );
            Setting::updateOrCreate(
                ['group' => 'delivery', 'key' => 'delivery_flat_per_kg_charge'],
                ['value' => $data['flat_rate']['per_kg_charge']]
            );
        }

        // Free Delivery settings - only enable if this mode is selected
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_free_enabled'],
            ['value' => $freeEnabled]
        );

        // Free Delivery mode doesn't need min_amount (all orders are free)
        // Clear any existing min_amount setting
        if ($freeEnabled) {
            Setting::updateOrCreate(
                ['group' => 'delivery', 'key' => 'delivery_free_min_amount'],
                ['value' => 0]
            );
        }

        // Progressive Delivery settings - only enable if this mode is selected
        Setting::updateOrCreate(
            ['group' => 'delivery', 'key' => 'delivery_progressive_enabled'],
            ['value' => $progressiveEnabled]
        );

        // Only save progressive_delivery settings if enabled
        if ($progressiveEnabled) {
            Setting::updateOrCreate(
                ['group' => 'delivery', 'key' => 'delivery_progressive_min_amount'],
                ['value' => $data['progressive_delivery']['min_amount'] ?? 3000]
            );
            Setting::updateOrCreate(
                ['group' => 'delivery', 'key' => 'delivery_progressive_mode'],
                ['value' => $data['progressive_delivery']['mode'] ?? 'linear']
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Delivery settings updated successfully',
            'data' => DeliveryChargeCalculator::getSettingsForAdmin(),
        ]);
    }

    /**
     * Calculate delivery charge for testing.
     * POST /api/v2/website-admin/delivery-settings/calculate
     */
    public function calculate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'weight' => 'required|numeric|min:0.1',
            'division' => 'required|string',
            'order_amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $charge = DeliveryChargeCalculator::calculate(
            $request->weight,
            $request->division,
            $request->order_amount
        );

        $breakdown = DeliveryChargeCalculator::breakdown(
            $request->weight,
            $request->division,
            $request->order_amount
        );

        return response()->json([
            'success' => true,
            'data' => [
                'charge' => $charge,
                'breakdown' => $breakdown,
            ],
        ]);
    }
}
