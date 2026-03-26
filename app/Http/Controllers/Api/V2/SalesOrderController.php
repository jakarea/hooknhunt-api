<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ProductVariant;
use App\Models\ChartOfAccount;
use App\Models\InventoryBatch; // Added for Stock Logic
use App\Models\Setting;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\LoyaltyService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesOrderController extends Controller
{
    use ApiResponse;

    protected $loyaltyService;

    public function __construct(LoyaltyService $loyaltyService)
    {
        $this->loyaltyService = $loyaltyService;
    }

    /**
     * Calculate Cart Total (Dry Run)
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'channel' => 'required|in:pos,retail_web,wholesale_web,daraz',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'discount_amount' => 'nullable|numeric|min:0'
        ]);

        try {
            $totals = $this->performCalculations($request->items, $request->channel, $request->discount_amount);
            return $this->sendSuccess($totals, 'Calculation successful');
        } catch (\Exception $e) {
            return $this->sendError($e->getMessage());
        }
    }


    /**
     * Helper: Centralized Calculation Logic
     */
    private function performCalculations($items, $channel, $discount = 0)
    {
        $subTotal = 0;
        $orderItemsData = [];

        $globalWholesaleMOQ = 10; 
        if ($channel === 'wholesale_web') {
            $setting = Setting::where('key', 'global_wholesale_moq')->first();
            if ($setting) $globalWholesaleMOQ = (int) $setting->value;
        }

        foreach ($items as $item) {
            $variant = ProductVariant::with('product')->findOrFail($item['variant_id']);

            // Wholesale MOQ Check
            if ($channel === 'wholesale_web') {
                $requiredQty = $variant->wholesale_moq ?? $globalWholesaleMOQ;
                if ($item['quantity'] < $requiredQty) {
                    throw new \Exception("Minimum order quantity for '{$variant->full_name}' is {$requiredQty} pieces (Wholesale Rule).");
                }
            }

            // Price Fetching
            $unitPrice = $variant->getPriceForChannel($channel);
            $lineTotal = $unitPrice * $item['quantity'];
            $subTotal += $lineTotal;

            $orderItemsData[] = [
                'product_variant_id' => $variant->id,
                'quantity' => $item['quantity'],
                'unit_price' => $unitPrice,
                'total_price' => $lineTotal
            ];
        }

        $discount = $discount ?? 0;
        $totalAmount = max(0, $subTotal - $discount);

        return [
            'sub_total' => $subTotal,
            'discount_amount' => $discount,
            'total_amount' => $totalAmount,
            'items_data' => $orderItemsData
        ];
    }

   
    /**
     * Create Sales Order (Checkout)
     */
/**
     * Create Sales Order (Checkout)
     */
    public function store(Request $request)
    {
        // ... (Validations remain same)
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:cash,bank,due'
        ]);

        DB::beginTransaction();
        try {
            // 1. Create Order Header
            $order = SalesOrder::create([
                'invoice_no' => 'INV-' . strtoupper(uniqid()),
                'customer_id' => $request->customer_id,
                'sold_by' => auth()->id(),
                'channel' => $request->channel ?? 'retail_web',
                'status' => 'pending',
                'payment_status' => $request->payment_method === 'due' ? 'unpaid' : 'paid',
                'sub_total' => 0, // Will update later
                'total_amount' => 0,
                'paid_amount' => $request->payment_method === 'due' ? 0 : 0,
                'due_amount' => 0,
                'shipping_address' => $request->shipping_address
            ]);

            $subTotal = 0;
            $totalCostCOGS = 0; // For Accounting

            // 2. Process Items & Deduct Stock
            foreach ($request->items as $itemData) {
                $variant = ProductVariant::findOrFail($itemData['variant_id']);
                
                // Price Logic
                $unitPrice = $request->channel === 'wholesale_web' 
                    ? ($variant->default_wholesale_price > 0 ? $variant->default_wholesale_price : $variant->default_retail_price) 
                    : $variant->default_retail_price;

                $lineTotal = $unitPrice * $itemData['quantity'];
                $subTotal += $lineTotal;

                // Create Order Item
                $orderItem = SalesOrderItem::create([
                    'sales_order_id' => $order->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $lineTotal,
                    'total_cost' => 0 // Placeholder
                ]);

                // *** FIFO Stock Deduction & COGS Calculation ***
                // Ensure deductStock method exists in your controller or service
                $itemCost = $this->deductStock($variant->id, $itemData['quantity'], $orderItem->id);
                
                $orderItem->update(['total_cost' => $itemCost]);
                $totalCostCOGS += $itemCost;
            }

            // 3. Update Order Totals
            $totalAmount = $subTotal - ($request->discount_amount ?? 0);
            $order->update([
                'sub_total' => $subTotal,
                'discount_amount' => $request->discount_amount ?? 0,
                'total_amount' => $totalAmount,
                'due_amount' => $request->payment_method === 'due' ? $totalAmount : 0,
                'paid_amount' => $request->payment_method !== 'due' ? $totalAmount : 0
            ]);

            // =========================================================
            // 🔥 CRM INTEGRATION: Auto-Convert Lead to Customer 🔥
            // =========================================================
            try {
                // Determine Phone Number (From Request or Fetched Customer)
                $customerPhone = $request->phone;
                
                if (!$customerPhone) {
                    $customer = \App\Models\Customer::find($request->customer_id);
                    $customerPhone = $customer ? $customer->phone : null;
                }

                if ($customerPhone) {
                    // Check for any 'Active' or 'Attempted' lead with this phone
                    $pendingLead = \App\Models\Lead::where('phone', $customerPhone)
                        ->whereIn('status', ['new', 'attempted_purchase', 'contacted'])
                        ->first();

                    if ($pendingLead) {
                        $pendingLead->update([
                            'status' => 'converted', // Remove from "Attempted Purchase" list
                            'converted_customer_id' => $request->customer_id,
                            'notes' => $pendingLead->notes . " | Auto-converted via Order #" . $order->invoice_no
                        ]);
                        
                        \Illuminate\Support\Facades\Log::info("Lead ID {$pendingLead->id} auto-converted by Order #{$order->invoice_no}");
                    }
                }
            } catch (\Exception $leadEx) {
                // Silent Fail: If lead update fails, do NOT rollback the actual Sales Order.
                // Just log it for debugging.
                \Illuminate\Support\Facades\Log::error("CRM Lead Auto-Convert Failed: " . $leadEx->getMessage());
            }
            // =========================================================

            // 4. Trigger Accounting (Auto Journal Entry)
            $this->createSalesJournal($order, $totalCostCOGS);

            // 5. Loyalty Points
            $this->loyaltyService->awardPoints($order);

            DB::commit();
            return $this->sendSuccess($order->load('items'), 'Sales Order Created Successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    // --- Helper: Stock Deduction (FIFO) ---
    private function deductStock($variantId, $qtyNeeded, $orderItemId)
    {
        $batches = InventoryBatch::where('product_variant_id', $variantId)
                    ->where('remaining_qty', '>', 0)
                    ->orderBy('created_at', 'asc') // FIFO
                    ->lockForUpdate()
                    ->get();

        $totalCost = 0;
        $qtyToDeduct = $qtyNeeded;

        foreach ($batches as $batch) {
            if ($qtyToDeduct <= 0) break;

            $take = min($batch->remaining_qty, $qtyToDeduct);
            
            // Deduct
            $batch->decrement('remaining_qty', $take);
            
            // Calculate Cost for this portion
            $totalCost += ($take * $batch->cost_price);
            
            // Decrease needed
            $qtyToDeduct -= $take;
        }

        if ($qtyToDeduct > 0) {
            throw new \Exception("Insufficient Stock for Variant ID: $variantId");
        }

        return $totalCost;
    }

    // --- Accounting: Auto Journal Entry ---
    private function createSalesJournal($order, $cogsAmount)
    {
        // Find Accounts (Ensure these exist in ChartOfAccount seeder)
        $salesRevenueAcc = ChartOfAccount::where('code', '4001')->first(); // Revenue
        $accountsReceivableAcc = ChartOfAccount::where('code', '1200')->first(); // Asset (Customer Due)
        $cashAcc = ChartOfAccount::where('code', '1001')->first(); // Asset (Cash)
        $cogsAcc = ChartOfAccount::where('code', '5001')->first(); // Expense
        $inventoryAcc = ChartOfAccount::where('code', '1100')->first(); // Asset

        // If accounts not seeded, return to avoid crash (or handle error)
        if (!$salesRevenueAcc || !$cogsAcc || !$inventoryAcc) return;

        // Entry 1: Record Revenue (Credit Sales / Cash Sales)
        $jeRevenue = JournalEntry::create([
            'entry_number' => 'SAL-' . $order->invoice_no,
            'date' => now(),
            'description' => "Sales Revenue for Order #{$order->invoice_no}",
            'reference_type' => SalesOrder::class,
            'reference_id' => $order->id,
            'created_by' => auth()->id() ?? 1
        ]);

        // Debit: Cash or Receivable
        $debitAccId = ($order->payment_status === 'paid') ? $cashAcc->id : $accountsReceivableAcc->id;

        JournalItem::create([
            'journal_entry_id' => $jeRevenue->id,
            'account_id' => $debitAccId,
            'debit' => $order->total_amount,
            'credit' => 0
        ]);

        // Credit: Revenue
        JournalItem::create([
            'journal_entry_id' => $jeRevenue->id,
            'account_id' => $salesRevenueAcc->id,
            'debit' => 0,
            'credit' => $order->total_amount
        ]);

        // Validate balance for revenue entry (critical for double-entry)
        if (!$jeRevenue->isBalanced()) {
            throw new \Exception('Revenue journal entry is not balanced. Debit: ' . $jeRevenue->getTotalDebitAttribute . ', Credit: ' . $jeRevenue->getTotalCreditAttribute);
        }

        // Entry 2: Record COGS (Cost of Goods Sold)
        // This moves value from Inventory Asset to Expense
        if ($cogsAmount > 0) {
            $jeCogs = JournalEntry::create([
                'entry_number' => 'COGS-' . $order->invoice_no,
                'date' => now(),
                'description' => "Cost of Goods Sold for Order #{$order->invoice_no}",
                'reference_type' => SalesOrder::class,
                'reference_id' => $order->id,
                'created_by' => auth()->id() ?? 1
            ]);

            // Debit: COGS Expense
            JournalItem::create([
                'journal_entry_id' => $jeCogs->id,
                'account_id' => $cogsAcc->id,
                'debit' => $cogsAmount,
                'credit' => 0
            ]);

            // Credit: Inventory Asset
            JournalItem::create([
                'journal_entry_id' => $jeCogs->id,
                'account_id' => $inventoryAcc->id,
                'debit' => 0,
                'credit' => $cogsAmount
            ]);

            // Validate balance for COGS entry (critical for double-entry)
            if (!$jeCogs->isBalanced()) {
                throw new \Exception('COGS journal entry is not balanced. Debit: ' . $jeCogs->getTotalDebitAttribute . ', Credit: ' . $jeCogs->getTotalCreditAttribute);
            }
        }
    }
}