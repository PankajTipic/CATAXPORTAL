/**
 * TypeScript Interfaces for FastKYC Integration
 * Covers PAN Verification, Portal Registration Check, Portal Session Login,
 * AIS (Annual Information Statement), and Form 26AS data.
 */

export interface PanVerificationResult {
  valid: boolean;
  pan: string;
  name: string;
  dobMasked?: string;
  aadhaarLinked?: boolean;
  status: 'VALID' | 'INVALID' | 'SUSPENDED';
  category?: 'Individual' | 'HUF' | 'Company';
}

export interface RegistrationStatusResult {
  pan: string;
  registeredOnPortal: boolean;
  message?: string;
}

export interface PortalSessionResult {
  sessionToken: string;
  expiresAt: string;
  pan: string;
  userName?: string;
}

export interface AisSalaryItem {
  employer: string;
  tan: string;
  grossSalary: number;
  tdsDeducted: number;
  source: 'AIS';
}

export interface AisInterestItem {
  accountOrRef: string;
  bankName: string;
  type: 'SAVINGS' | 'FIXED_DEPOSIT' | 'RECURRING_DEPOSIT';
  amount: number;
  tdsDeducted?: number;
  source: 'AIS';
}

export interface AisDividendItem {
  companyName: string;
  isin?: string;
  amount: number;
  tdsDeducted?: number;
  source: 'AIS';
}

export interface AisSecuritiesItem {
  assetType: 'EQUITY_SHARE' | 'MUTUAL_FUND_UNIT' | 'BONDS';
  isinOrSymbol: string;
  companyOrFundName: string;
  saleDate?: string;
  saleValue: number;
  costValue?: number;
  estimatedGain?: number;
  source: 'AIS';
}

export interface AisRentItem {
  tenantNameOrPan?: string;
  propertyAddress?: string;
  rentReceived: number;
  tdsDeducted?: number;
  source: 'AIS';
}

export interface AisPropertyItem {
  propertyType: 'LAND' | 'BUILDING' | 'FLAT';
  transactionType: 'PURCHASE' | 'SALE';
  registrationValue: number;
  considerationValue: number;
  date: string;
  source: 'AIS';
}

export interface AisSftItem {
  transactionType: string;
  reportingEntity: string;
  amount: number;
  source: 'AIS';
}

export interface AisTdsItem {
  deductor: string;
  tan: string;
  section: string;
  amountPaid: number;
  taxDeducted: number;
  source: 'AIS';
}

export interface AisData {
  pan: string;
  financialYear: string; // e.g. "2025-26"
  assessmentYear: string; // e.g. "2026-27"
  generatedAt: string;
  salary: AisSalaryItem[];
  interest: AisInterestItem[];
  dividend: AisDividendItem[];
  securities: AisSecuritiesItem[];
  rent: AisRentItem[];
  property: AisPropertyItem[];
  sft: AisSftItem[];
  tds: AisTdsItem[];
}

export interface Form26AsTdsItem {
  deductorTan: string;
  deductorName: string;
  section: string;
  totalAmountPaid: number;
  taxDeducted: number;
  taxDeposited: number;
  source: '26AS';
}

export interface Form26AsTcsItem {
  collectorTan: string;
  collectorName: string;
  taxCollected: number;
  source: '26AS';
}

export interface Form26AsAdvanceTaxItem {
  bsrCode: string;
  challanDate: string;
  challanNo: string;
  amount: number;
  taxType: 'ADVANCE_TAX' | 'SELF_ASSESSMENT_TAX';
  source: '26AS';
}

export interface Form26AsData {
  pan: string;
  financialYear: string;
  assessmentYear: string;
  generatedAt: string;
  tdsEntries: Form26AsTdsItem[];
  tcsEntries: Form26AsTcsItem[];
  advanceTaxEntries: Form26AsAdvanceTaxItem[];
  totalTds: number;
  totalTcs: number;
  totalAdvanceTax: number;
}

export interface FastKycAdapter {
  verifyPan(pan: string): Promise<PanVerificationResult>;
  checkRegistration(pan: string): Promise<RegistrationStatusResult>;
  loginToPortal(pan: string, password: string): Promise<PortalSessionResult>;
  fetchAis(sessionToken: string, fy: string): Promise<AisData>;
  fetchForm26as(sessionToken: string, fy: string): Promise<Form26AsData>;
}
