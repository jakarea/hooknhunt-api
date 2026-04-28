<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PaymentSettingsController extends Controller
{
    /**
     * Get current payment gateway settings.
     * GET /api/v2/admin/settings/payment
     */
    public function index(): JsonResponse
    {
        $activeGateway = \App\Models\Setting::getWebsiteSetting('active_payment_gateway', 'sslcommerz');

        $settings = [
            'active_gateway' => $activeGateway,
            'available_gateways' => ['sslcommerz', 'eps'],
            'sslcommerz' => [
                'mode' => config('sslcommerz.mode', 'sandbox'),
                'sandbox_configured' => !empty(config('sslcommerz.sandbox.store_id')) &&
                                      !empty(config('sslcommerz.sandbox.store_password')),
                'live_configured' => !empty(config('sslcommerz.live.store_id')) &&
                                   !empty(config('sslcommerz.live.store_password')),
                'sandbox_store_id' => config('sslcommerz.sandbox.store_id') ? '***' . substr(config('sslcommerz.sandbox.store_id'), -4) : null,
                'live_store_id' => config('sslcommerz.live.store_id') ? '***' . substr(config('sslcommerz.live.store_id'), -4) : null,
            ],
            'eps' => [
                'mode' => config('eps.mode', 'sandbox'),
                'sandbox_configured' => !empty(config('eps.sandbox.store_id')) &&
                                      !empty(config('eps.sandbox.username')) &&
                                      !empty(config('eps.sandbox.password')),
                'live_configured' => !empty(config('eps.live.store_id')) &&
                                   !empty(config('eps.live.username')) &&
                                   !empty(config('eps.live.password')),
                'sandbox_store_id' => config('eps.sandbox.store_id') ? '***' . substr(config('eps.sandbox.store_id'), -4) : null,
                'live_store_id' => config('eps.live.store_id') ? '***' . substr(config('eps.live.store_id'), -4) : null,
                'callbacks_configured' => [
                    'success' => !empty(config('eps.callbacks.success')),
                    'fail' => !empty(config('eps.callbacks.fail')),
                    'cancel' => !empty(config('eps.callbacks.cancel')),
                    'ipn' => !empty(config('eps.callbacks.ipn')),
                ],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    /**
     * Update active payment gateway.
     * PUT /api/v2/admin/settings/payment/gateway
     */
    public function updateGateway(Request $request): JsonResponse
    {
        $request->validate([
            'gateway' => 'required|in:sslcommerz,eps',
        ]);

        $gateway = $request->gateway;

        try {
            // Store in database using Setting model
            \App\Models\Setting::setWebsiteSetting('active_payment_gateway', $gateway);

            Log::info('Payment gateway updated', [
                'gateway' => $gateway,
                'updated_by' => auth()->id() ?? 'system',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment gateway updated successfully',
                'data' => [
                    'active_gateway' => $gateway,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update payment gateway', [
                'error' => $e->getMessage(),
                'gateway' => $gateway,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment gateway',
                'error' => config('app.debug') ? $e->getMessage() : 'Unknown error',
            ], 500);
        }
    }

    /**
     * Get EPS configuration status (for admin info only).
     * GET /api/v2/admin/settings/payment/eps/status
     */
    public function getEPSStatus(): JsonResponse
    {
        $epsConfig = config('eps');

        return response()->json([
            'success' => true,
            'data' => [
                'mode' => $epsConfig['mode'] ?? 'sandbox',
                'sandbox' => [
                    'configured' => !empty($epsConfig['sandbox']['store_id']) &&
                                   !empty($epsConfig['sandbox']['username']) &&
                                   !empty($epsConfig['sandbox']['password']),
                    'store_id_preview' => $epsConfig['sandbox']['store_id'] ? '***' . substr($epsConfig['sandbox']['store_id'], -4) : null,
                    'username_preview' => $epsConfig['sandbox']['username'] ? substr($epsConfig['sandbox']['username'], 0, 3) . '***' : null,
                ],
                'live' => [
                    'configured' => !empty($epsConfig['live']['store_id']) &&
                                   !empty($epsConfig['live']['username']) &&
                                   !empty($epsConfig['live']['password']),
                    'store_id_preview' => $epsConfig['live']['store_id'] ? '***' . substr($epsConfig['live']['store_id'], -4) : null,
                    'username_preview' => $epsConfig['live']['username'] ? substr($epsConfig['live']['username'], 0, 3) . '***' : null,
                ],
                'callbacks' => [
                    'success' => $epsConfig['callbacks']['success'] ?? null,
                    'fail' => $epsConfig['callbacks']['fail'] ?? null,
                    'cancel' => $epsConfig['callbacks']['cancel'] ?? null,
                    'ipn' => $epsConfig['callbacks']['ipn'] ?? null,
                ],
                'channels' => $epsConfig['channels'] ?? [],
                'timeout' => $epsConfig['timeout'] ?? 30,
            ],
        ]);
    }

    /**
     * Test EPS configuration (optional - for admin testing).
     * POST /api/v2/admin/settings/payment/eps/test
     */
    public function testEPS(Request $request): JsonResponse
    {
        $request->validate([
            'mode' => 'required|in:sandbox,live',
        ]);

        $mode = $request->mode;
        $config = config("eps.{$mode}");

        if (empty($config['store_id']) || empty($config['username']) || empty($config['password'])) {
            return response()->json([
                'success' => false,
                'message' => 'EPS credentials not configured for ' . $mode . ' mode',
            ], 400);
        }

        // You could add a test API call here to verify credentials
        // For now, just check if credentials are present

        return response()->json([
            'success' => true,
            'message' => 'EPS configuration is present for ' . $mode . ' mode',
            'data' => [
                'mode' => $mode,
                'store_id_preview' => '***' . substr($config['store_id'], -4),
                'username_preview' => substr($config['username'], 0, 3) . '***',
                'base_url' => $config['base_url'],
            ],
        ]);
    }
}
