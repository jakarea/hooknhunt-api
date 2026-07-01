<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add payment link fields for admin-generated payment links.
     * These fields track:
     * - Unique token for shareable payment link
     * - Custom amount (may differ from order total for partial payments)
     * - Expiry time (7 days default)
     */
    public function up(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            // Unique token for payment link (e.g., abc123def456)
            $table->string('payment_link_token')->nullable()->unique()->after('eps_response');

            // Custom amount for link (may be less than order total for partial payment)
            $table->decimal('link_amount', 12, 2)->nullable()->after('payment_link_token');

            // When the payment link expires (7 days from creation)
            $table->timestamp('link_expires_at')->nullable()->after('link_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropUnique(['payment_link_token']);
            $table->dropColumn(['payment_link_token', 'link_amount', 'link_expires_at']);
        });
    }
};
