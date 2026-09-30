import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

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
        background: "linear-gradient(135deg, #0b1f3a 0%, #0f3460 50%, #1a1a4e 100%)",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navbar */}
      <nav
        style={{
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #38bdf8, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "900",
              color: "#fff",
              letterSpacing: "0.5px",
            }}
          >
            ITR
          </div>
          <div>
            <div style={{ fontWeight: "900", fontSize: "17px", color: "#fff", letterSpacing: "0.5px" }}>
              CA TAX PORTAL
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Taxpayer Services Platform</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "700", color: "#fff", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>&#128100;</span>
              {user.name || "Taxpayer"}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              {user.email || ""}{user.pan ? " \u2022 PAN: " + user.pan : ""}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#f87171",
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

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: "100px",
              padding: "6px 18px",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "20px",
            }}
          >
            &#128197; Financial Year 2025-26 &middot; AY 2026-27
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: "900",
              color: "#fff",
              margin: "0 0 12px",
              lineHeight: "1.15",
            }}
          >
            Welcome back, {user.name ? user.name.split(" ")[0] : "Taxpayer"} &#128075;
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#94a3b8",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Choose how you would like to file your Income Tax Return this year.
            Both paths are completely separate and secure.
          </p>
        </div>

        {/* Flow Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            maxWidth: "840px",
            width: "100%",
          }}
        >
          {/* CARD 1: Self Filing */}
          <div
            onMouseEnter={() => setHoveredCard("self")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleSelectFlow("self")}
            style={{
              background: hoveredCard === "self" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
              border: hoveredCard === "self" ? "2px solid rgba(56,189,248,0.7)" : "2px solid rgba(255,255,255,0.12)",
              borderRadius: "24px",
              padding: "36px 32px",
              cursor: "pointer",
              transition: "all 0.25s",
              transform: hoveredCard === "self" ? "translateY(-4px)" : "none",
              boxShadow: hoveredCard === "self" ? "0 20px 60px rgba(56,189,248,0.15)" : "0 4px 20px rgba(0,0,0,0.2)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #38bdf8, #6366f1)", borderRadius: "24px 24px 0 0" }} />

            {/* Icon box */}
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(99,102,241,0.15))",
              border: "1px solid rgba(56,189,248,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", marginBottom: "18px",
            }}>
              &#9889;
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "100px", padding: "4px 12px", color: "#38bdf8", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
              &#9889; Do It Yourself
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 10px" }}>Self-File Your ITR</h2>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: "1.65", margin: "0 0 22px" }}>
              Use our guided step-by-step tool with auto-fetched AIS and 26AS data to calculate your tax, pick your regime, and file your return yourself in minutes.
            </p>

            <ul style={{ padding: 0, margin: "0 0 28px", listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {selfFeatures.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                  <span style={{ color: "#38bdf8", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>

            <button style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)", border: "none", color: "#fff", fontSize: "15px", fontWeight: "800", cursor: "pointer" }}>
              Start Self Filing &#8594;
            </button>
          </div>

          {/* CARD 2: Hire CA Agent */}
          <div
            onMouseEnter={() => setHoveredCard("agent")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleSelectFlow("hire_ca")}
            style={{
              background: hoveredCard === "agent" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
              border: hoveredCard === "agent" ? "2px solid rgba(16,185,129,0.7)" : "2px solid rgba(255,255,255,0.12)",
              borderRadius: "24px",
              padding: "36px 32px",
              cursor: "pointer",
              transition: "all 0.25s",
              transform: hoveredCard === "agent" ? "translateY(-4px)" : "none",
              boxShadow: hoveredCard === "agent" ? "0 20px 60px rgba(16,185,129,0.15)" : "0 4px 20px rgba(0,0,0,0.2)",
              backdropFilter: "blur(10px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #f59e0b)", borderRadius: "24px 24px 0 0" }} />
            <div style={{ position: "absolute", top: "20px", right: "20px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontSize: "10px", fontWeight: "900", padding: "4px 12px", borderRadius: "100px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              &#11088; Recommended
            </div>

            {/* Icon box */}
            <div style={{
              width: "56px", height: "56px", borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(245,158,11,0.12))",
              border: "1px solid rgba(16,185,129,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", marginBottom: "18px",
            }}>
              &#128188;
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "100px", padding: "4px 12px", color: "#10b981", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
              &#127775; Expert Managed
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: "0 0 10px" }}>Hire a CA Agent</h2>
            <p style={{ color: "#94a3b8", fontSize: "13.5px", lineHeight: "1.65", margin: "0 0 22px" }}>
              Let a qualified Chartered Accountant handle everything — review your documents, calculate the best return, and file it for you. Track every step in real-time.
            </p>

            <ul style={{ padding: 0, margin: "0 0 28px", listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {agentFeatures.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                  <span style={{ color: "#10b981", marginTop: "1px", flexShrink: 0, fontWeight: "bold" }}>&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>

            <button style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff", fontSize: "15px", fontWeight: "800", cursor: "pointer" }}>
              Hire a CA Agent &#8594;
            </button>
          </div>
        </div>

        <p style={{ color: "#475569", fontSize: "12px", marginTop: "36px", textAlign: "center" }}>
          &#128274; Your selection is final and will be remembered every time you log in.
        </p>
      </div>
    </div>
  );
}
