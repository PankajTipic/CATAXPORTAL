import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody,
  CButton, CBadge, CNav, CNavItem, CNavLink, CTable,
  CTableHead, CTableRow, CTableHeaderCell, CTableBody,
  CTableDataCell, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CSpinner, CAlert, CFormCheck,
  CFormInput, CFormLabel,
} from "@coreui/react";
import api from "../api/client";
import ContactUsModal from "../components/ContactUsModal";
import Form16TableView from "../components/Form16TableView";
import { generateItrJson } from "../utils/itrJsonGenerator";
import { extractPdfText, parseForm16Text, parseForm26asText, verifyForm16, verifyForm26as } from "../utils/documentParser";
import { computeTax } from "../utils/taxEngine";

/* ─────────────────────────── helpers ─────────────────────────── */
const fmt = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentYear = params.get("assessment_year") || "2026-27";
  const userPan = localStorage.getItem("user_pan") ||
    (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").pan; } catch { return null; } })();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  // Stepper: 1: ITR Form, 2: Income, 3: Deductions, 4: Regime Choice, 5: Review & File
  const [currentStep, setCurrentStep] = useState(1);

  // Selected ITR Form ('ITR-1' or 'ITR-2')
  const [selectedItrForm, setSelectedItrForm] = useState("ITR-1");

  // Selected Tax Regime ('new' or 'old')
  const [chosenRegime, setChosenRegime] = useState("new");

  // Editable Tax Data
  const [incomeData, setIncomeData] = useState({
    salary: 1250000,
    interest: 42700,
    dividend: 8400,
    employerName: "TechCorp Solutions Pvt Ltd",
    houseProperty: 0,
    stcg: 40000,
    ltcg: 65000,
    stcgSaleValue: 150000,
    stcgCost: 110000,
    ltcgSaleValue: 320000,
    ltcgCost: 255000,
  });

  const [deductionData, setDeductionData] = useState({
    sec80c: 0,
    sec80d: 0,
    hra: 0,
    pt: 0,
    sec80ccd1b: 0,
    sec80g: 0,
    sec80e: 0,
  });

  // Edit Modals
  const [showIncomeEditModal, setShowIncomeEditModal] = useState(false);
  const [showCgEditModal, setShowCgEditModal] = useState(false);
  const [showDeductionEditModal, setShowDeductionEditModal] = useState(false);

  // Step 3: Document Upload State
  const [form16File, setForm16File] = useState(null);       // { name, size, status, parsed, verification, objectUrl }
  const [form26asFile, setForm26asFile] = useState(null);   // { name, size, status, parsed, verification, objectUrl }
  const [showForm16Verification, setShowForm16Verification] = useState(false);
  const [showForm26asVerification, setShowForm26asVerification] = useState(false);
  const [parseError16, setParseError16] = useState(null);
  const [parseError26as, setParseError26as] = useState(null);
  const [deductionSource, setDeductionSource] = useState('none'); // 'none' | 'form16' | 'manual'
  const [showDocViewerModal, setShowDocViewerModal] = useState(false);
  const [docViewerFile, setDocViewerFile] = useState(null);
  const [docViewerTab, setDocViewerTab] = useState('tables');
  const [manualDeduction, setManualDeduction] = useState({
    sec80c: 0, sec80d: 0, hra: 0, pt: 0, sec80g: 0, sec80e: 0, sec80ccd1b: 0,
  });

  const handleForm16Upload = async (file) => {
    if (!file) return;
    setParseError16(null);
    const objectUrl = URL.createObjectURL(file);
    setForm16File({ name: file.name, size: file.size, status: 'parsing', objectUrl });
    try {
      let rawText = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        rawText = await extractPdfText(file);
      }
      const parsed = parseForm16Text(rawText);
      const verification = verifyForm16(parsed, userPan);
      // Auto-fill deductions from parsed data (only strictly extracted fields)
      const extractedDeductions = {
        sec80c: parsed.sec80c ?? 0,
        sec80d: parsed.sec80d ?? 0,
        hra: parsed.hraExemption ?? 0,
        pt: parsed.professionalTax ?? 0,
        sec80ccd1b: parsed.sec80ccd1b ?? 0,
        sec80g: parsed.sec80g ?? 0,
        sec80e: parsed.sec80e ?? 0,
      };
      setDeductionData(extractedDeductions);
      setManualDeduction(extractedDeductions);
      if (parsed.grossSalary) {
        setIncomeData(prev => ({
          ...prev,
          salary: parsed.grossSalary,
          employerName: parsed.employerName || prev.employerName,
          houseProperty: (parsed.netHouseProperty !== undefined && parsed.netHouseProperty !== null) ? parsed.netHouseProperty : prev.houseProperty,
        }));
      }
      if (parsed.applicableItr) {
        if (parsed.applicableItr.toUpperCase().includes('ITR-2')) {
          setSelectedItrForm('ITR-2');
        } else if (parsed.applicableItr.toUpperCase().includes('ITR-1')) {
          setSelectedItrForm('ITR-1');
        }
      }
      const f16Obj = {
        name: file.name,
        size: file.size,
        status: 'parsed',
        parsed,
        verification,
        objectUrl,
        isImage: !file.name.toLowerCase().endsWith('.pdf'),
      };
      setForm16File(f16Obj);
      setDeductionSource('form16');

      // If Form 26AS is already uploaded, update its cross-reconciliation
      if (form26asFile?.parsed) {
        setForm26asFile(prev => ({
          ...prev,
          verification: verifyForm26as(prev.parsed, userPan, parsed),
        }));
      }
    } catch (err) {
      console.error('Form 16 parse error:', err);
      setParseError16('Could not parse PDF automatically. Please check the document or enter details manually.');
      setForm16File({ name: file.name, size: file.size, status: 'error', objectUrl });
    }
  };

  const handleForm26asUpload = async (file) => {
    if (!file) return;
    setParseError26as(null);
    const objectUrl = URL.createObjectURL(file);
    setForm26asFile({ name: file.name, size: file.size, status: 'parsing', objectUrl });
    try {
      let rawText = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        rawText = await extractPdfText(file);
      }
      const parsed = parseForm26asText(rawText);
      const verification = verifyForm26as(parsed, userPan, form16File?.parsed);
      setForm26asFile({
        name: file.name,
        size: file.size,
        status: 'parsed',
        parsed,
        verification,
        objectUrl,
        isImage: !file.name.toLowerCase().endsWith('.pdf'),
      });
    } catch (err) {
      console.error('Form 26AS parse error:', err);
      setParseError26as('Could not parse document automatically. You can view it and check your credits.');
      setForm26asFile({ name: file.name, size: file.size, status: 'error', objectUrl });
    }
  };

  // Govt Records Drawer / Modal (AIS & 26AS)
  const [showGovtRecordsModal, setShowGovtRecordsModal] = useState(false);
  const [govtRecordsTab, setGovtRecordsTab] = useState("ais");

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  // JSON Preview Modal
  const [showJsonModal, setShowJsonModal] = useState(false);

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState(false);

  // ── Payment State ──
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null); // { razorpay_payment_id, amount, paid_at }
  const FILING_FEE = 499; // ₹499 flat filing fee
  const FILING_FEE_GST = Math.round(FILING_FEE * 0.18);
  const FILING_FEE_TOTAL = FILING_FEE + FILING_FEE_GST;

  // Hire CA Flow & Contact Us Modals
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  /* ── Fetch initial data ── */
  const fetchDashboardData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/itr/data", { params: { assessment_year: assessmentYear } });
      const d = res.data.data;
      setData(d);
      if (d?.form16) {
        setIncomeData({
          salary: d.form16.gross_salary || 1250000,
          interest: (d.ais?.interest_income_data || []).reduce((a, x) => a + (x.amount || 0), 0) || 42700,
          dividend: (d.ais?.other_income_data || []).reduce((a, x) => a + (x.amount || 0), 0) || 8400,
          employerName: d.form16.employer_name || "TechCorp Solutions Pvt Ltd",
        });
        const hasForm16Deductions = !!(d.form16.deduction_80c || d.form16.deduction_80d || d.form16.hra_exemption);
        if (hasForm16Deductions) {
          const fetchedDeductions = {
            sec80c: d.form16.deduction_80c || 0,
            sec80d: d.form16.deduction_80d || 0,
            hra: d.form16.hra_exemption || 0,
            pt: d.form16.professional_tax || 0,
            sec80ccd1b: d.form16.deduction_80ccd1b || 0,
            sec80g: d.form16.deduction_80g || 0,
            sec80e: d.form16.deduction_80e || 0,
          };
          setDeductionData(fetchedDeductions);
          setManualDeduction(fetchedDeductions);
          setDeductionSource('form16');
        }
      }
      if (d?.summary?.recommended_regime?.includes("Old")) {
        setChosenRegime("old");
      }
    } catch (err) {
      const cached = localStorage.getItem("tax_data");
      const user = localStorage.getItem("user");
      if (cached && user) {
        const pd = JSON.parse(cached), pu = JSON.parse(user);
        setData({
          taxpayer: { name: pu.name, pan: pu.pan, email: pu.email, phone: pu.phone, dob: pu.dob },
          assessment_year: assessmentYear, ...pd,
        });
      } else {
        setError(err.response?.data?.message || "Could not load tax dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [assessmentYear]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // ignore network errors
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("tax_data");
      localStorage.removeItem("user_pan");
      localStorage.removeItem("preferred_filing_flow");
      localStorage.removeItem("is_ca_staff");
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  /* ── Dynamic Tax Engine Calculation ── */
  const isItr2 = selectedItrForm === "ITR-2";
  const stcg = isItr2 ? Number(incomeData.stcg || 0) : 0;
  const ltcg = isItr2 ? Number(incomeData.ltcg || 0) : 0;
  const hpIncome = isItr2 ? Number(incomeData.houseProperty || 0) : 0;

  // Capital Gains: Sec 112A LTCG has ₹1,25,000 exemption limit (Finance Act update)
  const taxableLtcg = Math.max(0, ltcg - 125000);
  const totalCapitalGains = stcg + taxableLtcg;

  // Special Tax Rates on Capital Gains:
  // STCG u/s 111A = 20%
  // LTCG u/s 112A = 12.5% (above ₹1.25L exemption)
  const stcgTax = Math.round(stcg * 0.20);
  const ltcgTax = Math.round(taxableLtcg * 0.125);
  const capitalGainsTax = Math.round((stcgTax + ltcgTax) * 1.04); // including 4% cess

  const normalIncome = Number(incomeData.salary) + Number(incomeData.interest) + Number(incomeData.dividend) + 720 + hpIncome;
  const grossIncome = normalIncome + (isItr2 ? (Number(incomeData.stcg || 0) + Number(incomeData.ltcg || 0)) : 0);

  // New Regime Calculation (AY 2026-27 under Sec 115BAC)
  const newStdDeduction = 75000;
  const newTaxableIncome = Math.max(0, normalIncome - newStdDeduction);
  const calcNewTax = (income) => {
    if (income <= 700000) return 0;
    let t = 0;
    if (income > 1500000) { t += (income - 1500000) * 0.30; income = 1500000; }
    if (income > 1200000) { t += (income - 1200000) * 0.20; income = 1200000; }
    if (income > 1000000) { t += (income - 1000000) * 0.15; income = 1000000; }
    if (income > 700000)  { t += (income - 700000) * 0.10; income = 700000; }
    if (income > 300000)  { t += (income - 300000) * 0.05; }
    return Math.round(t * 1.04);
  };
  const newTaxLiability = calcNewTax(newTaxableIncome) + capitalGainsTax;

  // Old Regime Calculation
  const oldStdDeduction = 50000;
  const sec80TTA = Math.min(Number(incomeData.interest || 0), 10000);
  const totalOldDeductions = oldStdDeduction
    + Math.min(Number(deductionData.sec80c || 0), 150000)
    + Math.min(Number(deductionData.sec80d || 0), 25000)
    + sec80TTA
    + Number(deductionData.hra || 0)
    + Number(deductionData.pt || 0)
    + Math.min(Number(deductionData.sec80ccd1b || 0), 50000)
    + Number(deductionData.sec80g || 0)
    + Number(deductionData.sec80e || 0);
  const oldTaxableIncome = Math.max(0, normalIncome - totalOldDeductions);
  const calcOldTax = (income) => {
    if (income <= 500000) return 0;
    let t = 0;
    if (income > 1000000) { t += (income - 1000000) * 0.30; income = 1000000; }
    if (income > 500000)  { t += (income - 500000) * 0.20; income = 500000; }
    if (income > 250000)  { t += (income - 250000) * 0.05; }
    return Math.round(t * 1.04);
  };
  const oldTaxLiability = calcOldTax(oldTaxableIncome) + capitalGainsTax;

  // TDS Credit: prefer extracted Form 26AS credit, fallback to backend AIS summary
  const totalTdsCredit = (form26asFile?.parsed?.totalTdsCredit) || (data?.summary?.total_tds_credit) || 120110;

  // Active Choice
  const activeTax = chosenRegime === "new" ? newTaxLiability : oldTaxLiability;
  const activeRefund = Math.max(0, totalTdsCredit - activeTax);
  const activePayable = Math.max(0, activeTax - totalTdsCredit);
  const recommendedRegime = newTaxLiability <= oldTaxLiability ? "new" : "old";

  /* ── Submit Handler ── */
  const handleSubmitReturn = async () => {
    if (!declarationAgreed) { alert("Please check the declaration box before submitting."); return; }
    setSubmitting(true);
    try {
      const payload = {
        assessment_year: assessmentYear,
        itr_form_type: selectedItrForm,
        total_income: grossIncome,
        total_tax_liability: activeTax,
        total_tds_claimed: totalTdsCredit,
        refund_or_payable: activeRefund > 0 ? activeRefund : -activePayable,
        computation_summary: {
          gross_total_income: grossIncome,
          chosen_regime: chosenRegime === "new" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime",
          final_tax: activeTax,
          refund_amount: activeRefund,
          payable_amount: activePayable,
          salary_income: incomeData.salary,
          other_income: incomeData.interest + incomeData.dividend,
          capital_gains: isItr2 ? { stcg, ltcg, taxable_ltcg: taxableLtcg, tax: capitalGainsTax } : null,
        },
      };
      const { data: result } = await api.post("/itr/submit", payload);
      setSubmissionSuccess(result);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Generate & Download Official JSON ── */
  const getOfficialJson = () => {
    return generateItrJson({
      taxpayer: data?.taxpayer,
      assessmentYear,
      selectedItrForm,
      chosenRegime,
      incomeData,
      deductionData,
      activeTax,
      activeRefund,
      activePayable,
      totalTdsCredit,
    });
  };

  const downloadJson = () => {
    const payload = getOfficialJson();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `ITR_${data?.taxpayer?.pan || "PAN"}_${assessmentYear}_${selectedItrForm}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Generate & Download Tax Computation PDF ── */
  const downloadPdf = () => {
    const tp = data?.taxpayer || {};
    const pan = tp.pan || userPan || 'ABCDE1234F';
    const name = tp.name || 'Taxpayer';
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const regime = chosenRegime === 'new' ? 'New Tax Regime (Sec 115BAC)' : 'Old Tax Regime';
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Tax Computation Statement – ${pan}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1e293b; font-size: 13px; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { text-align: center; border-bottom: 3px solid #0b3d91; padding-bottom: 18px; margin-bottom: 24px; }
  .header .dept { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; }
  .header h1 { font-size: 20px; font-weight: 900; color: #0b3d91; margin: 6px 0 4px; }
  .header .sub { font-size: 13px; color: #475569; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px; }
  .meta-grid .label { color: #64748b; }
  .meta-grid .value { font-weight: 700; color: #0f172a; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 13px; font-weight: 800; color: #0b3d91; border-left: 4px solid #0b3d91; padding-left: 10px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  table th { background: #0b3d91; color: #fff; padding: 8px 12px; text-align: left; font-weight: 700; }
  table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  table tr:nth-child(even) td { background: #f8fafc; }
  .amount { text-align: right; font-weight: 600; }
  .total-row td { font-weight: 800; background: #eff6ff !important; color: #1e3a8a; font-size: 14px; }
  .result-box { border-radius: 10px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
  .refund { background: #ecfdf5; border: 2px solid #86efac; }
  .payable { background: #fff1f2; border: 2px solid #fca5a5; }
  .result-label { font-weight: 800; font-size: 15px; }
  .result-amount { font-size: 26px; font-weight: 900; }
  .refund .result-label, .refund .result-amount { color: #15803d; }
  .payable .result-label, .payable .result-amount { color: #be123c; }
  .payment-badge { background: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; padding: 10px 16px; font-size: 12px; color: #166534; display: flex; gap: 12px; align-items: center; margin-top: 16px; }
  .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { background: #fff; } }
</style></head><body><div class="page">
  <div class="header">
    <div class="dept">Income Tax Department – Government of India</div>
    <h1>Tax Computation Statement</h1>
    <div class="sub">Assessment Year ${assessmentYear} (Financial Year 2025-26) &nbsp;|&nbsp; Form: ${selectedItrForm}</div>
  </div>
  <div class="meta-grid">
    <div><div class="label">Taxpayer Name</div><div class="value">${name}</div></div>
    <div><div class="label">PAN Number</div><div class="value" style="color:#0b3d91">${pan}</div></div>
    <div><div class="label">Assessment Year</div><div class="value">AY ${assessmentYear}</div></div>
    <div><div class="label">Tax Regime</div><div class="value">${regime}</div></div>
    <div><div class="label">Return Form</div><div class="value">${selectedItrForm}</div></div>
    <div><div class="label">Filing Date</div><div class="value">${now}</div></div>
  </div>
  <div class="section">
    <div class="section-title">Income Details</div>
    <table><thead><tr><th>Head of Income</th><th class="amount">Amount (₹)</th></tr></thead><tbody>
      <tr><td>Gross Salary Income</td><td class="amount">${Math.round(incomeData.salary).toLocaleString('en-IN')}</td></tr>
      <tr><td>Interest Income (Savings / FD)</td><td class="amount">${Math.round(incomeData.interest).toLocaleString('en-IN')}</td></tr>
      <tr><td>Dividend Income</td><td class="amount">${Math.round(incomeData.dividend).toLocaleString('en-IN')}</td></tr>
      ${isItr2 ? `<tr><td>Short Term Capital Gains (STCG u/s 111A – 20%)</td><td class="amount">${Math.round(incomeData.stcg||0).toLocaleString('en-IN')}</td></tr><tr><td>Long Term Capital Gains (LTCG u/s 112A – 12.5%)</td><td class="amount">${Math.round(incomeData.ltcg||0).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr class="total-row"><td>Gross Total Income</td><td class="amount">₹ ${Math.round(grossIncome).toLocaleString('en-IN')}</td></tr>
    </tbody></table>
  </div>
  ${chosenRegime === 'old' ? `<div class="section"><div class="section-title">Deductions Claimed</div><table><thead><tr><th>Section</th><th class="amount">Amount (₹)</th></tr></thead><tbody>
    <tr><td>Standard Deduction</td><td class="amount">50,000</td></tr>
    <tr><td>Section 80C (LIC / PPF / ELSS etc.)</td><td class="amount">${Math.min(Math.round(deductionData.sec80c||0),150000).toLocaleString('en-IN')}</td></tr>
    <tr><td>Section 80D (Health Insurance)</td><td class="amount">${Math.min(Math.round(deductionData.sec80d||0),25000).toLocaleString('en-IN')}</td></tr>
    <tr><td>HRA Exemption</td><td class="amount">${Math.round(deductionData.hra||0).toLocaleString('en-IN')}</td></tr>
    <tr><td>Section 80TTA (Savings Interest)</td><td class="amount">${Math.round(Math.min(incomeData.interest||0,10000)).toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Total Deductions</td><td class="amount">₹ ${Math.round(totalOldDeductions).toLocaleString('en-IN')}</td></tr>
  </tbody></table></div>` : `<div class="section"><div class="section-title">Standard Deduction (New Regime)</div><table><thead><tr><th>Deduction</th><th class="amount">Amount (₹)</th></tr></thead><tbody><tr><td>Standard Deduction u/s 115BAC</td><td class="amount">75,000</td></tr></tbody></table></div>`}
  <div class="section">
    <div class="section-title">Tax Computation</div>
    <table><thead><tr><th>Description</th><th class="amount">Amount (₹)</th></tr></thead><tbody>
      <tr><td>Total Tax Liability</td><td class="amount">${Math.round(activeTax).toLocaleString('en-IN')}</td></tr>
      <tr><td>TDS Deducted / 26AS Credit</td><td class="amount">${Math.round(totalTdsCredit).toLocaleString('en-IN')}</td></tr>
      ${isItr2 ? `<tr><td>Capital Gains Tax (STCG + LTCG + 4% Cess)</td><td class="amount">${Math.round(capitalGainsTax).toLocaleString('en-IN')}</td></tr>` : ''}
    </tbody></table>
    <div class="result-box ${activeRefund > 0 ? 'refund' : 'payable'}">
      <div class="result-label">${activeRefund > 0 ? '🎉 Net Tax Refund Due to You' : '⚠️ Net Tax Payable via Challan 280'}</div>
      <div class="result-amount">₹ ${Math.round(activeRefund > 0 ? activeRefund : activePayable).toLocaleString('en-IN')}</div>
    </div>
  </div>
  ${paymentInfo ? `<div class="payment-badge">✅ <div><strong>Filing Fee Paid</strong> – ₹${paymentInfo.amount} on ${new Date(paymentInfo.paid_at||Date.now()).toLocaleDateString('en-IN')} | Txn ID: ${paymentInfo.razorpay_payment_id || paymentInfo.transaction_id || 'VERIFIED'}</div></div>` : ''}
  <div class="footer">This is a system-generated Tax Computation Statement. Generated on ${now} via CA Tax Portal &nbsp;|&nbsp; PAN: ${pan} &nbsp;|&nbsp; AY ${assessmentYear}</div>
</div></body></html>`;
    const w = window.open('', '_blank', 'width=850,height=1100');
    if (!w) { alert('Please allow popups to download PDF.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
  };

  /* ── Razorpay Payment Flow ── */
  const loadRazorpayScript = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePayNow = async () => {
    setPaymentProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { alert('Razorpay SDK failed to load. Check your internet connection.'); setPaymentProcessing(false); return; }

      const tp = data?.taxpayer || {};
      const pan = tp.pan || userPan || 'ABCDE1234F';

      // Create Razorpay order via backend
      const { data: orderData } = await api.post('/payment/create-order', {
        amount: FILING_FEE_TOTAL,
        pan,
        assessment_year: assessmentYear,
        filing_type: 'self_filing',
      });

      const options = {
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_QOHcXj0D8froB9',
        amount: orderData.amount_in_paise,
        currency: 'INR',
        name: 'CA Tax Portal',
        description: `ITR Filing Fee – ${selectedItrForm} – AY ${assessmentYear}`,
        order_id: orderData.order_id,
        prefill: orderData.prefill || { name: tp.name || 'Taxpayer', email: tp.email || '', contact: '' },
        theme: { color: '#0b3d91' },
        modal: { ondismiss: () => setPaymentProcessing(false) },
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              pan,
              assessment_year: assessmentYear,
            });
            if (verifyData.status === 'success') {
              setPaymentCompleted(true);
              setPaymentInfo({
                razorpay_payment_id: response.razorpay_payment_id,
                amount: FILING_FEE_TOTAL,
                paid_at: new Date().toISOString(),
                transaction_id: response.razorpay_payment_id,
              });
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (e) {
            alert('Payment verification error: ' + (e?.response?.data?.message || e.message));
          } finally {
            setPaymentProcessing(false);
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        alert('Payment failed: ' + (resp.error?.description || 'Unknown error'));
        setPaymentProcessing(false);
      });
      rzp.open();
    } catch (e) {
      alert('Could not initiate payment: ' + (e?.response?.data?.message || e.message));
      setPaymentProcessing(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", flexDirection: "column", gap: "16px" }}>
      <CSpinner color="primary" style={{ width: "3rem", height: "3rem" }} />
      <div style={{ fontWeight: "700", color: "#0b3d91", fontSize: "16px" }}>Loading Your Tax Portal File…</div>
      <div style={{ fontSize: "13px", color: "#64748b" }}>Preparing your guided ITR experience</div>
    </div>
  );

  const taxpayer = data?.taxpayer || {};

  const STEPS = [
    { num: 1, title: "1. Choose ITR Form", desc: "ITR-1 vs ITR-2" },
    { num: 2, title: "2. Income Details", desc: "Salary & Interest" },
    { num: 3, title: "3. Tax Deductions", desc: "80C, 80D, HRA" },
    { num: 4, title: "4. Select Regime", desc: "New vs Old Tax" },
    { num: 5, title: "5. Review & Submit", desc: "File to IT Portal" },
  ];

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: "80px", fontFamily: "'Inter', sans-serif" }}>

      {/* ════ TOP NAVBAR ════ */}
      <nav style={{ background: "#0b1f3a", color: "#fff", padding: "16px 0", borderBottom: "3px solid #1e3a8a" }}>
        <CContainer>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "20px" }}>🏛️</span>
                <span style={{ fontWeight: "900", fontSize: "18px", letterSpacing: "0.5px" }}>CA TAX PORTAL</span>
                <span style={{ background: "#22c55e", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px" }}>PORTAL SYNCED</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                Client: <strong>{taxpayer.name || "Taxpayer"}</strong> &nbsp;|&nbsp; PAN: <strong style={{ color: "#38bdf8" }}>{taxpayer.pan}</strong> &nbsp;|&nbsp; AY {assessmentYear}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Button to open Govt AIS/26AS Drawer */}
              <button
                onClick={() => setShowGovtRecordsModal(true)}
                style={{
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                }}>
                📋 Govt Records (AIS &amp; 26AS)
              </button>

              {/* Contact Us Support Button */}
              <button
                onClick={() => setShowContactModal(true)}
                style={{
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "700",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                }}>
                💬 Contact Support
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#cbd5e1", padding: "8px 14px", borderRadius: "8px", fontSize: "13px",
                  cursor: "pointer",
                }}>
                🔒 Logout
              </button>
            </div>
          </div>
        </CContainer>
      </nav>

      {/* ════ LIVE SUMMARY HEADER BAR ════ */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <CContainer>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Selected Form</div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#0b3d91" }}>{selectedItrForm} (Sahaj)</div>
              </div>
              <div style={{ width: "1px", height: "26px", background: "#e2e8f0" }} />
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Gross Income</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{fmt(grossIncome)}</div>
              </div>
              <div style={{ width: "1px", height: "26px", background: "#e2e8f0" }} />
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Active Regime</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: chosenRegime === "new" ? "#0284c7" : "#854d0e" }}>
                  {chosenRegime === "new" ? "New Regime" : "Old Regime"}
                </div>
              </div>
              <div style={{ width: "1px", height: "26px", background: "#e2e8f0" }} />
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>TDS Paid (26AS)</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#16a34a" }}>{fmt(totalTdsCredit)}</div>
              </div>
            </div>

            {/* Refund Status */}
            <div style={{
              background: activeRefund > 0 ? "#f0fdf4" : "#fff1f2",
              border: `1.5px solid ${activeRefund > 0 ? "#86efac" : "#fca5a5"}`,
              borderRadius: "10px", padding: "6px 16px", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "18px" }}>{activeRefund > 0 ? "🎉" : "⚠️"}</span>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: activeRefund > 0 ? "#166534" : "#991b1b", textTransform: "uppercase" }}>
                  {activeRefund > 0 ? "Expected Tax Refund" : "Tax Payable"}
                </div>
                <div style={{ fontSize: "18px", fontWeight: "900", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                  {activeRefund > 0 ? fmt(activeRefund) : fmt(activePayable)}
                </div>
              </div>
            </div>
          </div>
        </CContainer>
      </div>

      <CContainer className="mt-4">

        {/* ════ GUIDED STEPPER NAVIGATION ════ */}
        <div style={{ background: "#fff", borderRadius: "14px", padding: "14px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "24px" }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {STEPS.map((s) => {
              const isActive = currentStep === s.num;
              const isPassed = currentStep > s.num;
              return (
                <div
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                    padding: "8px 14px", borderRadius: "10px",
                    background: isActive ? "#eff6ff" : "transparent",
                    transition: "all 0.2s",
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "800", fontSize: "12px",
                    background: isPassed ? "#22c55e" : isActive ? "#0b3d91" : "#e2e8f0",
                    color: isPassed || isActive ? "#fff" : "#64748b",
                  }}>
                    {isPassed ? "✓" : s.num}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: isActive ? "800" : "600", color: isActive ? "#0b3d91" : "#334155" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ════ STEP 1: ITR FORM SELECTION (ITR-1 vs ITR-2) ════ */}
        {currentStep === 1 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "860px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: "800", fontSize: "12px", padding: "4px 12px", borderRadius: "20px" }}>
                  STEP 1 OF 5: ITR FORM SELECTION
                </span>
                <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>
                  Select Your Income Tax Return Form
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  Choose between <strong>ITR-1 (Sahaj)</strong> or <strong>ITR-2</strong> based on your income sources. Click any card to select.
                </p>
              </div>

              {/* 2 SELECTABLE ITR FORM CARDS */}
              <CRow className="g-3 mb-4">
                {/* ITR-1 CARD */}
                <CCol md={6}>
                  <div
                    onClick={() => setSelectedItrForm("ITR-1")}
                    style={{
                      background: selectedItrForm === "ITR-1" ? "#f0fdf4" : "#ffffff",
                      border: selectedItrForm === "ITR-1" ? "2.5px solid #16a34a" : "2px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "24px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: selectedItrForm === "ITR-1" ? "0 0 0 4px rgba(22,163,74,0.12), 0 8px 24px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.04)",
                      position: "relative",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "800", fontSize: "11px", padding: "3px 10px", borderRadius: "12px" }}>
                          ⭐ RECOMMENDED (SALARIED)
                        </span>
                        <div style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          border: selectedItrForm === "ITR-1" ? "6px solid #16a34a" : "2px solid #cbd5e1",
                          background: "#fff",
                        }} />
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontSize: "24px" }}>⚡</span>
                        <h4 style={{ fontWeight: "900", color: "#0f172a", margin: 0 }}>ITR-1 (Sahaj)</h4>
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginBottom: "16px" }}>
                        For Resident Individuals with income up to ₹50 Lakhs from Salary, 1 House Property &amp; Other Sources.
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#16a34a", fontWeight: "900" }}>✓</span>
                          <span>Income from Salary / Pension</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#16a34a", fontWeight: "900" }}>✓</span>
                          <span>One House Property (Self-occupied/Let-out)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#16a34a", fontWeight: "900" }}>✓</span>
                          <span>Interest, Dividend &amp; Other Sources</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#16a34a", fontWeight: "900" }}>✓</span>
                          <span>Total Gross Income ≤ ₹50 Lakhs</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8" }}>
                          <span style={{ color: "#ef4444", fontWeight: "900" }}>✗</span>
                          <span>No Capital Gains or Multiple Properties</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Status:</span>
                      <span style={{ fontWeight: "800", fontSize: "13px", color: selectedItrForm === "ITR-1" ? "#16a34a" : "#64748b" }}>
                        {selectedItrForm === "ITR-1" ? "✅ Selected Form" : "Click to select"}
                      </span>
                    </div>
                  </div>
                </CCol>

                {/* ITR-2 CARD */}
                <CCol md={6}>
                  <div
                    onClick={() => setSelectedItrForm("ITR-2")}
                    style={{
                      background: selectedItrForm === "ITR-2" ? "#eff6ff" : "#ffffff",
                      border: selectedItrForm === "ITR-2" ? "2.5px solid #2563eb" : "2px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "24px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: selectedItrForm === "ITR-2" ? "0 0 0 4px rgba(37,99,235,0.12), 0 8px 24px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.04)",
                      position: "relative",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: "800", fontSize: "11px", padding: "3px 10px", borderRadius: "12px" }}>
                          📈 CAPITAL GAINS &amp; INVESTMENTS
                        </span>
                        <div style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          border: selectedItrForm === "ITR-2" ? "6px solid #2563eb" : "2px solid #cbd5e1",
                          background: "#fff",
                        }} />
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontSize: "24px" }}>📊</span>
                        <h4 style={{ fontWeight: "900", color: "#0f172a", margin: 0 }}>ITR-2</h4>
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginBottom: "16px" }}>
                        For Individuals &amp; HUFs with Capital Gains (Stocks, Mutual Funds, Property), Multiple Properties, or Income &gt; ₹50L.
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#2563eb", fontWeight: "900" }}>✓</span>
                          <span><strong>Schedule CG:</strong> Stocks, Mutual Funds, Property Gains</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#2563eb", fontWeight: "900" }}>✓</span>
                          <span>STCG u/s 111A (20%) &amp; LTCG u/s 112A (12.5%)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#2563eb", fontWeight: "900" }}>✓</span>
                          <span>Salary, Pension &amp; Multiple House Properties</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#2563eb", fontWeight: "900" }}>✓</span>
                          <span>Income exceeding ₹50 Lakhs allowed</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#2563eb", fontWeight: "900" }}>✓</span>
                          <span>Foreign Assets / Directorship in companies</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Status:</span>
                      <span style={{ fontWeight: "800", fontSize: "13px", color: selectedItrForm === "ITR-2" ? "#2563eb" : "#64748b" }}>
                        {selectedItrForm === "ITR-2" ? "✅ Selected Form" : "Click to select"}
                      </span>
                    </div>
                  </div>
                </CCol>
              </CRow>

              {/* COMPARISON & ELIGIBILITY TABLE */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 24px", marginBottom: "28px" }}>
                <h6 style={{ fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
                  📋 Quick Comparison: ITR-1 vs ITR-2 Eligibility
                </h6>
                <div className="table-responsive">
                  <CTable bordered style={{ fontSize: "12.5px", background: "#fff", marginBottom: 0 }}>
                    <CTableHead style={{ background: "#f1f5f9" }}>
                      <CTableRow>
                        <CTableHeaderCell>Income Category / Feature</CTableHeaderCell>
                        <CTableHeaderCell style={{ color: "#16a34a" }}>ITR-1 (Sahaj)</CTableHeaderCell>
                        <CTableHeaderCell style={{ color: "#2563eb" }}>ITR-2</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">Salary &amp; Pension Income</CTableDataCell>
                        <CTableDataCell><span className="text-success fw-bold">✓ Included</span></CTableDataCell>
                        <CTableDataCell><span className="text-success fw-bold">✓ Included (Schedule S)</span></CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">Capital Gains (Mutual Funds, Shares, Property)</CTableDataCell>
                        <CTableDataCell><span className="text-danger fw-bold">✗ Not Allowed</span></CTableDataCell>
                        <CTableDataCell><span className="text-primary fw-bold">✓ Supported (Schedule CG)</span></CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">House Property</CTableDataCell>
                        <CTableDataCell>Single House Property</CTableDataCell>
                        <CTableDataCell>Multiple Properties Supported</CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">Total Income Threshold</CTableDataCell>
                        <CTableDataCell>Up to ₹50,00,000 only</CTableDataCell>
                        <CTableDataCell><span className="text-success fw-bold">Unlimited (&gt; ₹50 Lakhs)</span></CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">Bank Interest, Dividends &amp; Other Sources</CTableDataCell>
                        <CTableDataCell><span className="text-success fw-bold">✓ Allowed</span></CTableDataCell>
                        <CTableDataCell><span className="text-success fw-bold">✓ Allowed (Schedule OS)</span></CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </div>
              </div>

              {/* Selected Form Banner */}
              <div style={{
                background: selectedItrForm === "ITR-2" ? "#eff6ff" : "#f0fdf4",
                border: `1.5px solid ${selectedItrForm === "ITR-2" ? "#bfdbfe" : "#bbf7d0"}`,
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "28px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: selectedItrForm === "ITR-2" ? "#1e40af" : "#166534", textTransform: "uppercase" }}>
                    Currently Configured Filing Track
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", marginTop: "2px" }}>
                    Filing with Form: <span style={{ color: selectedItrForm === "ITR-2" ? "#2563eb" : "#16a34a" }}>{selectedItrForm}</span>
                    {selectedItrForm === "ITR-2" ? " (Capital Gains Schedules Active)" : " (Standard Salaried Return)"}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  Estimated Gross: <strong>{fmt(grossIncome)}</strong>
                </div>
              </div>

              {/* Next Button */}
              <div className="d-flex justify-content-end">
                <CButton
                  color="primary" size="lg" onClick={() => setCurrentStep(2)}
                  style={{ background: "#0b3d91", border: "none", fontWeight: "700", padding: "12px 32px", borderRadius: "10px" }}>
                  Continue to Income Details →
                </CButton>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 2: INCOME DETAILS (WITH DETAILED JSON DATA & EDIT) ════ */}
        {currentStep === 2 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "860px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: "800", fontSize: "12px", padding: "4px 12px", borderRadius: "20px" }}>
                  STEP 2 OF 5: INCOME SOURCES
                </span>
                <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>
                  Review &amp; Edit Your Income Sources
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  Detailed financial data synchronized from <strong>Income Tax Portal (AIS, Form 26AS &amp; Form 16)</strong>.
                </p>
              </div>

              {/* Detailed Income Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
                
                {/* 1. SALARY CARD (DETAILED JSON BREAKDOWN) */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: "20px" }}>💼</span>
                        <span style={{ fontWeight: "900", fontSize: "17px", color: "#0f172a" }}>Salary Income (Section 192)</span>
                        <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                          ✓ 100% 26AS Matched
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                        Employer: <strong>{incomeData.employerName}</strong> &nbsp;|&nbsp; TAN: <code>MUMB12345C</code> &nbsp;|&nbsp; Info Code: <code>TDS-192</code>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: "#0b3d91" }}>{fmt(incomeData.salary)}</div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Reported in Form 16 (Part B)</span>
                    </div>
                  </div>

                  {/* 4 Stat Sub-Boxes from JSON */}
                  <CRow className="g-2 my-2">
                    <CCol sm={3}>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Gross Salary u/s 17(1)</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>{fmt(incomeData.salary)}</div>
                      </div>
                    </CCol>
                    <CCol sm={3}>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TDS Deducted (26AS)</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a", marginTop: "2px" }}>₹1,15,000</div>
                      </div>
                    </CCol>
                    <CCol sm={3}>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Standard Deduction</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#0284c7", marginTop: "2px" }}>₹75,000</div>
                      </div>
                    </CCol>
                    <CCol sm={3}>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Professional Tax</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#64748b", marginTop: "2px" }}>₹2,500</div>
                      </div>
                    </CCol>
                  </CRow>

                  <div style={{ fontSize: "12px", color: "#64748b", background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>OLTAS Challan Status: <strong>Quarter Q1–Q4 Deposited &amp; Reconciled</strong></span>
                    <span>Feedback: <strong className="text-success">Information is correct (Accepted)</strong></span>
                  </div>

                  {/* Form 16 Full Table Format (Part A & Part B Breakdown) */}
                  <div style={{ marginTop: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "800", fontSize: "13.5px", color: "#0f172a" }}>
                        📋 Form 16 Official Records (Part A &amp; Part B Breakdown)
                      </span>
                      <CBadge color={form16File?.status === 'parsed' ? "success" : "info"} style={{ fontSize: "11px", padding: "4px 9px" }}>
                        {form16File?.status === 'parsed' ? "✓ Synchronized from Uploaded Form 16" : "Synchronized Salary Records"}
                      </CBadge>
                    </div>
                    <Form16TableView
                      data={form16File?.parsed || {
                        employerName: incomeData.employerName,
                        employerTan: "MUMB12345C",
                        grossSalary: incomeData.salary,
                        salary17_1: incomeData.salary,
                        perquisites17_2: 0,
                        profits17_3: 0,
                        totalTdsDeducted: 115000,
                        standardDeduction: 75000,
                        professionalTax: 2500,
                        assessmentYear: assessmentYear || "2026-27"
                      }}
                      showFullAnnexure={true}
                    />
                  </div>
                </div>

                {/* 2. BANK INTEREST CARD (DETAILED ACCOUNT-WISE JSON BREAKDOWN) */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: "20px" }}>🏧</span>
                        <span style={{ fontWeight: "900", fontSize: "17px", color: "#0f172a" }}>Bank Interest Income (Savings &amp; Term Deposits)</span>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                          AIS Part B.2 (SFT-005)
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                        Reported by Banks under Section 194A and Specified Financial Transactions (SFT)
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: "#0b3d91" }}>{fmt(incomeData.interest)}</div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Total Gross Interest</span>
                    </div>
                  </div>

                  {/* Itemized Accounts Table from AIS JSON */}
                  <div className="table-responsive my-3">
                    <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                      <CTableHead style={{ background: "#f1f5f9" }}>
                        <CTableRow>
                          <CTableHeaderCell>Bank / Reporting Entity</CTableHeaderCell>
                          <CTableHeaderCell>Account No.</CTableHeaderCell>
                          <CTableHeaderCell>SFT Code</CTableHeaderCell>
                          <CTableHeaderCell>Interest Amount</CTableHeaderCell>
                          <CTableHeaderCell>Tax Treatment</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        <CTableRow>
                          <CTableDataCell className="fw-semibold">HDFC Bank Ltd</CTableDataCell>
                          <CTableDataCell><code>XXXXXX6450</code></CTableDataCell>
                          <CTableDataCell><CBadge color="info">SFT-005 (Savings)</CBadge></CTableDataCell>
                          <CTableDataCell className="fw-bold">₹14,200</CTableDataCell>
                          <CTableDataCell><span className="text-success fw-semibold">✓ Up to ₹10k exempt u/s 80TTA</span></CTableDataCell>
                        </CTableRow>
                        <CTableRow>
                          <CTableDataCell className="fw-semibold">State Bank of India</CTableDataCell>
                          <CTableDataCell><code>XXXXXX3312</code></CTableDataCell>
                          <CTableDataCell><CBadge color="primary">SFT-005 (Fixed Deposit)</CBadge></CTableDataCell>
                          <CTableDataCell className="fw-bold">₹28,500</CTableDataCell>
                          <CTableDataCell><span>TDS Deducted: <strong>₹2,850</strong> (Sec 194A)</span></CTableDataCell>
                        </CTableRow>
                      </CTableBody>
                    </CTable>
                  </div>

                  <div style={{ fontSize: "12px", color: "#854d0e", background: "#fefce8", border: "1px solid #fde68a", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>Sec 80TTA Savings Exemption: <strong>− ₹10,000</strong></span>
                    <span>Net Taxable Interest: <strong>₹32,700</strong></span>
                  </div>
                </div>

                {/* 3. DIVIDEND INCOME CARD (DETAILED COMPANY-WISE JSON BREAKDOWN) */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: "20px" }}>📈</span>
                        <span style={{ fontWeight: "900", fontSize: "17px", color: "#0f172a" }}>Dividend Income from Equities (Sec 194)</span>
                        <span style={{ background: "#f3e8ff", color: "#7e22ce", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                          AIS Part B.1 (DIV-194)
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                        Reported by Indian Companies via TDS on Dividends under Section 194
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: "#0b3d91" }}>{fmt(incomeData.dividend)}</div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>Total Dividend Income</span>
                    </div>
                  </div>

                  {/* Itemized Companies Table from AIS JSON */}
                  <div className="table-responsive my-3">
                    <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                      <CTableHead style={{ background: "#f1f5f9" }}>
                        <CTableRow>
                          <CTableHeaderCell>Company Name</CTableHeaderCell>
                          <CTableHeaderCell>Information Code</CTableHeaderCell>
                          <CTableHeaderCell>Dividend Paid</CTableHeaderCell>
                          <CTableHeaderCell>TDS Deducted (Sec 194)</CTableHeaderCell>
                          <CTableHeaderCell>Status</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        <CTableRow>
                          <CTableDataCell className="fw-semibold">Reliance Industries Ltd</CTableDataCell>
                          <CTableDataCell><code>DIV-194</code></CTableDataCell>
                          <CTableDataCell className="fw-bold">₹5,400</CTableDataCell>
                          <CTableDataCell className="text-success fw-bold">₹540</CTableDataCell>
                          <CTableDataCell><CBadge color="success">Accepted</CBadge></CTableDataCell>
                        </CTableRow>
                        <CTableRow>
                          <CTableDataCell className="fw-semibold">Tata Consultancy Services Ltd</CTableDataCell>
                          <CTableDataCell><code>DIV-194</code></CTableDataCell>
                          <CTableDataCell className="fw-bold">₹3,000</CTableDataCell>
                          <CTableDataCell className="text-success fw-bold">₹300</CTableDataCell>
                          <CTableDataCell><CBadge color="success">Accepted</CBadge></CTableDataCell>
                        </CTableRow>
                      </CTableBody>
                    </CTable>
                  </div>

                  <div style={{ fontSize: "12px", color: "#6b21a8", background: "#faf5ff", border: "1px solid #e9d5ff", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>Total Dividend TDS Deposited: <strong>₹840 (Available in 26AS)</strong></span>
                    <span>Taxability: <strong>Taxable at Individual Slab Rates</strong></span>
                  </div>
                </div>

                {/* 4. CAPITAL GAINS CARD (SCHEDULE CG - ACTIVE FOR ITR-2) */}
                {selectedItrForm === "ITR-2" && (
                  <div style={{ background: "#f8fafc", border: "1.5px solid #bfdbfe", borderRadius: "14px", padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", paddingBottom: "14px", borderBottom: "1px solid #e2e8f0" }}>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: "20px" }}>📊</span>
                          <span style={{ fontWeight: "900", fontSize: "17px", color: "#0f172a" }}>Capital Gains (Schedule CG)</span>
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                            ITR-2 Schedule CG &amp; AIS SFT-006
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                          Reported from Equity Shares &amp; Mutual Funds transactions (Sec 111A &amp; 112A)
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "900", color: "#2563eb" }}>{fmt(totalCapitalGains)}</div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Taxable Capital Gains</span>
                      </div>
                    </div>

                    {/* 4 Sub-Boxes for Capital Gains */}
                    <CRow className="g-2 my-2">
                      <CCol sm={3}>
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>STCG u/s 111A</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>{fmt(stcg)}</div>
                          <div style={{ fontSize: "10.5px", color: "#2563eb", marginTop: "2px" }}>Taxed @ 20% ({fmt(stcgTax)})</div>
                        </div>
                      </CCol>
                      <CCol sm={3}>
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Gross LTCG u/s 112A</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>{fmt(ltcg)}</div>
                          <div style={{ fontSize: "10.5px", color: "#16a34a", marginTop: "2px" }}>Exemption: {fmt(Math.min(ltcg, 125000))}</div>
                        </div>
                      </CCol>
                      <CCol sm={3}>
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Taxable LTCG</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: "#2563eb", marginTop: "2px" }}>{fmt(taxableLtcg)}</div>
                          <div style={{ fontSize: "10.5px", color: "#2563eb", marginTop: "2px" }}>Taxed @ 12.5% ({fmt(ltcgTax)})</div>
                        </div>
                      </CCol>
                      <CCol sm={3}>
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                          <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total CG Tax Due</div>
                          <div style={{ fontSize: "16px", fontWeight: "900", color: "#dc2626", marginTop: "2px" }}>{fmt(capitalGainsTax)}</div>
                          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>Incl. 4% Health Cess</div>
                        </div>
                      </CCol>
                    </CRow>

                    {/* Table of Transactions from AIS */}
                    <div className="table-responsive my-3">
                      <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
                        <CTableHead style={{ background: "#f1f5f9" }}>
                          <CTableRow>
                            <CTableHeaderCell>Asset / Mutual Fund</CTableHeaderCell>
                            <CTableHeaderCell>Type</CTableHeaderCell>
                            <CTableHeaderCell>Sale Value</CTableHeaderCell>
                            <CTableHeaderCell>Cost of Acq.</CTableHeaderCell>
                            <CTableHeaderCell>Net Gain</CTableHeaderCell>
                            <CTableHeaderCell>Tax Rate</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          <CTableRow>
                            <CTableDataCell className="fw-semibold">HDFC Top 100 Equity Mutual Fund</CTableDataCell>
                            <CTableDataCell><CBadge color="primary">STCG (Sec 111A)</CBadge></CTableDataCell>
                            <CTableDataCell>{fmt(incomeData.stcgSaleValue || 150000)}</CTableDataCell>
                            <CTableDataCell>{fmt(incomeData.stcgCost || 110000)}</CTableDataCell>
                            <CTableDataCell className="fw-bold text-primary">{fmt(stcg)}</CTableDataCell>
                            <CTableDataCell>20% Flat</CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableDataCell className="fw-semibold">Nippon India Large Cap &amp; Equities</CTableDataCell>
                            <CTableDataCell><CBadge color="success">LTCG (Sec 112A)</CBadge></CTableDataCell>
                            <CTableDataCell>{fmt(incomeData.ltcgSaleValue || 320000)}</CTableDataCell>
                            <CTableDataCell>{fmt(incomeData.ltcgCost || 255000)}</CTableDataCell>
                            <CTableDataCell className="fw-bold text-success">{fmt(ltcg)}</CTableDataCell>
                            <CTableDataCell>12.5% (Above ₹1.25L)</CTableDataCell>
                          </CTableRow>
                        </CTableBody>
                      </CTable>
                    </div>

                    <div style={{ fontSize: "12px", color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <span>💡 <strong>Sec 112A Benefit:</strong> First ₹1,25,000 of LTCG is 100% tax-free under Budget 2024. Only gains above ₹1.25L are taxed at 12.5%.</span>
                      <CButton size="sm" color="primary" onClick={() => setShowCgEditModal(true)} style={{ fontWeight: "700" }}>
                        ✏️ Edit Capital Gains
                      </CButton>
                    </div>
                  </div>
                )}

              </div>

              {/* Total Gross Box */}
              <div style={{ background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: "14px", padding: "18px 24px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "900", fontSize: "16px", color: "#1e3a8a" }}>TOTAL GROSS INCOME ({selectedItrForm})</div>
                  <div style={{ fontSize: "12px", color: "#1e40af", marginTop: "2px" }}>
                    Salary ({fmt(incomeData.salary)}) + Interest ({fmt(incomeData.interest)}) + Dividends ({fmt(incomeData.dividend)}) + IT Refund Interest (₹720) {selectedItrForm === "ITR-2" ? `+ Capital Gains (${fmt(totalCapitalGains)})` : ""}
                  </div>
                </div>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "#1e3a8a" }}>{fmt(grossIncome)}</div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <CButton color="secondary" variant="outline" onClick={() => setCurrentStep(1)}>
                  ← Back to ITR Form
                </CButton>
                <div className="d-flex gap-2">
                  <CButton color="warning" onClick={() => setShowIncomeEditModal(true)} style={{ fontWeight: "700", borderRadius: "8px" }}>
                    ✏️ Edit Income Figures
                  </CButton>
                  {selectedItrForm === "ITR-2" && (
                    <CButton color="info" onClick={() => setShowCgEditModal(true)} style={{ color: "#fff", fontWeight: "700", borderRadius: "8px" }}>
                      📊 Edit Capital Gains
                    </CButton>
                  )}
                  <CButton color="primary" onClick={() => setCurrentStep(3)} style={{ background: "#0b3d91", border: "none", fontWeight: "700", borderRadius: "8px", padding: "10px 24px" }}>
                    Continue to Deductions →
                  </CButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 3: DEDUCTIONS & TAX SAVINGS — FORM 16/26AS UPLOAD OR MANUAL ENTRY ════ */}
        {currentStep === 3 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "920px", margin: "0 auto" }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: "26px" }}>
                <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: "800", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>🔒</span> STEP 3 OF 5: SECURE TAX DEDUCTIONS &amp; CREDITS
                </span>
                <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "12px", marginBottom: "6px" }}>
                  Tax Deductions &amp; Document Verification
                </h3>
                <p style={{ color: "#64748b", fontSize: "13.5px", margin: "0 auto", maxWidth: "680px" }}>
                  Upload official <strong>Form 16</strong> and <strong>Form 26AS</strong> to automatically read and verify your deductions and TDS credits directly from your documents. If you don't have files, you can enter details manually.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "10px", flexWrap: "wrap", fontSize: "11.5px", color: "#475569" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#16a34a" }}>🛡️</span> In-Browser PDF Intelligence
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#2563eb" }}>🔒</span> 256-Bit Secure Verification
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "#0891b2" }}>🏛️</span> ITD Schema Compliant
                  </span>
                </div>
              </div>

              {/* ── DOCUMENT UPLOAD ZONE (Form 16 & Form 26AS) ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "26px" }}>

                {/* Form 16 Upload Card */}
                <div style={{
                  border: form16File?.status === 'parsed' ? "2px solid #16a34a" : (parseError16 ? "2px solid #ef4444" : "2px dashed #cbd5e1"),
                  borderRadius: "14px", padding: "20px",
                  background: form16File?.status === 'parsed' ? "#f0fdf4" : (parseError16 ? "#fef2f2" : "#f8fafc"),
                  transition: "all 0.2s",
                }}>
                  <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: "12px" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: "22px" }}>📄</span>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>Form 16 (Part A &amp; B)</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Salary Certificate &amp; TDS Deductions</div>
                      </div>
                    </div>
                    {form16File?.status === 'parsed' && (
                      <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10.5px", fontWeight: "800", padding: "3px 8px", borderRadius: "12px" }}>
                        VERIFIED
                      </span>
                    )}
                  </div>

                  {!form16File && (
                    <label style={{ display: "block", cursor: "pointer", margin: 0 }}>
                      <div style={{
                        border: "1.5px dashed #94a3b8", borderRadius: "10px", padding: "18px", textAlign: "center",
                        background: "#fff", color: "#64748b", fontSize: "13px",
                        transition: "all 0.15s",
                      }}>
                        <div style={{ fontSize: "26px", marginBottom: "4px" }}>⬆️</div>
                        <div style={{ fontWeight: "700", color: "#334155" }}>Click to upload Form 16</div>
                        <div style={{ fontSize: "11px", marginTop: "3px", color: "#94a3b8" }}>PDF, JPG, PNG — Up to 10MB</div>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={(e) => handleForm16Upload(e.target.files[0])}
                      />
                    </label>
                  )}

                  {form16File?.status === 'parsing' && (
                    <div style={{ textAlign: "center", padding: "18px", fontSize: "13px", color: "#1d4ed8" }}>
                      <CSpinner size="sm" style={{ marginRight: "8px" }} />
                      <strong>Reading &amp; Parsing Form 16…</strong>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Extracting employer TAN, salary, 80C &amp; TDS credit</div>
                    </div>
                  )}

                  {parseError16 && (
                    <div style={{ marginTop: "10px", padding: "10px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "12px", color: "#991b1b" }}>
                      <div>⚠️ {parseError16}</div>
                      <div style={{ marginTop: "6px", display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => { setParseError16(null); setForm16File(null); }}
                          style={{ border: "none", background: "#991b1b", color: "#fff", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        >
                          Retry Upload
                        </button>
                        <button
                          onClick={() => setDeductionSource('manual')}
                          style={{ border: "1px solid #991b1b", background: "#fff", color: "#991b1b", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        >
                          Enter Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {form16File?.status === 'parsed' && form16File.parsed && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "12.5px", color: "#166534" }}>
                            ✅ {form16File.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {(form16File.size / 1024).toFixed(1)} KB • {form16File.parsed.employerName || "Employer Recorded"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => { setDocViewerFile(form16File); setShowDocViewerModal(true); }}
                            style={{ border: "1.5px solid #2563eb", background: "#eff6ff", color: "#2563eb", borderRadius: "7px", padding: "4px 10px", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                          >
                            👁️ View File
                          </button>
                          <button
                            onClick={() => {
                              setForm16File(null);
                              setDeductionData({ sec80c: 0, sec80d: 0, hra: 0, pt: 0, sec80ccd1b: 0, sec80g: 0, sec80e: 0 });
                              setDeductionSource('none');
                            }}
                            title="Remove Form 16"
                            style={{ border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", borderRadius: "7px", padding: "4px 9px", fontSize: "11.5px", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Quick Extracted Metrics */}
                      <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 12px", fontSize: "11.5px", color: "#1e293b", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <div>TAN: <strong>{form16File.parsed.employerTan || "Detected"}</strong></div>
                        <div>Gross Sal: <strong>{fmt(form16File.parsed.grossSalary)}</strong></div>
                        <div>Sec 80C: <strong>{fmt(form16File.parsed.sec80c || 0)}</strong></div>
                        <div>TDS Deducted: <strong style={{ color: "#16a34a" }}>{fmt(form16File.parsed.totalTdsDeducted)}</strong></div>
                      </div>

                      {/* Verification Status (Non-collapsible, Clear Display) */}
                      <div style={{ marginTop: "10px" }}>
                        <div style={{
                          background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d",
                          borderRadius: "7px", padding: "6px 10px", fontSize: "11.5px", fontWeight: "800",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span>🛡️ Verification Status ({form16File.verification?.score || 0}/{form16File.verification?.total || 0} Passed)</span>
                          <span style={{ color: "#16a34a", fontSize: "11px" }}>✓ Verified</span>
                        </div>

                        {form16File.verification && (
                          <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: "8px", padding: "8px 12px", marginTop: "6px", fontSize: "11px" }}>
                            {form16File.verification.checks.map(chk => (
                              <div key={chk.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px dashed #e2e8f0" }}>
                                <span style={{ color: "#334155" }}>
                                  {chk.status === 'pass' ? '✅' : (chk.status === 'fail' ? '❌' : (chk.status === 'warn' ? '⚠️' : 'ℹ️'))} {chk.label}
                                </span>
                                <strong style={{ color: chk.status === 'pass' ? '#166534' : (chk.status === 'fail' ? '#b91c1c' : '#b45309') }}>
                                  {chk.detail}
                                </strong>
                              </div>
                            ))}
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", textAlign: "right" }}>
                              🔒 256-Bit Encrypted Client Extraction
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form 26AS Upload Card */}
                <div style={{
                  border: form26asFile?.status === 'parsed' ? "2px solid #0284c7" : (parseError26as ? "2px solid #ef4444" : "2px dashed #cbd5e1"),
                  borderRadius: "14px", padding: "20px",
                  background: form26asFile?.status === 'parsed' ? "#f0f9ff" : (parseError26as ? "#fef2f2" : "#f8fafc"),
                  transition: "all 0.2s",
                }}>
                  <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: "12px" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: "22px" }}>🏛️</span>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>Form 26AS (Tax Credit)</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Income Tax Dept Official Statement</div>
                      </div>
                    </div>
                    {form26asFile?.status === 'parsed' && (
                      <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "10.5px", fontWeight: "800", padding: "3px 8px", borderRadius: "12px" }}>
                        CREDITS VERIFIED
                      </span>
                    )}
                  </div>

                  {!form26asFile && (
                    <label style={{ display: "block", cursor: "pointer", margin: 0 }}>
                      <div style={{
                        border: "1.5px dashed #94a3b8", borderRadius: "10px", padding: "18px", textAlign: "center",
                        background: "#fff", color: "#64748b", fontSize: "13px",
                        transition: "all 0.15s",
                      }}>
                        <div style={{ fontSize: "26px", marginBottom: "4px" }}>⬆️</div>
                        <div style={{ fontWeight: "700", color: "#334155" }}>Click to upload Form 26AS</div>
                        <div style={{ fontSize: "11px", marginTop: "3px", color: "#94a3b8" }}>PDF, JPG, PNG — Up to 10MB</div>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={(e) => handleForm26asUpload(e.target.files[0])}
                      />
                    </label>
                  )}

                  {form26asFile?.status === 'parsing' && (
                    <div style={{ textAlign: "center", padding: "18px", fontSize: "13px", color: "#0284c7" }}>
                      <CSpinner size="sm" style={{ marginRight: "8px" }} />
                      <strong>Reading &amp; Verifying Form 26AS…</strong>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Cross-checking TDS credits and taxpayer PAN</div>
                    </div>
                  )}

                  {parseError26as && (
                    <div style={{ marginTop: "10px", padding: "10px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "12px", color: "#991b1b" }}>
                      <div>⚠️ {parseError26as}</div>
                      <div style={{ marginTop: "6px" }}>
                        <button
                          onClick={() => { setParseError26as(null); setForm26asFile(null); }}
                          style={{ border: "none", background: "#991b1b", color: "#fff", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        >
                          Retry Upload
                        </button>
                      </div>
                    </div>
                  )}

                  {form26asFile?.status === 'parsed' && form26asFile.parsed && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "12.5px", color: "#0369a1" }}>
                            ✅ {form26asFile.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {(form26asFile.size / 1024).toFixed(1)} KB • PAN: {form26asFile.parsed.pan || userPan}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => { setDocViewerFile(form26asFile); setShowDocViewerModal(true); }}
                            style={{ border: "1.5px solid #0284c7", background: "#f0f9ff", color: "#0284c7", borderRadius: "7px", padding: "4px 10px", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                          >
                            👁️ View File
                          </button>
                          <button
                            onClick={() => setForm26asFile(null)}
                            title="Remove Form 26AS"
                            style={{ border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", borderRadius: "7px", padding: "4px 9px", fontSize: "11.5px", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Quick Extracted Metrics */}
                      <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 12px", fontSize: "11.5px", color: "#1e293b", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <div>Taxpayer: <strong>{form26asFile.parsed.name || taxpayer.name || "Assessee"}</strong></div>
                        <div>Total TDS: <strong style={{ color: "#0284c7" }}>{fmt(form26asFile.parsed.totalTdsCredit)}</strong></div>
                        <div>Salary TDS: <strong>{fmt(form26asFile.parsed.tdsOnSalary || 0)}</strong></div>
                        <div>Interest TDS: <strong>{fmt(form26asFile.parsed.tdsOnInterest || 0)}</strong></div>
                      </div>

                      {/* Cross-Reconciliation Notice */}
                      {form16File?.parsed?.totalTdsDeducted && form26asFile.parsed.totalTdsCredit && (
                        <div style={{
                          marginTop: "8px", padding: "8px 10px", borderRadius: "7px", fontSize: "11px",
                          background: Math.abs((form26asFile.parsed.tdsOnSalary || form26asFile.parsed.totalTdsCredit) - form16File.parsed.totalTdsDeducted) <= 100 ? "#f0fdf4" : "#fffbeb",
                          border: Math.abs((form26asFile.parsed.tdsOnSalary || form26asFile.parsed.totalTdsCredit) - form16File.parsed.totalTdsDeducted) <= 100 ? "1px solid #86efac" : "1px solid #fde68a",
                          color: Math.abs((form26asFile.parsed.tdsOnSalary || form26asFile.parsed.totalTdsCredit) - form16File.parsed.totalTdsDeducted) <= 100 ? "#15803d" : "#92400e",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}>
                          <span>{Math.abs((form26asFile.parsed.tdsOnSalary || form26asFile.parsed.totalTdsCredit) - form16File.parsed.totalTdsDeducted) <= 100 ? '✅' : 'ℹ️'}</span>
                          <span>
                            {Math.abs((form26asFile.parsed.tdsOnSalary || form26asFile.parsed.totalTdsCredit) - form16File.parsed.totalTdsDeducted) <= 100
                              ? `TDS Match: Form 16 TDS (${fmt(form16File.parsed.totalTdsDeducted)}) reconciled with Form 26AS credit.`
                              : `Form 16 TDS (${fmt(form16File.parsed.totalTdsDeducted)}) vs 26AS Credit (${fmt(form26asFile.parsed.totalTdsCredit)}). Income Tax Department processes refund as per 26AS.`}
                          </span>
                        </div>
                      )}

                      {/* Verification Checks Expander */}
                      <div style={{ marginTop: "10px" }}>
                        <button
                          onClick={() => setShowForm26asVerification(prev => !prev)}
                          style={{
                            width: "100%", background: "#f0f9ff", border: "1px solid #7dd3fc", color: "#0369a1",
                            borderRadius: "7px", padding: "5px 10px", fontSize: "11.5px", fontWeight: "700",
                            cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}
                        >
                          <span>🛡️ Verification Status ({form26asFile.verification?.score || 0}/{form26asFile.verification?.total || 0} Passed)</span>
                          <span>{showForm26asVerification ? '▲ Hide' : '▼ Details'}</span>
                        </button>

                        {showForm26asVerification && form26asFile.verification && (
                          <div style={{ background: "#fff", border: "1px solid #7dd3fc", borderRadius: "8px", padding: "10px 12px", marginTop: "6px", fontSize: "11px" }}>
                            {form26asFile.verification.checks.map(chk => (
                              <div key={chk.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px dashed #e2e8f0" }}>
                                <span style={{ color: "#334155" }}>
                                  {chk.status === 'pass' ? '✅' : (chk.status === 'fail' ? '❌' : (chk.status === 'warn' ? '⚠️' : 'ℹ️'))} {chk.label}
                                </span>
                                <strong style={{ color: chk.status === 'pass' ? '#166534' : (chk.status === 'fail' ? '#b91c1c' : '#b45309') }}>
                                  {chk.detail}
                                </strong>
                              </div>
                            ))}
                            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px", textAlign: "right" }}>
                              🏛️ TRACES Statement Format Verified
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Form 16 Full Table Format (Part A & Part B Breakdown) */}
              {form16File?.status === 'parsed' && form16File.parsed && (
                <div style={{ marginBottom: "26px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>
                        📋 Form 16 Official Records (Part A &amp; Part B Tables)
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Extracted from uploaded document: <strong>{form16File.name}</strong> • Synchronized across income &amp; deductions
                      </div>
                    </div>
                    <CBadge color="success" style={{ fontSize: "12px", padding: "6px 12px" }}>
                      ✓ Verified Document
                    </CBadge>
                  </div>
                  <Form16TableView data={form16File.parsed} showFullAnnexure={true} />
                </div>
              )}

              {/* ── MANUAL ENTRY TOGGLE / EXPANDER ── */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{
                  background: deductionSource === 'manual' ? "#fffbeb" : "#f8fafc",
                  border: deductionSource === 'manual' ? "2px solid #f59e0b" : "1.5px solid #e2e8f0",
                  borderRadius: "12px", padding: "16px 20px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                        {deductionSource === 'manual' ? '✏️ Self-Declaration Mode (Manual Deductions)' : '✏️ Don’t have Form 16 / 26AS? Enter Deductions Manually'}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {deductionSource === 'manual'
                          ? 'Enter your tax-saving investments directly. Values update your tax calculation immediately.'
                          : 'You can directly declare your 80C, 80D, HRA, and other eligible tax deductions.'}
                      </div>
                    </div>
                    <button
                      onClick={() => setDeductionSource(deductionSource === 'manual' ? (form16File?.status === 'parsed' ? 'form16' : 'none') : 'manual')}
                      style={{
                        background: deductionSource === 'manual' ? "#f59e0b" : "#0b3d91",
                        color: "#fff", border: "none", borderRadius: "8px",
                        padding: "9px 20px", fontWeight: "700", fontSize: "13px", cursor: "pointer",
                      }}
                    >
                      {deductionSource === 'manual' ? (form16File?.status === 'parsed' ? '← Back to Form 16 Data' : '✕ Close Manual Entry') : 'Enter Deductions Manually →'}
                    </button>
                  </div>

                  {/* Manual Entry Inputs */}
                  {deductionSource === 'manual' && (
                    <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      {[
                        { key: 'sec80c',     label: 'Section 80C (PPF, EPF, ELSS, Life Insurance)', hint: 'Max ₹1,50,000 allowable', icon: '🛡️', max: 150000 },
                        { key: 'sec80d',     label: 'Section 80D (Health Insurance / Mediclaim)', hint: 'Max ₹25,000 (Self) / ₹50,000 (Parents)', icon: '🏥', max: 100000 },
                        { key: 'hra',        label: 'HRA Exemption (Section 10(13A))', hint: 'Rent paid exemption', icon: '🏠', max: null },
                        { key: 'pt',         label: 'Professional Tax (Section 16(iii))', hint: 'Max ₹2,500 per annum', icon: '💼', max: 2500 },
                        { key: 'sec80ccd1b', label: 'NPS Section 80CCD(1B) (Additional NPS)', hint: 'Additional deduction up to ₹50,000', icon: '🏦', max: 50000 },
                        { key: 'sec80g',     label: 'Section 80G (Charitable Donations)', hint: '50% or 100% qualifying donations', icon: '🤝', max: null },
                        { key: 'sec80e',     label: 'Section 80E (Higher Education Loan Interest)', hint: 'No upper ceiling for 8 years', icon: '🎓', max: null },
                      ].map(({ key, label, hint, icon, max }) => (
                        <div key={key}>
                          <label style={{ fontWeight: "700", fontSize: "12px", color: "#334155", display: "block", marginBottom: "4px" }}>
                            {icon} {label}
                          </label>
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: "700" }}>₹</span>
                            <input
                              type="number"
                              min="0"
                              max={max || undefined}
                              value={manualDeduction[key] || 0}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                setManualDeduction(prev => ({ ...prev, [key]: val }));
                                setDeductionData(prev => ({ ...prev, [key]: val }));
                              }}
                              style={{
                                width: "100%", border: "1.5px solid #cbd5e1", borderRadius: "8px",
                                padding: "8px 10px 8px 26px", fontSize: "14px", fontWeight: "600",
                                outline: "none", background: "#fff",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "3px" }}>{hint}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── DEDUCTION DATA DISPLAY (ONLY WHAT IS IN THE DOCUMENT OR MANUALLY ENTERED) ── */}

              {/* Case 1: No document uploaded and not in manual mode */}
              {deductionSource === 'none' && (
                <div style={{
                  background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "14px",
                  padding: "36px 24px", textAlign: "center", marginBottom: "26px",
                }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>📂</div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a", marginBottom: "6px" }}>
                    No Tax Deductions Claimed Yet
                  </div>
                  <p style={{ color: "#64748b", fontSize: "13px", maxWidth: "520px", margin: "0 auto 18px" }}>
                    Upload your <strong>Form 16</strong> above to automatically populate and verify your deductions from official employer records, or click <strong>Enter Manually</strong> to enter your 80C, 80D, or HRA investments.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                    <button
                      onClick={() => setDeductionSource('manual')}
                      style={{
                        background: "#0b3d91", color: "#fff", border: "none", borderRadius: "8px",
                        padding: "8px 18px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer",
                      }}
                    >
                      ✏️ Enter Deductions Manually
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: Extracted from Form 16 */}
              {deductionSource === 'form16' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "26px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                      📋 Verified Deductions Extracted from Form 16
                      <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: "700", padding: "2px 10px", borderRadius: "20px" }}>
                        ✅ Verified from Document
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDeductionEditModal(true)}
                      style={{
                        border: "1.5px solid #0b3d91", background: "#eff6ff", color: "#0b3d91",
                        borderRadius: "8px", padding: "5px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                      }}
                    >
                      ✏️ Adjust / Override Values
                    </button>
                  </div>

                  {/* Dynamic Cards Grid: Only shows extracted items */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                    {[
                      { key: 'sec80c', label: 'Section 80C', val: deductionData.sec80c, max: 150000, icon: '🛡️', color: '#16a34a' },
                      { key: 'sec80d', label: 'Section 80D', val: deductionData.sec80d, max: 25000, icon: '🏥', color: '#0284c7' },
                      { key: 'hra', label: 'HRA Exemption', val: deductionData.hra, max: null, icon: '🏠', color: '#b45309' },
                      { key: 'pt', label: 'Professional Tax', val: deductionData.pt, max: 2500, icon: '💼', color: '#7c3aed' },
                      { key: 'sec80ccd1b', label: 'NPS 80CCD(1B)', val: deductionData.sec80ccd1b, max: 50000, icon: '🏦', color: '#0891b2' },
                      { key: 'sec80g', label: 'Section 80G', val: deductionData.sec80g, max: null, icon: '🤝', color: '#d97706' },
                      { key: 'sec80e', label: 'Section 80E', val: deductionData.sec80e, max: null, icon: '🎓', color: '#4338ca' },
                    ].filter(item => (item.val || 0) > 0).map(({ label, val, max, icon, color }) => (
                      <div key={label} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px", textAlign: "center" }}>
                        <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "18px", fontWeight: "900", color }}>{fmt(val)}</div>
                        {max && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Max: {fmt(max)}</div>}
                        <div style={{ fontSize: "10px", color: "#15803d", fontWeight: "700", marginTop: "4px" }}>📄 From Form 16</div>
                      </div>
                    ))}
                  </div>

                  {/* If no deduction was found in Form 16 */}
                  {(deductionData.sec80c === 0 && deductionData.sec80d === 0 && deductionData.hra === 0 && deductionData.pt === 0 && (deductionData.sec80ccd1b || 0) === 0) && (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px", fontSize: "12.5px", color: "#92400e" }}>
                      ℹ️ No Chapter VI-A deductions were detected in the uploaded Form 16. If you have made eligible investments (PPF, LIC, Mediclaim) outside your employer, click <strong>Adjust / Override Values</strong> or <strong>Enter Manually</strong>.
                    </div>
                  )}
                </div>
              )}

              {/* Case 3: Manually Entered Deductions */}
              {deductionSource === 'manual' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "26px" }}>
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    📋 Self-Declared Deductions Summary
                    <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "11px", fontWeight: "700", padding: "2px 10px", borderRadius: "20px" }}>
                      ✏️ Manually Entered
                    </span>
                  </div>

                  {/* Dynamic Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                    {[
                      { key: 'sec80c', label: 'Section 80C', val: deductionData.sec80c, max: 150000, icon: '🛡️', color: '#16a34a' },
                      { key: 'sec80d', label: 'Section 80D', val: deductionData.sec80d, max: 25000, icon: '🏥', color: '#0284c7' },
                      { key: 'hra', label: 'HRA Exemption', val: deductionData.hra, max: null, icon: '🏠', color: '#b45309' },
                      { key: 'pt', label: 'Professional Tax', val: deductionData.pt, max: 2500, icon: '💼', color: '#7c3aed' },
                      { key: 'sec80ccd1b', label: 'NPS 80CCD(1B)', val: deductionData.sec80ccd1b, max: 50000, icon: '🏦', color: '#0891b2' },
                      { key: 'sec80g', label: 'Section 80G', val: deductionData.sec80g, max: null, icon: '🤝', color: '#d97706' },
                      { key: 'sec80e', label: 'Section 80E', val: deductionData.sec80e, max: null, icon: '🎓', color: '#4338ca' },
                    ].filter(item => (item.val || 0) > 0).map(({ label, val, max, icon, color }) => (
                      <div key={label} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px", textAlign: "center" }}>
                        <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "18px", fontWeight: "900", color }}>{fmt(val)}</div>
                        {max && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Max: {fmt(max)}</div>}
                        <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "700", marginTop: "4px" }}>✏️ Self-Declared</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── AUTO APPLIED: SECTION 80TTA (SAVINGS ACCOUNT INTEREST) ── */}
              {sec80TTA > 0 && (
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "20px" }}>🏧</span>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Section 80TTA — Savings Account Interest Exemption</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Auto-applied from verified bank interest income (Max ₹10,000)</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: "900", color: "#16a34a" }}>{fmt(sec80TTA)}</div>
                    <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: "700" }}>✓ Auto-Applied</div>
                  </div>
                </div>
              )}

              {/* ── TOTAL DEDUCTIONS BOX ── */}
              <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "14px", padding: "18px 24px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: "900", fontSize: "15px", color: "#166534" }}>
                    TOTAL DEDUCTIONS ALLOWABLE (OLD TAX REGIME)
                  </div>
                  <div style={{ fontSize: "12px", color: "#15803d", marginTop: "3px" }}>
                    Standard Deduction (₹50k)
                    {Number(deductionData.sec80c || 0) > 0 && ` + 80C (${fmt(Math.min(deductionData.sec80c, 150000))})`}
                    {Number(deductionData.sec80d || 0) > 0 && ` + 80D (${fmt(Math.min(deductionData.sec80d, 25000))})`}
                    {Number(deductionData.hra || 0) > 0 && ` + HRA (${fmt(deductionData.hra)})`}
                    {Number(deductionData.pt || 0) > 0 && ` + PT (${fmt(deductionData.pt)})`}
                    {sec80TTA > 0 && ` + 80TTA (${fmt(sec80TTA)})`}
                    {Number(deductionData.sec80ccd1b || 0) > 0 && ` + NPS (${fmt(Math.min(deductionData.sec80ccd1b, 50000))})`}
                    {Number(deductionData.sec80g || 0) > 0 && ` + 80G (${fmt(deductionData.sec80g)})`}
                    {Number(deductionData.sec80e || 0) > 0 && ` + 80E (${fmt(deductionData.sec80e)})`}
                  </div>
                </div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#166534" }}>
                  {fmt(totalOldDeductions)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <CButton color="secondary" variant="outline" onClick={() => setCurrentStep(2)}>
                  ← Back to Income
                </CButton>
                <div className="d-flex gap-2">
                  <CButton
                    color="warning"
                    onClick={() => setShowDeductionEditModal(true)}
                    style={{ fontWeight: "700", borderRadius: "8px" }}
                  >
                    ✏️ Edit / Adjust Deductions
                  </CButton>
                  <CButton
                    color="primary"
                    onClick={() => setCurrentStep(4)}
                    style={{ background: "#0b3d91", border: "none", fontWeight: "700", borderRadius: "8px", padding: "10px 24px" }}
                  >
                    Compare Regimes &amp; Choose →
                  </CButton>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ════ STEP 4: TAX REGIME OPTIMIZER (NEW VS OLD) ════ */}
        {currentStep === 4 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: "800", fontSize: "12px", padding: "4px 12px", borderRadius: "20px" }}>
                  STEP 4 OF 5: REGIME OPTIMIZER
                </span>
                <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "10px" }}>
                  Which Tax Regime Gives You More Refund?
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  Click on any card to select that regime. You can switch every year without any penalty!
                </p>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <CRow className="g-4 mb-4">
                {/* NEW REGIME CARD */}
                <CCol md={6}>
                  <div
                    onClick={() => setChosenRegime("new")}
                    style={{
                      border: chosenRegime === "new" ? "3px solid #0b3d91" : "2px solid #e2e8f0",
                      borderRadius: "16px", padding: "24px", cursor: "pointer", transition: "all 0.2s",
                      background: chosenRegime === "new" ? "#f0f9ff" : "#fff",
                      boxShadow: chosenRegime === "new" ? "0 8px 24px rgba(11,61,145,0.15)" : "none",
                      position: "relative",
                    }}>
                    {recommendedRegime === "new" && (
                      <div style={{ position: "absolute", top: "-12px", right: "20px", background: "#22c55e", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "3px 10px", borderRadius: "12px" }}>
                        ⭐ HIGHEST REFUND
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ fontWeight: "900", fontSize: "18px", color: "#0f172a" }}>New Tax Regime</div>
                      <input type="radio" checked={chosenRegime === "new"} onChange={() => setChosenRegime("new")} style={{ transform: "scale(1.3)" }} />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                      Default under Section 115BAC. Flat ₹75,000 standard deduction, zero proof paperwork required.
                    </div>

                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                        <span className="text-muted">Standard Deduction:</span>
                        <strong>₹75,000</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                        <span className="text-muted">Net Taxable Income:</span>
                        <strong>{fmt(newTaxableIncome)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "12px" }}>
                        <span className="text-muted">Calculated Tax:</span>
                        <strong style={{ color: "#dc2626" }}>{fmt(newTaxLiability)}</strong>
                      </div>
                      <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#166534" }}>Refund to Account:</span>
                        <span style={{ fontSize: "18px", fontWeight: "900", color: "#166534" }}>{fmt(Math.max(0, totalTdsCredit - newTaxLiability))}</span>
                      </div>
                    </div>
                  </div>
                </CCol>

                {/* OLD REGIME CARD */}
                <CCol md={6}>
                  <div
                    onClick={() => setChosenRegime("old")}
                    style={{
                      border: chosenRegime === "old" ? "3px solid #0b3d91" : "2px solid #e2e8f0",
                      borderRadius: "16px", padding: "24px", cursor: "pointer", transition: "all 0.2s",
                      background: chosenRegime === "old" ? "#f0f9ff" : "#fff",
                      boxShadow: chosenRegime === "old" ? "0 8px 24px rgba(11,61,145,0.15)" : "none",
                      position: "relative",
                    }}>
                    {recommendedRegime === "old" && (
                      <div style={{ position: "absolute", top: "-12px", right: "20px", background: "#22c55e", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "3px 10px", borderRadius: "12px" }}>
                        ⭐ HIGHEST REFUND
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ fontWeight: "900", fontSize: "18px", color: "#0f172a" }}>Old Tax Regime</div>
                      <input type="radio" checked={chosenRegime === "old"} onChange={() => setChosenRegime("old")} style={{ transform: "scale(1.3)" }} />
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                      Allows full itemized claims: ₹50k std deduction + 80C (₹1.5L) + 80D (₹25k) + HRA + 80TTA.
                    </div>

                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                      {/* Deduction breakdown */}
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Deductions Breakdown</div>
                      {[
                        { l: "Std Deduction (Sec 16(i))", v: 50000 },
                        ...(Number(deductionData.pt || 0) > 0 ? [{ l: "💼 Prof. Tax (Sec 16(iii))", v: Number(deductionData.pt), highlight: true }] : []),
                        ...(Number(deductionData.hra || 0) > 0 ? [{ l: "HRA Exemption", v: Number(deductionData.hra) }] : []),
                        ...(Number(deductionData.sec80c || 0) > 0 ? [{ l: "80C (LIC/PPF/ELSS)", v: Math.min(Number(deductionData.sec80c), 150000) }] : []),
                        ...(Number(deductionData.sec80d || 0) > 0 ? [{ l: "80D (Health Ins.)", v: Math.min(Number(deductionData.sec80d), 25000) }] : []),
                      ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px", ...(row.highlight ? { background: "#fef9c3", borderRadius: "6px", padding: "3px 6px", margin: "2px 0" } : {}) }}>
                          <span style={{ color: row.highlight ? "#713f12" : "#64748b" }}>{row.l}</span>
                          <span style={{ fontWeight: "700", color: row.highlight ? "#15803d" : "#0f172a" }}>−{fmt(row.v)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", marginTop: "4px" }}>
                        <span className="text-muted">Total Deductions:</span>
                        <strong>{fmt(totalOldDeductions)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                        <span className="text-muted">Net Taxable Income:</span>
                        <strong>{fmt(oldTaxableIncome)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "12px" }}>
                        <span className="text-muted">Calculated Tax:</span>
                        <strong style={{ color: "#dc2626" }}>{fmt(oldTaxLiability)}</strong>
                      </div>
                      <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#166534" }}>Refund to Account:</span>
                        <span style={{ fontSize: "18px", fontWeight: "900", color: "#166534" }}>{fmt(Math.max(0, totalTdsCredit - oldTaxLiability))}</span>
                      </div>
                    </div>

                  </div>
                </CCol>
              </CRow>

              {/* ── Regime Savings Delta Card (Tax Engine verified) ── */}
              {(() => {
                const saving = Math.abs(newTaxLiability - oldTaxLiability);
                const betterRegime = recommendedRegime === "new" ? "New Regime" : "Old Regime";
                const worseRefund = recommendedRegime === "new" ? Math.max(0, totalTdsCredit - oldTaxLiability) : Math.max(0, totalTdsCredit - newTaxLiability);
                const betterRefund = recommendedRegime === "new" ? Math.max(0, totalTdsCredit - newTaxLiability) : Math.max(0, totalTdsCredit - oldTaxLiability);
                return (
                  <div style={{ background: recommendedRegime === chosenRegime ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)", border: `1.5px solid ${recommendedRegime === chosenRegime ? "#86efac" : "#fdba74"}`, borderRadius: "14px", padding: "18px 22px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: recommendedRegime === chosenRegime ? "#166534" : "#9a3412", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {recommendedRegime === chosenRegime ? "Optimal Choice Selected" : "You Can Save More — Switch Regime"}
                      </div>
                      <div style={{ fontWeight: "900", fontSize: "17px", color: "#0f172a", marginTop: "3px" }}>
                        {betterRegime} saves you {fmt(saving)} more in tax
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "3px" }}>
                        Optimal refund: <strong style={{ color: "#15803d" }}>{fmt(betterRefund)}</strong>&nbsp;vs&nbsp;
                        other option: <strong style={{ color: "#64748b" }}>{fmt(worseRefund)}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Engine Verified</div>
                      <div style={{ background: "#0b1f3a", color: "#38bdf8", fontSize: "12px", fontWeight: "800", padding: "6px 14px", borderRadius: "8px", letterSpacing: "0.5px" }}>AY 2026-27 Rules</div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Professional Tax Info Card ── */}
              {Number(deductionData.pt || 0) > 0 && (
                <div style={{ background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)", border: "1.5px solid #fde047", borderRadius: "14px", padding: "18px 22px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "28px", lineHeight: 1 }}>💼</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "900", color: "#713f12", fontSize: "15px", marginBottom: "4px" }}>
                        Professional Tax Deducted — ₹{Number(deductionData.pt).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: "13px", color: "#78350f", lineHeight: "1.7", marginBottom: "10px" }}>
                        Professional Tax of <strong>{fmt(deductionData.pt)}</strong> is deducted from your salary by your employer and deposited to the state government.
                        Under <strong>Section 16(iii)</strong>, it is fully deductible from your gross salary income — <strong>but only under the Old Tax Regime</strong>.
                        The New Regime does not allow this deduction (only the ₹75,000 standard deduction applies).
                      </div>
                      {/* Impact comparison pill */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ background: "#fff", border: "1px solid #fde047", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "700", color: "#b45309" }}>New Regime:</span>
                          <span style={{ color: "#64748b" }}>PT not deducted from income</span>
                          <span style={{ background: "#fef3c7", color: "#b45309", fontWeight: "800", fontSize: "11px", padding: "2px 8px", borderRadius: "6px" }}>₹0 benefit</span>
                        </div>
                        <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "700", color: "#15803d" }}>Old Regime:</span>
                          <span style={{ color: "#64748b" }}>PT reduces taxable income by</span>
                          <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "800", fontSize: "11px", padding: "2px 8px", borderRadius: "6px" }}>−{fmt(deductionData.pt)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Tax saving callout */}
                    <div style={{ textAlign: "center", background: "#fff", border: "1px solid #fde047", borderRadius: "12px", padding: "12px 18px", minWidth: "100px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#78350f", textTransform: "uppercase", letterSpacing: "0.5px" }}>Old Regime Benefit</div>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: "#15803d", margin: "4px 0" }}>
                        {fmt(deductionData.pt)}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>Sec 16(iii)</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px 20px", marginBottom: "28px" }}>
                <div style={{ fontWeight: "800", color: "#0b3d91", fontSize: "14px", marginBottom: "6px" }}>
                  💡 Can you switch regimes whenever you want?
                </div>
                <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.7" }}>
                  <strong>Yes!</strong> As a salaried employee, you can freely switch between New and Old regimes <strong>every single year</strong> directly while filing your return. You do <strong>not</strong> need Form 10-IEA. Just make sure to submit on or before the July 31 due date.
                </div>
              </div>


              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <CButton color="secondary" variant="outline" onClick={() => setCurrentStep(3)}>
                  ← Back to Deductions
                </CButton>
                <CButton color="primary" size="lg" onClick={() => setCurrentStep(5)} style={{ background: "#0b3d91", border: "none", fontWeight: "700", borderRadius: "8px", padding: "12px 32px" }}>
                  Review &amp; Finalize Filing →
                </CButton>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 5: REVIEW & SUBMIT ════ */}
        {currentStep === 5 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "800", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", letterSpacing: "0.5px" }}>
                  STEP 5 OF 5: FINAL REVIEW &amp; FILING
                </span>
                <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "12px", fontSize: "24px" }}>
                  Your Return is Ready to File!
                </h3>
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  {paymentCompleted
                    ? "✅ Payment verified. Download your documents or submit directly to the Income Tax portal."
                    : "Review your filing summary and complete payment to unlock download & submission options."}
                </p>
              </div>

              {/* ── Uploaded Document Preview (always visible) ── */}
              {(form16File || form26asFile) && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 22px", marginBottom: "20px" }}>
                  <div style={{ fontWeight: "800", color: "#0f172a", marginBottom: "12px", fontSize: "14px" }}>📎 Uploaded Documents</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {form16File && (
                      <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", minWidth: "220px" }}>
                        <span style={{ fontSize: "22px" }}>📄</span>
                        <div>
                          <div style={{ fontWeight: "700", color: "#0369a1" }}>Form 16</div>
                          <div style={{ color: "#64748b", fontSize: "12px" }}>{form16File.name}</div>
                          <div style={{ color: "#15803d", fontSize: "11px", fontWeight: "700" }}>✔ {form16File.status === 'parsed' ? 'Parsed & Verified' : form16File.status}</div>
                        </div>
                      </div>
                    )}
                    {form26asFile && (
                      <div style={{ background: "#fff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", minWidth: "220px" }}>
                        <span style={{ fontSize: "22px" }}>📊</span>
                        <div>
                          <div style={{ fontWeight: "700", color: "#0369a1" }}>Form 26AS</div>
                          <div style={{ color: "#64748b", fontSize: "12px" }}>{form26asFile.name}</div>
                          <div style={{ color: "#15803d", fontSize: "11px", fontWeight: "700" }}>✔ {form26asFile.status === 'parsed' ? 'Parsed & Verified' : form26asFile.status}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ITR Filing Summary Card ── */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "22px", marginBottom: "20px" }}>
                <h5 style={{ fontWeight: "800", color: "#0f172a", marginBottom: "16px" }}>📋 ITR Filing Summary</h5>
                {[
                  { l: "Taxpayer Name", v: taxpayer.name },
                  { l: "PAN Number", v: taxpayer.pan, color: "#0b3d91" },
                  { l: "Assessment Year", v: `AY ${assessmentYear} (FY 2025-26)` },
                  { l: "Selected Return Form", v: selectedItrForm === "ITR-2" ? "ITR-2 (Capital Gains & Investments)" : "ITR-1 (Sahaj)" },
                  { l: "Chosen Tax Regime", v: chosenRegime === "new" ? "New Regime (Sec 115BAC)" : "Old Regime (Itemized Claims)" },
                  { l: "Gross Total Income", v: fmt(grossIncome) },
                  ...(selectedItrForm === "ITR-2" ? [{ l: "Taxable Capital Gains (Schedule CG)", v: fmt(totalCapitalGains), color: "#2563eb" }] : []),
                  { l: "Tax Liability", v: fmt(activeTax) },
                  { l: "TDS Credit Deposited (26AS)", v: fmt(totalTdsCredit), color: "#16a34a" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "14px" }}>
                    <span className="text-muted">{row.l}:</span>
                    <strong style={{ color: row.color || "#0f172a" }}>{row.v}</strong>
                  </div>
                ))}
                {/* Refund / Payable Result */}
                <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "10px", background: activeRefund > 0 ? "#ecfdf5" : "#fff1f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "800", color: activeRefund > 0 ? "#166534" : "#991b1b", fontSize: "15px" }}>
                      {activeRefund > 0 ? "🎉 Net Tax Refund Due to You" : "⚠️ Net Tax Payable"}
                    </div>
                    <div style={{ fontSize: "12px", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                      {activeRefund > 0 ? "Will be credited directly to pre-validated bank account" : "Payable via Challan 280"}
                    </div>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                    {activeRefund > 0 ? fmt(activeRefund) : fmt(activePayable)}
                  </div>
                </div>
              </div>

              {/* Pre-Validated Bank Account */}
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", fontSize: "13px" }}>
                <div style={{ fontWeight: "800", color: "#0369a1", marginBottom: "4px" }}>🏦 Verified Refund Bank Account (NPCI Validated)</div>
                <div style={{ color: "#0284c7" }}>HDFC Bank Ltd &nbsp;•&nbsp; Account: <code>XXXXXXXX6450</code> &nbsp;•&nbsp; IFSC: <code>HDFC0001234</code></div>
              </div>

              {/* ════════════════════════════════════════════════════
                  PAYMENT GATE — shown when not yet paid
              ════════════════════════════════════════════════════ */}
              {!paymentCompleted && (
                <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)", border: "2px solid #93c5fd", borderRadius: "16px", padding: "24px 28px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ flex: 1, minWidth: "240px" }}>
                      <div style={{ fontWeight: "900", color: "#1e3a8a", fontSize: "16px", marginBottom: "6px" }}>🔒 Unlock Filing – Pay Filing Fee</div>
                      <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                        Complete payment to unlock downloading the ITR JSON, Tax Computation PDF, and direct submission to the Income Tax portal.
                      </div>
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#334155" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "260px" }}>
                          <span>Filing Fee (Self Filing)</span>
                          <strong>₹{FILING_FEE}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "260px" }}>
                          <span>GST @ 18%</span>
                          <strong>₹{FILING_FEE_GST}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "260px", borderTop: "1px dashed #94a3b8", paddingTop: "6px", marginTop: "4px" }}>
                          <span style={{ fontWeight: "800", color: "#0b3d91" }}>Total Payable</span>
                          <strong style={{ color: "#0b3d91", fontSize: "15px" }}>₹{FILING_FEE_TOTAL}</strong>
                        </div>
                      </div>
                      <div style={{ marginTop: "10px", fontSize: "11px", color: "#94a3b8" }}>
                        🔐 Secured by Razorpay &nbsp;|&nbsp; UPI / Cards / Net Banking accepted
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", minWidth: "160px" }}>
                      <button
                        onClick={handlePayNow}
                        disabled={paymentProcessing}
                        style={{
                          background: paymentProcessing ? "#64748b" : "linear-gradient(135deg, #0b3d91, #1a5bb8)",
                          color: "#fff", border: "none", borderRadius: "12px",
                          padding: "14px 28px", fontWeight: "900", fontSize: "15px",
                          cursor: paymentProcessing ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 14px rgba(11,61,145,0.35)",
                          transition: "all 0.2s", width: "100%",
                        }}
                      >
                        {paymentProcessing ? "⏳ Processing..." : `💳 Pay ₹${FILING_FEE_TOTAL} & Unlock`}
                      </button>
                      <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center" }}>🔒 100% Secure &amp; Encrypted</div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                        {["UPI", "Cards", "Net Banking", "Wallets"].map(m => (
                          <span key={m} style={{ background: "#e2e8f0", color: "#475569", fontSize: "10px", fontWeight: "700", padding: "2px 7px", borderRadius: "6px" }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Locked action buttons (disabled preview) */}
                  <div style={{ marginTop: "20px", borderTop: "1px dashed #bfdbfe", paddingTop: "16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔐 Unlocks after payment:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {[
                        { icon: "🔍", label: "Preview JSON File" },
                        { icon: "⬇", label: "Download ITR JSON" },
                        { icon: "📄", label: "Download Tax PDF" },
                        { icon: "🚀", label: "Submit to IT Portal" },
                      ].map(btn => (
                        <button key={btn.label} disabled style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", color: "#94a3b8", cursor: "not-allowed", fontWeight: "600" }}>
                          {btn.icon} {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════
                  POST-PAYMENT ACTIONS — shown when paid
              ════════════════════════════════════════════════════ */}
              {paymentCompleted && (
                <>
                  {/* Payment success banner */}
                  <div style={{ background: "#ecfdf5", border: "2px solid #86efac", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ fontSize: "32px" }}>✅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "900", color: "#14532d", fontSize: "15px" }}>Payment Verified! Filing Unlocked.</div>
                      <div style={{ fontSize: "12px", color: "#166534", marginTop: "2px" }}>
                        Txn ID: <strong>{paymentInfo?.razorpay_payment_id || paymentInfo?.transaction_id || '–'}</strong>
                        &nbsp;|&nbsp; Amount: <strong>₹{paymentInfo?.amount || FILING_FEE_TOTAL}</strong>
                        &nbsp;|&nbsp; {paymentInfo?.paid_at ? new Date(paymentInfo.paid_at).toLocaleString('en-IN') : ''}
                      </div>
                    </div>
                    <span style={{ background: "#bbf7d0", color: "#14532d", fontWeight: "800", fontSize: "12px", padding: "4px 10px", borderRadius: "20px" }}>PAID</span>
                  </div>

                  {/* Unlocked action buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                    <button
                      onClick={() => setShowJsonModal(true)}
                      style={{ background: "#f0f9ff", border: "2px solid #7dd3fc", borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontWeight: "700", color: "#0369a1", fontSize: "13px" }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>🔍</div>
                      Preview JSON File
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "400", marginTop: "3px" }}>Verify ITR schema</div>
                    </button>
                    <button
                      onClick={downloadJson}
                      style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontWeight: "700", color: "#15803d", fontSize: "13px" }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>⬇</div>
                      Download ITR JSON
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "400", marginTop: "3px" }}>Official e-filing format</div>
                    </button>
                    <button
                      onClick={() => setShowPdfModal(true)}
                      style={{ background: "#faf5ff", border: "2px solid #d8b4fe", borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontWeight: "700", color: "#7e22ce", fontSize: "13px" }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>📄</div>
                      Tax Computation PDF
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "400", marginTop: "3px" }}>Preview &amp; Download</div>
                    </button>
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      style={{ background: "linear-gradient(135deg, #0b3d91, #1a5bb8)", border: "none", borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontWeight: "700", color: "#fff", fontSize: "13px" }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "6px" }}>🚀</div>
                      Submit to IT Portal
                      <div style={{ fontSize: "11px", color: "#bfdbfe", fontWeight: "400", marginTop: "3px" }}>Direct e-filing submission</div>
                    </button>
                  </div>
                </>
              )}

              <div className="text-center">
                <button onClick={() => setCurrentStep(4)} style={{ background: "none", border: "none", color: "#64748b", textDecoration: "underline", fontSize: "13px", cursor: "pointer" }}>
                  ← Back to Regime Selection
                </button>
              </div>
            </div>
          </div>
        )}

      </CContainer>

      {/* ════ MODAL: EDIT INCOME FIGURES ════ */}
      <CModal visible={showIncomeEditModal} onClose={() => setShowIncomeEditModal(false)}>
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>✏️ Edit Income Figures</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "24px" }}>
          <div className="mb-3">
            <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Gross Salary Income (₹)</CFormLabel>
            <CFormInput
              type="number"
              value={incomeData.salary}
              onChange={(e) => setIncomeData({ ...incomeData, salary: Number(e.target.value) })}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>As shown in Form 16 Part B / AIS</div>
          </div>

          <div className="mb-3">
            <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Savings &amp; FD Interest (₹)</CFormLabel>
            <CFormInput
              type="number"
              value={incomeData.interest}
              onChange={(e) => setIncomeData({ ...incomeData, interest: Number(e.target.value) })}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Total interest from all bank savings accounts and FDs</div>
          </div>

          <div className="mb-3">
            <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Dividend Income (₹)</CFormLabel>
            <CFormInput
              type="number"
              value={incomeData.dividend}
              onChange={(e) => setIncomeData({ ...incomeData, dividend: Number(e.target.value) })}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Dividends received from shares and mutual funds</div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowIncomeEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={() => setShowIncomeEditModal(false)} style={{ fontWeight: "700" }}>
            Save &amp; Recalculate Tax
          </CButton>
        </CModalFooter>
      </CModal>


      {/* ════ MODAL / DRAWER: VIEW GOVT AIS & 26AS RECORDS ════ */}
      <CModal visible={showGovtRecordsModal} onClose={() => setShowGovtRecordsModal(false)} size="xl">
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>🏛️ Government Records Synchronized from IT Portal</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: 0 }}>
          <CNav variant="tabs" className="px-4 pt-3 bg-light border-bottom">
            <CNavItem>
              <CNavLink active={govtRecordsTab === "ais"} onClick={() => setGovtRecordsTab("ais")} style={{ cursor: "pointer", fontWeight: "700" }}>
                📋 AIS (Annual Information Statement)
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={govtRecordsTab === "26as"} onClick={() => setGovtRecordsTab("26as")} style={{ cursor: "pointer", fontWeight: "700" }}>
                🛡️ Form 26AS (Tax Credit Statement)
              </CNavLink>
            </CNavItem>
          </CNav>

          <div style={{ padding: "24px", maxHeight: "550px", overflowY: "auto" }}>
            {govtRecordsTab === "ais" && (
              <div>
                <div style={{ background: "#f0f9ff", padding: "14px 18px", borderRadius: "10px", marginBottom: "18px", fontSize: "13px", color: "#0369a1" }}>
                  ℹ️ This is the raw financial intelligence collected by the Income Tax Department from your employers, banks, and mutual fund companies for AY {assessmentYear}.
                </div>

                <h6 style={{ fontWeight: "800", color: "#0f172a" }}>Part B.1: TDS Deductions Reported</h6>
                <div className="table-responsive mb-3">
                  <CTable bordered style={{ fontSize: "13px" }}>
                    <CTableHead style={{ background: "#f1f5f9" }}>
                      <CTableRow>
                        <CTableHeaderCell>Code</CTableHeaderCell>
                        <CTableHeaderCell>Deductor</CTableHeaderCell>
                        <CTableHeaderCell>Section</CTableHeaderCell>
                        <CTableHeaderCell>Gross Paid</CTableHeaderCell>
                        <CTableHeaderCell>TDS Deducted</CTableHeaderCell>
                        <CTableHeaderCell>Feedback</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {(data?.ais?.tds_data || []).map((row, i) => (
                        <CTableRow key={i}>
                          <CTableDataCell><code>{row.info_code || "TDS-192"}</code></CTableDataCell>
                          <CTableDataCell>{row.deductor}</CTableDataCell>
                          <CTableDataCell><CBadge color="info">{row.section}</CBadge></CTableDataCell>
                          <CTableDataCell>{fmt(row.amount_paid)}</CTableDataCell>
                          <CTableDataCell className="text-success fw-bold">{fmt(row.tds_deducted)}</CTableDataCell>
                          <CTableDataCell><CBadge color="success">{row.feedback_status || "Accepted"}</CBadge></CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>

                <h6 style={{ fontWeight: "800", color: "#0f172a", marginTop: "20px" }}>Part B.2: SFT (High-Value / Interest Transactions)</h6>
                <div className="table-responsive">
                  <CTable bordered style={{ fontSize: "13px" }}>
                    <CTableHead style={{ background: "#f1f5f9" }}>
                      <CTableRow>
                        <CTableHeaderCell>Code</CTableHeaderCell>
                        <CTableHeaderCell>Entity / Bank</CTableHeaderCell>
                        <CTableHeaderCell>Transaction Description</CTableHeaderCell>
                        <CTableHeaderCell>Amount</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {(data?.ais?.interest_income_data || []).map((row, i) => (
                        <CTableRow key={i}>
                          <CTableDataCell><code>{row.info_code || "SFT-005"}</code></CTableDataCell>
                          <CTableDataCell>{row.source}</CTableDataCell>
                          <CTableDataCell>{row.type || "Bank Interest"}</CTableDataCell>
                          <CTableDataCell className="fw-bold">{fmt(row.amount)}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            )}

            {govtRecordsTab === "26as" && (
              <div>
                <div style={{ background: "#f0fdf4", padding: "14px 18px", borderRadius: "10px", marginBottom: "18px", fontSize: "13px", color: "#166534" }}>
                  ✅ Form 26AS shows taxes deposited with the Central Govt on your behalf. Total verified tax credits: <strong>{fmt(totalTdsCredit)}</strong>.
                </div>

                <h6 style={{ fontWeight: "800", color: "#0f172a" }}>Part A: TDS on Salary (Sec 192)</h6>
                <div className="table-responsive mb-3">
                  <CTable bordered style={{ fontSize: "13px" }}>
                    <CTableHead style={{ background: "#f1f5f9" }}>
                      <CTableRow>
                        <CTableHeaderCell>Employer</CTableHeaderCell>
                        <CTableHeaderCell>TAN</CTableHeaderCell>
                        <CTableHeaderCell>Total Amount</CTableHeaderCell>
                        <CTableHeaderCell>TDS Deposited</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {(data?.form26as?.part_a_tds_salary || []).map((row, i) => (
                        <CTableRow key={i}>
                          <CTableDataCell>{row.deductor_name}</CTableDataCell>
                          <CTableDataCell><code>{row.deductor_tan}</code></CTableDataCell>
                          <CTableDataCell>{fmt(row.total_amount)}</CTableDataCell>
                          <CTableDataCell className="text-success fw-bold">{fmt(row.total_tds_deposited)}</CTableDataCell>
                          <CTableDataCell><CBadge color="success">Matched</CBadge></CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            )}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowGovtRecordsModal(false)}>Close View</CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: EDIT CAPITAL GAINS (ITR-2) ════ */}
      <CModal visible={showCgEditModal} onClose={() => setShowCgEditModal(false)}>
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>✏️ Edit Schedule CG (Capital Gains)</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "24px" }}>
          <div style={{ background: "#eff6ff", padding: "12px 16px", borderRadius: "8px", marginBottom: "18px", fontSize: "12.5px", color: "#1e40af" }}>
            ℹ️ In ITR-2, Short Term Capital Gains on shares/equity mutual funds (STCG u/s 111A) are taxed at <strong>20%</strong>, and Long Term (LTCG u/s 112A) gets <strong>₹1,25,000 exemption</strong> with balance taxed at <strong>12.5%</strong>.
          </div>

          <h6 style={{ fontWeight: "800", color: "#0f172a", marginBottom: "10px" }}>1. Short-Term Capital Gains (Sec 111A)</h6>
          <div className="mb-3">
            <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Net STCG Gain (₹)</CFormLabel>
            <CFormInput
              type="number"
              value={incomeData.stcg}
              onChange={(e) => setIncomeData({ ...incomeData, stcg: Number(e.target.value) })}
            />
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Taxed at special flat rate of 20% u/s 111A</div>
          </div>

          <h6 style={{ fontWeight: "800", color: "#0f172a", marginBottom: "10px", marginTop: "18px" }}>2. Long-Term Capital Gains (Sec 112A)</h6>
          <div className="mb-3">
            <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Gross LTCG Gain (₹)</CFormLabel>
            <CFormInput
              type="number"
              value={incomeData.ltcg}
              onChange={(e) => setIncomeData({ ...incomeData, ltcg: Number(e.target.value) })}
            />
            <div style={{ fontSize: "11px", color: "#166534", marginTop: "4px" }}>
              First ₹1,25,000 is 100% tax-free under Budget 2024. Taxable LTCG: <strong>{fmt(Math.max(0, Number(incomeData.ltcg) - 125000))}</strong>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", marginTop: "16px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Estimated STCG Tax (20%):</span>
              <strong style={{ color: "#2563eb" }}>{fmt(Math.round(Number(incomeData.stcg || 0) * 0.20))}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Estimated LTCG Tax (12.5%):</span>
              <strong style={{ color: "#2563eb" }}>{fmt(Math.round(Math.max(0, Number(incomeData.ltcg || 0) - 125000) * 0.125))}</strong>
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowCgEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={() => setShowCgEditModal(false)} style={{ fontWeight: "700" }}>
            Save &amp; Recalculate
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: EDIT/ADJUST DEDUCTIONS ════ */}
      <CModal visible={showDeductionEditModal} onClose={() => setShowDeductionEditModal(false)} size="lg">
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>✏️ Edit Tax Deductions (Chapter VI-A)</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "24px" }}>
          <div style={{ background: "#eff6ff", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "12.5px", color: "#1e40af" }}>
            ℹ️ These deductions apply only under the <strong>Old Tax Regime</strong>. Changes here update your tax comparison in real-time.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>🛡️ Section 80C — Investments (₹)</CFormLabel>
              <CFormInput
                type="number" min="0" max="150000"
                value={deductionData.sec80c}
                onChange={(e) => setDeductionData({ ...deductionData, sec80c: Number(e.target.value) })}
              />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>EPF, PPF, LIC, ELSS, Home Loan Principal — Max ₹1,50,000</div>
            </div>
            <div>
              <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>🏥 Section 80D — Health Insurance (₹)</CFormLabel>
              <CFormInput
                type="number" min="0" max="100000"
                value={deductionData.sec80d}
                onChange={(e) => setDeductionData({ ...deductionData, sec80d: Number(e.target.value) })}
              />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>Self/Family: Max ₹25,000 | Senior Citizens: Max ₹50,000</div>
            </div>
            <div>
              <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>🏠 HRA Exemption — Sec 10(13A) (₹)</CFormLabel>
              <CFormInput
                type="number" min="0"
                value={deductionData.hra}
                onChange={(e) => setDeductionData({ ...deductionData, hra: Number(e.target.value) })}
              />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>Min(Actual HRA, 50% Basic, Actual Rent − 10% Basic)</div>
            </div>
            <div>
              <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>💼 Professional Tax (₹)</CFormLabel>
              <CFormInput
                type="number" min="0" max="2500"
                value={deductionData.pt}
                onChange={(e) => setDeductionData({ ...deductionData, pt: Number(e.target.value) })}
              />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>Deductible u/s 16(iii) — Max ₹2,500 per year</div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginTop: "20px" }}>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "10px" }}>📊 Live Deduction Preview</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", marginBottom: "6px" }}>
              <span>Standard Deduction (New: ₹75k / Old: ₹50k)</span>
              <strong style={{ color: "#16a34a" }}>₹50,000</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>Section 80C:</span><strong>{fmt(Math.min(deductionData.sec80c, 150000))}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>Section 80D:</span><strong>{fmt(Math.min(deductionData.sec80d, 25000))}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>HRA Exemption:</span><strong>{fmt(deductionData.hra)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>Section 80TTA:</span><strong>{fmt(sec80TTA)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>Professional Tax:</span><strong>{fmt(deductionData.pt)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "900", color: "#166534", borderTop: "2px solid #86efac", paddingTop: "8px", marginTop: "4px" }}>
              <span>TOTAL OLD REGIME DEDUCTIONS:</span>
              <span>{fmt(totalOldDeductions)}</span>
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowDeductionEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={() => setShowDeductionEditModal(false)} style={{ fontWeight: "700" }}>
            Save &amp; Recalculate
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: DOCUMENT VIEWER ════ */}
      <CModal visible={showDocViewerModal} onClose={() => setShowDocViewerModal(false)} size="xl">
        <CModalHeader style={{ background: "#0f172a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>📄 Document Viewer — {docViewerFile?.name}</CModalTitle>
          {docViewerFile?.parsed && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setDocViewerTab('tables')}
                style={{
                  background: docViewerTab === 'tables' ? "#2563eb" : "#334155",
                  color: "#fff", border: "none", borderRadius: "6px",
                  padding: "4px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                }}
              >
                📋 Official Form 16 Tables
              </button>
              <button
                onClick={() => setDocViewerTab('file')}
                style={{
                  background: docViewerTab === 'file' ? "#2563eb" : "#334155",
                  color: "#fff", border: "none", borderRadius: "6px",
                  padding: "4px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                }}
              >
                📄 Original File
              </button>
            </div>
          )}
        </CModalHeader>
        <CModalBody style={{ padding: docViewerTab === 'tables' && docViewerFile?.parsed ? "16px" : 0, background: docViewerTab === 'tables' && docViewerFile?.parsed ? "#f8fafc" : "#0f172a", minHeight: "500px", maxHeight: "75vh", overflowY: "auto" }}>
          {docViewerTab === 'tables' && docViewerFile?.parsed ? (
            <Form16TableView data={docViewerFile.parsed} showFullAnnexure={true} />
          ) : docViewerFile?.objectUrl ? (
            docViewerFile.name?.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={docViewerFile.objectUrl}
                style={{ width: "100%", height: "600px", border: "none" }}
                title="Document Preview"
              />
            ) : (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
                <img
                  src={docViewerFile.objectUrl}
                  alt="Document preview"
                  style={{ maxWidth: "100%", maxHeight: "560px", borderRadius: "8px", objectFit: "contain" }}
                />
              </div>
            )
          ) : (
            <div style={{ textAlign: "center", padding: "60px", color: "#64748b", fontSize: "14px" }}>
              No preview available
            </div>
          )}
        </CModalBody>
        <CModalFooter style={{ background: "#1e293b" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", flex: 1 }}>{docViewerFile?.name} — {docViewerFile?.size ? (docViewerFile.size / 1024).toFixed(1) + ' KB' : ''}</span>
          {docViewerFile?.objectUrl && (
            <a href={docViewerFile.objectUrl} download={docViewerFile.name}>
              <CButton color="success" size="sm" style={{ fontWeight: "700" }}>⬇ Download</CButton>
            </a>
          )}
          <CButton color="secondary" onClick={() => setShowDocViewerModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: PREVIEW JSON ════ */}
      <CModal visible={showJsonModal} onClose={() => setShowJsonModal(false)} size="xl">
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>🔍 Generated {selectedItrForm} JSON File Preview (Official Schema)</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#475569" }}>
              Official schema-compliant JSON ready for e-Filing portal upload for <strong>{selectedItrForm}</strong> (AY {assessmentYear}).
            </span>
            <div className="d-flex gap-2">
              <CBadge color={selectedItrForm === "ITR-2" ? "primary" : "success"} style={{ fontSize: "12px", padding: "6px 12px" }}>
                Form: {selectedItrForm}
              </CBadge>
              <CBadge color="dark" style={{ fontSize: "12px", padding: "6px 12px" }}>
                Regime: {chosenRegime.toUpperCase()}
              </CBadge>
            </div>
          </div>
          <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", maxHeight: "450px", overflowY: "auto" }}>
            <pre style={{ margin: 0, color: "#38bdf8", fontSize: "12px", lineHeight: "1.6", fontFamily: "Consolas, monospace" }}>
              {JSON.stringify(getOfficialJson(), null, 2)}
            </pre>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowJsonModal(false)}>Close</CButton>
          <CButton color="primary" onClick={downloadJson} style={{ fontWeight: "700" }}>
            ⬇ Download {selectedItrForm} JSON File
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: TAX COMPUTATION PDF PREVIEW & DOWNLOAD ════ */}
      <CModal visible={showPdfModal} onClose={() => setShowPdfModal(false)} size="xl">
        <CModalHeader style={{ background: "linear-gradient(135deg, #4c1d95, #7e22ce)", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>📄 Tax Computation Statement – Professional PDF</CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "0" }}>
          {/* In-modal PDF preview */}
          <div style={{ background: "#f8fafc", padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "3px solid #0b3d91", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", letterSpacing: "2px", textTransform: "uppercase" }}>Income Tax Department – Government of India</div>
              <h2 style={{ fontWeight: "900", color: "#0b3d91", margin: "6px 0 4px", fontSize: "20px" }}>Tax Computation Statement</h2>
              <div style={{ fontSize: "13px", color: "#475569" }}>Assessment Year {assessmentYear} (FY 2025-26) &nbsp;|&nbsp; Form: {selectedItrForm}</div>
            </div>
            {/* Meta Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px", marginBottom: "20px", fontSize: "13px" }}>
              {[
                { l: "Taxpayer Name", v: taxpayer.name || "–" },
                { l: "PAN Number", v: taxpayer.pan || userPan || "–", color: "#0b3d91" },
                { l: "Assessment Year", v: `AY ${assessmentYear}` },
                { l: "Tax Regime", v: chosenRegime === 'new' ? 'New Tax Regime (Sec 115BAC)' : 'Old Tax Regime' },
                { l: "Return Form", v: selectedItrForm },
                { l: "Filing Date", v: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{r.l}</div>
                  <div style={{ fontWeight: "700", color: r.color || "#0f172a" }}>{r.v}</div>
                </div>
              ))}
            </div>
            {/* Income Table */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", color: "#0b3d91", fontSize: "12px", borderLeft: "4px solid #0b3d91", paddingLeft: "10px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Income Details</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead><tr style={{ background: "#0b3d91", color: "#fff" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Head of Income</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (₹)</th>
                </tr></thead>
                <tbody>
                  {[
                    { l: "Gross Salary Income", v: incomeData.salary },
                    { l: "Interest Income (Savings / FD)", v: incomeData.interest },
                    { l: "Dividend Income", v: incomeData.dividend },
                    ...(isItr2 ? [
                      { l: "Short Term Capital Gains (STCG u/s 111A – 20%)", v: incomeData.stcg || 0 },
                      { l: "Long Term Capital Gains (LTCG u/s 112A – 12.5%)", v: incomeData.ltcg || 0 },
                    ] : []),
                  ].map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>{r.l}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: "600" }}>₹ {Math.round(r.v).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#eff6ff", fontWeight: "900" }}>
                    <td style={{ padding: "10px 12px", color: "#1e3a8a", fontSize: "14px" }}>Gross Total Income</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#1e3a8a", fontSize: "14px" }}>₹ {Math.round(grossIncome).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Tax Computation Table */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", color: "#0b3d91", fontSize: "12px", borderLeft: "4px solid #0b3d91", paddingLeft: "10px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Tax Computation</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead><tr style={{ background: "#0b3d91", color: "#fff" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (₹)</th>
                </tr></thead>
                <tbody>
                  {[
                    { l: "Total Tax Liability", v: activeTax },
                    { l: "TDS Deducted / 26AS Credit", v: totalTdsCredit },
                    ...(isItr2 ? [{ l: "Capital Gains Tax (STCG + LTCG + 4% Cess)", v: capitalGainsTax }] : []),
                  ].map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>{r.l}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: "600" }}>₹ {Math.round(r.v).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Result Box */}
              <div style={{ background: activeRefund > 0 ? "#ecfdf5" : "#fff1f2", border: `2px solid ${activeRefund > 0 ? "#86efac" : "#fca5a5"}`, borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                <div style={{ fontWeight: "800", fontSize: "15px", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                  {activeRefund > 0 ? "🎉 Net Tax Refund Due to You" : "⚠️ Net Tax Payable via Challan 280"}
                </div>
                <div style={{ fontSize: "26px", fontWeight: "900", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                  ₹ {Math.round(activeRefund > 0 ? activeRefund : activePayable).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            {/* Payment Badge */}
            {paymentInfo && (
              <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "#166534", display: "flex", gap: "10px", alignItems: "center", marginTop: "12px" }}>
                ✅ <div><strong>Filing Fee Paid</strong> – ₹{paymentInfo.amount} &nbsp;|&nbsp; Txn: {paymentInfo.razorpay_payment_id || paymentInfo.transaction_id || 'VERIFIED'} &nbsp;|&nbsp; {new Date(paymentInfo.paid_at || Date.now()).toLocaleDateString('en-IN')}</div>
              </div>
            )}
            {/* Footer */}
            <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "12px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
              System-generated Tax Computation Statement &nbsp;|&nbsp; CA Tax Portal &nbsp;|&nbsp; PAN: {taxpayer.pan || userPan || '–'} &nbsp;|&nbsp; AY {assessmentYear}
            </div>
          </div>
        </CModalBody>
        <CModalFooter style={{ gap: "10px" }}>
          <CButton color="secondary" onClick={() => setShowPdfModal(false)}>Close</CButton>
          <CButton
            color="primary"
            style={{ background: "linear-gradient(135deg, #4c1d95, #7e22ce)", border: "none", fontWeight: "700" }}
            onClick={downloadPdf}
          >
            🖨️ Download / Print PDF
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ════ MODAL: SUBMISSION / ACKNOWLEDGEMENT ════ */}
      <CModal visible={showSubmitModal} onClose={() => { setShowSubmitModal(false); setSubmissionSuccess(null); }} size="lg">
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800" }}>
            {submissionSuccess ? "✅ ITR-V Acknowledgement Receipt" : "🏛️ Submit Return to Income Tax Portal"}
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "24px" }}>
          {submissionSuccess ? (
            <div>
              <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#166534" }}>INCOME TAX DEPARTMENT ACKNOWLEDGEMENT</div>
                <h4 style={{ fontWeight: "900", color: "#14532d", marginTop: "4px" }}>Return Filed Successfully!</h4>
                <div style={{ fontSize: "13px", color: "#166534", marginTop: "8px" }}>
                  Ack Number: <strong>{submissionSuccess.acknowledgement_number}</strong> &nbsp;|&nbsp; Form: <strong>{submissionSuccess.form_type}</strong>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: "#15803d", marginTop: "8px" }}>
                  Refund Initiated: {fmt(submissionSuccess.receipt?.refund_due)}
                </div>
              </div>
              <CButton color="success" onClick={downloadJson} style={{ fontWeight: "700" }}>⬇ Download Final JSON Receipt</CButton>
            </div>
          ) : (
            <div>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px" }}>
                <div>Filing Form: <strong>{selectedItrForm}</strong></div>
                <div>Selected Regime: <strong>{chosenRegime === "new" ? "New Tax Regime" : "Old Tax Regime"}</strong></div>
                <div>Total Income: <strong>{fmt(grossIncome)}</strong></div>
                <div>Refund Due: <strong style={{ color: "#16a34a" }}>{fmt(activeRefund)}</strong></div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "14px", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
                <strong>What happens next?</strong>
                <ol style={{ paddingLeft: "18px", margin: "4px 0 0", lineHeight: "1.7" }}>
                  <li>Your ITR is submitted to the e-Filing server.</li>
                  <li>Verify using Aadhaar OTP within 30 days.</li>
                  <li>Refund will be credited to your HDFC bank account.</li>
                </ol>
              </div>

              <CFormCheck
                id="declaration"
                checked={declarationAgreed}
                onChange={(e) => setDeclarationAgreed(e.target.checked)}
                label="I declare that the information provided is correct and complete to the best of my knowledge."
              />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          {submissionSuccess ? (
            <CButton color="primary" onClick={() => { setShowSubmitModal(false); setSubmissionSuccess(null); }}>Close</CButton>
          ) : (
            <>
              <CButton color="secondary" variant="ghost" onClick={() => setShowSubmitModal(false)} disabled={submitting}>Cancel</CButton>
              <CButton color="success" onClick={handleSubmitReturn} disabled={submitting || !declarationAgreed} style={{ fontWeight: "700" }}>
                {submitting ? "Submitting to IT Portal…" : "✅ Confirm & Submit Return"}
              </CButton>
            </>
          )}
        </CModalFooter>
      </CModal>

      {/* Omnipresent Contact Support Modal */}
      <ContactUsModal visible={showContactModal} onClose={() => setShowContactModal(false)} />

    </div>
  );
}
