<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmSegment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_auto' => 'boolean',
    ];

    // এই গ্রুপে কারা কারা আছে
    public function customers()
    {
        return $this->belongsToMany(Customer::class, 'customer_crm_segment');
    }
}