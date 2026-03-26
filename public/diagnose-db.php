<?php
// Database Diagnostic Script
// Upload this to manage.hooknhunt.com/public/diagnose-db.php and visit it

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "DATABASE DIAGNOSTIC REPORT\n";
echo "=========================================\n\n";

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

// Get database configuration
$dbConfig = [
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'host' => env('DB_HOST'),
];

echo "1. DATABASE CONNECTION INFO:\n";
echo "   Database: " . $dbConfig['database'] . "\n";
echo "   Username: " . $dbConfig['username'] . "\n";
echo "   Host: " . $dbConfig['host'] . "\n";
echo "   Password: " . (empty($dbConfig['password']) ? '(empty)' : '(set)') . "\n\n";

try {
    // Test connection
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4",
        $dbConfig['username'],
        $dbConfig['password']
    );
    echo "   ✅ Connection: SUCCESS\n\n";
} catch (PDOException $e) {
    echo "   ❌ Connection: FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n\n";
    die("Cannot continue without database connection\n");
}

// Check users table
echo "2. USERS TABLE CHECK:\n";
$stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
$count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "   Total users: " . $count . "\n\n";

// Show all users
echo "3. ALL USERS IN DATABASE:\n";
$stmt = $pdo->query("SELECT id, name, email, phone, role_id, is_active FROM users ORDER BY id");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($users)) {
    echo "   ❌ NO USERS FOUND!\n\n";
} else {
    foreach ($users as $user) {
        echo "   User ID: " . $user['id'] . "\n";
        echo "   Name: " . ($user['name'] ?? 'NULL') . "\n";
        echo "   Email: " . ($user['email'] ?? 'NULL') . "\n";
        echo "   Phone: " . ($user['phone'] ?? 'NULL') . "\n";
        echo "   Role ID: " . $user['role_id'] . "\n";
        echo "   Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n";
        echo "   ---\n";
    }
    echo "\n";
}

// Check for corrupted data
echo "4. CORRUPTED DATA CHECK:\n";
$stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE email IS NULL OR email = '' OR phone IS NULL OR phone = ''");
$corruptedCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "   Users with empty email/phone: " . $corruptedCount . "\n\n";

if ($corruptedCount > 0) {
    echo "   Corrupted users:\n";
    $stmt = $pdo->query("SELECT id, name, email, phone FROM users WHERE email IS NULL OR email = '' OR phone IS NULL OR phone = ''");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   ID: " . $row['id'] . " | Name: " . $row['name'] . " | Email: " . ($row['email'] ?? 'NULL') . " | Phone: " . ($row['phone'] ?? 'NULL') . "\n";
    }
    echo "\n";
}

// Check roles table
echo "5. ROLES TABLE CHECK:\n";
$stmt = $pdo->query("SELECT id, name, slug FROM roles ORDER BY id");
$roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($roles as $role) {
    echo "   Role ID: " . $role['id'] . " | Name: " . $role['name'] . " | Slug: " . $role['slug'] . "\n";
}
echo "\n";

// Check departments table
echo "6. DEPARTMENTS TABLE CHECK:\n";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM departments");
    $deptCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   Total departments: " . $deptCount . "\n";
    
    $stmt = $pdo->query("SELECT id, name FROM departments ORDER BY id");
    $depts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($depts as $dept) {
        echo "   ID: " . $dept['id'] . " | Name: " . $dept['name'] . "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Error checking departments: " . $e->getMessage() . "\n";
}
echo "\n";

// Check if staff_profiles exists
echo "7. STAFF PROFILES TABLE CHECK:\n";
try {
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM staff_profiles");
    $staffCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   Total staff profiles: " . $staffCount . "\n";
} catch (Exception $e) {
    echo "   ❌ staff_profiles table doesn't exist\n";
}
echo "\n";

echo "=========================================\n";
echo "DIAGNOSTIC COMPLETE\n";
echo "=========================================\n";

// Show what the login endpoint should return
echo "\n8. EXPECTED LOGIN TEST:\n";
if (!empty($users)) {
    $testUser = $users[0];
    echo "   If you login with:\n";
    echo "   Email: " . $testUser['email'] . "\n";
    echo "   Phone: " . $testUser['phone'] . "\n";
    echo "   Password: (check database)\n";
    echo "   Should return user_id: " . $testUser['id'] . "\n";
} else {
    echo "   ❌ No users to test with\n";
}
echo "\n";
