<?php
/**
 * CLEAR ALL LARAVEL CACHES
 * Upload to: public/clear-all-caches.php
 * Visit: https://manage.hooknhunt.com/clear-all-caches.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "CLEARING ALL LARAVEL CACHES\n";
echo "=========================================\n\n";

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "STEP 1: Application Cache\n";
echo "-----------------------------------------\n";
try {
    \Illuminate\Support\Facades\Cache::flush();
    echo "✅ Application cache cleared\n\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 2: Config Cache\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('config:clear');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 3: Route Cache\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('route:clear');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 4: View Cache\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('view:clear');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 5: Event Cache\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('event:clear');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 6: Optimized Cache\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('optimize:clear');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 7: Compiled Classes\n";
echo "-----------------------------------------\n";
try {
    $exitCode = \Illuminate\Support\Facades\Artisan::call('clear-compiled');
    echo "✅ " . \Illuminate\Support\Facades\Artisan::output() . "\n";
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 8: Database Query Cache (if any)\n";
echo "-----------------------------------------\n";
try {
    // Clear any database query cache
    $db = DB::connection()->getPdo();
    // Flush MySQL query cache (if enabled)
    try {
        $db->exec("RESET QUERY CACHE");
        echo "✅ MySQL query cache flushed\n\n";
    } catch (Exception $e) {
        echo "ℹ️  MySQL query cache not enabled or no permission\n\n";
    }
} catch (Exception $e) {
    echo "⚠️  " . $e->getMessage() . "\n\n";
}

echo "STEP 9: Verify Database State\n";
echo "-----------------------------------------\n";
try {
    $user = DB::table('users')->where('id', 1)->first();
    if ($user) {
        echo "✅ Database has correct data:\n";
        echo "   ID: " . $user->id . "\n";
        echo "   Name: " . $user->name . "\n";
        echo "   Email: " . $user->email . "\n";
        echo "   Phone: " . $user->phone . "\n";
        echo "   Password: " . $user->password . "\n\n";
    } else {
        echo "❌ User not found in database!\n\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "STEP 10: Test Laravel Model\n";
echo "-----------------------------------------\n";
try {
    $userModel = \App\Models\User::find(1);
    if ($userModel) {
        echo "✅ Laravel User Model works:\n";
        echo "   ID: " . $userModel->id . "\n";
        echo "   Name: " . $userModel->name . "\n";
        echo "   Email: " . $userModel->email . "\n";
        echo "   Phone: " . $userModel->phone . "\n\n";
    } else {
        echo "❌ User Model returned null!\n\n";
    }
} catch (Exception $e) {
    echo "❌ User Model Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n\n";
}

echo "=========================================\n";
echo "CACHE CLEAR COMPLETE!\n";
echo "=========================================\n\n";

echo "Next steps:\n";
echo "1. Test login: https://manage.hooknhunt.com/api/v2/auth/debug/login\n";
echo "2. If still failing, delete this file and restart PHP/FPM\n\n";

echo "DELETE THIS FILE AFTER USE!\n";
