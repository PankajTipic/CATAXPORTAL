import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, CheckCircle2, ArrowRight, Phone, Mail, MapPin, Building2, HelpCircle } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="contact"
      style={{
        backgroundColor: "#0B1320",
        color: "#94A3B8",
        paddingTop: "64px",
        paddingBottom: "32px",
        borderTop: "1px solid #1E293B",
        position: "relative",
      }}
    >
      {/* Top Gradient Stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3.5px",
          background: "linear-gradient(90deg, #FB923C 0%, #F472B6 50%, #A78BFA 100%)",
        }}
      />

      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 24px" }}>
        <style>{`
          .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 40px;
            margin-bottom: 48px;
          }
          @media (min-width: 992px) {
            .footer-grid {
              grid-template-columns: 1.6fr 1fr 1fr 1.2fr;
            }
          }
          @media (max-width: 640px) {
            .footer-grid {
              grid-template-columns: 1fr !important;
              gap: 28px !important;
              margin-bottom: 32px !important;
            }
            .footer-bottom-bar {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 14px !important;
            }
            .footer-legal-links {
              flex-wrap: wrap !important;
              gap: 10px 16px !important;
            }
          }
        `}</style>

        {/* Main Grid */}
        <div className="footer-grid">
          {/* Brand Info & Entity */}
          <div>
            <Link to="/" style={{ display: "inline-block", marginBottom: "16px" }}>
              <img
                src="/LOGO1.png"
                alt="TiQTAX Logo"
                style={{
                  height: "46px",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  display: "block",
                }}
              />
            </Link>
            <p style={{ fontSize: "13.5px", lineHeight: "1.7", color: "#94A3B8", maxWidth: "340px", margin: "0 0 16px" }}>
              <strong>TiQTAX Technologies Private Limited</strong>
              <br />
              India’s dedicated tax filing platform offering guided self-filing, automated document reconciliation, and verified Chartered Accountant assistance.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#CBD5E1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={15} color="#10B981" />
                <span>Authorized E-Return Intermediary (ERI) Compliant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={15} color="#FB923C" />
                <span>CIN: U72900MH2024PTC123456</span>
              </div>
            </div>
          </div>

          {/* Quick Links / Navigation */}
          <div>
            <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "700", marginBottom: "18px", letterSpacing: "0.5px" }}>
              About &amp; Services
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "11px", fontSize: "13.5px" }}>
              <li>
                <a href="#why-tiqtax" style={{ color: "#94A3B8", textDecoration: "none" }}>About TIQTAX</a>
              </li>
              <li>
                <a href="#services" style={{ color: "#94A3B8", textDecoration: "none" }}>ITR Filing Services</a>
              </li>
              <li>
                <a href="#how-it-works" style={{ color: "#94A3B8", textDecoration: "none" }}>How It Works</a>
              </li>
              <li>
                <Link to="/agent/hire" style={{ color: "#94A3B8", textDecoration: "none" }}>Hire a Tax Expert</Link>
              </li>
              <li>
                <a href="#faqs" style={{ color: "#94A3B8", textDecoration: "none" }}>FAQs</a>
              </li>
              <li>
                <Link to="/ca-login" style={{ color: "#A78BFA", fontWeight: "600", textDecoration: "none" }}>
                  CA Firm Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Compliance */}
          <div>
            <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "700", marginBottom: "18px", letterSpacing: "0.5px" }}>
              Legal &amp; Policies
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "11px", fontSize: "13.5px" }}>
              <li>
                <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Privacy Policy</Link>
              </li>
              <li>
                <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Refund &amp; Cancellation Policy</Link>
              </li>
              <li>
                <a href="#security-and-privacy" style={{ color: "#94A3B8", textDecoration: "none" }}>Security &amp; Data Practices</a>
              </li>
              <li>
                <a href="#contact-info" style={{ color: "#94A3B8", textDecoration: "none" }}>Grievance Contact</a>
              </li>
            </ul>
          </div>

          {/* Contact & Registered Office */}
          <div id="contact-info">
            <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "700", marginBottom: "18px", letterSpacing: "0.5px" }}>
              Registered Office &amp; Contact
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#94A3B8" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <MapPin size={17} color="#FB923C" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>Level 5, Prime Tech Park, Saki Naka, Andheri East, Mumbai, Maharashtra 400072, India</span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Mail size={16} color="#F472B6" style={{ flexShrink: 0 }} />
                <a href="mailto:support@tiqtax.co.in" style={{ color: "#E2E8F0", textDecoration: "none" }}>
                  support@tiqtax.co.in
                </a>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Phone size={16} color="#A78BFA" style={{ flexShrink: 0 }} />
                <span style={{ color: "#E2E8F0" }}>+91 1800 209 8478 (Toll Free, 9:30 AM - 6:30 PM)</span>
              </div>
              <div style={{ marginTop: "6px", padding: "10px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "8px", border: "1px solid #1E293B" }}>
                <strong style={{ color: "#E2E8F0", fontSize: "12px" }}>Grievance Officer:</strong>
                <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                  Shri Alok Vardhan (grievance@tiqtax.co.in)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div
          style={{
            borderTop: "1px solid #1E293B",
            paddingTop: "20px",
            marginBottom: "20px",
            fontSize: "12px",
            lineHeight: "1.7",
            color: "#64748B",
          }}
        >
          <strong style={{ color: "#94A3B8" }}>Disclaimer:</strong> TIQTAX is a private technology platform facilitating Income Tax Returns filing. Taxes and refunds are computed under the Income-tax Act, 1961 and applicable Union Budget amendments. TIQTAX does not represent the Income Tax Department directly. All trademarks and brand names belong to their respective owners.
        </div>

        {/* Bottom Bar */}
        <div
          className="footer-bottom-bar"
          style={{
            borderTop: "1px solid #1E293B",
            paddingTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12.5px",
          }}
        >
          <div style={{ color: "#64748B" }}>
            &copy; {currentYear} TiQTAX Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="footer-legal-links" style={{ display: "flex", gap: "20px" }}>
            <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Privacy Policy</Link>
            <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Terms &amp; Conditions</Link>
            <Link to="/login" style={{ color: "#94A3B8", textDecoration: "none" }}>Refund Policy</Link>
            <a href="#contact" style={{ color: "#94A3B8", textDecoration: "none" }}>Grievance Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
