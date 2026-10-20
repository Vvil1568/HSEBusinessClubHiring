import type { ProfileDashboard } from '../../../types';
import { palette } from '../../../theme/tokens';
import { ApplicationCard } from '../../../components/ui/ApplicationCard';
import { StartupCard } from '../../../components/ui/StartupCard';
import { VacancyCard } from '../../../components/ui/VacancyCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { SectionLink } from '../../../components/common/SectionLink';
import { ProfileSidebar } from './ProfileSidebar';

interface ProfileDesktopProps {
  dashboard: ProfileDashboard;
  onOpenStartup: (id: string) => void;
  onOpenVacancy: (id: string) => void;
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
} as const;

export const ProfileDesktop = ({
  dashboard,
  onOpenStartup,
  onOpenVacancy,
}: ProfileDesktopProps) => {
  const { user, recentStartups, myVacancies, myApplications, totals } = dashboard;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 24 }}>
      <ProfileSidebar user={user} totals={totals} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section
          style={{
            padding: 20,
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.surface,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: palette.text }}>
            Последние изменённые стартапы
          </h2>
          <div style={{ marginTop: 14 }}>
            {recentStartups.length === 0 ? (
              <EmptyState
                title="Стартапов пока нет"
                description="Создайте первый стартап, чтобы он появился в личном кабинете."
              />
            ) : (
              <div style={gridStyle}>
                {recentStartups.slice(0, 6).map((startup) => (
                  <StartupCard key={startup.id} startup={startup} onOpen={onOpenStartup} compact />
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <SectionLink label="Посмотреть все..." to="/profile/startups" />
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
          <section
            style={{
              padding: 18,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: palette.text }}>
              Мои вакансии
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {myVacancies.length === 0 ? (
                <EmptyState title="Вакансий нет" description="Добавьте вакансии в стартап." />
              ) : (
                myVacancies.map((vacancy) => (
                  <VacancyCard
                    key={vacancy.id}
                    vacancy={vacancy}
                    onOpen={onOpenVacancy}
                    showApplicantsAlert
                  />
                ))
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <SectionLink label="Посмотреть все..." to="/profile/vacancies" />
            </div>
          </section>

          <section
            style={{
              padding: 18,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: palette.text }}>
              Мои отклики
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {myApplications.length === 0 ? (
                <EmptyState title="Откликов нет" description="Откликнитесь на вакансию стартапа." />
              ) : (
                myApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onOpen={onOpenVacancy}
                  />
                ))
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <SectionLink label="Посмотреть все..." to="/profile/applications" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
