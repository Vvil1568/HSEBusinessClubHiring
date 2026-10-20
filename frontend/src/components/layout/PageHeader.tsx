import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { palette } from '../../theme/tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  showBack?: boolean;
  backFallback?: string;
}

export const PageHeader = ({
  title,
  subtitle,
  extra,
  showBack = false,
  backFallback = '/startup',
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {showBack ? (
          <Button
            type="text"
            aria-label="Назад"
            onClick={() => navigate(backFallback)}
            icon={<ArrowLeftOutlined />}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
              color: palette.text,
              marginTop: 2,
            }}
          />
        ) : null}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.2,
              fontWeight: 700,
              color: palette.text,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: '6px 0 0', color: palette.textSecondary, fontSize: 14 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {extra ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{extra}</div> : null}
    </div>
  );
};
