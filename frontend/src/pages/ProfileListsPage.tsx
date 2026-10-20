import { Skeleton } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  useMyApplications,
  useOwnedStartups,
  useOwnedVacancies,
} from '../features/profile/api/useProfileLists';
import { StartupCard } from '../components/ui/StartupCard';
import { VacancyCard } from '../components/ui/VacancyCard';
import { ApplicationCard } from '../components/ui/ApplicationCard';
import { PaginationBar } from '../components/ui/PaginationBar';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ListSkeleton, StartupsGridSkeleton } from '../components/common/Skeletons';
import { PageHeader } from '../components/layout/PageHeader';

type ProfileListKind = 'startups' | 'vacancies' | 'applications';

interface ProfileListsPageProps {
  kind: ProfileListKind;
}

const PAGE_SIZE = 10;

const titles: Record<ProfileListKind, { title: string; subtitle: string }> = {
  startups: {
    title: 'Мои стартапы',
    subtitle: 'Все проекты, где вы являетесь автором',
  },
  vacancies: {
    title: 'Мои вакансии',
    subtitle: 'Все вакансии во всех ваших стартапах',
  },
  applications: {
    title: 'Мои отклики',
    subtitle: 'История ваших откликов на вакансии клуба',
  },
};

export const ProfileListsPage = ({ kind }: ProfileListsPageProps) => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [page, setPage] = useState(1);

  const startupsQuery = useOwnedStartups();
  const vacanciesQuery = useOwnedVacancies();
  const applicationsQuery = useMyApplications({ page, pageSize: PAGE_SIZE });

  const header = titles[kind];

  const renderContent = () => {
    if (kind === 'startups') {
      if (startupsQuery.isLoading) return <StartupsGridSkeleton count={6} />;
      if (startupsQuery.isError) {
        return (
          <ErrorState
            message={extractErrorMessage(startupsQuery.error)}
            onRetry={() => {
              void startupsQuery.refetch();
            }}
          />
        );
      }
      if (!startupsQuery.data || startupsQuery.data.length === 0) {
        return (
          <EmptyState
            title="Стартапов нет"
            description="Создайте первый проект, чтобы он появился здесь."
            actionLabel="Создать стартап"
            onAction={() => navigate('/startups/new')}
          />
        );
      }
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {startupsQuery.data.map((startup) => (
            <StartupCard
              key={startup.id}
              startup={startup}
              onOpen={(startupId) => navigate(`/startup/${startupId}`)}
            />
          ))}
        </div>
      );
    }

    if (kind === 'vacancies') {
      if (vacanciesQuery.isLoading) return <ListSkeleton count={5} />;
      if (vacanciesQuery.isError) {
        return (
          <ErrorState
            message={extractErrorMessage(vacanciesQuery.error)}
            onRetry={() => {
              void vacanciesQuery.refetch();
            }}
          />
        );
      }
      const items = vacanciesQuery.data?.items ?? [];
      if (items.length === 0) {
        return (
          <EmptyState
            title="Вакансий нет"
            description="Добавьте вакансии в один из своих стартапов."
            actionLabel="Перейти к стартапам"
            onAction={() => navigate('/profile/startups')}
          />
        );
      }
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {items.map((vacancy) => (
            <VacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              onOpen={(vacancyId) => navigate(`/vacancy/${vacancyId}`)}
              showApplicantsAlert
            />
          ))}
        </div>
      );
    }

    if (applicationsQuery.isLoading) return <ListSkeleton count={5} />;
    if (applicationsQuery.isError) {
      return (
        <ErrorState
          message={extractErrorMessage(applicationsQuery.error)}
          onRetry={() => {
            void applicationsQuery.refetch();
          }}
        />
      );
    }

    const applications = applicationsQuery.data;
    if (!applications || applications.items.length === 0) {
      return (
        <EmptyState
          title="Откликов нет"
          description="Найдите интересную роль и откликнитесь."
          actionLabel="Смотреть вакансии"
          onAction={() => navigate('/vacancies')}
        />
      );
    }

    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.items.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onOpen={(vacancyId) => navigate(`/vacancy/${vacancyId}`)}
            />
          ))}
        </div>
        <PaginationBar
          page={applications.page}
          pageSize={applications.pageSize}
          total={applications.total}
          onChange={setPage}
        />
      </>
    );
  };

  return (
    <div>
      <PageHeader title={header.title} subtitle={header.subtitle} showBack backFallback="/profile" />
      {renderContent()}
      {kind === 'applications' && applicationsQuery.isFetching ? (
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 1 }} title={false} />
        </div>
      ) : null}
    </div>
  );
};
