<?php
/**
 * FORCE DELETE GHOST USER - Direct MySQL
 * Bypasses all caching, deletes the ghost record, inserts fresh user
 *
 * Upload to: public/force-delete-ghost.php
 * Visit: https://manage.hooknhunt.com/force-delete-ghost.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "FORCE DELETE GHOST USER\n";
echo "=========================================\n\n";

// Get database credentials from .env
$database = env('DB_DATABASE');
$username = env('DB_USERNAME');
$password = env('DB_PASSWORD');
$host = env('DB_HOST');
$port = env('DB_PORT', 3306);

echo "STEP 1: Creating NEW MySQL Connection\n";
echo "-----------------------------------------\n";
echo "Host: $host:$port\n";
echo "Database: $database\n";
echo "Username: $username\n\n";

try {
    // Create fresh PDO connection (bypass Laravel)
    $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);

    echo "✅ Connected to MySQL server\n";
    echo "Server info: " . $pdo->getAttribute(PDO::ATTR_SERVER_INFO) . "\n\n";
} catch (PDOException $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n\n";
    die();
}

echo "STEP 2: Check Current Users (with hex dump)\n";
echo "-----------------------------------------\n";

$sql = "SELECT id, name, email, phone,
              HEX(id) as id_hex,
              HEX(name) as name_hex,
              HEX(email) as email_hex,
              HEX(phone) as phone_hex
        FROM users";
$stmt = $pdo->query($sql);
$users = $stmt->fetchAll();

echo "Found " . count($users) . " user(s)\n\n";

foreach ($users as $user) {
    echo "User ID: " . $user['id'] . " (raw: '" . bin2hex($user['id']) . "')\n";
    echo "ID HEX: " . $user['id_hex'] . "\n";
    echo "Name: '" . $user['name'] . "' (hex: " . $user['name_hex'] . ")\n";
    echo "Email: '" . $user['email'] . "' (hex: " . $user['email_hex'] . ")\n";
    echo "Phone: '" . $user['phone'] . "' (hex: " . $user['phone_hex'] . ")\n";
    echo "---\n";
}
echo "\n";

echo "STEP 3: Delete ALL Users (with raw SQL)\n";
echo "-----------------------------------------\n";

try {
    $sql = "DELETE FROM users";
    $affected = $pdo->exec($sql);
    echo "✅ Deleted $affected row(s)\n\n";
} catch (PDOException $e) {
    echo "❌ Delete failed: " . $e->getMessage() . "\n";
    echo "Trying with foreign key checks disabled...\n";

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $affected = $pdo->exec("DELETE FROM users");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    echo "✅ Deleted $affected row(s) (FK checks disabled)\n\n";
}

echo "STEP 4: Reset Auto Increment\n";
echo "-----------------------------------------\n";

$pdo->exec("ALTER TABLE users AUTO_INCREMENT = 1");
echo "✅ Auto increment reset to 1\n\n";

echo "STEP 5: Insert Fresh Admin User\n";
echo "-----------------------------------------\n";

$sql = "INSERT INTO users (
            id, role_id, name, phone, email, password,
            is_active, phone_verified_at, created_at, updated_at
        ) VALUES (
            1, 1, 'Md Ariful Islam', '01721100616',
            'bp9716190715@gmail.com', 'Arif@1658',
            1, NOW(), NOW(), NOW()
        )";

try {
    $affected = $pdo->exec($sql);
    echo "✅ Inserted $affected row\n\n";
} catch (PDOException $e) {
    echo "❌ Insert failed: " . $e->getMessage() . "\n\n";
    die();
}

echo "STEP 6: Verify Insertion (with hex dump)\n";
echo "-----------------------------------------\n";

$sql = "SELECT id, name, email, phone, password, role_id, is_active,
              HEX(id) as id_hex,
              HEX(name) as name_hex,
              LENGTH(name) as name_length,
              HEX(email) as email_hex,
              LENGTH(email) as email_length
        FROM users
        WHERE id = 1";
$stmt = $pdo->query($sql);
$user = $stmt->fetch();

if ($user) {
    echo "✅ User found!\n";
    echo "ID: " . $user['id'] . " (hex: " . $user['id_hex'] . ")\n";
    echo "Name: '" . $user['name'] . "' (length: " . $user['name_length'] . ", hex: " . $user['name_hex'] . ")\n";
    echo "Email: '" . $user['email'] . "' (length: " . $user['email_length'] . ", hex: " . $user['email_hex'] . ")\n";
    echo "Phone: '" . $user['phone'] . "'\n";
    echo "Password: '" . $user['password'] . "' (length: " . strlen($user['password']) . ")\n";
    echo "Role ID: " . $user['role_id'] . "\n";
    echo "Active: " . $user['is_active'] . "\n\n";

    // Check for null bytes
    if (strpos($user['name'], "\0") !== false) {
        echo "⚠️  WARNING: Name contains NULL bytes!\n";
        echo "   Raw hex: " . bin2hex($user['name']) . "\n\n";
    } else {
        echo "✅ Name is clean (no null bytes)\n\n";
    }
} else {
    echo "❌ User not found after insert!\n\n";
}

echo "STEP 7: Test Query (Simulating Login)\n";
echo "-----------------------------------------\n";

$email = 'bp9716190715@gmail.com';
$sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
$stmt = $pdo->prepare($sql);
$stmt->execute([$email]);
$testUser = $stmt->fetch();

if ($testUser) {
    echo "✅ Query test successful!\n";
    echo "Found user: " . $testUser['name'] . "\n";
    echo "Email: " . $testUser['email'] . "\n";
    echo "Phone: " . $testUser['phone'] . "\n\n";
} else {
    echo "❌ Query test failed - user not found!\n\n";
}

echo "STEP 8: Count All Users\n";
echo "-----------------------------------------\n";

$sql = "SELECT COUNT(*) as count FROM users";
$stmt = $pdo->query($sql);
$count = $stmt->fetch()['count'];

echo "Total users: $count\n\n";

if ($count == 0) {
    echo "❌ ERROR: Count is 0 but we just inserted a user!\n";
    echo "This suggests database replication/caching issues.\n\n";
}

echo "=========================================\n";
echo "FORCE DELETE COMPLETE!\n";
echo "=========================================\n\n";

echo "Next steps:\n";
echo "1. If all steps show ✅, test login now\n";
echo "2. If still failing, there may be database replication\n";
echo "3. Contact hosting support about database caching\n\n";

echo "Test: https://manage.hooknhunt.com/api/v2/auth/login\n";
echo '{"login_id": "bp9716190715@gmail.com", "password": "Arif@1658"}\n\n";

echo "DELETE THIS FILE AFTER USE!\n";
