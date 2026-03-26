<?php
/**
 * DATABASE CONNECTION DIAGNOSTIC
 * Shows EXACTLY which database PHP is connected to
 *
 * Upload to: public/check-db-connection.php
 * Visit: https://manage.hooknhunt.com/check-db-connection.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "DATABASE CONNECTION DIAGNOSTIC\n";
echo "=========================================\n\n";

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "STEP 1: .env Configuration\n";
echo "-----------------------------------------\n";
echo "DB_CONNECTION: " . env('DB_CONNECTION') . "\n";
echo "DB_HOST: " . env('DB_HOST') . "\n";
echo "DB_PORT: " . env('DB_PORT') . "\n";
echo "DB_DATABASE: " . env('DB_DATABASE') . "\n";
echo "DB_USERNAME: " . env('DB_USERNAME') . "\n";
echo "DB_PASSWORD: " . (env('DB_PASSWORD') ? '(set)' : '(empty)') . "\n\n";

echo "STEP 2: Actual Connection Info\n";
echo "-----------------------------------------\n";
try {
    $pdo = DB::connection()->getPdo();
    $dbname = $pdo->query('SELECT DATABASE()')->fetchColumn();

    echo "Connected to database: " . $dbname . "\n";
    echo "Connection class: " . get_class($pdo) . "\n";
    echo "Server version: " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . "\n\n";

    if ($dbname !== env('DB_DATABASE')) {
        echo "⚠️  WARNING: Connected database doesn't match .env DB_DATABASE!\n";
        echo "   .env says: " . env('DB_DATABASE') . "\n";
        echo "   Actually connected to: " . $dbname . "\n\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    die();
}

echo "STEP 3: List All Databases on Server\n";
echo "-----------------------------------------\n";
try {
    $databases = DB::select("SHOW DATABASES");
    echo "Available databases:\n";
    foreach ($databases as $db) {
        $dbName = array_values((array)$db)[0];
        $marker = ($dbName === env('DB_DATABASE')) ? ' ← .env DB_DATABASE' : '';
        $marker = ($dbName === $dbname) ? ' ← CONNECTED' : $marker;
        echo "  - " . $dbName . $marker . "\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "STEP 4: Users Table Structure\n";
echo "-----------------------------------------\n";
try {
    $columns = DB::select("SHOW COLUMNS FROM users");
    echo "Users table columns:\n";
    foreach ($columns as $column) {
        echo "  - " . $column->Field . " (" . $column->Type . ")\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "❌ Error checking users table: " . $e->getMessage() . "\n\n";
}

echo "STEP 5: Raw SQL Test (SELECT *)\n";
echo "-----------------------------------------\n";
try {
    $sql = "SELECT * FROM users LIMIT 10";
    $users = DB::select($sql);

    echo "SQL: $sql\n";
    echo "Results: " . count($users) . " row(s)\n\n";

    if (empty($users)) {
        echo "❌ NO USERS FOUND!\n\n";
    } else {
        foreach ($users as $user) {
            $userArray = (array)$user;
            echo "User ID: " . ($userArray['id'] ?? 'NULL') . "\n";
            echo "Name: '" . ($userArray['name'] ?? 'NULL') . "'\n";
            echo "Email: '" . ($userArray['email'] ?? 'NULL') . "'\n";
            echo "Phone: '" . ($userArray['phone'] ?? 'NULL') . "'\n";
            echo "Password: '" . ($userArray['password'] ?? 'NULL') . "'\n";
            echo "Role ID: " . ($userArray['role_id'] ?? 'NULL') . "\n";
            echo "---\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "SQL Error: " . $e->getCode() . "\n\n";
}

echo "STEP 6: Specific User Search\n";
echo "-----------------------------------------\n";
try {
    $email = 'bp9716190715@gmail.com';
    $sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
    $user = DB::select($sql, [$email]);

    echo "SQL: " . str_replace('?', "'$email'", $sql) . "\n";
    echo "Result: " . (empty($user) ? 'NOT FOUND' : 'FOUND') . "\n\n";

    if (!empty($user)) {
        $userArray = (array)$user[0];
        echo "User details:\n";
        foreach ($userArray as $key => $value) {
            echo "  $key: " . var_export($value, true) . "\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "STEP 7: Check for Empty String IDs\n";
echo "-----------------------------------------\n";
try {
    $sql = "SELECT * FROM users WHERE id = '' OR id IS NULL";
    $ghosts = DB::select($sql);

    echo "SQL: $sql\n";
    echo "Found: " . count($ghosts) . " ghost user(s)\n\n";

    if (!empty($ghosts)) {
        echo "Ghost user data:\n";
        foreach ($ghosts as $ghost) {
            print_r((array)$ghost);
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "ℹ️  Error: " . $e->getMessage() . "\n\n";
}

echo "STEP 8: All Users Count\n";
echo "-----------------------------------------\n";
try {
    $count = DB::table('users')->count();
    echo "COUNT(*): " . $count . "\n\n";

    $countWithEmail = DB::table('users')->whereNotNull('email')->where('email', '!=', '')->count();
    echo "Users with email: " . $countWithEmail . "\n\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "=========================================\n";
echo "DIAGNOSTIC COMPLETE\n";
echo "=========================================\n\n";

echo "IMPORTANT: Check STEP 2 - Which database are you connected to?\n";
echo "If it's NOT 'alugxzaz_hnh', update your .env file!\n\n";
