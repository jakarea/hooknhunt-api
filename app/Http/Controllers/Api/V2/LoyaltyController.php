<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyRule;
use App\Models\LoyaltyTransaction;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    use ApiResponse;

    /**
     * 1. Get all active loyalty rules (Frontend / Admin)
     */
    public function index(Request $request)
    {
        $query = LoyaltyRule::query();

        // Optional filter by channel
        if ($request->has('channel')) {
            $query->where('channel', $request->channel);
        }

        // Admin might want to see all, but frontend only active. 
        // Assuming admin for now or general list.
        // If specific logic needed:
        // $rules = $query->get();
        $rules = $query->where('is_active', true)->get();

        return $this->sendSuccess($rules, 'Loyalty rules fetched');
    }

    /**
     * 2. Create a new loyalty rule (Admin only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'channel' => 'required|in:retail_web,wholesale_web,pos,daraz,all',
            'min_order_amount' => 'required|numeric|min:0',
            'reward_points' => 'required|integer|min:1', 
            'spend_amount' => 'required|numeric|min:1',  
            'is_active' => 'boolean'
        ]);

        $rule = LoyaltyRule::create($request->all());

        return $this->sendSuccess($rule, 'Loyalty rule created');
    }

    /**
     * 3. Update existing loyalty rule (Admin only)
     */
    public function update(Request $request, $id)
    {
        $rule = LoyaltyRule::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string',
            'channel' => 'sometimes|required|in:retail_web,wholesale_web,pos,daraz,all',
            'min_order_amount' => 'sometimes|required|numeric|min:0',
            'reward_points' => 'sometimes|required|integer|min:1',
            'spend_amount' => 'sometimes|required|numeric|min:1',
            'is_active' => 'boolean'
        ]);

        $rule->update($request->all());

        return $this->sendSuccess($rule, 'Loyalty rule updated');
    }

    /**
     * 4. Toggle status (Active/Inactive)
     */
    public function toggleStatus($id)
    {
        $rule = LoyaltyRule::findOrFail($id);
        $rule->update(['is_active' => !$rule->is_active]);
        return $this->sendSuccess($rule, 'Rule status updated');
    }

    /**
     * 5. Delete loyalty rule
     */
    public function destroy($id)
    {
        LoyaltyRule::destroy($id);
        return $this->sendSuccess(null, 'Rule deleted');
    }

    /**
     * 6. Manual points adjustment (Admin only)
     */
    public function manualAdjust(Request $request, $customerId)
    {
        $request->validate([
            'points' => 'required|integer', // Can be negative
            'reason' => 'required|string'
        ]);

        $customer = Customer::findOrFail($customerId);

        $transaction = LoyaltyTransaction::create([
            'customer_id' => $customer->id,
            'type' => 'adjustment',
            'points' => $request->points,
            'description' => $request->reason . ' (Manual Adjustment by ' . (auth()->user()->name ?? 'Admin') . ')'
        ]);

        // Note: You should ideally update a 'total_points' column on the customer table here if you have one.
        // $customer->increment('total_points', $request->points); // or decrement

        return $this->sendSuccess($transaction, 'Points adjusted successfully');
    }
}