import type { ApplicationFile } from '../types';

const STORAGE_PREFIX = 'expert-clinic:draft';

export const persistDraft = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, value);
  } catch {
    // Storage may be unavailable in private mode; the draft simply stays in memory.
  }
};

export const readDraft = (key: string): string => {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`) ?? '';
  } catch {
    return '';
  }
};

export const clearDraft = (key: string): void => {
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
  } catch {
    // ignore
  }
};

export const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
};

export const mapFileToAttachment = (file: File): ApplicationFile => ({
  id: `${file.name}-${file.size}-${file.lastModified}`,
  name: file.name,
  size: file.size,
  url: null,
});
