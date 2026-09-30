<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an action to the immutable audit trail.
     */
    public static function log(
        string $action,
        ?int $userId = null,
        ?int $caseId = null,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $beforeState = null,
        ?array $afterState = null
    ): void {
        try {
            DB::table('audit_logs')->insert([
                'user_id' => $userId ?? (auth()->id() ?? null),
                'case_id' => $caseId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'before_state' => $beforeState ? json_encode($beforeState) : null,
                'after_state' => $afterState ? json_encode($afterState) : null,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Audit log failure should be logged but never crash primary workflow
            \Log::error("Audit log creation failed: " . $e->getMessage());
        }
    }
}
