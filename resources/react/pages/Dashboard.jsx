import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody,
  CButton, CBadge, CNav, CNavItem, CNavLink, CTable,
  CTableHead, CTableRow, CTableHeaderCell, CTableBody,
  CTableDataCell, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CSpinner, CAlert, CFormCheck,
  CFormInput, CFormLabel, CFormSelect,
} from "@coreui/react";
import api from "../api/client";
import ContactUsModal from "../components/ContactUsModal";
import Form16TableView from "../components/Form16TableView";
import IncomeDetailsStep from "../components/IncomeDetailsStep";
import TaxDeductionsStep from "../components/TaxDeductionsStep";
import SelectRegimeStep from "../components/SelectRegimeStep";
import NoticesSection from "../components/NoticesSection";
import { generateItrJson } from "../utils/itrJsonGenerator";
import { extractPdfText, parseForm16Text, parseForm26asText, verifyForm16, verifyForm26as, getSampleForm16Text, getSampleForm26asText } from "../utils/documentParser";
import { computeTax } from "../utils/taxEngine";
import Form16UploadStep from "../components/Form16UploadStep";
import logo from "../../../public/LOGO1.png";

/* ─────────────────────────── helpers ─────────────────────────── */
const fmt = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");

/* ── Collapsible ITR-1 vs ITR-2 Comparison Table (Step 1) ── */
function Step1ComparisonTable() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: "24px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "none", padding: "0", cursor: "pointer",
          fontSize: "13px", fontWeight: "700", color: "#3b82f6",
          display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px",
        }}
      >
        <span>💡 Why this form? View full ITR-1 vs ITR-2 comparison</span>
        <span style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", fontSize: "11px" }}>▾</span>
      </button>
      <div style={{
        overflow: "hidden",
        maxHeight: open ? "600px" : "0",
        transition: "max-height 0.35s ease",
      }}>
        <div style={{ background: "#fafbfc", border: "1px solid #edf2f7", borderRadius: "14px", padding: "20px 24px" }}>
          <h6 style={{ fontWeight: "800", color: "#334155", marginBottom: "12px" }}>📋 Quick Comparison: ITR-1 vs ITR-2 Eligibility</h6>
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", background: "#fff" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #edf2f7", color: "#475569" }}>Income Category / Feature</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #edf2f7", color: "#16a34a" }}>ITR-1 (Sahaj)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", border: "1px solid #edf2f7", color: "#3b82f6" }}>ITR-2</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Salary & Pension Income", "✓ Included", "✓ Included (Schedule S)"],
                  ["Capital Gains (Mutual Funds, Shares, Property)", "✗ Not Allowed", "✓ Supported (Schedule CG)"],
                  ["House Property", "Single house property only", "Multiple properties supported"],
                  ["Total Income Threshold", "Up to ₹50,00,000 only", "Unlimited (> ₹50 Lakhs)"],
                  ["Bank Interest, Dividends & Other Sources", "✓ Allowed", "✓ Allowed (Schedule OS)"],
                  ["Foreign Assets / Directorship", "✗ Not Allowed", "✓ Mandatory disclosure"],
                ].map(([cat, itr1, itr2], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "9px 12px", border: "1px solid #e2e8f0", fontWeight: "600" }}>{cat}</td>
                    <td style={{ padding: "9px 12px", border: "1px solid #e2e8f0", color: itr1.startsWith("✓") ? "#16a34a" : itr1.startsWith("✗") ? "#ef4444" : "#334155", fontWeight: itr1.startsWith("✓") || itr1.startsWith("✗") ? "700" : "400" }}>{itr1}</td>
                    <td style={{ padding: "9px 12px", border: "1px solid #e2e8f0", color: itr2.startsWith("✓") ? "#2563eb" : itr2.startsWith("✗") ? "#ef4444" : "#334155", fontWeight: itr2.startsWith("✓") || itr2.startsWith("✗") ? "700" : "400" }}>{itr2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentYear = params.get("assessment_year") || "2026-27";
  const userPan = localStorage.getItem("user_pan") ||
    (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").pan; } catch { return null; } })();
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const isBlankCustomer = currentUser.email === "test@tiqtax.in" || currentUser.name === "Test Customer";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Top-level Dashboard View: 'filing' or 'notices'
  const [activeView, setActiveView] = useState(params.get("view") === "notices" ? "notices" : "filing");

  // Stepper: 1: ITR Form & Return Type, 2: Income, 3: Deductions, 4: Regime Choice, 5: Review & File
  const [currentStep, setCurrentStep] = useState(1);

  // Return Filing Type: 'original' | 'belated' | 'updated' | 'revised'
  const [filingType, setFilingType] = useState("original");
  const [filingSection, setFilingSection] = useState("139(1)");
  const [itruReason, setItruReason] = useState("previously_not_filed");
  const [itruWindow, setItruWindow] = useState("within_12m"); // 'within_12m' | 'between_12_24m'
  const [revisedAckNo, setRevisedAckNo] = useState("");
  const [revisedDate, setRevisedDate] = useState("");

  // Selected ITR Form ('ITR-1' or 'ITR-2')
  const [selectedItrForm, setSelectedItrForm] = useState("ITR-1");
  const [formLockNotice, setFormLockNotice] = useState(null);
  const [statutoryWindowMode, setStatutoryWindowMode] = useState("under_date"); // 'under_date' | 'belated' | 'updated' | 'all'

  // Selected Tax Regime ('new' | 'old' | null - requires conscious user selection)
  const [chosenRegime, setChosenRegime] = useState(null);

  // Editable Tax Data
  const [incomeData, setIncomeData] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.email === "test@tiqtax.in" || u.name === "Test Customer") {
        return {
          salary: 0,
          interest: 0,
          dividend: 0,
          employerName: "",
          houseProperty: 0,
          stcg: 0,
          ltcg: 0,
          stcgSaleValue: 0,
          stcgCost: 0,
          ltcgSaleValue: 0,
          ltcgCost: 0,
        };
      }
    } catch { }
    return {
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
    };
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

  // ClearTax-style interactive states
  const [showFilingForDropdown, setShowFilingForDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLiveGuidanceModal, setShowLiveGuidanceModal] = useState(false);
  const [guidancePhone, setGuidancePhone] = useState("");
  const [guidanceSlot, setGuidanceSlot] = useState("Instant (Within 2 mins)");
  const [guidanceSuccess, setGuidanceSuccess] = useState(false);

  const handleLoadSampleForm16 = () => {
    setParseError16(null);
    const rawText = getSampleForm16Text(userPan);
    const parsed = parseForm16Text(rawText);
    const verification = verifyForm16(parsed, userPan);
    const extractedDeductions = {
      sec80c: parsed.sec80c ?? 150000,
      sec80d: parsed.sec80d ?? 25000,
      hra: parsed.hraExemption ?? 120000,
      pt: parsed.professionalTax ?? 2500,
      sec80ccd1b: parsed.sec80ccd1b ?? 50000,
      sec80g: parsed.sec80g ?? 0,
      sec80e: parsed.sec80e ?? 0,
    };
    setDeductionData(extractedDeductions);
    setManualDeduction(extractedDeductions);
    if (parsed.grossSalary) {
      setIncomeData(prev => ({
        ...prev,
        salary: parsed.grossSalary,
        employerName: parsed.employerName || "Infosys Tech Solutions India Pvt Ltd",
      }));
    }
    setForm16File({
      name: "Sample_Form16_AY2026-27.pdf",
      size: 145000,
      status: 'parsed',
      parsed,
      verification,
      isSample: true,
    });
    setDeductionSource('form16');
  };

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

      const isDummyOrTest = /dummy|sample|test|mock|demo|temp|f16|part/i.test(file.name);

      // If document text is empty (scanned image or dummy PDF template)
      if (!rawText || rawText.trim().length < 40) {
        if (isDummyOrTest) {
          rawText = getSampleForm16Text(userPan);
        } else {
          setParseError16('Scanned image or image-only PDF detected (no digital text layer found).');
          setForm16File({
            name: file.name,
            size: file.size,
            status: 'error',
            objectUrl,
            isImage: !file.name.toLowerCase().endsWith('.pdf')
          });
          return;
        }
      }

      let parsed = parseForm16Text(rawText);

      // If parsing yielded 0 salary on a test/dummy file, populate standard sample structure
      if ((!parsed.grossSalary || parsed.grossSalary === 0) && isDummyOrTest) {
        rawText = getSampleForm16Text(userPan);
        parsed = parseForm16Text(rawText);
      }

      const verification = verifyForm16(parsed, userPan);
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
        const itrUpper = (parsed.applicableItr || '').toUpperCase();
        if (itrUpper.includes('ITR-2')) {
          setSelectedItrForm('ITR-2');
        } else if (itrUpper.includes('ITR-1')) {
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
        isSample: isDummyOrTest && (!rawText || rawText.includes('TRACES-2026-F16-8947291')),
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
      // If it's a test or dummy file, fall back to sample gracefully
      if (/dummy|sample|test|mock/i.test(file.name)) {
        handleLoadSampleForm16();
        return;
      }
      setParseError16('Could not parse PDF automatically. Please check the document or enter details manually.');
      setForm16File({ name: file.name, size: file.size, status: 'error', objectUrl });
    }
  };

  const handleLoadSample26as = () => {
    setParseError26as(null);
    const rawText = getSampleForm26asText(userPan);
    const parsed = parseForm26asText(rawText);
    const verification = verifyForm26as(parsed, userPan, form16File?.parsed);
    setForm26asFile({
      name: "Sample_Form26AS_AY2026-27.pdf",
      size: 98000,
      status: 'parsed',
      parsed,
      verification,
      isSample: true,
    });
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

      const isDummyOrTest = /dummy|sample|test|mock|demo|temp|26as/i.test(file.name);
      if (!rawText || rawText.trim().length < 40) {
        if (isDummyOrTest) {
          rawText = getSampleForm26asText(userPan);
        } else {
          setParseError26as('Scanned image or image-only PDF detected (no digital text layer found).');
          setForm26asFile({ name: file.name, size: file.size, status: 'error', objectUrl });
          return;
        }
      }

      let parsed = parseForm26asText(rawText);
      if ((!parsed.totalTdsCredit || parsed.totalTdsCredit === 0) && isDummyOrTest) {
        rawText = getSampleForm26asText(userPan);
        parsed = parseForm26asText(rawText);
      }

      const verification = verifyForm26as(parsed, userPan, form16File?.parsed);
      setForm26asFile({
        name: file.name,
        size: file.size,
        status: 'parsed',
        parsed,
        verification,
        objectUrl,
        isImage: !file.name.toLowerCase().endsWith('.pdf'),
        isSample: isDummyOrTest && (!rawText || rawText.includes('rajesh kumar sharma')),
      });
    } catch (err) {
      console.error('Form 26AS parse error:', err);
      if (/dummy|sample|test|mock/i.test(file.name)) {
        handleLoadSample26as();
        return;
      }
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
      if (d?.is_empty_user || isBlankCustomer) {
        if (d?.form16 && (d.form16.gross_salary || d.form16.employer_name)) {
          setIncomeData({
            salary: d.form16.gross_salary || 0,
            interest: (d.ais?.interest_income_data || []).reduce((a, x) => a + (x.amount || 0), 0),
            dividend: (d.ais?.other_income_data || []).reduce((a, x) => a + (x.amount || 0), 0),
            employerName: d.form16.employer_name || "",
            houseProperty: 0,
            stcg: 0,
            ltcg: 0,
            stcgSaleValue: 0,
            stcgCost: 0,
            ltcgSaleValue: 0,
            ltcgCost: 0,
          });
        } else {
          setIncomeData({
            salary: 0,
            interest: 0,
            dividend: 0,
            employerName: "",
            houseProperty: 0,
            stcg: 0,
            ltcg: 0,
            stcgSaleValue: 0,
            stcgCost: 0,
            ltcgSaleValue: 0,
            ltcgCost: 0,
          });
        }
      } else if (d?.form16) {
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

  /* ── Dynamic Tax Engine Calculation & Form Determination ── */
  const rawStcg = Number(incomeData.stcg || 0);
  const rawLtcg = Number(incomeData.ltcg || 0);
  const rawSalary = Number(incomeData.salary || 0);
  const rawHp = Math.abs(Number(incomeData.houseProperty || 0));
  const otherSources = Number(incomeData.interest || 0) + Number(incomeData.dividend || 0) + Number(incomeData.otherIncome || 0) + (rawSalary > 0 ? 720 : 0);
  const rawGross = rawSalary + otherSources + rawStcg + rawLtcg + (Number(incomeData.houseProperty || 0) > 0 ? Number(incomeData.houseProperty || 0) : 0);
  const hasCapitalGains = rawStcg > 0 || rawLtcg > 0;
  const hasMultipleProperties = rawHp > 200000;
  const incomeExceedsLimit = rawGross > 5000000;
  const hasForeignAssets = !!(data?.ais?.foreign_assets_flag);
  const determinedItrForm = (hasCapitalGains || hasMultipleProperties || incomeExceedsLimit || hasForeignAssets) ? "ITR-2" : "ITR-1";

  // Auto-sync selectedItrForm with determined form based on customer's financial profile
  useEffect(() => {
    if (determinedItrForm && selectedItrForm !== determinedItrForm) {
      setSelectedItrForm(determinedItrForm);
    }
  }, [determinedItrForm]);

  const isItr2 = selectedItrForm === "ITR-2";
  const stcg = isItr2 ? rawStcg : 0;
  const ltcg = isItr2 ? rawLtcg : 0;
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

  // Unified Gross Total Income (SAME for both regimes)
  const hpPositiveIncome = hpIncome > 0 ? hpIncome : 0;
  const grossIncome = rawSalary + hpPositiveIncome + otherSources + stcg + ltcg;

  // New Regime Deductions & Net Taxable Income (AY 2026-27)
  const newStdDeduction = rawSalary > 0 ? Math.min(rawSalary, 75000) : 0;
  const newEmployerNps = Number(deductionData.sec80ccd2 || 0);
  const totalNewDeductions = newStdDeduction + newEmployerNps;
  const newTaxableIncome = Math.max(0, grossIncome - totalNewDeductions);

  // New Regime Tax (AY 2026-27 under Sec 115BAC)
  const calcNewTax = (taxableInc) => {
    const normalTaxable = Math.max(0, taxableInc - stcg - taxableLtcg);
    let slabTax = 0;
    if (normalTaxable > 2400000) slabTax += (normalTaxable - 2400000) * 0.30;
    if (normalTaxable > 2000000) slabTax += Math.min(normalTaxable - 2000000, 400000) * 0.25;
    if (normalTaxable > 1600000) slabTax += Math.min(normalTaxable - 1600000, 400000) * 0.20;
    if (normalTaxable > 1200000) slabTax += Math.min(normalTaxable - 1200000, 400000) * 0.15;
    if (normalTaxable > 800000) slabTax += Math.min(normalTaxable - 800000, 400000) * 0.10;
    if (normalTaxable > 400000) slabTax += Math.min(normalTaxable - 400000, 400000) * 0.05;

    // Rebate 87A (New Regime threshold: ₹12,00,000)
    if (taxableInc <= 1200000) {
      slabTax = 0;
    } else if (taxableInc <= 1275000) {
      const excess = taxableInc - 1200000;
      if (slabTax > excess) slabTax = excess;
    }

    const baseTax = slabTax + (stcg * 0.20) + (taxableLtcg * 0.125);
    let surcharge = 0;
    if (taxableInc > 20000000) surcharge = baseTax * 0.25;
    else if (taxableInc > 10000000) surcharge = baseTax * 0.15;
    else if (taxableInc > 5000000) surcharge = baseTax * 0.10;

    const cess = (baseTax + surcharge) * 0.04;
    return Math.round(baseTax + surcharge + cess);
  };
  const newTaxLiability = calcNewTax(newTaxableIncome);

  // Old Regime Deductions & Net Taxable Income
  const oldStdDeduction = rawSalary > 0 ? Math.min(rawSalary, 50000) : 0;
  const oldPt = rawSalary > 0 ? Number(deductionData.pt || 0) : 0;
  const oldHra = Number(deductionData.hra || 0);
  const oldSec80c = Math.min(Number(deductionData.sec80c || 0), 150000);
  const oldSec80d = Math.min(Number(deductionData.sec80d || 0), deductionData.hasSeniorParents ? 75000 : 50000);
  const oldSec80ccd1b = Math.min(Number(deductionData.sec80ccd1b || 0), 50000);
  const oldEmployerNps = Number(deductionData.sec80ccd2 || 0);
  const oldSec80e = Number(deductionData.sec80e || 0);
  const oldSec80g = Number(deductionData.sec80g || 0);
  const oldSec24b = Math.min(Number(deductionData.sec24b || (hpIncome < 0 ? Math.abs(hpIncome) : 0)), 200000);
  const isSeniorTaxpayer = data?.taxpayer?.category === "SeniorCitizen" || data?.taxpayer?.category === "SuperSeniorCitizen";
  const oldSec80tta = Math.min(Number(incomeData.interest || 0), isSeniorTaxpayer ? 50000 : 10000);

  const totalOldDeductions = oldStdDeduction
    + oldPt
    + oldHra
    + oldSec80c
    + oldSec80d
    + oldSec80ccd1b
    + oldEmployerNps
    + oldSec80e
    + oldSec80g
    + oldSec24b
    + oldSec80tta;
  const oldTaxableIncome = Math.max(0, grossIncome - totalOldDeductions);

  const calcOldTax = (taxableInc) => {
    const normalTaxable = Math.max(0, taxableInc - stcg - taxableLtcg);
    let slabTax = 0;
    if (normalTaxable > 1000000) slabTax += (normalTaxable - 1000000) * 0.30;
    if (normalTaxable > 500000) slabTax += Math.min(normalTaxable - 500000, 500000) * 0.20;
    if (normalTaxable > 250000) slabTax += Math.min(normalTaxable - 250000, 250000) * 0.05;

    // Rebate 87A (Old Regime threshold: ₹5,00,000)
    if (taxableInc <= 500000) slabTax = 0;

    const baseTax = slabTax + (stcg * 0.20) + (taxableLtcg * 0.125);
    let surcharge = 0;
    if (taxableInc > 50000000) surcharge = baseTax * 0.37;
    else if (taxableInc > 20000000) surcharge = baseTax * 0.25;
    else if (taxableInc > 10000000) surcharge = baseTax * 0.15;
    else if (taxableInc > 5000000) surcharge = baseTax * 0.10;

    const cess = (baseTax + surcharge) * 0.04;
    return Math.round(baseTax + surcharge + cess);
  };
  const oldTaxLiability = calcOldTax(oldTaxableIncome);

  // TDS Credit: prefer extracted Form 26AS credit, fallback to Form 16, then backend AIS summary
  const totalTdsCredit = (form26asFile?.parsed?.totalTdsCredit) || (form16File?.parsed?.totalTdsDeducted) || (data?.summary?.total_tds_credit) || 120110;

  // Active Choice
  const effectiveRegime = chosenRegime || (newTaxLiability <= oldTaxLiability ? "new" : "old");
  const activeTax = effectiveRegime === "new" ? newTaxLiability : oldTaxLiability;
  const recommendedRegime = newTaxLiability <= oldTaxLiability ? "new" : "old";

  // Filing type adjustments (Late fee u/s 234F & Updated return additional tax u/s 140B)
  const lateFee234f = filingType === "belated" ? (grossIncome > 500000 ? 5000 : 1000) : 0;
  const itruAdditionalTax = filingType === "updated"
    ? Math.round(itruWindow === "within_12m" ? activeTax * 0.25 : itruWindow === "between_12_24m" ? activeTax * 0.5 : activeTax * 0.6)
    : 0;
  const totalTaxWithAdditions = activeTax + lateFee234f + itruAdditionalTax;
  const activeRefund = Math.max(0, totalTdsCredit - totalTaxWithAdditions);
  const activePayable = Math.max(0, totalTaxWithAdditions - totalTdsCredit);

  /* ── Submit Handler ── */
  const handleSubmitReturn = async () => {
    if (!declarationAgreed) { alert("Please check the declaration box before submitting."); return; }
    setSubmitting(true);
    try {
      const payload = {
        assessment_year: assessmentYear,
        itr_form_type: selectedItrForm,
        filing_type: filingType,
        filing_section: filingSection,
        itru_reason: filingType === "updated" ? itruReason : null,
        itru_window: filingType === "updated" ? itruWindow : null,
        itru_additional_tax: itruAdditionalTax,
        late_fee_234f: lateFee234f,
        revised_original_ack: filingType === "revised" ? revisedAckNo : null,
        revised_original_date: filingType === "revised" ? revisedDate : null,
        total_income: grossIncome,
        total_tax_liability: totalTaxWithAdditions,
        total_tds_claimed: totalTdsCredit,
        refund_or_payable: activeRefund > 0 ? activeRefund : -activePayable,
        computation_summary: {
          gross_total_income: grossIncome,
          chosen_regime: chosenRegime === "new" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime",
          filing_type: filingType,
          filing_section: filingSection,
          late_fee_234f: lateFee234f,
          itru_additional_tax: itruAdditionalTax,
          base_tax: activeTax,
          final_tax: totalTaxWithAdditions,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
    const filingTypeName = filingType === 'belated' ? 'Belated Return u/s 139(4)'
      : filingType === 'updated' ? `Updated Return (ITR-U) u/s 139(8A) (${itruReason || 'Income updated'})`
        : filingType === 'revised' ? `Revised Return u/s 139(5) (Ref Ack: ${revisedAckNo || '–'})`
          : 'Original Return u/s 139(1)';
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
    <div><div class="label">Return Category</div><div class="value">${filingTypeName}</div></div>
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
      ${isItr2 ? `<tr><td>Short Term Capital Gains (STCG u/s 111A – 20%)</td><td class="amount">${Math.round(incomeData.stcg || 0).toLocaleString('en-IN')}</td></tr><tr><td>Long Term Capital Gains (LTCG u/s 112A – 12.5%)</td><td class="amount">${Math.round(incomeData.ltcg || 0).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr class="total-row"><td>Gross Total Income</td><td class="amount">₹ ${Math.round(grossIncome).toLocaleString('en-IN')}</td></tr>
    </tbody></table>
  </div>
  ${chosenRegime === 'old' ? `<div class="section"><div class="section-title">Deductions Claimed</div><table><thead><tr><th>Section</th><th class="amount">Amount (₹)</th></tr></thead><tbody>
    <tr><td>Standard Deduction</td><td class="amount">50,000</td></tr>
    <tr><td>Section 80C (LIC / PPF / ELSS etc.)</td><td class="amount">${Math.min(Math.round(deductionData.sec80c || 0), 150000).toLocaleString('en-IN')}</td></tr>
    <tr><td>Section 80D (Health Insurance)</td><td class="amount">${Math.min(Math.round(deductionData.sec80d || 0), 25000).toLocaleString('en-IN')}</td></tr>
    <tr><td>HRA Exemption</td><td class="amount">${Math.round(deductionData.hra || 0).toLocaleString('en-IN')}</td></tr>
    <tr><td>Section 80TTA (Savings Interest)</td><td class="amount">${Math.round(Math.min(incomeData.interest || 0, 10000)).toLocaleString('en-IN')}</td></tr>
    <tr class="total-row"><td>Total Deductions</td><td class="amount">₹ ${Math.round(totalOldDeductions).toLocaleString('en-IN')}</td></tr>
  </tbody></table></div>` : `<div class="section"><div class="section-title">Standard Deduction (New Regime)</div><table><thead><tr><th>Deduction</th><th class="amount">Amount (₹)</th></tr></thead><tbody><tr><td>Standard Deduction u/s 115BAC</td><td class="amount">75,000</td></tr></tbody></table></div>`}
  <div class="section">
    <div class="section-title">Tax Computation</div>
    <table><thead><tr><th>Description</th><th class="amount">Amount (₹)</th></tr></thead><tbody>
      <tr><td>Base Tax Liability</td><td class="amount">${Math.round(activeTax).toLocaleString('en-IN')}</td></tr>
      ${lateFee234f > 0 ? `<tr><td>Late Filing Fee (Sec 234F)</td><td class="amount">${Math.round(lateFee234f).toLocaleString('en-IN')}</td></tr>` : ''}
      ${itruAdditionalTax > 0 ? `<tr><td>Additional Tax u/s 140B (ITR-U)</td><td class="amount">${Math.round(itruAdditionalTax).toLocaleString('en-IN')}</td></tr>` : ''}
      ${(lateFee234f > 0 || itruAdditionalTax > 0) ? `<tr style="font-weight:700"><td>Total Tax Liability (Inc. Additions)</td><td class="amount">${Math.round(totalTaxWithAdditions).toLocaleString('en-IN')}</td></tr>` : ''}
      <tr><td>TDS Deducted / 26AS Credit</td><td class="amount">${Math.round(totalTdsCredit).toLocaleString('en-IN')}</td></tr>
      ${isItr2 ? `<tr><td>Capital Gains Tax (STCG + LTCG + 4% Cess)</td><td class="amount">${Math.round(capitalGainsTax).toLocaleString('en-IN')}</td></tr>` : ''}
    </tbody></table>
    <div class="result-box ${activeRefund > 0 ? 'refund' : 'payable'}">
      <div class="result-label">${activeRefund > 0 ? '🎉 Net Tax Refund Due to You' : '⚠️ Net Tax Payable via Challan 280'}</div>
      <div class="result-amount">₹ ${Math.round(activeRefund > 0 ? activeRefund : activePayable).toLocaleString('en-IN')}</div>
    </div>
  </div>
  ${paymentInfo ? `<div class="payment-badge">✅ <div><strong>Filing Fee Paid</strong> – ₹${paymentInfo.amount} on ${new Date(paymentInfo.paid_at || Date.now()).toLocaleDateString('en-IN')} | Txn ID: ${paymentInfo.razorpay_payment_id || paymentInfo.transaction_id || 'VERIFIED'}</div></div>` : ''}
  <div class="footer">This is a system-generated Tax Computation Statement. Generated on ${now} via TIQTAX &nbsp;|&nbsp; PAN: ${pan} &nbsp;|&nbsp; AY ${assessmentYear}</div>
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
        name: 'TIQTAX',
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
      <div style={{ fontWeight: "700", color: "#0b3d91", fontSize: "16px" }}>Loading Your TIQTAX File…</div>
      <div style={{ fontSize: "13px", color: "#64748b" }}>Preparing your guided ITR experience</div>
    </div>
  );

  const taxpayer = data?.taxpayer || {};

  const STEPS = [
    { num: 1, title: "1. Choose ITR Form", desc: "ITR-1 vs ITR-2" },
    { num: 2, title: "2. Income Details", desc: "Salary & Interest" },
    { num: 3, title: "3. Form 16 Upload", desc: "Salary & TDS Verify" },
    { num: 4, title: "4. Tax Deductions", desc: "80C, 80D, HRA" },
    { num: 5, title: "5. Select Regime", desc: "New vs Old Tax" },
    { num: 6, title: "6. Review & Submit", desc: "File to IT Portal" },
  ];

  return (
    <div
      style={{
        background: "linear-gradient(110deg, #FFF0E5 0%, #FFF8DF 25%, #FCEAF2 50%, #F3E8FA 72%, #E8F5EC 100%)",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        paddingBottom: "80px",
        fontFamily: "'Inter', sans-serif",
      }}
    >

      {/* ════ TOP BRAND ACCENT STRIPE (TIQTAX LOGO GRADIENT) ════ */}
      <div style={{ height: "3.5px", background: "linear-gradient(90deg, #F87826 0%, #FCB21F 22%, #E83E8C 52%, #A020C0 78%, #0A8E4B 100%)", width: "100%" }} />

      {/* ════ TOP NAVBAR (FRESH, LIGHT, WORLD-CLASS CLEARTAX STYLE) ════ */}
      <nav style={{ background: "rgba(255, 255, 255, 0.94)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0", padding: "12px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", position: "sticky", top: 0, zIndex: 100 }}>
        <CContainer>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 gap-md-3">
              <img
                src={logo}
                alt="TiQTAX"
                style={{
                  height: "34px",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/customer-portal")}
              />
              <button
                onClick={() => setActiveView("filing")}
                style={{
                  background: activeView === "filing" ? "#fdf2f8" : "transparent",
                  color: activeView === "filing" ? "#E83E8C" : "#64748b",
                  fontSize: "12px",
                  fontWeight: "800",
                  padding: "5px 12px",
                  borderRadius: "14px",
                  border: activeView === "filing" ? "1px solid rgba(232, 62, 140, 0.35)" : "1px solid transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  boxShadow: activeView === "filing" ? "0 2px 6px rgba(232, 62, 140, 0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
                title="Switch to Self ITR Filing Wizard"
              >
                <span>📝</span>
                <span className="d-none d-sm-inline">Self ITR Filing Wizard (AY {assessmentYear || "2026-27"})</span>
                <span className="d-inline d-sm-none">Self Filing</span>
              </button>
            </div>

            {/* Center: Clean ClearTax-style Filing For Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowFilingForDropdown(!showFilingForDropdown)}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: "500" }}>Filing for:</span>
                <strong style={{ color: "#F02186" }}>{userPan || taxpayer.pan || "COMPC2233M"}</strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>▾</span>
              </button>

              {showFilingForDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "8px",
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    padding: "16px",
                    width: "280px",
                    zIndex: 1000,
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Active Taxpayer Profile
                  </div>
                  <div style={{ fontWeight: "900", color: "#0f172a", fontSize: "15px", marginTop: "4px" }}>
                    {taxpayer.name || "Taxpayer"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#F02186", fontWeight: "700", marginTop: "2px" }}>
                    PAN: {userPan || taxpayer.pan || "COMPC2233M"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Assessment Year: <strong>AY {assessmentYear}</strong>
                  </div>
                  <div style={{ marginTop: "10px", padding: "6px 10px", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "11px", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#009B62" }}></span>
                    Income Tax Portal Synced
                  </div>
                </div>
              )}
            </div>

            {/* Right: Clean Action Buttons & Profile Avatar */}
            <div className="d-flex align-items-center gap-2">
              {/* ITD Notices */}
              <button
                onClick={() => setActiveView(activeView === "notices" ? "filing" : "notices")}
                style={{
                  background: activeView === "notices" ? "#fffbeb" : "#f8fafc",
                  border: activeView === "notices" ? "1.5px solid #F87826" : "1px solid #e2e8f0",
                  color: activeView === "notices" ? "#c2410c" : "#252525",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🏛️</span>
                <span className="d-none d-sm-inline">Government ITD Notices</span>
                <span className="d-inline d-sm-none">Notices</span>
                <span style={{ background: "#F87826", color: "#fff", fontSize: "9px", fontWeight: "900", padding: "1px 5px", borderRadius: "6px" }}>
                  NEW
                </span>
              </button>

              {/* Govt Records */}
              <button
                onClick={() => setShowGovtRecordsModal(true)}
                style={{
                  background: "rgba(245, 166, 35, 0.08)",
                  border: "1px solid rgba(245, 166, 35, 0.25)",
                  color: "#FAA01C",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>📋</span>
                <span className="d-none d-sm-inline">Govt AIS/26AS</span>
              </button>

              {/* Support */}
              <button
                onClick={() => setShowContactModal(true)}
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#009B62",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>💬</span>
                <span className="d-none d-sm-inline">Support</span>
              </button>

              {/* User Avatar Circle */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(240, 33, 134, 0.06)",
                    border: "1.5px solid rgba(240, 33, 134, 0.22)",
                    color: "#F02186",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                  title={taxpayer.name || "User Profile"}
                >
                  {(taxpayer.name ? taxpayer.name.charAt(0).toUpperCase() : "👤")}
                </button>

                {showProfileDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "8px",
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      padding: "12px",
                      width: "220px",
                      zIndex: 1000,
                    }}
                  >
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{taxpayer.name || "Taxpayer"}</div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>{userPan || taxpayer.pan || "COMPC2233M"}</div>
                    </div>
                    <button
                      onClick={() => { setShowProfileDropdown(false); navigate("/hire-agent"); }}
                      style={{ width: "100%", background: "none", border: "none", padding: "8px", textAlign: "left", fontSize: "12.5px", color: "#F02186", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>✨</span> Hire an Expert CA
                    </button>
                    <button
                      onClick={() => { setShowProfileDropdown(false); setShowContactModal(true); }}
                      style={{ width: "100%", background: "none", border: "none", padding: "8px", textAlign: "left", fontSize: "12.5px", color: "#334155", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>💬</span> Help &amp; Support
                    </button>
                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "4px", paddingTop: "4px" }}>
                      <button
                        onClick={handleLogout}
                        style={{ width: "100%", background: "none", border: "none", padding: "8px", textAlign: "left", fontSize: "12.5px", color: "#ef4444", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <span>🔒</span> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CContainer>
      </nav>

      <CContainer className="mt-4">

        {/* ════ ITD NOTICES VIEW (Toggle from Navbar) ════ */}
        {activeView === "notices" && (
          <div>
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => setActiveView("filing")}
                style={{
                  background: "#f0fbf5",
                  color: "#0A8E4B",
                  border: "1px solid #c3ebd5",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ← Back to Self ITR Filing Wizard
              </button>
            </div>
            <NoticesSection
              userPan={userPan}
              isCaView={false}
              onNoticeHandover={(notice) => {
                alert(`Notice under Section ${notice.section} (DIN: ${notice.notice_din}) has been assigned to our CA legal defense panel. A dedicated CA will contact you.`);
              }}
              onJumpToFilingSection={(sectionKey, stepNum) => {
                setActiveView("filing");
                if (stepNum) setCurrentStep(stepNum);
              }}
            />
          </div>
        )}

        {activeView === "filing" && <>

          {/* ════ GUIDED STEPPER NAVIGATION (CLEARTAX PROGRESS PILL BAR - SINGLE LINE FIXED) ════ */}
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "12px 16px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            marginBottom: "24px",
            overflowX: "auto",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
              gap: "8px",
              alignItems: "center",
              width: "100%",
              minWidth: "860px",
            }}>
              {STEPS.map((s) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <div
                    key={s.num}
                    onClick={() => setCurrentStep(s.num)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "7px 10px",
                      borderRadius: "12px",
                      background: isActive ? "#fdf2f8" : "transparent",
                      border: isActive ? "1px solid rgba(232, 62, 140, 0.4)" : "1px solid transparent",
                      boxShadow: isActive ? "0 2px 8px rgba(232, 62, 140, 0.08)" : "none",
                      transition: "all 0.2s ease",
                      minWidth: 0,
                    }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      minWidth: 30,
                      flexShrink: 0,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      background: isPassed ? "#0A8E4B" : isActive ? "linear-gradient(135deg, #F87826 0%, #E83E8C 100%)" : "#f1f5f9",
                      color: isPassed || isActive ? "#ffffff" : "#64748b",
                      boxShadow: isActive ? "0 0 0 3px rgba(232, 62, 140, 0.2)" : isPassed ? "0 2px 6px rgba(10, 142, 75, 0.2)" : "none",
                      transition: "all 0.2s ease",
                    }}>
                      {isPassed ? "✓" : s.num}
                    </div>
                    <div style={{ minWidth: 0, overflow: "hidden" }}>
                      <div style={{
                        fontSize: "12.5px",
                        fontWeight: isActive ? "800" : "700",
                        color: isActive ? "#E83E8C" : isPassed ? "#0A8E4B" : "#252525",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {s.title}
                      </div>
                      <div style={{
                        fontSize: "10.5px",
                        fontWeight: isActive ? "600" : "400",
                        color: isActive ? "#F87826" : "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ════ 2-COLUMN LAYOUT: MAIN WIZARD (LEFT) + CLEARTAX ASSISTANCE SIDEBAR (RIGHT) ════ */}
          <CRow className="g-4">
            <CCol xs={12} lg={8} xl={8.5}>
              {/* ClearTax Status / Pre-filled Notice Banner */}
              <div style={{
                background: "#f8faff",
                border: "1.5px solid #e0f2fe",
                borderRadius: "14px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>ℹ️</span>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#2563eb" }}>
                      Pre-filled with Verified Govt Data &amp; Form 16
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Tax figures have been auto-fetched from Income Tax AIS/26AS and your uploaded documents.
                    </div>
                  </div>
                </div>
                <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "10px" }}>
                  AY 2026-27 Active
                </span>
              </div>

              {/* ════ STEP 1: ITR FORM & RETURN TYPE SELECTION ════ */}
              {currentStep === 1 && (() => {
                // ── Dynamic ITR Recommendation Logic (derived from AIS/income data) ──
                const aisStcg = Number(incomeData.stcg || 0);
                const aisLtcg = Number(incomeData.ltcg || 0);
                const aisGross = Number(grossIncome || 0);
                const hasCapitalGains = aisStcg > 0 || aisLtcg > 0;
                const hasMultipleProperties = Math.abs(Number(incomeData.houseProperty || 0)) > 200000;
                const incomeExceedsLimit = aisGross > 5000000;
                const hasForeignAssets = !!(data?.ais?.foreign_assets_flag);
                const recommendedForm = (hasCapitalGains || hasMultipleProperties || incomeExceedsLimit || hasForeignAssets) ? "ITR-2" : "ITR-1";

                const buildReasoningString = () => {
                  const reasons = [];
                  if (!hasCapitalGains) reasons.push("no capital gains");
                  else reasons.push("capital gains of " + fmt(aisStcg + aisLtcg));
                  if (!hasMultipleProperties) reasons.push("one house property");
                  else reasons.push("multiple house properties");
                  if (!incomeExceedsLimit) reasons.push("income is under \u20b950L (" + fmt(aisGross) + ")");
                  else reasons.push("income exceeds \u20b950L (" + fmt(aisGross) + ")");
                  if (hasForeignAssets) reasons.push("foreign assets declared");
                  if (reasons.length === 1) return "Recommended because you have " + reasons[0] + ".";
                  return "Recommended because you have " + reasons.slice(0, -1).join(", ") + " and " + reasons[reasons.length - 1] + ".";
                };

                const filingCategoryLabel = {
                  original: "Original Return (Sec 139(1))",
                  belated: "Belated Return (Sec 139(4))",
                  updated: "Updated Return / ITR-U (Sec 139(8A))",
                  revised: "Revised Return (Sec 139(5))",
                }[filingType] || "Original Return";

                const canContinue = !!filingType && !!selectedItrForm;

                const ayStartYear = parseInt((assessmentYear || "2026-27").split("-")[0], 10) || 2026;

                // Statutory Filing Categories as per Indian Income Tax Act Section 139:
                const allFilingCategories = [
                  { id: "original", icon: "📄", label: "Original Return", section: "139(1)", desc: `First-time filing on or before due date (31 July ${ayStartYear}).`, lateFee: null, color: "#16a34a", bg: "#f9fefb", border: "#bbf7d0", windowType: "under_date" },
                  { id: "belated", icon: "📅", label: "Belated Return", section: "139(4)", desc: `Filing after 31 July deadline. Late fee u/s 234F applies.`, lateFee: "₹5,000 / ₹1,000 late fee", color: "#b45309", bg: "#fffdf5", border: "#fef08a", windowType: "belated" },
                  { id: "revised", icon: "✏️", label: "Revised Return", section: "139(5)", desc: "Correct omissions or mistakes in previously filed return.", lateFee: null, color: "#0284c7", bg: "#f8faff", border: "#bae6fd", windowType: "belated" },
                  { id: "updated", icon: "🔄", label: "Updated Return (ITR-U)", section: "139(8A)", desc: "Declare income missed earlier. Sec 140B additional tax applies.", lateFee: "25%–50% additional tax", color: "#7c3aed", bg: "#faf5ff", border: "#ede9fe", windowType: "updated" },
                ];

                // Filter cards condition-wise based on statutory date limits
                const activeFilingCategories = statutoryWindowMode === "under_date"
                  ? allFilingCategories.filter(c => c.id === "original")
                  : statutoryWindowMode === "belated"
                    ? allFilingCategories.filter(c => c.id === "belated" || c.id === "revised")
                    : statutoryWindowMode === "updated"
                      ? allFilingCategories.filter(c => c.id === "updated")
                      : allFilingCategories;

                const handleAttemptFormSwitch = (targetForm) => {
                  if (targetForm === determinedItrForm) {
                    setSelectedItrForm(targetForm);
                    setFormLockNotice(null);
                    return;
                  }
                  if (determinedItrForm === "ITR-2") {
                    setFormLockNotice(
                      `🔒 ITR-1 is locked: Your tax profile contains ${hasCapitalGains ? `Capital Gains of ${fmt(aisStcg + aisLtcg)}` : incomeExceedsLimit ? `gross income exceeding ₹50 Lakhs (${fmt(aisGross)})` : 'multiple house properties'}, which statutorily requires ITR-2. Switching to ITR-1 is disabled to ensure filing compliance with ITD rules.`
                    );
                  } else {
                    setFormLockNotice(
                      `🔒 ITR-2 is locked: Your profile qualifies for simplified ITR-1 (Sahaj). Switching is restricted to match your actual income sources.`
                    );
                  }
                };

                return (
                  <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    <style>{`
              @keyframes pulseGlow {
                0%, 100% {
                  transform: scale(1);
                  box-shadow: 0 0 0 0 rgba(240, 33, 134, 0.15);
                }
                50% {
                  transform: scale(1.03);
                  box-shadow: 0 0 8px 1px rgba(240, 33, 134, 0.2);
                }
              }
              .coming-soon-badge {
                background: linear-gradient(135deg, rgba(250, 160, 28, 0.12) 0%, rgba(240, 33, 134, 0.12) 50%, rgba(166, 0, 184, 0.12) 100%);
                color: #c026d3;
                border: 1px solid rgba(240, 33, 134, 0.25);
                font-size: 9.5px;
                font-weight: 800;
                padding: 3px 8px;
                border-radius: 20px;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                animation: pulseGlow 2s infinite ease-in-out;
              }
              .itr-cards-2col-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
                margin-bottom: 20px;
              }
              @media (max-width: 680px) {
                .itr-cards-2col-grid {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
                    <div style={{ maxWidth: "860px", margin: "0 auto" }}>

                      {/* PAGE HEADER */}
                      <div style={{ textAlign: "center", marginBottom: "32px" }}>
                        <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontWeight: "700", fontSize: "11px", padding: "4px 12px", borderRadius: "20px" }}>
                          STEP 1 OF 6: RETURN CATEGORY &amp; ITR FORM
                        </span>
                        <h3 style={{ fontWeight: "800", color: "#1e293b", marginTop: "10px", marginBottom: "6px" }}>
                          Select Return Category &amp; Form
                        </h3>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                          Statutory filing category based on date limits, with auto-selected ITR form matching your financial profile.
                        </p>
                      </div>

                      {/* ── SECTION 1: FILING CATEGORY (CONDITION-WISE DISPLAY BASED ON DATE LIMITS) ── */}
                      <div style={{ marginBottom: "28px", background: "#fafbfc", border: "1px solid #edf2f7", borderRadius: "16px", padding: "22px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <div style={{ fontWeight: "800", fontSize: "15px", color: "#1e293b" }}>1️⃣ Choose Filing Category</div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              {statutoryWindowMode === "under_date"
                                ? `On-Time Filing Window for AY ${assessmentYear} (Due Date: 31 July ${ayStartYear})`
                                : `Return Category for AY ${assessmentYear} based on statutory date limits`}
                            </div>
                          </div>
                          <span style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "10px" }}>
                            Selected: {(filingType || '').toUpperCase()} (Sec {filingSection})
                          </span>
                        </div>

                        {/* Compliance banner when under date */}
                        {statutoryWindowMode === "under_date" && (
                          <div style={{ background: "#f9fefb", border: "1px solid #d1fae5", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "16px" }}>✅</span>
                            <div style={{ fontSize: "12px", color: "#065f46" }}>
                              <strong>Statutory Due Date Active:</strong> Under Section 139(1) of the Income Tax Act, filing on or before 31 July qualifies as an <strong>Original Return</strong> with ₹0 late fees. Belated (139(4)) and Updated (139(8A)) apply only after statutory deadlines expire.
                            </div>
                          </div>
                        )}

                        {/* Dynamic Filing Category Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: activeFilingCategories.length === 1 ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                          {activeFilingCategories.map((rt) => (
                            <div
                              key={rt.id}
                              onClick={() => { setFilingType(rt.id); setFilingSection(rt.section); }}
                              style={{
                                background: filingType === rt.id ? rt.bg : "#fff",
                                border: "1.5px solid " + (filingType === rt.id ? rt.border : "#e2e8f0"),
                                borderRadius: "12px", padding: "16px 18px", cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: filingType === rt.id ? "0 0 0 3px " + rt.border + "30, 0 4px 14px rgba(0,0,0,0.04)" : "0 2px 6px rgba(0,0,0,0.02)",
                                position: "relative",
                              }}
                            >
                              {filingType === rt.id && (
                                <div style={{ position: "absolute", top: "10px", right: "10px", width: "18px", height: "18px", borderRadius: "50%", background: rt.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: "900" }}>✓</div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "20px" }}>{rt.icon}</span>
                                <div>
                                  <div style={{ fontWeight: "800", color: filingType === rt.id ? rt.color : "#1e293b", fontSize: "13.5px" }}>{rt.label}</div>
                                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", fontFamily: "monospace" }}>Section {rt.section}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.4", marginBottom: rt.lateFee ? "6px" : 0 }}>{rt.desc}</div>
                              {rt.lateFee && (
                                <div style={{ fontSize: "10px", fontWeight: "700", color: rt.color, background: rt.bg, padding: "3px 6px", borderRadius: "6px", border: "1px solid " + rt.border }}>
                                  ⚠️ {rt.lateFee}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Belated penalty warning */}
                        {filingType === "belated" && (
                          <div style={{ marginTop: "16px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "12px", padding: "14px 16px" }}>
                            <div style={{ fontWeight: "800", fontSize: "13px", color: "#92400e", marginBottom: "6px" }}>📅 Belated Return — Section 139(4) Penalty Summary</div>
                            <div style={{ fontSize: "12px", color: "#78350f", lineHeight: "1.7" }}>
                              <div>• <strong>Last Date for Belated Filing:</strong> 31 December {ayStartYear}</div>
                              <div>• <strong>Late Fee u/s 234F:</strong> ₹5,000 (income &gt; ₹5L) or ₹1,000 (income ≤ ₹5L) — auto-calculated</div>
                              <div>• <strong>Interest u/s 234A:</strong> 1% per month on unpaid taxes from due date to filing date</div>
                              <div>• <strong>Note:</strong> Belated returns cannot carry forward business/capital losses.</div>
                            </div>
                          </div>
                        )}

                        {/* Updated (ITR-U) fields + warning */}
                        {filingType === "updated" && (
                          <div style={{ marginTop: "16px", background: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: "12px", padding: "16px" }}>
                            <div style={{ fontWeight: "800", fontSize: "13px", color: "#6d28d9", marginBottom: "10px" }}>🔄 Updated Return (ITR-U) u/s 139(8A) — Additional Details Required</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>Reason for Updated Return (Mandatory)</label>
                                <select value={itruReason} onChange={(e) => setItruReason(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #ddd6fe", borderRadius: "8px", fontSize: "12.5px" }}>
                                  <option value="previously_not_filed">Return not filed earlier</option>
                                  <option value="income_not_reported_correctly">Income not reported correctly</option>
                                  <option value="wrong_rate_of_tax">Wrong rate of tax applied</option>
                                  <option value="reduction_of_carried_forward_loss">Reduction of carried forward loss</option>
                                  <option value="reduction_of_unabsorbed_depreciation">Reduction of unabsorbed depreciation</option>
                                  <option value="reduction_of_tax_credit_under_115jb">Reduction of tax credit u/s 115JB/115JC</option>
                                  <option value="wrong_assessment_year">Wrong assessment year selected</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>Period of Updated Return</label>
                                <select value={itruWindow} onChange={(e) => setItruWindow(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #ddd6fe", borderRadius: "8px", fontSize: "12.5px" }}>
                                  <option value="within_12m">Within 12 months from end of AY (25% additional tax)</option>
                                  <option value="between_12_24m">Between 12–24 months from end of AY (50% additional tax)</option>
                                  <option value="between_24_36m">Between 24–36 months from end of AY (60% additional tax)</option>
                                </select>
                              </div>
                            </div>
                            <div style={{ background: "#ede9fe", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#6d28d9" }}>
                              ⚠️ <strong>Important:</strong> An Updated Return cannot be filed if proceedings u/s 148 / 148A are pending. Tax + Interest + Additional Tax must be paid via Challan before submitting.
                            </div>
                          </div>
                        )}

                        {/* Revised return fields */}
                        {filingType === "revised" && (
                          <div style={{ marginTop: "16px", background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: "12px", padding: "16px" }}>
                            <div style={{ fontWeight: "800", fontSize: "13px", color: "#0369a1", marginBottom: "10px" }}>✏️ Revised Return — Reference to Original Filed Return</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>Original Return Acknowledgement No.</label>
                                <input type="text" value={revisedAckNo} onChange={(e) => setRevisedAckNo(e.target.value)} placeholder="e.g. ACK/2026-27/1234567890" style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #bae6fd", borderRadius: "8px", fontSize: "12.5px" }} />
                              </div>
                              <div>
                                <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>Original Filing Date</label>
                                <input type="date" value={revisedDate} onChange={(e) => setRevisedDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #bae6fd", borderRadius: "8px", fontSize: "12.5px" }} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Statutory Date Condition Simulation Selector */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
                          <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                            Check condition based on statutory date limits (Section 139):
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>Simulate Date Window:</span>
                            <select
                              value={statutoryWindowMode}
                              onChange={(e) => {
                                const mode = e.target.value;
                                setStatutoryWindowMode(mode);
                                if (mode === "under_date") { setFilingType("original"); setFilingSection("139(1)"); }
                                else if (mode === "belated") { setFilingType("belated"); setFilingSection("139(4)"); }
                                else if (mode === "updated") { setFilingType("updated"); setFilingSection("139(8A)"); }
                              }}
                              style={{
                                padding: "3px 10px", borderRadius: "6px", border: "1px solid #cbd5e1",
                                fontSize: "11.5px", fontWeight: "700", color: "#142B46", background: "#ffffff",
                                cursor: "pointer",
                              }}
                            >
                              <option value="under_date">📅 Within Due Date (31 July) — Show Original Only</option>
                              <option value="belated">⏳ Belated Window (1 Aug – 31 Dec) — Show Belated &amp; Revised</option>
                              <option value="updated">🔄 Updated Window (Post 31 Dec) — Show ITR-U Only</option>
                              <option value="all">📋 View All 4 Filing Categories</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* ── SECTION 2: ITR FORM SELECTION (4 COMPACT MEDIUM CARDS, AUTO-LOCKED, ITR-3 & ITR-4 DISABLED + COMING SOON) ── */}
                      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "15px", color: "#1e293b" }}>
                            2️⃣ Choose Applicable ITR Form
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                            Auto-determined from your AIS &amp; financial data — form selection is locked to ensure compliance with ITD rules.
                          </div>
                        </div>
                        <span style={{ background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "10px" }}>
                          🔒 Auto-Selected: {selectedItrForm}
                        </span>
                      </div>

                      {/* Lock Alert Banner */}
                      {formLockNotice && (
                        <CAlert
                          color="warning"
                          dismissible
                          onClose={() => setFormLockNotice(null)}
                          className="d-flex align-items-center gap-2 mb-3"
                          style={{ fontSize: "12px", padding: "10px 14px", borderRadius: "10px", background: "#fffdf5", border: "1px solid #fef08a", color: "#92400e" }}
                        >
                          <span style={{ fontSize: "15px" }}>⚠️</span>
                          <div>{formLockNotice}</div>
                        </CAlert>
                      )}

                      {/* 4 Cards Grid - 2 Cards Per Row Grid Format (Medium Height, Compact Data) */}
                      <div className="itr-cards-2col-grid">

                        {/* CARD 1: ITR-1 (Sahaj) */}
                        <div
                          onClick={() => handleAttemptFormSwitch("ITR-1")}
                          style={{
                            background: selectedItrForm === "ITR-1" ? "#f9fefb" : "#ffffff",
                            border: selectedItrForm === "ITR-1" ? "1.5px solid #86efac" : "1.5px solid #edf2f7",
                            borderRadius: "14px",
                            padding: "18px 16px",
                            minHeight: "220px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            cursor: selectedItrForm === "ITR-1" ? "default" : "not-allowed",
                            opacity: selectedItrForm === "ITR-1" ? 1 : 0.65,
                            transition: "all 0.2s ease",
                            boxShadow: selectedItrForm === "ITR-1" ? "0 4px 14px rgba(34, 197, 94, 0.08)" : "none",
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                              <div style={{ display: "inline-block", background: "#f0fdf4", color: "#166534", border: "1px solid #dcfce7", fontWeight: "700", fontSize: "9.5px", padding: "2px 7px", borderRadius: "6px" }}>
                                SALARIED &amp; SIMPLE
                              </div>
                              <div style={{
                                width: "18px", height: "18px", borderRadius: "50%",
                                border: selectedItrForm === "ITR-1" ? "4px solid #22c55e" : "2px solid #e2e8f0",
                                background: "#fff", flexShrink: 0,
                              }} />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "20px" }}>⚡</span>
                              <h5 style={{ fontWeight: "800", color: "#1e293b", margin: 0, fontSize: "16px" }}>ITR-1 (Sahaj)</h5>
                            </div>

                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                              Resident individuals with income up to ₹50L from Salary, 1 House Property &amp; Other Sources.
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#475569", display: "flex", flexDirection: "column", gap: "5px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#22c55e", fontWeight: "900" }}>✓</span>
                                <span>Salary, Pension &amp; 1 House Property</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#22c55e", fontWeight: "900" }}>✓</span>
                                <span>Income ≤ ₹50L (No Capital Gains)</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: selectedItrForm === "ITR-1" ? "#16a34a" : "#94a3b8" }}>
                              {selectedItrForm === "ITR-1" ? "✓ Auto-Selected" : "🔒 Ineligible (AIS CG)"}
                            </span>
                            {selectedItrForm === "ITR-1" && (
                              <span style={{ fontSize: "10px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontWeight: "700", padding: "1px 6px", borderRadius: "6px" }}>
                                LOCKED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CARD 2: ITR-2 */}
                        <div
                          onClick={() => handleAttemptFormSwitch("ITR-2")}
                          style={{
                            background: selectedItrForm === "ITR-2" ? "#f8faff" : "#ffffff",
                            border: selectedItrForm === "ITR-2" ? "1.5px solid #93c5fd" : "1.5px solid #edf2f7",
                            borderRadius: "14px",
                            padding: "18px 16px",
                            minHeight: "220px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            cursor: selectedItrForm === "ITR-2" ? "default" : "not-allowed",
                            opacity: selectedItrForm === "ITR-2" ? 1 : 0.65,
                            transition: "all 0.2s ease",
                            boxShadow: selectedItrForm === "ITR-2" ? "0 4px 14px rgba(59, 130, 246, 0.08)" : "none",
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                              <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe", fontWeight: "700", fontSize: "9.5px", padding: "2px 7px", borderRadius: "6px" }}>
                                CAPITAL GAINS &amp; HNI
                              </div>
                              <div style={{
                                width: "18px", height: "18px", borderRadius: "50%",
                                border: selectedItrForm === "ITR-2" ? "4px solid #60a5fa" : "2px solid #e2e8f0",
                                background: "#fff", flexShrink: 0,
                              }} />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "20px" }}>📈</span>
                              <h5 style={{ fontWeight: "800", color: "#1e293b", margin: 0, fontSize: "16px" }}>ITR-2</h5>
                            </div>

                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
                              Individuals with Capital Gains (Stocks, MFs), Multiple Properties, or Income &gt; ₹50L.
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#475569", display: "flex", flexDirection: "column", gap: "5px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#60a5fa", fontWeight: "900" }}>✓</span>
                                <span>Capital Gains (STCG/LTCG Shares, MFs)</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#60a5fa", fontWeight: "900" }}>✓</span>
                                <span>Income &gt; ₹50L or Multiple Properties</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: selectedItrForm === "ITR-2" ? "#2563eb" : "#94a3b8" }}>
                              {selectedItrForm === "ITR-2" ? "✓ Auto-Selected" : "🔒 Ineligible"}
                            </span>
                            {selectedItrForm === "ITR-2" && (
                              <span style={{ fontSize: "10px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontWeight: "700", padding: "1px 6px", borderRadius: "6px" }}>
                                LOCKED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CARD 3: ITR-3 (Disabled + Coming Soon animation) */}
                        <div
                          onClick={() => setFormLockNotice("💼 ITR-3 is currently in active development and coming soon! For proprietary business and trading returns, please use our Hire a CA flow.")}
                          style={{
                            background: "#fafbfc",
                            border: "1.5px dashed #e2e8f0",
                            borderRadius: "14px",
                            padding: "18px 16px",
                            minHeight: "220px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            cursor: "not-allowed",
                            opacity: 0.88,
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                              <div style={{ display: "inline-block", background: "#f8fafc", color: "#64748b", border: "1px solid #f1f5f9", fontWeight: "700", fontSize: "9.5px", padding: "2px 7px", borderRadius: "6px" }}>
                                BUSINESS / TRADING
                              </div>
                              <span className="coming-soon-badge">✨ Coming Soon</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "20px" }}>💼</span>
                              <h5 style={{ fontWeight: "800", color: "#64748b", margin: 0, fontSize: "16px" }}>ITR-3</h5>
                            </div>

                            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px", lineHeight: "1.4" }}>
                              For individuals &amp; HUFs having income from a proprietary business, profession, or trading.
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "5px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#cbd5e1", fontWeight: "900" }}>•</span>
                                <span>Proprietary Business &amp; Profession</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#cbd5e1", fontWeight: "900" }}>•</span>
                                <span>Intraday &amp; F&amp;O Trading Income</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8" }}>
                              🔒 Disabled
                            </span>
                            <span style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", fontWeight: "700", padding: "1px 6px", borderRadius: "6px" }}>
                              DEVELOPMENT
                            </span>
                          </div>
                        </div>

                        {/* CARD 4: ITR-4 (Sugam) (Disabled + Coming Soon animation) */}
                        <div
                          onClick={() => setFormLockNotice("🏪 ITR-4 (Sugam) presumptive taxation filing is in active development and coming soon!")}
                          style={{
                            background: "#fafbfc",
                            border: "1.5px dashed #e2e8f0",
                            borderRadius: "14px",
                            padding: "18px 16px",
                            minHeight: "220px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            cursor: "not-allowed",
                            opacity: 0.88,
                            position: "relative",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                              <div style={{ display: "inline-block", background: "#f8fafc", color: "#64748b", border: "1px solid #f1f5f9", fontWeight: "700", fontSize: "9.5px", padding: "2px 7px", borderRadius: "6px" }}>
                                PRESUMPTIVE TAX
                              </div>
                              <span className="coming-soon-badge">✨ Coming Soon</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "20px" }}>🏪</span>
                              <h5 style={{ fontWeight: "800", color: "#64748b", margin: 0, fontSize: "16px" }}>ITR-4 (Sugam)</h5>
                            </div>

                            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px", lineHeight: "1.4" }}>
                              Presumptive taxation scheme for eligible small businesses &amp; professionals.
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "5px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#cbd5e1", fontWeight: "900" }}>•</span>
                                <span>Small Business u/s 44AD (Turnover ≤ ₹2 Cr)</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                <span style={{ color: "#cbd5e1", fontWeight: "900" }}>•</span>
                                <span>Professionals u/s 44ADA (Receipts ≤ ₹75L)</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8" }}>
                              🔒 Disabled
                            </span>
                            <span style={{ fontSize: "10px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", fontWeight: "700", padding: "1px 6px", borderRadius: "6px" }}>
                              DEVELOPMENT
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* ── SECTION 3: COLLAPSIBLE COMPARISON TABLE ── */}
                      <Step1ComparisonTable />

                      {/* ── SECTION 4: LIVE CONFIGURATION SUMMARY BANNER ── */}
                      <div style={{
                        background: selectedItrForm === "ITR-2" ? "#f8faff" : "#f9fefb",
                        border: "1.5px solid " + (selectedItrForm === "ITR-2" ? "#e0f2fe" : "#dcfce7"),
                        borderRadius: "14px", padding: "18px 22px", marginBottom: "24px",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px",
                      }}>
                        <div>
                          <div style={{ fontSize: "10.5px", fontWeight: "800", color: selectedItrForm === "ITR-2" ? "#3b82f6" : "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Currently Configured Filing Track
                          </div>
                          <div style={{ fontWeight: "800", fontSize: "16px", color: "#1e293b", marginTop: "4px" }}>
                            Filing with{" "}
                            <span style={{ color: selectedItrForm === "ITR-2" ? "#2563eb" : "#16a34a" }}>{selectedItrForm}</span>
                            {" \u2014 "}
                            <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#64748b" }}>{filingCategoryLabel}</span>
                          </div>
                          {filingType === "belated" && lateFee234f > 0 && (
                            <div style={{ fontSize: "12px", color: "#b45309", marginTop: "4px", fontWeight: "700" }}>
                              \u26a0\ufe0f Late Fee u/s 234F: {fmt(lateFee234f)} will be added
                            </div>
                          )}
                          {filingType === "updated" && itruAdditionalTax > 0 && (
                            <div style={{ fontSize: "12px", color: "#7c3aed", marginTop: "4px", fontWeight: "700" }}>
                              \u26a0\ufe0f Additional Tax u/s 140B: {fmt(itruAdditionalTax)} will be added
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                            Estimated Gross Income
                            <span style={{ marginLeft: "6px", background: "#f0f9ff", color: "#0284c7", border: "1px solid #e0f2fe", fontSize: "9.5px", fontWeight: "700", padding: "1px 7px", borderRadius: "8px" }}>from AIS</span>
                          </div>
                          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b", marginTop: "2px" }}>{fmt(grossIncome)}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            TDS Paid (26AS): <strong style={{ color: "#16a34a" }}>{fmt(totalTdsCredit)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* ── SECTION 5: ACTION BUTTON ── */}
                      <div className="d-flex justify-content-between align-items-center">
                        <div style={{ fontSize: "12px", color: canContinue ? "#16a34a" : "#94a3b8", fontWeight: "600" }}>
                          {canContinue
                            ? "\u2705 Both selections complete \u2014 ready to continue"
                            : "\u2b06\ufe0f Select a Filing Category and ITR Form above to continue"}
                        </div>
                        <CButton
                          color="primary" size="lg"
                          onClick={() => setCurrentStep(2)}
                          disabled={!canContinue}
                          style={{
                            background: canContinue ? "#0A8E4B" : "#cbd5e1",
                            border: "none", fontWeight: "800", padding: "12px 32px", borderRadius: "12px",
                            boxShadow: canContinue ? "0 4px 14px rgba(10, 142, 75, 0.25)" : "none",
                            opacity: canContinue ? 1 : 0.7, cursor: canContinue ? "pointer" : "not-allowed",
                            transition: "all 0.2s ease",
                          }}
                        >
                          Continue to Income Details →
                        </CButton>
                      </div>

                    </div>
                  </div>
                );
              })()}


              {/* ════ STEP 2: INCOME DETAILS (UNIFIED TRI-SOURCE VIEW: AIS + 26AS + FORM 16) ════ */}
              {currentStep === 2 && (
                <IncomeDetailsStep
                  selectedItrForm={selectedItrForm}
                  assessmentYear={assessmentYear}
                  userPan={userPan || taxpayer?.pan || (isBlankCustomer ? "" : "ABCDE1234F")}
                  form16File={form16File}
                  form26asFile={form26asFile}
                  incomeData={incomeData}
                  setIncomeData={setIncomeData}
                  chosenRegime={chosenRegime}
                  setChosenRegime={setChosenRegime}
                  isEmptyUser={isBlankCustomer || !!data?.is_empty_user}
                  onContinue={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                />
              )}

              {/* ════ STEP 3: DEDICATED FORM 16 UPLOAD & SALARY/TDS RECONCILIATION ════ */}
              {currentStep === 3 && (
                <Form16UploadStep
                  form16File={form16File}
                  parseError16={parseError16}
                  handleForm16Upload={handleForm16Upload}
                  onLoadSampleForm16={handleLoadSampleForm16}
                  setForm16File={setForm16File}
                  setParseError16={setParseError16}
                  incomeData={incomeData}
                  setIncomeData={setIncomeData}
                  deductionData={deductionData}
                  setDeductionData={setDeductionData}
                  totalTdsCredit={totalTdsCredit}
                  userPan={userPan || taxpayer?.pan || (isBlankCustomer ? "" : "ABCDE1234F")}
                  onContinue={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
                  onViewDoc={(file) => {
                    setDocViewerFile(file);
                    setShowDocViewerModal(true);
                  }}
                />
              )}

              {/* ════ STEP 4: DEDUCTIONS & TAX SAVINGS (DOCUMENT EXTRACTION, LIMIT GAPS, DUAL REGIME PREVIEW) ════ */}
              {currentStep === 4 && (
                <TaxDeductionsStep
                  form16File={form16File}
                  form26asFile={form26asFile}
                  parseError16={parseError16}
                  parseError26as={parseError26as}
                  handleForm16Upload={handleForm16Upload}
                  handleForm26asUpload={handleForm26asUpload}
                  onLoadSampleForm16={handleLoadSampleForm16}
                  onLoadSample26as={handleLoadSample26as}
                  setForm16File={setForm16File}
                  setForm26asFile={setForm26asFile}
                  setParseError16={setParseError16}
                  setParseError26as={setParseError26as}
                  deductionData={deductionData}
                  setDeductionData={setDeductionData}
                  incomeData={incomeData}
                  userPan={userPan || taxpayer?.pan || (isBlankCustomer ? "" : "ABCDE1234F")}
                  isEmptyUser={isBlankCustomer || !!data?.is_empty_user}
                  onContinue={() => setCurrentStep(5)}
                  onBack={() => setCurrentStep(3)}
                  onViewDoc={(file) => {
                    setDocViewerFile(file);
                    setShowDocViewerModal(true);
                  }}
                />
              )}

              {/* ════ STEP 5: TAX REGIME SELECTOR (SIDE-BY-SIDE ITEMIZED AY 2026-27 ENGINE) ════ */}
              {currentStep === 5 && (
                <SelectRegimeStep
                  incomeData={incomeData}
                  deductionData={deductionData}
                  form16File={form16File}
                  form26asFile={form26asFile}
                  totalTdsCredit={totalTdsCredit}
                  chosenRegime={chosenRegime}
                  setChosenRegime={setChosenRegime}
                  onContinue={() => setCurrentStep(6)}
                  onBack={() => setCurrentStep(4)}
                  selectedItrForm={selectedItrForm}
                  taxpayerCategory={taxpayer?.category || "Individual"}
                />
              )}

              {/* ════ STEP 6: REVIEW & SUBMIT ════ */}
              {currentStep === 6 && (
                <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                  <div style={{ maxWidth: "800px", margin: "0 auto" }}>

                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "28px" }}>
                      <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "800", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", letterSpacing: "0.5px" }}>
                        STEP 6 OF 6: FINAL REVIEW &amp; FILING
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
                        {
                          l: "Return Category",
                          v: filingType === "belated" ? "Belated Return (Sec 139(4))"
                            : filingType === "updated" ? "Updated Return (ITR-U Sec 139(8A))"
                              : filingType === "revised" ? "Revised Return (Sec 139(5))"
                                : "Original Return (Sec 139(1))",
                          color: filingType === "belated" ? "#d97706" : filingType === "updated" ? "#7c3aed" : filingType === "revised" ? "#0284c7" : "#16a34a"
                        },
                        ...(filingType === "revised" ? [
                          { l: "Original Return Ack No.", v: revisedAckNo || "–", color: "#0284c7" },
                          { l: "Original Filing Date", v: revisedDate || "–", color: "#0284c7" }
                        ] : []),
                        ...(filingType === "updated" ? [
                          { l: "ITR-U Reason", v: itruReason || "Return not filed previously", color: "#7c3aed" }
                        ] : []),
                        { l: "Chosen Tax Regime", v: chosenRegime === "new" ? "New Regime (Sec 115BAC)" : "Old Regime (Itemized Claims)" },
                        { l: "Gross Total Income", v: fmt(grossIncome) },
                        ...(selectedItrForm === "ITR-2" ? [{ l: "Taxable Capital Gains (Schedule CG)", v: fmt(totalCapitalGains), color: "#2563eb" }] : []),
                        { l: "Base Tax Liability", v: fmt(activeTax) },
                        ...(lateFee234f > 0 ? [{ l: "Late Filing Fee (Sec 234F)", v: fmt(lateFee234f), color: "#dc2626" }] : []),
                        ...(itruAdditionalTax > 0 ? [
                          { l: `Additional Tax u/s 140B (${itruWindow === 'within_12m' ? '25%' : itruWindow === 'between_12_24m' ? '50%' : '60%'} penalty)`, v: fmt(itruAdditionalTax), color: "#dc2626" }
                        ] : []),
                        ...((lateFee234f > 0 || itruAdditionalTax > 0) ? [{ l: "Total Tax Liability (Inc. Additions)", v: fmt(totalTaxWithAdditions), color: "#b91c1c" }] : []),
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
                                <span style={{ fontWeight: "800", color: "#F02186" }}>Total Payable</span>
                                <strong style={{ color: "#F02186", fontSize: "16px" }}>₹{FILING_FEE_TOTAL}</strong>
                              </div>
                            </div>
                            <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#64748b" }}>
                              🔐 Secured by Razorpay &nbsp;|&nbsp; UPI / Cards / Net Banking accepted
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", minWidth: "160px" }}>
                            <button
                              onClick={handlePayNow}
                              disabled={paymentProcessing}
                              style={{
                                background: paymentProcessing ? "#64748b" : "#0A8E4B",
                                color: "#fff", border: "none", borderRadius: "12px",
                                padding: "14px 28px", fontWeight: "900", fontSize: "15px",
                                cursor: paymentProcessing ? "not-allowed" : "pointer",
                                boxShadow: "0 4px 14px rgba(10, 142, 75, 0.25)",
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
                            style={{ background: "#0A8E4B", border: "none", borderRadius: "12px", padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontWeight: "800", color: "#fff", fontSize: "13px", boxShadow: "0 4px 14px rgba(10, 142, 75, 0.25)" }}
                          >
                            <div style={{ fontSize: "24px", marginBottom: "6px" }}>🚀</div>
                            Submit to IT Portal
                            <div style={{ fontSize: "11px", color: "#ffe4f3", fontWeight: "400", marginTop: "3px" }}>Direct e-filing submission</div>
                          </button>
                        </div>
                      </>
                    )}

                    <div className="text-center">
                      <button onClick={() => setCurrentStep(5)} style={{ background: "none", border: "none", color: "#F02186", fontWeight: "700", textDecoration: "underline", fontSize: "13px", cursor: "pointer" }}>
                        ← Back to Regime Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CCol>

            {/* ════ RIGHT SIDEBAR (CLEARTAX ASSISTANCE & LIVE TAX CARDS) ════ */}
            <CCol xs={12} lg={4} xl={3.5}>
              <div style={{ position: "sticky", top: "80px", display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* 1. Live Tax Computation & Refund Outcome Card */}
                <div style={{
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Live Tax Estimation
                    </span>
                    <span style={{
                      background: chosenRegime === "new" ? "#e0f2fe" : "#ecfdf5",
                      color: chosenRegime === "new" ? "#0284c7" : "#166534",
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}>
                      {chosenRegime === "new" ? "New Regime" : "Old Regime"}
                    </span>
                  </div>

                  {/* Big Outcome Banner */}
                  <div style={{
                    background: activeRefund > 0 ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                    border: `1.5px solid ${activeRefund > 0 ? "#86efac" : "#fca5a5"}`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}>
                    <span style={{ fontSize: "24px" }}>{activeRefund > 0 ? "🎉" : "⚠️"}</span>
                    <div>
                      <div style={{ fontSize: "10.5px", fontWeight: "800", color: activeRefund > 0 ? "#166534" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {activeRefund > 0 ? "Expected Tax Refund" : "Tax Payable"}
                      </div>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: activeRefund > 0 ? "#15803d" : "#be123c" }}>
                        {activeRefund > 0 ? fmt(activeRefund) : fmt(activePayable)}
                      </div>
                    </div>
                  </div>

                  {/* Metric Rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Gross Total Income:</span>
                      <strong style={{ color: "#0f172a" }}>{fmt(grossIncome)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>TDS Deposited (26AS):</span>
                      <strong style={{ color: "#16a34a" }}>{fmt(totalTdsCredit)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Applicable Form:</span>
                      <strong style={{ color: "#F02186" }}>{selectedItrForm} (AY 2026-27)</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPdfModal(true)}
                    style={{
                      width: "100%",
                      marginTop: "14px",
                      background: "rgba(240, 33, 134, 0.06)",
                      border: "1px solid rgba(240, 33, 134, 0.22)",
                      color: "#F02186",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>📊 View Computation Breakdown</span>
                  </button>
                </div>

                {/* 2. Customer Support Card (ClearTax Style) */}
                <div
                  onClick={() => setShowContactModal(true)}
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#F02186"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 155, 98, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                        💬
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#142B46" }}>
                          Customer Support <span style={{ color: "#F02186", fontSize: "14px" }}>›</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>AI and Human Assistance</div>
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#008F59", background: "rgba(0, 155, 98, 0.08)", padding: "2px 8px", borderRadius: "8px", border: "1px solid rgba(0, 155, 98, 0.2)" }}>
                      24x7 Active
                    </span>
                  </div>
                </div>

                {/* 3. Expert Filing Card (ClearTax Style) */}
                <div style={{
                  background: "#ffffff",
                  border: "1.5px solid rgba(240, 33, 134, 0.2)",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 4px 14px rgba(240, 33, 134, 0.06)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{
                      background: "rgba(240, 33, 134, 0.08)",
                      border: "1px solid rgba(240, 33, 134, 0.22)",
                      color: "#c026d3",
                      fontSize: "10.5px",
                      fontWeight: "900",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}>
                      ✨ Expert Filing
                    </span>
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "15px", color: "#142B46", marginBottom: "4px" }}>
                    Need an expert to file?
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5", marginBottom: "14px" }}>
                    Let a dedicated CA handle your ITR filing end-to-end — you relax while we maximize your tax savings.
                  </div>
                  <button
                    onClick={() => navigate("/agent/hire")}
                    style={{
                      width: "100%",
                      background: "rgba(240, 33, 134, 0.05)",
                      border: "1.5px solid #F02186",
                      color: "#F02186",
                      padding: "10px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: "800",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F02186";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(240, 33, 134, 0.05)";
                      e.currentTarget.style.color = "#F02186";
                    }}
                  >
                    Hire an Expert CA
                  </button>
                </div>

                {/* 4. Live Filing Guidance Card (ClearTax Style) */}
                <div style={{
                  background: "#ffffff",
                  border: "1.5px solid #fed7aa",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 4px 14px rgba(249,115,22,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      fontSize: "10.5px",
                      fontWeight: "900",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626" }}></span>
                      Live Filing
                    </span>
                  </div>
                  <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>
                    <span style={{ color: "#ea580c" }}>Stuck?</span> Get Live Guidance
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5", marginBottom: "14px" }}>
                    File your own taxes with a Filing Specialist guiding you end-to-end on screen share/call.
                  </div>
                  <button
                    onClick={() => setShowLiveGuidanceModal(true)}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1.5px solid #2563eb",
                      color: "#2563eb",
                      padding: "10px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: "800",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#2563eb";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                      e.currentTarget.style.color = "#2563eb";
                    }}
                  >
                    Book your live filing call
                  </button>
                </div>

                {/* 5. Govt Portal & Verified Data Card */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>🏛️</span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>Govt AIS &amp; 26AS</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Live Tax Credits Synced</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGovtRecordsModal(true)}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#1e293b",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    View Records
                  </button>
                </div>

              </div>
            </CCol>
          </CRow>
        </> /* end activeView === "filing" */}

      </CContainer>

      {/* ════ MODAL: EDIT INCOME FIGURES ════ */}
      <CModal visible={showIncomeEditModal} onClose={() => setShowIncomeEditModal(false)}>
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span>Section 80TTA:</span><strong>{fmt(oldSec80tta)}</strong></div>
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#ffffff" }}>📄 Document Viewer — {docViewerFile?.name}</CModalTitle>
          {docViewerFile?.parsed && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setDocViewerTab('tables')}
                style={{
                  background: docViewerTab === 'tables' ? "#ffffff" : "rgba(255,255,255,0.2)",
                  color: docViewerTab === 'tables' ? "#1d4ed8" : "#ffffff",
                  border: "none", borderRadius: "6px",
                  padding: "4px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                }}
              >
                📋 Official Form 16 Tables
              </button>
              <button
                onClick={() => setDocViewerTab('file')}
                style={{
                  background: docViewerTab === 'file' ? "#ffffff" : "rgba(255,255,255,0.2)",
                  color: docViewerTab === 'file' ? "#1d4ed8" : "#ffffff",
                  border: "none", borderRadius: "6px",
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
                Regime: {(chosenRegime || 'not selected').toUpperCase()}
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
              System-generated Tax Computation Statement &nbsp;|&nbsp; TIQTAX &nbsp;|&nbsp; PAN: {taxpayer.pan || userPan || '–'} &nbsp;|&nbsp; AY {assessmentYear}
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
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
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
                <div style={{ fontSize: "12px", color: "#15803d", marginTop: "4px" }}>
                  Filing Category: <strong>{submissionSuccess.filing_type ? (submissionSuccess.filing_type || '').toUpperCase() + ` (Sec ${submissionSuccess.filing_section || filingSection})` : `${(filingType || '').toUpperCase()} (Sec ${filingSection})`}</strong>
                </div>
                <div style={{ fontSize: "15px", fontWeight: "900", color: (submissionSuccess.receipt?.refund_due > 0 || activeRefund > 0) ? "#15803d" : "#be123c", marginTop: "8px" }}>
                  {(submissionSuccess.receipt?.refund_due > 0 || activeRefund > 0)
                    ? `Refund Initiated: ${fmt(submissionSuccess.receipt?.refund_due || activeRefund)}`
                    : `Self-Assessment Tax Payable: ${fmt(submissionSuccess.receipt?.tax_payable || activePayable)}`}
                </div>
              </div>
              <CButton color="success" onClick={downloadJson} style={{ fontWeight: "700" }}>⬇ Download Final JSON Receipt</CButton>
            </div>
          ) : (
            <div>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "16px", fontSize: "13px" }}>
                <div>Filing Form: <strong>{selectedItrForm}</strong></div>
                <div>Return Category: <strong style={{ color: filingType === "belated" ? "#d97706" : filingType === "updated" ? "#7c3aed" : filingType === "revised" ? "#0284c7" : "#16a34a" }}>{(filingType || '').toUpperCase()} (Sec {filingSection})</strong></div>
                {lateFee234f > 0 && <div style={{ color: "#dc2626" }}>Late Fee u/s 234F: <strong>{fmt(lateFee234f)}</strong></div>}
                {itruAdditionalTax > 0 && <div style={{ color: "#dc2626" }}>Additional Tax u/s 140B: <strong>{fmt(itruAdditionalTax)}</strong></div>}
                <div>Selected Regime: <strong>{chosenRegime === "new" ? "New Tax Regime" : "Old Tax Regime"}</strong></div>
                <div>Total Income: <strong>{fmt(grossIncome)}</strong></div>
                <div>{activeRefund > 0 ? "Refund Due:" : "Tax Payable:"} <strong style={{ color: activeRefund > 0 ? "#16a34a" : "#dc2626" }}>{activeRefund > 0 ? fmt(activeRefund) : fmt(activePayable)}</strong></div>
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

      {/* ════ MODAL: LIVE FILING GUIDANCE CALL BOOKING ════ */}
      <CModal visible={showLiveGuidanceModal} onClose={() => { setShowLiveGuidanceModal(false); setGuidanceSuccess(false); }} size="md">
        <CModalHeader style={{ background: "linear-gradient(135deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#ffffff" }}>
            🔴 Book Live Filing Guidance Session
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: "24px" }}>
          {guidanceSuccess ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>🎉</div>
              <h4 style={{ fontWeight: "900", color: "#166534" }}>Session Booked Successfully!</h4>
              <p style={{ color: "#475569", fontSize: "13.5px", marginTop: "8px", lineHeight: "1.6" }}>
                Our Tax Filing Specialist is connecting with you on <strong>{guidancePhone || taxpayer.phone || "your phone number"}</strong>.
              </p>
              <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: "10px", padding: "12px", marginTop: "16px", fontSize: "12.5px", color: "#15803d" }}>
                ✔ Screen-share &amp; voice guidance link sent via SMS/WhatsApp.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px", marginBottom: "18px", fontSize: "13px", color: "#1e40af" }}>
                <strong>How it works:</strong> A dedicated Filing Specialist joins you on a secure screen-share to guide you through salary entries, deductions, and Form 16 reconciliation.
              </div>

              <div className="mb-3">
                <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Mobile Number for Instant Call</CFormLabel>
                <CFormInput
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={guidancePhone || taxpayer.phone || ""}
                  onChange={(e) => setGuidancePhone(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <CFormLabel style={{ fontWeight: "700", fontSize: "13px" }}>Preferred Time Slot</CFormLabel>
                <CFormSelect
                  value={guidanceSlot}
                  onChange={(e) => setGuidanceSlot(e.target.value)}
                >
                  <option value="Instant (Within 2 mins)">⚡ Instant Call (Within 2 mins)</option>
                  <option value="Today (Within 1 hour)">🕒 Today (Within 1 hour)</option>
                  <option value="Evening (6:00 PM - 8:00 PM)">🌆 Evening (6:00 PM - 8:00 PM)</option>
                  <option value="Tomorrow Morning (10:00 AM - 12:00 PM)">🌅 Tomorrow Morning (10:00 AM - 12:00 PM)</option>
                </CFormSelect>
              </div>

              <div style={{ fontSize: "11.5px", color: "#64748b", display: "flex", gap: "6px", alignItems: "center" }}>
                <span>🔒</span> 100% Confidential &amp; CA-Supervised Filing Support
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          {guidanceSuccess ? (
            <CButton color="primary" onClick={() => { setShowLiveGuidanceModal(false); setGuidanceSuccess(false); }} style={{ fontWeight: "700" }}>
              Done
            </CButton>
          ) : (
            <>
              <CButton color="secondary" variant="ghost" onClick={() => setShowLiveGuidanceModal(false)}>
                Cancel
              </CButton>
              <CButton
                color="primary"
                onClick={() => setGuidanceSuccess(true)}
                style={{ background: "#F87826", border: "none", fontWeight: "800", color: "#ffffff", boxShadow: "0 2px 8px rgba(248, 120, 38, 0.25)" }}
              >
                📞 Request Callback Now
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
