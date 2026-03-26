<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentItem;
use App\Models\InventoryBatch;
use App\Models\SupplierLedger;
use App\Models\ShipmentHistory; // Added Model
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ShipmentWorkflowController extends Controller
{
    use ApiResponse;

    /**
     * Step 1: Draft Created
     * Generates Internal PO Number. Lot Number remains NULL initially.
     */
    public function createDraft(Request $request)
    {
        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.china_price' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();
        try {
            // Generate Internal Unique PO Number
            $poNumber = 'PO-' . date('Ymd') . '-' . strtoupper(uniqid());

            $shipment = Shipment::create([
                'supplier_id' => $request->supplier_id,
                'po_number' => $poNumber, // Internal ID
                'lot_number' => null,     // External Cargo ID (Set in Step 5)
                'status' => 'draft',
                'total_china_cost_rmb' => 0
            ]);

            $totalRMB = 0;

            foreach ($request->items as $item) {
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'product_id' => $item['product_id'],
                    'product_variant_id' => null,
                    'ordered_qty' => $item['quantity'],
                    'unit_price_rmb' => $item['china_price'],
                ]);
                $totalRMB += ($item['quantity'] * $item['china_price']);
            }

            $shipment->update(['total_china_cost_rmb' => $totalRMB]);
            
            $this->logTimeline($shipment, 'Draft Created', "Order Initialized. PO: {$poNumber}");

            DB::commit();
            return $this->sendSuccess($shipment->load('items'), 'Step 1: Draft Created');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Steps 2 to 7: Status Updates & Inputs (With History Tracking)
     */
    public function updateStep(Request $request, $id)
    {
        $shipment = Shipment::findOrFail($id);
        
        // Keep a copy of old data for history tracking
        $oldData = $shipment->replicate();

        $action = $request->action; 
        $request->validate(['action' => 'required|string']);

        DB::beginTransaction();
        try {
            switch ($action) {
                
                // Step 2: Payment Confirmed
                case 'confirm_payment':
                    $request->validate(['exchange_rate' => 'required|numeric']);
                    $shipment->exchange_rate = $request->exchange_rate;
                    $shipment->status = 'payment_confirmed';
                    $this->logTimeline($shipment, 'Payment Confirmed', "Rate: {$request->exchange_rate}");
                    break;

                // Step 3: Supplier Dispatched
                case 'supplier_dispatch':
                    $request->validate(['int_courier_name' => 'required', 'int_tracking_no' => 'required']);
                    $shipment->int_courier_name = $request->int_courier_name;
                    $shipment->int_tracking_no = $request->int_tracking_no;
                    $shipment->status = 'shipped_from_china';
                    $this->logTimeline($shipment, 'Supplier Dispatched', "Tracking: {$request->int_tracking_no}");
                    break;

                // Step 4: Warehouse Received
                case 'warehouse_received':
                    $shipment->status = 'warehouse_china';
                    $this->logTimeline($shipment, 'Warehouse Received', 'Received at China Warehouse');
                    break;

                // Step 5: Shipped to BD (Assign Real Lot Number)
                case 'ship_to_bd':
                    $request->validate(['lot_number' => 'required|string']);
                    // We update lot_number (Cargo ID), NOT po_number
                    $shipment->lot_number = $request->lot_number; 
                    $shipment->status = 'shipped_to_bd';
                    $this->logTimeline($shipment, 'Shipped to BD', "Cargo Lot Assigned: {$request->lot_number}");
                    break;

                // Step 6: Arrived BD
                case 'arrived_bd':
                    $request->validate([
                        'shipping_cost_intl' => 'required|numeric',
                        'shipping_cost_local' => 'nullable|numeric'
                    ]);
                    $shipment->shipping_cost_intl = $request->shipping_cost_intl;
                    $shipment->shipping_cost_local = $request->shipping_cost_local ?? 0;
                    $shipment->status = 'customs_clearing'; 
                    $shipment->arrived_bd_at = now();
                    $this->logTimeline($shipment, 'Arrived in Bangladesh', 'Shipping costs updated');
                    break;

                // Step 7: In Transit to Bogura
                case 'transit_bogura':
                    $request->validate(['bd_tracking_no' => 'required']);
                    $shipment->bd_tracking_no = $request->bd_tracking_no;
                    $shipment->bd_courier_name = $request->bd_courier_name ?? 'Local Courier';
                    $shipment->status = 'received_bogura'; 
                    $this->logTimeline($shipment, 'In Transit to Bogura', "Local Tracking: {$request->bd_tracking_no}");
                    break;
                
                // GENERAL EDIT (Anytime Correction)
                case 'edit_info':
                    // Allow editing specific fields if user made a mistake
                    $shipment->fill($request->only([
                        'exchange_rate', 'int_tracking_no', 'lot_number', 'bd_tracking_no', 
                        'shipping_cost_intl', 'shipping_cost_local'
                    ]));
                    break;
            }

            $shipment->save();

            // --- HISTORY TRACKING LOGIC ---
            if ($shipment->wasChanged()) {
                $changes = $shipment->getChanges();
                foreach ($changes as $field => $newValue) {
                    if ($field == 'updated_at' || $field == 'status') continue; // Skip timestamps & status (status tracked in timeline)
                    
                    ShipmentHistory::create([
                        'shipment_id' => $shipment->id,
                        'user_id' => auth()->id() ?? 1, // Fallback to 1 if testing without auth
                        'field_name' => $field,
                        'old_value' => $oldData->$field,
                        'new_value' => $newValue,
                        'reason' => $request->edit_reason ?? "Step Update: {$action}"
                    ]);
                }
            }

            DB::commit();
            return $this->sendSuccess($shipment, "Step Updated: {$action}");

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Steps 8-10: Receive at Bogura (Logic Unchanged from previous accurate version)
     */
   public function receiveAtBogura(Request $request, $id)
    {
        $request->validate([
            'exchange_rate' => 'required|numeric|min:1',
            'shipping_cost_intl' => 'nullable|numeric|min:0',
            'shipping_cost_local' => 'nullable|numeric|min:0',
            'other_costs' => 'nullable|numeric|min:0',
            'items' => 'required|array',
            'items.*.item_id' => 'required|exists:shipment_items,id',
            'items.*.received_qty' => 'required|integer|min:0',
            'items.*.unit_weight' => 'nullable|numeric' // KG
        ]);

        DB::beginTransaction();
        try {
            $shipment = Shipment::with('items')->findOrFail($id);

            // 1. Update Shipment Header FIRST with User Inputs
            // (আগে এটি পরে আপডেট হতো বলে ক্যালকুলেশনে ভুল ভ্যালু যেত)
            $shipment->update([
                'exchange_rate' => $request->exchange_rate,
                'shipping_cost_intl' => $request->shipping_cost_intl ?? 0,
                'shipping_cost_local' => $request->shipping_cost_local ?? 0,
                'misc_cost' => $request->other_costs ?? 0,
                'arrived_bogura_at' => now(),
            ]);

            $totalExtraCost = $shipment->shipping_cost_intl + $shipment->shipping_cost_local + $shipment->misc_cost;
            $totalReceivedWeight = 0;
            $totalProductCostBD = 0;

            // Calculate Total Weight for Ratio
            foreach ($request->items as $receivedItem) {
                $totalReceivedWeight += ($receivedItem['received_qty'] * ($receivedItem['unit_weight'] ?? 0));
            }

            // 2. Process Items & Calculate Landed Cost
            foreach ($request->items as $receivedData) {
                $item = $shipment->items->where('id', $receivedData['item_id'])->first();
                
                if (!$item) continue;

                // Update Item Details
                $item->received_qty = $receivedData['received_qty'];
                $item->unit_weight = $receivedData['unit_weight'] ?? 0;
                
                // Calculate Base Cost in BDT (RMB * Rate)
                $baseCostBD = $item->unit_price_rmb * $shipment->exchange_rate;
                
                // Calculate Extra Cost Share (Weight Based Logic)
                $extraCostSharePerUnit = 0;
                if ($totalExtraCost > 0 && $totalReceivedWeight > 0 && $item->unit_weight > 0) {
                    // Formula: (Unit Weight / Total Weight) * Total Cost
                    // But we need per unit. 
                    // Let's use simpler logic: Cost Per KG = Total Cost / Total Weight
                    $costPerKg = $totalExtraCost / $totalReceivedWeight;
                    $extraCostSharePerUnit = $costPerKg * $item->unit_weight;
                } elseif ($totalExtraCost > 0) {
                    // If weight is missing, distribute by value or quantity (Fallback: Quantity)
                    // For now, simpler fallback: Total Cost / Total Qty
                    $totalQty = collect($request->items)->sum('received_qty');
                    $extraCostSharePerUnit = $totalExtraCost / $totalQty;
                }

                // Final Landed Cost
                $item->calculated_landed_cost = round($baseCostBD + $extraCostSharePerUnit, 2);
                $item->save();

                $totalProductCostBD += ($item->calculated_landed_cost * $item->received_qty);

                // 3. Create Inventory Batch (Unsorted)
                // Note: product_variant_id is null for unsorted items
                InventoryBatch::create([
                    'product_id' => $item->product_id,
                    'product_variant_id' => null, // Unsorted
                    'warehouse_id' => 3, // Assuming ID 3 is Main Warehouse, make dynamic if needed
                    'batch_no' => $shipment->po_number,
                    'cost_price' => $item->calculated_landed_cost, // Correct Cost Saved!
                    'initial_qty' => $item->received_qty,
                    'remaining_qty' => $item->received_qty,
                    'created_at' => now()
                ]);
            }

            // 4. Update Shipment Status
            $shipment->update([
                'status' => 'completed',
                'total_china_cost_rmb' => $shipment->items->sum(fn($i) => $i->unit_price_rmb * $i->received_qty)
            ]);

            // 5. Update Supplier Ledger (Accounting)
            // Purchase Entry
            SupplierLedger::create([
                'supplier_id' => $shipment->supplier_id,
                'type' => 'purchase',
                'amount' => $shipment->total_china_cost_rmb, // Debit (You owe them)
                'balance' => 0, // Need to fetch last balance and add logic
                'reason' => "Purchase PO: {$shipment->po_number}",
                'transaction_id' => 'TXN-' . time()
            ]);

            DB::commit();
            return $this->sendSuccess($shipment, 'Step 8-10: Received & Completed with Correct Costing');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    private function logTimeline($shipment, $label, $desc) {
        $shipment->timelines()->create([
            'status_label' => $label,
            'description' => $desc,
            'updated_by' => auth()->id() ?? 1
        ]);
    }

    /**
     * Get Single Shipment with Timeline & History
     */
    public function show($id)
    {
        $shipment = Shipment::with([
            'supplier:id,name',
            // Fix: 'sku' removed because it exists in product_variants table, not products
            'items.product:id,name,slug', 
            'timelines',
            'histories.user:id,name'
        ])->findOrFail($id);
        
        return $this->sendSuccess($shipment, 'Shipment details with history fetched.');
    }
}