import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getAuthSession, isMockApi } from '../../../api/client';
import { getInitData } from '../../../telegram/webApp';
import type { DevSwitchResult, UserProfile } from '../../../types';
import { buildDevInitData, readDevUser, writeDevUser } from './devSession';

/** The mock has no signature: a stable stub keeps the demo on the same path. */
const MOCK_INIT_DATA = 'mock-init-data';

export interface TelegramAuthResult {
  user: UserProfile;
  /** Server session expiry (UTC, ISO 8601). */
  expiresAt: string;
}

/**
 * Payload actually sent to the backend. A selected DEV identity takes
 * precedence over the real Telegram payload; the backend accepts `dev:<key>`
 * only while `DEV_MODE=1`.
 */
const resolveInitData = (): string => {
  const devUser = readDevUser();
  if (devUser) return buildDevInitData(devUser);
  return getInitData() || (isMockApi() ? MOCK_INIT_DATA : '');
};

/**
 * Exchanges `initData` for a server session. The backend verifies the
 * HMAC-SHA256 signature, `auth_date` freshness and `query_id` uniqueness, then
 * upserts the user and sets an HttpOnly cookie. There is no password or IdP.
 */
const exchangeInitData = async (override?: string): Promise<TelegramAuthResult> => {
  const response = await api.post<TelegramAuthResult>('/auth/telegram', {
    initData: override || resolveInitData(),
  });
  getAuthSession().authenticated = true;
  return response.data;
};

/**
 * `override` lets the entry screen sign in as a DEV preset when the browser
 * has neither a stored selection nor a signed `initData` string.
 */
export const useTelegramAuth = () =>
  useMutation({
    mutationFn: exchangeInitData,
  });

/**
 * Switches the active DEV identity and refreshes every cached screen.
 *
 * The stored preset key changes the `X-Telegram-Init-Data` header used by the
 * next request, so all cached queries are invalidated to show the new user's
 * data. `real` clears the override and falls back to the signed payload.
 */
const switchDevUser = async (key: string): Promise<DevSwitchResult> => {
  // `/auth/dev-login` with `real` requires the signed Telegram header, so the
  // override must be cleared *before* the request — the interceptor reads it
  // from storage at call time.
  if (key === 'real') {
    writeDevUser(null);
  }
  try {
    const response = await api.post<DevSwitchResult>('/auth/dev-login', { user: key });
    writeDevUser(key === 'real' ? null : key);
    getAuthSession().authenticated = true;
    return response.data;
  } catch (error) {
    // Restore the previous selection so a failed switch does not log the user
    // out of the identity they were actually using.
    if (key === 'real' && error instanceof Error) {
      writeDevUser(null);
    }
    throw error;
  }
};

export const useDevUserSwitch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: switchDevUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
};
