import { DocumentParserAdapter } from './parser.types';
import { DocumentParserMockAdapter } from './parser.mock';
import { DocumentParserLiveAdapter } from './parser.live';

const mode = process.env.INTEGRATION_MODE || 'mock';

export const documentParserAdapter: DocumentParserAdapter =
  mode === 'live' ? new DocumentParserLiveAdapter() : new DocumentParserMockAdapter();

export * from './parser.types';
export { DocumentParserMockAdapter, DocumentParserLiveAdapter };
