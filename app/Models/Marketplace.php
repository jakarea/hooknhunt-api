<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Marketplace extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
        'sync_stock' => 'boolean',
        'sync_price' => 'boolean',
        'token_expires_at' => 'datetime',
    ];
}