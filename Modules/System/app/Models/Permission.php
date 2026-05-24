<?php

namespace App\Modules\System\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $guarded = ['id'];

    // Relation: A permission belongs to many roles (removed for independence - handled by Admin module)
    // public function roles()
    // {
    //     return $this->belongsToMany(Role::class, 'role_permission');
    // }
}