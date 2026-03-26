<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProcurementController extends Controller
{
    use ApiResponse;

    /**
     * List procurement products (optimized for speed)
     * Only selects necessary columns, eager loads relations
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.index')) {
            return $this->sendError('You do not have permission to view procurement products.', null, 403);
        }

        $query = Product::select('id', 'name', 'slug', 'category_id', 'brand_id', 'thumbnail_id', 'status', 'created_at')
            ->with(['category:id,name', 'brand:id,name', 'thumbnail:id,file_path', 'suppliers:id,name'])
            ->with(['suppliers' => function ($q) {
                $q->withPivot('product_links'); // Load pivot data
            }]);

        // Fast search using index
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        // Filter by category
        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by brand
        if ($request->brand_id) {
            $query->where('brand_id', $request->brand_id);
        }

        // Filter by status
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Only show products that have suppliers linked (procurement products)
        $query->whereHas('suppliers');

        // Fast pagination
        $perPage = min($request->per_page ?? 20, 100); // Max 100 to prevent slowdown
        $page = $request->page ?? 1;

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        // Transform suppliers to include pivot data
        $paginated->through(function ($product) {
            $product->suppliers->transform(function ($supplier) {
                $supplier->product_links = json_decode($supplier->pivot->product_links ?? '[]', true);
                unset($supplier->pivot);
                return $supplier;
            });
            return $product;
        });

        return $this->sendSuccess($paginated);
    }

    /**
     * Create procurement product (minimal DB queries, transaction)
     */
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.create')) {
            return $this->sendError('You do not have permission to create procurement products.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'thumbnail_id' => 'nullable|exists:media_files,id',
            'suppliers' => 'required|array|min:1',
            'suppliers.*.supplier_id' => 'required|exists:suppliers,id',
            'suppliers.*.product_links' => 'nullable|array',
            'suppliers.*.product_links.*' => 'url',
            'status' => 'in:draft,published',
        ]);

        DB::beginTransaction();
        try {
            // Create product (single query)
            $product = Product::create([
                'name' => $request->name,
                'slug' => Str::slug($request->name) . '-' . time(),
                'category_id' => $request->category_id,
                'brand_id' => $request->brand_id,
                'thumbnail_id' => $request->thumbnail_id,
                'status' => $request->status ?? 'draft',
            ]);

            // Attach suppliers with pivot data (single query using sync)
            $syncData = [];
            foreach ($request->suppliers as $supplier) {
                $syncData[$supplier['supplier_id']] = [
                    'product_links' => isset($supplier['product_links'])
                        ? json_encode($supplier['product_links'])
                        : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            $product->suppliers()->sync($syncData);

            DB::commit();

            // Load relations for response with pivot data
            $product->load(['category:id,name', 'brand:id,name', 'thumbnail:id,file_path', 'suppliers' => function ($q) {
                $q->select('suppliers.id', 'suppliers.name')->withPivot('product_links');
            }]);
            $product->suppliers->transform(function ($supplier) {
                $supplier->product_links = json_decode($supplier->pivot->product_links ?? '[]', true);
                unset($supplier->pivot);
                return $supplier;
            });

            return $this->sendSuccess($product, 'Procurement product created successfully', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create procurement product', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get single procurement product with supplier details
     */
    public function show($id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.index')) {
            return $this->sendError('You do not have permission to view procurement products.', null, 403);
        }

        $product = Product::select('id', 'name', 'slug', 'category_id', 'brand_id', 'thumbnail_id', 'status', 'created_at')
            ->with(['category:id,name', 'brand:id,name', 'thumbnail:id,file_path'])
            ->with(['suppliers']) // Load all supplier columns and pivot (model has withPivot defined)
            ->findOrFail($id);

        // Transform suppliers to include product_links from pivot
        $product->suppliers->transform(function ($supplier) {
            $supplier->product_links = json_decode($supplier->pivot->product_links ?? '[]', true);
            unset($supplier->pivot); // Remove pivot from response
            return $supplier;
        });

        return $this->sendSuccess($product);
    }

    /**
     * Update procurement product
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.edit')) {
            return $this->sendError('You do not have permission to edit procurement products.', null, 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category_id' => 'sometimes|required|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'thumbnail_id' => 'nullable|exists:media_files,id',
            'suppliers' => 'sometimes|required|array|min:1',
            'suppliers.*.supplier_id' => 'required|exists:suppliers,id',
            'suppliers.*.product_links' => 'nullable|array',
            'suppliers.*.product_links.*' => 'url',
            'status' => 'in:draft,published',
        ]);

        $product = Product::findOrFail($id);

        DB::beginTransaction();
        try {
            // Update product fields
            $product->update([
                'name' => $request->name ?? $product->name,
                'slug' => $request->name ? Str::slug($request->name) . '-' . time() : $product->slug,
                'category_id' => $request->category_id ?? $product->category_id,
                'brand_id' => $request->brand_id ?? $product->brand_id,
                'thumbnail_id' => $request->thumbnail_id ?? $product->thumbnail_id,
                'status' => $request->status ?? $product->status,
            ]);

            // Update suppliers if provided
            if ($request->has('suppliers')) {
                $syncData = [];
                foreach ($request->suppliers as $supplier) {
                    $syncData[$supplier['supplier_id']] = [
                        'product_links' => isset($supplier['product_links'])
                            ? json_encode($supplier['product_links'])
                            : null,
                        'updated_at' => now(),
                    ];
                }
                $product->suppliers()->sync($syncData);
            }

            DB::commit();

            // Load relations for response with pivot data
            $product->load(['category:id,name', 'brand:id,name', 'thumbnail:id,file_path', 'suppliers' => function ($q) {
                $q->select('suppliers.id', 'suppliers.name')->withPivot('product_links');
            }]);
            $product->suppliers->transform(function ($supplier) {
                $supplier->product_links = json_decode($supplier->pivot->product_links ?? '[]', true);
                unset($supplier->pivot);
                return $supplier;
            });

            return $this->sendSuccess($product, 'Procurement product updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update procurement product', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete procurement product (soft delete)
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.delete')) {
            return $this->sendError('You do not have permission to delete procurement products.', null, 403);
        }

        $product = Product::findOrFail($id);

        DB::beginTransaction();
        try {
            $product->delete();
            DB::commit();
            return $this->sendSuccess(null, 'Procurement product deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to delete procurement product', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Quick status change
     */
    public function updateStatus(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.status')) {
            return $this->sendError('You do not have permission to update procurement product status.', null, 403);
        }

        $request->validate([
            'status' => 'required|in:draft,published'
        ]);

        $product = Product::findOrFail($id);
        $product->update(['status' => $request->status]);

        return $this->sendSuccess($product, 'Status updated successfully');
    }

    /**
     * Get products by supplier
     */
    public function getBySupplier(Request $request, $supplierId)
    {
        if (!auth()->user()->hasPermissionTo('procurement.products.index')) {
            return $this->sendError('You do not have permission to view procurement products.', null, 403);
        }

        $query = Product::select('id', 'name', 'slug', 'category_id', 'brand_id', 'thumbnail_id', 'status', 'created_at')
            ->whereHas('suppliers', function ($q) use ($supplierId) {
                $q->where('suppliers.id', $supplierId);
            })
            ->with(['category:id,name', 'brand:id,name', 'thumbnail:id,file_path'])
            ->with(['suppliers' => function ($q) use ($supplierId) {
                $q->where('suppliers.id', $supplierId)->withPivot('product_links', 'supplier_sku', 'cost_price');
            }]);

        // Filter by status
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Fast pagination
        $perPage = min($request->per_page ?? 20, 100);
        $page = $request->page ?? 1;

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        // Transform suppliers to include pivot data
        $paginated->through(function ($product) {
            $product->suppliers->transform(function ($supplier) {
                $supplier->product_links = json_decode($supplier->pivot->product_links ?? '[]', true);
                $supplier->cost_price = $supplier->pivot->cost_price;
                $supplier->supplier_sku = $supplier->pivot->supplier_sku;
                unset($supplier->pivot);
                return $supplier;
            });
            return $product;
        });

        return $this->sendSuccess($paginated);
    }

    /**
     * Get statistics for dashboard
     */
    public function statistics()
    {
        // Cache this for performance - refresh every 5 minutes
        $stats = cache()->remember('procurement.stats', 300, function () {
            return [
                'total_products' => Product::whereHas('suppliers')->count(),
                'published_products' => Product::whereHas('suppliers')->where('status', 'published')->count(),
                'draft_products' => Product::whereHas('suppliers')->where('status', 'draft')->count(),
                'total_suppliers' => \App\Models\Supplier::count(),
            ];
        });

        return $this->sendSuccess($stats);
    }
}
