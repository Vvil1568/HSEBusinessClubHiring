export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface ApiErrorPayload {
  message: string;
}

export type FileUploadScope = 'application-attachment' | 'startup-logo';

/**
 * A single object inside the file storage. The object key is a server generated
 * UUID, so the original file name is only metadata and is never used as a path.
 */
export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  /** Same-origin URL served through the backend proxy: `/api/files/{uuid}`. */
  url: string;
  createdAt: string;
}

export interface UploadFileOptions {
  scope: FileUploadScope;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}
