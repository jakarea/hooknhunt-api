<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Shipment;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Supplier::latest();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%")
                  ->orWhere('shop_name', 'like', "%{$request->search}%");
        }

        return $this->sendSuccess($query->paginate(15));
    }

    // Dropdown List (ID & Name Only)
    public function dropdown()
    {
        return $this->sendSuccess(Supplier::where('is_active', true)->select('id', 'name', 'shop_name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'whatsapp' => 'nullable|string',
            'shop_url' => 'nullable|url',
            'shop_name' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'phone' => 'nullable|string',
            'wechat_id' => 'nullable|string',
            'wechat_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'wechat_qr_url' => 'nullable|url',
            'alipay_id' => 'nullable|string',
            'alipay_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'alipay_qr_url' => 'nullable|url',
            'address' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        // Handle file uploads
        $data = $validated;
        if ($request->hasFile('wechat_qr_file')) {
            $path = $request->file('wechat_qr_file')->store('wechat_qr_codes', 'public');
            $data['wechat_qr_file'] = $path;
        }
        if ($request->hasFile('alipay_qr_file')) {
            $path = $request->file('alipay_qr_file')->store('alipay_qr_codes', 'public');
            $data['alipay_qr_file'] = $path;
        }

        $supplier = Supplier::create($data);
        return $this->sendSuccess($supplier, 'Supplier created successfully', 201);
    }

    public function show($id)
    {
        return $this->sendSuccess(Supplier::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string',
            'email' => 'sometimes|required|email',
            'whatsapp' => 'nullable|string',
            'shop_url' => 'nullable|url',
            'shop_name' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'phone' => 'nullable|string',
            'wechat_id' => 'nullable|string',
            'wechat_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'wechat_qr_url' => 'nullable|url',
            'alipay_id' => 'nullable|string',
            'alipay_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'alipay_qr_url' => 'nullable|url',
            'address' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $supplier = Supplier::findOrFail($id);

        // Handle file uploads
        $data = $validated;
        if ($request->hasFile('wechat_qr_file')) {
            $path = $request->file('wechat_qr_file')->store('wechat_qr_codes', 'public');
            $data['wechat_qr_file'] = $path;
        }
        if ($request->hasFile('alipay_qr_file')) {
            $path = $request->file('alipay_qr_file')->store('alipay_qr_codes', 'public');
            $data['alipay_qr_file'] = $path;
        }

        $supplier->update($data);
        return $this->sendSuccess($supplier, 'Supplier updated successfully');
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();
        return $this->sendSuccess(null, 'Supplier deleted successfully');
    }

    /**
     * Supplier Ledger (Transaction History)
     * Shipment এবং Payment এর লজিক বসলে এটি পূর্ণাঙ্গ হবে।
     */
    public function ledger($id)
    {
        // For now, we return empty structure. 
        // We will implement this fully in Batch 9 (Accounting)
        return $this->sendSuccess([
            'total_purchase' => 0,
            'total_paid' => 0,
            'due_amount' => 0,
            'transactions' => []
        ]);
    }

    /**
     * Get Purchase History (Shipments) for a Supplier
     */
    public function purchaseHistory($id)
    {
        $supplier = Supplier::findOrFail($id);
        
        // সাপ্লায়ারের সব শিপমেন্ট নিয়ে আসা
        $shipments = Shipment::where('supplier_id', $id)
                        ->withCount('items') // কতগুলো আইটেম ছিল
                        ->latest()
                        ->paginate(20);

        return $this->sendSuccess([
            'supplier' => $supplier->name,
            'history' => $shipments
        ]);
    }
}