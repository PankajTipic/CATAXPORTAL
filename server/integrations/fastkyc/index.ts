import { FastKycAdapter } from './fastkyc.types';
import { FastKycMockAdapter } from './fastkyc.mock';
import { FastKycLiveAdapter } from './fastkyc.live';

const mode = process.env.INTEGRATION_MODE || 'mock';

export const fastKycAdapter: FastKycAdapter =
  mode === 'live' ? new FastKycLiveAdapter() : new FastKycMockAdapter();

export * from './fastkyc.types';
export { FastKycMockAdapter, FastKycLiveAdapter };
