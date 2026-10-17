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
    background: selectedFlow === key
      ? key === "self" ? "#fffdfa" : "#fbfdfc"
      : "#ffffff",
    border: selectedFlow === key
      ? key === "self"
        ? "1.5px solid #fcd34d"
        : "1.5px solid #86efac"
      : hovering === key
        ? "1.5px solid #cbd5e1"
        : "1.5px solid #e2e8f0",
    boxShadow: selectedFlow === key
      ? key === "self"
        ? "0 0 0 3px rgba(250,160,28,0.08), 0 8px 24px rgba(250,160,28,0.06)"
        : "0 0 0 3px rgba(0,155,98,0.08), 0 8px 24px rgba(0,155,98,0.06)"
      : hovering === key
        ? "0 8px 24px rgba(0,0,0,0.04)"
        : "0 2px 8px rgba(0,0,0,0.02)",
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

        {/* TiQTAX Signature Logo Gradient Top Stripe */}
        <div style={{ height: "3.5px", background: "linear-gradient(90deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", width: "100%" }} />

        {/* ── Header ── */}
        <div
          style={{
            background: "#ffffff",
            padding: "28px 40px 24px",
            position: "relative",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "18px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              color: "#64748b",
              width: "32px",
              height: "32px",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
              e.currentTarget.style.color = "#1E293B";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            &times;
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "rgba(250, 160, 28, 0.09)",
              border: "1px solid rgba(250, 160, 28, 0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", flexShrink: 0,
            }}>
              &#127919;
            </div>
            <div>
              <div style={{
                display: "inline-block",
                background: "rgba(240, 33, 134, 0.08)",
                border: "1px solid rgba(240, 33, 134, 0.2)",
                borderRadius: "100px",
                padding: "2px 12px",
                color: "#c026d3",
                fontSize: "10.5px",
                fontWeight: "800",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}>
                One-Time Setup
              </div>
              <h2 style={{ fontSize: "21px", fontWeight: "900", color: "#1E293B", margin: 0, letterSpacing: "-0.2px" }}>
                How would you like to file your ITR?
              </h2>
              <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0 0", lineHeight: "1.5" }}>
                Your preference will be saved — you won&apos;t be asked again on future logins.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards Section (Clean White Background) ── */}
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
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(250, 160, 28, 0.5), rgba(240, 91, 94, 0.5))" }} />

              {selectedFlow === "self" && (
                <div style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(250, 160, 28, 0.12)", border: "1px solid rgba(250, 160, 28, 0.3)", color: "#b45309", fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "100px", letterSpacing: "0.5px" }}>
                  &#10003; Selected
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "rgba(250, 160, 28, 0.09)",
                border: "1px solid rgba(250, 160, 28, 0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", marginBottom: "16px",
              }}>
                &#9889;
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(250, 160, 28, 0.08)", border: "1px solid rgba(250, 160, 28, 0.22)", borderRadius: "100px", padding: "3px 10px", color: "#b45309", fontSize: "10.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                &#9889; Do It Yourself
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1E293B", margin: "0 0 8px" }}>
                Self-File Your ITR
              </h3>
              <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px" }}>
                Use our guided wizard with auto-fetched AIS and 26AS data. Compare regimes, calculate tax, and file your return in minutes.
              </p>

              <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {selfFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#334155", fontSize: "12.5px" }}>
                    <span style={{ color: "#d97706", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{
                width: "100%", padding: "12px", borderRadius: "10px", textAlign: "center",
                background: selectedFlow === "self" ? "linear-gradient(135deg, #f59e0b, #ec4899)" : "rgba(250, 160, 28, 0.06)",
                border: selectedFlow === "self" ? "none" : "1px solid rgba(250, 160, 28, 0.22)",
                color: selectedFlow === "self" ? "#fff" : "#b45309",
                fontSize: "13px", fontWeight: "700", transition: "all 0.2s",
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
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(0, 155, 98, 0.5), rgba(168, 207, 69, 0.5))" }} />

              {/* Badge */}
              <div style={{
                position: "absolute", top: "14px", right: "14px",
                background: selectedFlow === "hire_ca" ? "rgba(0, 155, 98, 0.12)" : "rgba(250, 160, 28, 0.1)",
                border: selectedFlow === "hire_ca" ? "1px solid rgba(0, 155, 98, 0.25)" : "1px solid rgba(250, 160, 28, 0.25)",
                color: selectedFlow === "hire_ca" ? "#15803d" : "#b45309",
                fontSize: "10px", fontWeight: "800", padding: "3px 10px", borderRadius: "100px", letterSpacing: "0.5px"
              }}>
                {selectedFlow === "hire_ca" ? "&#10003; Selected" : "⭐ Recommended"}
              </div>

              {/* Icon */}
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "rgba(0, 155, 98, 0.09)",
                border: "1px solid rgba(0, 155, 98, 0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", marginBottom: "16px",
              }}>
                &#128188;
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(0, 155, 98, 0.08)", border: "1px solid rgba(0, 155, 98, 0.22)", borderRadius: "100px", padding: "3px 10px", color: "#15803d", fontSize: "10.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                &#127775; CA Assisted
              </div>

              <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1E293B", margin: "0 0 8px" }}>
                Hire a CA Agent
              </h3>
              <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.6", margin: "0 0 16px" }}>
                Hand off your taxes to a qualified CA. Ideal for multiple Form 16s, capital gains, business income, or complex deductions.
              </p>

              <ul style={{ padding: 0, margin: "0 0 20px", listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {agentFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#334155", fontSize: "12.5px" }}>
                    <span style={{ color: "#15803d", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{
                width: "100%", padding: "12px", borderRadius: "10px", textAlign: "center",
                background: selectedFlow === "hire_ca" ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(0, 155, 98, 0.06)",
                border: selectedFlow === "hire_ca" ? "none" : "1px solid rgba(0, 155, 98, 0.22)",
                color: selectedFlow === "hire_ca" ? "#fff" : "#15803d",
                fontSize: "13px", fontWeight: "700", transition: "all 0.2s",
              }}>
                {selectedFlow === "hire_ca" ? "&#10003; Hire CA Selected" : "Choose Hire a CA \u2192"}
              </div>
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div style={{ marginTop: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#15803d" }}>&#128274;</span>
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
                      ? "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
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
                  boxShadow: selectedFlow ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
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
