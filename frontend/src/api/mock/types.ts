import type {
  ApplicationFile,
  ApplicationStatus,
  StartupStage,
  VacancyTemplate,
} from '../../types';

export interface DbUser {
  id: string;
  firstName: string;
  lastName: string;
  nick: string;
  avatarUrl: string | null;
  email: string;
  position: string;
  company: string | null;
}

export interface DbStartup {
  id: string;
  title: string;
  logoUrl: string | null;
  shortDescription: string;
  description: string;
  stage: StartupStage;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbVacancy {
  id: string;
  startupId: string;
  title: string;
  description: string;
  requirements: string;
  reward: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbApplication {
  id: string;
  vacancyId: string;
  applicantId: string;
  motivation: string;
  files: ApplicationFile[];
  status: ApplicationStatus;
  createdAt: string;
}

export interface DbView {
  vacancyId: string;
  userId: string;
  viewedAt: string;
}

export interface MockDatabase {
  version: number;
  currentUserId: string;
  users: DbUser[];
  startups: DbStartup[];
  vacancies: DbVacancy[];
  applications: DbApplication[];
  views: DbView[];
  templates: VacancyTemplate[];
}
