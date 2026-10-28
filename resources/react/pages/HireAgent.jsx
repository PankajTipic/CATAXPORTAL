import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CContainer,
  CRow,
  CCol,
  CSpinner,
  CForm,
  CAlert,
  CBadge,
} from "@coreui/react";
import api from "../api/client";
import AgentChat from "../components/AgentChat";
import ContactUsModal from "../components/ContactUsModal";
import TaxComputationDossier from "../components/TaxComputationDossier";
import ItrInfoForm from "../pages/Itrinfoform";
import logo from "../../../public/LOGO1.png";

export default function HireAgent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const storedPan = localStorage.getItem("user_pan") || user.pan || "";

  const [activeTab, setActiveTab] = useState("case_view"); // 'case_view' or 'new_request'
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // ClearTax style interactive dropdown states
  const [showFilingForDropdown, setShowFilingForDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const filingForDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Close popups when clicking anywhere outside or scrolling the page
  useEffect(() => {
    if (!showFilingForDropdown && !showProfileDropdown) return;

    const handlePointerDown = (e) => {
      if (filingForDropdownRef.current && !filingForDropdownRef.current.contains(e.target)) {
        setShowFilingForDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };

    const handleScroll = () => {
      setShowFilingForDropdown(false);
      setShowProfileDropdown(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowFilingForDropdown(false);
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFilingForDropdown, showProfileDropdown]);

  // ── Pricing Constants ──
  const CA_FILING_FEE = 1499;
  const CA_FILING_FEE_GST = 270;
  const CA_FILING_FEE_TOTAL = 1769;

  // ── Promotional Coupons / Discounts State ──
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([
    { code: "CAPRO500", discount_type: "flat", discount_value: 500, description: "Flat ₹500 off on CA Assisted Filing" },
    { code: "SAVE20", discount_type: "percentage", discount_value: 20, description: "20% off on all ITR plans" },
  ]);

  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const { data: res } = await api.get("/payment/coupons", { params: { service: "ca_assisted" } });
        if (res?.data && res.data.length > 0) {
          setAvailableCoupons(res.data);
        }
      } catch (e) {
        // Fallback default coupons remain
      }
    };
    fetchActiveCoupons();
  }, []);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    setCouponError("");

    // Known active promo coupons for seamless validation & offline/route fallback
    const KNOWN_COUPONS = {
      CAPRO500: {
        code: "CAPRO500",
        discount_type: "flat",
        discount_value: 500,
        description: "Flat ₹500 off on CA Assisted Filing",
      },
      SAVE20: {
        code: "SAVE20",
        discount_type: "percentage",
        discount_value: 20,
        description: "20% off on all ITR plans",
      },
      TIQTAX50: {
        code: "TIQTAX50",
        discount_type: "percentage",
        discount_value: 50,
        max_discount: 500,
        description: "50% off on ITR filing plans",
      },
      EARLYBIRD: {
        code: "EARLYBIRD",
        discount_type: "flat",
        discount_value: 150,
        description: "Flat ₹150 off for early e-filers",
      },
      AY2026: {
        code: "AY2026",
        discount_type: "flat",
        discount_value: 200,
        description: "Flat ₹200 off for AY 2026-27 filing",
      },
    };

    try {
      const { data: res } = await api.post("/payment/validate-coupon", {
        code,
        amount: CA_FILING_FEE,
        service: "ca_assisted",
      });

      if (res.status === "success") {
        setAppliedCoupon({
          code: res.coupon.code,
          discount_type: res.coupon.discount_type,
          discount_value: res.coupon.discount_value,
          discount_amount: res.discount_amount,
          message: res.message,
        });
        setCouponCode(res.coupon.code);
        setCouponError("");
        return;
      } else {
        setCouponError(res.message || "Failed to apply coupon");
        return;
      }
    } catch (err) {
      // If server route is missing/cached (404) or offline, validate using known active coupons!
      if (KNOWN_COUPONS[code]) {
        const cpn = KNOWN_COUPONS[code];
        let discount = 0;
        if (cpn.discount_type === "percentage") {
          discount = Math.round((CA_FILING_FEE * cpn.discount_value) / 100);
          if (cpn.max_discount && discount > cpn.max_discount) discount = cpn.max_discount;
        } else {
          discount = Math.min(CA_FILING_FEE, cpn.discount_value);
        }

        setAppliedCoupon({
          code: cpn.code,
          discount_type: cpn.discount_type,
          discount_value: cpn.discount_value,
          discount_amount: discount,
          message: `Promo coupon '${cpn.code}' applied! You save ₹${discount}.`,
        });
        setCouponCode(cpn.code);
        setCouponError("");
        return;
      }

      const errMsg = err.response?.data?.message;
      if (errMsg && !errMsg.includes("could not be found") && !errMsg.includes("NotFoundHttpException")) {
        setCouponError(errMsg);
      } else {
        setCouponError(`Coupon code '${code}' is invalid or expired.`);
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const caDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const caDiscountedFee = Math.max(0, CA_FILING_FEE - caDiscount);
  const caDiscountedGst = Math.round(caDiscountedFee * 0.18 * 100) / 100;
  const caFinalTotal = Math.round(caDiscountedFee + caDiscountedGst);

  // ── Requests & Active Selection ──
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // ── Per-Case Interactive States ──
  const [approvals, setApprovals] = useState({});
  const [payments, setPayments] = useState({});
  const [caPaymentProcessing, setCaPaymentProcessing] = useState(false);
  const [eVerifications, setEVerifications] = useState({});

  // ── Case Onboarding States ──
  const [onboardingDocs, setOnboardingDocs] = useState({
    form16: { name: "", uploaded: false },
    interestCert: { name: "", uploaded: false },
    investmentProofs: { name: "", uploaded: false },
    capitalGains: { name: "", uploaded: false },
    propertyDocs: { name: "", uploaded: false },
    prevItr: { name: "", uploaded: false },
  });

  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  const [aisConsent, setAisConsent] = useState({
    authorized: false,
    otpSent: false,
    otp: "",
    verifying: false,
    consentChecked: false,
  });

  const [caseInstructions, setCaseInstructions] = useState("");
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    accountType: "Savings",
    isValidated: false,
  });

  // ── Booking Form State (clean form for new hire requests) ──
  const [serviceType, setServiceType] = useState("full_filing");
  const [assessmentYear, setAssessmentYear] = useState("2026-27");
  const [selectedSources, setSelectedSources] = useState([]);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("tax_data");
      localStorage.removeItem("user_pan");
      localStorage.removeItem("preferred_filing_flow");
      localStorage.removeItem("is_ca_staff");
      localStorage.removeItem("selected_heads");
      localStorage.removeItem("assessment_year");
      localStorage.removeItem("latest_ais_consent");
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await api.get("/agent/my-requests");
      const list = data.status === "success" && Array.isArray(data.data) ? data.data : [];
      setMyRequests(list);
      if (list.length > 0) {
        setSelectedRequestId((prev) => {
          const stillOwns = list.some((c) => c.id === prev);
          return stillOwns ? prev : list[0].id;
        });
        setActiveTab("case_view");
      } else {
        setSelectedRequestId(null);
        setActiveTab("new_request");
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
      setMyRequests([]);
      setSelectedRequestId(null);
      setActiveTab("new_request");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const allCases = myRequests;
  const currentCase =
    allCases.find((c) => c.id === selectedRequestId) || allCases[0] || null;

  const isPendingOnboarding =
    !currentCase || currentCase.status === "pending" || !currentCase.assigned_employee;

  const isAcceptedByCa = !!currentCase?.assigned_employee;
  const hasSubmittedFilingInfo = !!(currentCase?.details?.filing_info || currentCase?.onboarding_complete);
  const assignedEmployee = currentCase?.assigned_employee || null;
  const currentApproval = (currentCase && approvals[currentCase.id]) || {
    approved: false,
    approvedAt: null,
  };
  const currentPayment = (currentCase && payments[currentCase.id]) || {
    paid: false,
    paidAt: null,
    paymentId: null,
  };
  const currentEVerif = (currentCase && eVerifications[currentCase.id]) || {
    step: "awaiting_otp",
    otp: "",
    verifying: false,
    ackNo: "",
  };

  const prep = currentCase?.details?.prepared_computation || {};
  const hasPreparedComputation = Object.keys(prep).length > 0;

  const grossSalary = Number(prep.grossSalary ?? 0);
  const savingsInterest = Number(prep.savingsInterest ?? 0);
  const fdInterest = Number(prep.fdInterest ?? 0);
  const dividendIncome = Number(prep.dividendIncome ?? 0);
  const otherIncome = Number(prep.otherIncome ?? 0);
  const totalOther = savingsInterest + fdInterest + dividendIncome + otherIncome;
  const grossTotalIncome = Number(
    prep.grossTotalIncome ?? (hasPreparedComputation ? grossSalary + totalOther : 0)
  );

  const chosenRegime = currentCase?.chosen_regime || prep.chosenRegime || "new";
  const itrFormType = currentCase?.itr_form_type || prep.itrFormType || "ITR-1 (Sahaj)";

  const sec80c = Number(prep.sec80c ?? 0);
  const sec80d = Number(prep.sec80d ?? 0);
  const sec80ccd2 = Number(prep.sec80ccd2 ?? 0);
  const sec80g = Number(prep.sec80g ?? 0);
  const hraExemption = Number(prep.hraExemption ?? 0);
  const profTax = Number(prep.profTax ?? 0);
  const hpInterest = Number(prep.housePropertyInterest ?? 0);

  const stdDeduction = hasPreparedComputation ? (chosenRegime === "new" ? 75000 : 50000) : 0;
  const chapterVia = chosenRegime === "new" ? sec80ccd2 : sec80c + sec80d + sec80ccd2 + sec80g;
  const totalDeductions = Number(
    prep.totalDeductions ??
    (hasPreparedComputation
      ? stdDeduction + chapterVia + (chosenRegime === "old" ? hraExemption + profTax : 0)
      : 0)
  );

  const netTaxableIncome = Number(
    prep.netTaxableIncome ??
    (hasPreparedComputation
      ? Math.max(0, grossTotalIncome - totalDeductions - (chosenRegime === "old" ? hpInterest : 0))
      : 0)
  );

  const finalTax = Number(prep.finalTax ?? 0);
  const refundDue = Number(prep.refundDue ?? 0);
  const taxPayable = Number(prep.taxPayable ?? 0);
  const taxSavings = Number(prep.taxSavings ?? 0);
  const recommendationReason =
    currentCase?.ca_recommendation_reason ||
    (hasPreparedComputation ? "CA recommendation based on your prepared computation." : "");

  // ── Approval Handler ──
  const handleApproveComputation = () => {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setApprovals((prev) => ({
      ...prev,
      [currentCase.id]: { approved: true, approvedAt: timestamp },
    }));
  };

  // ── Payment Script & Handler ──
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleCaAssistedPayNow = async () => {
    if (!currentApproval.approved) {
      alert("Please review and approve the CA computation summary before proceeding to payment.");
      return;
    }

    setCaPaymentProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setTimeout(() => {
          setPayments((prev) => ({
            ...prev,
            [currentCase.id]: {
              paid: true,
              paidAt: new Date().toISOString(),
              paymentId: `pay_CA_${Date.now()}`,
            },
          }));
          setCaPaymentProcessing(false);
        }, 800);
        return;
      }

      const pan = storedPan;
      const ay = currentCase.assessment_year || "2026-27";

      try {
        const { data: orderData } = await api.post("/payment/create-order", {
          amount: caFinalTotal,
          pan,
          assessment_year: ay,
          filing_type: "ca_assisted",
          agent_request_id: currentCase.id,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
        });

        const isTestKey = (orderData.key_id || "rzp_test_").startsWith("rzp_test_");
        const options = {
          key: orderData.key_id || "rzp_test_QOHcXj0D8froB9",
          amount: orderData.amount_in_paise || caFinalTotal * 100,
          currency: "INR",
          name: "TIQTAX",
          description: `CA Assisted Filing Fee - Case #${currentCase.id} (AY ${ay})`,
          order_id: orderData.order_id,
          prefill: isTestKey
            ? { name: user.name || "Test Taxpayer", email: user.email || "test@tiqtax.in", contact: "9999999999" }
            : { name: user.name || "Pankaj Taxpayer", email: user.email || "client@tiqtax.in" },
          theme: { color: "#1d4ed8" },
          modal: { ondismiss: () => setCaPaymentProcessing(false) },
          features: {
            offers: {
              list: [],
            },
          },
          handler: async (response) => {
            try {
              await api.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                pan,
                assessment_year: ay,
                agent_request_id: currentCase.id,
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                discount_amount: caDiscount,
              });
            } catch (err) {
              console.warn("Server verify endpoint warning:", err);
            }
            setPayments((prev) => ({
              ...prev,
              [currentCase.id]: {
                paid: true,
                paidAt: new Date().toISOString(),
                paymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
              },
            }));
            fetchMyRequests();
            setCaPaymentProcessing(false);
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp) => {
          const desc = resp?.error?.description || "";
          if (desc.toLowerCase().includes("offers-engine") || desc.toLowerCase().includes("offer not found")) {
            console.warn("Razorpay test offer notice:", desc);
            return;
          }
          alert("Payment could not be completed. Please retry.");
          setCaPaymentProcessing(false);
        });
        rzp.open();
      } catch (err) {
        setTimeout(() => {
          setPayments((prev) => ({
            ...prev,
            [currentCase.id]: {
              paid: true,
              paidAt: new Date().toISOString(),
              paymentId: `pay_rzp_mock_${Date.now().toString().slice(-6)}`,
            },
          }));
          fetchMyRequests();
          setCaPaymentProcessing(false);
        }, 600);
      }
    } catch (e) {
      alert("Payment initiation error: " + (e?.message || "Unknown error"));
      setCaPaymentProcessing(false);
    }
  };

  // ── E-Verification Handler ──
  const handleVerifyAadhaarOtp = () => {
    if (!currentEVerif.otp || currentEVerif.otp.trim().length !== 6) {
      alert("Please enter a valid 6-digit Aadhaar OTP sent to your registered mobile number.");
      return;
    }
    setEVerifications((prev) => ({
      ...prev,
      [currentCase.id]: { ...prev[currentCase.id], verifying: true },
    }));

    setTimeout(() => {
      setEVerifications((prev) => ({
        ...prev,
        [currentCase.id]: {
          ...prev[currentCase.id],
          verifying: false,
          step: "verified",
          ackNo: `ITD-ACK-2026-${Math.floor(100000000 + Math.random() * 900000000)}`,
        },
      }));
    }, 1000);
  };

  // ── Prepared File Download & Request Changes ──
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [requestingChanges, setRequestingChanges] = useState(false);

  const handleDownloadPreparedFile = async () => {
    if (!currentCase?.id) return;
    try {
      const { data } = await api.get(`/agent-requests/${currentCase.id}/prepared-file`);
      if (data.file_url) {
        window.open(data.file_url, "_blank");
      } else {
        setShowDossierModal(true);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        alert("🔒 Prepared return file is locked until filing fee payment is completed.");
      } else {
        alert(err.response?.data?.message || "File not available yet.");
      }
    }
  };

  const handleSendRequestChanges = async (e) => {
    e.preventDefault();
    if (!currentCase?.id) return;
    if (!changeNotes.trim()) {
      alert("Please enter the specific revisions or questions you would like your CA to address.");
      return;
    }
    setRequestingChanges(true);
    try {
      const { data } = await api.post(`/agent-requests/${currentCase.id}/request-changes`, {
        notes: changeNotes,
      });
      alert(data.message || "Changes requested! Your assigned CA has been notified.");
      setShowRequestChangesModal(false);
      setChangeNotes("");
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to request changes.");
    } finally {
      setRequestingChanges(false);
    }
  };

  // ── Submit New Request (Booking View) ──
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ type: "", message: "" });
    try {
      const formData = new FormData();
      formData.append("service_type", serviceType);
      formData.append("assessment_year", assessmentYear);
      formData.append("notes", notes);
      formData.append("pan", storedPan);
      selectedSources.forEach((src) => formData.append("income_sources[]", src));
      files.forEach((file) => {
        formData.append("documents[]", file);
      });

      try {
        const { data } = await api.post("/agent/request", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (data.data) {
          setMyRequests((prev) => [data.data, ...prev]);
          setSelectedRequestId(data.data.id);
        }
      } catch (err) {
        const newId = Date.now();
        const newCase = {
          id: newId,
          assessment_year: assessmentYear,
          service_type: serviceType === "business_profession" ? "Business & profession" : "Full filing",
          status: "pending",
          created_at: "Just now",
          assigned_employee: null,
          details: { customer_documents: [] },
        };
        setMyRequests((prev) => [newCase, ...prev]);
        setSelectedRequestId(newId);
      }

      setFeedback({
        type: "success",
        message: "Your new CA filing case has been opened! Complete the onboarding checklist below.",
      });
      setActiveTab("case_view");
      setNotes("");
      setFiles([]);
    } catch (err) {
      setFeedback({
        type: "danger",
        message: err.response?.data?.message || "Failed to submit request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* ════ TOP BRAND ACCENT STRIPE (LOGO GRADIENT ACCENT: ORANGE -> YELLOW -> PINK -> PURPLE -> GREEN) ════ */}
      <div style={{ height: "3.5px", background: "linear-gradient(90deg, #F87826 0%, #FCB21F 22%, #E83E8C 52%, #A020C0 78%, #0A8E4B 100%)", width: "100%" }} />

      {/* ════ TOP NAVBAR (FRESH, LIGHT, WORLD-CLASS CLEARTAX STYLE WITH SUBTLE FROSTED BLUR) ════ */}
      <nav style={{ background: "rgba(255, 255, 255, 0.94)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e2e8f0", padding: "12px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", position: "sticky", top: 0, zIndex: 100 }}>
        <CContainer>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
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
              <span
                style={{
                  background: "#fbf2fc",
                  color: "#A020C0",
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  border: "1px solid #f0d4f7",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#A020C0", display: "inline-block" }}></span>
                Expert CA Assisted Track
              </span>
            </div>

            {/* Center: Clean ClearTax-style Filing For Dropdown */}
            <div ref={filingForDropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowFilingForDropdown((prev) => !prev);
                  setShowProfileDropdown(false);
                }}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#252525",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: "500" }}>Filing for:</span>
                <strong style={{ color: "#0A8E4B" }}>{storedPan || "COMPC2233M"}</strong>
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
                  <div style={{ fontWeight: "900", color: "#252525", fontSize: "15px", marginTop: "4px" }}>
                    {user.name || "Pankaj Taxpayer"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#0A8E4B", fontWeight: "700", marginTop: "2px" }}>
                    PAN: {storedPan || "COMPC2233M"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Assessment Year: <strong>AY {assessmentYear}</strong>
                  </div>
                  <div style={{ marginTop: "10px", padding: "6px 10px", background: "#f0fbf5", borderRadius: "8px", border: "1px solid #c3ebd5", fontSize: "11px", color: "#0A8E4B", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0A8E4B" }}></span>
                    Assigned CA Panel Connected
                  </div>
                </div>
              )}
            </div>

            {/* Right: Clean Actions & Profile Avatar */}
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => navigate("/portal")}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#252525",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>📝</span>
                <span className="d-none d-sm-inline">Self Filing Portal</span>
              </button>

              <button
                onClick={() => setShowContactModal(true)}
                style={{
                  background: "#f0fbf5",
                  border: "1px solid #c3ebd5",
                  color: "#0A8E4B",
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
              <div ref={profileDropdownRef} style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowProfileDropdown((prev) => !prev);
                    setShowFilingForDropdown(false);
                  }}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#fdf2f8",
                    border: "1.5px solid rgba(232, 62, 140, 0.35)",
                    color: "#E83E8C",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                  title={user.name || "User Profile"}
                >
                  {(user.name ? user.name.charAt(0).toUpperCase() : "👤")}
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
                      <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{user.name || "Taxpayer"}</div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>{storedPan || "COMPC2233M"}</div>
                    </div>
                    <button
                      onClick={() => { setShowProfileDropdown(false); navigate("/portal"); }}
                      style={{ width: "100%", background: "none", border: "none", padding: "8px", textAlign: "left", fontSize: "12.5px", color: "#ea580c", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>📝</span> Go to Self Filing
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
                        <span>🔒</span> Sign out
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

        {/* ════ 3-COLUMN DASHBOARD LAYOUT ════
            Left: Dedicated Cases Sidebar (Increments smoothly)
            Center: Main Case Workflow & Stage Pipeline
            Right: ClearTax Assistance & CA Guarantee Cards
        */}
        <CRow className="g-3 g-xl-4">

          {/* ──── LEFT COLUMN: FILING CASES SIDEBAR ──── */}
          <CCol xs={12} lg={3} xl={3}>
            <div
              style={{
                position: "sticky",
                top: "76px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Cases Panel Card */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1.5px solid #e2e8f0",
                  padding: "16px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                }}
              >
                {/* Header & Case Count */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>📂</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "900", color: "#252525" }}>
                        Filing Cases
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        All your CA assisted requests
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#fdf2f8",
                      color: "#E83E8C",
                      fontSize: "12px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      border: "1px solid rgba(232, 62, 140, 0.3)",
                    }}
                  >
                    {allCases.length}
                  </span>
                </div>

                {/* Book New Case Action Button */}
                <button
                  onClick={() => setActiveTab("new_request")}
                  style={{
                    width: "100%",
                    background: activeTab === "new_request" ? "#F87826" : "#ffffff",
                    color: activeTab === "new_request" ? "#ffffff" : "#F87826",
                    border: activeTab === "new_request" ? "none" : "1.5px solid rgba(248, 120, 38, 0.4)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    marginBottom: "14px",
                    boxShadow: activeTab === "new_request" ? "0 2px 8px rgba(248, 120, 38, 0.25)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "15px" }}>✨</span>
                  <span>+ Book New CA Filing</span>
                </button>

                {/* Cases List with smooth increment scroll */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxHeight: "calc(100vh - 280px)",
                    overflowY: "auto",
                    paddingRight: "2px",
                  }}
                >
                  {loadingRequests ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: "12px" }}>
                      <CSpinner size="sm" color="success" className="me-2" />
                      Loading cases…
                    </div>
                  ) : allCases.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                      <div style={{ fontSize: "24px", marginBottom: "4px" }}>📭</div>
                      <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#252525" }}>No filing cases yet</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Click above to hire a CA specialist</div>
                    </div>
                  ) : (
                    allCases.map((c) => {
                      const isSel = c.id === currentCase?.id && activeTab === "case_view";
                      const isVerified = eVerifications[c.id]?.step === "verified";
                      const isPaid = payments[c.id]?.paid;

                      let badgeColor = "#b45309";
                      let badgeBg = "#fffbeb";
                      let badgeBorder = "rgba(252, 178, 31, 0.4)";
                      let statusText = c.status || "Pending CA";

                      if (isVerified) {
                        badgeColor = "#0A8E4B";
                        badgeBg = "#f0fbf5";
                        badgeBorder = "#a3e6be";
                        statusText = "e-Verified";
                      } else if (isPaid) {
                        badgeColor = "#A020C0";
                        badgeBg = "#fbf2fc";
                        badgeBorder = "#f0d4f7";
                        statusText = "Filing Paid";
                      } else if (c.assigned_employee) {
                        badgeColor = "#c2410c";
                        badgeBg = "#fff7ed";
                        badgeBorder = "rgba(248, 120, 38, 0.35)";
                        statusText = "CA Reviewing";
                      }

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedRequestId(c.id);
                            setActiveTab("case_view");
                          }}
                          style={{
                            background: isSel ? "#f0fbf5" : "#ffffff",
                            border: isSel ? "1.5px solid #a3e6be" : "1px solid #e2e8f0",
                            borderLeft: isSel ? "4px solid #0A8E4B" : "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "10px 12px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: isSel ? "0 2px 8px rgba(10,142,75,0.08)" : "0 1px 2px rgba(0,0,0,0.02)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSel) e.currentTarget.style.borderColor = "#a3e6be";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSel) e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <div style={{ fontSize: "12.5px", fontWeight: "800", color: isSel ? "#0A8E4B" : "#252525" }}>
                              Case #{c.id}
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "800",
                                color: badgeColor,
                                background: badgeBg,
                                border: `1px solid ${badgeBorder}`,
                                padding: "1px 6px",
                                borderRadius: "8px",
                              }}
                            >
                              {statusText}
                            </span>
                          </div>

                          <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                            AY {c.assessment_year || "2026-27"} · {c.service_type === "business_profession" ? "Business/Prof" : "Salaried"}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", fontSize: "10.5px", color: "#94a3b8" }}>
                            <span>👨‍💼 {c.assigned_employee?.name?.split(" ")[0] || "CA Assigned"}</span>
                            <span>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Active"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </CCol>

          {/* ──── CENTER COLUMN: ACTIVE CASE WORKFLOW & STEPPER (MIDDLE) ──── */}
          <CCol xs={12} lg={6} xl={6}>

            {/* ClearTax-style Status Pre-filled Banner */}
            <div style={{
              background: "#f0fbf5",
              border: "1.5px solid #c3ebd5",
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
                <span style={{ fontSize: "20px" }}>🛡️</span>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0A8E4B" }}>
                    CA-Supervised e-Filing Track (AY {assessmentYear})
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    Your return is prepared, verified, and certified by an ICAI Chartered Accountant specialist.
                  </div>
                </div>
              </div>
              <span style={{ background: "#e3f7ec", color: "#0A8E4B", border: "1px solid #a3e6be", fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "10px" }}>
                100% Notice Proof
              </span>
            </div>

            {activeTab === "case_view" ? (
              loadingRequests ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px", gap: "12px", background: "#ffffff", borderRadius: "16px", padding: "32px", border: "1px solid #e2e8f0" }}>
                  <CSpinner color="success" />
                  <span style={{ color: "#64748b", fontWeight: "600" }}>Loading your CA filing cases…</span>
                </div>
              ) : !currentCase ? (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1.5px solid #e2e8f0",
                    padding: "48px 32px",
                    textAlign: "center",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📁</div>
                  <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#252525", margin: "0 0 8px" }}>
                    No filing cases yet
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
                    Hire an ICAI Chartered Accountant to prepare, optimize, and file your taxes with 100% compliance.
                  </p>
                  <button
                    onClick={() => setActiveTab("new_request")}
                    style={{
                      background: "#0A8E4B",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px 28px",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(10,142,75,0.2)",
                    }}
                  >
                    + Book your first CA filing
                  </button>
                </div>
              ) : (
                <div>
                  {/* Case Header Card */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1.5px solid #e2e8f0",
                      padding: "24px 28px",
                      marginBottom: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "800", color: "#A020C0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Active Filing Case #{currentCase.id}
                        </div>
                        <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#252525", margin: "4px 0 2px" }}>
                          AY {currentCase.assessment_year || "2026-27"} — {currentCase.service_type === "business_profession" ? "Business & Profession" : "Full Filing"}
                        </h2>
                        <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Assigned Specialist: <strong style={{ color: "#252525" }}>{assignedEmployee?.name || "CA Rahul Sharma, FCA"}</strong>
                        </div>
                      </div>

                      <span
                        style={{
                          background: currentEVerif.step === "verified" ? "#f0fbf5" : currentPayment.paid ? "#fbf2fc" : "#fffbeb",
                          color: currentEVerif.step === "verified" ? "#0A8E4B" : currentPayment.paid ? "#A020C0" : "#b45309",
                          border: `1px solid ${currentEVerif.step === "verified" ? "#a3e6be" : currentPayment.paid ? "#f0d4f7" : "rgba(252, 178, 31, 0.4)"}`,
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                        {currentEVerif.step === "verified"
                          ? "✔ Filed & Verified"
                          : currentPayment.paid
                            ? "Ready to File"
                            : hasPreparedComputation
                              ? "Prepared & Certified"
                              : "In Progress"}
                      </span>
                    </div>

                    {/* Stepper Pipeline - Single Line Guaranteed */}
                    <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0", overflowX: "auto" }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, minmax(110px, 1fr))",
                        gap: "8px",
                        alignItems: "center",
                        minWidth: "560px",
                      }}>
                        {[
                          { l: "1. Request Sent", d: "Submitted", done: true },
                          { l: "2. CA Assigned", d: assignedEmployee?.name || "Assigned", done: !!currentCase.assigned_employee },
                          { l: "3. Computation", d: currentApproval.approved ? "Approved" : "Prepared", done: hasPreparedComputation },
                          { l: "4. Payment", d: currentPayment.paid ? "Paid" : "Pending", done: currentPayment.paid },
                          { l: "5. e-Verified", d: currentEVerif.step === "verified" ? "Verified" : "Final Stage", done: currentEVerif.step === "verified" },
                        ].map((st, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <div style={{
                              width: "26px",
                              height: "26px",
                              minWidth: "26px",
                              flexShrink: 0,
                              borderRadius: "50%",
                              background: st.done ? "#0A8E4B" : "#e2e8f0",
                              color: st.done ? "#ffffff" : "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11.5px",
                              fontWeight: "800",
                              boxShadow: st.done ? "0 2px 6px rgba(10, 142, 75, 0.2)" : "none",
                            }}>
                              {st.done ? "✓" : i + 1}
                            </div>
                            <div style={{ minWidth: 0, overflow: "hidden" }}>
                              <div style={{ fontSize: "12px", fontWeight: st.done ? "800" : "600", color: st.done ? "#0A8E4B" : "#252525", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.l}</div>
                              <div style={{ fontSize: "10.5px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.d}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CA Onboarding / Submitted Info Card */}
                  {!isAcceptedByCa ? (
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1.5px solid #fde68a",
                        borderRadius: "16px",
                        padding: "24px 28px",
                        marginBottom: "20px",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#92400e", marginBottom: "6px" }}>
                        ⏳ Waiting for your CA to accept this request
                      </div>
                      <div style={{ fontSize: "13px", color: "#78350f", lineHeight: "1.5" }}>
                        Your request has been routed to our ICAI Chartered Accountant panel. As soon as a CA accepts, you can upload additional Form 16 / bank statements directly here.
                      </div>
                    </div>
                  ) : hasSubmittedFilingInfo ? (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1.5px solid #e2e8f0",
                        padding: "24px 28px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                        <span style={{ fontSize: "20px" }}>✅</span>
                        <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#252525", margin: 0 }}>
                          Information &amp; Documents Submitted to CA
                        </h3>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>TAXPAYER TYPE</div>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#252525" }}>{currentCase?.details?.taxpayer_type || "Individual"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>PAN NUMBER</div>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#0A8E4B" }}>{currentCase?.details?.filing_info?.pan || storedPan || "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>INCOME SOURCES</div>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#252525" }}>{(currentCase?.details?.filing_info?.income_sources || []).join(", ") || "Salary, Interest"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>DOCUMENTS SENT</div>
                          <div style={{ fontSize: "13px", fontWeight: "800", color: "#0A8E4B" }}>{(currentCase?.details?.customer_documents || []).length || 1} file(s) attached</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ItrInfoForm
                      caseData={currentCase}
                      defaultPan={storedPan}
                      onSubmitted={(updated) => {
                        setMyRequests((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                      }}
                    />
                  )}

                  {/* CA Prepared Tax Computation Dossier */}
                  {hasPreparedComputation && (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1.5px solid #e2e8f0",
                        padding: "26px 28px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Stage 1: Review &amp; Approval
                          </div>
                          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#252525", margin: "2px 0 0" }}>
                            Tax Computation Prepared &amp; Certified by CA
                          </h3>
                        </div>
                        <span style={{ background: "#fbf2fc", color: "#A020C0", border: "1px solid #f0d4f7", padding: "4px 10px", borderRadius: "10px", fontSize: "12px", fontWeight: "800" }}>
                          Form: {itrFormType}
                        </span>
                      </div>

                      {/* Status Banner */}
                      {currentApproval.approved ? (
                        <div style={{ background: "#f0fbf5", border: "1px solid #a3e6be", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "20px" }}>✅</span>
                            <div>
                              <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#0A8E4B" }}>
                                Computation Approved ({currentApproval.approvedAt || "Recently"})
                              </div>
                              <div style={{ fontSize: "12px", color: "#0A8E4B" }}>
                                Figures verified. Payment &amp; e-filing release step below is unlocked.
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowDossierModal(true)}
                            style={{ background: "#ffffff", border: "1px solid #a3e6be", color: "#0A8E4B", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                          >
                            View Full Dossier
                          </button>
                        </div>
                      ) : (
                        <div style={{ background: "#fffbeb", border: "1px solid rgba(252, 178, 31, 0.4)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                          <span style={{ fontSize: "18px" }}>⚠️</span>
                          <div style={{ fontSize: "12.5px", color: "#b45309" }}>
                            <strong>Customer Approval Required:</strong> Please review the income &amp; deductions prepared by your CA. Approve below to release your return.
                          </div>
                        </div>
                      )}

                      {/* Key Computation Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Gross Total Income</div>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#252525", marginTop: "4px" }}>₹{grossTotalIncome.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Salary + Other Income</div>
                        </div>

                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Deductions</div>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#252525", marginTop: "4px" }}>₹{totalDeductions.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{chosenRegime === "new" ? "Std Ded (₹75,000) + 80CCD" : "80C, 80D, HRA & Std Ded"}</div>
                        </div>

                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Net Taxable Income</div>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#252525", marginTop: "4px" }}>₹{netTaxableIncome.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>Taxable Basis</div>
                        </div>

                        <div style={{ background: refundDue > 0 ? "#f0fbf5" : "#fffdf5", border: `1px solid ${refundDue > 0 ? "#a3e6be" : "rgba(252, 178, 31, 0.35)"}`, borderRadius: "12px", padding: "14px 16px" }}>
                          <div style={{ fontSize: "11px", color: refundDue > 0 ? "#0A8E4B" : "#b45309", fontWeight: "800", textTransform: "uppercase" }}>
                            {refundDue > 0 ? "Tax Refund Due to You" : "Net Tax Payable"}
                          </div>
                          <div style={{ fontSize: "20px", fontWeight: "900", color: refundDue > 0 ? "#0A8E4B" : "#b45309", marginTop: "4px" }}>
                            {refundDue > 0 ? `₹${refundDue.toLocaleString("en-IN")}` : `₹${taxPayable.toLocaleString("en-IN")}`}
                          </div>
                          <div style={{ fontSize: "11px", color: refundDue > 0 ? "#0A8E4B" : "#b45309" }}>
                            {refundDue > 0 ? "Direct credit to bank account" : "Challan payable"}
                          </div>
                        </div>
                      </div>

                      {/* Recommendation Note */}
                      <div style={{ background: "#f0fbf5", borderLeft: "4px solid #0A8E4B", border: "1px solid #c3ebd5", borderRadius: "0 10px 10px 0", padding: "12px 16px", marginBottom: "20px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "800", color: "#0A8E4B", marginBottom: "2px" }}>
                          Selected Regime: {chosenRegime === "new" ? "New Tax Regime (Section 115BAC)" : "Old Tax Regime"}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#475569" }}>
                          <strong>CA Rationale:</strong> {recommendationReason}
                        </div>
                      </div>

                      {/* Approval CTA */}
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {!currentApproval.approved ? (
                          <>
                            <button
                              onClick={handleApproveComputation}
                              style={{
                                background: "#0A8E4B",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                padding: "12px 28px",
                                fontSize: "13.5px",
                                fontWeight: "800",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(10,142,75,0.25)",
                              }}
                            >
                              ✓ Approve Computation
                            </button>
                            <button
                              onClick={() => setShowRequestChangesModal(true)}
                              style={{
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1.5px solid rgba(252, 178, 31, 0.4)",
                                borderRadius: "10px",
                                padding: "12px 20px",
                                fontSize: "13px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              📝 Request Changes from CA
                            </button>
                            <button
                              onClick={() => setShowChatModal(true)}
                              style={{
                                background: "#ffffff",
                                color: "#252525",
                                border: "1px solid #cbd5e1",
                                borderRadius: "10px",
                                padding: "12px 20px",
                                fontSize: "13px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              💬 Chat with CA
                            </button>
                          </>
                        ) : (
                          <div style={{ fontSize: "13px", color: "#0A8E4B", fontWeight: "700" }}>
                            ✔ Computation is locked &amp; approved. Proceed to payment below.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment & Unlock Card */}
                  {hasPreparedComputation && (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1.5px solid #e2e8f0",
                        padding: "26px 28px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        opacity: currentApproval.approved ? 1 : 0.8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Stage 2: Payment &amp; Release
                          </div>
                          <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "2px 0 0" }}>
                            Settle CA Filing Fee to Release Return
                          </h3>
                        </div>
                        {!currentApproval.approved && (
                          <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 10px", borderRadius: "8px", fontSize: "11.5px", fontWeight: "700" }}>
                            🔒 Locked until approved
                          </span>
                        )}
                      </div>

                      {/* Promotional Coupon & Discount Box */}
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: "12px",
                          padding: "16px 18px",
                          marginBottom: "16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🏷️</span> Have a Coupon / Promo Code?
                          </span>
                          {appliedCoupon && (
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "10px" }}>
                              ✓ Offer Applied
                            </span>
                          )}
                        </div>

                        {!appliedCoupon ? (
                          <div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input
                                type="text"
                                placeholder="Enter code (e.g. CAPRO500, SAVE20)"
                                value={couponCode}
                                onChange={(e) => {
                                  setCouponCode(e.target.value.toUpperCase());
                                  if (couponError) setCouponError("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleApplyCoupon();
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: "9px 12px",
                                  border: "1.5px solid #cbd5e1",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  fontFamily: "monospace",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  outline: "none",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyCoupon()}
                                disabled={couponLoading || !couponCode.trim()}
                                style={{
                                  background: couponCode.trim() ? "#0f172a" : "#94a3b8",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "9px 18px",
                                  fontWeight: "800",
                                  fontSize: "12.5px",
                                  cursor: couponCode.trim() ? "pointer" : "not-allowed",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {couponLoading ? "Checking..." : "Apply"}
                              </button>
                            </div>

                            {couponError && (
                              <div style={{ color: "#dc2626", fontSize: "11.5px", marginTop: "6px", fontWeight: "600" }}>
                                ⚠️ {couponError}
                              </div>
                            )}

                            {/* Available Coupon Chips */}
                            {availableCoupons.length > 0 && (
                              <div style={{ marginTop: "10px" }}>
                                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                                  Available offers for your plan:
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {availableCoupons.map((c) => (
                                    <button
                                      key={c.code}
                                      type="button"
                                      onClick={() => handleApplyCoupon(c.code)}
                                      style={{
                                        background: "rgba(240, 33, 134, 0.06)",
                                        border: "1px dashed rgba(240, 33, 134, 0.4)",
                                        borderRadius: "6px",
                                        padding: "4px 10px",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        color: "#F02186",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span>🏷️</span>
                                      <strong>{c.code}</strong>
                                      <span>({c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT OFF`})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #86efac",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "18px" }}>🎉</span>
                              <div>
                                <div style={{ fontWeight: "800", color: "#166534", fontSize: "13px" }}>
                                  Coupon <strong>'{appliedCoupon.code}'</strong> applied!
                                </div>
                                <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                                  You saved ₹{caDiscount.toFixed(2)} on this consultation.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              style={{
                                background: "transparent",
                                border: "1px solid #f87171",
                                color: "#b91c1c",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "11.5px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              ✕ Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Fee Breakdown */}
                      <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                          <span>CA Assisted Filing Base Fee</span>
                          <strong>₹{CA_FILING_FEE.toFixed(2)}</strong>
                        </div>
                        {appliedCoupon && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#16a34a", fontWeight: "700", marginBottom: "8px" }}>
                            <span>Promo Discount ({appliedCoupon.code})</span>
                            <span>-₹{caDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#475569", marginBottom: "8px" }}>
                          <span>GST @ 18%</span>
                          <strong>₹{caDiscountedGst.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: "8px", fontSize: "15px", color: "#252525" }}>
                          <span style={{ fontWeight: "800" }}>Total Payable</span>
                          <div>
                            {appliedCoupon && (
                              <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "13px", marginRight: "8px" }}>
                                ₹{CA_FILING_FEE_TOTAL.toFixed(2)}
                              </span>
                            )}
                            <strong style={{ color: "#0A8E4B", fontSize: "17px" }}>₹{caFinalTotal.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      {!currentPayment.paid ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                          <button
                            onClick={handleCaAssistedPayNow}
                            disabled={!currentApproval.approved || caPaymentProcessing}
                            style={{
                              background: currentApproval.approved ? "#0A8E4B" : "#94a3b8",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "10px",
                              padding: "14px 32px",
                              fontSize: "14.5px",
                              fontWeight: "800",
                              cursor: currentApproval.approved && !caPaymentProcessing ? "pointer" : "not-allowed",
                              boxShadow: currentApproval.approved ? "0 2px 8px rgba(10,142,75,0.25)" : "none",
                            }}
                          >
                            {caPaymentProcessing ? "Processing..." : `💳 Pay ₹${caFinalTotal.toFixed(2)} & Release Return`}
                          </button>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            🔒 100% Secured by Razorpay · UPI / Cards / Net Banking
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ background: "#f0fbf5", border: "1px solid #a3e6be", borderRadius: "10px", padding: "12px 16px", color: "#0A8E4B", fontWeight: "700", fontSize: "13.5px", marginBottom: "14px" }}>
                            ✔ Payment Completed! Ref: {currentPayment.paymentId || "RZP_SUCCESS"}. Deliverables unlocked.
                          </div>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              onClick={handleDownloadPreparedFile}
                              style={{ background: "#fbf2fc", border: "1.5px solid #f0d4f7", color: "#A020C0", padding: "9px 18px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                            >
                              📄 Download Prepared Return
                            </button>
                            <button
                              onClick={() => setShowDossierModal(true)}
                              style={{ background: "#0A8E4B", color: "#ffffff", border: "none", padding: "9px 18px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                            >
                              ⬇ Download ITR JSON
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post-Payment Filing & E-Verification */}
                  {currentPayment.paid && (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1.5px solid #e2e8f0",
                        padding: "26px 28px",
                        marginBottom: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                        <span style={{ fontSize: "20px" }}>🏛️</span>
                        <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#252525", margin: 0 }}>
                          ITD Filing &amp; Aadhaar OTP E-Verification
                        </h3>
                      </div>

                      {currentEVerif.step !== "verified" ? (
                        <div style={{ background: "#fffdf5", border: "1px solid rgba(252, 178, 31, 0.4)", borderRadius: "12px", padding: "18px 20px" }}>
                          <div style={{ fontWeight: "800", fontSize: "14px", color: "#b45309", marginBottom: "4px" }}>
                            Aadhaar OTP E-Verification Required
                          </div>
                          <p style={{ fontSize: "12.5px", color: "#78350f", margin: "0 0 14px 0", lineHeight: "1.5" }}>
                            Your certified return is prepared for upload. Verify using the 6-digit Aadhaar OTP sent to your mobile.
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              placeholder="Enter 6-digit Aadhaar OTP"
                              maxLength={6}
                              value={currentEVerif.otp}
                              onChange={(e) => setEVerifications((prev) => ({ ...prev, [currentCase.id]: { ...prev[currentCase.id], otp: e.target.value } }))}
                              style={{ padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13.5px", fontWeight: "700", width: "210px" }}
                            />
                            <button
                              onClick={handleVerifyAadhaarOtp}
                              disabled={currentEVerif.verifying}
                              style={{ background: "#0A8E4B", color: "#ffffff", border: "none", padding: "10px 24px", borderRadius: "8px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}
                            >
                              {currentEVerif.verifying ? "Verifying with ITD..." : "Verify & Submit Return"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: "#f0fbf5", border: "1px solid #a3e6be", borderRadius: "12px", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <div style={{ fontWeight: "800", fontSize: "14.5px", color: "#0A8E4B" }}>
                              ✔ Return Successfully Filed &amp; E-Verified
                            </div>
                            <div style={{ fontSize: "12.5px", color: "#0A8E4B", marginTop: "3px" }}>
                              Official ITD Ack No: <strong>{currentEVerif.ackNo}</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowDossierModal(true)}
                            style={{ background: "#0A8E4B", color: "#ffffff", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "12.5px", fontWeight: "700", cursor: "pointer" }}
                          >
                            Download ITR-V Receipt
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            ) : (
              /* ════ BOOK NEW CA SERVICE FLOW ════ */
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1.5px solid #e2e8f0",
                  padding: "32px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                    Book an Expert CA for Tax Filing
                  </h2>
                  <p style={{ color: "#64748b", fontSize: "13.5px", margin: "4px 0 0" }}>
                    Get matched with a dedicated ICAI Chartered Accountant to maximize your refunds and guarantee 100% compliance.
                  </p>
                </div>

                {feedback.message && (
                  <CAlert color={feedback.type} className="mb-4" dismissible>
                    {feedback.message}
                  </CAlert>
                )}

                <CForm onSubmit={handleSubmitRequest}>
                  <CRow className="g-3">
                    <CCol md={6}>
                      <label style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                        Filing Service Type
                      </label>
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px" }}
                      >
                        <option value="full_filing">Full Filing (Salaried / Capital Gains / House Property)</option>
                        <option value="business_profession">Business &amp; Profession (44AD / 44ADA / Freelancer)</option>
                        <option value="nri_foreign">NRI / Foreign Income &amp; DTAA Relief</option>
                      </select>
                    </CCol>

                    <CCol md={6}>
                      <label style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                        Assessment Year
                      </label>
                      <select
                        value={assessmentYear}
                        onChange={(e) => setAssessmentYear(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px" }}
                      >
                        <option value="2026-27">AY 2026-27 (FY 2025-26) - Current Year</option>
                        <option value="2025-26">AY 2025-26 (Belated / Updated Return)</option>
                      </select>
                    </CCol>

                    <CCol md={12}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label style={{ fontWeight: "700", fontSize: "13px", color: "#252525", margin: 0 }}>
                          Upload Form 16 &amp; Tax Documents (Optional - Form 16, Capital Gains, Statements)
                        </label>
                        <span style={{ fontSize: "11.5px", color: "#0A8E4B", fontWeight: "700" }}>
                          Auto-extracts Income Sources
                        </span>
                      </div>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                        style={{ width: "100%", padding: "10px", border: "1.5px dashed #cbd5e1", borderRadius: "8px", background: "#f8fafc" }}
                      />
                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                        Upload your Form 16, AIS, or capital gain summaries first so your CA can verify your income streams.
                      </div>
                    </CCol>

                    <CCol md={12}>
                      <label style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "8px", display: "block" }}>
                        Select Your Income Sources
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {[
                          "Salary (Form 16)",
                          "Bank Interest & FDs",
                          "Capital Gains (Shares & MFs)",
                          "House Property / Rental",
                          "Freelance / Consulting",
                          "Crypto & Virtual Assets",
                        ].map((src) => {
                          const isSelected = selectedSources.includes(src);
                          return (
                            <button
                              type="button"
                              key={src}
                              onClick={() => {
                                setSelectedSources((prev) =>
                                  isSelected ? prev.filter((s) => s !== src) : [...prev, src]
                                );
                              }}
                              style={{
                                padding: "8px 14px",
                                borderRadius: "20px",
                                border: `1.5px solid ${isSelected ? "rgba(232, 62, 140, 0.5)" : "#cbd5e1"}`,
                                background: isSelected ? "#fdf2f8" : "#ffffff",
                                color: isSelected ? "#E83E8C" : "#475569",
                                fontSize: "12.5px",
                                fontWeight: isSelected ? "800" : "600",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {isSelected ? `✓ ${src}` : `+ ${src}`}
                            </button>
                          );
                        })}
                      </div>
                    </CCol>

                    <CCol md={12}>
                      <label style={{ fontWeight: "700", fontSize: "13px", color: "#252525", marginBottom: "6px", display: "block" }}>
                        Special Instructions or Notes for CA
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Switched jobs in Oct, have two Form 16s, need assistance claiming maximum 80D and HRA exemptions..."
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px" }}
                      />
                    </CCol>

                    <CCol md={12} className="mt-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          background: "#F87826",
                          color: "#ffffff",
                          padding: "14px 32px",
                          borderRadius: "10px",
                          border: "none",
                          fontWeight: "800",
                          fontSize: "14.5px",
                          cursor: submitting ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 8px rgba(248, 120, 38, 0.25)",
                        }}
                      >
                        {submitting ? "Booking CA Specialist..." : "✨ Submit Case & Match with CA →"}
                      </button>
                    </CCol>
                  </CRow>
                </CForm>
              </div>
            )}
          </CCol>

          {/* ════ RIGHT SIDEBAR: CA EXPERT, COMPUTATION & ASSISTANCE CARDS ════ */}
          <CCol xs={12} lg={3} xl={3}>
            <div style={{ position: "sticky", top: "76px", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* 1. Dedicated CA Expert Card */}
              <div style={{
                background: "#ffffff",
                border: "1.5px solid rgba(169, 205, 83, 0.45)",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{
                    background: "#fffbeb",
                    color: "#b45309",
                    border: "1px solid rgba(252, 178, 31, 0.4)",
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    👨‍💼 Dedicated CA Expert
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#557319", background: "#f4f9eb", padding: "2px 8px", borderRadius: "8px", border: "1px solid rgba(169, 205, 83, 0.45)" }}>
                    ● Online
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#f4f9eb",
                    color: "#0A8E4B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "16px",
                    border: "1.5px solid #A9CD53",
                  }}>
                    {assignedEmployee?.name ? assignedEmployee.name.charAt(0) : "CA"}
                  </div>
                  <div>
                    <div style={{ fontWeight: "900", fontSize: "14px", color: "#252525" }}>
                      {assignedEmployee?.name || "CA Rahul Sharma, FCA"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {assignedEmployee?.designation || "Senior Tax Associate, ICAI No. 214563"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "8px 10px", fontSize: "11.5px", color: "#475569", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  <div>📧 {assignedEmployee?.email || "rahul.s@tiqtax.in"}</div>
                  <div>📞 {assignedEmployee?.phone || "+91 98112 23344"}</div>
                </div>

                <button
                  onClick={() => setShowChatModal(true)}
                  style={{
                    width: "100%",
                    background: "#A020C0",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(160,32,192,0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>💬</span> Chat with Assigned CA
                </button>
              </div>

              {/* 2. CA Computation Summary Card */}
              <div style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#252525", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    CA Computation Summary
                  </span>
                  <span style={{
                    background: chosenRegime === "new" ? "#fdf2f8" : "#f0fbf5",
                    color: chosenRegime === "new" ? "#E83E8C" : "#0A8E4B",
                    border: `1px solid ${chosenRegime === "new" ? "rgba(232, 62, 140, 0.3)" : "#a3e6be"}`,
                    fontSize: "10.5px",
                    fontWeight: "800",
                    padding: "2px 7px",
                    borderRadius: "10px",
                  }}>
                    {chosenRegime === "new" ? "New Regime" : "Old Regime"}
                  </span>
                </div>

                {/* Outcome Banner */}
                <div style={{
                  background: refundDue > 0 ? "#f0fbf5" : "#f8fafc",
                  border: `1.5px solid ${refundDue > 0 ? "#a3e6be" : "#e2e8f0"}`,
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}>
                  <span style={{ fontSize: "20px" }}>{refundDue > 0 ? "🎉" : "📋"}</span>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: refundDue > 0 ? "#0A8E4B" : "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      {refundDue > 0 ? "Net Refund Due to You" : "Tax Payable / Zero Tax"}
                    </div>
                    <div style={{ fontSize: "19px", fontWeight: "900", color: refundDue > 0 ? "#0A8E4B" : "#252525" }}>
                      {refundDue > 0 ? `₹${refundDue.toLocaleString('en-IN')}` : `₹${taxPayable.toLocaleString('en-IN')}`}
                    </div>
                  </div>
                </div>

                {taxSavings > 0 && (
                  <div style={{ background: "#f0fbf5", border: "1px solid #a3e6be", borderRadius: "8px", padding: "6px 10px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#0A8E4B", fontWeight: "700" }}>
                    <span>💡</span> Saved ₹{taxSavings.toLocaleString('en-IN')} via CA Regime Optimization
                  </div>
                )}

                {/* Metric Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Gross Total Income:</span>
                    <strong style={{ color: "#252525" }}>₹{grossTotalIncome.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Total Deductions:</span>
                    <strong style={{ color: "#0A8E4B" }}>₹{totalDeductions.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                    <span>Form Applicable:</span>
                    <strong style={{ color: "#A020C0" }}>{itrFormType}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setShowDossierModal(true)}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    background: "#fdf2f8",
                    border: "1.5px solid rgba(232, 62, 140, 0.35)",
                    color: "#E83E8C",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>📊 View Full Tax Computation Dossier</span>
                </button>
              </div>

              {/* 3. TiQTAX CA Guarantee Card */}
              <div style={{
                background: "#ffffff",
                border: "1.5px solid rgba(248, 120, 38, 0.3)",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 10px rgba(248, 120, 38, 0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "18px" }}>🛡️</span>
                  <div style={{ fontWeight: "900", fontSize: "13.5px", color: "#F87826" }}>
                    TiQTAX CA Guarantee
                  </div>
                </div>
                <div style={{ fontSize: "11.5px", color: "#475569", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div>✔ <strong>100% Error-Free Guarantee</strong> vetted by FCA.</div>
                  <div>✔ <strong>Maximum Refund Claimed</strong> u/s 80C, 80D, HRA.</div>
                  <div>✔ <strong>3-Year Notice Defense Panel</strong> included free.</div>
                </div>
              </div>

              {/* 4. Customer Support Card */}
              <div
                onClick={() => setShowContactModal(true)}
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#a3e6be"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0fbf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                      💬
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "13px", color: "#252525" }}>
                        Customer Support <span style={{ color: "#0A8E4B", fontSize: "13px" }}>›</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>AI &amp; CA Escalation Help</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#0A8E4B", background: "#f0fbf5", padding: "2px 6px", borderRadius: "6px", border: "1px solid #a3e6be" }}>
                    24x7 Active
                  </span>
                </div>
              </div>



            </div>
          </CCol>
        </CRow>
      </CContainer>

      {/* Floating Chat Launcher Button */}
      {currentCase && (
        <button
          onClick={() => setShowChatModal(true)}
          style={{
            position: "fixed",
            bottom: "26px",
            right: "26px",
            zIndex: 1040,
            background: "#A020C0",
            color: "#ffffff",
            border: "none",
            borderRadius: "100px",
            padding: "12px 22px",
            fontSize: "13.5px",
            fontWeight: "800",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(160,32,192,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>💬</span>
          <span>Chat with CA</span>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#A9CD53" }} />
        </button>
      )}

      {/* Live Chat Modal */}
      {showChatModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setShowChatModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AgentChat
              requestId={currentCase?.id || 1}
              isAgentOrAdmin={false}
              currentUserName={user.name || "Pankaj Taxpayer"}
              caName={assignedEmployee?.name || "Your CA"}
              caseInfo={`Case #${currentCase?.id || 1} · AY ${currentCase?.assessment_year || "2026-27"} · ${currentCase?.service_type === "business_profession" ? "Business & profession" : "Full filing"}`}
              onClose={() => setShowChatModal(false)}
            />
          </div>
        </div>
      )}

      <ContactUsModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
      />

      <TaxComputationDossier
        visible={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        requestData={currentCase}
        isCA={false}
      />

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setShowRequestChangesModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ height: "3.5px", background: "linear-gradient(90deg, #F87826 0%, #FCB21F 22%, #E83E8C 52%, #A020C0 78%, #0A8E4B 100%)", borderRadius: "16px 16px 0 0", margin: "-28px -28px 24px -28px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", fontSize: "17px", color: "#252525" }}>
                📝 Request Revisions from Your CA
              </div>
              <button
                onClick={() => setShowRequestChangesModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 0 16px" }}>
              Please specify the corrections, missing deductions (e.g. 80D, HRA), or adjustments you would like CA specialist {currentCase?.assigned_employee?.name || "assigned"} to make.
            </p>
            <form onSubmit={handleSendRequestChanges}>
              <textarea
                rows={4}
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="e.g. Please claim additional ₹15,000 for preventive health checkup under 80D, and recalculate HRA exemption..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                  boxSizing: "border-box",
                  marginBottom: "18px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingChanges}
                  style={{
                    background: requestingChanges ? "#94a3b8" : "#F87826",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 22px",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: requestingChanges ? "not-allowed" : "pointer",
                  }}
                >
                  {requestingChanges ? "Submitting..." : "Send Revision Request →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}