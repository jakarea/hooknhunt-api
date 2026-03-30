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
        Schema::table('staff_profiles', function (Blueprint $table) {
            // National ID (current) - stores old versions in history
            $table->foreignId('national_id')->nullable()->after('profile_photo_id')->constrained('media_files')->onDelete('set null');
            $table->json('national_id_history')->nullable()->after('national_id');

            // Photo history - stores old profile_photo_id versions
            $table->json('photo_history')->nullable()->after('national_id_history');

            // Resume (can be replaced, no history needed)
            $table->foreignId('resume')->nullable()->after('photo_history')->constrained('media_files')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropForeign(['national_id']);
            $table->dropForeign(['resume']);
            $table->dropColumn(['national_id', 'national_id_history', 'photo_history', 'resume']);
        });
    }
};
