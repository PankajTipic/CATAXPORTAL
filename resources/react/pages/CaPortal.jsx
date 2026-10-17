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
import PlatformAdminDashboard from "./PlatformAdminDashboard";
import CAWorkspace from "./CAWorkspace";
import PaymentManagement from "../components/PaymentManagement";
import TablePagination from "../components/TablePagination";
import logo from "../../../public/LOGO1.png";

export default function CaPortal({ defaultNav }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Sidebar Nav — employees default to my_workspace, admins to all_cases (or defaultNav if provided)
  const [activeNav, setActiveNav] = useState(defaultNav || "my_workspace"); // 'my_workspace' | 'all_cases' | 'pending_cases' | 'in_progress' | 'prepared' | 'staff_directory' | 'contact_inquiries' | 'platform_dashboard' | 'payments'
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states for tables (medium size ~8 per page)
  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(8);

  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(8);

  const [contactsPage, setContactsPage] = useState(1);
  const [contactsPageSize, setContactsPageSize] = useState(8);

  // Reset page when filter or search changes
  useEffect(() => {
    setCasesPage(1);
  }, [searchTerm, activeNav]);

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

  // Once user loads, admins default to all_cases; employees stay on my_workspace
  useEffect(() => {
    if (currentUser?.role === "admin") {
      setActiveNav((prev) => (prev === "my_workspace" ? "all_cases" : prev));
    }
  }, [currentUser]);

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
    setStaffSubmitting(true);
    setActionAlert({ type: "", text: "" });
    try {
      if (isEdit) {
        const payload = {
          name: staffFormData.name,
          email: staffFormData.email,
          phone: staffFormData.phone,
          role: staffFormData.role,
        };
        if (staffFormData.password) {
          payload.password = staffFormData.password;
        }
        await api.put(`/admin/employees/${staffFormData.id}`, payload);
        setActionAlert({
          type: "success",
          text: `Staff member "${staffFormData.name}" updated successfully.`,
        });
        setShowEditStaffModal(false);
      } else {
        await api.post("/admin/employees", staffFormData);
        setActionAlert({
          type: "success",
          text: `New staff member "${staffFormData.name}" created successfully.`,
        });
        setShowAddStaffModal(false);
      }
      fetchPortalData();
    } catch (err) {
      setActionAlert({
        type: "danger",
        text: err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : "Operation failed."),
      });
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleDeleteStaff = async (emp) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${emp.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/employees/${emp.id}`);
      setActionAlert({
        type: "success",
        text: `Staff member "${emp.name}" removed successfully.`,
      });
      fetchPortalData();
    } catch (err) {
      setActionAlert({
        type: "danger",
        text: err.response?.data?.message || "Failed to delete staff member.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      navigate("/ca-login");
    }
  };

  // Assign staff to request
  const handleAssignSubmit = async () => {
    if (!selectedRequest || !selectedEmployeeId) return;
    setActionLoading(true);
    setActionAlert({ type: "", text: "" });
    try {
      const { data } = await api.post(
        `/admin/agent-requests/${selectedRequest.id}/assign`,
        { employee_id: selectedEmployeeId }
      );
      setActionAlert({ type: "success", text: data.message || "Case successfully assigned to CA associate." });
      setShowAssignModal(false);
      fetchPortalData();
    } catch (err) {
      setActionAlert({
        type: "danger",
        text: err.response?.data?.message || "Failed to assign case.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Upload prepared ITR file
  const handleUploadPreparedFile = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !preparedFile) return;

    const formData = new FormData();
    formData.append("file", preparedFile);
    if (fileName) {
      formData.append("file_name", fileName);
    }

    setActionLoading(true);
    setActionAlert({ type: "", text: "" });

    try {
      const { data } = await api.post(
        `/agent-requests/${selectedRequest.id}/upload-prepared`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setActionAlert({ type: "success", text: data.message || "File uploaded and notified to client." });
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

  // Paginated arrays for tables
  const paginatedRequests = filteredRequests.slice(
    (casesPage - 1) * casesPageSize,
    casesPage * casesPageSize
  );
  const paginatedEmployees = employees.slice(
    (staffPage - 1) * staffPageSize,
    staffPage * staffPageSize
  );
  const paginatedContacts = contacts.slice(
    (contactsPage - 1) * contactsPageSize,
    contactsPage * contactsPageSize
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#FEF3C7", color: "#B45309", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "800", border: "1px solid #FDE68A" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F59E0B" }} />
            Pending Assignment
          </span>
        );
      case "assigned":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#E0F2FE", color: "#0369A1", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "800", border: "1px solid #BAE6FD" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0284C7" }} />
            Staff Assigned
          </span>
        );
      case "in_progress":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#EEF2FF", color: "#4338CA", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "800", border: "1px solid #C7D2FE" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366F1" }} />
            In Preparation
          </span>
        );
      case "prepared":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#DCFCE7", color: "#15803D", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "800", border: "1px solid #86EFAC" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16A34A" }} />
            File Ready
          </span>
        );
      case "completed":
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#0F172A", color: "#F8FAFC", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: "800", border: "1px solid #334155" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
            Return Filed
          </span>
        );
      default:
        return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "#F8FAFC",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12.5px",
      }}
    >
      {/* ═════════ 1. LUXURY ANTIQUE FINTECH SIDEBAR (FIXED NEVER SCROLLS WITH PAGE) ═════════ */}
      <div
        style={{
          width: "185px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "linear-gradient(180deg, #142B46 0%, #1a3658 100%)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 10,
          overflowY: "auto",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "12px 14px 10px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "#ffffff",
                borderRadius: "6px",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              <img
                src={logo}
                alt="TiQTAX"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "900",
                  letterSpacing: "-0.2px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                TiQTAX <span style={{ color: "#F59E0B", fontSize: "9px", fontWeight: "800" }}>PRO</span>
              </div>
              <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: "600" }}>
                CA Admin &amp; Filing
              </div>
              <div style={{ height: "2px", width: "100%", background: "linear-gradient(90deg, #F5A623 0%, #F02186 50%, #A600B8 100%)", borderRadius: "2px", marginTop: "4px" }} />
            </div>
          </div>

          <div
            style={{
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "3px 6px",
              borderRadius: "5px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span style={{ fontSize: "9px", color: "#E2E8F0", fontWeight: "700" }}>
              🟢 ERI Live
            </span>
            <span
              style={{
                fontSize: "8.5px",
                color: "#F59E0B",
                fontWeight: "800",
                background: "rgba(245, 158, 11, 0.15)",
                padding: "1px 4px",
                borderRadius: "3px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              AY 26-27
            </span>
          </div>
        </div>

        {/* User Card */}
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: isAdmin
                  ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                  : "linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "11px",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              {currentUser?.name?.charAt(0) || "C"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: "800",
                  fontSize: "11px",
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser?.name || "CA Practitioner"}
              </div>
              <div
                style={{
                  fontSize: "8.5px",
                  color: isAdmin ? "#FCD34D" : "#93C5FD",
                  fontWeight: "700",
                  letterSpacing: "0.2px",
                }}
              >
                {isAdmin ? "⭐ Partner (Admin)" : "👨‍💼 Specialist"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div
          style={{
            padding: "8px 6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {/* MY WORKSPACE */}
          <div
            style={{
              fontSize: "8.5px",
              fontWeight: "800",
              color: "#64748B",
              textTransform: "uppercase",
              paddingLeft: "6px",
              letterSpacing: "0.5px",
              marginBottom: "2px",
            }}
          >
            OPERATIONS
          </div>

          <div
            onClick={() => setActiveNav("my_workspace")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              background:
                activeNav === "my_workspace"
                  ? "linear-gradient(90deg, rgba(255, 122, 0, 0.2) 0%, rgba(255, 20, 147, 0.22) 50%, rgba(124, 58, 237, 0.2) 100%)"
                  : "transparent",
              color: activeNav === "my_workspace" ? "#FFFFFF" : "#CBD5E1",
              fontWeight: activeNav === "my_workspace" ? "800" : "500",
              fontSize: "10.5px",
              borderLeft:
                activeNav === "my_workspace"
                  ? "2.5px solid #FF1493"
                  : "2.5px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <div className="d-flex align-items-center gap-1">
              <span style={{ fontSize: "12px" }}>🗂️</span>
              <span>My Active Desk</span>
            </div>
            {requests.filter(
              (r) => r.status === "assigned" || r.status === "in_progress"
            ).length > 0 && (
              <span
                style={{
                  background: "linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)",
                  color: "#fff",
                  padding: "1px 5px",
                  borderRadius: "100px",
                  fontSize: "9px",
                  fontWeight: "800",
                }}
              >
                {
                  requests.filter(
                    (r) => r.status === "assigned" || r.status === "in_progress"
                  ).length
                }
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: "8.5px",
              fontWeight: "800",
              color: "#64748B",
              textTransform: "uppercase",
              paddingLeft: "6px",
              marginTop: "8px",
              letterSpacing: "0.5px",
              marginBottom: "2px",
            }}
          >
            FILING PIPELINE
          </div>

          {[
            { id: "all_cases", label: "All Client Files", icon: "📁", count: requests.length },
            {
              id: "pending_cases",
              label: "Pending Allocation",
              icon: "⏳",
              count: requests.filter((r) => r.status === "pending").length,
              highlight: requests.filter((r) => r.status === "pending").length > 0,
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
                  padding: "5px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: active
                    ? "linear-gradient(90deg, rgba(255, 122, 0, 0.2) 0%, rgba(255, 20, 147, 0.22) 50%, rgba(124, 58, 237, 0.2) 100%)"
                    : "transparent",
                  color: active ? "#FFFFFF" : "#CBD5E1",
                  fontWeight: active ? "800" : "500",
                  fontSize: "10.5px",
                  borderLeft: active
                    ? "2.5px solid #FF1493"
                    : item.highlight
                    ? "2.5px solid #FF7A00"
                    : "2.5px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="d-flex align-items-center gap-1">
                  <span style={{ fontSize: "12px" }}>{item.icon}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                </div>
                <span
                  style={{
                    background: active
                      ? "linear-gradient(135deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)"
                      : item.highlight
                      ? "#FF7A00"
                      : "rgba(255,255,255,0.08)",
                    color: active
                      ? "#FFFFFF"
                      : item.highlight
                      ? "#FFFFFF"
                      : "#94A3B8",
                    padding: "1px 5px",
                    borderRadius: "100px",
                    fontSize: "9px",
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
              {/* Upload section */}
              <div
                style={{
                  fontSize: "8.5px",
                  fontWeight: "800",
                  color: "#64748B",
                  textTransform: "uppercase",
                  paddingLeft: "6px",
                  marginTop: "8px",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                ADMINISTRATION
              </div>
              <div
                onClick={() => setActiveNav("platform_dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background:
                    activeNav === "platform_dashboard"
                      ? "linear-gradient(90deg, rgba(255, 122, 0, 0.2) 0%, rgba(255, 20, 147, 0.22) 50%, rgba(124, 58, 237, 0.2) 100%)"
                      : "transparent",
                  color:
                    activeNav === "platform_dashboard" ? "#FFFFFF" : "#CBD5E1",
                  fontWeight:
                    activeNav === "platform_dashboard" ? "800" : "500",
                  fontSize: "10.5px",
                  borderLeft:
                    activeNav === "platform_dashboard"
                      ? "2.5px solid #FF1493"
                      : "2.5px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="d-flex align-items-center gap-1">
                  <span style={{ fontSize: "12px" }}>📤</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Upload JSON</span>
                </div>
              </div>

              {/* Firm Directory section */}
              <div
                onClick={() => setActiveNav("staff_directory")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background:
                    activeNav === "staff_directory"
                      ? "linear-gradient(90deg, rgba(255, 122, 0, 0.2) 0%, rgba(255, 20, 147, 0.22) 50%, rgba(124, 58, 237, 0.2) 100%)"
                      : "transparent",
                  color: activeNav === "staff_directory" ? "#FFFFFF" : "#CBD5E1",
                  fontWeight: activeNav === "staff_directory" ? "800" : "500",
                  fontSize: "10.5px",
                  borderLeft:
                    activeNav === "staff_directory"
                      ? "2.5px solid #FF1493"
                      : "2.5px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="d-flex align-items-center gap-1">
                  <span style={{ fontSize: "12px" }}>👥</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Staff Directory</span>
                </div>
                <span
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    color: "#E2E8F0",
                    padding: "1px 5px",
                    borderRadius: "100px",
                    fontSize: "9px",
                    fontWeight: "800",
                  }}
                >
                  {employees.length}
                </span>
              </div>

              {/* Payment Management section (Admin) */}
              <div
                onClick={() => setActiveNav("payments")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background:
                    activeNav === "payments"
                      ? "linear-gradient(90deg, rgba(10, 142, 75, 0.28) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(248, 120, 38, 0.2) 100%)"
                      : "transparent",
                  color: activeNav === "payments" ? "#FFFFFF" : "#CBD5E1",
                  fontWeight: activeNav === "payments" ? "800" : "500",
                  fontSize: "10.5px",
                  borderLeft:
                    activeNav === "payments"
                      ? "2.5px solid #0A8E4B"
                      : "2.5px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="d-flex align-items-center gap-1">
                  <span style={{ fontSize: "12px" }}>💳</span>
                  <span>Payment</span>
                </div>
                <span
                  style={{
                    background: "linear-gradient(135deg, #0A8E4B 0%, #10B981 100%)",
                    color: "#FFFFFF",
                    padding: "1px 5px",
                    borderRadius: "100px",
                    fontSize: "8.5px",
                    fontWeight: "800",
                    boxShadow: "0 2px 6px rgba(10, 142, 75, 0.3)",
                  }}
                >
                  LIVE
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div
          style={{
            padding: "8px 10px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <button
            onClick={handleLogout}
            className="btn w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-1"
            style={{
              borderRadius: "6px",
              padding: "5px 8px",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#FCA5A5",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "10px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🔒</span> Sign Out
          </button>
        </div>
      </div>

      {/* ═════════ 2. MAIN WORKSPACE CONSOLE CANVAS (SCROLLS INDEPENDENTLY) ═════════ */}
      <div
        style={{
          flex: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          background:
            "radial-gradient(at 15% 15%, rgba(255, 122, 0, 0.03) 0px, transparent 60%), radial-gradient(at 85% 85%, rgba(124, 58, 237, 0.03) 0px, transparent 60%), #F8FAFC",
        }}
      >
        {/* TiQTAX Signature Logo Gradient Top Stripe */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #FF7A00 0%, #FF1493 50%, #7C3AED 100%)", width: "100%" }} />

        {/* Luxury Top Header Bar */}
        <div
          style={{
            background: "#ffffff",
            padding: "6px 16px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div>
            <div className="d-flex align-items-center gap-1">
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  color: "#1D4ED8",
                  letterSpacing: "0.4px",
                  background: "rgba(29, 78, 216, 0.08)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                }}
              >
                ITD Compliant Console
              </span>
              <span style={{ color: "#94A3B8", fontSize: "9px" }}>•</span>
              <span style={{ fontSize: "9.5px", color: "#64748B", fontWeight: "600" }}>
                AY 2026-27 (FY 2025-26)
              </span>
            </div>
            <h4
              style={{
                fontWeight: "900",
                margin: "1px 0 0 0",
                color: "#0F172A",
                fontSize: "13px",
                letterSpacing: "-0.2px",
              }}
            >
              {activeNav === "my_workspace"
                ? `My Filing Desk`
                : activeNav === "platform_dashboard"
                ? "📤 Upload JSON & E-Filing Compliance"
                : activeNav === "payments"
                ? "💳 Payment Management & Revenue Console"
                : activeNav === "staff_directory"
                ? "Chartered Accountant Associates Directory"
                : activeNav === "contact_inquiries"
                ? "Customer Inquiries & Support Tickets"
                : "Assisted ITR Client Cases"}
            </h4>
          </div>

          <div className="d-flex align-items-center gap-1">
            {/* Search Input */}
            <div style={{ width: "200px", position: "relative" }}>
              <CFormInput
                size="sm"
                placeholder="🔍 Search PAN, Client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  border: "1px solid #CBD5E1",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              />
            </div>

            <button
              onClick={fetchPortalData}
              className="btn btn-light btn-sm fw-bold d-flex align-items-center gap-1"
              title="Refresh Data from Server"
              style={{
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                padding: "3px 8px",
                fontSize: "11px",
                color: "#334155",
                background: "#ffffff",
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div style={{ padding: "8px 12px", flex: 1 }}>

          {/* ═════════ MY WORKSPACE ═════════ */}
          {activeNav === "my_workspace" && (
            <CAWorkspace
              currentUser={currentUser}
              requests={requests}
              onNavigateToCase={(id) => navigate(`/ca-portal/client/${id}`)}
            />
          )}

          {/* ═════════ PLATFORM ADMIN DASHBOARD ═════════ */}
          {activeNav === "platform_dashboard" && (
            <PlatformAdminDashboard
              caData={{ requests, employees, contacts }}
            />
          )}

          {/* ═════════ PAYMENT MANAGEMENT CONSOLE ═════════ */}
          {activeNav === "payments" && (
            <PaymentManagement currentUser={currentUser} />
          )}

          {/* ═════════ STANDARD FILING CONSOLE (All other views) ═════════ */}
          {activeNav !== "platform_dashboard" && activeNav !== "my_workspace" && activeNav !== "payments" && (
            <>

              {actionAlert.text && (
                <CAlert
                  color={actionAlert.type}
                  dismissible
                  className="mb-2 shadow-sm fw-bold"
                  style={{ borderRadius: "6px", padding: "4px 10px", fontSize: "10.5px" }}
                >
                  {actionAlert.text}
                </CAlert>
              )}

              {/* Quick Stats Grid — Compact FinTech Cards (50% scale) */}
              <div className="row g-1 mb-2">
                <div className="col-md-3">
                  <div
                    onClick={() => setActiveNav("all_cases")}
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: "800",
                          color: "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        TOTAL FILING CASES
                      </span>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: "#EEF2FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                        }}
                      >
                        📁
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: "#0F172A",
                        marginTop: "1px",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {requests.length}
                    </div>
                    <div style={{ fontSize: "8px", color: "#64748B", marginTop: "1px" }}>
                      Active client registrations
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div
                    onClick={() => setActiveNav("pending_cases")}
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      border: "1px solid #FED7AA",
                      borderLeft: "2.5px solid #F59E0B",
                      boxShadow: "0 1px 4px rgba(245, 158, 11, 0.05)",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: "800",
                          color: "#D97706",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        PENDING ALLOCATION
                      </span>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: "#FEF3C7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                        }}
                      >
                        ⏳
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: "#B45309",
                        marginTop: "1px",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {requests.filter((r) => r.status === "pending").length}
                    </div>
                    <div style={{ fontSize: "8px", color: "#D97706", marginTop: "1px", fontWeight: "600" }}>
                      Needs CA Assignment
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div
                    onClick={() => setActiveNav("in_progress")}
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      border: "1px solid #BAE6FD",
                      borderLeft: "2.5px solid #0284C7",
                      boxShadow: "0 1px 4px rgba(2, 132, 199, 0.05)",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: "800",
                          color: "#0284C7",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        IN PREPARATION
                      </span>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: "#E0F2FE",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                        }}
                      >
                        ⚡
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: "#0369A1",
                        marginTop: "1px",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {
                        requests.filter(
                          (r) =>
                            r.status === "in_progress" || r.status === "assigned"
                        ).length
                      }
                    </div>
                    <div style={{ fontSize: "8px", color: "#0284C7", marginTop: "1px", fontWeight: "600" }}>
                      Reconciling AIS/26AS
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div
                    onClick={() => setActiveNav("prepared")}
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      border: "1px solid #BBF7D0",
                      borderLeft: "2.5px solid #16A34A",
                      boxShadow: "0 1px 4px rgba(22, 163, 74, 0.05)",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span
                        style={{
                          fontSize: "8.5px",
                          fontWeight: "800",
                          color: "#16A34A",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}
                      >
                        FILES READY / FILED
                      </span>
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          background: "#DCFCE7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                        }}
                      >
                        ✅
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "900",
                        color: "#15803D",
                        marginTop: "1px",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {
                        requests.filter(
                          (r) =>
                            r.status === "prepared" || r.status === "completed"
                        ).length
                      }
                    </div>
                    <div style={{ fontSize: "8px", color: "#16A34A", marginTop: "1px", fontWeight: "600" }}>
                      Ready for Client Sign-off
                    </div>
                  </div>
                </div>
              </div>

              {/* ═════════ VIEW A: STRUCTURED DATA TABLE (CASES) ═════════ */}
              {activeNav !== "staff_directory" && activeNav !== "contact_inquiries" && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#FAFAFA",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: "800",
                          color: "#0F172A",
                          fontSize: "12px",
                          letterSpacing: "-0.2px",
                        }}
                      >
                        {filteredRequests.length} Taxpayer Client Dossiers
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "1px" }}>
                        Click on <strong>"Details"</strong> to access Tax Studio &amp; AIS Match
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-1">
                      <span
                        style={{
                          fontSize: "9px",
                          background: "#F1F5F9",
                          color: "#475569",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "700",
                        }}
                      >
                        Total: {filteredRequests.length}
                      </span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-4">
                      <CSpinner color="primary" size="sm" />
                      <div className="mt-1 text-muted fw-bold" style={{ fontSize: "11px" }}>Loading records...</div>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <div style={{ fontSize: "28px", marginBottom: "4px" }}>📭</div>
                      <strong style={{ fontSize: "12px", color: "#334155" }}>
                        No client cases found matching this view.
                      </strong>
                      <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>
                        Try changing your search term or select another filter from the left sidebar.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                      <CTable hover align="middle" style={{ margin: 0, fontSize: "11px" }}>
                        <CTableHead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                          <CTableRow>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              CASE ID
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              CLIENT / TAXPAYER
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              PAN / AY
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              SERVICE TYPE
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              SPECIALIST
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              STATUS
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ textAlign: "right", paddingRight: "14px", padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              ACTION
                            </CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {paginatedRequests.map((req) => (
                            <CTableRow key={req.id}>
                              {/* Case ID */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    fontWeight: "800",
                                    color: "#1D4ED8",
                                    background: "rgba(29, 78, 216, 0.08)",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontSize: "9.5px",
                                  }}
                                >
                                  #{req.id}
                                </span>
                              </CTableDataCell>

                              {/* Client */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <div style={{ fontWeight: "800", color: "#0F172A", fontSize: "11px" }}>
                                  {req.user?.name || "Client"}
                                </div>
                                <div style={{ fontSize: "9px", color: "#64748B" }}>
                                  {req.user?.email} • 📞 {req.details?.contact_phone || req.user?.phone || "N/A"}
                                </div>
                              </CTableDataCell>

                              {/* PAN / AY */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    background: "#FEF3C7",
                                    color: "#92400E",
                                    border: "1px solid #FDE68A",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontWeight: "800",
                                    fontSize: "9.5px",
                                    letterSpacing: "0.3px",
                                  }}
                                >
                                  {req.details?.pan || req.user?.pan || "N/A"}
                                </span>
                                <div style={{ fontSize: "9px", color: "#64748B", fontWeight: "600" }}>
                                  AY {req.assessment_year || "2026-27"}
                                </div>
                              </CTableDataCell>

                              {/* Service Type */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span style={{ fontWeight: "700", textTransform: "capitalize", color: "#334155", fontSize: "10px" }}>
                                  {req.service_type?.replace("_", " ")}
                                </span>
                                {req.details?.customer_documents?.length > 0 && (
                                  <div style={{ fontSize: "8.5px", color: "#0284C7", fontWeight: "600" }}>
                                    📎 {req.details.customer_documents.length} Doc(s)
                                  </div>
                                )}
                              </CTableDataCell>

                              {/* Assigned Employee */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                {req.assigned_employee ? (
                                  <div>
                                    <span style={{ fontWeight: "700", color: "#0F172A", fontSize: "10px" }}>
                                      👨‍💼 {req.assigned_employee.name}
                                    </span>
                                    <div style={{ fontSize: "8.5px", color: "#64748B" }}>
                                      {req.assigned_employee.email}
                                    </div>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "#D97706",
                                      fontWeight: "800",
                                      background: "rgba(245, 158, 11, 0.1)",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      fontSize: "9px",
                                    }}
                                  >
                                    ⚠️ Unassigned
                                  </span>
                                )}
                              </CTableDataCell>

                              {/* Status Badge */}
                              <CTableDataCell style={{ padding: "5px 8px" }}>{getStatusBadge(req.status)}</CTableDataCell>

                              {/* Action Buttons in Row */}
                              <CTableDataCell style={{ textAlign: "right", paddingRight: "14px", padding: "5px 8px" }}>
                                <div className="d-inline-flex gap-1">
                                  {(!req.assigned_employee_id || req.status === "pending") && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.post(`/agent-requests/${req.id}/accept`);
                                          setActionAlert({
                                             type: "success",
                                             text: `Case #${req.id} accepted successfully!`,
                                          });
                                          fetchPortalData();
                                        } catch (err) {
                                          setActionAlert({
                                            type: "danger",
                                            text: err.response?.data?.message || "Failed to accept request.",
                                          });
                                        }
                                      }}
                                      className="btn btn-sm fw-bold text-white"
                                      title="Accept Case"
                                      style={{
                                        background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "2px 6px",
                                        fontSize: "9.5px",
                                        boxShadow: "0 1px 4px rgba(22, 163, 74, 0.2)",
                                      }}
                                    >
                                      ✅ Accept
                                    </button>
                                  )}

                                  {/* Primary Direct Studio Route */}
                                  <button
                                    onClick={() => navigate(`/ca-portal/client/${req.id}`)}
                                    className="btn btn-sm fw-bold text-white"
                                    title="Open Dedicated Filing Studio & Tax Computation"
                                    style={{
                                      background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 6px",
                                      fontSize: "9.5px",
                                      boxShadow: "0 1px 4px rgba(29, 78, 216, 0.25)",
                                    }}
                                  >
                                    🔍 Details
                                  </button>

                                  {/* Docs Quick Modal */}
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setShowDetailsModal(true);
                                    }}
                                    className="btn btn-light btn-sm fw-bold border"
                                    title="View Documents & Workflow Overview"
                                    style={{
                                      borderRadius: "4px",
                                      padding: "2px 6px",
                                      fontSize: "9.5px",
                                      color: "#334155",
                                    }}
                                  >
                                    📄 Docs
                                  </button>

                                  {/* Assign Staff (Admin Only) */}
                                  {isAdmin && (
                                    <button
                                      onClick={() => {
                                        setSelectedRequest(req);
                                        setSelectedEmployeeId(req.assigned_employee_id || "");
                                        setShowAssignModal(true);
                                      }}
                                      className="btn btn-light btn-sm fw-bold border"
                                      title="Assign to CA Associate"
                                      style={{
                                        borderRadius: "4px",
                                        padding: "2px 6px",
                                        fontSize: "9.5px",
                                        color: "#B45309",
                                        borderColor: "#FDE68A",
                                        background: "#FEF3C7",
                                      }}
                                    >
                                      👨‍💼 Assign
                                    </button>
                                  )}

                                  {/* Live Chat */}
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setShowChatModal(true);
                                    }}
                                    className="btn btn-light btn-sm fw-bold border"
                                    title="Chat with Client"
                                    style={{
                                      borderRadius: "4px",
                                      padding: "2px 6px",
                                      fontSize: "9.5px",
                                      color: "#0F172A",
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
                    {filteredRequests.length > 0 && (
                      <TablePagination
                        currentPage={casesPage}
                        totalItems={filteredRequests.length}
                        pageSize={casesPageSize}
                        onPageChange={setCasesPage}
                        onPageSizeChange={(sz) => {
                          setCasesPageSize(sz);
                          setCasesPage(1);
                        }}
                      />
                    )}
                  </>
                )}
                </div>
              )}

              {/* ═════════ VIEW B: STAFF DIRECTORY (ADMIN VIEW) ═════════ */}
              {activeNav === "staff_directory" && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      background: "#FAFAFA",
                    }}
                  >
                    <div>
                      <h5 style={{ fontWeight: "900", color: "#0F172A", margin: 0, fontSize: "17px" }}>
                        Active CA Associates &amp; Filing Team ({employees.length})
                      </h5>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        Staff members authorized to prepare computations, reconcile AIS, and file returns
                      </div>
                    </div>

                    {isAdmin && (
                      <CButton
                        color="primary"
                        size="sm"
                        className="fw-bold d-flex align-items-center gap-1 text-white"
                        style={{
                          background: "linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)",
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 18px",
                          fontSize: "13px",
                          boxShadow: "0 2px 8px rgba(29, 78, 216, 0.25)",
                        }}
                        onClick={handleOpenAddStaff}
                      >
                        ➕ Add New Staff Associate
                      </CButton>
                    )}
                  </div>

                  <div className="table-responsive">
                    <CTable hover align="middle" style={{ margin: 0, fontSize: "11px" }}>
                      <CTableHead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                        <CTableRow>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            STAFF ID
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            ASSOCIATE NAME
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            OFFICIAL EMAIL
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            CONTACT PHONE
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            ACTIVE CASES
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            ROLE
                          </CTableHeaderCell>
                          {isAdmin && (
                            <CTableHeaderCell className="text-end" style={{ padding: "6px 8px", paddingRight: "14px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              ACTIONS
                            </CTableHeaderCell>
                          )}
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {paginatedEmployees.map((emp) => {
                          const empCases = requests.filter((r) => r.assigned_employee_id === emp.id);
                          const isSelf = currentUser?.id === emp.id;
                          return (
                            <CTableRow key={emp.id}>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    fontWeight: "800",
                                    color: "#1D4ED8",
                                    background: "rgba(29, 78, 216, 0.08)",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontSize: "9.5px",
                                  }}
                                >
                                  EMP-{emp.id}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px", fontWeight: "800", color: "#0F172A", fontSize: "11px" }}>
                                👨‍💼 {emp.name}{" "}
                                {isSelf && (
                                  <span
                                    style={{
                                      background: "#E2E8F0",
                                      color: "#334155",
                                      fontSize: "8.5px",
                                      padding: "1px 4px",
                                      borderRadius: "3px",
                                      marginLeft: "2px",
                                    }}
                                  >
                                    You
                                  </span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px", color: "#475569", fontSize: "10.5px" }}>{emp.email}</CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px", color: "#475569", fontSize: "10.5px" }}>
                                {emp.phone || "Desk"}
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    background: "#E0F2FE",
                                    color: "#0369A1",
                                    padding: "1px 6px",
                                    borderRadius: "100px",
                                    fontSize: "9.5px",
                                    fontWeight: "800",
                                  }}
                                >
                                  {emp.active_cases_count ?? empCases.length} Active
                                </span>
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    background:
                                      emp.role === "admin"
                                        ? "rgba(245, 158, 11, 0.15)"
                                        : "rgba(16, 185, 129, 0.15)",
                                    color:
                                      emp.role === "admin" ? "#B45309" : "#047857",
                                    padding: "1px 6px",
                                    borderRadius: "100px",
                                    fontSize: "9.5px",
                                    fontWeight: "800",
                                    border: `1px solid ${
                                      emp.role === "admin"
                                        ? "#FDE68A"
                                        : "#A7F3D0"
                                    }`,
                                  }}
                                >
                                  {emp.role === "admin"
                                    ? "⭐ Partner"
                                    : "Specialist"}
                                </span>
                              </CTableDataCell>
                              {isAdmin && (
                                <CTableDataCell className="text-end" style={{ padding: "5px 8px", paddingRight: "14px" }}>
                                  <div className="d-flex justify-content-end gap-1">
                                    <button
                                      className="btn btn-light btn-sm fw-bold border"
                                      style={{ borderRadius: "4px", fontSize: "9.5px", padding: "2px 6px" }}
                                      onClick={() => handleOpenEditStaff(emp)}
                                      title="Edit Staff Member"
                                    >
                                      ✏️ Edit
                                    </button>
                                    {!isSelf && (
                                      <button
                                        className="btn btn-light btn-sm fw-bold border text-danger"
                                        style={{ borderRadius: "4px", fontSize: "9.5px", padding: "2px 6px" }}
                                        onClick={() => handleDeleteStaff(emp)}
                                        title="Delete Staff Member"
                                      >
                                        🗑️ Del
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
                  {employees.length > 0 && (
                    <TablePagination
                      currentPage={staffPage}
                      totalItems={employees.length}
                      pageSize={staffPageSize}
                      onPageChange={setStaffPage}
                      onPageSizeChange={(sz) => {
                        setStaffPageSize(sz);
                        setStaffPage(1);
                      }}
                    />
                  )}
                </div>
              )}

              {/* ═════════ VIEW C: CONTACT INQUIRIES ═════════ */}
              {activeNav === "contact_inquiries" && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "18px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#FAFAFA",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "800", color: "#0F172A", fontSize: "12px", letterSpacing: "-0.2px" }}>
                        📨 Customer Inquiries &amp; Support Messages ({contacts.length})
                      </div>
                      <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "1px" }}>
                        Direct inquiries received from potential taxpayers via portal contact channel
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-4">
                      <CSpinner color="primary" size="sm" />
                      <div className="mt-1 text-muted fw-bold" style={{ fontSize: "11px" }}>Loading inquiries...</div>
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <div style={{ fontSize: "28px", marginBottom: "4px" }}>📭</div>
                      <strong style={{ fontSize: "12px", color: "#334155" }}>
                        No contact inquiries received yet.
                      </strong>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive">
                      <CTable hover align="middle" style={{ margin: 0, fontSize: "11px" }}>
                        <CTableHead style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                          <CTableRow>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              #
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              TAXPAYER NAME
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              EMAIL ADDRESS
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              SUBJECT
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              MESSAGE BODY
                            </CTableHeaderCell>
                            <CTableHeaderCell style={{ padding: "6px 8px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                              RECEIVED ON
                            </CTableHeaderCell>
                            {isAdmin && (
                              <CTableHeaderCell style={{ textAlign: "right", padding: "6px 8px", paddingRight: "14px", color: "#64748B", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                                ACTION
                              </CTableHeaderCell>
                            )}
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {paginatedContacts.map((c, idx) => (
                            <CTableRow key={c.id}>
                              <CTableDataCell style={{ padding: "5px 8px", fontWeight: "800", color: "#1D4ED8", fontSize: "10.5px" }}>
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <div style={{ fontWeight: "800", color: "#0F172A", fontSize: "11px" }}>{c.name}</div>
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <a
                                  href={`mailto:${c.email}`}
                                  style={{ color: "#1D4ED8", fontWeight: "600", textDecoration: "none", fontSize: "10.5px" }}
                                >
                                  {c.email}
                                </a>
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px" }}>
                                <span
                                  style={{
                                    background: "#F1F5F9",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: "600",
                                    color: "#334155",
                                    fontSize: "9.5px",
                                  }}
                                >
                                  {c.subject || <span style={{ color: "#94A3B8" }}>No Subject</span>}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell style={{ padding: "5px 8px", maxWidth: "220px" }}>
                                <div
                                  style={{
                                    color: "#475569",
                                    fontSize: "10.5px",
                                    lineHeight: "1.3",
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
                              <CTableDataCell style={{ padding: "5px 8px", whiteSpace: "nowrap", color: "#64748B", fontSize: "10px" }}>
                                {c.created_at
                                  ? new Date(c.created_at).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </CTableDataCell>
                              {isAdmin && (
                                <CTableDataCell style={{ textAlign: "right", padding: "5px 8px", paddingRight: "14px" }}>
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
                                    className="btn btn-light btn-sm fw-bold border text-danger"
                                    style={{ borderRadius: "5px", padding: "2px 6px", fontSize: "9.5px" }}
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
                    {contacts.length > 0 && (
                      <TablePagination
                        currentPage={contactsPage}
                        totalItems={contacts.length}
                        pageSize={contactsPageSize}
                        onPageChange={setContactsPage}
                        onPageSizeChange={(sz) => {
                          setContactsPageSize(sz);
                          setContactsPage(1);
                        }}
                      />
                    )}
                  </>
                )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═════════ MODAL 1: DETAILS & ENTERPRISE WORKFLOW ═════════ */}
      <CModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsTab("overview");
          setWorkflowAlert({ type: "", text: "" });
        }}
        size="xl"
      >
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", padding: "18px 24px", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "17px", color: "#1E293B" }}>
            📁 Case #{selectedRequest?.id} — {selectedRequest?.user?.name}
            <span
              style={{
                marginLeft: "10px",
                fontSize: "12px",
                background: "rgba(245, 158, 11, 0.2)",
                color: "#FCD34D",
                padding: "3px 10px",
                borderRadius: "12px",
                fontWeight: "700",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              AY {selectedRequest?.assessment_year || "2026-27"}
            </span>
          </CModalTitle>
        </CModalHeader>

        {/* Tab Bar */}
        <div
          style={{
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            gap: "0",
            padding: "0 24px",
          }}
        >
          {[
            { id: "overview", label: "📄 Overview & Docs" },
            { id: "workflow", label: "⚙️ Enterprise Workflow" },
            { id: "audit", label: "🔒 Audit Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setDetailsTab(tab.id);
                setWorkflowAlert({ type: "", text: "" });
              }}
              style={{
                padding: "14px 20px",
                border: "none",
                background: "transparent",
                fontWeight: detailsTab === tab.id ? "800" : "600",
                fontSize: "13px",
                color: detailsTab === tab.id ? "#1D4ED8" : "#64748B",
                borderBottom:
                  detailsTab === tab.id
                    ? "3px solid #1D4ED8"
                    : "3px solid transparent",
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
                      {
                        label: "TAXPAYER PAN",
                        value: selectedRequest.details?.pan || selectedRequest.user?.pan || "N/A",
                        color: "#1D4ED8",
                      },
                      {
                        label: "ASSESSMENT YEAR",
                        value: `AY ${selectedRequest.assessment_year || "2026-27"}`,
                        color: "#0F172A",
                      },
                      {
                        label: "SERVICE TYPE",
                        value: selectedRequest.service_type?.replace("_", " ").toUpperCase(),
                        color: "#0284C7",
                      },
                      {
                        label: "CURRENT STATUS",
                        value: selectedRequest.status?.toUpperCase(),
                        color:
                          selectedRequest.status === "completed"
                            ? "#15803D"
                            : "#B45309",
                      },
                    ].map((item) => (
                      <div key={item.label} className="col-md-3">
                        <div
                          style={{
                            background: "#F8FAFC",
                            padding: "14px",
                            borderRadius: "12px",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#64748B",
                              fontWeight: "800",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontWeight: "800",
                              fontSize: "15px",
                              color: item.color,
                              marginTop: "4px",
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div
                      style={{
                        fontWeight: "800",
                        fontSize: "13px",
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Client Notes:
                    </div>
                    <div
                      style={{
                        background: "#F1F5F9",
                        padding: "14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        color: "#1E293B",
                        lineHeight: "1.6",
                      }}
                    >
                      {selectedRequest.notes || "No special notes provided by client."}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div
                      style={{
                        fontWeight: "800",
                        fontSize: "13px",
                        color: "#334155",
                        marginBottom: "8px",
                      }}
                    >
                      Client Uploaded Supporting Documents:
                    </div>
                    {selectedRequest.details?.customer_documents?.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {selectedRequest.details.customer_documents.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-light btn-sm fw-bold border text-primary d-inline-flex align-items-center gap-1"
                            style={{ padding: "8px 14px", borderRadius: "10px" }}
                          >
                            📥 {doc.original_name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#94A3B8", fontSize: "13px" }}>
                        No documents uploaded by client.
                      </div>
                    )}
                  </div>

                  {selectedRequest.uploaded_file_path && (
                    <div
                      style={{
                        background: "#DCFCE7",
                        border: "1px solid #86EFAC",
                        borderRadius: "12px",
                        padding: "16px",
                        fontSize: "13px",
                        color: "#15803D",
                      }}
                    >
                      <strong>✅ Prepared File Ready for Client:</strong>{" "}
                      <a
                        href={selectedRequest.uploaded_file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="fw-bold text-success text-decoration-underline ms-1"
                      >
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
                    <CAlert
                      color={workflowAlert.type}
                      dismissible
                      className="mb-4 fw-bold"
                      onClose={() => setWorkflowAlert({ type: "", text: "" })}
                    >
                      {workflowAlert.type === "success" ? "✅ " : "⚠️ "}
                      {workflowAlert.text}
                    </CAlert>
                  )}

                  {/* Stage 1: Document Verification */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          background: "#DBEAFE",
                          color: "#1D4ED8",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "13px",
                        }}
                      >
                        1
                      </span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0F172A" }}>
                        Document Verification
                      </span>
                    </div>
                    {selectedRequest.details?.customer_documents?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedRequest.details.customer_documents.map((doc, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "#fff",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid #E2E8F0",
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                              📄 {doc.original_name}
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleVerifyDocument(doc.id || idx, "verify")}
                                disabled={workflowLoading}
                                style={{
                                  padding: "5px 14px",
                                  background: "#DCFCE7",
                                  color: "#166534",
                                  border: "1px solid #86EFAC",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                ✓ Verified
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(doc.id || idx, "reject")}
                                disabled={workflowLoading}
                                style={{
                                  padding: "5px 14px",
                                  background: "#FEE2E2",
                                  color: "#991B1B",
                                  border: "1px solid #FCA5A5",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#94A3B8", fontSize: "13px" }}>
                        No client documents to verify.
                      </div>
                    )}
                  </div>

                  {/* Stage 2: Save Return Draft */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          background: "#E0E7FF",
                          color: "#3730A3",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "13px",
                        }}
                      >
                        2
                      </span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0F172A" }}>
                        Save Return Draft Notes
                      </span>
                    </div>
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Add computation notes, regime choice rationale, or key observations for this return..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "1px solid #CBD5E1",
                        fontSize: "13px",
                        marginBottom: "10px",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleSaveDraft}
                      disabled={workflowLoading}
                      style={{
                        padding: "8px 20px",
                        background: "#1D4ED8",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(29,78,216,0.25)",
                      }}
                    >
                      {workflowLoading ? "Saving..." : "💾 Save Return Draft"}
                    </button>
                  </div>

                  {/* Stage 3: Approve Filing */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          background: "#DCFCE7",
                          color: "#166534",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "13px",
                        }}
                      >
                        3
                      </span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0F172A" }}>
                        Approve Filing
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "12px" }}>
                      Confirms that computation is complete, regime is chosen, and the return is ready for quality review.
                    </p>
                    <button
                      onClick={handleApproveFiling}
                      disabled={workflowLoading}
                      style={{
                        padding: "8px 20px",
                        background: "#16A34A",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(22,163,74,0.25)",
                      }}
                    >
                      {workflowLoading ? "Processing..." : "✅ Approve Filing"}
                    </button>
                  </div>

                  {/* Stage 4: Quality Gate */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          background: "#FEF3C7",
                          color: "#B45309",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "13px",
                        }}
                      >
                        4
                      </span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0F172A" }}>
                        CA Partner Quality Gate Sign-off
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "12px" }}>
                      Partner-level review confirming all computations are accurate before portal submission.
                    </p>
                    <button
                      onClick={handleQualityGate}
                      disabled={workflowLoading}
                      style={{
                        padding: "8px 20px",
                        background: "#D97706",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(217,119,6,0.25)",
                      }}
                    >
                      {workflowLoading ? "Processing..." : "🏆 Sign-off Quality Gate"}
                    </button>
                  </div>

                  {/* Stage 5: Mark Filed */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          background: "#F1F5F9",
                          color: "#334155",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "900",
                          fontSize: "13px",
                        }}
                      >
                        5
                      </span>
                      <span style={{ fontWeight: "800", fontSize: "15px", color: "#0F172A" }}>
                        Mark Filed on IT Portal
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "12px" }}>
                      Final step: Confirms ITR has been successfully filed on the Income Tax e-Filing portal.
                    </p>
                    <button
                      onClick={handleMarkFiled}
                      disabled={workflowLoading}
                      style={{
                        padding: "8px 20px",
                        background: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #c084fc 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(11,19,43,0.25)",
                      }}
                    >
                      {workflowLoading ? "Processing..." : "🏁 Mark as Filed (IT Portal)"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: AUDIT LOG ── */}
              {detailsTab === "audit" && (
                <div>
                  <div
                    style={{
                      background: "rgba(240, 33, 134, 0.04)",
                      border: "1px solid rgba(240, 33, 134, 0.15)",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "22px" }}>🔒</span>
                    <div>
                      <div style={{ color: "#142B46", fontWeight: "800", fontSize: "14px" }}>
                        Immutable Audit Trail &amp; Access Log
                      </div>
                      <div style={{ color: "#94A3B8", fontSize: "12px" }}>
                        All actions are timestamped, actor-attributed, and tamper-proof.
                      </div>
                    </div>
                  </div>
                  {selectedRequest.audit_logs?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedRequest.audit_logs.map((log, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            borderRadius: "10px",
                            padding: "14px 18px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "12px",
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: "800", fontSize: "13.5px", color: "#0F172A" }}>
                              {log.action}
                            </span>
                            {log.details && (
                              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                                {typeof log.details === "object"
                                  ? JSON.stringify(log.details)
                                  : log.details}
                              </div>
                            )}
                            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                              by <strong>{log.actor?.name || log.actor_id || "System"}</strong>
                            </div>
                          </div>
                          <div
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "11px",
                              color: "#94A3B8",
                              fontFamily: "monospace",
                            }}
                          >
                            {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                      <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "#475569" }}>
                        No audit entries yet for this case.
                      </div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        Entries are logged when workflow actions are executed.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setShowDetailsModal(false);
              setDetailsTab("overview");
            }}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 2: ASSIGN STAFF ═════════ */}
      <CModal visible={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#1E293B" }}>
            Assign Case #{selectedRequest?.id} to CA Associate
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Select CA Staff Specialist:
            </label>
            <CFormSelect
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{ borderRadius: "10px", padding: "10px" }}
            >
              <option value="">-- Choose CA Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </CFormSelect>
          </div>
          <p style={{ fontSize: "12px", color: "#64748B" }}>
            Once assigned, this case will appear in the staff member's queue, enabling them to chat with the client and upload the finalized return.
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
            style={{ fontWeight: "700", background: "#1D4ED8", border: "none" }}
          >
            {actionLoading ? "Assigning..." : "Confirm Assignment"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 3: UPLOAD RETURN FILE ═════════ */}
      <CModal visible={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#1E293B" }}>
            Upload Finalized Return for Case #{selectedRequest?.id}
          </CModalTitle>
        </CModalHeader>
        <form onSubmit={handleUploadPreparedFile}>
          <CModalBody className="p-4">
            <div className="mb-3">
              <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
                Select File (PDF Computation, XML, JSON):
              </label>
              <CFormInput
                type="file"
                required
                onChange={(e) => {
                  const f = e.target.files[0];
                  setPreparedFile(f);
                  if (f && !fileName) setFileName(f.name);
                }}
                style={{ borderRadius: "10px", padding: "10px" }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
                Display Title for Client:
              </label>
              <CFormInput
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Final_ITR_Computation_AY2026-27.pdf"
                style={{ borderRadius: "10px", padding: "10px" }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "#64748B" }}>
              Upon upload, the status will automatically update to <strong>"File Ready"</strong> and the client will be notified.
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
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#1E293B" }}>
            💬 Client Consultation Chat — Case #{selectedRequest?.id} ({selectedRequest?.user?.name})
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

      {/* ═════════ MODAL 5: ADD STAFF MEMBER ═════════ */}
      <CModal visible={showAddStaffModal} onClose={() => setShowAddStaffModal(false)}>
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#1E293B" }}>
            ➕ Add New CA Staff Associate
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Full Name *
            </label>
            <CFormInput
              value={staffFormData.name}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. CA Amit Sharma"
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Email Address (Login Username) *
            </label>
            <CFormInput
              type="email"
              value={staffFormData.email}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="amit.ca@cataxportal.com"
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Phone Number
            </label>
            <CFormInput
              value={staffFormData.phone}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+91 9876543210"
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Staff Role *
            </label>
            <CFormSelect
              value={staffFormData.role}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              style={{ borderRadius: "10px" }}
            >
              <option value="employee">Employee / CA Filing Associate</option>
              <option value="admin">Principal CA Partner (Admin)</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Initial Password *
            </label>
            <CFormInput
              type="password"
              value={staffFormData.password}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Minimum 6 characters"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddStaffModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            style={{ background: "#1D4ED8", border: "none", fontWeight: "700" }}
            onClick={() => handleSaveStaff(false)}
            disabled={staffSubmitting}
          >
            {staffSubmitting ? "Creating Staff..." : "Create Staff Account"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═════════ MODAL 6: EDIT STAFF MEMBER ═════════ */}
      <CModal visible={showEditStaffModal} onClose={() => setShowEditStaffModal(false)}>
        <CModalHeader style={{ background: "linear-gradient(135deg, rgba(250, 160, 28, 0.08) 0%, rgba(240, 33, 134, 0.08) 50%, rgba(166, 0, 184, 0.08) 100%)", color: "#1E293B", borderBottom: "1px solid #edf2f7" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px", color: "#1E293B" }}>
            ✏️ Edit CA Staff Member (EMP-{staffFormData.id})
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Full Name *
            </label>
            <CFormInput
              value={staffFormData.name}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Email Address *
            </label>
            <CFormInput
              type="email"
              value={staffFormData.email}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Phone Number
            </label>
            <CFormInput
              value={staffFormData.phone}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              Staff Role *
            </label>
            <CFormSelect
              value={staffFormData.role}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              style={{ borderRadius: "10px" }}
            >
              <option value="employee">Employee / CA Filing Associate</option>
              <option value="admin">Principal CA Partner (Admin)</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
              New Password (Optional, leave blank to keep unchanged)
            </label>
            <CFormInput
              type="password"
              value={staffFormData.password}
              onChange={(e) =>
                setStaffFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Leave blank to preserve existing password"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditStaffModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            style={{ background: "#1D4ED8", border: "none", fontWeight: "700" }}
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
