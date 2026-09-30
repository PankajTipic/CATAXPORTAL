import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CButton,
  CAlert,
  CSpinner,
  CBadge,
} from "@coreui/react";
import api from "../api/client";

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
        background: "linear-gradient(135deg, #091322 0%, #0f172a 50%, #1e293b 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <CContainer style={{ maxWidth: "520px" }}>
        <CCard
          className="border-0 shadow-lg"
          style={{
            borderRadius: "20px",
            background: "rgba(30, 41, 59, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            color: "#ffffff",
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              padding: "36px 32px 24px",
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                boxShadow: "0 8px 24px rgba(56, 189, 248, 0.35)",
                marginBottom: "16px",
              }}
            >
              🏛️
            </div>
            <h2 style={{ fontWeight: "900", fontSize: "24px", letterSpacing: "0.4px", margin: "0 0 6px" }}>
              CA FIRM STAFF CONSOLE
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              Authorized Portal for Chartered Accountants &amp; Audit Staff
            </p>

            <div className="d-flex justify-content-center gap-2 mt-3">
              <CBadge color="info" className="px-2 py-1" style={{ fontSize: "11px" }}>
                🛡️ CA Partner (Admin)
              </CBadge>
              <CBadge color="primary" className="px-2 py-1" style={{ fontSize: "11px" }}>
                👨‍💼 CA Employee (Staff)
              </CBadge>
            </div>
          </div>

          <CCardBody style={{ padding: "32px" }}>
            {error && (
              <CAlert color="danger" className="py-2 px-3 mb-4" style={{ fontSize: "13px", borderRadius: "10px" }}>
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: "13px", color: "#e2e8f0" }}>
                  Official Email Address
                </label>
                <CInputGroup>
                  <CInputGroupText style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8" }}>
                    ✉️
                  </CInputGroupText>
                  <CFormInput
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="e.g. admin@cataxportal.com"
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      fontSize: "14px",
                      padding: "10px 14px",
                    }}
                    required
                  />
                </CInputGroup>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-semibold mb-0" style={{ fontSize: "13px", color: "#e2e8f0" }}>
                    Console Password
                  </label>
                  <span style={{ fontSize: "11px", color: "#38bdf8" }}>Secure SSL Login</span>
                </div>
                <CInputGroup>
                  <CInputGroupText style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8" }}>
                    🔒
                  </CInputGroupText>
                  <CFormInput
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#ffffff",
                      fontSize: "14px",
                      padding: "10px 14px",
                    }}
                    required
                  />
                  <CButton
                    type="button"
                    color="dark"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ border: "1px solid #334155" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </CButton>
                </CInputGroup>
              </div>

              <CButton
                type="submit"
                color="primary"
                size="lg"
                className="w-100"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  border: "none",
                  fontWeight: "800",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(2, 132, 199, 0.4)",
                }}
              >
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" /> Authenticating Console...
                  </>
                ) : (
                  "Sign In to CA Firm Console →"
                )}
              </CButton>
            </CForm>

            {/* Quick Demo Credentials Box */}
            <div
              style={{
                marginTop: "24px",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontWeight: "700", color: "#38bdf8", marginBottom: "6px" }}>
                🔑 Quick Demo Staff Logins:
              </div>
              <div>
                • <strong>CA Partner (Admin):</strong> <code>admin@cataxportal.com</code> | <code>admin123</code>
              </div>
              <div style={{ marginTop: "3px" }}>
                • <strong>CA Staff (Employee):</strong> <code>rahul.ca@cataxportal.com</code> | <code>employee123</code>
              </div>
            </div>

            {/* Back to Client Taxpayer Portal */}
            <div className="text-center mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px" }}>
              <span style={{ color: "#94a3b8" }}>Are you a Taxpayer / Client? </span>
              <Link to="/login" style={{ color: "#38bdf8", fontWeight: "700", textDecoration: "none" }}>
                Go to Customer ITR Login →
              </Link>
            </div>
          </CCardBody>
        </CCard>
      </CContainer>
    </div>
  );
}
