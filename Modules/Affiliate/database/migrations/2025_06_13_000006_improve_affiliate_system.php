<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ====================================================
        // 1. IMPROVE affiliate_referrals TABLE
        // ====================================================
        Schema::table('affiliate_referrals', function (Blueprint $table) {
            // Add customer identification
            $table->foreignId('customer_id')->nullable()->after('id')->constrained('users')->onDelete('set null');
            $table->string('customer_name')->nullable()->after('customer_id');
            $table->string('customer_email')->nullable()->after('customer_name');

            // Add composite indexes for performance
            $table->index(['affiliate_id', 'status', 'clicked_at'], 'idx_affiliate_status_clicked');
            $table->index(['affiliate_id', 'converted_at'], 'idx_affiliate_converted');
            $table->index(['referral_code', 'status'], 'idx_referral_status');
            $table->index(['customer_id'], 'idx_customer');
        });

        // ====================================================
        // 2. IMPROVE affiliate_earnings TABLE
        // ====================================================
        Schema::table('affiliate_earnings', function (Blueprint $table) {
            // Add customer info for better display
            $table->foreignId('customer_id')->nullable()->after('affiliate_id')->constrained('users')->onDelete('set null');
            $table->string('customer_name')->nullable()->after('customer_id');
            $table->string('customer_email')->nullable()->after('customer_name');
            $table->string('order_invoice')->nullable()->after('sales_order_id');

            // Add composite index for faster queries
            $table->index(['affiliate_id', 'status', 'created_at'], 'idx_affiliate_status_created');
            $table->index(['customer_id'], 'idx_earnings_customer');
        });

        // ====================================================
        // 3. IMPROVE affiliates TABLE
        // ====================================================
        Schema::table('affiliates', function (Blueprint $table) {
            // Add approval workflow fields
            $table->text('rejection_reason')->nullable()->after('is_approved');
            $table->text('admin_notes')->nullable()->after('rejection_reason');
            $table->timestamp('approved_at')->nullable()->after('admin_notes');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null')->after('approved_at');
        });

        // ====================================================
        // 4. IMPROVE affiliate_payouts TABLE (add indexes)
        // ====================================================
        Schema::table('affiliate_payouts', function (Blueprint $table) {
            $table->index(['affiliate_id', 'status', 'created_at'], 'idx_affiliate_payout_status_created');
        });

        // ====================================================
        // 5. ADD PRIORITY TO COMMISSION TABLES
        // ====================================================
        Schema::table('affiliate_product_commissions', function (Blueprint $table) {
            $table->integer('priority')->default(0)->after('is_active');
        });

        Schema::table('affiliate_category_commissions', function (Blueprint $table) {
            $table->integer('priority')->default(0)->after('is_active');
        });

        // ====================================================
        // 6. NEW TABLE: affiliate_marketing_materials
        // ====================================================
        Schema::create('affiliate_marketing_materials', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // "Summer Sale Banner 728x90"
            $table->string('type'); // 'banner', 'social_image', 'text_link', 'video'
            $table->string('size')->nullable(); // '728x90', '300x250', '1200x630'
            $table->string('file_url'); // CDN URL
            $table->string('thumbnail_url')->nullable(); // For gallery view
            $table->text('embed_code')->nullable(); // HTML embed code
            $table->text('description')->nullable(); // Usage instructions
            $table->boolean('is_active')->default(true);
            $table->integer('download_count')->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Indexes
            $table->index(['type', 'is_active']);
            $table->index('sort_order');
        });

        // ====================================================
        // 7. NEW TABLE: affiliate_clicks_analytics (OPTIONAL)
        // ====================================================
        Schema::create('affiliate_clicks_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained('affiliates')->onDelete('cascade');
            $table->foreignId('referral_id')->nullable()->constrained('affiliate_referrals')->onDelete('set null');
            $table->string('referral_code', 50);
            $table->string('ip_address', 45)->nullable();
            $table->string('device_type', 20)->nullable(); // 'desktop', 'mobile', 'tablet'
            $table->string('browser', 50)->nullable(); // 'chrome', 'firefox', 'safari'
            $table->string('os', 50)->nullable(); // 'windows', 'mac', 'ios', 'android'
            $table->string('country_code', 2)->nullable(); // 'BD', 'US', 'UK'
            $table->string('city')->nullable();
            $table->string('landing_page', 500)->nullable();
            $table->string('source')->nullable(); // 'facebook', 'twitter', 'email', 'direct'
            $table->string('campaign')->nullable(); // 'summer_sale_2024'
            $table->string('utm_medium')->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->timestamp('clicked_at')->useCurrent();

            // Indexes for analytics queries
            $table->index(['affiliate_id', 'clicked_at'], 'idx_affiliate_clicked_at');
            $table->index(['referral_code', 'clicked_at']);
            $table->index(['country_code', 'clicked_at']);
            $table->index(['device_type', 'clicked_at']);
            $table->index(['source', 'clicked_at']);
        });

        // ====================================================
        // 8. NEW TABLE: affiliate_settings (OPTIONAL)
        // ====================================================
        Schema::create('affiliate_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained('affiliates')->onDelete('cascade');

            // Notification preferences
            $table->string('notification_email')->default('same');
            $table->boolean('email_on_conversion')->default(true);
            $table->boolean('email_on_payout')->default(true);
            $table->boolean('email_on_approval')->default(true);
            $table->boolean('email_on_rejection')->default(true);
            $table->boolean('sms_notifications')->default(false);

            // Payout preferences
            $table->string('default_payout_method')->nullable(); // 'bank_transfer', 'bkash', etc
            $table->text('default_payout_details')->nullable(); // Bank account or mobile number

            // Social links
            $table->json('social_links')->nullable(); // {facebook: "...", twitter: "...", instagram: "..."}

            // Marketing preferences
            $table->boolean('auto_generate_referral_links')->default(true);
            $table->text('bio')->nullable(); // Affiliate bio for public profile

            $table->timestamps();

            // One settings record per affiliate
            $table->unique('affiliate_id');
        });
    }

    public function down(): void
    {
        // Drop new tables (in reverse order)
        Schema::dropIfExists('affiliate_settings');
        Schema::dropIfExists('affiliate_clicks_analytics');
        Schema::dropIfExists('affiliate_marketing_materials');

        // Remove priority from commission tables
        Schema::table('affiliate_product_commissions', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
        Schema::table('affiliate_category_commissions', function (Blueprint $table) {
            $table->dropColumn('priority');
        });

        // Remove indexes from affiliate_payouts
        Schema::table('affiliate_payouts', function (Blueprint $table) {
            $table->dropIndex('idx_affiliate_payout_status_created');
        });

        // Revert affiliates table
        Schema::table('affiliates', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['rejection_reason', 'admin_notes', 'approved_at', 'approved_by']);
        });

        // Revert affiliate_earnings table
        Schema::table('affiliate_earnings', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropIndex('idx_affiliate_status_created');
            $table->dropIndex('idx_earnings_customer');
            $table->dropColumn(['customer_id', 'customer_name', 'customer_email', 'order_invoice']);
        });

        // Revert affiliate_referrals table
        Schema::table('affiliate_referrals', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropIndex('idx_affiliate_status_clicked');
            $table->dropIndex('idx_affiliate_converted');
            $table->dropIndex('idx_referral_status');
            $table->dropIndex('idx_customer');
            $table->dropColumn(['customer_id', 'customer_name', 'customer_email']);
        });
    }
};
