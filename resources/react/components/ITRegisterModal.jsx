import React, { useState } from "react";
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormInput,
  CRow,
  CCol,
  CAlert,
  CSpinner,
} from "@coreui/react";
import api from "../api/client";

export default function ITRegisterModal({ visible, onClose, onRegistered, defaultPan = "" }) {
  const [form, setForm] = useState({
    pan: defaultPan,
    name: "",
    dob: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    pincode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "pan" ? value.toUpperCase() : value,
    }));
  };

  const validate = () => {
    if (!form.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan)) {
      setError("Please enter a valid 10-character PAN number (e.g. ABCDE1234F).");
      return false;
    }
    if (!form.name.trim()) {
      setError("Full Name as per PAN is required.");
      return false;
    }
    if (!form.dob) {
      setError("Date of Birth is required.");
      return false;
    }
    if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        pan: form.pan,
        name: form.name,
        dob: form.dob,
        phone: form.mobile,
        email: form.email,
        password: form.password,
        address: form.address || "Main Road",
        city: form.city || "Mumbai",
        pincode: form.pincode || "400001",
      };

      const { data } = await api.post("/itr/register", payload);

      setSuccess(data.message || "Registered successfully on Income Tax Portal!");

      // Save token and user
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      if (data.tax_data) {
        localStorage.setItem("tax_data", JSON.stringify(data.tax_data));
      }

      setTimeout(() => {
        onClose();
        if (onRegistered) onRegistered(data, form.password);
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} size="lg" backdrop="static">
      <CModalHeader style={{ background: "#0b3d91", color: "#ffffff" }}>
        <CModalTitle style={{ fontSize: "17px", fontWeight: "700" }}>
          🏛️ Register on Income Tax e-Filing Portal
        </CModalTitle>
      </CModalHeader>

      <CModalBody style={{ padding: "24px" }}>
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "20px" }}>ℹ️</span>
          <div>
            <strong>Instant In-Portal Registration:</strong> You don't need to visit the external Income Tax portal. Fill in your PAN and personal details here; our system registers your PAN directly and sets up your ITR return file immediately.
          </div>
        </div>

        {error && <CAlert color="danger">{error}</CAlert>}
        {success && <CAlert color="success">{success}</CAlert>}

        <CForm onSubmit={handleSubmit}>
          <CRow className="g-3">
            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_pan">
                PAN Number <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_pan"
                name="pan"
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                value={form.pan}
                onChange={handleChange}
                style={{ textTransform: "uppercase", fontWeight: "600", letterSpacing: "1px" }}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_name">
                Full Name (As on PAN Card) <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_name"
                name="name"
                placeholder="e.g. Rajesh Kumar Sharma"
                value={form.name}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_dob">
                Date of Birth <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_dob"
                name="dob"
                type="date"
                value={form.dob}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_mobile">
                Mobile Number <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_mobile"
                name="mobile"
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={form.mobile}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={12}>
              <label className="form-label fw-semibold" htmlFor="reg_email">
                Email Address <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_password">
                Set Income Tax Portal Password <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_confirmPassword">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <CFormInput
                id="reg_confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_city">
                City
              </label>
              <CFormInput
                id="reg_city"
                name="city"
                placeholder="e.g. Mumbai / Nashik"
                value={form.city}
                onChange={handleChange}
              />
            </CCol>

            <CCol md={6}>
              <label className="form-label fw-semibold" htmlFor="reg_pincode">
                Pincode
              </label>
              <CFormInput
                id="reg_pincode"
                name="pincode"
                placeholder="6-digit pincode"
                maxLength={6}
                value={form.pincode}
                onChange={handleChange}
              />
            </CCol>
          </CRow>
        </CForm>
      </CModalBody>

      <CModalFooter style={{ borderTop: "1px solid #e5e7eb" }}>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #0b3d91 0%, #1a5bb8 100%)",
            border: "none",
            fontWeight: "600",
            padding: "8px 24px",
          }}
        >
          {loading ? (
            <>
              <CSpinner size="sm" className="me-2" /> Registering on IT Portal...
            </>
          ) : (
            "Complete Registration & Prepare Return"
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  );
}
