import { Tooltip } from 'antd';
import type { DailyActivityPoint } from '../../../types';
import { palette } from '../../../theme/tokens';

interface ActivityChartProps {
  data: DailyActivityPoint[];
  height?: number;
}

const formatDay = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });

export const ActivityChart = ({ data, height = 220 }: ActivityChartProps) => {
  const max = Math.max(1, ...data.map((point) => Math.max(point.views, point.applications)));
  const chartHeight = height - 42;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: palette.textSecondary, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: palette.primaryHover }} />
          Просмотры
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: palette.warning }} />
          Отклики
        </span>
      </div>

      {/* Horizontal scroll keeps 14 extra-thin bars readable on a 320 px
          screen without widening the page: the overflow stays inside this box. */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            height,
            padding: '0 4px',
            borderBottom: `1px solid ${palette.border}`,
            minWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {data.map((point) => {
            const viewsHeight = Math.max(2, Math.round((point.views / max) * chartHeight));
            const applicationsHeight = Math.max(
              2,
              Math.round((point.applications / max) * chartHeight),
            );

            return (
              <Tooltip
                key={point.date}
                title={`${formatDay(point.date)} · просмотры: ${point.views}, отклики: ${point.applications}`}
              >
                <div
                  style={{
                    flex: '1 0 10px',
                    minWidth: 10,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                    height: chartHeight,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '50%',
                      height: viewsHeight,
                      borderRadius: '4px 4px 0 0',
                      background: `linear-gradient(180deg, ${palette.primaryHover}, ${palette.primary})`,
                    }}
                  />
                  <div
                    style={{
                      width: '50%',
                      height: applicationsHeight,
                      borderRadius: '4px 4px 0 0',
                      background: `linear-gradient(180deg, ${palette.warning}, #B45309)`,
                    }}
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '0 4px', minWidth: '100%', boxSizing: 'border-box' }}>
          {data.map((point, index) => (
            <span
              key={point.date}
              style={{
                flex: '1 0 10px',
                minWidth: 10,
                textAlign: 'center',
                fontSize: 10,
                color: palette.textMuted,
              }}
            >
              {index % 2 === 0 ? formatDay(point.date) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
