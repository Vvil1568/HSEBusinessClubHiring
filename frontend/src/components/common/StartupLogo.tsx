import { BulbOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { palette } from '../../theme/tokens';
import { useFileSrc } from '../../features/files/api/useFiles';

interface StartupLogoProps {
  title: string;
  logoUrl: string | null;
  size?: number;
  radius?: number;
}

export const StartupLogo = ({ title, logoUrl, size = 48, radius = 14 }: StartupLogoProps) => {
  // Logos live behind the file proxy; the hook resolves them to a renderable
  // source and yields `null` while loading or when the object is gone.
  const src = useFileSrc(logoUrl);
  // A stored logo may be missing (deleted object, lost access). The failed
  // source is remembered by value, so a new logo starts fresh without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showImage = Boolean(src) && src !== failedSrc;

  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    background: showImage ? 'transparent' : palette.surfaceElevated,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: `1px solid ${palette.border}`,
  };

  if (showImage && src) {
    return (
      <img
        src={src}
        alt={`Логотип ${title}`}
        onError={() => setFailedSrc(src)}
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
  /**
   * Telegram `photo_url`: an absolute CDN URL. Local `/api/...` URLs are
   * supported too and resolved through the file proxy.
   */
  photoUrl: string | null;
  size?: number;
}

export const UserAvatar = ({ firstName, lastName, photoUrl, size = 40 }: UserAvatarProps) => {
  // Telegram already returns a public URL, so proxying it would only break the
  // load. Everything else (storage objects, data URIs) goes through
  // `useFileSrc`, which handles authorized reads.
  const isRemote = Boolean(photoUrl && /^https?:\/\//i.test(photoUrl));
  const resolved = useFileSrc(isRemote ? null : photoUrl);
  const src = isRemote ? photoUrl : resolved;

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <Avatar
      size={size}
      src={src ?? undefined}
      style={{
        background: palette.surfaceElevated,
        color: palette.text,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  );
};
