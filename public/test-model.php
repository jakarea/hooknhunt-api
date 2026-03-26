<?php
/**
 * TEST LARAVEL USER MODEL
 * Upload to: public/test-model.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "LARAVEL USER MODEL TEST\n";
echo "=========================================\n\n";

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
try {
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
} catch (\Exception $e) {
    // Continue anyway
}

echo "TEST 1: Raw SQL Query\n";
echo "-----------------------------------------\n";
$userRaw = DB::select("SELECT * FROM users WHERE email = ? LIMIT 1", ['bp9716190715@gmail.com']);
if ($userRaw) {
    $userRaw = (array)$userRaw[0];
    echo "✅ Raw SQL works:\n";
    echo "  ID: " . $userRaw['id'] . "\n";
    echo "  Name: " . $userRaw['name'] . "\n";
    echo "  Email: " . $userRaw['email'] . "\n\n";
} else {
    echo "❌ Raw SQL failed\n\n";
}

echo "TEST 2: User Model WITHOUT role\n";
echo "-----------------------------------------\n";
try {
    // Prevent auto-loading of role relationship
    $user = \App\Models\User::without('role')->where('email', 'bp9716190715@gmail.com')->first();
    if ($user) {
        echo "✅ User WITHOUT role works:\n";
        echo "  ID: " . $user->id . "\n";
        echo "  Name: " . $user->name . "\n";
        echo "  Email: " . $user->email . "\n";
        echo "  Phone: " . $user->phone . "\n\n";
    } else {
        echo "❌ User WITHOUT role returned null\n\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "TEST 3: User Model WITH role (default)\n";
echo "-----------------------------------------\n";
try {
    $user = \App\Models\User::where('email', 'bp9716190715@gmail.com')->first();
    if ($user) {
        echo "✅ User WITH role works:\n";
        echo "  ID: " . $user->id . "\n";
        echo "  Name: " . $user->name . "\n";
        echo "  Email: " . $user->email . "\n";
        echo "  Phone: " . $user->phone . "\n";
        echo "  Role: " . ($user->role ? $user->role->name : 'NULL') . "\n\n";
    } else {
        echo "❌ User WITH role returned null\n\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "  File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
}

echo "TEST 4: Check Role Table\n";
echo "-----------------------------------------\n";
try {
    $roleCount = DB::table('roles')->count();
    echo "Roles in database: $roleCount\n";

    $roles = DB::table('roles')->get();
    foreach ($roles as $role) {
        echo "  - ID: " . $role->id . ", Name: " . $role->name . ", Slug: " . $role->slug . "\n";
    }
    echo "\n";
} catch (\Exception $e) {
    echo "❌ Error checking roles: " . $e->getMessage() . "\n\n";
}

echo "TEST 5: Role Model Query\n";
echo "-----------------------------------------\n";
try {
    $role = \App\Models\Role::find(1);
    if ($role) {
        echo "✅ Role model works:\n";
        echo "  ID: " . $role->id . "\n";
        echo "  Name: " . $role->name . "\n";
        echo "  Slug: " . $role->slug . "\n\n";
    } else {
        echo "⚠️  Role ID 1 not found\n\n";
    }
} catch (\Exception $e) {
    echo "❌ Role model error: " . $e->getMessage() . "\n\n";
}

echo "=========================================\n";
echo "TEST COMPLETE\n";
echo "=========================================\n\n";

echo "If TEST 2 works but TEST 3 fails, the issue is in the Role model or relationship!\n";
echo "DELETE THIS FILE AFTER USE!\n";
