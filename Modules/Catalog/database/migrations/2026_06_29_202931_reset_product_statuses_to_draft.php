<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Reset all products to draft status (unpublished by default)
     */
    public function up(): void
    {
        DB::table('products')->update(['status' => 'draft']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot safely reverse - would need to know which were originally published
        // Restore from backup if needed
    }
};
