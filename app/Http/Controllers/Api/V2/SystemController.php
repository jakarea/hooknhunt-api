<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemController extends Controller
{
    use ApiResponse;

    /**
     * Get system settings configuration.
     */
    public function getSettings(): JsonResponse
    {
        try {
            // Get common settings
            $settings = DB::table('settings')
                ->pluck('value', 'key')
                ->toArray();

            // Get system specific settings
            $systemSettings = [
                'app_name' => config('app.name'),
                'app_env' => config('app.env'),
                'app_debug' => config('app.debug'),
                'app_url' => config('app.url'),
                'timezone' => config('app.timezone'),
                'date_format' => 'Y-m-d',
                'time_format' => 'H:i:s',
                'currency' => 'BDT',
                'currency_symbol' => '৳',
            ];

            // Merge settings
            $allSettings = array_merge($systemSettings, $settings);

            return $this->sendSuccess($allSettings, 'System settings retrieved successfully.');

        } catch (\Exception $e) {
            return $this->sendError('Failed to retrieve system settings.', null, 500);
        }
    }
}
