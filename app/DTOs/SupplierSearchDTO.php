<?php

namespace App\DTOs;

/**
 * Data Transfer Object for searching/filtering suppliers.
 *
 * This DTO ensures type safety and predictable data flow
 * from controller to repository layer.
 */
class SupplierSearchDTO
{
    public function __construct(
        public readonly ?string $search,
        public readonly ?bool $isActive,
        public readonly int $page = 1,
        public readonly int $perPage = 15,
    ) {}

    /**
     * Create DTO from request data.
     *
     * @param array $data Request data
     * @return self
     */
    public static function fromRequest(array $data): self
    {
        return new self(
            search: $data['search'] ?? null,
            isActive: isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : null,
            page: (int) ($data['page'] ?? 1),
            perPage: (int) ($data['per_page'] ?? 15),
        );
    }

    /**
     * Convert DTO to array for query builder.
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'search' => $this->search,
            'is_active' => $this->isActive,
            'page' => $this->page,
            'per_page' => $this->perPage,
        ];
    }
}
