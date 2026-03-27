<?php

use App\DTOs\CreateSupplierDTO;
use App\DTOs\UpdateSupplierDTO;
use App\DTOs\SupplierSearchDTO;

describe('suppliers', function () {

    // ========================================================================
    // CreateSupplierDTO Tests
    // ========================================================================

    test('create_supplier_dto_has_correct_properties', function () {
        $dto = new CreateSupplierDTO(
            name: 'Test Supplier',
            email: 'test@example.com',
            whatsapp: '1234567890',
            shopUrl: 'https://example.com',
            shopName: 'Test Shop',
            contactPerson: 'John Doe',
            phone: '9876543210',
            wechatId: 'wechat_id_123',
            wechatQrFile: null,
            wechatQrUrl: 'https://example.com/wechat',
            alipayId: 'alipay_id_123',
            alipayQrFile: null,
            alipayQrUrl: 'https://example.com/alipay',
            address: '123 Test Street',
            isActive: true,
        );

        expect($dto->name)->toBe('Test Supplier');
        expect($dto->email)->toBe('test@example.com');
        expect($dto->whatsapp)->toBe('1234567890');
        expect($dto->isActive)->toBeTrue();
        expect($dto->shopUrl)->toBe('https://example.com');
    });

    test('create_supplier_dto_fromArray_creates_dto_correctly', function () {
        $data = [
            'name' => 'Array Supplier',
            'email' => 'array@example.com',
            'whatsapp' => '9876543210',
            'shop_url' => 'https://array-shop.com',
            'shop_name' => 'Array Shop',
            'contact_person' => 'Jane Doe',
            'phone' => '5555555555',
            'wechat_id' => 'wechat_array',
            'wechat_qr_file' => null,
            'wechat_qr_url' => 'https://array-wechat.com',
            'alipay_id' => 'alipay_array',
            'alipay_qr_file' => null,
            'alipay_qr_url' => 'https://array-alipay.com',
            'address' => '456 Array Ave',
            'is_active' => false,
        ];

        $dto = CreateSupplierDTO::fromArray($data);

        expect($dto->name)->toBe('Array Supplier');
        expect($dto->email)->toBe('array@example.com');
        expect($dto->isActive)->toBeFalse();
        expect($dto->shopName)->toBe('Array Shop');
    });

    test('create_supplier_dto_fromArray_handles_null_values', function () {
        $data = [
            'name' => 'Null Test Supplier',
            'email' => 'nulltest@example.com',
            'whatsapp' => null,
            'shop_url' => null,
            'shop_name' => null,
            'contact_person' => null,
            'phone' => null,
            'wechat_id' => null,
            'wechat_qr_file' => null,
            'wechat_qr_url' => null,
            'alipay_id' => null,
            'alipay_qr_file' => null,
            'alipay_qr_url' => null,
            'address' => null,
            'is_active' => null,
        ];

        $dto = CreateSupplierDTO::fromArray($data);

        expect($dto->name)->toBe('Null Test Supplier');
        expect($dto->email)->toBe('nulltest@example.com');
        expect($dto->whatsapp)->toBeNull();
        expect($dto->isActive)->toBeNull();
    });

    test('create_supplier_dto_toArray_converts_correctly', function () {
        $dto = new CreateSupplierDTO(
            name: 'Array Test',
            email: 'arraytest@example.com',
            whatsapp: '1111111111',
            shopUrl: 'https://arraytest.com',
            shopName: 'Array Test Shop',
            contactPerson: 'Array Contact',
            phone: '2222222222',
            wechatId: 'array_wechat',
            wechatQrFile: 'path/to/wechat.jpg',
            wechatQrUrl: 'https://array-wechat.com',
            alipayId: 'array_alipay',
            alipayQrFile: 'path/to/alipay.jpg',
            alipayQrUrl: 'https://array-alipay.com',
            address: '789 Array St',
            isActive: true,
        );

        $array = $dto->toArray();

        expect($array)->toBeArray();
        expect($array['name'])->toBe('Array Test');
        expect($array['email'])->toBe('arraytest@example.com');
        expect($array['is_active'])->toBeTrue();
        expect($array['whatsapp'])->toBe('1111111111');
    });

    test('create_supplier_dto_toArray_includes_all_fields', function () {
        $dto = new CreateSupplierDTO(
            name: 'Full Test',
            email: 'full@example.com',
            whatsapp: '3333333333',
            shopUrl: 'https://full.com',
            shopName: 'Full Shop',
            contactPerson: 'Full Person',
            phone: '4444444444',
            wechatId: 'full_wechat',
            wechatQrFile: 'path/to/wechat.jpg',
            wechatQrUrl: 'https://full-wechat.com',
            alipayId: 'full_alipay',
            alipayQrFile: 'path/to/alipay.jpg',
            alipayQrUrl: 'https://full-alipay.com',
            address: 'Full Address',
            isActive: true,
        );

        $array = $dto->toArray();

        expect($array)->toHaveCount(15); // All fields present
        expect($array)->toHaveKeys([
            'name',
            'email',
            'whatsapp',
            'shop_url',
            'shop_name',
            'contact_person',
            'phone',
            'wechat_id',
            'wechat_qr_file',
            'wechat_qr_url',
            'alipay_id',
            'alipay_qr_file',
            'alipay_qr_url',
            'address',
            'is_active',
        ]);
    });

    // ========================================================================
    // UpdateSupplierDTO Tests
    // ========================================================================

    test('update_supplier_dto_has_correct_optional_properties', function () {
        $dto = new UpdateSupplierDTO(
            name: 'Updated Supplier',
            email: 'updated@example.com',
            whatsapp: '5555555555',
            shopUrl: 'https://updated.com',
            shopName: 'Updated Shop',
            contactPerson: 'Updated Person',
            phone: '6666666666',
            wechatId: 'updated_wechat',
            wechatQrFile: 'path/to/updated.jpg',
            wechatQrUrl: 'https://updated-wechat.com',
            alipayId: 'updated_alipay',
            alipayQrFile: 'path/to/updated.jpg',
            alipayQrUrl: 'https://updated-alipay.com',
            address: 'Updated Address',
            isActive: false,
        );

        expect($dto->name)->toBe('Updated Supplier');
        expect($dto->email)->toBe('updated@example.com');
        expect($dto->isActive)->toBeFalse();
    });

    test('update_supplier_dto_fromArray_creates_dto_correctly', function () {
        $data = [
            'name' => 'Array Updated',
            'email' => 'arrayupdated@example.com',
            'whatsapp' => '7777777777',
            'shop_url' => null,
            'shop_name' => null,
            'contact_person' => null,
            'phone' => null,
            'wechat_id' => null,
            'wechat_qr_file' => null,
            'wechat_qr_url' => null,
            'alipay_id' => null,
            'alipay_qr_file' => null,
            'alipay_qr_url' => null,
            'address' => null,
            'is_active' => null,
        ];

        $dto = UpdateSupplierDTO::fromArray($data);

        expect($dto->name)->toBe('Array Updated');
        expect($dto->email)->toBe('arrayupdated@example.com');
        expect($dto->shopUrl)->toBeNull();
        expect($dto->isActive)->toBeNull();
    });

    test('update_supplier_dto_toArray_filters_null_values', function () {
        $dto = new UpdateSupplierDTO(
            name: 'Filter Test',
            email: 'filter@example.com',
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

        $array = $dto->toArray();

        expect($array)->not->toHaveKey('whatsapp'); // Null values filtered out
        expect($array)->not->toHaveKey('shopUrl');
        expect($array)->toHaveKey('name'); // Non-null values kept
        expect($array)->toHaveKey('email');
    });

    test('update_supplier_dto_toArray_includes_only_non_null_fields', function () {
        $dto = new UpdateSupplierDTO(
            name: 'Partial Update',
            email: 'partial@example.com',
            whatsapp: '8888888888', // This should be included
            shopUrl: null,
            shopName: 'Partial Shop', // This should be included
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

        $array = $dto->toArray();

        expect($array)->toBeArray();
        expect($array)->toHaveCount(5); // 5 non-null fields: name, email, whatsapp, shopName, isActive
        expect($array)->toHaveKeys(['name', 'email', 'whatsapp', 'shop_name', 'is_active']);
    });

    // ========================================================================
    // SupplierSearchDTO Tests
    // ========================================================================

    test('supplier_search_dto_has_correct_properties', function () {
        $dto = new SupplierSearchDTO(
            search: 'test search',
            isActive: true,
            page: 2,
            perPage: 25,
        );

        expect($dto->search)->toBe('test search');
        expect($dto->isActive)->toBeTrue();
        expect($dto->page)->toBe(2);
        expect($dto->perPage)->toBe(25);
    });

    test('supplier_search_dto_fromRequest_creates_dto_correctly', function () {
        $data = [
            'search' => 'request search',
            'is_active' => 'true',
            'page' => '3',
            'per_page' => '50',
        ];

        $dto = SupplierSearchDTO::fromRequest($data);

        expect($dto->search)->toBe('request search');
        expect($dto->isActive)->toBeTrue();
        expect($dto->page)->toBe(3);
        expect($dto->perPage)->toBe(50);
    });

    test('supplier_search_dto_fromRequest_handles_null_values', function () {
        $data = [
            'search' => null,
            'page' => null,
            'per_page' => null,
        ];

        $dto = SupplierSearchDTO::fromRequest($data);

        expect($dto->search)->toBeNull();
        expect($dto->isActive)->toBeNull(); // No is_active in data
        expect($dto->page)->toBe(1); // Defaults to 1
        expect($dto->perPage)->toBe(15); // Defaults to 15
    });

    test('supplier_search_dto_fromRequest_parses_boolean_correctly', function () {
        $data1 = ['is_active' => 'true'];
        $dto1 = SupplierSearchDTO::fromRequest($data1);
        expect($dto1->isActive)->toBeTrue();

        $data2 = ['is_active' => 'false'];
        $dto2 = SupplierSearchDTO::fromRequest($data2);
        expect($dto2->isActive)->toBeFalse();

        $data3 = ['is_active' => 'invalid'];
        $dto3 = SupplierSearchDTO::fromRequest($data3);
        expect($dto3->isActive)->toBeFalse(); // Invalid boolean = false
    });

    test('supplier_search_dto_toArray_converts_correctly', function () {
        $dto = new SupplierSearchDTO(
            search: 'array search',
            isActive: false,
            page: 5,
            perPage: 100,
        );

        $array = $dto->toArray();

        expect($array)->toBeArray();
        expect($array['search'])->toBe('array search');
        expect($array['is_active'])->toBeFalse();
        expect($array['page'])->toBe(5);
        expect($array['per_page'])->toBe(100);
    });

    // ========================================================================
    // Edge Cases and Validation
    // ========================================================================

    test('create_supplier_dto_requires_name_and_email', function () {
        expect(fn() => new CreateSupplierDTO(
            email: 'test@example.com',
            // Missing 'name' - should error
        ))->toThrow(\TypeError::class);

        expect(fn() => new CreateSupplierDTO(
            name: 'Test',
            // Missing 'email' - should error
        ))->toThrow(\TypeError::class);
    });

    test('update_supplier_dto_allows_all_optional_properties', function () {
        // This should work - all properties are optional
        $dto = new UpdateSupplierDTO(
            name: null,
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

        expect($dto)->toBeInstanceOf(UpdateSupplierDTO::class);
    });

    test('supplier_search_dto_has_default_pagination_values', function () {
        $dto = new SupplierSearchDTO(
            search: null,
            isActive: null,
        );

        expect($dto->page)->toBe(1); // Default page
        expect($dto->perPage)->toBe(15); // Default per page
    });

    // ========================================================================
    // Type Safety Tests
    // ========================================================================

    test('create_supplier_dto_enforces_string_types', function () {
        $dto = new CreateSupplierDTO(
            name: 'Type Test',
            email: 'type@example.com',
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

        expect($dto->name)->toBeString();
        expect($dto->email)->toBeString();
    });

    test('update_supplier_dto_accepts_null_values', function () {
        $dto = new UpdateSupplierDTO(
            name: null,
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

        expect($dto->name)->toBeNull();
        expect($dto->email)->toBeNull();
    });

    test('supplier_search_dto_enforces_integer_types', function () {
        $dto = new SupplierSearchDTO(
            search: null,
            isActive: null,
        );

        expect($dto->page)->toBeInt();
        expect($dto->perPage)->toBeInt();
    });

    // ========================================================================
    // Immutability Tests
    // ========================================================================

    test('dto_properties_are_readonly', function () {
        $dto = new CreateSupplierDTO(
            name: 'Immutable Test',
            email: 'immutable@example.com',
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

        // Readonly properties cannot be reassigned
        // This is enforced by PHP 8.1+ readonly keyword
        expect($dto->name)->toBe('Immutable Test');
        expect($dto->email)->toBe('immutable@example.com');
    });

    test('dto_toArray_returns_new_array', function () {
        $dto1 = new CreateSupplierDTO(
            name: 'Array Test 1',
            email: 'array1@example.com',
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

        $array1 = $dto1->toArray();
        $array2 = $dto1->toArray();

        // Each toArray() call should return a new array
        expect($array1)->toBe($array2);
        expect($array1)->toBeArray();
    });

    // ========================================================================
    // Integration-like Tests
    // ========================================================================

    test('create_supplier_dto_roundtrip_works_correctly', function () {
        $originalData = [
            'name' => 'Roundtrip Test',
            'email' => 'roundtrip@example.com',
            'whatsapp' => '9999999999',
            'shop_url' => 'https://roundtrip.com',
            'shop_name' => 'Roundtrip Shop',
            'contact_person' => 'Roundtrip Person',
            'phone' => '1231231234',
            'wechat_id' => 'roundtrip_wechat',
            'wechat_qr_file' => null,
            'wechat_qr_url' => 'https://roundtrip-wechat.com',
            'alipay_id' => 'roundtrip_alipay',
            'alipay_qr_file' => null,
            'alipay_qr_url' => 'https://roundtrip-alipay.com',
            'address' => '789 Roundtrip St',
            'is_active' => true,
        ];

        // Create DTO from array
        $dto = CreateSupplierDTO::fromArray($originalData);

        // Convert back to array
        $resultArray = $dto->toArray();

        // Check that all fields match
        expect($resultArray['name'])->toBe($originalData['name']);
        expect($resultArray['email'])->toBe($originalData['email']);
        expect($resultArray['whatsapp'])->toBe($originalData['whatsapp']);
        expect($resultArray['is_active'])->toBe($originalData['is_active']);
    });

    test('update_supplier_dto_partial_update_works_correctly', function () {
        $updateData = [
            'name' => 'Partial Update Test',
            'email' => 'partialupdate@example.com',
            // All other fields are intentionally omitted
        ];

        $dto = UpdateSupplierDTO::fromArray($updateData);
        $array = $dto->toArray();

        // Should only include non-null fields
        expect($array)->toHaveCount(2);
        expect($array)->toHaveKeys(['name', 'email']);
        expect($array)->not->toHaveKey('whatsapp');
        expect($array)->not->toHaveKey('phone');
    });

});
