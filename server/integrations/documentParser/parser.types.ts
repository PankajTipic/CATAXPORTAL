export interface Form16ParsedData {
  pan: string;
  assessmentYear: string;
  financialYear: string;
  employerName: string;
  employerTan: string;
  employerAddress?: string;
  grossSalary: number;
  allowancesExempt: number; // e.g. HRA, LTA u/s 10
  perquisites: number;
  standardDeduction: number;
  professionalTax: number;
  netSalary: number;
  chapter6aDeductions: {
    section80C?: number;
    section80CCC?: number;
    section80CCD1?: number;
    section80CCD1B?: number;
    section80CCD2?: number; // Employer NPS
    section80D?: number;
    section80E?: number;
    section80G?: number;
    section80TTA?: number;
    total: number;
  };
  totalTaxableIncome: number;
  tdsDeducted: number;
  regimeOptedWithEmployer: 'NEW' | 'OLD';
}

export interface DocumentParserAdapter {
  parseForm16(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<Form16ParsedData>;
  parseForm26as(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<any>;
}
