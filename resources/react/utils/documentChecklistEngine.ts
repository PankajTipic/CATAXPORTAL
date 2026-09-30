/**
 * Dynamic Document Checklist Engine
 * Generates personalized checklist of required documents based on return data and claimed deductions.
 */

export interface DocumentRequirementItem {
  id: string;
  category: 'IDENTITY' | 'SALARY' | 'PROPERTY' | 'CAPITAL_GAINS' | 'FOREIGN' | 'DEDUCTION';
  title: string;
  description: string;
  mandatory: boolean;
  acceptedFormats: string[]; // e.g. ['PDF', 'JPG', 'PNG']
  status: 'REQUIRED' | 'UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  uploadedFile?: {
    name: string;
    size: number;
    url?: string;
    uploadedAt: string;
    version: number;
  };
}

export function generateDynamicChecklist(returnData: any, deductionsData: any, itrType: string = 'ITR-1'): DocumentRequirementItem[] {
  const checklist: DocumentRequirementItem[] = [];

  // 1. Core Identity & Tax Credit Baseline
  checklist.push({
    id: 'DOC_AIS_26AS',
    category: 'IDENTITY',
    title: 'AIS & Form 26AS Statement',
    description: 'Annual Information Statement & Tax Credit Statement from Income Tax Department',
    mandatory: true,
    acceptedFormats: ['PDF', 'JSON'],
    status: 'UPLOADED', // Auto-synced via portal
  });

  // 2. Salary Income
  if ((returnData?.salary || returnData?.salaryIncome?.grossSalary || 0) > 0) {
    checklist.push({
      id: 'DOC_FORM16',
      category: 'SALARY',
      title: 'Form 16 (Part A & Part B)',
      description: 'Certificate issued by employer with salary breakup and TDS deductions',
      mandatory: true,
      acceptedFormats: ['PDF'],
      status: 'REQUIRED',
    });
  }

  // 3. Home Loan / Property
  const hpClaim = returnData?.houseProperty || returnData?.housePropertyIncome?.netIncomeOrLoss || 0;
  if (hpClaim !== 0 || (returnData?.housePropertyIncome?.properties?.length || 0) > 0) {
    checklist.push({
      id: 'DOC_HOME_LOAN_CERT',
      category: 'PROPERTY',
      title: 'Home Loan Interest Certificate',
      description: 'Certificate from bank/lender showing principal and interest paid during FY 2025-26',
      mandatory: true,
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      status: 'REQUIRED',
    });
  }

  // 4. Capital Gains (ITR-2)
  const hasCg = (returnData?.stcg || 0) > 0 || (returnData?.ltcg || 0) > 0 || itrType === 'ITR-2';
  if (hasCg) {
    checklist.push({
      id: 'DOC_CG_STATEMENT',
      category: 'CAPITAL_GAINS',
      title: 'Broker Capital Gains / P&L Statement',
      description: 'Consolidated capital gains statement from Zerodha, Groww, Upstox, or CAMS/KFintech',
      mandatory: true,
      acceptedFormats: ['PDF', 'XLSX', 'CSV'],
      status: 'REQUIRED',
    });
  }

  // 5. Chapter VI-A Deductions
  const d = deductionsData || {};
  if ((d.sec80c || 0) > 0) {
    checklist.push({
      id: 'DOC_80C_PROOFS',
      category: 'DEDUCTION',
      title: 'Section 80C Investment Receipts',
      description: 'PPF, ELSS, LIC, Sukanya Samriddhi, or school tuition fees payment receipts',
      mandatory: true,
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      status: 'REQUIRED',
    });
  }

  if ((d.sec80d || 0) > 0) {
    checklist.push({
      id: 'DOC_80D_PREMIUM',
      category: 'DEDUCTION',
      title: 'Mediclaim / Health Insurance Policy',
      description: 'Premium payment certificate issued by health insurance provider (u/s 80D)',
      mandatory: true,
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      status: 'REQUIRED',
    });
  }

  if ((d.sec80ccd1b || 0) > 0) {
    checklist.push({
      id: 'DOC_NPS_RECEIPT',
      category: 'DEDUCTION',
      title: 'NPS Tier-1 Contribution Statement',
      description: 'National Pension Scheme contribution receipt / PRAN transaction statement',
      mandatory: true,
      acceptedFormats: ['PDF'],
      status: 'REQUIRED',
    });
  }

  if ((d.sec80e || 0) > 0) {
    checklist.push({
      id: 'DOC_80E_INTEREST',
      category: 'DEDUCTION',
      title: 'Education Loan Interest Certificate',
      description: 'Annual interest certificate from scheduled bank for higher education loan',
      mandatory: true,
      acceptedFormats: ['PDF'],
      status: 'REQUIRED',
    });
  }

  if ((d.sec80g || 0) > 0) {
    checklist.push({
      id: 'DOC_80G_RECEIPT',
      category: 'DEDUCTION',
      title: '80G Donation Receipt with 10BE',
      description: 'Official donation receipt showing NGO PAN, donor PAN, and Form 10BE certificate',
      mandatory: true,
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      status: 'REQUIRED',
    });
  }

  return checklist;
}
