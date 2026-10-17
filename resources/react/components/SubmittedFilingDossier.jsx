import React from "react";
import { CRow, CCol, CBadge } from "@coreui/react";

/**
 * Displays the customer's submitted ITR Filing Information & Documents Dossier.
 * Reusable for both Customer Portal (HireAgent.jsx) and CA Portal (ClientDetails.jsx).
 */
export default function SubmittedFilingDossier({
  caseData,
  onReopenForm,
  isCAView = false,
}) {
  const details = caseData?.details || {};
  const filingInfo = details.filing_info || {};
  const category = details.taxpayer_category || filingInfo.category || "individual";
  const bank = details.bank_details || filingInfo.bank || {};
  const docs = details.customer_documents || [];
  const submittedAt = details.onboarding_submitted_at
    ? new Date(details.onboarding_submitted_at).toLocaleString("en-IN")
    : "Submitted";

  const fmt = (v) => {
    const n = Number(v);
    return isNaN(n) ? "₹0" : `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: "1.5px solid #e2e8f0",
        padding: "24px 28px",
        marginBottom: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              📄 Submitted ITR Filing Information &amp; Supporting Documents
            </h3>
            <span
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "700",
                border: "1px solid #86efac",
              }}
            >
              ✓ Information Received by CA
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
            Intake record logged on <strong>{submittedAt}</strong> · AY {caseData?.assessment_year || "2026-27"}
          </div>
        </div>

        {onReopenForm && !isCAView && (
          <button
            onClick={onReopenForm}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#1e293b",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ✏️ Update / Edit Submitted Info
          </button>
        )}
      </div>

      {/* Grid: 3 Pillars */}
      <CRow className="g-3 mb-4">
        {/* Pillar 1: Profile & Category */}
        <CCol md={4}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Taxpayer Category
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
              {category === "individual"
                ? "👤 Individual (Salaried & Personal)"
                : category === "business"
                ? "💼 Business & Profession (44AD/44ADA)"
                : "🏛️ Other Categories (HUF / NRI / F&O)"}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "8px", lineHeight: "1.5" }}>
              <div><strong>PAN:</strong> {details.pan || caseData?.user?.pan || "N/A"}</div>
              <div><strong>Contact:</strong> {details.contact_phone || caseData?.user?.phone || "N/A"}</div>
              <div><strong>Email:</strong> {details.contact_email || caseData?.user?.email || "N/A"}</div>
            </div>
          </div>
        </CCol>

        {/* Pillar 2: Income & Financials Summary */}
        <CCol md={4}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Reported Income Figures
            </div>

            {category === "individual" ? (
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", lineHeight: "1.6" }}>
                <div>Gross Salary: <strong>{fmt(filingInfo.individual?.grossSalary || details.prepared_computation?.grossSalary || 1250000)}</strong></div>
                <div>Exempt Allowances: <strong>{fmt(filingInfo.individual?.exemptAllowances || 120000)}</strong></div>
                <div>Savings / FD Interest: <strong>{fmt(Number(filingInfo.individual?.savingsInterest || 25000) + Number(filingInfo.individual?.fdInterest || 17700))}</strong></div>
                <div>Chapter VI-A Deductions: <strong>{fmt(filingInfo.deductions?.sec80c || 150000)}</strong></div>
              </div>
            ) : category === "business" ? (
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", lineHeight: "1.6" }}>
                <div>Business Name: <strong>{filingInfo.business?.businessName || "Proprietorship"}</strong></div>
                <div>Scheme: <strong>{filingInfo.business?.taxationScheme?.toUpperCase() || "44ADA"}</strong></div>
                <div>Gross Turnover: <strong>{fmt(filingInfo.business?.grossTurnover || 1800000)}</strong></div>
                <div>Declared Profit: <strong>{fmt(filingInfo.business?.netProfit || 900000)}</strong></div>
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", lineHeight: "1.6" }}>
                <div>Sub-Category: <strong>{filingInfo.other?.subCategory?.toUpperCase() || "NRI"}</strong></div>
                <div>Foreign / Speculative: <strong>{fmt(filingInfo.other?.foreignIncome || filingInfo.other?.fnoProfitLoss || 0)}</strong></div>
                <div>Indian Income: <strong>{fmt(filingInfo.other?.nroInterest || 45000)}</strong></div>
              </div>
            )}
          </div>
        </CCol>

        {/* Pillar 3: Bank Details & Consent */}
        <CCol md={4}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "16px",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              IT Refund Bank Account
            </div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>
              {bank.bank_name || "HDFC Bank Ltd"}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              Acc: <strong>{bank.account_number ? `••••${String(bank.account_number).slice(-4)}` : "Provided"}</strong> · IFSC: <strong>{bank.ifsc || "HDFC0000128"}</strong>
            </div>
            <div style={{ marginTop: "8px" }}>
              {details.ais_consent?.authorized ? (
                <span style={{ fontSize: "11px", color: "#166534", fontWeight: "700" }}>
                  ✓ AIS / Form 26AS Consent Granted
                </span>
              ) : (
                <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "700" }}>
                  ⏳ AIS Consent Pending
                </span>
              )}
            </div>
          </div>
        </CCol>
      </CRow>

      {/* Special Instructions if present */}
      {(details.instructions || filingInfo.instructions || caseData?.notes) && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "12.5px",
            color: "#92400e",
            marginBottom: "16px",
          }}
        >
          <strong>💬 Notes provided for CA:</strong> "
          {details.instructions || filingInfo.instructions || caseData?.notes}"
        </div>
      )}

      {/* Documents List */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
          Uploaded Supporting Documents ({docs.length}):
        </div>
        {docs.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
            No files attached yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
            {docs.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  background: "#fafafa",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis" }}>
                    📄 {doc.original_name || doc.name || `Document #${idx + 1}`}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {doc.size ? `${(Number(doc.size) / 1024).toFixed(0)} KB` : "Uploaded"}
                    {doc.status === "verified" && <span style={{ color: "#166534", marginLeft: "6px", fontWeight: "700" }}>✓ Verified</span>}
                  </div>
                </div>

                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#0b1f3a",
                      color: "#ffffff",
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "700",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
