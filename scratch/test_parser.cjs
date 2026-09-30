const fs = require('fs');

const sample1 = `
*** DUMMY / SAMPLE DOCUMENT — FOR SOFTWARE TESTING PURPOSES ONLY — NOT A VALID TAX DOCUMENT ***
Applicable ITR: ITR-2 — Resident individual with capital gains (sale of listed equity shares) and two house properties; total income
above Rs. 50 lakh; not eligible for ITR-1/ITR-4.
FORM NO. 16
[See rule 31(1)(a)]
Part A
Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary
Certificate No.: DUMMY/2025-26/00123 Last updated on: 31-May-2026
Name and address of the Employer Name and address of the Employee
Zenith Test Technologies Pvt. Ltd.
7th Floor, Skyline Business Park,
Kharadi, Pune – 411014,
Maharashtra, India
Ananya Test Mehta
Bungalow No. 12, Lakeview Enclave,
Koregaon Park, Pune – 411001,
Maharashtra, India
PAN of the Deductor
AABCZ5678F
PAN of the Employee
CXXPM2222Q
TAN of the Deductor
PNEZ98765C
Employee Reference No.
EMP-00789
CIT (TDS)
The Commissioner of Income Tax (TDS)
Aayakar Bhavan, Pune – 411001
Assessment Year
2026-27
Period
From: 01-Apr-2025
To: 31-Mar-2026
Summary of amount paid/credited and tax deducted at source thereon in respect of the employee
(Quarterly)
Quarter Receipt Numbers of original quarterly statements of TDS Amount paid/credited (Rs.) Amount of tax deducted (Rs.) Amount of tax deposited/ remitted (Rs.)
Q1 (Apr-Jun 2025) QTRDMY1001 16,50,000 3,85,000 3,85,000
Q2 (Jul-Sep 2025) QTRDMY1002 16,50,000 3,85,000 3,85,000
Q3 (Oct-Dec 2025) QTRDMY1003 16,50,000 3,85,000 3,85,000
Q4 (Jan-Mar 2026) QTRDMY1004 16,50,000 3,85,200 3,85,200
Total 66,00,000 15,40,200 15,40,200
I, the undersigned, hereby certify that a sum of Rs. 15,40,200/- (Rupees Fifteen Lakh Forty Thousand Two Hundred only)...
Place: Pune
Date: 31-May-2026
For Zenith Test Technologies Pvt. Ltd.
Name: Rohit Test Desai
Designation: HR & Payroll Manager

*** DUMMY / SAMPLE DOCUMENT — FOR SOFTWARE TESTING PURPOSES ONLY — NOT A VALID TAX DOCUMENT ***
FORM NO. 16 — Part B (Annexure)
Details of Salary Paid and any other income and tax deducted
1. Gross Salary
Particulars Amount (Rs.) Amount (Rs.)
(a) Salary as per provisions contained in sec 17(1) 63,50,000
(b) Value of perquisites under section 17(2) 2,00,000
(c) Profits in lieu of salary under section 17(3) 50,000
(d) Total 66,00,000
2. Allowances Exempt under section 10
Particulars Amount (Rs.)
House Rent Allowance 1,20,000
Leave Travel Allowance 40,000
Total 1,60,000
3. Deductions under section 16
Particulars Amount (Rs.)
Standard Deduction 50,000
Entertainment Allowance 0
Tax on Employment (Professional Tax) 2,500
Total 52,500
4. Income from House Property (reported by employee for TDS estimation)
Income from House Property (as reported by employee) Amount (Rs.)
House Property 1 — Self-occupied (Interest on Home Loan u/s 24) (2,00,000)
House Property 2 — Let-out (Net rental income after deductions) 1,80,000
Net Income/(Loss) from House Property (20,000)
Note: Employee owns two house properties...
5. Deductions under Chapter VI-A
Section Particulars Amount (Rs.)
80C PPF, LIC Premium, ELSS Mutual Funds 1,50,000
80D Medical Insurance Premium (Self &amp; Family &amp; Parents) 50,000
80CCD(1B) Additional NPS Contribution 50,000
80TTA Interest on Savings Bank Account 10,000
Total Deduction under Chapter VI-A 2,60,000
6. Computation of Tax Payable
Particulars Amount (Rs.)
Gross Total Income (Salary + House Property) 63,67,500
Total Taxable Income (after Chapter VI-A deductions) 61,07,500
Tax on Total Income (incl. surcharge) 15,89,325
Health &amp; Education Cess @ 4% 63,573
Total Tax Payable 16,52,898
Less: Relief under section 89 0
Net Tax Payable 16,52,898
Total Tax Deducted at Source (as per Part A) 15,40,200
Tax Payable / (Refundable) — excl. tax on capital gains reported separately in ITR 1,12,698 (Payable)
`;

function extractAmount(text, ...patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const raw = m[1] || m[0];
      const isNegative = /\([\d,]+\)/.test(raw) || /-[\d,]+/.test(raw);
      const parsed = parseInt(raw.replace(/,/g, '').replace(/[^\d]/g, ''), 10);
      if (!isNaN(parsed)) return isNegative ? -parsed : parsed;
    }
  }
  return null;
}

function extractText(text, ...patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const val = (m[1] || m[0]).trim();
      if (val) return val;
    }
  }
  return null;
}

const lastUpdated = extractText(sample1, /Last\s+updated\s+on[:\s]+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i);
const cess = extractAmount(sample1, /(?:Health\s*&(?:amp;)?\s*Education\s+Cess|Cess)[^%\n\r]*?(?:@\s*\d+%)?[^\d\n\r]*([\d,]+)/i);
const hp1 = extractAmount(sample1, /House\s+Property\s+1[^\n\r]*?(?:u\/s\s*\d+\)?)?[^\d\(\n\r]*(\(?[\d,]+\)?)/i);
console.log('lastUpdated:', lastUpdated);
console.log('cess:', cess);
console.log('hp1:', hp1);
