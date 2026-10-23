import { useQuery } from '@tanstack/react-query';
import { api, getAuthSession } from '../../../api/client';
import { queryKeys } from '../../../api/queryKeys';
import type { Applicant } from '../../../types';

const fetchCurrentUser = async (): Promise<Applicant> => {
  const response = await api.get<Applicant>('/auth/me');
  return response.data;
};

/**
 * Current user profile. The session is time-limited (see `expiresAt` from
 * `POST /auth/telegram`), so the profile must not be cached forever; a `401`
 * puts the app back into the "restart Mini App" state.
 */
export const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchCurrentUser,
    enabled: getAuthSession().authenticated,
    staleTime: 1000 * 60 * 5,
  });
