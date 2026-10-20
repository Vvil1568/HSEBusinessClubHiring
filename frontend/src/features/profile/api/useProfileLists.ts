import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type {
  Application,
  PaginatedResult,
  PaginationParams,
  StartupSummary,
  VacancyListItem,
} from '../../../types';

const fetchOwnedStartups = async (): Promise<StartupSummary[]> => {
  const response = await api.get<StartupSummary[]>('/profile/startups');
  return response.data;
};

const fetchOwnedVacancies = async (): Promise<PaginatedResult<VacancyListItem>> => {
  const response = await api.get<PaginatedResult<VacancyListItem>>('/vacancies', {
    params: { ownerId: 'me', page: 1, pageSize: 100 },
  });
  return response.data;
};

const fetchMyApplications = async (
  query: PaginationParams,
): Promise<PaginatedResult<Application>> => {
  const response = await api.get<PaginatedResult<Application>>('/applications/mine', {
    params: query,
  });
  return response.data;
};

export const useOwnedStartups = () =>
  useQuery({
    queryKey: [...queryKeys.profile.all, 'startups'],
    queryFn: fetchOwnedStartups,
  });

export const useOwnedVacancies = () =>
  useQuery({
    queryKey: [...queryKeys.profile.all, 'vacancies'],
    queryFn: fetchOwnedVacancies,
  });

export const useMyApplications = (query: PaginationParams) =>
  useQuery({
    queryKey: [...queryKeys.profile.all, 'applications', query],
    queryFn: () => fetchMyApplications(query),
  });
