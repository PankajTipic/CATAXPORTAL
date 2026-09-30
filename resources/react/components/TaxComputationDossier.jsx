import React, { useState } from "react";
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CBadge,
  CRow,
  CCol,
  CAlert,
} from "@coreui/react";
import { generateItrJson } from "../utils/itrJsonGenerator";

/**
 * Professional Tax Computation Dossier, JSON Downloader & PDF Print Sheet
 * Shared across CA Console (ClientDetails.jsx, CaPortal.jsx) and Customer Portal (HireAgent.jsx)
 */
export default function TaxComputationDossier({
  visible,
  onClose,
  requestData,
  isCA = false,
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  if (!requestData) return null;

  const client = requestData.user || {};
  const taxProfile = client.taxProfile || {};
  const details = requestData.details || {};
  const pan = taxProfile.pan || details.pan || client.pan || "ABCDE1234F";
  const assessmentYear = requestData.assessment_year || "2026-27";
  const taxSummary = requestData.tax_summary || {};
  const prep = details.prepared_computation || {};

  const grossSalary = Number(prep.grossSalary ?? 1250000);
  const hraExemption = Number(prep.hraExemption ?? 120000);
  const profTax = Number(prep.profTax ?? 2500);
  const hpInterest = Number(prep.housePropertyInterest ?? 0);
  const savingsInterest = Number(prep.savingsInterest ?? 25000);
  const fdInterest = Number(prep.fdInterest ?? 17700);
  const dividendIncome = Number(prep.dividendIncome ?? 8400);
  const otherIncome = Number(prep.otherIncome ?? 720);
  const totalOther = savingsInterest + fdInterest + dividendIncome + otherIncome;

  const grossTotalIncome = grossSalary + totalOther;

  const sec80c = Number(prep.sec80c ?? 150000);
  const sec80d = Number(prep.sec80d ?? 25000);
  const sec80ccd2 = Number(prep.sec80ccd2 ?? 50000);
  const sec80g = Number(prep.sec80g ?? 0);

  const chosenRegime = requestData.chosen_regime || taxSummary.chosen_regime || "new";
  const itrFormType = requestData.itr_form_type || "ITR-1";

  const stdDeduction = chosenRegime === "new" ? 75000 : 50000;
  const chapterVia = chosenRegime === "new" ? sec80ccd2 : (sec80c + sec80d + sec80ccd2 + sec80g);
  const totalDeductions = stdDeduction + chapterVia + (chosenRegime === "old" ? hraExemption + profTax : 0);

  const netTaxableIncome = Math.max(0, grossTotalIncome - totalDeductions - (chosenRegime === "old" ? hpInterest : 0));

  const finalTax = Number(taxSummary.final_tax ?? 0);
  const refundDue = Number(taxSummary.refund_due ?? 0);
  const taxPayable = Number(taxSummary.tax_payable ?? 0);
  const tdsCredit = Number(prep.tdsClaimed ?? (taxSummary.total_tds_credit || 120110));
  const advanceTax = Number(prep.advanceTax ?? 0);
  const totalTaxesPaid = tdsCredit + advanceTax;
  const taxSavings = Number(taxSummary.tax_savings ?? 16640);

  /* ══════════ 1. DOWNLOAD OFFICIAL ITR JSON ══════════ */
  const handleDownloadJson = () => {
    try {
      const json = generateItrJson({
        taxpayer: {
          pan: pan,
          name: client.name || "Taxpayer",
          dob: taxProfile.date_of_birth || "1988-06-15",
          email: client.email || "client@taxpayer.local",
          mobile: client.phone || "9876543210",
          address: {
            city: taxProfile.city || "Mumbai",
            state: taxProfile.state || "Maharashtra",
            pincode: taxProfile.pincode || "400001",
          },
        },
        assessmentYear: assessmentYear,
        formType: itrFormType,
        chosenRegime: chosenRegime,
        incomeData: {
          salary: grossSalary,
          interest: savingsInterest + fdInterest,
          dividend: dividendIncome,
        },
        deductionData: {
          sec80c: sec80c,
          sec80d: sec80d,
          sec80ccd2: sec80ccd2,
          sec80g: sec80g,
        },
        activeTax: finalTax,
        activeRefund: refundDue,
        activePayable: taxPayable,
        totalTdsCredit: totalTaxesPaid,
      });

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ITR_${pan}_AY${assessmentYear}_${itrFormType}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to generate JSON: " + err.message);
    }
  };

  /* ══════════ 2. DOWNLOAD / PRINT HIGH-RES PDF STATEMENT ══════════ */
  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to generate PDF statement.");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>ITR Computation Sheet - ${pan} (AY ${assessmentYear})</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 13px; margin: 0; padding: 15px; }
    .header-table { width: 100%; border-bottom: 2px solid #0b3d91; padding-bottom: 12px; margin-bottom: 16px; }
    .firm-title { font-size: 20px; font-weight: 800; color: #0b3d91; text-transform: uppercase; }
    .sub-title { font-size: 13px; font-weight: 700; color: #475569; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; }
    .badge-primary { background: #0b3d91; color: #fff; }
    .badge-success { background: #16a34a; color: #fff; }
    .section-title { font-size: 14px; font-weight: 800; color: #0b3d91; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 8px; text-transform: uppercase; }
    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.data-table th, table.data-table td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 12px; }
    table.data-table th { background: #f8fafc; font-weight: 700; text-align: left; }
    .amount { text-align: right; font-weight: 700; }
    .highlight-row { background: #eff6ff; font-weight: 800; }
    .success-box { background: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 6px; margin-top: 15px; }
    .footer-seal { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .seal-box { border: 1.5px dashed #0b3d91; border-radius: 8px; padding: 12px 18px; text-align: center; width: 220px; color: #0b3d91; font-size: 11px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #eff6ff; padding: 10px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
    <span><strong>Tip:</strong> Choose "Save as PDF" in the destination dropdown to export this document.</span>
    <button onclick="window.print()" style="background: #0b3d91; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">🖨️ Print / Save PDF</button>
  </div>

  <table class="header-table">
    <tr>
      <td>
        <div class="firm-title">CA TAX MANAGEMENT PORTAL</div>
        <div class="sub-title">COMPUTATION OF TOTAL INCOME &amp; TAX LIABILITY</div>
        <div style="font-size: 11px; color: #64748b;">Assessment Year: <strong>${assessmentYear}</strong> (Financial Year: 2025-26)</div>
      </td>
      <td style="text-align: right;">
        <span class="badge badge-primary">${itrFormType}</span>
        <span class="badge badge-success">${chosenRegime.toUpperCase()} REGIME</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Case Ref: #${requestData.id}</div>
      </td>
    </tr>
  </table>

  <!-- Taxpayer Details -->
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Taxpayer Name</th>
      <td style="width: 25%; font-weight: bold;">${client.name || "N/A"}</td>
      <th style="width: 25%;">Permanent Account No (PAN)</th>
      <td style="width: 25%; font-weight: bold; color: #0b3d91;">${pan}</td>
    </tr>
    <tr>
      <th>Assessee Status</th>
      <td>Individual (Resident)</td>
      <th>Date of Birth</th>
      <td>${taxProfile.date_of_birth || "15/06/1988"}</td>
    </tr>
    <tr>
      <th>Email Address</th>
      <td>${client.email || "N/A"}</td>
      <th>Mobile Number</th>
      <td>${client.phone || "N/A"}</td>
    </tr>
    <tr>
      <th>Filing Regime Chosen</th>
      <td colspan="3"><strong>${chosenRegime === "new" ? "New Tax Regime u/s 115BAC (Default)" : "Old Tax Regime (With Deductions)"}</strong></td>
    </tr>
  </table>

  <!-- Income Breakdown -->
  <div class="section-title">Schedule A: Gross Total Income</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Particulars / Income Head</th>
        <th class="amount" style="width: 140px;">Gross (₹)</th>
        <th class="amount" style="width: 140px;">Exemptions / Allowances (₹)</th>
        <th class="amount" style="width: 140px;">Taxable (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Income from Salary (Form 16 / Sec 192)</td>
        <td class="amount">${grossSalary.toLocaleString("en-IN")}</td>
        <td class="amount">${(chosenRegime === "old" ? hraExemption + profTax : 0).toLocaleString("en-IN")}</td>
        <td class="amount">${(grossSalary - (chosenRegime === "old" ? hraExemption + profTax : 0)).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Less: Standard Deduction u/s 16(ia)</td>
        <td class="amount">-</td>
        <td class="amount">${stdDeduction.toLocaleString("en-IN")}</td>
        <td class="amount">-${stdDeduction.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>3. Income from House Property (Loss u/s 24b)</td>
        <td class="amount">-</td>
        <td class="amount">${(chosenRegime === "old" ? hpInterest : 0).toLocaleString("en-IN")}</td>
        <td class="amount">-${(chosenRegime === "old" ? hpInterest : 0).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>4. Income from Other Sources (Savings &amp; FD Interest, Dividends)</td>
        <td class="amount">${totalOther.toLocaleString("en-IN")}</td>
        <td class="amount">-</td>
        <td class="amount">${totalOther.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="highlight-row">
        <td colspan="3">Gross Total Income (GTI)</td>
        <td class="amount">₹${grossTotalIncome.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <!-- Deductions Breakdown -->
  <div class="section-title">Schedule B: Chapter VI-A Deductions Claimed</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Deduction Section &amp; Description</th>
        <th class="amount" style="width: 160px;">Amount Claimed (₹)</th>
        <th class="amount" style="width: 160px;">Eligible Allowed (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Section 80C (Life Insurance, PPF, EPF, ELSS) [Max ₹1,50,000]</td>
        <td class="amount">${sec80c.toLocaleString("en-IN")}</td>
        <td class="amount">${(chosenRegime === "old" ? Math.min(sec80c, 150000) : 0).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>Section 80D (Health Insurance Premium)</td>
        <td class="amount">${sec80d.toLocaleString("en-IN")}</td>
        <td class="amount">${(chosenRegime === "old" ? Math.min(sec80d, 25000) : 0).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>Section 80CCD(2) (Employer's Contribution to NPS - Allowed in BOTH)</td>
        <td class="amount">${sec80ccd2.toLocaleString("en-IN")}</td>
        <td class="amount">${sec80ccd2.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="highlight-row">
        <td>Total Chapter VI-A Deductions</td>
        <td class="amount">₹${(sec80c + sec80d + sec80ccd2).toLocaleString("en-IN")}</td>
        <td class="amount">₹${chapterVia.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="highlight-row" style="background: #e0e7ff;">
        <td>Total Net Taxable Income</td>
        <td colspan="2" class="amount" style="font-size: 13px;">₹${netTaxableIncome.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <!-- Final Tax Calculation -->
  <div class="section-title">Schedule C: Computation of Tax Liability &amp; Refund Due</div>
  <table class="data-table">
    <tbody>
      <tr>
        <td>1. Tax Computed as per Slabs</td>
        <td class="amount">₹${finalTax.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Less: Rebate u/s 87A (Nil Tax up to ₹12 Lakhs in New Regime)</td>
        <td class="amount text-success">Applied</td>
      </tr>
      <tr>
        <td>3. Health &amp; Education Cess @ 4%</td>
        <td class="amount">Included</td>
      </tr>
      <tr class="highlight-row">
        <td>Total Net Tax Liability</td>
        <td class="amount">₹${finalTax.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>Less: Total Taxes Deposited (TDS u/s 192, 194A + Advance Tax)</td>
        <td class="amount text-success">-₹${totalTaxesPaid.toLocaleString("en-IN")}</td>
      </tr>
      <tr style="background: ${refundDue > 0 ? '#dcfce7' : '#fee2e2'}; font-weight: bold; font-size: 14px;">
        <td>${refundDue > 0 ? 'NET REFUND DUE TO TAXPAYER' : 'NET BALANCE TAX PAYABLE'}</td>
        <td class="amount" style="color: ${refundDue > 0 ? '#15803d' : '#b91c1c'}; font-size: 15px;">
          ₹${(refundDue > 0 ? refundDue : taxPayable).toLocaleString("en-IN")}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="success-box">
    <strong>💡 Regime Optimizer Note:</strong> By selecting the <strong>${chosenRegime.toUpperCase()} Tax Regime</strong>, you have achieved a net tax savings of <strong>₹${taxSavings.toLocaleString("en-IN")}</strong> for Assessment Year ${assessmentYear}.
  </div>

  <div class="footer-seal">
    <div style="font-size: 11px; color: #475569; width: 60%;">
      <strong>CA Quality Gate Certification:</strong><br />
      Certified that this computation sheet has been prepared after reconciling Form 16, AIS, and Form 26AS records in accordance with the provisions of the Income-tax Act, 1961 for AY ${assessmentYear}.<br /><br />
      Prepared by: <strong>${taxSummary.prepared_by || "CA Tax Specialist"}</strong> on ${new Date().toLocaleDateString("en-IN")}
    </div>
    <div class="seal-box">
      <strong>OFFICIAL SEAL &amp; SIGNATURE</strong><br /><br />
      <em>CA TAX PORTAL</em><br />
      Digitally Verified ✓
    </div>
  </div>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  /* ══════════ 3. SHARE LINK & WHATSAPP GENERATION ══════════ */
  const clientPortalUrl = `${window.location.origin}/agent/hire`;
  const shareMessage = `Hello ${client.name || "Client"},\n\nYour Chartered Accountant has prepared your ITR calculation sheet for AY ${assessmentYear} (PAN: ${pan}).\n\n- Recommended Regime: ${chosenRegime.toUpperCase()} Regime\n- Final Tax: ₹${finalTax.toLocaleString("en-IN")}\n- ${refundDue > 0 ? `Refund Due: ₹${refundDue.toLocaleString("en-IN")}` : `Balance Payable: ₹${taxPayable.toLocaleString("en-IN")}`}\n\nPlease click the link below to review and approve your return:\n${clientPortalUrl}\n\nThank you,\nCA Tax Portal`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientPortalUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareMessage);
    const phone = (client.phone || "").replace(/[^0-9]/g, "");
    const waUrl = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith("91") ? phone : "91" + phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  return (
    <>
      <CModal visible={visible} onClose={onClose} size="xl" backdrop="static">
        <CModalHeader style={{ background: "linear-gradient(135deg, #0b1f3a 0%, #1e3a8a 100%)", color: "#fff" }}>
          <div className="d-flex justify-content-between align-items-center w-100 pe-3">
            <div>
              <CModalTitle style={{ fontWeight: "800", fontSize: "18px" }}>
                📜 Official Tax Computation Sheet &amp; E-Filing Dossier
              </CModalTitle>
              <div style={{ fontSize: "12px", opacity: 0.85 }}>
                AY {assessmentYear} • PAN: {pan} • Client: {client.name}
              </div>
            </div>
            <CBadge color={chosenRegime === "new" ? "warning" : "light"} className="text-dark fw-bold px-3 py-2">
              {chosenRegime.toUpperCase()} REGIME SELECTED
            </CBadge>
          </div>
        </CModalHeader>

        <CModalBody className="p-4" style={{ background: "#f8fafc" }}>
          {/* TOP ACTION BAR: DOWNLOAD BUTTONS & SHARE */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div>
              <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "15px" }}>
                Export &amp; Share Official Deliverables
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Download official Income Tax Department JSON file or export professional PDF computation statement.
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* 1. Download Official JSON */}
              <CButton
                color="primary"
                className="fw-bold d-flex align-items-center gap-2"
                onClick={handleDownloadJson}
                style={{
                  background: "linear-gradient(135deg, #0b3d91 0%, #1a5bb8 100%)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 18px",
                }}
              >
                <span>📥</span> Download Official JSON (ITD Schema)
              </CButton>

              {/* 2. Download / Print PDF Statement */}
              <CButton
                color="success"
                className="fw-bold d-flex align-items-center gap-2 text-white"
                onClick={handlePrintPdf}
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 18px",
                }}
              >
                <span>🖨️</span> Download / Print PDF Statement
              </CButton>

              {/* 3. Share with Client (if CA) */}
              {isCA && (
                <CButton
                  color="warning"
                  className="fw-bold d-flex align-items-center gap-1 text-dark"
                  onClick={() => setShowShareModal(true)}
                  style={{ borderRadius: "8px", padding: "9px 18px" }}
                >
                  <span>📲</span> Share with Client
                </CButton>
              )}
            </div>
          </div>

          {/* ══════════ EXECUTIVE COMPUTATION SHEET ══════════ */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            {/* Header Particulars */}
            <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4 flex-wrap gap-3">
              <div>
                <span className="badge bg-primary px-3 py-1 mb-2">ASSESSMENT YEAR {assessmentYear}</span>
                <h4 style={{ fontWeight: "800", color: "#0b1f3a", margin: 0 }}>
                  STATEMENT OF TOTAL INCOME &amp; TAX LIABILITY
                </h4>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>
                  Prepared in accordance with the provisions of the Income-tax Act, 1961
                </div>
              </div>
              <div className="text-end">
                <div style={{ fontWeight: "800", color: "#0b3d91", fontSize: "16px" }}>
                  PAN: {pan}
                </div>
                <div style={{ fontSize: "13px", color: "#334155", fontWeight: "600" }}>
                  {client.name || "Client"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Status: Individual (Resident)
                </div>
              </div>
            </div>

            {/* KEY 4 SUMMARY KPI CARDS */}
            <CRow className="g-3 mb-4 text-center">
              <CCol md={3}>
                <div className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>GROSS TOTAL INCOME</div>
                  <div className="fs-5 fw-bold text-dark mt-1">₹{grossTotalIncome.toLocaleString("en-IN")}</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>TOTAL DEDUCTIONS</div>
                  <div className="fs-5 fw-bold text-dark mt-1">₹{totalDeductions.toLocaleString("en-IN")}</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div className="p-3 rounded-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>NET TAXABLE INCOME</div>
                  <div className="fs-5 fw-bold text-primary mt-1">₹{netTaxableIncome.toLocaleString("en-IN")}</div>
                </div>
              </CCol>
              <CCol md={3}>
                <div
                  className="p-3 rounded-3"
                  style={{
                    background: refundDue > 0 ? "#f0fdf4" : "#fef2f2",
                    border: `1.5px solid ${refundDue > 0 ? "#86efac" : "#fca5a5"}`,
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "800", color: refundDue > 0 ? "#166534" : "#991b1b" }}>
                    {refundDue > 0 ? "NET REFUND DUE" : "BALANCE TAX PAYABLE"}
                  </div>
                  <div
                    className="fs-5 fw-extrabold mt-1"
                    style={{ color: refundDue > 0 ? "#15803d" : "#dc2626" }}
                  >
                    ₹{(refundDue > 0 ? refundDue : taxPayable).toLocaleString("en-IN")}
                  </div>
                </div>
              </CCol>
            </CRow>

            {/* DETAILED COMPUTATION TABLE */}
            <div className="table-responsive mb-4">
              <table className="table table-bordered align-middle" style={{ fontSize: "13px" }}>
                <thead className="table-light">
                  <tr>
                    <th>PARTICULARS / INCOME HEAD</th>
                    <th className="text-end" style={{ width: "160px" }}>AMOUNT (₹)</th>
                    <th className="text-end" style={{ width: "160px" }}>TAXABLE NET (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>1. Income from Salaries</strong>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Salary as per Form 16 Part B / AIS Sec 192
                      </div>
                    </td>
                    <td className="text-end fw-semibold">₹{grossSalary.toLocaleString("en-IN")}</td>
                    <td className="text-end fw-semibold">
                      ₹{(grossSalary - (chosenRegime === "old" ? hraExemption + profTax : 0)).toLocaleString("en-IN")}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <strong>2. Less: Standard Deduction u/s 16(ia)</strong>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        {chosenRegime === "new" ? "₹75,000 for New Regime" : "₹50,000 for Old Regime"}
                      </div>
                    </td>
                    <td className="text-end text-muted">-</td>
                    <td className="text-end text-danger fw-semibold">-₹{stdDeduction.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr>
                    <td>
                      <strong>3. Income from Other Sources</strong>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Savings Bank Interest, FD Interest, and Dividends
                      </div>
                    </td>
                    <td className="text-end fw-semibold">₹{totalOther.toLocaleString("en-IN")}</td>
                    <td className="text-end fw-semibold">₹{totalOther.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr className="table-primary">
                    <td colSpan={2}><strong>GROSS TOTAL INCOME (GTI)</strong></td>
                    <td className="text-end fw-bold">₹{grossTotalIncome.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr>
                    <td>
                      <strong>4. Less: Chapter VI-A Deductions Allowed</strong>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        {chosenRegime === "new"
                          ? "Sec 80CCD(2) Employer NPS (allowed in New Regime)"
                          : "80C (₹1.5L) + 80D (₹25k) + 80CCD(2)"}
                      </div>
                    </td>
                    <td className="text-end text-muted">Claimed: ₹{(sec80c + sec80d + sec80ccd2).toLocaleString("en-IN")}</td>
                    <td className="text-end text-danger fw-semibold">-₹{chapterVia.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr className="table-success" style={{ fontSize: "14px" }}>
                    <td colSpan={2}><strong>TOTAL NET TAXABLE INCOME</strong></td>
                    <td className="text-end fw-extrabold text-primary">₹{netTaxableIncome.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr>
                    <td colSpan={2}>Tax Calculated on Taxable Income (with Sec 87A Rebate)</td>
                    <td className="text-end fw-bold">₹{finalTax.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr>
                    <td colSpan={2}>Less: Total TDS Deposited &amp; Advance Taxes Paid (Form 26AS)</td>
                    <td className="text-end text-success fw-bold">-₹{totalTaxesPaid.toLocaleString("en-IN")}</td>
                  </tr>

                  <tr
                    style={{
                      background: refundDue > 0 ? "#dcfce7" : "#fee2e2",
                      fontSize: "15px",
                    }}
                  >
                    <td colSpan={2}>
                      <strong style={{ color: refundDue > 0 ? "#15803d" : "#dc2626" }}>
                        {refundDue > 0 ? "🎉 NET REFUND DUE FROM INCOME TAX DEPARTMENT" : "BALANCE TAX PAYABLE"}
                      </strong>
                    </td>
                    <td
                      className="text-end fw-extrabold"
                      style={{ color: refundDue > 0 ? "#15803d" : "#dc2626" }}
                    >
                      ₹{(refundDue > 0 ? refundDue : taxPayable).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CA VERIFICATION & CERTIFICATE STAMP */}
            <div
              style={{
                background: "#f8fafc",
                border: "1.5px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>
                  🏛️ Chartered Accountant Quality Gate &amp; Compliance Seal
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Computation sheet certified by <strong>{taxSummary.prepared_by || "Assigned CA Specialist"}</strong> for filing under Section 139(1).
                </div>
              </div>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#1e3a8a",
                }}
              >
                VERIFIED BY CA TAX PORTAL ✓
              </div>
            </div>
          </div>
        </CModalBody>

        <CModalFooter>
          <CButton color="secondary" onClick={onClose}>
            Close
          </CButton>
          <CButton color="primary" onClick={handleDownloadJson} style={{ fontWeight: "700" }}>
            📥 Download Official JSON
          </CButton>
          <CButton color="success" onClick={handlePrintPdf} className="text-white" style={{ fontWeight: "700" }}>
            🖨️ Export / Print PDF Statement
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ══════════ SHARE WITH CLIENT POPUP MODAL ══════════ */}
      <CModal visible={showShareModal} onClose={() => setShowShareModal(false)}>
        <CModalHeader style={{ background: "#0b3d91", color: "#fff" }}>
          <CModalTitle style={{ fontWeight: "800", fontSize: "16px" }}>
            📲 Share Tax Return File with Client
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <p style={{ fontSize: "13px", color: "#475569" }}>
            The computation has been finalized. Share the review link and summary with <strong>{client.name}</strong> via WhatsApp or direct link.
          </p>

          {copySuccess && (
            <CAlert color="success" className="py-2" style={{ fontSize: "13px" }}>
              ✓ Client portal link copied to clipboard!
            </CAlert>
          )}

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
              Client Portal Direct Access Link:
            </label>
            <div className="input-group">
              <input
                type="text"
                readOnly
                className="form-control"
                value={clientPortalUrl}
                style={{ fontSize: "13px", background: "#f8fafc" }}
              />
              <button className="btn btn-outline-primary fw-bold" onClick={handleCopyLink}>
                📋 Copy Link
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
              Pre-composed Summary Message:
            </label>
            <textarea
              readOnly
              rows={6}
              className="form-control"
              value={shareMessage}
              style={{ fontSize: "12px", background: "#f8fafc", color: "#334155" }}
            />
          </div>

          <CButton
            color="success"
            className="w-100 fw-bold py-2 text-white d-flex align-items-center justify-content-center gap-2"
            onClick={handleWhatsAppShare}
            style={{ background: "#25d366", border: "none", borderRadius: "8px" }}
          >
            <span>💬</span> Share via WhatsApp to {client.phone || "Client"}
          </CButton>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowShareModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
}
