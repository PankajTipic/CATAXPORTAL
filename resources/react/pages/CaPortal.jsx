import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CBadge,
  CButton,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CFormInput,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from "@coreui/react";
import api from "../api/client";
import AgentChat from "../components/AgentChat";

export default function CaPortal() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Sidebar Nav
  const [activeNav, setActiveNav] = useState("all_cases"); // 'all_cases' | 'pending_cases' | 'in_progress' | 'prepared' | 'staff_directory' | 'contact_inquiries'
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [preparedFile, setPreparedFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const [showChatModal, setShowChatModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState({ type: "", text: "" });

  // Enterprise workflow
  const [detailsTab, setDetailsTab] = useState("overview"); // 'overview' | 'workflow' | 'audit'
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowAlert, setWorkflowAlert] = useState({ type: "", text: "" });
  const [draftNote, setDraftNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Staff Management CRUD state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    role: "employee",
    password: "",
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // 1. Get logged in user profile
      const { data: meData } = await api.get("/auth/me");
      const user = meData.user || meData;
      setCurrentUser(user);

      if (user.role === "employee") {
        // Employee gets assigned requests
        const { data } = await api.get("/employee/agent-requests");
        setRequests(data.data || []);
      } else {
        // Admin gets all requests & staff directory
        const { data } = await api.get("/admin/agent-requests");
        setRequests(data.data || []);
      }

      // Load all staff from /admin/employees
      try {
        const { data: staffData } = await api.get("/admin/employees");
        setEmployees(staffData.data || []);
      } catch {
        // fallback
      }

      // All CA staff can see contact inquiries
      try {
        const { data: contactData } = await api.get("/contacts");
        setContacts(Array.isArray(contactData) ? contactData : contactData.data || []);
      } catch {
        // Silently skip if contacts endpoint unavailable
      }
    } catch (err) {
      console.error("Failed to load CA console data:", err);
      if (err.response?.status === 401) {
        navigate("/ca-login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  // Staff CRUD handlers
  const handleOpenAddStaff = () => {
    setStaffFormData({
      id: null,
      name: "",
      email: "",
      phone: "",
      role: "employee",
      password: "",
    });
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = (emp) => {
    setStaffFormData({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || "",
      role: emp.role || "employee",
      password: "",
    });
    setShowEditStaffModal(true);
  };

  const handleSaveStaff = async (isEdit = false) => {
    if (!staffFormData.name || !staffFormData.email) {
      alert("Please provide staff name and email address.");
      return;
    }
    if (!isEdit && !staffFormData.password) {
      alert("Please provide an initial password for the staff account.");
      return;
    }

    setStaffSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/admin/employees/${staffFormData.id}`, staffFormData);
        setActionAlert({ type: "success", text: `Staff member ${staffFormData.name} updated successfully.` });
        setShowEditStaffModal(false);
      } else {
        await api.post("/admin/employees", staffFormData);
        setActionAlert({ type: "success", text: `Staff member ${staffFormData.name} created successfully.` });
        setShowAddStaffModal(false);
      }
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save staff member.");
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleDeleteStaff = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.name} from the CA staff directory? Any active cases will be returned to the unassigned queue.`)) {
      return;
    }
    try {
      await api.delete(`/admin/employees/${emp.id}`);
      setActionAlert({ type: "success", text: `Staff member ${emp.name} removed successfully.` });
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete staff member.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("is_ca_staff");
    navigate("/ca-login");
  };

  // Assign Employee
  const handleAssignSubmit = async () => {
    if (!selectedEmployeeId || !selectedRequest) return;
    setActionLoading(true);
    setActionAlert({ type: "", text: "" });

    try {
      const { data } = await api.patch(`/admin/agent-requests/${selectedRequest.id}/assign`, {
        employee_id: selectedEmployeeId,
      });
      setActionAlert({ type: "success", text: data.message });
      setShowAssignModal(false);
      fetchPortalData();
    } catch (err) {
      setActionAlert({ type: "danger", text: err.response?.data?.message || "Assignment failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change
  const handleStatusChange = async (req, newStatus) => {
    try {
      const { data } = await api.patch(`/agent-requests/${req.id}/status`, {
        status: newStatus,
      });
      setActionAlert({ type: "success", text: data.message });
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  };

  // Upload Prepared File
  const handleUploadPreparedFile = async (e) => {
    e.preventDefault();
    if (!preparedFile || !selectedRequest) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("prepared_file", preparedFile);
      formData.append("file_name", fileName || preparedFile.name);

      const { data } = await api.post(
        `/agent-requests/${selectedRequest.id}/upload-prepared`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setActionAlert({ type: "success", text: data.message });
      setShowUploadModal(false);
      setPreparedFile(null);
      setFileName("");
      fetchPortalData();
    } catch (err) {
      setActionAlert({ type: "danger", text: err.response?.data?.message || "Upload failed." });
    } finally {
      setActionLoading(false);
    }
  };

  /* ═══════ Enterprise Workflow Actions ═══════ */
  const enterpriseAction = async (endpoint, body = {}, successMsg = "Done") => {
    if (!selectedRequest) return;
    setWorkflowLoading(true);
    setWorkflowAlert({ type: "", text: "" });
    try {
      const { data } = await api.post(
        `/agent-requests/${selectedRequest.id}/${endpoint}`,
        body
      );
      setWorkflowAlert({ type: "success", text: data.message || successMsg });
      fetchPortalData();
    } catch (err) {
      setWorkflowAlert({
        type: "danger",
        text: err.response?.data?.message || "Action failed.",
      });
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleVerifyDocument = (docId, action) =>
    enterpriseAction("verify-document", { document_id: docId, action }, `Document ${action}d.`);

  const handleSaveDraft = () =>
    enterpriseAction("save-return-draft", { notes: draftNote }, "Return draft saved.");

  const handleApproveFiling = () =>
    enterpriseAction("approve-filing", {}, "Filing approved.");

  const handleQualityGate = () =>
    enterpriseAction("sign-off-quality-gate", {}, "Quality gate signed off.");

  const handleMarkFiled = () =>
    enterpriseAction("mark-filed", {}, "Return marked as filed on IT portal.");

  // Filtering
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      (req.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.details?.pan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(req.id).includes(searchTerm);

    if (!matchesSearch) return false;

    if (activeNav === "pending_cases") return req.status === "pending";
    if (activeNav === "in_progress") return req.status === "in_progress" || req.status === "assigned";
    if (activeNav === "prepared") return req.status === "prepared" || req.status === "completed";

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <CBadge color="warning" className="px-2 py-1">⏳ Pending Assignment</CBadge>;
      case "assigned":
        return <CBadge color="info" className="px-2 py-1">👨‍💼 Staff Assigned</CBadge>;
      case "in_progress":
        return <CBadge color="primary" className="px-2 py-1">⚡ In Preparation</CBadge>;
      case "prepared":
        return <CBadge color="success" className="px-2 py-1">✅ File Ready</CBadge>;
      case "completed":
        return <CBadge color="dark" className="px-2 py-1">🏁 Return Filed</CBadge>;
      default:
        return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* ═════════ 1. PROFESSIONAL SIDEBAR ═════════ */}
      <div
        style={{
          width: "260px",
          background: "linear-gradient(180deg, #0b1f3a 0%, #08162b 100%)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div className="d-flex align-items-center gap-2">
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#38bdf8",
                color: "#0b1f3a",
                fontWeight: "900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🏛️
            </div>
            <div>
              <div style={{ fontWeight: "900", fontSize: "15px", letterSpacing: "0.5px" }}>CA TAX FIRM</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Management Console</div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>LOGGED IN AS:</div>
          <div style={{ fontWeight: "800", fontSize: "14px", color: "#ffffff", marginTop: "2px" }}>
            {currentUser?.name || "CA Staff"}
          </div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <span
              className="badge"
              style={{
                background: isAdmin ? "#ef4444" : "#0284c7",
                fontSize: "10px",
                fontWeight: "800",
                textTransform: "uppercase",
              }}
            >
              {isAdmin ? "⭐ CA Partner (Admin)" : "👨‍💼 CA Specialist"}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", paddingLeft: "10px", marginBottom: "4px" }}>
            FILING WORKSPACE
          </div>

          {[
            { id: "all_cases", label: "All Client Files", icon: "📁", count: requests.length },
            {
              id: "pending_cases",
              label: "Pending Allocation",
              icon: "⏳",
              count: requests.filter((r) => r.status === "pending").length,
            },
            {
              id: "in_progress",
              label: "In Preparation",
              icon: "⚡",
              count: requests.filter((r) => r.status === "in_progress" || r.status === "assigned").length,
            },
            {
              id: "prepared",
              label: "Completed / Ready",
              icon: "✅",
              count: requests.filter((r) => r.status === "prepared" || r.status === "completed").length,
            },
            {
              id: "contact_inquiries",
              label: "Contact Inquiries",
              icon: "📨",
              count: contacts.length,
              highlight: contacts.length > 0,
            },
          ].map((item) => {
            const active = activeNav === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: active ? "rgba(56, 189, 248, 0.16)" : "transparent",
                  color: active ? "#38bdf8" : "#cbd5e1",
                  fontWeight: active ? "700" : "500",
                  fontSize: "13px",
                  borderLeft: active ? "3px solid #38bdf8" : item.highlight ? "3px solid #f59e0b" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span
                  style={{
                    background: active ? "#38bdf8" : item.highlight ? "#f59e0b" : "rgba(255,255,255,0.1)",
                    color: active ? "#0b1f3a" : item.highlight ? "#0b1f3a" : "#94a3b8",
                    padding: "1px 8px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {item.count}
                </span>
              </div>
            );
          })}

          {isAdmin && (
            <>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", paddingLeft: "10px", marginTop: "16px", marginBottom: "4px" }}>
                FIRM DIRECTORY
              </div>
              <div
                onClick={() => setActiveNav("staff_directory")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: activeNav === "staff_directory" ? "rgba(56, 189, 248, 0.16)" : "transparent",
                  color: activeNav === "staff_directory" ? "#38bdf8" : "#cbd5e1",
                  fontWeight: activeNav === "staff_directory" ? "700" : "500",
                  fontSize: "13px",
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span>👥</span>
                  <span>CA Staff Directory</span>
                </div>
                <span className="badge bg-secondary">{employees.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{ padding: "16px 14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-2"
            style={{ borderRadius: "8px", padding: "8px" }}
          >
            <span>🔒</span> Logout Console
          </button>
        </div>
      </div>

      {/* ═════════ 2. MAIN WORKSPACE CONSOLE ═════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        {/* Top Header */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 28px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h4 style={{ fontWeight: "900", margin: "0", color: "#0f172a", fontSize: "20px" }}>
              {activeNav === "staff_directory"
                ? "Chartered Accountant Associates & Staff Directory"
                : activeNav === "contact_inquiries"
                ? "Customer Contact Inquiries"
                : "Taxpayer Client Filing Cases"}
            </h4>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {activeNav === "contact_inquiries"
                ? `${contacts.length} inquiry message(s) received from clients`
                : "Financial Year 2025-26 • Assessment Year 2026-27 Console"}
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Search Input */}
            <div style={{ width: "260px" }}>
              <CFormInput
                size="sm"
                placeholder="🔍 Search PAN, Client, or Case #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: "8px" }}
              />
            </div>

            <button
              onClick={fetchPortalData}
              className="btn btn-light btn-sm fw-bold border"
              title="Refresh Data"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div style={{ padding: "28px", flex: 1 }}>
          {actionAlert.text && (
            <CAlert color={actionAlert.type} dismissible className="mb-4 shadow-sm fw-bold">
              {actionAlert.text}
            </CAlert>
          )}

          {/* Quick Stats Grid */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>TOTAL CLIENT CASES</div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>{requests.length}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#f59e0b", textTransform: "uppercase" }}>PENDING ASSIGNMENT</div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#b45309", marginTop: "4px" }}>
                  {requests.filter((r) => r.status === "pending").length}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#0284c7", textTransform: "uppercase" }}>IN PREPARATION</div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#0369a1", marginTop: "4px" }}>
                  {requests.filter((r) => r.status === "in_progress" || r.status === "assigned").length}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a", textTransform: "uppercase" }}>FILES PREPARED / READY</div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#15803d", marginTop: "4px" }}>
                  {requests.filter((r) => r.status === "prepared" || r.status === "completed").length}
                </div>
              </div>
            </div>
          </div>

          {/* ═════════ VIEW A: STRUCTURED DATA TABLE (CASES) ═════════ */}
          {activeNav !== "staff_directory" && activeNav !== "contact_inquiries" && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "16px" }}>
                  {filteredRequests.length} Client Records Listed
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Click row action buttons to assign staff, view documents, chat, or upload return
                </span>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted fw-bold">Loading cases...</div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: "42px", marginBottom: "8px" }}>📭</div>
                  <strong>No client cases found matching this view.</strong>
                </div>
              ) : (
                <div className="table-responsive">
                  <CTable hover align="middle" style={{ margin: 0, fontSize: "13px" }}>
                    <CTableHead style={{ background: "#f8fafc" }}>
                      <CTableRow>
                        <CTableHeaderCell style={{ padding: "14px 18px" }}>CASE ID</CTableHeaderCell>
                        <CTableHeaderCell>CLIENT / TAXPAYER</CTableHeaderCell>
                        <CTableHeaderCell>PAN / AY</CTableHeaderCell>
                        <CTableHeaderCell>SERVICE TYPE</CTableHeaderCell>
                        <CTableHeaderCell>ASSIGNED CA STAFF</CTableHeaderCell>
                        <CTableHeaderCell>STATUS</CTableHeaderCell>
                        <CTableHeaderCell style={{ textAlign: "right", paddingRight: "20px" }}>
                          ROW ACTIONS
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredRequests.map((req) => (
                        <CTableRow key={req.id}>
                          {/* Case ID */}
                          <CTableDataCell style={{ padding: "14px 18px", fontWeight: "800", color: "#0b3d91" }}>
                            #{req.id}
                          </CTableDataCell>

                          {/* Client */}
                          <CTableDataCell>
                            <div style={{ fontWeight: "800", color: "#0f172a" }}>{req.user?.name || "Client"}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {req.user?.email} • 📞 {req.details?.contact_phone || req.user?.phone || "N/A"}
                            </div>
                          </CTableDataCell>

                          {/* PAN / AY */}
                          <CTableDataCell>
                            <span
                              style={{
                                background: "#f1f5f9",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: "700",
                                color: "#1e293b",
                              }}
                            >
                              {req.details?.pan || "N/A"}
                            </span>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              AY {req.assessment_year}
                            </div>
                          </CTableDataCell>

                          {/* Service Type */}
                          <CTableDataCell>
                            <span style={{ fontWeight: "600", textTransform: "capitalize", color: "#334155" }}>
                              {req.service_type?.replace("_", " ")}
                            </span>
                            {req.details?.customer_documents?.length > 0 && (
                              <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "2px" }}>
                                📎 {req.details.customer_documents.length} Doc(s) Attached
                              </div>
                            )}
                          </CTableDataCell>

                          {/* Assigned Employee */}
                          <CTableDataCell>
                            {req.assigned_employee ? (
                              <div>
                                <span style={{ fontWeight: "700", color: "#0b3d91" }}>
                                  👨‍💼 {req.assigned_employee.name}
                                </span>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                  {req.assigned_employee.email}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#eab308", fontWeight: "700" }}>⚠️ Unallocated</span>
                            )}
                          </CTableDataCell>

                          {/* Status Badge */}
                          <CTableDataCell>{getStatusBadge(req.status)}</CTableDataCell>

                          {/* Action Buttons in Row */}
                          <CTableDataCell style={{ textAlign: "right", paddingRight: "20px" }}>
                            <div className="d-inline-flex gap-1">
                              {/* 0. Dedicated Full Client Details & Return Studio Page */}
                              <button
                                onClick={() => navigate(`/ca-portal/client/${req.id}`)}
                                className="btn btn-primary btn-sm fw-bold text-white"
                                title="Open Dedicated Client Details & Tax Preparation Studio"
                                style={{
                                  background: "#0284c7",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                }}
                              >
                                🔍 Details
                              </button>

                              {/* 1. View Details & Docs Button */}
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowDetailsModal(true);
                                }}
                                className="btn btn-outline-secondary btn-sm fw-bold"
                                title="View Details & Documents"
                                style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "12px" }}
                              >
                                📄 Docs
                              </button>

                              {/* 2. Assign Staff (Admin Only) */}
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setSelectedEmployeeId(req.assigned_employee_id || "");
                                    setShowAssignModal(true);
                                  }}
                                  className="btn btn-outline-warning btn-sm fw-bold"
                                  title="Assign to Staff"
                                  style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "12px" }}
                                >
                                  👨‍💼 Assign
                                </button>
                              )}

                              {/* 3. Upload Finalized ITR File */}
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowUploadModal(true);
                                }}
                                className="btn btn-outline-success btn-sm fw-bold"
                                title="Upload Final Return File"
                                style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "12px" }}
                              >
                                📤 Upload
                              </button>

                              {/* 4. Live Chat */}
                              <button
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowChatModal(true);
                                }}
                                className="btn btn-primary btn-sm fw-bold text-white"
                                title="Chat with Client"
                                style={{
                                  background: "#0b3d91",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "4px 12px",
                                  fontSize: "12px",
                                }}
                              >
                                💬 Chat
                              </button>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </div>
          )}

          {/* ═════════ VIEW B: STAFF DIRECTORY (ADMIN VIEW) ═════════ */}
          {activeNav === "staff_directory" && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h5 style={{ fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    Active CA Associates &amp; Filing Employees ({employees.length})
                  </h5>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Staff members who handle client file preparations, tax computation, and return verification
                  </div>
                </div>

                {isAdmin && (
                  <CButton
                    color="primary"
                    size="sm"
                    className="fw-bold d-flex align-items-center gap-1 text-white"
                    style={{
                      background: "linear-gradient(135deg, #0b3d91 0%, #1a5bb8 100%)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                    }}
                    onClick={handleOpenAddStaff}
                  >
                    ➕ Add New Staff Associate
                  </CButton>
                )}
              </div>

              <div className="table-responsive">
                <CTable hover align="middle" style={{ margin: 0, fontSize: "13px" }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ padding: "14px 18px" }}>EMPLOYEE ID</CTableHeaderCell>
                      <CTableHeaderCell>NAME &amp; SPECIALIZATION</CTableHeaderCell>
                      <CTableHeaderCell>EMAIL ADDRESS</CTableHeaderCell>
                      <CTableHeaderCell>PHONE CONTACT</CTableHeaderCell>
                      <CTableHeaderCell>CURRENT ASSIGNED CASES</CTableHeaderCell>
                      <CTableHeaderCell>ROLE STATUS</CTableHeaderCell>
                      {isAdmin && <CTableHeaderCell className="text-end" style={{ paddingRight: "18px" }}>ACTIONS</CTableHeaderCell>}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {employees.map((emp) => {
                      const empCases = requests.filter((r) => r.assigned_employee_id === emp.id);
                      const isSelf = currentUser?.id === emp.id;
                      return (
                        <CTableRow key={emp.id}>
                          <CTableDataCell style={{ padding: "14px 18px", fontWeight: "800", color: "#0b3d91" }}>
                            EMP-{emp.id}
                          </CTableDataCell>
                          <CTableDataCell style={{ fontWeight: "800", color: "#0f172a" }}>
                            👨‍💼 {emp.name} {isSelf && <span className="badge bg-secondary ms-1">You</span>}
                          </CTableDataCell>
                          <CTableDataCell>{emp.email}</CTableDataCell>
                          <CTableDataCell>{emp.phone || "Official Desk"}</CTableDataCell>
                          <CTableDataCell>
                            <span className="badge bg-primary px-2 py-1">
                              {emp.active_cases_count ?? empCases.length} Active Cases
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className={`badge ${emp.role === "admin" ? "bg-purple text-dark" : "bg-success"}`}>
                              {emp.role === "admin" ? "Principal CA (Admin)" : "Filing Specialist"}
                            </span>
                          </CTableDataCell>
                          {isAdmin && (
                            <CTableDataCell className="text-end" style={{ paddingRight: "18px" }}>
                              <div className="d-flex justify-content-end gap-1">
                                <button
                                  className="btn btn-outline-primary btn-sm fw-bold"
                                  style={{ borderRadius: "6px", fontSize: "12px", padding: "3px 8px" }}
                                  onClick={() => handleOpenEditStaff(emp)}
                                  title="Edit Staff Member"
                                >
                                  ✏️ Edit
                                </button>
                                {!isSelf && (
                                  <button
                                    className="btn btn-outline-danger btn-sm fw-bold"
                                    style={{ borderRadius: "6px", fontSize: "12px", padding: "3px 8px" }}
                                    onClick={() => handleDeleteStaff(emp)}
                                    title="Delete Staff Member"
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      );
                    })}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
          {/* ═════════ VIEW C: CONTACT INQUIRIES ═════════ */}
          {activeNav === "contact_inquiries" && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "16px" }}>
                  📨 {contacts.length} Contact Message(s) from Clients
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Messages submitted via the public contact form
                </span>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <div className="mt-2 text-muted fw-bold">Loading inquiries...</div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: "42px", marginBottom: "8px" }}>📭</div>
                  <strong>No contact inquiries received yet.</strong>
                </div>
              ) : (
                <div className="table-responsive">
                  <CTable hover align="middle" style={{ margin: 0, fontSize: "13px" }}>
                    <CTableHead style={{ background: "#f8fafc" }}>
                      <CTableRow>
                        <CTableHeaderCell style={{ padding: "14px 18px" }}>#</CTableHeaderCell>
                        <CTableHeaderCell>NAME</CTableHeaderCell>
                        <CTableHeaderCell>EMAIL</CTableHeaderCell>
                        <CTableHeaderCell>SUBJECT</CTableHeaderCell>
                        <CTableHeaderCell>MESSAGE</CTableHeaderCell>
                        <CTableHeaderCell>RECEIVED ON</CTableHeaderCell>
                        {isAdmin && <CTableHeaderCell style={{ textAlign: "right", paddingRight: "20px" }}>ACTION</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {contacts.map((c, idx) => (
                        <CTableRow key={c.id}>
                          <CTableDataCell style={{ padding: "14px 18px", fontWeight: "800", color: "#0b3d91" }}>
                            {idx + 1}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{c.name}</div>
                          </CTableDataCell>
                          <CTableDataCell>
                            <a href={`mailto:${c.email}`} style={{ color: "#0284c7", fontWeight: "600", textDecoration: "none" }}>
                              {c.email}
                            </a>
                          </CTableDataCell>
                          <CTableDataCell>
                            <span
                              style={{
                                background: "#f1f5f9",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontWeight: "600",
                                color: "#334155",
                                fontSize: "12px",
                              }}
                            >
                              {c.subject || <span style={{ color: "#94a3b8" }}>No Subject</span>}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell style={{ maxWidth: "280px" }}>
                            <div
                              style={{
                                color: "#475569",
                                fontSize: "12px",
                                lineHeight: "1.5",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                              title={c.message}
                            >
                              {c.message || "—"}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: "12px" }}>
                            {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }) : "—"}
                          </CTableDataCell>
                          {isAdmin && (
                            <CTableDataCell style={{ textAlign: "right", paddingRight: "20px" }}>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Delete inquiry from ${c.name}?`)) return;
                                  try {
                                    await api.delete(`/contacts/${c.id}`);
                                    setContacts((prev) => prev.filter((x) => x.id !== c.id));
                                  } catch (err) {
                                    alert(err.response?.data?.message || "Delete failed.");
                                  }
                                }}
                                className="btn btn-outline-danger btn-sm fw-bold"
                                style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "12px" }}
                              >
                                🗑️ Delete
                              </button>
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═════════ MODAL 1: DETAILS, ENTERPRISE WORKFLOW & AUDIT ═════════ */}
      <CModal
        visible={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setDetailsTab("overview"); setWorkflowAlert({ type: "", text: "" }); }}
        size="xl"
      >
        <CModalHeader style={{ background: "#0b1f3a", color: "#fff", padding: "16px 24px" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "17px", color: "#fff" }}>
            📁 Case #{selectedRequest?.id} — {selectedRequest?.user?.name}
            <span style={{ marginLeft: "10px", fontSize: "12px", background: "rgba(255,255,255,0.15)", padding: "2px 10px", borderRadius: "12px", fontWeight: "600" }}>
              AY {selectedRequest?.assessment_year}
            </span>
          </CModalTitle>
        </CModalHeader>

        {/* Tab Bar */}
        <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "0", padding: "0 24px" }}>
          {[
            { id: "overview", label: "📄 Overview & Docs" },
            { id: "workflow", label: "⚙️ Enterprise Workflow" },
            { id: "audit", label: "🔒 Audit Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setDetailsTab(tab.id); setWorkflowAlert({ type: "", text: "" }); }}
              style={{
                padding: "12px 18px",
                border: "none",
                background: "transparent",
                fontWeight: detailsTab === tab.id ? "800" : "600",
                fontSize: "13px",
                color: detailsTab === tab.id ? "#0b3d91" : "#64748b",
                borderBottom: detailsTab === tab.id ? "3px solid #0b3d91" : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CModalBody style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
          {selectedRequest && (
            <div>

              {/* ── TAB: OVERVIEW & DOCS ── */}
              {detailsTab === "overview" && (
                <div>
                  <div className="row g-3 mb-4">
                    {[
                      { label: "TAXPAYER PAN", value: selectedRequest.details?.pan || "N/A", color: "#0b3d91" },
                      { label: "ASSESSMENT YEAR", value: `AY ${selectedRequest.assessment_year}`, color: "#0f172a" },
                      { label: "SERVICE TYPE", value: selectedRequest.service_type?.replace("_", " ").toUpperCase(), color: "#0284c7" },
                      { label: "CURRENT STATUS", value: selectedRequest.status?.toUpperCase(), color: selectedRequest.status === "completed" ? "#15803d" : "#b45309" },
                    ].map((item) => (
                      <div key={item.label} className="col-md-3">
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>{item.label}</div>
                          <div style={{ fontWeight: "800", fontSize: "14px", color: item.color, marginTop: "3px" }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div style={{ fontWeight: "800", fontSize: "13px", color: "#334155", marginBottom: "6px" }}>Client Notes:</div>
                    <div style={{ background: "#f1f5f9", padding: "14px", borderRadius: "10px", fontSize: "13px", color: "#1e293b", lineHeight: "1.6" }}>
                      {selectedRequest.notes || "No special notes provided by client."}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div style={{ fontWeight: "800", fontSize: "13px", color: "#334155", marginBottom: "8px" }}>Client Uploaded Supporting Documents:</div>
                    {selectedRequest.details?.customer_documents?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {selectedRequest.details.customer_documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-light btn-sm fw-bold border text-primary d-inline-flex align-items-center gap-1"
                            style={{ padding: "8px 12px", borderRadius: "8px" }}
                          >
                            📥 {doc.original_name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: "13px" }}>No documents uploaded by client.</div>
                    )}
                  </div>

                  {selectedRequest.uploaded_file_path && (
                    <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#15803d" }}>
                      <strong>✅ Prepared File Ready for Client:</strong>{" "}
                      <a href={selectedRequest.uploaded_file_path} target="_blank" rel="noreferrer" className="fw-bold text-success text-decoration-underline ms-1">
                        {selectedRequest.file_name || "Download File"}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: ENTERPRISE WORKFLOW ── */}
              {detailsTab === "workflow" && (
                <div>
                  {workflowAlert.text && (
                    <CAlert color={workflowAlert.type} dismissible className="mb-4 fw-bold" onClose={() => setWorkflowAlert({ type: "", text: "" })}>
                      {workflowAlert.type === "success" ? "✅ " : "⚠️ "}{workflowAlert.text}
                    </CAlert>
                  )}

                  {/* Stage 1: Document Verification */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ background: "#dbeafe", color: "#1d4ed8", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>1</span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>Document Verification</span>
                    </div>
                    {selectedRequest.details?.customer_documents?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedRequest.details.customer_documents.map((doc, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>📄 {doc.original_name}</span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleVerifyDocument(doc.id || idx, "verify")}
                                disabled={workflowLoading}
                                style={{ padding: "4px 12px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                              >
                                ✓ Verified
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(doc.id || idx, "reject")}
                                disabled={workflowLoading}
                                style={{ padding: "4px 12px", background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: "13px" }}>No client documents to verify.</div>
                    )}
                  </div>

                  {/* Stage 2: Save Return Draft */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ background: "#e0e7ff", color: "#3730a3", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>2</span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>Save Return Draft</span>
                    </div>
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Add computation notes, regime choice rationale, or key observations for this return..."
                      rows={3}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", marginBottom: "10px", resize: "vertical", fontFamily: "inherit" }}
                    />
                    <button
                      onClick={handleSaveDraft}
                      disabled={workflowLoading}
                      style={{ padding: "8px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
                    >
                      {workflowLoading ? "Saving..." : "💾 Save Return Draft"}
                    </button>
                  </div>

                  {/* Stage 3: Approve Filing */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ background: "#dcfce7", color: "#166534", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>3</span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>Approve Filing</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                      Confirms that computation is complete, regime is chosen, and the return is ready for quality review. Notifies the client.
                    </p>
                    <button
                      onClick={handleApproveFiling}
                      disabled={workflowLoading}
                      style={{ padding: "8px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" }}
                    >
                      {workflowLoading ? "Processing..." : "✅ Approve Filing"}
                    </button>
                  </div>

                  {/* Stage 4: Quality Gate */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ background: "#fef3c7", color: "#b45309", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>4</span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>CA Partner Quality Gate Sign-off</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                      Partner-level review confirming all computations are accurate before portal submission. Creates an immutable audit entry.
                    </p>
                    <button
                      onClick={handleQualityGate}
                      disabled={workflowLoading}
                      style={{ padding: "8px 20px", background: "#d97706", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(217,119,6,0.3)" }}
                    >
                      {workflowLoading ? "Processing..." : "🏆 Sign-off Quality Gate"}
                    </button>
                  </div>

                  {/* Stage 5: Mark Filed */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ background: "#f1f5f9", color: "#334155", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "13px" }}>5</span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>Mark Filed on IT Portal</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                      Final step: Confirms ITR has been successfully filed on the Income Tax e-Filing portal. Changes status to <strong>Completed</strong>.
                    </p>
                    <button
                      onClick={handleMarkFiled}
                      disabled={workflowLoading}
                      style={{ padding: "8px 20px", background: "#0b1f3a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(11,31,58,0.3)" }}
                    >
                      {workflowLoading ? "Processing..." : "🏁 Mark as Filed (IT Portal)"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: AUDIT LOG ── */}
              {detailsTab === "audit" && (
                <div>
                  <div style={{ background: "#0b1f3a", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>🔒</span>
                    <div>
                      <div style={{ color: "#38bdf8", fontWeight: "800", fontSize: "13px" }}>Immutable Audit Trail</div>
                      <div style={{ color: "#94a3b8", fontSize: "12px" }}>All actions are timestamped, actor-attributed, and cannot be altered.</div>
                    </div>
                  </div>
                  {selectedRequest.audit_logs?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedRequest.audit_logs.map((log, idx) => (
                        <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div>
                            <span style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{log.action}</span>
                            {log.details && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{typeof log.details === "object" ? JSON.stringify(log.details) : log.details}</div>}
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>by <strong>{log.actor?.name || log.actor_id || "System"}</strong></div>
                          </div>
                          <div style={{ whiteSpace: "nowrap", fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>No audit entries yet for this case.</div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>Entries are created when workflow actions are performed.</div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setShowDetailsModal(false); setDetailsTab("overview"); }}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 2: ASSIGN STAFF (ADMIN ONLY) ═════════ */}
      <CModal visible={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <CModalHeader>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            Assign Case #{selectedRequest?.id} to CA Associate
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Select CA Staff Specialist:
            </label>
            <CFormSelect
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">-- Choose CA Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </CFormSelect>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b" }}>
            Once assigned, this case will appear in the staff member's queue, enabling them to chat with the client and upload the finalized return file.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleAssignSubmit}
            disabled={actionLoading || !selectedEmployeeId}
            style={{ fontWeight: "700" }}
          >
            {actionLoading ? "Assigning..." : "Confirm Assignment"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 3: UPLOAD PREPARED ITR FILE ═════════ */}
      <CModal visible={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <CModalHeader>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            Upload Finalized Return for Case #{selectedRequest?.id}
          </CModalTitle>
        </CModalHeader>
        <form onSubmit={handleUploadPreparedFile}>
          <CModalBody>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Select File (PDF Calculation Sheet, XML, JSON, ZIP):
              </label>
              <CFormInput
                type="file"
                required
                onChange={(e) => {
                  const f = e.target.files[0];
                  setPreparedFile(f);
                  if (f && !fileName) setFileName(f.name);
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                Display Title for Client:
              </label>
              <CFormInput
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Final_ITR_Computation_AY2026-27.pdf"
              />
            </div>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              Upon upload, the status will automatically update to <strong>"File Ready"</strong> and the client will be able to download the file directly from their dashboard.
            </p>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowUploadModal(false)}>
              Cancel
            </CButton>
            <CButton
              type="submit"
              color="success"
              style={{ color: "#fff", fontWeight: "700" }}
              disabled={actionLoading || !preparedFile}
            >
              {actionLoading ? "Uploading..." : "Upload & Notify Client"}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* ═════════ MODAL 4: LIVE CHAT MODAL ═════════ */}
      <CModal visible={showChatModal} onClose={() => setShowChatModal(false)} size="lg">
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            Client Consultation Chat — Case #{selectedRequest?.id} ({selectedRequest?.user?.name})
          </CModalTitle>
        </CModalHeader>
        <CModalBody style={{ padding: 0 }}>
          {selectedRequest && (
            <AgentChat
              requestId={selectedRequest.id}
              isAgentOrAdmin={true}
              currentUserName={currentUser?.name || "CA Staff"}
            />
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowChatModal(false)}>
            Close Chat
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 5: ADD STAFF MEMBER (ADMIN ONLY) ═════════ */}
      <CModal visible={showAddStaffModal} onClose={() => setShowAddStaffModal(false)}>
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            ➕ Add New CA Staff Associate
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Full Name *
            </label>
            <CFormInput
              value={staffFormData.name}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. CA Amit Sharma"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Email Address (Login Username) *
            </label>
            <CFormInput
              type="email"
              value={staffFormData.email}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="amit.ca@cataxportal.com"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Phone Number
            </label>
            <CFormInput
              value={staffFormData.phone}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 9876543210"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Staff Role *
            </label>
            <CFormSelect
              value={staffFormData.role}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="employee">Employee / CA Filing Associate</option>
              <option value="admin">Principal CA Partner (Admin)</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Initial Password *
            </label>
            <CFormInput
              type="password"
              value={staffFormData.password}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 6 characters"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddStaffModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            style={{ background: "#0b3d91", border: "none", fontWeight: "700" }}
            onClick={() => handleSaveStaff(false)}
            disabled={staffSubmitting}
          >
            {staffSubmitting ? "Creating Staff..." : "Create Staff Account"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 6: EDIT STAFF MEMBER (ADMIN ONLY) ═════════ */}
      <CModal visible={showEditStaffModal} onClose={() => setShowEditStaffModal(false)}>
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            ✏️ Edit CA Staff Member (EMP-{staffFormData.id})
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Full Name *
            </label>
            <CFormInput
              value={staffFormData.name}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Email Address *
            </label>
            <CFormInput
              type="email"
              value={staffFormData.email}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Phone Number
            </label>
            <CFormInput
              value={staffFormData.phone}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              Staff Role *
            </label>
            <CFormSelect
              value={staffFormData.role}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="employee">Employee / CA Filing Associate</option>
              <option value="admin">Principal CA Partner (Admin)</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
              New Password (Optional, leave blank to keep unchanged)
            </label>
            <CFormInput
              type="password"
              value={staffFormData.password}
              onChange={(e) => setStaffFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to preserve existing password"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditStaffModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            style={{ background: "#0b3d91", border: "none", fontWeight: "700" }}
            onClick={() => handleSaveStaff(true)}
            disabled={staffSubmitting}
          >
            {staffSubmitting ? "Saving Changes..." : "Save Changes"}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
