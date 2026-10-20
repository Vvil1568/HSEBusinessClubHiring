import { BulbOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';
import type { CSSProperties } from 'react';
import { palette } from '../../theme/tokens';

interface StartupLogoProps {
  title: string;
  logoUrl: string | null;
  size?: number;
  radius?: number;
}

export const StartupLogo = ({ title, logoUrl, size = 48, radius = 14 }: StartupLogoProps) => {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    background: logoUrl ? 'transparent' : palette.surfaceElevated,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: `1px solid ${palette.border}`,
  };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Логотип ${title}`}
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={style} aria-label={`Логотип ${title} отсутствует`}>
      <BulbOutlined style={{ fontSize: size * 0.45, color: palette.warning }} />
    </div>
  );
};

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  size?: number;
}

export const UserAvatar = ({ firstName, lastName, avatarUrl, size = 40 }: UserAvatarProps) => (
  <Avatar
    size={size}
    src={avatarUrl ?? undefined}
    style={{
      background: palette.surfaceElevated,
      color: palette.text,
      fontWeight: 600,
      flexShrink: 0,
    }}
  >
    {`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()}
  </Avatar>
);
