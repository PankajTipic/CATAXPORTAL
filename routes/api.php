<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\AdminAuthController;

/*
|--------------------------------------------------------------------------
| API Routes - Ewaree
|--------------------------------------------------------------------------
*/

// --- Public Routes ---

// Contact form submission (from website)
Route::post('/contact', [ContactController::class, 'store']);

// Admin Login
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// --- Protected Admin Routes (Sanctum Auth Required) ---
Route::middleware('auth:sanctum')->prefix('admin')->group(function () {

    // Logout
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    // Admin Profile
    Route::get('/profile', [AdminAuthController::class, 'profile']);
    Route::put('/profile', [AdminAuthController::class, 'updateProfile']);

    // Contact Inquiries Management
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
});











use App\Http\Controllers\Api\AisConnectionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\Form16Controller;
use App\Http\Controllers\Api\TaxProfileController;
use App\Http\Controllers\Api\ITRController;

// Public Auth & ITR Connection
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Dedicated ITR Portal Endpoints (pluggable with real E-filing / third party APIs)
Route::post('/itr/verify-pan', [ITRController::class, 'verifyPan']);
Route::post('/itr/check-registration', [ITRController::class, 'checkRegistration']);
Route::post('/itr/login-fetch', [ITRController::class, 'loginAndFetch']);
Route::post('/itr/register', [ITRController::class, 'register']);

// Razorpay Payment Integration Endpoints
Route::post('/payment/create-order', [\App\Http\Controllers\Api\PaymentController::class, 'createOrder']);
Route::post('/payment/verify', [\App\Http\Controllers\Api\PaymentController::class, 'verifyPayment']);
Route::get('/payment/status', [\App\Http\Controllers\Api\PaymentController::class, 'checkStatus']);

// Authenticated (Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // ITR Preparation, Data Fetch & Submission
    Route::get('/itr/data', [ITRController::class, 'getData']);
    Route::post('/itr/submit', [ITRController::class, 'submit']);

    Route::get('/tax-profile', [TaxProfileController::class, 'show']);
    Route::post('/tax-profile', [TaxProfileController::class, 'upsert']);

    // Consent-based AIS connection flow (no govt password ever sent here)
    Route::post('/ais/connections', [AisConnectionController::class, 'initiate']);
    Route::get('/ais/connections/{connection}/status', [AisConnectionController::class, 'checkStatus']);
    Route::post('/ais/connections/{connection}/fetch', [AisConnectionController::class, 'fetchData']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    Route::get('/form16', [Form16Controller::class, 'index']);
    Route::post('/form16', [Form16Controller::class, 'store']);
    Route::put('/form16/{entry}', [Form16Controller::class, 'update']);
    Route::delete('/form16/{entry}', [Form16Controller::class, 'destroy']);

    // --- HIRE AGENT / CA ASSISTED FILING ROUTES ---
    // Customer endpoints
    Route::post('/agent/request', [\App\Http\Controllers\Api\AgentRequestController::class, 'store']);
    Route::get('/agent/my-requests', [\App\Http\Controllers\Api\AgentRequestController::class, 'myRequests']);
    Route::get('/agent/requests/{id}', [\App\Http\Controllers\Api\AgentRequestController::class, 'show']);

    // Admin & Employee endpoints
    Route::get('/admin/agent-requests', [\App\Http\Controllers\Api\AgentRequestController::class, 'adminIndex']);
    Route::patch('/admin/agent-requests/{id}/assign', [\App\Http\Controllers\Api\AgentRequestController::class, 'assignEmployee']);
    Route::get('/employee/agent-requests', [\App\Http\Controllers\Api\AgentRequestController::class, 'employeeIndex']);
    Route::patch('/agent-requests/{id}/status', [\App\Http\Controllers\Api\AgentRequestController::class, 'updateStatus']);
    Route::post('/agent-requests/{id}/upload-prepared', [\App\Http\Controllers\Api\AgentRequestController::class, 'uploadPreparedFile']);

    // Chat endpoints
    Route::get('/agent-requests/{id}/chat', [\App\Http\Controllers\Api\ChatMessageController::class, 'index']);
    Route::post('/agent-requests/{id}/chat', [\App\Http\Controllers\Api\ChatMessageController::class, 'store']);

    // Enterprise CA Workflow endpoints
    Route::post('/agent-requests/{id}/verify-document', [\App\Http\Controllers\Api\AgentRequestController::class, 'verifyDocument']);
    Route::post('/agent-requests/{id}/save-return-draft', [\App\Http\Controllers\Api\AgentRequestController::class, 'saveReturnDraft']);
    Route::post('/agent-requests/{id}/prepare-and-send', [\App\Http\Controllers\Api\AgentRequestController::class, 'prepareAndSend']);
    Route::post('/agent-requests/{id}/approve-filing', [\App\Http\Controllers\Api\AgentRequestController::class, 'approveFiling']);
    Route::post('/agent-requests/{id}/sign-off-quality-gate', [\App\Http\Controllers\Api\AgentRequestController::class, 'signOffQualityGate']);
    Route::post('/agent-requests/{id}/mark-filed', [\App\Http\Controllers\Api\AgentRequestController::class, 'markFiled']);

    // Customer consent / approval route (client authorises CA to submit their ITR)
    Route::post('/agent-requests/{id}/customer-approve', [\App\Http\Controllers\Api\AgentRequestController::class, 'customerApprove']);

    // CA Staff Management CRUD endpoints (Admin)
    Route::apiResource('/admin/employees', \App\Http\Controllers\Api\EmployeeController::class);

    // Audit logs viewer endpoint
    Route::get('/admin/audit-logs', function (Request $request) {
        $logs = \DB::table('audit_logs')
            ->leftJoin('users', 'audit_logs.user_id', '=', 'users.id')
            ->select('audit_logs.*', 'users.name as user_name', 'users.email as user_email')
            ->orderBy('audit_logs.id', 'desc')
            ->limit(100)
            ->get();
        return response()->json(['status' => 'success', 'data' => $logs]);
    });

    // Contact Inquiries (CA Portal - admin/employee access)
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);
});

