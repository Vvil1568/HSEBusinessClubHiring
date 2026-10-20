import { Segmented } from 'antd';
import type { ProfileDashboard } from '../../../types';
import { palette } from '../../../theme/tokens';
import { ApplicationCard } from '../../../components/ui/ApplicationCard';
import { StartupCard } from '../../../components/ui/StartupCard';
import { VacancyCard } from '../../../components/ui/VacancyCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { SectionLink } from '../../../components/common/SectionLink';
import { ProfileSidebar } from './ProfileSidebar';

export type ProfileTab = 'startups' | 'vacancies' | 'applications';

interface ProfileMobileProps {
  dashboard: ProfileDashboard;
  tab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  onOpenStartup: (id: string) => void;
  onOpenVacancy: (id: string) => void;
}

export const ProfileMobile = ({
  dashboard,
  tab,
  onTabChange,
  onOpenStartup,
  onOpenVacancy,
}: ProfileMobileProps) => {
  const { user, recentStartups, myVacancies, myApplications, totals } = dashboard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ProfileSidebar user={user} totals={totals} compact />

      <Segmented<ProfileTab>
        block
        value={tab}
        onChange={(value) => onTabChange(value)}
        options={[
          { label: 'Стартапы', value: 'startups' },
          { label: 'Вакансии', value: 'vacancies' },
          { label: 'Отклики', value: 'applications' },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'startups' ? (
          recentStartups.length === 0 ? (
            <EmptyState title="Стартапов пока нет" description="Создайте первый стартап." />
          ) : (
            recentStartups.map((startup) => (
              <StartupCard key={startup.id} startup={startup} onOpen={onOpenStartup} compact />
            ))
          )
        ) : null}

        {tab === 'vacancies' ? (
          myVacancies.length === 0 ? (
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
          )
        ) : null}

        {tab === 'applications' ? (
          myApplications.length === 0 ? (
            <EmptyState title="Откликов нет" description="Откликнитесь на вакансию стартапа." />
          ) : (
            myApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onOpen={onOpenVacancy}
                compact
              />
            ))
          )
        ) : null}
      </div>

      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <SectionLink
          label="посмотреть все"
          to={
            tab === 'startups'
              ? '/profile/startups'
              : tab === 'vacancies'
                ? '/profile/vacancies'
                : '/profile/applications'
          }
        />
      </div>

      <div style={{ height: 1, background: palette.borderSoft }} />
    </div>
  );
};
