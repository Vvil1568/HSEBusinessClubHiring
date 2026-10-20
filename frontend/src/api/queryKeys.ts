import type {
  StartupListQuery,
  VacancyListQuery,
} from '../types';

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  profile: {
    all: ['profile'] as const,
    dashboard: () => [...queryKeys.profile.all, 'dashboard'] as const,
  },
  startups: {
    all: ['startups'] as const,
    list: (query: StartupListQuery) => [...queryKeys.startups.all, 'list', query] as const,
    detail: (id: string) => [...queryKeys.startups.all, 'detail', id] as const,
  },
  vacancies: {
    all: ['vacancies'] as const,
    list: (query: VacancyListQuery) => [...queryKeys.vacancies.all, 'list', query] as const,
    detail: (id: string) => [...queryKeys.vacancies.all, 'detail', id] as const,
    stats: (id: string) => [...queryKeys.vacancies.all, 'stats', id] as const,
    titles: () => [...queryKeys.vacancies.all, 'titles'] as const,
    templates: () => [...queryKeys.vacancies.all, 'templates'] as const,
  },
  applications: {
    all: ['applications'] as const,
    mine: () => [...queryKeys.applications.all, 'mine'] as const,
    inbox: () => [...queryKeys.applications.all, 'inbox'] as const,
  },
};
