import { useMutation } from '@tanstack/react-query';
import { api, getAuthSession, isMockApi } from '../../../api/client';
import { getInitData } from '../../../telegram/webApp';
import type { UserProfile } from '../../../types';

/** The mock has no signature: a stable stub keeps the demo on the same path. */
const MOCK_INIT_DATA = 'mock-init-data';

export interface TelegramAuthResult {
  user: UserProfile;
  /** Server session expiry (UTC, ISO 8601). */
  expiresAt: string;
}

/**
 * Exchanges `initData` for a server session. The backend verifies the
 * HMAC-SHA256 signature, `auth_date` freshness and `query_id` uniqueness, then
 * upserts the user and sets an HttpOnly cookie. There is no password or IdP.
 */
const exchangeInitData = async (): Promise<TelegramAuthResult> => {
  const initData = getInitData() || (isMockApi() ? MOCK_INIT_DATA : '');
  const response = await api.post<TelegramAuthResult>('/auth/telegram', { initData });
  getAuthSession().authenticated = true;
  return response.data;
};

export const useTelegramAuth = () =>
  useMutation({
    mutationFn: exchangeInitData,
  });
