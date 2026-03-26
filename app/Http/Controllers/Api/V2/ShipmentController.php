<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentItem;
use App\Models\ShipmentCost; // Make sure Model exists
use App\Models\InventoryBatch;
use App\Models\ProductVariant;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShipmentController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Shipment::with('supplier')->latest();
        if ($request->status) {
            $query->where('status', $request->status);
        }
        return $this->sendSuccess($query->paginate(20));
    }

    /**
     * 1. Create Draft Shipment
     */
    public function store(Request $request)
    {
        $request->validate(['supplier_id' => 'required|exists:suppliers,id']);

        $shipment = Shipment::create([
            'tracking_number' => 'SH-' . time(), // Auto generated
            'supplier_id' => $request->supplier_id,
            'status' => 'ordered',
            'ordered_at' => now(),
            'created_by' => auth()->id()
        ]);

        return $this->sendSuccess($shipment, 'Shipment draft created', 201);
    }

    /**
     * 2. Add Item (Reduce Labour: Just scan or select)
     */
    public function addItem(Request $request, $id)
    {
        $request->validate([
            'product_variant_id' => 'required|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'unit_cost' => 'required|numeric' // China Purchase Price (CNY or BDT)
        ]);

        $shipment = Shipment::findOrFail($id);

        if ($shipment->status === 'received') {
            return $this->sendError('Cannot edit a finalized shipment.');
        }

        ShipmentItem::updateOrCreate(
            [
                'shipment_id' => $id,
                'product_variant_id' => $request->product_variant_id
            ],
            [
                'quantity' => $request->quantity,
                'unit_cost' => $request->unit_cost,
                'total_cost' => $request->quantity * $request->unit_cost
            ]
        );

        return $this->sendSuccess(null, 'Item added to shipment');
    }

    /**
     * 3. Add Extra Costs (C&F, Courier)
     */
    public function addCost(Request $request, $id)
    {
        $request->validate([
            'cost_head' => 'required|string', // e.g. "Customs Duty"
            'amount' => 'required|numeric'
        ]);

        ShipmentCost::create([
            'shipment_id' => $id,
            'cost_head' => $request->cost_head,
            'amount' => $request->amount
        ]);

        return $this->sendSuccess(null, 'Cost added successfully');
    }

    /**
     * 4. Update Status (Yes/No Action)
     * User simply clicks "Mark as Shipped" or "Arrived"
     */
    public function markAsShipped($id)
    {
        Shipment::where('id', $id)->update(['status' => 'shipped', 'shipped_at' => now()]);
        return $this->sendSuccess(null, 'Status updated to Shipped');
    }

    public function markArrivedBogura($id)
    {
        Shipment::where('id', $id)->update(['status' => 'arrived_bogura']);
        return $this->sendSuccess(null, 'Status updated to Arrived at Bogura');
    }

    /**
     * 5. FINALIZE & AUTO STOCK IN (The Futuristic Logic)
     * This calculates Landed Cost and updates Inventory automatically.
     */
    public function finalizeShipment($id)
    {
        $shipment = Shipment::with(['items', 'costs'])->findOrFail($id);

        if ($shipment->status === 'received') {
            return $this->sendError('This shipment is already finalized.');
        }

        DB::beginTransaction();
        try {
            // A. Calculate Financials
            $totalProductCost = $shipment->items->sum('total_cost');
            $totalExtraCost = $shipment->costs->sum('amount');
            
            // Avoid division by zero
            if ($totalProductCost <= 0) {
                 throw new \Exception("Total product cost cannot be zero.");
            }

            // B. Ratio Calculation (Weighted Average)
            // Extra cost per 1 Taka of product cost = Total Extra / Total Product Cost
            $costRatio = $totalExtraCost / $totalProductCost;

            foreach ($shipment->items as $item) {
                // Formula: Item Base Cost + (Item Base Cost * Ratio)
                $landedCostPerUnit = $item->unit_cost + ($item->unit_cost * $costRatio);

                // C. Insert into Inventory (FIFO Batch)
                InventoryBatch::create([
                    'product_variant_id' => $item->product_variant_id,
                    'supplier_id' => $shipment->supplier_id,
                    'quantity' => $item->quantity,
                    'remaining_qty' => $item->quantity, // Initially full
                    'cost_price' => round($landedCostPerUnit, 2), // The Magic Number
                    'batch_number' => $shipment->tracking_number,
                    'received_at' => now(),
                    'expiry_date' => null // Optional
                ]);
            }

            // D. Update Shipment Status
            $shipment->update([
                'status' => 'received',
                'received_at' => now(),
                'total_cost' => $totalProductCost + $totalExtraCost
            ]);

            // E. Notify Admin (Automation)
            // User::find(1)->notify(new ShipmentReceived($shipment));

            DB::commit();
            return $this->sendSuccess(null, 'Shipment finalized & Stock updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Finalization failed', ['error' => $e->getMessage()], 500);
        }
    }
}