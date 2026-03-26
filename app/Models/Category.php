<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $guarded = ['id'];

    // Relation: Parent Category
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    // Relation: Sub Categories (Recursive)
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    // Relation: Products
    public function products()
    {
        return $this->hasMany(Product::class);
    }
}