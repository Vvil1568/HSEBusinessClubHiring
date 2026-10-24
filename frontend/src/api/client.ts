import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { MockHttpError, resolveMockRequest } from './mock/server';
import { buildDevInitData, readDevUser } from '../features/auth/api/devSession';
import { getInitData } from '../telegram/webApp';

const MOCK_LATENCY_MIN = 180;
const MOCK_LATENCY_MAX = 520;

/**
 * Active Mini App session.
 *
 * `POST /auth/telegram` trades `initData` for an HttpOnly cookie. The
 * `X-Telegram-Init-Data` header is sent as well, so requests still work when
 * cookies are blocked (third-party WebView).
 */
export interface AuthSessionState {
  authenticated: boolean;
}

const session: AuthSessionState = { authenticated: false };

export const getAuthSession = (): AuthSessionState => session;

const delay = (): Promise<void> =>
  new Promise((resolve) => {
    const timeout = MOCK_LATENCY_MIN + Math.random() * (MOCK_LATENCY_MAX - MOCK_LATENCY_MIN);
    window.setTimeout(resolve, timeout);
  });

const parsePayload = (data: unknown): unknown => {
  // multipart/form-data is passed through untouched so the mock can inspect
  // the FormData instance and read the raw File.
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return data;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return data;
    }
  }
  return data;
};

const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  await delay();

  const method = (config.method ?? 'get').toUpperCase();
  const basePath = config.url ?? '/';
  const path = basePath.replace(/^\/api(\/v1)?/, '');
  const params = (config.params ?? {}) as Record<string, unknown>;
  const body = parsePayload(config.data);

  try {
    const result = resolveMockRequest(method, path, params, body);
    return {
      data: result.data,
      status: result.status,
      statusText: 'OK',
      // Binary payloads from the file proxy carry their own content type so
      // `responseType: 'blob'` consumers can rebuild a properly typed Blob.
      headers: result.contentType
        ? { 'content-type': result.contentType, 'content-length': String((result.data as Blob).size) }
        : {},
      config,
    };
  } catch (error) {
    if (error instanceof MockHttpError) {
      throw new AxiosError(
        error.message,
        String(error.status),
        config,
        null,
        {
          data: { message: error.message },
          status: error.status,
          statusText: 'ERROR',
          headers: {},
          config,
        },
      );
    }
    throw error;
  }
};

/** Opt-in only: the mock must never be the default in production builds. */
const useMock = import.meta.env.VITE_USE_MOCK === '1';

/** Platform contract is `/api/v1`; relative `/api` is proxied by Vite and nginx. */
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // Required for the HttpOnly session cookie on cross-origin deploys.
  withCredentials: true,
  ...(useMock ? { adapter: mockAdapter } : {}),
});

// `initData` is reissued on every Mini App launch, so read it per request.
// In DEV mode the selected preset identity takes precedence: the backend only
// trusts `dev:<key>` while `DEV_MODE=1`, so this cannot weaken production.
api.interceptors.request.use((config) => {
  const devUser = readDevUser();
  const initData = devUser ? buildDevInitData(devUser) : getInitData();
  if (initData) {
    config.headers.set('X-Telegram-Init-Data', initData);
  }
  return config;
});

/**
 * `401` means `initData` is expired or its signature is invalid. Retrying with
 * the same payload is pointless, so only the session state is reset.
 */
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      session.authenticated = false;
    }
    return Promise.reject(error);
  },
);

/**
 * True while requests are served by the in-browser mock instead of a real
 * backend. Used for things the mock cannot emulate (transport progress events).
 */
export const isMockApi = (): boolean => api.defaults.adapter === mockAdapter;

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { message?: string } | undefined;
    if (payload?.message) return payload.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
};
