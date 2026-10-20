import { Button, Empty } from 'antd';
import type { ReactNode } from 'react';
import { palette } from '../../theme/tokens';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => (
  <div
    style={{
      padding: '36px 20px',
      border: `1px dashed ${palette.border}`,
      borderRadius: 16,
      background: palette.surfaceMuted,
      textAlign: 'center',
    }}
  >
    <Empty
      image={icon ?? Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>{title}</span>
          <span style={{ color: palette.textSecondary, fontSize: 13 }}>{description}</span>
        </div>
      }
    >
      {actionLabel && onAction ? (
        <Button type="primary" onClick={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Empty>
  </div>
);
