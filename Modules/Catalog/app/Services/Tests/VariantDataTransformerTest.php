<?php

namespace App\Modules\Catalog\Services\Tests;

use App\Modules\Catalog\Services\VariantDataTransformer;
use PHPUnit\Framework\TestCase;

/**
 * Test suite for VariantDataTransformer pure function
 * Verifies: field mapping, decimal rounding, null handling
 */
class VariantDataTransformerTest extends TestCase
{
    /**
     * Test roundPrice is deprecated - prices are now integers
     * This test verifies backward compatibility
     */
    public function test_roundPrice_still_exists()
    {
        // For backward compatibility, roundPrice still exists but returns integers
        $result = VariantDataTransformer::roundPrice(100.1234);
        $this->assertIsFloat($result);
    }

    /**
     * Test transformVariantData converts camelCase to snake_case
     * Prices are converted to integers (no fractions per user requirement)
     */
    public function test_transformVariantData_field_mapping()
    {
        $input = [
            'sellerSku' => 'SKU-123',
            'variantName' => 'Blue Large',
            'retailPrice' => '100.1234',
            'retailOfferPrice' => '90.5678',
            'purchaseCost' => '45.999',
        ];

        $result = VariantDataTransformer::transformVariantData($input);

        // Verify field names are mapped correctly to actual database fields
        $this->assertArrayHasKey('sku', $result);
        $this->assertArrayHasKey('variant_name', $result);
        $this->assertArrayHasKey('price', $result);
        $this->assertArrayHasKey('offer_price', $result);
        $this->assertArrayHasKey('purchase_cost', $result);

        // Verify values - prices are converted to integers
        $this->assertSame('SKU-123', $result['sku']);
        $this->assertSame('Blue Large', $result['variant_name']);
        $this->assertSame(100, $result['price']);        // Rounded to integer
        $this->assertSame(91, $result['offer_price']);   // Rounded to integer
        $this->assertSame(46, $result['purchase_cost']); // Rounded to integer
    }

    /**
     * Test transformVariantData accepts snake_case input
     * Prices are converted to integers
     */
    public function test_transformVariantData_accepts_snake_case()
    {
        $input = [
            'sku' => 'SKU-123',
            'variant_name' => 'Red Medium',
            'price' => '75.5',
            'offer_price' => '65.3',
            'purchase_cost' => '30.1',
        ];

        $result = VariantDataTransformer::transformVariantData($input);

        // Should process snake_case input the same way as camelCase
        $this->assertSame('SKU-123', $result['sku']);
        $this->assertSame('Red Medium', $result['variant_name']);
        $this->assertSame(76, $result['price']);         // Rounded to integer
        $this->assertSame(65, $result['offer_price']);   // Rounded to integer
        $this->assertSame(30, $result['purchase_cost']); // Rounded to integer
    }

    /**
     * Test transformVariantForCreate adds safe defaults
     */
    public function test_transformVariantForCreate_adds_defaults()
    {
        $input = [
            'variantName' => 'Green Small',
            'retailPrice' => '55.5',
        ];

        $result = VariantDataTransformer::transformVariantForCreate($input);

        // Verify defaults are added
        $this->assertArrayHasKey('sku', $result);
        $this->assertNotEmpty($result['sku']);

        $this->assertArrayHasKey('variant_name', $result);
        $this->assertSame('Green Small', $result['variant_name']);

        $this->assertArrayHasKey('moq', $result);
        $this->assertSame(1, $result['moq']);

        $this->assertArrayHasKey('stock', $result);
        $this->assertSame(0, $result['stock']);
    }

    /**
     * Test transformVariantForUpdate filters null values
     * This prevents overwriting existing data during partial updates
     * Prices are integers
     */
    public function test_transformVariantForUpdate_filters_nulls()
    {
        $input = [
            'variantName' => 'Updated Name',
            'retailPrice' => '150.25',
            'retailOfferPrice' => null, // Not changing offer price
            'purchaseCost' => '', // Empty string should become null
        ];

        $result = VariantDataTransformer::transformVariantForUpdate($input);

        // Verify provided values are included (prices as integers)
        $this->assertSame('Updated Name', $result['variant_name']);
        $this->assertSame(150, $result['price']);

        // Verify null values are filtered out
        $this->assertArrayNotHasKey('offer_price', $result);
        $this->assertArrayNotHasKey('purchase_cost', $result);
    }

    /**
     * Test transformVariantForUpdate with partial price update
     * This is the critical scenario that was broken before
     * Prices are integers
     */
    public function test_transformVariantForUpdate_partial_prices()
    {
        // Simulating update where only retail_price is being changed
        $input = [
            'retailPrice' => '200.50', // Updating this
            // Not sending retailOfferPrice - should NOT default to 0
            // Not sending purchaseCost - should NOT default to 0
        ];

        $result = VariantDataTransformer::transformVariantForUpdate($input);

        // Only the provided field should be in the result (as integer)
        $this->assertSame(201, $result['price']);
        $this->assertArrayNotHasKey('offer_price', $result);
        $this->assertArrayNotHasKey('purchase_cost', $result);
    }

    /**
     * Test numeric field handling
     */
    public function test_numeric_fields_are_converted()
    {
        $input = [
            'stock' => '100',
            'wholesale_moq' => '5',
            'weight' => '2.5',
        ];

        $result = VariantDataTransformer::transformVariantData($input);

        // Numeric fields should be converted to float
        $this->assertIsFloat($result['stock']);
        $this->assertSame(100.0, $result['stock']);

        $this->assertIsFloat($result['moq']);
        $this->assertSame(5.0, $result['moq']);

        $this->assertIsFloat($result['weight']);
        $this->assertSame(2.5, $result['weight']);
    }

    /**
     * Test validateVariantData checks required fields for CREATE
     */
    public function test_validateVariantData_create_validation()
    {
        $validData = [
            'variantName' => 'Test',
            'retailPrice' => '100',
            'stock' => '10',
        ];

        $errors = VariantDataTransformer::validateVariantData($validData, true);
        $this->assertEmpty($errors);

        // Missing price
        $noPriceData = [
            'variantName' => 'Test',
            'stock' => '10',
        ];
        $errors = VariantDataTransformer::validateVariantData($noPriceData, true);
        $this->assertNotEmpty($errors);
    }

    /**
     * Test edge case: both camelCase and snake_case provided
     * First match in fieldMapping wins (retailPrice comes before price)
     * Prices are integers
     */
    public function test_both_formats_provided_camelcase_priority()
    {
        $input = [
            'retailPrice' => '100.25', // camelCase
            'price' => '200.75', // snake_case
        ];

        $result = VariantDataTransformer::transformVariantData($input);

        // retailPrice comes first in fieldMapping, so it should be used (rounded to integer)
        $this->assertSame(100, $result['price']);
    }
}
