/**
 * Selected DEV identity, persisted across reloads.
 *
 * The backend accepts a synthetic `dev:<key>` payload as `initData` only while
 * `DEV_MODE=1`, so the frontend never needs a second auth mechanism: switching
 * a user is just a different payload for the regular `POST /auth/telegram`.
 */

const DEV_USER_STORAGE_KEY = 'business-club:dev-user';

export const DEV_INIT_DATA_PREFIX = 'dev:';

export const readDevUser = (): string | null => {
  try {
    const value = window.localStorage.getItem(DEV_USER_STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
};

export const writeDevUser = (key: string | null): void => {
  try {
    if (key) {
      window.localStorage.setItem(DEV_USER_STORAGE_KEY, key);
    } else {
      window.localStorage.removeItem(DEV_USER_STORAGE_KEY);
    }
  } catch {
    // Private mode: the selection simply does not survive a reload.
  }
};

/** Synthetic payload understood by the backend only in DEV mode. */
export const buildDevInitData = (key: string): string => `${DEV_INIT_DATA_PREFIX}${key}`;
