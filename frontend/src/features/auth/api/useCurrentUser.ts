import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type { Applicant } from '../../../types';

const fetchCurrentUser = async (): Promise<Applicant> => {
  const response = await api.get<Applicant>('/auth/me');
  return response.data;
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  });
