<?php

// namespace App\Services\AgentPipelineService;

// namespace App\Services;

// use App\Models\AgentRequest;
// use App\Models\AgentRequestStatusHistory;
// use App\Models\User;
// use Illuminate\Validation\ValidationException;

// class AgentPipelineService
// {
//     // Valid pipeline statuses in order
//     public const STATUS_REQUEST_RECEIVED  = 'request_received';
//     public const STATUS_UNDER_REVIEW      = 'under_review';
//     public const STATUS_DOCUMENTS_PENDING = 'documents_pending';
//     public const STATUS_GOVT_PORTAL_CHECK = 'govt_portal_check';
//     public const STATUS_DATA_FETCHING     = 'data_fetching';
//     public const STATUS_COMPARISON        = 'comparison';
//     public const STATUS_DEDUCTIONS_REGIME = 'deductions_regime';
//     public const STATUS_FILE_PREPARED     = 'file_prepared';
//     public const STATUS_PAYMENT_PENDING   = 'payment_pending';
//     public const STATUS_CUSTOMER_APPROVAL = 'customer_approval';
//     public const STATUS_CHANGES_REQUESTED = 'changes_requested';
//     public const STATUS_SUBMITTED         = 'submitted';
//     public const STATUS_COMPLETED         = 'completed';

//     /**
//      * Map of allowed next transitions from any given status
//      */
//     protected static array $allowedTransitions = [
//         self::STATUS_REQUEST_RECEIVED => [
//             self::STATUS_UNDER_REVIEW,
//         ],
//         self::STATUS_UNDER_REVIEW => [
//             self::STATUS_DOCUMENTS_PENDING,
//             self::STATUS_GOVT_PORTAL_CHECK,
//         ],
//         self::STATUS_DOCUMENTS_PENDING => [
//             self::STATUS_UNDER_REVIEW,
//         ],
//         self::STATUS_GOVT_PORTAL_CHECK => [
//             self::STATUS_DATA_FETCHING,
//         ],
//         self::STATUS_DATA_FETCHING => [
//             self::STATUS_COMPARISON,
//         ],
//         self::STATUS_COMPARISON => [
//             self::STATUS_DEDUCTIONS_REGIME,
//         ],
//         self::STATUS_DEDUCTIONS_REGIME => [
//             self::STATUS_FILE_PREPARED,
//         ],
//         self::STATUS_FILE_PREPARED => [
//             self::STATUS_PAYMENT_PENDING,
//             self::STATUS_CUSTOMER_APPROVAL, // in case payment is waived or paid instantly
//         ],
//         self::STATUS_PAYMENT_PENDING => [
//             self::STATUS_CUSTOMER_APPROVAL,
//         ],
//         self::STATUS_CUSTOMER_APPROVAL => [
//             self::STATUS_CHANGES_REQUESTED,
//             self::STATUS_SUBMITTED,
//         ],
//         self::STATUS_CHANGES_REQUESTED => [
//             self::STATUS_UNDER_REVIEW,
//             self::STATUS_DEDUCTIONS_REGIME,
//             self::STATUS_FILE_PREPARED,
//             self::STATUS_CUSTOMER_APPROVAL,
//         ],
//         self::STATUS_SUBMITTED => [
//             self::STATUS_COMPLETED,
//         ],
//         self::STATUS_COMPLETED => [],
//     ];

//     /**
//      * Transition an agent request to a new pipeline status with strict validation and audit logging.
//      *
//      * @throws ValidationException
//      */
//     public static function transition(
//         AgentRequest $agentRequest,
//         string $newStatus,
//         ?User $actor = null,
//         ?string $notes = null,
//         array $metadata = []
//     ): AgentRequest {
//         $currentStatus = $agentRequest->pipeline_status ?? self::STATUS_REQUEST_RECEIVED;

//         if ($currentStatus === $newStatus) {
//             return $agentRequest; // No-op if already in desired status
//         }

//         $allowed = self::$allowedTransitions[$currentStatus] ?? [];

//         if (!in_array($newStatus, $allowed, true)) {
//             $formattedCurrent = strtoupper(str_replace('_', ' ', $currentStatus));
//             $formattedTarget  = strtoupper(str_replace('_', ' ', $newStatus));
//             throw ValidationException::withMessages([
//                 'pipeline_status' => [
//                     "Illegal transition: Cannot move from {$formattedCurrent} directly to {$formattedTarget}. The pipeline must follow the strict business sequence."
//                 ],
//             ]);
//         }

//         // Extra business logic gates:
//         // Gate 1: To enter 'data_fetching', customer must be verified as registered on the govt portal
//         if ($newStatus === self::STATUS_DATA_FETCHING && $agentRequest->itr_portal_registered !== true) {
//             throw ValidationException::withMessages([
//                 'itr_portal_registered' => [
//                     "Government ITR portal verification is required. You must verify and confirm portal registration (Yes) before fetching tax data."
//                 ],
//             ]);
//         }

//         // Gate 2: To enter 'customer_approval', payment must be marked paid
//         if ($newStatus === self::STATUS_CUSTOMER_APPROVAL && $agentRequest->payment_status !== 'paid') {
//             throw ValidationException::withMessages([
//                 'payment_status' => [
//                     "Payment required: Filing fee must be paid before moving to customer approval."
//                 ],
//             ]);
//         }

//         // Save old status for audit
//         $fromStatus = $currentStatus;

//         // Sync legacy status column to maintain full backward-compatibility with existing CA list views
//         $legacyStatus = self::mapToLegacyStatus($newStatus, $agentRequest->assigned_employee_id);

//         $agentRequest->pipeline_status = $newStatus;
//         $agentRequest->status = $legacyStatus;

//         if ($newStatus === self::STATUS_COMPLETED && empty($agentRequest->completed_at)) {
//             $agentRequest->completed_at = now();
//         }

//         $agentRequest->save();

//         // Write immutable audit log
//         AgentRequestStatusHistory::create([
//             'agent_request_id'   => $agentRequest->id,
//             'from_status'        => $fromStatus,
//             'to_status'          => $newStatus,
//             'changed_by_user_id' => $actor?->id,
//             'changed_by_role'    => $actor?->role ?? ($actor ? 'user' : 'system'),
//             'notes'              => $notes,
//             'metadata'           => $metadata,
//             'created_at'         => now(),
//         ]);

//         return $agentRequest;
//     }

//     /**
//      * Map fine-grained pipeline status back to legacy coarse status
//      * ('pending', 'assigned', 'in_progress', 'prepared', 'completed')
//      */
//     public static function mapToLegacyStatus(string $pipelineStatus, ?int $assignedEmployeeId = null): string
//     {
//         return match ($pipelineStatus) {
//             self::STATUS_REQUEST_RECEIVED => $assignedEmployeeId ? 'assigned' : 'pending',
//             self::STATUS_UNDER_REVIEW,
//             self::STATUS_DOCUMENTS_PENDING => $assignedEmployeeId ? 'assigned' : 'pending',
//             self::STATUS_GOVT_PORTAL_CHECK,
//             self::STATUS_DATA_FETCHING,
//             self::STATUS_COMPARISON,
//             self::STATUS_DEDUCTIONS_REGIME => 'in_progress',
//             self::STATUS_FILE_PREPARED,
//             self::STATUS_PAYMENT_PENDING,
//             self::STATUS_CUSTOMER_APPROVAL,
//             self::STATUS_CHANGES_REQUESTED => 'prepared',
//             self::STATUS_SUBMITTED,
//             self::STATUS_COMPLETED => 'completed',
//             default => 'in_progress',
//         };
//     }
// }







namespace App\Services;

use App\Models\AgentRequest;
use App\Models\AgentRequestStatusHistory;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AgentPipelineService
{
    // Valid pipeline statuses in order
    public const STATUS_REQUEST_RECEIVED  = 'request_received';
    public const STATUS_UNDER_REVIEW      = 'under_review';
    public const STATUS_DOCUMENTS_PENDING = 'documents_pending';
    public const STATUS_GOVT_PORTAL_CHECK = 'govt_portal_check';
    public const STATUS_DATA_FETCHING     = 'data_fetching';
    public const STATUS_COMPARISON        = 'comparison';
    public const STATUS_DEDUCTIONS_REGIME = 'deductions_regime';
    public const STATUS_FILE_PREPARED     = 'file_prepared';
    public const STATUS_PAYMENT_PENDING   = 'payment_pending';
    public const STATUS_CUSTOMER_APPROVAL = 'customer_approval';
    public const STATUS_CHANGES_REQUESTED = 'changes_requested';
    public const STATUS_SUBMITTED         = 'submitted';
    public const STATUS_COMPLETED         = 'completed';

    /**
     * Map of allowed next transitions from any given status
     */
    protected static array $allowedTransitions = [
        self::STATUS_REQUEST_RECEIVED => [
            self::STATUS_UNDER_REVIEW,
        ],
        self::STATUS_UNDER_REVIEW => [
            self::STATUS_DOCUMENTS_PENDING,
            self::STATUS_GOVT_PORTAL_CHECK,
        ],
        self::STATUS_DOCUMENTS_PENDING => [
            self::STATUS_UNDER_REVIEW,
        ],
        self::STATUS_GOVT_PORTAL_CHECK => [
            self::STATUS_DATA_FETCHING,
        ],
        self::STATUS_DATA_FETCHING => [
            self::STATUS_COMPARISON,
        ],
        self::STATUS_COMPARISON => [
            self::STATUS_DEDUCTIONS_REGIME,
        ],
        self::STATUS_DEDUCTIONS_REGIME => [
            self::STATUS_FILE_PREPARED,
        ],
        self::STATUS_FILE_PREPARED => [
            self::STATUS_PAYMENT_PENDING,
            self::STATUS_CUSTOMER_APPROVAL, // in case payment is waived or paid instantly
        ],
        self::STATUS_PAYMENT_PENDING => [
            self::STATUS_CUSTOMER_APPROVAL,
        ],
        self::STATUS_CUSTOMER_APPROVAL => [
            self::STATUS_CHANGES_REQUESTED,
            self::STATUS_SUBMITTED,
        ],
        self::STATUS_CHANGES_REQUESTED => [
            self::STATUS_UNDER_REVIEW,
            self::STATUS_DEDUCTIONS_REGIME,
            self::STATUS_FILE_PREPARED,
            self::STATUS_CUSTOMER_APPROVAL,
        ],
        self::STATUS_SUBMITTED => [
            self::STATUS_COMPLETED,
        ],
        self::STATUS_COMPLETED => [],
    ];

    /**
     * Transition an agent request to a new pipeline status with strict validation and audit logging.
     *
     * @throws ValidationException
     */
    public static function transition(
        AgentRequest $agentRequest,
        string $newStatus,
        ?User $actor = null,
        ?string $notes = null,
        array $metadata = []
    ): AgentRequest {
        $currentStatus = $agentRequest->pipeline_status ?? self::STATUS_REQUEST_RECEIVED;

        if ($currentStatus === $newStatus) {
            return $agentRequest; // No-op if already in desired status
        }

        $allowed = self::$allowedTransitions[$currentStatus] ?? [];

        if (!in_array($newStatus, $allowed, true)) {
            $formattedCurrent = strtoupper(str_replace('_', ' ', $currentStatus));
            $formattedTarget  = strtoupper(str_replace('_', ' ', $newStatus));
            throw ValidationException::withMessages([
                'pipeline_status' => [
                    "Illegal transition: Cannot move from {$formattedCurrent} directly to {$formattedTarget}. The pipeline must follow the strict business sequence."
                ],
            ]);
        }

        // Extra business logic gates:
        // Gate 1: To enter 'data_fetching', customer must be verified as registered on the govt portal
        if ($newStatus === self::STATUS_DATA_FETCHING && $agentRequest->itr_portal_registered !== true) {
            throw ValidationException::withMessages([
                'itr_portal_registered' => [
                    "Government ITR portal verification is required. You must verify and confirm portal registration (Yes) before fetching tax data."
                ],
            ]);
        }

        // Gate 2: To enter 'customer_approval', payment must be marked paid
        if ($newStatus === self::STATUS_CUSTOMER_APPROVAL && $agentRequest->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'payment_status' => [
                    "Payment required: Filing fee must be paid before moving to customer approval."
                ],
            ]);
        }

        // Save old status for audit
        $fromStatus = $currentStatus;

        // Sync legacy status column to maintain full backward-compatibility with existing CA list views
        $legacyStatus = self::mapToLegacyStatus($newStatus, $agentRequest->assigned_employee_id);

        $agentRequest->pipeline_status = $newStatus;
        $agentRequest->status = $legacyStatus;

        if ($newStatus === self::STATUS_COMPLETED && empty($agentRequest->completed_at)) {
            $agentRequest->completed_at = now();
        }

        $agentRequest->save();

        // Write immutable audit log
        AgentRequestStatusHistory::create([
            'agent_request_id'   => $agentRequest->id,
            'from_status'        => $fromStatus,
            'to_status'          => $newStatus,
            'changed_by_user_id' => $actor?->id,
            'changed_by_role'    => $actor?->role ?? ($actor ? 'user' : 'system'),
            'notes'              => $notes,
            'metadata'           => $metadata,
            'created_at'         => now(),
        ]);

        return $agentRequest;
    }

    /**
     * Map fine-grained pipeline status back to legacy coarse status
     * ('pending', 'assigned', 'in_progress', 'prepared', 'completed')
     */
    public static function mapToLegacyStatus(string $pipelineStatus, ?int $assignedEmployeeId = null): string
    {
        return match ($pipelineStatus) {
            self::STATUS_REQUEST_RECEIVED => $assignedEmployeeId ? 'assigned' : 'pending',
            self::STATUS_UNDER_REVIEW,
            self::STATUS_DOCUMENTS_PENDING => $assignedEmployeeId ? 'assigned' : 'pending',
            self::STATUS_GOVT_PORTAL_CHECK,
            self::STATUS_DATA_FETCHING,
            self::STATUS_COMPARISON,
            self::STATUS_DEDUCTIONS_REGIME => 'in_progress',
            self::STATUS_FILE_PREPARED,
            self::STATUS_PAYMENT_PENDING,
            self::STATUS_CUSTOMER_APPROVAL,
            self::STATUS_CHANGES_REQUESTED => 'prepared',
            self::STATUS_SUBMITTED,
            self::STATUS_COMPLETED => 'completed',
            default => 'in_progress',
        };
    }
}