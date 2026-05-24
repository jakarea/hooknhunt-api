<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;


use App\Http\Controllers\Controller;
// Cross-module dependencies removed - these belong to Finance module, not Website
// Accounting functionality moved to Finance module - using direct data access
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    /**
     * Get all chart of accounts
     */
    public function index(Request $request): JsonResponse
    {
        $query = ChartOfAccount::query();

        // Filter by account type
        if ($request->type) {
            $query->ofType($request->type);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name, code, or description
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Order by type and code
        $query->orderByRaw("FIELD(type, 'asset', 'liability', 'equity', 'income', 'expense'), 'code'")
              ->orderBy('code');

        $accounts = $query->paginate($request->per_page ?? 50);

        // Calculate current balances for each account
        $accounts->getCollection()->transform(function ($account) {
            $account = $this->calculateAccountBalance($account);
            $account->type_label = $account->type_label;
            return $account;
        });

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    /**
     * Get the authenticated customer's profile
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Load only role relationship (available in System module)
        $user->load(['role']);

        // Transform user data for API response
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->name,
            'phone_number' => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
            // Customer profile data removed - not available in Website module
            'customer_profile' => null,
            // Addresses
            'addresses' => $user->addresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'label' => $address->label,
                    'full_name' => $address->full_name,
                    'phone' => $address->phone,
                    'address_line1' => $address->address_line1,
                    'address_line2' => $address->address_line2,
                    'area' => $address->area,
                    'city' => $address->city,
                    'district' => $address->district,
                    'thana' => $address->thana,
                    'postal_code' => $address->postal_code,
                    'division' => $address->division,
                    'country' => $address->country,
                    'is_default' => (bool) $address->is_default,
                    'is_billing_address' => (bool) $address->is_billing_address,
                    'is_shipping_address' => (bool) $address->is_shipping_address,
                ];
            })->toArray(),
        ];

        return response()->json([
            'status' => true,
            'message' => 'Profile retrieved successfully',
            'data' => [
                'user' => $userData,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Validate request data - only User fields available in Website module
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'phone_number' => 'sometimes|string|unique:users,phone,' . $user->id,
        ]);

        // Update user basic info
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (array_key_exists('email', $validated)) {
            // Allow empty string to be saved as null
            $user->email = $validated['email'] ?: null;
        }
        if (isset($validated['phone_number'])) {
            $user->phone = $validated['phone_number'];
        }
        $user->save();

        // Reload user with role relationship
        $user->load(['role']);

        // Transform user data for API response - pure Website module data
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->name,
            'phone_number' => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
            // Customer profile data removed - not available in Website module
            'customer_profile' => null,
            // Addresses
            'addresses' => $user->addresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'label' => $address->label,
                    'full_name' => $address->full_name,
                    'phone' => $address->phone,
                    'address_line1' => $address->address_line1,
                    'address_line2' => $address->address_line2,
                    'area' => $address->area,
                    'city' => $address->city,
                    'district' => $address->district,
                    'thana' => $address->thana,
                    'postal_code' => $address->postal_code,
                    'division' => $address->division,
                    'country' => $address->country,
                    'is_default' => (bool) $address->is_default,
                    'is_billing_address' => (bool) $address->is_billing_address,
                    'is_shipping_address' => (bool) $address->is_shipping_address,
                ];
            })->toArray(),
        ];

        return response()->json([
            'status' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'user' => $userData,
            ],
        ]);
    }

    /**
     * Logout authenticated user
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Revoke current token
        $user->currentAccessToken()->delete();

        // Create response that clears the auth cookie
        $response = response()->json([
            'status' => true,
            'message' => 'Logged out successfully',
        ]);

        // Get the origin domain from the request (Next.js proxy forwards the origin)
        $host = $request->headers->get('x-forwarded-host') ?: $request->getHost();
        $cookieDomain = null;

        // Extract domain for local development
        if (str_contains($host, 'hooknhunt-api.test')) {
            $cookieDomain = '.hooknhunt-api.test';
        } elseif (str_contains($host, 'localhost')) {
            $cookieDomain = null; // Localhost doesn't need domain
        }

        $isSecure = $request->secure() || str_contains($host, 'hooknhunt-api.test');
        $cookie = cookie('auth_token', '', -1, '/', $cookieDomain, $isSecure, true, false, 'Lax');
        $response->withCookie($cookie);

        return $response;
    }

    /**
     * Get all addresses for authenticated user
     */
    public function getAddresses(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $addresses = $user->addresses()->latest()->get();

        return response()->json([
            'status' => true,
            'data' => $addresses,
        ]);
    }

    /**
     * Add new address
     */
    public function addAddress(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $validated = $request->validate([
            'label' => 'nullable|string|max:50',
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'thana' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:255',
            'division' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'is_default' => 'boolean',
            'is_billing_address' => 'boolean',
            'is_shipping_address' => 'boolean',
        ]);

        // Set default values for nullable fields to avoid database errors
        $validated['area'] = $validated['area'] ?? ($validated['city'] ?? '');
        $validated['city'] = $validated['city'] ?? '';
        $validated['district'] = $validated['district'] ?? '';
        $validated['thana'] = $validated['thana'] ?? '';
        $validated['postal_code'] = $validated['postal_code'] ?? '';
        $validated['division'] = $validated['division'] ?? '';
        $validated['country'] = $validated['country'] ?? 'Bangladesh';

        $address = $user->addresses()->create($validated);

        // If set as default, unset other defaults
        if (!empty($validated['is_default']) && $validated['is_default']) {
            $user->addresses()
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);
        }

        return response()->json([
            'status' => true,
            'message' => 'Address added successfully',
            'data' => $address,
        ], 201);
    }

    /**
     * Update existing address
     */
    public function updateAddress(Request $request, $addressId): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Find address manually - no cross-module dependencies
        $address = $user->addresses()->where('id', $addressId)->first();

        if (!$address) {
            return response()->json([
                'status' => false,
                'message' => 'Address not found',
            ], 404);
        }

        $validated = $request->validate([
            'label' => 'sometimes|nullable|string|max:255',
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:255',
            'address_line1' => 'sometimes|string|max:255',
            'address_line2' => 'sometimes|nullable|string|max:255',
            'area' => 'sometimes|nullable|string|max:255',
            'city' => 'sometimes|string|max:255',
            'district' => 'sometimes|nullable|string|max:255',
            'thana' => 'sometimes|nullable|string|max:255',
            'postal_code' => 'sometimes|nullable|string|max:255',
            'division' => 'sometimes|nullable|string|max:255',
            'country' => 'sometimes|nullable|string|max:255',
            'is_default' => 'boolean',
            'is_billing_address' => 'boolean',
            'is_shipping_address' => 'boolean',
        ]);

        $address->update($validated);

        // If set as default, unset other defaults
        if (!empty($validated['is_default']) && $validated['is_default']) {
            $user->addresses()
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);
        }

        return response()->json([
            'status' => true,
            'message' => 'Address updated successfully',
            'data' => $address->fresh(),
        ]);
    }

    /**
     * Delete address
     */
    public function deleteAddress(Request $request, $addressId): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Find address manually - no cross-module dependencies
        $address = $user->addresses()->where('id', $addressId)->first();

        if (!$address) {
            return response()->json([
                'status' => false,
                'message' => 'Address not found',
            ], 404);
        }

        // Verify address belongs to user
        if ($address->user_id !== $user->id) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $address->delete();

        return response()->json([
            'status' => true,
            'message' => 'Address deleted successfully',
        ]);
    }

    /**
     * Setup account for guest customers
     * Allows guest checkout users to create password after order
     *
     * POST /api/v2/store/account/setup
     */
    public function setupAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
            'name' => 'nullable|string|max:255',
        ]);

        // Find user by phone (module independence: direct DB query)
        $user = DB::table('users')
            ->where('phone', $validated['phone'])
            ->first();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'No account found with this phone number.',
                'errors' => 'If you placed an order as a guest, please use the phone number from your order.',
            ], 404);
        }

        // Check if user already has a password (account already set up)
        if (!empty($user->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Account already set up. Please login instead.',
                'errors' => 'If you forgot your password, use the forgot password option.',
            ], 400);
        }

        // Hash password and update user
        DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password' => bcrypt($validated['password']),
                'email' => $request->email ?? $user->email, // Allow email to be set during setup
                'name' => $validated['name'] ?? $user->name,
                'updated_at' => now(),
            ]);

        // Create customer record if not exists (link user_id to customer)
        $customerExists = DB::table('customers')->where('user_id', $user->id)->first();
        if (!$customerExists) {
            DB::table('customers')->insert([
                'user_id' => $user->id,
                'currency_id' => 1, // Default currency
                'name' => $validated['name'] ?? $user->name,
                'phone' => $user->phone,
                'type' => 'retail', // Default type
                'wallet_balance' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'status' => true,
            'message' => 'Account setup successful! You can now login with your phone and password.',
            'data' => [
                'phone' => $user->phone,
            ],
        ], 201);
    }

    /**
     * Check if phone number can setup account
     * Used by frontend to show account setup prompt
     *
     * GET /api/v2/store/account/can-setup?phone=01712345678
     */
    public function canSetupAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
        ]);

        $user = DB::table('users')
            ->where('phone', $validated['phone'])
            ->first(['id', 'phone', 'password']);

        if (!$user) {
            return response()->json([
                'status' => false,
                'can_setup' => false,
                'message' => 'No account found with this phone number.',
            ]);
        }

        return response()->json([
            'status' => true,
            'can_setup' => empty($user->password),
            'has_password' => !empty($user->password),
            'message' => empty($user->password)
                ? 'You can setup your account password.'
                : 'Account already has a password. Please login.',
        ]);
    }

    /**
     * Get customer by phone number (for returning customer detection)
     *
     * Used in guest checkout to detect existing customers and load their saved addresses
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getCustomerByPhone(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string|min:11|max:15',
        ]);

        // Normalize phone number
        $normalizedPhone = $this->normalizePhone($validated['phone']);

        // Search for user by phone (module independence: direct DB query)
        $user = DB::table('users')
            ->where('phone', $normalizedPhone)
            ->first(['id', 'name', 'phone', 'email']);

        if (!$user) {
            return response()->json([
                'status' => true,
                'data' => [
                    'found' => false,
                    'message' => 'No existing customer found with this phone number.',
                ],
            ]);
        }

        // Get customer record linked to this user
        $customer = DB::table('customers')
            ->where('user_id', $user->id)
            ->first(['id', 'name', 'phone', 'type']);

        if (!$customer) {
            return response()->json([
                'status' => true,
                'data' => [
                    'found' => false,
                    'message' => 'User found but no customer record exists.',
                ],
            ]);
        }

        // Load user's saved addresses from addresses table (module independence: direct DB query)
        // Note: addresses are linked to user_id, not customer_id
        $savedAddresses = DB::table('addresses')
            ->where('user_id', $user->id)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get([
                'id',
                'label',
                'full_name',
                'phone',
                'address_line1 as address',
                'address_line2',
                'area',
                'city as district',
                'thana',
                'division',
                'postal_code',
                'is_default',
                DB::raw("'saved' as address_type")
            ]);

        // Also extract addresses from past orders (for users who haven't saved addresses)
        $orderAddresses = DB::table('sales_orders')
            ->where('customer_id', $customer->id)
            ->whereNotNull('shipping_address')
            ->where('shipping_address', '!=', '')
            ->orderBy('created_at', 'desc')
            ->limit(10) // Last 10 orders
            ->get([
                'id as order_id',
                'invoice_no as label',
                'shipping_address as address',
                'shipping_city as district',
                'shipping_country as division',
                'created_at',
                DB::raw("'order' as address_type")
            ]);

        // Extract thana from external_data and merge
        $orderAddresses->transform(function ($order) {
            $externalData = null;
            try {
                $orderData = DB::table('sales_orders')
                    ->where('id', $order->order_id)
                    ->value('external_data');
                $externalData = json_decode($orderData, true);
            } catch (\Exception $e) {
                // Ignore JSON parse errors
            }

            $order->thana = $externalData['shipping_thana'] ?? null;
            $order->full_name = null; // Not stored in orders
            $order->phone = null; // Not stored in orders
            $order->is_default = false; // Order addresses are never default
            $order->label = 'Order: ' . $order->label; // Add "Order:" prefix to label

            return $order;
        });

        // Merge saved addresses and order addresses, removing duplicates
        $allAddresses = collect();
        $seenAddresses = collect();

        // Add saved addresses first (priority)
        foreach ($savedAddresses as $address) {
            $key = md5($address->address . $address->district . $address->thana);
            if (!$seenAddresses->has($key)) {
                $allAddresses->push($address);
                $seenAddresses->put($key, true);
            }
        }

        // Add order addresses (if not duplicate)
        foreach ($orderAddresses as $address) {
            $key = md5($address->address . $address->district . $address->thana);
            if (!$seenAddresses->has($key)) {
                $allAddresses->push($address);
                $seenAddresses->put($key, true);
            }
        }

        return response()->json([
            'status' => true,
            'data' => [
                'found' => true,
                'customer' => [
                    'id' => $customer->id,
                    'user_id' => $user->id,
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $user->email,
                    'type' => $customer->type,
                ],
                'addresses' => $allAddresses,
            ],
        ]);
    }

    /**
     * Normalize phone number to BD format (01XXXXXXXXX)
     *
     * Handles various input formats:
     * - 01712345678 (11 digits, no code)
     * - +8801712345678 (+88 prefix)
     * - 8801712345678 (88 prefix)
     *
     * @param string $phone
     * @return string Normalized phone number
     */
    private function normalizePhone(string $phone): string
    {
        // Remove all non-digit characters
        $normalized = preg_replace('/[^0-9]/', '', $phone);

        // If starts with 880, convert to 0 prefix (13 digits -> 11 digits)
        if (strlen($normalized) === 13 && str_starts_with($normalized, '880')) {
            return '0' . substr($normalized, 2);
        }

        // If 11 digits starting with 01, keep as is
        if (strlen($normalized) === 11 && str_starts_with($normalized, '01')) {
            return $normalized;
        }

        // Return original if can't normalize
        return $phone;
    }

    /**
     * Get single chart of account
     */
    public function show(int $id): JsonResponse
    {
        $account = ChartOfAccount::with(['journalItems.journalEntry'])->find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Calculate balance
        $account = $this->calculateAccountBalance($account);
        $account->type_label = $account->type_label;

        // Get recent journal entries for this account
        $recentEntries = JournalEntry::whereHas('items', function ($q) use ($id) {
            $q->where('account_id', $id);
        })
            ->with(['creator', 'items.account'])
            ->orderBy('date', 'desc')
            ->limit(20)
            ->get();

        // Get recent expenses for this account (if it's an expense account)
        $recentExpenses = [];
        if ($account->type === 'expense') {
            $recentExpenses = Expense::where('account_id', $id)
                ->with(['vendor', 'category', 'paymentMethod'])
                ->orderBy('date', 'desc')
                ->limit(10)
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => array_merge($account->toArray(), [
                'recent_entries' => $recentEntries,
                'recent_expenses' => $recentExpenses,
            ]),
        ]);
    }

    /**
     * Create new chart of account
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:chart_of_accounts,code',
            'type' => 'required|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $account = ChartOfAccount::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully',
            'data' => $account,
        ], 201);
    }

    /**
     * Update chart of account
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $account = ChartOfAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Check if account has journal entries
        $hasTransactions = $account->journalItems()->exists();
        if ($hasTransactions) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update account with existing journal entries. Create a new account instead.',
            ], 400);
        }

        // Check if account has expenses
        $hasExpenses = $account->expenses()->exists();
        if ($hasExpenses) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update account with existing expenses.',
            ], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:chart_of_accounts,code,' . $id,
            'type' => 'sometimes|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $account->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully',
            'data' => $account->fresh(),
        ]);
    }

    /**
     * Delete chart of account
     */
    public function destroy(int $id): JsonResponse
    {
        $account = ChartOfAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Check if account has journal entries
        $hasTransactions = $account->journalItems()->exists();
        if ($hasTransactions) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete account with existing journal entries.',
            ], 400);
        }

        // Check if account has expenses
        $hasExpenses = $account->expenses()->exists();
        if ($hasExpenses) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete account with existing expenses.',
            ], 400);
        }

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully',
        ]);
    }

    /**
     * Get balance summary
     */
    public function balanceSummary(): JsonResponse
    {
        // Get all accounts with their balances
        $accounts = ChartOfAccount::active()
            ->get()
            ->map(function ($account) {
                return $this->calculateAccountBalance($account);
            });

        // Calculate totals by type
        $totalsByType = [
            'asset' => $accounts->where('type', 'asset')->sum('balance'),
            'liability' => $accounts->where('type', 'liability')->sum('balance'),
            'equity' => $accounts->where('type', 'equity')->sum('balance'),
            'income' => $accounts->where('type', 'income')->sum('balance'),
            'expense' => $accounts->where('type', 'expense')->sum('balance'),
        ];

        // Calculate totals
        $totalAssets = $totalsByType['asset'];
        $totalLiabilities = $totalsByType['liability'];
        $totalEquity = $totalsByType['equity'];
        $totalRevenue = $totalsByType['income'];
        $totalExpenses = $totalsByType['expense'];

        // Accounting equation: Assets = Liabilities + Equity
        $calculatedEquity = $totalAssets - $totalLiabilities;

        // Net Income = Revenue - Expenses
        $netIncome = $totalRevenue - $totalExpenses;

        $summary = [
            'total_accounts' => $accounts->count(),
            'accounts_by_type' => [
                'asset' => $accounts->where('type', 'asset')->count(),
                'liability' => $accounts->where('type', 'liability')->count(),
                'equity' => $accounts->where('type', 'equity')->count(),
                'income' => $accounts->where('type', 'income')->count(),
                'expense' => $accounts->where('type', 'expense')->count(),
            ],
            'totals_by_type' => [
                [
                    'type' => 'asset',
                    'label' => 'Total Assets',
                    'amount' => $totalAssets,
                ],
                [
                    'type' => 'liability',
                    'label' => 'Total Liabilities',
                    'amount' => $totalLiabilities,
                ],
                [
                    'type' => 'equity',
                    'label' => 'Total Equity',
                    'amount' => $totalEquity,
                ],
                [
                    'type' => 'income',
                    'label' => 'Total Revenue',
                    'amount' => $totalRevenue,
                ],
                [
                    'type' => 'expense',
                    'label' => 'Total Expenses',
                    'amount' => $totalExpenses,
                ],
            ],
            'accounting_equation' => [
                'assets' => $totalAssets,
                'liabilities' => $totalLiabilities,
                'equity' => $totalEquity,
                'calculated_equity' => $calculatedEquity,
                'is_balanced' => abs($totalEquity - $calculatedEquity) < 0.01,
            ],
            'net_income' => $netIncome,
            'retained_earnings' => $netIncome,
            'cash_and_cash_equivalents' => $accounts->filter(function($acc) {
                return stripos(strtolower($acc->name), 'cash') !== false ||
                       stripos(strtolower($acc->name), 'bank') !== false;
            })->sum('balance'),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get trial balance data
     */
    public function trialBalance(Request $request): JsonResponse
    {
        // Validate parameters (accepts both snake_case and camelCase from frontend)
        $asOfDate = $request->input('as_of_date') ?? $request->input('asOfDate') ?? now()->toDateString();
        $includeZeroBalance = $request->boolean('include_zero_balance', $request->boolean('includeZeroBalance', false));

        $query = ChartOfAccount::active();

        // Get all accounts with their balances up to the specified date
        $accounts = $query->get()->map(function ($account) use ($asOfDate) {
            // Calculate balance from journal items up to the specified date
            $debitTotal = JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                })
                ->sum('debit');

            $creditTotal = JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                })
                ->sum('credit');

            // Calculate balance based on account type
            if (in_array($account->type, ['asset', 'expense'])) {
                $balance = $debitTotal - $creditTotal;
            } else {
                $balance = $creditTotal - $debitTotal;
            }

            return [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'type_label' => $account->type_label,
                'debit' => $debitTotal,
                'credit' => $creditTotal,
                'balance' => $balance,
            ];
        });

        // Filter out zero balance accounts if requested
        if (!$includeZeroBalance) {
            $accounts = $accounts->filter(function($acc) {
                return abs($acc['balance']) > 0.01;
            })->values(); // Reset keys to make it a proper array
        } else {
            $accounts = $accounts->values(); // Reset keys even without filtering
        }

        // Calculate totals
        $totalDebit = $accounts->sum('debit');
        $totalCredit = $accounts->sum('credit');
        $totalDebitBalances = $accounts->filter(function($acc) {
            return in_array($acc['type'], ['asset', 'expense']);
        })->sum('balance');
        $totalCreditBalances = $accounts->filter(function($acc) {
            return in_array($acc['type'], ['liability', 'equity', 'income']);
        })->sum('balance');

        $trialBalance = [
            'as_of_date' => $asOfDate,
            'accounts' => $accounts,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'difference' => $totalDebit - $totalCredit,
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
            'total_debit_balances' => $totalDebitBalances,
            'total_credit_balances' => $totalCreditBalances,
        ];

        return response()->json([
            'success' => true,
            'data' => $trialBalance,
        ]);
    }

    /**
     * Get account statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_accounts' => ChartOfAccount::count(),
            'active_accounts' => ChartOfAccount::active()->count(),
            'inactive_accounts' => ChartOfAccount::where('is_active', false)->count(),
            'accounts_by_type' => [
                'asset' => ChartOfAccount::ofType('asset')->count(),
                'liability' => ChartOfAccount::ofType('liability')->count(),
                'equity' => ChartOfAccount::ofType('equity')->count(),
                'income' => ChartOfAccount::ofType('income')->count(),
                'expense' => ChartOfAccount::ofType('expense')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Calculate account balance based on type
     */
    private function calculateAccountBalance(ChartOfAccount $account): ChartOfAccount
    {
        $debitTotal = $account->journalItems()->sum('debit');
        $creditTotal = $account->journalItems()->sum('credit');

        // Calculate balance based on account type
        if (in_array($account->type, ['asset', 'expense'])) {
            $account->balance = $debitTotal - $creditTotal;
        } else {
            $account->balance = $creditTotal - $debitTotal;
        }

        $account->debit_total = $debitTotal;
        $account->credit_total = $creditTotal;

        return $account;
    }
}
