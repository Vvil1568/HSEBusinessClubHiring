import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { MockHttpError, resolveMockRequest } from './mock/server';

const MOCK_LATENCY_MIN = 180;
const MOCK_LATENCY_MAX = 520;

const delay = (): Promise<void> =>
  new Promise((resolve) => {
    const timeout = MOCK_LATENCY_MIN + Math.random() * (MOCK_LATENCY_MAX - MOCK_LATENCY_MIN);
    window.setTimeout(resolve, timeout);
  });

const parsePayload = (data: unknown): unknown => {
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
  const path = basePath.replace(/^\/api/, '');
  const params = (config.params ?? {}) as Record<string, unknown>;
  const body = parsePayload(config.data);

  try {
    const result = resolveMockRequest(method, path, params, body);
    return {
      data: result.data,
      status: result.status,
      statusText: 'OK',
      headers: {},
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

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  adapter: mockAdapter,
});

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as { message?: string } | undefined;
    if (payload?.message) return payload.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
};
