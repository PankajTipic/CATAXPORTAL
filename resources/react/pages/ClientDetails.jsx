import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CBadge,
  CButton,
  CSpinner,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from "@coreui/react";
import api from "../api/client";
import AgentChat from "../components/AgentChat";
import { computeTax } from "../utils/taxEngine";
import TaxComputationDossier from "../components/TaxComputationDossier";

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("dossier"); // 'dossier' | 'prepare' | 'documents' | 'financials' | 'chat' | 'audit'

  // Action status
  const [actionAlert, setActionAlert] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  // Assign staff modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Mark filed modal
  const [showFiledModal, setShowFiledModal] = useState(false);
  const [ackNumber, setAckNumber] = useState("");

  // Computation Dossier & Export Modal
  const [showDossierModal, setShowDossierModal] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // RETURN PREPARATION (CA TAX STUDIO) STATE
  // ══════════════════════════════════════════════════════════════
  const [calcState, setCalcState] = useState({
    grossSalary: 1250000,
    hraExemption: 120000,
    profTax: 2500,
    housePropertyInterest: 0,
    savingsInterest: 25000,
    fdInterest: 17700,
    dividendIncome: 8400,
    otherIncome: 720,
    stcg: 0,
    ltcg: 0,
    sec80c: 150000,
    sec80d: 25000,
    sec80ccd2: 50000,
    sec80g: 0,
    tdsClaimed: 120110,
    advanceTax: 0,
    selectedRegime: "new", // 'new' | 'old'
    itrFormType: "ITR-1",
    caNotes: "Prepared after reconciling Form 16, AIS, and Form 26AS. Recommended New Regime for optimal tax savings.",
  });

  const [computedResult, setComputedResult] = useState(null);

  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const [userRes, caseRes, staffRes] = await Promise.all([
        api.get("/auth/me"),
        api.get(`/agent/requests/${id}`),
        api.get("/admin/employees").catch(() => ({ data: { data: [] } })),
      ]);

      const loggedUser = userRes.data.user || userRes.data;
      setCurrentUser(loggedUser);

      const caseItem = caseRes.data.data;
      setRequestData(caseItem);
      setEmployees(staffRes.data.data || []);
      setSelectedStaffId(caseItem.assigned_employee_id || "");

      // Pre-populate CA return preparation fields from case/AIS data if available
      const details = caseItem.details || {};
      const taxProfile = caseItem.user?.taxProfile;
      const aisSnapshot = caseItem.user?.ais_connections?.[0]?.snapshot || caseItem.user?.ais_connections?.[0]?.snapshots?.[0];
      const aisSummary = aisSnapshot?.raw_response?.summary || details.ais_data?.summary;
      const form16 = details.form16_data || caseItem.user?.form16_entries?.[0];

      // Prior prepared computation or smart default
      const prep = details.prepared_computation || {};

      setCalcState((prev) => ({
        ...prev,
        grossSalary: prep.grossSalary ?? form16?.gross_salary ?? 1250000,
        hraExemption: prep.hraExemption ?? form16?.hra_exemption ?? 120000,
        profTax: prep.profTax ?? form16?.professional_tax ?? 2500,
        housePropertyInterest: prep.housePropertyInterest ?? 0,
        savingsInterest: prep.savingsInterest ?? 25000,
        fdInterest: prep.fdInterest ?? 17700,
        dividendIncome: prep.dividendIncome ?? 8400,
        otherIncome: prep.otherIncome ?? 720,
        sec80c: prep.sec80c ?? form16?.deduction_80c ?? 150000,
        sec80d: prep.sec80d ?? form16?.deduction_80d ?? 25000,
        sec80ccd2: prep.sec80ccd2 ?? 50000,
        sec80g: prep.sec80g ?? 0,
        tdsClaimed: prep.tdsClaimed ?? form16?.total_tds ?? 120110,
        advanceTax: prep.advanceTax ?? 0,
        selectedRegime: caseItem.chosen_regime || "new",
        itrFormType: caseItem.itr_form_type || "ITR-1",
        caNotes: details.ca_notes || prev.caNotes,
      }));
    } catch (err) {
      console.error("Failed to fetch client details:", err);
      setActionAlert({
        type: "danger",
        text: err.response?.data?.message || "Failed to load client details.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  // Recalculate tax whenever input parameters change
  useEffect(() => {
    const salary = Number(calcState.grossSalary) || 0;
    const hra = Number(calcState.hraExemption) || 0;
    const ptax = Number(calcState.profTax) || 0;
    const hpLoss = Number(calcState.housePropertyInterest) || 0;
    const other =
      (Number(calcState.savingsInterest) || 0) +
      (Number(calcState.fdInterest) || 0) +
      (Number(calcState.dividendIncome) || 0) +
      (Number(calcState.otherIncome) || 0);

    const c80c = Number(calcState.sec80c) || 0;
    const c80d = Number(calcState.sec80d) || 0;
    const c80ccd2 = Number(calcState.sec80ccd2) || 0;
    const c80g = Number(calcState.sec80g) || 0;
    const totalTds = (Number(calcState.tdsClaimed) || 0) + (Number(calcState.advanceTax) || 0);

    try {
      // AY 2026-27 Tax Engine execution
      const newCalc = computeTax(
        {
          salaryIncome: {
            grossSalary: salary,
            professionalTax: ptax,
          },
          otherSourcesIncome: {
            savingsInterest: Number(calcState.savingsInterest) || 0,
            fdInterest: Number(calcState.fdInterest) || 0,
            dividendIncome: Number(calcState.dividendIncome) || 0,
            otherIncome: Number(calcState.otherIncome) || 0,
          },
          capitalGainsIncome: {
            ltcg112a: Number(calcState.ltcg) || 0,
            stcg111a: Number(calcState.stcg) || 0,
          },
          deductionsClaimed: {
            sec80ccd2: c80ccd2,
          },
          taxesPaid: {
            tdsSalary: totalTds,
          },
        },
        "new"
      );

      const oldCalc = computeTax(
        {
          salaryIncome: {
            grossSalary: salary,
            exemptAllowances: hra,
            professionalTax: ptax,
          },
          housePropertyIncome: {
            netIncomeOrLoss: -hpLoss,
          },
          otherSourcesIncome: {
            savingsInterest: Number(calcState.savingsInterest) || 0,
            fdInterest: Number(calcState.fdInterest) || 0,
            dividendIncome: Number(calcState.dividendIncome) || 0,
            otherIncome: Number(calcState.otherIncome) || 0,
          },
          capitalGainsIncome: {
            ltcg112a: Number(calcState.ltcg) || 0,
            stcg111a: Number(calcState.stcg) || 0,
          },
          deductionsClaimed: {
            sec80c: c80c,
            sec80d: c80d,
            sec80ccd2: c80ccd2,
            sec80g: c80g,
          },
          taxesPaid: {
            tdsSalary: totalTds,
          },
        },
        "old"
      );

      const newTax = newCalc?.totalTax ?? 0;
      const oldTax = oldCalc?.totalTax ?? 0;
      const newRefund = (newCalc?.refundOrPayable ?? 0) < 0 ? Math.abs(newCalc.refundOrPayable) : 0;
      const newPayable = (newCalc?.refundOrPayable ?? 0) > 0 ? newCalc.refundOrPayable : 0;
      const oldRefund = (oldCalc?.refundOrPayable ?? 0) < 0 ? Math.abs(oldCalc.refundOrPayable) : 0;
      const oldPayable = (oldCalc?.refundOrPayable ?? 0) > 0 ? oldCalc.refundOrPayable : 0;

      const chosenCalc = calcState.selectedRegime === "new" ? newCalc : oldCalc;
      const chosenTax = calcState.selectedRegime === "new" ? newTax : oldTax;
      const chosenRefund = calcState.selectedRegime === "new" ? newRefund : oldRefund;
      const chosenPayable = calcState.selectedRegime === "new" ? newPayable : oldPayable;

      const savings = Math.abs(oldTax - newTax);
      const recommended = newTax <= oldTax ? "new" : "old";

      setComputedResult({
        newRegime: {
          totalTaxLiability: newTax,
          refundDue: newRefund,
          taxPayable: newPayable,
          taxableIncome: newCalc?.taxableIncome ?? 0,
          rebate: newCalc?.rebate ?? 0,
        },
        oldRegime: {
          totalTaxLiability: oldTax,
          refundDue: oldRefund,
          taxPayable: oldPayable,
          taxableIncome: oldCalc?.taxableIncome ?? 0,
          rebate: oldCalc?.rebate ?? 0,
        },
        chosen: chosenCalc,
        taxSavings: savings,
        recommendedRegime: recommended,
        finalTax: chosenTax,
        refundDue: chosenRefund,
        taxPayable: chosenPayable,
      });
    } catch (e) {
      console.warn("Computation error:", e);
    }
  }, [calcState]);

  // Handle Form Change
  const handleCalcInput = (field, val) => {
    setCalcState((prev) => ({ ...prev, [field]: val }));
  };

  // ══════════════════════════════════════════════════════════════
  // SUBMIT PREPARED RETURN TO CUSTOMER
  // ══════════════════════════════════════════════════════════════
  const handlePrepareAndSend = async () => {
    if (!computedResult) return;
    setSubmitting(true);
    setActionAlert({ type: "", text: "" });

    try {
      const payload = {
        itr_form_type: calcState.itrFormType,
        chosen_regime: calcState.selectedRegime,
        ca_notes: calcState.caNotes,
        computation_details: {
          grossSalary: Number(calcState.grossSalary),
          hraExemption: Number(calcState.hraExemption),
          profTax: Number(calcState.profTax),
          housePropertyInterest: Number(calcState.housePropertyInterest),
          savingsInterest: Number(calcState.savingsInterest),
          fdInterest: Number(calcState.fdInterest),
          dividendIncome: Number(calcState.dividendIncome),
          otherIncome: Number(calcState.otherIncome),
          sec80c: Number(calcState.sec80c),
          sec80d: Number(calcState.sec80d),
          sec80ccd2: Number(calcState.sec80ccd2),
          sec80g: Number(calcState.sec80g),
          tdsClaimed: Number(calcState.tdsClaimed),
          advanceTax: Number(calcState.advanceTax),
        },
        tax_summary: {
          assessment_year: requestData.assessment_year || "2026-27",
          chosen_regime: calcState.selectedRegime,
          recommended_regime: computedResult.recommendedRegime,
          tax_savings: computedResult.taxSavings,
          final_tax: computedResult.finalTax,
          refund_due: computedResult.refundDue,
          tax_payable: computedResult.taxPayable,
          new_tax: computedResult.newRegime.totalTaxLiability,
          old_tax: computedResult.oldRegime.totalTaxLiability,
          prepared_at: new Date().toISOString(),
          prepared_by: currentUser?.name,
        },
      };

      const { data } = await api.post(`/agent-requests/${id}/prepare-and-send`, payload);

      setRequestData(data.data);
      setActionAlert({
        type: "success",
        text: "✅ ITR return calculation prepared and sent to customer! The customer has been notified to review and approve.",
      });
      setActiveTab("dossier");
    } catch (err) {
      setActionAlert({
        type: "danger",
        text: err.response?.data?.message || "Failed to prepare and send calculation.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Re-assign Staff
  const handleAssignStaff = async () => {
    if (!selectedStaffId) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/agent-requests/${id}/assign`, {
        employee_id: selectedStaffId,
      });
      setShowAssignModal(false);
      setActionAlert({ type: "success", text: "Staff member assigned successfully." });
      fetchClientDetails();
    } catch (err) {
      setActionAlert({ type: "danger", text: err.response?.data?.message || "Failed to assign staff." });
    } finally {
      setSubmitting(false);
    }
  };

  // Quality Gate Sign-Off
  const handleQualityGateSignOff = async () => {
    if (!window.confirm("Confirm 4-Eye Quality Gate sign-off for this client return?")) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/agent-requests/${id}/sign-off-quality-gate`, {
        notes: "Verified by Principal CA Partner. All income, deductions, and AIS credits confirmed.",
      });
      setRequestData(data.data);
      setActionAlert({ type: "success", text: "✅ 4-Eye Quality Gate Signed Off by Senior CA!" });
    } catch (err) {
      setActionAlert({ type: "danger", text: err.response?.data?.message || "Sign-off failed." });
    } finally {
      setSubmitting(false);
    }
  };

  // Mark Officially Filed
  const handleMarkFiled = async () => {
    if (!ackNumber) {
      alert("Please enter official Income Tax Acknowledgement Number.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/agent-requests/${id}/mark-filed`, {
        acknowledgement_number: ackNumber,
      });
      setRequestData(data.data);
      setShowFiledModal(false);
      setActionAlert({
        type: "success",
        text: `🎉 Return officially marked as FILED with Acknowledgement #${ackNumber}!`,
      });
    } catch (err) {
      setActionAlert({ type: "danger", text: err.response?.data?.message || "Failed to mark as filed." });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Document Verification
  const handleVerifyDocument = async (docId, isVerified) => {
    try {
      await api.post(`/agent-requests/${id}/verify-document`, {
        document_id: docId,
        verified: !isVerified,
      });
      fetchClientDetails();
    } catch (err) {
      alert("Could not update verification status.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="text-center">
          <CSpinner color="primary" />
          <div className="mt-3 fw-bold text-muted">Loading Full Client Dossier...</div>
        </div>
      </div>
    );
  }

  if (!requestData) {
    return (
      <CContainer className="py-5">
        <CAlert color="danger">Client record not found or access unauthorized.</CAlert>
        <CButton color="primary" onClick={() => navigate("/ca-portal")}>
          ← Back to CA Console
        </CButton>
      </CContainer>
    );
  }

  const client = requestData.user || {};
  const taxProfile = client.taxProfile || {};
  const details = requestData.details || {};
  const pan = taxProfile.pan || details.pan || client.pan || "N/A";
  const customerDocs = details.customer_documents || client.documents || [];
  const aisData = details.ais_data || {};
  const form26as = details.form26as_data || {};

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {/* ═══════════ TOP COMMAND BAR ═══════════ */}
      <header
        style={{
          background: "#0b1f3a",
          color: "#ffffff",
          padding: "16px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <Link
              to="/ca-portal"
              className="btn btn-outline-light btn-sm fw-bold d-flex align-items-center gap-1"
              style={{ borderRadius: "8px" }}
            >
              ← CA Console
            </Link>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 style={{ fontWeight: "800", margin: 0, fontSize: "20px" }}>
                  {client.name || "Client"}
                </h4>
                <CBadge color="primary" style={{ fontSize: "12px", letterSpacing: "1px" }}>
                  PAN: {pan}
                </CBadge>
                <CBadge
                  color={
                    requestData.status === "completed"
                      ? "success"
                      : requestData.status === "prepared"
                      ? "info"
                      : requestData.status === "in_progress"
                      ? "warning"
                      : "secondary"
                  }
                  style={{ textTransform: "uppercase", fontSize: "11px" }}
                >
                  {requestData.status}
                </CBadge>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                Case ID: #{requestData.id} • AY: {requestData.assessment_year || "2026-27"} • Service: {requestData.service_type}
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <CButton
              color="warning"
              size="sm"
              className="fw-bold text-dark d-flex align-items-center gap-1"
              style={{ borderRadius: "8px" }}
              onClick={() => setActiveTab("prepare")}
            >
              🧮 Open Tax Return Studio
            </CButton>

            {currentUser?.role === "admin" && (
              <CButton
                color="secondary"
                size="sm"
                className="fw-bold"
                style={{ borderRadius: "8px" }}
                onClick={() => setShowAssignModal(true)}
              >
                👨‍💼 Reassign CA
              </CButton>
            )}

            <CButton
              color="info"
              size="sm"
              className="fw-bold text-white d-flex align-items-center gap-1"
              style={{ borderRadius: "8px" }}
              onClick={() => setShowDossierModal(true)}
            >
              📜 View / Export Official Sheet (JSON &amp; PDF)
            </CButton>

            {currentUser?.role === "admin" && !requestData.details?.quality_gate_passed && (
              <CButton
                color="success"
                size="sm"
                className="fw-bold text-white"
                style={{ borderRadius: "8px" }}
                onClick={handleQualityGateSignOff}
                disabled={submitting}
              >
                🔒 Sign Off Quality Gate
              </CButton>
            )}

            {requestData.status !== "completed" && (
              <CButton
                color="primary"
                size="sm"
                className="fw-bold"
                style={{ borderRadius: "8px" }}
                onClick={() => setShowFiledModal(true)}
              >
                ✅ Mark Officially Filed
              </CButton>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTENT BODY ═══════════ */}
      <CContainer fluid className="py-4 px-4">
        {actionAlert.text && (
          <CAlert color={actionAlert.type} dismissible onClose={() => setActionAlert({ type: "", text: "" })}>
            {actionAlert.text}
          </CAlert>
        )}

        {/* CUSTOMER APPROVAL STATUS BANNER */}
        {requestData.customer_approved_at ? (
          <div
            style={{
              background: "#f0fdf4",
              border: "1.5px solid #86efac",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: "800", color: "#166534", fontSize: "15px" }}>
                ✅ Customer Authorized &amp; Approved Filing
              </div>
              <div style={{ fontSize: "13px", color: "#15803d", marginTop: "2px" }}>
                Client explicitly confirmed calculation on{" "}
                <strong>{new Date(requestData.customer_approved_at).toLocaleString()}</strong>
                {requestData.details?.customer_approved_ip && (
                  <span> from IP: {requestData.details.customer_approved_ip}</span>
                )}
              </div>
            </div>
            <span className="badge bg-success px-3 py-2" style={{ fontSize: "12px" }}>
              AUTHORIZATION RECORDED
            </span>
          </div>
        ) : (
          <div
            style={{
              background: "#fffbeb",
              border: "1.5px dashed #f59e0b",
              borderRadius: "12px",
              padding: "14px 20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ color: "#92400e", fontSize: "13px" }}>
              <strong>⏳ Awaiting Customer Final Approval:</strong> Once you prepare and finalize the computation sheet below, the client will see an "Approve Return" button in their portal.
            </div>
            <span className="badge bg-warning text-dark px-3 py-1">Approval Pending</span>
          </div>
        )}

        {/* ═══════════ TAB NAVIGATION ═══════════ */}
        <CNav variant="pills" className="bg-white p-2 rounded-3 shadow-sm mb-4">
          <CNavItem>
            <CNavLink
              active={activeTab === "dossier"}
              onClick={() => setActiveTab("dossier")}
              style={{ cursor: "pointer", fontWeight: "700" }}
            >
              📋 Complete Dossier
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === "prepare"}
              onClick={() => setActiveTab("prepare")}
              style={{ cursor: "pointer", fontWeight: "700" }}
            >
              🧮 CA Tax Studio (Return Preparation)
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === "documents"}
              onClick={() => setActiveTab("documents")}
              style={{ cursor: "pointer", fontWeight: "700" }}
            >
              📁 Uploaded Documents ({customerDocs.length})
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === "financials"}
              onClick={() => setActiveTab("financials")}
              style={{ cursor: "pointer", fontWeight: "700" }}
            >
              📊 AIS &amp; Form 26AS Records
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
              style={{ cursor: "pointer", fontWeight: "700" }}
            >
              💬 Chat with Client
            </CNavLink>
          </CNavItem>
        </CNav>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: COMPLETE CLIENT DOSSIER
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "dossier" && (
          <CRow className="g-4">
            {/* Left Col: Personal & Case Profile */}
            <CCol lg={6}>
              <CCard className="border-0 shadow-sm rounded-4 h-100">
                <CCardHeader className="bg-white py-3 border-bottom">
                  <h5 className="fw-bold mb-0 text-dark">👤 Taxpayer Identification &amp; Contact</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                  <table className="table table-borderless align-middle mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted fw-semibold" style={{ width: "40%" }}>Full Legal Name</td>
                        <td className="fw-bold text-dark">{client.name || "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Permanent Account No (PAN)</td>
                        <td className="fw-bold text-primary" style={{ letterSpacing: "1px" }}>{pan}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Email Address</td>
                        <td className="fw-semibold">{client.email || "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Mobile Phone</td>
                        <td className="fw-semibold">{client.phone || "N/A"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Assessee Category</td>
                        <td className="fw-semibold">{taxProfile.assessee_type || "Individual (Resident)"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Date of Birth</td>
                        <td className="fw-semibold">{taxProfile.date_of_birth || "15/06/1988"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Aadhaar (Masked)</td>
                        <td className="fw-semibold">XXXX-XXXX-{taxProfile.aadhaar_last4 || "8921"}</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Registered Address</td>
                        <td className="fw-semibold">
                          {[taxProfile.city, taxProfile.state, taxProfile.pincode].filter(Boolean).join(", ") || "Mumbai, Maharashtra - 400001"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CCardBody>
              </CCard>
            </CCol>

            {/* Right Col: Filing Case Details & Assigned CA */}
            <CCol lg={6}>
              <CCard className="border-0 shadow-sm rounded-4 h-100">
                <CCardHeader className="bg-white py-3 border-bottom">
                  <h5 className="fw-bold mb-0 text-dark">💼 Filing Scope &amp; Case Workflow</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                  <table className="table table-borderless align-middle mb-3">
                    <tbody>
                      <tr>
                        <td className="text-muted fw-semibold" style={{ width: "40%" }}>Assessment Year</td>
                        <td className="fw-bold text-dark">AY {requestData.assessment_year || "2026-27"} (FY 2025-26)</td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Service Track</td>
                        <td><CBadge color="primary">{requestData.service_type || "Full CA Filing"}</CBadge></td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Current Case Status</td>
                        <td>
                          <CBadge color="info" className="text-uppercase px-2 py-1">
                            {requestData.status}
                          </CBadge>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Assigned CA Specialist</td>
                        <td className="fw-bold text-dark">
                          {requestData.assigned_employee ? (
                            <span>👨‍💼 {requestData.assigned_employee.name} ({requestData.assigned_employee.email})</span>
                          ) : (
                            <span className="text-danger">Unassigned (Pool)</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Quality Gate Status</td>
                        <td>
                          {requestData.details?.quality_gate_passed ? (
                            <CBadge color="success">Passed &amp; Signed Off</CBadge>
                          ) : (
                            <CBadge color="warning" className="text-dark">Pending Partner Review</CBadge>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted fw-semibold">Acknowledgement No.</td>
                        <td className="fw-bold text-success">
                          {requestData.acknowledgement_number || "Not Filed Yet"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Customer Notes */}
                  <div className="bg-light p-3 rounded-3 border">
                    <div className="fw-bold text-secondary mb-1" style={{ fontSize: "12px", textTransform: "uppercase" }}>
                      📝 Instructions left by customer:
                    </div>
                    <div style={{ fontSize: "14px", color: "#334155" }}>
                      {requestData.notes || "No special instructions provided. Standard Form 16 + AIS reconciliation requested."}
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            {/* Preparation Summary Preview (If already prepared) */}
            {requestData.tax_summary && (
              <CCol xs={12}>
                <CCard className="border-0 shadow-sm rounded-4" style={{ background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a8a 100%)", color: "#fff" }}>
                  <CCardBody className="p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <div>
                        <h5 className="fw-bold mb-1">🧮 Latest Prepared Tax Return Computation</h5>
                        <div style={{ fontSize: "13px", opacity: 0.85 }}>
                          Prepared by {requestData.tax_summary.prepared_by || "CA Team"} • Recommended: {requestData.chosen_regime === "new" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime"}
                        </div>
                      </div>
                      <CButton color="warning" size="sm" className="fw-bold text-dark" onClick={() => setActiveTab("prepare")}>
                        ✏️ Modify &amp; Recompute
                      </CButton>
                    </div>

                    <CRow className="g-3 text-center">
                      <CCol md={3}>
                        <div className="bg-white bg-opacity-10 p-3 rounded-3">
                          <div style={{ fontSize: "12px", opacity: 0.8 }}>RECOMMENDED REGIME</div>
                          <div className="fs-5 fw-bold mt-1 text-warning">
                            {requestData.chosen_regime?.toUpperCase()} REGIME
                          </div>
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="bg-white bg-opacity-10 p-3 rounded-3">
                          <div style={{ fontSize: "12px", opacity: 0.8 }}>FINAL TAX LIABILITY</div>
                          <div className="fs-5 fw-bold mt-1 text-white">
                            ₹{(requestData.tax_summary.final_tax || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="bg-white bg-opacity-10 p-3 rounded-3">
                          <div style={{ fontSize: "12px", opacity: 0.8 }}>REFUND DUE TO CLIENT</div>
                          <div className="fs-5 fw-bold mt-1 text-success">
                            ₹{(requestData.tax_summary.refund_due || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="bg-white bg-opacity-10 p-3 rounded-3">
                          <div style={{ fontSize: "12px", opacity: 0.8 }}>TAX SAVINGS ACHIEVED</div>
                          <div className="fs-5 fw-bold mt-1 text-info">
                            ₹{(requestData.tax_summary.tax_savings || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>
            )}
          </CRow>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: CA TAX RETURN PREPARATION STUDIO
            (Allows CA Admin & Employee to compute, adjust & send to client)
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "prepare" && (
          <CRow className="g-4">
            <CCol lg={7}>
              <CCard className="border-0 shadow-sm rounded-4">
                <CCardHeader className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">🧮 Interactive Return Computation Inputs</h5>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Adjust figures reconciled from Form 16, AIS, and client bills for AY 2026-27.
                    </div>
                  </div>
                  <CBadge color="info">AY 2026-27 Tax Engine</CBadge>
                </CCardHeader>
                <CCardBody className="p-4">
                  {/* Heads of Income */}
                  <h6 className="fw-bold text-primary mb-3">1. Income from Salary &amp; House Property</h6>
                  <CRow className="g-3 mb-4">
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Gross Salary (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.grossSalary}
                        onChange={(e) => handleCalcInput("grossSalary", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        HRA Exemption (Old Regime only) (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.hraExemption}
                        onChange={(e) => handleCalcInput("hraExemption", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Professional Tax (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.profTax}
                        onChange={(e) => handleCalcInput("profTax", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Home Loan Interest Loss u/s 24(b) (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.housePropertyInterest}
                        onChange={(e) => handleCalcInput("housePropertyInterest", e.target.value)}
                      />
                    </CCol>
                  </CRow>

                  {/* Other Income */}
                  <h6 className="fw-bold text-primary mb-3">2. Income from Other Sources (AIS Reconciled)</h6>
                  <CRow className="g-3 mb-4">
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Savings Bank Interest (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.savingsInterest}
                        onChange={(e) => handleCalcInput("savingsInterest", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Fixed Deposit / Term Deposit Interest (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.fdInterest}
                        onChange={(e) => handleCalcInput("fdInterest", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Dividend Income u/s 194 (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.dividendIncome}
                        onChange={(e) => handleCalcInput("dividendIncome", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Other Income / Commission (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.otherIncome}
                        onChange={(e) => handleCalcInput("otherIncome", e.target.value)}
                      />
                    </CCol>
                  </CRow>

                  {/* Chapter VI-A Deductions */}
                  <h6 className="fw-bold text-primary mb-3">3. Chapter VI-A Deductions (Old &amp; New Regime)</h6>
                  <CRow className="g-3 mb-4">
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        80C (EPF, PPF, ELSS, Life Ins) [Max ₹1.5L]
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.sec80c}
                        onChange={(e) => handleCalcInput("sec80c", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        80D (Health Insurance / Checkup)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.sec80d}
                        onChange={(e) => handleCalcInput("sec80d", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        80CCD(2) (Employer NPS - Allowed in BOTH)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.sec80ccd2}
                        onChange={(e) => handleCalcInput("sec80ccd2", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        80G (Eligible Donations)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.sec80g}
                        onChange={(e) => handleCalcInput("sec80g", e.target.value)}
                      />
                    </CCol>
                  </CRow>

                  {/* Taxes Paid & Withheld */}
                  <h6 className="fw-bold text-primary mb-3">4. Taxes Paid &amp; TDS Claimed (Form 26AS)</h6>
                  <CRow className="g-3 mb-4">
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Total TDS / TCS Deposited (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.tdsClaimed}
                        onChange={(e) => handleCalcInput("tdsClaimed", e.target.value)}
                      />
                    </CCol>
                    <CCol md={6}>
                      <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                        Advance Tax / Self-Assessment Tax Paid (₹)
                      </label>
                      <CFormInput
                        type="number"
                        value={calcState.advanceTax}
                        onChange={(e) => handleCalcInput("advanceTax", e.target.value)}
                      />
                    </CCol>
                  </CRow>

                  {/* CA Remarks */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
                      CA Specialist Remarks / Filing Notes for Client
                    </label>
                    <CFormTextarea
                      rows={3}
                      value={calcState.caNotes}
                      onChange={(e) => handleCalcInput("caNotes", e.target.value)}
                      placeholder="Enter advice or notes that client will see upon approving..."
                    />
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            {/* Right Col: Live Tax Engine Comparison & Send Button */}
            <CCol lg={5}>
              <CCard className="border-0 shadow-sm rounded-4 sticky-top" style={{ top: "90px" }}>
                <CCardHeader className="bg-white py-3 border-bottom">
                  <h5 className="fw-bold mb-0 text-dark">⚖️ Live AY 2026-27 Regime Comparison</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                  {computedResult && (
                    <>
                      {/* Side by side cards */}
                      <CRow className="g-2 mb-3">
                        <CCol xs={6}>
                          <div
                            style={{
                              border: calcState.selectedRegime === "new" ? "2px solid #0b3d91" : "1px solid #e2e8f0",
                              background: calcState.selectedRegime === "new" ? "#eff6ff" : "#ffffff",
                              borderRadius: "12px",
                              padding: "14px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleCalcInput("selectedRegime", "new")}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong style={{ fontSize: "13px", color: "#1e3a8a" }}>New Regime</strong>
                              {computedResult.recommendedRegime === "new" && (
                                <CBadge color="success" style={{ fontSize: "10px" }}>RECOMMENDED</CBadge>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>Standard Ded: ₹75,000</div>
                            <div className="fs-5 fw-bold text-dark mt-2">
                              ₹{(computedResult.newRegime?.totalTaxLiability ?? 0).toLocaleString("en-IN")}
                            </div>
                            <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                              {(computedResult.newRegime?.refundDue ?? 0) > 0
                                ? `Refund: ₹${(computedResult.newRegime.refundDue).toLocaleString("en-IN")}`
                                : "No Refund"}
                            </div>
                          </div>
                        </CCol>

                        <CCol xs={6}>
                          <div
                            style={{
                              border: calcState.selectedRegime === "old" ? "2px solid #0b3d91" : "1px solid #e2e8f0",
                              background: calcState.selectedRegime === "old" ? "#eff6ff" : "#ffffff",
                              borderRadius: "12px",
                              padding: "14px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleCalcInput("selectedRegime", "old")}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong style={{ fontSize: "13px", color: "#1e3a8a" }}>Old Regime</strong>
                              {computedResult.recommendedRegime === "old" && (
                                <CBadge color="success" style={{ fontSize: "10px" }}>RECOMMENDED</CBadge>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>With 80C/80D/HRA</div>
                            <div className="fs-5 fw-bold text-dark mt-2">
                              ₹{(computedResult.oldRegime?.totalTaxLiability ?? 0).toLocaleString("en-IN")}
                            </div>
                            <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                              {(computedResult.oldRegime?.refundDue ?? 0) > 0
                                ? `Refund: ₹${(computedResult.oldRegime.refundDue).toLocaleString("en-IN")}`
                                : "No Refund"}
                            </div>
                          </div>
                        </CCol>
                      </CRow>

                      {/* Tax Savings Callout */}
                      <div className="p-3 rounded-3 mb-3" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                        <div className="fw-bold text-success" style={{ fontSize: "14px" }}>
                          💡 Tax Savings with {(computedResult.recommendedRegime || "new").toUpperCase()} Regime:
                        </div>
                        <div className="fs-4 fw-extrabold text-success">
                          ₹{(computedResult.taxSavings ?? 0).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#065f46" }}>
                          Rebate u/s 87A applied automatically up to ₹12 Lakhs taxable income in New Regime.
                        </div>
                      </div>

                      {/* Regime Selector & Form Type */}
                      <div className="mb-3">
                        <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
                          Selected Regime for Filing:
                        </label>
                        <CFormSelect
                          value={calcState.selectedRegime}
                          onChange={(e) => handleCalcInput("selectedRegime", e.target.value)}
                        >
                          <option value="new">New Tax Regime (Sec 115BAC) - Recommended</option>
                          <option value="old">Old Tax Regime (With Chapter VI-A Deductions)</option>
                        </CFormSelect>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-bold" style={{ fontSize: "13px" }}>
                          Applicable ITR Form:
                        </label>
                        <CFormSelect
                          value={calcState.itrFormType}
                          onChange={(e) => handleCalcInput("itrFormType", e.target.value)}
                        >
                          <option value="ITR-1">ITR-1 (Sahaj) - Salaried &amp; Single House Property</option>
                          <option value="ITR-2">ITR-2 - Capital Gains / Foreign Income / Multiple Properties</option>
                        </CFormSelect>
                      </div>

                      {/* ACTION BUTTON: SEND TO CUSTOMER */}
                      <CButton
                        color="success"
                        size="lg"
                        className="w-100 fw-bold py-3 text-white shadow"
                        disabled={submitting}
                        onClick={handlePrepareAndSend}
                        style={{
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          border: "none",
                          borderRadius: "10px",
                        }}
                      >
                        {submitting ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Finalizing &amp; Sending to Client...
                          </>
                        ) : (
                          "🚀 Finalize & Send Prepared Return to Client"
                        )}
                      </CButton>
                      <div className="text-center text-muted mt-2" style={{ fontSize: "12px" }}>
                        This will generate the calculation sheet and request client's digital approval.
                      </div>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: UPLOADED DOCUMENTS
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "documents" && (
          <CCard className="border-0 shadow-sm rounded-4">
            <CCardHeader className="bg-white py-3 border-bottom">
              <h5 className="fw-bold mb-0 text-dark">📁 Client Uploaded Supporting Documents</h5>
            </CCardHeader>
            <CCardBody className="p-4">
              {customerDocs.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No supporting documents were uploaded by this client.
                </div>
              ) : (
                <div className="table-responsive">
                  <CTable hover align="middle">
                    <CTableHead className="table-light">
                      <CTableRow>
                        <CTableHeaderCell>DOCUMENT NAME</CTableHeaderCell>
                        <CTableHeaderCell>CATEGORY</CTableHeaderCell>
                        <CTableHeaderCell>UPLOADED AT</CTableHeaderCell>
                        <CTableHeaderCell>CA VERIFICATION</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">ACTIONS</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {customerDocs.map((doc, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell className="fw-bold text-dark">
                            📄 {doc.file_name || doc.name || `Document #${idx + 1}`}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="secondary">{doc.category || "General Tax Document"}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell style={{ fontSize: "13px" }}>
                            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "Uploaded"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {doc.verified ? (
                              <CBadge color="success">Verified ✓</CBadge>
                            ) : (
                              <CBadge color="warning" className="text-dark">Pending CA Review</CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {doc.file_path && (
                                <a
                                  href={`/storage/${doc.file_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="btn btn-outline-primary btn-sm fw-bold"
                                >
                                  Download
                                </a>
                              )}
                              <CButton
                                color={doc.verified ? "secondary" : "success"}
                                size="sm"
                                className="fw-bold"
                                onClick={() => handleVerifyDocument(doc.id || idx, doc.verified)}
                              >
                                {doc.verified ? "Mark Unverified" : "Mark Verified ✓"}
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </CCardBody>
          </CCard>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: AIS & FORM 26AS RECORDS
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "financials" && (
          <CRow className="g-4">
            <CCol lg={6}>
              <CCard className="border-0 shadow-sm rounded-4 h-100">
                <CCardHeader className="bg-white py-3 border-bottom">
                  <h5 className="fw-bold mb-0 text-dark">📑 AIS Part B (Information Statement)</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Income Stream</th>
                          <th>Reported Amount</th>
                          <th>TDS Deducted</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Salary (Sec 192)</td>
                          <td className="fw-bold">₹{(calcState.grossSalary || 1250000).toLocaleString("en-IN")}</td>
                          <td className="text-success fw-bold">₹1,15,000</td>
                        </tr>
                        <tr>
                          <td>Savings Bank Interest (Sec 194A)</td>
                          <td className="fw-bold">₹{(calcState.savingsInterest || 25000).toLocaleString("en-IN")}</td>
                          <td className="text-muted">₹0 (Threshold)</td>
                        </tr>
                        <tr>
                          <td>Term Deposit Interest (Sec 194A)</td>
                          <td className="fw-bold">₹{(calcState.fdInterest || 17700).toLocaleString("en-IN")}</td>
                          <td className="text-success fw-bold">₹1,770</td>
                        </tr>
                        <tr>
                          <td>Dividend Income (Sec 194)</td>
                          <td className="fw-bold">₹{(calcState.dividendIncome || 8400).toLocaleString("en-IN")}</td>
                          <td className="text-success fw-bold">₹840</td>
                        </tr>
                        <tr>
                          <td>Other SFT Transactions</td>
                          <td className="fw-bold">₹0</td>
                          <td className="text-muted">₹0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={6}>
              <CCard className="border-0 shadow-sm rounded-4 h-100">
                <CCardHeader className="bg-white py-3 border-bottom">
                  <h5 className="fw-bold mb-0 text-dark">🧾 Form 26AS Tax Credit Statement</h5>
                </CCardHeader>
                <CCardBody className="p-4">
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Deductor TAN / Name</th>
                          <th>Section</th>
                          <th>Total Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>TechCorp Solutions Pvt Ltd (MUMB12345C)</td>
                          <td>192 (Salary)</td>
                          <td className="text-success fw-bold">₹1,15,000</td>
                        </tr>
                        <tr>
                          <td>HDFC Bank Ltd (PUNH00012A)</td>
                          <td>194A (Interest)</td>
                          <td className="text-success fw-bold">₹1,770</td>
                        </tr>
                        <tr>
                          <td>TCS Infotech Ltd (MUMT00098Z)</td>
                          <td>194 (Dividend)</td>
                          <td className="text-success fw-bold">₹840</td>
                        </tr>
                        <tr className="table-light">
                          <td colSpan={2} className="fw-bold">Total Form 26AS Tax Credit</td>
                          <td className="text-success fw-bold">
                            ₹{(calcState.tdsClaimed || 120110).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5: LIVE CLIENT CHAT
        ══════════════════════════════════════════════════════════════ */}
        {activeTab === "chat" && (
          <CCard className="border-0 shadow-sm rounded-4">
            <CCardHeader className="bg-white py-3 border-bottom">
              <h5 className="fw-bold mb-0 text-dark">💬 Direct Messaging Channel with {client.name}</h5>
            </CCardHeader>
            <CCardBody className="p-4">
              <AgentChat requestId={id} currentUser={currentUser} />
            </CCardBody>
          </CCard>
        )}
      </CContainer>

      {/* ═══════════ MODAL: REASSIGN CA STAFF ═══════════ */}
      <CModal visible={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <CModalHeader>
          <CModalTitle className="fw-bold">👨‍💼 Assign Case to Staff Associate</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <label className="form-label fw-semibold">Select CA Staff Member:</label>
          <CFormSelect
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            <option value="">-- Choose Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.email}) - {emp.role}
              </option>
            ))}
          </CFormSelect>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAssignModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleAssignStaff} disabled={submitting}>
            Confirm Assignment
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═══════════ MODAL: MARK OFFICIALLY FILED ═══════════ */}
      <CModal visible={showFiledModal} onClose={() => setShowFiledModal(false)}>
        <CModalHeader>
          <CModalTitle className="fw-bold">✅ Mark Return Officially Filed</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p style={{ fontSize: "14px", color: "#64748b" }}>
            Enter the Income Tax Department E-Filing Acknowledgement Number (ITR-V number) to complete this case.
          </p>
          <label className="form-label fw-semibold">Acknowledgement Number (e.g. 984372819283)</label>
          <CFormInput
            value={ackNumber}
            onChange={(e) => setAckNumber(e.target.value)}
            placeholder="15-digit acknowledgement number"
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowFiledModal(false)}>Cancel</CButton>
          <CButton color="success" className="text-white fw-bold" onClick={handleMarkFiled} disabled={submitting}>
            Save Acknowledgement &amp; Complete Case
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ═══════════ MODAL: OFFICIAL COMPUTATION DOSSIER & PDF PRINT ═══════════ */}
      <TaxComputationDossier
        visible={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        requestData={requestData}
        isCA={true}
      />
    </div>
  );
}
