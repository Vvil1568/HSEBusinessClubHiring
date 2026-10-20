import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteFile, downloadFileBlob, extractFileId, uploadFile } from '../../../api/files';
import type {
  ApplicationFile,
  FileUploadScope,
  StoredFile,
  UploadFileOptions,
} from '../../../types';

const toAttachment = (stored: StoredFile): ApplicationFile => ({
  id: stored.id,
  name: stored.name,
  size: stored.size,
  mimeType: stored.mimeType,
  url: stored.url,
});

export interface PendingUpload {
  /** Client-side id used to key rows while the request is in flight. */
  localId: string;
  name: string;
  size: number;
  percent: number;
  error: string | null;
}

interface UseFileUploadOptions {
  scope: FileUploadScope;
}

/**
 * Single entry point for "put a file into storage".
 *
 * `uploadFile` posts to the backend proxy — never to dufs. Progress is tracked
 * per file and every upload is abortable (e.g. when the modal closes), which
 * also aborts the underlying XHR.
 */
export const useFileUpload = ({ scope }: UseFileUploadOptions) => {
  const controllers = useRef(new Map<string, AbortController>());

  const mutation = useMutation({
    mutationFn: async (variables: {
      localId: string;
      file: File;
      onProgress: (percent: number) => void;
    }): Promise<ApplicationFile> => {
      const controller = new AbortController();
      controllers.current.set(variables.localId, controller);

      const options: UploadFileOptions = {
        scope,
        signal: controller.signal,
        onProgress: variables.onProgress,
      };

      try {
        const stored = await uploadFile(variables.file, options);
        return toAttachment(stored);
      } finally {
        controllers.current.delete(variables.localId);
      }
    },
  });

  const abort = useCallback((localId: string) => {
    controllers.current.get(localId)?.abort();
    controllers.current.delete(localId);
  }, []);

  const abortAll = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);

  useEffect(() => () => abortAll(), [abortAll]);

  return { ...mutation, abort, abortAll };
};

/** Deletes an object so storage does not accumulate orphaned UUIDs. */
export const useDeleteFile = () =>
  useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
  });

/**
 * Resolves any image reference into a source an `<img>` can render.
 *
 * Data URIs and blob URLs are used as-is. Storage references are fetched
 * through the backend proxy and exposed as an object URL: this keeps bytes
 * behind the authorisation check and also works with the in-browser mock, which
 * has no HTTP endpoint to serve `/api/files/<uuid>` directly.
 *
 * Returns `null` while loading, on failure, or when there is no image.
 */
export const useFileSrc = (url: string | null): string | null => {
  const isInline = Boolean(url && (url.startsWith('data:') || url.startsWith('blob:')));
  // State is keyed by the requested url so a stale preview is never rendered:
  // the value for the previous url simply stops matching and resolves to null.
  const [entry, setEntry] = useState<{ key: string; src: string } | null>(null);

  useEffect(() => {
    if (!url || isInline) return;

    const fileId = extractFileId(url);
    if (!fileId) return;

    let revoked = false;
    let createdUrl: string | null = null;
    const controller = new AbortController();

    const load = async () => {
      try {
        const blob = await downloadFileBlob(fileId, controller.signal);
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setEntry({ key: url, src: createdUrl });
      } catch {
        // Preview is best-effort; callers fall back to a placeholder.
      }
    };

    void load();

    return () => {
      revoked = true;
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [isInline, url]);

  if (!url) return null;
  if (isInline) return url;
  return entry && entry.key === url ? entry.src : null;
};

/**
 * Downloads a stored file through the backend proxy and saves it under the
 * original name. The storage key is a UUID, so a plain `<a download>` would
 * produce a file called `<uuid>`; fetching the blob preserves the real name and
 * works with authenticated endpoints.
 */
export const useDownloadFile = () => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(async (file: ApplicationFile) => {
    const fileId = file.url ? extractFileId(file.url) : null;
    if (!fileId) {
      throw new Error('Файл недоступен для скачивания');
    }

    setDownloadingId(file.id);
    try {
      const blob = await downloadFileBlob(fileId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return { download, downloadingId };
};
