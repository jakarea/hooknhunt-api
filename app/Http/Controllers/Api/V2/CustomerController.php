<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Customer::with(['salesOrders']);

        // Filter by type (retail/wholesale)
        if ($request->filled('type') && in_array($request->type, ['retail', 'wholesale'])) {
            $query->where('type', $request->type);
        }

        // Search
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
        }

        $customers = $query->latest()->paginate($request->per_page ?? 20);

        // Add computed fields
        $customers->getCollection()->transform(function ($customer) {
            $customer->total_orders = $customer->salesOrders?->count() ?? 0;
            $customer->total_spent = (float) ($customer->salesOrders?->sum('total_amount') ?? 0);
            $customer->loyalty_points = 0; // TODO: Implement loyalty points system
            return $customer;
        });

        return $this->sendSuccess($customers);
    }

    /**
     * Optimized Search for POS (AJAX)
     */
    public function search(Request $request)
    {
        $customers = Customer::where('phone', 'like', "%{$request->q}%")
                        ->orWhere('name', 'like', "%{$request->q}%")
                        ->limit(10)
                        ->get(['id', 'name', 'phone', 'address']); // Select limited fields
        
        return $this->sendSuccess($customers);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'phone' => 'required|unique:customers,phone',
            'address' => 'nullable|string'
        ]);

        $customer = Customer::create($request->all());
        return $this->sendSuccess($customer, 'Customer created', 201);
    }

    public function show($id)
    {
        return $this->sendSuccess(Customer::with('orders')->findOrFail($id));
    }
    
    // Order History method will be added after OrderController is ready
    public function orderHistory($id) { return $this->sendSuccess([]); }
}