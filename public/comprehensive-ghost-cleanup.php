<?php
/**
 * COMPREHENSIVE GHOST DATA CLEANUP - All Models
 *
 * This script will:
 * 1. Scan all major tables for corrupted/ghost data
 * 2. Show detailed diagnostics with HEX dumps
 * 3. Clean up corrupted records safely
 * 4. Verify cleanup
 *
 * Upload to: public/comprehensive-ghost-cleanup.php
 * Visit: https://manage.hooknhunt.com/comprehensive-ghost-cleanup.php
 * DELETE AFTER USE!
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "COMPREHENSIVE GHOST DATA CLEANUP\n";
echo "All Models - Production Safe\n";
echo "=========================================\n\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n\n";

// Get database credentials from .env
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("❌ .env file not found\n");
}

// Parse .env manually (no Laravel)
$env = [];
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    if (strpos($line, '=') === false) continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? '';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';

echo "Database: $dbName@$dbHost:$dbPort\n";
echo "User: $dbUser\n\n";

try {
    // Create fresh PDO connection
    $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);

    echo "✅ Connected to MySQL\n";
    echo "Version: " . $pdo->query('SELECT VERSION()')->fetchColumn() . "\n\n";

    // Define all models to check with their critical fields
    $models = [
        'users' => ['critical' => ['email', 'phone', 'name'], 'display' => ['id', 'name', 'email', 'phone', 'role_id']],
        'staff_profiles' => ['critical' => ['user_id', 'employee_id'], 'display' => ['id', 'user_id', 'employee_id', 'first_name', 'last_name']],
        'roles' => ['critical' => ['name', 'slug'], 'display' => ['id', 'name', 'slug']],
        'departments' => ['critical' => ['name'], 'display' => ['id', 'name', 'code']],
        'customers' => ['critical' => ['email', 'phone', 'name'], 'display' => ['id', 'name', 'email', 'phone']],
        'suppliers' => ['critical' => ['name', 'email', 'phone'], 'display' => ['id', 'name', 'email', 'phone']],
        'categories' => ['critical' => ['name', 'slug'], 'display' => ['id', 'name', 'slug']],
        'products' => ['critical' => ['base_name', 'slug'], 'display' => ['id', 'base_name', 'slug', 'status']],
        'product_variants' => ['critical' => ['product_id'], 'display' => ['id', 'product_id', 'sku', 'name']],
        'permissions' => ['critical' => ['name', 'key'], 'display' => ['id', 'name', 'key', 'module']],
    ];

    $totalIssuesFound = 0;
    $totalRecordsDeleted = 0;
    $cleanupReport = [];

    foreach ($models as $table => $config) {
        echo "\n";
        echo str_repeat("=", 60) . "\n";
        echo "CHECKING TABLE: $table\n";
        echo str_repeat("=", 60) . "\n";

        // Check if table exists
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() == 0) {
                echo "⚠️  Table does not exist, skipping...\n";
                continue;
            }
        } catch (Exception $e) {
            echo "⚠️  Error checking table: " . $e->getMessage() . "\n";
            continue;
        }

        // Get total count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $totalCount = $stmt->fetch()['count'];
        echo "Total records: $totalCount\n";

        // Check for NULL/empty critical fields
        $criticalFields = $config['critical'];
        $nullConditions = [];
        foreach ($criticalFields as $field) {
            $nullConditions[] = "(`$field` IS NULL OR `$field` = '' OR `$field` = '0')";
        }
        $whereClause = implode(' OR ', $nullConditions);

        $sql = "SELECT COUNT(*) as count FROM `$table` WHERE $whereClause";
        $stmt = $pdo->query($sql);
        $corruptedCount = $stmt->fetch()['count'];

        if ($corruptedCount == 0) {
            echo "✅ No ghost data found in $table\n";
            $cleanupReport[$table] = ['status' => 'clean', 'checked' => $totalCount, 'deleted' => 0];
            continue;
        }

        echo "⚠️  FOUND $corruptedCount corrupted record(s)\n\n";
        $totalIssuesFound += $corruptedCount;

        // Show corrupted records with details
        echo "Corrupted records:\n";
        echo str_repeat("-", 60) . "\n";

        $displayFields = implode(', ', array_map(fn($f) => "`$f`", $config['display']));
        $sql = "SELECT $displayFields FROM `$table` WHERE $whereClause LIMIT 10";
        $stmt = $pdo->query($sql);
        $corruptedRecords = $stmt->fetchAll();

        foreach ($corruptedRecords as $record) {
            echo "  Record:\n";
            foreach ($config['display'] as $field) {
                $value = $record[$field] ?? 'NULL';
                $display = is_null($value) ? 'NULL' : "'$value'";
                echo "    $field: $display";

                // Check for null bytes or weird characters
                if (!is_null($value) && strlen($value) > 0) {
                    $hex = bin2hex($value);
                    if (strpos($hex, '00') !== false) {
                        echo " ⚠️  CONTAINS NULL BYTES!";
                    }
                    if (strlen($value) !== mb_strlen($value, 'utf8')) {
                        echo " ⚠️  ENCODING ISSUE!";
                    }
                }
                echo "\n";
            }
            echo "\n";
        }

        if ($corruptedCount > 10) {
            echo "  ... and " . ($corruptedCount - 10) . " more\n\n";
        }

        // Cleanup strategy based on table
        echo str_repeat("-", 60) . "\n";
        echo "Cleanup strategy for $table:\n";

        if ($table === 'users') {
            echo "  - Will delete corrupted users\n";
            echo "  - Will cascade to staff_profiles\n";
        } elseif ($table === 'staff_profiles') {
            echo "  - Will delete orphaned staff profiles (no user_id)\n";
        } elseif ($table === 'product_variants') {
            echo "  - Will delete orphaned variants (no product_id)\n";
        } else {
            echo "  - Will delete corrupted records\n";
        }

        echo "\n";

        // Perform cleanup
        try {
            $pdo->beginTransaction();

            // For users, we need to handle related tables
            if ($table === 'users') {
                // Get IDs to delete
                $sql = "SELECT id FROM `$table` WHERE $whereClause";
                $stmt = $pdo->query($sql);
                $idsToDelete = $stmt->fetchAll(PDO::FETCH_COLUMN);

                if (!empty($idsToDelete)) {
                    $idsList = implode(',', array_map('intval', $idsToDelete));

                    // Delete from staff_profiles first
                    try {
                        $sql = "DELETE FROM staff_profiles WHERE user_id IN ($idsList)";
                        $deleted = $pdo->exec($sql);
                        echo "  ✅ Deleted $deleted staff_profiles\n";
                    } catch (Exception $e) {
                        echo "  ⚠️  staff_profiles: " . $e->getMessage() . "\n";
                    }

                    // Delete from user_profiles if exists
                    try {
                        $sql = "DELETE FROM user_profiles WHERE user_id IN ($idsList)";
                        $deleted = $pdo->exec($sql);
                        if ($deleted > 0) {
                            echo "  ✅ Deleted $deleted user_profiles\n";
                        }
                    } catch (Exception $e) {
                        // Table might not exist, ignore
                    }

                    // Delete from users
                    $sql = "DELETE FROM `$table` WHERE id IN ($idsList)";
                    $deleted = $pdo->exec($sql);
                    echo "  ✅ Deleted $deleted users\n";
                    $totalRecordsDeleted += $deleted;
                }

            } elseif ($table === 'staff_profiles') {
                // For staff_profiles, delete only if no corresponding user
                $sql = "DELETE sp FROM `$table` sp
                        LEFT JOIN users u ON sp.user_id = u.id
                        WHERE $whereClause AND u.id IS NULL";
                $deleted = $pdo->exec($sql);
                echo "  ✅ Deleted $deleted orphaned staff_profiles\n";
                $totalRecordsDeleted += $deleted;

            } elseif ($table === 'product_variants') {
                // For product_variants, delete only if no corresponding product
                $sql = "DELETE pv FROM `$table` pv
                        LEFT JOIN products p ON pv.product_id = p.id
                        WHERE $whereClause AND p.id IS NULL";
                $deleted = $pdo->exec($sql);
                echo "  ✅ Deleted $deleted orphaned variants\n";
                $totalRecordsDeleted += $deleted;

            } else {
                // For other tables, just delete the corrupted records
                $sql = "DELETE FROM `$table` WHERE $whereClause";
                $deleted = $pdo->exec($sql);
                echo "  ✅ Deleted $deleted corrupted records\n";
                $totalRecordsDeleted += $deleted;
            }

            $pdo->commit();
            echo "\n✅ Cleanup completed for $table\n\n";

            $cleanupReport[$table] = [
                'status' => 'cleaned',
                'checked' => $totalCount,
                'found' => $corruptedCount,
                'deleted' => $deleted ?? 0
            ];

        } catch (Exception $e) {
            $pdo->rollBack();
            echo "\n❌ Cleanup failed for $table: " . $e->getMessage() . "\n\n";
            $cleanupReport[$table] = [
                'status' => 'failed',
                'error' => $e->getMessage()
            ];
        }
    }

    // Final summary
    echo "\n\n";
    echo str_repeat("=", 60) . "\n";
    echo "SUMMARY REPORT\n";
    echo str_repeat("=", 60) . "\n\n";

    echo "Tables checked: " . count($cleanupReport) . "\n";
    echo "Total issues found: $totalIssuesFound\n";
    echo "Total records deleted: $totalRecordsDeleted\n\n";

    echo "Detailed Report:\n";
    echo str_repeat("-", 60) . "\n";

    foreach ($cleanupReport as $table => $report) {
        echo "[$table]\n";
        if ($report['status'] === 'clean') {
            echo "  ✅ No issues found (checked {$report['checked']} records)\n";
        } elseif ($report['status'] === 'cleaned') {
            echo "  ✅ Cleaned: {$report['found']} issue(s), {$report['deleted']} deleted\n";
        } else {
            echo "  ❌ Failed: {$report['error']}\n";
        }
        echo "\n";
    }

    // Verification
    echo str_repeat("=", 60) . "\n";
    echo "VERIFICATION - Re-check critical tables\n";
    echo str_repeat("=", 60) . "\n\n";

    $criticalTables = ['users', 'roles', 'staff_profiles', 'departments'];
    foreach ($criticalTables as $table) {
        if (!isset($models[$table])) continue;

        try {
            $config = $models[$table];
            $criticalFields = $config['critical'];
            $nullConditions = [];
            foreach ($criticalFields as $field) {
                $nullConditions[] = "(`$field` IS NULL OR `$field` = '' OR `$field` = '0')";
            }
            $whereClause = implode(' OR ', $nullConditions);

            $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table` WHERE $whereClause");
            $count = $stmt->fetch()['count'];

            if ($count == 0) {
                echo "✅ $table: Clean\n";
            } else {
                echo "⚠️  $table: Still has $count corrupted record(s)\n";
            }
        } catch (Exception $e) {
            echo "❌ $table: " . $e->getMessage() . "\n";
        }
    }

    echo "\n";
    echo str_repeat("=", 60) . "\n";
    echo "CLEANUP COMPLETE!\n";
    echo str_repeat("=", 60) . "\n\n";

    echo "Completed: " . date('Y-m-d H:i:s') . "\n\n";

    echo "Recommended next steps:\n";
    echo "1. Test your application\n";
    echo "2. Run: php artisan cache:clear\n";
    echo "3. Run: php artisan config:clear\n";
    echo "4. Run: php artisan optimize:clear\n";
    echo "5. Check if issues persist\n\n";

    if ($totalIssuesFound > 0) {
        echo "⚠️  If ghost data returns after cleanup:\n";
        echo "  - Check for database replication lag\n";
        echo "  - Check for caching layers (Redis, Memcached)\n";
        echo "  - Check database engine (InnoDB vs MyISAM)\n";
        echo "  - Contact hosting provider about ghost reads\n\n";
    }

    echo "⚠️  DELETE THIS FILE AFTER USE!\n";

} catch (PDOException $e) {
    echo "\n❌ Database Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
