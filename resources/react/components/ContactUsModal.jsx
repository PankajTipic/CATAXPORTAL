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
  CFormTextarea,
  CAlert,
  CSpinner,
} from "@coreui/react";
import api from "../api/client";

export default function ContactUsModal({ visible, onClose, defaultSubject = "" }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    subject: defaultSubject || "ITR Filing Support Inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setStatusMessage({ type: "danger", text: "Please provide your name, email and query message." });
      return;
    }

    setSubmitting(true);
    setStatusMessage({ type: "", text: "" });

    try {
      await api.post("/contact", formData);
      setStatusMessage({
        type: "success",
        text: "Thank you! Your inquiry has been submitted. A CA Support Specialist will contact you shortly.",
      });
      setTimeout(() => {
        setStatusMessage({ type: "", text: "" });
        setFormData((prev) => ({ ...prev, message: "" }));
        onClose();
      }, 2500);
    } catch (err) {
      setStatusMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to submit support request. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" alignment="center">
      <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
        <CModalTitle style={{ fontSize: "17px", fontWeight: "800", color: "#1E293B" }}>
          💬 Contact CA Support &amp; Helpdesk
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody style={{ padding: "24px" }}>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
            Have a question regarding your tax filing, Form 16, AIS data discrepancies, or CA agent service? Send us a message and our team of Chartered Accountants will assist you.
          </p>

          {statusMessage.text && (
            <CAlert color={statusMessage.type} className="py-2 px-3 mb-3" style={{ fontSize: "13px" }}>
              {statusMessage.text}
            </CAlert>
          )}

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Your Full Name
            </label>
            <CFormInput
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Rajesh Patil"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Email Address
            </label>
            <CFormInput
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. rajesh@example.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Subject
            </label>
            <CFormInput
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g. Question on 80C Deduction / AIS Mismatch"
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Message / Inquiry Details
            </label>
            <CFormTextarea
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Describe your query or tax situation in detail..."
              required
            />
          </div>
        </CModalBody>
        <CModalFooter style={{ background: "#f8fafc" }}>
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Close
          </CButton>
          <CButton
            type="submit"
            color="primary"
            disabled={submitting}
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)",
              border: "none",
              fontWeight: "700",
              padding: "8px 22px",
            }}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" /> Sending...
              </>
            ) : (
              "Send Message →"
            )}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
