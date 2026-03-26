<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\ApiResponse; // Added trait for consistency if used elsewhere, or just return json
use Illuminate\Http\Request;

class SettingController extends Controller
{
    // Grouped settings for Admin Panel
    public function index()
    {
        // Return as Grouped JSON: { 'general': [...], 'courier': [...] }
        return Setting::all()->groupBy('group');
    }

    // Bulk Update
    public function update(Request $request)
    {
        // Expecting: { "settings": [ {"key": "site_name", "value": "My Shop"} ] }
        $request->validate([
            'settings' => 'required|array'
        ]);

        foreach ($request->settings as $item) {
            // Update existing or create if not exists (safer)
            Setting::updateOrCreate(
                ['key' => $item['key']],
                [
                    'value' => $item['value'],
                    'group' => $item['group'] ?? 'general' // Default group if missing
                ]
            );
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    // Public Settings (No Auth required)
    public function publicSettings()
    {
        return Setting::whereIn('key', ['site_name', 'site_logo', 'currency_symbol'])
                      ->pluck('value', 'key');
    }
}