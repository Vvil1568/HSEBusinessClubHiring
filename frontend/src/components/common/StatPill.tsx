import type { ReactNode } from 'react';
import { palette } from '../../theme/tokens';

interface StatPillProps {
  icon: ReactNode;
  value: number;
  title: string;
  accent?: string;
}

export const StatPill = ({ icon, value, title, accent = palette.textSecondary }: StatPillProps) => (
  <span
    title={title}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: accent,
      fontSize: 13,
      fontWeight: 500,
    }}
  >
    {icon}
    <span>{value}</span>
  </span>
);
