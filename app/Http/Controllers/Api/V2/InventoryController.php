<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    use ApiResponse;

    /**
     * 1. Current Stock Summary (Aggregated)
     * Shows: "Samsung S24 - Total 50 Pcs - Avg Cost 1200"
     */
    public function index(Request $request)
    {
        // আমরা সরাসরি ProductVariant কুয়েরি করব এবং রিলেশন দিয়ে স্টক যোগ করব
        $query = ProductVariant::with(['product.brand', 'product.category', 'unit'])
            ->withSum('batches as current_stock', 'remaining_qty') // Magic of Laravel
            ->having('current_stock', '>', 0); // শুধু স্টক আছে এমন প্রোডাক্ট

        if ($request->search) {
            $query->where('sku', 'like', "%{$request->search}%")
                  ->orWhereHas('product', function($q) use ($request) {
                      $q->where('name', 'like', "%{$request->search}%");
                  });
        }

        // Pagination with calculated fields
        $variants = $query->paginate(20);

        return $this->sendSuccess($variants);
    }

    /**
     * 2. FIFO Batch History (The Layer View)
     * Shows: "Batch A: 10 pcs @ 500tk" | "Batch B: 5 pcs @ 600tk"
     */
    public function batchHistory($variantId)
    {
        $batches = InventoryBatch::where('product_variant_id', $variantId)
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('created_at', 'asc') // FIFO Order (Oldest First)
                    ->get();

        return $this->sendSuccess($batches);
    }

    /**
     * 3. Low Stock Report (Automated Alert)
     * Human Labour Reduction: সিস্টেম নিজেই বলবে কি অর্ডার করতে হবে
     */
    public function lowStockReport()
    {
        // সেই সব ভ্যারিয়েন্ট আনব যার current_stock < stock_alert_level
        $lowStockItems = ProductVariant::with('product')
            ->withSum('batches as current_stock', 'remaining_qty')
            ->get() // Note: Large DB হলে এখানে raw query বা chunk ব্যবহার করতে হবে
            ->filter(function ($variant) {
                return $variant->current_stock <= $variant->stock_alert_level;
            })
            ->values();

        return $this->sendSuccess($lowStockItems);
    }

    /**
     * 4. Ledger Report (Audit Trail)
     * কবে কত পিস মাল ঢুকেছে এবং বের হয়েছে
     */
    public function ledgerReport(Request $request)
    {
        // এটি আমরা Batch 9 (Reports) এ বিস্তারিত করব, 
        // আপাতত এটি একটি প্লেসহোল্ডার।
        return $this->sendSuccess([], 'Stock ledger coming in Batch 9');
    }
}