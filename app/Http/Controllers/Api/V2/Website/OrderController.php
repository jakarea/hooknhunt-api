<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    /**
     * Get authenticated customer's orders
     */
    public function myOrders(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Find customer record for this user
        $customer = \App\Models\Customer::where('user_id', $user->id)->first();

        if (!$customer) {
            return response()->json([
                'status' => true,
                'data' => [],
            ]);
        }

        // Get orders for this customer
        $orders = SalesOrder::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->invoice_no,
                    'total_amount' => (float) $order->total_amount,
                    'status' => $order->status,
                    'created_at' => $order->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'status' => true,
            'data' => $orders,
        ]);
    }
}