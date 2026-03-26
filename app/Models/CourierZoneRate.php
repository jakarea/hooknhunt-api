<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourierZoneRate extends Model
{
    protected $guarded = ['id'];

    // রিলেশনশিপ: এই রেটটি কোন কুরিয়ারের?
    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }
}