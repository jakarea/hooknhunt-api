<?php

namespace App\DTOs;

/**
 * Data Transfer Object for creating a new Supplier.
 *
 * This DTO ensures type safety and predictable data flow
 * from controller to service layer.
 */
class CreateSupplierDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly ?string $whatsapp,
        public readonly ?string $shopUrl,
        public readonly ?string $shopName,
        public readonly ?string $contactPerson,
        public readonly ?string $phone,
        public readonly ?string $wechatId,
        public readonly ?string $wechatQrFile,
        public readonly ?string $wechatQrUrl,
        public readonly ?string $alipayId,
        public readonly ?string $alipayQrFile,
        public readonly ?string $alipayQrUrl,
        public readonly ?string $address,
        public readonly ?bool $isActive,
    ) {}

    /**
     * Create DTO from validated request data.
     *
     * @param array $data Validated data from StoreSupplierRequest
     * @return self
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            email: $data['email'],
            whatsapp: $data['whatsapp'] ?? null,
            shopUrl: $data['shop_url'] ?? null,
            shopName: $data['shop_name'] ?? null,
            contactPerson: $data['contact_person'] ?? null,
            phone: $data['phone'] ?? null,
            wechatId: $data['wechat_id'] ?? null,
            wechatQrFile: $data['wechat_qr_file'] ?? null,
            wechatQrUrl: $data['wechat_qr_url'] ?? null,
            alipayId: $data['alipay_id'] ?? null,
            alipayQrFile: $data['alipay_qr_file'] ?? null,
            alipayQrUrl: $data['alipay_qr_url'] ?? null,
            address: $data['address'] ?? null,
            isActive: $data['is_active'] ?? null,
        );
    }

    /**
     * Convert DTO to array for database operations.
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'whatsapp' => $this->whatsapp,
            'shop_url' => $this->shopUrl,
            'shop_name' => $this->shopName,
            'contact_person' => $this->contactPerson,
            'phone' => $this->phone,
            'wechat_id' => $this->wechatId,
            'wechat_qr_file' => $this->wechatQrFile,
            'wechat_qr_url' => $this->wechatQrUrl,
            'alipay_id' => $this->alipayId,
            'alipay_qr_file' => $this->alipayQrFile,
            'alipay_qr_url' => $this->alipayQrUrl,
            'address' => $this->address,
            'is_active' => $this->isActive ?? true,
        ];
    }
}
