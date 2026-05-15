<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Models\Website\WebsiteOrder;
use App\Services\Website\OrderStatusTransitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * SteadFast Webhook Controller
 * Handles incoming webhooks from SteadFast courier service
 */
class SteadfastWebhookController
{
    private OrderStatusTransitionService $transitionService;

    // SteadFast API credentials
    private const API_KEY = 'xtbyeznvlaascpvxcbx623xgowa2xkkl';
    private const SECRET_KEY = 'xlczsdqf4uoutgswrlj4c6xv';

    public function __construct(OrderStatusTransitionService $transitionService)
    {
        $this->transitionService = $transitionService;
    }

    /**
     * Handle incoming webhook from SteadFast
     * POST /api/v2/webhook/steadfast
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify webhook authentication
        if (!$this->verifyWebhookAuth($request)) {
            Log::warning('SteadFast webhook: Invalid authentication', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
        }

        $payload = $request->all();

        // Log incoming webhook for debugging
        Log::info('SteadFast webhook received', [
            'notification_type' => $payload['notification_type'] ?? 'unknown',
            'consignment_id' => $payload['consignment_id'] ?? null,
            'invoice' => $payload['invoice'] ?? null,
            'status' => $payload['status'] ?? null,
        ]);

        // Validate required fields
        if (empty($payload['consignment_id'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Missing consignment_id',
            ], 422);
        }

        // Handle different notification types
        $notificationType = $payload['notification_type'] ?? '';

        try {
            switch ($notificationType) {
                case 'delivery_status':
                    return $this->handleDeliveryStatus($payload);
                case 'tracking_update':
                    return $this->handleTrackingUpdate($payload);
                default:
                    Log::warning('Unknown webhook notification type', [
                        'type' => $notificationType,
                        'payload' => $payload,
                    ]);

                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unknown notification type',
                    ], 400);
            }
        } catch (\Throwable $e) {
            Log::error('SteadFast webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $payload,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Internal server error',
            ], 500);
        }
    }

    /**
     * Handle delivery status update webhook
     *
     * @param array $payload Webhook payload
     * @return JsonResponse
     */
    private function handleDeliveryStatus(array $payload): JsonResponse
    {
        $steadfastStatus = $payload['status'] ?? null;
        $invoice = $payload['invoice'] ?? null;
        $consignmentId = $payload['consignment_id'] ?? null;
        $trackingMessage = $payload['tracking_message'] ?? '';
        $codAmount = $payload['cod_amount'] ?? null;
        $deliveryCharge = $payload['delivery_charge'] ?? null;

        // Find order by consignment_id or invoice
        $order = $this->findOrderByConsignmentOrInvoice($consignmentId, $invoice);

        if (!$order) {
            Log::warning('SteadFast webhook: Order not found', [
                'consignment_id' => $consignmentId,
                'invoice' => $invoice,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Order not found',
            ], 404);
        }

        // Check for duplicate webhook (idempotency)
        if ($this->isDuplicateWebhook($order, $payload)) {
            return response()->json([
                'status' => 'success',
                'message' => 'Webhook already processed (idempotent)',
            ]);
        }

        // Map SteadFast status to internal status
        $newStatus = $this->transitionService->mapSteadfastStatus($steadfastStatus);

        if (!$newStatus) {
            Log::warning('SteadFast webhook: Unknown status', [
                'order_id' => $order->id,
                'steadfast_status' => $steadfastStatus,
            ]);

            // Don't fail - just log and continue
            return response()->json([
                'status' => 'success',
                'message' => 'Webhook received (unknown status logged)',
            ]);
        }

        // Validate transition
        if (!$this->transitionService->canTransition($order->status, $newStatus)) {
            Log::warning('SteadFast webhook: Invalid status transition', [
                'order_id' => $order->id,
                'current_status' => $order->status,
                'desired_status' => $newStatus,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Invalid status transition',
            ], 422);
        }

        // Update order status
        DB::transaction(function () use ($order, $newStatus, $steadfastStatus, $payload, $trackingMessage, $codAmount, $deliveryCharge, $consignmentId) {
            $oldStatus = $order->status;

            // Update status
            $order->status = $newStatus;
            $order->delivery_status = $steadfastStatus;
            $order->webhook_received_at = now();
            $order->courier_webhook_data = $payload;

            // Set timestamps based on status
            match ($newStatus) {
                'delivered', 'partial_delivered' => $order->delivered_at = now(),
                default => null,
            };

            // Append webhook info to note
            $webhookNote = "[SteadFast Webhook] Status: {$steadfastStatus}. {$trackingMessage}";
            $order->note = trim(($order->note ? $order->note . "\n" : '') . $webhookNote);

            $order->save();

            // Log status change
            $this->logStatusChange($order, $newStatus, $oldStatus, $webhookNote);

            // Log webhook activity
            \App\Models\Website\WebsiteOrderActivityLog::log(
                $order->id,
                'webhook_received',
                "SteadFast webhook: {$steadfastStatus}",
                null,
                [
                    'notification_type' => 'delivery_status',
                    'consignment_id' => $consignmentId,
                    'cod_amount' => $codAmount,
                    'delivery_charge' => $deliveryCharge,
                ],
                null // Webhook doesn't have a user
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Status updated successfully',
        ]);
    }

    /**
     * Handle tracking update webhook
     *
     * @param array $payload Webhook payload
     * @return JsonResponse
     */
    private function handleTrackingUpdate(array $payload): JsonResponse
    {
        $consignmentId = $payload['consignment_id'] ?? null;
        $invoice = $payload['invoice'] ?? null;
        $trackingMessage = $payload['tracking_message'] ?? '';

        $order = $this->findOrderByConsignmentOrInvoice($consignmentId, $invoice);

        if (!$order) {
            Log::warning('SteadFast webhook tracking update: Order not found', [
                'consignment_id' => $consignmentId,
                'invoice' => $invoice,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Order not found',
            ], 404);
        }

        // Update order note with tracking info
        DB::transaction(function () use ($order, $payload, $trackingMessage, $consignmentId) {
            $trackingNote = "[SteadFast Tracking] {$trackingMessage}";
            $order->note = trim(($order->note ? $order->note . "\n" : '') . $trackingNote);
            $order->courier_webhook_data = $payload;
            $order->save();

            // Log activity
            \App\Models\Website\WebsiteOrderActivityLog::log(
                $order->id,
                'tracking_update',
                "Tracking update: {$trackingMessage}",
                null,
                [
                    'notification_type' => 'tracking_update',
                    'consignment_id' => $consignmentId,
                ],
                null
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Tracking update logged',
        ]);
    }

    /**
     * Find order by consignment_id or invoice
     *
     * @param string|null $consignmentId
     * @param string|null $invoice
     * @return WebsiteOrder|null
     */
    private function findOrderByConsignmentOrInvoice(?string $consignmentId, ?string $invoice): ?WebsiteOrder
    {
        if ($consignmentId) {
            return WebsiteOrder::where('consignment_id', $consignmentId)->first();
        }

        if ($invoice) {
            return WebsiteOrder::where('invoice_no', $invoice)->first();
        }

        return null;
    }

    /**
     * Verify webhook authentication
     * Checks for SteadFast Api-Key and Secret-Key headers
     *
     * @param Request $request
     * @return bool
     */
    private function verifyWebhookAuth(Request $request): bool
    {
        $apiKey = $request->header('Api-Key');
        $secretKey = $request->header('Secret-Key');

        // Check both Api-Key and Secret-Key (case-insensitive header names)
        $providedApiKey = $apiKey ?: $request->header('api-key');
        $providedSecretKey = $secretKey ?: $request->header('secret-key');

        return hash_equals(self::API_KEY, $providedApiKey ?: '') &&
               hash_equals(self::SECRET_KEY, $providedSecretKey ?: '');
    }

    /**
     * Check if webhook is duplicate (idempotency)
     *
     * @param WebsiteOrder $order
     * @param array $payload
     * @return bool
     */
    private function isDuplicateWebhook(WebsiteOrder $order, array $payload): bool
    {
        // Check if we've already processed this exact webhook
        $lastWebhook = $order->courier_webhook_data ?? [];

        if (empty($lastWebhook)) {
            return false;
        }

        // Compare key fields that should be unique
        return (
            isset($lastWebhook['status']) &&
            $lastWebhook['status'] === ($payload['status'] ?? null) &&
            isset($lastWebhook['updated_at']) &&
            $lastWebhook['updated_at'] === ($payload['updated_at'] ?? null)
        );
    }

    /**
     * Log status change to history
     *
     * @param WebsiteOrder $order
     * @param string $newStatus
     * @param string $oldStatus
     * @param string $note
     * @return void
     */
    private function logStatusChange(WebsiteOrder $order, string $newStatus, string $oldStatus, string $note): void
    {
        \App\Models\Website\WebsiteOrderStatusHistory::logChange(
            $order->id,
            $newStatus,
            $oldStatus,
            $note . ' (via SteadFast webhook)',
            null // No user for webhooks
        );
    }
}
