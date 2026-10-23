import { EyeOutlined, SendOutlined, SolutionOutlined } from '@ant-design/icons';
import type { Startup } from '../../../types';
import { palette, stageColors, stageLabels } from '../../../theme/tokens';
import { getUserDisplayName } from '../../../utils/format';
import { StartupLogo } from '../../../components/common/StartupLogo';
import { StatPill } from '../../../components/common/StatPill';

interface StartupHeroProps {
  startup: Startup;
  compact?: boolean;
}

export const StartupHero = ({ startup, compact = false }: StartupHeroProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      alignItems: compact ? 'center' : 'flex-start',
      gap: compact ? 16 : 18,
      padding: compact ? 0 : 22,
      borderRadius: 16,
      border: compact ? 'none' : `1px solid ${palette.border}`,
      background: compact ? 'transparent' : palette.surface,
    }}
  >
    <StartupLogo
      title={startup.title}
      logoUrl={startup.logoUrl}
      size={compact ? 68 : 140}
      radius={compact ? 18 : 32}
    />
    <div style={{ minWidth: 0 }}>
      <h1
        style={{
          margin: 0,
          fontSize: compact ? 22 : 28,
          fontWeight: 700,
          color: palette.text,
          lineHeight: 1.2,
        }}
      >
        {startup.title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            padding: '2px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            color: stageColors[startup.stage],
            background: `${stageColors[startup.stage]}1F`,
          }}
        >
          {stageLabels[startup.stage]}
        </span>
        <span style={{ color: palette.textMuted, fontSize: 12 }}>
          Автор: {getUserDisplayName(startup.owner)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
        <StatPill
          icon={<SolutionOutlined />}
          value={startup.vacanciesCount}
          title="Вакансии"
          accent={palette.textSecondary}
        />
        <StatPill
          icon={<SendOutlined />}
          value={startup.applicationsCount}
          title="Отклики"
          accent={palette.warning}
        />
        <StatPill
          icon={<EyeOutlined />}
          value={startup.viewsCount}
          title="Просмотры"
          accent={palette.textMuted}
        />
      </div>
    </div>
  </div>
);
