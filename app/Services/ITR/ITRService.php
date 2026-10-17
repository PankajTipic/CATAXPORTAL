<?php

// namespace App\Services\ITR;

// use App\Models\User;
// use App\Models\TaxProfile;
// use App\Models\AisDataSnapshot;
// use App\Models\Form16Entry;
// use App\Models\ItrFiling;
// use Illuminate\Support\Facades\Hash;
// use Illuminate\Support\Str;

// /**
//  * Pluggable ITR Integration Service
//  * 
//  * Currently provides local/mock implementation for:
//  * 1. Income Tax portal login & automatic sync (AIS, TDS, 26AS, Form 16)
//  * 2. In-portal Income Tax registration
//  * 3. ITR Return filing & acknowledgement generation
//  * 
//  * TO PLUG IN REAL THIRD-PARTY / ERI APIs:
//  * Simply replace the internal mock calls with your real HTTP calls (e.g. via Http::withHeaders(...)->post(...)).
//  */
// class ITRService
// {
//     /**
//      * Verify PAN validity and return taxpayer name (Mock / FastKYC).
//      */
//     public function verifyPan(string $pan): array
//     {
//         $pan = strtoupper(trim($pan));
//         if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
//             return [
//                 'valid' => false,
//                 'pan' => $pan,
//                 'name' => '',
//                 'status' => 'INVALID',
//             ];
//         }

//         $names = [
//             'S' => 'RAJESH SHARMA',
//             'K' => 'ANITA KUMAR',
//             'G' => 'VIKRAM GUPTA',
//             'P' => 'SNEHA PATEL',
//             'M' => 'AMIT MEHTA',
//             'V' => 'PRIYA VERMA',
//         ];
//         $initial = substr($pan, 4, 1);
//         $name = $names[$initial] ?? 'ROHIT VERMA';

//         return [
//             'valid' => true,
//             'pan' => $pan,
//             'name' => $name,
//             'dobMasked' => '15/08/1988',
//             'aadhaarLinked' => true,
//             'status' => 'VALID',
//             'category' => substr($pan, 3, 1) === 'H' ? 'HUF' : 'Individual',
//         ];
//     }

//     /**
//      * Check if PAN is registered on Income Tax Portal.
//      * Mock Rule: PANs ending with an even digit = registered, odd = not registered.
//      */
//     // public function checkRegistration(string $pan): array
//     // {
//     //     $pan = strtoupper(trim($pan));
//     //     if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
//     //         return [
//     //             'valid' => false,
//     //             'pan' => $pan,
//     //             'registeredOnPortal' => false,
//     //             'message' => 'Invalid PAN format',
//     //         ];
//     //     }

//     //     // 4 numeric digits in PAN: positions 5, 6, 7, 8
//     //     $digits = substr($pan, 5, 4);
//     //     $lastDigit = (int) substr($digits, -1);
//     //     $registered = ($lastDigit % 2 === 0);

//     //     return [
//     //         'valid' => true,
//     //         'pan' => $pan,
//     //         'registeredOnPortal' => $registered,
//     //         'message' => $registered
//     //             ? 'Taxpayer profile found on Income Tax E-filing portal.'
//     //             : 'PAN is not yet registered on the Income Tax E-filing portal. Registration required.',
//     //     ];
//     // }

//     public function checkRegistration(string $pan): array
// {
//     $pan = strtoupper(trim($pan));

//     if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
//         return [
//             'valid' => false,
//             'pan' => $pan,
//             'registeredOnPortal' => false,
//             'message' => 'Invalid PAN format',
//         ];
//     }

//     // Check if this PAN was previously registered via our portal
//     $isRegistered = \Cache::get("pan_registered_{$pan}", false);

//     // Fallback mock rule (even last digit = registered) only if never registered via portal
//     if (!$isRegistered) {
//         $digits = substr($pan, 5, 4);
//         $lastDigit = (int) substr($digits, -1);
//         $isRegistered = ($lastDigit % 2 === 0);
//     }

//     return [
//         'valid' => true,
//         'pan' => $pan,
//         'registeredOnPortal' => $isRegistered,
//         'message' => $isRegistered
//             ? 'Taxpayer profile found on Income Tax E-filing portal.'
//             : 'PAN is not yet registered on the Income Tax E-filing portal. Registration required.',
//     ];
// }

//     /**
//      * Authenticate customer with PAN + Password and fetch AIS, TDS, 26AS & Form 16 data.
//      * ZERO PASSWORD STORAGE: The government portal password is never written to DB or logs.
//      */
//     public function loginAndFetchData(string $pan, string $password, string $assessmentYear = '2026-27'): array
//     {
//         $pan = strtoupper(trim($pan));

//         // 1. Check registration via odd/even digit rule
//         $regCheck = $this->checkRegistration($pan);
//         if (!$regCheck['registeredOnPortal']) {
//             return [
//                 'status' => 'not_registered',
//                 'message' => "PAN {$pan} is not registered on the Income Tax e-Filing portal. Please register your account first.",
//                 'pan' => $pan,
//             ];
//         }

//         // 2. Validate password (Mock Rule: Test@1234 or any 4+ char password succeeds for mock testing)
//         if (empty($password) || strlen($password) < 4) {
//             return [
//                 'status' => 'invalid_credentials',
//                 'message' => 'Please enter a valid portal password (minimum 4 characters).',
//             ];
//         }

//         // 3. Find or create local User & TaxProfile with secure local random key (NEVER saving portal password)
//         $taxProfile = TaxProfile::where('pan', $pan)->first();
//         $user = $taxProfile ? $taxProfile->user : null;

//         if (!$user) {
//             $mockEmail = strtolower($pan) . '@taxpayer.local';
//             $user = User::firstOrCreate(
//                 ['email' => $mockEmail],
//                 [
//                     'name' => 'Taxpayer (' . $pan . ')',
//                     'phone' => '9876543210',
//                     'password' => Hash::make(Str::random(32)), // Random hash, zero password storage!
//                     'role' => 'customer',
//                 ]
//             );

//             if (!$taxProfile) {
//                 $taxProfile = TaxProfile::create([
//                     'user_id' => $user->id,
//                     'pan' => $pan,
//                     'date_of_birth' => '1988-06-15',
//                     'assessee_type' => 'individual',
//                     'city' => 'Mumbai',
//                     'state' => 'Maharashtra',
//                     'pincode' => '400001',
//                     'aadhaar_last4' => '8921',
//                 ]);
//             }
//         }

//         // Generate Sanctum auth token for frontend session
//         $token = $user->createToken('itr-portal-token')->plainTextToken;

//         // 4. Generate & Store Comprehensive AIS Data
//         $connection = \App\Models\AisConnection::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $assessmentYear],
//             [
//                 'provider' => 'it_portal_direct',
//                 'status' => 'connected',
//                 'connection_reference' => 'ITP-' . Str::upper(Str::random(12)),
//                 'connected_at' => now(),
//                 'expires_at' => now()->addDays(30),
//             ]
//         );

//         $aisData = $this->generateMockAisData($pan, $assessmentYear);
//         $form26asData = $this->generateMock26ASData($pan, $assessmentYear);
//         $form16Data = $this->generateMockForm16Data($user, $pan, $assessmentYear);

//         $snapshot = AisDataSnapshot::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $assessmentYear],
//             [
//                 'ais_connection_id' => $connection->id,
//                 'salary_data' => $aisData['salary_data'],
//                 'tds_data' => $aisData['tds_data'],
//                 'interest_income_data' => $aisData['interest_income_data'],
//                 'other_income_data' => $aisData['other_income_data'],
//                 'sft_data' => $aisData['sft_data'],
//                 'raw_response' => [
//                     'ais' => $aisData,
//                     'form26as' => $form26asData,
//                     'form16' => $form16Data,
//                 ],
//                 'fetched_at' => now(),
//             ]
//         );

//         return [
//             'status' => 'success',
//             'message' => 'Successfully connected to Income Tax portal! AIS, TDS, 26AS, and Form 16 data synchronized.',
//             'token' => $token,
//             'user' => [
//                 'id' => $user->id,
//                 'name' => $user->name,
//                 'email' => $user->email,
//                 'phone' => $user->phone,
//                 'pan' => $pan,
//                 'dob' => $taxProfile->date_of_birth ? $taxProfile->date_of_birth->format('Y-m-d') : '1988-06-15',
//             ],
//             'assessment_year' => $assessmentYear,
//             'tax_data' => [
//                 'ais' => $aisData,
//                 'form26as' => $form26asData,
//                 'form16' => $form16Data,
//                 'summary' => $this->computeTaxSummary($aisData, $form16Data),
//             ],
//         ];
//     }

//     /**
//      * Register a new taxpayer on the Income Tax Portal directly from our application.
//      */
//     public function registerOnITPortal(array $details): array
//     {
//         $pan = strtoupper(trim($details['pan']));
//         $name = trim($details['name']);
//         $email = strtolower(trim($details['email']));
//         $phone = trim($details['phone'] ?? '9876543210');
//         $password = $details['password'];
//         $dob = $details['dob'] ?? '1990-01-01';

//         // Check if already registered
//         $existingProfile = TaxProfile::where('pan', $pan)->first();
//         if ($existingProfile) {
//             return [
//                 'status' => 'already_registered',
//                 'message' => "PAN {$pan} is already registered on the Income Tax portal. Please log in using your password.",
//             ];
//         }

//         // Create or update user account
//         $user = User::where('email', $email)->first();
//         if ($user) {
//             // If this user already has a TaxProfile with a DIFFERENT PAN,
//             // create a dedicated taxpayer account for this PAN so each PAN has its own TaxProfile
//             if ($user->taxProfile && $user->taxProfile->pan !== $pan) {
//                 $panEmail = strtolower($pan) . '@taxpayer.local';
//                 $user = User::firstOrCreate(
//                     ['email' => $panEmail],
//                     [
//                         'name' => $name,
//                         'phone' => $phone,
//                         'password' => Hash::make($password),
//                     ]
//                 );
//             } else {
//                 $user->update([
//                     'name' => $name,
//                     'phone' => $phone,
//                     'password' => Hash::make($password),
//                 ]);
//             }
//         } else {
//             $user = User::create([
//                 'name' => $name,
//                 'email' => $email,
//                 'phone' => $phone,
//                 'password' => Hash::make($password),
//             ]);
//         }

//         // Create or update TaxProfile linked to user
//         $taxProfile = TaxProfile::updateOrCreate(
//             ['user_id' => $user->id],
//             [
//                 'pan' => $pan,
//                 'date_of_birth' => $dob,
//                 'assessee_type' => $details['assessee_type'] ?? 'individual',
//                 'address_line1' => $details['address'] ?? 'Main Road',
//                 'city' => $details['city'] ?? 'Mumbai',
//                 'state' => $details['state'] ?? 'Maharashtra',
//                 'pincode' => $details['pincode'] ?? '400001',
//                 'aadhaar_last4' => substr($details['aadhaar'] ?? '1234', -4),
//             ]
//         );

//         $token = $user->createToken('itr-portal-token')->plainTextToken;

//         // Auto-seed initial return data for this new taxpayer
//         $ay = $details['assessment_year'] ?? '2026-27';
//         $aisData = $this->generateMockAisData($pan, $ay, true);
//         $form26asData = $this->generateMock26ASData($pan, $ay, true);
//         $form16Data = $this->generateMockForm16Data($user, $pan, $ay, true);

//         $connection = \App\Models\AisConnection::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $ay],
//             [
//                 'provider' => 'it_portal_direct',
//                 'status' => 'connected',
//                 'connection_reference' => 'ITP-' . Str::upper(Str::random(12)),
//                 'connected_at' => now(),
//                 'expires_at' => now()->addDays(30),
//             ]
//         );

//         AisDataSnapshot::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $ay],
//             [
//                 'ais_connection_id' => $connection->id,
//                 'salary_data' => $aisData['salary_data'],
//                 'tds_data' => $aisData['tds_data'],
//                 'interest_income_data' => $aisData['interest_income_data'],
//                 'other_income_data' => $aisData['other_income_data'],
//                 'sft_data' => $aisData['sft_data'],
//                 'raw_response' => [
//                     'ais' => $aisData,
//                     'form26as' => $form26asData,
//                     'form16' => $form16Data,
//                 ],
//                 'fetched_at' => now(),
//             ]
//         );

//         return [
//             'status' => 'success',
//             'message' => "Congratulations! PAN {$pan} is successfully registered on the Income Tax portal.",
//             'token' => $token,
//             'user' => [
//                 'id' => $user->id,
//                 'name' => $user->name,
//                 'email' => $user->email,
//                 'phone' => $user->phone,
//                 'pan' => $pan,
//                 'dob' => $dob,
//             ],
//             'assessment_year' => $ay,
//             'tax_data' => [
//                 'ais' => $aisData,
//                 'form26as' => $form26asData,
//                 'form16' => $form16Data,
//                 'summary' => $this->computeTaxSummary($aisData, $form16Data),
//             ],
//         ];
//     }

//     /**
//      * Submit customer's prepared ITR file to Income Tax Portal and generate Acknowledgement.
//      */
//     public function submitReturn(User $user, array $payload): array
//     {
//         $ay = $payload['assessment_year'] ?? '2026-27';
//         $taxProfile = $user->taxProfile;
//         $pan = $taxProfile ? $taxProfile->pan : 'ABCDE1234F';

//         // Generate official-looking ITR acknowledgement number
//         // Standard format: ACK/AY/15-digit number
//         $randomNumeric = mt_rand(100000000000, 999999999999);
//         $ackNumber = "ACK/{$ay}/{$randomNumeric}";

//         $filingType = $payload['filing_type'] ?? 'original';
//         $filingSection = $payload['filing_section'] ?? ($filingType === 'belated' ? '139(4)' : ($filingType === 'updated' ? '139(8A)' : ($filingType === 'revised' ? '139(5)' : '139(1)')));
//         $lateFee234f = floatval($payload['late_fee_234f'] ?? 0);
//         $itruAdditionalTax = floatval($payload['itru_additional_tax'] ?? 0);
//         $itruReason = $payload['itru_reason'] ?? null;

//         $filing = ItrFiling::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $ay],
//             [
//                 'itr_form_type' => substr($payload['itr_form_type'] ?? 'ITR-1', 0, 10),
//                 'filing_type' => $filingType,
//                 'filing_section' => $filingSection,
//                 'total_income' => $payload['total_income'] ?? 1250000,
//                 'total_tax_liability' => $payload['total_tax_liability'] ?? 85000,
//                 'total_tds_claimed' => $payload['total_tds_claimed'] ?? 115000,
//                 'refund_or_payable' => $payload['refund_or_payable'] ?? 30000, // positive = refund, negative = payable
//                 'late_fee_234f' => $lateFee234f,
//                 'itru_additional_tax' => $itruAdditionalTax,
//                 'itru_reason' => $itruReason,
//                 'status' => 'filed',
//                 'acknowledgement_number' => $ackNumber,
//                 'computation_summary' => $payload['computation_summary'] ?? [],
//                 'filed_at' => now(),
//             ]
//         );

//         return [
//             'status' => 'success',
//             'message' => 'ITR successfully submitted to Income Tax Department e-Filing Portal!',
//             'acknowledgement_number' => $ackNumber,
//             'filing_id' => $filing->id,
//             'pan' => $pan,
//             'taxpayer_name' => $user->name,
//             'assessment_year' => $ay,
//             'form_type' => $filing->itr_form_type,
//             'filing_type' => $filingType,
//             'filing_section' => $filingSection,
//             'submitted_at' => now()->format('d M Y, h:i A'),
//             'verification_status' => 'Pending e-Verification (Valid for 30 Days)',
//             'verification_options' => [
//                 'Aadhaar OTP (Instant verification)',
//                 'Net Banking login',
//                 'Bank Account EVC',
//                 'Send signed ITR-V to CPC Bengaluru',
//             ],
//             'receipt' => [
//                 'gross_total_income' => $filing->total_income,
//                 'tax_liability' => $filing->total_tax_liability,
//                 'tds_paid' => $filing->total_tds_claimed,
//                 'refund_due' => max(0, $filing->refund_or_payable),
//                 'tax_payable' => abs(min(0, $filing->refund_or_payable)),
//             ],
//         ];
//     }

//     /**
//      * Retrieve all synchronized tax data for dashboard display.
//      */
//     public function getTaxData(User $user, string $assessmentYear = '2026-27'): array
//     {
//         $snapshot = AisDataSnapshot::where('user_id', $user->id)
//             ->where('assessment_year', $assessmentYear)
//             ->first();

//         $form16 = Form16Entry::where('user_id', $user->id)
//             ->where('assessment_year', $assessmentYear)
//             ->first();

//         $latestFiling = ItrFiling::where('user_id', $user->id)
//             ->where('assessment_year', $assessmentYear)
//             ->latest()
//             ->first();

//         $taxProfile = $user->taxProfile;
//         $isTestBlankUser = ($user->email === 'test@tiqtax.in') || ($user->name === 'Test Customer');

//         if ($isTestBlankUser) {
//             $ais = [
//                 'salary_data' => [],
//                 'tds_data' => [],
//                 'interest_income_data' => [],
//                 'other_income_data' => [],
//                 'sft_data' => [],
//             ];
//             $form26as = [
//                 'tds_salary' => [],
//                 'tds_other' => [],
//                 'tcs' => [],
//                 'advance_tax' => [],
//                 'summary' => [
//                     'total_gross' => 0,
//                     'total_tds' => 0,
//                     'total_tcs' => 0,
//                 ],
//             ];
//             $form16Data = null;

//             return [
//                 'taxpayer' => [
//                     'name' => $user->name,
//                     'email' => $user->email,
//                     'phone' => $user->phone,
//                     'pan' => $taxProfile?->pan ?? '',
//                     'dob' => $taxProfile?->date_of_birth?->format('Y-m-d') ?? null,
//                 ],
//                 'assessment_year' => $assessmentYear,
//                 'is_empty_user' => true,
//                 'ais' => $ais,
//                 'form26as' => $form26as,
//                 'form16' => null,
//                 'summary' => [
//                     'gross_total_income' => 0,
//                     'total_deductions' => 0,
//                     'total_taxable_income' => 0,
//                     'total_tax_payable' => 0,
//                     'total_tax_paid' => 0,
//                     'net_tax_payable' => 0,
//                     'refund_amount' => 0,
//                     'recommended_regime' => 'New Regime (Sec 115BAC)',
//                 ],
//                 'latest_filing' => null,
//             ];
//         }

//         $ais = $snapshot ? [
//             'salary_data' => $snapshot->salary_data ?? [],
//             'tds_data' => $snapshot->tds_data ?? [],
//             'interest_income_data' => $snapshot->interest_income_data ?? [],
//             'other_income_data' => $snapshot->other_income_data ?? [],
//             'sft_data' => $snapshot->sft_data ?? [],
//         ] : $this->generateMockAisData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

//         $form26as = $snapshot ? ($snapshot->raw_response['form26as'] ?? $this->generateMock26ASData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear)) : $this->generateMock26ASData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

//         $form16Data = $form16 ? [
//             'employer_name' => $form16->employer_name,
//             'employer_tan' => $form16->employer_tan,
//             'gross_salary' => $form16->gross_salary,
//             'standard_deduction' => $form16->standard_deduction,
//             'hra_exemption' => $form16->hra_exemption,
//             'professional_tax' => $form16->professional_tax,
//             'total_tds' => $form16->total_tds,
//             'deduction_80c' => $form16->deduction_80c,
//             'deduction_80d' => $form16->deduction_80d,
//         ] : $this->generateMockForm16Data($user, $taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

//         return [
//             'taxpayer' => [
//                 'name' => $user->name,
//                 'email' => $user->email,
//                 'phone' => $user->phone,
//                 'pan' => $taxProfile?->pan ?? 'ABCDE1234F',
//                 'dob' => $taxProfile?->date_of_birth?->format('Y-m-d') ?? '1988-06-15',
//             ],
//             'assessment_year' => $assessmentYear,
//             'is_empty_user' => false,
//             'ais' => $ais,
//             'form26as' => $form26as,
//             'form16' => $form16Data,
//             'summary' => $this->computeTaxSummary($ais, $form16Data),
//             'latest_filing' => $latestFiling,
//         ];
//     }

//     // ─────────────────────────────────────────────────────────────────────────
//     // Mock Generators (Replace with real third-party API payloads in production)
//     // ─────────────────────────────────────────────────────────────────────────

//         private function generateMockAisData(string $pan, string $ay, bool $isNew = false): array
//     {
//         $baseSalary = $isNew ? 950000 : 1250000;
//         $salaryTds = $isNew ? 65000 : 115000;

//         return [
//             'pan' => $pan,
//             'assessment_year' => $ay,
//             'financial_year' => '2025-26',
//             'part_a_general_info' => [
//                 'pan' => $pan,
//                 'masked_aadhaar' => 'XXXX-XXXX-8921',
//                 'name' => 'Taxpayer (' . $pan . ')',
//                 'dob' => '1988-06-15',
//                 'mobile' => '+91-9876543210',
//                 'email' => strtolower($pan) . '@taxpayer.local',
//                 'address' => '402, Sunshine Heights, Main Road, Pune - 411038, Maharashtra',
//                 'status' => 'Individual (Resident Ordinarily Resident)',
//             ],
//             // Part B.1: TDS / TCS Information
//             'salary_data' => [
//                 [
//                     'info_code' => 'TDS-192',
//                     'employer' => 'TechCorp Solutions Pvt Ltd',
//                     'tan' => 'MUMB12345C',
//                     'gross_salary' => $baseSalary,
//                     'tds_deducted' => $salaryTds,
//                     'section' => '192',
//                     'feedback_status' => 'Information is correct (Accepted)',
//                 ],
//             ],
//             'tds_data' => [
//                 [
//                     'info_code' => 'TDS-192',
//                     'deductor' => 'TechCorp Solutions Pvt Ltd',
//                     'tan' => 'MUMB12345C',
//                     'section' => '192 (Salary)',
//                     'amount_paid' => $baseSalary,
//                     'tds_deducted' => $salaryTds,
//                     'status' => 'Matched 100%',
//                     'feedback_status' => 'Information is correct',
//                 ],
//                 [
//                     'info_code' => 'TDS-194A',
//                     'deductor' => 'HDFC Bank Ltd',
//                     'tan' => 'MUMH00012A',
//                     'section' => '194A (Interest other than securities)',
//                     'amount_paid' => 42700,
//                     'tds_deducted' => 4270,
//                     'status' => 'Matched 100%',
//                     'feedback_status' => 'Information is correct',
//                 ],
//             ],
//             // Part B.2: SFT Information (Specified Financial Transactions)
//             'interest_income_data' => [
//                 [
//                     'info_code' => 'SFT-005',
//                     'source' => 'HDFC Bank Savings Account',
//                     'account_no' => 'XXXXXX6450',
//                     'amount' => 14200,
//                     'type' => 'Savings Bank Interest (Eligible u/s 80TTA)',
//                     'feedback_status' => 'Accepted',
//                 ],
//                 [
//                     'info_code' => 'SFT-005',
//                     'source' => 'State Bank of India Term Deposit',
//                     'account_no' => 'XXXXXX3312',
//                     'amount' => 28500,
//                     'type' => 'Fixed Deposit Interest (TDS deducted u/s 194A)',
//                     'feedback_status' => 'Accepted',
//                 ],
//             ],
//             'other_income_data' => [
//                 [
//                     'info_code' => 'DIV-194',
//                     'description' => 'Dividend income - Reliance Industries Ltd',
//                     'amount' => 5400,
//                     'tds_deducted' => 540,
//                     'feedback_status' => 'Accepted',
//                 ],
//                 [
//                     'info_code' => 'DIV-194',
//                     'description' => 'Dividend income - Tata Consultancy Services',
//                     'amount' => 3000,
//                     'tds_deducted' => 300,
//                     'feedback_status' => 'Accepted',
//                 ],
//             ],
//             'sft_data' => [
//                 [
//                     'info_code' => 'SFT-006',
//                     'transaction' => 'Purchase of Mutual Funds Units',
//                     'reporting_entity' => 'HDFC AMC Ltd & Nippon India MF',
//                     'amount' => 250000,
//                     'date' => '2025-11-14',
//                     'feedback_status' => 'Information is correct',
//                 ],
//             ],
//             // Part B.3: Payment of Taxes (Advance / Self-Assessment Tax)
//             'tax_payments_data' => [
//                 [
//                     'info_code' => 'TAX-280',
//                     'tax_type' => 'Self Assessment Tax (300)',
//                     'bsr_code' => '0210045',
//                     'challan_no' => '04512',
//                     'date_of_deposit' => '2026-03-28',
//                     'amount' => 0,
//                     'status' => 'Not Applicable (Refund Due)',
//                 ],
//             ],
//             // Part B.4: Demand and Refund History
//             'demand_refund_data' => [
//                 [
//                     'assessment_year' => '2025-26',
//                     'nature' => 'Income Tax Refund Paid u/s 143(1)',
//                     'amount' => 24150,
//                     'interest_244a' => 720,
//                     'date' => '2025-08-19',
//                     'status' => 'Directly Credited to Bank Account',
//                 ],
//             ],
//             // Part B.5: Other Information
//             'other_info_data' => [
//                 [
//                     'info_code' => 'OTH-244A',
//                     'description' => 'Interest on Income Tax Refund u/s 244A for AY 2025-26',
//                     'amount' => 720,
//                     'status' => 'Reportable under Income from Other Sources',
//                 ],
//             ],
//         ];
//     }

//         private function generateMock26ASData(string $pan, string $ay, bool $isNew = false): array
//     {
//         $salaryTds = $isNew ? 65000 : 115000;

//         return [
//             'pan' => $pan,
//             'assessment_year' => $ay,
//             'financial_year' => '2025-26',
//             // Part A: TDS on Salary
//             'part_a_tds_salary' => [
//                 [
//                     'deductor_name' => 'TechCorp Solutions Pvt Ltd',
//                     'deductor_tan' => 'MUMB12345C',
//                     'section' => '192',
//                     'total_amount' => $isNew ? 950000 : 1250000,
//                     'total_tds_deducted' => $salaryTds,
//                     'total_tds_deposited' => $salaryTds,
//                     'challan_status' => 'Matched (Challan Q1-Q4 verified on OLTAS)',
//                 ],
//             ],
//             // Part A1: TDS Other than Salary (Sec 194A, 194, etc.)
//             'part_a1_tds_other' => [
//                 [
//                     'deductor_name' => 'HDFC Bank Ltd',
//                     'deductor_tan' => 'MUMH00012A',
//                     'section' => '194A',
//                     'total_amount' => 42700,
//                     'total_tds_deducted' => 4270,
//                     'total_tds_deposited' => 4270,
//                     'challan_status' => 'Matched',
//                 ],
//                 [
//                     'deductor_name' => 'Reliance Industries Ltd',
//                     'deductor_tan' => 'MUMR00055D',
//                     'section' => '194',
//                     'total_amount' => 5400,
//                     'total_tds_deducted' => 540,
//                     'total_tds_deposited' => 540,
//                     'challan_status' => 'Matched',
//                 ],
//                 [
//                     'deductor_name' => 'Tata Consultancy Services Ltd',
//                     'deductor_tan' => 'MUMT00088F',
//                     'section' => '194',
//                     'total_amount' => 3000,
//                     'total_tds_deducted' => 300,
//                     'total_tds_deposited' => 300,
//                     'challan_status' => 'Matched',
//                 ],
//             ],
//             // Part B: Tax Collected at Source (TCS)
//             'part_b_tcs' => [],
//             // Part C: Tax Paid (Advance Tax / Self Assessment Tax Challan 280)
//             'part_c_advance_tax' => [],
//             // Part D: Refund Details
//             'part_d_refunds' => [
//                 [
//                     'assessment_year' => '2025-26',
//                     'mode' => 'NECS / RTGS',
//                     'refund_amount' => 24150,
//                     'interest' => 720,
//                     'date_of_payment' => '2025-08-19',
//                 ],
//             ],
//             // Part E: Specified Financial Transactions (AIR/SFT)
//             'part_e_sft' => [
//                 [
//                     'reporting_entity' => 'HDFC Mutual Fund',
//                     'transaction_type' => 'Purchase of Mutual Funds',
//                     'aggregate_amount' => 250000,
//                 ],
//             ],
//             // Note on 80C/80D:
//             'note_on_deductions' => 'Note: Chapter VI-A deductions (80C, 80D, 80G) are not part of Form 26AS. Form 26AS only tracks Tax Credits (TDS, TCS, Advance Tax). 80C/80D are documented in Form 16 Part B and claimed directly in your ITR.',
//             'total_tax_credit' => $salaryTds + 4270 + 540 + 300,
//         ];
//     }

//     private function generateMockForm16Data(User $user, string $pan, string $ay, bool $isNew = false): array
//     {
//         $grossSalary = $isNew ? 950000 : 1250000;
//         $tds = $isNew ? 65000 : 115000;
//         $standardDeduction = 75000; // FY 2025-26 / AY 2026-27 updated limit

//         $entry = Form16Entry::updateOrCreate(
//             ['user_id' => $user->id, 'assessment_year' => $ay],
//             [
//                 'employer_name' => 'TechCorp Solutions Pvt Ltd',
//                 'employer_tan' => 'MUMB12345C',
//                 'gross_salary' => $grossSalary,
//                 'standard_deduction' => $standardDeduction,
//                 'hra_exemption' => $isNew ? 60000 : 120000,
//                 'professional_tax' => 2500,
//                 'total_tds' => $tds,
//                 'deduction_80c' => 150000,
//                 'deduction_80d' => 25000,
//                 'source' => 'manual',
//             ]
//         );

//         return [
//             'employer_name' => $entry->employer_name,
//             'employer_tan' => $entry->employer_tan,
//             'gross_salary' => $entry->gross_salary,
//             'standard_deduction' => $entry->standard_deduction,
//             'hra_exemption' => $entry->hra_exemption,
//             'professional_tax' => $entry->professional_tax,
//             'total_tds' => $entry->total_tds,
//             'deduction_80c' => $entry->deduction_80c,
//             'deduction_80d' => $entry->deduction_80d,
//         ];
//     }

//         private function computeTaxSummary(array $ais, array $form16): array
//     {
//         $salary = $form16['gross_salary'] ?? 1250000;
//         $interest = 0;
//         foreach ($ais['interest_income_data'] ?? [] as $item) {
//             $interest += $item['amount'];
//         }
//         $dividend = 0;
//         foreach ($ais['other_income_data'] ?? [] as $item) {
//             $dividend += $item['amount'];
//         }
//         $interestOnRefund = 720;

//         $grossTotalIncome = $salary + $interest + $dividend + $interestOnRefund;

//         // 1. New Tax Regime Calculation (AY 2026-27 under Section 115BAC)
//         // Standard Deduction: ₹75,000 (Updated in Finance Act)
//         $newRegimeDeductions = 75000;
//         $newTaxableIncome = max(0, $grossTotalIncome - $newRegimeDeductions);
//         $newTaxLiability = $this->calculateNewRegimeTax($newTaxableIncome);

//         // 2. Old Tax Regime Calculation
//         // Standard Deduction (₹50k) + 80C (₹1.5L) + 80D (₹25k) + 80TTA (₹10k) + HRA (₹1.2L) + PT (₹2500)
//         $sec80TTA = min($interest, 10000);
//         $oldRegimeDeductions = 50000 
//             + ($form16['deduction_80c'] ?? 150000) 
//             + ($form16['deduction_80d'] ?? 25000) 
//             + $sec80TTA
//             + ($form16['hra_exemption'] ?? 120000) 
//             + ($form16['professional_tax'] ?? 2500);

//         $oldTaxableIncome = max(0, $grossTotalIncome - $oldRegimeDeductions);
//         $oldTaxLiability = $this->calculateOldRegimeTax($oldTaxableIncome);

//         // Recommended regime comparison
//         $recommendedRegime = $newTaxLiability <= $oldTaxLiability ? 'New Tax Regime' : 'Old Tax Regime';
//         $selectedTax = min($newTaxLiability, $oldTaxLiability);

//         $totalTdsPaid = ($form16['total_tds'] ?? 115000) + 4270 + 540 + 300;
//         $refundOrPayable = $totalTdsPaid - $selectedTax; // positive = refund, negative = payable

//         // 3. ITR Form Eligibility Analyzer (ITR-1 vs ITR-2 vs ITR-3)
//         $isEligibleItr1 = true;
//         $itrFormChecks = [
//             [
//                 'criterion' => 'Resident & Ordinarily Resident Individual',
//                 'status' => true,
//                 'note' => 'Taxpayer is an Indian Resident Individual (NRIs must file ITR-2)',
//             ],
//             [
//                 'criterion' => 'Total Gross Income does not exceed ₹50,00,000',
//                 'status' => $grossTotalIncome <= 5000000,
//                 'note' => 'Total income is ₹' . number_format($grossTotalIncome) . ' (Within ₹50 Lakh limit for ITR-1)',
//             ],
//             [
//                 'criterion' => 'Income only from Salary, One House Property & Other Sources',
//                 'status' => true,
//                 'note' => 'Income heads: Salary + Savings/FD Interest + Dividends',
//             ],
//             [
//                 'criterion' => 'No Business or Professional Income (PGBP)',
//                 'status' => true,
//                 'note' => 'No business/freelance income reported (If yes, requires ITR-3 or ITR-4)',
//             ],
//             [
//                 'criterion' => 'No Capital Gains exceeding exempt threshold',
//                 'status' => true,
//                 'note' => 'No short-term or unlisted capital gains (If trading stocks/property, requires ITR-2)',
//             ],
//             [
//                 'criterion' => 'No Foreign Assets or Directorship in Unlisted Companies',
//                 'status' => true,
//                 'note' => 'No foreign bank accounts, overseas shares, or unlisted directorships held',
//             ],
//         ];

//         // 4. Tax Regime Switching Rules (Official Section 115BAC provisions)
//         $regimeSwitchRules = [
//             'default_regime' => 'New Tax Regime (Section 115BAC)',
//             'taxpayer_category' => 'Salaried Individual (No Business/Professional Income)',
//             'switching_allowed' => 'Yes, can switch every financial year between New and Old regime.',
//             'form_10iea_required' => false,
//             'form_10iea_note' => 'Salaried taxpayers DO NOT need Form 10-IEA! You can switch simply by choosing your preferred regime in the ITR before the due date.',
//             'due_date_condition' => 'To opt for the Old Tax Regime, return MUST be filed on or before July 31 (Sec 139(1)). In belated returns (filed after July 31), the Old Regime option is lost and New Regime applies automatically.',
//             'business_rule_note' => 'For Business / Professional taxpayers: Form 10-IEA is mandatory, and they get only 1 lifetime switch option.',
//         ];

//         return [
//             'gross_total_income' => $grossTotalIncome,
//             'salary_income' => $salary,
//             'interest_income' => $interest,
//             'dividend_income' => $dividend,
//             'other_income' => $interest + $dividend + $interestOnRefund,
//             'total_tds_credit' => $totalTdsPaid,
//             'new_regime' => [
//                 'regime_name' => 'New Tax Regime (Sec 115BAC)',
//                 'is_default' => true,
//                 'standard_deduction' => 75000,
//                 'chapter_via_deductions' => 0,
//                 'taxable_income' => $newTaxableIncome,
//                 'deductions' => $newRegimeDeductions,
//                 'tax_liability' => $newTaxLiability,
//                 'refund_due' => max(0, $totalTdsPaid - $newTaxLiability),
//                 'tax_payable' => max(0, $newTaxLiability - $totalTdsPaid),
//             ],
//             'old_regime' => [
//                 'regime_name' => 'Old Tax Regime (With Deductions)',
//                 'is_default' => false,
//                 'standard_deduction' => 50000,
//                 'chapter_via_deductions' => ($form16['deduction_80c'] ?? 150000) + ($form16['deduction_80d'] ?? 25000) + $sec80TTA,
//                 'hra_exemption' => $form16['hra_exemption'] ?? 120000,
//                 'taxable_income' => $oldTaxableIncome,
//                 'deductions' => $oldRegimeDeductions,
//                 'tax_liability' => $oldTaxLiability,
//                 'refund_due' => max(0, $totalTdsPaid - $oldTaxLiability),
//                 'tax_payable' => max(0, $oldTaxLiability - $totalTdsPaid),
//             ],
//             'recommended_regime' => $recommendedRegime,
//             'tax_savings' => abs($oldTaxLiability - $newTaxLiability),
//             'final_tax' => $selectedTax,
//             'refund_amount' => max(0, $refundOrPayable),
//             'payable_amount' => max(0, -$refundOrPayable),
//             'itr_form_recommendation' => [
//                 'form_type' => 'ITR-1',
//                 'form_name' => 'ITR-1 (Sahaj)',
//                 'is_eligible' => $isEligibleItr1,
//                 'description' => 'For Resident Individuals having income from Salaries, one house property, and other sources (interest, etc.) up to ₹50 Lakhs.',
//                 'checklist' => $itrFormChecks,
//                 'itr2_triggers' => [
//                     'Income exceeds ₹50 Lakhs',
//                     'Capital gains from stocks, mutual funds, or real estate',
//                     'More than one house property owned',
//                     'Directorship in any company or holding unlisted equity shares',
//                     'Agricultural income exceeding ₹5,000',
//                     'Any foreign asset, foreign income, or signing authority overseas',
//                 ],
//             ],
//             'regime_switch_rules' => $regimeSwitchRules,
//         ];
//     }

//     private function calculateNewRegimeTax(float $taxableIncome): float
//     {
//         // Under Budget 2024 / 2025: Section 87A rebate for taxable income up to ₹7,00,000 (effectively ₹7,75,000 with std deduction)
//         if ($taxableIncome <= 700000) {
//             return 0;
//         }

//         $tax = 0;
//         if ($taxableIncome > 1500000) {
//             $tax += ($taxableIncome - 1500000) * 0.30;
//             $taxableIncome = 1500000;
//         }
//         if ($taxableIncome > 1200000) {
//             $tax += ($taxableIncome - 1200000) * 0.20;
//             $taxableIncome = 1200000;
//         }
//         if ($taxableIncome > 1000000) {
//             $tax += ($taxableIncome - 1000000) * 0.15;
//             $taxableIncome = 1000000;
//         }
//         if ($taxableIncome > 700000) {
//             $tax += ($taxableIncome - 700000) * 0.10;
//             $taxableIncome = 700000;
//         }
//         if ($taxableIncome > 300000) {
//             $tax += ($taxableIncome - 300000) * 0.05;
//         }

//         // Add 4% Health & Education Cess
//         return round($tax * 1.04);
//     }

//     private function calculateOldRegimeTax(float $taxableIncome): float
//     {
//         if ($taxableIncome <= 500000) {
//             return 0; // Section 87A rebate
//         }

//         $tax = 0;
//         if ($taxableIncome > 1000000) {
//             $tax += ($taxableIncome - 1000000) * 0.30;
//             $taxableIncome = 1000000;
//         }
//         if ($taxableIncome > 500000) {
//             $tax += ($taxableIncome - 500000) * 0.20;
//             $taxableIncome = 500000;
//         }
//         if ($taxableIncome > 250000) {
//             $tax += ($taxableIncome - 250000) * 0.05;
//         }

//         return round($tax * 1.04);
//     }
// }








namespace App\Services\ITR;

use App\Models\User;
use App\Models\TaxProfile;
use App\Models\AisDataSnapshot;
use App\Models\Form16Entry;
use App\Models\ItrFiling;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Pluggable ITR Integration Service
 * 
 * Currently provides local/mock implementation for:
 * 1. Income Tax portal login & automatic sync (AIS, TDS, 26AS, Form 16)
 * 2. In-portal Income Tax registration
 * 3. ITR Return filing & acknowledgement generation
 * 
 * TO PLUG IN REAL THIRD-PARTY / ERI APIs:
 * Simply replace the internal mock calls with your real HTTP calls (e.g. via Http::withHeaders(...)->post(...)).
 */
class ITRService
{
    /**
     * Verify PAN validity and return taxpayer name (Mock / FastKYC).
     */
    public function verifyPan(string $pan): array
    {
        $pan = strtoupper(trim($pan));
        if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
            return [
                'valid' => false,
                'pan' => $pan,
                'name' => '',
                'status' => 'INVALID',
            ];
        }

        $names = [
            'S' => 'RAJESH SHARMA',
            'K' => 'ANITA KUMAR',
            'G' => 'VIKRAM GUPTA',
            'P' => 'SNEHA PATEL',
            'M' => 'AMIT MEHTA',
            'V' => 'PRIYA VERMA',
        ];
        $initial = substr($pan, 4, 1);
        $name = $names[$initial] ?? 'ROHIT VERMA';

        return [
            'valid' => true,
            'pan' => $pan,
            'name' => $name,
            'dobMasked' => '15/08/1988',
            'aadhaarLinked' => true,
            'status' => 'VALID',
            'category' => substr($pan, 3, 1) === 'H' ? 'HUF' : 'Individual',
        ];
    }

    /**
     * Check if PAN is registered on Income Tax Portal.
     * Mock Rule: PANs ending with an even digit = registered, odd = not registered.
     */
    // public function checkRegistration(string $pan): array
    // {
    //     $pan = strtoupper(trim($pan));
    //     if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
    //         return [
    //             'valid' => false,
    //             'pan' => $pan,
    //             'registeredOnPortal' => false,
    //             'message' => 'Invalid PAN format',
    //         ];
    //     }

    //     // 4 numeric digits in PAN: positions 5, 6, 7, 8
    //     $digits = substr($pan, 5, 4);
    //     $lastDigit = (int) substr($digits, -1);
    //     $registered = ($lastDigit % 2 === 0);

    //     return [
    //         'valid' => true,
    //         'pan' => $pan,
    //         'registeredOnPortal' => $registered,
    //         'message' => $registered
    //             ? 'Taxpayer profile found on Income Tax E-filing portal.'
    //             : 'PAN is not yet registered on the Income Tax E-filing portal. Registration required.',
    //     ];
    // }

    public function checkRegistration(string $pan): array
{
    $pan = strtoupper(trim($pan));

    if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $pan)) {
        return [
            'valid' => false,
            'pan' => $pan,
            'registeredOnPortal' => false,
            'message' => 'Invalid PAN format',
        ];
    }

    // Single source of truth: a PAN is "registered" only if a TaxProfile row exists for it.
    // This is the exact same table registerOnITPortal() writes to, so register and
    // login-fetch can never disagree again. The old Cache-flag + even/odd-digit
    // fallback is removed: it never matched what register() actually saved.
    $isRegistered = TaxProfile::where('pan', $pan)->exists();

    return [
        'valid' => true,
        'pan' => $pan,
        'registeredOnPortal' => $isRegistered,
        'message' => $isRegistered
            ? 'Taxpayer profile found on Income Tax E-filing portal.'
            : 'PAN is not yet registered on the Income Tax E-filing portal. Registration required.',
    ];
}

    /**
     * Authenticate customer with PAN + Password and fetch AIS, TDS, 26AS & Form 16 data.
     * ZERO PASSWORD STORAGE: The government portal password is never written to DB or logs.
     */
    public function loginAndFetchData(string $pan, string $password, string $assessmentYear = '2026-27'): array
    {
        $pan = strtoupper(trim($pan));

        // 1. Check registration via odd/even digit rule
        $regCheck = $this->checkRegistration($pan);
        if (!$regCheck['registeredOnPortal']) {
            return [
                'status' => 'not_registered',
                'message' => "PAN {$pan} is not registered on the Income Tax e-Filing portal. Please register your account first.",
                'pan' => $pan,
            ];
        }

        // 2. Validate password (Mock Rule: Test@1234 or any 4+ char password succeeds for mock testing)
        if (empty($password) || strlen($password) < 4) {
            return [
                'status' => 'invalid_credentials',
                'message' => 'Please enter a valid portal password (minimum 4 characters).',
            ];
        }

        // 3. Find or create local User & TaxProfile with secure local random key (NEVER saving portal password)
        $taxProfile = TaxProfile::where('pan', $pan)->first();
        $user = $taxProfile ? $taxProfile->user : null;

        if (!$user) {
            $mockEmail = strtolower($pan) . '@taxpayer.local';
            $user = User::firstOrCreate(
                ['email' => $mockEmail],
                [
                    'name' => 'Taxpayer (' . $pan . ')',
                    'phone' => '9876543210',
                    'password' => Hash::make(Str::random(32)), // Random hash, zero password storage!
                    'role' => 'customer',
                ]
            );

            if (!$taxProfile) {
                $taxProfile = TaxProfile::create([
                    'user_id' => $user->id,
                    'pan' => $pan,
                    'date_of_birth' => '1988-06-15',
                    'assessee_type' => 'individual',
                    'city' => 'Mumbai',
                    'state' => 'Maharashtra',
                    'pincode' => '400001',
                    'aadhaar_last4' => '8921',
                ]);
            }
        }

        // Generate Sanctum auth token for frontend session
        $token = $user->createToken('itr-portal-token')->plainTextToken;

        // 4. Generate & Store Comprehensive AIS Data
        $connection = \App\Models\AisConnection::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $assessmentYear],
            [
                'provider' => 'it_portal_direct',
                'status' => 'connected',
                'connection_reference' => 'ITP-' . Str::upper(Str::random(12)),
                'connected_at' => now(),
                'expires_at' => now()->addDays(30),
            ]
        );

        $aisData = $this->generateMockAisData($pan, $assessmentYear);
        $form26asData = $this->generateMock26ASData($pan, $assessmentYear);
        $form16Data = $this->generateMockForm16Data($user, $pan, $assessmentYear);

        $snapshot = AisDataSnapshot::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $assessmentYear],
            [
                'ais_connection_id' => $connection->id,
                'salary_data' => $aisData['salary_data'],
                'tds_data' => $aisData['tds_data'],
                'interest_income_data' => $aisData['interest_income_data'],
                'other_income_data' => $aisData['other_income_data'],
                'sft_data' => $aisData['sft_data'],
                'raw_response' => [
                    'ais' => $aisData,
                    'form26as' => $form26asData,
                    'form16' => $form16Data,
                ],
                'fetched_at' => now(),
            ]
        );

        return [
            'status' => 'success',
            'message' => 'Successfully connected to Income Tax portal! AIS, TDS, 26AS, and Form 16 data synchronized.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'pan' => $pan,
                'dob' => $taxProfile->date_of_birth ? $taxProfile->date_of_birth->format('Y-m-d') : '1988-06-15',
            ],
            'assessment_year' => $assessmentYear,
            'tax_data' => [
                'ais' => $aisData,
                'form26as' => $form26asData,
                'form16' => $form16Data,
                'summary' => $this->computeTaxSummary($aisData, $form16Data),
            ],
        ];
    }

    /**
     * Register a new taxpayer on the Income Tax Portal directly from our application.
     */
    public function registerOnITPortal(array $details): array
    {
        $pan = strtoupper(trim($details['pan']));
        $name = trim($details['name']);
        $email = strtolower(trim($details['email']));
        $phone = trim($details['phone'] ?? '9876543210');
        $password = $details['password'];
        $dob = $details['dob'] ?? '1990-01-01';

        // Check if already registered
        $existingProfile = TaxProfile::where('pan', $pan)->first();
        if ($existingProfile) {
            return [
                'status' => 'already_registered',
                'message' => "PAN {$pan} is already registered on the Income Tax portal. Please log in using your password.",
            ];
        }

        // Create or update user account
        $user = User::where('email', $email)->first();
        if ($user) {
            // If this user already has a TaxProfile with a DIFFERENT PAN,
            // create a dedicated taxpayer account for this PAN so each PAN has its own TaxProfile
            if ($user->taxProfile && $user->taxProfile->pan !== $pan) {
                $panEmail = strtolower($pan) . '@taxpayer.local';
                $user = User::firstOrCreate(
                    ['email' => $panEmail],
                    [
                        'name' => $name,
                        'phone' => $phone,
                        'password' => Hash::make($password),
                    ]
                );
            } else {
                $user->update([
                    'name' => $name,
                    'phone' => $phone,
                    'password' => Hash::make($password),
                ]);
            }
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => Hash::make($password),
            ]);
        }

        // Create or update TaxProfile linked to user
        $taxProfile = TaxProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'pan' => $pan,
                'date_of_birth' => $dob,
                'assessee_type' => $details['assessee_type'] ?? 'individual',
                'address_line1' => $details['address'] ?? 'Main Road',
                'city' => $details['city'] ?? 'Mumbai',
                'state' => $details['state'] ?? 'Maharashtra',
                'pincode' => $details['pincode'] ?? '400001',
                'aadhaar_last4' => substr($details['aadhaar'] ?? '1234', -4),
            ]
        );

        $token = $user->createToken('itr-portal-token')->plainTextToken;

        // Auto-seed initial return data for this new taxpayer
        $ay = $details['assessment_year'] ?? '2026-27';
        $aisData = $this->generateMockAisData($pan, $ay, true);
        $form26asData = $this->generateMock26ASData($pan, $ay, true);
        $form16Data = $this->generateMockForm16Data($user, $pan, $ay, true);

        $connection = \App\Models\AisConnection::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $ay],
            [
                'provider' => 'it_portal_direct',
                'status' => 'connected',
                'connection_reference' => 'ITP-' . Str::upper(Str::random(12)),
                'connected_at' => now(),
                'expires_at' => now()->addDays(30),
            ]
        );

        AisDataSnapshot::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $ay],
            [
                'ais_connection_id' => $connection->id,
                'salary_data' => $aisData['salary_data'],
                'tds_data' => $aisData['tds_data'],
                'interest_income_data' => $aisData['interest_income_data'],
                'other_income_data' => $aisData['other_income_data'],
                'sft_data' => $aisData['sft_data'],
                'raw_response' => [
                    'ais' => $aisData,
                    'form26as' => $form26asData,
                    'form16' => $form16Data,
                ],
                'fetched_at' => now(),
            ]
        );

        return [
            'status' => 'success',
            'message' => "Congratulations! PAN {$pan} is successfully registered on the Income Tax portal.",
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'pan' => $pan,
                'dob' => $dob,
            ],
            'assessment_year' => $ay,
            'tax_data' => [
                'ais' => $aisData,
                'form26as' => $form26asData,
                'form16' => $form16Data,
                'summary' => $this->computeTaxSummary($aisData, $form16Data),
            ],
        ];
    }

    /**
     * Submit customer's prepared ITR file to Income Tax Portal and generate Acknowledgement.
     */
    public function submitReturn(User $user, array $payload): array
    {
        $ay = $payload['assessment_year'] ?? '2026-27';
        $taxProfile = $user->taxProfile;
        $pan = $taxProfile ? $taxProfile->pan : 'ABCDE1234F';

        // Generate official-looking ITR acknowledgement number
        // Standard format: ACK/AY/15-digit number
        $randomNumeric = mt_rand(100000000000, 999999999999);
        $ackNumber = "ACK/{$ay}/{$randomNumeric}";

        $filingType = $payload['filing_type'] ?? 'original';
        $filingSection = $payload['filing_section'] ?? ($filingType === 'belated' ? '139(4)' : ($filingType === 'updated' ? '139(8A)' : ($filingType === 'revised' ? '139(5)' : '139(1)')));
        $lateFee234f = floatval($payload['late_fee_234f'] ?? 0);
        $itruAdditionalTax = floatval($payload['itru_additional_tax'] ?? 0);
        $itruReason = $payload['itru_reason'] ?? null;

        $filing = ItrFiling::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $ay],
            [
                'itr_form_type' => substr($payload['itr_form_type'] ?? 'ITR-1', 0, 10),
                'filing_type' => $filingType,
                'filing_section' => $filingSection,
                'total_income' => $payload['total_income'] ?? 1250000,
                'total_tax_liability' => $payload['total_tax_liability'] ?? 85000,
                'total_tds_claimed' => $payload['total_tds_claimed'] ?? 115000,
                'refund_or_payable' => $payload['refund_or_payable'] ?? 30000, // positive = refund, negative = payable
                'late_fee_234f' => $lateFee234f,
                'itru_additional_tax' => $itruAdditionalTax,
                'itru_reason' => $itruReason,
                'status' => 'filed',
                'acknowledgement_number' => $ackNumber,
                'computation_summary' => $payload['computation_summary'] ?? [],
                'filed_at' => now(),
            ]
        );

        return [
            'status' => 'success',
            'message' => 'ITR successfully submitted to Income Tax Department e-Filing Portal!',
            'acknowledgement_number' => $ackNumber,
            'filing_id' => $filing->id,
            'pan' => $pan,
            'taxpayer_name' => $user->name,
            'assessment_year' => $ay,
            'form_type' => $filing->itr_form_type,
            'filing_type' => $filingType,
            'filing_section' => $filingSection,
            'submitted_at' => now()->format('d M Y, h:i A'),
            'verification_status' => 'Pending e-Verification (Valid for 30 Days)',
            'verification_options' => [
                'Aadhaar OTP (Instant verification)',
                'Net Banking login',
                'Bank Account EVC',
                'Send signed ITR-V to CPC Bengaluru',
            ],
            'receipt' => [
                'gross_total_income' => $filing->total_income,
                'tax_liability' => $filing->total_tax_liability,
                'tds_paid' => $filing->total_tds_claimed,
                'refund_due' => max(0, $filing->refund_or_payable),
                'tax_payable' => abs(min(0, $filing->refund_or_payable)),
            ],
        ];
    }

    /**
     * Retrieve all synchronized tax data for dashboard display.
     */
    public function getTaxData(User $user, string $assessmentYear = '2026-27'): array
    {
        $snapshot = AisDataSnapshot::where('user_id', $user->id)
            ->where('assessment_year', $assessmentYear)
            ->first();

        $form16 = Form16Entry::where('user_id', $user->id)
            ->where('assessment_year', $assessmentYear)
            ->first();

        $latestFiling = ItrFiling::where('user_id', $user->id)
            ->where('assessment_year', $assessmentYear)
            ->latest()
            ->first();

        $taxProfile = $user->taxProfile;
        $isTestBlankUser = ($user->email === 'test@tiqtax.in') || ($user->name === 'Test Customer');

        if ($isTestBlankUser) {
            $ais = [
                'salary_data' => [],
                'tds_data' => [],
                'interest_income_data' => [],
                'other_income_data' => [],
                'sft_data' => [],
            ];
            $form26as = [
                'tds_salary' => [],
                'tds_other' => [],
                'tcs' => [],
                'advance_tax' => [],
                'summary' => [
                    'total_gross' => 0,
                    'total_tds' => 0,
                    'total_tcs' => 0,
                ],
            ];
            $form16Data = null;

            return [
                'taxpayer' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'pan' => $taxProfile?->pan ?? '',
                    'dob' => $taxProfile?->date_of_birth?->format('Y-m-d') ?? null,
                ],
                'assessment_year' => $assessmentYear,
                'is_empty_user' => true,
                'ais' => $ais,
                'form26as' => $form26as,
                'form16' => null,
                'summary' => [
                    'gross_total_income' => 0,
                    'total_deductions' => 0,
                    'total_taxable_income' => 0,
                    'total_tax_payable' => 0,
                    'total_tax_paid' => 0,
                    'net_tax_payable' => 0,
                    'refund_amount' => 0,
                    'recommended_regime' => 'New Regime (Sec 115BAC)',
                ],
                'latest_filing' => null,
            ];
        }

        $ais = $snapshot ? [
            'salary_data' => $snapshot->salary_data ?? [],
            'tds_data' => $snapshot->tds_data ?? [],
            'interest_income_data' => $snapshot->interest_income_data ?? [],
            'other_income_data' => $snapshot->other_income_data ?? [],
            'sft_data' => $snapshot->sft_data ?? [],
        ] : $this->generateMockAisData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

        $form26as = $snapshot ? ($snapshot->raw_response['form26as'] ?? $this->generateMock26ASData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear)) : $this->generateMock26ASData($taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

        $form16Data = $form16 ? [
            'employer_name' => $form16->employer_name,
            'employer_tan' => $form16->employer_tan,
            'gross_salary' => $form16->gross_salary,
            'standard_deduction' => $form16->standard_deduction,
            'hra_exemption' => $form16->hra_exemption,
            'professional_tax' => $form16->professional_tax,
            'total_tds' => $form16->total_tds,
            'deduction_80c' => $form16->deduction_80c,
            'deduction_80d' => $form16->deduction_80d,
        ] : $this->generateMockForm16Data($user, $taxProfile?->pan ?? 'ABCDE1234F', $assessmentYear);

        return [
            'taxpayer' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'pan' => $taxProfile?->pan ?? 'ABCDE1234F',
                'dob' => $taxProfile?->date_of_birth?->format('Y-m-d') ?? '1988-06-15',
            ],
            'assessment_year' => $assessmentYear,
            'is_empty_user' => false,
            'ais' => $ais,
            'form26as' => $form26as,
            'form16' => $form16Data,
            'summary' => $this->computeTaxSummary($ais, $form16Data),
            'latest_filing' => $latestFiling,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mock Generators (Replace with real third-party API payloads in production)
    // ─────────────────────────────────────────────────────────────────────────

        private function generateMockAisData(string $pan, string $ay, bool $isNew = false): array
    {
        $baseSalary = $isNew ? 950000 : 1250000;
        $salaryTds = $isNew ? 65000 : 115000;

        return [
            'pan' => $pan,
            'assessment_year' => $ay,
            'financial_year' => '2025-26',
            'part_a_general_info' => [
                'pan' => $pan,
                'masked_aadhaar' => 'XXXX-XXXX-8921',
                'name' => 'Taxpayer (' . $pan . ')',
                'dob' => '1988-06-15',
                'mobile' => '+91-9876543210',
                'email' => strtolower($pan) . '@taxpayer.local',
                'address' => '402, Sunshine Heights, Main Road, Pune - 411038, Maharashtra',
                'status' => 'Individual (Resident Ordinarily Resident)',
            ],
            // Part B.1: TDS / TCS Information
            'salary_data' => [
                [
                    'info_code' => 'TDS-192',
                    'employer' => 'TechCorp Solutions Pvt Ltd',
                    'tan' => 'MUMB12345C',
                    'gross_salary' => $baseSalary,
                    'tds_deducted' => $salaryTds,
                    'section' => '192',
                    'feedback_status' => 'Information is correct (Accepted)',
                ],
            ],
            'tds_data' => [
                [
                    'info_code' => 'TDS-192',
                    'deductor' => 'TechCorp Solutions Pvt Ltd',
                    'tan' => 'MUMB12345C',
                    'section' => '192 (Salary)',
                    'amount_paid' => $baseSalary,
                    'tds_deducted' => $salaryTds,
                    'status' => 'Matched 100%',
                    'feedback_status' => 'Information is correct',
                ],
                [
                    'info_code' => 'TDS-194A',
                    'deductor' => 'HDFC Bank Ltd',
                    'tan' => 'MUMH00012A',
                    'section' => '194A (Interest other than securities)',
                    'amount_paid' => 42700,
                    'tds_deducted' => 4270,
                    'status' => 'Matched 100%',
                    'feedback_status' => 'Information is correct',
                ],
            ],
            // Part B.2: SFT Information (Specified Financial Transactions)
            'interest_income_data' => [
                [
                    'info_code' => 'SFT-005',
                    'source' => 'HDFC Bank Savings Account',
                    'account_no' => 'XXXXXX6450',
                    'amount' => 14200,
                    'type' => 'Savings Bank Interest (Eligible u/s 80TTA)',
                    'feedback_status' => 'Accepted',
                ],
                [
                    'info_code' => 'SFT-005',
                    'source' => 'State Bank of India Term Deposit',
                    'account_no' => 'XXXXXX3312',
                    'amount' => 28500,
                    'type' => 'Fixed Deposit Interest (TDS deducted u/s 194A)',
                    'feedback_status' => 'Accepted',
                ],
            ],
            'other_income_data' => [
                [
                    'info_code' => 'DIV-194',
                    'description' => 'Dividend income - Reliance Industries Ltd',
                    'amount' => 5400,
                    'tds_deducted' => 540,
                    'feedback_status' => 'Accepted',
                ],
                [
                    'info_code' => 'DIV-194',
                    'description' => 'Dividend income - Tata Consultancy Services',
                    'amount' => 3000,
                    'tds_deducted' => 300,
                    'feedback_status' => 'Accepted',
                ],
            ],
            'sft_data' => [
                [
                    'info_code' => 'SFT-006',
                    'transaction' => 'Purchase of Mutual Funds Units',
                    'reporting_entity' => 'HDFC AMC Ltd & Nippon India MF',
                    'amount' => 250000,
                    'date' => '2025-11-14',
                    'feedback_status' => 'Information is correct',
                ],
            ],
            // Part B.3: Payment of Taxes (Advance / Self-Assessment Tax)
            'tax_payments_data' => [
                [
                    'info_code' => 'TAX-280',
                    'tax_type' => 'Self Assessment Tax (300)',
                    'bsr_code' => '0210045',
                    'challan_no' => '04512',
                    'date_of_deposit' => '2026-03-28',
                    'amount' => 0,
                    'status' => 'Not Applicable (Refund Due)',
                ],
            ],
            // Part B.4: Demand and Refund History
            'demand_refund_data' => [
                [
                    'assessment_year' => '2025-26',
                    'nature' => 'Income Tax Refund Paid u/s 143(1)',
                    'amount' => 24150,
                    'interest_244a' => 720,
                    'date' => '2025-08-19',
                    'status' => 'Directly Credited to Bank Account',
                ],
            ],
            // Part B.5: Other Information
            'other_info_data' => [
                [
                    'info_code' => 'OTH-244A',
                    'description' => 'Interest on Income Tax Refund u/s 244A for AY 2025-26',
                    'amount' => 720,
                    'status' => 'Reportable under Income from Other Sources',
                ],
            ],
        ];
    }

        private function generateMock26ASData(string $pan, string $ay, bool $isNew = false): array
    {
        $salaryTds = $isNew ? 65000 : 115000;

        return [
            'pan' => $pan,
            'assessment_year' => $ay,
            'financial_year' => '2025-26',
            // Part A: TDS on Salary
            'part_a_tds_salary' => [
                [
                    'deductor_name' => 'TechCorp Solutions Pvt Ltd',
                    'deductor_tan' => 'MUMB12345C',
                    'section' => '192',
                    'total_amount' => $isNew ? 950000 : 1250000,
                    'total_tds_deducted' => $salaryTds,
                    'total_tds_deposited' => $salaryTds,
                    'challan_status' => 'Matched (Challan Q1-Q4 verified on OLTAS)',
                ],
            ],
            // Part A1: TDS Other than Salary (Sec 194A, 194, etc.)
            'part_a1_tds_other' => [
                [
                    'deductor_name' => 'HDFC Bank Ltd',
                    'deductor_tan' => 'MUMH00012A',
                    'section' => '194A',
                    'total_amount' => 42700,
                    'total_tds_deducted' => 4270,
                    'total_tds_deposited' => 4270,
                    'challan_status' => 'Matched',
                ],
                [
                    'deductor_name' => 'Reliance Industries Ltd',
                    'deductor_tan' => 'MUMR00055D',
                    'section' => '194',
                    'total_amount' => 5400,
                    'total_tds_deducted' => 540,
                    'total_tds_deposited' => 540,
                    'challan_status' => 'Matched',
                ],
                [
                    'deductor_name' => 'Tata Consultancy Services Ltd',
                    'deductor_tan' => 'MUMT00088F',
                    'section' => '194',
                    'total_amount' => 3000,
                    'total_tds_deducted' => 300,
                    'total_tds_deposited' => 300,
                    'challan_status' => 'Matched',
                ],
            ],
            // Part B: Tax Collected at Source (TCS)
            'part_b_tcs' => [],
            // Part C: Tax Paid (Advance Tax / Self Assessment Tax Challan 280)
            'part_c_advance_tax' => [],
            // Part D: Refund Details
            'part_d_refunds' => [
                [
                    'assessment_year' => '2025-26',
                    'mode' => 'NECS / RTGS',
                    'refund_amount' => 24150,
                    'interest' => 720,
                    'date_of_payment' => '2025-08-19',
                ],
            ],
            // Part E: Specified Financial Transactions (AIR/SFT)
            'part_e_sft' => [
                [
                    'reporting_entity' => 'HDFC Mutual Fund',
                    'transaction_type' => 'Purchase of Mutual Funds',
                    'aggregate_amount' => 250000,
                ],
            ],
            // Note on 80C/80D:
            'note_on_deductions' => 'Note: Chapter VI-A deductions (80C, 80D, 80G) are not part of Form 26AS. Form 26AS only tracks Tax Credits (TDS, TCS, Advance Tax). 80C/80D are documented in Form 16 Part B and claimed directly in your ITR.',
            'total_tax_credit' => $salaryTds + 4270 + 540 + 300,
        ];
    }

    private function generateMockForm16Data(User $user, string $pan, string $ay, bool $isNew = false): array
    {
        $grossSalary = $isNew ? 950000 : 1250000;
        $tds = $isNew ? 65000 : 115000;
        $standardDeduction = 75000; // FY 2025-26 / AY 2026-27 updated limit

        $entry = Form16Entry::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => $ay],
            [
                'employer_name' => 'TechCorp Solutions Pvt Ltd',
                'employer_tan' => 'MUMB12345C',
                'gross_salary' => $grossSalary,
                'standard_deduction' => $standardDeduction,
                'hra_exemption' => $isNew ? 60000 : 120000,
                'professional_tax' => 2500,
                'total_tds' => $tds,
                'deduction_80c' => 150000,
                'deduction_80d' => 25000,
                'source' => 'manual',
            ]
        );

        return [
            'employer_name' => $entry->employer_name,
            'employer_tan' => $entry->employer_tan,
            'gross_salary' => $entry->gross_salary,
            'standard_deduction' => $entry->standard_deduction,
            'hra_exemption' => $entry->hra_exemption,
            'professional_tax' => $entry->professional_tax,
            'total_tds' => $entry->total_tds,
            'deduction_80c' => $entry->deduction_80c,
            'deduction_80d' => $entry->deduction_80d,
        ];
    }

        private function computeTaxSummary(array $ais, array $form16): array
    {
        $salary = $form16['gross_salary'] ?? 1250000;
        $interest = 0;
        foreach ($ais['interest_income_data'] ?? [] as $item) {
            $interest += $item['amount'];
        }
        $dividend = 0;
        foreach ($ais['other_income_data'] ?? [] as $item) {
            $dividend += $item['amount'];
        }
        $interestOnRefund = 720;

        $grossTotalIncome = $salary + $interest + $dividend + $interestOnRefund;

        // 1. New Tax Regime Calculation (AY 2026-27 under Section 115BAC)
        // Standard Deduction: ₹75,000 (Updated in Finance Act)
        $newRegimeDeductions = 75000;
        $newTaxableIncome = max(0, $grossTotalIncome - $newRegimeDeductions);
        $newTaxLiability = $this->calculateNewRegimeTax($newTaxableIncome);

        // 2. Old Tax Regime Calculation
        // Standard Deduction (₹50k) + 80C (₹1.5L) + 80D (₹25k) + 80TTA (₹10k) + HRA (₹1.2L) + PT (₹2500)
        $sec80TTA = min($interest, 10000);
        $oldRegimeDeductions = 50000 
            + ($form16['deduction_80c'] ?? 150000) 
            + ($form16['deduction_80d'] ?? 25000) 
            + $sec80TTA
            + ($form16['hra_exemption'] ?? 120000) 
            + ($form16['professional_tax'] ?? 2500);

        $oldTaxableIncome = max(0, $grossTotalIncome - $oldRegimeDeductions);
        $oldTaxLiability = $this->calculateOldRegimeTax($oldTaxableIncome);

        // Recommended regime comparison
        $recommendedRegime = $newTaxLiability <= $oldTaxLiability ? 'New Tax Regime' : 'Old Tax Regime';
        $selectedTax = min($newTaxLiability, $oldTaxLiability);

        $totalTdsPaid = ($form16['total_tds'] ?? 115000) + 4270 + 540 + 300;
        $refundOrPayable = $totalTdsPaid - $selectedTax; // positive = refund, negative = payable

        // 3. ITR Form Eligibility Analyzer (ITR-1 vs ITR-2 vs ITR-3)
        $isEligibleItr1 = true;
        $itrFormChecks = [
            [
                'criterion' => 'Resident & Ordinarily Resident Individual',
                'status' => true,
                'note' => 'Taxpayer is an Indian Resident Individual (NRIs must file ITR-2)',
            ],
            [
                'criterion' => 'Total Gross Income does not exceed ₹50,00,000',
                'status' => $grossTotalIncome <= 5000000,
                'note' => 'Total income is ₹' . number_format($grossTotalIncome) . ' (Within ₹50 Lakh limit for ITR-1)',
            ],
            [
                'criterion' => 'Income only from Salary, One House Property & Other Sources',
                'status' => true,
                'note' => 'Income heads: Salary + Savings/FD Interest + Dividends',
            ],
            [
                'criterion' => 'No Business or Professional Income (PGBP)',
                'status' => true,
                'note' => 'No business/freelance income reported (If yes, requires ITR-3 or ITR-4)',
            ],
            [
                'criterion' => 'No Capital Gains exceeding exempt threshold',
                'status' => true,
                'note' => 'No short-term or unlisted capital gains (If trading stocks/property, requires ITR-2)',
            ],
            [
                'criterion' => 'No Foreign Assets or Directorship in Unlisted Companies',
                'status' => true,
                'note' => 'No foreign bank accounts, overseas shares, or unlisted directorships held',
            ],
        ];

        // 4. Tax Regime Switching Rules (Official Section 115BAC provisions)
        $regimeSwitchRules = [
            'default_regime' => 'New Tax Regime (Section 115BAC)',
            'taxpayer_category' => 'Salaried Individual (No Business/Professional Income)',
            'switching_allowed' => 'Yes, can switch every financial year between New and Old regime.',
            'form_10iea_required' => false,
            'form_10iea_note' => 'Salaried taxpayers DO NOT need Form 10-IEA! You can switch simply by choosing your preferred regime in the ITR before the due date.',
            'due_date_condition' => 'To opt for the Old Tax Regime, return MUST be filed on or before July 31 (Sec 139(1)). In belated returns (filed after July 31), the Old Regime option is lost and New Regime applies automatically.',
            'business_rule_note' => 'For Business / Professional taxpayers: Form 10-IEA is mandatory, and they get only 1 lifetime switch option.',
        ];

        return [
            'gross_total_income' => $grossTotalIncome,
            'salary_income' => $salary,
            'interest_income' => $interest,
            'dividend_income' => $dividend,
            'other_income' => $interest + $dividend + $interestOnRefund,
            'total_tds_credit' => $totalTdsPaid,
            'new_regime' => [
                'regime_name' => 'New Tax Regime (Sec 115BAC)',
                'is_default' => true,
                'standard_deduction' => 75000,
                'chapter_via_deductions' => 0,
                'taxable_income' => $newTaxableIncome,
                'deductions' => $newRegimeDeductions,
                'tax_liability' => $newTaxLiability,
                'refund_due' => max(0, $totalTdsPaid - $newTaxLiability),
                'tax_payable' => max(0, $newTaxLiability - $totalTdsPaid),
            ],
            'old_regime' => [
                'regime_name' => 'Old Tax Regime (With Deductions)',
                'is_default' => false,
                'standard_deduction' => 50000,
                'chapter_via_deductions' => ($form16['deduction_80c'] ?? 150000) + ($form16['deduction_80d'] ?? 25000) + $sec80TTA,
                'hra_exemption' => $form16['hra_exemption'] ?? 120000,
                'taxable_income' => $oldTaxableIncome,
                'deductions' => $oldRegimeDeductions,
                'tax_liability' => $oldTaxLiability,
                'refund_due' => max(0, $totalTdsPaid - $oldTaxLiability),
                'tax_payable' => max(0, $oldTaxLiability - $totalTdsPaid),
            ],
            'recommended_regime' => $recommendedRegime,
            'tax_savings' => abs($oldTaxLiability - $newTaxLiability),
            'final_tax' => $selectedTax,
            'refund_amount' => max(0, $refundOrPayable),
            'payable_amount' => max(0, -$refundOrPayable),
            'itr_form_recommendation' => [
                'form_type' => 'ITR-1',
                'form_name' => 'ITR-1 (Sahaj)',
                'is_eligible' => $isEligibleItr1,
                'description' => 'For Resident Individuals having income from Salaries, one house property, and other sources (interest, etc.) up to ₹50 Lakhs.',
                'checklist' => $itrFormChecks,
                'itr2_triggers' => [
                    'Income exceeds ₹50 Lakhs',
                    'Capital gains from stocks, mutual funds, or real estate',
                    'More than one house property owned',
                    'Directorship in any company or holding unlisted equity shares',
                    'Agricultural income exceeding ₹5,000',
                    'Any foreign asset, foreign income, or signing authority overseas',
                ],
            ],
            'regime_switch_rules' => $regimeSwitchRules,
        ];
    }

    private function calculateNewRegimeTax(float $taxableIncome): float
    {
        // Under Budget 2024 / 2025: Section 87A rebate for taxable income up to ₹7,00,000 (effectively ₹7,75,000 with std deduction)
        if ($taxableIncome <= 700000) {
            return 0;
        }

        $tax = 0;
        if ($taxableIncome > 1500000) {
            $tax += ($taxableIncome - 1500000) * 0.30;
            $taxableIncome = 1500000;
        }
        if ($taxableIncome > 1200000) {
            $tax += ($taxableIncome - 1200000) * 0.20;
            $taxableIncome = 1200000;
        }
        if ($taxableIncome > 1000000) {
            $tax += ($taxableIncome - 1000000) * 0.15;
            $taxableIncome = 1000000;
        }
        if ($taxableIncome > 700000) {
            $tax += ($taxableIncome - 700000) * 0.10;
            $taxableIncome = 700000;
        }
        if ($taxableIncome > 300000) {
            $tax += ($taxableIncome - 300000) * 0.05;
        }

        // Add 4% Health & Education Cess
        return round($tax * 1.04);
    }

    private function calculateOldRegimeTax(float $taxableIncome): float
    {
        if ($taxableIncome <= 500000) {
            return 0; // Section 87A rebate
        }

        $tax = 0;
        if ($taxableIncome > 1000000) {
            $tax += ($taxableIncome - 1000000) * 0.30;
            $taxableIncome = 1000000;
        }
        if ($taxableIncome > 500000) {
            $tax += ($taxableIncome - 500000) * 0.20;
            $taxableIncome = 500000;
        }
        if ($taxableIncome > 250000) {
            $tax += ($taxableIncome - 250000) * 0.05;
        }

        return round($tax * 1.04);
    }
}