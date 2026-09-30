import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormCheck,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from "@coreui/react";
import api from "../api/client";
import ITRegisterModal from "../components/ITRegisterModal";
import ContactUsModal from "../components/ContactUsModal";
import FlowSelectionModal from "../components/FlowSelectionModal";

export default function Login() {
  const navigate = useNavigate();

  // Active Login Mode: 'it_portal' | 'email'
  const [activeTab, setActiveTab] = useState("it_portal");

  // Income Tax Portal Form State
  const [itForm, setItForm] = useState({
    pan: "ABCDE1234F",
    password: "Test@1234",
    assessment_year: "2026-27",
  });

  // Standard Email Form State
  const [emailForm, setEmailForm] = useState({
    email: "",
    password: "",
  });

  const [selectedHeads, setSelectedHeads] = useState(["salary", "other_sources"]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notRegisteredPan, setNotRegisteredPan] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Consent & Agreement Modal State
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);

  // Choice Flow & Contact Modals
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const incomeHeads = [
    { key: "salary", label: "Salary / Pension", description: "Income from salary or pension" },
    { key: "house_property", label: "House Property", description: "Rental or house property income" },
    { key: "capital_gains", label: "Capital Gains", description: "Shares, mutual funds, property, etc." },
    { key: "business", label: "Business / Profession", description: "Business or professional income" },
    { key: "other_sources", label: "Other Sources", description: "Interest, dividend and other income" },
    { key: "foreign_income", label: "Foreign Income", description: "Foreign income or assets" },
  ];

  const handleItChange = (e) => {
    const { name, value } = e.target;
    setItForm((prev) => ({
      ...prev,
      [name]: name === "pan" ? value.toUpperCase() : value,
    }));
    if (name === "pan") {
      setNotRegisteredPan(null);
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleIncomeHead = (key) => {
    setSelectedHeads((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const getConsentedPans = () => {
    try {
      return JSON.parse(localStorage.getItem("consented_pans") || "[]");
    } catch {
      return [];
    }
  };

  const hasPanConsented = (pan) => {
    if (!pan) return false;
    const directConsent = localStorage.getItem(`ais_consent_${pan}`);
    const inList = getConsentedPans().includes(pan);
    return !!(directConsent || inList);
  };

  const getTargetPortal = (pan) => {
    if (!pan) return "/customer-portal";
    const preferredFlow = localStorage.getItem(`preferred_filing_flow_${pan}`);

    if (preferredFlow === "hire_ca" || preferredFlow === "agent") {
      return "/agent/hire";
    } else if (preferredFlow === "self") {
      return "/dashboard";
    }
    return "/customer-portal";
  };

  // Trigger agreement pop-up ONLY if new user; otherwise login directly
  const handleItSubmit = (e) => {
    e.preventDefault();
    setError("");
    setNotRegisteredPan(null);

    if (!itForm.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(itForm.pan)) {
      setError("Please enter a valid 10-character PAN number (e.g. ABCDE1234F).");
      return;
    }
    if (!itForm.password) {
      setError("Please enter your Income Tax e-filing portal password.");
      return;
    }

    // Check if consent has already been granted for this PAN
    if (hasPanConsented(itForm.pan)) {
      // Existing user who already consented: bypass modal and execute login directly
      executeLoginAndFetch(true);
    } else {
      // New user: Open Agreement Pop-up Modal to obtain initial authorization
      setAgreementChecked(false);
      setShowAgreementModal(true);
    }
  };

  // Execute Direct Income Tax Portal Login
  const executeLoginAndFetch = async (alreadyConsented = false) => {
    const isConsented = typeof alreadyConsented === "boolean" ? alreadyConsented : false;
    if (!isConsented && !agreementChecked) {
      alert("Please check the agreement confirmation box to grant consent.");
      return;
    }

    setSubmitting(true);
    setError("");

    // Save consent record locally for compliance so user is never asked again
    const consentRecord = {
      pan: itForm.pan,
      agreed: true,
      agreed_at: new Date().toISOString(),
      consent_type: "ITD_AIS_26AS_FETCH",
      terms: "Authorized portal & CA to fetch AIS, 26AS, and Form 16 data from Income Tax e-Filing Portal",
    };
    localStorage.setItem(`ais_consent_${itForm.pan}`, JSON.stringify(consentRecord));
    localStorage.setItem("latest_ais_consent", JSON.stringify(consentRecord));

    const consentedPans = getConsentedPans();
    if (!consentedPans.includes(itForm.pan)) {
      consentedPans.push(itForm.pan);
      localStorage.setItem("consented_pans", JSON.stringify(consentedPans));
    }

    try {
      const { data } = await api.post("/itr/login-fetch", {
        pan: itForm.pan,
        password: itForm.password,
        assessment_year: itForm.assessment_year,
        consent_granted: true,
      });

      // Save token and tax details
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("user_pan", itForm.pan);
      localStorage.setItem("tax_data", JSON.stringify(data.tax_data));
      localStorage.setItem("assessment_year", data.assessment_year);

      setShowAgreementModal(false);

      // Navigate to preferred flow (taken only once) or customer-portal if first time
      navigate(getTargetPortal(itForm.pan));
    } catch (err) {
      setShowAgreementModal(false);
      if (err.response?.status === 404 && err.response?.data?.status === "not_registered") {
        setNotRegisteredPan(itForm.pan);
        setError(
          `PAN ${itForm.pan} is not registered on the Income Tax portal. You can register your account directly from our portal below.`
        );
      } else {
        setError(
          err.response?.data?.message || "Income Tax Portal authentication failed. Please check your credentials."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Regular Email / Portal Login
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!emailForm.email) {
      setError("Please enter your email.");
      return;
    }
    if (!emailForm.password) {
      setError("Please enter your password.");
      return;
    }
    if (selectedHeads.length === 0) {
      setError("Please select at least one Head of Income.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", {
        email: emailForm.email,
        password: emailForm.password,
      });

      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const userPan = data.user?.pan;
      if (userPan) {
        localStorage.setItem("user_pan", userPan);
      }
      localStorage.setItem("selected_heads", JSON.stringify(selectedHeads));

      // Direct CA staff (Admin / Employee) to the CA Portal
      if (data.user?.role === "admin" || data.user?.role === "employee") {
        localStorage.setItem("is_ca_staff", "true");
        navigate("/ca-portal");
        return;
      }

      // Navigate to preferred flow (taken only once) or customer-portal if first time
      navigate(getTargetPortal(userPan));
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisteredSuccess = (regData, registeredPassword) => {
    const userPan = regData?.user?.pan || regData?.pan || itForm.pan;
    if (userPan) {
      localStorage.setItem("user_pan", userPan);
      setItForm((prev) => ({
        ...prev,
        pan: userPan,
        password: registeredPassword || prev.password,
      }));
      // Remove any prior preference for this new PAN so they always see the choice screen
      localStorage.removeItem(`preferred_filing_flow_${userPan}`);
    }
    localStorage.removeItem("preferred_filing_flow");

    // Close register modal
    setShowRegisterModal(false);

    // Show Agreement Modal for initial consent as requested
    setAgreementChecked(false);
    setShowAgreementModal(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb" }}>
      <CContainer fluid className="p-0">
        <CRow className="g-0" style={{ minHeight: "100vh" }}>
          {/* LEFT BRANDING SIDE */}
          <CCol
            lg={5}
            className="d-flex align-items-center"
            style={{
              background: "linear-gradient(135deg, #0b1f3a 0%, #123c69 100%)",
              color: "#ffffff",
            }}
          >
            <div style={{ width: "100%", maxWidth: "520px", margin: "auto", padding: "60px 40px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "16px",
                  background: "#ffffff",
                  color: "#123c69",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "900",
                  fontSize: "20px",
                  marginBottom: "28px",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                }}
              >
                ITR
              </div>

              <h1 style={{ fontWeight: "800", fontSize: "36px", lineHeight: "1.25", marginBottom: "18px" }}>
                CA-Grade ITR Portal & Tax Preparation
              </h1>

              <p style={{ fontSize: "16px", lineHeight: "1.7", opacity: 0.88, marginBottom: "32px" }}>
                Seamlessly prepare your Income Tax Return file just like a Chartered Accountant. Log in with your Income Tax credentials to auto-sync your AIS, Form 26AS, TDS credits, and Form 16.
              </p>

              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px", border: "1px solid rgba(255,255,255,0.12)" }}>
                {[
                  "Direct Income Tax Portal authentication (PAN & Password)",
                  "Automatic AIS, TDS & Form 26AS data synchronization",
                  "In-portal Income Tax registration for new taxpayers",
                  "Smart Old vs New tax regime optimization",
                  "One-click return submission with official Acknowledgement",
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", alignItems: "flex-start", marginBottom: index === 4 ? 0 : "14px", fontSize: "14px" }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "rgba(14, 165, 233, 0.25)",
                        color: "#38bdf8",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ opacity: 0.95 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </CCol>

          {/* RIGHT LOGIN CARD SIDE */}
          <CCol
            lg={7}
            className="d-flex align-items-center justify-content-center"
            style={{ padding: "40px 20px" }}
          >
            <CCard
              className="border-0 shadow-sm"
              style={{ width: "100%", maxWidth: "720px", borderRadius: "20px", overflow: "hidden" }}
            >
              {/* Header with Mode Switch */}
              <CCardHeader className="bg-white border-0" style={{ padding: "30px 36px 12px" }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#0b3d91",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      background: "#e0f2fe",
                      padding: "4px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    Customer Filing Gateway
                  </span>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                      AY 2026-27 (FY 2025-26)
                    </span>
                    <Link
                      to="/ca-login"
                      className="badge text-decoration-none"
                      style={{
                        background: "#0f172a",
                        color: "#38bdf8",
                        padding: "6px 10px",
                        fontSize: "11px",
                        fontWeight: "700",
                        borderRadius: "6px",
                      }}
                    >
                      🏛️ CA Staff Login →
                    </Link>
                  </div>
                </div>

                <h2 style={{ margin: "6px 0 0", fontWeight: "800", color: "#0f172a", fontSize: "24px" }}>
                  {activeTab === "it_portal"
                    ? "Connect Income Tax Account"
                    : "Login with Portal Account"}
                </h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "6px", marginBottom: "16px" }}>
                  {activeTab === "it_portal"
                    ? "Enter your PAN and Income Tax password to fetch all tax credits & AIS automatically."
                    : "Enter your registered email and password to access your tax dashboard."}
                </p>

                {/* Tab Navigation */}
                <CNav variant="pills" className="bg-light p-1 rounded-3">
                  <CNavItem style={{ flex: 1, textAlign: "center" }}>
                    <CNavLink
                      active={activeTab === "it_portal"}
                      onClick={() => {
                        setActiveTab("it_portal");
                        setError("");
                      }}
                      style={{
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "14px",
                        borderRadius: "8px",
                        padding: "10px",
                        background: activeTab === "it_portal" ? "#0b3d91" : "transparent",
                        color: activeTab === "it_portal" ? "#ffffff" : "#475569",
                        transition: "all 0.2s",
                      }}
                    >
                      ⚡ Income Tax Portal Login (Auto-Fetch)
                    </CNavLink>
                  </CNavItem>

                  <CNavItem style={{ flex: 1, textAlign: "center" }}>
                    <CNavLink
                      active={activeTab === "email"}
                      onClick={() => {
                        setActiveTab("email");
                        setError("");
                      }}
                      style={{
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "14px",
                        borderRadius: "8px",
                        padding: "10px",
                        background: activeTab === "email" ? "#0b3d91" : "transparent",
                        color: activeTab === "email" ? "#ffffff" : "#475569",
                        transition: "all 0.2s",
                      }}
                    >
                      📧 Email Login
                    </CNavLink>
                  </CNavItem>
                </CNav>
              </CCardHeader>

              <CCardBody style={{ padding: "20px 36px 36px" }}>
                {/* ERROR ALERT */}
                {error && (
                  <CAlert color={notRegisteredPan ? "warning" : "danger"} className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "20px" }}>{notRegisteredPan ? "⚠️" : "❌"}</span>
                    <div style={{ flex: 1, fontSize: "14px" }}>{error}</div>
                  </CAlert>
                )}

                {/* UNREGISTERED PAN CALLOUT */}
                {notRegisteredPan && (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1.5px dashed #f59e0b",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "20px",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <div style={{ fontWeight: "700", color: "#92400e", fontSize: "14px" }}>
                          Don't have an Income Tax e-filing account?
                        </div>
                        <div style={{ color: "#78350f", fontSize: "13px" }}>
                          No need to visit the govt portal. Register PAN <strong>{notRegisteredPan}</strong> right here in seconds.
                        </div>
                      </div>
                      <CButton
                        color="warning"
                        onClick={() => setShowRegisterModal(true)}
                        style={{
                          fontWeight: "700",
                          fontSize: "13px",
                          borderRadius: "8px",
                          background: "#f59e0b",
                          border: "none",
                          color: "#ffffff",
                        }}
                      >
                        Register on IT Portal Now
                      </CButton>
                    </div>
                  </div>
                )}

                {/* ─── TAB 1: DIRECT INCOME TAX PORTAL LOGIN ─── */}
                {activeTab === "it_portal" && (
                  <CForm onSubmit={handleItSubmit}>
                    {/* PAN NUMBER */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <label className="form-label fw-semibold" htmlFor="it_pan">
                          Income Tax PAN Number
                        </label>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Demo PAN: <code>ABCDE1234F</code>
                        </span>
                      </div>
                      <CInputGroup>
                        <CInputGroupText style={{ background: "#f8fafc", fontWeight: "700", color: "#0b3d91" }}>
                          PAN
                        </CInputGroupText>
                        <CFormInput
                          id="it_pan"
                          name="pan"
                          placeholder="e.g. ABCDE1234F"
                          maxLength={10}
                          value={itForm.pan}
                          onChange={handleItChange}
                          style={{
                            textTransform: "uppercase",
                            fontWeight: "700",
                            letterSpacing: "1.2px",
                            fontSize: "15px",
                          }}
                          autoComplete="off"
                        />
                      </CInputGroup>
                    </div>

                    {/* IT PORTAL PASSWORD */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <label className="form-label fw-semibold" htmlFor="it_password">
                          Income Tax Portal Password
                        </label>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Demo: Any 6+ characters
                        </span>
                      </div>
                      <CInputGroup>
                        <CInputGroupText style={{ background: "#f8fafc" }}>🔒</CInputGroupText>
                        <CFormInput
                          id="it_password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your Income Tax e-filing password"
                          value={itForm.password}
                          onChange={handleItChange}
                          autoComplete="current-password"
                        />
                        <CButton
                          type="button"
                          color="light"
                          onClick={() => setShowPassword((prev) => !prev)}
                          style={{ border: "1px solid #ced4da" }}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </CButton>
                      </CInputGroup>
                    </div>

                    {/* ASSESSMENT YEAR */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold" htmlFor="it_ay">
                        Filing Assessment Year
                      </label>
                      <select
                        id="it_ay"
                        name="assessment_year"
                        className="form-select"
                        value={itForm.assessment_year}
                        onChange={handleItChange}
                        style={{ fontWeight: "600" }}
                      >
                        <option value="2026-27">AY 2026-27 (Financial Year 2025-26) - Current</option>
                        <option value="2025-26">AY 2025-26 (Financial Year 2024-25)</option>
                      </select>
                    </div>

                    {/* INFORMATION CALLOUT */}
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        marginBottom: "24px",
                        fontSize: "13px",
                        color: "#166534",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong>🛡️ Automatic CA-Grade Data Sync</strong>
                      </div>
                      <div>
                        Once you submit, our system fetches your <strong>AIS</strong>, <strong>TDS Statement</strong>, <strong>Form 26AS</strong>, and <strong>Form 16</strong> instantly to prepare your tax calculation sheet.
                      </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <CButton
                      type="submit"
                      color="primary"
                      size="lg"
                      className="w-100"
                      disabled={submitting}
                      style={{
                        background: "linear-gradient(135deg, #0b3d91 0%, #1a5bb8 100%)",
                        border: "none",
                        fontWeight: "700",
                        padding: "14px",
                        borderRadius: "10px",
                        fontSize: "16px",
                        boxShadow: "0 4px 14px rgba(11,61,145,0.3)",
                      }}
                    >
                      {submitting ? (
                        <>
                          <CSpinner size="sm" className="me-2" /> Connecting & Syncing Tax Data...
                        </>
                      ) : (
                        "Connect & Fetch All Tax Data →"
                      )}
                    </CButton>
                  </CForm>
                )}

                {/* ─── TAB 2: REGULAR EMAIL LOGIN ─── */}
                {activeTab === "email" && (
                  <CForm onSubmit={handleEmailSubmit}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" htmlFor="email">
                        Email Address
                      </label>
                      <CInputGroup>
                        <CInputGroupText>📧</CInputGroupText>
                        <CFormInput
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          value={emailForm.email}
                          onChange={handleEmailChange}
                          autoComplete="email"
                        />
                      </CInputGroup>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold" htmlFor="password">
                        Password
                      </label>
                      <CInputGroup>
                        <CInputGroupText>🔒</CInputGroupText>
                        <CFormInput
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your account password"
                          value={emailForm.password}
                          onChange={handleEmailChange}
                          autoComplete="current-password"
                        />
                        <CButton
                          type="button"
                          color="light"
                          onClick={() => setShowPassword((prev) => !prev)}
                          style={{ border: "1px solid #ced4da" }}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </CButton>
                      </CInputGroup>
                    </div>

                    {/* HEADS OF INCOME */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e5e9ef",
                        borderRadius: "12px",
                        padding: "16px",
                        marginTop: "16px",
                        marginBottom: "20px",
                      }}
                    >
                      <div style={{ fontWeight: "700", color: "#172b4d", marginBottom: "4px", fontSize: "14px" }}>
                        Select Applicable Heads of Income
                      </div>
                      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "12px" }}>
                        Choose the income streams you want to report in this return.
                      </div>

                      <CRow>
                        {incomeHeads.map((head) => (
                          <CCol md={6} key={head.key} className="mb-2">
                            <div
                              style={{
                                background: "#ffffff",
                                border: selectedHeads.includes(head.key)
                                  ? "1.5px solid #0b3d91"
                                  : "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "10px",
                                cursor: "pointer",
                              }}
                              onClick={() => toggleIncomeHead(head.key)}
                            >
                              <CFormCheck
                                id={head.key}
                                label={
                                  <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "13px" }}>
                                    {head.label}
                                  </span>
                                }
                                checked={selectedHeads.includes(head.key)}
                                onChange={() => {}}
                              />
                            </div>
                          </CCol>
                        ))}
                      </CRow>
                    </div>

                    <CButton
                      type="submit"
                      color="primary"
                      size="lg"
                      className="w-100"
                      disabled={submitting}
                      style={{
                        background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                        border: "none",
                        fontWeight: "700",
                        padding: "14px",
                        borderRadius: "10px",
                        fontSize: "15px",
                      }}
                    >
                      {submitting ? (
                        <>
                          <CSpinner size="sm" className="me-2" /> Logging in...
                        </>
                      ) : (
                        "Login to Dashboard"
                      )}
                    </CButton>
                  </CForm>
                )}

                {/* BOTTOM REGISTRATION LINK */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: "26px",
                    paddingTop: "18px",
                    borderTop: "1px solid #e2e8f0",
                    fontSize: "14px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>Not registered on IT portal? </span>
                    <button
                      type="button"
                      onClick={() => setShowRegisterModal(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0b3d91",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      Register PAN here
                    </button>
                  </div>

                  <div>
                    <span style={{ color: "#64748b" }}>Portal account? </span>
                    <Link to="/register" style={{ fontWeight: "700", color: "#0b3d91", textDecoration: "none" }}>
                      Create account
                    </Link>
                  </div>
                </div>

                {/* Direct Shortcut to Hire a CA & Contact Support */}
                <div
                  style={{
                    marginTop: "16px",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    Prefer an expert CA to prepare &amp; file your return?
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowContactModal(true)}
                      className="btn btn-outline-secondary btn-sm fw-bold"
                      style={{ borderRadius: "6px" }}
                    >
                      💬 Contact Us
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFlowModal(true)}
                      className="btn btn-success btn-sm fw-bold text-white"
                      style={{ borderRadius: "6px" }}
                    >
                      👨‍💼 Choose Filing Track
                    </button>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* In-Portal Income Tax Registration Modal */}
      <ITRegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        defaultPan={itForm.pan}
        onRegistered={handleRegisteredSuccess}
      />

      {/* ════ TA XPAYER DATA ACCESS & AIS FETCHING AGREEMENT MODAL ════ */}
      <CModal
        visible={showAgreementModal}
        onClose={() => {
          if (!submitting) {
            setShowAgreementModal(false);
          }
        }}
        size="lg"
        backdrop="static"
      >
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "18px" }}>
            🏛️ Taxpayer Consent &amp; AIS Data Access Agreement
          </CModalTitle>
        </CModalHeader>

        <CModalBody style={{ padding: "28px" }}>
          {/* Header Info */}
          <div
            style={{
              background: "#eff6ff",
              border: "1.5px solid #bfdbfe",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "20px",
            }}
          >
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#1e3a8a", textTransform: "uppercase" }}>
                  Authorization Request
                </div>
                <div style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a", marginTop: "2px" }}>
                  Income Tax Department Data Sync for PAN: <span style={{ color: "#0b3d91" }}>{itForm.pan}</span>
                </div>
              </div>
              <span
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "4px 10px",
                  borderRadius: "12px",
                }}
              >
                AY {itForm.assessment_year}
              </span>
            </div>
          </div>

          {/* Detailed Agreement Terms */}
          <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.7", marginBottom: "20px" }}>
            <p style={{ marginBottom: "12px" }}>
              To prepare your Chartered Accountant client file and optimize your tax returns, our portal requires your
              explicit authorization to make an API call to fetch your confidential tax data from the Income Tax e-Filing
              server.
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
              <strong style={{ color: "#0f172a", display: "block", marginBottom: "8px" }}>
                By agreeing, you authorize the retrieval and processing of:
              </strong>
              <ul style={{ paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>
                  <strong>Annual Information Statement (AIS):</strong> Salary u/s 192, savings &amp; FD interest u/s 194A, dividends u/s 194, and SFT transactions.
                </li>
                <li>
                  <strong>Form 26AS:</strong> Quarterly TDS/TCS deposited credits, OLTAS challans, and prior refund records.
                </li>
                <li>
                  <strong>Form 16 Data:</strong> Employer salary breakdown, standard deductions, and Chapter VI-A investment declarations.
                </li>
                <li>
                  <strong>Legal Privacy Guarantee:</strong> In accordance with Section 138 of the Income-tax Act, 1961, your financial records will strictly be used for tax calculation, regime optimization, and filing on your behalf.
                </li>
              </ul>
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <div
            style={{
              background: agreementChecked ? "#f0fdf4" : "#fff1f2",
              border: `1.5px solid ${agreementChecked ? "#86efac" : "#fca5a5"}`,
              borderRadius: "10px",
              padding: "16px",
              transition: "all 0.2s",
            }}
          >
            <CFormCheck
              id="ais_consent_agreement_checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              label={
                <span style={{ fontSize: "13px", fontWeight: "600", color: agreementChecked ? "#166534" : "#991b1b" }}>
                  I, holder of PAN {itForm.pan} (or authorized representative), hereby grant explicit consent and
                  agree to allow CA Tax Portal to fetch my AIS, Form 26AS, and tax credit records from the Income Tax
                  Department. I confirm that this agreement shall be saved as my official authorization record.
                </span>
              }
            />
          </div>

          {!agreementChecked && (
            <div style={{ fontSize: "12px", color: "#dc2626", marginTop: "8px", fontWeight: "600" }}>
              ⚠️ You must accept this agreement to log in and fetch your tax data.
            </div>
          )}
        </CModalBody>

        <CModalFooter style={{ background: "#f8fafc" }}>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => {
              setShowAgreementModal(false);
              setAgreementChecked(false);
              setError("Login was cancelled because data access consent was not granted.");
            }}
            disabled={submitting}
          >
            Decline &amp; Cancel
          </CButton>
          <CButton
            color="success"
            onClick={() => executeLoginAndFetch(false)}
            disabled={!agreementChecked || submitting}
            style={{
              background: agreementChecked ? "#16a34a" : "#94a3b8",
              border: "none",
              fontWeight: "700",
              padding: "10px 24px",
              borderRadius: "8px",
            }}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Authorizing &amp; Fetching Data…
              </>
            ) : (
              "✅ Accept Agreement & Log In →"
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Choice Flow Selection Modal */}
      <FlowSelectionModal visible={showFlowModal} onClose={() => setShowFlowModal(false)} pan={itForm.pan} />

      {/* Omnipresent Contact Support Modal */}
      <ContactUsModal visible={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
}