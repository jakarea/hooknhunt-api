<?php
/**
 * CORRUPTED USER CLEANER
 *
 * This script will:
 * 1. Delete all users with empty/NULL email or phone
 * 2. Show what was deleted
 * 3. Optionally run the seeder to create a fresh admin user
 *
 * Upload to: public/clean-corrupted-users.php
 * Visit: https://manage.hooknhunt.com/clean-corrupted-users.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "CORRUPTED USER CLEANER\n";
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
    echo "STEP 1: Current Database State\n";
    echo "-----------------------------------------\n";

    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Total users: $total\n\n";

    // Show all users
    $stmt = $db->query("SELECT id, name, email, phone, role_id FROM users ORDER BY id");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "All users in database:\n";
    foreach ($users as $user) {
        echo "  ID: " . $user['id'] . "\n";
        echo "  Name: '" . ($user['name'] ?? 'NULL') . "'\n";
        echo "  Email: '" . ($user['email'] ?? 'NULL') . "'\n";
        echo "  Phone: '" . ($user['phone'] ?? 'NULL') . "'\n";
        echo "  Role ID: '" . ($user['role_id'] ?? 'NULL') . "'\n";
        echo "  ---\n";
    }
    echo "\n";

    // ============================================================
    // STEP 2: Find corrupted users
    // ============================================================
    echo "STEP 2: Finding Corrupted Users\n";
    echo "-----------------------------------------\n";

    $sql = "SELECT id, name, email, phone
            FROM users
            WHERE email IS NULL
               OR email = ''
               OR phone IS NULL
               OR phone = ''
               OR name IS NULL
               OR name = ''";

    $stmt = $db->query($sql);
    $corrupted = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($corrupted)) {
        echo "✅ No corrupted users found!\n\n";
    } else {
        echo "Found " . count($corrupted) . " corrupted user(s):\n";
        foreach ($corrupted as $user) {
            echo "  ID: " . $user['id'] . "\n";
            echo "  Name: '" . ($user['name'] ?? 'NULL') . "'\n";
            echo "  Email: '" . ($user['email'] ?? 'NULL') . "'\n";
            echo "  Phone: '" . ($user['phone'] ?? 'NULL') . "'\n";
            echo "  ---\n";
        }
        echo "\n";
    }

    // ============================================================
    // STEP 3: Delete corrupted users
    // ============================================================
    echo "STEP 3: Deleting Corrupted Users\n";
    echo "-----------------------------------------\n";

    if (!empty($corrupted)) {
        // Get IDs to delete
        $idsToDelete = array_map(function($u) { return $u['id']; }, $corrupted);
        $idsList = implode(',', array_filter($idsToSend));

        // Delete from staff_profiles first (foreign key)
        try {
            $stmt = $db->prepare("DELETE FROM staff_profiles WHERE user_id IN (" . implode(',', array_fill(0, count($idsToDelete), '?')) . ")");
            $stmt->execute($idsToDelete);
            echo "Deleted " . $stmt->rowCount() . " staff profile(s)\n";
        } catch (Exception $e) {
            echo "Note: staff_profiles deletion: " . $e->getMessage() . "\n";
        }

        // Delete from user_profiles
        try {
            $stmt = $db->prepare("DELETE FROM user_profiles WHERE user_id IN (" . implode(',', array_fill(0, count($idsToDelete), '?')) . ")");
            $stmt->execute($idsToDelete);
            echo "Deleted " . $stmt->rowCount() . " user profile(s)\n";
        } catch (Exception $e) {
            echo "Note: user_profiles deletion: " . $e->getMessage() . "\n";
        }

        // Delete from users
        $stmt = $db->prepare("DELETE FROM users WHERE id IN (" . implode(',', array_fill(0, count($idsToDelete), '?')) . ")");
        $stmt->execute($idsToDelete);
        echo "Deleted " . $stmt->rowCount() . " user(s)\n";

        echo "\n";
    } else {
        echo "No corrupted users to delete.\n\n";
    }

    // ============================================================
    // STEP 4: Verify cleanup
    // ============================================================
    echo "STEP 4: Verify Cleanup\n";
    echo "-----------------------------------------\n";

    $stmt = $db->query("SELECT COUNT(*) as count FROM users");
    $totalAfter = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "Total users after cleanup: $totalAfter\n\n";

    // Show remaining users
    $stmt = $db->query("SELECT id, name, email, phone, role_id FROM users ORDER BY id");
    $remaining = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($remaining)) {
        echo "⚠️  No users remaining. You need to create one.\n\n";
    } else {
        echo "Remaining users:\n";
        foreach ($remaining as $user) {
            echo "  ID: " . $user['id'] . "\n";
            echo "  Name: " . $user['name'] . "\n";
            echo "  Email: " . $user['email'] . "\n";
            echo "  Phone: " . $user['phone'] . "\n";
            echo "  ---\n";
        }
        echo "\n";
    }

    // ============================================================
    // STEP 5: Create admin user (if requested)
    // ============================================================
    echo "STEP 5: Create Admin User\n";
    echo "-----------------------------------------\n";
    echo "If you want to create a fresh admin user, run this command in terminal:\n\n";
    echo "php artisan db:seed --class=AdminSeeder\n\n";

    // Or provide SQL to insert manually
    echo "OR run this SQL in phpMyAdmin:\n\n";
    echo "-- Insert Super Admin User\n";
    echo "INSERT INTO users (id, role_id, name, phone, email, password, is_active, phone_verified_at, created_at, updated_at)\n";
    echo "VALUES (1, 1, 'Md Ariful Islam', '01721100616', 'bp9716190715@gmail.com', 'Arif@1658', 1, NOW(), NOW(), NOW())\n";
    echo "ON DUPLICATE KEY UPDATE\n";
    echo "  name = 'Md Ariful Islam',\n";
    echo "  phone = '01721100616',\n";
    echo "  email = 'bp9716190715@gmail.com',\n";
    echo "  password = 'Arif@1658',\n";
    echo "  is_active = 1;\n\n";

    echo "=========================================\n";
    echo "CLEANUP COMPLETE\n";
    echo "=========================================\n\n";

    echo "Next steps:\n";
    echo "1. Run the seeder: php artisan db:seed --class=AdminSeeder\n";
    echo "2. Or run the SQL above in phpMyAdmin\n";
    echo "3. Test login: https://manage.hooknhunt.com/api/v2/auth/debug/login\n";
    echo "4. Delete this file: rm public/clean-corrupted-users.php\n\n";

} catch (Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
