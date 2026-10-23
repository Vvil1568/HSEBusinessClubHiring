import type {
  ApplicationFile,
  ApplicationStatus,
  FileUploadScope,
  StartupStage,
  StoredFile,
  VacancyTemplate,
} from '../../types';

export interface DbStoredFile extends StoredFile {
  scope: FileUploadScope;
  /** Object key inside the storage bucket, e.g. `startup-logos/<uuid>`. */
  storageKey: string;
}

/**
 * Mock user. Mirrors `users` from the ERD: the platform stores Telegram data
 * only (id, first/last name, photo) and keeps no nick, email or position.
 */
export interface DbUser {
  id: string;
  telegramId: number;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
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

/** Bump when the shape changes, otherwise the stored snapshot is re-seeded. */
export const MOCK_DB_VERSION = 3;

export interface MockDatabase {
  version: number;
  currentUserId: string;
  users: DbUser[];
  startups: DbStartup[];
  vacancies: DbVacancy[];
  applications: DbApplication[];
  views: DbView[];
  templates: VacancyTemplate[];
  /** File metadata mirroring the backend file index. */
  files: DbStoredFile[];
}
