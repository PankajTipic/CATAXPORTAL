<?php

namespace App\Services\AIS;

use Illuminate\Support\Str;

/**
 * Returns realistic, deterministic fake data shaped like a real ERI
 * partner's AIS/26AS/prefill response, so the rest of the app can be
 * built and demoed without a live government/ERI integration.
 */
class MockAISProvider implements AISProviderInterface
{
    public function initiateConnection(string $pan, string $assessmentYear): array
    {
        $reference = 'MOCKCONN-'.Str::upper(Str::random(10));

        return [
            'redirect_url' => url("/mock-consent/{$reference}"), // in real provider: govt/ERI hosted consent page
            'reference' => $reference,
        ];
    }

    public function checkConnectionStatus(string $reference): array
    {
        // In this mock, any reference is instantly "connected"
        return [
            'status' => 'connected',
            'connection_token' => 'MOCKTOKEN-'.Str::upper(Str::random(16)),
        ];
    }

    public function fetchAIS(string $connectionToken, string $assessmentYear): array
    {
        return [
            'salary_data' => [
                ['employer' => 'Acme Technologies Pvt Ltd', 'tan' => 'MUMA12345B', 'gross_salary' => 1250000, 'tds_deducted' => 118000],
            ],
            'tds_data' => [
                ['deductor' => 'Acme Technologies Pvt Ltd', 'section' => '192', 'amount' => 118000],
                ['deductor' => 'HDFC Bank', 'section' => '194A', 'amount' => 2400],
            ],
            'interest_income_data' => [
                ['source' => 'HDFC Bank Savings A/c', 'amount' => 18500],
                ['source' => 'SBI Fixed Deposit', 'amount' => 24000],
            ],
            'other_income_data' => [
                ['description' => 'Dividend income - Reliance Industries', 'amount' => 5200],
            ],
            'sft_data' => [
                ['transaction' => 'Mutual fund purchase', 'amount' => 300000, 'reporting_entity' => 'ICICI Prudential AMC'],
            ],
        ];
    }

    public function fetch26AS(string $connectionToken, string $assessmentYear): array
    {
        return [
            'tds_summary' => [
                ['deductor_tan' => 'MUMA12345B', 'section' => '192', 'amount_paid' => 1250000, 'tax_deducted' => 118000],
            ],
            'tcs_summary' => [],
            'advance_tax_paid' => [],
            'self_assessment_tax_paid' => [],
        ];
    }

    public function fetchPrefill(string $connectionToken, string $assessmentYear): array
    {
        return [
            'personal_info' => ['name' => 'Demo Taxpayer', 'pan' => 'ABCDE1234F'],
            'gross_total_income' => 1297700,
            'total_tds' => 120400,
        ];
    }
}
