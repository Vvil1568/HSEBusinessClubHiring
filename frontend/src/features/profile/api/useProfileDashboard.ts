import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type { ProfileDashboard } from '../../../types';

const fetchDashboard = async (): Promise<ProfileDashboard> => {
  const response = await api.get<ProfileDashboard>('/profile/dashboard');
  return response.data;
};

export const useProfileDashboard = () =>
  useQuery({
    queryKey: queryKeys.profile.dashboard(),
    queryFn: fetchDashboard,
  });
