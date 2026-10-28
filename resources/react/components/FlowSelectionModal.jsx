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
    borderRadius: "14px",
    padding: "16px 16px 14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
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
        ? "0 0 0 3px rgba(250,160,28,0.08), 0 6px 16px rgba(250,160,28,0.06)"
        : "0 0 0 3px rgba(0,155,98,0.08), 0 6px 16px rgba(0,155,98,0.06)"
      : hovering === key
        ? "0 6px 16px rgba(0,0,0,0.04)"
        : "0 2px 6px rgba(0,0,0,0.02)",
    transform: hovering === key || selectedFlow === key ? "translateY(-2px)" : "none",
  });

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="lg"
      backdrop="static"
      alignment="center"
      className="flow-modal-dialog-root"
    >
      <style>{`
        .flow-modal-dialog-root .modal-dialog {
          max-width: 780px;
          margin: 1.25rem auto;
        }
        .flow-modal-body {
          padding: 0;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
        }
        .flow-modal-header {
          background: #ffffff;
          padding: 14px 22px 12px;
          position: relative;
          border-bottom: 1px solid #e2e8f0;
        }
        .flow-modal-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-right: 32px;
        }
        .flow-cards-container {
          background: #f8fafc;
          padding: 16px 20px 14px;
        }
        .flow-cards-wrap {
          display: flex;
          gap: 14px;
          align-items: stretch;
        }
        .flow-card-item {
          min-width: 260px;
        }
        .flow-footer-wrap {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }
        .flow-footer-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        /* ── Mobile Responsiveness (Phones & Small Screens) ── */
        @media (max-width: 640px) {
          .flow-modal-dialog-root .modal-dialog {
            margin: 8px auto !important;
            max-width: calc(100% - 16px) !important;
          }
          .flow-modal-body {
            max-height: 92vh !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .flow-modal-header {
            padding: 12px 14px 10px !important;
          }
          .flow-modal-header-content {
            padding-right: 28px !important;
            gap: 10px !important;
          }
          .flow-header-title {
            font-size: 14.5px !important;
            line-height: 1.25 !important;
          }
          .flow-header-subtitle {
            font-size: 11px !important;
            line-height: 1.35 !important;
          }
          .flow-header-icon {
            width: 32px !important;
            height: 32px !important;
            font-size: 16px !important;
          }
          .flow-cards-container {
            padding: 10px 10px 12px !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            flex: 1 1 auto !important;
          }
          .flow-cards-wrap {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .flow-card-item {
            min-width: 100% !important;
            width: 100% !important;
            padding: 12px 12px 10px !important;
          }
          .flow-card-title {
            font-size: 14px !important;
          }
          .flow-card-desc {
            font-size: 11px !important;
            line-height: 1.35 !important;
            margin-bottom: 8px !important;
          }
          .flow-card-list {
            margin-bottom: 10px !important;
            gap: 3px !important;
          }
          .flow-card-list li {
            font-size: 10.5px !important;
            gap: 5px !important;
          }
          .flow-card-action-btn {
            padding: 7px 10px !important;
            font-size: 11px !important;
          }
          .flow-footer-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            margin-top: 8px !important;
            padding-top: 8px !important;
          }
          .flow-footer-note {
            text-align: center !important;
            justify-content: center !important;
            font-size: 10.5px !important;
          }
          .flow-footer-buttons {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
          }
          .flow-footer-btn-later {
            flex: 1 !important;
            padding: 7px 10px !important;
            font-size: 11px !important;
            text-align: center !important;
          }
          .flow-footer-btn-proceed {
            flex: 2 !important;
            min-width: 0 !important;
            padding: 7px 12px !important;
            font-size: 11.5px !important;
            text-align: center !important;
          }
        }
      `}</style>

      <CModalBody className="flow-modal-body">

        {/* TiQTAX Signature Logo Gradient Top Stripe */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #FAA01C 0%, #F02186 50%, #A600B8 100%)", width: "100%" }} />

        {/* ── Header ── */}
        <div className="flow-modal-header">
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "14px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              color: "#64748b",
              width: "26px",
              height: "26px",
              fontSize: "16px",
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

          <div className="flow-modal-header-content">
            <div
              className="flow-header-icon"
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "rgba(250, 160, 28, 0.09)",
                border: "1px solid rgba(250, 160, 28, 0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", flexShrink: 0,
              }}
            >
              &#127919;
            </div>
            <div>
              <div style={{
                display: "inline-block",
                background: "rgba(240, 33, 134, 0.08)",
                border: "1px solid rgba(240, 33, 134, 0.2)",
                borderRadius: "100px",
                padding: "1px 8px",
                color: "#c026d3",
                fontSize: "9.5px",
                fontWeight: "800",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}>
                One-Time Setup
              </div>
              <h2 className="flow-header-title" style={{ fontSize: "16px", fontWeight: "900", color: "#1E293B", margin: 0, letterSpacing: "-0.2px" }}>
                How would you like to file your ITR?
              </h2>
              <p className="flow-header-subtitle" style={{ color: "#64748b", fontSize: "11.5px", margin: "2px 0 0", lineHeight: "1.4" }}>
                Your preference will be saved — you won&apos;t be asked again on future logins.
              </p>
            </div>
          </div>
        </div>

        {/* ── Cards Section (Clean White Background) ── */}
        <div className="flow-cards-container">

          <div className="flow-cards-wrap">

            {/* ── CARD 1: Self Filing ── */}
            <div
              className="flow-card-item"
              style={cardStyle("self")}
              onClick={() => setSelectedFlow("self")}
              onMouseEnter={() => setHovering("self")}
              onMouseLeave={() => setHovering(null)}
            >
              {/* Top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(250, 160, 28, 0.5), rgba(240, 91, 94, 0.5))" }} />

              <div>
                {/* Top header row: Icon + DIY Badge on left, Selected badge on right */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "9px",
                      background: "rgba(250, 160, 28, 0.1)",
                      border: "1px solid rgba(250, 160, 28, 0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "17px", flexShrink: 0,
                    }}>
                      &#9889;
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      background: "rgba(250, 160, 28, 0.08)",
                      border: "1px solid rgba(250, 160, 28, 0.22)",
                      borderRadius: "100px", padding: "2px 8px",
                      color: "#b45309", fontSize: "10px", fontWeight: "800",
                      textTransform: "uppercase", letterSpacing: "0.4px",
                    }}>
                      Do It Yourself
                    </div>
                  </div>

                  {selectedFlow === "self" && (
                    <div style={{
                      background: "rgba(250, 160, 28, 0.12)",
                      border: "1px solid rgba(250, 160, 28, 0.3)",
                      color: "#b45309", fontSize: "9.5px", fontWeight: "800",
                      padding: "2px 7px", borderRadius: "100px", letterSpacing: "0.4px",
                    }}>
                      &#10003; Selected
                    </div>
                  )}
                </div>

                <h3 className="flow-card-title" style={{ fontSize: "15px", fontWeight: "900", color: "#1E293B", margin: "0 0 3px" }}>
                  Self-File Your ITR
                </h3>
                <p className="flow-card-desc" style={{ color: "#64748b", fontSize: "11.5px", lineHeight: "1.4", margin: "0 0 10px" }}>
                  Use our guided wizard with auto-fetched AIS and 26AS data. Compare regimes, calculate tax, and file your return in minutes.
                </p>

                <ul className="flow-card-list" style={{ padding: 0, margin: "0 0 12px", listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selfFeatures.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#334155", fontSize: "11px", lineHeight: "1.3" }}>
                      <span style={{ color: "#d97706", marginTop: "1px", flexShrink: 0, fontWeight: "bold", fontSize: "11px" }}>&#10003;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div
                className="flow-card-action-btn"
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: "8px", textAlign: "center",
                  background: selectedFlow === "self" ? "linear-gradient(135deg, #f59e0b, #ec4899)" : "rgba(250, 160, 28, 0.06)",
                  border: selectedFlow === "self" ? "none" : "1px solid rgba(250, 160, 28, 0.22)",
                  color: selectedFlow === "self" ? "#fff" : "#b45309",
                  fontSize: "11.5px", fontWeight: "700", transition: "all 0.2s",
                }}
              >
                {selectedFlow === "self" ? "&#10003; Self-Filing Selected" : "Choose Self-Filing \u2192"}
              </div>
            </div>

            {/* ── CARD 2: Hire CA ── */}
            <div
              className="flow-card-item"
              style={cardStyle("hire_ca")}
              onClick={() => setSelectedFlow("hire_ca")}
              onMouseEnter={() => setHovering("hire_ca")}
              onMouseLeave={() => setHovering(null)}
            >
              {/* Top accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(0, 155, 98, 0.5), rgba(168, 207, 69, 0.5))" }} />

              <div>
                {/* Top header row: Icon + CA Assisted Badge on left, Recommended/Selected badge on right */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "9px",
                      background: "rgba(0, 155, 98, 0.1)",
                      border: "1px solid rgba(0, 155, 98, 0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "17px", flexShrink: 0,
                    }}>
                      &#128188;
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      background: "rgba(0, 155, 98, 0.08)",
                      border: "1px solid rgba(0, 155, 98, 0.22)",
                      borderRadius: "100px", padding: "2px 8px",
                      color: "#15803d", fontSize: "10px", fontWeight: "800",
                      textTransform: "uppercase", letterSpacing: "0.4px",
                    }}>
                      CA Assisted
                    </div>
                  </div>

                  <div style={{
                    background: selectedFlow === "hire_ca" ? "rgba(0, 155, 98, 0.12)" : "rgba(250, 160, 28, 0.1)",
                    border: selectedFlow === "hire_ca" ? "1px solid rgba(0, 155, 98, 0.25)" : "1px solid rgba(250, 160, 28, 0.25)",
                    color: selectedFlow === "hire_ca" ? "#15803d" : "#b45309",
                    fontSize: "9.5px", fontWeight: "800", padding: "2px 7px", borderRadius: "100px", letterSpacing: "0.4px"
                  }}>
                    {selectedFlow === "hire_ca" ? "&#10003; Selected" : "\u2B50 Recommended"}
                  </div>
                </div>

                <h3 className="flow-card-title" style={{ fontSize: "15px", fontWeight: "900", color: "#1E293B", margin: "0 0 3px" }}>
                  Hire a CA Agent
                </h3>
                <p className="flow-card-desc" style={{ color: "#64748b", fontSize: "11.5px", lineHeight: "1.4", margin: "0 0 10px" }}>
                  Hand off your taxes to a qualified CA. Ideal for multiple Form 16s, capital gains, business income, or complex deductions.
                </p>

                <ul className="flow-card-list" style={{ padding: 0, margin: "0 0 12px", listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {agentFeatures.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#334155", fontSize: "11px", lineHeight: "1.3" }}>
                      <span style={{ color: "#15803d", marginTop: "1px", flexShrink: 0, fontWeight: "bold", fontSize: "11px" }}>&#10003;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div
                className="flow-card-action-btn"
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: "8px", textAlign: "center",
                  background: selectedFlow === "hire_ca" ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(0, 155, 98, 0.06)",
                  border: selectedFlow === "hire_ca" ? "none" : "1px solid rgba(0, 155, 98, 0.22)",
                  color: selectedFlow === "hire_ca" ? "#fff" : "#15803d",
                  fontSize: "11.5px", fontWeight: "700", transition: "all 0.2s",
                }}
              >
                {selectedFlow === "hire_ca" ? "&#10003; Hire CA Selected" : "Choose Hire a CA \u2192"}
              </div>
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="flow-footer-wrap">
            <p className="flow-footer-note" style={{ margin: 0, color: "#64748b", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "#15803d" }}>&#128274;</span>
              Your preference is saved — no need to choose again on next login.
            </p>

            <div className="flow-footer-buttons">
              <button
                onClick={onClose}
                className="flow-footer-btn-later"
                style={{
                  background: "#fff",
                  border: "1.5px solid #e2e8f0",
                  color: "#64748b",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Decide Later
              </button>

              <button
                onClick={handleProceed}
                disabled={!selectedFlow}
                className="flow-footer-btn-proceed"
                style={{
                  background: selectedFlow
                    ? selectedFlow === "self"
                      ? "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
                      : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "#e2e8f0",
                  border: "none",
                  color: selectedFlow ? "#fff" : "#94a3b8",
                  padding: "6px 18px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: selectedFlow ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  boxShadow: selectedFlow ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                  minWidth: "155px",
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
