<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Setting;
use App\Models\DropshipperConfig; // Batch 16 Model
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DropshipController extends Controller
{
    use ApiResponse;

    /**
     * 1. Get Dropship Catalog (Wholesale Prices)
     */
    public function catalog(Request $request)
    {
        // আমরা প্রোডাক্টগুলো আনব এবং সাথে 'wholesale' চ্যানেলের প্রাইস লোড করব
        $query = Product::with(['thumbnail', 'variants.channelSettings' => function($q) {
            $q->where('channel', 'wholesale'); // শুধু হোলসেল প্রাইস দেখাবে
        }])->where('status', 'published');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $products = $query->paginate(20);

        // ডাটা মডিফাই করা (যাতে ফ্রন্টএন্ডে সহজে দেখানো যায়)
        $products->getCollection()->transform(function ($product) {
            foreach ($product->variants as $variant) {
                // যদি হোলসেল প্রাইস সেট করা থাকে, সেটিই হবে cost_price
                // না থাকলে ডিফল্ট রিটেইল প্রাইস থেকে ১০% ডিসকাউন্ট (লজিক)
                $wholesaleSetting = $variant->channelSettings->first();
                
                $variant->dropship_price = $wholesaleSetting 
                    ? $wholesaleSetting->price 
                    : ($variant->default_retail_price * 0.90); 
                
                $variant->suggested_retail = $variant->default_retail_price;
            }
            return $product;
        });

        return $this->sendSuccess($products);
    }

    /**
     * 2. Place Dropship Order
     */
    public function placeOrder(Request $request)
    {
        $request->validate([
            'customer_name' => 'required|string',
            'customer_phone' => 'required|string',
            'customer_address' => 'required|string',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:cod,wallet'
        ]);

        $user = Auth::user();
        $dropshipperProfile = $user->customer; // Assuming User hasOne Customer

        // A. Security Check (Minimum Balance)
        $minBalance = Setting::where('key', 'min_dropship_balance')->value('value') ?? 0;
        
        if ($dropshipperProfile->wallet_balance < $minBalance) {
            return $this->sendError("Insufficient Security Deposit. You need minimum {$minBalance} TK in your wallet.");
        }

        DB::beginTransaction();
        try {
            // B. Calculate Totals
            $totalAmount = 0;
            $orderItems = [];

            foreach ($request->items as $item) {
                $variant = \App\Models\ProductVariant::find($item['variant_id']);
                
                // Fetch Wholesale Price logic again
                $wholesalePrice = DB::table('product_channel_settings')
                    ->where('product_variant_id', $variant->id)
                    ->where('channel_slug', 'wholesale') // Or 'wholesale_web'
                    ->value('price') ?? ($variant->default_retail_price * 0.90);

                $lineTotal = $wholesalePrice * $item['quantity'];
                $totalAmount += $lineTotal;

                $orderItems[] = [
                    'variant' => $variant,
                    'price' => $wholesalePrice,
                    'qty' => $item['quantity']
                ];
            }

            // C. Create Order
            $order = SalesOrder::create([
                'invoice_no' => 'DS-' . time(),
                'customer_id' => $dropshipperProfile->id, // Invoice ড্রপশিপারের নামে
                'sold_by' => $user->id,
                'channel' => 'wholesale_web',
                'status' => 'pending',
                'total_amount' => $totalAmount,
                'due_amount' => $request->payment_method == 'cod' ? $totalAmount : 0,
                'paid_amount' => $request->payment_method == 'wallet' ? $totalAmount : 0,
                'payment_status' => $request->payment_method == 'cod' ? 'pending' : 'paid',
                
                // Special Dropship Data
                'shipping_address' => json_encode([
                    'name' => $request->customer_name,
                    'phone' => $request->customer_phone,
                    'address' => $request->customer_address
                ]),
                'external_source' => 'dropship_portal',
                'external_data' => ['is_blind_shipment' => true]
            ]);

            // D. Save Items
            foreach ($orderItems as $item) {
                SalesOrderItem::create([
                    'sales_order_id' => $order->id,
                    'product_variant_id' => $item['variant']->id,
                    'quantity' => $item['qty'],
                    'unit_price' => $item['price'],
                    'total_price' => $item['price'] * $item['qty'],
                ]);
            }

            // E. Deduct Wallet if not COD
            if ($request->payment_method == 'wallet') {
                if ($dropshipperProfile->wallet_balance < $totalAmount) {
                     throw new \Exception("Insufficient wallet balance for payment.");
                }
                $dropshipperProfile->decrement('wallet_balance', $totalAmount);
                // Record Transaction Log...
            }

            DB::commit();
            return $this->sendSuccess($order, 'Dropship Order Placed Successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Order Failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * 3. Generate Packing Slip (White Label)
     */
    public function printLabel($orderId)
    {
        $order = SalesOrder::with('items.variant.product')->findOrFail($orderId);
        
        // Check permission
        if ($order->customer_id != Auth::user()->customer->id) {
            return $this->sendError('Unauthorized', null, 403);
        }

        // Get Dropshipper Config (Logo, Shop Name)
        $config = DropshipperConfig::where('user_id', Auth::id())->first();
        
        $senderInfo = [
            'name' => $config->store_name ?? 'Logistics Hub', // আপনার নাম হাইড থাকবে
            'phone' => Auth::user()->phone,
            'logo' => $config->logo_url
        ];

        $receiverInfo = json_decode($order->shipping_address);

        // In real app, render a PDF View here
        return response()->json([
            'layout' => 'packing_slip',
            'sender' => $senderInfo,
            'receiver' => $receiverInfo,
            'items' => $order->items
        ]);
    }
}