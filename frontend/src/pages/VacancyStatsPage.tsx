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
import { getUserDisplayName } from '../utils/format';
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
          // Wraps on narrow screens: the logo + title + two stats pills no
          // longer fit in one row on a 393 px viewport.
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: isMobile ? 12 : 16,
          padding: isMobile ? 14 : 18,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
          marginBottom: 20,
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <StartupLogo
          title={stats.startupTitle}
          logoUrl={stats.startupLogoUrl}
          size={isMobile ? 48 : 60}
          radius={16}
        />
        <div style={{ flex: '1 1 160px', minWidth: 0 }}>
          <div
            style={{
              color: palette.textSecondary,
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {stats.startupTitle}
          </div>
          <div
            style={{
              color: palette.text,
              fontSize: isMobile ? 16 : 18,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {stats.vacancyTitle}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 18,
            flexShrink: 0,
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
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
          // Single column on every breakpoint: the applications list must sit
          // below the chart, not next to it. `minmax(0, 1fr)` (instead of `1fr`)
          // is still required so the chart cannot force the track wider than the
          // viewport.
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
          minWidth: 0,
        }}
      >
        <section
          style={{
            padding: isMobile ? 14 : 20,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box',
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
            minWidth: 0,
            maxWidth: '100%',
            boxSizing: 'border-box',
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
                            photoUrl={viewer.user.photoUrl}
                            size={32}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {getUserDisplayName(viewer.user)}
                            </div>
                            <div style={{ fontSize: 11, color: palette.textMuted }}>
                              {dayjs(viewer.viewedAt).format('D MMM, HH:mm')}
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
                    <div
                      style={{
                        display: 'grid',
                        // The section is full-width now, so use the extra room
                        // for several cards per row. `auto-fit` + `minmax(320px, …)`
                        // collapses back to a single column on narrow desktops
                        // without a second breakpoint.
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
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
