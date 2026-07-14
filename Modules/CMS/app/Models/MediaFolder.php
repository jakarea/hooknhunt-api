<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MediaFolder extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id',
        'sort_order',
        'is_public',
        'allowed_roles',
        'view_roles',
        'edit_roles',
    ];

    protected $casts = [
        'allowed_roles' => 'array',
        'view_roles' => 'array',
        'edit_roles' => 'array',
        'is_public' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the child folders.
     */
    public function children(): HasMany
    {
        return $this->hasMany(MediaFolder::class, 'parent_id')->orderBy('sort_order');
    }

    /**
     * Get the parent folder.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(MediaFolder::class, 'parent_id');
    }

    /**
     * Get the media files in this folder.
     */
    public function mediaFiles(): HasMany
    {
        return $this->hasMany(MediaFile::class, 'folder_id')->latest();
    }

    /**
     * Get all descendants (recursive children).
     */
    public function descendants(): HasMany
    {
        return $this->hasMany(MediaFolder::class, 'parent_id')->with('descendants');
    }

    /**
     * Load all nested children recursively with file counts.
     * Used for API tree structure response.
     */
    public function loadNestedChildren()
    {
        $this->load(['children' => function ($query) {
            $query->withCount('mediaFiles')
                  ->orderBy('sort_order')
                  ->orderBy('name');
        }]);

        // Recursively load children's children
        foreach ($this->children as $child) {
            $child->loadNestedChildren();
        }

        return $this;
    }

    /**
     * Get the full path of the folder.
     */
    public function getFullPath(): string
    {
        $path = [$this->name];
        $parent = $this->parent;

        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }

        return implode(' / ', $path);
    }

    /**
     * Check if user can access this folder.
     * NOTE: Authorization logic should be handled by Policies/Controllers.
     * This is a data model helper that checks role-based access without User model dependency.
     *
     * @param string|null $userRoleSlug User's role slug (not User object - no Core dependency)
     * @return bool
     */
    public function canBeAccessedBy(?string $userRoleSlug = null): bool
    {
        if ($this->is_public) {
            return true;
        }

        if (!$userRoleSlug) {
            return false;
        }

        $allowedRoles = $this->allowed_roles ?? [];
        return empty($allowedRoles) || in_array($userRoleSlug, $allowedRoles);
    }

    /**
     * Check if user can view this folder.
     *
     * @param string|null $userRoleSlug User's role slug (not User object - no Core dependency)
     * @return bool
     */
    public function canBeViewedBy(?string $userRoleSlug = null): bool
    {
        if (!$userRoleSlug) {
            return $this->is_public ?? false;
        }

        // Super admin can view everything
        if ($userRoleSlug === 'super_admin') {
            return true;
        }

        $viewRoles = $this->view_roles ?? [];
        return empty($viewRoles) || in_array($userRoleSlug, $viewRoles);
    }

    /**
     * Check if user can edit/delete this folder.
     *
     * @param string|null $userRoleSlug User's role slug (not User object - no Core dependency)
     * @return bool
     */
    public function canBeEditedBy(?string $userRoleSlug = null): bool
    {
        if (!$userRoleSlug) {
            return false;
        }

        // Super admin can edit everything
        if ($userRoleSlug === 'super_admin') {
            return true;
        }

        $editRoles = $this->edit_roles ?? [];
        return empty($editRoles) || in_array($userRoleSlug, $editRoles);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate slug from name
        static::saving(function ($folder) {
            if ($folder->isDirty('name') && !$folder->slug) {
                $folder->slug = Str::slug($folder->name);
            }
        });
    }
}
