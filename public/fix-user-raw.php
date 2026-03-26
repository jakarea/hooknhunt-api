<?php
/**
 * SIMPLE GHOST USER FIX - Pure PHP (no Laravel)
 * Upload to: public/fix-user-raw.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "GHOST USER FIX - Pure PHP\n";
echo "=========================================\n\n";

// Load .env file
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("❌ .env file not found at: $envFile\n");
}

// Parse .env manually
$env = [];
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

$dbHost = $env['DB_HOST'] ?? 'localhost';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? '';
$dbPass = $env['DB_PASSWORD'] ?? '';

echo "Database Config:\n";
echo "  Host: $dbHost:$dbPort\n";
echo "  Database: $dbName\n";
echo "  Username: $dbUser\n\n";

try {
    // Direct PDO connection
    $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "✅ Connected to MySQL\n";
    echo "Server version: " . $pdo->query('SELECT VERSION()')->fetchColumn() . "\n\n";

    // Step 1: Show current data
    echo "STEP 1: Current Users (with HEX dump)\n";
    echo "-----------------------------------------\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $count = $stmt->fetch()['count'];
    echo "Total users: $count\n\n";

    $stmt = $pdo->query("SELECT id, name, email, phone, HEX(id) as id_hex FROM users");
    $users = $stmt->fetchAll();

    foreach ($users as $user) {
        echo "User ID: '" . $user['id'] . "' (HEX: " . $user['id_hex'] . ")\n";
        echo "Name: '" . $user['name'] . "'\n";
        echo "Email: '" . $user['email'] . "'\n";
        echo "Phone: '" . $user['phone'] . "'\n";
        echo "---\n";
    }
    echo "\n";

    // Step 2: Delete all users
    echo "STEP 2: Delete All Users\n";
    echo "-----------------------------------------\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $deleted = $pdo->exec("DELETE FROM users");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "✅ Deleted $deleted row(s)\n\n";

    // Step 3: Reset auto increment
    echo "STEP 3: Reset Auto Increment\n";
    echo "-----------------------------------------\n";
    $pdo->exec("ALTER TABLE users AUTO_INCREMENT = 1");
    echo "✅ Reset to 1\n\n";

    // Step 4: Insert fresh user
    echo "STEP 4: Insert Fresh Admin User\n";
    echo "-----------------------------------------\n";
    $sql = "INSERT INTO users (id, role_id, name, phone, email, password, is_active, phone_verified_at, created_at, updated_at)
            VALUES (1, 1, 'Md Ariful Islam', '01721100616', 'bp9716190715@gmail.com', 'Arif@1658', 1, NOW(), NOW(), NOW())";
    $inserted = $pdo->exec($sql);
    echo "✅ Inserted $inserted row\n\n";

    // Step 5: Verify
    echo "STEP 5: Verification\n";
    echo "-----------------------------------------\n";
    $stmt = $pdo->query("SELECT id, name, email, phone, password, LENGTH(name) as name_len, LENGTH(email) as email_len FROM users WHERE id = 1");
    $user = $stmt->fetch();

    if ($user) {
        echo "✅ User found:\n";
        echo "  ID: " . $user['id'] . "\n";
        echo "  Name: " . $user['name'] . " (length: " . $user['name_len'] . ")\n";
        echo "  Email: " . $user['email'] . " (length: " . $user['email_len'] . ")\n";
        echo "  Phone: " . $user['phone'] . "\n";
        echo "  Password: " . $user['password'] . "\n\n";

        // Check for null bytes
        if (strpos($user['name'], "\0") !== false || strpos($user['email'], "\0") !== false) {
            echo "⚠️  WARNING: Still has null bytes!\n\n";
        } else {
            echo "✅ Data is clean (no null bytes)\n\n";
        }
    } else {
        echo "❌ User not found!\n\n";
    }

    // Step 6: Test login query
    echo "STEP 6: Test Login Query\n";
    echo "-----------------------------------------\n";
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->execute(['bp9716190715@gmail.com']);
    $testUser = $stmt->fetch();

    if ($testUser) {
        echo "✅ Query successful!\n";
        echo "  Found: " . $testUser['name'] . "\n";
        echo "  Email: " . $testUser['email'] . "\n\n";
    } else {
        echo "❌ Query failed!\n\n";
    }

    echo "=========================================\n";
    echo "FIX COMPLETE!\n";
    echo "=========================================\n\n";

    echo "Test login:\n";
    echo "https://manage.hooknhunt.com/api/v2/auth/login\n";
    echo '{"login_id": "bp9716190715@gmail.com", "password": "Arif@1658"}' . "\n\n";

} catch (PDOException $e) {
    echo "❌ Database Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
}

echo "DELETE THIS FILE AFTER USE!\n";
