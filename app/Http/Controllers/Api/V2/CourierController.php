<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\SalesOrder;
use App\Models\CourierZoneRate;
use App\Services\SteadfastService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

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
        $order = SalesOrder::with('customer')->findOrFail($orderId);

        if ($order->courier_tracking_id) {
            return $this->sendError('Order already booked.', ['tracking_id' => $order->courier_tracking_id]);
        }

        $service = new SteadfastService();
        $result = $service->createOrder($order);

        if ($result['success']) {
            $order->update([
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
        // ১. শিপড এবং ট্র্যাকিং আইডি আছে এমন অর্ডার খোঁজা
        $orders = SalesOrder::whereNotNull('courier_tracking_id')
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
            
            // ৪. স্ট্যাটাস আপডেট লজিক
            if ($status == 'delivered') {
                $order->update(['status' => 'delivered']);
                $updatedCount++;
            } 
            elseif (in_array($status, ['cancelled', 'returned'])) {
                $order->update(['status' => 'returned']);
                $updatedCount++;
            }
        }

        return $this->sendSuccess(null, "$updatedCount orders updated successfully.");
    }
}