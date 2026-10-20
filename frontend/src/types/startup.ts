import type { Applicant } from './auth';
import type { PaginationParams } from './api';
import type { Vacancy } from './vacancy';

export type StartupStage = 'idea' | 'mvp' | 'scaling';

export interface StartupRef {
  id: string;
  title: string;
  logoUrl: string | null;
  stage: StartupStage;
}

export interface StartupSummary extends StartupRef {
  shortDescription: string;
  owner: Applicant;
  createdAt: string;
  updatedAt: string;
  vacanciesCount: number;
  applicationsCount: number;
  viewsCount: number;
}

export interface Startup extends StartupSummary {
  description: string;
  vacancies: Vacancy[];
}

export interface VacancyInput {
  id?: string;
  title: string;
  description: string;
  requirements: string;
  reward: string;
  isHidden: boolean;
}

export interface StartupInput {
  title: string;
  shortDescription: string;
  description: string;
  logoUrl: string | null;
  stage: StartupStage;
  vacancies: VacancyInput[];
}

export interface StartupListQuery extends PaginationParams {
  search?: string;
  ownerId?: string;
}
