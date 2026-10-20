import { ConfigProvider, App as AntdApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { appTheme } from './theme/appTheme';
import { AppLayout } from './components/layout/AppLayout';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileListsPage } from './pages/ProfileListsPage';
import { StartupsPage } from './pages/StartupsPage';
import { StartupPage } from './pages/StartupPage';
import { StartupEditorPage } from './pages/StartupEditorPage';
import { VacanciesPage } from './pages/VacanciesPage';
import { VacancyPage } from './pages/VacancyPage';
import { VacancyStatsPage } from './pages/VacancyStatsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

export const App = () => (
  <ConfigProvider theme={appTheme} locale={ruRU}>
    <AntdApp>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/startup" replace />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/startups" element={<ProfileListsPage kind="startups" />} />
              <Route path="/profile/vacancies" element={<ProfileListsPage kind="vacancies" />} />
              <Route
                path="/profile/applications"
                element={<ProfileListsPage kind="applications" />}
              />
              <Route path="/startup" element={<StartupsPage />} />
              <Route path="/startups/new" element={<StartupEditorPage mode="create" />} />
              <Route path="/startup/:id" element={<StartupPage />} />
              <Route path="/startup/:id/edit" element={<StartupEditorPage mode="edit" />} />
              <Route path="/vacancies" element={<VacanciesPage />} />
              <Route path="/vacancy/:id" element={<VacancyPage />} />
              <Route path="/vacancy/:id/stats" element={<VacancyStatsPage />} />
              <Route path="*" element={<Navigate to="/startup" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </QueryClientProvider>
    </AntdApp>
  </ConfigProvider>
);

export default App;
