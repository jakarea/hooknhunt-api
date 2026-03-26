<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\FixedAsset;
use App\Models\ChartOfAccount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FixedAssetController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of fixed assets.
     * GET /api/v2/finance/fixed-assets
     */
    public function index(Request $request)
    {
        $query = FixedAsset::with(['account', 'creator', 'updater']);

        // Filter by category
        if ($request->has('category')) {
            $query->ofCategory($request->category);
        }

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'disposed') {
                $query->disposed();
            } else {
                $query->where('status', $request->status);
            }
        }

        // Filter by location
        if ($request->has('location')) {
            $query->atLocation($request->location);
        }

        // Filter by purchase date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->purchasedBetween($request->start_date, $request->end_date);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('asset_code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        $assets = $query->orderBy('purchase_date', 'desc')
                        ->orderBy('created_at', 'desc')
                        ->paginate($request->per_page ?? 15);

        return $this->sendSuccess($assets, 'Fixed assets retrieved successfully.');
    }

    /**
     * Store a newly created fixed asset.
     * POST /api/v2/finance/fixed-assets
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:255',
            'subcategory' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:chart_of_accounts,id',
            'purchase_price' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'salvage_value' => 'nullable|numeric|min:0',
            'useful_life' => 'required|integer|min:1|max:100',
            'depreciation_method' => 'required|in:straight_line,declining_balance,units_of_production,none',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'warranty_expiry' => 'nullable|date',
            'attachment' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Generate asset code
            $assetCode = FixedAsset::generateAssetCode();

            // Create asset
            $asset = FixedAsset::create([
                'name' => $request->name,
                'asset_code' => $assetCode,
                'serial_number' => $request->serial_number,
                'description' => $request->description,
                'category' => $request->category,
                'subcategory' => $request->subcategory,
                'location' => $request->location,
                'account_id' => $request->account_id,
                'purchase_price' => $request->purchase_price,
                'purchase_date' => $request->purchase_date,
                'supplier' => $request->supplier,
                'invoice_number' => $request->invoice_number,
                'salvage_value' => $request->salvage_value ?? 0,
                'useful_life' => $request->useful_life,
                'depreciation_method' => $request->depreciation_method,
                'depreciation_rate' => $request->depreciation_rate ?? ($request->depreciation_method === 'declining_balance' ? 10 : 0),
                'warranty_expiry' => $request->warranty_expiry,
                'attachment' => $request->attachment,
                'notes' => $request->notes,
                'status' => 'active',
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // Calculate initial depreciation
            $asset->updateDepreciation();

            DB::commit();
            return $this->sendSuccess($asset->load('account'), 'Fixed asset created successfully.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create fixed asset.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified fixed asset.
     * GET /api/v2/finance/fixed-assets/{id}
     */
    public function show($id)
    {
        $asset = FixedAsset::with(['account', 'creator', 'updater'])->findOrFail($id);

        // Add computed values
        $asset->remaining_life = $asset->remaining_life;
        $asset->depreciation_progress = $asset->depreciation_progress;
        $asset->depreciation_schedule = $asset->depreciation_schedule;
        $asset->is_fully_depreciated = $asset->isFullyDepreciated();

        return $this->sendSuccess($asset, 'Fixed asset retrieved successfully.');
    }

    /**
     * Update the specified fixed asset.
     * PUT/PATCH /api/v2/finance/fixed-assets/{id}
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|max:255',
            'subcategory' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:chart_of_accounts,id',
            'purchase_price' => 'sometimes|numeric|min:0',
            'purchase_date' => 'sometimes|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'salvage_value' => 'nullable|numeric|min:0',
            'useful_life' => 'sometimes|integer|min:1|max:100',
            'depreciation_method' => 'sometimes|in:straight_line,declining_balance,units_of_production,none',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'warranty_expiry' => 'nullable|date',
            'attachment' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $asset = FixedAsset::findOrFail($id);

        // Prevent modification if disposed
        if (in_array($asset->status, ['disposed', 'sold', 'scrapped', 'lost'])) {
            return $this->sendError('Cannot modify a disposed asset.', null, 400);
        }

        DB::beginTransaction();
        try {
            $asset->update($request->only([
                'name',
                'category',
                'subcategory',
                'location',
                'serial_number',
                'description',
                'account_id',
                'purchase_price',
                'purchase_date',
                'supplier',
                'invoice_number',
                'salvage_value',
                'useful_life',
                'depreciation_method',
                'depreciation_rate',
                'warranty_expiry',
                'attachment',
                'notes',
            ]));

            $asset->updated_by = auth()->id();

            // Recalculate depreciation
            $asset->updateDepreciation();

            DB::commit();
            return $this->sendSuccess($asset->load('account'), 'Fixed asset updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update fixed asset.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified fixed asset.
     * DELETE /api/v2/finance/fixed-assets/{id}
     */
    public function destroy($id)
    {
        $asset = FixedAsset::findOrFail($id);

        // Prevent deletion if disposed (should be archived instead)
        if (in_array($asset->status, ['disposed', 'sold', 'scrapped', 'lost'])) {
            return $this->sendError('Cannot delete a disposed asset. It should be kept for records.', null, 400);
        }

        $asset->delete();

        return $this->sendSuccess(null, 'Fixed asset deleted successfully.');
    }

    /**
     * Dispose/Sell/Scrap an asset
     * POST /api/v2/finance/fixed-assets/{id}/dispose
     */
    public function dispose(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:disposed,sold,scrapped,lost',
            'disposal_date' => 'required|date',
            'disposal_value' => 'nullable|numeric|min:0',
            'disposal_reason' => 'nullable|string',
            'disposal_reference' => 'nullable|string|max:255',
        ]);

        $asset = FixedAsset::findOrFail($id);

        if (in_array($asset->status, ['disposed', 'sold', 'scrapped', 'lost'])) {
            return $this->sendError('Asset is already disposed.', null, 400);
        }

        DB::beginTransaction();
        try {
            $asset->update([
                'status' => $request->status,
                'disposal_date' => $request->disposal_date,
                'disposal_value' => $request->disposal_value ?? 0,
                'disposal_reason' => $request->disposal_reason,
                'disposal_reference' => $request->disposal_reference,
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return $this->sendSuccess($asset->load('account'), 'Asset disposed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to dispose asset.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update depreciation for all assets (recalculate)
     * POST /api/v2/finance/fixed-assets/update-depreciation
     */
    public function updateDepreciationAll()
    {
        DB::beginTransaction();
        try {
            $assets = FixedAsset::active()->get();
            $updatedCount = 0;

            foreach ($assets as $asset) {
                $asset->updateDepreciation();
                $updatedCount++;
            }

            DB::commit();
            return $this->sendSuccess(
                ['updated_count' => $updatedCount],
                'Depreciation updated for ' . $updatedCount . ' assets.'
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update depreciation.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get asset categories
     * GET /api/v2/finance/fixed-assets/categories
     */
    public function getCategories()
    {
        $categories = FixedAsset::select('category')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('SUM(purchase_price) as total_value')
            ->groupBy('category')
            ->get();

        return $this->sendSuccess($categories, 'Asset categories retrieved successfully.');
    }

    /**
     * Get asset locations
     * GET /api/v2/finance/fixed-assets/locations
     */
    public function getLocations()
    {
        $locations = FixedAsset::select('location')
            ->selectRaw('COUNT(*) as count')
            ->whereNotNull('location')
            ->groupBy('location')
            ->get();

        return $this->sendSuccess($locations, 'Asset locations retrieved successfully.');
    }

    /**
     * Get depreciation summary
     * GET /api/v2/finance/fixed-assets/summary
     */
    public function summary(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = FixedAsset::query();

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->purchasedBetween($request->start_date, $request->end_date);
        }

        $totalAssets = $query->count();
        $activeAssets = (clone $query)->active()->count();
        $disposedAssets = (clone $query)->disposed()->count();

        $totalPurchaseValue = (clone $query)->sum('purchase_price');
        $totalAccumulatedDepreciation = (clone $query)->sum('accumulated_depreciation');
        $totalNetBookValue = (clone $query)->sum('net_book_value');

        $fullyDepreciatedCount = 0;
        foreach ((clone $query)->active()->get() as $asset) {
            if ($asset->isFullyDepreciated()) {
                $fullyDepreciatedCount++;
            }
        }

        return $this->sendSuccess([
            'total_assets' => $totalAssets,
            'active_assets' => $activeAssets,
            'disposed_assets' => $disposedAssets,
            'fully_depreciated' => $fullyDepreciatedCount,
            'total_purchase_value' => (float) $totalPurchaseValue,
            'total_accumulated_depreciation' => (float) $totalAccumulatedDepreciation,
            'total_net_book_value' => (float) $totalNetBookValue,
        ], 'Asset summary retrieved successfully.');
    }
}
