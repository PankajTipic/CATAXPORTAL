import { DocumentParserAdapter, Form16ParsedData } from './parser.types';

export class DocumentParserLiveAdapter implements DocumentParserAdapter {
  private parserApiUrl: string;
  private apiKey: string;

  constructor() {
    this.parserApiUrl = process.env.DOC_PARSER_API_URL || 'https://api.fastkyc.com/v1/ocr';
    this.apiKey = process.env.DOC_PARSER_API_KEY || '';
  }

  async parseForm16(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<Form16ParsedData> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: POST ${this.parserApiUrl}/form16
    // headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'multipart/form-data' }
    // body: formData with file and fileName
    // mapping: real response -> Form16ParsedData
    throw new Error('DocumentParserLiveAdapter: parseForm16 is not implemented. Plug in real OCR/Parser API.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }

  async parseForm26as(fileBufferOrBase64: string | ArrayBuffer, fileName: string): Promise<any> {
    // >>>>>> REPLACE WITH REAL FASTKYC API — START <<<<<<
    // endpoint: POST ${this.parserApiUrl}/form26as
    // headers: { 'Authorization': `Bearer ${this.apiKey}` }
    // mapping: real response -> 26AS data
    throw new Error('DocumentParserLiveAdapter: parseForm26as is not implemented. Plug in real OCR/Parser API.');
    // >>>>>> REPLACE WITH REAL FASTKYC API — END <<<<<<
  }
}
