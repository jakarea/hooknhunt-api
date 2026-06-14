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
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('affiliate_id')->nullable()->after('customer_id')->comment('Referred by affiliate ID');
            $table->string('affiliate_referral_code')->nullable()->after('affiliate_id')->comment('Referral code used');
            $table->unsignedBigInteger('affiliate_referral_id')->nullable()->after('affiliate_referral_code')->comment('Referral click tracking ID');
            $table->decimal('affiliate_commission_amount', 10, 2)->nullable()->after('affiliate_referral_id')->comment('Commission earned by affiliate');
            $table->decimal('affiliate_commission_rate', 5, 2)->nullable()->after('affiliate_commission_amount')->comment('Commission rate used for this order');
            $table->timestamp('affiliate_commission_calculated_at')->nullable()->after('affiliate_commission_rate')->comment('When commission was calculated');

            // Index for faster lookups
            $table->index('affiliate_id');
            $table->index('affiliate_referral_code');
            $table->index('affiliate_referral_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropIndex(['affiliate_id']);
            $table->dropIndex(['affiliate_referral_code']);
            $table->dropIndex(['affiliate_referral_id']);

            $table->dropColumn([
                'affiliate_id',
                'affiliate_referral_code',
                'affiliate_referral_id',
                'affiliate_commission_amount',
                'affiliate_commission_rate',
                'affiliate_commission_calculated_at',
            ]);
        });
    }
};
