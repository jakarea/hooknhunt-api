<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class CatalogPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Catalog module permissions based on ProductController, CategoryController,
     * BrandController, AttributeController, PricingController, and DiscountController.
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Catalog',
                'modules' => [
                    [
                        'name' => 'Products',
                        'permissions' => [
                            ['label' => 'View Products', 'key' => 'catalog_products_view', 'slug' => 'catalog.products.index'],
                            ['label' => 'Create Product', 'key' => 'catalog_products_create', 'slug' => 'catalog.products.create'],
                            ['label' => 'Edit Product', 'key' => 'catalog_products_edit', 'slug' => 'catalog.products.edit'],
                            ['label' => 'Delete Product', 'key' => 'catalog_products_delete', 'slug' => 'catalog.products.delete'],
                            ['label' => 'Duplicate Product', 'key' => 'catalog_products_duplicate', 'slug' => 'catalog.products.duplicate'],
                            ['label' => 'Update Product Status', 'key' => 'catalog_products_status', 'slug' => 'catalog.products.status'],
                            ['label' => 'Generate SKU', 'key' => 'catalog_products_generate_sku', 'slug' => 'catalog.products.generate-sku'],
                            ['label' => 'Add Product Variant', 'key' => 'catalog_products_variant_create', 'slug' => 'catalog.products.variants.create'],
                        ],
                    ],
                    [
                        'name' => 'Categories',
                        'permissions' => [
                            ['label' => 'View Categories', 'key' => 'catalog_categories_view', 'slug' => 'catalog.categories.index'],
                            ['label' => 'Create Category', 'key' => 'catalog_categories_create', 'slug' => 'catalog.categories.create'],
                            ['label' => 'Edit Category', 'key' => 'catalog_categories_edit', 'slug' => 'catalog.categories.edit'],
                            ['label' => 'Delete Category', 'key' => 'catalog_categories_delete', 'slug' => 'catalog.categories.delete'],
                            ['label' => 'View Category Tree', 'key' => 'catalog_categories_tree', 'slug' => 'catalog.categories.tree'],
                        ],
                    ],
                    [
                        'name' => 'Brands',
                        'permissions' => [
                            ['label' => 'View Brands', 'key' => 'catalog_brands_view', 'slug' => 'catalog.brands.index'],
                            ['label' => 'Create Brand', 'key' => 'catalog_brands_create', 'slug' => 'catalog.brands.create'],
                            ['label' => 'Edit Brand', 'key' => 'catalog_brands_edit', 'slug' => 'catalog.brands.edit'],
                            ['label' => 'Delete Brand', 'key' => 'catalog_brands_delete', 'slug' => 'catalog.brands.delete'],
                        ],
                    ],
                    [
                        'name' => 'Attributes',
                        'permissions' => [
                            ['label' => 'View Attributes', 'key' => 'catalog_attributes_view', 'slug' => 'catalog.attributes.index'],
                            ['label' => 'Create Attribute', 'key' => 'catalog_attributes_create', 'slug' => 'catalog.attributes.create'],
                            ['label' => 'Edit Attribute', 'key' => 'catalog_attributes_edit', 'slug' => 'catalog.attributes.edit'],
                            ['label' => 'Delete Attribute', 'key' => 'catalog_attributes_delete', 'slug' => 'catalog.attributes.delete'],
                        ],
                    ],
                    [
                        'name' => 'Pricing',
                        'permissions' => [
                            ['label' => 'View Pricing', 'key' => 'catalog_pricing_view', 'slug' => 'catalog.pricing.index'],
                            ['label' => 'Update Prices', 'key' => 'catalog_pricing_update', 'slug' => 'catalog.pricing.update'],
                            ['label' => 'Set Channel Price', 'key' => 'catalog_pricing_channel_price', 'slug' => 'catalog.pricing.channel-price'],
                        ],
                    ],
                    [
                        'name' => 'Discounts',
                        'permissions' => [
                            ['label' => 'View Discounts', 'key' => 'catalog_discounts_view', 'slug' => 'catalog.discounts.index'],
                            ['label' => 'Create Discount', 'key' => 'catalog_discounts_create', 'slug' => 'catalog.discounts.create'],
                            ['label' => 'Edit Discount', 'key' => 'catalog_discounts_edit', 'slug' => 'catalog.discounts.edit'],
                            ['label' => 'Delete Discount', 'key' => 'catalog_discounts_delete', 'slug' => 'catalog.discounts.delete'],
                            ['label' => 'Bulk Generate Discounts', 'key' => 'catalog_discounts_bulk_generate', 'slug' => 'catalog.discounts.bulk-generate'],
                            ['label' => 'Check Discount Validity', 'key' => 'catalog_discounts_check_validity', 'slug' => 'catalog.discounts.check-validity'],
                            ['label' => 'Toggle Discount Status', 'key' => 'catalog_discounts_toggle_status', 'slug' => 'catalog.discounts.toggle-status'],
                        ],
                    ],
                ],
            ],
        ];

        $count = 0;
        foreach ($permissions as $groupData) {
            $groupName = $groupData['group'];

            foreach ($groupData['modules'] as $moduleData) {
                $moduleName = $moduleData['name'];

                foreach ($moduleData['permissions'] as $permData) {
                    Permission::updateOrCreate(
                        ['slug' => $permData['slug']],
                        [
                            'name' => $permData['label'],
                            'key' => $permData['key'] ?? null,
                            'slug' => $permData['slug'] ?? null,
                            'group_name' => $groupName,
                            'module_name' => $moduleName,
                        ]
                    );
                    $count++;
                }
            }
        }

        $this->command->info("Seeded {$count} Catalog permissions.");
    }
}
