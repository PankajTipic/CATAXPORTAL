import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
} from "@coreui/react";
import api from "../api/client";
import logo from "../../../public/LOGO1.png";

export default function CaLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickFill = (role) => {
    if (role === "admin") {
      setForm({
        email: "admin@cataxportal.com",
        password: "admin123",
      });
    } else {
      setForm({
        email: "rahul.ca@cataxportal.com",
        password: "employee123",
      });
    }
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please provide both CA firm email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", {
        email: form.email,
        password: form.password,
      });

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("is_ca_staff", "true");
        navigate("/ca-portal");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Authentication failed. Please check your credentials or ensure your account has Admin/Employee staff privileges."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f0f7ff 50%, #f5fbf7 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* ════ LOGO-INSPIRED AMBIENT FAINT SHADES ════ */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(56, 189, 248, 0.04) 60%, transparent 80%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 80%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ════ TOP MINIMAL HEADER ════ */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          padding: "18px 36px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(226, 232, 240, 0.6)",
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(12px)",
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
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, rgba(255, 122, 0, 0.1) 0%, rgba(255, 20, 147, 0.12) 100%)",
              color: "#FF1493",
              fontSize: "11.5px",
              fontWeight: "800",
              padding: "4px 12px",
              borderRadius: "20px",
              border: "1px solid rgba(255, 20, 147, 0.3)",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "linear-gradient(135deg, #FF7A00, #FF1493)", display: "inline-block" }}></span>
            CA Firm Console &amp; Audit Desk
          </div>
        </div>

        <Link
          to="/login"
          style={{
            textDecoration: "none",
            background: "#ffffff",
            border: "1.5px solid #cbd5e1",
            color: "#0f172a",
            padding: "7px 16px",
            borderRadius: "20px",
            fontSize: "12.5px",
            fontWeight: "800",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#2563eb";
            e.currentTarget.style.color = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.color = "#0f172a";
          }}
        >
          <span>←</span>
          <span>Customer ITR Login</span>
        </Link>
      </header>

      {/* ════ MAIN AUTHENTICATION CARD ════ */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <CContainer style={{ maxWidth: "480px" }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "36px 32px 30px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 20px 45px rgba(29, 78, 216, 0.07), 0 2px 8px rgba(0, 0, 0, 0.02)",
            }}
          >
            {/* TiQTAX Signature Top Gradient Stripe */}
            <div style={{ height: "4px", background: "linear-gradient(90deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)", borderRadius: "24px 24px 0 0", margin: "-36px -32px 28px -32px" }} />

            {/* Header Icon & Title */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, rgba(255, 122, 0, 0.12) 0%, rgba(255, 20, 147, 0.15) 50%, rgba(124, 58, 237, 0.12) 100%)",
                  color: "#FF1493",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  border: "2px solid rgba(255, 20, 147, 0.3)",
                  boxShadow: "0 6px 18px rgba(255, 20, 147, 0.18)",
                  marginBottom: "14px",
                }}
              >
                🏛️
              </div>
              <h1 style={{ fontWeight: "900", fontSize: "22px", color: "#0E1B2E", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
                CA Firm Staff Console
              </h1>
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                Authorized sign-in for Chartered Accountants, Partners &amp; Audit Associates
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1.5px solid #fecaca",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  marginBottom: "18px",
                  fontSize: "12.5px",
                  color: "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>❌</span>
                <div>{error}</div>
              </div>
            )}

            {/* Form */}
            <CForm onSubmit={handleLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", marginBottom: "6px", display: "block" }}>
                  Official CA Firm Email
                </label>
                <CInputGroup>
                  <CInputGroupText style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRight: "none" }}>
                    ✉️
                  </CInputGroupText>
                  <CFormInput
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="e.g. admin@cataxportal.com"
                    style={{
                      border: "1.5px solid #e2e8f0",
                      padding: "10px 14px",
                      fontSize: "14px",
                    }}
                    required
                  />
                </CInputGroup>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a", margin: 0 }}>
                    Console Password
                  </label>
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>🔒 SSL Encrypted</span>
                </div>
                <CInputGroup>
                  <CInputGroupText style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRight: "none" }}>
                    🔒
                  </CInputGroupText>
                  <CFormInput
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      border: "1.5px solid #e2e8f0",
                      borderRight: "none",
                      padding: "10px 14px",
                      fontSize: "14px",
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderLeft: "none",
                      borderRadius: "0 8px 8px 0",
                      padding: "0 14px",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </CInputGroup>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "var(--color-muted, #64748B)" : "linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  padding: "13px 20px",
                  borderRadius: "12px",
                  fontSize: "14.5px",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 20px rgba(255, 20, 147, 0.35)",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" />
                    <span>Authenticating Console...</span>
                  </>
                ) : (
                  <span>Sign In to CA Firm Console →</span>
                )}
              </button>
            </CForm>

            {/* Quick 1-Click Demo Login Fill Buttons */}
            <div
              style={{
                marginTop: "20px",
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "12px",
              }}
            >
              <div style={{ fontWeight: "800", color: "#1e40af", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔑</span> Quick Demo Staff Access:
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin")}
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "7px 10px",
                    color: "#1d4ed8",
                    fontWeight: "800",
                    fontSize: "11.5px",
                    cursor: "pointer",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  👨‍💼 CA Partner (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("employee")}
                  style={{
                    flex: 1,
                    background: "#ffffff",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "7px 10px",
                    color: "#166534",
                    fontWeight: "800",
                    fontSize: "11.5px",
                    cursor: "pointer",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  🧑‍💼 CA Staff (Associate)
                </button>
              </div>
            </div>

            {/* Back to Client Taxpayer Portal */}
            <div style={{ textAlign: "center", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid #f1f5f9", fontSize: "12.5px" }}>
              <span style={{ color: "#64748b" }}>Are you a Taxpayer / Client? </span>
              <Link to="/login" style={{ color: "var(--color-primary, #ED04B4)", fontWeight: "800", textDecoration: "none" }}>
                Customer ITR Login →
              </Link>
            </div>
          </div>
        </CContainer>
      </main>

      {/* ════ FOOTER ════ */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#94a3b8",
          borderTop: "1px solid rgba(226, 232, 240, 0.6)",
        }}
      >
        <span>© 2026 TiQTAX · Chartered Accountant Firm Security &amp; Compliance Portal</span>
      </footer>
    </div>
  );
}
