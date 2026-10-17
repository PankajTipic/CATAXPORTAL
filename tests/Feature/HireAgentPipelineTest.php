<?php

namespace Tests\Feature;

use App\Models\AgentRequest;
use App\Models\User;
use App\Services\AgentPipelineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HireAgentPipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_newly_registered_customer_sees_isolated_empty_state()
    {
        // 1. Existing customer with existing request
        $existingCustomer = User::factory()->create(['role' => 'customer']);
        $existingRequest = AgentRequest::create([
            'user_id' => $existingCustomer->id,
            'name' => 'Existing Customer',
            'email' => $existingCustomer->email,
            'phone' => '9876543210',
            'service_type' => 'full_assisted',
            'assessment_year' => '2026-27',
            'pipeline_status' => AgentPipelineService::STATUS_REQUEST_RECEIVED,
            'status' => 'pending',
        ]);

        // 2. Newly registered customer
        $newCustomer = User::factory()->create(['role' => 'customer']);

        // Authenticate as new customer
        $response = $this->actingAs($newCustomer, 'sanctum')->getJson('/api/agent/my-requests');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'data' => [],
        ]);
        $this->assertCount(0, $response->json('data'));

        // Customer cannot access existing customer request
        $forbiddenResponse = $this->actingAs($newCustomer, 'sanctum')->getJson("/api/agent/requests/{$existingRequest->id}");
        $forbiddenResponse->assertStatus(404);
    }

    public function test_strict_sequential_pipeline_lifecycle_end_to_end()
    {
        Storage::fake('public');

        $caAdmin = User::factory()->create(['role' => 'admin']);
        $caSpecialist = User::factory()->create(['role' => 'employee']);
        $customer = User::factory()->create(['role' => 'customer']);

        // Step 1: Customer books a case
        $bookingResponse = $this->actingAs($customer, 'sanctum')->postJson('/api/agent/request', [
            'service_type' => 'full_assisted',
            'assessment_year' => '2026-27',
            'notes' => 'First time hire agent case',
            'pan' => 'ABCDE1234F',
        ]);

        $bookingResponse->assertStatus(201);
        $caseId = $bookingResponse->json('data.id');

        $agentRequest = AgentRequest::findOrFail($caseId);
        $this->assertEquals(AgentPipelineService::STATUS_REQUEST_RECEIVED, $agentRequest->pipeline_status);
        $this->assertEquals('unpaid', $agentRequest->payment_status);
        $this->assertFalse((bool) $agentRequest->onboarding_complete);

        // Assign to CA Specialist
        $this->actingAs($caAdmin, 'sanctum')->patchJson("/api/admin/agent-requests/{$caseId}/assign", [
            'employee_id' => $caSpecialist->id,
        ])->assertStatus(200);

        // Illegal transition check: CA cannot jump directly to data_fetching or submitted without completing prior steps
        $illegalTransition = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/save-comparison", [
            'resolutions' => [],
        ]);
        $this->assertEquals(422, $illegalTransition->status());

        // Step 2: Customer submits onboarding
        $onboardingResponse = $this->actingAs($customer, 'sanctum')->postJson("/api/agent-requests/{$caseId}/onboarding", [
            'pan' => 'ABCDE1234F',
            'date_of_birth' => '1990-05-15',
            'mobile' => '9876543210',
            'email' => $customer->email,
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'HDFC0001234',
            'ais_consent' => true,
        ]);
        $onboardingResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_UNDER_REVIEW, $agentRequest->pipeline_status);
        $this->assertTrue((bool) $agentRequest->onboarding_complete);

        // Step 3: CA requests missing docs
        $missingDocResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/request-missing-docs", [
            'checklist' => ['Form 16 Part A & B', '12 Months Bank Statement'],
            'notes' => 'Please provide complete salary certificates.',
        ]);
        $missingDocResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_DOCUMENTS_PENDING, $agentRequest->pipeline_status);

        // Step 4: CA marks review complete -> moves to govt_portal_check
        $completeReviewResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/complete-review");
        $completeReviewResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_GOVT_PORTAL_CHECK, $agentRequest->pipeline_status);

        // Step 5: Govt portal check (No -> stays in check, Yes -> moves to data_fetching)
        $portalNoResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/govt-portal-check", [
            'is_registered' => false,
            'notes' => 'Customer needs registration',
        ]);
        $portalNoResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_GOVT_PORTAL_CHECK, $agentRequest->pipeline_status);
        $this->assertFalse((bool) $agentRequest->itr_portal_registered);

        $portalYesResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/govt-portal-check", [
            'is_registered' => true,
            'notes' => 'Customer registered on e-filing portal verified',
        ]);
        $portalYesResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_DATA_FETCHING, $agentRequest->pipeline_status);
        $this->assertTrue((bool) $agentRequest->itr_portal_registered);

        // Step 6: Ingest tax data (AIS & 26AS)
        $fetchTaxDataResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/fetch-tax-data");
        $fetchTaxDataResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_COMPARISON, $agentRequest->pipeline_status);
        $this->assertCount(1, $agentRequest->taxSnapshots);
        $this->assertGreaterThan(0, $agentRequest->dataMismatches()->count());

        $mismatches = $agentRequest->dataMismatches()->get();

        // Step 7: Resolve discrepancies & save comparison
        $resolutions = [];
        foreach ($mismatches as $m) {
            $resolutions[] = [
                'id' => $m->id,
                'resolution' => 'accept_ais',
                'resolution_notes' => 'Verified with bank credit',
            ];
        }

        $comparisonResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/save-comparison", [
            'resolutions' => $resolutions,
        ]);
        $comparisonResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_DEDUCTIONS_REGIME, $agentRequest->pipeline_status);

        // Step 8: Save Regime Calculation
        $regimeResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/save-regime-calc", [
            'gross_income' => 1250000,
            'deductions_old' => ['sec80c' => 150000, 'sec80d' => 25000],
            'deductions_new' => ['standard_deduction' => 75000],
            'tax_old_regime' => 88770,
            'tax_new_regime' => 72130,
            'recommended_regime' => 'new',
            'final_regime' => 'new',
            'savings' => 16640,
            'computation_sheet' => ['summary' => 'Optimal under New Regime'],
        ]);
        $regimeResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_FILE_PREPARED, $agentRequest->pipeline_status);

        // Step 9: CA uploads prepared return file -> moves to payment_pending
        $fakeFile = UploadedFile::fake()->create('ITR_Computation_AY2026.json', 50, 'application/json');
        $uploadResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/upload-prepared", [
            'prepared_file' => $fakeFile,
            'file_name' => 'ITR_Computation_AY2026.json',
        ]);
        $uploadResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_PAYMENT_PENDING, $agentRequest->pipeline_status);

        // Step 10: Payment-gated download check
        // Unpaid customer receives 403 PAYMENT_REQUIRED
        $unpaidDownloadResponse = $this->actingAs($customer, 'sanctum')->getJson("/api/agent-requests/{$caseId}/prepared-file");
        $unpaidDownloadResponse->assertStatus(403);
        $this->assertEquals('PAYMENT_REQUIRED', $unpaidDownloadResponse->json('code'));

        // Step 11: Customer completes payment
        $verifyPaymentResponse = $this->actingAs($customer, 'sanctum')->postJson('/api/payment/verify', [
            'razorpay_order_id' => 'order_fake_123',
            'razorpay_payment_id' => 'pay_fake_456',
            'razorpay_signature' => 'mock_signature',
            'agent_request_id' => $caseId,
            'amount' => 999,
        ]);
        $verifyPaymentResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals('paid', $agentRequest->payment_status);
        $this->assertEquals(AgentPipelineService::STATUS_CUSTOMER_APPROVAL, $agentRequest->pipeline_status);

        // Now paid customer CAN download prepared file
        $paidDownloadResponse = $this->actingAs($customer, 'sanctum')->getJson("/api/agent-requests/{$caseId}/prepared-file");
        $paidDownloadResponse->assertStatus(200);
        $paidDownloadResponse->assertJsonStructure(['status', 'file_url', 'payment_status']);

        // Step 12: Customer revision request loop
        $changeReqResponse = $this->actingAs($customer, 'sanctum')->postJson("/api/agent-requests/{$caseId}/request-changes", [
            'notes' => 'Please include my additional PPF receipt of Rs 20,000.',
        ]);
        $changeReqResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_CHANGES_REQUESTED, $agentRequest->pipeline_status);

        // Customer approves filing
        $customerApproveResponse = $this->actingAs($customer, 'sanctum')->postJson("/api/agent-requests/{$caseId}/customer-approve", [
            'declaration' => true,
            'notes' => 'Updated calculation looks good, approved for submission.',
        ]);
        $customerApproveResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_CUSTOMER_APPROVAL, $agentRequest->pipeline_status);

        // Step 13: Final Submission with Acknowledgement Number
        $finalSubmitResponse = $this->actingAs($caSpecialist, 'sanctum')->postJson("/api/agent-requests/{$caseId}/submit-final", [
            'acknowledgement_number' => 'ACK/2026-27/891234567890',
        ]);
        $finalSubmitResponse->assertStatus(200);
        $agentRequest->refresh();
        $this->assertEquals(AgentPipelineService::STATUS_COMPLETED, $agentRequest->pipeline_status);
        $this->assertEquals('ACK/2026-27/891234567890', $agentRequest->acknowledgement_number);
    }
}
