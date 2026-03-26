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
        // Create purchase_orders table
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number')->nullable()->unique(); // Format: PO-202511-15 (nullable for creation)
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('restrict');
            $table->decimal('exchange_rate', 10, 2)->nullable(); // CNY to BDT exchange rate
            $table->date('order_date'); // Order creation date
            $table->date('expected_date')->nullable(); // Expected delivery date
            $table->decimal('total_amount', 15, 2)->default(0); // Total amount in RMB

            // Refund fields (added 2026-02-19)
            $table->decimal('refund_amount', 10, 2)->default(0)->after('total_amount'); // Total refund in BDT
            $table->string('credit_note_number')->nullable()->after('refund_amount'); // Credit note number
            $table->boolean('refund_auto_credited')->default(false)->after('credit_note_number'); // Auto or manual
            $table->timestamp('refunded_at')->nullable()->after('refund_auto_credited'); // Refund timestamp
            $table->text('receiving_notes')->nullable()->after('refunded_at'); // Lost/received notes

            // Status with partially_completed option (added 2026-02-21)
            $table->enum('status', [
                'draft',
                'payment_confirmed',
                'supplier_dispatched',
                'warehouse_received',
                'shipped_bd',
                'arrived_bd',
                'in_transit_bogura',
                'received_hub',
                'partially_completed', // Added 2026-02-21
                'completed',
                'lost'
            ])->default('draft')->after('receiving_notes');

            // Payment fields (added 2026-02-22)
            $table->foreignId('payment_account_id')
                ->nullable()
                ->after('status')
                ->constrained('banks')
                ->nullOnDelete();
            $table->decimal('payment_amount', 10, 2)->nullable()->after('payment_account_id'); // Total payment in BDT
            $table->decimal('supplier_credit_used', 10, 2)->default(0)->after('payment_amount'); // From supplier credit
            $table->decimal('bank_payment_amount', 10, 2)->nullable()->after('supplier_credit_used'); // From bank
            $table->foreignId('journal_entry_id')
                ->nullable()
                ->after('bank_payment_amount')
                ->constrained('journal_entries')
                ->nullOnDelete();

            // Tracking fields
            $table->string('courier_name')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('lot_number')->nullable();

            // Shipping fields
            $table->string('shipping_method')->nullable();
            $table->decimal('total_shipping_cost', 10, 2)->default(0)->after('shipping_method'); // Added 2026-02-21
            $table->decimal('shipping_cost', 15, 2)->nullable()->default(0); // Legacy field (use total_shipping_cost)
            $table->decimal('total_weight', 10, 2)->nullable();
            $table->decimal('extra_cost_global', 15, 2)->nullable()->default(0); // Additional costs
            $table->string('bd_courier_tracking')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index('po_number');
            $table->index('supplier_id');
            $table->index('status');
            $table->index('order_date');
        });

        // Create purchase_order_items table
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->string('po_number'); // Foreign key reference to purchase_orders.po_number
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('set null');
            $table->foreignId('inventory_batch_id')->nullable()->constrained('inventory_batches')->onDelete('set null');

            // Price fields
            $table->decimal('china_price', 10, 2)->default(0); // Unit price in RMB
            $table->integer('quantity')->default(0); // Ordered quantity
            $table->decimal('bd_price', 10, 2)->nullable(); // Unit price in BDT (renamed from unit_price)
            $table->decimal('total_price', 10, 2)->default(0); // china_price * quantity (precision changed from 15,2)

            // Weight fields
            $table->decimal('unit_weight', 10, 2)->nullable(); // Weight per unit in kg
            $table->decimal('extra_weight', 10, 2)->default(0); // Extra weight for packaging (default added)

            // Quantity tracking (defaults added)
            $table->integer('received_quantity')->default(0); // Quantity received at warehouse
            $table->integer('stocked_quantity')->default(0); // Quantity stocked in inventory
            $table->integer('lost_quantity')->default(0); // Quantity lost (added 2026-02-18)
            $table->decimal('lost_item_price', 10, 2)->default(0); // Price of lost items (added 2026-02-18, precision changed from 15,2)

            // Cost tracking
            $table->decimal('shipping_cost', 10, 2)->default(0); // Shipping cost for this item (added 2026-02-18, precision changed from 15,2)
            $table->decimal('shipping_cost_per_kg', 10, 2)->nullable(); // Shipping cost per kg (added 2026-02-24)
            $table->decimal('final_unit_cost', 10, 2)->nullable(); // Final landed cost per unit in BDT

            $table->timestamps();

            // Foreign key constraint to purchase_orders
            $table->foreign('po_number')->references('po_number')->on('purchase_orders')->onDelete('cascade');

            // Indexes
            $table->index('po_number');
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
