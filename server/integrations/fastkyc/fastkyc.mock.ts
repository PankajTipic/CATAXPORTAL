import {
  FastKycAdapter,
  PanVerificationResult,
  RegistrationStatusResult,
  PortalSessionResult,
  AisData,
  Form26AsData,
} from './fastkyc.types';

/**
 * Mock implementation of FastKycAdapter for local development and testing.
 * Provides deterministic and rich fake data without reaching external ITD/FastKYC servers.
 */
export class FastKycMockAdapter implements FastKycAdapter {
  private panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;

  async verifyPan(pan: string): Promise<PanVerificationResult> {
    const cleanPan = pan.trim().toUpperCase();

    if (!this.panRegex.test(cleanPan)) {
      return {
        valid: false,
        pan: cleanPan,
        name: '',
        status: 'INVALID',
      };
    }

    // Deterministic fake names based on 5th character (surname initial in PAN)
    const surnameInitial = cleanPan.charAt(4);
    const mockNames: Record<string, string> = {
      S: 'RAJESH SHARMA',
      K: 'ANITA KUMAR',
      G: 'VIKRAM GUPTA',
      P: 'SNEHA PATEL',
      M: 'AMIT MEHTA',
      V: 'PRIYA VERMA',
    };

    const name = mockNames[surnameInitial] || 'ROHIT VERMA';

    return {
      valid: true,
      pan: cleanPan,
      name,
      dobMasked: '15/08/1988',
      aadhaarLinked: true,
      status: 'VALID',
      category: cleanPan.charAt(3) === 'H' ? 'HUF' : 'Individual',
    };
  }

  async checkRegistration(pan: string): Promise<RegistrationStatusResult> {
    const cleanPan = pan.trim().toUpperCase();
    if (!this.panRegex.test(cleanPan)) {
      throw new Error(`Invalid PAN format: ${pan}`);
    }

    // Rule: PANs ending with an even digit = registered, odd = not registered
    const digits = cleanPan.slice(5, 9);
    const lastDigit = parseInt(digits.slice(-1), 10);
    const registeredOnPortal = lastDigit % 2 === 0;

    return {
      pan: cleanPan,
      registeredOnPortal,
      message: registeredOnPortal
        ? 'Taxpayer profile found on Income Tax E-filing portal.'
        : 'PAN is not yet registered on the Income Tax E-filing portal. Registration required.',
    };
  }

  async loginToPortal(pan: string, password: string): Promise<PortalSessionResult> {
    const cleanPan = pan.trim().toUpperCase();

    // Password rule: Test@1234 succeeds, anything else fails
    if (password !== 'Test@1234') {
      const error = new Error('Invalid portal password. Please enter your valid Income Tax Portal password.');
      (error as any).code = 'AUTH_FAILED';
      throw error;
    }

    const verification = await this.verifyPan(cleanPan);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes TTL
    const sessionToken = `MOCK_SESS_${cleanPan}_${Date.now()}`;

    return {
      sessionToken,
      expiresAt,
      pan: cleanPan,
      userName: verification.name,
    };
  }

  async fetchAis(sessionToken: string, fy: string = '2025-26'): Promise<AisData> {
    if (!sessionToken || !sessionToken.startsWith('MOCK_SESS_')) {
      throw new Error('Invalid or expired portal session token.');
    }

    const parts = sessionToken.split('_');
    const pan = parts[2] || 'ABCDE1234F';

    return {
      pan,
      financialYear: fy,
      assessmentYear: '2026-27',
      generatedAt: new Date().toISOString(),
      salary: [
        {
          employer: 'TechCorp Solutions India Pvt Ltd',
          tan: 'BLRT12345A',
          grossSalary: 1450000,
          tdsDeducted: 124500,
          source: 'AIS',
        },
        {
          employer: 'Apex Innovations LLP',
          tan: 'PUNA98765C',
          grossSalary: 280000,
          tdsDeducted: 15400,
          source: 'AIS',
        },
      ],
      interest: [
        {
          accountOrRef: 'HDFC Bank - 501002345678',
          bankName: 'HDFC Bank Ltd',
          type: 'SAVINGS',
          amount: 18450,
          tdsDeducted: 0,
          source: 'AIS',
        },
        {
          accountOrRef: 'State Bank of India - FD 392817263',
          bankName: 'State Bank of India',
          type: 'FIXED_DEPOSIT',
          amount: 42000,
          tdsDeducted: 4200,
          source: 'AIS',
        },
      ],
      dividend: [
        {
          companyName: 'Infosys Limited',
          isin: 'INE009A01021',
          amount: 6800,
          tdsDeducted: 680,
          source: 'AIS',
        },
        {
          companyName: 'Tata Consultancy Services Ltd',
          isin: 'INE467B01029',
          amount: 12500,
          tdsDeducted: 1250,
          source: 'AIS',
        },
      ],
      securities: [
        {
          assetType: 'EQUITY_SHARE',
          isinOrSymbol: 'RELIANCE',
          companyOrFundName: 'Reliance Industries Ltd',
          saleDate: '2025-11-14',
          saleValue: 185000,
          costValue: 142000,
          estimatedGain: 43000, // Short-term capital gain
          source: 'AIS',
        },
        {
          assetType: 'MUTUAL_FUND_UNIT',
          isinOrSymbol: 'INF209K01157',
          companyOrFundName: 'Parag Parikh Flexi Cap Fund',
          saleDate: '2025-12-05',
          saleValue: 240000,
          costValue: 175000,
          estimatedGain: 65000,
          source: 'AIS',
        },
      ],
      rent: [
        {
          tenantNameOrPan: 'AAACP8912K',
          propertyAddress: 'Flat 402, Green Meadows, Bengaluru',
          rentReceived: 180000,
          tdsDeducted: 0,
          source: 'AIS',
        },
      ],
      property: [
        {
          propertyType: 'FLAT',
          transactionType: 'PURCHASE',
          registrationValue: 5500000,
          considerationValue: 5500000,
          date: '2025-06-20',
          source: 'AIS',
        },
      ],
      sft: [
        {
          transactionType: 'Purchase of Mutual Fund units exceeding threshold',
          reportingEntity: 'HDFC Asset Management Company',
          amount: 350000,
          source: 'AIS',
        },
        {
          transactionType: 'Credit card payments exceeding ₹2 Lakhs in cash / ₹10 Lakhs aggregate',
          reportingEntity: 'ICICI Bank Credit Cards Division',
          amount: 410000,
          source: 'AIS',
        },
      ],
      tds: [
        {
          deductor: 'TechCorp Solutions India Pvt Ltd',
          tan: 'BLRT12345A',
          section: '192',
          amountPaid: 1450000,
          taxDeducted: 124500,
          source: 'AIS',
        },
        {
          deductor: 'Apex Innovations LLP',
          tan: 'PUNA98765C',
          section: '192',
          amountPaid: 280000,
          taxDeducted: 15400,
          source: 'AIS',
        },
        {
          deductor: 'State Bank of India',
          tan: 'PUNS00123D',
          section: '194A',
          amountPaid: 42000,
          taxDeducted: 4200,
          source: 'AIS',
        },
        // Intentional mismatch for reconciliation testing: AIS reports 680 on Infosys, 26AS reports 680
      ],
    };
  }

  async fetchForm26as(sessionToken: string, fy: string = '2025-26'): Promise<Form26AsData> {
    if (!sessionToken || !sessionToken.startsWith('MOCK_SESS_')) {
      throw new Error('Invalid or expired portal session token.');
    }

    const parts = sessionToken.split('_');
    const pan = parts[2] || 'ABCDE1234F';

    return {
      pan,
      financialYear: fy,
      assessmentYear: '2026-27',
      generatedAt: new Date().toISOString(),
      tdsEntries: [
        {
          deductorTan: 'BLRT12345A',
          deductorName: 'TechCorp Solutions India Pvt Ltd',
          section: '192',
          totalAmountPaid: 1450000,
          taxDeducted: 124500,
          taxDeposited: 124500,
          source: '26AS',
        },
        {
          deductorTan: 'PUNA98765C',
          deductorName: 'Apex Innovations LLP',
          section: '192',
          totalAmountPaid: 280000,
          taxDeducted: 15400,
          taxDeposited: 15400,
          source: '26AS',
        },
        {
          deductorTan: 'PUNS00123D',
          deductorName: 'State Bank of India',
          section: '194A',
          totalAmountPaid: 42000,
          taxDeducted: 4200,
          taxDeposited: 4200,
          source: '26AS',
        },
        {
          deductorTan: 'BLRI00987K',
          deductorName: 'Infosys Limited',
          section: '194',
          totalAmountPaid: 6800,
          taxDeducted: 680,
          taxDeposited: 680,
          source: '26AS',
        },
        // Deliberate discrepancy: 26AS shows an extra bank interest TDS entry not reflected in early AIS
        {
          deductorTan: 'MUMH00213E',
          deductorName: 'HDFC Bank Ltd',
          section: '194A',
          totalAmountPaid: 15000,
          taxDeducted: 1500,
          taxDeposited: 1500,
          source: '26AS',
        },
      ],
      tcsEntries: [
        {
          collectorTan: 'DELT00112A',
          collectorName: 'Apex Motor Vehicles Dealership Ltd',
          taxCollected: 8500,
          source: '26AS',
        },
      ],
      advanceTaxEntries: [
        {
          bsrCode: '0210045',
          challanDate: '2025-09-15',
          challanNo: '00341',
          amount: 25000,
          taxType: 'ADVANCE_TAX',
          source: '26AS',
        },
      ],
      totalTds: 146280,
      totalTcs: 8500,
      totalAdvanceTax: 25000,
    };
  }
}
