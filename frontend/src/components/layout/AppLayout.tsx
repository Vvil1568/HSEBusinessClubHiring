import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { palette } from '../../theme/tokens';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => (
  <div
    style={{
      minHeight: '100vh',
      background: palette.background,
      color: palette.text,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Header />
    <Sidebar />
    <main
      style={{
        flex: 1,
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px 16px 64px',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </main>
  </div>
);
