import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type {
  Application,
  ApplicationStatus,
  ApplyInput,
  PaginatedResult,
  VacancyDetails,
  VacancyListItem,
  VacancyListQuery,
  VacancyStats,
  VacancyTemplate,
} from '../../../types';

const fetchVacancyList = async (
  query: VacancyListQuery,
): Promise<PaginatedResult<VacancyListItem>> => {
  const response = await api.get<PaginatedResult<VacancyListItem>>('/vacancies', {
    params: query,
  });
  return response.data;
};

const fetchVacancy = async (id: string): Promise<VacancyDetails> => {
  const response = await api.get<VacancyDetails>(`/vacancies/${id}`);
  return response.data;
};

const fetchTitles = async (): Promise<string[]> => {
  const response = await api.get<string[]>('/vacancies/titles');
  return response.data;
};

const fetchTemplates = async (): Promise<VacancyTemplate[]> => {
  const response = await api.get<VacancyTemplate[]>('/vacancies/templates');
  return response.data;
};

const fetchStats = async (id: string): Promise<VacancyStats> => {
  const response = await api.get<VacancyStats>(`/vacancies/${id}/stats`);
  return response.data;
};

export const useVacancyList = (query: VacancyListQuery) =>
  useQuery({
    queryKey: queryKeys.vacancies.list(query),
    queryFn: () => fetchVacancyList(query),
  });

export const useVacancyDetail = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.vacancies.detail(id ?? ''),
    queryFn: () => fetchVacancy(id ?? ''),
    enabled: Boolean(id),
  });

export const useVacancyTitles = () =>
  useQuery({
    queryKey: queryKeys.vacancies.titles(),
    queryFn: fetchTitles,
    staleTime: Infinity,
  });

export const useVacancyTemplates = () =>
  useQuery({
    queryKey: queryKeys.vacancies.templates(),
    queryFn: fetchTemplates,
    staleTime: Infinity,
  });

export const useVacancyStats = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.vacancies.stats(id ?? ''),
    queryFn: () => fetchStats(id ?? ''),
    enabled: Boolean(id),
  });

export const useRegisterVacancyView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ tracked: boolean }> => {
      const response = await api.post<{ tracked: boolean }>(`/vacancies/${vacancyId}/view`);
      return response.data;
    },
    onSuccess: (_result, vacancyId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.stats(vacancyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
};

export const useApplyToVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      vacancyId: string;
      payload: ApplyInput;
    }): Promise<Application> => {
      const response = await api.post<Application>(
        `/vacancies/${variables.vacancyId}/apply`,
        variables.payload,
      );
      return response.data;
    },
    onSuccess: (_application, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.detail(variables.vacancyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
};

export const useUpdateApplicationStatus = (vacancyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      applicationId: string;
      status: ApplicationStatus;
    }): Promise<Application> => {
      const response = await api.patch<Application>(
        `/applications/${variables.applicationId}/status`,
        { status: variables.status },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.stats(vacancyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
};
