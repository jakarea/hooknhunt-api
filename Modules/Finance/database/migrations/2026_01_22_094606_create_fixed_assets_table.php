<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();

            // Asset Information
            $table->string('name')->comment('Asset name/title');
            $table->string('asset_code')->unique()->comment('Unique asset code/number');
            $table->string('serial_number')->nullable()->comment('Serial number if applicable');
            $table->text('description')->nullable()->comment('Asset description');

            // Category & Classification
            $table->string('category')->comment('e.g., Furniture, Equipment, Vehicle, Computer');
            $table->string('subcategory')->nullable()->comment('e.g., Office Chair, Laptop, Delivery Van');
            $table->string('location')->nullable()->comment('Asset location/department');

            // Financial Details
            $table->foreignId('account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete()->comment('Linked chart of account');
            $table->decimal('purchase_price', 15, 2)->default(0)->comment('Original purchase cost');
            $table->date('purchase_date')->comment('Date of purchase/acquisition');
            $table->string('supplier')->nullable()->comment('Vendor/supplier name');
            $table->string('invoice_number')->nullable()->comment('Purchase invoice/reference');
            $table->decimal('salvage_value', 15, 2)->default(0)->comment('Residual value at end of useful life');
            $table->integer('useful_life')->comment('Useful life in years');

            // Depreciation Details
            $table->enum('depreciation_method', ['straight_line', 'declining_balance', 'units_of_production', 'none'])
                  ->default('straight_line')
                  ->comment('Depreciation calculation method');
            $table->decimal('depreciation_rate', 5, 2)->default(0)->comment('Annual depreciation rate %');
            $table->decimal('accumulated_depreciation', 15, 2)->default(0)->comment('Total depreciation to date');
            $table->decimal('net_book_value', 15, 2)->default(0)->comment('Current book value (cost - accumulated depreciation)');

            // Status & Disposal
            $table->enum('status', ['active', 'disposed', 'sold', 'scrapped', 'lost'])
                  ->default('active')
                  ->comment('Current asset status');
            $table->date('disposal_date')->nullable()->comment('Date when asset was disposed');
            $table->decimal('disposal_value', 15, 2)->nullable()->comment('Sale/scrap value at disposal');
            $table->text('disposal_reason')->nullable()->comment('Reason for disposal');
            $table->string('disposal_reference')->nullable()->comment('Reference document for disposal');

            // Maintenance & Warranty
            $table->date('warranty_expiry')->nullable()->comment('Warranty expiration date');
            $table->text('maintenance_notes')->nullable()->comment('Maintenance history/notes');

            // Attachment & Notes
            $table->string('attachment')->nullable()->comment('Invoice/document attachment');
            $table->text('notes')->nullable()->comment('Additional notes');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('category');
            $table->index('status');
            $table->index('purchase_date');
            $table->index('depreciation_method');
            $table->index(['category', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fixed_assets');
    }
};
