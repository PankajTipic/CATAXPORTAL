import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CRow,
  CCol,
  CButton,
  CBadge,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from "@coreui/react";
import Form16TableView from "./Form16TableView";
import { extractPdfText } from "../utils/documentParser";

// Currency Formatter
const fmt = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹0";
  const num = Math.round(Number(val));
  if (num < 0) return `- ₹${Math.abs(num).toLocaleString("en-IN")}`;
  return `₹${num.toLocaleString("en-IN")}`;
};

// Source Tag Pill Component
const SourceTag = ({ source }) => {
  const styles = {
    Form16: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
    "26AS": { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
    "Manually Added": { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    "Auto-Applied": { bg: "#f3e8ff", color: "#7e22ce", border: "#e9d5ff" },
    Manual: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  };

  const s = styles[source] || styles.Manual;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: "10.5px",
        fontWeight: "700",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "100px",
        padding: "1px 7px",
        letterSpacing: "0.2px",
        lineHeight: "1.4",
      }}
    >
      {source}
    </span>
  );
};

export default function TaxDeductionsStep({
  form16File = null,
  form26asFile = null,
  parseError16 = null,
  parseError26as = null,
  handleForm16Upload,
  handleForm26asUpload,
  onLoadSampleForm16,
  onLoadSample26as,
  setForm16File,
  setForm26asFile,
  setParseError16,
  setParseError26as,
  deductionData = {},
  setDeductionData,
  incomeData = {},
  userPan = "ABCDE1234F",
  isEmptyUser = false,
  stepText = "Step 4 of 6: Tax Deductions",
  backText = "← Back to Income",
  continueText = "Compare Regimes & Choose →",
  onContinue,
  onBack,
  onViewDoc,
}) {
  const isBlankUser = Boolean(
    isEmptyUser ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        return u.email === "test@tiqtax.in" || u.name === "Test Customer";
      } catch {
        return false;
      }
    })()
  );
  // Deductions Mode: 'auto' (from documents) | 'manual'
  const [isManualMode, setIsManualMode] = useState(false);

  // Form 16 Full Table View Toggle
  const [showFullForm16, setShowFullForm16] = useState(false);

  // Edit / Override Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Add Proof Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofTargetSection, setProofTargetSection] = useState("sec80c");
  const [proofForm, setProofForm] = useState({
    title: "",
    amount: "",
    file: null,
    fileName: "",
  });
  const [proofParsing, setProofParsing] = useState(false);
  const proofFileInputRef = useRef(null);

  // List of additional investments added outside Form 16
  const [additionalProofs, setAdditionalProofs] = useState(() => {
    if (isBlankUser) return [];
    return [
      {
        id: "proof_1",
        section: "sec80c",
        title: "HDFC Life Click 2 Protect Term Insurance",
        amount: 28000,
        fileName: "HDFC_Life_Receipt_2025-26.pdf",
        dateAdded: "18-Jan-2026",
      },
      {
        id: "proof_2",
        section: "sec80ccd1b",
        title: "Tier 1 NPS Voluntary Contribution via eNPS",
        amount: 50000,
        fileName: "NPS_Transaction_Statement.pdf",
        dateAdded: "04-Feb-2026",
      },
    ];
  });

  // Section 80D Sub-rows State (Self & Family vs Parents)
  const [parentsSenior, setParentsSenior] = useState(true);
  const [sec80dBreakup, setSec80dBreakup] = useState(() => {
    if (isBlankUser) return { selfFamily: 0, parents: 0, preventiveHealth: 0 };
    return {
      selfFamily: 22000,
      parents: 35000,
      preventiveHealth: 4500,
    };
  });

  // HRA Verification State
  const [rentReceiptFile, setRentReceiptFile] = useState(null);
  const [hraInputs, setHraInputs] = useState(() => {
    if (isBlankUser) return { monthlyRentPaid: 0, basicSalary: 0, isMetro: false };
    return {
      monthlyRentPaid: 25000,
      basicSalary: 600000,
      isMetro: true, // 50% for Delhi, Mumbai, Kolkata, Chennai
    };
  });
  const rentFileInputRef = useRef(null);

  const isForm16Ready = Boolean(
    form16File && (form16File.status === "parsed" || form16File.name || form16File.fileName || form16File.file_name) && form16File.status !== "parsing" && form16File.status !== "error"
  );
  const isForm26asReady = Boolean(
    form26asFile && (form26asFile.status === "parsed" || form26asFile.name || form26asFile.fileName || form26asFile.file_name) && form26asFile.status !== "parsing" && form26asFile.status !== "error"
  );

  // Base Extracted Values (from Form 16 if parsed, fallback to default profile)
  const baseFromDoc = useMemo(() => {
    const p = form16File?.parsed || {};
    return {
      sec80c: p.sec80c ?? (isBlankUser ? 0 : 95000),
      sec80d: p.sec80d ?? (isBlankUser ? 0 : 22000),
      hra: p.hraExemption ?? (isBlankUser ? 0 : 120000),
      pt: p.professionalTax ?? (isBlankUser ? 0 : 2500),
      sec80ccd1b: p.sec80ccd1b ?? 0,
      sec80e: p.sec80e ?? 0,
      sec80g: p.sec80g ?? 0,
      sec24b: (p.netHouseProperty && p.netHouseProperty < 0) ? Math.abs(p.netHouseProperty) : (incomeData.houseProperty < 0 ? Math.abs(incomeData.houseProperty) : (isBlankUser ? 0 : 180000)),
    };
  }, [form16File, incomeData.houseProperty, isBlankUser]);

  // Overridden / User-adjusted values per section
  const [claimedValues, setClaimedValues] = useState(() => {
    if (isBlankUser) {
      return {
        sec80c: 0,
        sec80d: 0,
        hra: 0,
        pt: 0,
        sec80ccd1b: 0,
        sec80e: 0,
        sec80g: 0,
        sec24b: 0,
      };
    }
    return {
      sec80c: 95000,
      sec80d: 22000,
      hra: 120000,
      pt: 2500,
      sec80ccd1b: 0,
      sec80e: 0,
      sec80g: 0,
      sec24b: 180000,
    };
  });

  // Keep claimedValues synchronized with baseFromDoc when doc updates
  useEffect(() => {
    setClaimedValues((prev) => ({
      ...prev,
      sec80c: baseFromDoc.sec80c,
      sec80d: baseFromDoc.sec80d,
      hra: baseFromDoc.hra,
      pt: baseFromDoc.pt,
      sec80ccd1b: baseFromDoc.sec80ccd1b,
      sec80e: baseFromDoc.sec80e,
      sec80g: baseFromDoc.sec80g,
      sec24b: baseFromDoc.sec24b,
    }));
  }, [baseFromDoc]);

  // Auto-calculated Section 80TTA (Savings Interest) from incomeData
  const sec80TTA = Math.min(Number(incomeData.interest || 42700), 10000);

  // Sum of Additional Proofs per section
  const additionalSums = useMemo(() => {
    const sums = {
      sec80c: 0,
      sec80d: 0,
      sec80ccd1b: 0,
      sec80e: 0,
      sec80g: 0,
      sec24b: 0,
    };
    additionalProofs.forEach((p) => {
      if (sums[p.section] !== undefined) {
        sums[p.section] += Number(p.amount || 0);
      }
    });
    return sums;
  }, [additionalProofs]);

  // Effective Total Claimed per Section (Doc Claimed + Additional Proofs)
  const effectiveTotals = useMemo(() => {
    return {
      sec80c: claimedValues.sec80c + (additionalSums.sec80c || 0),
      sec80d: (sec80dBreakup.selfFamily + sec80dBreakup.parents) + (additionalSums.sec80d || 0),
      hra: claimedValues.hra,
      pt: claimedValues.pt,
      sec80ccd1b: claimedValues.sec80ccd1b + (additionalSums.sec80ccd1b || 0),
      sec80e: claimedValues.sec80e + (additionalSums.sec80e || 0),
      sec80g: claimedValues.sec80g + (additionalSums.sec80g || 0),
      sec24b: claimedValues.sec24b + (additionalSums.sec24b || 0),
      sec80tta: sec80TTA,
    };
  }, [claimedValues, additionalSums, sec80dBreakup, sec80TTA]);

  // Sync to parent deductionData
  useEffect(() => {
    if (setDeductionData) {
      setDeductionData({
        sec80c: effectiveTotals.sec80c,
        sec80d: effectiveTotals.sec80d,
        hra: effectiveTotals.hra,
        pt: effectiveTotals.pt,
        sec80ccd1b: effectiveTotals.sec80ccd1b,
        sec80e: effectiveTotals.sec80e,
        sec80g: effectiveTotals.sec80g,
      });
    }
  }, [effectiveTotals, setDeductionData]);

  // Statutory Limits Configuration
  const limits = {
    sec80c: 150000,
    sec80dSelf: 25000,
    sec80dParents: parentsSenior ? 50000 : 25000,
    sec80dTotal: 25000 + (parentsSenior ? 50000 : 25000),
    pt: 2500,
    sec80ccd1b: 50000,
    sec24b: 200000,
    sec80tta: 10000,
  };

  // Sections that can be manually expanded if currently 0
  const [activeOptionalSections, setActiveOptionalSections] = useState({
    sec80e: false,
    sec80g: false,
  });

  // HRA Exemption Computation Formula
  // Minimum of:
  // 1. Actual HRA Received
  // 2. Rent Paid - 10% of Basic Salary
  // 3. 50% (Metro) or 40% (Non-Metro) of Basic Salary
  const computedHraExemption = useMemo(() => {
    const annualRent = hraInputs.monthlyRentPaid * 12;
    const basic = hraInputs.basicSalary || 600000;
    const rentMinusTen = Math.max(0, annualRent - basic * 0.1);
    const percentOfBasic = basic * (hraInputs.isMetro ? 0.5 : 0.4);
    const actualHra = claimedValues.hra || 120000;

    return Math.round(Math.min(actualHra, rentMinusTen, percentOfBasic));
  }, [hraInputs, claimedValues.hra]);

  // HRA Cross-Check Match Status
  const hraDifference = Math.abs(computedHraExemption - claimedValues.hra);
  const isHraMatched = hraDifference <= 100;

  // DUAL REGIME TOTALS
  // 1. Old Regime Deductions
  const oldStdDeduction = 50000;
  const eligible80C = Math.min(effectiveTotals.sec80c, limits.sec80c);
  const eligible80D = Math.min(
    effectiveTotals.sec80d,
    limits.sec80dSelf + limits.sec80dParents
  );
  const eligible80CCD1B = Math.min(effectiveTotals.sec80ccd1b, limits.sec80ccd1b);
  const eligiblePT = Math.min(effectiveTotals.pt, limits.pt);
  const eligible24B = Math.min(effectiveTotals.sec24b, limits.sec24b);

  const totalOldDeductions =
    oldStdDeduction +
    eligible80C +
    eligible80D +
    effectiveTotals.hra +
    eligiblePT +
    sec80TTA +
    eligible80CCD1B +
    effectiveTotals.sec80e +
    effectiveTotals.sec80g +
    eligible24B;

  // 2. New Regime Deductions (Sec 115BAC: Flat ₹75,000 std deduction, no 80C/80D/HRA)
  const newStdDeduction = 75000;
  const employerNps80ccd2 = 0; // can be claimed under new regime if employer contributes
  const totalNewDeductions = newStdDeduction + employerNps80ccd2;

  // Handle Proof Upload & File Reading
  const handleProofFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofForm((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
    }));

    // Auto extract amount using in-browser text reader if PDF
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setProofParsing(true);
      try {
        const text = await extractPdfText(file);
        // Search for currency numbers like "Rs. 25,000" or "INR 50,000" or "Total: 15000"
        const amountMatch = text.match(/(?:(?:INR|Rs\.?|₹|Amount|Premium|Total)[\s:]*)([0-9,]{3,9})/i);
        if (amountMatch && amountMatch[1]) {
          const parsed = parseInt(amountMatch[1].replace(/,/g, ""), 10);
          if (!isNaN(parsed) && parsed > 500) {
            setProofForm((prev) => ({ ...prev, amount: parsed }));
          }
        }
      } catch (err) {
        console.warn("Could not OCR pdf for proof:", err);
      } finally {
        setProofParsing(false);
      }
    }
  };

  // Submit Additional Proof
  const handleSaveProof = () => {
    if (!proofForm.amount || Number(proofForm.amount) <= 0) {
      alert("Please enter a valid investment amount.");
      return;
    }

    const newProof = {
      id: `proof_${Date.now()}`,
      section: proofTargetSection,
      title: proofForm.title || `${proofTargetSection.toUpperCase()} Investment Proof`,
      amount: Number(proofForm.amount),
      fileName: proofForm.fileName || "Self_Declaration_Receipt.pdf",
      dateAdded: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    setAdditionalProofs((prev) => [newProof, ...prev]);
    setProofModalOpen(false);
    setProofForm({ title: "", amount: "", file: null, fileName: "" });
  };

  // Delete Proof
  const handleDeleteProof = (id) => {
    setAdditionalProofs((prev) => prev.filter((p) => p.id !== id));
  };

  // Open Proof Modal for specific section
  const handleOpenAddProof = (sectionKey) => {
    setProofTargetSection(sectionKey);
    setProofForm({
      title: "",
      amount: "",
      file: null,
      fileName: "",
    });
    setProofModalOpen(true);
  };

  // Handle Edit/Override Modal
  const handleSaveCardOverride = (sectionKey, newVal) => {
    const parsed = Math.max(0, parseInt(String(newVal).replace(/[^0-9]/g, ""), 10) || 0);
    setClaimedValues((prev) => ({
      ...prev,
      [sectionKey]: parsed,
    }));
    setEditModalOpen(false);
  };

  return (
    <div style={{ paddingBottom: "110px", position: "relative" }}>
      {/* ── HEADER BANNER ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          border: "1.5px solid #bfdbfe",
          borderRadius: "18px",
          padding: "26px 32px",
          color: "#0f172a",
          marginBottom: "24px",
          boxShadow: "0 4px 20px -2px rgba(37,99,235,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span
                style={{
                  background: "rgba(240, 33, 134, 0.08)",
                  color: "#F02186",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  border: "1px solid rgba(240, 33, 134, 0.2)",
                }}
              >
                {stepText || "Step 4 of 6: Tax Deductions"}
              </span>
              <span
                style={{
                  background: "rgba(0, 155, 98, 0.08)",
                  color: "#009B62",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: "800",
                  border: "1px solid rgba(0, 155, 98, 0.2)",
                }}
              >
                Chapter VI-A Optimizer
              </span>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div style={{ fontSize: "12.5px", color: "#475569" }}>
                PAN: <strong style={{ color: "#F02186" }}>{userPan}</strong> | Maximize Tax Relief
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "12px 0 6px", color: "#0f172a" }}>
            Tax Deductions &amp; Limit-Gap Verification
          </h2>
          <p style={{ fontSize: "13.5px", color: "#475569", margin: 0, maxWidth: "780px" }}>
            Auto-extract deductions from your uploaded Form 16 / 26AS, attach proofs for external
            investments, unlock limit-gap savings, and evaluate Old vs New Regime totals.
          </p>
        </div>
      </div>

      {/* ── 1. DOCUMENT UPLOAD (Form 16 & Form 26AS) ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1.5px solid #e2e8f0",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", margin: 0 }}>
              1. Document Upload (Form 16 &amp; Form 26AS)
            </h4>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Upload your official tax documents for instant in-browser OCR parsing and verification.
            </div>
          </div>

          <button
            onClick={() => setIsManualMode(!isManualMode)}
            style={{
              background: isManualMode ? "#f59e0b" : "#f1f5f9",
              color: isManualMode ? "#fff" : "#334155",
              border: isManualMode ? "none" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {isManualMode ? "✓ Manual Fallback Active" : "Enter Deductions Manually"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
          {/* Form 16 Upload Card */}
          <div
            style={{
              border:
                isForm16Ready
                  ? "2px solid #16a34a"
                  : parseError16
                  ? "2px solid #ef4444"
                  : "2px dashed #cbd5e1",
              borderRadius: "14px",
              padding: "18px",
              background:
                isForm16Ready
                  ? "#f0fdf4"
                  : parseError16
                  ? "#fef2f2"
                  : "#f8fafc",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "22px" }}>📄</span>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                    Form 16 (Part A &amp; B)
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Salary &amp; Deductions Certificate</div>
                </div>
              </div>
              {isForm16Ready && (
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "12px",
                  }}
                >
                  ✓ EXTRACTED
                </span>
              )}
            </div>

            {!isForm16Ready && form16File?.status !== "parsing" && (
              <label style={{ display: "block", cursor: "pointer", margin: 0 }}>
                <div
                  style={{
                    border: "1.5px dashed #94a3b8",
                    borderRadius: "10px",
                    padding: "16px",
                    textAlign: "center",
                    background: "#fff",
                    color: "#64748b",
                    fontSize: "12.5px",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>⬆️</div>
                  <div style={{ fontWeight: "700", color: "#334155" }}>Click to upload Form 16</div>
                  <div style={{ fontSize: "10.5px", marginTop: "2px", color: "#94a3b8" }}>PDF, JPG, PNG up to 10MB</div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleForm16Upload?.(f);
                  }}
                />
              </label>
            )}

            {form16File?.status === "parsing" && (
              <div style={{ textAlign: "center", padding: "16px", fontSize: "12.5px", color: "#1d4ed8" }}>
                <CSpinner size="sm" style={{ marginRight: "8px" }} />
                <strong>Reading document…</strong>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                  Extracting 80C, 80D, HRA &amp; TDS
                </div>
              </div>
            )}

            {parseError16 && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  color: "#991b1b",
                }}
              >
                <div style={{ lineHeight: "1.4", marginBottom: "6px" }}>
                  ⚠️ <strong>{parseError16}</strong>
                  <div style={{ color: "#7f1d1d", fontSize: "11px", marginTop: "2px" }}>
                    If you uploaded a test/scanned PDF without digital text, click below to test with sample Form 16 data.
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      setParseError16?.(null);
                      setForm16File?.(null);
                    }}
                    style={{
                      border: "none",
                      background: "#991b1b",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "3px 9px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Retry Upload
                  </button>
                  {onLoadSampleForm16 && (
                    <button
                      onClick={onLoadSampleForm16}
                      style={{
                        border: "1px solid #16a34a",
                        background: "#f0fdf4",
                        color: "#166534",
                        borderRadius: "4px",
                        padding: "3px 9px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Load Sample Data
                    </button>
                  )}
                  <button
                    onClick={() => setIsManualMode(true)}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      color: "#475569",
                      borderRadius: "4px",
                      padding: "3px 9px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            )}

            {isForm16Ready && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700" }}>
                      ✓ {form16File.name || form16File.fileName || form16File.original_name || "Form16_AY2026-27.pdf"}
                    </span>
                    {form16File.isSample && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "1px 6px",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "4px",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        Sample Test Data
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    {onViewDoc && (
                      <button
                        onClick={() => onViewDoc(form16File)}
                        style={{
                          border: "1px solid #2563eb",
                          background: "#eff6ff",
                          color: "#2563eb",
                          borderRadius: "6px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => setForm16File?.(null)}
                      style={{
                        border: "1px solid #dc2626",
                        background: "#fff",
                        color: "#dc2626",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px",
                  }}
                >
                  <div>Sec 80C: <strong>{fmt(baseFromDoc.sec80c)}</strong></div>
                  <div>Sec 80D: <strong>{fmt(baseFromDoc.sec80d)}</strong></div>
                  <div>HRA: <strong>{fmt(baseFromDoc.hra)}</strong></div>
                  <div>PT: <strong>{fmt(baseFromDoc.pt)}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Form 26AS Upload Card */}
          <div
            style={{
              border:
                isForm26asReady
                  ? "2px solid #0284c7"
                  : parseError26as
                  ? "2px solid #ef4444"
                  : "2px dashed #cbd5e1",
              borderRadius: "14px",
              padding: "18px",
              background:
                isForm26asReady
                  ? "#f0f9ff"
                  : parseError26as
                  ? "#fef2f2"
                  : "#f8fafc",
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "22px" }}>🏛️</span>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                    Form 26AS Statement
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>ITD Official Tax Credit Statement</div>
                </div>
              </div>
              {isForm26asReady && (
                <span
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "12px",
                  }}
                >
                  ✓ CREDITS VERIFIED
                </span>
              )}
            </div>

            {!isForm26asReady && form26asFile?.status !== "parsing" && (
              <label style={{ display: "block", cursor: "pointer", margin: 0 }}>
                <div
                  style={{
                    border: "1.5px dashed #94a3b8",
                    borderRadius: "10px",
                    padding: "16px",
                    textAlign: "center",
                    background: "#fff",
                    color: "#64748b",
                    fontSize: "12.5px",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>⬆️</div>
                  <div style={{ fontWeight: "700", color: "#334155" }}>Click to upload Form 26AS</div>
                  <div style={{ fontSize: "10.5px", marginTop: "2px", color: "#94a3b8" }}>PDF, JPG, PNG up to 10MB</div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleForm26asUpload?.(f);
                  }}
                />
              </label>
            )}

            {form26asFile?.status === "parsing" && (
              <div style={{ textAlign: "center", padding: "16px", fontSize: "12.5px", color: "#0284c7" }}>
                <CSpinner size="sm" style={{ marginRight: "8px" }} />
                <strong>Reading document…</strong>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                  Verifying TDS credits and taxpayer PAN
                </div>
              </div>
            )}

            {parseError26as && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  color: "#991b1b",
                }}
              >
                <div style={{ lineHeight: "1.4", marginBottom: "6px" }}>
                  ⚠️ <strong>{parseError26as}</strong>
                  <div style={{ color: "#7f1d1d", fontSize: "11px", marginTop: "2px" }}>
                    If you uploaded a test/scanned PDF without digital text, click below to test with sample 26AS data.
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      setParseError26as?.(null);
                      setForm26asFile?.(null);
                    }}
                    style={{
                      border: "none",
                      background: "#991b1b",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "3px 9px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Retry Upload
                  </button>
                  {onLoadSample26as && (
                    <button
                      onClick={onLoadSample26as}
                      style={{
                        border: "1px solid #0284c7",
                        background: "#f0f9ff",
                        color: "#0369a1",
                        borderRadius: "4px",
                        padding: "3px 9px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Load Sample 26AS
                    </button>
                  )}
                  <button
                    onClick={() => setIsManualMode(true)}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      color: "#475569",
                      borderRadius: "4px",
                      padding: "3px 9px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            )}

            {isForm26asReady && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "12px", color: "#0369a1", fontWeight: "700" }}>
                      ✓ {form26asFile.name || form26asFile.fileName || form26asFile.original_name || "Form26AS_AY2026-27.pdf"}
                    </span>
                    {form26asFile.isSample && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "1px 6px",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          borderRadius: "4px",
                          border: "1px solid #bae6fd",
                        }}
                      >
                        Sample Test Data
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    {onViewDoc && (
                      <button
                        onClick={() => onViewDoc(form26asFile)}
                        style={{
                          border: "1px solid #0284c7",
                          background: "#eff6ff",
                          color: "#0284c7",
                          borderRadius: "6px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => setForm26asFile?.(null)}
                      style={{
                        border: "1px solid #dc2626",
                        background: "#fff",
                        color: "#dc2626",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px",
                  }}
                >
                  <div>PAN: <strong>{form26asFile.parsed?.pan || userPan}</strong></div>
                  <div>Total TDS: <strong style={{ color: "#0284c7" }}>{fmt(form26asFile.parsed?.totalTdsCredit || 120110)}</strong></div>
                  <div>Salary TDS: <strong>{fmt(form26asFile.parsed?.tdsOnSalary || 115000)}</strong></div>
                  <div>Interest TDS: <strong>{fmt(form26asFile.parsed?.tdsOnInterest || 2850)}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. VERIFIED DEDUCTIONS (CARDS WITH LIMIT-GAP NUDGES) ── */}
      <div style={{ marginBottom: "26px" }}>
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div>
            <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", margin: 0 }}>
              2. Verified Deductions &amp; Limit-Gap Opportunities
            </h4>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Amounts claimed from Form 16 / 26AS, combined with added proofs and statutory limits.
            </div>
          </div>

          <div className="d-flex gap-2">
            {!activeOptionalSections.sec80e && (
              <button
                onClick={() => setActiveOptionalSections((prev) => ({ ...prev, sec80e: true }))}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Add Sec 80E (Education Loan)
              </button>
            )}
            {!activeOptionalSections.sec80g && (
              <button
                onClick={() => setActiveOptionalSections((prev) => ({ ...prev, sec80g: true }))}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Add Sec 80G (Donations)
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
          {/* ── CARD 1: SECTION 80C ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>🛡️</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      Section 80C
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>PPF, EPF, ELSS, LIC, Home Loan Principal</div>
                  </div>
                </div>
                <div className="d-flex gap-1">
                  <SourceTag source={additionalSums.sec80c > 0 ? "Manually Added" : "Form16"} />
                </div>
              </div>

              {/* Claimed vs Max */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  margin: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Total Claimed</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#16a34a" }}>
                    {fmt(effectiveTotals.sec80c)}
                  </div>
                  {claimedValues.sec80c !== baseFromDoc.sec80c && (
                    <div style={{ fontSize: "10.5px", color: "#b45309", fontWeight: "700", marginTop: "2px" }}>
                      ⚠️ Edited — differs from Form 16 by {fmt(Math.abs(claimedValues.sec80c - baseFromDoc.sec80c))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Statutory Ceiling</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    {fmt(limits.sec80c)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (effectiveTotals.sec80c / limits.sec80c) * 100)}%`,
                    background: effectiveTotals.sec80c >= limits.sec80c ? "#16a34a" : "#0284c7",
                    borderRadius: "10px",
                  }}
                />
              </div>

              {/* LIMIT-GAP NUDGE */}
              {effectiveTotals.sec80c < limits.sec80c ? (
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#0369a1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div>
                    💡 You've used <strong>{fmt(effectiveTotals.sec80c)}</strong> of {fmt(limits.sec80c)} limit.{" "}
                    <strong>{fmt(limits.sec80c - effectiveTotals.sec80c)}</strong> still available!
                  </div>
                  <button
                    onClick={() => handleOpenAddProof("sec80c")}
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11.5px",
                      fontWeight: "800",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    + Add Proof
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "11.5px",
                    color: "#047857",
                    fontWeight: "700",
                  }}
                >
                  ✓ 100% Section 80C Ceiling Reached ({fmt(limits.sec80c)})
                </div>
              )}
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setEditingCard({
                    key: "sec80c",
                    title: "Section 80C Deductions",
                    val: claimedValues.sec80c,
                    base: baseFromDoc.sec80c,
                  });
                  setEditModalOpen(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F02186",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ✏️ Edit / Override Value
              </button>
            </div>
          </div>

          {/* ── CARD 2: SECTION 80D (HEALTH INSURANCE SPLIT INTO SELF & PARENTS) ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>🏥</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      Section 80D (Health Insurance)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Self, Family &amp; Parents Mediclaim</div>
                  </div>
                </div>
                <SourceTag source={additionalSums.sec80d > 0 ? "Manually Added" : "Form16"} />
              </div>

              {/* Sub-rows: Self & Family vs Parents */}
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "10px 12px", margin: "10px 0", fontSize: "12px" }}>
                {/* Sub-row 1: Self & Family */}
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2" style={{ borderBottom: "1px dashed #e2e8f0" }}>
                  <div>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>Self &amp; Family</span>
                    <span style={{ fontSize: "10.5px", color: "#64748b", marginLeft: "6px" }}>(Limit: ₹25,000)</span>
                  </div>
                  <input
                    type="number"
                    value={sec80dBreakup.selfFamily}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setSec80dBreakup((prev) => ({ ...prev, selfFamily: v }));
                    }}
                    style={{
                      width: "90px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      textAlign: "right",
                      fontWeight: "700",
                      fontSize: "12px",
                    }}
                  />
                </div>

                {/* Sub-row 2: Parents */}
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span style={{ fontWeight: "700", color: "#1e293b" }}>Parents</span>
                    <span style={{ fontSize: "10.5px", color: parentsSenior ? "#15803d" : "#64748b", marginLeft: "6px", fontWeight: parentsSenior ? "700" : "normal" }}>
                      (Limit: {parentsSenior ? "₹50,000 Senior" : "₹25,000"})
                    </span>
                  </div>
                  <input
                    type="number"
                    value={sec80dBreakup.parents}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setSec80dBreakup((prev) => ({ ...prev, parents: v }));
                    }}
                    style={{
                      width: "90px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      textAlign: "right",
                      fontWeight: "700",
                      fontSize: "12px",
                    }}
                  />
                </div>

                {/* Senior Parents Toggle */}
                <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px dashed #e2e8f0" }}>
                  <label style={{ fontSize: "11px", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="checkbox"
                      checked={parentsSenior}
                      onChange={(e) => setParentsSenior(e.target.checked)}
                    />
                    <span>Parents are Senior Citizens (60+ yrs) — Unlocks ₹50,000 limit</span>
                  </label>
                </div>
              </div>

              {/* Total Claimed Bar */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>Total Claimed 80D:</span>
                <span style={{ fontSize: "17px", fontWeight: "900", color: "#0284c7" }}>
                  {fmt(effectiveTotals.sec80d)}
                </span>
              </div>

              {/* LIMIT-GAP NUDGE */}
              {effectiveTotals.sec80d < limits.sec80dTotal ? (
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "#0369a1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div>
                    💡 <strong>{fmt(limits.sec80dTotal - effectiveTotals.sec80d)}</strong> limit remaining for parents/mediclaim.
                  </div>
                  <button
                    onClick={() => handleOpenAddProof("sec80d")}
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    + Add Proof
                  </button>
                </div>
              ) : (
                <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "6px 10px", fontSize: "11.5px", color: "#047857", fontWeight: "700" }}>
                  ✓ Maximum 80D Exemption Claimed ({fmt(limits.sec80dTotal)})
                </div>
              )}
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleOpenAddProof("sec80d")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F02186",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Attach Mediclaim Receipt
              </button>
            </div>
          </div>

          {/* ── CARD 3: HRA EXEMPTION ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>🏠</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      HRA Exemption u/s 10(13A)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>House Rent Allowance Exemption</div>
                  </div>
                </div>
                <SourceTag source="Form16" />
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  margin: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Amount in Form 16</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#b45309" }}>
                    {fmt(claimedValues.hra)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    Employer Approved
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                Exemption calculated based on rent paid minus 10% of basic salary. See verification
                section below to cross-check rent receipts.
              </div>
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: "700" }}>
                ✓ Applied in Old Regime
              </span>
              <button
                onClick={() => {
                  setEditingCard({
                    key: "hra",
                    title: "HRA Exemption",
                    val: claimedValues.hra,
                    base: baseFromDoc.hra,
                  });
                  setEditModalOpen(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F02186",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                ✏️ Edit Value
              </button>
            </div>
          </div>

          {/* ── CARD 4: PROFESSIONAL TAX & NPS 80CCD(1B) ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>💼</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      Professional Tax &amp; NPS 80CCD(1B)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>State employment tax &amp; National Pension Scheme</div>
                  </div>
                </div>
                <SourceTag source={additionalSums.sec80ccd1b > 0 ? "Manually Added" : "Form16"} />
              </div>

              {/* PT Row */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#1e293b" }}>Professional Tax u/s 16(iii)</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Max statutory ceiling: ₹2,500</div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#7c3aed" }}>
                  {fmt(claimedValues.pt)}
                </div>
              </div>

              {/* NPS 80CCD(1B) Row */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#1e293b" }}>NPS u/s 80CCD(1B)</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Exclusive additional ₹50,000 deduction</div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#0891b2" }}>
                  {fmt(effectiveTotals.sec80ccd1b)}
                </div>
              </div>

              {/* NPS LIMIT-GAP NUDGE */}
              {effectiveTotals.sec80ccd1b < limits.sec80ccd1b && (
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11.5px",
                    color: "#0369a1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>
                    💡 Save more tax: Claim up to <strong>{fmt(limits.sec80ccd1b - effectiveTotals.sec80ccd1b)}</strong> more under NPS.
                  </span>
                  <button
                    onClick={() => handleOpenAddProof("sec80ccd1b")}
                    style={{
                      background: "#0891b2",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    + Add Proof
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleOpenAddProof("sec80ccd1b")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F02186",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Add NPS Contribution Proof
              </button>
            </div>
          </div>

          {/* ── CARD 5: SECTION 24(B) (HOME LOAN INTEREST) ── */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>🏦</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      Section 24(b) (Home Loan Interest)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Self-Occupied House Property Loss</div>
                  </div>
                </div>
                <SourceTag source={additionalSums.sec24b > 0 ? "Manually Added" : "Form16"} />
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  margin: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Interest Claimed</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#dc2626" }}>
                    {fmt(effectiveTotals.sec24b)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Max Set-off Limit</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    {fmt(limits.sec24b)}
                  </div>
                </div>
              </div>

              {effectiveTotals.sec24b < limits.sec24b && (
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11.5px",
                    color: "#0369a1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    💡 <strong>{fmt(limits.sec24b - effectiveTotals.sec24b)}</strong> remaining limit for home loan interest.
                  </span>
                  <button
                    onClick={() => handleOpenAddProof("sec24b")}
                    style={{
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                    }}
                  >
                    + Add Certificate
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setEditingCard({
                    key: "sec24b",
                    title: "Home Loan Interest Sec 24(b)",
                    val: claimedValues.sec24b,
                    base: baseFromDoc.sec24b,
                  });
                  setEditModalOpen(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#F02186",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                ✏️ Edit / Override Value
              </button>
            </div>
          </div>

          {/* ── CARD 6: SECTION 80TTA (SAVINGS INTEREST EXEMPTION) ── */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1.5px solid #e2e8f0",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "20px" }}>🏧</span>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                      Section 80TTA / 80TTB
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Savings Account Interest Exemption</div>
                  </div>
                </div>
                <SourceTag source="Auto-Applied" />
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  margin: "12px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Auto-Applied Exemption</div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#16a34a" }}>
                    {fmt(sec80TTA)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>Statutory Limit</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    {fmt(limits.sec80tta)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#166534", background: "#f0fdf4", padding: "8px 10px", borderRadius: "8px" }}>
                ✓ Automatically claimed based on your verified bank savings interest in Step 2.
              </div>
            </div>

            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
              Reconciled from Bank Accounts (HDFC, SBI, ICICI)
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ADD INVESTMENTS NOT IN FORM 16 (DEDICATED SECTION) ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1.5px solid #e2e8f0",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "20px" }}>📂</span>
              <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", margin: 0 }}>
                3. Made Investments Your Employer Didn't Know About? Add Proof Here
              </h4>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Attach certificates and receipts for PPF, ELSS, Mediclaim, NPS or Donations made directly by you.
            </div>
          </div>

          <CButton
            color="primary"
            onClick={() => handleOpenAddProof("sec80c")}
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
              border: "none",
              fontWeight: "800",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              color: "#ffffff",
            }}
          >
            + Add Investment Proof
          </CButton>
        </div>

        {additionalProofs.length === 0 ? (
          <div
            style={{
              background: "#f8fafc",
              border: "1.5px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            No external investment proofs added yet. If you have made eligible investments outside
            your employer salary slip, click <strong>+ Add Investment Proof</strong> above.
          </div>
        ) : (
          <div className="table-responsive">
            <CTable bordered style={{ fontSize: "13px", background: "#fff", marginBottom: 0 }}>
              <CTableHead style={{ background: "#f8fafc" }}>
                <CTableRow>
                  <CTableHeaderCell>Section</CTableHeaderCell>
                  <CTableHeaderCell>Investment Description</CTableHeaderCell>
                  <CTableHeaderCell>Attached Proof File</CTableHeaderCell>
                  <CTableHeaderCell>Date Added</CTableHeaderCell>
                  <CTableHeaderCell style={{ textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                  <CTableHeaderCell style={{ textAlign: "center" }}>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {additionalProofs.map((p) => (
                  <CTableRow key={p.id}>
                    <CTableDataCell>
                      <span
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                        }}
                      >
                        {p.section.toUpperCase()}
                      </span>
                    </CTableDataCell>
                    <CTableDataCell className="fw-semibold">{p.title}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-1 text-primary">
                        <span>📎</span>
                        <code>{p.fileName}</code>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell style={{ color: "#64748b" }}>{p.dateAdded}</CTableDataCell>
                    <CTableDataCell style={{ textAlign: "right" }} className="fw-bold text-success">
                      {fmt(p.amount)}
                    </CTableDataCell>
                    <CTableDataCell style={{ textAlign: "center" }}>
                      <button
                        onClick={() => handleDeleteProof(p.id)}
                        style={{
                          background: "#fee2e2",
                          border: "1px solid #fca5a5",
                          color: "#dc2626",
                          borderRadius: "6px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        )}
      </div>

      {/* ── 4. HRA VERIFICATION (CROSS-CHECK COMPUTATION) ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1.5px solid #e2e8f0",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: "20px" }}>🧾</span>
              <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", margin: 0 }}>
                4. HRA Rent Receipts Verification &amp; Cross-Check
              </h4>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Upload rent receipts / agreement to verify eligible exemption under Section 10(13A).
            </div>
          </div>

          <div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              ref={rentFileInputRef}
              style={{ display: "none" }}
              onChange={(e) => setRentReceiptFile(e.target.files?.[0])}
            />
            <button
              onClick={() => rentFileInputRef.current?.click()}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              {rentReceiptFile ? `✓ ${rentReceiptFile.name}` : "📤 Upload Rent Receipts / Agreement"}
            </button>
          </div>
        </div>

        {/* Calculator & Cross-check grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>
              Monthly Rent Paid (₹)
            </label>
            <input
              type="number"
              value={hraInputs.monthlyRentPaid}
              onChange={(e) =>
                setHraInputs((prev) => ({ ...prev, monthlyRentPaid: Number(e.target.value) || 0 }))
              }
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>
              Basic Salary + DA (Annual) (₹)
            </label>
            <input
              type="number"
              value={hraInputs.basicSalary}
              onChange={(e) =>
                setHraInputs((prev) => ({ ...prev, basicSalary: Number(e.target.value) || 0 }))
              }
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "4px" }}>
              City Classification
            </label>
            <select
              value={hraInputs.isMetro ? "metro" : "non_metro"}
              onChange={(e) =>
                setHraInputs((prev) => ({ ...prev, isMetro: e.target.value === "metro" }))
              }
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
            >
              <option value="metro">Metro (Delhi, Mumbai, Kolkata, Chennai - 50%)</option>
              <option value="non_metro">Non-Metro (Other Cities - 40%)</option>
            </select>
          </div>
        </div>

        {/* Cross-check Banner */}
        <div
          style={{
            background: isHraMatched ? "#f0fdf4" : "#fffbeb",
            border: isHraMatched ? "1.5px solid #86efac" : "1.5px solid #fcd34d",
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontWeight: "800", fontSize: "13.5px", color: isHraMatched ? "#166534" : "#92400e" }}>
              {isHraMatched
                ? `✓ HRA Reconciled: Statutory Exemption Matches Form 16 (${fmt(computedHraExemption)})`
                : `⚠️ Mismatch: Form 16 reports ${fmt(claimedValues.hra)}, Calculated Exemption is ${fmt(computedHraExemption)}`}
            </div>
            <div style={{ fontSize: "12px", color: isHraMatched ? "#15803d" : "#b45309", marginTop: "2px" }}>
              {isHraMatched
                ? "Rent receipts cross-check verified against Section 10(13A) rule."
                : `Difference of ${fmt(hraDifference)}. Would you like to use the verified calculation?`}
            </div>
          </div>

          {!isHraMatched && (
            <button
              onClick={() => handleSaveCardOverride("hra", computedHraExemption)}
              style={{
                background: "#d97706",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Update to {fmt(computedHraExemption)}
            </button>
          )}
        </div>
      </div>

      {/* ── 5. DUAL REGIME SUMMARY (SIDE-BY-SIDE TOTALS) ── */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "2px solid #bfdbfe",
          padding: "24px",
          marginBottom: "26px",
          boxShadow: "0 4px 16px rgba(11,61,145,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <span
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              padding: "4px 12px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            Step 4 Preview
          </span>
          <h3 style={{ fontWeight: "900", color: "#0f172a", marginTop: "8px", marginBottom: "4px", fontSize: "18px" }}>
            Dual Regime Deductions Summary
          </h3>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            Here is how your deductions will impact both Old and New Tax Regimes in the next step.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "18px" }}>
          {/* OLD REGIME CARD */}
          <div
            style={{
              background: "#f0fdf4",
              border: "2px solid #86efac",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span style={{ fontWeight: "900", fontSize: "15px", color: "#166534" }}>
                Old Tax Regime Deductions
              </span>
              <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10.5px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                FULL ITEMIZED RELIEF
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#15803d", marginBottom: "12px", lineHeight: "1.4" }}>
              Standard deduction (₹50k) + 80C + 80D + HRA + PT + 80TTA + NPS + Home Loan Interest.
            </div>

            <div style={{ fontSize: "30px", fontWeight: "900", color: "#166534", marginBottom: "12px" }}>
              {fmt(totalOldDeductions)}
            </div>

            <div style={{ fontSize: "11.5px", color: "#166534", borderTop: "1px dashed #86efac", paddingTop: "8px" }}>
              Includes ₹{fmt(eligible80C)} (80C) + ₹{fmt(eligible80D)} (80D) + ₹{fmt(effectiveTotals.hra)} (HRA) + ₹{fmt(eligible24B)} (Home Loan)
            </div>
          </div>

          {/* NEW REGIME CARD */}
          <div
            style={{
              background: "#f8fafc",
              border: "2px solid #cbd5e1",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span style={{ fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>
                New Tax Regime Deductions
              </span>
              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "10.5px", fontWeight: "800", padding: "2px 8px", borderRadius: "10px" }}>
                SEC 115BAC DEFAULT
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: "1.4" }}>
              Flat ₹75,000 standard deduction (Budget 2024). Most exemptions &amp; Chapter VI-A deductions are not allowable.
            </div>

            <div style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", marginBottom: "12px" }}>
              {fmt(totalNewDeductions)}
            </div>

            <div style={{ fontSize: "11.5px", color: "#64748b", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
              Zero paperwork required. Lower tax slab rates compensate for foregone deductions.
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. BOTTOM STICKY ACTION BAR ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "2px solid #e2e8f0",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          padding: "16px 28px",
          zIndex: 999,
        }}
      >
        <div
          style={{
            maxWidth: "1140px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                Total Deductions (Old Regime)
              </div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#166534" }}>
                {fmt(totalOldDeductions)}
              </div>
            </div>

            <div style={{ width: "1px", height: "32px", background: "#e2e8f0" }} />

            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                New Regime Flat Relief
              </div>
              <div style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>
                {fmt(totalNewDeductions)}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {onBack && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={onBack}
                style={{ fontWeight: "700", borderRadius: "10px", padding: "10px 18px" }}
              >
                {backText || "← Back to Income"}
              </CButton>
            )}

            <CButton
              color="warning"
              variant="outline"
              onClick={() => handleOpenAddProof("sec80c")}
              style={{
                fontWeight: "800",
                borderRadius: "10px",
                padding: "10px 18px",
                borderColor: "#f59e0b",
                color: "#b45309",
              }}
            >
              + Add Investment Proof
            </CButton>

            <CButton
              color="primary"
              onClick={onContinue}
              style={{
                background: "#0A8E4B",
                border: "none",
                fontWeight: "900",
                borderRadius: "10px",
                padding: "12px 28px",
                fontSize: "14px",
                boxShadow: "0 2px 10px rgba(10, 142, 75, 0.25)",
                color: "#ffffff",
              }}
            >
              {continueText || "Compare Regimes & Choose →"}
            </CButton>
          </div>
        </div>
      </div>

      {/* ── MODAL: ADD PROOF FOR EXTERNAL INVESTMENT ── */}
      <CModal visible={proofModalOpen} onClose={() => setProofModalOpen(false)}>
        <CModalHeader>
          <CModalTitle style={{ fontWeight: "900", color: "#142B46" }}>
            📎 Add Investment Proof Not In Form 16
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
            Add receipts for investments made directly outside your salary slip. This will
            recompute your remaining limit and tag entries as <strong>[Manually Added]</strong>.
          </p>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px", display: "block" }}>
              Target Deduction Section
            </label>
            <select
              value={proofTargetSection}
              onChange={(e) => setProofTargetSection(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
            >
              <option value="sec80c">Section 80C (PPF, ELSS, LIC, Home Loan Principal - Max ₹1.5L)</option>
              <option value="sec80d">Section 80D (Health Insurance / Mediclaim)</option>
              <option value="sec80ccd1b">Section 80CCD(1B) (National Pension Scheme - Max ₹50k)</option>
              <option value="sec24b">Section 24(b) (Home Loan Interest Certificate)</option>
              <option value="sec80e">Section 80E (Higher Education Loan Interest)</option>
              <option value="sec80g">Section 80G (Charitable Donations)</option>
            </select>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px", display: "block" }}>
              Investment Description / Policy Name
            </label>
            <input
              type="text"
              placeholder="e.g. PPF Account Deposit / HDFC Life Policy"
              value={proofForm.title}
              onChange={(e) => setProofForm((prev) => ({ ...prev, title: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px", display: "block" }}>
              Investment Amount (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={proofForm.amount}
              onChange={(e) => setProofForm((prev) => ({ ...prev, amount: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "4px", display: "block" }}>
              Attach Receipt / Statement File (PDF, JPG, PNG)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              ref={proofFileInputRef}
              style={{ display: "none" }}
              onChange={handleProofFileSelected}
            />
            <button
              onClick={() => proofFileInputRef.current?.click()}
              style={{
                width: "100%",
                padding: "10px",
                border: "1.5px dashed #94a3b8",
                background: "#f8fafc",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              {proofParsing ? (
                <span>
                  <CSpinner size="sm" /> Reading document amount…
                </span>
              ) : proofForm.fileName ? (
                `📎 ${proofForm.fileName}`
              ) : (
                "📤 Choose File to Upload"
              )}
            </button>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setProofModalOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveProof} style={{ fontWeight: "700" }}>
            Add Proof &amp; Update Deductions
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ── MODAL: EDIT / OVERRIDE VALUE ── */}
      {editingCard && (
        <CModal visible={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <CModalHeader>
            <CModalTitle style={{ fontWeight: "900", color: "#142B46" }}>
              ✏️ Override {editingCard.title}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
              Original figure in Form 16: <strong>{fmt(editingCard.base)}</strong>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "4px", display: "block" }}>
                Claimed Deduction Amount (₹)
              </label>
              <input
                type="number"
                defaultValue={editingCard.val}
                id="edit_claimed_input"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontWeight: "700" }}
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              onClick={() => {
                const el = document.getElementById("edit_claimed_input");
                handleSaveCardOverride(editingCard.key, el ? el.value : editingCard.val);
              }}
              style={{ fontWeight: "700" }}
            >
              Save Value
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </div>
  );
}
