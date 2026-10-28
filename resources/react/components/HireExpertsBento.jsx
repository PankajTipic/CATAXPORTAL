import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  TrendingUp,
  FileText,
  PhoneCall,
  Zap,
} from "lucide-react";

export default function HireExpertsBento() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("salaried");

  // Verified CA profiles data representing TiQTAX ICAI Partner Network
  const specialists = {
    salaried: {
      name: "CA Nikhil Desai, FCA",
      role: "Senior Tax Partner & Ex-Big4",
      experience: "10+ Yrs Exp.",
      filings: "1,450+ Returns",
      rating: "4.96",
      image: "/tiqtax_expert_nikhil.jpg",
      tags: ["Form 16 Multi-Employer", "RSU & Stock Options", "Regime Optimizer"],
      turnaround: "Assigned in < 45 Mins",
    },
    traders: {
      name: "CA Pooja Singhania, FCA",
      role: "Capital Markets & F&O Lead",
      experience: "8+ Yrs Exp.",
      filings: "1,120+ Returns",
      rating: "4.94",
      image: "/tiqtax_ca_pair.jpg",
      tags: ["F&O / Intraday P&L", "80+ Broker Auto-Sync", "Loss Set-Off"],
      turnaround: "Assigned in < 60 Mins",
    },
    freelancers: {
      name: "CA Vikram Kulkarni, FCA",
      role: "Professionals & 44ADA Lead",
      experience: "12+ Yrs Exp.",
      filings: "1,890+ Returns",
      rating: "4.98",
      image: "/tiqtax_ca_experts.jpg",
      tags: ["Presumptive 44ADA", "TDS Credit Matching", "Advance Tax"],
      turnaround: "Assigned in < 30 Mins",
    },
  };

  const activeExpert = specialists[activeTab];

  // 4 Compact Steps
  const steps = [
    {
      num: "01",
      title: "Smart CA Matching (< 60 Mins)",
      desc: "Paired with a certified ICAI Fellow CA specialized in your income type.",
      badge: "< 60 Min Match",
      icon: <Zap size={15} color="#FB923C" />,
      color: "#FB923C",
      bg: "#FFF7ED",
    },
    {
      num: "02",
      title: "360° Deduction Scanner & AIS Sync",
      desc: "Deep scan across 80C, 80D, HRA & 26AS to unlock maximum legitimate refund.",
      badge: "Avg. +₹48,750 Refund",
      icon: <Sparkles size={15} color="#F472B6" />,
      color: "#F472B6",
      bg: "#FDF2F8",
    },
    {
      num: "03",
      title: "Draft Review & Approval",
      desc: "Review your itemized computation sheet with your CA via call/chat before filing.",
      badge: "100% Client Consent",
      icon: <FileText size={15} color="#A78BFA" />,
      color: "#A78BFA",
      bg: "#F5F3FF",
    },
    {
      num: "04",
      title: "CBDT E-Filing & Notice Protect",
      desc: "Instant ITR-V ack received from ITD plus 3-year notice defense coverage.",
      badge: "Instant ITR-V Ack",
      icon: <Shield size={15} color="#10B981" />,
      color: "#10B981",
      bg: "#ECFDF5",
    },
  ];

  // 4 Medium Trust Metrics
  const trustMetrics = [
    {
      metric: "< 60 Min",
      label: "Average CA Match",
      sub: "Dedicated senior CA assigned",
      icon: <Clock size={16} color="#FB923C" />,
      accent: "#FB923C",
      bg: "#FFF7ED",
      border: "#FED7AA",
    },
    {
      metric: "₹48,750",
      label: "Avg. Tax Saved",
      sub: "Through dual-regime optimization",
      icon: <TrendingUp size={16} color="#F472B6" />,
      accent: "#F472B6",
      bg: "#FDF2F8",
      border: "#FBCFE8",
    },
    {
      metric: "100% Defense",
      label: "Notice Protect 360",
      sub: "Legal representation against ITD",
      icon: <Shield size={16} color="#A78BFA" />,
      accent: "#A78BFA",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    },
    {
      metric: "< 12 Hours",
      label: "Total Turnaround",
      sub: "From documents to ITR-V receipt",
      icon: <Award size={16} color="#10B981" />,
      accent: "#10B981",
      bg: "#ECFDF5",
      border: "#A7F3D0",
    },
  ];

  return (
    <section style={{ padding: "64px 0", backgroundColor: "#FAFAFC", borderTop: "1px solid #E2E8F0" }}>
      {/* ── Neat Structured Container ── */}
      <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* ── Section Header (Medium & Professional) ── */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#FFF7ED",
              border: "1px solid #FED7AA",
              padding: "4px 12px",
              borderRadius: "16px",
              marginBottom: "12px",
            }}
          >
            <Sparkles size={13} color="#FB923C" />
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#FB923C",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}
            >
              TiQTAX CA Concierge
            </span>
          </div>

          <h2
            style={{
              fontSize: "clamp(24px, 2.6vw, 30px)",
              fontWeight: "800",
              color: "#0E1B2E",
              lineHeight: "1.3",
              margin: "0 0 10px",
            }}
          >
            Hire a Dedicated Chartered Accountant to File Your ITR{" "}
            <span
              className="tiqtax-gradient-text"
              style={{
                background: "linear-gradient(135deg, #FB923C 0%, #F472B6 48%, #A78BFA 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                display: "inline-block",
              }}
            >
              Accurately &amp; On Time
            </span>
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "#64748B",
              margin: "0 auto",
              maxWidth: "600px",
              lineHeight: "1.55",
            }}
          >
            Over 200+ verified tax professionals ready to review your finances, maximize deductions, and e-file on your behalf in under 12 hours.
          </p>
        </div>

        {/* ── Dual Panel Console (Medium-Sized Cards) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* ──────────────────────────────────────────────────────────
              LEFT PANEL: 4-Step CA Filing Flow (Medium Card)
              ────────────────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              border: "1px solid #E2E8F0",
              padding: "24px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#F472B6", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  How It Works
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#059669",
                    backgroundColor: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#10B981" }} />
                  Zero Paperwork
                </span>
              </div>

              <div style={{ fontSize: "16px", fontWeight: "800", color: "#0E1B2E", marginBottom: "4px" }}>
                End-to-End Filing Managed by Your Expert
              </div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "18px", lineHeight: "1.4" }}>
                Upload your basic documents once. Your assigned CA handles every calculation, review, and filing step.
              </div>

              {/* 4 Compact Step Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {steps.map((s) => (
                  <div
                    key={s.num}
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderRadius: "12px",
                      border: "1px solid #EDF2F7",
                      padding: "11px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: s.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {s.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                        <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0E1B2E" }}>
                          <span style={{ color: s.color, marginRight: "5px" }}>{s.num}.</span> {s.title}
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            color: s.color,
                            backgroundColor: s.bg,
                            padding: "2px 6px",
                            borderRadius: "8px",
                          }}
                        >
                          {s.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px", lineHeight: "1.4" }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Support Callout */}
            <div
              style={{
                marginTop: "18px",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "#F8FAFC",
                border: "1px dashed #CBD5E1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#475569",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <PhoneCall size={14} color="#A78BFA" />
                <span>Direct phone &amp; chat consultation with your assigned CA</span>
              </div>
              <span style={{ fontWeight: "700", color: "#A78BFA" }}>Included Free</span>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────
              RIGHT PANEL: Verified CA Specialist Console (Medium Card)
              ────────────────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              border: "1px solid #E2E8F0",
              padding: "24px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div>
              {/* Header Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                      display: "inline-block",
                      boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.25)",
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#0E1B2E" }}>
                    Verified ICAI Network
                  </span>
                </div>

                <div style={{ fontSize: "12px", fontWeight: "700", color: "#F59E0B" }}>
                  ★★★★★ <span style={{ color: "#0E1B2E", fontWeight: "800" }}>4.96/5</span>
                </div>
              </div>

              {/* Persona Selector Tabs (Compact Medium Sizing) */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  backgroundColor: "#F1F5F9",
                  padding: "4px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  { id: "salaried", label: "Salaried", icon: "💼" },
                  { id: "traders", label: "Traders", icon: "📈" },
                  { id: "freelancers", label: "44ADA", icon: "🩺" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: activeTab === t.id ? "700" : "600",
                      backgroundColor: activeTab === t.id ? "#FFFFFF" : "transparent",
                      color: activeTab === t.id ? "#0E1B2E" : "#64748B",
                      boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Active CA Card (Medium Size) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: "14px",
                    border: "1px solid #E2E8F0",
                    padding: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "14px", alignItems: "center" }}>
                    {/* CA Photo */}
                    <div
                      style={{
                        height: "108px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        position: "relative",
                        backgroundColor: "#E2E8F0",
                      }}
                    >
                      <img
                        src={activeExpert.image}
                        alt={activeExpert.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          right: "4px",
                          backgroundColor: "rgba(14, 27, 46, 0.88)",
                          color: "#FFFFFF",
                          fontSize: "8.5px",
                          fontWeight: "700",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          textAlign: "center",
                        }}
                      >
                        ICAI Certified
                      </div>
                    </div>

                    {/* CA Details */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0E1B2E" }}>
                          {activeExpert.name}
                        </span>
                        <CheckCircle2 size={14} color="#10B981" />
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748B", fontWeight: "600", marginBottom: "6px" }}>
                        {activeExpert.role}
                      </div>

                      {/* Chips */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#0E1B2E",
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #CBD5E1",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {activeExpert.experience}
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#FB923C",
                            backgroundColor: "#FFF7ED",
                            border: "1px solid #FED7AA",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {activeExpert.filings}
                        </span>
                      </div>

                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} /> {activeExpert.turnaround}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ borderTop: "1px solid #E2E8F0", marginTop: "12px", paddingTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {activeExpert.tags.map((tg, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "600",
                          color: "#334155",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Direct CTA Button (Medium & Crisp) */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate("/agent/hire")}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #FB923C 0%, #F472B6 48%, #A78BFA 100%)",
                color: "#FFFFFF",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(251, 146, 60, 0.22)",
              }}
            >
              Get Assigned to a Dedicated CA <ArrowRight size={15} />
            </motion.button>
          </div>
        </div>

        {/* ── 4 Medium Stat & SLA Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          {trustMetrics.map((tm, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                border: `1px solid ${tm.border}`,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: tm.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {tm.icon}
              </div>

              <div>
                <div style={{ fontSize: "19px", fontWeight: "800", color: "#0E1B2E", lineHeight: "1.1" }}>
                  {tm.metric}
                </div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: tm.accent, marginTop: "2px" }}>
                  {tm.label}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                  {tm.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Medium Compact CTA Strip ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0E1B2E 0%, #1A2639 100%)",
            borderRadius: "16px",
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFFFFF", marginBottom: "4px" }}>
              Ready to Hand Off Your Taxes to a Professional CA?
            </div>
            <div style={{ fontSize: "13px", color: "#94A3B8" }}>
              Transparent pricing starting at just ₹999 with 100% calculation accuracy guarantee.
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/agent/hire")}
            style={{
              background: "linear-gradient(135deg, #FB923C 0%, #F472B6 48%, #A78BFA 100%)",
              color: "#FFFFFF",
              border: "none",
              padding: "11px 22px",
              borderRadius: "8px",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(251, 146, 60, 0.25)",
              whiteSpace: "nowrap",
            }}
          >
            Hire a CA Now <ArrowRight size={15} />
          </motion.button>
        </div>

      </div>
    </section>
  );
}
