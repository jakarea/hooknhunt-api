<?php
// PRODUCTION DEPLOYMENT DIAGNOSTIC SCRIPT
// Upload this to your server and visit: https://probesh.hooknhunt.com/diagnose.php
// Delete this file after diagnosing!

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production Diagnostics</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .section { background: #2d2d2d; padding: 15px; margin: 10px 0; border-left: 4px solid #00ff00; }
        .error { border-left-color: #ff0000; background: #3d1a1a; }
        .warning { border-left-color: #ffaa00; background: #3d2d1a; }
        .success { border-left-color: #00ff00; background: #1a3d1a; }
        h2 { margin-top: 0; color: #00ff00; }
        h3 { color: #ffaa00; }
        code { background: #1a1a1a; padding: 2px 6px; border-radius: 3px; }
        pre { background: #1a1a1a; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Production Deployment Diagnostics</h1>
    <p><strong>Date:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>

    <!-- Section 1: Environment -->
    <div class="section">
        <h2>1️⃣ Environment Configuration</h2>
        <p><strong>APP_ENV:</strong> <code><?php echo env('APP_ENV', 'NOT SET'); ?></code></p>
        <p><strong>APP_DEBUG:</strong> <code><?php echo env('APP_DEBUG', 'NOT SET'); ?></code></p>
        <p><strong>APP_URL:</strong> <code><?php echo env('APP_URL', 'NOT SET'); ?></code></p>
        <?php if (app()->environment('local')): ?>
            <p class="error">❌ CRITICAL: APP_ENV is 'local' - This is why it's trying to connect to localhost:5173!</p>
        <?php else: ?>
            <p class="success">✅ APP_ENV is correctly set to production</p>
        <?php endif; ?>
    </div>

    <!-- Section 2: .env File -->
    <div class="section">
        <h2>2️⃣ .env File Check</h2>
        <?php
        $envPath = base_path('.env');
        if (file_exists($envPath)) {
            echo '<p class="success">✅ .env file exists</p>';
            $envContent = file_get_contents($envPath);
            if (strpos($envContent, 'APP_ENV=production') !== false) {
                echo '<p class="success">✅ .env contains APP_ENV=production</p>';
            } else {
                echo '<p class="error">❌ .env does NOT contain APP_ENV=production</p>';
                echo '<pre>Found: ' . esc_html(substr(strstr($envContent, 'APP_ENV'), 0, 50)) . '</pre>';
            }
        } else {
            echo '<p class="error">❌ .env file does not exist!</p>';
        }
        ?>
    </div>

    <!-- Section 3: Build Assets -->
    <div class="section">
        <h2>3️⃣ Build Assets Check</h2>
        <?php
        $manifestPath = public_path('build/manifest.json');
        $assetsDir = public_path('build/assets/');

        if (file_exists($manifestPath)) {
            echo '<p class="success">✅ manifest.json exists</p>';
            $manifest = json_decode(file_get_contents($manifestPath), true);
            if ($manifest) {
                echo '<p class="success">✅ manifest.json is valid JSON</p>';
                echo '<h3>Manifest Contents:</h3>';
                echo '<pre>' . htmlspecialchars(json_encode($manifest, JSON_PRETTY_PRINT)) . '</pre>';

                if (isset($manifest['resources/js/main.tsx'])) {
                    $entry = $manifest['resources/js/main.tsx'];
                    $jsFile = public_path('build/' . $entry['file']);

                    if (file_exists($jsFile)) {
                        echo '<p class="success">✅ JS file exists: ' . htmlspecialchars($entry['file']) . '</p>';
                        echo '<p>File size: ' . number_format(filesize($jsFile)) . ' bytes</p>';
                    } else {
                        echo '<p class="error">❌ JS file missing: ' . htmlspecialchars($entry['file']) . '</p>';
                    }

                    if (isset($entry['css'])) {
                        foreach ($entry['css'] as $cssFile) {
                            $cssPath = public_path('build/' . $cssFile);
                            if (file_exists($cssPath)) {
                                echo '<p class="success">✅ CSS file exists: ' . htmlspecialchars($cssFile) . '</p>';
                            } else {
                                echo '<p class="error">❌ CSS file missing: ' . htmlspecialchars($cssFile) . '</p>';
                            }
                        }
                    }
                }
            } else {
                echo '<p class="error">❌ manifest.json is NOT valid JSON</p>';
            }
        } else {
            echo '<p class="error">❌ manifest.json does NOT exist!</p>';
            echo '<p><strong>Expected path:</strong> ' . htmlspecialchars($manifestPath) . '</p>';
        }

        if (is_dir($assetsDir)) {
            $files = glob($assetsDir . '*');
            echo '<p>📁 Assets directory contains ' . count($files) . ' files:</p>';
            echo '<ul>';
            foreach ($files as $file) {
                echo '<li>' . basename($file) . ' (' . number_format(filesize($file)) . ' bytes)</li>';
            }
            echo '</ul>';
        } else {
            echo '<p class="error">❌ Assets directory does NOT exist!</p>';
        }
        ?>
    </div>

    <!-- Section 4: app.blade.php Check -->
    <div class="section">
        <h2>4️⃣ app.blade.php Check</h2>
        <?php
        $bladePath = base_path('resources/views/app.blade.php');
        if (file_exists($bladePath)) {
            echo '<p class="success">✅ app.blade.php exists</p>';
            $bladeContent = file_get_contents($bladePath);

            if (strpos($bladeContent, "app()->environment('local')") !== false) {
                echo '<p class="success">✅ app.blade.php contains environment detection code</p>';
            } else {
                echo '<p class="error">❌ app.blade.php does NOT contain environment detection!</p>';
            }

            if (strpos($bladeContent, "public_path('build/manifest.json')") !== false) {
                echo '<p class="success">✅ app.blade.php contains manifest.json loading code</p>';
            } else {
                echo '<p class="error">❌ app.blade.php does NOT contain manifest.json loading code!</p>';
            }

            if (strpos($bladeContent, '@vite') !== false && strpos($bladeContent, 'local') === false) {
                echo '<p class="warning">⚠️ app.blade.php contains @vite directive outside local check - This is the problem!</p>';
            }
        } else {
            echo '<p class="error">❌ app.blade.php does NOT exist!</p>';
        }
        ?>
    </div>

    <!-- Section 5: View Cache -->
    <div class="section">
        <h2>5️⃣ View Cache Check</h2>
        <?php
        $viewCachePath = storage_path('framework/views/');
        if (is_dir($viewCachePath)) {
            $files = glob($viewCachePath . '*.php');
            echo '<p>📁 View cache contains ' . count($files) . ' files</p>';
            if (count($files) > 0) {
                echo '<p class="warning">⚠️ Cached views exist - These may be serving old templates!</p>';
                echo '<p><strong>Action needed:</strong> Run <code>php artisan view:clear</code> on the server</p>';
            }
        } else {
            echo '<p class="success">✅ View cache directory does not exist (fresh install)</p>';
        }
        ?>
    </div>

    <!-- Section 6: Config Cache -->
    <div class="section">
        <h2>6️⃣ Config Cache Check</h2>
        <?php
        $configCachePath = bootstrap_path('cache/config.php');
        if (file_exists($configCachePath)) {
            echo '<p class="warning">⚠️ Config cache exists</p>';
            echo '<p><strong>Action needed:</strong> Run <code>php artisan config:clear</code> on the server</p>';
        } else {
            echo '<p class="success">✅ Config cache cleared</p>';
        }
        ?>
    </div>

    <!-- Section 7: Rendered HTML Output -->
    <div class="section">
        <h2>7️⃣ What Will Be Rendered in app.blade.php</h2>
        <?php
        try {
            // Simulate what app.blade.php will output
            if (app()->environment('local')) {
                echo '<p class="error">❌ Will load from: <strong>Vite Dev Server (localhost:5173)</strong></p>';
                echo '<p class="error">This is the cause of CORS errors!</p>';
            } else {
                $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
                $entry = $manifest['resources/js/main.tsx'];
                $jsUrl = asset('build/' . $entry['file']);

                echo '<p class="success">✅ Will load from: <strong>Production Assets</strong></p>';
                echo '<p>JS File: <code>' . htmlspecialchars($jsUrl) . '</code></p>';

                if (isset($entry['css'])) {
                    echo '<p>CSS Files:</p><ul>';
                    foreach ($entry['css'] as $cssFile) {
                        echo '<li><code>' . htmlspecialchars(asset('build/' . $cssFile)) . '</code></li>';
                    }
                    echo '</ul>';
                }
            }
        } catch (Exception $e) {
            echo '<p class="error">❌ Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        ?>
    </div>

    <!-- Section 8: Recommended Actions -->
    <div class="section">
        <h2>8️⃣ Recommended Actions</h2>
        <?php
        $actions = [];

        if (app()->environment('local')) {
            $actions[] = "Set APP_ENV=production in .env file";
        }

        if (!file_exists($manifestPath)) {
            $actions[] = "Upload build assets to public/build/";
        }

        if (file_exists($viewCachePath) && count(glob($viewCachePath . '*.php')) > 0) {
            $actions[] = "Run: php artisan view:clear";
        }

        if (file_exists($configCachePath)) {
            $actions[] = "Run: php artisan config:clear";
        }

        if (empty($actions)) {
            echo '<p class="success">✅ No critical issues found! Try clearing browser cache.</p>';
        } else {
            echo '<ol>';
            foreach ($actions as $action) {
                echo '<li>' . htmlspecialchars($action) . '</li>';
            }
            echo '</ol>';
        }
        ?>
    </div>

    <div class="section">
        <h2>🔧 Quick Fix Commands (Run in cPanel Terminal)</h2>
        <pre>cd ~/public_html
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize
</pre>
    </div>

    <p><strong>⚠️ IMPORTANT:</strong> Delete this file after diagnosing!</p>
</body>
</html>
