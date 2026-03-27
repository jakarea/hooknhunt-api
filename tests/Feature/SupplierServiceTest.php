<?php

use App\Services\SupplierService;
use App\Services\Result;
use App\Models\Supplier;
use App\Models\Shipment;
use App\DTOs\CreateSupplierDTO;
use App\DTOs\UpdateSupplierDTO;
use App\DTOs\SupplierSearchDTO;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;

uses(RefreshDatabase::class)->in(__DIR__);

describe('suppliers', function () {

    // ========================================================================
    // Result Object Tests
    // ========================================================================

    test('result_success_creates_successful_result', function () {
        $result = Result::success('test value');

        expect($result->isSuccess())->toBeTrue();
        expect($result->isFailure())->toBeFalse();
        expect($result->getValue())->toBe('test value');
    });

    test('result_failure_creates_failed_result', function () {
        $result = Result::failure('error message');

        expect($result->isSuccess())->toBeFalse();
        expect($result->isFailure())->toBeTrue();
        expect($result->getError())->toBe('error message');
    });

    test('result_map_transforms_value_on_success', function () {
        $result = Result::success(5)
            ->map(fn ($value) => $value * 2);

        expect($result->getValue())->toBe(10);
    });

    test('result_map_returns_failure_on_error', function () {
        $result = Result::failure('error')
            ->map(fn ($value) => $value * 2);

        expect($result->isFailure())->toBeTrue();
    });

    test('result_flatMap_chains_results', function () {
        $result = Result::success(5)
            ->flatMap(fn ($value) => Result::success($value * 2));

        expect($result->getValue())->toBe(10);
    });

    test('result_onSuccess_executes_callback', function () {
        $executed = false;

        Result::success('test')
            ->onSuccess(function ($value) use (&$executed) {
                $executed = true;
                expect($value)->toBe('test');
            });

        expect($executed)->toBeTrue();
    });

    test('result_onFailure_executes_callback', function () {
        $executed = false;

        Result::failure('error')
            ->onFailure(function ($error) use (&$executed) {
                $executed = true;
                expect($error)->toBe('error');
            });

        expect($executed)->toBeTrue();
    });

    test('result_getValueOr_returns_default_on_failure', function () {
        $result = Result::failure('error');

        expect($result->getValueOr('default'))->toBe('default');
    });

    // ========================================================================
    // SupplierService::createSupplier Tests
    // ========================================================================

    test('create_supplier_creates_new_supplier', function () {
        $service = app(SupplierService::class);

        $dto = new CreateSupplierDTO(
            name: 'Test Supplier',
            email: 'test@example.com',
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: true,
        );

        $result = $service->createSupplier($dto);

        expect($result->isSuccess())->toBeTrue();

        $supplier = $result->getValue();
        expect($supplier->name)->toBe('Test Supplier');
        expect($supplier->email)->toBe('test@example.com');

        assertDatabaseHas('suppliers', [
            'email' => 'test@example.com',
        ]);
    });

    test('create_supplier_fails_with_duplicate_email', function () {
        $service = app(SupplierService::class);

        // Create existing supplier
        Supplier::factory()->create(['email' => 'existing@example.com']);

        $dto = new CreateSupplierDTO(
            name: 'New Supplier',
            email: 'existing@example.com', // Duplicate email
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: true,
        );

        $result = $service->createSupplier($dto);

        expect($result->isFailure())->toBeTrue();
        expect($result->getError())->toBe('Email already exists');
    });

    test('create_supplier_handles_file_uploads', function () {
        Storage::fake('public');

        $service = app(SupplierService::class);

        // Create fake files
        $wechatFile = \Illuminate\Http\UploadedFile::fake()->image('wechat.jpg');
        $alipayFile = \Illuminate\Http\UploadedFile::fake()->image('alipay.jpg');

        $dto = new CreateSupplierDTO(
            name: 'Test Supplier',
            email: 'test@example.com',
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: true,
        );

        $files = [
            'wechat_qr_file' => $wechatFile,
            'alipay_qr_file' => $alipayFile,
        ];

        $result = $service->createSupplier($dto, $files);

        expect($result->isSuccess())->toBeTrue();

        $supplier = $result->getValue();
        expect($supplier->wechat_qr_file)->not->toBeNull();
        expect($supplier->alipay_qr_file)->not->toBeNull();

        // Check files were stored
        Storage::disk('public')->assertExists($supplier->wechat_qr_file);
        Storage::disk('public')->assertExists($supplier->alipay_qr_file);
    });

    // ========================================================================
    // SupplierService::updateSupplier Tests
    // ========================================================================

    test('update_supplier_updates_existing_supplier', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create([
            'name' => 'Original Name',
            'email' => 'original@example.com',
        ]);

        $dto = new UpdateSupplierDTO(
            name: 'Updated Name',
            email: 'original@example.com', // Same email
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: true,
        );

        $result = $service->updateSupplier($supplier, $dto);

        expect($result->isSuccess())->toBeTrue();

        $updatedSupplier = $result->getValue();
        expect($updatedSupplier->name)->toBe('Updated Name');
        expect($updatedSupplier->email)->toBe('original@example.com');
    });

    test('update_supplier_fails_with_duplicate_email', function () {
        $service = app(SupplierService::class);

        // Create two suppliers
        $supplier1 = Supplier::factory()->create(['email' => 'supplier1@example.com']);
        Supplier::factory()->create(['email' => 'supplier2@example.com']);

        $dto = new UpdateSupplierDTO(
            name: 'Updated Name',
            email: 'supplier2@example.com', // Other supplier's email
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: true,
        );

        $result = $service->updateSupplier($supplier1, $dto);

        expect($result->isFailure())->toBeTrue();
        expect($result->getError())->toBe('Email already exists');
    });

    test('update_supplier_only_updates_provided_fields', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create([
            'name' => 'Original Name',
            'email' => 'test@example.com',
            'phone' => '1234567890',
        ]);

        $dto = new UpdateSupplierDTO(
            name: 'Updated Name',
            email: null, // Not updating email
            whatsapp: null,
            shopUrl: null,
            shopName: null,
            contactPerson: null,
            phone: null,
            wechatId: null,
            wechatQrFile: null,
            wechatQrUrl: null,
            alipayId: null,
            alipayQrFile: null,
            alipayQrUrl: null,
            address: null,
            isActive: null,
        );

        $result = $service->updateSupplier($supplier, $dto);

        expect($result->isSuccess())->toBeTrue();

        $updatedSupplier = $result->getValue();
        expect($updatedSupplier->name)->toBe('Updated Name');
        expect($updatedSupplier->email)->toBe('test@example.com'); // Unchanged
        expect($updatedSupplier->phone)->toBe('1234567890'); // Unchanged
    });

    // ========================================================================
    // SupplierService::deleteSupplier Tests
    // ========================================================================

    test('delete_supplier_deletes_supplier', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create();

        $result = $service->deleteSupplier($supplier);

        expect($result->isSuccess())->toBeTrue();

        assertDatabaseMissing('suppliers', [
            'id' => $supplier->id,
        ]);
    });

    test('delete_supplier_fails_with_existing_shipments', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create();

        // Create a shipment for this supplier
        Shipment::factory()->create(['supplier_id' => $supplier->id]);

        $result = $service->deleteSupplier($supplier);

        expect($result->isFailure())->toBeTrue();
        expect($result->getError())->toBe('Cannot delete supplier with existing shipments');

        // Supplier should still exist
        assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
        ]);
    });

    // ========================================================================
    // SupplierService::searchSuppliers Tests
    // ========================================================================

    test('search_suppliers_returns_paginated_results', function () {
        $service = app(SupplierService::class);

        Supplier::factory()->count(20)->create();

        $dto = new SupplierSearchDTO(
            search: null,
            isActive: null,
            page: 1,
            perPage: 15,
        );

        $result = $service->searchSuppliers($dto);

        expect($result->isSuccess())->toBeTrue();

        $paginator = $result->getValue();
        expect($paginator)->total()->toBe(20);
        expect($paginator)->count()->toBe(15);
    });

    test('search_suppliers_filters_by_search_term', function () {
        $service = app(SupplierService::class);

        Supplier::factory()->create(['name' => 'ABC Supplier']);
        Supplier::factory()->create(['name' => 'XYZ Supplier']);
        Supplier::factory()->create(['shop_name' => 'ABC Shop']);

        $dto = new SupplierSearchDTO(
            search: 'ABC',
            isActive: null,
            page: 1,
            perPage: 15,
        );

        $result = $service->searchSuppliers($dto);

        expect($result->isSuccess())->toBeTrue();

        $paginator = $result->getValue();
        expect($paginator)->count()->toBe(2); // ABC Supplier and ABC Shop
    });

    test('search_suppliers_filters_by_status', function () {
        $service = app(SupplierService::class);

        Supplier::factory()->create(['is_active' => true]);
        Supplier::factory()->create(['is_active' => false]);
        Supplier::factory()->create(['is_active' => true]);

        $dto = new SupplierSearchDTO(
            search: null,
            isActive: true,
            page: 1,
            perPage: 15,
        );

        $result = $service->searchSuppliers($dto);

        expect($result->isSuccess())->toBeTrue();

        $paginator = $result->getValue();
        expect($paginator)->count()->toBe(2);
    });

    // ========================================================================
    // SupplierService::getDropdownList Tests
    // ========================================================================

    test('get_dropdown_list_returns_active_suppliers', function () {
        $service = app(SupplierService::class);

        Supplier::factory()->create(['is_active' => true, 'name' => 'Active Supplier']);
        Supplier::factory()->create(['is_active' => false, 'name' => 'Inactive Supplier']);

        $result = $service->getDropdownList();

        expect($result->isSuccess())->toBeTrue();

        $suppliers = $result->getValue();
        expect($suppliers)->count()->toBe(1);
        expect($suppliers->first()->name)->toBe('Active Supplier');
    });

    // ========================================================================
    // SupplierService::toggleStatus Tests
    // ========================================================================

    test('toggle_status_toggles_supplier_status', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create(['is_active' => true]);

        $result = $service->toggleStatus($supplier);

        expect($result->isSuccess())->toBeTrue();

        $updatedSupplier = $result->getValue();
        expect($updatedSupplier->is_active)->toBe(0); // SQLite returns 0/1 for booleans
    });

    // ========================================================================
    // SupplierService::getLedger Tests
    // ========================================================================

    test('get_ledger_returns_placeholder_data', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create();

        $result = $service->getLedger($supplier);

        expect($result->isSuccess())->toBeTrue();

        $ledger = $result->getValue();
        expect($ledger)->toHaveKey('supplier');
        expect($ledger)->toHaveKey('total_purchase');
        expect($ledger)->toHaveKey('total_paid');
        expect($ledger)->toHaveKey('due_amount');
        expect($ledger)->toHaveKey('transactions');
    });

    // ========================================================================
    // SupplierService::getPurchaseHistory Tests
    // ========================================================================

    test('get_purchase_history_returns_shipments', function () {
        $service = app(SupplierService::class);

        $supplier = Supplier::factory()->create();

        // Create shipments
        Shipment::factory()->count(3)->create(['supplier_id' => $supplier->id]);

        $result = $service->getPurchaseHistory($supplier);

        expect($result->isSuccess())->toBeTrue();

        $history = $result->getValue();
        expect($history)->toHaveKey('supplier');
        expect($history)->toHaveKey('history');

        expect($history['history']->total())->toBe(3);
    });

});
