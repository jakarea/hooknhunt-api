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
        // Change thumbnail_id to bigint unsigned to match media_files.id
        Schema::table('product_variants', function (Blueprint $table) {
            $table->bigInteger('thumbnail_id')->unsigned()->nullable()->change();
        });

        // Add foreign key constraint
        Schema::table('product_variants', function (Blueprint $table) {
            $table->foreign('thumbnail_id')
                  ->references('id')
                  ->on('media_files')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropForeign(['thumbnail_id']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->integer('thumbnail_id')->unsigned()->nullable()->change();
        });
    }
};
