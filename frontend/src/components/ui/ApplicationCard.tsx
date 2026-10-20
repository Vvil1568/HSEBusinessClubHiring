import type { Application } from '../../types';
import { palette } from '../../theme/tokens';
import { StartupLogo } from '../common/StartupLogo';
import { StatusTag } from '../common/StatusTag';

interface ApplicationCardProps {
  application: Application;
  onOpen: (vacancyId: string) => void;
  compact?: boolean;
}

export const ApplicationCard = ({ application, onOpen, compact = false }: ApplicationCardProps) => (
  <button
    type="button"
    onClick={() => onOpen(application.vacancyId)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'left',
      padding: compact ? '12px 14px' : '14px 16px',
      borderRadius: 14,
      border: `1px solid ${palette.border}`,
      background: palette.surface,
      color: palette.text,
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
    }}
    onMouseEnter={(event) => {
      event.currentTarget.style.borderColor = palette.primaryHover;
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.borderColor = palette.border;
    }}
  >
    <StartupLogo
      title={application.startupTitle}
      logoUrl={application.startupLogoUrl}
      size={40}
      radius={12}
    />
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          color: palette.textSecondary,
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {application.startupTitle}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {application.vacancyTitle}
      </div>
    </div>
    <StatusTag status={application.status} />
  </button>
);
