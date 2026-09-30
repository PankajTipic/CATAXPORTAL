import React, { useState } from "react";
import { CModal, CModalBody } from "@coreui/react";
import { useNavigate } from "react-router-dom";

export default function FlowSelectionModal({ visible, onClose, pan }) {
  const navigate = useNavigate();
  const [selectedFlow, setSelectedFlow] = useState(null); // null | 'self' | 'hire_ca'
  const [hovering, setHovering] = useState(null);

  const handleProceed = () => {
    if (!selectedFlow) return;
    if (pan) {
      localStorage.setItem(`preferred_filing_flow_${pan}`, selectedFlow);
    }
    localStorage.setItem("preferred_filing_flow", selectedFlow);
    onClose();
    if (selectedFlow === "hire_ca") {
      navigate("/agent/hire");
    } else {
      navigate("/dashboard");
    }
  };

  const selfFeatures = [
    "Auto-sync with Govt AIS & Form 26AS",
    "New vs Old Regime comparison",
    "Step-by-step guided ITR wizard",
    "Instant refund / tax payable calculation",
    "One-click return submission",
  ];

  const agentFeatures = [
    "Dedicated CA specialist assigned to you",
    "Upload documents — CA handles the rest",
    "Live chat with your assigned CA anytime",
    "Track status: Pending \u2192 Assigned \u2192 Filed",
    "Ideal for complex income / capital gains",
  ];

  const cardStyle = (key) => ({
    flex: 1,
    borderRadius: "16px",
    padding: "28px 24px",
    cursor: "pointer",
    transition: "all 0.22s ease",
    position: "relative",
    overflow: "hidden",
    background: "#ffffff",
    border: selectedFlow === key
      ? key === "self"
        ? "2.5px solid #3b82f6"
        : "2.5px solid #10b981"
      : hovering === key
        ? "2px solid #cbd5e1"
        : "2px solid #e2e8f0",
    boxShadow: selectedFlow === key
      ? key === "self"
        ? "0 0 0 4px rgba(59,130,246,0.1), 0 8px 24px rgba(59,130,246,0.12)"
        : "0 0 0 4px rgba(16,185,129,0.1), 0 8px 24px rgba(16,185,129,0.12)"
      : hovering === key
        ? "0 8px 24px rgba(0,0,0,0.08)"
        : "0 2px 8px rgba(0,0,0,0.05)",
    transform: hovering === key || selectedFlow === key ? "translateY(-3px)" : "none",
  });

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      backdrop="static"
      alignment="center"
    >
      <CModalBody style={{ padding: 0, borderRadius: "16px", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a5f 100%)",
            padding: "32px 40px 28px",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "#94a3b8",
              width: "32px",
              height: "32px",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            &times;
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", flexShrink: 0,
            }}>
              &#127919;
            </div>
            <div>
              <div style={{
                display: "inline-block",
                background: "rgba(56,189,248,0.15)",
                border: "1px solid rgba(56,189,248,0.3)",
                borderRadius: "100px",
                padding: "2px 12px",
                color: "#38bdf8",
                fontSize: "10px",
                fontWeight: "800",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                One-Time Setup
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#fff", margin: 0, letterSpacing: "-0.2px" }}>
                How would you like to file your ITR?
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0", lineHeight: "1.5" }}>
                Your preference will be saved — you won&apos;t be asked again on future logins.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards Section (White Background) ── */}
        <div style={{ background: "#f8fafc", padding: "28px 40px 32px" }}>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

            {/* ── CARD 1: Self Filing ── */}
            <div
              style={cardStyle("self")}
              onClick={() => setSelectedFlow("self")}
              onMouseEnter={() => setHovering("self")}
              onMouseLeave={() => setHovering(null)}
            >
              {/* Top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #3b82f6, #6366f1)" }} />

              {selectedFlow === "self" && (
                <div style={{ position: "absolute", top: "14px", right: "14px", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "100px", letterSpacing: "0.5px" }}>
                  &#10003; Selected
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "linear-gradient(135deg, #eff6ff, #eef2ff)",
                border: "1.5px solid #bfdbfe",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", marginBottom: "16px",
              }}>
                &#9889;
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "100px", padding: "3px 10px", color: "#3b82f6", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                &#9889; Do It Yourself
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "0 0 8px" }}>
                Self-File Your ITR
              </h3>
              <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px" }}>
                Use our guided wizard with auto-fetched AIS and 26AS data. Compare regimes, calculate tax, and file your return in minutes.
              </p>

              <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {selfFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#334155", fontSize: "12.5px" }}>
                    <span style={{ color: "#3b82f6", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{
                width: "100%", padding: "12px", borderRadius: "10px", textAlign: "center",
                background: selectedFlow === "self" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "#eff6ff",
                border: selectedFlow === "self" ? "none" : "1.5px solid #bfdbfe",
                color: selectedFlow === "self" ? "#fff" : "#3b82f6",
                fontSize: "13.5px", fontWeight: "700", transition: "all 0.2s",
              }}>
                {selectedFlow === "self" ? "&#10003; Self-Filing Selected" : "Choose Self-Filing \u2192"}
              </div>
            </div>

            {/* ── CARD 2: Hire CA ── */}
            <div
              style={cardStyle("hire_ca")}
              onClick={() => setSelectedFlow("hire_ca")}
              onMouseEnter={() => setHovering("hire_ca")}
              onMouseLeave={() => setHovering(null)}
            >
              {/* Top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #f59e0b)" }} />

              {/* Badge */}
              <div style={{ position: "absolute", top: "14px", right: "14px", background: selectedFlow === "hire_ca" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "100px", letterSpacing: "0.5px" }}>
                {selectedFlow === "hire_ca" ? "&#10003; Selected" : "&#11088; Recommended"}
              </div>

              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "linear-gradient(135deg, #ecfdf5, #fefce8)",
                border: "1.5px solid #a7f3d0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", marginBottom: "16px",
              }}>
                &#128188;
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "100px", padding: "3px 10px", color: "#10b981", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                &#127775; CA Assisted
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "0 0 8px" }}>
                Hire a CA Agent
              </h3>
              <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px" }}>
                Hand off your taxes to a qualified CA. Ideal for multiple Form 16s, capital gains, business income, or complex deductions.
              </p>

              <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {agentFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#334155", fontSize: "12.5px" }}>
                    <span style={{ color: "#10b981", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{
                width: "100%", padding: "12px", borderRadius: "10px", textAlign: "center",
                background: selectedFlow === "hire_ca" ? "linear-gradient(135deg, #10b981, #059669)" : "#ecfdf5",
                border: selectedFlow === "hire_ca" ? "none" : "1.5px solid #a7f3d0",
                color: selectedFlow === "hire_ca" ? "#fff" : "#10b981",
                fontSize: "13.5px", fontWeight: "700", transition: "all 0.2s",
              }}>
                {selectedFlow === "hire_ca" ? "&#10003; Hire CA Selected" : "Choose Hire a CA \u2192"}
              </div>
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#10b981" }}>&#128274;</span>
              Your preference is saved — no need to choose again on next login.
            </p>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={onClose}
                style={{
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  color: "#64748b",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Decide Later
              </button>

              <button
                onClick={handleProceed}
                disabled={!selectedFlow}
                style={{
                  background: selectedFlow
                    ? selectedFlow === "self"
                      ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "#e2e8f0",
                  border: "none",
                  color: selectedFlow ? "#fff" : "#94a3b8",
                  padding: "10px 28px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: selectedFlow ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  boxShadow: selectedFlow ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                  minWidth: "190px",
                }}
              >
                {!selectedFlow
                  ? "Select an option above"
                  : selectedFlow === "self"
                    ? "Start Self-Filing \u2192"
                    : "Proceed to Hire CA \u2192"}
              </button>
            </div>
          </div>
        </div>
      </CModalBody>
    </CModal>
  );
}
