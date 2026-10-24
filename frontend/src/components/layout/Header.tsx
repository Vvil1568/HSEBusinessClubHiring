import { MenuOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { palette } from '../../theme/tokens';
import { useUiStore } from '../../store/useUiStore';
import { useCurrentUser } from '../../features/auth/api/useCurrentUser';
import { DevUserSwitcherButton } from '../../features/auth/components/DevUserSwitcher';
import { AppLogo } from '../common/AppLogo';
import { UserAvatar } from '../common/StartupLogo';

export const Header = () => {
  const openSidebar = useUiStore((state) => state.openSidebar);
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isProfile = location.pathname.startsWith('/profile');

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(12px)',
        background: 'rgba(8, 12, 20, 0.86)',
        borderBottom: `1px solid ${palette.borderSoft}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            type="text"
            aria-label="Открыть меню"
            onClick={openSidebar}
            icon={<MenuOutlined style={{ fontSize: 18, color: palette.text }} />}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          />
          <AppLogo />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* DEV trigger sits immediately left of the profile avatar and is a
              no-op outside DEV mode. */}
          <DevUserSwitcherButton />

          {!isProfile ? (
            <Tooltip title="Личный кабинет" placement="bottomRight">
              <button
                type="button"
                aria-label="Открыть личный кабинет"
                onClick={() => navigate('/profile')}
                style={{
                  padding: 0,
                  border: `2px solid ${palette.border}`,
                  borderRadius: '50%',
                  background: 'transparent',
                  cursor: 'pointer',
                  lineHeight: 0,
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = palette.primaryHover;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = palette.border;
                }}
              >
                <UserAvatar
                  firstName={user?.firstName ?? 'П'}
                  lastName={user?.lastName ?? ''}
                  photoUrl={user?.photoUrl ?? null}
                  size={38}
                />
              </button>
            </Tooltip>
          ) : (
            <span style={{ color: palette.textSecondary, fontSize: 13 }}>Личный кабинет</span>
          )}
        </div>
      </div>
    </header>
  );
};
