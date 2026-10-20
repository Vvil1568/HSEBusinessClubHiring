import { BarChartOutlined, EyeOutlined, SendOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import {
  useRegisterVacancyView,
  useVacancyDetail,
} from '../features/vacancies/api/useVacancies';
import { ApplyModal } from '../features/vacancies/components/ApplyModal';
import { StartupLogo } from '../components/common/StartupLogo';
import { ErrorState } from '../components/common/ErrorState';
import { StatusTag } from '../components/common/StatusTag';
import { StatPill } from '../components/common/StatPill';
import { PageHeader } from '../components/layout/PageHeader';
import { palette, stageColors, stageLabels } from '../theme/tokens';

const sections = ['Описание', 'Требования', 'Вознаграждение'] as const;

export const VacancyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vacancy, isLoading, isError, error, refetch } = useVacancyDetail(id);
  const registerView = useRegisterVacancyView();
  const [applyOpen, setApplyOpen] = useState(false);
  const { mutate: trackView } = registerView;

  useEffect(() => {
    if (!id) return;
    const timeout = window.setTimeout(() => trackView(id), 600);
    return () => window.clearTimeout(timeout);
  }, [id, trackView]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton active paragraph={{ rows: 1 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (isError || !vacancy) {
    return (
      <ErrorState
        message={extractErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const content: Record<(typeof sections)[number], string> = {
    Описание: vacancy.description,
    Требования: vacancy.requirements,
    Вознаграждение: vacancy.reward,
  };

  return (
    <div>
      <PageHeader
        title={vacancy.title}
        subtitle={vacancy.startup.title}
        showBack
        backFallback={`/startup/${vacancy.startup.id}`}
        extra={
          vacancy.isOwner ? (
            <Button
              icon={<BarChartOutlined />}
              onClick={() => navigate(`/vacancy/${vacancy.id}/stats`)}
            >
              Статистика
            </Button>
          ) : null
        }
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          padding: 18,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
          marginBottom: 20,
        }}
      >
        <StartupLogo
          title={vacancy.startup.title}
          logoUrl={vacancy.startup.logoUrl}
          size={64}
          radius={18}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          <Link
            to={`/startup/${vacancy.startup.id}`}
            style={{ color: palette.text, fontSize: 18, fontWeight: 700, textDecoration: 'none' }}
          >
            {vacancy.startup.title}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: stageColors[vacancy.startup.stage],
                background: `${stageColors[vacancy.startup.stage]}1F`,
              }}
            >
              {stageLabels[vacancy.startup.stage]}
            </span>
            <span style={{ color: palette.textMuted, fontSize: 12 }}>
              Опубликовано {dayjs(vacancy.createdAt).format('D MMMM YYYY')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <StatPill icon={<EyeOutlined />} value={vacancy.viewsCount} title="Просмотры" />
          <StatPill
            icon={<SendOutlined />}
            value={vacancy.applicationsCount}
            title="Отклики"
            accent={palette.warning}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}>
        {sections.map((section) => (
          <section
            key={section}
            style={{
              padding: 20,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: 15,
                fontWeight: 600,
                color: palette.text,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {section === 'Вознаграждение' ? <ShoppingOutlined /> : null}
              {section}
            </h2>
            <p
              style={{
                margin: 0,
                color: palette.textSecondary,
                fontSize: 14,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              {content[section] || 'Не указано'}
            </p>
          </section>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {vacancy.isOwner ? (
          <Alert
            type="info"
            showIcon
            style={{ borderRadius: 12 }}
            message="Это вакансия вашего стартапа"
            description="Отклики и просмотры доступны в разделе статистики."
            action={
              <Button size="small" onClick={() => navigate(`/vacancy/${vacancy.id}/stats`)}>
                Открыть статистику
              </Button>
            }
          />
        ) : vacancy.myApplicationStatus ? (
          <Alert
            type="info"
            showIcon
            style={{ borderRadius: 12 }}
            message={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                Ваш отклик: <StatusTag status={vacancy.myApplicationStatus} />
              </span>
            }
          />
        ) : (
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={() => setApplyOpen(true)}
            style={{ minWidth: 200 }}
          >
            Откликнуться
          </Button>
        )}
      </div>

      <ApplyModal vacancy={vacancy} open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
};
