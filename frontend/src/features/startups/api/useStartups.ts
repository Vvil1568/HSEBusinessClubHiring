import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type {
  PaginatedResult,
  Startup,
  StartupInput,
  StartupListQuery,
  StartupSummary,
} from '../../../types';

const fetchStartupList = async (
  query: StartupListQuery,
): Promise<PaginatedResult<StartupSummary>> => {
  const response = await api.get<PaginatedResult<StartupSummary>>('/startups', {
    params: query,
  });
  return response.data;
};

const fetchStartup = async (id: string): Promise<Startup> => {
  const response = await api.get<Startup>(`/startups/${id}`);
  return response.data;
};

export const useStartupList = (query: StartupListQuery) =>
  useQuery({
    queryKey: queryKeys.startups.list(query),
    queryFn: () => fetchStartupList(query),
  });

export const useStartupDetail = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.startups.detail(id ?? ''),
    queryFn: () => fetchStartup(id ?? ''),
    enabled: Boolean(id),
  });

interface SaveStartupVariables {
  id?: string;
  payload: StartupInput;
}

const saveStartup = async ({ id, payload }: SaveStartupVariables): Promise<Startup> => {
  if (id) {
    const response = await api.put<Startup>(`/startups/${id}`, payload);
    return response.data;
  }
  const response = await api.post<Startup>('/startups', payload);
  return response.data;
};

export const useSaveStartup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveStartup,
    onSuccess: (startup) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.startups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vacancies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.setQueryData(queryKeys.startups.detail(startup.id), startup);
    },
  });
};
