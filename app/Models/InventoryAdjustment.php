<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\InventoryAdjustmentItem;

class InventoryAdjustment extends Model
{
    protected $guarded = ['id'];

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function items()
    {
        // নিশ্চিত হন আপনার আইটেম মডেল আছে অথবা সরাসরি টেবিল কুয়েরি করুন
        // যদি মডেল না থাকে, আমরা hasMany ব্যবহার করতে পারব না।
        // সেফটির জন্য আমি কন্ট্রোলারে DB::table ব্যবহার করেছি।
        
        // তবে যদি মডেল তৈরি করতে চান:
        return $this->hasMany(InventoryAdjustmentItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}