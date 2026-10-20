import type { PaginationParams } from './api';
import type { Applicant } from './auth';
import type { StartupRef } from './startup';

export type ApplicationStatus = 'pending' | 'rejected' | 'approved';
export type VacancySort = 'new' | 'views' | 'applications';

export interface Vacancy {
  id: string;
  startupId: string;
  title: string;
  description: string;
  requirements: string;
  reward: string;
  isHidden: boolean;
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VacancyListItem {
  id: string;
  startupId: string;
  startupTitle: string;
  startupLogoUrl: string | null;
  title: string;
  applicationsCount: number;
  viewsCount: number;
  isHidden: boolean;
  createdAt: string;
}

export interface VacancyDetails extends Vacancy {
  startup: StartupRef;
  myApplicationStatus: ApplicationStatus | null;
  isOwner: boolean;
}

export interface VacancyListQuery extends PaginationParams {
  search?: string;
  titles?: string[];
  sortBy?: VacancySort;
  ownerId?: string;
}

export interface ApplicationFile {
  id: string;
  name: string;
  size: number;
  url: string | null;
}

export interface Application {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  startupId: string;
  startupTitle: string;
  startupLogoUrl: string | null;
  applicant: Applicant;
  motivation: string;
  files: ApplicationFile[];
  status: ApplicationStatus;
  createdAt: string;
}

export interface ApplyInput {
  motivation: string;
  files: ApplicationFile[];
}

export interface DailyActivityPoint {
  date: string;
  views: number;
  applications: number;
}

export interface VacancyViewer {
  user: Applicant;
  viewedAt: string;
}

export interface VacancyStats {
  vacancyId: string;
  vacancyTitle: string;
  startupTitle: string;
  startupLogoUrl: string | null;
  totalViews: number;
  totalApplications: number;
  daily: DailyActivityPoint[];
  viewers: VacancyViewer[];
  applications: Application[];
}

export interface VacancyTemplate {
  id: string;
  title: string;
  description: string;
  requirements: string;
  reward: string;
}
