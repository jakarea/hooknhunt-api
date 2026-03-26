<?php
/**
 * COMPREHENSIVE DATABASE CHECK
 * Upload to: public/check-db.php
 * Visit: https://manage.hooknhunt.com/check-db.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "COMPREHENSIVE DATABASE CHECK\n";
echo "=========================================\n\n";

// Load .env
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("❌ .env file not found!\n");
}

$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    if (strpos($line, '=') === false) continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

echo "=========================================\n";
echo "ENVIRONMENT CONFIGURATION\n";
echo "=========================================\n\n";
echo "DB_CONNECTION: " . ($env['DB_CONNECTION'] ?? 'NOT SET') . "\n";
echo "DB_HOST: " . ($env['DB_HOST'] ?? 'NOT SET') . "\n";
echo "DB_PORT: " . ($env['DB_PORT'] ?? 'NOT SET') . "\n";
echo "DB_DATABASE: " . ($env['DB_DATABASE'] ?? 'NOT SET') . "\n";
echo "DB_USERNAME: " . ($env['DB_USERNAME'] ?? 'NOT SET') . "\n";
echo "DB_PASSWORD: " . (empty($env['DB_PASSWORD']) ? 'EMPTY' : 'SET') . "\n\n";

// Test different connection methods
echo "=========================================\n";
echo "CONNECTION TESTS\n";
echo "=========================================\n\n";

// Method 1: Using env variables
echo "TEST 1: Connect using .env settings\n";
echo "-----------------------------------------\n";
try {
    $dsn = "mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_DATABASE']};charset=utf8mb4";
    $pdo1 = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD']);
    $dbname1 = $pdo1->query('SELECT DATABASE()')->fetchColumn();
    $user1 = $pdo1->query("SELECT name FROM users WHERE id = 1 LIMIT 1")->fetchColumn();

    echo "✅ Connected\n";
    echo "Current database: " . $dbname1 . "\n";
    echo "User ID 1 name: " . ($user1 ?: 'NOT FOUND') . "\n\n";
} catch (Exception $e) {
    echo "❌ Failed: " . $e->getMessage() . "\n\n";
}

// Method 2: Using 127.0.0.1 instead of localhost
echo "TEST 2: Connect using 127.0.0.1 (force TCP)\n";
echo "-----------------------------------------\n";
try {
    $dsn = "mysql:host=127.0.0.1;port={$env['DB_PORT']};dbname={$env['DB_DATABASE']};charset=utf8mb4";
    $pdo2 = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD']);
    $dbname2 = $pdo2->query('SELECT DATABASE()')->fetchColumn();
    $user2 = $pdo2->query("SELECT name FROM users WHERE id = 1 LIMIT 1")->fetchColumn();

    echo "✅ Connected\n";
    echo "Current database: " . $dbname2 . "\n";
    echo "User ID 1 name: " . ($user2 ?: 'NOT FOUND') . "\n\n";
} catch (Exception $e) {
    echo "❌ Failed: " . $e->getMessage() . "\n\n";
}

// Method 3: Using socket if available
echo "TEST 3: Try MySQL socket\n";
echo "-----------------------------------------\n";
$sockets = ['/var/run/mysql/mysql.sock', '/var/lib/mysql/mysql.sock', '/tmp/mysql.sock'];
$socketConnected = false;

foreach ($sockets as $socket) {
    if (file_exists($socket)) {
        try {
            $dsn = "mysql:unix_socket=$socket;dbname={$env['DB_DATABASE']};charset=utf8mb4";
            $pdo3 = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD']);
            $dbname3 = $pdo3->query('SELECT DATABASE()')->fetchColumn();
            $user3 = $pdo3->query("SELECT name FROM users WHERE id = 1 LIMIT 1")->fetchColumn();

            echo "✅ Connected via socket: $socket\n";
            echo "Current database: " . $dbname3 . "\n";
            echo "User ID 1 name: " . ($user3 ?: 'NOT FOUND') . "\n\n";
            $socketConnected = true;
            break;
        } catch (Exception $e) {
            continue;
        }
    }
}

if (!$socketConnected) {
    echo "ℹ️  No socket connection worked\n\n";
}

// Check for test user
echo "=========================================\n";
echo "TEST USER CHECK (ID 999)\n";
echo "=========================================\n\n";

if (isset($pdo1)) {
    $count999 = $pdo1->query("SELECT COUNT(*) FROM users WHERE id = 999")->fetchColumn();
    echo "User ID 999 exists: " . ($count999 ? 'YES' : 'NO') . "\n";

    if ($count999) {
        $user999 = $pdo1->query("SELECT name FROM users WHERE id = 999")->fetchColumn();
        echo "User 999 name: " . $user999 . "\n";
    }
    echo "\n";
}

// List all users
echo "=========================================\n";
echo "ALL USERS IN DATABASE\n";
echo "=========================================\n\n";

if (isset($pdo1)) {
    $users = $pdo1->query("SELECT id, name, email, phone FROM users")->fetchAll();
    echo "Total users: " . count($users) . "\n\n";

    foreach ($users as $user) {
        echo "ID: " . $user['id'] . "\n";
        echo "Name: " . $user['name'] . "\n";
        echo "Email: " . $user['email'] . "\n";
        echo "Phone: " . $user['phone'] . "\n";
        echo "---\n";
    }
}

// Server info
echo "\n=========================================\n";
echo "SERVER INFORMATION\n";
echo "=========================================\n\n";

if (isset($pdo1)) {
    echo "MySQL Version: " . $pdo1->query('SELECT VERSION()')->fetchColumn() . "\n";
    echo "Current User: " . $pdo1->query('SELECT USER()')->fetchColumn() . "\n";
    echo "Current Database: " . $pdo1->query('SELECT DATABASE()')->fetchColumn() . "\n";

    $dbs = $pdo1->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
    echo "\nAvailable databases:\n";
    foreach ($dbs as $db) {
        $marker = ($db === $env['DB_DATABASE']) ? ' ← .env database' : '';
        echo "  - " . $db . $marker . "\n";
    }
}

echo "\n=========================================\n";
echo "DIAGNOSTIC COMPLETE\n";
echo "=========================================\n\n";

echo "IMPORTANT:\n";
echo "1. Compare 'User ID 1 name' with what phpMyAdmin shows\n";
echo "2. If different, phpMyAdmin and PHP use different MySQL servers!\n";
echo "3. Check TEST 2 (127.0.0.1) - it might show different data\n";
echo "4. Share this output along with your .env file content\n\n";
