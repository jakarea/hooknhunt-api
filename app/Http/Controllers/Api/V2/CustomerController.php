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
        $query = Customer::latest();
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
        }
        return $this->sendSuccess($query->paginate(20));
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