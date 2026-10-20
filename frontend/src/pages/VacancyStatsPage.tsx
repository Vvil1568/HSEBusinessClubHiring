import { EyeOutlined, SendOutlined, TeamOutlined } from '@ant-design/icons';
import { App, Collapse, Skeleton } from 'antd';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  useUpdateApplicationStatus,
  useVacancyStats,
} from '../features/vacancies/api/useVacancies';
import { ActivityChart } from '../features/vacancies/components/ActivityChart';
import { ApplicationReviewCard } from '../features/vacancies/components/ApplicationReviewCard';
import { StartupLogo, UserAvatar } from '../components/common/StartupLogo';
import { ErrorState } from '../components/common/ErrorState';
import { StatPill } from '../components/common/StatPill';
import { PageHeader } from '../components/layout/PageHeader';
import { palette } from '../theme/tokens';

export const VacancyStatsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isMobile } = useBreakpoint();
  const { message } = App.useApp();
  const { data: stats, isLoading, isError, error, refetch } = useVacancyStats(id);
  const updateStatus = useUpdateApplicationStatus(id ?? '');

  const uniqueViewers = useMemo(() => {
    if (!stats) return [];
    const seen = new Set<string>();
    return stats.viewers.filter((viewer) => {
      if (seen.has(viewer.user.id)) return false;
      seen.add(viewer.user.id);
      return true;
    });
  }, [stats]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton active paragraph={{ rows: 1 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <ErrorState
        message={extractErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const handleUpdateStatus = (applicationId: string, status: 'approved' | 'rejected') => {
    updateStatus.mutate(
      { applicationId, status },
      {
        onSuccess: () => message.success('Статус отклика обновлён'),
        onError: (updateError) => message.error(extractErrorMessage(updateError)),
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Статистика вакансии"
        subtitle={stats.vacancyTitle}
        showBack
        backFallback={`/vacancy/${stats.vacancyId}`}
      />

      <div
        style={{
          display: 'flex',
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
          title={stats.startupTitle}
          logoUrl={stats.startupLogoUrl}
          size={60}
          radius={16}
        />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ color: palette.textSecondary, fontSize: 12 }}>{stats.startupTitle}</div>
          <div style={{ color: palette.text, fontSize: 18, fontWeight: 700 }}>
            {stats.vacancyTitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <StatPill icon={<EyeOutlined />} value={stats.totalViews} title="Просмотры" />
          <StatPill
            icon={<SendOutlined />}
            value={stats.totalApplications}
            title="Отклики"
            accent={palette.warning}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 360px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <section
          style={{
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
            Просмотры и отклики по дням
          </h2>
          <ActivityChart data={stats.daily} />
        </section>

        <section
          style={{
            padding: 8,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
          }}
        >
          <Collapse
            ghost
            defaultActiveKey={['applications']}
            items={[
              {
                key: 'viewers',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <TeamOutlined /> Смотрели вакансию ({uniqueViewers.length})
                  </span>
                ),
                children:
                  uniqueViewers.length === 0 ? (
                    <span style={{ color: palette.textMuted, fontSize: 13 }}>
                      Пока никто не просматривал вакансию.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {uniqueViewers.map((viewer) => (
                        <div
                          key={viewer.user.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                        >
                          <UserAvatar
                            firstName={viewer.user.firstName}
                            lastName={viewer.user.lastName}
                            avatarUrl={viewer.user.avatarUrl}
                            size={32}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {viewer.user.firstName} {viewer.user.lastName}
                            </div>
                            <div style={{ fontSize: 11, color: palette.textMuted }}>
                              @{viewer.user.nick} · {dayjs(viewer.viewedAt).format('D MMM, HH:mm')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
              },
              {
                key: 'applications',
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <SendOutlined /> Отклики ({stats.applications.length})
                  </span>
                ),
                children:
                  stats.applications.length === 0 ? (
                    <span style={{ color: palette.textMuted, fontSize: 13 }}>
                      Откликов пока нет.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {stats.applications.map((application) => (
                        <ApplicationReviewCard
                          key={application.id}
                          application={application}
                          isUpdating={updateStatus.isPending}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      ))}
                    </div>
                  ),
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
};
