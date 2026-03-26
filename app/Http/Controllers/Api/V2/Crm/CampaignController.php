<?php

namespace App\Http\Controllers\Api\V2\Crm;

use App\Http\Controllers\Controller;
use App\Models\CrmCampaign;
use App\Models\Product;
use App\Services\Crm\SegmentationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
// use Barryvdh\DomPDF\Facade\Pdf; // PDF লাইব্রেরি ইন্সটল করার পর আনকমেন্ট করবেন

class CampaignController extends Controller
{
    use ApiResponse;

    /**
     * 1. Create a Win-back Campaign
     * User Flow: "Win-back Nov" নাম দিয়ে Inactive সেগমেন্ট সিলেক্ট করা।
     */
    public function store(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.marketing.campaigns.create')) {
            return $this->sendError('You do not have permission to create campaigns.', null, 403);
        }

        $request->validate([
            'title' => 'required',
            'crm_segment_id' => 'required|exists:crm_segments,id',
            'products' => 'required|array',
            'products.*.id' => 'required|exists:products,id',
            'products.*.offer_price' => 'required|numeric',
        ]);

        // ১. ক্যাম্পেইন তৈরি
        $campaign = CrmCampaign::create([
            'title' => $request->title,
            'type' => 'pdf_catalog',
            'crm_segment_id' => $request->crm_segment_id,
            'status' => 'active',
            'start_date' => now(),
        ]);

        // ২. প্রোডাক্ট এবং কাস্টম প্রাইস অ্যাটাচ করা
        foreach ($request->products as $item) {
            // প্রোডাক্টের সাথে ভেরিয়েন্ট লোড করছি কারণ প্রাইস variants টেবিলে আছে
            $product = Product::with('variants')->find($item['id']);
            
            // ডিফল্ট ভেরিয়েন্ট থেকে প্রাইস নেওয়া হচ্ছে
            // আপনার SQL অনুযায়ী কলামের নাম: default_retail_price
            $regularPrice = 0;
            if ($product->variants && $product->variants->count() > 0) {
                $regularPrice = $product->variants->first()->default_retail_price;
            }

            $campaign->products()->attach($item['id'], [
                'offer_price' => $item['offer_price'], // ক্যাম্পেইনের অফার প্রাইস
                'regular_price_at_time' => $regularPrice // ভেরিয়েন্ট টেবিল থেকে আসা রেগুলার প্রাইস
            ]);
        }

        return $this->sendSuccess($campaign->load('products'), 'Campaign Created with Custom Prices');
    }

    /**
     * 2. Run Segmentation Manually (For Testing)
     */
    public function runAutoSegmentation()
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.marketing.segmentation.run')) {
            return $this->sendError('You do not have permission to run segmentation.', null, 403);
        }

        $service = new SegmentationService();
        $stats = $service->runSegmentation();
        return $this->sendSuccess($stats, "Segmentation logic executed.");
    }

    /**
     * 3. Generate Custom PDF Catalog Data
     * User Flow: ক্যাম্পেইন আইডি দিলে এটি ডাটা রিটার্ন করবে যা দিয়ে পিডিএফ বানানো হবে।
     */
    public function generatePdf($campaignId)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('crm.marketing.campaigns.generate')) {
            return $this->sendError('You do not have permission to generate campaigns.', null, 403);
        }

        $campaign = CrmCampaign::with(['products', 'segment.customers'])->findOrFail($campaignId);

        // ডাটা প্রস্তুত করা
        $data = [
            'title' => $campaign->title,
            'offer_products' => $campaign->products->map(function($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'image' => $product->thumbnail_id, // থাম্বনেইল হ্যান্ডেল করতে পারেন
                    'regular_price' => $product->pivot->regular_price_at_time, // আগের দাম
                    'offer_price' => $product->pivot->offer_price, // অফার দাম
                ];
            }),
            'valid_until' => 'Limited Time Offer'
        ];

        // API প্রিভিউ এর জন্য JSON রিটার্ন করা হচ্ছে
        return $this->sendSuccess([
            'pdf_data_preview' => $data,
            'message' => 'Pass this data to PDF View to generate file.'
        ]);
    }
}