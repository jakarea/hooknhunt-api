<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->date('dob')->nullable(); // Merged from modification
            $table->text('address')->nullable();
            $table->string('division')->nullable();
            $table->string('district')->nullable();
            $table->string('thana')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable(); // Merged from modification
            $table->string('source')->default('website');
            $table->string('medium')->nullable();
            $table->string('referral_code')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->string('preferred_language', 10)->default('en');
            $table->string('preferred_currency', 3)->default('BDT');
            $table->boolean('marketing_consent')->default(false);
            $table->boolean('do_not_contact')->default(false);
            $table->enum('type', ['retail', 'wholesale'])->default('retail');
            $table->string('trade_license_no')->nullable();
            $table->string('tax_id')->nullable();
            $table->enum('loyalty_tier', ['bronze', 'silver', 'gold', 'platinum'])->default('bronze');
            $table->unsignedInteger('loyalty_points')->default(0);
            $table->decimal('lifetime_value', 12, 2)->default(0);
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->decimal('avg_order_value', 10, 2)->default(0);
            $table->dateTime('last_order_date')->nullable();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('loyalty_tier');
            $table->index('source');
            $table->index('total_spent');
            $table->softDeletes(); // Soft delete - no data loss
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_profiles');
    }
};
