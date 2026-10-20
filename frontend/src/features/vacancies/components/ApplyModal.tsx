import {
  DeleteOutlined,
  FileOutlined,
  InboxOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Input, Modal, Progress, Upload } from 'antd';
import { useState } from 'react';
import { extractErrorMessage } from '../../../api/client';
import type { ApplicationFile, VacancyDetails } from '../../../types';
import { clearDraft } from '../../../utils/drafts';
import {
  MAX_APPLICATION_FILES,
  MAX_APPLICATION_FILE_SIZE,
  createUuid,
} from '../../../utils/files';
import { formatFileSize } from '../../../utils/drafts';
import { useDraftState } from '../../../hooks/useDraftState';
import { palette } from '../../../theme/tokens';
import { StartupLogo } from '../../../components/common/StartupLogo';
import { useApplyToVacancy } from '../api/useVacancies';
import { useDeleteFile, useFileUpload } from '../../files/api/useFiles';
import type { PendingUpload } from '../../files/api/useFiles';

interface ApplyModalProps {
  vacancy: VacancyDetails;
  open: boolean;
  onClose: () => void;
}

export const ApplyModal = ({ vacancy, open, onClose }: ApplyModalProps) => {
  const { message } = App.useApp();
  const draftKey = `apply:${vacancy.id}`;
  const [motivation, setMotivation] = useDraftState(draftKey);
  const [files, setFiles] = useState<ApplicationFile[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const applyMutation = useApplyToVacancy();
  const deleteFileMutation = useDeleteFile();
  const upload = useFileUpload({ scope: 'application-attachment' });

  const isBusy = applyMutation.isPending || pending.length > 0;

  const handleClose = () => {
    if (isBusy) return;
    // Abort in-flight uploads and clean up only the objects created in this
    // session that were never attached to an application.
    upload.abortAll();
    files.forEach((file) => {
      deleteFileMutation.mutate(file.id);
    });
    if (files.length > 0) {
      setFiles([]);
    }
    onClose();
  };

  const startUpload = (file: File) => {
    const localId = createUuid();

    setRejected((current) =>
      current.includes(file.name) ? current.filter((name) => name !== file.name) : current,
    );

    if (file.size > MAX_APPLICATION_FILE_SIZE) {
      setRejected((current) => [
        ...current,
        `${file.name} — больше ${Math.round(MAX_APPLICATION_FILE_SIZE / (1024 * 1024))} МБ`,
      ]);
      return;
    }

    if (files.length + pending.length >= MAX_APPLICATION_FILES) {
      setRejected((current) => [
        ...current,
        `${file.name} — не больше ${MAX_APPLICATION_FILES} файлов на отклик`,
      ]);
      return;
    }

    setPending((current) => [
      ...current,
      { localId, name: file.name, size: file.size, percent: 0, error: null },
    ]);

    upload.mutate(
      {
        localId,
        file,
        onProgress: (percent) => {
          setPending((current) =>
            current.map((item) => (item.localId === localId ? { ...item, percent } : item)),
          );
        },
      },
      {
        onSuccess: (uploaded) => {
          setPending((current) => current.filter((item) => item.localId !== localId));
          setFiles((current) => [...current, uploaded]);
        },
        onError: (error) => {
          setPending((current) =>
            current.map((item) =>
              item.localId === localId
                ? { ...item, error: extractErrorMessage(error) }
                : item,
            ),
          );
        },
      },
    );
  };

  const removeFile = (file: ApplicationFile) => {
    setFiles((current) => current.filter((item) => item.id !== file.id));
    // Free the storage object immediately: the id is a UUID nobody can reuse.
    deleteFileMutation.mutate(file.id, {
      onError: () => message.warning('Не удалось удалить файл из хранилища'),
    });
  };

  const handleSubmit = () => {
    applyMutation.mutate(
      {
        vacancyId: vacancy.id,
        payload: { motivation, files },
      },
      {
        onSuccess: () => {
          clearDraft(draftKey);
          setMotivation('');
          setFiles([]);
          setPending([]);
          setRejected([]);
          message.success('Отклик отправлен');
          onClose();
        },
        onError: (error) => {
          message.error(extractErrorMessage(error));
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={null}
      width={640}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={handleClose} disabled={isBusy}>
            Отмена
          </Button>
          <Button
            type="primary"
            loading={applyMutation.isPending}
            disabled={motivation.trim().length === 0 || isBusy}
            onClick={handleSubmit}
          >
            Отправить отклик
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <StartupLogo
          title={vacancy.startup.title}
          logoUrl={vacancy.startup.logoUrl}
          size={44}
          radius={12}
        />
        <div>
          <div style={{ color: palette.textSecondary, fontSize: 12 }}>
            {vacancy.startup.title}
          </div>
          <div style={{ color: palette.text, fontSize: 16, fontWeight: 600 }}>
            {vacancy.title}
          </div>
        </div>
      </div>

      <label
        htmlFor="motivation-field"
        style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}
      >
        Почему вам интересна эта роль
      </label>
      <Input.TextArea
        id="motivation-field"
        value={motivation}
        onChange={(event) => setMotivation(event.target.value)}
        placeholder="Расскажите о релевантном опыте и мотивации"
        autoSize={{ minRows: 6, maxRows: 12 }}
        showCount
        maxLength={2000}
        style={{ borderRadius: 12 }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: palette.textMuted }}>
        Черновик текста сохраняется автоматически на этом устройстве.
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Файлы</div>
        <Upload
          multiple
          showUploadList={false}
          fileList={[]}
          disabled={files.length + pending.length >= MAX_APPLICATION_FILES}
          beforeUpload={(file) => {
            startUpload(file);
            // The component must never perform its own request: uploads are
            // owned by useFileUpload so progress and abort are controlled.
            return Upload.LIST_IGNORE;
          }}
        >
          <Button icon={<InboxOutlined />} disabled={files.length + pending.length >= MAX_APPLICATION_FILES}>
            Приложить файлы
          </Button>
        </Upload>
        <div style={{ marginTop: 6, fontSize: 12, color: palette.textMuted }}>
          До {MAX_APPLICATION_FILES} файлов, каждый не больше{' '}
          {Math.round(MAX_APPLICATION_FILE_SIZE / (1024 * 1024))} МБ. Файлы доступны владельцу
          вакансии и только по прямой ссылке.
        </div>

        {pending.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {pending.map((item) => (
              <div
                key={item.localId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  background: palette.surfaceMuted,
                }}
              >
                {item.error ? (
                  <WarningOutlined style={{ color: palette.danger }} />
                ) : (
                  <LoadingOutlined style={{ color: palette.primaryHover }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </div>
                  {item.error ? (
                    <div style={{ fontSize: 11, color: palette.danger }}>{item.error}</div>
                  ) : (
                    <Progress
                      percent={item.percent}
                      size="small"
                      showInfo={false}
                      strokeColor={palette.primaryHover}
                      style={{ margin: 0 }}
                    />
                  )}
                </div>
                <span style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatFileSize(item.size)}
                </span>
                <Button
                  type="text"
                  size="small"
                  aria-label={`Отменить загрузку ${item.name}`}
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    upload.abort(item.localId);
                    setPending((current) =>
                      current.filter((entry) => entry.localId !== item.localId),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  background: palette.surfaceMuted,
                }}
              >
                <FileOutlined style={{ color: palette.success }} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </span>
                <span style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatFileSize(file.size)}
                </span>
                <Button
                  type="text"
                  size="small"
                  aria-label={`Удалить файл ${file.name}`}
                  icon={<DeleteOutlined />}
                  onClick={() => removeFile(file)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {rejected.length > 0 ? (
          <Alert
            style={{ marginTop: 12, borderRadius: 12 }}
            type="warning"
            showIcon
            message="Часть файлов не добавлена"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {rejected.map((reason) => (
                  <li key={reason} style={{ fontSize: 12 }}>
                    {reason}
                  </li>
                ))}
              </ul>
            }
            closable
            onClose={() => setRejected([])}
          />
        ) : null}
      </div>

      {vacancy.myApplicationStatus ? (
        <Alert
          style={{ marginTop: 16, borderRadius: 12 }}
          type="info"
          showIcon
          message="Вы уже откликались на эту вакансию"
        />
      ) : null}
    </Modal>
  );
};
