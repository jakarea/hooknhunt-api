<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\DocumentAttachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class AuditService
{
    /**
     * Log a model event
     */
    public function log(Model $model, string $action, ?string $description = null): AuditLog
    {
        return AuditLog::createLog([
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'entity_identifier' => $this->getEntityIdentifier($model),
            'action' => $action,
            'description' => $description ?? $this->getDefaultDescription($model, $action),
            'old_values' => $this->getOldValues($model, $action),
            'new_values' => $this->getNewValues($model, $action),
            'changed_fields' => $this->getChangedFields($model, $action),
            'metadata' => [
                'connection' => $model->getConnectionName(),
                'table' => $model->getTable(),
            ],
        ]);
    }

    /**
     * Log model creation
     */
    public function logCreated(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'created', $description);
    }

    /**
     * Log model update
     */
    public function logUpdated(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'updated', $description);
    }

    /**
     * Log model deletion
     */
    public function logDeleted(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'deleted', $description);
    }

    /**
     * Log model restoration
     */
    public function logRestored(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'restored', $description);
    }

    /**
     * Log approval action
     */
    public function logApproved(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'approved', $description);
    }

    /**
     * Log rejection action
     */
    public function logRejected(Model $model, ?string $description = null): AuditLog
    {
        return $this->log($model, 'rejected', $description);
    }

    /**
     * Log reversal entry
     */
    public function logReversal(Model $model, int $originalAuditId, string $reason): AuditLog
    {
        return AuditLog::createLog([
            'entity_type' => get_class($model),
            'entity_id' => $model->id,
            'entity_identifier' => $this->getEntityIdentifier($model),
            'action' => 'reversed',
            'description' => "Reversed original transaction. Reason: {$reason}",
            'old_values' => $model->getAttributes(),
            'original_audit_id' => $originalAuditId,
            'reversal_reason' => $reason,
            'metadata' => [
                'connection' => $model->getConnectionName(),
                'table' => $model->getTable(),
                'reversal' => true,
            ],
        ]);
    }

    /**
     * Get audit history for an entity
     */
    public function getHistory(Model $model, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::forEntity(get_class($model), $model->id)
            ->with('performer', 'documents')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get entity identifier
     */
    protected function getEntityIdentifier(Model $model): ?string
    {
        // Try common identifier fields
        $identifierFields = [
            'name', 'title', 'code', 'number', 'reference_number',
            'invoice_number', 'account_number', 'transaction_number',
        ];

        foreach ($identifierFields as $field) {
            if (isset($model->{$field}) && !empty($model->{$field})) {
                return (string) $model->{$field};
            }
        }

        // Fallback to ID
        return '#' . $model->id;
    }

    /**
     * Get default description
     */
    protected function getDefaultDescription(Model $model, string $action): string
    {
        $identifier = $this->getEntityIdentifier($model);
        $modelName = class_basename($model);

        return match ($action) {
            'created' => "Created new {$modelName}: {$identifier}",
            'updated' => "Updated {$modelName}: {$identifier}",
            'deleted' => "Deleted {$modelName}: {$identifier}",
            'restored' => "Restored {$modelName}: {$identifier}",
            'approved' => "Approved {$modelName}: {$identifier}",
            'rejected' => "Rejected {$modelName}: {$identifier}",
            'reversed' => "Reversed {$modelName}: {$identifier}",
            default => "{$action} {$modelName}: {$identifier}",
        };
    }

    /**
     * Get old values for update
     */
    protected function getOldValues(Model $model, string $action): ?array
    {
        if ($action !== 'updated') {
            return null;
        }

        // Get the original values from the model's dirty state
        $original = [];
        foreach ($model->getDirty() as $key => $value) {
            $original[$key] = $model->getOriginal($key);
        }

        return $original;
    }

    /**
     * Get new values
     */
    protected function getNewValues(Model $model, string $action): ?array
    {
        if ($action === 'deleted') {
            return $model->getAttributes();
        }

        if ($action === 'updated') {
            return $model->getDirty();
        }

        return $model->getAttributes();
    }

    /**
     * Get changed fields
     */
    protected function getChangedFields(Model $model, string $action): ?array
    {
        if ($action !== 'updated') {
            return null;
        }

        return array_keys($model->getDirty());
    }

    /**
     * Attach document to audit log
     */
    public function attachDocument(AuditLog $auditLog, $file, array $metadata = []): DocumentAttachment
    {
        return DocumentAttachment::storeDocument($file, array_merge($metadata, [
            'audit_log_id' => $auditLog->id,
            'entity_type' => $auditLog->entity_type,
            'entity_id' => $auditLog->entity_id,
        ]));
    }

    /**
     * Bulk log import operations
     */
    public function logImport(string $entityType, array $records): void
    {
        AuditLog::createLog([
            'entity_type' => $entityType,
            'entity_id' => 0,
            'action' => 'created',
            'description' => "Bulk imported " . count($records) . " {$entityType} records",
            'new_values' => ['imported_count' => count($records)],
            'metadata' => [
                'bulk_operation' => true,
                'record_count' => count($records),
                'source' => 'import',
            ],
        ]);
    }

    /**
     * Log API access
     */
    public function logApiAccess(string $endpoint, string $method, ?int $userId = null): AuditLog
    {
        return AuditLog::createLog([
            'entity_type' => 'ApiRequest',
            'entity_id' => 0,
            'entity_identifier' => $method . ' ' . $endpoint,
            'action' => 'accessed',
            'description' => "API endpoint accessed: {$method} {$endpoint}",
            'performed_by' => $userId,
            'metadata' => [
                'endpoint' => $endpoint,
                'method' => $method,
                'source' => 'api',
            ],
        ]);
    }

    /**
     * Search audit logs
     */
    public function search(array $filters): \Illuminate\Database\Eloquent\Builder
    {
        $query = AuditLog::query()->with('performer');

        // Filter by entity
        if (isset($filters['entity_type']) && isset($filters['entity_id'])) {
            $query->forEntity($filters['entity_type'], $filters['entity_id']);
        }

        // Filter by action
        if (isset($filters['action'])) {
            $query->withAction($filters['action']);
        }

        // Filter by user
        if (isset($filters['user_id'])) {
            $query->byUser($filters['user_id']);
        }

        // Filter by date range
        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->inDateRange($filters['start_date'], $filters['end_date']);
        }

        // Search in description
        if (isset($filters['search'])) {
            $query->where('description', 'like', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('created_at', 'desc');
    }
}
