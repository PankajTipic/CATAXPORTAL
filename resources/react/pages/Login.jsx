/**
 * TiQTAX: Login page (full-viewport layout)
 * Logic, API calls, localStorage keys, consent flow, and modals are unchanged.
 */

import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  CButton,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormCheck,
} from "@coreui/react";
import {
  Shield,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building,
  ArrowRight,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  Headset,
} from "lucide-react";
import api from "../api/client";
import ITRegisterModal from "../components/ITRegisterModal";
import ContactUsModal from "../components/ContactUsModal";
import FlowSelectionModal from "../components/FlowSelectionModal";
import logo from "../../../public/LOGO1.png";
import "./Login.css";

const FEATURES = [
  { icon: FileCheck2, text: "Auto-sync AIS, TDS and Form 26AS" },
  { icon: CheckCircle2, text: "Review and file in a few minutes" },
  { icon: Headset, text: "Certified CA support when you need it" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("it_portal");

  const [itForm, setItForm] = useState({
    pan: location.state?.pan || "",
    password: "",
    assessment_year: "2026-27",
  });

  const [emailForm, setEmailForm] = useState({ email: "", password: "" });

  // Kept for the existing email-login payload logic. No UI is shown for it.
  const [selectedHeads] = useState(["salary", "other_sources"]);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notRegisteredPan, setNotRegisteredPan] = useState(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const handleItChange = (e) => {
    const { name, value } = e.target;
    setItForm((prev) => ({
      ...prev,
      [name]: name === "pan" ? value.toUpperCase() : value,
    }));
    if (name === "pan") setNotRegisteredPan(null);
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm((prev) => ({ ...prev, [name]: value }));
  };

  const switchTab = (key) => {
    setActiveTab(key);
    setError("");
    setNotRegisteredPan(null);
    setShowPassword(false);
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
    if (preferredFlow === "hire_ca" || preferredFlow === "agent") return "/agent/hire";
    if (preferredFlow === "self") return "/dashboard";
    return "/customer-portal";
  };

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

    if (hasPanConsented(itForm.pan)) {
      executeLoginAndFetch(true);
    } else {
      setAgreementChecked(false);
      setShowAgreementModal(true);
    }
  };

  const executeLoginAndFetch = async (alreadyConsented = false) => {
    const isConsented = typeof alreadyConsented === "boolean" ? alreadyConsented : false;
    if (!isConsented && !agreementChecked) {
      alert("Please check the agreement confirmation box to grant consent.");
      return;
    }

    setSubmitting(true);
    setError("");

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

      if (!data.token || !data.user) {
        setShowAgreementModal(false);
        setError("Login succeeded but no session was returned. Please try again.");
        return;
      }

      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("user_pan", itForm.pan);
      localStorage.setItem("tax_data", JSON.stringify(data.tax_data));
      localStorage.setItem("assessment_year", data.assessment_year);

      setShowAgreementModal(false);
      navigate(getTargetPortal(itForm.pan));
    } catch (err) {
      setShowAgreementModal(false);
      if (err.response?.status === 404 && err.response?.data?.status === "not_registered") {
        setNotRegisteredPan(itForm.pan);
        setError(
          `PAN ${itForm.pan} is not registered on the Income Tax portal. You can register it from here.`
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Income Tax Portal authentication failed. Please check your credentials."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

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
      if (userPan) localStorage.setItem("user_pan", userPan);

      localStorage.setItem("selected_heads", JSON.stringify(selectedHeads));

      if (data.user?.role === "admin" || data.user?.role === "employee") {
        localStorage.setItem("is_ca_staff", "true");
        navigate("/ca-portal");
        return;
      }

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
      localStorage.removeItem(`preferred_filing_flow_${userPan}`);
    }
    localStorage.removeItem("preferred_filing_flow");

    setShowRegisterModal(false);
    setAgreementChecked(false);
    setShowAgreementModal(true);
  };

  const isIt = activeTab === "it_portal";

  return (
    <div className="tq-login">
      <div className="tq-bg-orb tq-bg-orb-1" aria-hidden="true" />
      <div className="tq-bg-orb tq-bg-orb-2" aria-hidden="true" />

      <div className="tq-grid">
        {/* ───────── LEFT: brand and story ───────── */}
        <section className="tq-hero">
          <Link to="/" title="TiQTAX Home" className="tq-logo-link">
            <img src={logo} alt="TiQTAX" className="tq-logo" />
          </Link>

          <h2 className="tq-hero-title">
            Welcome back to <span className="tq-gradient-text">India&apos;s trusted</span> tax portal
          </h2>

          <h6 className="tq-hero-sub">
            Sign in to sync your AIS, Form 26AS and Form 16, then review and file your return with confidence.
          </h6>

          <ul className="tq-feature-list">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="tq-feature-item">
                <span className="tq-feature-icon">
                  <Icon size={14} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="tq-hero-visual">
            <img src="/tiqtax_hero_visual.jpg" alt="TiQTAX tax filing dashboard preview" />
            <span className="tq-visual-badge tq-visual-badge-left">
              <Shield size={11} /> CBDT and ERI compliant
            </span>
            <span className="tq-visual-badge tq-visual-badge-right">AY 2026-27</span>
          </div>
        </section>

        {/* ───────── RIGHT: auth card ───────── */}
        <section className="tq-card-wrap">
          <div className="tq-card">
            <div className="tq-card-accent" />

            <div className="tq-card-body">
              <header className="tq-card-header">
                <h5 className="tq-card-title">Sign in to your account</h5>
                <h6 className="tq-card-subtitle">Sign in using your Income Tax Portal credentials (PAN)</h6>
              </header>

              {error && (
                <div className={`tq-alert ${notRegisteredPan ? "warning" : "danger"}`} role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {notRegisteredPan && (
                <div className="tq-register-prompt">
                  <span>
                    PAN <strong>{notRegisteredPan}</strong> is not registered yet.
                  </span>
                  <button type="button" className="tq-btn-small" onClick={() => setShowRegisterModal(true)}>
                    Register now
                  </button>
                </div>
              )}

              <form onSubmit={handleItSubmit} noValidate className="tq-form">
                <div className="tq-field">
                  <label htmlFor="it_pan" className="tq-label">PAN (username)</label>
                  <div className="tq-input-wrap">
                    <User size={15} className="tq-input-icon" />
                    <input
                      id="it_pan"
                      name="pan"
                      type="text"
                      className="tq-input"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      value={itForm.pan}
                      onChange={handleItChange}
                      autoComplete="username"
                      autoCapitalize="characters"
                      required
                    />
                  </div>
                </div>

                <div className="tq-field">
                  <div className="tq-label-row">
                    <label htmlFor="it_password" className="tq-label">Password</label>
                    <button type="button" className="tq-link" onClick={() => setShowContactModal(true)}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="tq-input-wrap">
                    <Lock size={15} className="tq-input-icon" />
                    <input
                      id="it_password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className="tq-input tq-input-with-toggle"
                      placeholder="Income Tax e-filing password"
                      value={itForm.password}
                      onChange={handleItChange}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="tq-eye"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="tq-submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" /> Signing in…
                    </>
                  ) : (
                    <>
                      Log in <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <footer className="tq-card-footer">
                <span>Don&apos;t have an account?</span>
                <button type="button" className="tq-link tq-link-strong" onClick={() => setShowRegisterModal(true)}>
                  Register
                </button>
              </footer>
            </div>
          </div>

          <div className="tq-card-links">
            <Link to="/ca-login" className="tq-ca-link">
              <Briefcase size={13} /> Tax firm console
            </Link>
            <span className="tq-dot" aria-hidden="true">•</span>
            <button type="button" className="tq-ca-link" onClick={() => setShowContactModal(true)}>
              <Headset size={13} /> Need help?
            </button>
            <span className="tq-dot" aria-hidden="true">•</span>
            <button type="button" className="tq-ca-link" onClick={() => setShowFlowModal(true)}>
              Choose filing track
            </button>
          </div>
        </section>
      </div>

      {/* ───────── MODALS (logic unchanged) ───────── */}
      <ITRegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        defaultPan={itForm.pan}
        onRegistered={handleRegisteredSuccess}
      />

      <CModal
        visible={showAgreementModal}
        onClose={() => {
          if (!submitting) setShowAgreementModal(false);
        }}
        size="lg"
        backdrop="static"
      >
        <CModalHeader className="tq-modal-header">
          <CModalTitle className="tq-modal-title">Taxpayer consent and AIS data access</CModalTitle>
        </CModalHeader>

        <CModalBody className="tq-modal-body">
          <div className="tq-consent-meta">
            <div>
              <h6 className="tq-consent-kicker">Authorization request</h6>
              <h5 className="tq-consent-title">
                PAN: <span className="tq-accent-text">{itForm.pan}</span>
              </h5>
            </div>
            <span className="tq-ay-pill">AY {itForm.assessment_year}</span>
          </div>

          <p className="tq-consent-text">
            To prepare your Chartered Accountant client file and optimise your return, we need your explicit
            authorisation to fetch your tax data from the Income Tax e-Filing server.
          </p>

          <div className="tq-consent-box">
            <h6 className="tq-consent-box-title">By agreeing, you authorise retrieval and processing of:</h6>
            <ul className="tq-consent-list">
              <li>
                <strong>Annual Information Statement (AIS):</strong> Salary u/s 192, savings and FD interest u/s 194A,
                dividends u/s 194, and SFT transactions.
              </li>
              <li>
                <strong>Form 26AS:</strong> Quarterly TDS/TCS credits, OLTAS challans, and prior refund records.
              </li>
              <li>
                <strong>Privacy:</strong> Under Section 138 of the Income-tax Act, 1961, your records are used only for
                tax calculation, regime comparison, and filing on your behalf.
              </li>
            </ul>
          </div>

          <div className={`tq-consent-check ${agreementChecked ? "ok" : ""}`}>
            <CFormCheck
              id="ais_consent_agreement_checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              label={
                <span className="tq-consent-check-label">
                  I, holder of PAN {itForm.pan} (or authorised representative), grant explicit consent for TiQTAX to
                  fetch my AIS, Form 26AS and tax credit records from the Income Tax Department. I understand this
                  agreement will be saved as my authorisation record.
                </span>
              }
            />
          </div>

          {!agreementChecked && (
            <div className="tq-consent-warn">Please accept the agreement to continue.</div>
          )}
        </CModalBody>

        <CModalFooter className="tq-modal-footer">
          <button
            type="button"
            className="tq-btn-ghost"
            onClick={() => {
              setShowAgreementModal(false);
              setAgreementChecked(false);
              setError("Login was cancelled because data access consent was not granted.");
            }}
            disabled={submitting}
          >
            Decline and cancel
          </button>
          <button
            type="button"
            className="tq-submit tq-submit-inline"
            onClick={() => executeLoginAndFetch(false)}
            disabled={!agreementChecked || submitting}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" /> Authorising…
              </>
            ) : (
              "Accept and log in"
            )}
          </button>
        </CModalFooter>
      </CModal>

      <FlowSelectionModal visible={showFlowModal} onClose={() => setShowFlowModal(false)} pan={itForm.pan} />
      <ContactUsModal visible={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
}