<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventorySortingController extends Controller
{
    use ApiResponse;

    /**
     * Sort Unsorted Stock into Variants
     * Input: source_batch_id, sorted_items: [{variant_id, quantity}]
     */
    public function sortStock(Request $request)
    {
        $request->validate([
            'source_batch_id' => 'required|exists:inventory_batches,id',
            'sorted_items' => 'required|array|min:1',
            'sorted_items.*.variant_id' => 'required|exists:product_variants,id',
            'sorted_items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            // 1. Fetch Source Batch (Must be Unsorted / Variant Null)
            $sourceBatch = InventoryBatch::lockForUpdate()->findOrFail($request->source_batch_id);

            if ($sourceBatch->product_variant_id !== null) {
                return $this->sendError('This batch is already sorted or belongs to a specific variant.');
            }

            // 2. Calculate Total Requested Qty
            $totalRequestedQty = collect($request->sorted_items)->sum('quantity');

            if ($totalRequestedQty > $sourceBatch->remaining_qty) {
                return $this->sendError("Insufficient stock in source batch. Available: {$sourceBatch->remaining_qty}, Requested: {$totalRequestedQty}");
            }

            $newBatches = [];

            // 3. Process Sorting
            foreach ($request->sorted_items as $item) {
                $variant = ProductVariant::findOrFail($item['variant_id']);

                // Ensure the variant belongs to the same product as the batch
                if ($variant->product_id !== $sourceBatch->product_id) {
                    throw new \Exception("Variant {$variant->sku} does not belong to the product of this batch.");
                }

                // Create New Batch for the Variant
                // We copy Cost Price & Meta data from the Source Batch to maintain FIFO accuracy
                $newBatch = InventoryBatch::create([
                    'product_id' => $sourceBatch->product_id,
                    'product_variant_id' => $variant->id,
                    'warehouse_id' => $sourceBatch->warehouse_id,
                    'batch_no' => $sourceBatch->batch_no, // Keep same batch number reference
                    'cost_price' => $sourceBatch->cost_price, // Inherit Landed Cost
                    'initial_qty' => $item['quantity'],
                    'remaining_qty' => $item['quantity'],
                    // 'expiry_date' => $sourceBatch->expiry_date, // If applicable
                ]);

                $newBatches[] = $newBatch;
            }

            // 4. Deduct from Source Batch
            $sourceBatch->remaining_qty -= $totalRequestedQty;
            
            // If source is fully sorted, we might verify exact 0
            $sourceBatch->save();

            DB::commit();

            return $this->sendSuccess([
                'source_batch_remaining' => $sourceBatch->remaining_qty,
                'new_batches' => $newBatches
            ], 'Stock sorted successfully into variants.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Get List of Unsorted Batches (To show in UI)
     */
    public function getUnsortedBatches()
    {
        $batches = InventoryBatch::with('product')
            ->whereNull('product_variant_id')
            ->where('remaining_qty', '>', 0)
            ->get();

        return $this->sendSuccess($batches, 'Unsorted batches fetched');
    }
}