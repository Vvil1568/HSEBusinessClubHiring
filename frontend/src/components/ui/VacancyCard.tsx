import { EyeOutlined, SendOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type { VacancyListItem } from '../../types';
import { palette } from '../../theme/tokens';
import { StatPill } from '../common/StatPill';
import { StartupLogo } from '../common/StartupLogo';

interface VacancyCardProps {
  vacancy: VacancyListItem;
  onOpen: (id: string) => void;
  showApplicantsAlert?: boolean;
}

export const VacancyCard = ({ vacancy, onOpen, showApplicantsAlert = false }: VacancyCardProps) => (
  <button
    type="button"
    onClick={() => onOpen(vacancy.id)}
    style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'left',
      padding: '14px 16px',
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
    {showApplicantsAlert && vacancy.applicationsCount > 0 ? (
      <span
        aria-label="Есть новые отклики"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: palette.danger,
          boxShadow: `0 0 0 3px ${palette.danger}33`,
        }}
      />
    ) : null}

    <StartupLogo
      title={vacancy.startupTitle}
      logoUrl={vacancy.startupLogoUrl}
      size={40}
      radius={12}
    />

    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            color: palette.textSecondary,
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {vacancy.startupTitle}
        </span>
        {vacancy.isHidden ? (
          <EyeInvisibleOutlined style={{ color: palette.textMuted, fontSize: 12 }} />
        ) : null}
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
        {vacancy.title}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <StatPill
          // Same send-arrow glyph as the applications stat elsewhere, so the
          // metric reads as a counter rather than a warning.
          icon={<SendOutlined />}
          value={vacancy.applicationsCount}
          title="Отклики"
          accent={vacancy.applicationsCount > 0 ? palette.warning : palette.textMuted}
        />
        <StatPill
          icon={<EyeOutlined />}
          value={vacancy.viewsCount}
          title="Просмотры"
          accent={palette.textSecondary}
        />
      </div>
    </div>
  </button>
);
