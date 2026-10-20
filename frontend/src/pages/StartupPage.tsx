import { EditOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useCurrentUser } from '../features/auth/api/useCurrentUser';
import { useStartupDetail } from '../features/startups/api/useStartups';
import { StartupHero } from '../features/startups/components/StartupHero';
import { VacancyCard } from '../components/ui/VacancyCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageHeader } from '../components/layout/PageHeader';
import { palette } from '../theme/tokens';

export const StartupPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { data: currentUser } = useCurrentUser();
  const { data: startup, isLoading, isError, error, refetch } = useStartupDetail(id);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton active avatar={{ size: 120, shape: 'square' }} paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (isError || !startup) {
    return (
      <ErrorState
        message={extractErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const isOwner = currentUser?.id === startup.owner.id;
  const visibleVacancies = startup.vacancies.filter((vacancy) => isOwner || !vacancy.isHidden);

  return (
    <div>
      <PageHeader
        title="Стартап"
        showBack
        backFallback="/startup"
        extra={
          isOwner ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/startup/${startup.id}/edit`)}
            >
              Редактировать
            </Button>
          ) : null
        }
      />

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StartupHero startup={startup} compact />
          <section
            style={{
              padding: 18,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 10, fontSize: 15, fontWeight: 600 }}>
              О проекте
            </h2>
            <p style={{ margin: 0, color: palette.textSecondary, fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {startup.description}
            </p>
          </section>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 24 }}>
          <StartupHero startup={startup} />
          <section
            style={{
              padding: 22,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              О проекте
            </h2>
            <p style={{ margin: 0, color: palette.textSecondary, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {startup.description}
            </p>
          </section>
        </div>
      )}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700 }}>Вакансии</h2>
        {visibleVacancies.length === 0 ? (
          <EmptyState
            title="Вакансий пока нет"
            description={
              isOwner
                ? 'Добавьте вакансии в редакторе стартапа.'
                : 'Автор ещё не опубликовал открытые роли.'
            }
            actionLabel={isOwner ? 'Редактировать стартап' : undefined}
            onAction={isOwner ? () => navigate(`/startup/${startup.id}/edit`) : undefined}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {visibleVacancies.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                vacancy={{
                  id: vacancy.id,
                  startupId: startup.id,
                  startupTitle: startup.title,
                  startupLogoUrl: startup.logoUrl,
                  title: vacancy.title,
                  applicationsCount: vacancy.applicationsCount,
                  viewsCount: vacancy.viewsCount,
                  isHidden: vacancy.isHidden,
                  createdAt: vacancy.createdAt,
                }}
                onOpen={(vacancyId) => navigate(`/vacancy/${vacancyId}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
