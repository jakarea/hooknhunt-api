<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JournalEntryController extends Controller
{
    /**
     * Get all journal entries
     */
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['items.account', 'creator']);

        // Filter by date range
        if ($request->start_date && $request->end_date) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        // Filter by entry number
        if ($request->entry_number) {
            $query->where('entry_number', 'like', '%' . $request->entry_number . '%');
        }

        // Filter by reversed status
        if ($request->has('is_reversed')) {
            $query->where('is_reversed', $request->boolean('is_reversed'));
        }

        // Filter by reference
        if ($request->reference_type && $request->reference_id) {
            $query->where('reference_type', $request->reference_type)
                ->where('reference_id', $request->reference_id);
        }

        // Search in description
        if ($request->search) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $entries = $query->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    /**
     * Get single journal entry
     */
    public function show(string|int $id): JsonResponse
    {
        $entry = JournalEntry::with(['items.account', 'creator', 'reference'])
            ->find((int)$id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry not found',
            ], 404);
        }

        // Add computed totals
        $entry->total_debit = $entry->getTotalDebitAttribute();
        $entry->total_credit = $entry->getTotalCreditAttribute();
        $entry->is_balanced = $entry->isBalanced();

        return response()->json([
            'success' => true,
            'data' => $entry,
        ]);
    }

    /**
     * Create new journal entry
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_number' => 'required|string|max:255|unique:journal_entries,entry_number',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'reference_type' => 'nullable|string|max:255',
            'reference_id' => 'nullable|integer',
            'items' => 'required|array|min:2',
            'items.*.account_id' => 'required|exists:chart_of_accounts,id',
            'items.*.debit' => 'required|numeric|min:0',
            'items.*.credit' => 'required|numeric|min:0',
        ]);

        // Validate that each item has either debit or credit (not both)
        foreach ($validated['items'] as $index => $item) {
            if ($item['debit'] > 0 && $item['credit'] > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Item at index {$index} cannot have both debit and credit values",
                ], 422);
            }

            if ($item['debit'] == 0 && $item['credit'] == 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Item at index {$index} must have either debit or credit value",
                ], 422);
            }
        }

        // Calculate totals
        $totalDebit = collect($validated['items'])->sum('debit');
        $totalCredit = collect($validated['items'])->sum('credit');

        // Validate debits equal credits
        if (abs($totalDebit - $totalCredit) > 0.01) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry must be balanced (debits must equal credits)',
                'data' => [
                    'total_debit' => $totalDebit,
                    'total_credit' => $totalCredit,
                    'difference' => abs($totalDebit - $totalCredit),
                ],
            ], 422);
        }

        \DB::beginTransaction();
        try {
            // Create journal entry
            $entry = JournalEntry::create([
                'entry_number' => $validated['entry_number'],
                'date' => $validated['date'],
                'description' => $validated['description'] ?? null,
                'reference_type' => $validated['reference_type'] ?? null,
                'reference_id' => $validated['reference_id'] ?? null,
                'created_by' => auth()->id(),
            ]);

            // Create journal items
            foreach ($validated['items'] as $item) {
                JournalItem::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $item['account_id'],
                    'debit' => $item['debit'],
                    'credit' => $item['credit'],
                ]);
            }

            \DB::commit();

            // Load relationships for response
            $entry->load(['items.account', 'creator']);
            $entry->total_debit = $totalDebit;
            $entry->total_credit = $totalCredit;
            $entry->is_balanced = true;

            return response()->json([
                'success' => true,
                'message' => 'Journal entry created successfully',
                'data' => $entry,
            ], 201);
        } catch (\Exception $e) {
            \DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create journal entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update journal entry (only if not posted/locked)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $entry = JournalEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry not found',
            ], 404);
        }

        // Check if entry can be edited (not reversed)
        if ($entry->is_reversed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot edit a reversed journal entry',
            ], 400);
        }

        $validated = $request->validate([
            'entry_number' => 'sometimes|string|max:255|unique:journal_entries,entry_number,' . $id,
            'date' => 'sometimes|date',
            'description' => 'nullable|string',
            'items' => 'nullable|array|min:2',
            'items.*.account_id' => 'required|exists:chart_of_accounts,id',
            'items.*.debit' => 'required|numeric|min:0',
            'items.*.credit' => 'required|numeric|min:0',
        ]);

        // If items are provided, validate them
        if (isset($validated['items'])) {
            foreach ($validated['items'] as $index => $item) {
                if ($item['debit'] > 0 && $item['credit'] > 0) {
                    return response()->json([
                        'success' => false,
                        'message' => "Item at index {$index} cannot have both debit and credit values",
                    ], 422);
                }

                if ($item['debit'] == 0 && $item['credit'] == 0) {
                    return response()->json([
                        'success' => false,
                        'message' => "Item at index {$index} must have either debit or credit value",
                    ], 422);
                }
            }

            $totalDebit = collect($validated['items'])->sum('debit');
            $totalCredit = collect($validated['items'])->sum('credit');

            if (abs($totalDebit - $totalCredit) > 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => 'Journal entry must be balanced (debits must equal credits)',
                    'data' => [
                        'total_debit' => $totalDebit,
                        'total_credit' => $totalCredit,
                        'difference' => abs($totalDebit - $totalCredit),
                    ],
                ], 422);
            }
        }

        \DB::beginTransaction();
        try {
            // Update entry
            $entry->update([
                'entry_number' => $validated['entry_number'] ?? $entry->entry_number,
                'date' => $validated['date'] ?? $entry->date,
                'description' => $validated['description'] ?? $entry->description,
            ]);

            // Update items if provided
            if (isset($validated['items'])) {
                // Delete existing items
                $entry->items()->delete();

                // Create new items
                foreach ($validated['items'] as $item) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $item['account_id'],
                        'debit' => $item['debit'],
                        'credit' => $item['credit'],
                    ]);
                }
            }

            \DB::commit();

            $entry->load(['items.account', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Journal entry updated successfully',
                'data' => $entry,
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to update journal entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete journal entry (only if not reversed)
     */
    public function destroy(int $id): JsonResponse
    {
        $entry = JournalEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry not found',
            ], 404);
        }

        if ($entry->is_reversed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a reversed journal entry',
            ], 400);
        }

        \DB::beginTransaction();
        try {
            // Delete items (cascade)
            $entry->items()->delete();
            $entry->delete();

            \DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Journal entry deleted successfully',
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete journal entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reverse journal entry
     */
    public function reverse(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string',
        ]);

        $entry = JournalEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry not found',
            ], 404);
        }

        if ($entry->is_reversed) {
            return response()->json([
                'success' => false,
                'message' => 'Journal entry has already been reversed',
            ], 400);
        }

        try {
            $reversal = $entry->reverse(
                $validated['reason'] ?? null,
                auth()->id()
            );

            $reversal->load(['items.account', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Journal entry reversed successfully',
                'data' => $reversal,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reverse journal entry',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get journal entries by account (general ledger view)
     */
    public function byAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:chart_of_accounts,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = JournalEntry::whereHas('items', function ($q) use ($validated) {
            $q->where('account_id', $validated['account_id']);
        })
            ->with(['items' => function ($q) use ($validated) {
                $q->where('account_id', $validated['account_id']);
            }, 'creator']);

        if ($request->start_date && $request->end_date) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        $entries = $query->orderBy('date', 'asc')
            ->get();

        $account = ChartOfAccount::find($validated['account_id']);

        return response()->json([
            'success' => true,
            'data' => [
                'account' => $account,
                'entries' => $entries,
                'total_debit' => $entries->sum(function ($entry) use ($validated) {
                    return $entry->items->where('account_id', $validated['account_id'])->sum('debit');
                }),
                'total_credit' => $entries->sum(function ($entry) use ($validated) {
                    return $entry->items->where('account_id', $validated['account_id'])->sum('credit');
                }),
            ],
        ]);
    }

    /**
     * Generate next entry number
     */
    public function getNextNumber(): JsonResponse
    {
        $lastEntry = JournalEntry::orderBy('id', 'desc')->first();

        if (!$lastEntry) {
            $nextNumber = 'JE-000001';
        } else {
            // Extract number from last entry
            preg_match('/JE-(\d+)/', $lastEntry->entry_number, $matches);
            $lastNumber = isset($matches[1]) ? (int)$matches[1] : 0;
            $nextNumber = 'JE-' . str_pad($lastNumber + 1, 6, '0', STR_PAD_LEFT);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'next_entry_number' => $nextNumber,
            ],
        ]);
    }

    /**
     * Get journal entry statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = JournalEntry::query();

        // Filter by date range if provided
        if ($request->start_date && $request->end_date) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        $stats = [
            'total_entries' => (clone $query)->count(),
            'reversed_entries' => (clone $query)->where('is_reversed', true)->count(),
            'active_entries' => (clone $query)->where('is_reversed', false)->count(),
            'total_debit_amount' => (clone $query)
                ->where('is_reversed', false)
                ->get()
                ->sum(function ($entry) {
                    return $entry->items->sum('debit');
                }),
            'total_credit_amount' => (clone $query)
                ->where('is_reversed', false)
                ->get()
                ->sum(function ($entry) {
                    return $entry->items->sum('credit');
                }),
            'recent_entries' => (clone $query)
                ->with(['items', 'creator'])
                ->orderBy('date', 'desc')
                ->limit(10)
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
