/**
 * VERIFY every value against the official Income Tax Department utilities/rules before production.
 *
 * Pure, deterministic Tax Engine for AY 2026-27 (FY 2025-26)
 * Supports both New Regime (default) and Old Regime.
 */

export interface ReturnDataInput {
  taxpayerCategory?: 'Individual' | 'SeniorCitizen' | 'SuperSeniorCitizen' | 'HUF';
  salaryIncome?: {
    grossSalary?: number;
    exemptAllowances?: number; // e.g. HRA, LTA
    perquisites?: number;
    professionalTax?: number;
    standardDeduction?: number;
  };
  housePropertyIncome?: {
    properties?: Array<{
      type: 'SELF_OCCUPIED' | 'LET_OUT';
      annualValue?: number;
      municipalTaxes?: number;
      homeLoanInterest?: number; // Sec 24(b)
    }>;
    netIncomeOrLoss?: number;
  };
  otherSourcesIncome?: {
    savingsInterest?: number;
    fdInterest?: number;
    dividendIncome?: number;
    familyPension?: number;
    otherIncome?: number;
  };
  capitalGainsIncome?: {
    stcgNormal?: number; // taxed at slab
    stcg111a?: number;   // equity/equity MF 20%
    ltcg112?: number;    // non-equity LTCG 12.5%
    ltcg112a?: number;   // listed equity LTCG 12.5% over 1.25L
  };
  agriculturalIncome?: number; // exempt if <= 5000 in ITR-1
  deductionsClaimed?: {
    sec80c?: number;
    sec80ccc?: number;
    sec80ccd1?: number;
    sec80ccd1b?: number;
    sec80ccd2?: number; // Employer NPS (allowed in both New & Old)
    sec80d?: number;
    sec80e?: number;
    sec80g?: number;
    sec80tta?: number;
    sec80ttb?: number;
    sec80gg?: number;
    sec80dd?: number;
    sec80u?: number;
  };
  taxesPaid?: {
    tdsSalary?: number;
    tdsOther?: number;
    tcs?: number;
    advanceTax?: number;
    selfAssessmentTax?: number;
  };
}

export interface TaxComputationResult {
  regime: 'new' | 'old';
  assessmentYear: string;
  grossIncome: number;
  incomeByHead: {
    salary: number;
    houseProperty: number;
    otherSources: number;
    capitalGains: number;
  };
  exemptions: number;
  deductionsClaimed: number;
  deductionsAllowed: number;
  taxableIncome: number;
  taxOnSlab: number;
  taxOnSpecialRates: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  interestFees: number;
  totalTax: number;
  taxesPaid: number;
  refundOrPayable: number; // positive = refund, negative = tax payable
  breakdownLines: Array<{
    code: string;
    description: string;
    amount: number;
    explanation: string;
  }>;
}

export function computeTax(
  returnData: ReturnDataInput,
  regime: 'new' | 'old' = 'new',
  ruleSet: any
): TaxComputationResult {
  const breakdown: TaxComputationResult['breakdownLines'] = [];
  const isSenior = returnData.taxpayerCategory === 'SeniorCitizen';
  const isSuperSenior = returnData.taxpayerCategory === 'SuperSeniorCitizen';

  // ──────────────── 1. SALARY INCOME ────────────────
  const rawGrossSalary = returnData.salaryIncome?.grossSalary || 0;
  let exemptAllowances = 0;
  let professionalTax = returnData.salaryIncome?.professionalTax || 0;
  let stdDeduction = 0;

  if (regime === 'old') {
    exemptAllowances = returnData.salaryIncome?.exemptAllowances || 0;
    stdDeduction = Math.min(rawGrossSalary, ruleSet.oldRegime?.standardDeductionSalary ?? 50000);
  } else {
    // New regime: no HRA/exempt allowances, higher standard deduction
    exemptAllowances = 0;
    professionalTax = 0; // Professional tax deduction not allowed in new regime
    stdDeduction = Math.min(rawGrossSalary, ruleSet.newRegime?.standardDeductionSalary ?? 75000);
  }

  const netSalary = Math.max(0, rawGrossSalary - exemptAllowances - stdDeduction - professionalTax);
  breakdown.push({
    code: 'SALARY_NET',
    description: 'Net Income from Salary',
    amount: netSalary,
    explanation: `Gross Salary (₹${rawGrossSalary.toLocaleString('en-IN')}) minus Standard Deduction (₹${stdDeduction.toLocaleString('en-IN')})${exemptAllowances > 0 ? ` and Allowances (₹${exemptAllowances.toLocaleString('en-IN')})` : ''}`,
  });

  // ──────────────── 2. HOUSE PROPERTY INCOME ────────────────
  let netHp = 0;
  if (returnData.housePropertyIncome?.properties && returnData.housePropertyIncome.properties.length > 0) {
    for (const prop of returnData.housePropertyIncome.properties) {
      if (prop.type === 'SELF_OCCUPIED') {
        const intClaim = prop.homeLoanInterest || 0;
        // In New Regime, home loan interest on self-occupied is NIL
        if (regime === 'old') {
          netHp -= Math.min(intClaim, 200000);
        }
      } else {
        // Let out
        const ann = prop.annualValue || 0;
        const muni = prop.municipalTaxes || 0;
        const nav = Math.max(0, ann - muni);
        const std30 = nav * 0.30;
        const intClaim = prop.homeLoanInterest || 0;
        const propIncome = nav - std30 - intClaim;
        netHp += propIncome;
      }
    }
  } else if (returnData.housePropertyIncome?.netIncomeOrLoss !== undefined) {
    netHp = returnData.housePropertyIncome.netIncomeOrLoss;
  }

  // Loss set-off cap against other heads: max 2 Lakhs
  const hpLossLimit = ruleSet.housePropertyLossSetOffLimit ?? 200000;
  if (netHp < -hpLossLimit) {
    netHp = -hpLossLimit;
  }
  breakdown.push({
    code: 'HP_NET',
    description: 'Income / Loss from House Property',
    amount: netHp,
    explanation: netHp < 0 ? `Loss set off capped at ₹${hpLossLimit.toLocaleString('en-IN')}` : 'Net annual value minus statutory deductions',
  });

  // ──────────────── 3. OTHER SOURCES ────────────────
  const os = returnData.otherSourcesIncome || {};
  const savingsInt = os.savingsInterest || 0;
  const fdInt = os.fdInterest || 0;
  const divInc = os.dividendIncome || 0;
  const otherInc = os.otherIncome || 0;
  let familyPen = os.familyPension || 0;

  // Family pension deduction: 1/3rd or max limit
  let familyPenDed = 0;
  if (familyPen > 0) {
    const maxPenDed = regime === 'new'
      ? (ruleSet.newRegime?.familyPensionDeduction ?? 25000)
      : (ruleSet.oldRegime?.familyPensionDeduction ?? 15000);
    familyPenDed = Math.min(familyPen / 3, maxPenDed);
    familyPen = Math.max(0, familyPen - familyPenDed);
  }

  const netOtherSources = savingsInt + fdInt + divInc + familyPen + otherInc;
  breakdown.push({
    code: 'OTHER_SOURCES',
    description: 'Income from Other Sources',
    amount: netOtherSources,
    explanation: `Interest (₹${(savingsInt + fdInt).toLocaleString('en-IN')}) + Dividend (₹${divInc.toLocaleString('en-IN')})${familyPenDed > 0 ? ` + Family Pension net of ₹${familyPenDed.toLocaleString('en-IN')} deduction` : ''}`,
  });

  // ──────────────── 4. CAPITAL GAINS (ITR-2) ────────────────
  const cg = returnData.capitalGainsIncome || {};
  const stcgNormal = cg.stcgNormal || 0;
  const stcg111a = cg.stcg111a || 0;
  const ltcg112 = cg.ltcg112 || 0;
  const rawLtcg112a = cg.ltcg112a || 0;
  const ltcg112aExemption = ruleSet.capitalGains?.sec112a_exemptionLimit ?? 125000;
  const taxableLtcg112a = Math.max(0, rawLtcg112a - ltcg112aExemption);

  const netCapitalGains = stcgNormal + stcg111a + ltcg112 + taxableLtcg112a;
  if (netCapitalGains > 0) {
    breakdown.push({
      code: 'CAPITAL_GAINS',
      description: 'Taxable Capital Gains',
      amount: netCapitalGains,
      explanation: `STCG 111A (₹${stcg111a.toLocaleString('en-IN')}) + LTCG 112 (₹${ltcg112.toLocaleString('en-IN')}) + LTCG 112A over ₹${ltcg112aExemption.toLocaleString('en-IN')} (₹${taxableLtcg112a.toLocaleString('en-IN')})`,
    });
  }

  // ──────────────── 5. GROSS TOTAL INCOME ────────────────
  const grossIncome = netSalary + netHp + netOtherSources + netCapitalGains;

  // ──────────────── 6. DEDUCTIONS (CHAPTER VI-A) ────────────────
  const claimed = returnData.deductionsClaimed || {};
  let totalDeductionsClaimed = 0;
  let totalDeductionsAllowed = 0;

  for (const val of Object.values(claimed)) {
    totalDeductionsClaimed += val || 0;
  }

  if (regime === 'old') {
    const limits = ruleSet.oldRegime?.deductionLimits || {};
    // Sec 80C + 80CCC + 80CCD(1) capped at 1.5L
    const sec80cTotal = (claimed.sec80c || 0) + (claimed.sec80ccc || 0) + (claimed.sec80ccd1 || 0);
    const allowed80C = Math.min(sec80cTotal, limits['80C'] ?? 150000);

    // 80CCD(1B) NPS additional 50k
    const allowed80CCD1B = Math.min(claimed.sec80ccd1b || 0, limits['80CCD_1B'] ?? 50000);

    // 80CCD(2) Employer NPS allowed up to 10% of salary (or 14% for govt)
    const allowed80CCD2 = claimed.sec80ccd2 || 0;

    // 80D Health Insurance
    const allowed80D = Math.min(claimed.sec80d || 0, (limits['80D_Self'] ?? 25000) + (limits['80D_SeniorParents'] ?? 50000));

    // 80E Education loan interest: 100% allowed
    const allowed80E = claimed.sec80e || 0;

    // 80G Donations: eligible amount
    const allowed80G = claimed.sec80g || 0;

    // 80TTA (non-senior) / 80TTB (senior)
    let allowed80TTA = 0;
    if (isSenior || isSuperSenior) {
      allowed80TTA = Math.min(savingsInt + fdInt, claimed.sec80ttb || 0, limits['80TTB'] ?? 50000);
    } else {
      allowed80TTA = Math.min(savingsInt, claimed.sec80tta || 0, limits['80TTA'] ?? 10000);
    }

    // 80DD & 80U
    const allowed80DD = Math.min(claimed.sec80dd || 0, limits['80DD_Severe'] ?? 125000);
    const allowed80U = Math.min(claimed.sec80u || 0, limits['80U_Severe'] ?? 125000);

    totalDeductionsAllowed =
      allowed80C +
      allowed80CCD1B +
      allowed80CCD2 +
      allowed80D +
      allowed80E +
      allowed80G +
      allowed80TTA +
      allowed80DD +
      allowed80U;
  } else {
    // New regime: only 80CCD(2) employer NPS is allowed
    totalDeductionsAllowed = claimed.sec80ccd2 || 0;
  }

  // Deductions cannot exceed normal taxable income (cannot be set off against special-rate capital gains)
  const normalIncome = Math.max(0, netSalary + netHp + netOtherSources + stcgNormal);
  totalDeductionsAllowed = Math.min(totalDeductionsAllowed, normalIncome);

  breakdown.push({
    code: 'DEDUCTIONS',
    description: regime === 'new' ? 'Allowed Deductions (New Regime: Sec 80CCD(2) only)' : 'Chapter VI-A Deductions Allowed',
    amount: totalDeductionsAllowed,
    explanation: regime === 'new'
      ? `Under New Regime, most deductions are disbarred; ₹${totalDeductionsAllowed.toLocaleString('en-IN')} allowed u/s 80CCD(2)`
      : `Claimed ₹${totalDeductionsClaimed.toLocaleString('en-IN')}, allowed statutory ₹${totalDeductionsAllowed.toLocaleString('en-IN')}`,
  });

  // ──────────────── 7. TAXABLE INCOME ────────────────
  const taxableNormalIncome = Math.max(0, normalIncome - totalDeductionsAllowed);
  const totalTaxableIncome = taxableNormalIncome + stcg111a + ltcg112 + taxableLtcg112a;

  // ──────────────── 8. SLAB TAX COMPUTATION ────────────────
  let taxOnSlab = 0;

  if (regime === 'new') {
    const slabs = ruleSet.newRegime?.slabs || [];
    for (const slab of slabs) {
      if (taxableNormalIncome > slab.min) {
        const taxableInSlab = slab.max !== null
          ? Math.min(taxableNormalIncome - slab.min, slab.max - slab.min)
          : taxableNormalIncome - slab.min;
        taxOnSlab += taxableInSlab * slab.rate;
      }
    }
  } else {
    let slabs = ruleSet.oldRegime?.slabsIndividual || [];
    if (isSuperSenior) {
      slabs = ruleSet.oldRegime?.slabsSuperSeniorCitizen || [];
    } else if (isSenior) {
      slabs = ruleSet.oldRegime?.slabsSeniorCitizen || [];
    }

    for (const slab of slabs) {
      if (taxableNormalIncome > slab.min) {
        const taxableInSlab = slab.max !== null
          ? Math.min(taxableNormalIncome - slab.min, slab.max - slab.min)
          : taxableNormalIncome - slab.min;
        taxOnSlab += taxableInSlab * slab.rate;
      }
    }
  }

  // ──────────────── 9. SPECIAL RATE TAX ────────────────
  const rate111a = ruleSet.capitalGains?.sec111a_STCG_rate ?? 0.20;
  const rate112 = ruleSet.capitalGains?.sec112_LTCG_rate ?? 0.125;
  const rate112a = ruleSet.capitalGains?.sec112a_LTCG_rate ?? 0.125;

  const taxOn111a = stcg111a * rate111a;
  const taxOn112 = ltcg112 * rate112;
  const taxOn112a = taxableLtcg112a * rate112a;
  const taxOnSpecialRates = taxOn111a + taxOn112 + taxOn112a;

  const totalBaseTax = taxOnSlab + taxOnSpecialRates;

  // ──────────────── 10. REBATE U/S 87A ────────────────
  let rebate = 0;
  if (regime === 'new') {
    const rebRule = ruleSet.newRegime?.sec87aRebate || { maxIncomeThreshold: 1200000, maxRebateAmount: 60000 };
    if (totalTaxableIncome <= rebRule.maxIncomeThreshold) {
      rebate = Math.min(totalBaseTax, rebRule.maxRebateAmount);
    }
  } else {
    const rebRule = ruleSet.oldRegime?.sec87aRebate || { maxIncomeThreshold: 500000, maxRebateAmount: 12500 };
    if (totalTaxableIncome <= rebRule.maxIncomeThreshold) {
      rebate = Math.min(totalBaseTax, rebRule.maxRebateAmount);
    }
  }

  const taxAfterRebate = Math.max(0, totalBaseTax - rebate);
  breakdown.push({
    code: 'REBATE_87A',
    description: 'Rebate u/s 87A',
    amount: rebate,
    explanation: rebate > 0
      ? `Full rebate applied as total taxable income (₹${totalTaxableIncome.toLocaleString('en-IN')}) is within limit`
      : 'Income exceeds 87A threshold; rebate is Nil',
  });

  // ──────────────── 11. SURCHARGE & CESS ────────────────
  let surcharge = 0;
  const surchargeTiers = (regime === 'new' ? ruleSet.newRegime?.surchargeTiers : ruleSet.oldRegime?.surchargeTiers) || [];
  for (let i = surchargeTiers.length - 1; i >= 0; i--) {
    if (totalTaxableIncome > surchargeTiers[i].threshold) {
      surcharge = taxAfterRebate * surchargeTiers[i].rate;
      break;
    }
  }

  const cessRate = ruleSet.healthAndEducationCessRate ?? 0.04;
  const cess = (taxAfterRebate + surcharge) * cessRate;

  const interestFees = 0; // Configurable u/s 234A/B/C / 234F
  const totalTax = Math.round(taxAfterRebate + surcharge + cess + interestFees);

  // ──────────────── 12. TAX CREDITS & REFUND / PAYABLE ────────────────
  const tp = returnData.taxesPaid || {};
  const totalTaxesPaid = (tp.tdsSalary || 0) + (tp.tdsOther || 0) + (tp.tcs || 0) + (tp.advanceTax || 0) + (tp.selfAssessmentTax || 0);

  // positive = refund due from ITD, negative = tax payable
  const refundOrPayable = totalTaxesPaid - totalTax;

  breakdown.push({
    code: 'TOTAL_TAX_COMPUTED',
    description: 'Total Tax Liability (including 4% Cess)',
    amount: totalTax,
    explanation: `Tax on slabs (₹${Math.round(taxOnSlab).toLocaleString('en-IN')}) + Special rates (₹${Math.round(taxOnSpecialRates).toLocaleString('en-IN')}) - Rebate (₹${Math.round(rebate).toLocaleString('en-IN')}) + Surcharge (₹${Math.round(surcharge).toLocaleString('en-IN')}) + Cess (₹${Math.round(cess).toLocaleString('en-IN')})`,
  });

  breakdown.push({
    code: 'TAXES_PAID',
    description: 'Total Taxes Paid (TDS + TCS + Advance Tax)',
    amount: totalTaxesPaid,
    explanation: `TDS: ₹${((tp.tdsSalary || 0) + (tp.tdsOther || 0)).toLocaleString('en-IN')}, TCS: ₹${(tp.tcs || 0).toLocaleString('en-IN')}, Advance Tax: ₹${(tp.advanceTax || 0).toLocaleString('en-IN')}`,
  });

  breakdown.push({
    code: 'FINAL_RESULT',
    description: refundOrPayable >= 0 ? 'Net Refund Due' : 'Net Tax Payable',
    amount: Math.abs(refundOrPayable),
    explanation: refundOrPayable >= 0
      ? `You are eligible for a refund of ₹${refundOrPayable.toLocaleString('en-IN')}`
      : `Self-assessment tax payable before filing is ₹${Math.abs(refundOrPayable).toLocaleString('en-IN')}`,
  });

  return {
    regime,
    assessmentYear: ruleSet.assessmentYear || '2026-27',
    grossIncome,
    incomeByHead: {
      salary: netSalary,
      houseProperty: netHp,
      otherSources: netOtherSources,
      capitalGains: netCapitalGains,
    },
    exemptions: exemptAllowances,
    deductionsClaimed: totalDeductionsClaimed,
    deductionsAllowed: totalDeductionsAllowed,
    taxableIncome: totalTaxableIncome,
    taxOnSlab,
    taxOnSpecialRates,
    rebate,
    taxAfterRebate,
    surcharge,
    cess,
    interestFees,
    totalTax,
    taxesPaid: totalTaxesPaid,
    refundOrPayable,
    breakdownLines: breakdown,
  };
}
