<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    use ApiResponse;

    /**
     * List all purchase orders
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.index')) {
            return $this->sendError('You do not have permission to view purchase orders.', null, 403);
        }

        $query = PurchaseOrder::with(['supplier:id,name', 'createdBy:id,name'])
            ->withCount('items');

        // Filter by status
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by supplier
        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Search by PO number
        if ($request->search) {
            $query->where('po_number', 'like', "%{$request->search}%");
        }

        // Date range filter
        if ($request->from_date) {
            $query->where('order_date', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->where('order_date', '<=', $request->to_date);
        }

        $perPage = min($request->per_page ?? 20, 100);
        $page = $request->page ?? 1;

        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);

        return $this->sendSuccess($paginated);
    }

    /**
     * Get single purchase order with items
     */
    public function show($id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.index')) {
            return $this->sendError('You do not have permission to view purchase orders.', null, 403);
        }

        $po = PurchaseOrder::with(['supplier', 'createdBy:id,name', 'items.product:id,name', 'items.productVariant:id,name', 'statusHistory.changedByUser:id,name'])
            ->findOrFail($id);

        // Debug: Log first item data before returning
        \Log::info('PurchaseOrder #' . $id . ' first item:', [
            'id' => $po->items[0]->id,
            'quantity' => $po->items[0]->quantity,
            'received_quantity' => $po->items[0]->received_quantity,
            'lost_quantity' => $po->items[0]->lost_quantity,
            'china_price' => $po->items[0]->china_price,
            'bd_price' => $po->items[0]->bd_price,
        ]);

        return $this->sendSuccess($po);
    }

    /**
     * Create new purchase order
     */
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.create')) {
            return $this->sendError('You do not have permission to create purchase orders.', null, 403);
        }

        $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'order_date' => 'required|date',
            'expected_date' => 'nullable|date|after:order_date',
            'exchange_rate' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.china_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Calculate total amount
            $totalAmount = collect($request->items)->sum(function ($item) {
                return $item['quantity'] * $item['china_price'];
            });

            // Create purchase order
            $po = PurchaseOrder::create([
                'supplier_id' => $request->supplier_id,
                'order_date' => $request->order_date,
                'expected_date' => $request->expected_date,
                'exchange_rate' => $request->exchange_rate,
                'total_amount' => $totalAmount,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            // Generate PO number
            $yearMonth = now()->format('Ym');
            $po->po_number = "PO-{$yearMonth}-{$po->id}";
            $po->save();

            // Create purchase order items
            foreach ($request->items as $item) {
                // Calculate prices
                $totalPriceRmb = $item['china_price'] * $item['quantity'];
                $bdPrice = $item['china_price'] * $request->exchange_rate;

                PurchaseOrderItem::create([
                    'po_number' => $po->po_number,
                    'product_id' => $item['product_id'],
                    'china_price' => $item['china_price'],
                    'quantity' => $item['quantity'],
                    'bd_price' => $bdPrice,
                    'total_price' => $totalPriceRmb, // RMB total (china_price × quantity)
                    'shipping_cost' => 0, // Default value, will be updated when goods are received
                ]);
            }

            DB::commit();

            // Load relationships for response
            $po->load(['supplier', 'items.product:id,name']);

            return $this->sendSuccess($po, 'Purchase order created successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create purchase order', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update purchase order
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.edit')) {
            return $this->sendError('You do not have permission to edit purchase orders.', null, 403);
        }

        $po = PurchaseOrder::findOrFail($id);

        // Validate based on what fields are being updated
        $request->validate([
            'order_date' => 'nullable|date',
            'expected_date' => 'nullable|date|after:order_date',
            'exchange_rate' => 'nullable|numeric|min:0',
            'courier_name' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'lot_number' => 'nullable|string',
            'bd_courier_tracking' => 'nullable|string',
            'transport_type' => 'nullable|string',
            'total_weight' => 'nullable|numeric|min:0',
            'shipping_cost_per_kg' => 'nullable|numeric|min:0',
            'items' => 'nullable|array|min:1',
            'items.*.id' => 'required|exists:purchase_order_items,id',
            'items.*.shipping_cost_per_kg' => 'nullable|numeric|min:0',
            'items.*.shipping_cost' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Check if this is a full order edit (draft status) or partial field update
            $isFullEdit = $po->status === 'draft' && $request->has('items');

            if ($isFullEdit) {
                // Full order edit (draft only) - can edit items
                $po->update([
                    'order_date' => $request->order_date ?? $po->order_date,
                    'expected_date' => $request->expected_date ?? $po->expected_date,
                    'exchange_rate' => $request->exchange_rate ?? $po->exchange_rate,
                ]);

                // Update items if provided
                if ($request->has('items')) {
                    // Delete existing items
                    PurchaseOrderItem::where('po_number', $po->po_number)->delete();

                    // Calculate new total
                    $totalAmount = 0;

                    // Create new items
                    foreach ($request->items as $item) {
                        $lineTotalRMB = $item['china_price'] * $item['quantity'];
                        $bdPrice = $item['china_price'] * $po->exchange_rate;
                        $totalAmount += $lineTotalRMB;

                        PurchaseOrderItem::create([
                            'po_number' => $po->po_number,
                            'product_id' => $item['product_id'],
                            'china_price' => $item['china_price'],
                            'quantity' => $item['quantity'],
                            'bd_price' => $bdPrice,
                            'total_price' => $lineTotalRMB, // RMB total (china_price × quantity)
                            'shipping_cost' => 0, // Default value, will be updated when goods are received
                        ]);
                    }

                    // Update total amount
                    $po->total_amount = $totalAmount;
                    $po->save();
                }
            } else {
                // Partial field update (any status)
                // Only update the fields that are provided
                $updateData = [];

                if ($request->has('order_date')) {
                    $updateData['order_date'] = $request->order_date;
                }
                if ($request->has('expected_date')) {
                    $updateData['expected_date'] = $request->expected_date;
                }
                if ($request->has('exchange_rate')) {
                    $updateData['exchange_rate'] = $request->exchange_rate;

                    // Also update the CNY currency in currencies table
                    $cnyCurrency = \App\Models\Currency::where('code', 'CNY')->first();
                    if ($cnyCurrency) {
                        $cnyCurrency->exchange_rate = $request->exchange_rate;
                        $cnyCurrency->is_active = true;
                        $cnyCurrency->save();
                    }

                    // Recalculate bd_price for all items: bd_price = china_price × exchange_rate
                    foreach ($po->items as $item) {
                        $newBdPrice = $item->china_price * $request->exchange_rate;
                        $newTotalPrice = $newBdPrice * $item->quantity;

                        $item->bd_price = $newBdPrice;
                        $item->total_price = $newTotalPrice;

                        // Recalculate final_unit_cost = total_price + shipping_cost
                        $item->final_unit_cost = $item->total_price + $item->shipping_cost;

                        $item->save();
                    }
                }
                if ($request->has('courier_name')) {
                    $updateData['courier_name'] = $request->courier_name;
                }
                if ($request->has('tracking_number')) {
                    $updateData['tracking_number'] = $request->tracking_number;
                }
                if ($request->has('lot_number')) {
                    $updateData['lot_number'] = $request->lot_number;
                }
                if ($request->has('transport_type')) {
                    $updateData['shipping_method'] = $request->transport_type;
                }
                if ($request->has('total_weight')) {
                    $updateData['total_weight'] = $request->total_weight;
                }
                if ($request->has('bd_courier_tracking')) {
                    $updateData['bd_courier_tracking'] = $request->bd_courier_tracking;
                }

                if (!empty($updateData)) {
                    $po->update($updateData);
                }

                // Handle shipping_cost_per_kg update (save to all items)
                if ($request->has('shipping_cost_per_kg')) {
                    $shippingCostPerKg = $request->input('shipping_cost_per_kg');

                    // Update all items with the new shipping cost per kg
                    foreach ($po->items as $item) {
                        $item->shipping_cost_per_kg = $shippingCostPerKg;

                        // Recalculate shipping cost if item has weight
                        $itemWeightKg = (($item->unit_weight ?? 0) + ($item->extra_weight ?? 0)) * $item->quantity / 1000;

                        // If no weight set, use order's total_weight divided by item count
                        if ($itemWeightKg <= 0 && $po->total_weight > 0 && $po->items->count() > 0) {
                            $itemWeightKg = $po->total_weight / $po->items->count();
                        }

                        $itemShippingCost = $itemWeightKg * $shippingCostPerKg;
                        $item->shipping_cost = $itemShippingCost;

                        // Recalculate final_unit_cost = total_price + shipping_cost
                        $item->final_unit_cost = $item->total_price + $item->shipping_cost;

                        $item->save();
                    }

                    // Recalculate total shipping cost for order
                    $po->total_shipping_cost = $po->items->sum('shipping_cost');
                    $po->save();
                }
            }

            DB::commit();

            $po->load(['supplier', 'items.product:id,name']);

            return $this->sendSuccess($po, 'Purchase order updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update purchase order', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update purchase order status
     */
    public function updateStatus(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.edit')) {
            return $this->sendError('You do not have permission to update purchase order status.', null, 403);
        }

        $request->validate([
            'status' => 'required|in:draft,payment_confirmed,supplier_dispatched,warehouse_received,shipped_bd,arrived_bd,in_transit_bogura,received_hub,partially_completed,completed,lost',
            'exchange_rate' => 'nullable|numeric|min:0',
            'payment_account_id' => 'nullable|required_if:status,payment_confirmed|exists:banks,id',
            'paymentAccountId' => 'nullable|exists:banks,id', // Accept camelCase from frontend (not required separately)
            'comments' => 'nullable|string',
            'courier_name' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'lot_number' => 'nullable|string',
            'bd_courier_tracking' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.id' => 'required|exists:purchase_order_items,id',
            'items.*.shipping_cost' => 'nullable|numeric|min:0',
            'items.*.unit_weight' => 'nullable|numeric|min:0',
            'items.*.extra_weight' => 'nullable|numeric|min:0',
            'items.*.lost_quantity' => 'nullable|integer|min:0',
            'items.*.lost_item_price' => 'nullable|numeric|min:0',
        ]);

        // Normalize camelCase to snake_case for payment_account_id
        if ($request->has('paymentAccountId')) {
            $request->merge(['payment_account_id' => $request->input('paymentAccountId')]);
        }

        $po = PurchaseOrder::with(['items'])->findOrFail($id);

        DB::beginTransaction();
        try {
            $oldStatus = $po->status;
            $newStatus = $request->status;

            // If confirming order (draft → payment_confirmed)
            if ($oldStatus === 'draft' && $newStatus === 'payment_confirmed') {
                // Set expected delivery date (21 days from today)
                if (!$po->expected_date) {
                    $po->expected_date = now()->addDays(21)->format('Y-m-d');
                }

                // Generate PO number if not exists
                if (!$po->po_number) {
                    $yearMonth = now()->format('Ym');
                    $po->po_number = "PO-{$yearMonth}-{$po->id}";
                }

                // Update exchange rate if provided
                $currencyUpdated = false;
                if ($request->has('exchange_rate') && $request->exchange_rate) {
                    $po->exchange_rate = $request->exchange_rate;

                    // Also update the CNY currency in currencies table
                    $cnyCurrency = \App\Models\Currency::where('code', 'CNY')->first();
                    if ($cnyCurrency) {
                        $oldRate = $cnyCurrency->exchange_rate;
                        $cnyCurrency->exchange_rate = $request->exchange_rate;
                        $cnyCurrency->is_active = true;
                        $cnyCurrency->save();
                        $currencyUpdated = true;

                        \Log::info('Currency updated', [
                            'currency' => 'CNY',
                            'old_rate' => $oldRate,
                            'new_rate' => $request->exchange_rate,
                            'po_id' => $po->id,
                            'po_number' => $po->po_number,
                        ]);
                    }
                }

                // Process payment
                // Support both camelCase (from frontend) and snake_case (Laravel standard)
                $paymentAccountId = $request->input('paymentAccountId') ?? $request->input('payment_account_id');
                if (!$paymentAccountId) {
                    DB::rollBack();
                    return $this->sendError('Payment account is required to confirm order', [], 422);
                }

                $bank = \App\Models\Bank::find($paymentAccountId);
                if (!$bank) {
                    DB::rollBack();
                    return $this->sendError('Payment account not found', [], 404);
                }

                // Calculate order total in BDT
                $orderTotalBDT = $po->total_amount * $po->exchange_rate;

                // Get supplier credit balance
                $supplierCreditBalance = $po->supplier->wallet_balance ?? 0;

                // Calculate payment breakdown
                $breakdown = \App\Services\PurchaseOrderPaymentService::calculatePaymentBreakdown(
                    $orderTotalBDT,
                    $supplierCreditBalance
                );

                // Validate payment (allows overdraft)
                $validation = \App\Services\PurchaseOrderPaymentService::validatePayment(
                    $bank->current_balance,
                    $breakdown['from_bank']
                );

                if (!$validation['can_proceed']) {
                    DB::rollBack();
                    return $this->sendError($validation['reason'] ?? 'Payment validation failed', [], 422);
                }

                // Process payment transaction
                try {
                    $paymentResult = \App\Services\PurchaseOrderPaymentService::processPayment(
                        $po,
                        $bank,
                        $breakdown,
                        auth()->id()
                    );

                    // Save payment info to PO
                    $po->payment_account_id = $bank->id;
                    $po->payment_amount = $orderTotalBDT;
                    $po->supplier_credit_used = $breakdown['from_supplier_credit'];
                    $po->bank_payment_amount = $breakdown['from_bank'];
                    // Note: No journal_entry_id anymore - expenses handle that on approval
                    $po->status = $newStatus;
                    $po->save();

                    // Record status history
                    \App\Models\PurchaseOrderStatusHistory::create([
                        'purchase_order_id' => $po->id,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                        'comments' => $request->comments,
                        'changed_by' => auth()->id(),
                        'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                    ]);

                    // Send SMS notification
                    $this->sendPaymentConfirmationSMS($po, $bank, $breakdown['from_bank'], $orderTotalBDT);

                    DB::commit();

                    $message = 'Order confirmed and payment processed successfully. PO number: ' . $po->po_number;
                    if ($currencyUpdated) {
                        $message .= ' | CNY exchange rate updated to ' . number_format($request->exchange_rate, 2) . ' BDT';
                    }

                    // Note about expenses created
                    $expenseCount = 0;
                    if (isset($paymentResult['wallet_expense'])) $expenseCount++;
                    if (isset($paymentResult['bank_expense'])) $expenseCount++;
                    if ($expenseCount > 0) {
                        $message .= " | {$expenseCount} expense(s) created pending approval";
                    }

                    return $this->sendSuccess(
                        $po->load(['statusHistory', 'paymentAccount', 'supplier']),
                        $message
                    );

                } catch (\Exception $e) {
                    DB::rollBack();
                    \Log::error('Payment processing failed', [
                        'po_id' => $po->id,
                        'po_number' => $po->po_number,
                        'error' => $e->getMessage(),
                    ]);
                    return $this->sendError('Payment processing failed: ' . $e->getMessage(), [], 500);
                }
            }

            // Supplier dispatched - add courier and tracking
            if ($oldStatus === 'payment_confirmed' && $newStatus === 'supplier_dispatched') {
                $po->courier_name = $request->courier_name;
                $po->tracking_number = $request->tracking_number;
                $po->status = $newStatus;
                $po->save();

                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments,
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                return $this->sendSuccess($po->load('statusHistory'), 'Supplier dispatch recorded. Courier: ' . $request->courier_name);
            }

            // Shipped to BD - add lot number
            if ($oldStatus === 'warehouse_received' && $newStatus === 'shipped_bd') {
                $po->lot_number = $request->lot_number;
                $po->status = $newStatus;
                $po->save();

                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments,
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                return $this->sendSuccess($po->load('statusHistory'), 'Shipped to Bangladesh. Lot number: ' . $request->lot_number);
            }

            // Arrived BD - add shipping costs for each item
            if ($oldStatus === 'shipped_bd' && $newStatus === 'arrived_bd') {
                // Save shipping details to purchase order (transport type and total weight only)
                if ($request->has('transport_type')) {
                    $po->shipping_method = $request->transport_type;
                }
                if ($request->has('total_weight')) {
                    $po->total_weight = $request->total_weight;
                }

                // Get global shipping cost per kg from request
                $globalShippingCostPerKg = $request->input('shipping_cost_per_kg');

                // Apply shipping cost per kg to all items
                $totalOrderShippingCost = 0;
                foreach ($po->items as $item) {
                    // Always save shipping_cost_per_kg if provided (even if 0)
                    if ($request->has('shipping_cost_per_kg')) {
                        $item->shipping_cost_per_kg = $globalShippingCostPerKg;

                        // Calculate item's shipping cost based on its weight
                        // Item weight = (unit_weight + extra_weight) * quantity
                        $itemWeightKg = (($item->unit_weight ?? 0) + ($item->extra_weight ?? 0)) * $item->quantity / 1000; // Convert g to kg

                        // If no item weight is set, distribute equally among all items
                        if ($itemWeightKg <= 0 && $request->has('total_weight') && $request->total_weight > 0 && $po->items->count() > 0) {
                            $itemWeightKg = $request->total_weight / $po->items->count();
                        }

                        $itemShippingCost = $itemWeightKg * $globalShippingCostPerKg;
                        $item->shipping_cost = $itemShippingCost;
                        $totalOrderShippingCost += $itemShippingCost;

                        // Calculate final_unit_cost = total_price + shipping_cost
                        // total_price is already in BDT (bd_price × quantity)
                        $item->final_unit_cost = $item->total_price + $item->shipping_cost;

                        $item->save();
                    }
                }

                // Save total shipping cost to order
                $po->total_shipping_cost = $totalOrderShippingCost;

                $po->status = $newStatus;
                $po->save();

                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments,
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                return $this->sendSuccess($po->load(['items', 'statusHistory']), 'Goods arrived in Bangladesh');
            }

            // In transit to Bogura - add BD courier tracking
            if ($oldStatus === 'arrived_bd' && $newStatus === 'in_transit_bogura') {
                $po->bd_courier_tracking = $request->bd_courier_tracking;
                $po->status = $newStatus;
                $po->save();

                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments,
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                return $this->sendSuccess($po->load('statusHistory'), 'In transit to Bogura. Tracking: ' . $request->bd_courier_tracking);
            }

            // Received at hub - add weights, distribute extra cost, handle refunds
            if ($oldStatus === 'in_transit_bogura' && ($newStatus === 'received_hub' || $newStatus === 'partially_completed')) {
                // Validate request data
                $request->validate([
                    'items' => 'required|array|min:1',
                    'items.*.id' => 'required|exists:purchase_order_items,id',
                    'items.*.received_quantity' => 'required|integer|min:0',
                    'items.*.unit_weight' => 'required|numeric|min:0',
                    'items.*.extra_weight' => 'nullable|numeric|min:0',
                    'items.*.shipping_cost_per_kg' => 'nullable|numeric|min:0',
                    'items.*.final_unit_cost' => 'nullable|numeric|min:0',
                    'extra_cost' => 'nullable|numeric|min:0',
                ]);

                $totalWeight = 0;
                $totalReceivedValue = 0; // For value-based extra cost distribution
                $receivingNotes = [];
                $totalOrdered = 0;
                $totalReceived = 0;

                // Step 1: Process received quantities and save item data
                foreach ($request->items as $itemData) {
                    $item = PurchaseOrderItem::with('product')->find($itemData['id']);
                    if (!$item) {
                        continue;
                    }

                    $orderedQty = $item->quantity;
                    $receivedQty = $itemData['received_quantity'];
                    $unitWeight = $itemData['unit_weight'];
                    $extraWeight = $itemData['extra_weight'] ?? 0;

                    // Default to ordered quantity if not provided (per your requirement #7)
                    if (!isset($itemData['received_quantity'])) {
                        $receivedQty = $orderedQty;
                    }

                    $item->unit_weight = $unitWeight;
                    $item->extra_weight = $extraWeight;
                    $item->received_quantity = $receivedQty;

                    // Calculate and save lost_quantity for tracking (needed for partial completion detection)
                    $lostQty = max(0, $orderedQty - $receivedQty);
                    $item->lost_quantity = $lostQty;

                    // Calculate shipping cost for this item
                    // Use provided shipping_cost_per_kg or default to 0
                    $shippingCostPerKg = $itemData['shipping_cost_per_kg'] ?? $item->shipping_cost_per_kg ?? 0;

                    // Calculate item weight in kg: (unit_weight + extra_weight) × received_qty / 1000
                    $itemWeightKg = ($unitWeight + $extraWeight) * $receivedQty / 1000;
                    $itemShippingCost = $itemWeightKg * $shippingCostPerKg;
                    $item->shipping_cost = $itemShippingCost;
                    $item->shipping_cost_per_kg = $shippingCostPerKg;

                    // Calculate final_unit_cost = total_price + shipping_cost
                    // total_price is already BDT total for all ordered quantities
                    $item->final_unit_cost = $item->total_price + $item->shipping_cost;

                    $item->save();

                    // Calculate lost/found quantity and percentage
                    $lostQty = max(0, $orderedQty - $receivedQty);
                    $foundQty = max(0, $receivedQty - $orderedQty);
                    $lostPercentage = $orderedQty > 0 ? ($lostQty / $orderedQty) * 100 : 0;
                    $foundPercentage = $orderedQty > 0 ? ($foundQty / $orderedQty) * 100 : 0;

                    // Track for receiving notes
                    $receivingNotes[] = [
                        'item_id' => $item->id,
                        'product_name' => $item->product?->name ?? 'Unknown',
                        'ordered_qty' => $orderedQty,
                        'received_qty' => $receivedQty,
                        'lost_qty' => $lostQty,
                        'found_qty' => $foundQty,
                        'lost_percentage' => round($lostPercentage, 2),
                        'found_percentage' => round($foundPercentage, 2),
                        'unit_weight' => $unitWeight,
                        'china_price' => $item->china_price,
                        'bd_price' => $item->bd_price,
                        'total_price' => $item->total_price,
                        'shipping_cost' => $item->shipping_cost,
                        'final_unit_cost' => $item->final_unit_cost,
                    ];

                    // Calculate totals
                    $totalOrdered += $orderedQty;
                    $totalReceived += $receivedQty;
                    $totalWeight += ($unitWeight + $extraWeight) * $receivedQty;

                    // Calculate received value for extra cost distribution (based on received value in BDT)
                    $totalReceivedValue += $item->bd_price * $receivedQty;
                }

                // Step 2: Calculate total lost percentage
                $totalLostPercentage = $totalOrdered > 0
                    ? (($totalOrdered - $totalReceived) / $totalOrdered) * 100
                    : 0;

                // Step 3: Calculate lost items cost for tracking (NO automatic refund)
                $lostItemsCost = 0;

                foreach ($po->items as $item) {
                    $lostQty = $item->quantity - $item->received_quantity;
                    if ($lostQty > 0) {
                        // Calculate lost cost for tracking purposes
                        $lostItemCost = $lostQty * $item->china_price * $po->exchange_rate;
                        $lostItemsCost += $lostItemCost;

                        $productName = $item->product?->name ?? 'Unknown Product';
                        $lostPercentage = $item->quantity > 0 ? ($lostQty / $item->quantity) * 100 : 0;

                        $receivingNotes[] = [
                            'info' => "Item {$productName}: Lost {$lostQty} units ({$lostPercentage}%). Cost: ৳{$lostItemCost}"
                        ];
                    }
                }

                // Step 4: Update purchase order
                $po->total_weight = $totalWeight;
                $po->refund_amount = $lostItemsCost; // Store for tracking, no automatic credit
                $po->receiving_notes = json_encode($receivingNotes);
                $po->status = $newStatus;
                $po->save();

                // Record status history
                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments ?? "Received {$totalReceived}/{$totalOrdered} units ({$totalLostPercentage}% lost). Lost items cost: ৳{$lostItemsCost}. Pending manual review.",
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                $message = "Received {$totalReceived}/{$totalOrdered} units ({$totalLostPercentage}% lost). ";
                if ($lostItemsCost > 0) {
                    $message .= "Lost items cost: ৳{$lostItemsCost}. Pending manual review.";
                } else {
                    $message .= "All items received successfully.";
                }

                return $this->sendSuccess($po->load(['items', 'statusHistory', 'supplier']), $message);
            }

            // Handle lost items
            if ($newStatus === 'lost' || $request->has('items')) {
                // Check if there are lost quantities
                $hasLostItems = false;
                if ($request->has('items')) {
                    foreach ($request->items as $itemData) {
                        if (isset($itemData['lost_quantity']) && $itemData['lost_quantity'] > 0) {
                            $hasLostItems = true;
                            break;
                        }
                    }
                }

                if ($hasLostItems) {
                    // Distribute lost item cost across same category products
                    $totalLostValue = 0;
                    $totalRemainingQty = 0;

                    foreach ($request->items as $itemData) {
                        $item = PurchaseOrderItem::with('product')->find($itemData['id']);
                        if ($item && isset($itemData['lost_quantity']) && $itemData['lost_quantity'] > 0) {
                            $lostQty = $itemData['lost_quantity'];
                            $item->lost_quantity = $lostQty;

                            // Calculate lost_item_price using bd_price
                            $item->lost_item_price = $itemData['lost_item_price'] ?? ($lostQty * $item->bd_price);

                            // Calculate total weight for remaining items
                            $remainingQty = $item->quantity - $lostQty;
                            $totalLostValue += $item->lost_item_price;
                            $totalRemainingQty += $remainingQty;

                            $item->received_quantity = $remainingQty;
                            $item->save();
                        }
                    }

                    // Distribute lost value across remaining items by updating final_unit_cost
                    if ($totalLostValue > 0 && $totalRemainingQty > 0) {
                        // Distribute lost value proportionally by total_price (BDT value of each item)
                        foreach ($po->items as $item) {
                            if ($item->received_quantity > 0) {
                                // Calculate this item's share of lost value based on its total_price
                                $itemTotalPriceRatio = $item->total_price / $po->items->sum('total_price');
                                $lostValueShare = $totalLostValue * $itemTotalPriceRatio;

                                // final_unit_cost = total_price + shipping_cost + lost_value_share
                                $item->final_unit_cost = $item->total_price + $item->shipping_cost + $lostValueShare;
                                $item->save();
                            }
                        }
                    }

                    $po->status = 'lost';
                    $po->save();
                } else {
                    // Regular status update - all statuses are editable now
                    $po->status = $newStatus;
                    $po->save();
                }

                // Record status history
                \App\Models\PurchaseOrderStatusHistory::create([
                    'purchase_order_id' => $po->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'comments' => $request->comments,
                    'changed_by' => auth()->id(),
                    'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
                ]);

                DB::commit();

                return $this->sendSuccess($po->load(['items', 'statusHistory']), 'Status updated to ' . $newStatus);
            }

            // Default: just update status (allow any status change - all editable)
            $po->status = $newStatus;
            $po->save();

            // Record status history
            \App\Models\PurchaseOrderStatusHistory::create([
                'purchase_order_id' => $po->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'comments' => $request->comments,
                'changed_by' => auth()->id(),
                'timeline_data' => $this->buildTimelineData($newStatus, $request, $po),
            ]);

            DB::commit();

            return $this->sendSuccess($po->load('statusHistory'), 'Status updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update status', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete purchase order (soft delete)
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.delete')) {
            return $this->sendError('You do not have permission to delete purchase orders.', null, 403);
        }

        $po = PurchaseOrder::findOrFail($id);

        // Only allow deleting draft orders
        if ($po->status !== 'draft') {
            return $this->sendError('Can only delete draft purchase orders', null, 400);
        }

        DB::beginTransaction();
        try {
            // Delete items (will be cascaded, but explicit for clarity)
            PurchaseOrderItem::where('po_number', $po->po_number)->delete();

            // Soft delete PO
            $po->delete();

            DB::commit();

            return $this->sendSuccess(null, 'Purchase order deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to delete purchase order', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update status history comments
     */
    public function updateStatusHistoryComments(Request $request, $poId, $historyId)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.edit')) {
            return $this->sendError('You do not have permission to update purchase orders.', null, 403);
        }

        $request->validate([
            'comments' => 'nullable|string',
        ]);

        $po = PurchaseOrder::findOrFail($poId);
        $history = \App\Models\PurchaseOrderStatusHistory::where('purchase_order_id', $poId)
            ->findOrFail($historyId);

        $history->comments = $request->comments;
        $history->save();

        return $this->sendSuccess($history->load('changedByUser:id,name'), 'Comments updated successfully');
    }

    /**
     * Update status history timeline data
     * PUT /api/v2/procurement/orders/{poId}/status-history/{historyId}/timeline-data
     */
    public function updateStatusHistoryTimelineData(Request $request, $poId, $historyId)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.edit')) {
            return $this->sendError('You do not have permission to update purchase orders.', null, 403);
        }

        $request->validate([
            'timeline_data' => 'nullable|array',
            'timeline_data.exchange_rate' => 'nullable|numeric|min:0',
            'timeline_data.courier_name' => 'nullable|string',
            'timeline_data.tracking_number' => 'nullable|string',
            'timeline_data.lot_number' => 'nullable|string',
            'timeline_data.transport_type' => 'nullable|string',
            'timeline_data.total_weight' => 'nullable|numeric|min:0',
            'timeline_data.shipping_cost_per_kg' => 'nullable|numeric|min:0',
            'timeline_data.total_shipping_cost' => 'nullable|numeric|min:0',
            'timeline_data.bd_courier_tracking' => 'nullable|string',
        ]);

        $po = PurchaseOrder::findOrFail($poId);
        $history = \App\Models\PurchaseOrderStatusHistory::where('purchase_order_id', $poId)
            ->findOrFail($historyId);

        // Update timeline data
        $timelineData = $history->timeline_data ?? [];
        if ($request->has('timeline_data')) {
            $newTimelineData = $request->input('timeline_data');
            // Merge with existing data, with new data taking precedence
            $timelineData = array_merge($timelineData, array_filter($newTimelineData, function ($value) {
                return $value !== null && $value !== '';
            }));
        }

        $history->timeline_data = $timelineData;
        $history->save();

        return $this->sendSuccess($history->load('changedByUser:id,name'), 'Timeline data updated successfully');
    }

    /**
     * Get purchase order statistics
     */
    public function statistics()
    {
        $stats = cache()->remember('purchase_orders.stats', 300, function () {
            return [
                'total_orders' => PurchaseOrder::count(),
                'draft_orders' => PurchaseOrder::where('status', 'draft')->count(),
                'active_orders' => PurchaseOrder::whereIn('status', ['payment_confirmed', 'supplier_dispatched', 'warehouse_received', 'shipped_bd', 'arrived_bd', 'in_transit_bogura'])->count(),
                'completed_orders' => PurchaseOrder::where('status', 'completed')->count(),
                'total_value_rmb' => PurchaseOrder::sum('total_amount'),
            ];
        });

        return $this->sendSuccess($stats);
    }

    /**
     * Approve and stock - Update inventory after receiving
     * Called separately after "received_hub" status
     */
    public function approveAndStock(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.orders.edit')) {
            return $this->sendError('You do not have permission to approve purchase orders.', null, 403);
        }

        $po = PurchaseOrder::with(['items', 'supplier'])->findOrFail($id);

        // Can only approve orders in "received_hub" or "partially_completed" status
        if (!in_array($po->status, ['received_hub', 'partially_completed'])) {
            return $this->sendError('Order must be in "Received at Hub" or "Partially Completed" status before approval.', null, 400);
        }

        DB::beginTransaction();
        try {
            // Update stocked_quantity for all items
            foreach ($po->items as $item) {
                if ($item->received_quantity > 0) {
                    $item->stocked_quantity = $item->received_quantity;
                    $item->save();

                    // TODO: Add to inventory system when inventory module is ready
                    // This would create inventory records and update stock levels
                }
            }

            // Update status to completed
            $po->status = 'completed';
            $po->save();

            // Record status history
            \App\Models\PurchaseOrderStatusHistory::create([
                'purchase_order_id' => $po->id,
                'old_status' => $po->status,
                'new_status' => 'completed',
                'comments' => $request->comments ?? 'Approved and stocked. Inventory updated.',
                'changed_by' => auth()->id(),
            ]);

            DB::commit();

            return $this->sendSuccess($po->load(['items', 'statusHistory']), 'Order approved and inventory updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to approve order', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Build timeline data array for status history
     * Stores status-specific information at the time of status change
     */
    private function buildTimelineData(string $newStatus, Request $request, $po): array
    {
        $timelineData = [];

        switch ($newStatus) {
            case 'payment_confirmed':
                if ($request->has('exchange_rate') && $request->exchange_rate) {
                    $timelineData['exchange_rate'] = (float) $request->exchange_rate;
                }
                if ($po->exchange_rate) {
                    $timelineData['exchange_rate'] = (float) $po->exchange_rate;
                }
                break;

            case 'supplier_dispatched':
                if ($request->courier_name) {
                    $timelineData['courier_name'] = $request->courier_name;
                }
                if ($po->courier_name) {
                    $timelineData['courier_name'] = $po->courier_name;
                }
                if ($request->tracking_number) {
                    $timelineData['tracking_number'] = $request->tracking_number;
                }
                if ($po->tracking_number) {
                    $timelineData['tracking_number'] = $po->tracking_number;
                }
                break;

            case 'warehouse_received':
                if ($request->lot_number) {
                    $timelineData['lot_number'] = $request->lot_number;
                }
                if ($po->lot_number) {
                    $timelineData['lot_number'] = $po->lot_number;
                }
                break;

            case 'shipped_bd':
                if ($request->has('transport_type')) {
                    $timelineData['transport_type'] = $request->transport_type;
                }
                if ($po->shipping_method) {
                    $timelineData['transport_type'] = $po->shipping_method;
                }
                if ($request->has('total_weight')) {
                    $timelineData['total_weight'] = (float) $request->total_weight;
                }
                if ($po->total_weight) {
                    $timelineData['total_weight'] = (float) $po->total_weight;
                }
                if ($request->has('shipping_cost_per_kg')) {
                    $timelineData['shipping_cost_per_kg'] = (float) $request->shipping_cost_per_kg;
                }
                if ($po->items && $po->items->first() && $po->items->first()->shipping_cost_per_kg) {
                    $timelineData['shipping_cost_per_kg'] = (float) $po->items->first()->shipping_cost_per_kg;
                }
                if ($po->total_shipping_cost) {
                    $timelineData['total_shipping_cost'] = (float) $po->total_shipping_cost;
                }
                break;

            case 'arrived_bd':
            case 'in_transit_bogura':
                if ($request->bd_courier_tracking) {
                    $timelineData['bd_courier_tracking'] = $request->bd_courier_tracking;
                }
                if ($po->bd_courier_tracking) {
                    $timelineData['bd_courier_tracking'] = $po->bd_courier_tracking;
                }
                break;

            case 'received_hub':
            case 'partially_completed':
                if ($po->total_weight) {
                    $timelineData['total_weight'] = (float) $po->total_weight;
                }
                if ($po->total_shipping_cost) {
                    $timelineData['total_shipping_cost'] = (float) $po->total_shipping_cost;
                }
                if ($request->has('items')) {
                    $timelineData['receiving_details'] = [
                        'total_ordered' => $po->items->sum('quantity'),
                        'total_received' => $po->items->sum('received_quantity'),
                    ];
                }
                if ($po->refund_amount) {
                    $timelineData['refund_amount'] = (float) $po->refund_amount;
                }
                break;
        }

        return $timelineData;
    }

    /**
     * Send SMS notification on payment confirmation
     */
    private function sendPaymentConfirmationSMS($po, $bank, $paymentAmount, $orderTotalBDT): void
    {
        try {
            $newBalance = $bank->current_balance - $paymentAmount;

            // Format message (must be under 159 characters, in English)
            // PO: {number}, Paid: ৳{amount}, Bank: {name}, New Bal: ৳{balance}
            $message = "PO: {$po->po_number}, Paid: ৳" . number_format($paymentAmount, 0) .
                       ", Bank: {$bank->name}, New Bal: ৳" . number_format($newBalance, 0);

            // Check message length (max 159 characters for AlphaSMS)
            if (strlen($message) > 159) {
                // Truncate if needed
                $message = substr($message, 0, 159);
            }

            $smsService = new \App\Services\AlphaSmsService();
            $smsService->sendSms($message, '8801728247398');

            \Log::info('Payment confirmation SMS sent', [
                'po_number' => $po->po_number,
                'message' => $message,
                'length' => strlen($message),
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send payment confirmation SMS', [
                'po_id' => $po->id,
                'po_number' => $po->po_number,
                'error' => $e->getMessage(),
            ]);
            // Don't fail the transaction if SMS fails
        }
    }
}
