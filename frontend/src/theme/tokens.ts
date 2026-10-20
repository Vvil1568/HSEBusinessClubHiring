import type { StartupStage } from '../types';

export const palette = {
  background: '#080C14',
  surface: '#10192A',
  surfaceMuted: '#0D1422',
  surfaceElevated: '#152033',
  border: '#1E2C46',
  borderSoft: '#152033',
  primary: '#2563EB',
  primaryHover: '#3B82F6',
  text: '#FFFFFF',
  textSecondary: '#8A99AD',
  textMuted: '#5B6B82',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  neutralChip: '#1B2740',
} as const;

export const layout = {
  maxWidth: 1200,
  gutter: 24,
  mobileBreakpoint: 900,
  radius: 10,
  radiusLarge: 16,
} as const;

export const stageLabels: Record<StartupStage, string> = {
  idea: 'Идея',
  mvp: 'MVP',
  scaling: 'Масштабирование',
};

export const stageColors: Record<StartupStage, string> = {
  idea: '#8B5CF6',
  mvp: '#2563EB',
  scaling: '#22C55E',
};

export const statusLabels: Record<'pending' | 'rejected' | 'approved', string> = {
  pending: 'На рассмотрении',
  rejected: 'Отклонено',
  approved: 'Подтверждено',
};

export const statusColors: Record<'pending' | 'rejected' | 'approved', string> = {
  pending: palette.warning,
  rejected: palette.danger,
  approved: palette.success,
};
