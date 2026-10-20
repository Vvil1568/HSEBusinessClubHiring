/**
 * Shared file constraints. The values are duplicated on the backend on purpose:
 * the client validates early for UX, the backend re-validates because the
 * client cannot be trusted. Keep both lists in sync.
 */

export const MAX_APPLICATION_FILES = 5;
export const MAX_APPLICATION_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;

export const LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

export const isLogoMimeType = (mimeType: string): boolean =>
  (LOGO_MIME_TYPES as readonly string[]).includes(mimeType);

const HEX = '0123456789abcdef';

/**
 * RFC 4122 v4 UUID. `crypto.randomUUID` is not available on insecure origins
 * (plain http on a LAN address), so we fall back to `crypto.getRandomValues`.
 */
export const createUuid = (): string => {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let uuid = '';
  for (let index = 0; index < bytes.length; index += 1) {
    if (index === 4 || index === 6 || index === 8 || index === 10) uuid += '-';
    uuid += HEX[bytes[index] >> 4] + HEX[bytes[index] & 0x0f];
  }
  return uuid;
};

