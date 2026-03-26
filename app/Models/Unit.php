<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    // Migration এ allow_decimal একটি boolean ফিল্ড ছিল
    protected $casts = [
        'allow_decimal' => 'boolean',
    ];

    // Relation: A unit is used by many product variants
    public function productVariants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}