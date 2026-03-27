<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Services\SupplierService;
use App\DTOs\CreateSupplierDTO;
use App\DTOs\UpdateSupplierDTO;
use App\DTOs\SupplierSearchDTO;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    use ApiResponse;

    public function __construct(
        private SupplierService $supplierService
    ) {}

    /**
     * List suppliers with optional search and filtering.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // ✅ TOP 1%: Use DTO for predictable data flow
        $searchDTO = SupplierSearchDTO::fromRequest($request->all());

        // ✅ TOP 1%: Delegate to service layer
        $result = $this->supplierService->searchSuppliers($searchDTO);

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue());
    }

    /**
     * Dropdown List (ID & Name Only) for active suppliers.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function dropdown()
    {
        $result = $this->supplierService->getDropdownList();

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue());
    }

    /**
     * Store a newly created supplier in storage.
     *
     * @param StoreSupplierRequest $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(StoreSupplierRequest $request)
    {
        // ✅ TOP 1%: Use DTO for type safety
        $dto = CreateSupplierDTO::fromArray($request->validated());

        // ✅ TOP 1%: Delegate to service layer with Result pattern
        $result = $this->supplierService->createSupplier($dto, $request->files->all());

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue(), 'Supplier created successfully', 201);
    }

    /**
     * Display the specified supplier.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        return $this->sendSuccess(Supplier::findOrFail($id));
    }

    /**
     * Update the specified supplier in storage.
     *
     * @param UpdateSupplierRequest $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(UpdateSupplierRequest $request, $id)
    {
        // ✅ TOP 1%: Use DTO for type safety
        $dto = UpdateSupplierDTO::fromArray($request->validated());

        $supplier = Supplier::findOrFail($id);

        // ✅ TOP 1%: Delegate to service layer with Result pattern
        $result = $this->supplierService->updateSupplier($supplier, $dto, $request->files->all());

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue(), 'Supplier updated successfully');
    }

    /**
     * Remove the specified supplier from storage.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);

        // ✅ TOP 1%: Delegate to service layer with Result pattern
        $result = $this->supplierService->deleteSupplier($supplier);

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess(null, 'Supplier deleted successfully');
    }

    /**
     * Supplier Ledger (Transaction History)
     * Shipment এবং Payment এর লজিক বসলে এটি পূর্ণাঙ্গ হবে।
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function ledger($id)
    {
        $supplier = Supplier::findOrFail($id);

        // ✅ TOP 1%: Delegate to service layer
        $result = $this->supplierService->getLedger($supplier);

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue());
    }

    /**
     * Get Purchase History (Shipments) for a Supplier.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function purchaseHistory($id)
    {
        $supplier = Supplier::findOrFail($id);

        // ✅ TOP 1%: Delegate to service layer
        $result = $this->supplierService->getPurchaseHistory($supplier);

        if ($result->isFailure()) {
            return $this->sendError($result->getError());
        }

        return $this->sendSuccess($result->getValue());
    }
}
