<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\TaxProfile;
use App\Models\AisConnection;
use App\Models\AisDataSnapshot;
use App\Models\Form16Entry;
use Carbon\Carbon;

class MatchedCustomerSeeder extends Seeder
{
    /**
     * Create a customer whose income data across AIS, Form 26AS, and Form 16
     * is 100% matched and fully reconciled (0 mismatches).
     *
     * Login: matched@tiqtax.in / Test@1234
     * PAN  : MATCH1234F
     */
    public function run(): void
    {
        $email = 'matched@tiqtax.in';
        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name'     => 'Matched Taxpayer',
                'email'    => $email,
                'phone'    => '9000000002',
                'password' => Hash::make('Test@1234'),
            ]);
            $this->command->info("Created User: {$user->id} ({$email})");
        } else {
            $this->command->info("User already exists: {$user->id} ({$email})");
        }

        // 1. Tax Profile
        TaxProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'pan' => 'MATCH1234F',
                'date_of_birth' => '1990-05-15',
                'assessee_type' => 'INDIVIDUAL',
                'address_line1' => 'Flat 501, Crystal Residency',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400050',
                'aadhaar_last4' => '8921',
            ]
        );

        // 2. AIS Connection
        $connection = AisConnection::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => '2026-27'],
            [
                'provider' => 'mock',
                'status' => 'connected',
                'connection_reference' => 'AIS_REF_MATCHED_' . $user->id,
                'connected_at' => Carbon::now(),
                'expires_at' => Carbon::now()->addDays(90),
            ]
        );

        // 3. Form 16 Entry (Salary & Deductions)
        Form16Entry::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => '2026-27'],
            [
                'employer_name' => 'TechCorp Solutions Pvt Ltd',
                'employer_tan' => 'MUMB12345C',
                'gross_salary' => 1250000,
                'standard_deduction' => 75000,
                'hra_exemption' => 120000,
                'professional_tax' => 2500,
                'total_tds' => 115000,
                'deduction_80c' => 150000,
                'deduction_80d' => 25000,
                'source' => 'uploaded_parsed',
            ]
        );

        // 4. AIS Data Snapshot (100% matching with Form 16 & Form 26AS)
        $salaryData = [
            [
                'info_code' => 'TDS-192',
                'employer' => 'TechCorp Solutions Pvt Ltd',
                'tan' => 'MUMB12345C',
                'gross_salary' => 1250000,
                'tds_deducted' => 115000,
                'section' => '192',
                'feedback_status' => 'Information is correct (Accepted)',
            ],
        ];

        $interestData = [
            [
                'info_code' => 'SFT-005',
                'source' => 'HDFC Bank Savings Account',
                'account_no' => 'XXXXXX6450',
                'amount' => 14200,
                'tds' => 0,
                'type' => 'Savings Bank Interest (Eligible u/s 80TTA)',
                'feedback_status' => 'Accepted',
            ],
            [
                'info_code' => 'SFT-005',
                'source' => 'State Bank of India',
                'account_no' => 'XXXXXX3312',
                'amount' => 28500,
                'tds' => 2850,
                'type' => 'Term / Fixed Deposit',
                'feedback_status' => 'Accepted',
            ],
            [
                'info_code' => 'SFT-005',
                'source' => 'ICICI Bank Ltd',
                'account_no' => 'XXXXXX9018',
                'amount' => 12000,
                'tds' => 1200,
                'type' => 'Recurring Deposit',
                'feedback_status' => 'Accepted',
            ],
        ];

        $dividendData = [
            [
                'info_code' => 'DIV-194',
                'source' => 'Reliance Industries Ltd',
                'amount' => 5400,
                'tds' => 540,
                'feedback_status' => 'Accepted',
            ],
            [
                'info_code' => 'DIV-194',
                'source' => 'Tata Consultancy Services Ltd',
                'amount' => 3000,
                'tds' => 300,
                'feedback_status' => 'Accepted',
            ],
            [
                'info_code' => 'DIV-194',
                'source' => 'Infosys Ltd',
                'amount' => 2500,
                'tds' => 250,
                'feedback_status' => 'Accepted',
            ],
        ];

        $form26asData = [
            'pan' => 'MATCH1234F',
            'assessment_year' => '2026-27',
            'financial_year' => '2025-26',
            'part_a_tds_salary' => [
                [
                    'deductor_name' => 'TechCorp Solutions Pvt Ltd',
                    'deductor_tan' => 'MUMB12345C',
                    'section' => '192',
                    'total_amount' => 1250000,
                    'total_tds_deducted' => 115000,
                    'total_tds_deposited' => 115000,
                    'challan_status' => 'Matched (Challan Q1-Q4 verified on OLTAS)',
                ],
            ],
            'part_a1_tds_other' => [
                [
                    'deductor_name' => 'HDFC Bank Ltd',
                    'deductor_tan' => 'MUMH00012A',
                    'section' => '194A',
                    'total_amount' => 14200,
                    'total_tds_deducted' => 0,
                    'total_tds_deposited' => 0,
                    'challan_status' => 'Matched',
                ],
                [
                    'deductor_name' => 'State Bank of India',
                    'deductor_tan' => 'SBIN00012A',
                    'section' => '194A',
                    'total_amount' => 28500,
                    'total_tds_deducted' => 2850,
                    'total_tds_deposited' => 2850,
                    'challan_status' => 'Matched',
                ],
                [
                    'deductor_name' => 'ICICI Bank Ltd',
                    'deductor_tan' => 'ICIC00012A',
                    'section' => '194A',
                    'total_amount' => 12000,
                    'total_tds_deducted' => 1200,
                    'total_tds_deposited' => 1200,
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
                [
                    'deductor_name' => 'Infosys Ltd',
                    'deductor_tan' => 'INFY00088F',
                    'section' => '194',
                    'total_amount' => 2500,
                    'total_tds_deducted' => 250,
                    'total_tds_deposited' => 250,
                    'challan_status' => 'Matched',
                ],
            ],
            'part_b_tcs' => [],
            'part_c_advance_tax' => [],
            'part_d_refunds' => [],
            'summary' => [
                'total_gross' => 1314600,
                'total_tds' => 122140,
                'total_tcs' => 0,
            ],
        ];

        AisDataSnapshot::updateOrCreate(
            ['user_id' => $user->id, 'assessment_year' => '2026-27'],
            [
                'ais_connection_id' => $connection->id,
                'salary_data' => $salaryData,
                'tds_data' => array_merge($salaryData, $interestData, $dividendData),
                'interest_income_data' => $interestData,
                'other_income_data' => $dividendData,
                'sft_data' => [],
                'raw_response' => [
                    'ais' => [
                        'salary' => $salaryData,
                        'interest' => $interestData,
                        'dividend' => $dividendData,
                    ],
                    'form26as' => $form26asData,
                ],
                'fetched_at' => Carbon::now(),
            ]
        );

        $this->command->info("========================================");
        $this->command->info("✅ Fully Matched Customer Created in DB!");
        $this->command->info("User ID  : {$user->id}");
        $this->command->info("Name     : Matched Taxpayer");
        $this->command->info("Email    : {$email}");
        $this->command->info("Password : Test@1234");
        $this->command->info("PAN      : MATCH1234F");
        $this->command->info("Status   : 100% Reconciled across AIS, 26AS, Form 16");
        $this->command->info("========================================");
    }
}
