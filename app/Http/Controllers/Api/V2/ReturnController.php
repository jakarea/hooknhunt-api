<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\ReturnRequest;
use App\Models\ReturnRequestItem;
use App\Models\InventoryBatch;
use App\Models\SalesOrder;
use App\Models\StockLedger;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReturnController extends Controller
{
    use ApiResponse;

    /**
     * 1. Customer Submits Return Request
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'reason' => 'required|in:defective,wrong_item,size_issue,change_mind,other',
            'items' => 'required|array',
            'items.*.product_variant_id' => 'required',
            'items.*.qty' => 'required|integer|min:1'
        ]);

        DB::beginTransaction();
        try {
            $returnReq = ReturnRequest::create([
                'tracking_no' => 'RMA-' . rand(10000, 99999),
                'customer_id' => auth()->user()->id, // Assuming customer is logged in
                'sales_order_id' => $request->sales_order_id,
                'reason' => $request->reason,
                'details' => $request->details,
                'images' => $request->images, // Array of URLs
                'status' => 'pending'
            ]);

            foreach ($request->items as $item) {
                ReturnRequestItem::create([
                    'return_request_id' => $returnReq->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'qty' => $item['qty']
                ]);
            }

            DB::commit();
            return $this->sendSuccess($returnReq, 'Return request submitted.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to submit request', ['error' => $e->getMessage()]);
        }
    }

    /**
     * 2. Admin Reviews & Approves Return
     * This is where Stock & Money is adjusted
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'admin_note' => 'nullable|string'
        ]);

        $returnReq = ReturnRequest::with('items')->findOrFail($id);

        if ($returnReq->status !== 'pending') {
            return $this->sendError('This request is already processed.');
        }

        DB::beginTransaction();
        try {
            // Update Status
            $returnReq->update([
                'status' => $request->status,
                'admin_note' => $request->admin_note,
                'refund_method' => $request->refund_method ?? 'wallet'
            ]);

            if ($request->status === 'approved') {
                foreach ($returnReq->items as $item) {
                    
                    // A. Restore Stock (Only if condition is Good)
                    // If damaged, we might add to a separate "Damaged Warehouse" or just write-off
                    // For now, we assume standard restock
                    
                    $batch = InventoryBatch::where('product_variant_id', $item->product_variant_id)
                                ->orderBy('expiry_date', 'desc') // Add to freshest batch
                                ->first();

                    if ($batch) {
                        $batch->increment('remaining_qty', $item->qty);
                    }

                    // B. Stock Ledger Entry
                    StockLedger::create([
                        'product_variant_id' => $item->product_variant_id,
                        'warehouse_id' => $batch ? $batch->warehouse_id : 1,
                        'inventory_batch_id' => $batch ? $batch->id : null,
                        'type' => 'return_in',
                        'qty_change' => $item->qty,
                        'reference_type' => ReturnRequest::class,
                        'reference_id' => $returnReq->id,
                        'date' => now()
                    ]);
                }

                // C. Refund Logic (Example: Add to Wallet)
                if ($returnReq->refund_method === 'wallet') {
                    $customer = $returnReq->customer;
                    // $customer->increment('wallet_balance', $calculatedRefundAmount); 
                    // Note: Refund Amount calculation logic needs to be precise based on Order Price
                }
            }

            DB::commit();
            return $this->sendSuccess(null, 'Return request processed successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Process failed', ['error' => $e->getMessage()]);
        }
    }
}