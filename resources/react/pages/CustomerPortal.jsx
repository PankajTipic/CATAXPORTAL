import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import logo from "../../../public/LOGO1.png";

export default function CustomerPortal() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userPan = user.pan || localStorage.getItem("user_pan");
  const [hoveredCard, setHoveredCard] = useState(null);

  // If user already chose their filing track once, route directly! No switching allowed.
  useEffect(() => {
    const preferredFlow = userPan ? localStorage.getItem(`preferred_filing_flow_${userPan}`) : null;

    if (preferredFlow === "hire_ca" || preferredFlow === "agent") {
      navigate("/agent/hire", { replace: true });
    } else if (preferredFlow === "self") {
      navigate("/dashboard", { replace: true });
    }
  }, [userPan]);

  const handleSelectFlow = (flow) => {
    // Save the choice for this specific PAN
    if (userPan) {
      localStorage.setItem(`preferred_filing_flow_${userPan}`, flow);
    }
    localStorage.setItem("preferred_filing_flow", flow);
    if (flow === "hire_ca" || flow === "agent") {
      navigate("/agent/hire");
    } else {
      navigate("/dashboard");
    }
  };

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

  const selfFeatures = [
    "Original, Belated (139(4)) & Updated (ITR-U) returns",
    "Auto-sync with Govt AIS and 26AS records",
    "New vs Old Regime comparison",
    "Step-by-step guided ITR wizard",
    "Instant refund / payable calculation",
    "Download computation as PDF / JSON",
  ];

  const agentFeatures = [
    "Dedicated CA specialist assigned to you",
    "Upload docs and let the CA handle the rest",
    "Live chat with your assigned CA anytime",
    "Track status: Pending \u2192 Assigned \u2192 Prepared",
    "Download your finalized ITR from portal",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(110deg, #FFF0E5 0%, #FFF8DF 25%, #FCEAF2 50%, #F3E8FA 72%, #E8F5EC 100%)",
        backgroundAttachment: "fixed",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TiQTAX Signature Logo Gradient Top Stripe */}
      <div style={{ height: "3.5px", background: "linear-gradient(90deg, #F87826 0%, #FCB21F 22%, #E83E8C 52%, #A020C0 78%, #0A8E4B 100%)", width: "100%" }} />

      {/* Top Navbar */}
      <nav
        className="customer-portal-nav"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={logo}
            alt="TiQTAX"
            style={{
              height: "38px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/notices")}
            style={{
              background: "rgba(250, 160, 28, 0.08)",
              border: "1px solid rgba(250, 160, 28, 0.3)",
              color: "#b45309",
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            🏛️ Govt ITD Notices
          </button>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "700", color: "#1E293B", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>&#128100;</span>
              {user.name || "Taxpayer"}
            </div>
            <div className="customer-portal-user-email" style={{ fontSize: "11px", color: "#64748B" }}>
              {user.email || ""}{user.pan ? " \u2022 PAN: " + user.pan : ""}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(240, 91, 94, 0.08)",
              border: "1px solid rgba(240, 91, 94, 0.25)",
              color: "#e11d48",
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>&#128682;</span> Logout
          </button>
        </div>
      </nav>

      {/* Main Content - Medium Size Single View */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px 24px",
          minHeight: "calc(100vh - 65px)",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(240, 33, 134, 0.08)",
              border: "1px solid rgba(240, 33, 134, 0.2)",
              borderRadius: "100px",
              padding: "4px 14px",
              color: "#c026d3",
              fontSize: "11px",
              fontWeight: "800",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            &#128197; Financial Year 2025-26 &middot; AY 2026-27
          </div>
          <h1
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: "900",
              color: "#1E293B",
              margin: "0 0 6px",
              lineHeight: "1.2",
            }}
          >
            Welcome back, {user.name ? user.name.split(" ")[0] : "Taxpayer"} &#128075;
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "#64748B",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: "1.45",
            }}
          >
            Choose how you would like to file your Income Tax Return this year.
            Both paths are completely separate and secure.
          </p>
        </div>

        {/* Flow Cards */}
        <style>{`
          @media (max-width: 640px) {
            .customer-portal-nav {
              padding: 10px 14px !important;
              gap: 8px !important;
            }
            .customer-portal-user-email {
              display: none !important;
            }
            .customer-flow-card {
              padding: 16px 14px !important;
              border-radius: 14px !important;
            }
          }
        `}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "16px",
            maxWidth: "820px",
            width: "100%",
          }}
        >
          {/* CARD 1: Self Filing */}
          <div
            className="customer-flow-card"
            onMouseEnter={() => setHoveredCard("self")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleSelectFlow("self")}
            style={{
              background: hoveredCard === "self" ? "#fffdfa" : "#FFFFFF",
              border: hoveredCard === "self" ? "1.5px solid #fcd34d" : "1.5px solid #E2E8F0",
              borderRadius: "18px",
              padding: "18px 20px",
              cursor: "pointer",
              transition: "all 0.22s",
              transform: hoveredCard === "self" ? "translateY(-3px)" : "none",
              boxShadow: hoveredCard === "self" ? "0 10px 24px rgba(250, 160, 28, 0.08)" : "0 3px 12px rgba(0,0,0,0.03)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(250, 160, 28, 0.6), rgba(240, 91, 94, 0.6))", borderRadius: "18px 18px 0 0" }} />

            <div>
              {/* Top Row: Icon + Badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "11px",
                    background: "rgba(250, 160, 28, 0.1)",
                    border: "1px solid rgba(250, 160, 28, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "19px", flexShrink: 0,
                  }}>
                    &#9889;
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(250, 160, 28, 0.08)", border: "1px solid rgba(250, 160, 28, 0.25)", borderRadius: "100px", padding: "3px 10px", color: "#b45309", fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    &#9889; Do It Yourself
                  </div>
                </div>
              </div>

              <h2 style={{ fontSize: "17.5px", fontWeight: "800", color: "#1E293B", margin: "0 0 5px" }}>Self-File Your ITR</h2>
              <p style={{ color: "#64748B", fontSize: "12px", lineHeight: "1.45", margin: "0 0 12px" }}>
                Use our guided step-by-step tool with auto-fetched AIS and 26AS data to calculate your tax, pick your regime, and file your return yourself in minutes.
              </p>

              <ul style={{ padding: 0, margin: "0 0 14px", listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selfFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "7px", color: "#334155", fontSize: "11px", lineHeight: "1.35" }}>
                    <span style={{ color: "#d97706", marginTop: "1px", flexShrink: 0, fontWeight: "bold", fontSize: "11px" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(245, 158, 11, 0.2)",
              transition: "all 0.2s"
            }}>
              Start Self Filing &#8594;
            </button>
          </div>

          {/* CARD 2: Hire CA Agent */}
          <div
            className="customer-flow-card"
            onMouseEnter={() => setHoveredCard("agent")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleSelectFlow("hire_ca")}
            style={{
              background: hoveredCard === "agent" ? "#fbfdfc" : "#FFFFFF",
              border: hoveredCard === "agent" ? "1.5px solid #86efac" : "1.5px solid #E2E8F0",
              borderRadius: "18px",
              padding: "18px 20px",
              cursor: "pointer",
              transition: "all 0.22s",
              transform: hoveredCard === "agent" ? "translateY(-3px)" : "none",
              boxShadow: hoveredCard === "agent" ? "0 10px 24px rgba(0, 155, 98, 0.08)" : "0 3px 12px rgba(0,0,0,0.03)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, rgba(0, 155, 98, 0.6), rgba(168, 207, 69, 0.6))", borderRadius: "18px 18px 0 0" }} />

            <div>
              {/* Top Row: Icon + Badge + Recommended */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "11px",
                    background: "rgba(0, 155, 98, 0.1)",
                    border: "1px solid rgba(0, 155, 98, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "19px", flexShrink: 0,
                  }}>
                    💼
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(0, 155, 98, 0.08)", border: "1px solid rgba(0, 155, 98, 0.25)", borderRadius: "100px", padding: "3px 10px", color: "#15803d", fontSize: "10.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    🌟 Verified CAs
                  </div>
                </div>
                <div style={{ background: "rgba(250, 160, 28, 0.12)", border: "1px solid rgba(250, 160, 28, 0.3)", color: "#b45309", fontSize: "9.5px", fontWeight: "800", padding: "3px 8px", borderRadius: "100px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                  ⭐ Recommended
                </div>
              </div>

              <h2 style={{ fontSize: "17.5px", fontWeight: "800", color: "#1E293B", margin: "0 0 5px" }}>Hire a CA Agent</h2>
              <p style={{ color: "#64748B", fontSize: "12px", lineHeight: "1.45", margin: "0 0 12px" }}>
                Let a qualified Chartered Accountant handle everything — review documents, calculate maximum refunds, and file for you with real-time tracking.
              </p>

              <ul style={{ padding: 0, margin: "0 0 14px", listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                {agentFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "7px", color: "#334155", fontSize: "11px", lineHeight: "1.35" }}>
                    <span style={{ color: "#15803d", marginTop: "1px", flexShrink: 0, fontWeight: "bold", fontSize: "11px" }}>&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(16, 185, 129, 0.2)",
              transition: "all 0.2s"
            }}>
              Hire a CA Agent &#8594;
            </button>
          </div>
        </div>

        {/* ── BANNER: Govt ITR Notices (Compact Medium Size) ── */}
        <div
          onClick={() => navigate("/notices")}
          style={{
            marginTop: "14px",
            maxWidth: "820px",
            width: "100%",
            background: "#FFFFFF",
            border: "1.5px solid rgba(250, 160, 28, 0.25)",
            borderRadius: "14px",
            padding: "10px 16px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(250, 160, 28, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "rgba(250, 160, 28, 0.09)", border: "1px solid rgba(250, 160, 28, 0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
              🏛️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "800", color: "#1E293B", fontSize: "13.5px" }}>
                  Received a Notice from the Income Tax Department?
                </span>
                <span style={{ background: "rgba(240, 91, 94, 0.12)", color: "#dc2626", border: "1px solid rgba(240, 91, 94, 0.25)", fontSize: "9px", fontWeight: "800", padding: "1px 5px", borderRadius: "6px" }}>
                  PENDING ACTION
                </span>
              </div>
              <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px", lineHeight: "1.35" }}>
                View official notices (Sec 143(1), 139(9), 142(1), 148, 156), submit online e-response, or request CA legal representation.
              </div>
            </div>
          </div>
          <button
            style={{
              background: "rgba(250, 160, 28, 0.1)",
              border: "1px solid rgba(250, 160, 28, 0.3)",
              color: "#b45309",
              fontWeight: "700",
              fontSize: "11.5px",
              padding: "7px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s"
            }}
          >
            Open Govt Notices →
          </button>
        </div>

        <p style={{ color: "#64748B", fontSize: "10.5px", marginTop: "10px", marginBottom: "0", textAlign: "center" }}>
          &#128274; Your selection is final and will be remembered every time you log in.
        </p>
      </div>
    </div>
  );
}
