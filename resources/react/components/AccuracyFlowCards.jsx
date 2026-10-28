import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, TrendingUp, Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

export default function AccuracyFlowCards({ onOpenLogin }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [deductionScanStep, setDeductionScanStep] = useState(0);

  // Auto-scan deduction cycle animation inside Card 3
  useEffect(() => {
    const scanInterval = setInterval(() => {
      setDeductionScanStep((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(scanInterval);
  }, []);

  const cards = [
    {
      id: "prefill",
      caption: "Zero manual entry, pre-filled from your records",
      uiTitle: "Auto-filling in your return",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Auto-filling in your return</span>
            <span className="animate-pulse-green" style={{ backgroundColor: "#ECFDF5", color: "#059669", padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>LIVE SYNC</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", padding: "8px 10px", borderRadius: "8px", border: "1px solid #EDF2F7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#FFEDD5", color: "#FB923C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>P</div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#0E1B2E" }}>Personal Details</div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>PAN: ABCDE1234F</div>
                </div>
              </div>
              <span className="animate-pulse-green" style={{ fontSize: "10px", fontWeight: "800", color: "#059669", backgroundColor: "#D1FAE5", padding: "2px 7px", borderRadius: "4px" }}>
                ✓ FETCHED
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", padding: "8px 10px", borderRadius: "8px", border: "1px solid #EDF2F7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#FCE7F3", color: "#F472B6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>S</div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#0E1B2E" }}>Salary &amp; Form 16</div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>Employer TAN: DELM12345A</div>
                </div>
              </div>
              <span className="animate-pulse-green" style={{ fontSize: "10px", fontWeight: "800", color: "#059669", backgroundColor: "#D1FAE5", padding: "2px 7px", borderRadius: "4px" }}>
                ✓ FETCHED
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "brokers",
      caption: "Every trade pulled in from 80+ brokers in 1-click",
      uiTitle: "80+ Brokers Supported",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>80+ Brokers Supported</span>
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#FB923C" }}>₹ 1,27,500 P&amp;L</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F5F3FF", padding: "7px 10px", borderRadius: "8px", border: "1px solid #EDE9FE" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>🟣</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#0E1B2E" }}>Upstox Pro</span>
              </div>
              <span className="animate-pulse-green" style={{ fontSize: "10px", fontWeight: "800", color: "#059669", backgroundColor: "#D1FAE5", padding: "2px 6px", borderRadius: "4px" }}>
                ✓ FETCHED
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F0FDF4", padding: "7px 10px", borderRadius: "8px", border: "1px solid #DCFCE7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>🟢</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#0E1B2E" }}>Zerodha Kite</span>
              </div>
              <span className="animate-pulse-green" style={{ fontSize: "10px", fontWeight: "800", color: "#059669", backgroundColor: "#D1FAE5", padding: "2px 6px", borderRadius: "4px" }}>
                ✓ FETCHED
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EFF6FF", padding: "7px 10px", borderRadius: "8px", border: "1px solid #DBEAFE" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>🌿</span>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#0E1B2E" }}>Groww Invest</span>
              </div>
              <span className="animate-pulse-green" style={{ fontSize: "10px", fontWeight: "800", color: "#059669", backgroundColor: "#D1FAE5", padding: "2px 6px", borderRadius: "4px" }}>
                ✓ FETCHED
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "deductions",
      caption: "Capital gains, F&O, trading income, all auto-computed, precisely",
      uiTitle: "Exemptions & deductions applied",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
          {/* Continuous scanning beam line */}
          <div style={{ position: "absolute", left: 0, right: 0, height: "2.5px", background: "linear-gradient(90deg, transparent, #FB923C, #F472B6, transparent)", animation: "scanline 2.8s linear infinite", zIndex: 10 }} />

          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Exemptions &amp; deductions applied</span>
            <span style={{ color: "#F472B6", fontSize: "10px", fontWeight: "800", backgroundColor: "#FDF2F8", padding: "2px 6px", borderRadius: "4px" }}>AUTO-SCAN</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", padding: "5px 0", borderBottom: "1px dashed #E2E8F0" }}>
              <span style={{ color: "#475569" }}>Standard deduction</span>
              <span style={{ fontWeight: "800", color: "#0E1B2E" }}>₹ 75,000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", padding: "5px 0", borderBottom: "1px dashed #E2E8F0" }}>
              <span style={{ color: "#475569" }}>Section 80C</span>
              <span style={{ fontWeight: "800", color: "#7C3AED", backgroundColor: "#F5F3FF", padding: "1px 6px", borderRadius: "4px" }}>
                {deductionScanStep === 0 ? "SCANNING... 🔄" : "APPLIED ₹1.5L ✓"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", padding: "5px 0" }}>
              <span style={{ color: "#475569" }}>LTCG Exemption</span>
              <span style={{ fontWeight: "800", color: "#10B981", backgroundColor: "#ECFDF5", padding: "1px 6px", borderRadius: "4px" }}>
                {deductionScanStep === 2 ? "MAXIMIZED ✓" : "APPLIED ₹1.25L ✓"}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "regimes",
      caption: "Right form, right regime, both auto-selected",
      uiTitle: "Auto-selecting tax regime that SAVES you MOST",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>
            Auto-selecting tax regime that SAVES you MOST
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* New Regime Recommended with gentle regular pulse */}
            <div className="animate-pulse-green" style={{ backgroundColor: "#F0FDF4", border: "1.5px solid #10B981", borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#065F46", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>New regime</span>
                  <span style={{ backgroundColor: "#10B981", color: "#FFF", fontSize: "9px", padding: "1px 5px", borderRadius: "10px" }}>BEST CHOICE</span>
                </div>
                <div style={{ fontSize: "10px", color: "#047857", fontWeight: "600" }}>Tax: ₹ 45,820 (Saves ₹ 22,100)</div>
              </div>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#10B981", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>✓</div>
            </div>

            {/* Old Regime */}
            <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.8 }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#991B1B" }}>Old regime</div>
                <div style={{ fontSize: "10px", color: "#DC2626", textDecoration: "line-through" }}>Tax: ₹ 67,920</div>
              </div>
              <span style={{ fontSize: "9px", fontWeight: "800", color: "#DC2626" }}>+ ₹22,100</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "loss",
      caption: "Every loss set off and carried forward, nothing missed",
      uiTitle: "Your loss adjustment",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "10px" }}>
            Your loss adjustment
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FAFC", padding: "6px 8px", borderRadius: "6px" }}>
              <span style={{ fontSize: "11px", color: "#334155" }}>Capital Gains</span>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#0E1B2E" }}>₹ 1,40,000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F5F3FF", padding: "6px 8px", borderRadius: "6px", border: "1px solid #DDD6FE" }}>
              <span style={{ fontSize: "11px", color: "#5B21B6", fontWeight: "600" }}>Brought Forward Loss</span>
              <span style={{ fontSize: "10px", fontWeight: "800", color: "#7C3AED", backgroundColor: "#FFFFFF", padding: "2px 6px", borderRadius: "4px" }}>
                SET OFF ✓
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ECFDF5", padding: "6px 8px", borderRadius: "6px", border: "1px solid #A7F3D0" }}>
              <span style={{ fontSize: "11px", color: "#065F46", fontWeight: "700" }}>Net Taxable</span>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#10B981" }}>₹ 65,000</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "summary",
      caption: "Interactive tax summary, every number and deduction, visualised clearly",
      uiTitle: "Total Refund",
      renderUI: () => (
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0", padding: "14px", width: "100%", boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}>
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
              Total Refund
            </div>
            <div className="btn-shimmer" style={{ fontSize: "24px", fontWeight: "900", background: "linear-gradient(135deg, #FB923C, #F472B6)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", display: "inline-block" }}>
              <AnimatedCounter end={88090} prefix="₹ " />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", borderBottom: "1px solid #F1F5F9", paddingBottom: "3px" }}>
              <span>Gross Income</span>
              <span style={{ fontWeight: "700", color: "#0E1B2E" }}>₹ 18,24,000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", borderBottom: "1px solid #F1F5F9", paddingBottom: "3px" }}>
              <span>Tax-saving Deductions</span>
              <span style={{ fontWeight: "700", color: "#10B981" }}>₹ 3,44,420</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B" }}>
              <span>Taxable Income</span>
              <span style={{ fontWeight: "700", color: "#0E1B2E" }}>₹ 14,79,580</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // ══════════════════════════════════════════════════════════════════
  // CONTINUOUS & REGULAR AUTO-SLIDING (3.2 seconds interval)
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isHovered) return; // Pause on user hover

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % cards.length;
        if (scrollRef.current) {
          const { scrollWidth, clientWidth } = scrollRef.current;
          const maxScroll = scrollWidth - clientWidth;
          const target = (next / (cards.length - 1)) * maxScroll;
          scrollRef.current.scrollTo({ left: target, behavior: "smooth" });
        }
        return next;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [isHovered, cards.length]);

  const scrollToIndex = (index) => {
    setActiveIndex(index);
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const target = (index / (cards.length - 1)) * maxScroll;
      scrollRef.current.scrollTo({ left: target, behavior: "smooth" });
    }
  };

  const scroll = (direction) => {
    const nextIndex = direction === "left"
      ? (activeIndex - 1 + cards.length) % cards.length
      : (activeIndex + 1) % cards.length;
    scrollToIndex(nextIndex);
  };

  const handleManualScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const progress = scrollLeft / (scrollWidth - clientWidth);
      const index = Math.round(progress * (cards.length - 1));
      if (!isNaN(index)) {
        setActiveIndex(Math.max(0, Math.min(cards.length - 1, index)));
      }
    }
  };

  return (
    <section
      style={{ padding: "72px 0", backgroundColor: "#FAFAFA", overflow: "hidden" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 24px" }}>
        
        {/* Section Heading matching TiQTAX Flow */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#0E1B2E", lineHeight: "1.25", margin: 0 }}>
            Tax filing, as easy as it gets.<br />
            And as{" "}
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
              accurate as it needs to be.
            </span>
          </h2>
        </div>

        {/* Carousel Container */}
        <div style={{ position: "relative" }}>
          {/* Left Arrow */}
          <button
            onClick={() => scroll("left")}
            style={{
              position: "absolute",
              left: "-18px",
              top: "45%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0E1B2E",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.12)";
              e.currentTarget.style.borderColor = "#FB923C";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.borderColor = "#E2E8F0";
            }}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll("right")}
            style={{
              position: "absolute",
              right: "-18px",
              top: "45%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0E1B2E",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1.12)";
              e.currentTarget.style.borderColor = "#FB923C";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.borderColor = "#E2E8F0";
            }}
          >
            <ChevronRight size={22} />
          </button>

          {/* The Horizontal Carousel Track */}
          <div
            ref={scrollRef}
            onScroll={handleManualScroll}
            className="tiqtax-flow-carousel"
          >
            {cards.map((c, i) => (
              <motion.div
                key={c.id}
                whileHover={{ y: -8 }}
                className="tiqtax-flow-item"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "24px",
                  border: activeIndex === i ? "2px solid #FB923C" : "1.5px solid #EDF2F7",
                  boxShadow: activeIndex === i ? "0 12px 30px rgba(255, 122, 0, 0.15)" : "0 6px 20px rgba(0,0,0,0.03)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onClick={() => { if (onOpenLogin) onOpenLogin(); else navigate("/login"); }}
              >
                {/* Upper Half: Light subtle arched backdrop with floating realistic UI simulation */}
                <div
                  style={{
                    height: "230px",
                    background: "radial-gradient(circle at 50% 120%, rgba(255, 122, 0, 0.08) 0%, rgba(255, 20, 147, 0.05) 50%, rgba(248, 250, 252, 0.8) 100%)",
                    padding: "20px 20px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {/* Subtle top arch decoration */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-40px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "280px",
                      height: "160px",
                      borderRadius: "50%",
                      border: "1.5px dashed rgba(226, 232, 240, 0.9)",
                      pointerEvents: "none",
                    }}
                  />
                  {c.renderUI()}
                </div>

                {/* Lower Half: Clear bold caption */}
                <div
                  style={{
                    padding: "22px 24px 26px",
                    borderTop: "1px solid #F1F5F9",
                    textAlign: "center",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#1E293B",
                      lineHeight: "1.45",
                      margin: 0,
                    }}
                  >
                    {c.caption}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Continuous Animated Progress Dots (. . . .) */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px" }}>
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                style={{
                  height: "8px",
                  width: activeIndex === i ? "32px" : "8px",
                  borderRadius: "10px",
                  backgroundColor: activeIndex === i ? "#FB923C" : "#CBD5E1",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: 0,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Active Progress Filler when auto-playing */}
                {activeIndex === i && !isHovered && (
                  <motion.div
                    key={`dot-${activeIndex}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3.2, ease: "linear" }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "#F472B6",
                      borderRadius: "10px",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Live Auto-playing indicator subtitle */}
          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#94A3B8" }}>
            <span>{isHovered ? "⏸️ Paused on hover" : "🔄 Auto-advancing live • Slide " + (activeIndex + 1) + " of " + cards.length}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
