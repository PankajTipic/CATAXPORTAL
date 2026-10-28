import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  FileText,
  UserCheck,
  Briefcase,
  Shield,
  TrendingUp,
  Globe,
  Calculator,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Lock,
} from "lucide-react";

export default function Navbar({ onOpenLogin }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'products' | 'tools' | 'ca'

  const isLoggedIn = !!localStorage.getItem("auth_token");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ── Signature Brand Accent Top Stripe ── */}
      <div
        style={{
          height: "3.5px",
          background: "linear-gradient(90deg, #FB923C 0%, #F472B6 50%, #A78BFA 100%)",
          width: "100%",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 1001,
        }}
      />

      {/* ── Main Navigation Bar ── */}
      <header
        style={{
          position: "fixed",
          top: "3.5px",
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: scrolled ? "rgba(255, 255, 255, 0.96)" : "#FFFFFF",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: scrolled ? "0 4px 20px rgba(14, 27, 46, 0.06)" : "0 1px 3px rgba(0, 0, 0, 0.02)",
          transition: "all 0.25s ease",
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "0 24px",
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Logo */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <img
              src="/LOGO1.png"
              alt="TiQTAX Logo"
              style={{
                height: "44px",
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>

          {/* Desktop Navigation Links with Mega Dropdowns */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
            className="hidden-on-mobile"
          >
            <Link
              to="/"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#334155",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              Home
            </Link>

            <a
              href="#services"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#334155",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              Income Tax Return
            </a>

            <a
              href="#how-it-works"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#334155",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              How It Works
            </a>

            <a
              href="#faqs"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#334155",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              FAQs
            </a>

            <a
              href="#contact"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#334155",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              Contact Us
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Direct Tax Firm Portal Link */}
            <Link
              to="/ca-login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "700",
                color: "#7C3AED",
                backgroundColor: "rgba(124, 58, 237, 0.08)",
                padding: "8px 14px",
                borderRadius: "8px",
                transition: "all 0.15s ease",
              }}
              className="hidden-on-mobile"
            >
              <Briefcase size={14} /> Tax Firm Portal
            </Link>

            {/* Login button */}
            {isLoggedIn ? (
              <Link
                to="/customer-portal"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0E1B2E",
                  border: "1.5px solid #CBD5E1",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  transition: "all 0.15s ease",
                }}
              >
                Go to Dashboard →
              </Link>
            ) : (
              <button
                onClick={() => navigate("/login")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#0E1B2E",
                  backgroundColor: "#FFFFFF",
                  border: "1.5px solid #CBD5E1",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#F472B6";
                  e.currentTarget.style.color = "#F472B6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#CBD5E1";
                  e.currentTarget.style.color = "#0E1B2E";
                }}
              >
                <Lock size={14} /> Login
              </button>
            )}

            {/* Start Free Filing CTA Button */}
            <button
              onClick={() => {
                if (isLoggedIn) navigate("/customer-portal");
                else navigate("/login");
              }}
              className="nav-cta-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "700",
                color: "#FFFFFF",
                background: "linear-gradient(135deg, #FB923C 0%, #F472B6 48%, #A78BFA 100%)",
                border: "none",
                padding: "9px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(251, 146, 60, 0.22)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(251, 146, 60, 0.32)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(251, 146, 60, 0.22)";
              }}
            >
              Start Your ITR <ArrowRight size={15} />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                color: "#0E1B2E",
              }}
              className="show-on-mobile"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

              {/* Mobile Slide-out Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mobile-menu-drawer"
              style={{
                backgroundColor: "#FFFFFF",
                borderTop: "1px solid #E2E8F0",
                padding: "20px 24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: "none", color: "#0E1B2E", fontWeight: "600", fontSize: "15px" }}
                >
                  📄 Self ITR Filing (Form 16)
                </Link>
                <Link
                  to="/agent/hire"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: "none", color: "#0E1B2E", fontWeight: "600", fontSize: "15px" }}
                >
                  🧑‍💼 Hire a Tax Consultant
                </Link>
                <Link
                  to="/ca-login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: "none", color: "#7C3AED", fontWeight: "700", fontSize: "15px" }}
                >
                  💼 Tax Firm Management Portal
                </Link>
                <Link
                  to="/notices"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: "none", color: "#0E1B2E", fontWeight: "600", fontSize: "15px" }}
                >
                  🏛️ ITD Notice Management
                </Link>
                <a
                  href="#calculator-section"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: "none", color: "#0E1B2E", fontWeight: "600", fontSize: "15px" }}
                >
                  🧮 Tax Calculator (AY 2026-27)
                </a>
              </div>

              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1.5px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Client Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/ca-login");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#7C3AED",
                    color: "#FFFFFF",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Tax Firm Portal Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: "72px" }} />

      <style>{`
        @media (max-width: 900px) {
          .hidden-on-mobile {
            display: none !important;
          }
          .show-on-mobile {
            display: block !important;
          }
          .mobile-menu-drawer {
            max-height: calc(100vh - 72px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }
        @media (max-width: 600px) {
          .nav-cta-btn {
            padding: 7px 12px !important;
            font-size: 12px !important;
          }
        }
        @media (max-width: 440px) {
          .nav-cta-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
