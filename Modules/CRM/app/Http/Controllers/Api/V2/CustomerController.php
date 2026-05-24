<?php

namespace App\Modules\CRM\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\CRM\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        // Module independence: No cross-module relationships (salesOrders removed)
        $query = Customer::query();

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

        // Add computed fields using direct database access (module independence)
        $customers->getCollection()->transform(function ($customer) {
            // Get order counts from sales_orders table via direct DB query
            $orderStats = DB::table('sales_orders')
                ->where('customer_id', $customer->id)
                ->selectRaw('COUNT(*) as total_orders, SUM(total_amount) as total_spent')
                ->first();

            $customer->total_orders = $orderStats->total_orders ?? 0;
            $customer->total_spent = (float) ($orderStats->total_spent ?? 0);
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
        // Module independence: No cross-module relationships loaded
        $customer = Customer::findOrFail($id);

        // Get order statistics via direct DB query
        $orderStats = DB::table('sales_orders')
            ->where('customer_id', $customer->id)
            ->selectRaw('COUNT(*) as total_orders, SUM(total_amount) as total_spent')
            ->first();

        $customer->total_orders = $orderStats->total_orders ?? 0;
        $customer->total_spent = (float) ($orderStats->total_spent ?? 0);

        return $this->sendSuccess($customer);
    }

    /**
     * Get customer orders (module-independent approach)
     */
    public function orders($id)
    {
        // Module independence: Direct database access to sales_orders table
        $orders = DB::table('sales_orders')
            ->where('customer_id', $id)
            ->latest()
            ->paginate(20);

        return $this->sendSuccess($orders);
    }

    /**
     * Get customer activities
     */
    public function activities($id)
    {
        // Return empty array for now - activities can be added later
        return $this->sendSuccess([]);
    }

    // Order History method will be added after OrderController is ready
    public function orderHistory($id) { return $this->sendSuccess([]); }
}