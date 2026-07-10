<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AnalyzeUnusedFiles extends Command
{
    protected $signature = 'storage:analyze-unused';
    protected $description = 'Analyze unused storage files by comparing with database references';

    public function handle()
    {
        $this->info('Starting unused files analysis...');
        $this->newLine();

        // Step 1: Get all referenced media file IDs from database
        $this->info('Step 1: Finding referenced media files in database...');

        $referencedIds = collect();

        // Check products table for thumbnail_id
        try {
            $productImages = DB::table('products')
                ->whereNotNull('thumbnail_id')
                ->pluck('thumbnail_id');
            $referencedIds = $referencedIds->merge($productImages);
            $this->info("  - Found {$productImages->count()} referenced product thumbnails");
        } catch (\Exception $e) {
            $this->warn("  - Products table: " . $e->getMessage());
        }

        // Check products gallery_images (JSON field)
        try {
            $products = DB::table('products')->whereNotNull('gallery_images')->get();
            $galleryIds = collect();
            foreach ($products as $product) {
                if ($product->gallery_images) {
                    $galleryData = json_decode($product->gallery_images, true);
                    if (is_array($galleryData)) {
                        foreach ($galleryData as $item) {
                            if (isset($item['id'])) {
                                $galleryIds->push($item['id']);
                            }
                        }
                    }
                }
            }
            $referencedIds = $referencedIds->merge($galleryIds);
            $this->info("  - Found {$galleryIds->count()} referenced gallery images");
        } catch (\Exception $e) {
            $this->warn("  - Products gallery: " . $e->getMessage());
        }

        // Check website_products
        try {
            $websiteProducts = DB::table('website_products')
                ->whereNotNull('image_id')
                ->pluck('image_id');
            $referencedIds = $referencedIds->merge($websiteProducts);
            $this->info("  - Found {$websiteProducts->count()} referenced website product images");
        } catch (\Exception $e) {
            $this->warn("  - Website products: " . $e->getMessage());
        }

        // Check catalog_product_images
        try {
            $catalogImages = DB::table('catalog_product_images')
                ->whereNotNull('image_id')
                ->pluck('image_id');
            $referencedIds = $referencedIds->merge($catalogImages);
            $this->info("  - Found {$catalogImages->count()} referenced catalog product images");
        } catch (\Exception $e) {
            $this->warn("  - Catalog product images: " . $e->getMessage());
        }

        // Check sliders
        try {
            $sliderImages = DB::table('sliders')
                ->whereNotNull('image_id')
                ->pluck('image_id');
            $referencedIds = $referencedIds->merge($sliderImages);
            $this->info("  - Found {$sliderImages->count()} referenced slider images");
        } catch (\Exception $e) {
            $this->warn("  - Sliders: " . $e->getMessage());
        }

        // Check categories
        try {
            $categoryImages = DB::table('categories')
                ->whereNotNull('image_id')
                ->pluck('image_id');
            $referencedIds = $referencedIds->merge($categoryImages);
            $this->info("  - Found {$categoryImages->count()} referenced category images");
        } catch (\Exception $e) {
            $this->warn("  - Categories: " . $e->getMessage());
        }

        // Check brands
        try {
            $brandLogos = DB::table('brands')
                ->whereNotNull('logo_id')
                ->pluck('logo_id');
            $referencedIds = $referencedIds->merge($brandLogos);
            $this->info("  - Found {$brandLogos->count()} referenced brand logos");
        } catch (\Exception $e) {
            $this->warn("  - Brands: " . $e->getMessage());
        }

        // Check suppliers
        try {
            $supplierLogos = DB::table('suppliers')
                ->whereNotNull('logo_id')
                ->pluck('logo_id');
            $referencedIds = $referencedIds->merge($supplierLogos);
            $this->info("  - Found {$supplierLogos->count()} referenced supplier logos");
        } catch (\Exception $e) {
            $this->warn("  - Suppliers: " . $e->getMessage());
        }

        $uniqueReferencedIds = $referencedIds->unique()->values();
        $this->info("  Total unique referenced media IDs: {$uniqueReferencedIds->count()}");
        $this->newLine();

        // Step 2: Get all media files from database
        $this->info('Step 2: Getting all media files from database...');

        try {
            $allMediaFiles = DB::table('media_files')
                ->select('id', 'filename', 'path', 'size', 'created_at')
                ->get();

            $this->info("  Total media files in database: {$allMediaFiles->count()}");
            $this->newLine();
        } catch (\Exception $e) {
            $this->error("Could not access media_files table: " . $e->getMessage());
            return 1;
        }

        // Step 3: Find unused media files
        $this->info('Step 3: Identifying unused media files...');

        $unusedMediaFiles = $allMediaFiles->reject(function ($mediaFile) use ($uniqueReferencedIds) {
            return $uniqueReferencedIds->contains($mediaFile->id);
        });

        $this->info("  Unused media files: {$unusedMediaFiles->count()}");
        $this->newLine();

        // Step 4: Calculate storage statistics
        $this->info('Step 4: Storage statistics...');

        $totalSize = $allMediaFiles->sum('size');
        $referencedSize = $allMediaFiles
            ->filter(function ($mediaFile) use ($uniqueReferencedIds) {
                return $uniqueReferencedIds->contains($mediaFile->id);
            })
            ->sum('size');
        $unusedSize = $totalSize - $referencedSize;

        $this->info("  Total storage: " . $this->formatBytes($totalSize));
        $this->info("  Referenced storage: " . $this->formatBytes($referencedSize));
        $this->info("  Unused storage: " . $this->formatBytes($unusedSize));
        $this->newLine();

        // Step 5: Analyze physical files in storage
        $this->info('Step 5: Analyzing physical storage files...');

        $storagePath = storage_path('app/public');
        $physicalFiles = $this->getPhysicalFiles($storagePath);

        $this->info("  Physical files in storage: " . count($physicalFiles));
        $this->newLine();

        // Step 6: Generate detailed report
        $this->info('Step 6: Generating detailed report...');

        $report = [
            'summary' => [
                'total_media_files' => $allMediaFiles->count(),
                'referenced_files' => $uniqueReferencedIds->count(),
                'unused_files' => $unusedMediaFiles->count(),
                'physical_files' => count($physicalFiles),
                'total_storage' => $this->formatBytes($totalSize),
                'referenced_storage' => $this->formatBytes($referencedSize),
                'unused_storage' => $this->formatBytes($unusedSize),
            ],
            'unused_files' => $unusedMediaFiles->map(function ($file) {
                return [
                    'id' => $file->id,
                    'file_name' => $file->filename,
                    'file_path' => $file->path,
                    'file_size' => $this->formatBytes($file->size),
                    'created_at' => $file->created_at,
                    'full_path' => storage_path('app/public/' . $file->path),
                ];
            })->toArray(),
            'categories' => $this->categorizeFiles($unusedMediaFiles),
            'large_unused_files' => $unusedMediaFiles
                ->filter(function ($file) {
                    return $file->size > 1024 * 1024; // > 1MB
                })
                ->map(function ($file) {
                    return [
                        'id' => $file->id,
                        'file_name' => $file->filename,
                        'file_path' => $file->path,
                        'file_size' => $this->formatBytes($file->size),
                        'created_at' => $file->created_at,
                    ];
                })
                ->sortByDesc('file_size')
                ->values()
                ->toArray(),
        ];

        // Save report to JSON file
        $reportPath = storage_path('app/unused_storage_report.json');
        file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT));

        $this->info("  Report saved to: {$reportPath}");
        $this->newLine();

        // Step 7: Display summary
        $this->info('=== ANALYSIS SUMMARY ===');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total media files', $allMediaFiles->count()],
                ['Referenced files', $uniqueReferencedIds->count()],
                ['Unused files', $unusedMediaFiles->count()],
                ['Physical files', count($physicalFiles)],
                ['Storage savings potential', $this->formatBytes($unusedSize)],
            ]
        );

        $this->newLine();
        $this->info('Unused files by category:');
        foreach ($report['categories'] as $category => $count) {
            $this->info("  - {$category}: {$count}");
        }

        $this->newLine();
        $this->warn('Large unused files (> 1MB):');
        foreach ($report['large_unused_files'] as $file) {
            $this->warn("  - {$file['file_name']} ({$file['file_size']}) - ID: {$file['id']}");
        }

        $this->newLine();
        $this->info('✅ Analysis completed successfully!');
        $this->info("📄 Detailed report: {$reportPath}");
        $this->warn('⚠️  Review the report before deleting any files!');

        return 0;
    }

    private function getPhysicalFiles($path, &$results = [])
    {
        $files = scandir($path);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;

            $fullPath = $path . DIRECTORY_SEPARATOR . $file;
            if (is_dir($fullPath)) {
                $this->getPhysicalFiles($fullPath, $results);
            } else {
                $results[] = $fullPath;
            }
        }
        return $results;
    }

    private function categorizeFiles($files)
    {
        $categories = [];
        foreach ($files as $file) {
            $pathParts = explode('/', $file->path);
            $category = $pathParts[0] ?? 'other';
            $categories[$category] = ($categories[$category] ?? 0) + 1;
        }
        return $categories;
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}