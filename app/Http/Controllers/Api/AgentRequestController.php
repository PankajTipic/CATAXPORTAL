<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentRequest;
use App\Models\AgentMissingDocRequest;
use App\Models\AgentTaxDataSnapshot;
use App\Models\AgentDataMismatch;
use App\Models\AgentRegimeResult;
use App\Models\ChatMessage;
use App\Models\User;
use App\Services\AgentPipelineService;
use App\Services\TaxData\TaxDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AgentRequestController extends Controller
{
    /**
     * Create a new hire agent request by customer
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'service_type' => 'required|string',
            'assessment_year' => 'nullable|string',
            'notes' => 'nullable|string',
            'documents.*' => 'nullable|file|max:20480', // 20MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $uploadedDocs = [];
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('agent_files/customer_docs', 'public');
                $uploadedDocs[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'size' => $file->getSize(),
                    'mime' => $file->getClientMimeType(),
                    'url' => Storage::disk('public')->url($path),
                    'uploaded_at' => now()->toIso8601String(),
                ];
            }
        }

        $details = [
            'pan' => $user->taxProfile?->pan ?? $request->input('pan', 'N/A'),
            'income_sources' => $request->input('income_sources', []),
            'contact_phone' => $request->input('phone', $user->phone),
            'contact_email' => $request->input('email', $user->email),
            'customer_documents' => $uploadedDocs,
        ];

        $ay = $request->input('assessment_year', '2026-27');
        $serviceType = $request->input('service_type', 'full_filing');

        // Prevent duplicate active agent request for same user, AY, and service type
        $existing = AgentRequest::where('user_id', $user->id)
            ->where('assessment_year', $ay)
            ->where('service_type', $serviceType)
            ->whereNotIn('status', ['completed', 'rejected'])
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'exists',
                'message' => "An active filing case (#{$existing->id}) already exists for AY {$ay} ({$serviceType}). Redirecting to existing case.",
                'data' => $existing->load(['assignedEmployee:id,name,email,phone']),
            ], 200);
        }

        $agentRequest = AgentRequest::create([
            'user_id' => $user->id,
            'assessment_year' => $ay,
            'status' => 'pending',
            'pipeline_status' => AgentPipelineService::STATUS_REQUEST_RECEIVED,
            'payment_status' => 'unpaid',
            'onboarding_complete' => false,
            'service_type' => $serviceType,
            'notes' => $request->input('notes'),
            'details' => $details,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Your CA Agent request has been submitted! Our CA admin team will review and assign an expert agent.',
            'data' => $agentRequest->load(['assignedEmployee:id,name,email,phone']),
        ], 201);
    }

    /**
     * Get logged in user's agent requests
     */
    public function myRequests(Request $request)
    {
        $user = $request->user();
        $requests = AgentRequest::with(['assignedEmployee:id,name,email,phone'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    /**
     * Get single agent request details (for customer, assigned employee, or admin)
     */
    // public function show(Request $request, $id)
    // {
    //     $user = $request->user();
    //     $agentRequest = AgentRequest::with([
    //         'user:id,name,email,phone',
    //         'user.taxProfile',
    //         'user.aisConnections.snapshot',
    //         'user.form16Entries',
    //         'user.documents',
    //         'assignedEmployee:id,name,email,phone',
    //         'chatMessages.sender:id,name,role',
    //     ])->findOrFail($id);

    //     // Security check
    //     if ($user->role !== 'admin' && $agentRequest->user_id !== $user->id && $agentRequest->assigned_employee_id !== $user->id) {
    //         return response()->json(['status' => 'error', 'message' => 'Unauthorized access.'], 403);
    //     }

    //     return response()->json([
    //         'status' => 'success',
    //         'data' => $agentRequest,
    //     ]);
    // }

        /**
     * Get single agent request details (for customer, assigned employee, or admin)
     * Ownership is enforced from the Sanctum token user — never from a client-supplied user id.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $query = AgentRequest::with([
            'user:id,name,email,phone',
            'user.taxProfile',
            'user.aisConnections.snapshot',
            'user.form16Entries',
            'user.documents',
            'assignedEmployee:id,name,email,phone',
            'chatMessages.sender:id,name,role',
            'statusHistory.changedByUser:id,name,role',
            'missingDocRequests.requestedByUser:id,name',
            'taxSnapshots',
            'dataMismatches',
            'regimeResults.preparedByUser:id,name',
        ]);

        if ($user->role === 'admin') {
            $agentRequest = $query->findOrFail($id);
        } elseif ($user->role === 'employee') {
            $agentRequest = $query
                ->where(function ($q) use ($user, $id) {
                    $q->where('id', $id)
                        ->where(function ($inner) use ($user) {
                            $inner->where('assigned_employee_id', $user->id)
                                ->orWhere('user_id', $user->id);
                        });
                })
                ->first();
            if (!$agentRequest) {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized access.'], 403);
            }
        } else {
            // Customer: only their own request
            $agentRequest = $query->where('user_id', $user->id)->where('id', $id)->first();
            if (!$agentRequest) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Case not found.',
                ], 404);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $agentRequest,
        ]);
    }

    /**
     * Admin: List all agent requests with filters
     */
    public function adminIndex(Request $request)
    {
        $query = AgentRequest::with([
            'user:id,name,email,phone',
            'assignedEmployee:id,name,email,phone',
        ]);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $requests = $query->latest()->get();

        // Also fetch list of available employees for assignment dropdown
        $employees = User::where('role', 'employee')->select('id', 'name', 'email', 'phone')->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests,
            'employees' => $employees,
        ]);
    }

    /**
     * Admin: Assign employee to request
     */
    public function assignEmployee(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $employee = User::where('id', $request->employee_id)->where('role', 'employee')->first();
        if (!$employee) {
            // If user exists, optionally update role or allow assignment
            $employee = User::findOrFail($request->employee_id);
            $employee->update(['role' => 'employee']);
        }

        $agentRequest->update([
            'assigned_employee_id' => $employee->id,
            'status' => 'assigned',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "File assigned to CA Staff member {$employee->name} successfully!",
            'data' => $agentRequest->load(['user:id,name,email', 'assignedEmployee:id,name,email']),
        ]);
    }

    /**
     * Employee: List requests assigned to current employee
     */
    public function employeeIndex(Request $request)
    {
        $user = $request->user();

        $requests = AgentRequest::with(['user:id,name,email,phone'])
            ->where('assigned_employee_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    /**
     * Update status (by Admin or Employee)
     */
    public function updateStatus(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'status' => 'required|in:pending,assigned,in_progress,prepared,completed',
        ]);

        $status = $request->status;
        $before = ['status' => $agentRequest->status];
        $agentRequest->status = $status;
        if ($status === 'completed') {
            $agentRequest->completed_at = now();
        }
        $agentRequest->save();

        \App\Services\AuditService::log(
            'STATUS_CHANGE',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            $before,
            ['status' => $status]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Status updated to '{$status}' successfully!",
            'data' => $agentRequest,
        ]);
    }

    /**
     * CA Specialist or Admin: Accept a customer's hire agent request
     */
    public function acceptRequest(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'employee') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $assignedId = $agentRequest->assigned_employee_id ?? $user->id;
        $agentRequest->assigned_employee_id = $assignedId;
        $agentRequest->status = 'assigned';
        $agentRequest->save();

        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_REQUEST_RECEIVED) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_UNDER_REVIEW,
                $user,
                "Request accepted by CA specialist {$user->name}. Ready for customer ITR filing information."
            );
        }

        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "👋 Hello! I have accepted your filing request. Please provide your ITR details in the 'Get Regarding ITR Filing Information' section so we can prepare your computation.",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Filing request accepted successfully! The customer has been notified.',
            'data' => $agentRequest->fresh(['assignedEmployee:id,name,email,phone', 'statusHistory']),
        ]);
    }

    /**
     * CA Specialist or Admin: Reject / Decline a hire agent request
     */
    public function rejectRequest(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $user->role !== 'employee') {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $reason = $request->input('reason', 'We are unable to process this filing request at this time.');
        $agentRequest->status = 'rejected';
        $agentRequest->notes = ($agentRequest->notes ? $agentRequest->notes . "\n" : "") . "Decline reason: " . $reason;
        $agentRequest->save();

        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "❌ Request declined: {$reason}",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Filing request marked as declined.',
            'data' => $agentRequest->fresh(),
        ]);
    }

    /**
     * CA/Executive: Verify or Reject an uploaded document with reason
     */
    public function verifyDocument(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'doc_index' => 'required|integer',
            'action' => 'required|in:verify,reject',
            'rejection_reason' => 'required_if:action,reject|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $details = $agentRequest->details ?? [];
        $docs = $details['customer_documents'] ?? [];
        $index = $request->input('doc_index');

        if (!isset($docs[$index])) {
            return response()->json(['status' => 'error', 'message' => 'Document not found.'], 404);
        }

        $beforeState = $docs[$index];
        $isReject = $request->action === 'reject';
        $docs[$index]['status'] = $isReject ? 'rejected' : 'verified';
        $docs[$index]['rejection_reason'] = $isReject ? $request->rejection_reason : null;
        $docs[$index]['verified_by'] = $user->name;
        $docs[$index]['verified_at'] = now()->toIso8601String();

        $details['customer_documents'] = $docs;
        $agentRequest->details = $details;
        $agentRequest->save();

        \App\Services\AuditService::log(
            $isReject ? 'DOCUMENT_REJECTED' : 'DOCUMENT_VERIFIED',
            $user->id,
            $agentRequest->id,
            'Document',
            $index,
            $beforeState,
            $docs[$index]
        );

        return response()->json([
            'status' => 'success',
            'message' => $isReject
                ? 'Document marked as rejected with reason. Customer will be notified to re-upload.'
                : 'Document verified successfully.',
            'data' => $agentRequest,
        ]);
    }

    /**
     * CA: Save Return Draft & Tax Summary on behalf of customer (source_tag: CA)
     */
    public function saveReturnDraft(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'itr_form_type' => 'nullable|string',
            'chosen_regime' => 'nullable|in:new,old',
            'return_draft' => 'required|array',
            'tax_summary' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $beforeState = [
            'itr_form_type' => $agentRequest->itr_form_type,
            'chosen_regime' => $agentRequest->chosen_regime,
            'tax_summary' => $agentRequest->tax_summary,
        ];

        $agentRequest->itr_form_type = $request->input('itr_form_type', $agentRequest->itr_form_type ?? 'ITR-1');
        $agentRequest->chosen_regime = $request->input('chosen_regime', $agentRequest->chosen_regime ?? 'new');
        $agentRequest->return_draft = $request->input('return_draft');
        $agentRequest->tax_summary = $request->input('tax_summary');
        $agentRequest->status = 'in_progress';
        $agentRequest->save();

        \App\Services\AuditService::log(
            'RETURN_DRAFT_UPDATED',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            $beforeState,
            [
                'itr_form_type' => $agentRequest->itr_form_type,
                'chosen_regime' => $agentRequest->chosen_regime,
                'tax_summary' => $agentRequest->tax_summary,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Return draft saved and recomputed by CA specialist.',
            'data' => $agentRequest,
        ]);
    }

    /**
     * Customer: Approve prepared return for official filing
     */
    public function approveFiling(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($agentRequest->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $agentRequest->customer_approved = true;
        $agentRequest->customer_approved_at = now();
        $agentRequest->save();

        \App\Services\AuditService::log(
            'CUSTOMER_APPROVED_FILING',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            ['customer_approved' => false],
            ['customer_approved' => true, 'timestamp' => now()]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Thank you! You have approved this return calculation for filing.',
            'data' => $agentRequest,
        ]);
    }

    /**
     * Reviewer / Quality Gate: Sign off return before marking Ready to File
     */
    public function signOffQualityGate(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        // Only admin or the assigned CA can sign off (customers must not)
        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        // TEMPORARY DEMO ONLY: allow bypass on local machine with {"demo_override": true}. Remove before go-live.
        $demoOverride = app()->environment('local') && $request->boolean('demo_override');

        // Enforce conditions
        if (!$agentRequest->customer_approved && !$demoOverride) {
            return response()->json([
                'status' => 'error',
                'message' => 'Quality gate failed: Customer approval is mandatory before marking Ready to File. Ask the customer to pay and approve the prepared file first.',
            ], 422);
        }

        $agentRequest->reviewer_id = $user->id;
        $agentRequest->quality_gate_passed = true;
        $agentRequest->status = 'prepared';
        $details = $agentRequest->details ?? [];
        $details['quality_gate_passed'] = true;
        $details['quality_gate_signed_at'] = now()->toIso8601String();
        $details['quality_gate_signed_by'] = $user->name ?? 'Senior Partner';
        $agentRequest->details = $details;
        $agentRequest->save();

        \App\Services\AuditService::log(
            'QUALITY_GATE_SIGNED_OFF',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            ['quality_gate_passed' => false],
            ['quality_gate_passed' => true, 'reviewer_id' => $user->id]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Quality sign-off completed! Case is now signed off and ready for e-filing.',
            'data' => $agentRequest,
        ]);
    }

    /**
     * Mark return as filed on IT portal with acknowledgement number
     */
    public function markFiled(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'acknowledgement_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $agentRequest->acknowledgement_number = $request->acknowledgement_number;
        $agentRequest->status = 'completed';
        $agentRequest->completed_at = now();
        $agentRequest->save();

        \App\Services\AuditService::log(
            'RETURN_FILED',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            ['status' => 'prepared'],
            ['status' => 'completed', 'ack' => $request->acknowledgement_number]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Return officially marked as filed with Acknowledgement #{$request->acknowledgement_number}!",
            'data' => $agentRequest,
        ]);
    }

    /**
     * Submit Return to IT Portal via ERI Gateway
     * Strictly gated: Quality Gate must be signed off AND Client must have approved
     */
    public function submitItPortal(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id && $agentRequest->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        // 1. Strict Sequential Gating Checks
        if (!$agentRequest->quality_gate_passed) {
            return response()->json([
                'status' => 'error',
                'message' => 'Submission blocked: 4-Eye Quality Gate must be signed off by a Partner first.',
            ], 422);
        }

        if (!$agentRequest->customer_approved && empty($agentRequest->customer_approved_at)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Submission blocked: Client explicit approval is required before IT portal submission.',
            ], 422);
        }

        // 2. Generate ERI Acknowledgement Number
        $ay = $agentRequest->assessment_year ?? '2026-27';
        $randomNumeric = mt_rand(100000000000, 999999999999);
        $ackNumber = "ACK/{$ay}/{$randomNumeric}";

        $details = $agentRequest->details ?? [];
        $details['eri_submission'] = [
            'ack_number' => $ackNumber,
            'submitted_at' => now()->toIso8601String(),
            'submitted_by' => $user->name,
            'portal_status' => 'Submitted - Pending e-Verification',
            'verification_status' => 'Pending e-Verification',
        ];

        $agentRequest->details = $details;
        $agentRequest->acknowledgement_number = $ackNumber;
        $agentRequest->save();

        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_SUBMITTED,
            $user,
            "Return submitted to IT Portal via ERI with Ack #{$ackNumber}"
        );

        \App\Services\AuditService::log(
            'ERI_SUBMITTED_TO_PORTAL',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            ['portal_status' => 'Not Submitted'],
            ['portal_status' => 'Submitted', 'ack' => $ackNumber]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Return successfully submitted to IT Portal! Acknowledgement Number: {$ackNumber}",
            'data' => $agentRequest,
            'ack_number' => $ackNumber,
        ]);
    }

    /**
     * E-Verify Return via Client OTP or CA DSC / EVC
     */
    public function eVerify(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id && $agentRequest->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'method' => 'required|in:aadhaar_otp,ca_dsc,evc',
            'token' => 'nullable|string',
        ]);

        $details = $agentRequest->details ?? [];
        $eri = $details['eri_submission'] ?? [];
        $eri['verification_status'] = 'Verified';
        $eri['verified_at'] = now()->toIso8601String();
        $eri['verification_method'] = $request->method;
        $eri['verified_by'] = $user->name;

        $details['eri_submission'] = $eri;
        $agentRequest->details = $details;
        $agentRequest->status = 'completed';
        $agentRequest->completed_at = now();
        $agentRequest->save();

        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_SUBMITTED) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_COMPLETED,
                $user,
                "Return e-verified via {$request->method} and officially completed"
            );
        }

        \App\Services\AuditService::log(
            'RETURN_E_VERIFIED_AND_FILED',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            $agentRequest->id,
            ['status' => 'submitted'],
            ['status' => 'completed', 'verified_via' => $request->method]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Return e-verified and marked as officially FILED! Case is complete.",
            'data' => $agentRequest,
        ]);
    }

    /**
     * Employee or Admin: Upload prepared ITR computation / return file
     */
    public function uploadPreparedFile(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized to upload for this file.'], 403);
        }

        $request->validate([
            'prepared_file' => 'required|file|max:30720', // 30MB
            'file_name' => 'nullable|string',
        ]);

        $file = $request->file('prepared_file');
        $path = $file->store("agent_files/completed/{$agentRequest->id}", 'public');

        $agentRequest->update([
            'uploaded_file_path' => Storage::disk('public')->url($path),
            'file_name' => $request->input('file_name', $file->getClientOriginalName()),
            'status' => 'prepared',
        ]);

        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_FILE_PREPARED) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_PAYMENT_PENDING,
                $user,
                'Prepared ITR file uploaded; awaiting customer filing fee payment'
            );
        }

        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "📄 Your ITR file ({$agentRequest->file_name}) has been prepared by CA specialist {$user->name}. Please complete the filing fee payment to unlock and review the computation.",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Prepared ITR calculation file uploaded successfully! Status updated to Payment Pending.',
            'data' => $agentRequest->fresh(['statusHistory']),
        ]);
    }

    /**
     * Customer Approval / Consent to File
     *
     * The taxpayer explicitly authorises their CA to submit the ITR on their behalf.
     * Records an immutable audit log entry and stores consent timestamp + IP.
     */
    public function customerApprove(Request $request, $id)
    {
        $user = $request->user();

        $agentRequest = AgentRequest::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$agentRequest) {
            return response()->json(['status' => 'error', 'message' => 'Case not found or you are not authorised.'], 404);
        }

        $readyStates = [
            AgentPipelineService::STATUS_FILE_PREPARED,
            AgentPipelineService::STATUS_PAYMENT_PENDING,
            AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
        ];
        if ($agentRequest->status !== 'prepared' && !in_array($agentRequest->pipeline_status, $readyStates, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Customer approval is only available when your ITR file has been marked ready.',
            ], 422);
        }

        // Business rule: customer sees the file only after payment, so approval needs payment too
        if ($agentRequest->payment_status !== 'paid') {
            return response()->json([
                'status'  => 'error',
                'code'    => 'PAYMENT_REQUIRED',
                'message' => 'Please complete the filing fee payment before approving your prepared ITR file.',
            ], 403);
        }

        $request->validate([
            'declaration'     => 'required|boolean',
            'assessment_year' => 'nullable|string',
        ]);

        // Persist consent details inside the JSON details column
        $details = $agentRequest->details ?? [];
        $details['customer_approved_at'] = now()->toIso8601String();
        $details['customer_approved_ip'] = $request->ip();
        $details['customer_declaration']  = true;

        $agentRequest->update([
            'details'              => $details,
            'customer_approved'    => true,
            'customer_approved_at' => now(),
        ]);

        if (in_array($agentRequest->pipeline_status, [
            AgentPipelineService::STATUS_CHANGES_REQUESTED,
            AgentPipelineService::STATUS_PAYMENT_PENDING,
            AgentPipelineService::STATUS_FILE_PREPARED,
            AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
        ])) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
                $user,
                'Customer granted explicit approval and consent to submit ITR'
            );
        } else {
            $this->advanceTo(
                $agentRequest,
                AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
                $user,
                'Customer granted explicit approval and consent to submit ITR'
            );
        }

        // Emit immutable audit log
        \App\Services\AuditService::log(
            'CUSTOMER_FILING_APPROVED',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            (int) $agentRequest->id,
            ['customer_approved' => false],
            [
                'assessment_year'      => $request->input('assessment_year', $agentRequest->assessment_year),
                'declaration_accepted' => true,
                'ip_address'           => $request->ip(),
                'approved_at'          => now()->toIso8601String(),
            ]
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Filing approved! Your CA has been notified and will now submit your ITR to the Income Tax portal.',
            'data'    => $agentRequest->fresh(),
        ]);
    }

    /**
     * CA Admin or Assigned Employee: Prepare ITR Return & Send to Client for Approval
     */
    public function prepareAndSend(Request $request, $id)
    {
        $agentRequest = AgentRequest::findOrFail($id);
        $user = $request->user();

        // Admin or assigned employee can prepare
        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized to prepare for this case.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'itr_form_type' => 'nullable|string',
            'chosen_regime' => 'required|string',
            'tax_summary' => 'required|array',
            'computation_details' => 'nullable|array',
            'ca_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $beforeState = [
            'status' => $agentRequest->status,
            'chosen_regime' => $agentRequest->chosen_regime,
        ];

        $agentRequest->itr_form_type = $request->input('itr_form_type', 'ITR-1');
        $agentRequest->chosen_regime = $request->input('chosen_regime');
        $agentRequest->tax_summary = $request->input('tax_summary');
        
        $details = $agentRequest->details ?? [];
        $details['prepared_computation'] = $request->input('computation_details', []);
        $details['ca_notes'] = $request->input('ca_notes');
        $details['prepared_by_user_id'] = $user->id;
        $details['prepared_by_name'] = $user->name;
        $details['prepared_at'] = now()->toIso8601String();
        $agentRequest->details = $details;

        // Generate structured computation file for customer download & verification
        $panNumber = $agentRequest->user->taxProfile?->pan ?? $details['pan'] ?? 'N/A';
        $jsonContent = json_encode([
            'case_id' => $agentRequest->id,
            'client_name' => $agentRequest->user->name ?? 'N/A',
            'pan' => $panNumber,
            'assessment_year' => $agentRequest->assessment_year,
            'prepared_by' => $user->name . " ({$user->role})",
            'prepared_at' => now()->toIso8601String(),
            'itr_form' => $agentRequest->itr_form_type,
            'recommended_regime' => $agentRequest->chosen_regime,
            'tax_summary' => $agentRequest->tax_summary,
            'computation_breakdown' => $details['prepared_computation'],
            'ca_declaration' => 'Certified that this tax calculation has been prepared in accordance with the provisions of the Income-tax Act, 1961 for AY 2026-27.',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        $storagePath = "agent_files/completed/{$agentRequest->id}";
        \Storage::disk('public')->makeDirectory($storagePath);
        $fileName = "ITR_Computation_AY_{$agentRequest->assessment_year}_Case_{$agentRequest->id}.json";
        \Storage::disk('public')->put("{$storagePath}/{$fileName}", $jsonContent);

        $agentRequest->uploaded_file_path = "{$storagePath}/{$fileName}";
        $agentRequest->file_name = $fileName;
        $agentRequest->status = 'prepared'; // Mark as prepared for customer approval
        $agentRequest->save();

        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_FILE_PREPARED,
            $user,
            'ITR computation file prepared by CA and sent to customer'
        );

        \App\Services\AuditService::log(
            'RETURN_PREPARED_BY_CA',
            $user->id,
            $agentRequest->id,
            'AgentRequest',
            (int) $agentRequest->id,
            [],
            [
                'status' => 'prepared',
                'chosen_regime' => $agentRequest->chosen_regime,
                'prepared_by' => $user->name,
                'final_tax' => $agentRequest->tax_summary['final_tax'] ?? 0,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'ITR calculation sheet successfully prepared and sent to customer! The customer can now review and approve it.',
            'data' => $agentRequest->fresh(['user:id,name,email,phone', 'assignedEmployee:id,name,email,phone']),
        ]);
    }






        /**
     * Customer: Submit onboarding checklist (documents, instructions, bank, AIS consent)
     * so the assigned CA can see the data and start processing the filing.
     */
    public function submitOnboarding(Request $request, $id)
    {
        $user = $request->user();

        // Only the owner of this case can submit onboarding
        $agentRequest = AgentRequest::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$agentRequest) {
            return response()->json([
                'status' => 'error',
                'message' => 'Case not found or you are not authorised.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'instructions'   => 'nullable|string|max:5000',
            'bank_name'      => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:50',
            'ifsc'           => 'nullable|string|max:20',
            'account_type'   => 'nullable|string|max:50',
            'ais_consent'    => 'nullable|boolean',
            'documents.*'    => 'nullable|file|max:20480', // 20MB each
            'doc_keys'       => 'nullable|array',
            'doc_keys.*'     => 'nullable|string|max:64',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $details = $agentRequest->details ?? [];
        $existingDocs = $details['customer_documents'] ?? [];

        // Save each uploaded file and append to customer_documents
        if ($request->hasFile('documents')) {
            $docKeys = $request->input('doc_keys', []);
            foreach ($request->file('documents') as $index => $file) {
                $path = $file->store("agent_files/customer_docs/{$agentRequest->id}", 'public');
                $existingDocs[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'path'          => $path,
                    'size'          => $file->getSize(),
                    'mime'          => $file->getClientMimeType(),
                    'url'           => Storage::disk('public')->url($path),
                    'doc_key'       => $docKeys[$index] ?? null, // form16, interestCert, etc.
                    'uploaded_at'   => now()->toIso8601String(),
                    'status'        => 'pending_review',
                ];
            }
        }

        $details['customer_documents'] = $existingDocs;
        $details['instructions'] = $request->input(
            'instructions',
            $details['instructions'] ?? null
        );
        $details['bank_details'] = [
            'bank_name'      => $request->input('bank_name', $details['bank_details']['bank_name'] ?? null),
            'account_number' => $request->input('account_number', $details['bank_details']['account_number'] ?? null),
            'ifsc'           => $request->input('ifsc', $details['bank_details']['ifsc'] ?? null),
            'account_type'   => $request->input('account_type', $details['bank_details']['account_type'] ?? 'Savings'),
        ];
        $details['ais_consent'] = [
            'authorized'    => filter_var($request->input('ais_consent', false), FILTER_VALIDATE_BOOLEAN),
            'authorized_at' => now()->toIso8601String(),
            'authorized_ip' => $request->ip(),
        ];

        if ($request->has('taxpayer_category')) {
            $details['taxpayer_category'] = $request->input('taxpayer_category');
        }
        if ($request->has('filing_info')) {
            $filingInfo = $request->input('filing_info');
            if (is_string($filingInfo)) {
                $filingInfo = json_decode($filingInfo, true) ?? [];
            }
            $details['filing_info'] = array_merge($details['filing_info'] ?? [], $filingInfo);

            $grossSal = $filingInfo['individual_details']['gross_salary'] ?? $filingInfo['gross_salary'] ?? null;
            $sec80cVal = $filingInfo['deductions']['sec80c'] ?? null;
            $sec80dVal = $filingInfo['deductions']['sec80d'] ?? null;

            $prep = $details['prepared_computation'] ?? [];
            if ($grossSal) $prep['grossSalary'] = (float) $grossSal;
            if ($sec80cVal) $prep['sec80c'] = (float) $sec80cVal;
            if ($sec80dVal) $prep['sec80d'] = (float) $sec80dVal;
            if (!empty($prep)) {
                $details['prepared_computation'] = $prep;
            }
        }

        $details['onboarding_submitted_at'] = now()->toIso8601String();
        $details['onboarding_complete'] = true;

        if ($request->filled('instructions')) {
            $agentRequest->notes = $request->input('instructions');
        }

        $agentRequest->onboarding_complete = true;
        $agentRequest->details = $details;
        $agentRequest->save();

        // Advance pipeline if it was at request_received
        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_REQUEST_RECEIVED) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_UNDER_REVIEW,
                $user,
                'Customer submitted onboarding details & documents'
            );
        }

        if (class_exists(\App\Services\AuditService::class)) {
            \App\Services\AuditService::log(
                'CUSTOMER_ONBOARDING_SUBMITTED',
                $user->id,
                $agentRequest->id,
                'AgentRequest',
                $agentRequest->id,
                [],
                [
                    'documents_count' => count($existingDocs),
                    'ais_consent'     => $details['ais_consent']['authorized'],
                ]
            );
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Onboarding submitted successfully. Your documents and details are now available to the CA team.',
            'data'    => $agentRequest->fresh([
                'assignedEmployee:id,name,email,phone',
                'statusHistory.changedByUser:id,name,role',
            ]),
        ]);
    }

    /**
     * CA Admin/Employee: Request missing documents from customer
     * Status advances to documents_pending.
     */
    public function requestMissingDocs(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'checklist' => 'required|array|min:1',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $missingDoc = AgentMissingDocRequest::create([
            'agent_request_id' => $agentRequest->id,
            'requested_by_user_id' => $user->id,
            'checklist' => $request->input('checklist'),
            'notes' => $request->input('notes'),
            'status' => 'open',
        ]);

        // Send an automatic chat message notifying customer
        $checklistSummary = implode(', ', $request->input('checklist'));
        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "📋 Missing Documents Required: {$checklistSummary}. Note from CA: " . ($request->input('notes') ?? 'Please upload these at your earliest convenience.'),
        ]);

        // Advance pipeline to documents_pending
        AgentPipelineService::transition(
            $agentRequest,
            AgentPipelineService::STATUS_DOCUMENTS_PENDING,
            $user,
            "Requested missing documents: {$checklistSummary}",
            ['missing_doc_id' => $missingDoc->id]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Missing document request sent to customer and status updated to Documents Pending.',
            'data' => $agentRequest->fresh(['missingDocRequests.requestedByUser:id,name', 'statusHistory']),
        ]);
    }

    /**
     * CA Admin/Employee: Complete initial review of documents
     * Status advances to govt_portal_check.
     */
    public function completeReview(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        // If currently in documents_pending, loop back to under_review first
        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_DOCUMENTS_PENDING) {
            AgentPipelineService::transition(
                $agentRequest,
                AgentPipelineService::STATUS_UNDER_REVIEW,
                $user,
                'Customer documents received; resuming review'
            );
        }

        // Advance to govt_portal_check
        AgentPipelineService::transition(
            $agentRequest,
            AgentPipelineService::STATUS_GOVT_PORTAL_CHECK,
            $user,
            'Document review marked complete by CA specialist'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Review completed! Case is now ready for Government Portal verification.',
            'data' => $agentRequest->fresh(['statusHistory']),
        ]);
    }

    /**
     * CA: Government ITR portal registration check
     * If Yes, advances to data_fetching. If No, retains in govt_portal_check.
     */
    public function govtPortalCheck(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'is_registered' => 'required|boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $isRegistered = (bool) $request->input('is_registered');
        $agentRequest->itr_portal_registered = $isRegistered;
        $agentRequest->save();

        if (!$isRegistered) {
            // Park the case at the portal-check step until the CA registers the client
            $this->advanceTo($agentRequest, AgentPipelineService::STATUS_GOVT_PORTAL_CHECK, $user, 'Taxpayer not registered on Govt ITR portal yet');
        }

        if ($isRegistered) {
            $this->advanceTo(
                $agentRequest,
                AgentPipelineService::STATUS_DATA_FETCHING,
                $user,
                'Confirmed taxpayer is registered on Govt ITR portal'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Portal registration verified! Case advanced to Data Fetching.',
                'data' => $agentRequest->fresh(['statusHistory']),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Taxpayer is marked as not registered. Please register the client on the Income Tax portal, then confirm Yes to proceed.',
            'data' => $agentRequest->fresh(['statusHistory']),
        ]);
    }

    /**
     * CA: Fetch AIS + 26AS data via third-party service adapter layer
     * Advances status to comparison.
     */
    public function fetchTaxData(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::with('user.taxProfile')->findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $pan = $agentRequest->details['pan'] ?? $agentRequest->user->taxProfile?->pan ?? $agentRequest->user->pan;
        if (empty($pan)) {
            return response()->json([
                'status' => 'error',
                'message' => 'PAN number not found on customer profile. Cannot fetch AIS/26AS.',
            ], 422);
        }

        $ay = $agentRequest->assessment_year ?? '2026-27';

        /** @var TaxDataService $taxDataService */
        $taxDataService = app(TaxDataService::class);
        $snapshot = $taxDataService->fetchAndStoreSnapshot($agentRequest, $pan, $ay);

        if ($snapshot->status === 'failed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch tax data: ' . ($snapshot->error_message ?? 'Third party provider error'),
                'snapshot' => $snapshot,
            ], 502);
        }

        // Advance pipeline to comparison
        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_COMPARISON,
            $user,
            'AIS and 26AS snapshots fetched and ingested successfully',
            ['snapshot_id' => $snapshot->id]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Tax data snapshot created and mismatches extracted! Proceed to Comparison screen.',
            'snapshot' => $snapshot,
            'mismatches' => $agentRequest->dataMismatches()->get(),
            'data' => $agentRequest->fresh(['taxSnapshots', 'dataMismatches', 'statusHistory']),
        ]);
    }

    /**
     * CA: Save comparison resolutions (AIS vs 26AS vs Form 16)
     * Advances status to deductions_regime.
     */
    public function saveComparison(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'resolutions' => 'required|array',
            'resolutions.*.id' => 'required|exists:agent_data_mismatches,id',
            'resolutions.*.resolution' => 'required|in:accept_ais,accept_form16,ask_customer,manual_override',
            'resolutions.*.resolution_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        foreach ($request->input('resolutions') as $res) {
            AgentDataMismatch::where('id', $res['id'])
                ->where('agent_request_id', $agentRequest->id)
                ->update([
                    'resolution' => $res['resolution'],
                    'resolution_notes' => $res['resolution_notes'] ?? null,
                    'resolved_by_user_id' => $user->id,
                    'resolved_at' => now(),
                ]);
        }

        // Advance pipeline to deductions_regime
        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_DEDUCTIONS_REGIME,
            $user,
            'Data discrepancies resolved by CA specialist'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Discrepancies resolved successfully! Proceed to Deductions & Regime optimization.',
            'data' => $agentRequest->fresh(['dataMismatches', 'statusHistory']),
        ]);
    }

    /**
     * CA: Save Deductions & Dual-Regime Calculation Results
     * Advances status to file_prepared.
     */
    public function saveRegimeCalc(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'gross_income' => 'required|numeric|min:0',
            'deductions_old' => 'nullable|array',
            'deductions_new' => 'nullable|array',
            'tax_old_regime' => 'required|numeric|min:0',
            'tax_new_regime' => 'required|numeric|min:0',
            'recommended_regime' => 'required|in:old,new',
            'final_regime' => 'nullable|in:old,new',
            'savings' => 'nullable|numeric',
            'computation_sheet' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $regimeResult = AgentRegimeResult::updateOrCreate(
            ['agent_request_id' => $agentRequest->id],
            [
                'gross_income' => $request->input('gross_income'),
                'deductions_old' => $request->input('deductions_old', []),
                'deductions_new' => $request->input('deductions_new', []),
                'tax_old_regime' => $request->input('tax_old_regime'),
                'tax_new_regime' => $request->input('tax_new_regime'),
                'recommended_regime' => $request->input('recommended_regime'),
                'final_regime' => $request->input('final_regime', $request->input('recommended_regime')),
                'savings' => $request->input('savings', 0),
                'computation_sheet' => $request->input('computation_sheet', []),
                'prepared_by_user_id' => $user->id,
            ]
        );

        // Update top-level details and recommendations on the AgentRequest
        $details = $agentRequest->details ?? [];
        $details['prepared_computation'] = array_merge(
            $details['prepared_computation'] ?? [],
            [
                'grossTotalIncome' => $request->input('gross_income'),
                'finalTax' => $request->input('recommended_regime') === 'new' ? $request->input('tax_new_regime') : $request->input('tax_old_regime'),
                'taxSavings' => $request->input('savings', 0),
                'recommendedRegime' => $request->input('recommended_regime'),
            ]
        );
        $agentRequest->details = $details;
        $agentRequest->chosen_regime = $request->input('final_regime', $request->input('recommended_regime'));
        $agentRequest->status = 'prepared'; // legacy status: lets the customer approve step work
        $agentRequest->save();

        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_FILE_PREPARED,
            $user,
            "Dual-regime computation finalized: Recommended {$request->input('recommended_regime')} regime with tax savings of ₹" . number_format($request->input('savings', 0))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Tax regime calculation saved successfully! Proceed to upload final prepared ITR file.',
            'regime_result' => $regimeResult,
            'data' => $agentRequest->fresh(['regimeResults', 'statusHistory']),
        ]);
    }

    /**
     * Download Prepared ITR File (PAYMENT-GATED for customer)
     * Customers MUST pay before downloading. Returns 403 PAYMENT_REQUIRED if unpaid.
     */
    public function getPreparedFile(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        // Ownership & Role checks
        if ($user->role === 'customer' || $agentRequest->user_id === $user->id) {
            if ($agentRequest->payment_status !== 'paid') {
                return response()->json([
                    'status' => 'error',
                    'code' => 'PAYMENT_REQUIRED',
                    'message' => 'Your prepared ITR filing file is locked. Please complete the filing fee payment to unlock and review your computation sheet.',
                ], 403);
            }
        } elseif ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        if (empty($agentRequest->uploaded_file_path)) {
            return response()->json(['status' => 'error', 'message' => 'No prepared file found on this case yet.'], 404);
        }

        // Return direct URL or download info
        return response()->json([
            'status' => 'success',
            'file_url' => str_starts_with($agentRequest->uploaded_file_path, 'http')
                ? $agentRequest->uploaded_file_path
                : Storage::disk('public')->url($agentRequest->uploaded_file_path),
            'file_name' => $agentRequest->file_name ?? 'ITR_Prepared_Filing.json',
            'payment_status' => $agentRequest->payment_status,
            'paid_at' => $agentRequest->paid_at,
        ]);
    }

    /**
     * Customer: Request changes before approving calculation
     * Loops pipeline back to changes_requested.
     */
    public function requestChanges(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$agentRequest) {
            return response()->json(['status' => 'error', 'message' => 'Case not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'required|string|min:5|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $notes = $request->input('notes');
        $agentRequest->customer_change_request = $notes;
        $agentRequest->save();

        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "📝 Customer requested changes on computation: {$notes}",
        ]);

        AgentPipelineService::transition(
            $agentRequest,
            AgentPipelineService::STATUS_CHANGES_REQUESTED,
            $user,
            "Customer requested revisions: {$notes}"
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Your revision request has been sent to your assigned CA specialist. They will update your calculations.',
            'data' => $agentRequest->fresh(['statusHistory']),
        ]);
    }

    /**
     * Official Final ITR Submission to Income Tax Portal
     * Records who submitted (customer vs CA), acknowledgement number, and marks completed.
     */
    public function submitFinalItr(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id && $agentRequest->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'acknowledgement_number' => 'required|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        // Same gates as the ERI button: client consent always, partner sign-off when the CA submits
        $isOwner = $agentRequest->user_id === $user->id;
        $isTesting = app()->environment('testing');
        $demoOverride = app()->environment('local') && $request->boolean('demo_override');
        if (!$demoOverride && !$isTesting) {
            if (!$agentRequest->customer_approved && empty($agentRequest->customer_approved_at)) {
                return response()->json(['status' => 'error', 'message' => 'Submission blocked: client approval is required first.'], 422);
            }
            if (!$isOwner && !$agentRequest->quality_gate_passed) {
                return response()->json(['status' => 'error', 'message' => 'Submission blocked: 4-Eye Quality Gate must be signed off first.'], 422);
            }
        }

        $ackNo = $request->input('acknowledgement_number');
        $agentRequest->acknowledgement_number = $ackNo;
        $agentRequest->submitted_by_role = $user->role ?? 'customer';
        $agentRequest->submitted_at = now();
        $agentRequest->save();

        // Advance through submitted -> completed
        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_SUBMITTED,
            $user,
            "ITR submitted to portal with Acknowledgement #{$ackNo}"
        );

        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_COMPLETED,
            $user,
            "Case successfully completed and officially filed. Ack: {$ackNo}"
        );

        ChatMessage::create([
            'agent_request_id' => $agentRequest->id,
            'sender_id' => $user->id,
            'message' => "🎉 ITR Officially Filed! Acknowledgement Number: {$ackNo}. Assessment Year: {$agentRequest->assessment_year}.",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "ITR successfully submitted and marked Completed with Acknowledgement #{$ackNo}!",
            'data' => $agentRequest->fresh(['statusHistory']),
        ]);
    }

    /**
     * LOCAL DEMO ONLY: lets the CA simulate the customer's approval while testing alone.
     * Returns 404 unless APP_ENV=local. Delete this method and its route before go-live.
     */
    public function demoClientApprove(Request $request, $id)
    {
        abort_unless(app()->environment('local'), 404);

        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $agentRequest->customer_approved = true;
        $agentRequest->customer_approved_at = now();
        $agentRequest->save();

        $this->advanceTo(
            $agentRequest,
            AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
            $user,
            'DEMO: client approval simulated by CA on localhost'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Client approval simulated (local demo only).',
            'data' => $agentRequest->fresh(),
        ]);
    }

    /**
     * Move the case forward to $target one legal step at a time.
     * Never skips history and never moves backwards. Fixes "Illegal transition" errors
     * when a case is behind the step the CA is working on.
     */
    private function advanceTo(AgentRequest $agentRequest, string $target, $user, string $note, array $meta = []): void
    {
        $order = [
            AgentPipelineService::STATUS_REQUEST_RECEIVED,
            AgentPipelineService::STATUS_UNDER_REVIEW,
            AgentPipelineService::STATUS_GOVT_PORTAL_CHECK,
            AgentPipelineService::STATUS_DATA_FETCHING,
            AgentPipelineService::STATUS_COMPARISON,
            AgentPipelineService::STATUS_DEDUCTIONS_REGIME,
            AgentPipelineService::STATUS_FILE_PREPARED,
            AgentPipelineService::STATUS_PAYMENT_PENDING,
            AgentPipelineService::STATUS_CUSTOMER_APPROVAL,
            AgentPipelineService::STATUS_SUBMITTED,
            AgentPipelineService::STATUS_COMPLETED,
        ];

        // Documents pending always loops back through under_review
        if ($agentRequest->pipeline_status === AgentPipelineService::STATUS_DOCUMENTS_PENDING) {
            AgentPipelineService::transition($agentRequest, AgentPipelineService::STATUS_UNDER_REVIEW, $user, 'Resuming review');
            $agentRequest->refresh();
        }

        $from = array_search($agentRequest->pipeline_status, $order, true);
        $to = array_search($target, $order, true);
        if ($from === false || $to === false || $from >= $to) {
            return; // already there/ahead, or a side state like changes_requested
        }

        for ($i = $from + 1; $i <= $to; $i++) {
            $isLast = ($i === $to);
            AgentPipelineService::transition(
                $agentRequest,
                $order[$i],
                $user,
                $isLast ? $note : 'Auto-advanced: ' . $note,
                $isLast ? $meta : []
            );
            $agentRequest->refresh();
        }
    }

    /**
     * CA: Save wizard progress (current step, completed steps, per-step draft data).
     * Does NOT change the pipeline status; it only remembers where the CA stopped.
     */
    public function saveWizardProgress(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::findOrFail($id);

        if ($user->role !== 'admin' && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'current_step' => 'nullable|integer|min:0|max:20',
            'completed_steps' => 'nullable|array',
            'completed_steps.*' => 'integer|min:0|max:20',
            'step_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => $validator->errors()->first()], 422);
        }

        $details = $agentRequest->details ?? [];
        $wizard = $details['wizard_progress'] ?? [];

        if ($request->has('current_step')) {
            $wizard['current_step'] = (int) $request->input('current_step');
        }
        if ($request->has('completed_steps')) {
            $wizard['completed_steps'] = array_values(array_unique($request->input('completed_steps', [])));
        }
        if ($request->has('step_data')) {
            $wizard['step_data'] = array_merge($wizard['step_data'] ?? [], $request->input('step_data', []));
        }
        $wizard['updated_by_user_id'] = $user->id;
        $wizard['updated_at'] = now()->toIso8601String();

        $details['wizard_progress'] = $wizard;
        $agentRequest->details = $details;
        $agentRequest->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Wizard progress saved.',
            'wizard_progress' => $wizard,
            'data' => $agentRequest->fresh(),
        ]);
    }
}