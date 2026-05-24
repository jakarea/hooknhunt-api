<?php

namespace App\Modules\Shipping\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Shipping\Models\Courier;
use App\Modules\Shipping\Models\CourierZoneRate;
use App\Services\SteadfastService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CourierController extends Controller
{
    use ApiResponse;

    // --- Admin Config ---
    public function index()
    {
        return $this->sendSuccess(Courier::all());
    }

    public function update(Request $request, $id)
    {
        $courier = Courier::findOrFail($id);
        $courier->update($request->all());
        return $this->sendSuccess($courier, 'Courier settings updated');
    }

    public function testConnection(Request $request, $id)
    {
        $service = new SteadfastService();
        $response = $service->checkStatus('TEST-CONNECTION');
        return $this->sendSuccess($response, 'Connection Test');
    }

    public function getZoneRates($id)
    {
        return $this->sendSuccess(CourierZoneRate::where('courier_id', $id)->get());
    }
    
    public function updateZoneRates(Request $request) {
        return $this->sendSuccess(null, 'Updated');
    }

    // --- Operations ---

    public function bookOrder($orderId)
    {
        // Get order data using direct database access for module independence
        $order = DB::table('sales_orders')->where('id', $orderId)->first();

        if (!$order) {
            return $this->sendError('Order not found');
        }

        if ($order->courier_tracking_id) {
            return $this->sendError('Order already booked.', ['tracking_id' => $order->courier_tracking_id]);
        }

        $service = new SteadfastService();

        // Create a mock order object for the service (SteadfastService expects an order object)
        $orderForService = (object) [
            'id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'shipping_address' => $order->shipping_address,
            'shipping_city' => $order->shipping_city,
            'total_amount' => $order->total_amount,
        ];

        $result = $service->createOrder($orderForService);

        if ($result['success']) {
            DB::table('sales_orders')->where('id', $orderId)->update([
                'courier_tracking_id' => $result['tracking_code'],
                'status' => 'shipped',
                'shipped_at' => now()
            ]);
            return $this->sendSuccess($result, 'Shipment booked successfully!');
        } else {
            return $this->sendError($result['msg']);
        }
    }

    public function checkStatus($trackingCode)
    {
        $service = new SteadfastService();
        $status = $service->checkStatus($trackingCode);
        return $this->sendSuccess($status);
    }

    /**
     * Bulk Status Update (Production Ready)
     */
    public function bulkStatusUpdate()
    {
        // Use direct database access for module independence
        // ১. শিপড এবং ট্র্যাকিং আইডি আছে এমন অর্ডার খোঁজা
        $orders = DB::table('sales_orders')
                    ->whereNotNull('courier_tracking_id')
                    ->where('status', 'shipped')
                    ->take(50)
                    ->get();

        if ($orders->isEmpty()) {
            return $this->sendSuccess(null, "No shipped orders found to update.");
        }

        $updatedCount = 0;
        $service = new SteadfastService();

        foreach ($orders as $order) {
            // ২. স্ট্যাটাস চেক
            $response = $service->checkStatus($order->courier_tracking_id);

            // ৩. ভ্যালিডেশন
            if (!is_array($response) || !isset($response['delivery_status'])) {
                continue;
            }

            $status = strtolower($response['delivery_status']);

            // ৪. স্ট্যাটাস আপডেট লজিক - use direct database access
            if ($status == 'delivered') {
                DB::table('sales_orders')->where('id', $order->id)->update(['status' => 'delivered']);
                $updatedCount++;
            }
            elseif (in_array($status, ['cancelled', 'returned'])) {
                DB::table('sales_orders')->where('id', $order->id)->update(['status' => 'returned']);
                $updatedCount++;
            }
        }

        return $this->sendSuccess(null, "$updatedCount orders updated successfully.");
    }
}