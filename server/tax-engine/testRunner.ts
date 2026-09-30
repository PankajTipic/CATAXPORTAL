import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read rule set
const ruleSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules', 'AY2026-27.json'), 'utf8'));

// Import computeTax
import { computeTax } from './computeTax.ts';

console.log('====================================================');
console.log('RUNNING TAX ENGINE AY 2026-27 SUITE (16 SCENARIOS)');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, name, details) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} - Details:`, details);
    failed++;
  }
}

// ──────────────── 1. Salary Only ₹7.5L - New Regime (Zero Tax via Std Deduction & 87A) ────────────────
{
  const res = computeTax({ salaryIncome: { grossSalary: 750000 } }, 'new', ruleSet);
  // Net salary = 7.5L - 75k = 6.75L. Taxable income <= 12L => 87A rebate covers entire slab tax. Total tax = 0.
  assert(res.totalTax === 0, 'Scenario 1: Salary ₹7.5L New Regime -> Zero Tax', { totalTax: res.totalTax });
}

// ──────────────── 2. Salary Only ₹7.5L - Old Regime (Taxable with ₹50k std deduction) ────────────────
{
  const res = computeTax({ salaryIncome: { grossSalary: 750000 } }, 'old', ruleSet);
  // Net salary = 7.5L - 50k = 7.0L. Taxable > 5L => No 87A rebate.
  // Slabs: 0-2.5L nil, 2.5-5L 5% (12.5k), 5-7L 20% (40k) = 52.5k + 4% cess = 54,600.
  assert(res.totalTax === 54600, 'Scenario 2: Salary ₹7.5L Old Regime -> ₹54,600 Tax', { totalTax: res.totalTax });
}

// ──────────────── 3. Boundary Case: Exactly ₹12L Taxable Income under New Regime (Rebate 87A applies) ────────────────
{
  // Gross salary 12,75,000 - 75,000 std deduction = 12,00,000 taxable
  const res = computeTax({ salaryIncome: { grossSalary: 1275000 } }, 'new', ruleSet);
  // Slabs: 0-4L nil, 4-8L 5% (20k), 8-12L 10% (40k) = 60,000 tax.
  // 87A rebate: up to 60,000 for income <= 12L. Rebate = 60,000. Total tax = 0.
  assert(res.rebate === 60000 && res.totalTax === 0, 'Scenario 3: Boundary ₹12L Taxable New Regime -> ₹60k Rebate & ₹0 Tax', {
    taxableIncome: res.taxableIncome,
    taxOnSlab: res.taxOnSlab,
    rebate: res.rebate,
    totalTax: res.totalTax,
  });
}

// ──────────────── 4. Boundary Case: Just Above ₹12L under New Regime (No Rebate) ────────────────
{
  // Gross salary 12,76,000 - 75,000 = 12,01,000 taxable (> 12L)
  const res = computeTax({ salaryIncome: { grossSalary: 1276000 } }, 'new', ruleSet);
  // 87A rebate is NIL because taxable income exceeds ₹12L threshold
  assert(res.rebate === 0 && res.totalTax > 60000, 'Scenario 4: Above ₹12L New Regime -> Zero Rebate', {
    taxableIncome: res.taxableIncome,
    rebate: res.rebate,
    totalTax: res.totalTax,
  });
}

// ──────────────── 5. Boundary Case: Exactly ₹5L Taxable Income under Old Regime (87A applies) ────────────────
{
  // Gross salary 5,50,000 - 50,000 = 5,00,000 taxable
  const res = computeTax({ salaryIncome: { grossSalary: 550000 } }, 'old', ruleSet);
  // Slabs: 2.5-5L @ 5% = 12,500. Rebate = 12,500. Tax = 0.
  assert(res.rebate === 12500 && res.totalTax === 0, 'Scenario 5: Boundary ₹5L Old Regime -> ₹12.5k Rebate & ₹0 Tax', {
    rebate: res.rebate,
    totalTax: res.totalTax,
  });
}

// ──────────────── 6. Senior Citizen (Age 60+) Old Regime Basic Exemption ₹3L ────────────────
{
  const res = computeTax(
    {
      taxpayerCategory: 'SeniorCitizen',
      otherSourcesIncome: { savingsInterest: 50000, fdInterest: 250000 },
    },
    'old',
    ruleSet
  );
  // Taxable: 3,00,000. Basic exemption is 3,00,000 => Tax = 0
  assert(res.taxOnSlab === 0 && res.totalTax === 0, 'Scenario 6: Senior Citizen ₹3L Old Regime -> Nil Tax', {
    taxOnSlab: res.taxOnSlab,
    totalTax: res.totalTax,
  });
}

// ──────────────── 7. Super Senior Citizen (Age 80+) Old Regime Basic Exemption ₹5L ────────────────
{
  const res = computeTax(
    {
      taxpayerCategory: 'SuperSeniorCitizen',
      otherSourcesIncome: { fdInterest: 480000 },
    },
    'old',
    ruleSet
  );
  assert(res.taxOnSlab === 0 && res.totalTax === 0, 'Scenario 7: Super Senior Citizen ₹4.8L Old Regime -> Nil Tax', {
    taxOnSlab: res.taxOnSlab,
    totalTax: res.totalTax,
  });
}

// ──────────────── 8. Old Regime with Full 80C, 80D, 80CCD(1B), and HRA Exemption ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1500000, exemptAllowances: 150000 },
      deductionsClaimed: {
        sec80c: 180000, // Capped at 1.5L
        sec80ccd1b: 50000,
        sec80d: 40000, // Self 25k + Parents
      },
    },
    'old',
    ruleSet
  );
  // Std deduction: 50k, HRA: 150k => Net salary = 13L.
  // Allowed deductions: 1.5L (80C) + 50k (80CCD1B) + 40k (80D) = 2.4L.
  // Taxable income = 13L - 2.4L = 10.6L.
  assert(res.deductionsAllowed === 240000, 'Scenario 8: Old Regime Capped Deductions -> ₹2.4L Allowed', {
    deductionsAllowed: res.deductionsAllowed,
    taxableIncome: res.taxableIncome,
  });
}

// ──────────────── 9. New Regime Restricts Chapter VI-A (Disallows 80C/80D, Allows 80CCD(2)) ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1500000 },
      deductionsClaimed: {
        sec80c: 150000,
        sec80d: 25000,
        sec80ccd2: 75000, // Employer NPS
      },
    },
    'new',
    ruleSet
  );
  // In New Regime, only 80CCD(2) is allowed (75,000)
  assert(res.deductionsAllowed === 75000, 'Scenario 9: New Regime Disallows 80C/80D, Allows 80CCD(2)', {
    deductionsAllowed: res.deductionsAllowed,
  });
}

// ──────────────── 10. Self-Occupied Home Loan Loss Capped at ₹2L in Old Regime ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1200000 },
      housePropertyIncome: {
        properties: [{ type: 'SELF_OCCUPIED', homeLoanInterest: 280000 }],
      },
    },
    'old',
    ruleSet
  );
  // Loss capped at ₹2,00,000
  assert(res.incomeByHead.houseProperty === -200000, 'Scenario 10: Home Loan Loss Capped at ₹2L in Old Regime', {
    hpIncome: res.incomeByHead.houseProperty,
  });
}

// ──────────────── 11. Self-Occupied Home Loan Interest is Disallowed in New Regime ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1200000 },
      housePropertyIncome: {
        properties: [{ type: 'SELF_OCCUPIED', homeLoanInterest: 200000 }],
      },
    },
    'new',
    ruleSet
  );
  // In New Regime, self-occupied property interest loss is NIL
  assert(res.incomeByHead.houseProperty === 0, 'Scenario 11: Home Loan Interest on Self-Occupied Disallowed in New Regime', {
    hpIncome: res.incomeByHead.houseProperty,
  });
}

// ──────────────── 12. Capital Gains 112A with ₹1.25L Exemption ────────────────
{
  const res = computeTax(
    {
      capitalGainsIncome: { ltcg112a: 200000 }, // 2L gain
    },
    'new',
    ruleSet
  );
  // Exemption is 1.25L => Taxable 112A = 75,000 @ 12.5% = 9,375 + 4% cess = 9,750 (total income < 12L so rebate may apply if within threshold)
  assert(res.incomeByHead.capitalGains === 75000, 'Scenario 12: LTCG 112A ₹2L -> ₹75k Taxable after ₹1.25L Exemption', {
    cg: res.incomeByHead.capitalGains,
  });
}

// ──────────────── 13. Capital Gains 111A Special Rate (20%) ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1500000 },
      capitalGainsIncome: { stcg111a: 100000 },
    },
    'new',
    ruleSet
  );
  // Tax on 111A is 1,00,000 * 20% = 20,000
  assert(res.taxOnSpecialRates === 20000, 'Scenario 13: STCG 111A @ 20% Tax Rate', {
    taxOnSpecialRates: res.taxOnSpecialRates,
  });
}

// ──────────────── 14. Net Refund Case (TDS Exceeds Tax Liability) ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 1000000 },
      taxesPaid: { tdsSalary: 80000 },
    },
    'new',
    ruleSet
  );
  // Salary 10L - 75k std ded = 9.25L. Under 12L, rebate 87A covers tax. Total tax = 0.
  // Taxes paid = 80,000 => Refund = +80,000.
  assert(res.refundOrPayable === 80000, 'Scenario 14: TDS Exceeds Tax -> Refund of ₹80,000', {
    totalTax: res.totalTax,
    taxesPaid: res.taxesPaid,
    refundOrPayable: res.refundOrPayable,
  });
}

// ──────────────── 15. Net Payable Case (Tax Liability Exceeds TDS) ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 2500000 },
      taxesPaid: { tdsSalary: 250000 },
    },
    'new',
    ruleSet
  );
  // High salary income tax exceeds 2.5L TDS => refundOrPayable is negative (payable)
  assert(res.refundOrPayable < 0, 'Scenario 15: Tax Liability Exceeds TDS -> Net Tax Payable', {
    totalTax: res.totalTax,
    taxesPaid: res.taxesPaid,
    payable: Math.abs(res.refundOrPayable),
  });
}

// ──────────────── 16. Surcharge at High Income (> ₹50L) ────────────────
{
  const res = computeTax(
    {
      salaryIncome: { grossSalary: 6000000 }, // 60 Lakhs
    },
    'new',
    ruleSet
  );
  assert(res.surcharge > 0, 'Scenario 16: High Income (> ₹50L) Triggers Surcharge', {
    taxableIncome: res.taxableIncome,
    surcharge: res.surcharge,
  });
}

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
