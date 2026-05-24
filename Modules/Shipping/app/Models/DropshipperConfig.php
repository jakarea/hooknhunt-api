<?php

namespace App\Modules\Shipping\Models;

use Illuminate\Database\Eloquent\Model;

class DropshipperConfig extends Model
{
    protected $guarded = ['id'];

    public function user()
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class);
    }
}