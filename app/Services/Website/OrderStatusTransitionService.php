<?php

namespace App\Services\Website;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

/**
 * Order Status Transition Service
 * Handles status validation, transition rules, and mandatory note requirements
 */
class OrderStatusTransitionService
{
    /**
     * Valid status transitions with mandatory note requirements
     * Format: 'from_status' => ['to_status' => ['requires_note' => bool, 'requires_cancellation_reason' => bool]]
     *
     * Business Flow:
     * Pending → On Hold → Approved → Processing → Sent to SteadFast → In Review → In Transit
     *                                                                              ↓
     *                                                                        Partial Delivered → Delivered → Delivered Payment Review → Completed
     *                                                                              ↓
     *                                                                        Delivery Failed & Return → Return Received → Refunded & Completed
     *
     * Any point → Cancelled (can be revived to Pending/Processing)
     */
    private const VALID_TRANSITIONS = [
        'pending' => [
            'on_hold' => ['requires_note' => true, 'label' => 'On Hold'],
            'approved' => ['requires_note' => false, 'label' => 'Approved'],
            'cancelled' => ['requires_note' => true, 'requires_cancellation_reason' => true, 'label' => 'Cancelled'],
        ],
        'on_hold' => [
            'pending' => ['requires_note' => false, 'label' => 'Pending'],
            'approved' => ['requires_note' => false, 'label' => 'Approved'],
            'cancelled' => ['requires_note' => true, 'requires_cancellation_reason' => true, 'label' => 'Cancelled'],
        ],
        'approved' => [
            'processing' => ['requires_note' => false, 'label' => 'Processing'],
            'cancelled' => ['requires_note' => true, 'requires_cancellation_reason' => true, 'label' => 'Cancelled'],
        ],
        'processing' => [
            'sent_to_steadfast' => ['requires_note' => false, 'label' => 'Sent to SteadFast'],
            'cancelled' => ['requires_note' => true, 'requires_cancellation_reason' => true, 'label' => 'Cancelled'],
        ],
        'sent_to_steadfast' => [
            'in_review' => ['requires_note' => false, 'label' => 'In Review'],
            'cancelled' => ['requires_note' => true, 'requires_cancellation_reason' => true, 'label' => 'Cancelled'],
        ],
        'in_review' => [
            'in_transit' => ['requires_note' => false, 'label' => 'In Transit'],
            'partial_delivered' => ['requires_note' => false, 'label' => 'Partial Delivered'],
            'delivery_failed_return' => ['requires_note' => false, 'label' => 'Delivery Failed & Return'],
        ],
        'in_transit' => [
            'partial_delivered' => ['requires_note' => false, 'label' => 'Partial Delivered'],
            'delivered' => ['requires_note' => false, 'label' => 'Delivered'],
            'delivery_failed_return' => ['requires_note' => false, 'label' => 'Delivery Failed & Return'],
        ],
        'partial_delivered' => [
            'delivered' => ['requires_note' => false, 'label' => 'Delivered'],
            'completed' => ['requires_note' => false, 'label' => 'Completed'],
            'delivered_payment_review' => ['requires_note' => true, 'label' => 'Delivered – Payment Review'],
        ],
        'delivered' => [
            'completed' => ['requires_note' => false, 'label' => 'Completed'],
            'delivered_payment_review' => ['requires_note' => true, 'label' => 'Delivered – Payment Review'],
        ],
        'delivered_payment_review' => [
            'completed' => ['requires_note' => false, 'label' => 'Completed'],
            'refunded_completed' => ['requires_note' => true, 'label' => 'Refunded & Completed'],
        ],
        'delivery_failed_return' => [
            'return_received' => ['requires_note' => true, 'label' => 'Return Received'],
        ],
        'return_received' => [
            'refunded_completed' => ['requires_note' => true, 'label' => 'Refunded & Completed'],
        ],
        'refunded_completed' => [
            'completed' => ['requires_note' => false, 'label' => 'Completed'],
        ],
        // Cancelled can be revived (with note)
        'cancelled' => [
            'pending' => ['requires_note' => true, 'label' => 'Pending (Revived)'],
            'processing' => ['requires_note' => true, 'label' => 'Processing (Revived)'],
        ],
        // Terminal states
        'completed' => [],
    ];

    /**
     * SteadFast webhook status mapping
     * Maps webhook statuses to internal order statuses
     *
     * SteadFast Webhook Statuses → Internal Statuses:
     * - pending → in_review (Courier received, verifying order)
     * - in_review → in_review (Still being verified)
     * - in_transit → in_transit (Shipment on the way)
     * - delivered → delivered (Successfully delivered)
     * - partial_delivered → partial_delivered (Partially delivered)
     * - cancelled → delivery_failed_return (Delivery failed/cancelled)
     * - return_initiated → delivery_failed_return (Return in progress)
     * - returned → return_received (Return received at courier hub)
     */
    private const STEADFAST_STATUS_MAP = [
        'pending' => 'in_review',
        'in_review' => 'in_review',
        'in_transit' => 'in_transit',
        'delivered' => 'delivered',
        'partial_delivered' => 'partial_delivered',
        'cancelled' => 'delivery_failed_return',
        'return_initiated' => 'delivery_failed_return',
        'returned' => 'return_received',
    ];

    /**
     * Check if a status transition is valid
     */
    public function canTransition(string $fromStatus, string $toStatus): bool
    {
        // Same status is always valid (no-op)
        if ($fromStatus === $toStatus) {
            return true;
        }

        return isset(self::VALID_TRANSITIONS[$fromStatus][$toStatus]);
    }

    /**
     * Check if a note is required for the transition
     */
    public function requiresNote(string $fromStatus, string $toStatus): bool
    {
        return self::VALID_TRANSITIONS[$fromStatus][$toStatus]['requires_note'] ?? false;
    }

    /**
     * Check if cancellation reason is required
     */
    public function requiresCancellationReason(string $fromStatus, string $toStatus): bool
    {
        return self::VALID_TRANSITIONS[$fromStatus][$toStatus]['requires_cancellation_reason'] ?? false;
    }

    /**
     * Validate status transition request
     *
     * @param string $fromStatus Current status
     * @param string $toStatus Desired status
     * @param string|null $note Optional note/comment
     * @param string|null $cancellationReason Cancellation reason (for cancelled status)
     * @return array Validation result with ['valid' => bool, 'error' => string|null]
     */
    public function validateTransition(string $fromStatus, string $toStatus, ?string $note = null, ?string $cancellationReason = null): array
    {
        // Same status
        if ($fromStatus === $toStatus) {
            return ['valid' => true, 'error' => null];
        }

        // Check if transition exists
        if (!$this->canTransition($fromStatus, $toStatus)) {
            return [
                'valid' => false,
                'error' => "Cannot transition from '{$fromStatus}' to '{$toStatus}'. Invalid status transition.",
            ];
        }

        // Check if note is required
        if ($this->requiresNote($fromStatus, $toStatus) && empty($note)) {
            return [
                'valid' => false,
                'error' => "A note is required for this status transition.",
            ];
        }

        // Check if cancellation reason is required
        if ($this->requiresCancellationReason($fromStatus, $toStatus) && empty($cancellationReason)) {
            return [
                'valid' => false,
                'error' => "Cancellation reason is required for cancelled orders.",
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Get all valid transitions from a given status
     *
     * @param string $status Current status
     * @return array Array of valid next statuses with metadata
     */
    public function getValidTransitions(string $status): array
    {
        return self::VALID_TRANSITIONS[$status] ?? [];
    }

    /**
     * Get transition label
     */
    public function getTransitionLabel(string $fromStatus, string $toStatus): string
    {
        return self::VALID_TRANSITIONS[$fromStatus][$toStatus]['label'] ?? $toStatus;
    }

    /**
     * Map SteadFast webhook status to internal status
     *
     * @param string $steadfastStatus Status from SteadFast webhook
     * @return string|null Internal status or null if unknown
     */
    public function mapSteadfastStatus(string $steadfastStatus): ?string
    {
        return self::STEADFAST_STATUS_MAP[$steadfastStatus] ?? null;
    }

    /**
     * Get list of statuses that can be updated via webhook
     *
     * @return array Array of statuses that accept webhook updates
     */
    public function getWebhookUpdatableStatuses(): array
    {
        return [
            'sent_to_steadfast', // Can move to in_review
            'in_review',         // Can move to in_transit, partial_delivered, delivery_failed_return
            'in_transit',        // Can move to delivered, partial_delivered, delivery_failed_return
        ];
    }

    /**
     * Format note with cancellation prefix if applicable
     *
     * @param string $note The note content
     * @param string|null $cancellationReason Cancellation reason
     * @return string Formatted note
     */
    public function formatNote(string $note, ?string $cancellationReason = null): string
    {
        if ($cancellationReason) {
            $reasonLabels = [
                'customer' => 'Cancelled by Customer',
                'admin' => 'Cancelled by Admin',
                'courier' => 'Cancelled by Courier',
                'system' => 'Auto Cancelled',
            ];

            $prefix = $reasonLabels[$cancellationReason] ?? "Cancelled ({$cancellationReason})";
            return "[{$prefix}] {$note}";
        }

        return $note;
    }

    /**
     * Get terminal statuses (no outgoing transitions)
     *
     * @return array Array of terminal statuses
     */
    public function getTerminalStatuses(): array
    {
        return ['completed'];
    }

    /**
     * Check if a status is terminal
     *
     * @param string $status Status to check
     * @return bool True if status is terminal
     */
    public function isTerminalStatus(string $status): bool
    {
        return in_array($status, $this->getTerminalStatuses());
    }

    /**
     * Get all available statuses
     *
     * @return array Array of all status values
     */
    public function getAllStatuses(): array
    {
        return [
            'pending',
            'draft',
            'on_hold',
            'approved',
            'processing',
            'on_shipping',
            'shipped',
            'delivered',
            'completed',
            'cancelled',
            'returned',
            'refunded',
            'sent_to_steadfast',
            'in_review',
            'in_transit',
            'delivered_payment_review',
            'partial_delivered',
            'delivery_failed_return',
            'return_received',
            'refunded_completed',
        ];
    }

    /**
     * Log status transition for debugging
     */
    public function logTransition(int $orderId, string $fromStatus, string $toStatus, ?string $note = null): void
    {
        Log::info('Order Status Transition', [
            'order_id' => $orderId,
            'from' => $fromStatus,
            'to' => $toStatus,
            'note' => $note,
            'timestamp' => now()->toDateTimeString(),
        ]);
    }
}
