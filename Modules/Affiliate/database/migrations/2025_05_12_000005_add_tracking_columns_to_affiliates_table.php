<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('affiliates', function (Blueprint $table) {
            // Add tracking columns
            $table->unsignedInteger('total_clicks')->default(0)->after('withdrawn_amount');
            $table->unsignedInteger('total_conversions')->default(0)->after('total_clicks');
            $table->timestamp('last_conversion_at')->nullable()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('affiliates', function (Blueprint $table) {
            $table->dropColumn(['total_clicks', 'total_conversions', 'last_conversion_at']);
        });
    }
};
