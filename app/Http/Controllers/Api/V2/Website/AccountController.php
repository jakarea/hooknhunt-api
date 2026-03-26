<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\JournalItem;
use App\Models\JournalEntry;
use App\Models\Expense;
use App\Models\Address;
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

        // Load customer profile and addresses
        $user->load(['customerProfile', 'addresses']);

        // Transform user data for API response
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->name,
            'phone_number' => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
            // Customer profile data
            'customer_profile' => $user->customerProfile ? [
                'dob' => $user->customerProfile->dob,
                'gender' => $user->customerProfile->gender,
                'whatsapp_number' => $user->customerProfile->whatsapp_number,
                'preferred_language' => $user->customerProfile->preferred_language,
                'preferred_currency' => $user->customerProfile->preferred_currency,
                'loyalty_tier' => $user->customerProfile->loyalty_tier,
                'loyalty_points' => $user->customerProfile->loyalty_points,
                'total_orders' => $user->customerProfile->total_orders,
                'total_spent' => (float) $user->customerProfile->total_spent,
                'avg_order_value' => (float) $user->customerProfile->avg_order_value,
            ] : null,
            // Addresses
            'addresses' => $user->addresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'type' => $address->type,
                    'recipient_name' => $address->recipient_name,
                    'phone' => $address->phone,
                    'address' => $address->address,
                    'city' => $address->city,
                    'district' => $address->district,
                    'postal_code' => $address->postal_code,
                    'is_default' => (bool) $address->is_default,
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

        // Validate request data
        $validated = $request->validate([
            // User fields
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone_number' => 'sometimes|string|unique:users,phone,' . $user->id,
            'whatsapp_number' => 'sometimes|nullable|string',
            // Customer profile fields
            'dob' => 'sometimes|nullable|date',
            'gender' => 'sometimes|nullable|in:male,female,other',
            'preferred_language' => 'sometimes|nullable|string|max:10',
            'preferred_currency' => 'sometimes|nullable|string|max:10',
        ]);

        // Update user basic info
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['phone_number'])) {
            $user->phone = $validated['phone_number'];
        }
        $user->save();

        // Update or create customer profile
        $customerProfileData = array_filter([
            'dob' => $validated['dob'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'whatsapp_number' => $validated['whatsapp_number'] ?? null,
            'preferred_language' => $validated['preferred_language'] ?? null,
            'preferred_currency' => $validated['preferred_currency'] ?? null,
        ], fn($value) => $value !== null);

        if (!empty($customerProfileData)) {
            $customerProfile = $user->customerProfile()->firstOrCreate([]);
            $customerProfile->update($customerProfileData);
        }

        // Reload user with relationships
        $user->load(['customerProfile', 'addresses']);

        // Transform user data for API response
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->name,
            'phone_number' => $user->phone,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'phone_verified_at' => $user->phone_verified_at?->toIso8601String(),
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
            // Customer profile data
            'customer_profile' => $user->customerProfile ? [
                'dob' => $user->customerProfile->dob,
                'gender' => $user->customerProfile->gender,
                'whatsapp_number' => $user->customerProfile->whatsapp_number,
                'preferred_language' => $user->customerProfile->preferred_language,
                'preferred_currency' => $user->customerProfile->preferred_currency,
                'loyalty_tier' => $user->customerProfile->loyalty_tier,
                'loyalty_points' => $user->customerProfile->loyalty_points,
                'total_orders' => $user->customerProfile->total_orders,
                'total_spent' => (float) $user->customerProfile->total_spent,
                'avg_order_value' => (float) $user->customerProfile->avg_order_value,
            ] : null,
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

        return response()->json([
            'status' => true,
            'message' => 'Logged out successfully',
        ]);
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
            'area' => 'nullable|string|max:100',
            'city' => 'required|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'division' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'is_default' => 'boolean',
            'is_billing_address' => 'boolean',
            'is_shipping_address' => 'boolean',
        ]);

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
    public function updateAddress(Request $request, Address $address): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Verify address belongs to user
        if ($address->user_id !== $user->id) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validated = $request->validate([
            'label' => 'sometimes|nullable|string|max:50',
            'full_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'address_line1' => 'sometimes|string|max:255',
            'address_line2' => 'sometimes|nullable|string|max:255',
            'area' => 'sometimes|nullable|string|max:100',
            'city' => 'sometimes|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',
            'division' => 'sometimes|nullable|string|max:100',
            'country' => 'sometimes|nullable|string|max:100',
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
    public function deleteAddress(Request $request, Address $address): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
            ], 401);
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
