<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdjustmentController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->sendSuccess(InventoryAdjustment::with('items')->latest()->paginate(15));
    }

    /**
     * 1. Create Adjustment (Fixed for Schema Compliance)
     */
    public function store(Request $request)
    {
        $request->validate([
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'reason' => 'required|string',
            'items' => 'required|array',
            'items.*.product_variant_id' => 'required|exists:product_variants,id',
            'items.*.type' => 'required|in:addition,subtraction',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            // A. Create Header
            $adjustment = InventoryAdjustment::create([
                'reference_no' => 'ADJ-' . time(),
                'warehouse_id' => $request->warehouse_id ?? 1, // Default warehouse
                'adjusted_by' => auth()->id() ?? 1,
                'reason' => $request->reason,
                'date' => now(),
            ]);

            // B. Process Items
            foreach ($request->items as $item) {
                if ($item['type'] === 'addition') {
                    $this->processAddition($adjustment->id, $item, $request->warehouse_id ?? 1);
                } else {
                    $this->processSubtraction($adjustment->id, $item);
                }
            }

            DB::commit();
            return $this->sendSuccess($adjustment, 'Stock adjusted successfully!', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Adjustment Failed', ['error' => $e->getMessage()], 400);
        }
    }

    // --- Helper: Handle New Stock (Create Batch) ---
    private function processAddition($adjustmentId, $item, $warehouseId)
    {
        // ১. নতুন ব্যাচ তৈরি করা (যেহেতু ডাটাবেসে ব্যাচ আইডি ছাড়া ইনসার্ট করা যাবে না)
        $variant = ProductVariant::find($item['product_variant_id']);
        
        $batch = InventoryBatch::create([
            'product_variant_id' => $item['product_variant_id'],
            'warehouse_id' => $warehouseId,
            'batch_no' => 'BAT-' . time() . '-' . rand(100,999),
            'cost_price' => $variant->default_purchase_cost ?? 0,
            'initial_qty' => $item['quantity'],
            'remaining_qty' => $item['quantity'], // স্টক সরাসরি যোগ হয়ে যাবে
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // ২. অ্যাডজাস্টমেন্ট আইটেম টেবিল আপডেট (Mapping 'addition' -> 'found')
        DB::table('inventory_adjustment_items')->insert([
            'adjustment_id' => $adjustmentId,
            'inventory_batch_id' => $batch->id, // এখন আমাদের ব্যাচ আইডি আছে
            'qty' => $item['quantity'],
            'type' => 'found', // DB Enum: damage, loss, found, correction
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    // --- Helper: Handle Stock Removal (FIFO Deduct) ---
    private function processSubtraction($adjustmentId, $item)
    {
        $qtyNeeded = $item['quantity'];

        // FIFO: সবচেয়ে পুরনো ব্যাচ থেকে কমানো হবে
        $batches = InventoryBatch::where('product_variant_id', $item['product_variant_id'])
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->get();

        foreach ($batches as $batch) {
            if ($qtyNeeded <= 0) break;

            $deduct = min($batch->remaining_qty, $qtyNeeded);
            
            // ব্যাচ আপডেট
            $batch->decrement('remaining_qty', $deduct);

            // রেকর্ড রাখা (Mapping 'subtraction' -> 'loss')
            DB::table('inventory_adjustment_items')->insert([
                'adjustment_id' => $adjustmentId,
                'inventory_batch_id' => $batch->id,
                'qty' => $deduct,
                'type' => 'loss', 
                'created_at' => now(),
                'updated_at' => now()
            ]);

            $qtyNeeded -= $deduct;
        }

        if ($qtyNeeded > 0) {
            throw new \Exception("Insufficient stock for Product ID: " . $item['product_variant_id']);
        }
    }
}