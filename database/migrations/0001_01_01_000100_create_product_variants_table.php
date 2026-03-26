<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('variant_slug')->unique();
            $table->enum('channel', ['retail', 'wholesale', 'daraz', 'pos']);
            $table->string('sku')->unique();
            $table->string('custom_sku')->nullable();
            $table->string('variant_name')->nullable();
            $table->string('size')->nullable();
            $table->string('color')->nullable();
            $table->string('material')->nullable();
            $table->string('weight')->nullable();
            $table->string('pattern')->nullable();
            $table->foreignId('unit_id')->nullable()->constrained('units');
            $table->decimal('unit_value', 8, 2)->default(1);
            $table->decimal('purchase_cost', 15, 2)->default(0);
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('offer_price', 15, 2)->default(0);
            $table->date('offer_starts')->nullable();
            $table->date('offer_ends')->nullable();
            $table->integer('stock_alert_level')->default(5);
            $table->integer('allow_preorder')->default(false);
            $table->date('expected_delivery')->nullable();
            $table->integer('moq')->default(1);
            $table->boolean('is_active')->default(true);
            $table->unique(['product_id', 'variant_name', 'channel'], 'unique_variant_name_per_product_channel');
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
