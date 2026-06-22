<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            // Drop old unique constraints
            $table->dropUnique('unique_variant_slug_channel');
            $table->dropUnique('unique_variant_name_per_product_channel');
        });

        // Add new unique constraints using raw SQL that ignores soft-deleted rows
        // MySQL 8.0.13+ supports this syntax
        DB::statement('
            ALTER TABLE product_variants
            ADD CONSTRAINT unique_variant_slug_channel_active
            UNIQUE (variant_slug, channel, deleted_at)
        ');

        DB::statement('
            ALTER TABLE product_variants
            ADD CONSTRAINT unique_variant_name_per_product_channel_active
            UNIQUE (product_id, variant_name, channel, deleted_at)
        ');
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('unique_variant_slug_channel_active');
            $table->dropUnique('unique_variant_name_per_product_channel_active');

            // Restore old constraints
            $table->unique(['variant_slug', 'channel'], 'unique_variant_slug_channel');
            $table->unique(['product_id', 'variant_name', 'channel'], 'unique_variant_name_per_product_channel');
        });
    }
};
