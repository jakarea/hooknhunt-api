<?php

namespace App\Modules\CRM\Http\Controllers\Api\V2\Crm;

use App\Http\Controllers\Controller;
use App\Modules\System\Models\User;
use App\Modules\CRM\Models\CustomerProfile;
use App\Modules\System\Models\Address;
use App\Traits\ApiResponse;
use App\Services\AlphaSmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    use ApiResponse;

    /**
     * Create a new customer from CRM (Admin/Sales)
     */
    public function store(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.create')) {
            return $this->sendError('You do not have permission to create customers.', null, 403);
        }

        $request->validate([
            // User Info
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'nullable|string|min:6',
            'customer_type' => 'required|in:retail,wholesale',

            // Customer Profile Info
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'source' => 'nullable|string',
            'medium' => 'nullable|string',
            'referral_code' => 'nullable|string',
            'marketing_consent' => 'nullable|boolean',
            'trade_license_no' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'notes' => 'nullable|string',

            // Address Info
            'address_label' => 'nullable|string',
            'address_full_name' => 'nullable|string',
            'address_phone' => 'nullable|string',
            'address_line1' => 'nullable|string',
            'address_line2' => 'nullable|string',
            'area' => 'nullable|string',
            'city' => 'nullable|string',
            'district' => 'nullable|string',
            'thana' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'division' => 'nullable|string',
            'country' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_billing' => 'nullable|boolean',
            'is_shipping' => 'nullable|boolean',
        ]);

        DB::beginTransaction();
        try {
            // Determine role based on customer type
            $roleId = $request->customer_type === 'retail' ? 10 : 11;

            // Generate password if not provided
            $password = $request->password ?? $this->generateRandomPassword();

            // Create User
            $user = User::create([
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email,
                'password' => Hash::make($password),
                'role_id' => $roleId,
                'is_active' => true,
                'phone_verified_at' => now(), // Admin-created accounts are pre-verified
            ]);

            // Create Customer Profile (without address fields)
            $customerProfile = CustomerProfile::create([
                'user_id' => $user->id,
                'dob' => $request->dob,
                'gender' => $request->gender,
                'source' => $request->source,
                'medium' => $request->medium,
                'referral_code' => $request->referral_code,
                'marketing_consent' => $request->marketing_consent ?? false,
                'do_not_contact' => false,
                'type' => $request->customer_type,
                'trade_license_no' => $request->trade_license_no,
                'tax_id' => $request->tax_id,
                'loyalty_tier' => 'bronze',
                'loyalty_points' => 0,
                'lifetime_value' => 0,
                'total_orders' => 0,
                'total_spent' => 0,
                'avg_order_value' => 0,
                'notes' => $request->notes,
                'tags' => [],
            ]);

            // Create Address if address data is provided
            if ($request->filled('address_line1') || $request->filled('city')) {
                $address = Address::create([
                    'user_id' => $user->id,
                    'label' => $request->address_label ?? 'Default',
                    'full_name' => $request->address_full_name ?? $request->name,
                    'phone' => $request->address_phone ?? $request->phone,
                    'address_line1' => $request->address_line1,
                    'address_line2' => $request->address_line2,
                    'area' => $request->area,
                    'city' => $request->city,
                    'district' => $request->district,
                    'thana' => $request->thana,
                    'postal_code' => $request->postal_code,
                    'division' => $request->division,
                    'country' => $request->country ?? 'Bangladesh',
                    'is_default' => $request->is_default ?? true,
                    'is_billing_address' => $request->is_billing ?? true,
                    'is_shipping_address' => $request->is_shipping ?? true,
                ]);

                // Set as default address if marked
                if ($request->is_default) {
                    $address->setAsDefault();
                }
            }

            DB::commit();

            return $this->sendSuccess([
                'user' => $user->load(['customerProfile', 'addresses']),
                'password' => $password, // Return password so admin can share with customer
            ], 'Customer created successfully.', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create customer: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Update customer and profile
     */
    public function update(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.edit')) {
            return $this->sendError('You do not have permission to edit customers.', null, 403);
        }

        $user = User::with(['customerProfile', 'addresses'])->findOrFail($id);

        $request->validate([
            // User Info
            'name' => 'sometimes|required|string|max:255',
            'phone' => ['sometimes', 'required', 'string', Rule::unique('users', 'phone')->ignore($user->id)],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'customer_type' => 'sometimes|required|in:retail,wholesale',

            // Customer Profile Info
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'source' => 'nullable|string',
            'medium' => 'nullable|string',
            'referral_code' => 'nullable|string',
            'marketing_consent' => 'nullable|boolean',
            'trade_license_no' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Update User
            $userData = $request->only(['name', 'phone', 'email']);
            if ($request->has('customer_type')) {
                $roleId = $request->customer_type === 'retail' ? 10 : 11;
                $userData['role_id'] = $roleId;
            }
            $user->update($userData);

            // Update Customer Profile
            $profileData = $request->only([
                'dob', 'gender', 'source', 'medium', 'referral_code',
                'marketing_consent', 'trade_license_no', 'tax_id', 'notes'
            ]);
            if ($request->has('customer_type')) {
                $profileData['type'] = $request->customer_type;
            }
            $user->customerProfile()->update($profileData);

            DB::commit();

            return $this->sendSuccess($user->load(['customerProfile', 'addresses']), 'Customer updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update customer: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get customer list for CRM
     * Shows all customers including guest customers without user accounts
     */
    public function index(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.index')) {
            return $this->sendError('You do not have permission to view customers.', null, 403);
        }

        // Get all customers from users table (with retail/wholesale roles)
        // This ensures we get ALL customers, not just those in the customers table
        $query = User::whereIn('role_id', [10, 11]) // Retail (10) and Wholesale (11) customers
            ->with(['customerProfile', 'profile', 'role', 'addresses'])
            ->orderBy('created_at', 'desc');

        // Search across name, email, and phone
        if ($request->search) {
            $searchTerm = "%{$request->search}%";
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', $searchTerm)
                  ->orWhere('email', 'like', $searchTerm)
                  ->orWhere('phone', 'like', $searchTerm);
            });
        }

        // Filter by customer type (retail/wholesale)
        if ($request->filled('type') && $request->type !== 'all') {
            $roleId = $request->type === 'retail' ? 10 : 11;
            $query->where('role_id', $roleId);
        }

        // Get paginated results
        $perPage = $request->per_page ?? 12;
        $paginated = $query->paginate($perPage);

        // Transform each customer record
        $items = $paginated->getCollection()->map(function ($customer) {
            // Get order statistics via direct DB query
            $orderStats = DB::table('sales_orders')
                ->where('customer_id', $customer->id)
                ->selectRaw('COUNT(*) as total_orders, SUM(total_amount) as total_spent')
                ->first();

            // Get default/shipping address
            $shippingAddress = $customer->addresses?->firstWhere('is_shipping', 1)
                            ?? $customer->addresses?->firstWhere('is_default', 1)
                            ?? $customer->addresses?->first();

            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'roleId' => $customer->role_id,
                'type' => $customer->customerProfile?->type ?? ($customer->role_id === 10 ? 'retail' : 'wholesale'),
                'totalOrders' => (int)($orderStats->total_orders ?? 0),
                'totalSpent' => (float)($orderStats->total_spent ?? 0),
                'loyaltyPoints' => (int)($customer->customerProfile?->loyalty_points ?? 0),
                'district' => $shippingAddress?->district ?? 'Not provided',
                'thana' => $shippingAddress?->thana ?? 'Not provided',
                'division' => $shippingAddress?->division ?? 'Not provided',
                'address' => $shippingAddress ? [
                    'id' => $shippingAddress->id,
                    'fullName' => $shippingAddress->full_name,
                    'phone' => $shippingAddress->phone,
                    'line1' => $shippingAddress->line1,
                    'line2' => $shippingAddress->line2,
                    'thana' => $shippingAddress->thana,
                    'district' => $shippingAddress->district,
                    'division' => $shippingAddress->division,
                    'postalCode' => $shippingAddress->postal_code,
                    'isDefault' => (bool)$shippingAddress->is_default,
                    'isShipping' => (bool)$shippingAddress->is_shipping,
                ] : null,
                'createdAt' => $customer->created_at->toIso8601String(),
            ];
        });

        // Return paginated response with transformed items
        return response()->json([
            'status' => true,
            'message' => 'Customers retrieved successfully.',
            'data' => [
                'data' => $items,
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
        ]);
    }

    /**
     * Get single customer details
     */
    public function show($id)
    {
        // Permission check - requires same permission as index since details are part of the same feature
        if (!auth()->user()->hasPermissionTo('crm.customers.index')) {
            return $this->sendError('You do not have permission to view customer details.', null, 403);
        }

        $user = User::with(['customerProfile', 'addresses', 'role'])
            ->whereIn('role_id', [10, 11])
            ->findOrFail($id);

        // Get order statistics
        $orderStats = DB::table('sales_orders')
            ->where('customer_id', $user->id)
            ->selectRaw('COUNT(*) as total_orders, SUM(total_amount) as total_spent')
            ->first();

        // Get default/shipping address
        $shippingAddress = $user->addresses?->firstWhere('is_shipping', 1)
                        ?? $user->addresses?->firstWhere('is_default', 1)
                        ?? $user->addresses?->first();

        return $this->sendSuccess([
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'roleId' => $user->role_id,
            'type' => $user->customerProfile?->type ?? ($user->role_id === 10 ? 'retail' : 'wholesale'),
            'totalOrders' => (int)($orderStats->total_orders ?? 0),
            'totalSpent' => (float)($orderStats->total_spent ?? 0),
            'loyaltyPoints' => (int)($user->customerProfile?->loyalty_points ?? 0),
            'district' => $shippingAddress?->district ?? 'Not provided',
            'thana' => $shippingAddress?->thana ?? 'Not provided',
            'division' => $shippingAddress?->division ?? 'Not provided',
            'address' => $shippingAddress ? [
                'id' => $shippingAddress->id,
                'fullName' => $shippingAddress->full_name,
                'phone' => $shippingAddress->phone,
                'line1' => $shippingAddress->line1,
                'line2' => $shippingAddress->line2,
                'thana' => $shippingAddress->thana,
                'district' => $shippingAddress->district,
                'division' => $shippingAddress->division,
                'postalCode' => $shippingAddress->postal_code,
                'isDefault' => (bool)$shippingAddress->is_default,
                'isShipping' => (bool)$shippingAddress->is_shipping,
            ] : null,
            'createdAt' => $user->created_at->toIso8601String(),
            'customerProfile' => $user->customerProfile,
        ], 'Customer retrieved successfully.');
    }

    /**
     * Send New Password via SMS
     */
    public function sendPasswordSms($id)
    {
        $user = User::whereIn('role_id', [10, 11])->findOrFail($id);

        // Permission check: Need crm.customers.edit permission
        if (!auth()->user()->hasPermissionTo('crm.customers.edit')) {
            return $this->sendError('You do not have permission to send password SMS.', null, 403);
        }

        DB::beginTransaction();
        try {
            // 1. Generate random 8-character alphanumeric password
            $newPassword = $this->generateRandomPassword();

            // 2. Update user password
            $user->update([
                'password' => Hash::make($newPassword),
            ]);

            // 3. Send SMS with new password
            $smsService = new AlphaSmsService();
            $smsMessage = "Your password has been reset for Hook & Hunt. New Password: {$newPassword} Please login and change your password for security.";
            $smsService->sendSms($smsMessage, $user->phone);

            DB::commit();
            return $this->sendSuccess([
                'phone' => $this->maskPhoneNumber($user->phone),
            ], 'New password has been sent via SMS successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to send password SMS: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mask phone number for privacy (show first 4 and last 2 digits)
     */
    private function maskPhoneNumber($phone)
    {
        if (strlen($phone) < 6) {
            return $phone;
        }
        $start = substr($phone, 0, 4);
        $end = substr($phone, -2);
        $middle = str_repeat('x', strlen($phone) - 6);
        return $start . $middle . $end;
    }

    /**
     * Generate random 8-character password
     */
    private function generateRandomPassword(): string
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $password = '';

        for ($i = 0; $i < 8; $i++) {
            $password .= $characters[random_int(0, strlen($characters) - 1)];
        }

        return $password;
    }

    /**
     * Get customer orders
     * Module independence: Direct database access instead of relationship
     */
    public function orders($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.view')) {
            return $this->sendError('You do not have permission to view customer orders.', null, 403);
        }

        $orders = DB::table('sales_orders')
            ->where('customer_id', $id)
            ->latest()
            ->paginate(20);

        return $this->sendSuccess($orders, 'Customer orders retrieved successfully.');
    }

    /**
     * Get customer activities
     */
    public function activities($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.view')) {
            return $this->sendError('You do not have permission to view customer activities.', null, 403);
        }

        // Return empty array for now - activities can be added later
        return $this->sendSuccess([], 'Customer activities retrieved successfully.');
    }

    /**
     * Get CRM customers statistics
     */
    public function stats()
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.index')) {
            return $this->sendError('You do not have permission to view customer statistics.', null, 403);
        }

        // Module independence: Direct database queries instead of cross-module relationships
        $totalCustomers = User::whereIn('role_id', [10, 11])->count();
        $retailCustomers = User::where('role_id', 10)->count();
        $wholesaleCustomers = User::where('role_id', 11)->count();

        // Get active customers (customers with orders in last 30 days)
        $activeCustomers = DB::table('sales_orders')
            ->where('created_at', '>=', now()->subDays(30))
            ->distinct('customer_id')
            ->count('customer_id');

        // Get new customers this month
        $newCustomersThisMonth = User::whereIn('role_id', [10, 11])
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();

        return $this->sendSuccess([
            'total_customers' => $totalCustomers,
            'retail_customers' => $retailCustomers,
            'wholesale_customers' => $wholesaleCustomers,
            'active_customers' => $activeCustomers,
            'new_customers_this_month' => $newCustomersThisMonth,
        ], 'Customer statistics retrieved successfully.');
    }

    /**
     * Delete customer (soft delete)
     */
    public function destroy($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.customers.delete')) {
            return $this->sendError('You do not have permission to delete customers.', null, 403);
        }

        $user = User::whereIn('role_id', [10, 11])->findOrFail($id);

        DB::beginTransaction();
        try {
            // Soft delete the user (this will cascade to customer profile and addresses)
            $user->delete();

            DB::commit();
            return $this->sendSuccess(null, 'Customer deleted successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to delete customer: ' . $e->getMessage(), null, 500);
        }
    }
}
