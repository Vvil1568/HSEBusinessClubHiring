import type {
  Application,
  ApplicationStatus,
  ApplyInput,
  DailyActivityPoint,
  PaginatedResult,
  ProfileDashboard,
  Startup,
  StartupInput,
  StartupSummary,
  VacancyDetails,
  VacancyListItem,
  VacancySort,
  VacancyStats,
  VacancyTemplate,
  VacancyViewer,
} from '../../types';
import { buildLogoDataUri } from '../../utils/logo';
import {
  findStartup,
  findVacancy,
  getCurrentUser,
  getDatabase,
  getStartupVacancies,
  getVacancyApplications,
  getVacancyViews,
  mutateDatabase,
  toApplicant,
  toApplication,
  toStartup,
  toStartupSummary,
  toUserProfile,
  toVacancy,
  toVacancyListItem,
} from './db';
import type { DbApplication, DbVacancy } from './types';

export interface MockResult {
  status: number;
  data: unknown;
}

export class MockHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type QueryParams = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',');
  }
  return [];
};

const paginate = <TItem,>(
  items: TItem[],
  page: number,
  pageSize: number,
): PaginatedResult<TItem> => {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
};

const sortByDateDesc = (a: string, b: string): number =>
  new Date(b).getTime() - new Date(a).getTime();

const getOwnedStartupIds = (): string[] =>
  getDatabase()
    .startups.filter((startup) => startup.ownerId === getCurrentUser().id)
    .map((startup) => startup.id);

const assertOwnedStartup = (startupId: string): void => {
  const startup = findStartup(startupId);
  if (!startup) {
    throw new MockHttpError(404, 'Стартап не найден');
  }
  if (startup.ownerId !== getCurrentUser().id) {
    throw new MockHttpError(403, 'Недостаточно прав для изменения этого стартапа');
  }
};

const assertOwnedVacancy = (vacancyId: string): DbVacancy => {
  const vacancy = findVacancy(vacancyId);
  if (!vacancy) {
    throw new MockHttpError(404, 'Вакансия не найдена');
  }
  const startup = findStartup(vacancy.startupId);
  if (startup?.ownerId !== getCurrentUser().id) {
    throw new MockHttpError(403, 'Статистика доступна только владельцу стартапа');
  }
  return vacancy;
};

const listStartups = (query: QueryParams): PaginatedResult<StartupSummary> => {
  const search = toText(query.search).toLowerCase();
  const ownerId = toText(query.ownerId);

  const items = getDatabase()
    .startups.filter((startup) => {
      if (ownerId && startup.ownerId !== ownerId) return false;
      if (!search) return true;
      return (
        startup.title.toLowerCase().includes(search) ||
        startup.shortDescription.toLowerCase().includes(search) ||
        startup.description.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => sortByDateDesc(a.updatedAt, b.updatedAt))
    .map(toStartupSummary);

  return paginate(items, toNumber(query.page, 1), toNumber(query.pageSize, 6));
};

const buildVacancyList = (query: QueryParams): VacancyListItem[] => {
  const search = toText(query.search).toLowerCase();
  const titles = toStringArray(query.titles).map((item) => item.toLowerCase());
  const ownerId = toText(query.ownerId);
  const sortBy = (toText(query.sortBy) || 'new') as VacancySort;

  const ownedIds = ownerId ? getOwnedStartupIds() : null;

  const items = getDatabase()
    .vacancies.filter((vacancy) => {
      const startup = findStartup(vacancy.startupId);
      if (!startup) return false;
      if (vacancy.isHidden && !ownerId) return false;
      if (ownedIds && !ownedIds.includes(startup.id)) return false;
      if (titles.length > 0 && !titles.includes(vacancy.title.toLowerCase())) {
        return false;
      }
      if (!search) return true;
      return (
        startup.title.toLowerCase().includes(search) ||
        vacancy.requirements.toLowerCase().includes(search) ||
        vacancy.reward.toLowerCase().includes(search)
      );
    })
    .map(toVacancyListItem);

  if (sortBy === 'views') {
    items.sort((a, b) => b.viewsCount - a.viewsCount);
  } else if (sortBy === 'applications') {
    items.sort((a, b) => b.applicationsCount - a.applicationsCount);
  } else {
    items.sort((a, b) => sortByDateDesc(a.createdAt, b.createdAt));
  }

  return items;
};

const listVacancies = (query: QueryParams): PaginatedResult<VacancyListItem> =>
  paginate(buildVacancyList(query), toNumber(query.page, 1), toNumber(query.pageSize, 6));

const listVacancyTitles = (): string[] => {
  const unique = new Set<string>();
  getDatabase().vacancies.forEach((vacancy) => {
    if (!vacancy.isHidden) unique.add(vacancy.title);
  });
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
};

const getVacancyDetails = (vacancyId: string): VacancyDetails => {
  const vacancy = findVacancy(vacancyId);
  if (!vacancy) {
    throw new MockHttpError(404, 'Вакансия не найдена');
  }

  const startup = findStartup(vacancy.startupId);
  if (!startup) {
    throw new MockHttpError(404, 'Стартап не найден');
  }

  const currentUserId = getCurrentUser().id;
  const myApplication = getVacancyApplications(vacancyId).find(
    (application) => application.applicantId === currentUserId,
  );

  return {
    ...toVacancy(vacancy),
    startup: {
      id: startup.id,
      title: startup.title,
      logoUrl: startup.logoUrl,
      stage: startup.stage,
    },
    myApplicationStatus: myApplication?.status ?? null,
    isOwner: startup.ownerId === currentUserId,
  };
};

const buildDailyActivity = (
  vacancyId: string,
  applications: DbApplication[],
  days = 14,
): DailyActivityPoint[] => {
  const database = getDatabase();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      views: database.views.filter(
        (view) => view.vacancyId === vacancyId && view.viewedAt.slice(0, 10) === key,
      ).length,
      applications: applications.filter(
        (application) => application.createdAt.slice(0, 10) === key,
      ).length,
    };
  });
};

const getVacancyStats = (vacancyId: string): VacancyStats => {
  const vacancy = assertOwnedVacancy(vacancyId);
  const startup = findStartup(vacancy.startupId);
  const database = getDatabase();
  const applications = getVacancyApplications(vacancyId);

  const viewers: VacancyViewer[] = database.views
    .filter((view) => view.vacancyId === vacancyId)
    .sort((a, b) => sortByDateDesc(a.viewedAt, b.viewedAt))
    .map((view) => {
      const user = database.users.find((item) => item.id === view.userId);
      return user
        ? { user: toApplicant(user), viewedAt: view.viewedAt }
        : null;
    })
    .filter((item): item is VacancyViewer => item !== null)
    .slice(0, 20);

  return {
    vacancyId,
    vacancyTitle: vacancy.title,
    startupTitle: startup?.title ?? 'Стартап',
    startupLogoUrl: startup?.logoUrl ?? null,
    totalViews: getVacancyViews(vacancyId),
    totalApplications: applications.length,
    daily: buildDailyActivity(vacancyId, applications),
    viewers,
    applications: applications
      .sort((a, b) => sortByDateDesc(a.createdAt, b.createdAt))
      .map(toApplication),
  };
};

const getProfileDashboard = (): ProfileDashboard => {
  const user = getCurrentUser();
  const database = getDatabase();
  const ownedStartups = database.startups.filter((startup) => startup.ownerId === user.id);
  const ownedIds = ownedStartups.map((startup) => startup.id);

  const myVacancies = database.vacancies
    .filter((vacancy) => ownedIds.includes(vacancy.startupId))
    .map(toVacancyListItem)
    .sort((a, b) => {
      const diff = b.applicationsCount - a.applicationsCount;
      return diff !== 0 ? diff : b.viewsCount - a.viewsCount;
    })
    .slice(0, 5);

  const myApplications = database.applications
    .filter((application) => application.applicantId === user.id)
    .sort((a, b) => sortByDateDesc(a.createdAt, b.createdAt))
    .slice(0, 5)
    .map(toApplication);

  const recentStartups = ownedStartups
    .slice()
    .sort((a, b) => sortByDateDesc(a.updatedAt, b.updatedAt))
    .slice(0, 6)
    .map(toStartupSummary);

  const profile = toUserProfile(user);

  return {
    user: profile,
    recentStartups,
    myVacancies,
    myApplications,
    totals: {
      startups: profile.startupsCount,
      vacancies: profile.vacanciesCount,
      applications: profile.applicationsCount,
    },
  };
};

const findPrimaryVacancyTitle = (payload: StartupInput): string =>
  payload.vacancies[0]?.title ?? 'Команда проекта';

const createStartup = (payload: StartupInput): Startup => {
  const user = getCurrentUser();
  const now = new Date().toISOString();
  const startupId = `s-${Date.now()}`;
  const logoUrl =
    payload.logoUrl ??
    buildLogoDataUri(payload.title.slice(0, 1).toUpperCase() || 'S', '#2563EB', '#7C3AED');

  return mutateDatabase((database) => {
    database.startups.push({
      id: startupId,
      title: payload.title,
      shortDescription: payload.shortDescription,
      description: payload.description,
      logoUrl,
      stage: payload.stage,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    });

    payload.vacancies.forEach((vacancy, index) => {
      database.vacancies.push({
        id: `v-${Date.now()}-${index}`,
        startupId,
        title: vacancy.title || findPrimaryVacancyTitle(payload),
        description: vacancy.description,
        requirements: vacancy.requirements,
        reward: vacancy.reward,
        isHidden: vacancy.isHidden,
        createdAt: now,
        updatedAt: now,
      });
    });

    const startup = findStartup(startupId);
    if (!startup) {
      throw new MockHttpError(500, 'Не удалось создать стартап');
    }
    return toStartup(startup);
  });
};

const updateStartup = (startupId: string, payload: StartupInput): Startup => {
  assertOwnedStartup(startupId);

  return mutateDatabase((database) => {
    const startup = database.startups.find((item) => item.id === startupId);
    if (!startup) {
      throw new MockHttpError(404, 'Стартап не найден');
    }

    const now = new Date().toISOString();
    startup.title = payload.title;
    startup.shortDescription = payload.shortDescription;
    startup.description = payload.description;
    startup.stage = payload.stage;
    if (payload.logoUrl) startup.logoUrl = payload.logoUrl;
    startup.updatedAt = now;

    const existing = database.vacancies.filter((vacancy) => vacancy.startupId === startupId);
    const keptIds = new Set<string>();

    payload.vacancies.forEach((vacancyInput, index) => {
      if (vacancyInput.id) {
        const target = existing.find((vacancy) => vacancy.id === vacancyInput.id);
        if (!target) return;
        keptIds.add(target.id);
        target.title = vacancyInput.title || findPrimaryVacancyTitle(payload);
        target.description = vacancyInput.description;
        target.requirements = vacancyInput.requirements;
        target.reward = vacancyInput.reward;
        target.isHidden = vacancyInput.isHidden;
        target.updatedAt = now;
        return;
      }

      const newId = `v-${Date.now()}-${index}`;
      keptIds.add(newId);
      database.vacancies.push({
        id: newId,
        startupId,
        title: vacancyInput.title || findPrimaryVacancyTitle(payload),
        description: vacancyInput.description,
        requirements: vacancyInput.requirements,
        reward: vacancyInput.reward,
        isHidden: vacancyInput.isHidden,
        createdAt: now,
        updatedAt: now,
      });
    });

    database.vacancies = database.vacancies.filter(
      (vacancy) =>
        vacancy.startupId !== startupId || keptIds.has(vacancy.id),
    );

    const removedIds = existing
      .filter((vacancy) => !keptIds.has(vacancy.id))
      .map((vacancy) => vacancy.id);
    database.applications = database.applications.filter(
      (application) => !removedIds.includes(application.vacancyId),
    );
    database.views = database.views.filter((view) => !removedIds.includes(view.vacancyId));

    return toStartup(startup);
  });
};

const registerVacancyView = (vacancyId: string): { tracked: boolean } => {
  const vacancy = findVacancy(vacancyId);
  if (!vacancy) {
    throw new MockHttpError(404, 'Вакансия не найдена');
  }

  const userId = getCurrentUser().id;
  const todayKey = new Date().toISOString().slice(0, 10);

  return mutateDatabase((database) => {
    const alreadyTracked = database.views.some(
      (view) =>
        view.vacancyId === vacancyId &&
        view.userId === userId &&
        view.viewedAt.slice(0, 10) === todayKey,
    );

    if (alreadyTracked) {
      return { tracked: false };
    }

    database.views.push({
      vacancyId,
      userId,
      viewedAt: new Date().toISOString(),
    });
    return { tracked: true };
  });
};

const applyToVacancy = (vacancyId: string, payload: ApplyInput): Application => {
  const vacancy = findVacancy(vacancyId);
  if (!vacancy) {
    throw new MockHttpError(404, 'Вакансия не найдена');
  }

  if (!payload.motivation.trim()) {
    throw new MockHttpError(422, 'Добавьте мотивационное письмо');
  }

  const user = getCurrentUser();
  const existing = getVacancyApplications(vacancyId).find(
    (application) => application.applicantId === user.id,
  );
  if (existing) {
    throw new MockHttpError(409, 'Вы уже откликнулись на эту вакансию');
  }

  return mutateDatabase((database) => {
    const application: DbApplication = {
      id: `a-${Date.now()}`,
      vacancyId,
      applicantId: user.id,
      motivation: payload.motivation.trim(),
      files: payload.files,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    database.applications.push(application);
    return toApplication(application);
  });
};

const updateApplicationStatus = (
  applicationId: string,
  status: ApplicationStatus,
): Application => {
  const database = getDatabase();
  const target = database.applications.find((application) => application.id === applicationId);
  if (!target) {
    throw new MockHttpError(404, 'Отклик не найден');
  }

  const vacancy = findVacancy(target.vacancyId);
  const startup = vacancy ? findStartup(vacancy.startupId) : undefined;
  if (startup?.ownerId !== getCurrentUser().id) {
    throw new MockHttpError(403, 'Управлять откликом может только владелец стартапа');
  }

  return mutateDatabase((db) => {
    const application = db.applications.find((item) => item.id === applicationId);
    if (!application) {
      throw new MockHttpError(404, 'Отклик не найден');
    }
    application.status = status;
    return toApplication(application);
  });
};

const buildMyApplications = (): Application[] =>
  getDatabase()
    .applications.filter((application) => application.applicantId === getCurrentUser().id)
    .sort((a, b) => sortByDateDesc(a.createdAt, b.createdAt))
    .map(toApplication);

const buildInboxApplications = (): Application[] => {
  const ownedIds = getOwnedStartupIds();
  return getDatabase()
    .applications.filter((application) => {
      const vacancy = findVacancy(application.vacancyId);
      return vacancy ? ownedIds.includes(vacancy.startupId) : false;
    })
    .sort((a, b) => sortByDateDesc(a.createdAt, b.createdAt))
    .map(toApplication);
};

const listMyApplications = (query: QueryParams): PaginatedResult<Application> =>
  paginate(buildMyApplications(), toNumber(query.page, 1), toNumber(query.pageSize, 10));

const listInboxApplications = (query: QueryParams): PaginatedResult<Application> =>
  paginate(buildInboxApplications(), toNumber(query.page, 1), toNumber(query.pageSize, 10));

const listOwnedStartups = (): StartupSummary[] =>
  getDatabase()
    .startups.filter((startup) => startup.ownerId === getCurrentUser().id)
    .sort((a, b) => sortByDateDesc(a.updatedAt, b.updatedAt))
    .map(toStartupSummary);

export const resolveMockRequest = (
  method: string,
  path: string,
  query: QueryParams,
  body: unknown,
): MockResult => {
  const normalizedMethod = method.toLowerCase();
  const segments = path.replace(/^\/+|\/+$/g, '').split('/');

  if (normalizedMethod === 'get' && path === '/auth/me') {
    return { status: 200, data: toApplicant(getCurrentUser()) };
  }

  if (normalizedMethod === 'get' && path === '/profile/dashboard') {
    return { status: 200, data: getProfileDashboard() };
  }

  if (normalizedMethod === 'get' && path === '/startups') {
    return { status: 200, data: listStartups(query) };
  }

  if (normalizedMethod === 'post' && path === '/startups') {
    return { status: 201, data: createStartup(body as StartupInput) };
  }

  if (segments[0] === 'startups' && segments.length === 2) {
    const startupId = segments[1];
    if (normalizedMethod === 'get') {
      const startup = findStartup(startupId);
      if (!startup) throw new MockHttpError(404, 'Стартап не найден');
      return { status: 200, data: toStartup(startup) };
    }
    if (normalizedMethod === 'patch' || normalizedMethod === 'put') {
      return { status: 200, data: updateStartup(startupId, body as StartupInput) };
    }
  }

  if (normalizedMethod === 'get' && path === '/vacancies') {
    return { status: 200, data: listVacancies(query) };
  }

  if (normalizedMethod === 'get' && path === '/vacancies/titles') {
    return { status: 200, data: listVacancyTitles() };
  }

  if (normalizedMethod === 'get' && path === '/vacancies/templates') {
    return { status: 200, data: getDatabase().templates as VacancyTemplate[] };
  }

  if (segments[0] === 'vacancies' && segments.length === 2 && normalizedMethod === 'get') {
    return { status: 200, data: getVacancyDetails(segments[1]) };
  }

  if (
    segments[0] === 'vacancies' &&
    segments.length === 3 &&
    segments[2] === 'view' &&
    normalizedMethod === 'post'
  ) {
    return { status: 200, data: registerVacancyView(segments[1]) };
  }

  if (
    segments[0] === 'vacancies' &&
    segments.length === 3 &&
    segments[2] === 'stats' &&
    normalizedMethod === 'get'
  ) {
    return { status: 200, data: getVacancyStats(segments[1]) };
  }

  if (
    segments[0] === 'vacancies' &&
    segments.length === 3 &&
    segments[2] === 'apply' &&
    normalizedMethod === 'post'
  ) {
    return { status: 201, data: applyToVacancy(segments[1], body as ApplyInput) };
  }

  if (
    segments[0] === 'applications' &&
    segments.length === 3 &&
    segments[2] === 'status' &&
    normalizedMethod === 'patch'
  ) {
    const payload = body as { status: ApplicationStatus };
    return { status: 200, data: updateApplicationStatus(segments[1], payload.status) };
  }

  if (normalizedMethod === 'get' && path === '/applications/mine') {
    return { status: 200, data: listMyApplications(query) };
  }

  if (normalizedMethod === 'get' && path === '/applications/inbox') {
    return { status: 200, data: listInboxApplications(query) };
  }

  if (normalizedMethod === 'get' && path === '/profile/startups') {
    return { status: 200, data: listOwnedStartups() };
  }

  throw new MockHttpError(404, `Маршрут ${method.toUpperCase()} ${path} не найден`);
};

export const getOwnedStartupVacancyCount = (): number =>
  getOwnedStartupIds().reduce(
    (total, startupId) => total + getStartupVacancies(startupId).length,
    0,
  );
