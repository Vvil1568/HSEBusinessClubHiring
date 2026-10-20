import { Skeleton } from 'antd';
import { palette } from '../../theme/tokens';

export const StartupsGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 16,
    }}
  >
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        style={{
          padding: 20,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
        }}
      >
        <Skeleton active avatar={{ shape: 'square', size: 48 }} paragraph={{ rows: 2 }} />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        style={{
          padding: 16,
          borderRadius: 14,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
        }}
      >
        <Skeleton active avatar={{ shape: 'circle', size: 36 }} paragraph={{ rows: 1 }} />
      </div>
    ))}
  </div>
);
