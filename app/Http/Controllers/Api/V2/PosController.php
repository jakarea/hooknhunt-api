<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\SalesOrder;      // Correct Model Name from DB
use App\Models\SalesOrderItem;  // Correct Model Name from DB
use App\Models\InventoryBatch;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    use ApiResponse;

    /**
     * 1. Get Products for POS Grid (Optimized)
     */
    public function getProducts(Request $request)
    {
        // Only fetch items with stock > 0 to reduce human error
        // Ensure 'variants.batches' or 'inventory' relation is loaded if needed for accurate stock
        $products = ProductVariant::with(['product.thumbnail'])
            ->get() 
            ->filter(function($variant) {
                return $variant->current_stock > 0;
            })
            ->values();

        return $this->sendSuccess($products);
    }

    /**
     * 2. Scan Barcode (Fastest Response)
     */
    public function scanBarcode(Request $request)
    {
        $code = $request->code; // SKU or Barcode

        $variant = ProductVariant::with('product')
                    ->where('sku', $code)
                    ->orWhere('custom_sku', $code)
                    ->first();

        if (!$variant) {
            return $this->sendError('Product not found!', null, 404);
        }

        if ($variant->current_stock <= 0) {
            return $this->sendError('Stock out!', null, 400);
        }

        return $this->sendSuccess($variant);
    }

    /**
     * 3. Checkout (The Transaction - FIXED for 'sales_orders' table)
     * Payload: { customer_id: 1, items: [{variant_id: 5, qty: 1, price: 500}], paid_amount: 500, discount: 0 }
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.qty' => 'required|integer|min:1',
            'paid_amount' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();
        try {
            // A. Calculate Totals (Server Side Validation)
            $subTotal = 0;
            
            // Note: Profit/Cost calculation logic usually goes here or in a Service
            
            foreach ($request->items as $item) {
                $subTotal += ($item['price'] * $item['qty']);
            }
            
            $discount = $request->discount ?? 0;
            // $tax = 0; // Tax logic can be added here if DB has a column
            
            // 'total_amount' mapping from DB (was grand_total)
            $grandTotal = $subTotal - $discount; 
            
            // Payment Status Logic
            $paymentStatus = 'unpaid';
            if ($request->paid_amount >= $grandTotal) {
                $paymentStatus = 'paid';
            } elseif ($request->paid_amount > 0) {
                $paymentStatus = 'partial';
            }

            // B. Create Order Header (Mapping to 'sales_orders' table)
            $order = SalesOrder::create([
                'invoice_no'      => 'POS-' . time(),     // Mapped to DB: invoice_no
                'customer_id'     => $request->customer_id,
                'sold_by'         => auth()->id(),        // Mapped to DB: sold_by
                'channel'         => 'pos',               // Mapped to DB: channel (enum)
                'sub_total'       => $subTotal,
                'discount_amount' => $discount,           // Mapped to DB: discount_amount
                'delivery_charge' => 0,                   // POS has no delivery charge
                'total_amount'    => $grandTotal,         // Mapped to DB: total_amount
                'paid_amount'     => $request->paid_amount,
                'payment_status'  => $paymentStatus,
                'status'          => 'delivered',         // POS orders are fulfilled instantly
                'note'            => $request->note ?? null
            ]);

            // C. Process Items & Deduct Stock (FIFO)
            foreach ($request->items as $item) {
                // 1. Create Order Item (Mapping to 'sales_order_items' table)
                SalesOrderItem::create([
                    'sales_order_id'      => $order->id,
                    'product_variant_id'  => $item['variant_id'],
                    'quantity'            => $item['qty'],
                    'unit_price'          => $item['price'],
                    'total_price'         => $item['price'] * $item['qty'],
                    // 'total_cost' => 0 // This should ideally be updated by FIFO Service later
                ]);

                // 2. Deduct Stock (FIFO Logic)
                $this->deductStock($item['variant_id'], $item['qty']);
            }

            // D. Record Payment (Optional: If you have a payments table)
            // Payment::create([...]);

            DB::commit();
            return $this->sendSuccess($order, 'POS Sale completed successfully!', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Checkout Failed', ['error' => $e->getMessage()], 400);
        }
    }

    // --- Helper: Stock Deduction (Fixed Syntax Error) ---
    private function deductStock($variantId, $qty)
    {
        $batches = InventoryBatch::where('product_variant_id', $variantId)
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('created_at', 'asc') // FIFO
                    ->get();

        // Fixed: Removed the erroneous line "$qty needed = $qty;"

        foreach ($batches as $batch) {
            if ($qty <= 0) break; // Demand met

            if ($batch->remaining_qty >= $qty) {
                // Batch has enough stock
                $batch->decrement('remaining_qty', $qty);
                $qty = 0;
            } else {
                // Batch has partial stock, take it all
                $taken = $batch->remaining_qty;
                $batch->update(['remaining_qty' => 0]);
                $qty -= $taken;
            }
        }

        // If qty still > 0, it means we ran out of batches
        if ($qty > 0) {
            throw new \Exception("Insufficient stock for Variant ID: {$variantId}. Short by: {$qty}");
        }
    }
}