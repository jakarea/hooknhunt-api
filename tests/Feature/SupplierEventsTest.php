<?php

use App\Events\Supplier\SupplierCreated;
use App\Events\Supplier\SupplierUpdated;
use App\Events\Supplier\SupplierDeleted;
use App\Listeners\Supplier\LogSupplierCreated;
use App\Listeners\Supplier\LogSupplierUpdated;
use App\Listeners\Supplier\LogSupplierDeleted;
use App\Models\Supplier;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->in(__DIR__);

describe('suppliers', function () {

    // ========================================================================
    // Event Tests
    // ========================================================================

    test('supplier_created_event_contains_supplier', function () {
        $supplier = Supplier::factory()->create();

        $event = new SupplierCreated($supplier);

        expect($event->supplier)->toBe($supplier);
        expect($event->supplier->id)->toBe($supplier->id);
    });

    test('supplier_updated_event_contains_supplier_and_changes', function () {
        $supplier = Supplier::factory()->create();
        $changes = [
            'name' => ['old' => 'Old Name', 'new' => 'New Name'],
            'email' => ['old' => 'old@example.com', 'new' => 'new@example.com'],
        ];

        $event = new SupplierUpdated($supplier, $changes);

        expect($event->supplier)->toBe($supplier);
        expect($event->changes)->toBe($changes);
    });

    test('supplier_updated_event_can_have_empty_changes', function () {
        $supplier = Supplier::factory()->create();

        $event = new SupplierUpdated($supplier, []);

        expect($event->supplier)->toBe($supplier);
        expect($event->changes)->toBeEmpty();
    });

    test('supplier_deleted_event_contains_supplier_and_id', function () {
        $supplier = Supplier::factory()->create(['name' => 'Deleted Supplier']);

        $event = new SupplierDeleted($supplier, $supplier->id);

        expect($event->supplier)->toBe($supplier);
        expect($event->supplier->name)->toBe('Deleted Supplier');
        expect($event->supplierId)->toBe($supplier->id);
    });

    // ========================================================================
    // Listener Tests - LogSupplierCreated
    // ========================================================================

    test('log_supplier_created_logs_supplier_info', function () {
        $supplier = Supplier::factory()->make([
            'id' => 123,
            'name' => 'Test Supplier',
            'email' => 'test@example.com',
        ]);

        $event = new SupplierCreated($supplier);
        $listener = new LogSupplierCreated();

        // Mock the Log facade
        Log::shouldReceive('info')
            ->once()
            ->with('Supplier created', \Mockery::on(function ($data) {
                return $data['supplier_id'] === 123
                    && $data['name'] === 'Test Supplier'
                    && $data['email'] === 'test@example.com'
                    && isset($data['created_by'])
                    && isset($data['created_at']);
            }));

        $listener->handle($event);
    });

    // ========================================================================
    // Listener Tests - LogSupplierUpdated
    // ========================================================================

    test('log_supplier_updated_logs_supplier_info_with_changes', function () {
        $supplier = Supplier::factory()->make([
            'id' => 456,
            'name' => 'Updated Supplier',
            'email' => 'updated@example.com',
        ]);

        $changes = [
            'name' => ['old' => 'Old Name', 'new' => 'New Name'],
            'status' => ['old' => 0, 'new' => 1],
        ];

        $event = new SupplierUpdated($supplier, $changes);
        $listener = new LogSupplierUpdated();

        // Mock the Log facade
        Log::shouldReceive('info')
            ->once()
            ->with('Supplier updated', \Mockery::on(function ($data) {
                return $data['supplier_id'] === 456
                    && $data['name'] === 'Updated Supplier'
                    && $data['changes'] === [
                        'name' => ['old' => 'Old Name', 'new' => 'New Name'],
                        'status' => ['old' => 0, 'new' => 1],
                    ]
                    && isset($data['updated_by'])
                    && isset($data['updated_at']);
            }));

        $listener->handle($event);
    });

    // ========================================================================
    // Listener Tests - LogSupplierDeleted
    // ========================================================================

    test('log_supplier_deleted_logs_supplier_info', function () {
        $supplier = Supplier::factory()->make([
            'id' => 789,
            'name' => 'Deleted Supplier',
            'email' => 'deleted@example.com',
        ]);

        $event = new SupplierDeleted($supplier, 789);
        $listener = new LogSupplierDeleted();

        // Mock the Log facade
        Log::shouldReceive('warning')
            ->once()
            ->with('Supplier deleted', \Mockery::on(function ($data) {
                return $data['supplier_id'] === 789
                    && $data['name'] === 'Deleted Supplier'
                    && $data['email'] === 'deleted@example.com'
                    && isset($data['deleted_by'])
                    && isset($data['deleted_at']);
            }));

        $listener->handle($event);
    });

    // ========================================================================
    // Integration Tests - Event Dispatching
    // ========================================================================

    test('service_dispatches_supplier_created_event', function () {
        Event::fake([SupplierCreated::class]);

        $service = app(\App\Services\SupplierService::class);
        $dto = new \App\DTOs\CreateSupplierDTO(
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

        Event::assertDispatched(SupplierCreated::class, function ($event) {
            return $event->supplier->name === 'Test Supplier';
        });
    });

    test('service_dispatches_supplier_updated_event', function () {
        Event::fake([SupplierUpdated::class]);

        $service = app(\App\Services\SupplierService::class);
        $supplier = Supplier::factory()->create(['name' => 'Original Name']);

        $dto = new \App\DTOs\UpdateSupplierDTO(
            name: 'Updated Name',
            email: null,
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

        Event::assertDispatched(SupplierUpdated::class, function ($event) {
            return $event->supplier->name === 'Updated Name'
                && isset($event->changes['name']);
        });
    });

    test('service_dispatches_supplier_deleted_event', function () {
        Event::fake([SupplierDeleted::class]);

        $service = app(\App\Services\SupplierService::class);
        $supplier = Supplier::factory()->create(['name' => 'To Be Deleted']);
        $supplierId = $supplier->id;

        $result = $service->deleteSupplier($supplier);

        expect($result->isSuccess())->toBeTrue();

        Event::assertDispatched(SupplierDeleted::class, function ($event) use ($supplierId) {
            return $event->supplierId === $supplierId
                && $event->supplier->name === 'To Be Deleted';
        });
    });

    test('service_does_not_dispatch_event_on_create_failure', function () {
        Event::fake([SupplierCreated::class]);

        $service = app(\App\Services\SupplierService::class);

        // Create supplier with duplicate email
        Supplier::factory()->create(['email' => 'existing@example.com']);

        $dto = new \App\DTOs\CreateSupplierDTO(
            name: 'Test Supplier',
            email: 'existing@example.com', // Duplicate
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
        Event::assertNotDispatched(SupplierCreated::class);
    });

    // ========================================================================
    // Event Listener Registration Tests
    // ========================================================================

    test('supplier_created_event_has_registered_listeners', function () {
        $listeners = Event::getListeners(SupplierCreated::class);
        expect($listeners)->not->toBeEmpty();
    });

    test('supplier_updated_event_has_registered_listeners', function () {
        $listeners = Event::getListeners(SupplierUpdated::class);
        expect($listeners)->not->toBeEmpty();
    });

    test('supplier_deleted_event_has_registered_listeners', function () {
        $listeners = Event::getListeners(SupplierDeleted::class);
        expect($listeners)->not->toBeEmpty();
    });

});
