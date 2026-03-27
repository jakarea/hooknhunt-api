<?php

namespace App\Repositories;

use App\Models\Supplier;
use App\Models\Shipment;
use App\DTOs\SupplierSearchDTO;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Repository for Supplier data access.
 *
 * This repository handles all database operations for suppliers,
 * providing a clean abstraction layer between the service and the database.
 */
class SupplierRepository implements SupplierRepositoryInterface
{
    /**
     * {@inheritdoc}
     */
    public function find(int $id): ?Supplier
    {
        return Supplier::find($id);
    }

    /**
     * {@inheritdoc}
     */
    public function findOrFail(int $id): Supplier
    {
        return Supplier::findOrFail($id);
    }

    /**
     * {@inheritdoc}
     */
    public function create(array $data): Supplier
    {
        return Supplier::create($data);
    }

    /**
     * {@inheritdoc}
     */
    public function update(Supplier $supplier, array $data): bool
    {
        return $supplier->update($data);
    }

    /**
     * {@inheritdoc}
     */
    public function delete(Supplier $supplier): bool
    {
        return $supplier->delete();
    }

    /**
     * {@inheritdoc}
     */
    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        $query = Supplier::where('email', $email);

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
        $query = Supplier::latest();

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
        return Supplier::where('is_active', true)
            ->select('id', 'name', 'shop_name')
            ->orderBy('name')
            ->get();
    }

    /**
     * {@inheritdoc}
     */
    public function hasShipments(Supplier $supplier): bool
    {
        return $supplier->shipments()->exists();
    }

    /**
     * {@inheritdoc}
     */
    public function getShipments(Supplier $supplier, int $perPage = 20): LengthAwarePaginator
    {
        return $supplier->shipments()
            ->withCount('items')
            ->latest()
            ->paginate($perPage);
    }

    /**
     * {@inheritdoc}
     */
    public function all(): Collection
    {
        return Supplier::latest()->get();
    }

    /**
     * {@inheritdoc}
     */
    public function count(): int
    {
        return Supplier::count();
    }

    /**
     * {@inheritdoc}
     */
    public function countActive(): int
    {
        return Supplier::where('is_active', true)->count();
    }
}
