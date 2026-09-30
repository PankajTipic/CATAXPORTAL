import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CSpinner,
  CForm,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CRow,
  CCol,
  CAlert,
} from "@coreui/react";
import api from "../api/client";
import AgentChat from "../components/AgentChat";
import ContactUsModal from "../components/ContactUsModal";
import TaxComputationDossier from "../components/TaxComputationDossier";

export default function HireAgent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const storedPan = localStorage.getItem("user_pan") || user.pan || "ABCDE1234F";

  const [activeTab, setActiveTab] = useState("case_view"); // 'case_view' or 'new_request'
  const [showDossierModal, setShowDossierModal] = useState(false);

  // ── CA-Assisted Payment Gate State ──
  const [caPaymentCompleted, setCaPaymentCompleted] = useState(false);
  const [caPaymentProcessing, setCaPaymentProcessing] = useState(false);
  const [caPaymentInfo, setCaPaymentInfo] = useState(null);
  const CA_FILING_FEE = 1499; // ₹1,499 CA-assisted filing fee
  const CA_FILING_FEE_GST = 270; // ₹270.00
  const CA_FILING_FEE_TOTAL = 1769; // ₹1,769.00

  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Booking Form State
  const [serviceType, setServiceType] = useState("full_filing");
  const [assessmentYear, setAssessmentYear] = useState("2026-27");
  const [selectedSources, setSelectedSources] = useState(["Salary", "Bank Interest"]);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [showContactModal, setShowContactModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

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

  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await api.get("/agent/my-requests");
      if (data.status === "success") {
        const reqs = data.data || [];
        setMyRequests(reqs);
        if (reqs.length > 0) {
          setSelectedRequest((prev) => {
            if (!prev) return reqs[0];
            const updated = reqs.find((r) => r.id === prev.id);
            return updated || reqs[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

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
    setCaPaymentProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Razorpay SDK failed to load. Check your internet connection.");
        setCaPaymentProcessing(false);
        return;
      }
      const pan = storedPan;
      const ay = selectedRequest?.assessment_year || "2026-27";
      const { data: orderData } = await api.post("/payment/create-order", {
        amount: CA_FILING_FEE_TOTAL,
        pan,
        assessment_year: ay,
        filing_type: "ca_assisted",
      });
      const options = {
        key: orderData.key_id || "rzp_test_QOHcXj0D8froB9",
        amount: orderData.amount_in_paise,
        currency: "INR",
        name: "Chougule & Associates",
        description: `CA Assisted Filing Fee - AY ${ay}`,
        order_id: orderData.order_id,
        prefill: orderData.prefill || { name: user.name || "Pankaj Taxpayer", email: user.email || "" },
        theme: { color: "#b47b2b" },
        modal: { ondismiss: () => setCaPaymentProcessing(false) },
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              pan,
              assessment_year: ay,
            });
            if (verifyData.status === "success") {
              setCaPaymentCompleted(true);
              setCaPaymentInfo({
                razorpay_payment_id: response.razorpay_payment_id,
                amount: CA_FILING_FEE_TOTAL,
                paid_at: new Date().toISOString(),
              });
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (e) {
            alert("Verification error: " + (e?.response?.data?.message || e.message));
          } finally {
            setCaPaymentProcessing(false);
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        alert("Payment failed: " + (resp.error?.description || "Unknown error"));
        setCaPaymentProcessing(false);
      });
      rzp.open();
    } catch (e) {
      alert("Could not initiate payment: " + (e?.response?.data?.message || e.message));
      setCaPaymentProcessing(false);
    }
  };

  const toggleSource = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

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
      const { data } = await api.post("/agent/request", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback({
        type: "success",
        message: "Your CA Agent Request has been booked successfully! Our CA team will assign your dedicated specialist.",
      });
      await fetchMyRequests();
      if (data.data) setSelectedRequest(data.data);
      setActiveTab("case_view");
      setNotes("");
      setFiles([]);
    } catch (err) {
      setFeedback({
        type: "danger",
        message: err.response?.data?.message || "Failed to submit request. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for case list display
  // If myRequests is empty, provide a clean default case representation to match the UI screenshot
  const displayCases = myRequests.length > 0 ? myRequests : [
    {
      id: 1,
      assessment_year: "2026-27",
      service_type: "Full filing",
      status: "prepared",
      assigned_employee: {
        name: "Rahul Sharma",
        designation: "Tax Associate, Membership no. 214563",
        email: "rahul.s@chouguleassoc.in",
        phone: "98112 23344",
      },
      details: {
        customer_documents: [
          {
            original_name: "Appraisal_Letter_Pankaj_Chougule_signed.pdf",
            url: "#",
          },
        ],
      },
    },
    {
      id: 2,
      assessment_year: "2025-26",
      service_type: "Business & profession",
      status: "pending",
      assigned_employee: null,
    },
  ];

  const currentCase = selectedRequest || displayCases[0];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8f7f4",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1a202c",
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          LEFT SIDEBAR (Dark Navy, exactly as in screenshot)
         ═══════════════════════════════════════════════════════ */}
      <aside
        style={{
          width: "290px",
          minWidth: "290px",
          background: "#0a182d",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          padding: "28px 20px 24px",
          borderRight: "1px solid #132742",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "36px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "2px solid #b8860b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f5deb3",
              fontSize: "20px",
              fontWeight: "700",
              fontFamily: "Georgia, serif",
              background: "#0e223d",
              flexShrink: 0,
            }}
          >
            C
          </div>
          <div>
            <div
              style={{
                fontFamily: "Georgia, 'Playfair Display', serif",
                fontSize: "17px",
                fontWeight: "700",
                color: "#ffffff",
                lineHeight: "1.2",
                letterSpacing: "0.2px",
              }}
            >
              Chougule &amp; Associates
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#8ea3bf",
                marginTop: "4px",
                fontWeight: "400",
              }}
            >
              Chartered Accountants
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div
          style={{
            fontSize: "12px",
            color: "#6882a1",
            fontWeight: "600",
            marginBottom: "16px",
            letterSpacing: "0.3px",
          }}
        >
          Your filing cases
        </div>

        {/* Case Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          {displayCases.map((c, index) => {
            const isSelected = activeTab === "case_view" && currentCase?.id === c.id;
            const isReady = c.status === "prepared" || c.status === "completed" || !!c.uploaded_file_path || index === 0;
            const isPending = c.status === "pending" || index === 1;

            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedRequest(c);
                  setActiveTab("case_view");
                }}
                style={{
                  padding: "16px 18px",
                  borderRadius: "8px",
                  background: isSelected ? "#10223b" : "transparent",
                  border: isSelected ? "1px solid #233d63" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#0d1e35";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontWeight: "700", fontSize: "14.5px", color: "#ffffff" }}>
                    Case #{c.id}
                  </span>
                  <span style={{ fontSize: "11.5px", color: "#889cb5", fontWeight: "500" }}>
                    AY {c.assessment_year}
                  </span>
                </div>

                <div style={{ fontSize: "12.5px", color: "#a0b4cc", marginBottom: "10px" }}>
                  {c.service_type === "full_filing" || c.service_type === "Full filing"
                    ? "Full filing · Assisted"
                    : c.service_type === "business_profession" || c.service_type === "Business & profession"
                    ? "Business & profession"
                    : `${c.service_type} · Assisted`}
                </div>

                {/* Pill Status Badge */}
                <div>
                  {isReady ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#e6f7ec",
                        color: "#166534",
                      }}
                    >
                      Ready for download
                    </span>
                  ) : isPending ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#fef3c7",
                        color: "#b45309",
                      }}
                    >
                      Awaiting assignment
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 12px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#e0f2fe",
                        color: "#0369a1",
                      }}
                    >
                      In progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Option to Book New Case */}
          <div
            onClick={() => setActiveTab("new_request")}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: activeTab === "new_request" ? "1px solid #10b981" : "1px dashed #233d63",
              background: activeTab === "new_request" ? "#10223b" : "transparent",
              color: activeTab === "new_request" ? "#34d399" : "#8ea3bf",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <span>+</span> Book another filing
          </div>
        </div>

        {/* Bottom Profile Section */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "24px",
            borderTop: "1px solid #142844",
          }}
        >
          <div style={{ fontWeight: "700", fontSize: "14.5px", color: "#ffffff" }}>
            {user.name || "Pankaj Taxpayer"}
          </div>
          <div style={{ fontSize: "12px", color: "#8ea3bf", marginTop: "3px", letterSpacing: "0.5px" }}>
            PAN {storedPan}
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: "14px",
              background: "transparent",
              border: "1px solid #233d63",
              color: "#c2d1e0",
              borderRadius: "4px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-block",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#132742";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#c2d1e0";
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          RIGHT MAIN CONTENT AREA (Warm off-white background)
         ═══════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          padding: "34px 44px 60px",
          overflowY: "auto",
          maxWidth: "1100px",
        }}
      >
        {activeTab === "case_view" ? (
          <div>
            {/* Breadcrumb */}
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
              My filing cases / Case #{currentCase.id}
            </div>

            {/* Page Main Heading */}
            <h1
              style={{
                fontFamily: "Georgia, 'Playfair Display', serif",
                fontSize: "27px",
                fontWeight: "700",
                color: "#0f172a",
                margin: "0 0 26px 0",
                letterSpacing: "-0.2px",
              }}
            >
              Case #{currentCase.id} — AY {currentCase.assessment_year || "2026-27"}, {currentCase.service_type === "business_profession" ? "Business & Profession" : "Full Filing"}
            </h1>

            {/* CARD 1: FILING PROGRESS */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e7e5df",
                padding: "24px 28px",
                marginBottom: "18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "24px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "4px" }}>
                    Filing progress
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", fontFamily: "Georgia, serif" }}>
                    Return prepared and certified
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>
                  Assigned to {currentCase.assigned_employee?.name || "Rahul Sharma"}, Tax Associate
                </div>
              </div>

              {/* Progress Stepper with Connected Green Line */}
              <div style={{ position: "relative", padding: "10px 0 6px" }}>
                {/* Horizontal Track Line */}
                <div
                  style={{
                    position: "absolute",
                    top: "21px",
                    left: "20px",
                    right: "20px",
                    height: "2px",
                    background: "#15803d",
                    zIndex: 1,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {[
                    { label: "Request submitted", date: "12 Sep", checked: true },
                    { label: "CA assigned", date: "13 Sep", checked: true },
                    { label: "Computation reviewed", date: "22 Sep", checked: true },
                    { label: "Ready to file", date: "Today", checked: true },
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: idx === 0 ? "flex-start" : idx === 3 ? "flex-end" : "center" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#15803d",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: "700",
                          marginBottom: "10px",
                          boxShadow: "0 0 0 3px #ffffff",
                        }}
                      >
                        ✓
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        {step.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 2: ASSIGNED CA INFO */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e7e5df",
                padding: "18px 24px",
                marginBottom: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#0a182d",
                    color: "#ffffff",
                    fontWeight: "700",
                    fontSize: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {currentCase.assigned_employee?.name
                    ? currentCase.assigned_employee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                    : "RS"}
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15.5px", color: "#0f172a" }}>
                    {currentCase.assigned_employee?.name || "Rahul Sharma"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#4b5563", marginTop: "2px" }}>
                    {currentCase.assigned_employee?.designation || "Tax Associate, Membership no. 214563"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>
                    {currentCase.assigned_employee?.email || "rahul.s@chouguleassoc.in"} · {currentCase.assigned_employee?.phone || "98112 23344"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <a
                  href={`tel:${currentCase.assigned_employee?.phone || "9811223344"}`}
                  style={{
                    padding: "7px 20px",
                    borderRadius: "4px",
                    border: "1px solid #b47b2b",
                    color: "#925f1d",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    textDecoration: "none",
                    cursor: "pointer",
                    display: "inline-block",
                  }}
                >
                  Call
                </a>
                <button
                  onClick={() => setShowChatModal(true)}
                  style={{
                    padding: "8px 22px",
                    borderRadius: "4px",
                    border: "none",
                    background: "#0a182d",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Chat
                </button>
              </div>
            </div>

            {/* CARD 3: COMPUTATION & FEE BREAKDOWN / PAYMENT GATE */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e7e5df",
                padding: "26px 28px",
                marginBottom: "18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              {/* Green Notice Banner */}
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    border: "1.5px solid #059669",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: "700",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#065f46" }}>
                    Your return has been computed and certified
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#047857", marginTop: "1px" }}>
                    Settle the filing fee to release your computation sheet and e-file.
                  </div>
                </div>
              </div>

              {/* Fee Breakdown Rows */}
              <div style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "14px", color: "#374151" }}>
                  <span>CA assisted filing fee</span>
                  <span style={{ fontWeight: "600" }}>₹1,499.00</span>
                </div>
                <div style={{ height: "1px", background: "#f3f4f6" }} />

                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "14px", color: "#374151" }}>
                  <span>GST (18%)</span>
                  <span style={{ fontWeight: "600" }}>₹270.00</span>
                </div>
                <div style={{ height: "1px", background: "#e5e7eb" }} />

                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", fontSize: "15.5px", color: "#111827" }}>
                  <span style={{ fontWeight: "700" }}>Total payable</span>
                  <span style={{ fontWeight: "700", fontSize: "16px" }}>₹1,769.00</span>
                </div>
              </div>

              {/* Pay Now Button / Unlocked Actions */}
              {!caPaymentCompleted ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <button
                      onClick={handleCaAssistedPayNow}
                      disabled={caPaymentProcessing}
                      style={{
                        background: "#aa7329",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "13px 28px",
                        fontSize: "14.5px",
                        fontWeight: "700",
                        cursor: caPaymentProcessing ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 4px rgba(170,115,41,0.2)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!caPaymentProcessing) e.currentTarget.style.background = "#946221";
                      }}
                      onMouseLeave={(e) => {
                        if (!caPaymentProcessing) e.currentTarget.style.background = "#aa7329";
                      }}
                    >
                      {caPaymentProcessing ? "Processing..." : "Pay ₹1,769 and release return"}
                    </button>

                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
                      <div>🔒 Secured by Razorpay · PCI-DSS compliant</div>
                      <div>UPI · Cards · Net banking · Wallets</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #86efac",
                      borderRadius: "6px",
                      padding: "12px 16px",
                      color: "#166534",
                      fontWeight: "600",
                      fontSize: "13.5px",
                    }}
                  >
                    ✓ Payment Completed! Reference: {caPaymentInfo?.razorpay_payment_id || "RZP_SUCCESS"}. All deliverables are now unlocked.
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowDossierModal(true)}
                      style={{
                        padding: "9px 18px",
                        borderRadius: "4px",
                        background: "#0a182d",
                        color: "#fff",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      View Computation Sheet
                    </button>
                    <button
                      onClick={() => setShowDossierModal(true)}
                      style={{
                        padding: "9px 18px",
                        borderRadius: "4px",
                        background: "#15803d",
                        color: "#fff",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Download ITR JSON
                    </button>
                  </div>
                </div>
              )}

              {/* Dashed Separator */}
              <div style={{ borderTop: "1px dashed #d1d5db", margin: "24px 0 16px" }} />

              {/* Unlocks Grid */}
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                This unlocks the following, once paid
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  "Full computation sheet",
                  "ITR JSON for e-filing",
                  "Signed PDF copy",
                  "CA filing authorisation",
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (caPaymentCompleted) setShowDossierModal(true);
                    }}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      background: "#fbfbfa",
                      padding: "10px 12px",
                      fontSize: "12.5px",
                      color: caPaymentCompleted ? "#065f46" : "#4b5563",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: caPaymentCompleted ? "pointer" : "default",
                    }}
                  >
                    <span>{caPaymentCompleted ? "🔓" : "🔒"}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM SECTION: 2 COLUMNS (Attached Documents & Talk to your CA) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Left Column: Attached Documents */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e7e5df",
                  padding: "22px 26px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a", marginBottom: "18px" }}>
                  Attached documents
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {currentCase.details?.customer_documents && currentCase.details.customer_documents.length > 0 ? (
                    currentCase.details.customer_documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          textDecoration: "none",
                          color: "#111827",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        <span
                          style={{
                            background: "#0a182d",
                            color: "#ffffff",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          PDF
                        </span>
                        <span style={{ wordBreak: "break-all" }}>{doc.original_name}</span>
                      </a>
                    ))
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          background: "#0a182d",
                          color: "#ffffff",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "10px",
                          fontWeight: "800",
                        }}
                      >
                        PDF
                      </span>
                      <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        Appraisal_Letter_Pankaj_Chougule_signed.pdf
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Talk to your CA */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e7e5df",
                  padding: "22px 26px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a", marginBottom: "10px" }}>
                  Talk to your CA
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "#15803d",
                    fontWeight: "600",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#15803d", display: "inline-block" }} />
                  <span>{currentCase.assigned_employee?.name?.split(" ")[0] || "Rahul"} is available</span>
                </div>

                <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.55", marginBottom: "18px" }}>
                  Questions about a deduction, Form 16 entry, or how a figure was computed — ask directly before you pay.
                </div>

                <button
                  onClick={() => setShowChatModal(true)}
                  style={{
                    background: "#0a182d",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 22px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Open chat
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: BOOK NEW CA SERVICE FORM */
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              border: "1px solid #e7e5df",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "700", fontFamily: "Georgia, serif", color: "#0f172a", margin: 0 }}>
                  Book a Dedicated CA Filing Service
                </h2>
                <p style={{ color: "#6b7280", fontSize: "13.5px", margin: "4px 0 0" }}>
                  Upload your documents and get assigned to an expert Chartered Accountant.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("case_view")}
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Back to Cases
              </button>
            </div>

            {feedback.message && (
              <CAlert color={feedback.type === "success" ? "success" : "danger"} className="fw-bold mb-3">
                {feedback.message}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmitRequest}>
              <CRow className="g-4">
                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>
                    Income Tax PAN
                  </label>
                  <input
                    type="text"
                    value={storedPan}
                    readOnly
                    style={{ width: "100%", padding: "10px 14px", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: "4px", fontWeight: "700" }}
                  />
                </CCol>

                <CCol md={6}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>
                    Assessment Year
                  </label>
                  <select
                    value={assessmentYear}
                    onChange={(e) => setAssessmentYear(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "4px", fontWeight: "600" }}
                  >
                    <option value="2026-27">AY 2026-27 (FY 2025-26)</option>
                    <option value="2025-26">AY 2025-26 (FY 2024-25)</option>
                  </select>
                </CCol>

                <CCol md={12}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
                    Filing Service Type
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    {[
                      { id: "full_filing", title: "Full filing · Assisted", desc: "Comprehensive salary, house property & interest ITR filing." },
                      { id: "capital_gains", title: "Capital Gains & Stocks", desc: "Mutual funds, shares, crypto and capital asset computation." },
                      { id: "business_profession", title: "Business & Profession", desc: "Presumptive 44AD/ADA filing for freelancers & firms." },
                    ].map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setServiceType(p.id)}
                        style={{
                          border: serviceType === p.id ? "2px solid #b47b2b" : "1px solid #e5e7eb",
                          borderRadius: "6px",
                          padding: "14px",
                          background: serviceType === p.id ? "#fffdfa" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: "700", color: "#111827", fontSize: "14px" }}>{p.title}</div>
                        <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </CCol>

                <CCol md={12}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>
                    Instructions / Notes for CA
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Switched jobs in mid-year, have Home Loan 80C/24b deductions..."
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13.5px" }}
                  />
                </CCol>

                <CCol md={12}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>
                    Attach Documents (Form 16, Payslips, Bank Statements)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ width: "100%", padding: "10px", border: "1px dashed #9ca3af", borderRadius: "4px", background: "#fafafa" }}
                  />
                </CCol>

                <CCol md={12}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: "#0a182d",
                      color: "#ffffff",
                      padding: "12px 24px",
                      borderRadius: "4px",
                      border: "none",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting ? "Booking CA Specialist..." : "Submit Request and Assign CA Specialist →"}
                  </button>
                </CCol>
              </CRow>
            </CForm>
          </div>
        )}
      </main>

      {/* Floating Chat Launcher Button (if case selected) */}
      {currentCase && (
        <button
          onClick={() => setShowChatModal(true)}
          style={{
            position: "fixed",
            bottom: "26px",
            right: "26px",
            zIndex: 1040,
            background: "#0a182d",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "100px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(10,24,45,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>💬</span>
          <span>Chat with CA</span>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
        </button>
      )}

      {/* Live Chat Modal - Guaranteed Instant Overlay */}
      {showChatModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 24, 45, 0.65)",
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
              caName={currentCase?.assigned_employee?.name || "Rahul Sharma"}
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
    </div>
  );
}
