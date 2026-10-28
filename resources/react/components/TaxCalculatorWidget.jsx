import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ArrowRight, CheckCircle2, TrendingDown, Sparkles, ShieldCheck, Zap } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

export default function TaxCalculatorWidget({ onOpenLogin }) {
  const navigate = useNavigate();
  const [grossSalary, setGrossSalary] = useState(1200000); // 12 Lakhs default
  const [sec80c, setSec80c] = useState(150000);
  const [sec80d, setSec80d] = useState(25000);
  const [hra, setHra] = useState(100000);
  const [homeLoan, setHomeLoan] = useState(0);

  // Compute New Regime Tax
  const newRegimeTax = useMemo(() => {
    const stdDeduction = 75000;
    const taxable = Math.max(0, grossSalary - stdDeduction);

    // Section 87A rebate for taxable income up to 12,00,000 (New Regime Budget 2025/2026)
    if (taxable <= 1200000) {
      return 0;
    }

    let tax = 0;
    if (taxable > 2400000) {
      tax += (taxable - 2400000) * 0.3;
    }
    if (taxable > 2000000) {
      tax += Math.min(taxable - 2000000, 400000) * 0.25;
    }
    if (taxable > 1600000) {
      tax += Math.min(taxable - 1600000, 400000) * 0.2;
    }
    if (taxable > 1200000) {
      tax += Math.min(taxable - 1200000, 400000) * 0.15;
    }
    if (taxable > 800000) {
      tax += Math.min(taxable - 800000, 400000) * 0.1;
    }
    if (taxable > 400000) {
      tax += Math.min(taxable - 400000, 400000) * 0.05;
    }

    // 4% cess
    return Math.round(tax * 1.04);
  }, [grossSalary]);

  // Compute Old Regime Tax
  const oldRegimeTax = useMemo(() => {
    const stdDeduction = 50000;
    const totalDeductions = stdDeduction + Math.min(150000, sec80c) + Math.min(75000, sec80d) + hra + Math.min(200000, homeLoan);
    const taxable = Math.max(0, grossSalary - totalDeductions);

    if (taxable <= 500000) {
      return 0; // 87A rebate
    }

    let tax = 0;
    if (taxable > 1000000) {
      tax += (taxable - 1000000) * 0.3;
    }
    if (taxable > 500000) {
      tax += Math.min(taxable - 500000, 500000) * 0.2;
    }
    if (taxable > 250000) {
      tax += Math.min(taxable - 250000, 250000) * 0.05;
    }

    return Math.round(tax * 1.04);
  }, [grossSalary, sec80c, sec80d, hra, homeLoan]);

  const savings = Math.abs(oldRegimeTax - newRegimeTax);
  const recommended = newRegimeTax <= oldRegimeTax ? "New Regime" : "Old Regime";
  const lowestTax = Math.min(newRegimeTax, oldRegimeTax);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Percentage for animated visual bars (normalized against grossSalary or max 30%)
  const maxPossibleTax = Math.max(oldRegimeTax, newRegimeTax, 1);
  const newBarPercent = Math.min(100, Math.round((newRegimeTax / maxPossibleTax) * 100));
  const oldBarPercent = Math.min(100, Math.round((oldRegimeTax / maxPossibleTax) * 100));

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px",
        border: "1.5px solid #E2E8F0",
        boxShadow: "0 20px 45px -15px rgba(14, 27, 46, 0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, #FB923C 0%, #F59E0B 25%, #F472B6 50%, #A78BFA 75%, #10B981 100%)",
          padding: "3.5px 0 0 0",
        }}
      />
      <div
        style={{
          padding: "24px 32px 18px",
          backgroundColor: "#F8FAFC",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #FB923C, #F472B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              boxShadow: "0 4px 12px rgba(255, 122, 0, 0.3)",
            }}
          >
            <Calculator size={22} />
          </motion.div>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0E1B2E" }}>
              Live Tax Calculator &amp; Regime Comparator (AY 2026-27)
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748B" }}>
              Slide your income to see instant animated tax comparison &amp; deduction savings
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            padding: "6px 14px",
            borderRadius: "30px",
            fontSize: "12px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={14} color="#10B981" /> Live CBDT Revised Slabs
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "36px",
        }}
      >
        {/* Left Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          {/* Salary Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>
                Annual Gross Salary / Professional Income
              </label>
              <motion.span
                key={grossSalary}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#FB923C",
                  backgroundColor: "#FFF7ED",
                  padding: "5px 14px",
                  borderRadius: "10px",
                  border: "1px solid #FFEDD5",
                }}
              >
                {formatCurrency(grossSalary)}
              </motion.span>
            </div>
            <input
              type="range"
              min={300000}
              max={5000000}
              step={25000}
              value={grossSalary}
              onChange={(e) => setGrossSalary(Number(e.target.value))}
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "4px",
                accentColor: "#FB923C",
                cursor: "pointer",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>
              <span>₹3 Lakhs</span>
              <span>₹12 Lakhs (Zero Tax)</span>
              <span>₹25 Lakhs</span>
              <span>₹50 Lakhs</span>
            </div>
          </div>

          {/* Quick Deduction Inputs */}
          <div
            style={{
              padding: "18px",
              backgroundColor: "#F8FAFC",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Old Regime Deductions
              </span>
              <span style={{ fontSize: "11px", color: "#F472B6", fontWeight: "600" }}>
                Applicable under Old Regime only
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px" }}>
                  Section 80C (PPF, ELSS, PF)
                </label>
                <input
                  type="number"
                  value={sec80c}
                  onChange={(e) => setSec80c(Number(e.target.value))}
                  max={150000}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px" }}>
                  Section 80D (Health Mediclaim)
                </label>
                <input
                  type="number"
                  value={sec80d}
                  onChange={(e) => setSec80d(Number(e.target.value))}
                  max={100000}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px" }}>
                  HRA Exemption Claimed
                </label>
                <input
                  type="number"
                  value={hra}
                  onChange={(e) => setHra(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px" }}>
                  Home Loan Interest Sec 24(b)
                </label>
                <input
                  type="number"
                  value={homeLoan}
                  onChange={(e) => setHomeLoan(Number(e.target.value))}
                  max={200000}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    fontWeight: "600",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Comparison Card */}
        <div
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: "20px",
            border: "1.5px solid #E2E8F0",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                Side-by-Side Comparison
              </span>
              <motion.span
                key={recommended}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  backgroundColor: "#10B981",
                  color: "#FFFFFF",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                }}
              >
                Recommended: {recommended}
              </motion.span>
            </div>

            {/* Two Regime Boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
              {/* New Regime */}
              <motion.div
                animate={{
                  scale: newRegimeTax <= oldRegimeTax ? 1.02 : 1,
                  borderColor: newRegimeTax <= oldRegimeTax ? "#10B981" : "#E2E8F0",
                }}
                transition={{ duration: 0.2 }}
                style={{
                  backgroundColor: newRegimeTax <= oldRegimeTax ? "#F0FDF4" : "#FFFFFF",
                  border: `2px solid ${newRegimeTax <= oldRegimeTax ? "#10B981" : "#E2E8F0"}`,
                  borderRadius: "14px",
                  padding: "18px 14px",
                  textAlign: "center",
                  position: "relative",
                  boxShadow: newRegimeTax <= oldRegimeTax ? "0 8px 20px -6px rgba(16, 185, 129, 0.25)" : "none",
                }}
              >
                {newRegimeTax <= oldRegimeTax && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#10B981",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    BEST CHOICE
                  </span>
                )}
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", marginBottom: "4px" }}>
                  New Regime
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#0E1B2E" }}>
                  {formatCurrency(newRegimeTax)}
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px", fontWeight: "700" }}>
                  ₹75,000 Std. Deduction
                </div>

                {/* Animated bar indicator */}
                <div style={{ marginTop: "10px", height: "5px", backgroundColor: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${newBarPercent}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: "100%", backgroundColor: newRegimeTax <= oldRegimeTax ? "#10B981" : "#94A3B8" }}
                  />
                </div>
              </motion.div>

              {/* Old Regime */}
              <motion.div
                animate={{
                  scale: oldRegimeTax < newRegimeTax ? 1.02 : 1,
                  borderColor: oldRegimeTax < newRegimeTax ? "#10B981" : "#E2E8F0",
                }}
                transition={{ duration: 0.2 }}
                style={{
                  backgroundColor: oldRegimeTax < newRegimeTax ? "#F0FDF4" : "#FFFFFF",
                  border: `2px solid ${oldRegimeTax < newRegimeTax ? "#10B981" : "#E2E8F0"}`,
                  borderRadius: "14px",
                  padding: "18px 14px",
                  textAlign: "center",
                  position: "relative",
                  boxShadow: oldRegimeTax < newRegimeTax ? "0 8px 20px -6px rgba(16, 185, 129, 0.25)" : "none",
                }}
              >
                {oldRegimeTax < newRegimeTax && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#10B981",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    BEST CHOICE
                  </span>
                )}
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748B", marginBottom: "4px" }}>
                  Old Regime
                </div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#0E1B2E" }}>
                  {formatCurrency(oldRegimeTax)}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  With 80C, 80D, HRA
                </div>

                {/* Animated bar indicator */}
                <div style={{ marginTop: "10px", height: "5px", backgroundColor: "#E2E8F0", borderRadius: "3px", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${oldBarPercent}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: "100%", backgroundColor: oldRegimeTax < newRegimeTax ? "#10B981" : "#94A3B8" }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Savings Callout */}
            <motion.div
              key={savings}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              style={{
                backgroundColor: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#F59E0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  flexShrink: 0,
                  boxShadow: "0 3px 10px rgba(245, 158, 11, 0.3)",
                }}
              >
                <TrendingDown size={19} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#92400E" }}>
                  You save {formatCurrency(savings)} with the {recommended}!
                </div>
                <div style={{ fontSize: "11.5px", color: "#B45309" }}>
                  TiQTAX validates all deductions to maximize your refund legally.
                </div>
              </div>
            </motion.div>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onOpenLogin) onOpenLogin();
              else navigate("/login");
            }}
            className="btn-shimmer"
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "12px",
              border: "none",
              fontSize: "15px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            File Under {recommended} &amp; Save {formatCurrency(savings)} <ArrowRight size={17} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
