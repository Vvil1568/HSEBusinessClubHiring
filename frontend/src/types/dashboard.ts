import type { Application, VacancyListItem } from './vacancy';
import type { StartupSummary } from './startup';
import type { UserProfile } from './auth';

export interface ProfileDashboard {
  user: UserProfile;
  recentStartups: StartupSummary[];
  myVacancies: VacancyListItem[];
  myApplications: Application[];
  totals: {
    startups: number;
    vacancies: number;
    applications: number;
  };
}
