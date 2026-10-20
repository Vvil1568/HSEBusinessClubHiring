import { AppstoreOutlined, EyeOutlined, RightOutlined } from '@ant-design/icons';
import type { StartupSummary } from '../../types';
import { palette, stageColors, stageLabels } from '../../theme/tokens';
import { StartupLogo } from '../common/StartupLogo';
import { formatCount } from '../../utils/format';

interface StartupCardProps {
  startup: StartupSummary;
  onOpen: (id: string) => void;
  compact?: boolean;
}

export const StartupCard = ({ startup, onOpen, compact = false }: StartupCardProps) => (
  <button
    type="button"
    onClick={() => onOpen(startup.id)}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? 10 : 14,
      width: '100%',
      textAlign: 'left',
      padding: compact ? 14 : 18,
      borderRadius: 16,
      border: `1px solid ${palette.border}`,
      background: palette.surface,
      color: palette.text,
      cursor: 'pointer',
      transition: 'border-color 0.2s ease, transform 0.2s ease',
    }}
    onMouseEnter={(event) => {
      event.currentTarget.style.borderColor = palette.primaryHover;
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.borderColor = palette.border;
    }}
  >
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <StartupLogo
        title={startup.title}
        logoUrl={startup.logoUrl}
        size={compact ? 40 : 48}
        radius={compact ? 12 : 14}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: compact ? 14 : 16,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {startup.title}
          </span>
          <RightOutlined style={{ color: palette.textMuted, fontSize: 12 }} />
        </div>
        <span
          style={{
            display: 'inline-flex',
            marginTop: 6,
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            color: stageColors[startup.stage],
            background: `${stageColors[startup.stage]}1F`,
          }}
        >
          {stageLabels[startup.stage]}
        </span>
      </div>
    </div>

    <p
      style={{
        margin: 0,
        color: palette.textSecondary,
        fontSize: 13,
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: compact ? 2 : 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {startup.shortDescription}
    </p>

    {!compact ? (
      <div style={{ display: 'flex', gap: 16, color: palette.textMuted, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <AppstoreOutlined /> {formatCount(startup.vacanciesCount, 'vacancy')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <EyeOutlined /> {formatCount(startup.viewsCount, 'view')}
        </span>
      </div>
    ) : null}
  </button>
);
