<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Traits\ApiResponse;

class WalletController extends Controller
{
    use ApiResponse;

    /**
     * Get all wallets with pagination and filters
     */
    public function index(Request $request)
    {
        // Permission check: Need crm.wallet.index permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.index')) {
            return $this->sendError('You do not have permission to view wallets.', null, 403);
        }

        $search = $request->query('search');
        $balanceFilter = $request->query('balance'); // 'positive', 'negative', 'zero'
        $statusFilter = $request->query('status'); // 'active', 'frozen', 'all'
        $perPage = $request->query('per_page', 20);

        $query = Wallet::with(['user', 'user.customerProfile']);

        // Search by customer name, email, or phone
        if ($search) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by balance
        if ($balanceFilter === 'positive') {
            $query->where('balance', '>', 0);
        } elseif ($balanceFilter === 'negative') {
            $query->where('balance', '<', 0);
        } elseif ($balanceFilter === 'zero') {
            $query->where('balance', 0);
        }

        // Filter by status
        if ($statusFilter === 'active') {
            $query->where('is_active', true)->where('is_frozen', false);
        } elseif ($statusFilter === 'frozen') {
            $query->where('is_frozen', true);
        }

        // Order by latest transaction
        $query->latest();

        $wallets = $query->paginate($perPage);

        // Transform the data - use map() to ensure it's properly serialized
        $collection = $wallets->getCollection();
        $transformed = $collection->map(function ($wallet) {
            return [
                'id' => $wallet->id,
                'customer_id' => $wallet->user_id,
                'customer_name' => optional($wallet->user)->name ?? 'N/A',
                'customer_email' => optional($wallet->user)->email,
                'customer_phone' => optional($wallet->user)->phone ?? 'N/A',
                'balance' => (float) $wallet->balance,
                'total_credits' => (float) $wallet->total_credited,
                'total_debits' => (float) $wallet->total_debited,
                'last_transaction' => $wallet->updated_at,
                'status' => $wallet->is_frozen ? 'frozen' : ($wallet->is_active ? 'active' : 'inactive'),
                'is_active' => $wallet->is_active,
                'is_frozen' => $wallet->is_frozen,
            ];
        });

        // Replace the collection in the paginator
        $wallets->setCollection($transformed);

        return $this->sendSuccess($wallets, 'Wallets retrieved successfully.');
    }

    /**
     * Get wallet transactions with pagination and filters
     */
    public function transactions(Request $request)
    {
        // Permission check: Need crm.wallet.transactions permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.transactions')) {
            return $this->sendError('You do not have permission to view wallet transactions.', null, 403);
        }

        $search = $request->query('search');
        $typeFilter = $request->query('type'); // 'credit', 'debit'
        $perPage = $request->query('per_page', 20);

        $query = WalletTransaction::with(['wallet.user', 'creator']);

        // Search by customer name or description
        if ($search) {
            $query->whereHas('wallet.user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            })->orWhere('description', 'like', "%{$search}%");
        }

        // Filter by type
        if ($typeFilter && in_array($typeFilter, ['credit', 'debit'])) {
            $query->where('type', $typeFilter);
        }

        // Order by latest first
        $query->latest();

        $transactions = $query->paginate($perPage);

        // Transform the data
        $collection = $transactions->getCollection();
        $transformed = $collection->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'wallet_id' => $transaction->wallet_id,
                'customer_name' => optional($transaction->wallet?->user)->name ?? 'N/A',
                'type' => $transaction->type,
                'amount' => (float) $transaction->amount,
                'balance_before' => (float) $transaction->balance_before,
                'balance_after' => (float) $transaction->balance_after,
                'description' => $transaction->description,
                'source_type' => $transaction->source_type,
                'source_id' => $transaction->source_id,
                'created_at' => $transaction->created_at,
                'created_by' => optional($transaction->creator)->name ?? 'System',
            ];
        });

        // Replace the collection in the paginator
        $transactions->setCollection($transformed);

        return $this->sendSuccess($transactions, 'Transactions retrieved successfully.');
    }

    /**
     * Get wallet statistics
     */
    public function stats()
    {
        // Permission check: Need crm.wallet.stats permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.stats')) {
            return $this->sendError('You do not have permission to view wallet statistics.', null, 403);
        }

        $totalBalance = Wallet::sum('balance');
        $totalCredits = Wallet::sum('total_credited');
        $totalDebits = Wallet::sum('total_debited');
        $activeWallets = Wallet::where('is_active', true)->where('is_frozen', false)->count();
        $frozenWallets = Wallet::where('is_frozen', true)->count();
        $positiveBalanceWallets = Wallet::where('balance', '>', 0)->count();
        $negativeBalanceWallets = Wallet::where('balance', '<', 0)->count();

        return $this->sendSuccess([
            'total_balance' => (float) $totalBalance,
            'total_credits' => (float) $totalCredits,
            'total_debits' => (float) $totalDebits,
            'active_wallets' => $activeWallets,
            'frozen_wallets' => $frozenWallets,
            'positive_balance_wallets' => $positiveBalanceWallets,
            'negative_balance_wallets' => $negativeBalanceWallets,
        ], 'Wallet statistics retrieved successfully.');
    }

    /**
     * Get single wallet details
     */
    public function show($id)
    {
        // Permission check: Need crm.wallet.show or crm.wallet.index permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.show') && !auth()->user()->hasPermissionTo('crm.wallet.index')) {
            return $this->sendError('You do not have permission to view wallet details.', null, 403);
        }

        $wallet = Wallet::with(['user', 'user.customerProfile', 'transactions' => function ($q) {
            $q->latest()->limit(50);
        }])->findOrFail($id);

        return $this->sendSuccess([
            'id' => $wallet->id,
            'customerId' => $wallet->user_id,
            'customerName' => optional($wallet->user)->name ?? 'N/A',
            'customerEmail' => optional($wallet->user)->email,
            'customerPhone' => optional($wallet->user)->phone ?? 'N/A',
            'balance' => (float) $wallet->balance,
            'totalCredits' => (float) $wallet->total_credited,
            'totalDebits' => (float) $wallet->total_debited,
            'lastTransaction' => $wallet->updated_at,
            'status' => $wallet->is_frozen ? 'frozen' : ($wallet->is_active ? 'active' : 'inactive'),
            'isActive' => $wallet->is_active,
            'isFrozen' => $wallet->is_frozen,
            'recentTransactions' => $wallet->transactions->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'walletId' => $transaction->wallet_id,
                    'type' => $transaction->type,
                    'amount' => (float) $transaction->amount,
                    'balanceBefore' => (float) $transaction->balance_before,
                    'balanceAfter' => (float) $transaction->balance_after,
                    'description' => $transaction->description,
                    'sourceType' => $transaction->source_type,
                    'sourceId' => $transaction->source_id,
                    'createdAt' => $transaction->created_at,
                    'createdBy' => optional($transaction->creator)->name ?? 'System',
                ];
            }),
        ], 'Wallet details retrieved successfully.');
    }

    /**
     * Add funds to wallet
     */
    public function addFunds(Request $request)
    {
        // Permission check: Need crm.wallet.add_funds permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.add_funds')) {
            return $this->sendError('You do not have permission to add funds to wallets.', null, 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:255',
        ]);

        $user = User::findOrFail($request->user_id);

        // Get or create wallet for user
        $wallet = $user->wallet ?? $user->wallet()->create([
            'balance' => 0,
            'total_credited' => 0,
            'total_debited' => 0,
            'is_active' => true,
            'is_frozen' => false,
        ]);

        // Check if wallet is frozen
        if ($wallet->is_frozen) {
            return $this->sendError('Cannot add funds to frozen wallet.', null, 403);
        }

        // Credit the wallet
        $transaction = $wallet->credit(
            $request->amount,
            'adjustment',
            null,
            $request->description,
            auth()->id()
        );

        return $this->sendSuccess([
            'wallet_id' => $wallet->id,
            'customer_name' => $user->name,
            'new_balance' => (float) $wallet->balance,
            'transaction_id' => $transaction->id,
        ], 'Funds added successfully.');
    }

    /**
     * Deduct funds from wallet
     */
    public function deductFunds(Request $request)
    {
        // Permission check: Need crm.wallet.deduct_funds permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.deduct_funds')) {
            return $this->sendError('You do not have permission to deduct funds from wallets.', null, 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:255',
        ]);

        $user = User::findOrFail($request->user_id);

        // Check if user has a wallet
        if (!$user->wallet) {
            return $this->sendError('User does not have a wallet.', null, 404);
        }

        $wallet = $user->wallet;

        // Check if wallet is frozen
        if ($wallet->is_frozen) {
            return $this->sendError('Cannot deduct funds from frozen wallet.', null, 403);
        }

        // Check if wallet has sufficient balance
        if (!$wallet->hasSufficientBalance($request->amount)) {
            return $this->sendError('Insufficient wallet balance.', null, 400);
        }

        // Debit the wallet
        $transaction = $wallet->debit(
            $request->amount,
            'adjustment',
            null,
            $request->description,
            auth()->id()
        );

        return $this->sendSuccess([
            'wallet_id' => $wallet->id,
            'customer_name' => $user->name,
            'new_balance' => (float) $wallet->balance,
            'transaction_id' => $transaction->id,
        ], 'Funds deducted successfully.');
    }

    /**
     * Freeze/Unfreeze wallet
     */
    public function toggleFreeze(Request $request, $id)
    {
        // Permission check: Need crm.wallet.freeze permission
        if (!auth()->user()->hasPermissionTo('crm.wallet.freeze')) {
            return $this->sendError('You do not have permission to freeze wallets.', null, 403);
        }

        $wallet = Wallet::findOrFail($id);

        $wallet->update([
            'is_frozen' => !$wallet->is_frozen,
        ]);

        $status = $wallet->is_frozen ? 'frozen' : 'unfrozen';

        return $this->sendSuccess([
            'wallet_id' => $wallet->id,
            'is_frozen' => $wallet->is_frozen,
        ], "Wallet {$status} successfully.");
    }
}
