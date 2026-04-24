<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $guarded = ['id'];

    /**
     * Get a website setting by key.
     */
    public static function getWebsiteSetting(string $key, mixed $default = null): mixed
    {
        $setting = static::where('group', 'website')
            ->where('key', $key)
            ->first();

        return $setting?->value ?? $default;
    }

    /**
     * Set a website setting.
     */
    public static function setWebsiteSetting(string $key, mixed $value = null): void
    {
        static::updateOrCreate(
            [
                'group' => 'website',
                'key' => $key,
            ],
            [
                'value' => $value,
            ]
        );
    }

    /**
     * Get all website settings as key-value pairs.
     */
    public static function getWebsiteSettings(): array
    {
        return static::where('group', 'website')
            ->pluck('value', 'key')
            ->toArray();
    }

    /**
     * Update multiple website settings at once.
     */
    public static function updateWebsiteSettings(array $settings): void
    {
        foreach ($settings as $key => $value) {
            static::setWebsiteSetting($key, $value);
        }
    }
}
