<?php
/**
 * FIX CORRUPTED DATE FIELDS
 * Upload to: public/fix-date-fields.php
 */

header('Content-Type: text/plain; charset=utf-8');

// Parse .env
$envFile = __DIR__ . '/../.env';
$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

$dsn = "mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_DATABASE']};charset=utf8mb4";
$pdo = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD']);

echo "=========================================\n";
echo "FIX CORRUPTED DATE FIELDS\n";
echo "=========================================\n\n";

// Step 1: Show current corrupted data
echo "STEP 1: Finding Corrupted Date Fields\n";
echo "-----------------------------------------\n";

$sql = "SELECT id, name, email, phone,
              phone_verified_at,
              email_verified_at,
              created_at,
              updated_at
        FROM users";
$stmt = $pdo->query($sql);
$users = $stmt->fetchAll();

$corruptedCount = 0;

foreach ($users as $user) {
    $issues = [];

    // Check phone_verified_at
    if (!empty($user['phone_verified_at'])) {
        // Try to parse as date
        $test = strtotime($user['phone_verified_at']);
        if ($test === false) {
            $issues[] = "phone_verified_at = '{$user['phone_verified_at']}' (NOT A DATE!)";
            $corruptedCount++;
        }
    }

    // Check email_verified_at
    if (!empty($user['email_verified_at'])) {
        $test = strtotime($user['email_verified_at']);
        if ($test === false) {
            $issues[] = "email_verified_at = '{$user['email_verified_at']}' (NOT A DATE!)";
            $corruptedCount++;
        }
    }

    if (!empty($issues)) {
        echo "User ID: {$user['id']}\n";
        echo "Name: {$user['name']}\n";
        echo "Email: {$user['email']}\n";
        foreach ($issues as $issue) {
            echo "  ❌ $issue\n";
        }
        echo "---\n";
    }
}

echo "\nFound $corruptedCount corrupted date field(s)\n\n";

// Step 2: Fix all corrupted date fields
echo "STEP 2: Fixing Corrupted Fields\n";
echo "-----------------------------------------\n";

// Set all corrupted dates to NULL
$sql = "UPDATE users
        SET phone_verified_at = NULL
        WHERE phone_verified_at IS NOT NULL
          AND phone_verified_at != ''
          AND STR_TO_DATE(phone_verified_at, '%Y-%m-%d %H:%i:%s') IS NULL";

$affected = $pdo->exec($sql);
echo "Fixed $affected phone_verified_at field(s)\n";

$sql = "UPDATE users
        SET email_verified_at = NULL
        WHERE email_verified_at IS NOT NULL
          AND email_verified_at != ''
          AND STR_TO_DATE(email_verified_at, '%Y-%m-%d %H:%i:%s') IS NULL";

$affected = $pdo->exec($sql);
echo "Fixed $affected email_verified_at field(s)\n\n";

// Step 3: Set correct phone_verified_at for admin user
echo "STEP 3: Set phone_verified_at for Admin User\n";
echo "-----------------------------------------\n";

$sql = "UPDATE users
        SET phone_verified_at = NOW()
        WHERE id = 1 AND phone_verified_at IS NULL";
$affected = $pdo->exec($sql);
echo "Updated $affected row(s)\n\n";

// Step 4: Show fixed data
echo "STEP 4: Verification\n";
echo "-----------------------------------------\n";

$sql = "SELECT id, name, email, phone,
              phone_verified_at,
              email_verified_at
        FROM users
        WHERE id = 1";
$stmt = $pdo->query($sql);
$user = $stmt->fetch();

if ($user) {
    echo "✅ User ID: {$user['id']}\n";
    echo "  Name: {$user['name']}\n";
    echo "  Email: {$user['email']}\n";
    echo "  Phone: {$user['phone']}\n";
    echo "  Phone Verified: " . ($user['phone_verified_at'] ?? 'NULL') . "\n";
    echo "  Email Verified: " . ($user['email_verified_at'] ?? 'NULL') . "\n\n";
} else {
    echo "❌ User not found!\n\n";
}

echo "=========================================\n";
echo "FIX COMPLETE!\n";
echo "=========================================\n\n";

echo "Now test login:\n";
echo "curl -X POST https://manage.hooknhunt.com/api/v2/auth/login \\\n";
echo "  -H 'Content-Type: application/json' \\\n";
echo "  -d '{\"login_id\": \"bp9716190715@gmail.com\", \"password\": \"Arif@1658\"}'\n\n";
