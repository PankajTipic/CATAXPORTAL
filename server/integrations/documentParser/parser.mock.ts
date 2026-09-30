import { DocumentParserAdapter, Form16ParsedData } from './parser.types';

export class DocumentParserMockAdapter implements DocumentParserAdapter {
  async parseForm16(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<Form16ParsedData> {
    // Return realistic Form 16 extraction
    return {
      pan: 'ABCDE1234F',
      assessmentYear: '2026-27',
      financialYear: '2025-26',
      employerName: 'TechCorp Solutions India Pvt Ltd',
      employerTan: 'BLRT12345A',
      employerAddress: 'Block 4, Manyata Embassy Tech Park, Outer Ring Rd, Bengaluru, Karnataka 560045',
      grossSalary: 1450000,
      allowancesExempt: 120000, // HRA
      perquisites: 24000,
      standardDeduction: 75000, // AY 2026-27 standard deduction under new regime / 50k under old
      professionalTax: 2400,
      netSalary: 1276600,
      chapter6aDeductions: {
        section80C: 150000,
        section80CCD1B: 50000,
        section80CCD2: 70000,
        section80D: 25000,
        total: 295000,
      },
      totalTaxableIncome: 981600,
      tdsDeducted: 124500,
      regimeOptedWithEmployer: 'NEW',
    };
  }

  async parseForm26as(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<any> {
    return {
      pan: 'ABCDE1234F',
      assessmentYear: '2026-27',
      totalTds: 146280,
      entriesCount: 5,
    };
  }
}
