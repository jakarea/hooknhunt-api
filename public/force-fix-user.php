<?php
/**
 * FORCE FIX USER - Import correct user from SQL dump
 *
 * This will:
 * 1. Truncate users table (remove ALL records including ghosts)
 * 2. Insert correct admin user
 * 3. Reset AUTO_INCREMENT
 *
 * Upload to: public/force-fix-user.php
 * Visit: https://manage.hooknhunt.com/force-fix-user.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "FORCE FIX USER - TRUNCATE & RECREATE\n";
echo "=========================================\n\n";

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $db = DB::connection()->getPdo();

    // ============================================================
    // STEP 1: Show current state
    // ============================================================
    echo "STEP 1: Current State\n";
    echo "-----------------------------------------\n";

    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Current users count: $count\n\n";

    // Show existing users (if any)
    $stmt = $db->query("SELECT id, name, email, phone FROM users ORDER BY id");
    $existing = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($existing)) {
        echo "Existing users (before fix):\n";
        foreach ($existing as $user) {
            echo "  ID: " . $user['id'] . " | Name: '" . $user['name'] . "' | Email: '" . $user['email'] . "' | Phone: '" . $user['phone'] . "'\n";
        }
        echo "\n";
    }

    // ============================================================
    // STEP 2: Disable foreign key checks
    // ============================================================
    echo "STEP 2: Preparing for Truncate\n";
    echo "-----------------------------------------\n";
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    echo "Foreign key checks disabled\n\n";

    // ============================================================
    // STEP 3: Truncate users table
    // ============================================================
    echo "STEP 3: Truncating Users Table\n";
    echo "-----------------------------------------\n";
    echo "This will DELETE ALL USERS!\n";

    $db->exec("TRUNCATE TABLE users");
    echo "✅ Users table truncated\n\n";

    // ============================================================
    // STEP 4: Re-enable foreign key checks
    // ============================================================
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "Foreign key checks re-enabled\n\n";

    // ============================================================
    // STEP 5: Insert correct admin user
    // ============================================================
    echo "STEP 4: Inserting Correct Admin User\n";
    echo "-----------------------------------------\n";

    $sql = "INSERT INTO users (
                id,
                role_id,
                name,
                phone,
                email,
                password,
                is_active,
                phone_verified_at,
                created_at,
                updated_at
            ) VALUES (
                1,
                1,
                'Md Ariful Islam',
                '01721100616',
                'bp9716190715@gmail.com',
                'Arif@1658',
                1,
                NOW(),
                NOW(),
                NOW()
            )";

    $stmt = $db->prepare($sql);
    $result = $stmt->execute();

    if ($result) {
        echo "✅ Admin user inserted successfully\n";
        echo "   ID: 1\n";
        echo "   Name: Md Ariful Islam\n";
        echo "   Email: bp9716190715@gmail.com\n";
        echo "   Phone: 01721100616\n";
        echo "   Password: Arif@1658\n\n";
    } else {
        echo "❌ Failed to insert user\n";
        print_r($stmt->errorInfo());
        echo "\n";
    }

    // ============================================================
    // STEP 6: Verify insertion
    // ============================================================
    echo "STEP 5: Verification\n";
    echo "-----------------------------------------\n";

    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $newCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Total users after fix: $newCount\n\n";

    $stmt = $db->query("SELECT id, name, email, phone, password, role_id, is_active FROM users WHERE id = 1");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        echo "✅ User data verified:\n";
        echo "   ID: " . $user['id'] . "\n";
        echo "   Name: " . $user['name'] . "\n";
        echo "   Email: " . $user['email'] . "\n";
        echo "   Phone: " . $user['phone'] . "\n";
        echo "   Password: " . $user['password'] . " (length: " . strlen($user['password']) . ")\n";
        echo "   Role ID: " . $user['role_id'] . "\n";
        echo "   Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n\n";
    } else {
        echo "❌ User not found after insertion!\n\n";
    }

    // ============================================================
    // STEP 7: Test query
    // ============================================================
    echo "STEP 6: Test Query (Simulating Login)\n";
    echo "-----------------------------------------\n";

    $testEmail = 'bp9716190715@gmail.com';
    $sql = "SELECT id, name, email, phone, password
            FROM users
            WHERE email = ? OR phone = ?
            LIMIT 1";

    $stmt = $db->prepare($sql);
    $stmt->execute([$testEmail, $testEmail]);
    $testUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($testUser) {
        echo "✅ Query test successful:\n";
        echo "   Found user: " . $testUser['name'] . "\n";
        echo "   Email: " . $testUser['email'] . "\n";
        echo "   Phone: " . $testUser['phone'] . "\n";
        echo "   Password: " . $testUser['password'] . "\n\n";
    } else {
        echo "❌ Query test failed - user not found!\n\n";
    }

    echo "=========================================\n";
    echo "FIX COMPLETE!\n";
    echo "=========================================\n\n";

    echo "Next steps:\n";
    echo "1. Test login: https://manage.hooknhunt.com/api/v2/auth/debug/login\n";
    echo "2. If successful, delete this file\n\n";

    echo "Login credentials:\n";
    echo "  Email: bp9716190715@gmail.com\n";
    echo "  Phone: 01721100616\n";
    echo "  Password: Arif@1658\n\n";

} catch (Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
