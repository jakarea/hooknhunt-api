<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $guarded = ['id'];

    // Relation: A permission belongs to many roles
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permission');
    }
}