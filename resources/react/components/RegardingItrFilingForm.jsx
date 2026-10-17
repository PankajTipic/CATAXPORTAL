import React, { useState } from "react";
import { CRow, CCol, CAlert, CSpinner, CBadge } from "@coreui/react";
import api from "../api/client";

/**
 * Multi-Step Form: “Get Regarding ITR Filing Information”
 * Supports all taxpayer types:
 * 1. Individual (Salaried, Pension, Capital Gains)
 * 2. Business & Profession (Proprietorship, 44AD/44ADA Presumptive, Freelancer, Partnership)
 * 3. Other Applicable Categories (HUF, NRI / Foreign Income, High Volume F&O Trader, Trust)
 */
export default function RegardingItrFilingForm({
  caseData,
  user,
  onComplete,
  onCancel,
}) {
  const existingDetails = caseData?.details || {};
  const existingFilingInfo = existingDetails.filing_info || {};
  const initialCategory =
    existingDetails.taxpayer_category ||
    caseData?.service_type === "business_profession" ||
    caseData?.service_type === "Business & profession"
      ? "business"
      : "individual";

  // Stepper active step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Category
  const [taxpayerCategory, setTaxpayerCategory] = useState(initialCategory);

  // Step 1: Personal & Profile
  const [profileData, setProfileData] = useState({
    fullName: user?.name || existingDetails.contact_name || "",
    pan: caseData?.details?.pan || user?.pan || "",
    mobile: existingDetails.contact_phone || user?.phone || "",
    email: existingDetails.contact_email || user?.email || "",
    dob: existingFilingInfo.dob || "",
    aadhaarNumber: existingFilingInfo.aadhaarNumber || "",
    residentialStatus: existingFilingInfo.residentialStatus || "Resident",
  });

  // Step 2: Income Details by Category
  // 2.a Individual
  const [individualIncome, setIndividualIncome] = useState({
    employerName: existingFilingInfo.individual?.employerName || "",
    grossSalary: existingFilingInfo.individual?.grossSalary || "1250000",
    exemptAllowances: existingFilingInfo.individual?.exemptAllowances || "120000",
    professionalTax: existingFilingInfo.individual?.professionalTax || "2500",
    housePropertyType: existingFilingInfo.individual?.housePropertyType || "Self-Occupied",
    homeLoanInterest: existingFilingInfo.individual?.homeLoanInterest || "0",
    annualRentReceived: existingFilingInfo.individual?.annualRentReceived || "0",
    savingsInterest: existingFilingInfo.individual?.savingsInterest || "25000",
    fdInterest: existingFilingInfo.individual?.fdInterest || "17700",
    dividendIncome: existingFilingInfo.individual?.dividendIncome || "8400",
    otherIncome: existingFilingInfo.individual?.otherIncome || "720",
    stcgShares: existingFilingInfo.individual?.stcgShares || "0",
    ltcgShares: existingFilingInfo.individual?.ltcgShares || "0",
    cryptoGains: existingFilingInfo.individual?.cryptoGains || "0",
  });

  // 2.b Business & Profession
  const [businessIncome, setBusinessIncome] = useState({
    businessName: existingFilingInfo.business?.businessName || "",
    tradeName: existingFilingInfo.business?.tradeName || "",
    businessNature: existingFilingInfo.business?.businessNature || "IT Consulting & Freelance",
    businessCode: existingFilingInfo.business?.businessCode || "09005",
    taxationScheme: existingFilingInfo.business?.taxationScheme || "44ada", // 44ad, 44ada, books
    grossTurnover: existingFilingInfo.business?.grossTurnover || "1800000",
    digitalTurnover: existingFilingInfo.business?.digitalTurnover || "1800000",
    cashTurnover: existingFilingInfo.business?.cashTurnover || "0",
    netProfit: existingFilingInfo.business?.netProfit || "900000",
    gstin: existingFilingInfo.business?.gstin || "",
    totalExpenses: existingFilingInfo.business?.totalExpenses || "0",
  });

  // 2.c Other (HUF, NRI, F&O)
  const [otherIncome, setOtherIncome] = useState({
    subCategory: existingFilingInfo.other?.subCategory || "nri", // nri, huf, fno, trust
    kartaName: existingFilingInfo.other?.kartaName || "",
    kartaPan: existingFilingInfo.other?.kartaPan || "",
    countryOfResidence: existingFilingInfo.other?.countryOfResidence || "United Arab Emirates",
    nroInterest: existingFilingInfo.other?.nroInterest || "45000",
    foreignIncome: existingFilingInfo.other?.foreignIncome || "0",
    dtaaReliefClaim: existingFilingInfo.other?.dtaaReliefClaim || "no",
    fnoTurnover: existingFilingInfo.other?.fnoTurnover || "0",
    fnoProfitLoss: existingFilingInfo.other?.fnoProfitLoss || "0",
  });

  // Step 3: Chapter VI-A Deductions
  const [deductions, setDeductions] = useState({
    sec80c: existingFilingInfo.deductions?.sec80c || "150000",
    sec80dSelf: existingFilingInfo.deductions?.sec80dSelf || "25000",
    sec80dParents: existingFilingInfo.deductions?.sec80dParents || "0",
    sec80ccd1b: existingFilingInfo.deductions?.sec80ccd1b || "50000",
    sec80ccd2: existingFilingInfo.deductions?.sec80ccd2 || "50000",
    sec80g: existingFilingInfo.deductions?.sec80g || "0",
    sec80tta: existingFilingInfo.deductions?.sec80tta || "10000",
  });

  // Step 4: Bank Details for Refund & Consent
  const [bankDetails, setBankDetails] = useState({
    bankName: existingDetails.bank_details?.bank_name || "HDFC Bank Ltd",
    accountNumber: existingDetails.bank_details?.account_number || "",
    confirmAccountNumber: existingDetails.bank_details?.account_number || "",
    ifsc: existingDetails.bank_details?.ifsc || "",
    accountType: existingDetails.bank_details?.account_type || "Savings",
  });

  const [aisConsent, setAisConsent] = useState(
    existingDetails.ais_consent?.authorized ?? true
  );

  // Step 5: Document Uploads & Special Instructions
  const [instructions, setInstructions] = useState(
    existingDetails.instructions || caseData?.notes || ""
  );
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [formAlert, setFormAlert] = useState({ type: "", text: "" });

  const stepsList = [
    { num: 1, label: "Profile & Category", icon: "👤" },
    { num: 2, label: "Income & Turnover", icon: "💰" },
    { num: 3, label: "Deductions & 80C", icon: "🧾" },
    { num: 4, label: "Bank & Digital Consent", icon: "🏦" },
    { num: 5, label: "Docs & Final Submit", icon: "📁" },
  ];

  const handleFileChange = (e) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      if (!bankDetails.accountNumber || !bankDetails.ifsc) {
        alert("Please provide bank account number and IFSC code for your Income Tax refund.");
        return;
      }
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
        alert("Bank account number and confirmation account number do not match.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    setUploadProgress(true);
    setFormAlert({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("taxpayer_category", taxpayerCategory);
      formData.append("instructions", instructions);
      formData.append("bank_name", bankDetails.bankName);
      formData.append("account_number", bankDetails.accountNumber);
      formData.append("ifsc", bankDetails.ifsc);
      formData.append("account_type", bankDetails.accountType);
      formData.append("ais_consent", aisConsent ? "1" : "0");

      const compiledFilingInfo = {
        category: taxpayerCategory,
        profile: profileData,
        individual: taxpayerCategory === "individual" ? individualIncome : null,
        business: taxpayerCategory === "business" ? businessIncome : null,
        other: taxpayerCategory === "other" ? otherIncome : null,
        deductions,
        bank: bankDetails,
        instructions,
        submitted_at: new Date().toISOString(),
      };
      formData.append("filing_info", JSON.stringify(compiledFilingInfo));

      // Append documents
      uploadedFiles.forEach((file) => {
        formData.append("documents[]", file);
        formData.append("doc_keys[]", "customer_upload");
      });

      const { data } = await api.post(
        `/agent-requests/${caseData.id}/onboarding`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setFormAlert({
        type: "success",
        text: "✅ ITR Filing Information and supporting documents successfully submitted to your CA specialist!",
      });

      if (onComplete) {
        setTimeout(() => {
          onComplete(data.data);
        }, 900);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      setFormAlert({
        type: "danger",
        text: err.response?.data?.message || "Failed to submit ITR filing information. Please try again.",
      });
    } finally {
      setUploadProgress(false);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1.5px solid #e2e8f0",
        padding: "28px 32px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            ✦ Mandatory Pre-Filing Intake Form
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#0f172a",
              margin: "3px 0 0",
            }}
          >
            Get Regarding ITR Filing Information
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Provide your financial details &amp; upload supporting files so your assigned CA can optimize deductions and prepare your return.
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Cancel / Close
          </button>
        )}
      </div>

      {formAlert.text && (
        <CAlert
          color={formAlert.type}
          className="fw-bold mb-4"
          dismissible
          onClose={() => setFormAlert({ type: "", text: "" })}
        >
          {formAlert.text}
        </CAlert>
      )}

      {/* Stepper Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "28px",
          background: "#f8fafc",
          padding: "10px 14px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          overflowX: "auto",
        }}
      >
        {stepsList.map((s, idx) => {
          const isActive = s.num === currentStep;
          const isDone = s.num < currentStep;
          return (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <div
                  style={{
                    width: "20px",
                    height: "2px",
                    background: isDone ? "#10b981" : "#cbd5e1",
                    flexShrink: 0,
                  }}
                />
              )}
              <div
                onClick={() => setCurrentStep(s.num)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: isActive
                    ? "linear-gradient(135deg,#1d4ed8,#2563eb)"
                    : isDone
                    ? "rgba(16,185,129,0.1)"
                    : "transparent",
                  color: isActive ? "#ffffff" : isDone ? "#065f46" : "#64748b",
                  fontWeight: isActive ? "800" : "600",
                  fontSize: "12.5px",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{isDone ? "✓" : s.icon}</span>
                <span>
                  Step {s.num}: {s.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmitAll}>
        {/* ══════════════════════════════════════════════════════════
            STEP 1: TAXPAYER CATEGORY & PROFILE
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div>
            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#1e293b",
                  marginBottom: "10px",
                  display: "block",
                }}
              >
                Select Your Taxpayer Category:
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  {
                    id: "individual",
                    icon: "👤",
                    title: "Individual",
                    sub: "Salaried employee, pensioner, rental income, or capital gains.",
                    formRec: "Applicable Form: ITR-1 / ITR-2",
                  },
                  {
                    id: "business",
                    icon: "💼",
                    title: "Business & Profession",
                    sub: "Proprietorship, freelance professional, 44AD/44ADA presumptive.",
                    formRec: "Applicable Form: ITR-3 / ITR-4",
                  },
                  {
                    id: "other",
                    icon: "🏛️",
                    title: "Other Categories",
                    sub: "Hindu Undivided Family (HUF), NRI foreign income, F&O trader, Trust.",
                    formRec: "Applicable Form: ITR-2 / ITR-3 / ITR-5",
                  },
                ].map((cat) => {
                  const isSel = taxpayerCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setTaxpayerCategory(cat.id)}
                      style={{
                        border: isSel ? "2px solid #1d4ed8" : "1.5px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "16px",
                        cursor: "pointer",
                        background: isSel ? "#eff6ff" : "#ffffff",
                        boxShadow: isSel ? "0 4px 12px rgba(29,78,216,0.12)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                        <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a" }}>
                          {cat.title}
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                        {cat.sub}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: isSel ? "#1d4ed8" : "#94a3b8",
                          marginTop: "8px",
                        }}
                      >
                        {cat.formRec}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#0f172a",
                  marginBottom: "14px",
                }}
              >
                Taxpayer Identity &amp; Contact Verification
              </div>
              <CRow className="g-3">
                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Full Legal Name (as per PAN):
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileData.fullName}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, fullName: e.target.value }))
                    }
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Permanent Account Number (PAN):
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileData.pan}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, pan: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Primary Mobile Number (for OTP):
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profileData.mobile}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, mobile: e.target.value }))
                    }
                    placeholder="10-digit mobile"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Email Address:
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="e.g. client@example.com"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Residential Status in India (AY 2026-27):
                  </label>
                  <select
                    className="form-select"
                    value={profileData.residentialStatus}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, residentialStatus: e.target.value }))
                    }
                  >
                    <option value="Resident">Resident &amp; Ordinarily Resident (ROR)</option>
                    <option value="RNOR">Resident but Not Ordinarily Resident (RNOR)</option>
                    <option value="Non-Resident">Non-Resident Indian (NRI)</option>
                  </select>
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Aadhaar Number / Enrollment ID (Optional):
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileData.aadhaarNumber}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, aadhaarNumber: e.target.value }))
                    }
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                  />
                </CCol>
              </CRow>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 2: INCOME DETAILS & FINANCIALS (Category-Tailored)
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div>
            {taxpayerCategory === "individual" && (
              <div>
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    color: "#166534",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  💼 Category: Individual (Salaried &amp; Other Personal Income)
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", marginBottom: "12px" }}>
                    1. Salary &amp; Allowance Information (from Form 16)
                  </div>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Employer Name:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={individualIncome.employerName}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, employerName: e.target.value }))
                        }
                        placeholder="e.g. Infosys Ltd / TCS"
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Gross Salary (₹ per annum u/s 17(1)):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.grossSalary}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, grossSalary: e.target.value }))
                        }
                        placeholder="e.g. 1250000"
                        required
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Exempt Allowances (HRA u/s 10(13A), LTA, etc.):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.exemptAllowances}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, exemptAllowances: e.target.value }))
                        }
                        placeholder="e.g. 120000"
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Professional Tax Paid:
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.professionalTax}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, professionalTax: e.target.value }))
                        }
                        placeholder="e.g. 2500"
                      />
                    </CCol>
                  </CRow>
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", marginBottom: "12px" }}>
                    2. House Property &amp; Other Income Streams
                  </div>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        House Property Type:
                      </label>
                      <select
                        className="form-select"
                        value={individualIncome.housePropertyType}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, housePropertyType: e.target.value }))
                        }
                      >
                        <option value="Self-Occupied">Self-Occupied House</option>
                        <option value="Let-Out">Let-Out / Rented Out</option>
                        <option value="Deemed-Let-Out">Deemed Let-Out</option>
                        <option value="None">None</option>
                      </select>
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Home Loan Interest Certificate u/s 24(b) (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.homeLoanInterest}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, homeLoanInterest: e.target.value }))
                        }
                        placeholder="Max ₹2,00,000 for Old Regime"
                      />
                    </CCol>

                    <CCol md={4}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Savings Bank Interest (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.savingsInterest}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, savingsInterest: e.target.value }))
                        }
                        placeholder="e.g. 25000"
                      />
                    </CCol>

                    <CCol md={4}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Fixed Deposit / RD Interest (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.fdInterest}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, fdInterest: e.target.value }))
                        }
                        placeholder="e.g. 17700"
                      />
                    </CCol>

                    <CCol md={4}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Dividend Income (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={individualIncome.dividendIncome}
                        onChange={(e) =>
                          setIndividualIncome((p) => ({ ...p, dividendIncome: e.target.value }))
                        }
                        placeholder="e.g. 8400"
                      />
                    </CCol>
                  </CRow>
                </div>
              </div>
            )}

            {taxpayerCategory === "business" && (
              <div>
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    color: "#1e40af",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  💼 Category: Business &amp; Profession (Proprietorship, 44AD/44ADA Presumptive, Freelance)
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontWeight: "800", fontSize: "14px", color: "#0f172a", marginBottom: "12px" }}>
                    Business Details &amp; Tax Scheme
                  </div>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Business / Trade Name:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessIncome.businessName}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, businessName: e.target.value }))
                        }
                        placeholder="e.g. Apex Tech Solutions"
                        required
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Nature of Business / Profession:
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessIncome.businessNature}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, businessNature: e.target.value }))
                        }
                        placeholder="e.g. Software Consultant, Architecture, Retailer"
                        required
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Taxation Scheme:
                      </label>
                      <select
                        className="form-select"
                        value={businessIncome.taxationScheme}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, taxationScheme: e.target.value }))
                        }
                      >
                        <option value="44ada">Section 44ADA (Presumptive for Professionals - 50% min profit)</option>
                        <option value="44ad">Section 44AD (Presumptive for Small Businesses - 6%/8% min profit)</option>
                        <option value="books">Regular Books of Accounts (P&amp;L and Balance Sheet)</option>
                      </select>
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        GSTIN (if registered):
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={businessIncome.gstin}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))
                        }
                        placeholder="15-digit GSTIN (optional)"
                        maxLength={15}
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Gross Turnover / Total Receipts (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={businessIncome.grossTurnover}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, grossTurnover: e.target.value }))
                        }
                        placeholder="e.g. 1800000"
                        required
                      />
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Declared Net Profit / Presumptive Income (₹):
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={businessIncome.netProfit}
                        onChange={(e) =>
                          setBusinessIncome((p) => ({ ...p, netProfit: e.target.value }))
                        }
                        placeholder="e.g. 900000"
                        required
                      />
                    </CCol>
                  </CRow>
                </div>
              </div>
            )}

            {taxpayerCategory === "other" && (
              <div>
                <div
                  style={{
                    background: "#ede9fe",
                    border: "1px solid #c4b5fd",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    color: "#5b21b6",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  🏛️ Category: Other Applicable Categories (HUF, NRI Foreign Income, High Volume F&amp;O)
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "16px",
                  }}
                >
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        Specific Sub-Category:
                      </label>
                      <select
                        className="form-select"
                        value={otherIncome.subCategory}
                        onChange={(e) =>
                          setOtherIncome((p) => ({ ...p, subCategory: e.target.value }))
                        }
                      >
                        <option value="nri">Non-Resident Indian (NRI) with Foreign Income / DTAA</option>
                        <option value="huf">Hindu Undivided Family (HUF)</option>
                        <option value="fno">Futures &amp; Options (F&amp;O) / High-Volume Trading</option>
                      </select>
                    </CCol>

                    {otherIncome.subCategory === "nri" && (
                      <>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Country of Tax Residence:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={otherIncome.countryOfResidence}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, countryOfResidence: e.target.value }))
                            }
                            placeholder="e.g. United Arab Emirates, USA, UK"
                          />
                        </CCol>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Indian NRO Account Interest (₹):
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={otherIncome.nroInterest}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, nroInterest: e.target.value }))
                            }
                            placeholder="e.g. 45000"
                          />
                        </CCol>
                      </>
                    )}

                    {otherIncome.subCategory === "huf" && (
                      <>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Karta Full Name:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={otherIncome.kartaName}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, kartaName: e.target.value }))
                            }
                            placeholder="Karta of HUF"
                          />
                        </CCol>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Karta Personal PAN:
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={otherIncome.kartaPan}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, kartaPan: e.target.value.toUpperCase() }))
                            }
                            placeholder="Karta PAN"
                          />
                        </CCol>
                      </>
                    )}

                    {otherIncome.subCategory === "fno" && (
                      <>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Total F&amp;O Turnover (Absolute sum of profits &amp; losses):
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={otherIncome.fnoTurnover}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, fnoTurnover: e.target.value }))
                            }
                            placeholder="e.g. 4500000"
                          />
                        </CCol>
                        <CCol md={6}>
                          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                            Net Trading Realized Profit / (Loss) (₹):
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={otherIncome.fnoProfitLoss}
                            onChange={(e) =>
                              setOtherIncome((p) => ({ ...p, fnoProfitLoss: e.target.value }))
                            }
                            placeholder="e.g. 210000"
                          />
                        </CCol>
                      </>
                    )}
                  </CRow>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 3: CHAPTER VI-A DEDUCTIONS & STATUTORY EXEMPTIONS
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div>
            <div
              style={{
                background: "#fdf2f8",
                border: "1px solid #fbcfe8",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "16px",
                color: "#9d174d",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              🧾 Claim Chapter VI-A Tax Saving Deductions (Applicable for Old Tax Regime &amp; 80CCD(2) for New Regime)
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "18px",
                marginBottom: "16px",
              }}
            >
              <CRow className="g-3">
                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80C (PPF, EPF, ELSS, Life Insurance, Tuition Fees) — Max ₹1,50,000:
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80c}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80c: e.target.value }))}
                    placeholder="e.g. 150000"
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80D (Health Insurance Premium - Self &amp; Family):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80dSelf}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80dSelf: e.target.value }))}
                    placeholder="Max ₹25,000 (or ₹50,000 for seniors)"
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80CCD(1B) (Additional NPS Self Contribution) — Max ₹50,000:
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80ccd1b}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80ccd1b: e.target.value }))}
                    placeholder="e.g. 50000"
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80CCD(2) (Employer NPS Contribution — Eligible in BOTH Regimes!):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80ccd2}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80ccd2: e.target.value }))}
                    placeholder="e.g. 50000"
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80G (Eligible Donations with 80G receipts):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80g}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80g: e.target.value }))}
                    placeholder="e.g. 10000"
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Section 80TTA / 80TTB (Savings Account Interest Exemption):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={deductions.sec80tta}
                    onChange={(e) => setDeductions((p) => ({ ...p, sec80tta: e.target.value }))}
                    placeholder="Max ₹10,000 (₹50,000 for seniors u/s 80TTB)"
                  />
                </CCol>
              </CRow>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 4: BANK DETAILS FOR REFUND & DIGITAL CONSENT
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>
                🏦 Bank Account for Direct Credit of Income Tax Refund
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                Ensure your bank account is pre-validated and linked with your PAN on the Income Tax Department portal.
              </p>

              <CRow className="g-3">
                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Bank Name:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails((p) => ({ ...p, bankName: e.target.value }))}
                    placeholder="e.g. HDFC Bank Ltd / State Bank of India"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Account Type:
                  </label>
                  <select
                    className="form-select"
                    value={bankDetails.accountType}
                    onChange={(e) => setBankDetails((p) => ({ ...p, accountType: e.target.value }))}
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Current">Current Account</option>
                    <option value="NRO">NRO Account</option>
                    <option value="NRE">NRE Account</option>
                  </select>
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Bank Account Number:
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="Enter account number"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Confirm Bank Account Number:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={bankDetails.confirmAccountNumber}
                    onChange={(e) => setBankDetails((p) => ({ ...p, confirmAccountNumber: e.target.value }))}
                    placeholder="Re-enter account number"
                    required
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                    Bank IFSC Code:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={bankDetails.ifsc}
                    onChange={(e) => setBankDetails((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                    placeholder="e.g. HDFC0000128"
                    maxLength={11}
                    required
                  />
                </CCol>
              </CRow>
            </div>

            {/* AIS / 26AS Digital Consent */}
            <div
              style={{
                border: "1.5px solid #a7f3d0",
                background: "#f0fdf4",
                borderRadius: "10px",
                padding: "16px 20px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={aisConsent}
                  onChange={(e) => setAisConsent(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "3px" }}
                />
                <div>
                  <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#166534" }}>
                    Authorise AIS, TIS &amp; Form 26AS Automated Reconciliation Consent
                  </div>
                  <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px", lineHeight: "1.4" }}>
                    I hereby authorise TIQTAX Chartered Accountants to fetch and cross-reference my Annual Information Statement (AIS) and Form 26AS tax credits via secure Income Tax Department gateway solely for preparing my AY 2026-27 return.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 5: SUPPORTING DOCUMENTS & FINAL SUBMIT
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div>
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>
                📁 Upload Supporting Tax Documents
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                Upload your Form 16, bank statements, investment proofs, or business balance sheets (PDF, JPG, PNG up to 20MB each).
              </p>

              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  padding: "18px",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  marginBottom: "14px",
                }}
              />

              {uploadedFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                    {uploadedFiles.length} file(s) ready to upload:
                  </div>
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "#0f172a",
                        background: "#f1f5f9",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>📄 {f.name}</span>
                      <span style={{ color: "#64748b" }}>
                        {(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151", marginBottom: "6px", display: "block" }}>
                Special Notes / Instructions for your Assigned CA:
              </label>
              <textarea
                rows={3}
                className="form-control"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Switched jobs in October, please verify TDS credit from both employers. Also claim HRA with rent receipts attached."
              />
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "16px",
          }}
        >
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              ← Previous Step
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg,#1d4ed8,#2563eb)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(29,78,216,0.25)",
              }}
            >
              Continue to Step {currentStep + 1} →
            </button>
          ) : (
            <button
              type="submit"
              disabled={uploadProgress}
              style={{
                background: "linear-gradient(135deg,#15803d,#16a34a)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "14px",
                fontWeight: "800",
                cursor: uploadProgress ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
              }}
            >
              {uploadProgress ? "Submitting Information to CA..." : "Submit All ITR Information to CA ✓"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
