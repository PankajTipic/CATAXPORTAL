<?php

namespace App\Services\TaxData;

class MockTaxDataProvider implements TaxDataProviderInterface
{
    public function fetchAis(string $pan, string $assessmentYear): array
    {
        return [
            'pan' => strtoupper($pan),
            'assessment_year' => $assessmentYear,
            'status' => 'success',
            'fetched_at' => now()->toIso8601String(),
            'provider' => 'mock_adapter',
            'salary_information' => [
                [
                    'employer_name' => 'Infosys Technologies Limited',
                    'tan' => 'BLRI00123E',
                    'gross_salary' => 1250000,
                    'tds_deducted' => 103010,
                ],
            ],
            'interest_income' => [
                [
                    'bank_name' => 'State Bank of India',
                    'account_type' => 'Savings',
                    'amount' => 18450,
                    'tds_deducted' => 0,
                ],
                [
                    'bank_name' => 'HDFC Bank Ltd',
                    'account_type' => 'Fixed Deposit',
                    'amount' => 32400,
                    'tds_deducted' => 3240,
                ],
            ],
            'dividend_income' => [
                [
                    'company_name' => 'Tata Consultancy Services Ltd',
                    'amount' => 12000,
                    'tds_deducted' => 1200,
                ],
            ],
            'capital_gains_summary' => [
                'equity_stcg' => 15000,
                'equity_ltcg' => 45000,
            ],
            'total_income_reported' => 1372850,
            'total_tds_reported' => 107450,
        ];
    }

    public function fetch26as(string $pan, string $assessmentYear): array
    {
        return [
            'pan' => strtoupper($pan),
            'assessment_year' => $assessmentYear,
            'status' => 'success',
            'fetched_at' => now()->toIso8601String(),
            'provider' => 'mock_adapter',
            'part_a_tds_salary' => [
                [
                    'deductor_name' => 'Infosys Technologies Limited',
                    'tan' => 'BLRI00123E',
                    'total_amount_credited' => 1250000,
                    'total_tax_deducted' => 103010,
                    'total_tds_deposited' => 103010,
                ],
            ],
            'part_a1_tds_other' => [
                [
                    'deductor_name' => 'HDFC Bank Ltd',
                    'tan' => 'MUMB01234D',
                    'section' => '194A',
                    'total_amount_credited' => 32400,
                    'total_tax_deducted' => 3240,
                ],
                [
                    'deductor_name' => 'Tata Consultancy Services Ltd',
                    'tan' => 'MUMT99887C',
                    'section' => '194',
                    'total_amount_credited' => 12000,
                    'total_tax_deducted' => 1200,
                ],
            ],
            'part_b_tcs' => [],
            'part_c_advance_tax' => [],
            'total_tax_credit' => 107450,
        ];
    }
}
