import { MailOutlined, SolutionOutlined, AppstoreOutlined, SendOutlined } from '@ant-design/icons';
import type { UserProfile } from '../../../types';
import { palette } from '../../../theme/tokens';
import { UserAvatar } from '../../../components/common/StartupLogo';

interface ProfileSidebarProps {
  user: UserProfile;
  totals: { startups: number; vacancies: number; applications: number };
  compact?: boolean;
}

export const ProfileSidebar = ({ user, totals, compact = false }: ProfileSidebarProps) => (
  <aside
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: compact ? 'center' : 'flex-start',
      gap: 12,
      padding: compact ? 0 : 20,
      borderRadius: 16,
      border: compact ? 'none' : `1px solid ${palette.border}`,
      background: compact ? 'transparent' : palette.surface,
      textAlign: compact ? 'center' : 'left',
      // Inside the desktop CSS grid the item stretches to the full row height by
      // default, which made the card run past the last content block. On mobile
      // the parent is a column flexbox, where `start` would shrink the width.
      alignSelf: compact ? 'stretch' : 'start',
    }}
  >
    <UserAvatar
      firstName={user.firstName}
      lastName={user.lastName}
      avatarUrl={user.avatarUrl}
      size={compact ? 84 : 120}
    />
    <div>
      <div style={{ fontSize: compact ? 20 : 22, fontWeight: 700, color: palette.text }}>
        {user.firstName} {user.lastName}
      </div>
      <div style={{ fontSize: 14, color: palette.textSecondary, marginTop: 2 }}>@{user.nick}</div>
    </div>

    <div
      style={{
        fontSize: 13,
        color: palette.textSecondary,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: compact ? 'center' : 'flex-start',
      }}
    >
      <span>{user.position}</span>
      {user.company ? <span style={{ color: palette.textMuted }}>{user.company}</span> : null}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: palette.textMuted }}>
        <MailOutlined /> {user.email}
      </span>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        width: '100%',
        marginTop: 8,
      }}
    >
      {[
        { icon: <AppstoreOutlined />, value: totals.startups, label: 'стартапы' },
        { icon: <SolutionOutlined />, value: totals.vacancies, label: 'вакансии' },
        { icon: <SendOutlined />, value: totals.applications, label: 'отклики' },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '10px 6px',
            borderRadius: 12,
            border: `1px solid ${palette.borderSoft}`,
            background: palette.surfaceMuted,
          }}
        >
          <span style={{ color: palette.primaryHover, fontSize: 14 }}>{item.icon}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: palette.text }}>{item.value}</span>
          <span style={{ fontSize: 11, color: palette.textMuted }}>{item.label}</span>
        </div>
      ))}
    </div>
  </aside>
);
