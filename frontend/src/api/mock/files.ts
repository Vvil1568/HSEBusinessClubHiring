import type { FileUploadScope, StoredFile } from '../../types';
import {
  MAX_APPLICATION_FILES,
  MAX_APPLICATION_FILE_SIZE,
  MAX_LOGO_FILE_SIZE,
  createUuid,
  isLogoMimeType,
} from '../../utils/files';
import { MockHttpError } from './errors';
import type { DbStoredFile, MockDatabase } from './types';

/**
 * Mock implementation of the backend file proxy.
 *
 * It mirrors the contract the real backend must fulfil against dufs:
 *   - the object key is a UUID, never the client supplied file name;
 *   - the original name/type/size are stored as metadata only;
 *   - the scope decides the validation policy and the storage prefix;
 *   - reading/deleting is only possible for objects that exist in the store.
 *
 * Only metadata is persisted in `MockDatabase.files`; binary content stays in
 * the in-memory map, because `localStorage` cannot hold real files. Metadata
 * survives reloads so the UI keeps showing correct entries after a refresh.
 */

const LOGO_PREFIX = 'startup-logos';
const ATTACHMENT_PREFIX = 'application-attachments';

const memoryStore = new Map<string, Blob>();

const scopedLimit = (scope: FileUploadScope): number =>
  scope === 'startup-logo' ? MAX_LOGO_FILE_SIZE : MAX_APPLICATION_FILE_SIZE;

const scopePrefix = (scope: FileUploadScope): string =>
  scope === 'startup-logo' ? LOGO_PREFIX : ATTACHMENT_PREFIX;

const validate = (scope: FileUploadScope, file: { size: number; mimeType: string }): void => {
  if (file.size <= 0) {
    throw new MockHttpError(422, 'Файл пустой');
  }
  if (file.size > scopedLimit(scope)) {
    const limitMb = Math.round(scopedLimit(scope) / (1024 * 1024));
    throw new MockHttpError(422, `Файл больше ${limitMb} МБ`);
  }
  if (scope === 'startup-logo' && !isLogoMimeType(file.mimeType)) {
    throw new MockHttpError(
      422,
      'Логотип должен быть изображением PNG, JPG, WEBP, GIF или SVG',
    );
  }
};

export const createStoredFile = (
  database: MockDatabase,
  scope: FileUploadScope,
  input: { name: string; size: number; mimeType: string },
  content: Blob | null,
): StoredFile => {
  validate(scope, input);

  const id = createUuid();
  const stored: DbStoredFile = {
    id,
    name: input.name,
    size: input.size,
    mimeType: input.mimeType,
    // Canonical contract path. `useFileSrc` extracts the UUID and fetches the
    // bytes via axios, so the `/api` vs `/api/v1` prefix does not matter.
    url: `/api/v1/files/${id}`,
    createdAt: new Date().toISOString(),
    scope,
    storageKey: `${scopePrefix(scope)}/${id}`,
  };

  database.files = [...(database.files ?? []), stored];

  if (content) {
    memoryStore.set(id, content);
  }

  return toStoredFile(stored);
};

export const toStoredFile = ({ id, name, size, mimeType, url, createdAt }: DbStoredFile): StoredFile => ({
  id,
  name,
  size,
  mimeType,
  url,
  createdAt,
});

export const countApplicationAttachments = (database: MockDatabase): number =>
  (database.files ?? []).filter((file) => file.scope !== 'startup-logo').length;

export const assertAttachmentBudget = (database: MockDatabase, incoming: number): void => {
  if (incoming > MAX_APPLICATION_FILES) {
    throw new MockHttpError(422, `Можно приложить не больше ${MAX_APPLICATION_FILES} файлов`);
  }
  if (countApplicationAttachments(database) + incoming > 500) {
    throw new MockHttpError(507, 'Хранилище файлов переполнено');
  }
};

export const findStoredFile = (
  database: MockDatabase,
  fileId: string,
): DbStoredFile | undefined => (database.files ?? []).find((file) => file.id === fileId);

export const readFileContent = (fileId: string): Blob | null => memoryStore.get(fileId) ?? null;

export const removeStoredFile = (database: MockDatabase, fileId: string): void => {
  if (!findStoredFile(database, fileId)) {
    throw new MockHttpError(404, 'Файл не найден');
  }
  database.files = (database.files ?? []).filter((file) => file.id !== fileId);
  memoryStore.delete(fileId);
};
