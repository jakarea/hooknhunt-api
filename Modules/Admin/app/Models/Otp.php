<?php

namespace App\Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;

class Otp extends Model
{
    protected $guarded = ['id'];
    
    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // Helper to check validity
    public function isValid()
    {
        return $this->expires_at->isFuture();
    }
}