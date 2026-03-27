<?php

namespace App\Services;

use App\Models\Supplier;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use App\DTOs\CreateSupplierDTO;
use App\DTOs\UpdateSupplierDTO;
use App\DTOs\SupplierSearchDTO;
use App\Events\Supplier\SupplierCreated;
use App\Events\Supplier\SupplierUpdated;
use App\Events\Supplier\SupplierDeleted;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;

/**
 * Service layer for Supplier business logic.
 *
 * This service handles all business operations related to suppliers,
 * following the Railway Oriented Programming pattern with Result objects.
 * It uses a repository for data access, maintaining clean separation of concerns.
 */
class SupplierService
{
    public function __construct(
        private SupplierRepositoryInterface $repository
    ) {}

    /**
     * Create a new supplier.
     *
     * @param CreateSupplierDTO $dto
     * @param array $files File uploads (wechat_qr_file, alipay_qr_file)
     * @return Result<Supplier, string>
     */
    public function createSupplier(CreateSupplierDTO $dto, array $files = []): Result
    {
        try {
            // Business rule: Check email uniqueness
            if ($this->repository->emailExists($dto->email)) {
                return Result::failure('Email already exists');
            }

            // Prepare data
            $data = $dto->toArray();

            // Handle file uploads
            $data = $this->processFileUploads($data, $files);

            // Create supplier via repository
            $supplier = $this->repository->create($data);

            // Dispatch event (async listeners won't block response)
            Event::dispatch(new SupplierCreated($supplier));

            return Result::success($supplier);
        } catch (\Exception $e) {
            return Result::failure('Failed to create supplier: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing supplier.
     *
     * @param Supplier $supplier
     * @param UpdateSupplierDTO $dto
     * @param array $files File uploads (wechat_qr_file, alipay_qr_file)
     * @return Result<Supplier, string>
     */
    public function updateSupplier(Supplier $supplier, UpdateSupplierDTO $dto, array $files = []): Result
    {
        try {
            // Business rule: Check email uniqueness (excluding current supplier)
            if ($dto->email && $this->repository->emailExists($dto->email, $supplier->id)) {
                return Result::failure('Email already exists');
            }

            // Track changes before update
            $original = $supplier->toArray();
            $data = $dto->toArray();
            $changes = [];

            foreach ($data as $key => $value) {
                if (isset($original[$key]) && $original[$key] != $value) {
                    $changes[$key] = [
                        'old' => $original[$key],
                        'new' => $value,
                    ];
                }
            }

            // Handle file uploads
            $data = $this->processFileUploads($data, $files);

            // Update supplier via repository
            $this->repository->update($supplier, $data);

            // Dispatch event with changes (async listeners won't block response)
            Event::dispatch(new SupplierUpdated($supplier->fresh(), $changes));

            return Result::success($supplier->fresh());
        } catch (\Exception $e) {
            return Result::failure('Failed to update supplier: ' . $e->getMessage());
        }
    }

    /**
     * Delete a supplier.
     *
     * @param Supplier $supplier
     * @return Result<true, string>
     */
    public function deleteSupplier(Supplier $supplier): Result
    {
        try {
            // Business rule: Check if supplier has any related records
            if ($this->repository->hasShipments($supplier)) {
                return Result::failure('Cannot delete supplier with existing shipments');
            }

            // Store supplier data before deletion for event
            $supplierId = $supplier->id;
            $supplierCopy = clone $supplier;

            // Delete supplier via repository
            $this->repository->delete($supplier);

            // Dispatch event (async listeners won't block response)
            Event::dispatch(new SupplierDeleted($supplierCopy, $supplierId));

            return Result::success(true);
        } catch (\Exception $e) {
            return Result::failure('Failed to delete supplier: ' . $e->getMessage());
        }
    }

    /**
     * Search suppliers with filters.
     *
     * @param SupplierSearchDTO $dto
     * @return Result<\Illuminate\Pagination\LengthAwarePaginator, string>
     */
    public function searchSuppliers(SupplierSearchDTO $dto): Result
    {
        try {
            // Delegate to repository
            $results = $this->repository->search($dto);

            return Result::success($results);
        } catch (\Exception $e) {
            return Result::failure('Failed to search suppliers: ' . $e->getMessage());
        }
    }

    /**
     * Get supplier for dropdown (active only).
     *
     * @return Result<\Illuminate\Database\Eloquent\Collection, string>
     */
    public function getDropdownList(): Result
    {
        try {
            // Delegate to repository
            $suppliers = $this->repository->getActiveForDropdown();

            return Result::success($suppliers);
        } catch (\Exception $e) {
            return Result::failure('Failed to get supplier list: ' . $e->getMessage());
        }
    }

    /**
     * Toggle supplier active status.
     *
     * @param Supplier $supplier
     * @return Result<Supplier, string>
     */
    public function toggleStatus(Supplier $supplier): Result
    {
        try {
            // Business logic: Toggle the status
            $this->repository->update($supplier, [
                'is_active' => !$supplier->is_active
            ]);

            return Result::success($supplier->fresh());
        } catch (\Exception $e) {
            return Result::failure('Failed to toggle status: ' . $e->getMessage());
        }
    }

    /**
     * Get supplier ledger (transaction history).
     * TODO: Implement fully in Batch 9 (Accounting)
     *
     * @param Supplier $supplier
     * @return Result<array, string>
     */
    public function getLedger(Supplier $supplier): Result
    {
        try {
            // Placeholder for now
            return Result::success([
                'supplier' => $supplier->name,
                'total_purchase' => 0,
                'total_paid' => 0,
                'due_amount' => 0,
                'transactions' => []
            ]);
        } catch (\Exception $e) {
            return Result::failure('Failed to get ledger: ' . $e->getMessage());
        }
    }

    /**
     * Get supplier purchase history (shipments).
     *
     * @param Supplier $supplier
     * @param int $perPage
     * @return Result<array, string>
     */
    public function getPurchaseHistory(Supplier $supplier, int $perPage = 20): Result
    {
        try {
            // Delegate to repository
            $shipments = $this->repository->getShipments($supplier, $perPage);

            return Result::success([
                'supplier' => $supplier->name,
                'history' => $shipments
            ]);
        } catch (\Exception $e) {
            return Result::failure('Failed to get purchase history: ' . $e->getMessage());
        }
    }

    /**
     * Process file uploads for supplier.
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    private function processFileUploads(array $data, array $files): array
    {
        // Handle WeChat QR code
        if (isset($files['wechat_qr_file']) && $files['wechat_qr_file'] instanceof UploadedFile) {
            $data['wechat_qr_file'] = $files['wechat_qr_file']
                ->store('wechat_qr_codes', 'public');
        }

        // Handle Alipay QR code
        if (isset($files['alipay_qr_file']) && $files['alipay_qr_file'] instanceof UploadedFile) {
            $data['alipay_qr_file'] = $files['alipay_qr_file']
                ->store('alipay_qr_codes', 'public');
        }

        return $data;
    }
}
