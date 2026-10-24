import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type { AppConfig } from '../../../types';

/**
 * Public runtime flags.
 *
 * `production` decides whether the browser demo button exists at all, and
 * `devMode` decides whether the DEV user switcher is mounted. Both come from the
 * backend so the bundle cannot drift from the deployed environment.
 */
const fetchAppConfig = async (): Promise<AppConfig> => {
  const response = await api.get<AppConfig>('/auth/app-config');
  return response.data;
};

export const useAppConfig = () =>
  useQuery({
    queryKey: queryKeys.auth.appConfig(),
    queryFn: fetchAppConfig,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
