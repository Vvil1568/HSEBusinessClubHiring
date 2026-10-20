import { CheckOutlined, CloseOutlined, DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tooltip } from 'antd';
import type { Application, ApplicationFile } from '../../../types';
import { palette, statusLabels } from '../../../theme/tokens';
import { UserAvatar } from '../../../components/common/StartupLogo';
import { StatusTag } from '../../../components/common/StatusTag';
import { formatFileSize } from '../../../utils/drafts';
import { useDownloadFile } from '../../files/api/useFiles';

interface ApplicationReviewCardProps {
  application: Application;
  isUpdating: boolean;
  onUpdateStatus: (applicationId: string, status: 'approved' | 'rejected') => void;
}

const AttachmentChip = ({ file }: { file: ApplicationFile }) => {
  const { message } = App.useApp();
  const { download, downloadingId } = useDownloadFile();
  const isLegacy = !file.url;
  const isLoading = downloadingId === file.id;

  return (
    <Tooltip title={isLegacy ? 'Демо-файл без содержимого' : `Скачать ${file.name}`}>
      <button
        type="button"
        disabled={isLegacy || isLoading}
        onClick={() => {
          void download(file).catch(() => message.error('Не удалось скачать файл'));
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: '100%',
          padding: '4px 10px',
          borderRadius: 999,
          border: `1px solid ${palette.border}`,
          background: palette.surfaceMuted,
          fontSize: 12,
          color: isLegacy ? palette.textMuted : palette.textSecondary,
          cursor: isLegacy ? 'not-allowed' : 'pointer',
          opacity: isLegacy ? 0.7 : 1,
          font: 'inherit',
        }}
      >
        <FileOutlined />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </span>
        <span style={{ opacity: 0.75 }}>· {formatFileSize(file.size)}</span>
        {isLegacy ? null : <DownloadOutlined style={{ opacity: isLoading ? 0.4 : 1 }} />}
      </button>
    </Tooltip>
  );
};

export const ApplicationReviewCard = ({
  application,
  isUpdating,
  onUpdateStatus,
}: ApplicationReviewCardProps) => {
  const isPending = application.status === 'pending';

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${palette.border}`,
        background: palette.surface,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <UserAvatar
          firstName={application.applicant.firstName}
          lastName={application.applicant.lastName}
          avatarUrl={application.applicant.avatarUrl}
          size={42}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {application.applicant.firstName} {application.applicant.lastName}
          </div>
          <div style={{ fontSize: 12, color: palette.textSecondary }}>
            @{application.applicant.nick}
          </div>
        </div>
        <StatusTag status={application.status} />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: palette.textSecondary, lineHeight: 1.55 }}>
        {application.motivation}
      </p>

      {application.files.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
          {application.files.map((file) => (
            <AttachmentChip key={file.id} file={file} />
          ))}
        </div>
      ) : null}

      {isPending ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={isUpdating}
            onClick={() => onUpdateStatus(application.id, 'approved')}
          >
            Принять
          </Button>
          <Popconfirm
            title="Отклонить отклик?"
            description={`Кандидат получит статус «${statusLabels.rejected}».`}
            okText="Отклонить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => onUpdateStatus(application.id, 'rejected')}
          >
            <Button size="small" danger icon={<CloseOutlined />} disabled={isUpdating}>
              Отклонить
            </Button>
          </Popconfirm>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: palette.textMuted }}>
          Решение принято: {statusLabels[application.status].toLowerCase()}
        </span>
      )}
    </article>
  );
};
