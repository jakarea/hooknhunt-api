<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    // মেনু আইটেমগুলো JSON আকারে থাকবে
    protected $casts = [
        'items' => 'array', 
        'is_active' => 'boolean'
    ];
}