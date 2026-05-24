<?php

namespace App\Modules\Catalog\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Analyze \App\Modules\Catalog\Models\Product Query Performance
 *
 * Usage: php artisan analyze:product-queries
 *
 * Shows query execution time, memory usage, and suggests optimizations
 */
class AnalyzeProductQueries extends Command
{
    protected $signature = 'analyze:product-queries {--per-page=20 : Products per page to test}';

    protected $description = 'Analyze and optimize product listing query performance';

    public function handle()
    {
        $perPage = (int) $this->option('per-page');

        $this->info('==========================================');
        $this->info(' \App\Modules\Catalog\Models\Product Query Performance Analyzer');
        $this->info('==========================================');
        $this->line("Testing with: {$perPage} products per page");
        $this->newLine();

        // Enable query log
        DB::enableQueryLog();

        // Test 1: Simple product list
        $this->info('Test 1: Basic product list...');
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $products = \App\Models\Product::query()
            ->with(['category', 'brand', 'thumbnail'])
            ->paginate($perPage);

        $test1Time = round((microtime(true) - $startTime) * 1000, 2);
        $test1Memory = round((memory_get_usage() - $startMemory) / 1024 / 1024, 2);
        $test1Queries = count(DB::getQueryLog());

        $this->line("  ✓ Time: {$test1Time}ms");
        $this->line("  ✓ Memory: {$test1Memory}MB");
        $this->line("  ✓ Queries: {$test1Queries}");
        $this->newLine();

        // Clear query log
        DB::flushQueryLog();

        // Test 2: With variants
        $this->info('Test 2: Products with wholesale variants...');
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $products = \App\Models\Product::query()
            ->with([
                'category' => fn($q) => $q->select('id', 'name'),
                'brand' => fn($q) => $q->select('id', 'name'),
                'thumbnail',
                'variants' => fn($q) => $q->where('channel', 'wholesale'),
            ])
            ->select([
                'products.id',
                'products.name',
                'products.slug',
                'products.status',
                'products.category_id',
                'products.brand_id',
                'products.thumbnail_id',
            ])
            ->paginate($perPage);

        $test2Time = round((microtime(true) - $startTime) * 1000, 2);
        $test2Memory = round((memory_get_usage() - $startMemory) / 1024 / 1024, 2);
        $test2Queries = count(DB::getQueryLog());

        $this->line("  ✓ Time: {$test2Time}ms");
        $this->line("  ✓ Memory: {$test2Memory}MB");
        $this->line("  ✓ Queries: {$test2Queries}");
        $this->newLine();

        // Clear query log
        DB::flushQueryLog();

        // Test 3: With filters
        $this->info('Test 3: Products with category filter...');
        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        $products = \App\Models\Product::query()
            ->where('status', 'published')
            ->whereNotNull('category_id')
            ->with(['category', 'brand', 'thumbnail'])
            ->paginate($perPage);

        $test3Time = round((microtime(true) - $startTime) * 1000, 2);
        $test3Memory = round((memory_get_usage() - $startMemory) / 1024 / 1024, 2);
        $test3Queries = count(DB::getQueryLog());

        $this->line("  ✓ Time: {$test3Time}ms");
        $this->line("  ✓ Memory: {$test3Memory}MB");
        $this->line("  ✓ Queries: {$test3Queries}");
        $this->newLine();

        // Summary
        $this->info('==========================================');
        $this->info(' Summary');
        $this->info('==========================================');

        $avgTime = round(($test1Time + $test2Time + $test3Time) / 3, 2);
        $avgMemory = round(($test1Memory + $test2Memory + $test3Memory) / 3, 2);
        $avgQueries = round(($test1Queries + $test2Queries + $test3Queries) / 3);

        $this->line("Average Time: {$avgTime}ms");
        $this->line("Average Memory: {$avgMemory}MB");
        $this->line("Average Queries: {$avgQueries}");
        $this->newLine();

        // Recommendations
        $this->info('==========================================');
        $this->info(' Recommendations');
        $this->info('==========================================');

        if ($avgTime > 1000) {
            $this->error('  ✗ Query time too slow (>1s)');
            $this->line('    → Add database indexes (see database-optimizations.sql)');
            $this->line('    → Increase innodb_buffer_pool_size in MySQL config');
        } else {
            $this->info('  ✓ Query time is acceptable');
        }

        if ($avgMemory > 50) {
            $this->error('  ✗ Memory usage too high (>50MB)');
            $this->line('    → Reduce per_page value');
            $this->line('    → Remove unnecessary relationships from eager loading');
            $this->line('    → Use select() to fetch only needed columns');
        } else {
            $this->info('  ✓ Memory usage is acceptable');
        }

        if ($avgQueries > 10) {
            $this->warn('  ⚠ High query count (N+1 problem detected)');
            $this->line('    → Use eager loading (with()) to reduce queries');
            $this->line('    → Avoid accessing relationships in loops');
        } else {
            $this->info('  ✓ Query count is optimized');
        }

        $this->newLine();
        $this->info('Run database-optimizations.sql to add indexes');

        return Command::SUCCESS;
    }
}
