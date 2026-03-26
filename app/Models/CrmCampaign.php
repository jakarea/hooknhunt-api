<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmCampaign extends Model
{
    protected $guarded = ['id'];

    // টার্গেট অডিয়েন্স
    public function segment()
    {
        return $this->belongsTo(CrmSegment::class, 'crm_segment_id');
    }

    // ক্যাম্পেইনের স্পেশাল প্রোডাক্ট ও প্রাইস
    public function products()
    {
        return $this->belongsToMany(Product::class, 'crm_campaign_products')
                    ->withPivot('offer_price', 'regular_price_at_time')
                    ->withTimestamps();
    }
}