<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'changed_fields' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: User who performed the action
     */
    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Relationship: Original audit log (for reversals)
     */
    public function originalAudit(): BelongsTo
    {
        return $this->belongsTo(AuditLog::class, 'original_audit_id');
    }

    /**
     * Relationship: Reversal audit logs
     */
    public function reversals(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'original_audit_id');
    }

    /**
     * Relationship: Document attachments
     */
    public function documents(): HasMany
    {
        return $this->hasMany(DocumentAttachment::class);
    }

    /**
     * Relationship: Related entity (polymorphic)
     */
    public function relatedEntity(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope: Filter by entity type and ID
     */
    public function scopeForEntity($query, string $entityType, int $entityId)
    {
        return $query->where('entity_type', $entityType)
            ->where('entity_id', $entityId);
    }

    /**
     * Scope: Filter by action
     */
    public function scopeWithAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Filter by user
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('performed_by', $userId);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Reversals only
     */
    public function scopeReversals($query)
    {
        return $query->whereNotNull('original_audit_id');
    }

    /**
     * Get action label
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'created' => 'Created',
            'updated' => 'Updated',
            'deleted' => 'Deleted',
            'restored' => 'Restored',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'reversed' => 'Reversed',
            default => ucfirst($this->action),
        };
    }

    /**
     * Get action color
     */
    public function getActionColorAttribute(): string
    {
        return match ($this->action) {
            'created' => 'green',
            'updated' => 'blue',
            'deleted' => 'red',
            'restored' => 'purple',
            'approved' => 'success',
            'rejected' => 'error',
            'reversed' => 'orange',
            default => 'gray',
        };
    }

    /**
     * Get icon for action
     */
    public function getIconAttribute(): string
    {
        return match ($this->action) {
            'created' => 'plus-circle',
            'updated' => 'edit',
            'deleted' => 'trash',
            'restored' => 'refresh',
            'approved' => 'check-circle',
            'rejected' => 'times-circle',
            'reversed' => 'undo',
            default => 'circle',
        };
    }

    /**
     * Check if this is a reversal entry
     */
    public function isReversal(): bool
    {
        return $this->action === 'reversed' || $this->original_audit_id !== null;
    }

    /**
     * Check if this entry has been reversed
     */
    public function hasBeenReversed(): bool
    {
        return $this->reversals()->count() > 0;
    }

    /**
     * Get formatted changed fields
     */
    public function getFormattedChangesAttribute(): array
    {
        if (!$this->changed_fields || !is_array($this->changed_fields)) {
            return [];
        }

        $changes = [];
        foreach ($this->changed_fields as $field) {
            $oldValue = $this->old_values[$field] ?? null;
            $newValue = $this->new_values[$field] ?? null;

            $changes[] = [
                'field' => $field,
                'label' => str_replace('_', ' ', ucfirst($field)),
                'old' => $oldValue,
                'new' => $newValue,
            ];
        }

        return $changes;
    }

    /**
     * Create audit log entry
     */
    public static function createLog(array $data): self
    {
        return static::create([
            'entity_type' => $data['entity_type'],
            'entity_id' => $data['entity_id'],
            'entity_identifier' => $data['entity_identifier'] ?? null,
            'action' => $data['action'],
            'description' => $data['description'] ?? null,
            'performed_by' => auth()->id(),
            'performed_by_name' => auth()->user()?->name,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'old_values' => $data['old_values'] ?? null,
            'new_values' => $data['new_values'] ?? null,
            'changed_fields' => $data['changed_fields'] ?? null,
            'related_entity_type' => $data['related_entity_type'] ?? null,
            'related_entity_id' => $data['related_entity_id'] ?? null,
            'original_audit_id' => $data['original_audit_id'] ?? null,
            'reversal_reason' => $data['reversal_reason'] ?? null,
            'metadata' => $data['metadata'] ?? null,
            'source' => $data['source'] ?? 'web',
        ]);
    }
}
