import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useProfileDashboard } from '../features/profile/api/useProfileDashboard';
import { ProfileDesktop } from '../features/profile/components/ProfileDesktop';
import { ProfileMobile, type ProfileTab } from '../features/profile/components/ProfileMobile';
import { ListSkeleton, StartupsGridSkeleton } from '../components/common/Skeletons';
import { ErrorState } from '../components/common/ErrorState';

export const ProfilePage = () => {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ProfileTab>('startups');
  const { data, isLoading, isError, error, refetch } = useProfileDashboard();

  const handleOpenStartup = (id: string) => navigate(`/startup/${id}`);
  const handleOpenVacancy = (id: string) => navigate(`/vacancy/${id}`);

  if (isLoading) {
    return isMobile ? <ListSkeleton count={4} /> : <StartupsGridSkeleton count={6} />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={extractErrorMessage(error)}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isMobile ? (
        <ProfileMobile
          dashboard={data}
          tab={tab}
          onTabChange={setTab}
          onOpenStartup={handleOpenStartup}
          onOpenVacancy={handleOpenVacancy}
        />
      ) : (
        <ProfileDesktop
          dashboard={data}
          onOpenStartup={handleOpenStartup}
          onOpenVacancy={handleOpenVacancy}
        />
      )}
    </div>
  );
};
