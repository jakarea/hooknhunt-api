<?php
/**
 * GHOST DATA DIAGNOSTIC - All Models (READ ONLY)
 *
 * This script will ONLY diagnose, not delete anything:
 * 1. Scan all tables for ghost data
 * 2. Show detailed diagnostics with HEX dumps
 * 3. Identify root causes
 * 4. Provide recommendations
 *
 * Upload to: public/diagnose-ghost-data.php
 * Visit: https://manage.hooknhunt.com/diagnose-ghost-data.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo "=========================================\n";
echo "GHOST DATA DIAGNOSTIC - ALL MODELS\n";
echo "READ ONLY - No changes will be made\n";
echo "=========================================\n\n";
echo "Started: " . date('Y-m-d H:i:s') . "\n\n";

// Get database credentials from .env
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("❌ .env file not found\n");
}

// Parse .env manually
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
    $dsn = "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);

    echo "✅ Connected to MySQL\n";
    echo "Version: " . $pdo->query('SELECT VERSION()')->fetchColumn() . "\n\n";

    // Check database engine and settings
    echo "DATABASE SETTINGS:\n";
    echo str_repeat("-", 60) . "\n";

    $stmt = $pdo->query("SHOW TABLE STATUS");
    $engines = [];
    while ($row = $stmt->fetch()) {
        $engine = $row['Engine'];
        if (!isset($engines[$engine])) {
            $engines[$engine] = 0;
        }
        $engines[$engine]++;
    }

    foreach ($engines as $engine => $count) {
        echo "  Engine: $engine ($count tables)\n";
    }

    // Check for foreign key constraints
    $stmt = $pdo->query("SELECT @@FOREIGN_KEY_CHECKS");
    $fkChecks = $stmt->fetchColumn();
    echo "  Foreign Key Checks: " . ($fkChecks ? 'Enabled' : 'Disabled') . "\n";

    // Check character set
    $stmt = $pdo->query("SELECT @@character_set_database, @@collation_database");
    $charset = $stmt->fetch();
    echo "  Charset: {$charset['@@character_set_database']}\n";
    echo "  Collation: {$charset['@@collation_database']}\n\n";

    // Define models to check
    $models = [
        'users' => ['critical' => ['email', 'phone', 'name'], 'display' => ['id', 'name', 'email', 'phone', 'role_id']],
        'staff_profiles' => ['critical' => ['user_id'], 'display' => ['id', 'user_id', 'employee_id', 'first_name']],
        'roles' => ['critical' => ['name', 'slug'], 'display' => ['id', 'name', 'slug']],
        'departments' => ['critical' => ['name'], 'display' => ['id', 'name', 'code']],
        'customers' => ['critical' => ['name'], 'display' => ['id', 'name', 'email', 'phone']],
        'suppliers' => ['critical' => ['name'], 'display' => ['id', 'name', 'email']],
        'categories' => ['critical' => ['name', 'slug'], 'display' => ['id', 'name', 'slug']],
        'products' => ['critical' => ['base_name', 'slug'], 'display' => ['id', 'base_name', 'slug']],
        'product_variants' => ['critical' => ['product_id'], 'display' => ['id', 'product_id', 'sku', 'name']],
        'permissions' => ['critical' => ['name', 'key'], 'display' => ['id', 'name', 'key']],
        'settings' => ['critical' => ['key'], 'display' => ['id', 'key', 'value']],
    ];

    $issuesFound = [];
    $totalRecords = 0;

    foreach ($models as $table => $config) {
        echo "\n";
        echo str_repeat("=", 60) . "\n";
        echo "TABLE: $table\n";
        echo str_repeat("=", 60) . "\n";

        // Check if table exists
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() == 0) {
                echo "⚠️  Table does not exist\n";
                continue;
            }
        } catch (Exception $e) {
            echo "⚠️  Error: " . $e->getMessage() . "\n";
            continue;
        }

        // Get table info
        $stmt = $pdo->query("SHOW TABLE STATUS LIKE '$table'");
        $tableStatus = $stmt->fetch();
        echo "Engine: " . $tableStatus['Engine'] . "\n";
        echo "Rows: " . number_format($tableStatus['Rows']) . "\n";
        echo "Data Size: " . number_format($tableStatus['Data_length']) . " bytes\n";
        echo "Index Size: " . number_format($tableStatus['Index_length']) . " bytes\n";

        // Get actual count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $actualCount = $stmt->fetch()['count'];
        echo "Actual Count: $actualCount\n\n";

        $totalRecords += $actualCount;

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
            echo "✅ No ghost data found\n";
            continue;
        }

        echo "⚠️  GHOST DATA FOUND: $corruptedCount record(s)\n\n";
        $issuesFound[$table] = $corruptedCount;

        // Show detailed analysis of corrupted records
        echo "Detailed Analysis:\n";
        echo str_repeat("-", 60) . "\n";

        $displayFields = implode(', ', array_map(fn($f) => "`$f`", $config['display']));

        // Sample first 5 corrupted records
        $sql = "SELECT $displayFields FROM `$table` WHERE $whereClause LIMIT 5";
        $stmt = $pdo->query($sql);
        $corruptedRecords = $stmt->fetchAll();

        $recordNum = 1;
        foreach ($corruptedRecords as $record) {
            echo "\nRecord #$recordNum:\n";

            foreach ($config['display'] as $field) {
                $value = $record[$field] ?? null;

                if (is_null($value)) {
                    echo "  $field: NULL ⚠️\n";
                } elseif ($value === '') {
                    echo "  $field: '' (empty string) ⚠️\n";
                } else {
                    $display = "'$value'";
                    $hex = bin2hex($value);
                    $warnings = [];

                    // Check for null bytes
                    if (strpos($hex, '00') !== false) {
                        $warnings[] = "NULL BYTES";
                    }

                    // Check for encoding issues
                    if (strlen($value) !== mb_strlen($value, 'utf8')) {
                        $warnings[] = "ENCODING ISSUE";
                    }

                    // Check for non-printable characters (except whitespace)
                    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
                        $warnings[] = "CONTROL CHARACTERS";
                    }

                    // Check for weird whitespace
                    if (preg_match('/\s{2,}/', $value)) {
                        $warnings[] = "MULTIPLE SPACES";
                    }

                    $warningText = !empty($warnings) ? ' ⚠️ ' . implode(', ', $warnings) : '';
                    echo "  $field: $display (hex: $hex, len: " . strlen($value) . ")$warningText\n";
                }
            }

            $recordNum++;
        }

        if ($corruptedCount > 5) {
            echo "\n... and " . ($corruptedCount - 5) . " more corrupted record(s)\n";
        }

        // Check for orphaned records (if applicable)
        if ($table === 'staff_profiles') {
            echo "\nOrphaned Records Check:\n";
            $sql = "SELECT COUNT(*) as count FROM `$table` sp
                    LEFT JOIN users u ON sp.user_id = u.id
                    WHERE u.id IS NULL";
            $stmt = $pdo->query($sql);
            $orphaned = $stmt->fetch()['count'];
            if ($orphaned > 0) {
                echo "  ⚠️  $orphaned orphaned record(s) (no matching user)\n";
            } else {
                echo "  ✅ No orphaned records\n";
            }
        }

        if ($table === 'product_variants') {
            echo "\nOrphaned Records Check:\n";
            $sql = "SELECT COUNT(*) as count FROM `$table` pv
                    LEFT JOIN products p ON pv.product_id = p.id
                    WHERE p.id IS NULL";
            $stmt = $pdo->query($sql);
            $orphaned = $stmt->fetch()['count'];
            if ($orphaned > 0) {
                echo "  ⚠️  $orphaned orphaned record(s) (no matching product)\n";
            } else {
                echo "  ✅ No orphaned records\n";
            }
        }

        echo "\n";
    }

    // Final summary
    echo "\n\n";
    echo str_repeat("=", 60) . "\n";
    echo "DIAGNOSTIC SUMMARY\n";
    echo str_repeat("=", 60) . "\n\n";

    echo "Total tables checked: " . count($models) . "\n";
    echo "Total records scanned: " . number_format($totalRecords) . "\n";
    echo "Tables with ghost data: " . count($issuesFound) . "\n\n";

    if (empty($issuesFound)) {
        echo "✅ NO GHOST DATA FOUND!\n\n";
        echo "If you're still experiencing issues, check:\n";
        echo "  1. Application cache (php artisan cache:clear)\n";
        echo "  2. Query cache (FLUSH QUERY CACHE)\n";
        echo "  3. Database replication lag\n";
        echo "  4. External caching layers (Redis, Memcached)\n";
    } else {
        echo "⚠️  GHOST DATA FOUND IN:\n\n";
        foreach ($issuesFound as $table => $count) {
            echo "  - $table: $count corrupted record(s)\n";
        }

        echo "\n";
        echo str_repeat("=", 60) . "\n";
        echo "ROOT CAUSE ANALYSIS\n";
        echo str_repeat("=", 60) . "\n\n";

        // Check for common patterns
        $possibleCauses = [];

        // Pattern 1: Character encoding issues
        $stmt = $pdo->query("SELECT @@character_set_database");
        $charset = $stmt->fetchColumn();
        if ($charset !== 'utf8mb4') {
            $possibleCauses[] = "Database charset is '$charset' (should be utf8mb4)";
        }

        // Pattern 2: NULL bytes in data (indicates import/export issues)
        foreach ($issuesFound as $table => $count) {
            $sql = "SELECT * FROM `$table` LIMIT 100";
            $stmt = $pdo->query($sql);
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                foreach ($row as $value) {
                    if (!is_null($value) && strpos($value, "\0") !== false) {
                        $possibleCauses[] = "NULL bytes detected in data (import/export corruption)";
                        break 2;
                    }
                }
            }
        }

        // Pattern 3: Orphaned records
        if (isset($issuesFound['staff_profiles']) || isset($issuesFound['product_variants'])) {
            $possibleCauses[] = "Orphaned records (foreign key issues)";
        }

        if (!empty($possibleCauses)) {
            echo "Possible Root Causes:\n";
            foreach ($possibleCauses as $i => $cause) {
                echo "  " . ($i + 1) . ". $cause\n";
            }
        } else {
            echo "No obvious pattern detected. May require manual investigation.\n";
        }

        echo "\n";
        echo str_repeat("=", 60) . "\n";
        echo "RECOMMENDED ACTIONS\n";
        echo str_repeat("=", 60) . "\n\n";

        echo "1. BACKUP YOUR DATABASE FIRST!\n";
        echo "   mysqldump -u $dbUser -p $dbName > backup_before_cleanup.sql\n\n";

        echo "2. Run the cleanup script:\n";
        echo "   Visit: https://manage.hooknhunt.com/comprehensive-ghost-cleanup.php\n\n";

        echo "3. Clear all caches:\n";
        echo "   php artisan cache:clear\n";
        echo "   php artisan config:clear\n";
        echo "   php artisan route:clear\n";
        echo "   php artisan view:clear\n";
        echo "   php artisan optimize:clear\n\n";

        echo "4. If ghost data returns after cleanup:\n";
        echo "   - Check for database replication (master/slave)\n";
        echo "   - Check for database query cache\n";
        echo "   - Check application-level caching\n";
        echo "   - Contact hosting provider\n\n";

        echo "5. Prevent future ghost data:\n";
        echo "   - Add proper validation to models\n";
        echo "   - Use database constraints (NOT NULL, FOREIGN KEYS)\n";
        echo "   - Fix character encoding to utf8mb4\n";
        echo "   - Review import/export processes\n\n";
    }

    echo "Completed: " . date('Y-m-d H:i:s') . "\n\n";

} catch (PDOException $e) {
    echo "\n❌ Database Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
}
