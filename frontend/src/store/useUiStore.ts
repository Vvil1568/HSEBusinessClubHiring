import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  /**
   * DEV user switcher drawer. The trigger lives in the header while the drawer
   * itself is mounted once near the app root, so both need shared state.
   */
  isDevSwitcherOpen: boolean;
  openDevSwitcher: () => void;
  closeDevSwitcher: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isDevSwitcherOpen: false,
  openDevSwitcher: () => set({ isDevSwitcherOpen: true }),
  closeDevSwitcher: () => set({ isDevSwitcherOpen: false }),
}));
