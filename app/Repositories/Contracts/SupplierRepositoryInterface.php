<?php

namespace App\Repositories\Contracts;

use App\Models\Supplier;
use App\DTOs\SupplierSearchDTO;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Interface for Supplier repository.
 *
 * Defines the contract for supplier data access operations.
 * This allows for easy mocking in tests and potential swapping of implementations.
 */
interface SupplierRepositoryInterface
{
    /**
     * Find a supplier by ID.
     *
     * @param int $id
     * @return Supplier|null
     */
    public function find(int $id): ?Supplier;

    /**
     * Find a supplier by ID or throw exception.
     *
     * @param int $id
     * @return Supplier
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function findOrFail(int $id): Supplier;

    /**
     * Create a new supplier.
     *
     * @param array $data
     * @return Supplier
     */
    public function create(array $data): Supplier;

    /**
     * Update an existing supplier.
     *
     * @param Supplier $supplier
     * @param array $data
     * @return bool
     */
    public function update(Supplier $supplier, array $data): bool;

    /**
     * Delete a supplier.
     *
     * @param Supplier $supplier
     * @return bool
     */
    public function delete(Supplier $supplier): bool;

    /**
     * Check if email exists for a supplier.
     *
     * @param string $email
     * @param int|null $excludeId
     * @return bool
     */
    public function emailExists(string $email, ?int $excludeId = null): bool;

    /**
     * Search suppliers with filters.
     *
     * @param SupplierSearchDTO $dto
     * @return LengthAwarePaginator
     */
    public function search(SupplierSearchDTO $dto): LengthAwarePaginator;

    /**
     * Get active suppliers for dropdown.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getActiveForDropdown(): \Illuminate\Database\Eloquent\Collection;

    /**
     * Check if supplier has any shipments.
     *
     * @param Supplier $supplier
     * @return bool
     */
    public function hasShipments(Supplier $supplier): bool;

    /**
     * Get supplier's shipments.
     *
     * @param Supplier $supplier
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getShipments(Supplier $supplier, int $perPage = 20): LengthAwarePaginator;

    /**
     * Get all suppliers.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function all(): \Illuminate\Database\Eloquent\Collection;

    /**
     * Count total suppliers.
     *
     * @return int
     */
    public function count(): int;

    /**
     * Count active suppliers.
     *
     * @return int
     */
    public function countActive(): int;
}
