/**
 * Thin wrapper around `Telegram.WebApp`.
 *
 * `initData` is the only trustworthy identity source: it is signed by the bot
 * and verified on the backend. `initDataUnsafe` is for preliminary rendering
 * only and is never sent as proof of authorization.
 */

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    auth_date?: number;
    hash?: string;
    query_id?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  isExpanded: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const getWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
};

/** Signed launch payload. An empty string means the app runs outside Telegram. */
export const getInitData = (): string => getWebApp()?.initData ?? '';

/** User from the unverified payload — UI hints only. */
export const getInitDataUser = (): TelegramWebAppUser | null =>
  getWebApp()?.initDataUnsafe.user ?? null;

/** `true` when a signed `initData` exists; `initDataUnsafe` is spoofable. */
export const isTelegramEnvironment = (): boolean => getInitData().length > 0;

/** One-time init: expand to full height and report readiness to Telegram. */
export const initTelegramApp = (): void => {
  const webApp = getWebApp();
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
};

/** Viewport height changes when the mobile keyboard opens; lists must adapt. */
export const subscribeViewportChange = (handler: () => void): (() => void) => {
  const webApp = getWebApp();
  if (!webApp) return () => undefined;
  webApp.onEvent('viewportChanged', handler);
  return () => webApp.offEvent('viewportChanged', handler);
};
