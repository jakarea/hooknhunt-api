<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class WebsiteSettingsSeeder extends Seeder
{
    /**
     * Seed website tracking settings.
     */
    public function run(): void
    {
        $settings = [
            // Facebook Tracking
            [
                'group' => 'website',
                'key' => 'facebook_pixel_id',
                'value' => null,
            ],
            [
                'group' => 'website',
                'key' => 'facebook_pixel_code',
                'value' => null,
            ],
            // Google Analytics
            [
                'group' => 'website',
                'key' => 'google_analytics_id',
                'value' => null,
            ],
            [
                'group' => 'website',
                'key' => 'google_analytics_code',
                'value' => null,
            ],
            // Google Tag Manager
            [
                'group' => 'website',
                'key' => 'google_tag_manager_id',
                'value' => null,
            ],
            [
                'group' => 'website',
                'key' => 'google_tag_manager_code',
                'value' => null,
            ],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(
                [
                    'group' => $setting['group'],
                    'key' => $setting['key'],
                ],
                [
                    'value' => $setting['value'],
                ]
            );
        }
    }
}
