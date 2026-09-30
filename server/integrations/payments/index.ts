import { PaymentsAdapter } from './payments.types';
import { PaymentsMockAdapter } from './payments.mock';
import { PaymentsLiveAdapter } from './payments.live';

const mode = process.env.INTEGRATION_MODE || 'mock';

export const paymentsAdapter: PaymentsAdapter =
  mode === 'live' ? new PaymentsLiveAdapter() : new PaymentsMockAdapter();

export * from './payments.types';
export { PaymentsMockAdapter, PaymentsLiveAdapter };
