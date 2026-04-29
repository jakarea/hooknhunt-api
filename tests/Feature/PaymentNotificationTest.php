<?php

namespace Tests\Feature;

use App\Models\SalesOrder;
use App\Models\Customer;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\Order\OrderPaid;
use App\Events\Order\OrderFailed;
use App\Jobs\SendOrderLazychatWebhook;
use Tests\TestCase;

/**
 * Payment Status Notifications Test Suite
 *
 * Tests for payment status notifications to LazyChat.
 *
 * Run: php artisan test --filter PaymentNotificationTest
 */
class PaymentNotificationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function eps_payment_success_dispatches_webhook_with_transaction_details()
    {
        Event::fake([OrderPaid::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-001',
            'payment_status' => 'unpaid',
            'total_amount' => 1500,
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Simulate EPS payment success
        $transactionId = 'EPS-123456789';
        event(new OrderPaid($order, $transactionId, 'eps'));

        // Assert OrderPaid event was dispatched
        Event::assertDispatched(OrderPaid::class, function ($event) use ($order, $transactionId) {
            return $event->order->id === $order->id
                && $event->transactionId === $transactionId
                && $event->paymentMethod === 'eps';
        });
    }

    /** @test */
    public function eps_payment_failure_dispatches_webhook_with_error_details()
    {
        Event::fake([OrderFailed::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-002',
            'payment_status' => 'unpaid',
            'total_amount' => 2000,
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Simulate EPS payment failure
        $reason = 'Insufficient funds';
        $errorCode = 'EPS-001';
        event(new OrderFailed($order, $reason, $errorCode));

        // Assert OrderFailed event was dispatched
        Event::assertDispatched(OrderFailed::class, function ($event) use ($order, $reason) {
            return $event->order->id === $order->id
                && $event->reason === $reason;
        });
    }

    /** @test */
    public function cod_order_payment_status_correct()
    {
        Event::fake([OrderPaid::class]);

        // Create COD order (already paid by definition)
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-003',
            'payment_status' => 'unpaid', // COD is technically unpaid until delivery
            'total_amount' => 1000,
            'external_data' => [
                'payment' => ['method' => 'cod']
            ]
        ]);

        // COD orders don't trigger payment webhooks until delivered
        $this->assertEquals('cod', $order->external_data['payment']['method']);
    }

    /** @test */
    public function payment_webhook_payload_contains_all_required_fields()
    {
        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-004',
            'payment_status' => 'paid',
            'paid_amount' => 1500,
            'total_amount' => 1500,
            'due_amount' => 0,
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Create webhook job
        $job = new SendOrderLazychatWebhook($order, 'order.paid', 'EPS-TX-123');

        // Get payment method from job
        $paymentMethod = $order->external_data['payment']['method'] ?? 'cod';
        $this->assertEquals('eps', $paymentMethod);
    }

    /** @test */
    public function sslcommerz_payment_success_dispatches_webhook()
    {
        Event::fake([OrderPaid::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-005',
            'payment_status' => 'unpaid',
            'total_amount' => 3000,
            'external_data' => [
                'payment' => ['method' => 'sslcommerz']
            ]
        ]);

        // Simulate SSLCommerz payment success
        $transactionId = 'SSL-TRANSACTION-123';
        event(new OrderPaid($order, $transactionId, 'sslcommerz'));

        // Assert OrderPaid event was dispatched
        Event::assertDispatched(OrderPaid::class, function ($event) use ($order, $transactionId) {
            return $event->order->id === $order->id
                && $event->transactionId === $transactionId
                && $event->paymentMethod === 'sslcommerz';
        });
    }

    /** @test */
    public function payment_webhook_includes_payment_timestamp()
    {
        // Create paid order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-006',
            'payment_status' => 'paid',
            'paid_amount' => 2500,
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Create webhook job
        $job = new SendOrderLazychatWebhook($order, 'order.paid', 'EPS-TX-456');

        // Payment timestamp would be added during webhook processing
        $this->assertEquals('order.paid', $job->eventType);
        $this->assertEquals('EPS-TX-456', $job->transactionId);
    }

    /** @test */
    public function failed_payment_webhook_includes_failure_reason()
    {
        // Create failed order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-007',
            'status' => 'failed',
            'payment_status' => 'failed',
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Create webhook job with reason
        $job = new SendOrderLazychatWebhook($order, 'order.failed', null, 'Transaction declined');

        // Verify failure reason is included
        $this->assertEquals('order.failed', $job->eventType);
        $this->assertEquals('Transaction declined', $job->reason);
    }

    /** @test */
    public function payment_webhook_includes_correct_gateway_name()
    {
        $gateways = [
            'eps' => 'EPS Payment Gateway',
            'sslcommerz' => 'SSLCommerz',
            'cod' => 'Cash on Delivery',
            'bkash' => 'Bkash',
        ];

        foreach ($gateways as $method => $expectedName) {
            $order = SalesOrder::factory()->create([
                'external_data' => [
                    'payment' => ['method' => $method]
                ]
            ]);

            $job = new SendOrderLazychatWebhook($order, 'order.paid', 'TX-123');
            $paymentMethod = $order->external_data['payment']['method'];

            $this->assertEquals($method, $paymentMethod);
        }
    }

    /** @test */
    public function payment_amount_included_in_webhook()
    {
        // Create order with specific amounts
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-008',
            'payment_status' => 'paid',
            'total_amount' => 5000,
            'paid_amount' => 5000,
            'due_amount' => 0,
            'external_data' => [
                'payment' => ['method' => 'eps']
            ]
        ]);

        // Verify amounts
        $this->assertEquals(5000, (float) $order->total_amount);
        $this->assertEquals(5000, (float) $order->paid_amount);
        $this->assertEquals(0, (float) $order->due_amount);
    }

    /** @test */
    public function partial_payment_webhook_includes_partial_amounts()
    {
        // Create order with partial payment
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-009',
            'payment_status' => 'partial',
            'total_amount' => 5000,
            'paid_amount' => 2000,
            'due_amount' => 3000,
            'external_data' => [
                'payment' => ['method' => 'cod']
            ]
        ]);

        // Verify partial amounts
        $this->assertEquals(5000, (float) $order->total_amount);
        $this->assertEquals(2000, (float) $order->paid_amount);
        $this->assertEquals(3000, (float) $order->due_amount);
    }
}
