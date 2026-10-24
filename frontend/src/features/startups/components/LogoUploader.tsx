import { DeleteOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Progress, Upload } from 'antd';
import { useState } from 'react';
import { extractErrorMessage } from '../../../api/client';
import { extractFileId } from '../../../api/files';
import { palette } from '../../../theme/tokens';
import { MAX_LOGO_FILE_SIZE, isLogoMimeType } from '../../../utils/files';
import { useDeleteFile, useFileSrc, useFileUpload } from '../../files/api/useFiles';

interface LogoUploaderProps {
  /** Storage URL of the current logo (`/api/files/<uuid>`) or a data URI. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * The logo is an ordinary stored object: uploaded through the backend file
 * proxy, addressed by a UUID, referenced by URL. `null` means "no logo" and the
 * UI falls back to the idea bulb — the backend must accept and persist `null`.
 */
export const LogoUploader = ({ value, onChange }: LogoUploaderProps) => {
  const { message } = App.useApp();
  const [percent, setPercent] = useState<number | null>(null);
  const upload = useFileUpload({ scope: 'startup-logo' });
  const deleteFileMutation = useDeleteFile();
  // The stored logo is served only through the backend proxy, so the preview
  // must resolve it instead of pointing `<img>` at the raw storage URL.
  const previewSrc = useFileSrc(value);

  // Do NOT add `useEffect(() => () => upload.abortAll(), [upload])` here.
  // `useFileUpload` returns a fresh object on every render, so that cleanup
  // fired after *each* re-render — and the first `setPercent(0)` in
  // `beforeUpload` already re-renders the component, immediately aborting the
  // request that was just started. The browser reported it as `canceled`.
  // `useFileUpload` aborts its own in-flight requests on unmount, so no extra
  // cleanup is needed.

  const handleRemove = () => {
    // `null` must reach the backend unchanged: the previous implementation
    // silently ignored it and the old logo reappeared after saving.
    const currentId = value ? extractFileId(value) : null;
    if (currentId) {
      deleteFileMutation.mutate(currentId, {
        onError: () => message.warning('Не удалось удалить файл логотипа'),
      });
    }
    onChange(null);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 18,
          border: `1px dashed ${palette.border}`,
          background: value ? 'transparent' : palette.surfaceMuted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Логотип стартапа"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: 26, color: palette.textMuted }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <Upload
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          showUploadList={false}
          fileList={[]}
          beforeUpload={(file) => {
            if (file.size > MAX_LOGO_FILE_SIZE) {
              message.error(
                `Логотип должен быть меньше ${Math.round(MAX_LOGO_FILE_SIZE / (1024 * 1024))} МБ`,
              );
              return Upload.LIST_IGNORE;
            }
            if (!isLogoMimeType(file.type)) {
              message.error('Поддерживаются PNG, JPG, WEBP, GIF и SVG');
              return Upload.LIST_IGNORE;
            }

            setPercent(0);
            upload.mutate(
              {
                localId: `logo-${Date.now()}`,
                file,
                onProgress: (progress) => setPercent(progress),
              },
              {
                onSuccess: (uploaded) => {
                  setPercent(null);
                  // Drop the superseded object so storage does not keep every
                  // replaced version. Done here, not in an effect: reacting to
                  // the new prop value would re-render a component the user is
                  // actively editing.
                  const previousId = value ? extractFileId(value) : null;
                  if (previousId) {
                    deleteFileMutation.mutate(previousId);
                  }
                  onChange(uploaded.url);
                },
                onError: (error) => {
                  setPercent(null);
                  message.error(extractErrorMessage(error));
                },
              },
            );

            // The component must never issue its own request: uploads are
            // owned by useFileUpload so progress and abort are controllable.
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<UploadOutlined />} loading={percent !== null}>
            {value ? 'Заменить логотип' : 'Загрузить логотип'}
          </Button>
        </Upload>

        {percent !== null ? (
          <Progress
            percent={percent}
            size="small"
            strokeColor={palette.primaryHover}
            style={{ margin: 0, maxWidth: 220 }}
          />
        ) : null}

        {value ? (
          <Button
            type="link"
            size="small"
            icon={<DeleteOutlined />}
            style={{ padding: 0, width: 'fit-content' }}
            onClick={handleRemove}
          >
            Убрать логотип (будет лампочка идеи)
          </Button>
        ) : (
          <span style={{ fontSize: 12, color: palette.textMuted }}>
            PNG, JPG, WEBP, GIF или SVG, до {Math.round(MAX_LOGO_FILE_SIZE / (1024 * 1024))} МБ.
            Без логотипа покажем лампочку идеи.
          </span>
        )}
      </div>
    </div>
  );
};
