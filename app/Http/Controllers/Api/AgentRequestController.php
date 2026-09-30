<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AgentRequest;
use App\Models\User;
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

        $agentRequest = AgentRequest::create([
            'user_id' => $user->id,
            'assessment_year' => $request->input('assessment_year', '2026-27'),
            'status' => 'pending',
            'service_type' => $request->input('service_type', 'full_filing'),
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
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $agentRequest = AgentRequest::with([
            'user:id,name,email,phone',
            'user.taxProfile',
            'user.aisConnections.snapshot',
            'user.form16Entries',
            'user.documents',
            'assignedEmployee:id,name,email,phone',
            'chatMessages.sender:id,name,role',
        ])->findOrFail($id);

        // Security check
        if ($user->role !== 'admin' && $agentRequest->user_id !== $user->id && $agentRequest->assigned_employee_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized access.'], 403);
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

        // Enforce conditions
        if (!$agentRequest->customer_approved) {
            return response()->json([
                'status' => 'error',
                'message' => 'Quality gate failed: Customer approval is mandatory before marking Ready to File.',
            ], 422);
        }

        $agentRequest->reviewer_id = $user->id;
        $agentRequest->quality_gate_passed = true;
        $agentRequest->status = 'prepared';
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

        return response()->json([
            'status' => 'success',
            'message' => 'Prepared ITR calculation file uploaded successfully! The customer can now review and download it.',
            'data' => $agentRequest,
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

        if ($agentRequest->status !== 'prepared') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Customer approval is only available when your ITR file has been marked ready.',
            ], 422);
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
            'customer_approved_at' => now(),
        ]);

        // Emit immutable audit log
        \App\Services\AuditService::log(
            $user->id,
            'CUSTOMER_FILING_APPROVED',
            'agent_requests',
            (int) $agentRequest->id,
            [
                'assessment_year'    => $request->input('assessment_year', $agentRequest->assessment_year),
                'declaration_accepted' => true,
                'ip_address'         => $request->ip(),
                'approved_at'        => now()->toIso8601String(),
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

        \App\Services\AuditService::log(
            $user->id,
            'RETURN_PREPARED_BY_CA',
            'agent_requests',
            (int) $agentRequest->id,
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
}
