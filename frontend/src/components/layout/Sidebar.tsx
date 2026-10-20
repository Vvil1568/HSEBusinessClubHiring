import {
  AppstoreOutlined,
  CloseOutlined,
  PlusCircleOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Drawer, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/useUiStore';
import { palette } from '../../theme/tokens';
import { AppLogo } from '../common/AppLogo';

interface SidebarEntry {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const entries: SidebarEntry[] = [
  { key: '/startup', label: 'Стартапы', icon: <AppstoreOutlined /> },
  { key: '/vacancies', label: 'Вакансии', icon: <SolutionOutlined /> },
  { key: '/profile', label: 'Личный кабинет', icon: <UserOutlined /> },
  { key: '/startups/new', label: 'Создать стартап', icon: <PlusCircleOutlined /> },
];

export const Sidebar = () => {
  const isOpen = useUiStore((state) => state.isSidebarOpen);
  const closeSidebar = useUiStore((state) => state.closeSidebar);
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey =
    entries
      .map((entry) => entry.key)
      .filter((key) => location.pathname === key || location.pathname.startsWith(`${key}/`))
      .sort((a, b) => b.length - a.length)[0] ?? '';

  return (
    <Drawer
      placement="left"
      open={isOpen}
      onClose={closeSidebar}
      width={300}
      closable={false}
      styles={{
        body: { padding: '20px 16px', background: palette.background },
        content: { background: palette.background },
        header: { display: 'none' },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <AppLogo />
        <button
          type="button"
          onClick={closeSidebar}
          aria-label="Закрыть меню"
          style={{
            border: 'none',
            background: 'transparent',
            color: palette.textSecondary,
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          <CloseOutlined />
        </button>
      </div>

      <Menu
        mode="inline"
        selectedKeys={activeKey ? [activeKey] : []}
        onClick={({ key }) => {
          navigate(key);
          closeSidebar();
        }}
        style={{ background: 'transparent', borderInlineEnd: 'none' }}
        items={entries.map((entry) => ({
          key: entry.key,
          icon: entry.icon,
          label: entry.label,
        }))}
      />
    </Drawer>
  );
};
