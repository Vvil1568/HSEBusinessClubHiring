import { DeleteOutlined, FileOutlined, InboxOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Modal, Upload } from 'antd';
import { useState } from 'react';
import { extractErrorMessage } from '../../../api/client';
import type { ApplicationFile, VacancyDetails } from '../../../types';
import { clearDraft, formatFileSize, mapFileToAttachment } from '../../../utils/drafts';
import { useDraftState } from '../../../hooks/useDraftState';
import { palette } from '../../../theme/tokens';
import { StartupLogo } from '../../../components/common/StartupLogo';
import { useApplyToVacancy } from '../api/useVacancies';

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
  const applyMutation = useApplyToVacancy();

  const handleClose = () => {
    if (!applyMutation.isPending) {
      onClose();
    }
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
          <Button onClick={handleClose} disabled={applyMutation.isPending}>
            Отмена
          </Button>
          <Button
            type="primary"
            loading={applyMutation.isPending}
            disabled={motivation.trim().length === 0}
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
        Черновик сохраняется автоматически на этом устройстве.
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Файлы</div>
        <Upload
          multiple
          beforeUpload={(file) => {
            setFiles((current) => [...current, mapFileToAttachment(file)]);
            return Upload.LIST_IGNORE;
          }}
          fileList={[]}
          showUploadList={false}
        >
          <Button icon={<InboxOutlined />}>Приложить файлы</Button>
        </Upload>

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
                <FileOutlined style={{ color: palette.textSecondary }} />
                <span style={{ flex: 1, fontSize: 13 }}>{file.name}</span>
                <span style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatFileSize(file.size)}
                </span>
                <Button
                  type="text"
                  size="small"
                  aria-label={`Удалить файл ${file.name}`}
                  icon={<DeleteOutlined />}
                  onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                />
              </div>
            ))}
          </div>
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
