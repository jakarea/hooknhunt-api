<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentAttachment extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'file_size' => 'integer',
        'document_date' => 'date:Y-m-d', // Fixed timezone offset
        'is_confidential' => 'boolean',
        'allowed_roles' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // uploader() relationship removed for 100% module independence
    // CMS module no longer depends on Core module's User model
    // Use uploaded_by directly and fetch user data via API if needed
    // public function uploader(): BelongsTo
    // {
    //     return $this->belongsTo(\App\Modules\System\Models\User::class, 'uploaded_by');
    // }

    /**
     * Get uploader user ID (stored as integer, no Core module dependency)
     */
    public function uploaderId(): int
    {
        return (int) $this->uploaded_by;
    }

    /**
     * Check if current user is the uploader
     */
    public function isUploadedBy(int $userId): bool
    {
        return $this->uploaded_by === $userId;
    }

    // AuditLog relationship removed (Admin module dependency breaks independence)
    // Use audit_log_id directly or API calls to Admin module
    // public function auditLog(): BelongsTo
    // {
    //     return $this->belongsTo(AuditLog::class);
    // }

    /**
     * Scope: For entity
     */
    public function scopeForEntity($query, string $entityType, int $entityId)
    {
        return $query->where('entity_type', $entityType)
            ->where('entity_id', $entityId);
    }

    /**
     * Scope: By document type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('document_type', $type);
    }

    /**
     * Scope: Confidential documents
     */
    public function scopeConfidential($query)
    {
        return $query->where('is_confidential', true);
    }

    /**
     * Scope: Public documents
     */
    public function scopePublic($query)
    {
        return $query->where('is_confidential', false);
    }

    /**
     * Get file size in human readable format
     */
    public function getFileSizeHumanAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get file URL
     */
    public function getUrlAttribute(): string
    {
        return storage_path('app/' . $this->file_path);
    }

    /**
     * Get download URL
     */
    public function getDownloadUrlAttribute(): string
    {
        return url('/api/v2/documents/' . $this->id . '/download');
    }

    /**
     * Check if user can access this document
     * NOTE: This is a data model check only. Authorization logic should be in:
     * - Controller/Request classes for API access
     * - Policy classes for granular permissions
     *
     * @param int|null $userId User ID to check (not User object - no Core dependency)
     * @param array|null $userRoles Array of role slugs/IDs the user has
     * @return bool
     */
    public function canBeAccessedBy(?int $userId, ?array $userRoles = null): bool
    {
        // If not confidential, anyone can access
        if (!$this->is_confidential) {
            return true;
        }

        // If no user, deny access
        if (!$userId) {
            return false;
        }

        // Uploader can always access
        if ($this->uploaded_by === $userId) {
            return true;
        }

        // Check allowed roles (caller provides roles array)
        if ($this->allowed_roles && is_array($this->allowed_roles) && $userRoles) {
            return !empty(array_intersect($userRoles, $this->allowed_roles));
        }

        return false;
    }

    /**
     * Store document and create attachment record
     */
    public static function storeDocument($file, array $data): self
    {
        $path = $file->store('documents', 'public');

        return static::create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_extension' => $file->getClientOriginalExtension(),
            'entity_type' => $data['entity_type'] ?? null,
            'entity_id' => $data['entity_id'] ?? null,
            'audit_log_id' => $data['audit_log_id'] ?? null,
            'document_type' => $data['document_type'] ?? null,
            'document_number' => $data['document_number'] ?? null,
            'document_date' => $data['document_date'] ?? null,
            'description' => $data['description'] ?? null,
            'is_confidential' => $data['is_confidential'] ?? false,
            'allowed_roles' => $data['allowed_roles'] ?? null,
            'uploaded_by' => auth()->id(),
        ]);
    }
}
