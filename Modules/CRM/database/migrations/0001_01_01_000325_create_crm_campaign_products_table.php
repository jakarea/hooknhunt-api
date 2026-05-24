<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_campaign_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_campaign_id')->constrained('crm_campaigns')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('offer_price', 10, 2);
            $table->decimal('regular_price_at_time', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_campaign_products');
    }
};
