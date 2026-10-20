import { useSyncExternalStore } from 'react';
import { layout } from '../theme/tokens';

const query = `(max-width: ${layout.mobileBreakpoint}px)`;

const subscribe = (onChange: () => void): (() => void) => {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
};

const getSnapshot = (): boolean => window.matchMedia(query).matches;

export const useBreakpoint = (): { isMobile: boolean } => {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return { isMobile };
};
