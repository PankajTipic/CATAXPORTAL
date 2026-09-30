import {
  FastKycAdapter,
  PanVerificationResult,
  RegistrationStatusResult,
  PortalSessionResult,
  AisData,
  Form26AsData,
} from './fastkyc.types';

/**
 * Live FastKYC Adapter stub.
 * This class is wired to live external endpoints.
 * Replace the stubbed implementations with actual HTTP requests to FastKYC / ERI partner APIs.
 */
export class FastKycLiveAdapter implements FastKycAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.FASTKYC_BASE_URL || 'https://api.fastkyc.com/v1';
    this.apiKey = process.env.FASTKYC_API_KEY || '';
  }

  async verifyPan(pan: string): Promise<PanVerificationResult> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: POST ${this.baseUrl}/pan/verify
    // headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    // body: JSON.stringify({ pan })
    // mapping: real response -> PanVerificationResult
    throw new Error('FastKYC Live Adapter: verifyPan is not implemented. Fill with live API credentials.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }

  async checkRegistration(pan: string): Promise<RegistrationStatusResult> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: GET ${this.baseUrl}/itd/registration-status?pan=${pan}
    // headers: { 'Authorization': `Bearer ${this.apiKey}` }
    // mapping: real response -> RegistrationStatusResult
    throw new Error('FastKYC Live Adapter: checkRegistration is not implemented. Fill with live API credentials.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }

  async loginToPortal(pan: string, password: string): Promise<PortalSessionResult> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: POST ${this.baseUrl}/itd/session/login
    // headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    // body: JSON.stringify({ pan, password })
    // NOTE: Password must never be logged or persisted anywhere. Discard immediately after API call.
    // mapping: real response -> PortalSessionResult { sessionToken, expiresAt, pan }
    throw new Error('FastKYC Live Adapter: loginToPortal is not implemented. Fill with live API credentials.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }

  async fetchAis(sessionToken: string, fy: string): Promise<AisData> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: GET ${this.baseUrl}/itd/ais?financial_year=${fy}
    // headers: { 'Authorization': `Bearer ${this.apiKey}`, 'X-Portal-Session': sessionToken }
    // mapping: real response -> AisData { salary, interest, dividend, securities, rent, property, sft, tds }
    throw new Error('FastKYC Live Adapter: fetchAis is not implemented. Fill with live API credentials.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }

  async fetchForm26as(sessionToken: string, fy: string): Promise<Form26AsData> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: GET ${this.baseUrl}/itd/26as?financial_year=${fy}
    // headers: { 'Authorization': `Bearer ${this.apiKey}`, 'X-Portal-Session': sessionToken }
    // mapping: real response -> Form26AsData { tdsEntries, tcsEntries, advanceTaxEntries, totalTds, totalTcs, totalAdvanceTax }
    throw new Error('FastKYC Live Adapter: fetchForm26as is not implemented. Fill with live API credentials.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }
}
