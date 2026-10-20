import type {
  Applicant,
  Application,
  Startup,
  StartupSummary,
  UserProfile,
  Vacancy,
  VacancyListItem,
} from '../../types';
import { buildSeedDatabase } from './seedData';
import type { DbApplication, DbStartup, DbUser, DbVacancy, MockDatabase } from './types';

const STORAGE_KEY = 'expert-clinic:mock-db';
const SCHEMA_VERSION = 1;

const loadDatabase = (): MockDatabase => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase;
      if (parsed.version === SCHEMA_VERSION && Array.isArray(parsed.startups)) {
        return parsed;
      }
    }
  } catch {
    // Corrupted or unavailable storage falls back to the deterministic seed.
  }

  const seeded = buildSeedDatabase();
  persistDatabase(seeded);
  return seeded;
};

export const persistDatabase = (database: MockDatabase): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // The in-memory copy keeps the session functional without persistence.
  }
};

const database: MockDatabase = loadDatabase();

export const getDatabase = (): MockDatabase => database;

export const mutateDatabase = <TValue,>(mutator: (db: MockDatabase) => TValue): TValue => {
  const result = mutator(database);
  persistDatabase(database);
  return result;
};

export const getCurrentUser = (): DbUser => {
  const user = database.users.find((item) => item.id === database.currentUserId);
  if (!user) {
    throw new Error('Текущий пользователь не найден');
  }
  return user;
};

export const toApplicant = (user: DbUser): Applicant => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  nick: user.nick,
  avatarUrl: user.avatarUrl,
});

export const findStartup = (id: string): DbStartup | undefined =>
  database.startups.find((item) => item.id === id);

export const findVacancy = (id: string): DbVacancy | undefined =>
  database.vacancies.find((item) => item.id === id);

export const getVacancyApplications = (vacancyId: string): DbApplication[] =>
  database.applications.filter((item) => item.vacancyId === vacancyId);

export const getStartupVacancies = (startupId: string): DbVacancy[] =>
  database.vacancies.filter((item) => item.startupId === startupId);

export const getVacancyViews = (vacancyId: string): number =>
  database.views.filter((item) => item.vacancyId === vacancyId).length;

export const toVacancy = (vacancy: DbVacancy): Vacancy => ({
  id: vacancy.id,
  startupId: vacancy.startupId,
  title: vacancy.title,
  description: vacancy.description,
  requirements: vacancy.requirements,
  reward: vacancy.reward,
  isHidden: vacancy.isHidden,
  viewsCount: getVacancyViews(vacancy.id),
  applicationsCount: getVacancyApplications(vacancy.id).length,
  createdAt: vacancy.createdAt,
  updatedAt: vacancy.updatedAt,
});

export const toVacancyListItem = (vacancy: DbVacancy): VacancyListItem => {
  const startup = findStartup(vacancy.startupId);
  return {
    id: vacancy.id,
    startupId: vacancy.startupId,
    startupTitle: startup?.title ?? 'Неизвестный стартап',
    startupLogoUrl: startup?.logoUrl ?? null,
    title: vacancy.title,
    applicationsCount: getVacancyApplications(vacancy.id).length,
    viewsCount: getVacancyViews(vacancy.id),
    isHidden: vacancy.isHidden,
    createdAt: vacancy.createdAt,
  };
};

export const toStartupSummary = (startup: DbStartup): StartupSummary => {
  const vacancies = getStartupVacancies(startup.id);
  const applicationsCount = vacancies.reduce(
    (total, vacancy) => total + getVacancyApplications(vacancy.id).length,
    0,
  );
  const viewsCount = vacancies.reduce(
    (total, vacancy) => total + getVacancyViews(vacancy.id),
    0,
  );

  return {
    id: startup.id,
    title: startup.title,
    logoUrl: startup.logoUrl,
    stage: startup.stage,
    shortDescription: startup.shortDescription,
    owner: toApplicant(getCurrentUserOrFallback(startup.ownerId)),
    createdAt: startup.createdAt,
    updatedAt: startup.updatedAt,
    vacanciesCount: vacancies.filter((vacancy) => !vacancy.isHidden).length,
    applicationsCount,
    viewsCount,
  };
};

const getCurrentUserOrFallback = (userId: string): DbUser => {
  const user = database.users.find((item) => item.id === userId);
  return user ?? getCurrentUser();
};

export const toApplication = (application: DbApplication): Application => {
  const vacancy = findVacancy(application.vacancyId);
  const startup = vacancy ? findStartup(vacancy.startupId) : undefined;
  const applicant = database.users.find((item) => item.id === application.applicantId);

  return {
    id: application.id,
    vacancyId: application.vacancyId,
    vacancyTitle: vacancy?.title ?? 'Вакансия удалена',
    startupId: startup?.id ?? '',
    startupTitle: startup?.title ?? 'Стартап удалён',
    startupLogoUrl: startup?.logoUrl ?? null,
    applicant: applicant
      ? toApplicant(applicant)
      : { id: application.applicantId, firstName: 'Пользователь', lastName: '', nick: 'unknown', avatarUrl: null },
    motivation: application.motivation,
    files: application.files,
    status: application.status,
    createdAt: application.createdAt,
  };
};

export const toStartup = (startup: DbStartup): Startup => ({
  ...toStartupSummary(startup),
  description: startup.description,
  vacancies: getStartupVacancies(startup.id).map(toVacancy),
});

export const toUserProfile = (user: DbUser): UserProfile => {
  const startups = database.startups.filter((item) => item.ownerId === user.id);
  const vacancies = database.vacancies.filter((vacancy) =>
    startups.some((startup) => startup.id === vacancy.startupId),
  );
  const applications = database.applications.filter((item) => item.applicantId === user.id);

  return {
    ...toApplicant(user),
    email: user.email,
    position: user.position,
    company: user.company,
    startupsCount: startups.length,
    vacanciesCount: vacancies.length,
    applicationsCount: applications.length,
  };
};

