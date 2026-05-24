<?php

namespace App\Modules\Procurement\Repositories;

use App\Modules\Procurement\Models\Supplier;
use App\Modules\Procurement\DTOs\SupplierSearchDTO;
use App\Modules\Procurement\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Repository for \App\Modules\Procurement\Models\Supplier data access.
 *
 * This repository handles all database operations for suppliers,
 * providing a clean abstraction layer between the service and the database.
 */
class SupplierRepository implements SupplierRepositoryInterface
{
    /**
     * {@inheritdoc}
     */
    public function find(int $id): ?\App\Modules\Procurement\Models\Supplier
    {
        return \App\Modules\Procurement\Models\Supplier::find($id);
    }

    /**
     * {@inheritdoc}
     */
    public function findOrFail(int $id): \App\Modules\Procurement\Models\Supplier
    {
        return \App\Modules\Procurement\Models\Supplier::findOrFail($id);
    }

    /**
     * {@inheritdoc}
     */
    public function create(array $data): \App\Modules\Procurement\Models\Supplier
    {
        return \App\Modules\Procurement\Models\Supplier::create($data);
    }

    /**
     * {@inheritdoc}
     */
    public function update(\App\Modules\Procurement\Models\Supplier $supplier, array $data): bool
    {
        return $supplier->update($data);
    }

    /**
     * {@inheritdoc}
     */
    public function delete(\App\Modules\Procurement\Models\Supplier $supplier): bool
    {
        return $supplier->delete();
    }

    /**
     * {@inheritdoc}
     */
    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        $query = \App\Modules\Procurement\Models\Supplier::where('email', $email);

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * {@inheritdoc}
     */
    public function search(SupplierSearchDTO $dto): LengthAwarePaginator
    {
        $query = \App\Modules\Procurement\Models\Supplier::latest();

        // Apply search filter
        if ($dto->search) {
            $searchTerm = '%' . $dto->search . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', $searchTerm)
                  ->orWhere('shop_name', 'like', $searchTerm);
            });
        }

        // Apply status filter
        if ($dto->isActive !== null) {
            $query->where('is_active', $dto->isActive);
        }

        // Return paginated results
        return $query->paginate($dto->perPage, ['*'], 'page', $dto->page);
    }

    /**
     * {@inheritdoc}
     */
    public function getActiveForDropdown(): Collection
    {
        return \App\Modules\Procurement\Models\Supplier::where('is_active', true)
            ->select('id', 'name', 'shop_name')
            ->orderBy('name')
            ->get();
    }

    /**
     * {@inheritdoc}
     */
    public function hasShipments(\App\Modules\Procurement\Models\Supplier $supplier): bool
    {
        // Use direct database access for module independence
        return DB::table('shipments')
            ->where('supplier_id', $supplier->id)
            ->exists();
    }

    /**
     * {@inheritdoc}
     */
    public function getShipments(\App\Modules\Procurement\Models\Supplier $supplier, int $perPage = 20): LengthAwarePaginator
    {
        // Use direct database access for module independence
        // Need to paginate manually since we're using direct DB access
        $query = DB::table('shipments')
            ->leftJoin('shipment_items as si', 'shipments.id', '=', 'si.shipment_id')
            ->where('shipments.supplier_id', $supplier->id)
            ->select('shipments.*', DB::raw('COUNT(si.id) as items_count'))
            ->groupBy('shipments.id')
            ->orderBy('shipments.created_at', 'desc');

        $total = $query->count();
        $page = LengthAwarePaginator::resolveCurrentPage();
        $perPage = $perPage;
        $results = $query
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return new LengthAwarePaginator(
            $results,
            $total,
            $perPage,
            $page
        );
    }

    /**
     * {@inheritdoc}
     */
    public function all(): Collection
    {
        return \App\Modules\Procurement\Models\Supplier::latest()->get();
    }

    /**
     * {@inheritdoc}
     */
    public function count(): int
    {
        return \App\Modules\Procurement\Models\Supplier::count();
    }

    /**
     * {@inheritdoc}
     */
    public function countActive(): int
    {
        return \App\Modules\Procurement\Models\Supplier::where('is_active', true)->count();
    }
}
