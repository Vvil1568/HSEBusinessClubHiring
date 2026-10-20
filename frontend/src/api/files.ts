import { isMockApi } from './client';
import { api } from './client';
import type { AxiosProgressEvent } from 'axios';
import type { StoredFile, UploadFileOptions } from '../types';

/**
 * File storage access.
 *
 * The browser NEVER talks to dufs directly. dufs is an internal service with a
 * flat storage namespace, no per-user authorisation and no content policies;
 * exposing it would let clients enumerate objects and bypass validation.
 *
 * Every call in this module goes through the backend (`/api/files/...`), which
 * owns:
 *   - authentication/authorisation (who may read/write/delete which object),
 *   - validation (size, MIME, extension, per-application count),
 *   - object key generation (UUID, so names cannot be guessed or enumerated),
 *   - the actual dufs HTTP call (PUT/GET/DELETE) on the internal network.
 *
 * The client only creates, reads and deletes objects. Reading happens through
 * the same proxy URL, so download-side checks are enforced identically.
 */

const FILES_ENDPOINT = '/files';

/**
 * Simulated progress for the mock transport. The mock adapter resolves in one
 * step and never emits `onUploadProgress`, so without this the UI would jump
 * from 0% to done. Real uploads use the browser's events instead.
 */
const startSimulatedProgress = (onProgress: (percent: number) => void): (() => void) => {
  let percent = 0;
  onProgress(percent);
  const timer = window.setInterval(() => {
    // Approach 90% and hold: the last 10% is reserved for completion.
    percent = Math.min(90, percent + Math.max(4, Math.round((90 - percent) / 6)));
    onProgress(percent);
  }, 120);
  return () => window.clearInterval(timer);
};

/**
 * Uploads one file and returns the created object descriptor.
 *
 * `multipart/form-data` lets the backend stream the body to dufs while it
 * validates size/MIME, without buffering everything first. The backend
 * responds with the generated UUID key and the final proxy URL.
 */
export const uploadFile = async (
  file: File,
  options: UploadFileOptions,
): Promise<StoredFile> => {
  const formData = new FormData();
  formData.append('scope', options.scope);
  formData.append('file', file, file.name);

  const stopSimulation = options.onProgress && isMockApi()
    ? startSimulatedProgress(options.onProgress)
    : () => undefined;

  try {
    const response = await api.post<StoredFile>(`${FILES_ENDPOINT}/upload`, formData, {
      signal: options.signal,
      // Let the browser add the multipart boundary itself.
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!options.onProgress || isMockApi()) return;
        const total = event.total ?? file.size;
        if (!total) return;
        options.onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
      },
    });

    options.onProgress?.(100);
    return response.data;
  } finally {
    stopSimulation();
  }
};

export const deleteFile = async (fileId: string): Promise<void> => {
  await api.delete(`${FILES_ENDPOINT}/${encodeURIComponent(fileId)}`);
};

/**
 * Fetches the bytes through the proxy. Used for previews and for saving with
 * the original file name (the storage key is a UUID, so `download` alone would
 * expose the UUID as the file name).
 */
export const downloadFileBlob = async (fileId: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await api.get<Blob>(`${FILES_ENDPOINT}/${encodeURIComponent(fileId)}`, {
    responseType: 'blob',
    signal,
  });
  return response.data;
};

/**
 * Extracts the object id from any URL shape the API may return
 * (`/api/files/<uuid>`, `files/<uuid>`, absolute backend URL).
 */
export const extractFileId = (url: string): string | null => {
  const match = url.match(/\/files\/([0-9a-fA-F-]{36})(?:[?#]|$)/);
  if (match) return match[1];
  // Fallback for opaque ids used by other backends.
  const parts = url.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
};

