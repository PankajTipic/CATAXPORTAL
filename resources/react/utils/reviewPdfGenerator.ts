/**
 * Return Review Summary PDF Generator
 * Generates an executive-grade Indian Income Tax Return summary document for AY 2026-27.
 */

export interface ReviewSummaryPdfData {
  taxpayerName: string;
  pan: string;
  assessmentYear: string;
  financialYear: string;
  itrForm: string; // 'ITR-1' or 'ITR-2'
  regime: 'new' | 'old';
  applicationId: string;
  generatedDate: string;
  isDraft: boolean;
  bankDetails: {
    bankName: string;
    accountNumberMasked: string;
    ifsc: string;
    accountType: string;
  };
  incomeSummary: {
    salary: { amount: number; source: string };
    houseProperty: { amount: number; source: string };
    otherSources: { amount: number; source: string };
    capitalGains: { amount: number; source: string };
    grossTotal: number;
  };
  deductions: {
    claimedTotal: number;
    allowedTotal: number;
    breakdown: Array<{ section: string; claimed: number; allowed: number }>;
  };
  regimeComparison: {
    newTax: number;
    oldTax: number;
    chosenRegime: 'new' | 'old';
    savingsAmount: number;
    recommended: 'new' | 'old';
  };
  computation: {
    taxableIncome: number;
    taxOnSlabs: number;
    specialRateTax: number;
    rebate87a: number;
    surcharge: number;
    cess: number;
    totalTaxLiability: number;
    taxesPaid: number;
    refundOrPayable: number;
  };
  reconciliationNotes?: string[];
}

export function generateReviewPdfHtml(data: ReviewSummaryPdfData): string {
  const fmt = (n: number) => '₹' + Math.round(Math.abs(n || 0)).toLocaleString('en-IN');
  const maskedPan = data.pan.length === 10
    ? data.pan.slice(0, 5) + '****' + data.pan.slice(9)
    : data.pan;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ITR Review Summary - ${data.pan} - AY ${data.assessmentYear}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
      background: #ffffff;
    }
    .watermark {
      position: fixed;
      top: 40%;
      left: 20%;
      font-size: 80px;
      color: rgba(239, 68, 68, 0.08);
      transform: rotate(-35deg);
      font-weight: 900;
      pointer-events: none;
      z-index: 1000;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 18px;
    }
    .table th, .table td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      text-align: left;
    }
    .table th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    .text-right { text-align: right; }
    .highlight-box {
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .highlight-refund { background: #f0fdf4; border: 1.5px solid #86efac; color: #166534; }
    .highlight-payable { background: #fef2f2; border: 1.5px solid #fca5a5; color: #991b1b; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      border-left: 3px solid #0284c7;
      padding-left: 8px;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    .disclaimer {
      margin-top: 30px;
      padding: 12px;
      background: #f1f5f9;
      border-left: 3px solid #64748b;
      font-size: 11px;
      color: #475569;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${data.isDraft ? '<div class="watermark">DRAFT SUMMARY</div>' : ''}

  <div class="header">
    <div>
      <h1 style="margin: 0 0 4px 0; font-size: 20px; color: #0f172a;">Income Tax Return Review Summary</h1>
      <div style="color: #64748b; font-size: 12px;">Assessment Year: <strong>${data.assessmentYear}</strong> | Financial Year: <strong>${data.financialYear}</strong></div>
      <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Application Reference: <strong>${data.applicationId}</strong></div>
    </div>
    <div style="text-align: right;">
      <span class="badge badge-blue">${data.itrForm}</span>
      <span class="badge badge-green" style="margin-left: 4px;">${data.regime.toUpperCase()} REGIME</span>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Generated on: ${data.generatedDate}</div>
    </div>
  </div>

  <!-- 1. Personal & Bank Details -->
  <div class="section-title">1. Taxpayer & Refund Account Profile</div>
  <table class="table">
    <tr>
      <td style="width: 25%; font-weight: 600;">Taxpayer Name:</td>
      <td style="width: 25%;">${data.taxpayerName}</td>
      <td style="width: 25%; font-weight: 600;">Masked PAN:</td>
      <td style="width: 25%; font-family: monospace; font-weight: 600;">${maskedPan}</td>
    </tr>
    <tr>
      <td style="font-weight: 600;">Nominated Bank:</td>
      <td>${data.bankDetails.bankName}</td>
      <td style="font-weight: 600;">Account (IFSC):</td>
      <td>${data.bankDetails.accountNumberMasked} (${data.bankDetails.ifsc})</td>
    </tr>
  </table>

  <!-- 2. Gross Total Income by Head -->
  <div class="section-title">2. Income Summary by Head</div>
  <table class="table">
    <thead>
      <tr>
        <th>Head of Income</th>
        <th>Source of Verification</th>
        <th class="text-right">Computed Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Salaries / Pension (Net of Std Deduction)</td>
        <td><span class="badge badge-blue">${data.incomeSummary.salary.source}</span></td>
        <td class="text-right">${fmt(data.incomeSummary.salary.amount)}</td>
      </tr>
      <tr>
        <td>Income / Loss from House Property</td>
        <td><span class="badge badge-blue">${data.incomeSummary.houseProperty.source}</span></td>
        <td class="text-right">${fmt(data.incomeSummary.houseProperty.amount)}</td>
      </tr>
      <tr>
        <td>Income from Other Sources (Interest & Dividend)</td>
        <td><span class="badge badge-blue">${data.incomeSummary.otherSources.source}</span></td>
        <td class="text-right">${fmt(data.incomeSummary.otherSources.amount)}</td>
      </tr>
      ${data.incomeSummary.capitalGains.amount > 0 ? `
      <tr>
        <td>Capital Gains (ITR-2)</td>
        <td><span class="badge badge-blue">${data.incomeSummary.capitalGains.source}</span></td>
        <td class="text-right">${fmt(data.incomeSummary.capitalGains.amount)}</td>
      </tr>` : ''}
      <tr style="background: #f8fafc; font-weight: 700;">
        <td colspan="2">Gross Total Income</td>
        <td class="text-right">${fmt(data.incomeSummary.grossTotal)}</td>
      </tr>
    </tbody>
  </table>

  <!-- 3. Deductions & Taxable Income -->
  <div class="section-title">3. Deductions & Taxable Income</div>
  <table class="table">
    <thead>
      <tr>
        <th>Chapter VI-A Section</th>
        <th class="text-right">Claimed (₹)</th>
        <th class="text-right">Allowed in ${data.regime.toUpperCase()} Regime (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${data.deductions.breakdown.map(d => `
        <tr>
          <td>${d.section}</td>
          <td class="text-right">${fmt(d.claimed)}</td>
          <td class="text-right">${fmt(d.allowed)}</td>
        </tr>
      `).join('')}
      <tr style="background: #f8fafc; font-weight: 700;">
        <td>Total Deductions Allowed</td>
        <td class="text-right">${fmt(data.deductions.claimedTotal)}</td>
        <td class="text-right">${fmt(data.deductions.allowedTotal)}</td>
      </tr>
      <tr style="background: #e0f2fe; font-weight: 800; font-size: 13.5px;">
        <td colspan="2">NET TOTAL TAXABLE INCOME</td>
        <td class="text-right">${fmt(data.computation.taxableIncome)}</td>
      </tr>
    </tbody>
  </table>

  <!-- 4. Tax Computation Waterfall -->
  <div class="section-title">4. Tax Computation Waterfall</div>
  <table class="table">
    <tr>
      <td>Tax on Normal Slabs</td>
      <td class="text-right">${fmt(data.computation.taxOnSlabs)}</td>
    </tr>
    ${data.computation.specialRateTax > 0 ? `
    <tr>
      <td>Tax on Special Rate Incomes (Capital Gains)</td>
      <td class="text-right">${fmt(data.computation.specialRateTax)}</td>
    </tr>` : ''}
    <tr>
      <td>Less: Rebate u/s 87A</td>
      <td class="text-right" style="color: #15803d;">- ${fmt(data.computation.rebate87a)}</td>
    </tr>
    <tr>
      <td>Add: Health & Education Cess @ 4%</td>
      <td class="text-right">${fmt(data.computation.cess)}</td>
    </tr>
    <tr style="font-weight: 700; background: #f8fafc;">
      <td>Total Tax Liability</td>
      <td class="text-right">${fmt(data.computation.totalTaxLiability)}</td>
    </tr>
    <tr>
      <td>Total Taxes Paid (TDS + TCS + Advance Tax)</td>
      <td class="text-right" style="color: #0369a1;">${fmt(data.computation.taxesPaid)}</td>
    </tr>
  </table>

  <!-- 5. Refund or Payable Highlight Box -->
  <div class="highlight-box ${data.computation.refundOrPayable >= 0 ? 'highlight-refund' : 'highlight-payable'}">
    <div>
      <div style="font-size: 16px; font-weight: 800;">
        ${data.computation.refundOrPayable >= 0 ? '✓ REFUND DUE TO TAXPAYER' : '⚠ SELF-ASSESSMENT TAX PAYABLE'}
      </div>
      <div style="font-size: 12px; margin-top: 2px;">
        ${data.computation.refundOrPayable >= 0
          ? 'Will be credited directly to your nominated verified bank account.'
          : 'Must be paid via Challan ITNS-280 on the government portal before final submission.'}
      </div>
    </div>
    <div style="font-size: 24px; font-weight: 900;">
      ${fmt(data.computation.refundOrPayable)}
    </div>
  </div>

  <!-- 6. Statutory Disclaimer -->
  <div class="disclaimer">
    <strong>Statutory Verification & Disclaimer:</strong><br>
    This document is a return preparation review summary generated by the platform and is not an official ITR-V e-filing acknowledgement.
    All tax rules, slab calculations, deductions eligibility, and refund/payable estimates must be validated against the official Income Tax Department
    utilities and applicable CBDT notifications for Assessment Year 2026-27 prior to official filing.
  </div>
</body>
</html>
  `;
}

export function downloadReviewPdf(data: ReviewSummaryPdfData) {
  const htmlContent = generateReviewPdfHtml(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}
