<?php

use App\Repositories\SupplierRepository;
use App\Models\Supplier;
use App\Models\Shipment;
use App\DTOs\SupplierSearchDTO;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertDatabaseMissing;
use function Pest\Laravel\assertModelMissing;

uses(RefreshDatabase::class)->in(__DIR__);

describe('suppliers', function () {

    // ========================================================================
    // SupplierRepository::find Tests
    // ========================================================================

    test('find_returns_supplier_when_exists', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        $found = $repository->find($supplier->id);

        expect($found)->not->toBeNull();
        expect($found->id)->toBe($supplier->id);
        expect($found->name)->toBe($supplier->name);
    });

    test('find_returns_null_when_not_exists', function () {
        $repository = app(SupplierRepository::class);

        $found = $repository->find(999);

        expect($found)->toBeNull();
    });

    test('find_or_fail_throws_exception_when_not_exists', function () {
        $repository = app(SupplierRepository::class);

        expect(fn() => $repository->findOrFail(999))
            ->toThrow(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
    });

    test('find_or_fail_returns_supplier_when_exists', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        $found = $repository->findOrFail($supplier->id);

        expect($found)->toBeInstanceOf(Supplier::class);
        expect($found->id)->toBe($supplier->id);
    });

    // ========================================================================
    // SupplierRepository::create Tests
    // ========================================================================

    test('create_creates_new_supplier', function () {
        $repository = app(SupplierRepository::class);

        $data = [
            'name' => 'Test Supplier',
            'email' => 'test@example.com',
            'phone' => '1234567890',
            'is_active' => true,
        ];

        $supplier = $repository->create($data);

        expect($supplier)->toBeInstanceOf(Supplier::class);
        expect($supplier->name)->toBe('Test Supplier');
        expect($supplier->email)->toBe('test@example.com');

        assertDatabaseHas('suppliers', [
            'email' => 'test@example.com',
        ]);
    });

    // ========================================================================
    // SupplierRepository::update Tests
    // ========================================================================

    test('update_updates_supplier', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create(['name' => 'Original Name']);

        $updated = $repository->update($supplier, ['name' => 'Updated Name']);

        expect($updated)->toBeTrue();

        $fresh = $supplier->fresh();
        expect($fresh->name)->toBe('Updated Name');
    });

    // ========================================================================
    // SupplierRepository::delete Tests
    // ========================================================================

    test('delete_deletes_supplier', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        $deleted = $repository->delete($supplier);

        expect($deleted)->toBeTrue();

        assertDatabaseMissing('suppliers', [
            'id' => $supplier->id,
        ]);
    });

    // ========================================================================
    // SupplierRepository::emailExists Tests
    // ========================================================================

    test('email_exists_returns_true_when_exists', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['email' => 'existing@example.com']);

        $exists = $repository->emailExists('existing@example.com');

        expect($exists)->toBeTrue();
    });

    test('email_exists_returns_false_when_not_exists', function () {
        $repository = app(SupplierRepository::class);

        $exists = $repository->emailExists('nonexistent@example.com');

        expect($exists)->toBeFalse();
    });

    test('email_exists_excludes_id_when_provided', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create(['email' => 'test@example.com']);

        $exists = $repository->emailExists('test@example.com', $supplier->id);

        expect($exists)->toBeFalse(); // Should not count the supplier itself
    });

    // ========================================================================
    // SupplierRepository::search Tests
    // ========================================================================

    test('search_returns_paginated_results', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->count(20)->create();

        $dto = new SupplierSearchDTO(
            search: null,
            isActive: null,
            page: 1,
            perPage: 15,
        );

        $results = $repository->search($dto);

        expect($results)->toBeInstanceOf(\Illuminate\Pagination\LengthAwarePaginator::class);
        expect($results->total())->toBe(20);
        expect($results->count())->toBe(15);
    });

    test('search_filters_by_name', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['name' => 'ABC Supplier']);
        Supplier::factory()->create(['name' => 'XYZ Supplier']);
        Supplier::factory()->create(['shop_name' => 'ABC Shop']);

        $dto = new SupplierSearchDTO(
            search: 'ABC',
            isActive: null,
            page: 1,
            perPage: 15,
        );

        $results = $repository->search($dto);

        expect($results->count())->toBe(2); // ABC Supplier and ABC Shop
    });

    test('search_filters_by_status', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['is_active' => true]);
        Supplier::factory()->create(['is_active' => false]);
        Supplier::factory()->create(['is_active' => true]);

        $dto = new SupplierSearchDTO(
            search: null,
            isActive: true,
            page: 1,
            perPage: 15,
        );

        $results = $repository->search($dto);

        expect($results->count())->toBe(2);
    });

    test('search_combines_filters', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['name' => 'Active ABC', 'is_active' => true]);
        Supplier::factory()->create(['name' => 'Inactive ABC', 'is_active' => false]);
        Supplier::factory()->create(['name' => 'Active XYZ', 'is_active' => true]);

        $dto = new SupplierSearchDTO(
            search: 'ABC',
            isActive: true,
            page: 1,
            perPage: 15,
        );

        $results = $repository->search($dto);

        expect($results->count())->toBe(1); // Only Active ABC
        expect($results->first()->name)->toBe('Active ABC');
    });

    // ========================================================================
    // SupplierRepository::getActiveForDropdown Tests
    // ========================================================================

    test('get_active_for_dropdown_returns_only_active', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['is_active' => true, 'name' => 'Active Supplier']);
        Supplier::factory()->create(['is_active' => false, 'name' => 'Inactive Supplier']);

        $results = $repository->getActiveForDropdown();

        expect($results)->toHaveCount(1);
        expect($results->first()->name)->toBe('Active Supplier');
    });

    test('get_active_for_dropdown_returns_correct_fields', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->create(['is_active' => true]);

        $results = $repository->getActiveForDropdown();

        $supplier = $results->first();
        expect($supplier->toArray())->toHaveKeys(['id', 'name', 'shop_name']);
    });

    // ========================================================================
    // SupplierRepository::hasShipments Tests
    // ========================================================================

    test('has_shipments_returns_true_when_has_shipments', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        // Create a shipment for this supplier
        Shipment::factory()->create(['supplier_id' => $supplier->id]);

        $hasShipments = $repository->hasShipments($supplier);

        expect($hasShipments)->toBeTrue();
    });

    test('has_shipments_returns_false_when_no_shipments', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        $hasShipments = $repository->hasShipments($supplier);

        expect($hasShipments)->toBeFalse();
    });

    // ========================================================================
    // SupplierRepository::getShipments Tests
    // ========================================================================

    test('get_shipments_returns_supplier_shipments', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        // Create shipments
        Shipment::factory()->count(3)->create(['supplier_id' => $supplier->id]);

        $shipments = $repository->getShipments($supplier, 15);

        expect($shipments)->toBeInstanceOf(\Illuminate\Pagination\LengthAwarePaginator::class);
        expect($shipments->total())->toBe(3);
    });

    test('get_shipments_includes_items_count', function () {
        $repository = app(SupplierRepository::class);
        $supplier = Supplier::factory()->create();

        Shipment::factory()->create(['supplier_id' => $supplier->id]);

        $shipments = $repository->getShipments($supplier, 15);

        $shipment = $shipments->first();
        expect($shipment)->items_count->toBeGreaterThanOrEqual(0);
    });

    // ========================================================================
    // SupplierRepository::all Tests
    // ========================================================================

    test('all_returns_all_suppliers', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->count(5)->create();

        $all = $repository->all();

        expect($all)->toHaveCount(5);
    });

    // ========================================================================
    // SupplierRepository::count Tests
    // ========================================================================

    test('count_returns_total_suppliers', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->count(7)->create();

        $count = $repository->count();

        expect($count)->toBe(7);
    });

    // ========================================================================
    // SupplierRepository::countActive Tests
    // ========================================================================

    test('count_active_returns_only_active_suppliers', function () {
        $repository = app(SupplierRepository::class);
        Supplier::factory()->count(5)->create(['is_active' => true]);
        Supplier::factory()->count(3)->create(['is_active' => false]);

        $count = $repository->countActive();

        expect($count)->toBe(5);
    });

});
