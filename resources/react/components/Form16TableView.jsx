import React from "react";
import {
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CBadge,
} from "@coreui/react";

function fmt(val) {
  if (val === null || val === undefined || val === "") return "₹0";
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num < 0) return `− ₹${Math.abs(num).toLocaleString("en-IN")}`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export default function Form16TableView({ data = {}, showFullAnnexure = true }) {
  const d = data || {};

  // Part A Quarters data (fallback to realistic 4 quarters if empty)
  const quarters = (d.quarters && d.quarters.length > 0) ? d.quarters : [
    {
      quarter: "Q1 (Apr-Jun 2025)",
      receiptNo: "QTRDMY1001",
      amountPaid: Math.round((d.grossSalary || 1200000) * 0.25),
      taxDeducted: Math.round((d.totalTdsDeducted || 100000) * 0.25),
      taxDeposited: Math.round((d.totalTdsDeducted || 100000) * 0.25),
    },
    {
      quarter: "Q2 (Jul-Sep 2025)",
      receiptNo: "QTRDMY1002",
      amountPaid: Math.round((d.grossSalary || 1200000) * 0.25),
      taxDeducted: Math.round((d.totalTdsDeducted || 100000) * 0.25),
      taxDeposited: Math.round((d.totalTdsDeducted || 100000) * 0.25),
    },
    {
      quarter: "Q3 (Oct-Dec 2025)",
      receiptNo: "QTRDMY1003",
      amountPaid: Math.round((d.grossSalary || 1200000) * 0.25),
      taxDeducted: Math.round((d.totalTdsDeducted || 100000) * 0.25),
      taxDeposited: Math.round((d.totalTdsDeducted || 100000) * 0.25),
    },
    {
      quarter: "Q4 (Jan-Mar 2026)",
      receiptNo: "QTRDMY1004",
      amountPaid: Math.round((d.grossSalary || 1200000) * 0.25),
      taxDeducted: Math.round((d.totalTdsDeducted || 100000) * 0.25),
      taxDeposited: Math.round((d.totalTdsDeducted || 100000) * 0.25),
    },
  ];

  const totalPaid = quarters.reduce((s, q) => s + (Number(q.amountPaid) || 0), 0);
  const totalDeducted = quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0);
  const totalDeposited = quarters.reduce((s, q) => s + (Number(q.taxDeposited) || 0), 0);

  const grossSalaryVal = d.grossSalary || totalPaid || 0;
  const sec17_1 = d.salary17_1 ?? grossSalaryVal;
  const sec17_2 = d.perquisites17_2 ?? 0;
  const sec17_3 = d.profits17_3 ?? 0;

  const hra = d.hraExemption || 0;
  const lta = d.ltaExemption || 0;
  const totalSec10 = d.totalSec10 ?? (hra + lta);

  const stdDed = d.standardDeduction ?? (grossSalaryVal ? 50000 : 0);
  const entAll = d.entertainmentAllowance ?? 0;
  const profTax = d.professionalTax ?? 2500;
  const totalSec16 = d.totalSec16 ?? (stdDed + entAll + profTax);

  const hasHp = d.hp1SelfOccupied !== undefined && d.hp1SelfOccupied !== null;
  const hp1 = d.hp1SelfOccupied || 0;
  const hp2 = d.hp2LetOut || 0;
  const netHp = d.netHouseProperty !== undefined && d.netHouseProperty !== null ? d.netHouseProperty : (hp1 + hp2);

  const sec80c = d.sec80c || 0;
  const sec80d = d.sec80d || 0;
  const sec80ccd1b = d.sec80ccd1b || 0;
  const sec80tta = d.sec80tta || 0;
  const totalVia = d.totalChapterVIA ?? (sec80c + sec80d + sec80ccd1b + sec80tta);

  const salaryIncome = Math.max(0, grossSalaryVal - totalSec10 - totalSec16);
  const grossTotalIncome = d.grossTotalIncome ?? (salaryIncome + (hasHp ? netHp : 0));
  const taxableIncome = d.totalTaxableIncome ?? Math.max(0, grossTotalIncome - totalVia);
  const taxOnIncome = d.taxOnTotalIncome ?? Math.round(taxableIncome * 0.15);
  const cess = d.cess ?? Math.round(taxOnIncome * 0.04);
  const totalTaxPayable = d.totalTaxPayable ?? (taxOnIncome + cess);
  const netTaxPayable = d.netTaxPayable ?? totalTaxPayable;
  const totalTds = d.totalTdsDeducted ?? totalDeducted;

  const refundOrPayableDiff = totalTds - netTaxPayable;
  const isRefundable = d.taxPayableRefundable
    ? d.taxPayableRefundable.status === "Refundable"
    : refundOrPayableDiff >= 0;
  const payableRefundAmount = d.taxPayableRefundable
    ? d.taxPayableRefundable.amount
    : Math.abs(refundOrPayableDiff);

  return (
    <div style={{ background: "#ffffff", borderRadius: "12px", border: "1.5px solid #cbd5e1", overflow: "hidden", marginTop: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      {/* ── Official Document Banner ── */}
      <div style={{ background: "#0b3d91", color: "#ffffff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "0.5px" }}>FORM NO. 16</div>
          <div style={{ fontSize: "11px", opacity: 0.9 }}>[See rule 31(1)(a)] • Certificate under section 203 of the Income-tax Act, 1961</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {d.applicableItr && (
            <CBadge color="warning" style={{ fontSize: "11.5px", padding: "4px 10px", color: "#0f172a", fontWeight: "800" }}>
              {d.applicableItr.split("—")[0].trim()}
            </CBadge>
          )}
          <CBadge color="light" style={{ fontSize: "11px", padding: "4px 10px", color: "#0b3d91", fontWeight: "800" }}>
            AY: {d.assessmentYear || "2026-27"}
          </CBadge>
        </div>
      </div>

      {/* ── PART A: CERTIFICATE & PARTIES IDENTIFICATION ── */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0b3d91", paddingBottom: "6px", marginBottom: "14px" }}>
          <span style={{ fontWeight: "800", fontSize: "14px", color: "#0b3d91" }}>
            PART A — TDS Certificate &amp; Quarterly Summary
          </span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Cert No: <strong>{d.certificateNo || "DUMMY/2025-26/00123"}</strong> &nbsp;|&nbsp; Date: <strong>{d.lastUpdatedOn || "31-May-2026"}</strong>
          </span>
        </div>

        {/* Employer & Employee 2-Column Table */}
        <div className="table-responsive mb-3">
          <CTable bordered style={{ fontSize: "12.5px", background: "#fff", marginBottom: 0 }}>
            <CTableHead style={{ background: "#f8fafc" }}>
              <CTableRow>
                <CTableHeaderCell style={{ width: "50%", color: "#0f172a" }}>Name &amp; Address of the Employer (Deductor)</CTableHeaderCell>
                <CTableHeaderCell style={{ width: "50%", color: "#0f172a" }}>Name &amp; Address of the Employee</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <CTableRow>
                <CTableDataCell style={{ verticalAlign: "top" }}>
                  <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>
                    {d.employerName || "Zenith Test Technologies Pvt. Ltd."}
                  </div>
                  <div style={{ color: "#475569", fontSize: "11.5px", marginTop: "3px" }}>
                    7th Floor, Skyline Business Park, Kharadi, Pune – 411014
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "11.5px" }}>
                    PAN: <code>{d.employerPan || "AABCZ5678F"}</code> &nbsp;|&nbsp; TAN: <code>{d.employerTan || "PNEZ98765C"}</code>
                  </div>
                </CTableDataCell>
                <CTableDataCell style={{ verticalAlign: "top" }}>
                  <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a" }}>
                    {d.employeeName || "Ananya Test Mehta"}
                  </div>
                  <div style={{ color: "#475569", fontSize: "11.5px", marginTop: "3px" }}>
                    Lakeview Enclave, Pune – 411001, Maharashtra, India
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "11.5px" }}>
                    PAN: <code>{d.employeePan || "CXXPM2222Q"}</code> &nbsp;|&nbsp; Emp Ref: <code>{d.employeeRefNo || "EMP-00789"}</code>
                  </div>
                </CTableDataCell>
              </CTableRow>
              <CTableRow style={{ background: "#f8fafc" }}>
                <CTableDataCell colSpan={2} style={{ fontSize: "11.5px", color: "#475569" }}>
                  <strong>CIT (TDS):</strong> {d.citTds || "The Commissioner of Income Tax (TDS), Aayakar Bhavan, Pune"} &nbsp;|&nbsp;
                  <strong>Period:</strong> {d.periodFrom || "01-Apr-2025"} to {d.periodTo || "31-Mar-2026"} &nbsp;|&nbsp;
                  <strong>Assessment Year:</strong> {d.assessmentYear || "2026-27"}
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        </div>

        {/* Quarterly TDS Summary Table */}
        <div style={{ marginTop: "14px", marginBottom: "6px", fontWeight: "700", fontSize: "12.5px", color: "#1e293b" }}>
          Summary of amount paid/credited and tax deducted at source thereon in respect of the employee (Quarterly):
        </div>
        <div className="table-responsive mb-4">
          <CTable bordered hover style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
            <CTableHead style={{ background: "#f1f5f9" }}>
              <CTableRow>
                <CTableHeaderCell style={{ width: "20%" }}>Quarter</CTableHeaderCell>
                <CTableHeaderCell style={{ width: "26%" }}>Receipt Numbers of original statements of TDS</CTableHeaderCell>
                <CTableHeaderCell style={{ width: "18%", textAlign: "right" }}>Amount paid/credited (₹)</CTableHeaderCell>
                <CTableHeaderCell style={{ width: "18%", textAlign: "right" }}>Amount of tax deducted (₹)</CTableHeaderCell>
                <CTableHeaderCell style={{ width: "18%", textAlign: "right" }}>Amount of tax deposited (₹)</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {quarters.map((q, idx) => (
                <CTableRow key={idx}>
                  <CTableDataCell className="fw-semibold">{q.quarter}</CTableDataCell>
                  <CTableDataCell><code>{q.receiptNo || "—"}</code></CTableDataCell>
                  <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(q.amountPaid)}</CTableDataCell>
                  <CTableDataCell style={{ textAlign: "right", fontWeight: "600", color: "#16a34a" }}>{fmt(q.taxDeducted)}</CTableDataCell>
                  <CTableDataCell style={{ textAlign: "right", fontWeight: "600", color: "#0b3d91" }}>{fmt(q.taxDeposited)}</CTableDataCell>
                </CTableRow>
              ))}
              <CTableRow style={{ background: "#e2e8f0", fontWeight: "800" }}>
                <CTableDataCell colSpan={2}>Total (Part A Verified)</CTableDataCell>
                <CTableDataCell style={{ textAlign: "right" }}>{fmt(totalPaid)}</CTableDataCell>
                <CTableDataCell style={{ textAlign: "right", color: "#16a34a" }}>{fmt(totalDeducted)}</CTableDataCell>
                <CTableDataCell style={{ textAlign: "right", color: "#0b3d91" }}>{fmt(totalDeposited)}</CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        </div>

        {/* ── PART B (ANNEXURE): DETAILS OF SALARY PAID & TAX DEDUCTED ── */}
        {showFullAnnexure && (
          <div style={{ marginTop: "24px" }}>
            <div style={{ borderBottom: "2px solid #0b3d91", paddingBottom: "6px", marginBottom: "16px" }}>
              <span style={{ fontWeight: "800", fontSize: "14px", color: "#0b3d91" }}>
                PART B (Annexure) — Details of Salary Paid and any other income and tax deducted
              </span>
            </div>

            {/* 1. Gross Salary */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                1. Gross Salary
              </div>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: "70%" }}>Particulars</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell>(a) Salary as per provisions contained in sec 17(1)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec17_1)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>(b) Value of perquisites under section 17(2)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec17_2)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>(c) Profits in lieu of salary under section 17(3)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec17_3)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: "#f1f5f9", fontWeight: "800" }}>
                      <CTableDataCell>(d) Total Gross Salary</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", color: "#0b3d91", fontSize: "13px" }}>{fmt(grossSalaryVal)}</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </div>

            {/* 2. Allowances Exempt under section 10 */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                2. Allowances Exempt under section 10
              </div>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: "70%" }}>Particulars</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell>House Rent Allowance (Sec 10(13A))</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(hra)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Leave Travel Allowance (Sec 10(5))</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(lta)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: "#f1f5f9", fontWeight: "800" }}>
                      <CTableDataCell>Total Exemptions under Section 10</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", color: "#15803d" }}>{fmt(totalSec10)}</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </div>

            {/* 3. Deductions under section 16 */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                3. Deductions under section 16
              </div>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: "70%" }}>Particulars</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell>Standard Deduction (Sec 16(ia))</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(stdDed)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Entertainment Allowance (Sec 16(ii))</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(entAll)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Tax on Employment (Professional Tax) (Sec 16(iii))</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(profTax)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: "#f1f5f9", fontWeight: "800" }}>
                      <CTableDataCell>Total Deductions under Section 16</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", color: "#0284c7" }}>{fmt(totalSec16)}</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </div>

            {/* 4. House Property (if applicable) */}
            {hasHp && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                  4. Income from House Property (reported by employee for TDS estimation)
                </div>
                <div className="table-responsive">
                  <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                    <CTableHead style={{ background: "#f8fafc" }}>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: "70%" }}>Income from House Property</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>House Property 1 — Self-occupied (Interest on Home Loan u/s 24)</CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right", fontWeight: "600", color: hp1 < 0 ? "#dc2626" : "#0f172a" }}>
                          {fmt(hp1)}
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>House Property 2 — Let-out (Net rental income after deductions)</CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(hp2)}</CTableDataCell>
                      </CTableRow>
                      <CTableRow style={{ background: "#f1f5f9", fontWeight: "800" }}>
                        <CTableDataCell>Net Income/(Loss) from House Property</CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right", color: netHp < 0 ? "#dc2626" : "#16a34a" }}>
                          {fmt(netHp)}
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            )}

            {/* 5. Deductions under Chapter VI-A */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                5. Deductions under Chapter VI-A
              </div>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: "20%" }}>Section</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "50%" }}>Particulars</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">80C</CTableDataCell>
                      <CTableDataCell>PPF, LIC Premium, ELSS Mutual Funds, Tuition Fees</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec80c)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">80D</CTableDataCell>
                      <CTableDataCell>Medical Insurance Premium (Self &amp; Family &amp; Parents)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec80d)}</CTableDataCell>
                    </CTableRow>
                    {sec80ccd1b > 0 && (
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">80CCD(1B)</CTableDataCell>
                        <CTableDataCell>Additional NPS Contribution</CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec80ccd1b)}</CTableDataCell>
                      </CTableRow>
                    )}
                    {sec80tta > 0 && (
                      <CTableRow>
                        <CTableDataCell className="fw-semibold">80TTA</CTableDataCell>
                        <CTableDataCell>Interest on Savings Bank Account</CTableDataCell>
                        <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sec80tta)}</CTableDataCell>
                      </CTableRow>
                    )}
                    <CTableRow style={{ background: "#f1f5f9", fontWeight: "800" }}>
                      <CTableDataCell colSpan={2}>Total Deduction under Chapter VI-A</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", color: "#16a34a", fontSize: "13px" }}>{fmt(totalVia)}</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </div>

            {/* 6. Computation of Tax Payable */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontWeight: "800", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                6. Computation of Tax Payable
              </div>
              <div className="table-responsive">
                <CTable bordered style={{ fontSize: "12px", background: "#fff", marginBottom: 0 }}>
                  <CTableHead style={{ background: "#f8fafc" }}>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: "70%" }}>Particulars</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: "30%", textAlign: "right" }}>Amount (₹)</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableDataCell>Gross Total Income (Salary + Other Sources)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(grossTotalIncome)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Total Taxable Income (after Chapter VI-A deductions)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "700", color: "#0f172a" }}>{fmt(taxableIncome)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Tax on Total Income (incl. surcharge)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(taxOnIncome)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Health &amp; Education Cess @ 4%</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(cess)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell className="fw-semibold">Total Tax Payable</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "700" }}>{fmt(totalTaxPayable)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell>Less: Relief under section 89</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "600" }}>{fmt(d.relief89 || 0)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: "#f8fafc" }}>
                      <CTableDataCell className="fw-bold">Net Tax Payable</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "800", color: "#0f172a" }}>{fmt(netTaxPayable)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: "#f0fdf4" }}>
                      <CTableDataCell className="fw-bold" style={{ color: "#166534" }}>Total Tax Deducted at Source (as per Part A)</CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", fontWeight: "800", color: "#16a34a" }}>{fmt(totalTds)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow style={{ background: isRefundable ? "#dcfce7" : "#fef2f2", fontWeight: "900" }}>
                      <CTableDataCell style={{ color: isRefundable ? "#15803d" : "#991b1b", fontSize: "13px" }}>
                        Tax {isRefundable ? "Refundable" : "Payable"}
                      </CTableDataCell>
                      <CTableDataCell style={{ textAlign: "right", color: isRefundable ? "#15803d" : "#991b1b", fontSize: "14px" }}>
                        {fmt(payableRefundAmount)} ({isRefundable ? "Refundable" : "Payable"})
                      </CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </div>
          </div>
        )}

        {/* Signatory Footer */}
        <div style={{ marginTop: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11.5px", color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div>
            Certified by: <strong>{d.signatoryName || "Rohit Test Desai / HR & Payroll Manager"}</strong>
            <span style={{ color: "#94a3b8", marginLeft: "6px" }}>({d.signatoryDesignation || "Designation: HR & Payroll Manager"})</span>
          </div>
          <div>
            Place: <strong>Pune</strong> &nbsp;|&nbsp; Date: <strong>{d.lastUpdatedOn || "31-May-2026"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
