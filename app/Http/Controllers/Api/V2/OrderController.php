<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Models\InventoryBatch;
use App\Models\StockLedger;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use ApiResponse;

    /**
     * 1. Omni-channel Order List (Filters: Status, Date, Channel)
     */
    public function index(Request $request)
    {
        $query = SalesOrder::with(['customer:id,name,phone', 'items']);

        // Filter by Status (e.g., ?status=pending)
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by Channel (e.g., ?channel=retail_web)
        if ($request->channel) {
            $query->where('channel', $request->channel);
        }

        // Filter by Date Range
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
        }

        // Search by Invoice or Customer Phone
        if ($request->search) {
            $query->where('invoice_no', 'like', "%{$request->search}%")
                  ->orWhereHas('customer', function($q) use ($request) {
                      $q->where('phone', 'like', "%{$request->search}%");
                  });
        }

        return $this->sendSuccess($query->latest()->paginate(20));
    }

    /**
     * 2. Order Details (For Invoice View)
     */
    public function show($id)
    {
        $order = SalesOrder::with(['customer', 'items.variant.product', 'soldBy:id,name'])
                           ->findOrFail($id);
        
        return $this->sendSuccess($order);
    }

    /**
     * 3. Update Status & Handle Stock Logic (Critical)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled,returned'
        ]);

        $order = SalesOrder::with('items')->findOrFail($id);
        
        // Prevent changing status of already cancelled/returned orders safely
        if (in_array($order->status, ['cancelled', 'returned'])) {
            return $this->sendError('Cannot update status of a cancelled or returned order.');
        }

        DB::beginTransaction();
        try {
            // A. Handle Stock Restoration if Order is Cancelled/Returned
            if (in_array($request->status, ['cancelled', 'returned'])) {
                $this->restoreStock($order);
            }

            // B. Update Status
            $order->update([
                'status' => $request->status,
                // If delivered, maybe update payment status?
                'payment_status' => ($request->status === 'delivered') ? 'paid' : $order->payment_status
            ]);

            if ($request->status === 'delivered') {
            // A. Trigger Loyalty Points
            try {
                (new \App\Services\LoyaltyService())->awardPoints($order);
            } catch (\Exception $e) {
                // Log error but don't stop the order update
                \Illuminate\Support\Log::error('Loyalty Error: ' . $e->getMessage());
            }
    
    // B. Trigger Affiliate Commission (Placeholder Logic)
    // if ($order->affiliate_id) { ... }
}

            // C. Trigger Courier API (Optional Hook)
            // if ($request->status === 'shipped') { ...call Pathao/Steadfast API... }

            DB::commit();
            return $this->sendSuccess($order, "Order status updated to {$request->status}");

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Status update failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * 4. Helper: Download Invoice Data
     */
    public function downloadInvoice($id)
    {
        $order = SalesOrder::with(['customer', 'items.variant.product'])->findOrFail($id);
        
        $invoiceData = [
            'company' => [
                'name' => 'Your Company Name',
                'address' => 'Bogura, Bangladesh',
                'phone' => '+8801700000000',
            ],
            'order' => [
                'invoice_no' => $order->invoice_no,
                'date' => $order->created_at->format('d M, Y'),
                'status' => ucfirst($order->status),
            ],
            'customer' => [
                'name' => $order->customer->name,
                'phone' => $order->customer->phone,
                'address' => $order->customer->shipping_address,
            ],
            'items' => $order->items->map(function($item) {
                return [
                    'product' => $item->variant->full_name ?? 'Item',
                    'qty' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total' => $item->total_price,
                ];
            }),
            'totals' => [
                'sub_total' => $order->sub_total,
                'discount' => $order->discount_amount,
                'delivery' => $order->delivery_charge,
                'grand_total' => $order->total_amount,
                'paid' => $order->paid_amount,
                'due' => $order->total_amount - $order->paid_amount,
            ]
        ];

        return $this->sendSuccess($invoiceData);
    }

    // --- Private Helper: Restore Stock (Reverse of Deduction) ---
    private function restoreStock($order)
    {
        foreach ($order->items as $item) {
            // Find the most relevant batch (e.g., FIFO or latest available)
            // Simplification: Adding back to the latest active batch or creating adjustment
            // Best practice: Add to a specific "Return Batch" or general stock
            
            $batch = InventoryBatch::where('product_variant_id', $item->product_variant_id)
                        ->orderBy('expiry_date', 'desc') // Add to freshest batch usually
                        ->first();

            if ($batch) {
                $batch->increment('remaining_qty', $item->quantity);
            } else {
                // If no batch exists (rare), create a correction batch
                // Logic skipped for brevity
            }

            // Ledger Entry
            StockLedger::create([
                'product_variant_id' => $item->product_variant_id,
                'warehouse_id'       => $batch ? $batch->warehouse_id : 1, // Default warehouse
                'inventory_batch_id' => $batch ? $batch->id : null,
                'type'               => 'return_in', // Stock In
                'qty_change'         => $item->quantity,
                'reference_type'     => SalesOrder::class,
                'reference_id'       => $order->id,
                'date'               => now(),
            ]);
        }
    }
}