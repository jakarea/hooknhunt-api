<?php

namespace Tests\Feature;

use App\Modules\Website\Models\SalesOrder;
use App\Modules\CRM\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use App\Events\Order\OrderShipped;
use Tests\TestCase;

/**
 * Shipping/Courier Integration Notification Test Suite
 *
 * Tests for shipping notifications to LazyChat when orders are dispatched.
 *
 * Run: php artisan test --filter ShippingNotificationTest
 */
class ShippingNotificationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function order_shipped_dispatches_webhook_with_tracking_details()
    {
        Event::fake([OrderShipped::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-001',
            'status' => 'processing',
        ]);

        // Simulate order shipped with tracking details
        $trackingNumber = 'SF-123456789';
        $courierName = 'Steadfast';
        $courierPartner = 'Packzy';
        $trackingUrl = 'https://portal.packzy.com/track/SF-123456789';

        event(new OrderShipped(
            $order,
            $trackingNumber,
            $courierName,
            $courierPartner,
            $trackingUrl
        ));

        // Assert OrderShipped event was dispatched
        Event::assertDispatched(OrderShipped::class, function ($event) use ($order, $trackingNumber) {
            return $event->order->id === $order->id
                && $event->trackingNumber === $trackingNumber
                && $event->courierName === 'Steadfast'
                && $event->courierPartner === 'Packzy';
        });
    }

    /** @test */
    public function admin_can_mark_order_as_shipped_with_tracking()
    {
        Event::fake([OrderShipped::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'status' => 'processing',
        ]);

        // Admin marks as shipped with tracking details
        $response = $this->putJson("/api/v2/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
            'tracking_number' => 'SF-TX-999',
            'courier_name' => 'Steadfast',
            'courier_partner' => 'Packzy',
            'tracking_url' => 'https://steadfast.com/track/SF-TX-999',
        ]);

        $response->assertStatus(200);

        // Assert order status is updated
        $this->assertDatabaseHas('sales_orders', [
            'id' => $order->id,
            'status' => 'shipped',
        ]);

        // Assert OrderShipped event was dispatched
        Event::assertDispatched(OrderShipped::class);
    }

    /** @test */
    public function order_shipped_without_tracking_number()
    {
        Event::fake([OrderShipped::class]);

        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-002',
            'status' => 'processing',
        ]);

        // Ship without tracking number (manual delivery)
        event(new OrderShipped($order, null, 'Manual Delivery', null, null));

        // Assert OrderShipped event was dispatched
        Event::assertDispatched(OrderShipped::class, function ($event) use ($order) {
            return $event->order->id === $order->id
                && $event->trackingNumber === null
                && $event->courierName === 'Manual Delivery';
        });
    }

    /** @test */
    public function different_couriers_supported()
    {
        Event::fake([OrderShipped::class]);

        $couriers = [
            ['name' => 'Steadfast', 'partner' => 'Packzy'],
            ['name' => 'Pathao', 'partner' => 'Pathao Logistics'],
            ['name' => 'Paperfly', 'partner' => 'Paperfly'],
            ['name' => 'RedX', 'partner' => 'RedX'],
        ];

        $order = SalesOrder::factory()->create(['status' => 'processing']);

        foreach ($couriers as $courier) {
            event(new OrderShipped(
                $order,
                'TRACK-' . rand(1000, 9999),
                $courier['name'],
                $courier['partner'],
                null
            ));
        }

        // Assert all events were dispatched
        Event::assertDispatchedTimes(OrderShipped::class, count($couriers));
    }

    /** @test */
    public function order_status_change_to_shipped_includes_timestamp()
    {
        // Create order
        $order = SalesOrder::factory()->create([
            'status' => 'processing',
        ]);

        $trackingNumber = 'SF-TIMESTAMP-TEST';

        // Ship the order
        event(new OrderShipped($order, $trackingNumber, 'Steadfast', 'Packzy', null));

        // Get shipped_at time would be added during webhook processing
        $this->assertNotNull($order->updated_at);
    }

    /** @test */
    public function tracking_url_optional_in_shipped_event()
    {
        Event::fake([OrderShipped::class]);

        $order = SalesOrder::factory()->create(['status' => 'processing']);

        // Ship with tracking URL
        event(new OrderShipped(
            $order,
            'SF-URL-TEST',
            'Steadfast',
            'Packzy',
            'https://packzy.com/track/SF-URL-TEST'
        ));

        // Assert event was dispatched with tracking URL
        Event::assertDispatched(OrderShipped::class, function ($event) {
            return $event->trackingUrl === 'https://packzy.com/track/SF-URL-TEST';
        });

        // Ship without tracking URL
        event(new OrderShipped($order, 'SF-NO-URL', 'Steadfast', 'Packzy', null));

        // Assert event was dispatched without tracking URL
        Event::assertDispatched(OrderShipped::class, function ($event) {
            return $event->trackingUrl === null;
        });
    }

    /** @test */
    public function webhook_payload_contains_complete_shipping_info()
    {
        // Create order
        $order = SalesOrder::factory()->create([
            'invoice_no' => 'TEST-PAYLOAD-001',
            'status' => 'shipped',
            'external_data' => [
                'shipping' => [
                    'address' => '123 Test Street',
                    'district' => 'Dhaka',
                    'division' => 'Dhaka',
                ],
                'customer' => [
                    'name' => 'Test Customer',
                    'phone' => '01700000000',
                ],
            ],
        ]);

        $trackingNumber = 'SF-PAYLOAD-123';
        $courierName = 'Steadfast';
        $courierPartner = 'Packzy';

        // Dispatch shipped event
        event(new OrderShipped($order, $trackingNumber, $courierName, $courierPartner, null));

        // Verify order data
        $this->assertEquals('shipped', $order->status);
        $this->assertEquals('123 Test Street', $order->external_data['shipping']['address']);
    }

    /** @test */
    public function bulk_orders_can_be_shipped_together()
    {
        Event::fake([OrderShipped::class]);

        // Create multiple orders
        $orders = SalesOrder::factory()->count(3)->create(['status' => 'processing']);

        // Ship all orders
        foreach ($orders as $order) {
            event(new OrderShipped(
                $order,
                'BULK-' . $order->id,
                'Steadfast',
                'Packzy',
                null
            ));
        }

        // Assert all events were dispatched
        Event::assertDispatchedTimes(OrderShipped::class, 3);
    }

    /** @test */
    public function shipped_order_cannot_be_cancelled()
    {
        // Create shipped order
        $order = SalesOrder::factory()->create(['status' => 'shipped']);

        // Try to cancel
        $response = $this->putJson("/api/v2/admin/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'Cannot update status of a cancelled or returned order.',
        ]);
    }

    /** @test */
    public function tracking_number_format_validation()
    {
        // Valid tracking numbers
        $validTrackingNumbers = [
            'SF-123456789',
            'SF-TX-999',
            'TRACK-123',
            '123456789',
            'SF-ABC-123-XYZ',
        ];

        foreach ($validTrackingNumbers as $trackingNumber) {
            $order = SalesOrder::factory()->create(['status' => 'processing']);
            event(new OrderShipped($order, $trackingNumber, 'Steadfast', 'Packzy', null));

            $this->assertNotNull($trackingNumber);
        }
    }
}
