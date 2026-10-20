import { theme, type ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#080C14',
    colorBgContainer: '#10192A',
    colorBorder: '#1E2C46',
    colorBorderSecondary: '#152033',

    colorPrimary: '#2563EB',
    colorPrimaryHover: '#3B82F6',

    colorText: '#FFFFFF',
    colorTextSecondary: '#8A99AD',
    colorTextPlaceholder: '#475569',

    borderRadius: 10,
    borderRadiusLG: 16,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Card: {
      colorBgContainer: '#10192A',
      colorBorderSecondary: '#1E2C46',
      paddingLG: 20,
    },
    Button: {
      controlHeight: 40,
      borderRadius: 10,
    },
    Input: {
      colorBgContainer: '#0D1422',
      colorBorder: '#1E2C46',
    },
    Select: {
      colorBgContainer: '#0D1422',
      colorBorder: '#1E2C46',
    },
    Modal: {
      contentBg: '#10192A',
      headerBg: '#10192A',
    },
  },
};