import { NotificationsAdapter } from './notifications.types';
import { NotificationsMockAdapter } from './notifications.mock';
import { NotificationsLiveAdapter } from './notifications.live';

const mode = process.env.INTEGRATION_MODE || 'mock';

export const notificationsAdapter: NotificationsAdapter =
  mode === 'live' ? new NotificationsLiveAdapter() : new NotificationsMockAdapter();

export * from './notifications.types';
export { NotificationsMockAdapter, NotificationsLiveAdapter };
