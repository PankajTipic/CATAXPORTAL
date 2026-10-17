import React, { useState, useRef } from "react";
import {
  CButton,
  CSpinner,
  CBadge,
} from "@coreui/react";

const fmt = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹0";
  const num = Math.round(Number(val));
  if (num < 0) return `– ₹${Math.abs(num).toLocaleString("en-IN")}`;
  return `₹${num.toLocaleString("en-IN")}`;
};

export default function Form16UploadStep({
  form16File = null,
  parseError16 = null,
  handleForm16Upload,
  onLoadSampleForm16,
  setForm16File,
  setParseError16,
  incomeData = {},
  setIncomeData,
  deductionData = {},
  setDeductionData,
  totalTdsCredit = 0,
  userPan = "",
  onContinue,
  onBack,
  onViewDoc,
}) {
  const fileInputRef = useRef(null);
  const [accepting, setAccepting] = useState(false);

  const parsed = form16File?.parsed || {};
  const isParsed = form16File?.status === "parsed";
  const isParsing = form16File?.status === "parsing";
  const hasError = form16File?.status === "error" || !!parseError16;

  // Values extracted from Form 16
  const form16Salary = parsed.grossSalary || 0;
  const form16Tds = parsed.totalTds || parsed.tds || 0;
  const form16Employer = parsed.employerName || "";
  const form16Pan = parsed.employeePan || "";

  // Current system values (from Income step & 26AS)
  const systemSalary = Number(incomeData.salary || 0);
  const systemEmployer = incomeData.employerName || "";
  const systemTds = Number(totalTdsCredit || 0);

  // Differences
  const salaryDiff = form16Salary - systemSalary;
  const hasSalaryMismatch = isParsed && systemSalary > 0 && Math.abs(salaryDiff) > 1;
  const hasEmployerMismatch =
    isParsed &&
    form16Employer &&
    systemEmployer &&
    form16Employer.toLowerCase() !== systemEmployer.toLowerCase();
  const tdsDiff = form16Tds - systemTds;
  const hasTdsMismatch = isParsed && systemTds > 0 && Math.abs(tdsDiff) > 5;

  // Apply Form 16 values to system
  const handleAcceptForm16 = () => {
    setAccepting(true);

    if (setIncomeData) {
      setIncomeData((prev) => ({
        ...prev,
        salary: form16Salary || prev.salary,
        employerName: form16Employer || prev.employerName,
        houseProperty:
          parsed.netHouseProperty !== undefined && parsed.netHouseProperty !== null
            ? parsed.netHouseProperty
            : prev.houseProperty,
      }));
    }

    if (setDeductionData) {
      setDeductionData({
        sec80c: parsed.sec80c ?? 0,
        sec80d: parsed.sec80d ?? 0,
        hra: parsed.hraExemption ?? 0,
        pt: parsed.professionalTax ?? 0,
        sec80ccd1b: parsed.sec80ccd1b ?? 0,
        sec80g: parsed.sec80g ?? 0,
        sec80e: parsed.sec80e ?? 0,
      });
    }

    setTimeout(() => {
      setAccepting(false);
      onContinue?.();
    }, 400);
  };

  const handleClearForm16 = () => {
    if (form16File?.objectUrl) {
      URL.revokeObjectURL(form16File.objectUrl);
    }
    setForm16File?.(null);
    setParseError16?.(null);
  };

  return (
    <div style={{ paddingBottom: "110px", position: "relative" }}>
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          border: "1.5px solid rgba(240, 33, 134, 0.15)",
          borderRadius: "18px",
          padding: "26px 32px",
          color: "#0f172a",
          marginBottom: "24px",
          boxShadow: "0 4px 20px -2px rgba(240, 33, 134, 0.05)",
        }}
      >
        <div className="d-flex align-items-center gap-2 mb-2">
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
            Step 3 of 6 · Form 16
          </span>
          <span
            style={{
              background: "#ecfdf5",
              color: "#15803d",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "800",
              border: "1px solid #bbf7d0",
            }}
          >
            Salary &amp; TDS Verification
          </span>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: "900", margin: "8px 0 6px", color: "#0f172a" }}>
          Upload Form 16 for Salary &amp; TDS Verification
        </h2>
        <p style={{ fontSize: "13.5px", color: "#475569", margin: 0, maxWidth: "780px" }}>
          Upload your Form 16 (Part A &amp; B). We will extract Gross Salary, TDS, Employer details and
          deductions, then reconcile them with the data you entered in the previous step.
        </p>
      </div>

      {/* UPLOAD CARD */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: isParsed
            ? "2px solid #16a34a"
            : hasError
            ? "2px solid #ef4444"
            : "1.5px solid #e2e8f0",
          padding: "28px",
          marginBottom: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
          <div>
            <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", margin: 0 }}>
              📄 Form 16 (Part A & B)
            </h4>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
              Official Salary & TDS Certificate issued by your employer
            </div>
          </div>

          {isParsed && (
            <CBadge color="success" style={{ fontSize: "12px", padding: "6px 12px" }}>
              ✓ Extracted Successfully
            </CBadge>
          )}
        </div>

        {/* Empty Upload State */}
        {!form16File && (
          <div>
            <label style={{ display: "block", cursor: "pointer", margin: 0 }}>
              <div
                style={{
                  border: "2px dashed #94a3b8",
                  borderRadius: "14px",
                  padding: "40px 24px",
                  textAlign: "center",
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>⬆️</div>
                <div style={{ fontWeight: "800", fontSize: "16px", color: "#0f172a" }}>
                  Click to upload Form 16
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
                  PDF preferred · JPG / PNG also accepted · Max 10 MB
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => handleForm16Upload?.(e.target.files?.[0])}
              />
            </label>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                onClick={onLoadSampleForm16}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Or load sample Form 16 for testing
              </button>
            </div>
          </div>
        )}

        {/* Parsing State */}
        {isParsing && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <CSpinner style={{ width: "2.5rem", height: "2.5rem", marginBottom: "12px", color: "#F02186" }} />
            <div style={{ fontWeight: "800", fontSize: "15px", color: "#F02186" }}>
              Reading Form 16…
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
              Extracting Gross Salary, TDS, Employer & Deductions
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && !isParsing && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "16px 20px",
              marginTop: "8px",
            }}
          >
            <div style={{ fontWeight: "800", color: "#991b1b", marginBottom: "6px" }}>
              ⚠️ Could not read the document
            </div>
            <div style={{ fontSize: "13px", color: "#7f1d1d", marginBottom: "12px" }}>
              {parseError16 || "Please try a clearer PDF or enter details manually in the next steps."}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton color="danger" variant="outline" size="sm" onClick={handleClearForm16} style={{ fontWeight: "700" }}>
                Remove & Try Again
              </CButton>
              <CButton color="primary" size="sm" onClick={onLoadSampleForm16} style={{ fontWeight: "700" }}>
                Load Sample Form 16
              </CButton>
            </div>
          </div>
        )}

        {/* Parsed Success State */}
        {isParsed && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "20px" }}>📄</span>
                <div>
                  <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#166534" }}>
                    {form16File.name}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                    {(form16File.size / 1024).toFixed(1)} KB
                    {form16File.isSample ? " · Sample Document" : ""}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                {onViewDoc && (
                  <CButton color="success" variant="outline" size="sm" onClick={() => onViewDoc(form16File)} style={{ fontWeight: "700" }}>
                    View Document
                  </CButton>
                )}
                <CButton color="danger" variant="outline" size="sm" onClick={handleClearForm16} style={{ fontWeight: "700" }}>
                  Remove
                </CButton>
              </div>
            </div>

            {/* Extracted Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              {[
                { label: "Gross Salary", value: form16Salary, icon: "💰" },
                { label: "TDS Deducted", value: form16Tds, icon: "🧾" },
                { label: "Employer", value: form16Employer || "–", icon: "🏢", isText: true },
                { label: "Employee PAN", value: form16Pan || userPan || "–", icon: "🆔", isText: true },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", marginBottom: "4px" }}>
                    {item.icon} {item.label}
                  </div>
                  <div
                    style={{
                      fontWeight: "900",
                      fontSize: item.isText ? "14px" : "18px",
                      color: "#0f172a",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.isText ? item.value : fmt(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RECONCILIATION PANEL */}
      {isParsed && (
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
          <h4 style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", marginBottom: "6px" }}>
            🔍 Salary & TDS Reconciliation
          </h4>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
            Comparing values extracted from Form 16 with the data you entered in the Income step.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", border: "1px solid #e2e8f0" }}>Field</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0" }}>System / Entered</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", border: "1px solid #e2e8f0" }}>Form 16</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", border: "1px solid #e2e8f0" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Gross Salary</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmt(systemSalary)}</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(form16Salary)}</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    {hasSalaryMismatch ? (
                      <span style={{ color: "#d97706", fontWeight: "800" }}>⚠️ Mismatch</span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: "800" }}>✓ Match</span>
                    )}
                  </td>
                </tr>
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>Employer Name</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{systemEmployer || "–"}</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{form16Employer || "–"}</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    {hasEmployerMismatch ? (
                      <span style={{ color: "#d97706", fontWeight: "800" }}>⚠️ Mismatch</span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: "800" }}>✓ Match</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>
                    TDS on Salary (u/s 192)
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "normal" }}>Compared against Form 26AS / AIS tax credit</div>
                  </td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>
                    {systemTds > 0 ? fmt(systemTds) : <span style={{ color: "#94a3b8" }}>–</span>}
                  </td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(form16Tds)}</td>
                  <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                    {systemTds === 0 ? (
                      <span style={{ color: "#64748b", fontWeight: "700" }}>ℹ️ Form 16 Credit</span>
                    ) : hasTdsMismatch ? (
                      <span style={{ color: "#d97706", fontWeight: "800" }}>⚠️ Diff ({fmt(Math.abs(tdsDiff))})</span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: "800" }}>✓ 26AS Match</span>
                    )}
                  </td>
                </tr>
                {parsed.sec80c > 0 && (
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>
                      Sec 80C Deductions (PPF/EPF/ELSS/LIC)
                    </td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmt(deductionData.sec80c || 0)}</td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(parsed.sec80c)}</td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Extracted</span>
                    </td>
                  </tr>
                )}
                {parsed.sec80d > 0 && (
                  <tr>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", fontWeight: "600" }}>
                      Sec 80D Health Insurance
                    </td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmt(deductionData.sec80d || 0)}</td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmt(parsed.sec80d)}</td>
                    <td style={{ padding: "12px 14px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Extracted</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(hasSalaryMismatch || hasEmployerMismatch || hasTdsMismatch) && (
            <div
              style={{
                marginTop: "16px",
                background: "#fffbeb",
                border: "1.5px solid #fcd34d",
                borderRadius: "12px",
                padding: "14px 18px",
              }}
            >
              <div style={{ fontWeight: "800", color: "#92400e", marginBottom: "4px" }}>Reconciliation Notes</div>
              <div style={{ fontSize: "13px", color: "#b45309" }}>
                {hasSalaryMismatch && (
                  <div>
                    • Gross Salary difference: <strong>{fmt(Math.abs(salaryDiff))}</strong>
                    {salaryDiff > 0 ? " higher in Form 16" : " higher in system data"}
                  </div>
                )}
                {hasEmployerMismatch && <div>• Employer name differs slightly between records.</div>}
                {hasTdsMismatch && (
                  <div>
                    • TDS difference: <strong>{fmt(Math.abs(tdsDiff))}</strong> between Form 16 ({fmt(form16Tds)}) and Form 26AS credit ({fmt(systemTds)}).
                  </div>
                )}
                <div style={{ marginTop: "8px", fontWeight: "700", color: "#78350f" }}>
                  👉 Click <strong>“Accept Form 16 Values & Continue”</strong> to auto-fill your return with verified employer figures.
                </div>
              </div>
            </div>
          )}

          {!hasSalaryMismatch && !hasEmployerMismatch && !hasTdsMismatch && (
            <div
              style={{
                marginTop: "16px",
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "12px",
                padding: "14px 18px",
                color: "#166534",
                fontWeight: "700",
              }}
            >
              ✓ All key Salary and TDS fields match your tax records seamlessly. You can safely continue.
            </div>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {!form16File && (
        <div
          style={{
            background: "#f8fafc",
            border: "1.5px dashed #cbd5e1",
            borderRadius: "14px",
            padding: "28px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>📂</div>
          <div style={{ fontWeight: "800", fontSize: "15px", color: "#334155" }}>
            No Form 16 uploaded yet
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px", maxWidth: "480px", margin: "6px auto 0" }}>
            Upload your Form 16 to auto-fill Gross Salary, TDS, Employer name and Chapter VI-A deductions.
            You can also skip and enter everything manually in the next steps.
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
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
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            {isParsed ? (
              <span style={{ color: "#16a34a", fontWeight: "700" }}>
                ✓ Form 16 ready · {fmt(form16Salary)} salary extracted
              </span>
            ) : (
              "Upload Form 16 or skip to continue manually"
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {onBack && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={onBack}
                style={{ fontWeight: "700", borderRadius: "10px", padding: "10px 18px" }}
              >
                ← Back to Income
              </CButton>
            )}

            {isParsed ? (
              <CButton
                color="primary"
                onClick={handleAcceptForm16}
                disabled={accepting}
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
                {accepting ? (
                  <>
                    <CSpinner size="sm" className="me-2" /> Applying…
                  </>
                ) : (
                  "Accept Form 16 Values & Continue →"
                )}
              </CButton>
            ) : (
              <CButton
                color="primary"
                onClick={onContinue}
                style={{
                  background: "#142B46",
                  border: "none",
                  fontWeight: "900",
                  borderRadius: "10px",
                  padding: "12px 28px",
                  fontSize: "14px",
                  color: "#ffffff",
                }}
              >
                Skip & Continue Manually →
              </CButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}