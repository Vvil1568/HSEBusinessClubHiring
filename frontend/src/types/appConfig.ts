/**
 * Public runtime switches returned by `GET /auth/app-config`.
 *
 * The frontend needs two independent answers from the backend:
 * - `production` — whether the entry screen may offer a browser demo button;
 * - `devMode` — whether the DEV user switcher is mounted at all.
 */
export interface DevUserOption {
  key: string;
  label: string;
  description: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  telegramId: number | null;
  /** `false` for the `real` preset outside Telegram: it needs signed initData. */
  availableOutsideTelegram: boolean;
}

export interface AppConfig {
  production: boolean;
  devMode: boolean;
  defaultDevUser: string;
  devUsers: DevUserOption[];
}

export interface DevSwitchResult {
  user: import('./auth').UserProfile;
  expiresAt: string;
  devUser: string;
}
