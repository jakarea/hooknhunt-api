<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Decode HTML entities from tracking code fields that were stored as &#039; instead of '
        $trackingFields = [
            'website_facebook_pixel_code',
            'website_google_analytics_code',
            'website_google_tag_manager_code',
        ];

        DB::table('settings')
            ->whereIn('key', $trackingFields)
            ->get()
            ->each(function ($setting) {
                if ($setting->value) {
                    $decoded = htmlspecialchars_decode($setting->value, ENT_QUOTES | ENT_HTML5);
                    DB::table('settings')
                        ->where('key', $setting->key)
                        ->update(['value' => $decoded]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not reversible - the decoded values are the correct state
    }
};
