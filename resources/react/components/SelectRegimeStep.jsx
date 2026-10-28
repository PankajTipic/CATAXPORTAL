import React, { useState, useMemo } from "react";
import { CRow, CCol, CButton, CTooltip } from "@coreui/react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
} from "lucide-react";

/* ─────────────────────────── FORMATTER ─────────────────────────── */
const fmt = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");

/* ─────────────────────────── SURCHARGE HELPER ─────────────────────────── */
function computeSurchargeAndRelief(taxableIncome, baseTax, regime = "new") {
  let rate = 0;
  let slabDesc = "No Surcharge (Income ≤ ₹50 Lakh)";
  let threshold = 5000000;
  let lowerThreshold = 0;

  if (regime === "new") {
    if (taxableIncome > 20000000) {
      rate = 0.25;
      slabDesc = "25% Surcharge (Income > ₹2 Crore, capped under New Regime)";
      threshold = 20000000;
      lowerThreshold = 10000000;
    } else if (taxableIncome > 10000000) {
      rate = 0.15;
      slabDesc = "15% Surcharge (Income > ₹1 Crore to ₹2 Crore)";
      threshold = 10000000;
      lowerThreshold = 5000000;
    } else if (taxableIncome > 5000000) {
      rate = 0.10;
      slabDesc = "10% Surcharge (Income > ₹50 Lakh to ₹1 Crore)";
      threshold = 5000000;
      lowerThreshold = 0;
    }
  } else {
    // Old Regime
    if (taxableIncome > 50000000) {
      rate = 0.37;
      slabDesc = "37% Surcharge (Income > ₹5 Crore under Old Regime)";
      threshold = 50000000;
      lowerThreshold = 20000000;
    } else if (taxableIncome > 20000000) {
      rate = 0.25;
      slabDesc = "25% Surcharge (Income > ₹2 Crore to ₹5 Crore)";
      threshold = 20000000;
      lowerThreshold = 10000000;
    } else if (taxableIncome > 10000000) {
      rate = 0.15;
      slabDesc = "15% Surcharge (Income > ₹1 Crore to ₹2 Crore)";
      threshold = 10000000;
      lowerThreshold = 5000000;
    } else if (taxableIncome > 5000000) {
      rate = 0.10;
      slabDesc = "10% Surcharge (Income > ₹50 Lakh to ₹1 Crore)";
      threshold = 5000000;
      lowerThreshold = 0;
    }
  }

  let surchargeAmount = Math.round(baseTax * rate);
  let marginalReliefApplied = false;

  // Marginal Relief Check at Surcharge Threshold
  if (rate > 0 && taxableIncome > threshold) {
    const excessIncome = taxableIncome - threshold;
    // Compute tax at exact threshold
    let taxAtThreshold = 0;
    let surchargeAtThreshold = 0;
    if (threshold === 5000000) {
      taxAtThreshold = regime === "new" ? 1220000 : 1312500;
      surchargeAtThreshold = 0;
    } else if (threshold === 10000000) {
      taxAtThreshold = regime === "new" ? 2720000 : 2812500;
      surchargeAtThreshold = taxAtThreshold * 0.10;
    } else if (threshold === 20000000) {
      taxAtThreshold = regime === "new" ? 5720000 : 5812500;
      surchargeAtThreshold = taxAtThreshold * 0.15;
    }

    const totalPayableWithoutRelief = baseTax + surchargeAmount;
    const maxAllowablePayable = taxAtThreshold + surchargeAtThreshold + excessIncome;

    if (totalPayableWithoutRelief > maxAllowablePayable) {
      const relief = totalPayableWithoutRelief - maxAllowablePayable;
      surchargeAmount = Math.max(0, surchargeAmount - relief);
      marginalReliefApplied = true;
    }
  }

  return {
    rate,
    ratePercent: Math.round(rate * 100),
    amount: surchargeAmount,
    slabDesc,
    marginalReliefApplied,
  };
}

/* ─────────────────────────── SELECT REGIME STEP ─────────────────────────── */
export default function SelectRegimeStep({
  incomeData = {},
  deductionData = {},
  form16File = null,
  form26asFile = null,
  totalTdsCredit = 0,
  chosenRegime = null,
  setChosenRegime,
  onContinue,
  onBack,
  selectedItrForm = "ITR-1",
  taxpayerCategory = "Individual",
  stepText = "STEP 5 OF 6: REGIME SELECTOR",
  backText = "Back to Deductions",
  continueText = "Review & Finalize Filing",
}) {
  const [showDetailedComputation, setShowDetailedComputation] = useState(false);

  // ── 1. UNIFIED GROSS TOTAL INCOME (SAME FOR BOTH REGIMES) ──
  const isItr2 = selectedItrForm === "ITR-2";
  const rawSalary = Number(incomeData.salary || 0);
  const interestIncome = Number(incomeData.interest || 0);
  const dividendIncome = Number(incomeData.dividend || 0);
  const miscIncome = Number(incomeData.otherIncome || 0) + (rawSalary > 0 ? 720 : 0);
  const totalOtherSources = interestIncome + dividendIncome + miscIncome;
  
  // House Property (Let-out positive rental income adds to GTI; negative interest handled via sec 24b)
  const hpRaw = Number(incomeData.houseProperty || 0);
  const hpPositiveIncome = hpRaw > 0 ? hpRaw : 0;

  // Capital Gains
  const stcg = isItr2 ? Number(incomeData.stcg || 0) : 0;
  const ltcg = isItr2 ? Number(incomeData.ltcg || 0) : 0;
  const taxableLtcg = Math.max(0, ltcg - 125000); // Section 112A ₹1.25L exemption

  // Both regimes start from this exact Gross Total Income:
  const grossTotalIncome = rawSalary + hpPositiveIncome + totalOtherSources + stcg + ltcg;

  // ── 2. NEW REGIME DEDUCTIONS (AY 2026-27 Sec 115BAC) ──
  const newStdDeduction = rawSalary > 0 ? Math.min(rawSalary, 75000) : 0;
  const newEmployerNps = Number(deductionData.sec80ccd2 || 0);
  const newFamilyPension = Number(deductionData.familyPension || 0) > 0
    ? Math.min(Number(deductionData.familyPension) / 3, 25000)
    : 0;

  const totalNewDeductions = newStdDeduction + newEmployerNps + newFamilyPension;
  const newTaxableIncome = Math.max(0, grossTotalIncome - totalNewDeductions);

  // ── 3. OLD REGIME DEDUCTIONS (ITEMIZED CHAPTER VI-A & SEC 16) ──
  const oldStdDeduction = rawSalary > 0 ? Math.min(rawSalary, 50000) : 0;
  const oldPt = rawSalary > 0 ? Number(deductionData.pt || 0) : 0;
  const oldHra = Number(deductionData.hra || 0);
  const oldSec80c = Math.min(Number(deductionData.sec80c || 0), 150000);
  const oldSec80d = Math.min(Number(deductionData.sec80d || 0), deductionData.hasSeniorParents ? 75000 : 50000);
  const oldSec80ccd1b = Math.min(Number(deductionData.sec80ccd1b || 0), 50000);
  const oldEmployerNps = Number(deductionData.sec80ccd2 || 0);
  const oldSec80e = Number(deductionData.sec80e || 0);
  const oldSec80g = Number(deductionData.sec80g || 0);
  
  // Section 24(b) Home loan interest
  const oldSec24b = Math.min(
    Number(deductionData.sec24b || (hpRaw < 0 ? Math.abs(hpRaw) : 0)),
    200000
  );

  // Section 80TTA / 80TTB
  const isSenior = taxpayerCategory === "SeniorCitizen" || taxpayerCategory === "SuperSeniorCitizen";
  const oldSec80tta = Math.min(interestIncome, isSenior ? 50000 : 10000);

  const totalOldDeductions =
    oldStdDeduction +
    oldPt +
    oldHra +
    oldSec80c +
    oldSec80d +
    oldSec80ccd1b +
    oldEmployerNps +
    oldSec80e +
    oldSec80g +
    oldSec24b +
    oldSec80tta;

  const oldTaxableIncome = Math.max(0, grossTotalIncome - totalOldDeductions);

  // ── CRITICAL VALIDATION RULE ──
  // Old Regime deductions are itemized claims. If Old Regime deductions >= New Regime deductions,
  // Old Regime Net Taxable Income must ALWAYS be <= New Regime Net Taxable Income.
  const calculationError = useMemo(() => {
    if (totalOldDeductions >= totalNewDeductions && oldTaxableIncome > newTaxableIncome) {
      return `Tax Calculation Inconsistency Detected: Gross Total Income is ${fmt(grossTotalIncome)}. Old Regime deductions (${fmt(totalOldDeductions)}) exceed New Regime deductions (${fmt(totalNewDeductions)}), but computed Old Net Income (${fmt(oldTaxableIncome)}) was higher than New Net Income (${fmt(newTaxableIncome)}).`;
    }
    return null;
  }, [grossTotalIncome, totalOldDeductions, totalNewDeductions, oldTaxableIncome, newTaxableIncome]);

  // ── 4. TAX COMPUTATION: NEW REGIME (AY 2026-27 Slabs) ──
  const newComputation = useMemo(() => {
    const normalTaxable = Math.max(0, newTaxableIncome - stcg - taxableLtcg);
    let slabTax = 0;

    // AY 2026-27 Slabs under Sec 115BAC:
    // 0 - 4,00,000: NIL
    // 4,00,001 - 8,00,000: 5%
    // 8,00,001 - 12,00,000: 10%
    // 12,00,001 - 16,00,000: 15%
    // 16,00,001 - 20,00,000: 20%
    // 20,00,001 - 24,00,000: 25%
    // Above 24,00,000: 30%
    if (normalTaxable > 2400000) slabTax += (normalTaxable - 2400000) * 0.30;
    if (normalTaxable > 2000000) slabTax += Math.min(normalTaxable - 2000000, 400000) * 0.25;
    if (normalTaxable > 1600000) slabTax += Math.min(normalTaxable - 1600000, 400000) * 0.20;
    if (normalTaxable > 1200000) slabTax += Math.min(normalTaxable - 1200000, 400000) * 0.15;
    if (normalTaxable > 800000) slabTax += Math.min(normalTaxable - 800000, 400000) * 0.10;
    if (normalTaxable > 400000) slabTax += Math.min(normalTaxable - 400000, 400000) * 0.05;

    // Section 87A Rebate (New Regime: full rebate if taxable income <= ₹12,00,000)
    let rebate87a = 0;
    let marginalRelief87a = false;
    if (newTaxableIncome <= 1200000) {
      rebate87a = slabTax;
      slabTax = 0;
    } else if (newTaxableIncome > 1200000 && newTaxableIncome <= 1275000) {
      // Marginal relief for 87A: tax cannot exceed excess income over ₹12 Lakh
      const excessOver12L = newTaxableIncome - 1200000;
      if (slabTax > excessOver12L) {
        rebate87a = slabTax - excessOver12L;
        slabTax = excessOver12L;
        marginalRelief87a = true;
      }
    }

    // Special rate capital gains: STCG 111A (20%), LTCG 112A (12.5% above ₹1.25L)
    const stcgTax = Math.round(stcg * 0.20);
    const ltcgTax = Math.round(taxableLtcg * 0.125);
    const baseTax = slabTax + stcgTax + ltcgTax;

    // Surcharge & Marginal Relief
    const surchargeInfo = computeSurchargeAndRelief(newTaxableIncome, baseTax, "new");
    const cess = Math.round((baseTax + surchargeInfo.amount) * 0.04);
    const totalTax = Math.round(baseTax + surchargeInfo.amount + cess);

    return {
      slabTax: Math.round(slabTax),
      baseTax,
      rebate87a: Math.round(rebate87a),
      marginalRelief87a,
      surchargeInfo,
      cess,
      totalTax,
    };
  }, [newTaxableIncome, stcg, taxableLtcg]);

  // ── 5. TAX COMPUTATION: OLD REGIME ──
  const oldComputation = useMemo(() => {
    const normalTaxable = Math.max(0, oldTaxableIncome - stcg - taxableLtcg);
    let slabTax = 0;

    // Old Regime Slabs (Individual < 60 yrs):
    // 0 - 2,50,000: NIL
    // 2,50,001 - 5,00,000: 5% (max ₹12,500)
    // 5,00,001 - 10,00,000: 20% (max ₹1,00,000)
    // Above 10,00,000: 30%
    if (normalTaxable > 1000000) slabTax += (normalTaxable - 1000000) * 0.30;
    if (normalTaxable > 500000) slabTax += Math.min(normalTaxable - 500000, 500000) * 0.20;
    if (normalTaxable > 250000) slabTax += Math.min(normalTaxable - 250000, 250000) * 0.05;

    // Section 87A Rebate (Old Regime: full rebate if taxable income <= ₹5,00,000)
    let rebate87a = 0;
    if (oldTaxableIncome <= 500000) {
      rebate87a = slabTax;
      slabTax = 0;
    }

    const stcgTax = Math.round(stcg * 0.20);
    const ltcgTax = Math.round(taxableLtcg * 0.125);
    const baseTax = slabTax + stcgTax + ltcgTax;

    const surchargeInfo = computeSurchargeAndRelief(oldTaxableIncome, baseTax, "old");
    const cess = Math.round((baseTax + surchargeInfo.amount) * 0.04);
    const totalTax = Math.round(baseTax + surchargeInfo.amount + cess);

    return {
      slabTax: Math.round(slabTax),
      baseTax,
      rebate87a: Math.round(rebate87a),
      surchargeInfo,
      cess,
      totalTax,
    };
  }, [oldTaxableIncome, stcg, taxableLtcg]);

  // ── 6. OUTCOME & RECOMMENDATION ──
  const newTaxPayable = newComputation.totalTax;
  const oldTaxPayable = oldComputation.totalTax;

  const actualTds = Number(totalTdsCredit || 0);

  // New Outcome
  const newRefund = Math.max(0, actualTds - newTaxPayable);
  const newAdditionalPayable = Math.max(0, newTaxPayable - actualTds);

  // Old Outcome
  const oldRefund = Math.max(0, actualTds - oldTaxPayable);
  const oldAdditionalPayable = Math.max(0, oldTaxPayable - actualTds);

  // Determining optimal regime
  const recommendedRegime = newTaxPayable <= oldTaxPayable ? "new" : "old";
  const taxDifference = Math.abs(newTaxPayable - oldTaxPayable);
  const hasRefundBoth = newRefund > 0 || oldRefund > 0;

  // Header dynamic title
  const headerTitle = hasRefundBoth
    ? "Compare Your Tax Under Both Regimes"
    : "Which Tax Regime Saves You More Tax?";

  // If calculation error was thrown, display clean error screen
  if (calculationError) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #f87171",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <AlertTriangle size={36} color="#dc2626" style={{ marginBottom: "12px" }} />
          <h4 style={{ color: "#991b1b", fontWeight: "900", marginBottom: "8px" }}>
            Backend Tax Engine Validation Error
          </h4>
          <p style={{ color: "#7f1d1d", fontSize: "14px", maxWidth: "600px", margin: "0 auto" }}>
            {calculationError}
          </p>
          <div className="mt-4">
            <CButton color="secondary" variant="outline" onClick={onBack}>
              ← Return to Deductions to Verify Entries
            </CButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* ════════════════ 1. HEADER ════════════════ */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span
            style={{
              background: "rgba(240, 33, 134, 0.08)",
              color: "#F02186",
              fontWeight: "800",
              fontSize: "12px",
              padding: "4px 14px",
              borderRadius: "20px",
              letterSpacing: "0.5px",
              border: "1px solid rgba(240, 33, 134, 0.2)",
            }}
          >
            {stepText || "STEP 5 OF 6: REGIME SELECTOR"}
          </span>
          <h2
            style={{
              fontWeight: "900",
              color: "#0f172a",
              marginTop: "12px",
              fontSize: "26px",
            }}
          >
            {headerTitle}
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "6px auto 0", maxWidth: "580px" }}>
            Click on any card to select that regime. You can switch every year without any penalty.
          </p>
        </div>

        {/* ════════════════ 2. SIDE-BY-SIDE REGIME CARDS (SIMPLE & CUSTOMER FRIENDLY) ════════════════ */}
        <CRow className="g-4 mb-4">
          {/* ────── NEW TAX REGIME CARD ────── */}
          <CCol md={6}>
            <div
              onClick={() => setChosenRegime("new")}
              style={{
                border: chosenRegime === "new" ? "2.5px solid #0A8E4B" : "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                background: chosenRegime === "new" ? "#f0fbf5" : "#ffffff",
                boxShadow: chosenRegime === "new" ? "0 4px 16px rgba(10, 142, 75, 0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              {/* Badge: Optimal Regime */}
              {recommendedRegime === "new" && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    right: "20px",
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: "11px",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
                  }}
                >
                  <Sparkles size={13} />
                  {hasRefundBoth ? "HIGHEST REFUND" : "LOWER TAX LIABILITY"}
                </div>
              )}

              {/* Title + Radio */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontWeight: "900", fontSize: "19px", color: "#0f172a" }}>
                  New Tax Regime
                </div>
                <input
                  type="radio"
                  name="tax_regime_selector"
                  checked={chosenRegime === "new"}
                  onChange={() => setChosenRegime("new")}
                  style={{ transform: "scale(1.35)", accentColor: "#F02186", cursor: "pointer" }}
                />
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                Default under Sec 115BAC · Lower tax slab rates &amp; standard deduction.
              </div>

              {/* ── 6 KEY METRICS ONLY ── */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "11px",
                  flex: 1,
                }}
              >
                {/* 1. Total Income */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Total Income</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(grossTotalIncome)}</strong>
                </div>

                {/* 2. Total Deductions */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Total Deductions</span>
                  <strong style={{ color: totalNewDeductions > 0 ? "#16a34a" : "#64748b" }}>
                    {totalNewDeductions > 0 ? `− ${fmt(totalNewDeductions)}` : "₹0"}
                  </strong>
                </div>

                {/* 3. Tax */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Tax on Income</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(newComputation.slabTax)}</strong>
                </div>

                {/* 4. Cess */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Cess (4%)</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(newComputation.cess)}</strong>
                </div>

                {/* 5. TDS */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>TDS Deducted</span>
                  <strong style={{ color: "#142B46" }}>{fmt(actualTds)}</strong>
                </div>

                {/* 6. Refund / Tax Payable */}
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: newRefund > 0 ? "#ecfdf5" : newAdditionalPayable > 0 ? "#fef2f2" : "#f8fafc",
                    border: newRefund > 0 ? "1.5px solid #a7f3d0" : newAdditionalPayable > 0 ? "1.5px solid #fecaca" : "1.5px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "800",
                        color: newRefund > 0 ? "#166534" : newAdditionalPayable > 0 ? "#991b1b" : "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      {newRefund > 0 ? "Refund Due" : newAdditionalPayable > 0 ? "Tax Payable" : "Balance"}
                    </div>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "800",
                        color: newRefund > 0 ? "#15803d" : newAdditionalPayable > 0 ? "#dc2626" : "#334155",
                      }}
                    >
                      {newRefund > 0 ? "Refund to Account" : newAdditionalPayable > 0 ? "Tax Payable" : "Zero Balance"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: newRefund > 0 ? "#166534" : newAdditionalPayable > 0 ? "#dc2626" : "#334155",
                    }}
                  >
                    {newRefund > 0 ? fmt(newRefund) : newAdditionalPayable > 0 ? fmt(newAdditionalPayable) : "₹0"}
                  </div>
                </div>
              </div>
            </div>
          </CCol>

          {/* ────── OLD TAX REGIME CARD ────── */}
          <CCol md={6}>
            <div
              onClick={() => setChosenRegime("old")}
              style={{
                border: chosenRegime === "old" ? "2.5px solid #0A8E4B" : "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                background: chosenRegime === "old" ? "#f0fbf5" : "#ffffff",
                boxShadow: chosenRegime === "old" ? "0 4px 16px rgba(10, 142, 75, 0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              {/* Badge: Optimal Regime */}
              {recommendedRegime === "old" && (
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    right: "20px",
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: "11px",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
                  }}
                >
                  <Sparkles size={13} />
                  {hasRefundBoth ? "HIGHEST REFUND" : "LOWER TAX LIABILITY"}
                </div>
              )}

              {/* Title + Radio */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontWeight: "900", fontSize: "19px", color: "#0f172a" }}>
                  Old Tax Regime
                </div>
                <input
                  type="radio"
                  name="tax_regime_selector"
                  checked={chosenRegime === "old"}
                  onChange={() => setChosenRegime("old")}
                  style={{ transform: "scale(1.35)", accentColor: "#F02186", cursor: "pointer" }}
                />
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                Itemized deductions u/s 80C, 80D, HRA, Home Loan Interest &amp; exemptions.
              </div>

              {/* ── 6 KEY METRICS ONLY ── */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "11px",
                  flex: 1,
                }}
              >
                {/* 1. Total Income */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Total Income</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(grossTotalIncome)}</strong>
                </div>

                {/* 2. Total Deductions */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Total Deductions</span>
                  <strong style={{ color: totalOldDeductions > 0 ? "#16a34a" : "#64748b" }}>
                    {totalOldDeductions > 0 ? `− ${fmt(totalOldDeductions)}` : "₹0"}
                  </strong>
                </div>

                {/* 3. Tax */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Tax on Income</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(oldComputation.slabTax)}</strong>
                </div>

                {/* 4. Cess */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>Cess (4%)</span>
                  <strong style={{ color: "#0f172a" }}>{fmt(oldComputation.cess)}</strong>
                </div>

                {/* 5. TDS */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "#475569" }}>TDS Deducted</span>
                  <strong style={{ color: "#142B46" }}>{fmt(actualTds)}</strong>
                </div>

                {/* 6. Refund / Tax Payable */}
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: oldRefund > 0 ? "#ecfdf5" : oldAdditionalPayable > 0 ? "#fef2f2" : "#f8fafc",
                    border: oldRefund > 0 ? "1.5px solid #a7f3d0" : oldAdditionalPayable > 0 ? "1.5px solid #fecaca" : "1.5px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "800",
                        color: oldRefund > 0 ? "#166534" : oldAdditionalPayable > 0 ? "#991b1b" : "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      {oldRefund > 0 ? "Refund Due" : oldAdditionalPayable > 0 ? "Tax Payable" : "Balance"}
                    </div>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "800",
                        color: oldRefund > 0 ? "#15803d" : oldAdditionalPayable > 0 ? "#dc2626" : "#334155",
                      }}
                    >
                      {oldRefund > 0 ? "Refund to Account" : oldAdditionalPayable > 0 ? "Tax Payable" : "Zero Balance"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: oldRefund > 0 ? "#166534" : oldAdditionalPayable > 0 ? "#dc2626" : "#334155",
                    }}
                  >
                    {oldRefund > 0 ? fmt(oldRefund) : oldAdditionalPayable > 0 ? fmt(oldAdditionalPayable) : "₹0"}
                  </div>
                </div>
              </div>
            </div>
          </CCol>
        </CRow>

        {/* ════════════════ 3. OPTIMAL CHOICE BANNER ════════════════ */}
        <div
          style={{
            background:
              chosenRegime === recommendedRegime
                ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: `1.5px solid ${chosenRegime === recommendedRegime ? "#86efac" : "#fde68a"}`,
            borderRadius: "14px",
            padding: "18px 24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: chosenRegime === recommendedRegime ? "#166534" : "#92400e",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {chosenRegime === recommendedRegime ? (
                <>
                  <CheckCircle2 size={13} /> Optimal Choice Selected
                </>
              ) : (
                <>
                  <TrendingDown size={13} /> You Can Save More By Switching
                </>
              )}
            </div>
            <div style={{ fontWeight: "900", fontSize: "18px", color: "#0f172a", marginTop: "4px" }}>
              {taxDifference > 0
                ? `${recommendedRegime === "new" ? "New Tax Regime" : "Old Tax Regime"} saves you ${fmt(taxDifference)} more in tax`
                : "Both regimes result in the identical tax liability"}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: "3px" }}>
              {hasRefundBoth ? (
                <>
                  Optimal Refund:{" "}
                  <strong style={{ color: "#15803d" }}>
                    {fmt(recommendedRegime === "new" ? newRefund : oldRefund)}
                  </strong>
                  &nbsp;vs other option:{" "}
                  <strong style={{ color: "#64748b" }}>
                    {fmt(recommendedRegime === "new" ? oldRefund : newRefund)}
                  </strong>
                </>
              ) : (
                <>
                  Optimal Liability:{" "}
                  <strong style={{ color: "#15803d" }}>
                    {fmt(recommendedRegime === "new" ? newTaxPayable : oldTaxPayable)}
                  </strong>
                  &nbsp;vs other option:{" "}
                  <strong style={{ color: "#64748b" }}>
                    {fmt(recommendedRegime === "new" ? oldTaxPayable : newTaxPayable)}
                  </strong>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              Verified Calculation
            </div>
            <div
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                fontSize: "12px",
                fontWeight: "800",
                padding: "6px 14px",
                borderRadius: "10px",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ShieldCheck size={14} color="#1d4ed8" /> Engine Verified — AY 2026-27 Rules
            </div>
          </div>
        </div>

        {/* ════════════════ 4. DETAILED TAX COMPUTATION SECTION (COLLAPSIBLE) ════════════════ */}
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => setShowDetailedComputation((prev) => !prev)}
            style={{
              width: "100%",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px 20px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calculator size={18} color="#1d4ed8" />
              <span style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                Detailed Tax Computation &amp; Deductions Bifurcation
              </span>
              <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                Itemized Breakdown
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: "700", fontSize: "13px" }}>
              <span>{showDetailedComputation ? "Hide Details" : "Show Full Breakdown"}</span>
              {showDetailedComputation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showDetailedComputation && (
            <div
              style={{
                marginTop: "12px",
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "24px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
              }}
            >
              {/* Itemized Deductions & Exemptions Table */}
              <h5 style={{ fontWeight: "800", color: "#0f172a", fontSize: "15px", marginBottom: "12px" }}>
                📋 1. Deductions &amp; Exemptions Bifurcation
              </h5>
              <div style={{ overflowX: "auto", marginBottom: "24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", border: "1px solid #e2e8f0" }}>Deduction / Exemption Head</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0", color: "#2563eb" }}>New Regime</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0", color: "#16a34a" }}>Old Regime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Standard Deduction (Sec 16(ia))</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>{fmt(newStdDeduction)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>{fmt(oldStdDeduction)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Professional Tax (Sec 16(iii))</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#94a3b8" }}>₹0 (Disallowed)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: oldPt > 0 ? "#16a34a" : "#475569" }}>{fmt(oldPt)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>HRA Rent Exemption (Sec 10(13A))</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#94a3b8" }}>₹0 (Disallowed)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: oldHra > 0 ? "#16a34a" : "#475569" }}>{fmt(oldHra)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Section 80C (PPF / EPF / ELSS / LIC / Tuition)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#94a3b8" }}>₹0 (Disallowed)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: oldSec80c > 0 ? "#16a34a" : "#475569" }}>{fmt(oldSec80c)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Section 80D (Health Insurance Mediclaim)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#94a3b8" }}>₹0 (Disallowed)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: oldSec80d > 0 ? "#16a34a" : "#475569" }}>{fmt(oldSec80d)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Employer NPS Contribution (Sec 80CCD(2))</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: newEmployerNps > 0 ? "#16a34a" : "#475569" }}>{fmt(newEmployerNps)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: oldEmployerNps > 0 ? "#16a34a" : "#475569" }}>{fmt(oldEmployerNps)}</td>
                    </tr>
                    {oldSec24b > 0 && (
                      <tr>
                        <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Home Loan Interest (Sec 24(b))</td>
                        <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#94a3b8" }}>₹0 (Disallowed)</td>
                        <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>{fmt(oldSec24b)}</td>
                      </tr>
                    )}
                    <tr style={{ background: "#f8fafc", fontWeight: "800" }}>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", color: "#0f172a" }}>Total Deductions (A)</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#2563eb", fontSize: "14px" }}>{fmt(totalNewDeductions)}</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#16a34a", fontSize: "14px" }}>{fmt(totalOldDeductions)}</td>
                    </tr>
                    <tr style={{ background: "#eff6ff", fontWeight: "800" }}>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", color: "#142B46" }}>Net Taxable Income (Total Income − A)</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#142B46", fontSize: "14px" }}>{fmt(newTaxableIncome)}</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#142B46", fontSize: "14px" }}>{fmt(oldTaxableIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Slab & Rate Calculation Breakdown */}
              <h5 style={{ fontWeight: "800", color: "#0f172a", fontSize: "15px", marginBottom: "12px" }}>
                🧮 2. Tax Computation &amp; Slabs
              </h5>
              <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", border: "1px solid #e2e8f0" }}>Component</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0", color: "#2563eb" }}>New Regime</th>
                      <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0", color: "#16a34a" }}>Old Regime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                        Tax on Normal Income (per applicable slab)
                      </td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(newComputation.slabTax)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(oldComputation.slabTax)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0" }}>Rebate u/s 87A</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: newComputation.rebate87a > 0 ? "#16a34a" : "#64748b" }}>
                        {newComputation.rebate87a > 0 ? `−${fmt(newComputation.rebate87a)} (Income ≤ ₹12L)` : "NIL"}
                      </td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: oldComputation.rebate87a > 0 ? "#16a34a" : "#64748b" }}>
                        {oldComputation.rebate87a > 0 ? `−${fmt(oldComputation.rebate87a)} (Income ≤ ₹5L)` : "NIL"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0" }}>Surcharge &amp; Marginal Relief</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmt(newComputation.surchargeInfo?.amount || 0)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmt(oldComputation.surchargeInfo?.amount || 0)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0" }}>Health &amp; Education Cess (4%)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(newComputation.cess)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(oldComputation.cess)}</td>
                    </tr>
                    <tr style={{ background: "#f8fafc", fontWeight: "800" }}>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0" }}>Total Tax Payable</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#dc2626", fontSize: "14px" }}>{fmt(newTaxPayable)}</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#dc2626", fontSize: "14px" }}>{fmt(oldTaxPayable)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0" }}>TDS Deposited / Prepaid Taxes (26AS)</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#142B46", fontWeight: "700" }}>{fmt(actualTds)}</td>
                      <td style={{ padding: "10px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: "#142B46", fontWeight: "700" }}>{fmt(actualTds)}</td>
                    </tr>
                    <tr style={{ background: "#eff6ff", fontWeight: "900" }}>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", color: "#0f172a" }}>Net Refund / (Tax Due)</td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: newRefund > 0 ? "#16a34a" : newAdditionalPayable > 0 ? "#dc2626" : "#334155", fontSize: "15px" }}>
                        {newRefund > 0 ? `+ ${fmt(newRefund)} Refund` : newAdditionalPayable > 0 ? `− ${fmt(newAdditionalPayable)} Due` : "₹0"}
                      </td>
                      <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", color: oldRefund > 0 ? "#16a34a" : oldAdditionalPayable > 0 ? "#dc2626" : "#334155", fontSize: "15px" }}>
                        {oldRefund > 0 ? `+ ${fmt(oldRefund)} Refund` : oldAdditionalPayable > 0 ? `− ${fmt(oldAdditionalPayable)} Due` : "₹0"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════ 5. INFO BOX — CAN YOU SWITCH REGIMES ════════════════ */}
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px solid #cbd5e1",
            borderRadius: "14px",
            padding: "18px 22px",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontWeight: "800", color: "#142B46", fontSize: "14px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
            <HelpCircle size={16} /> Can you switch regimes whenever you want?
          </div>
          <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.7" }}>
            <strong>Yes!</strong> As a salaried employee (with no business income), you can freely switch between
            the New and Old regimes <strong>every single financial year</strong> directly while filing your return. You
            do <strong>not</strong> need Form 10-IEA. Just make sure to submit your return on or before the July 31 due date.
          </div>
        </div>

        {/* ════════════════ 6. ACTION BUTTONS ════════════════ */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
          <CButton
            color="secondary"
            variant="outline"
            onClick={onBack}
            style={{
              padding: "10px 22px",
              fontWeight: "700",
              borderRadius: "8px",
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ArrowLeft size={16} /> {backText || "Back to Deductions"}
          </CButton>

          <div className="d-flex align-items-center gap-3">
            {!chosenRegime && (
              <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: "700" }}>
                * Please click on one of the cards to select your regime
              </span>
            )}

            <button
              disabled={!chosenRegime}
              onClick={onContinue}
              style={{
                background: chosenRegime ? "#0A8E4B" : "#94a3b8",
                border: "none",
                color: "#ffffff",
                fontWeight: "800",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "14px",
                cursor: chosenRegime ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: chosenRegime ? "0 2px 10px rgba(10, 142, 75, 0.25)" : "none",
                transition: "all 0.2s ease-in-out",
              }}
            >
              {continueText || "Review & Finalize Filing"} <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
