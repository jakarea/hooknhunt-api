<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Cleanup Malformed HTML Entities Command
 *
 * Fixes database records with malformed HTML entities like &amp;amp;amp;amp;
 * This happens when HTML is encoded multiple times.
 *
 * Usage: php artisan cleanup:malformed-html --dry-run
 *        php artisan cleanup:malformed-html --apply
 *
 * @package App\Console\Commands
 */
class CleanupMalformedHtml extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cleanup:malformed-html
        {--dry-run : Show what would be cleaned without applying changes}
        {--apply : Apply the cleanup changes}
        {--table=* : Specific tables to clean (default: all)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up malformed HTML entities in database (e.g., &amp;amp;amp; → &)';

    /**
     * Fields that should be plain text (strip all HTML)
     *
     * @var array
     */
    protected $plainTextFields = [
        // Products table
        'products' => [
            'name', 'retail_name', 'wholesale_name',
            'retail_name_bn', 'wholesale_name_bn',
            'product_code',
            'slug',
            'seo_title',
            'video_url',
        ],
        // Categories table
        'categories' => [
            'name', 'name_bn',
            'slug',
        ],
        // Brands table
        'brands' => [
            'name',
            'slug',
        ],
    ];

    /**
     * Fields that are rich text (preserve safe HTML)
     *
     * @var array
     */
    protected $richTextFields = [
        'products' => [
            'description', 'description_bn',
            'warranty_details',
        ],
        'categories' => [
            'description', 'description_bn',
        ],
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = !$this->option('apply');
        $isApply = $this->option('apply');

        if ($isDryRun) {
            $this->info('🔍 DRY RUN MODE - No changes will be applied');
            $this->newLine();
        }

        if ($isApply) {
            $this->warn('⚠️  APPLY MODE - This will modify database records!');
            if (!$this->confirm('Are you sure you want to proceed?')) {
                $this->info('Operation cancelled.');
                return self::SUCCESS;
            }
            $this->newLine();
        }

        $tables = $this->option('table');
        if (empty($tables)) {
            $tables = array_keys($this->plainTextFields);
        }

        $totalFixed = 0;
        $totalRecords = 0;

        foreach ($tables as $table) {
            $this->info("📋 Processing table: {$table}");

            if (!isset($this->plainTextFields[$table]) && !isset($this->richTextFields[$table])) {
                $this->comment("  ⚠️  No fields defined for this table, skipping...");
                continue;
            }

            $fixed = $this->cleanTable($table, $isDryRun);
            $totalFixed += $fixed['fixed'];
            $totalRecords += $fixed['records'];

            $this->newLine();
        }

        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->info('📊 SUMMARY');
        $this->info("   Total records scanned: {$totalRecords}");
        $this->info("   Total fields to fix: {$totalFixed}");

        if ($isDryRun) {
            $this->comment('   Run with --apply to fix these issues');
        } else {
            $this->info('   ✅ Cleanup completed successfully!');
        }

        return self::SUCCESS;
    }

    /**
     * Clean a specific table
     *
     * @param string $table
     * @param bool $dryRun
     * @return array ['fixed' => int, 'records' => int]
     */
    protected function cleanTable(string $table, bool $dryRun): array
    {
        $fields = [
            ...($this->plainTextFields[$table] ?? []),
            ...($this->richTextFields[$table] ?? []),
        ];

        if (empty($fields)) {
            $this->comment("  ⚠️  No fields to process");
            return ['fixed' => 0, 'records' => 0];
        }

        // Get records with potential malformed entities
        $records = DB::table($table)
            ->where(function ($query) use ($fields) {
                foreach ($fields as $field) {
                    $query->orWhere($field, 'like', '%&amp;%')
                          ->orWhere($field, 'like', '%&lt;%')
                          ->orWhere($field, 'like', '%&gt;%')
                          ->orWhere($field, 'like', '%&quot;%')
                          ->orWhere($field, 'like', '%&apos;%');
                }
            })
            ->get();

        $fixed = 0;
        $processed = 0;

        foreach ($records as $record) {
            $updates = [];
            $recordChanged = false;

            foreach ($fields as $field) {
                if (empty($record->$field)) {
                    continue;
                }

                $value = $record->$field;
                $cleaned = $this->cleanField($value, $field, $table);

                if ($cleaned !== $value) {
                    $updates[$field] = $cleaned;
                    $recordChanged = true;

                    $before = $value;
                    $after = $cleaned;

                    if (strlen($before) > 100) {
                        $before = substr($before, 0, 100) . '...';
                    }
                    if (strlen($after) > 100) {
                        $after = substr($after, 0, 100) . '...';
                    }

                    $this->comment("  📝 Record ID {$record->id}, field '{$field}':");
                    $this->comment("     Before: {$before}");
                    $this->comment("     After:  {$after}");
                    $this->newLine();
                }
            }

            if ($recordChanged) {
                $processed++;
                $fixed += count($updates);

                if (!$dryRun) {
                    DB::table($table)
                        ->where('id', $record->id)
                        ->update($updates);
                }
            }
        }

        $this->comment("  ✨ Scanned: " . count($records) . " records");
        $this->comment("  🔧 Fixed: {$fixed} fields in {$processed} records");

        return ['fixed' => $fixed, 'records' => count($records)];
    }

    /**
     * Clean a field value
     *
     * @param mixed $value
     * @param string $field
     * @param string $table
     * @return mixed
     */
    protected function cleanField($value, string $field, string $table)
    {
        if (empty($value)) {
            return $value;
        }

        // Handle arrays (JSON fields)
        if ($this->isJson($value)) {
            $array = json_decode($value, true);
            if (is_array($array)) {
                $cleaned = array_map(function ($item) use ($field, $table) {
                    return $this->cleanString($item, $field, $table);
                }, $array);
                return json_encode($cleaned);
            }
        }

        // Handle strings
        if (is_string($value)) {
            return $this->cleanString($value, $field, $table);
        }

        return $value;
    }

    /**
     * Clean a string value
     *
     * @param string $value
     * @param string $field
     * @param string $table
     * @return string
     */
    protected function cleanString(string $value, string $field, string $table): string
    {
        // Decode HTML entities recursively to fix &amp;amp;amp;
        $prev = '';
        $iterations = 0;
        while ($value !== $prev && $iterations < 10) {
            $prev = $value;
            $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $iterations++;
        }

        // Check if this is a rich text or plain text field
        $isRichText = in_array($field, $this->richTextFields[$table] ?? []);

        if ($isRichText) {
            // For rich text, strip dangerous tags but preserve safe HTML
            $allowedTags = '<p><br><strong><b><em><i><u><h1><h2><h3><h4><h5><h6><ul><ol><li><a><span><div><table><tr><td><th><img>';
            $value = strip_tags($value, $allowedTags);

            // Remove dangerous attributes
            $value = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/', '', $value);
            $value = preg_replace('/\s*javascript:\s*[^\s"\'>]*/', '', $value);
        } else {
            // For plain text, strip ALL HTML
            $value = strip_tags($value);
        }

        // Normalize whitespace
        $value = preg_replace('/\s+/', ' ', $value);
        $value = trim($value);

        return $value;
    }

    /**
     * Check if a value is JSON
     *
     * @param mixed $value
     * @return bool
     */
    protected function isJson($value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE;
    }
}
