<?php

/**
 * ============================================================
 * DELETE TEST PRODUCTS - LARAVEL SCRIPT
 * ============================================================
 * Run this script via: php artisan tinker
 * Then paste the entire contents of this file
 *
 * Or save as a command and run: php artisan products:delete-test
 * ============================================================
 */

// Test product IDs to delete
$testProductIds = [290, 279, 278, 275, 258, 257, 256];

echo "=== DELETE TEST PRODUCTS SCRIPT ===\n";
echo "Product IDs to delete: " . implode(', ', $testProductIds) . "\n\n";

// Start database transaction
DB::beginTransaction();

try {
    // ============================================================
    // STEP 1: SHOW WHAT WILL BE DELETED (Preview)
    // ============================================================
    echo "=== PREVIEW: PRODUCTS TO BE DELETED ===\n";
    $products = DB::table('products')
        ->whereIn('id', $testProductIds)
        ->get(['id', 'name', 'slug', 'created_at']);

    foreach ($products as $product) {
        echo "  ID: {$product->id} | Name: {$product->name} | Slug: {$product->slug}\n";
    }

    echo "\n=== PREVIEW: VARIANTS TO BE DELETED ===\n";
    $variantCount = DB::table('product_variants')
        ->whereIn('product_id', $testProductIds)
        ->count();
    echo "  Total variants: {$variantCount}\n";

    echo "\n=== PREVIEW: ATTRIBUTE RELATIONSHIPS TO BE DELETED ===\n";
    $attrCount = DB::table('attribute_product')
        ->whereIn('product_id', $testProductIds)
        ->count();
    echo "  Total attribute relationships: {$attrCount}\n";

    // ============================================================
    // STEP 2: PERMANENT DELETION
    // ============================================================
    echo "\n=== STARTING DELETION ===\n";

    // 2.1 Delete product variants
    echo "Deleting product variants...\n";
    $deletedVariants = DB::table('product_variants')
        ->whereIn('product_id', $testProductIds)
        ->delete();
    echo "  Deleted: {$deletedVariants} variants\n";

    // 2.2 Delete attribute relationships
    echo "Deleting attribute relationships...\n";
    $deletedAttrs = DB::table('attribute_product')
        ->whereIn('product_id', $testProductIds)
        ->delete();
    echo "  Deleted: {$deletedAttrs} attribute relationships\n";

    // 2.3 Delete product_supplier relationships (if table exists)
    if (Schema::hasTable('product_supplier')) {
        echo "Deleting product_supplier relationships...\n";
        $deletedSuppliers = DB::table('product_supplier')
            ->whereIn('product_id', $testProductIds)
            ->delete();
        echo "  Deleted: {$deletedSuppliers} supplier relationships\n";
    }

    // 2.4 Delete product_affiliate_commissions (if table exists)
    if (Schema::hasTable('product_affiliate_commissions')) {
        echo "Deleting product_affiliate_commissions...\n";
        $deletedCommissions = DB::table('product_affiliate_commissions')
            ->whereIn('product_id', $testProductIds)
            ->delete();
        echo "  Deleted: {$deletedCommissions} commission records\n";
    }

    // 2.5 Delete product_channel_settings (if table exists)
    if (Schema::hasTable('product_channel_settings')) {
        echo "Deleting product_channel_settings...\n";
        $deletedSettings = DB::table('product_channel_settings')
            ->whereIn('product_id', $testProductIds)
            ->delete();
        echo "  Deleted: {$deletedSettings} channel settings\n";
    }

    // 2.6 Force delete products (bypass soft-delete)
    echo "Force deleting products (permanent)...\n";
    $deletedProducts = DB::table('products')
        ->whereIn('id', $testProductIds)
        ->delete();
    echo "  Deleted: {$deletedProducts} products\n";

    // ============================================================
    // STEP 3: VERIFICATION
    // ============================================================
    echo "\n=== VERIFICATION ===\n";
    $remaining = DB::table('products')
        ->whereIn('id', $testProductIds)
        ->count();

    if ($remaining === 0) {
        echo "✓ SUCCESS: All test products have been permanently deleted.\n";
        echo "✓ Remaining test products in database: 0\n";

        // Commit transaction
        DB::commit();
        echo "\n✓ Transaction committed. Changes are permanent.\n";
    } else {
        echo "✗ WARNING: {$remaining} test products still exist!\n";
        DB::rollBack();
        echo "\n✗ Transaction rolled back. No changes were made.\n";
    }

    echo "\n=== SUMMARY ===\n";
    echo "Variants deleted: {$deletedVariants}\n";
    echo "Attribute relationships deleted: {$deletedAttrs}\n";
    echo "Products permanently deleted: {$deletedProducts}\n";

} catch (\Exception $e) {
    echo "\n✗ ERROR: " . $e->getMessage() . "\n";
    DB::rollBack();
    echo "✗ Transaction rolled back due to error.\n";
}

echo "\n=== END OF SCRIPT ===\n";
