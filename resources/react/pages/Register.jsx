import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { validatePassword, validatePhone } from "../validations/validators";
import logo from "../../../public/LOGO1.png";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email.";
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;
    const pwErr = validatePassword(form.password);
    if (pwErr) errs.password = pwErr;
    if (form.password !== form.password_confirmation) {
      errs.password_confirmation = "Passwords do not match.";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", form);
      localStorage.setItem("auth_token", data.token);
      navigate("/tax-profile");
    } catch (err) {
      setErrors(err.response?.data?.errors || { general: "Registration failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #fff7ed 50%, #fdf2f8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <Link to="/">
          <img src={logo} alt="TiQTAX" style={{ height: "38px", width: "auto", objectFit: "contain" }} />
        </Link>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "32px 28px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0E1B2E", margin: "0 0 6px" }}>
          Create your account
        </h1>
        <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 20px", lineHeight: "1.5" }}>
          This login is for your TiQTAX account to securely prepare and review your ITR.
        </p>

        {errors.general && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", color: "#dc2626", fontSize: "12px", marginBottom: "16px" }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginBottom: "5px" }}>
              Full name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
            {errors.name && <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "block" }}>{errors.name}</span>}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginBottom: "5px" }}>
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
            {errors.email && <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "block" }}>{errors.email}</span>}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginBottom: "5px" }}>
              Mobile number
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="10-digit mobile"
              maxLength={10}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
            {errors.phone && <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "block" }}>{errors.phone}</span>}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginBottom: "5px" }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
            {errors.password && <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "block" }}>{errors.password}</span>}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#0f172a", marginBottom: "5px" }}>
              Confirm password
            </label>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              placeholder="Repeat password"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }}
            />
            {errors.password_confirmation && <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: "600", marginTop: "3px", display: "block" }}>{errors.password_confirmation}</span>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontWeight: "800",
              fontSize: "14px",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(255, 20, 147, 0.25)",
            }}
          >
            {submitting ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", fontSize: "12.5px", color: "#64748b" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#FF1493", fontWeight: "700", textDecoration: "none" }}>
            Log in →
          </Link>
        </div>
      </div>
    </div>
  );
}
