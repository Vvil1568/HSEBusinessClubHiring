import { App, Button, Result, Spin, Tag } from 'antd';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { extractErrorMessage, getAuthSession, isMockApi } from '../../../api/client';
import { palette } from '../../../theme/tokens';
import { initTelegramApp, isTelegramEnvironment, subscribeViewportChange } from '../../../telegram/webApp';
import { readDevUser } from '../api/devSession';
import { useAppConfig } from '../api/useAppConfig';
import { buildDevInitData } from '../api/devSession';
import { useTelegramAuth } from '../api/useTelegramAuth';
import { DevUserSwitcher } from './DevUserSwitcher';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Mini App entry point.
 *
 * Order matters: `Telegram.WebApp.ready()` / `expand()` first, then
 * `POST /auth/telegram` with signed `initData`, and only after success are the
 * pages allowed to render and issue requests.
 *
 * Two runtime flags from `GET /auth/app-config` shape the entry screen:
 * - `devMode` — the app signs in automatically as a preset identity and the
 *   DEV switcher is mounted;
 * - `production` — outside Telegram there is no way in, so the entry screen
 *   deliberately offers no browser bypass button.
 */
export const AuthGate = ({ children }: AuthGateProps) => {
  const { message } = App.useApp();
  // The mock runs in a plain browser without the Telegram object, but it still
  // needs a session or no screen can load.
  const [inTelegram] = useState(() => isTelegramEnvironment() || isMockApi());
  const [authenticated, setAuthenticated] = useState(() => getAuthSession().authenticated);
  const { data: config, isLoading: isConfigLoading } = useAppConfig();
  const { mutate, isPending } = useTelegramAuth();
  const started = useRef(false);

  const devMode = config?.devMode ?? false;
  const isProduction = config?.production ?? false;
  // In DEV mode a synthetic identity replaces Telegram, so a plain browser
  // session is expected. In production an empty `initData` is a dead end.
  const canAuthenticate = inTelegram || devMode;

  useEffect(() => {
    initTelegramApp();
    return subscribeViewportChange(() => {
      // Height is recalculated in CSS via dvh; this variable is only exposed
      // for fullscreen lists that have no resize handler of their own.
      document.documentElement.style.setProperty(
        '--tg-viewport-height',
        `${window.Telegram?.WebApp?.viewportStableHeight ?? window.innerHeight}px`,
      );
    });
  }, []);

  useEffect(() => {
    if (isConfigLoading || started.current) return;
    if (!canAuthenticate || authenticated) return;
    started.current = true;
    // In a plain browser DEV mode must pick an identity explicitly: the
    // interceptor has no stored selection and `initData` is empty.
    const fallback = devMode
      ? buildDevInitData(readDevUser() ?? config?.defaultDevUser ?? 'founder')
      : undefined;
    mutate(fallback, {
      onSuccess: () => setAuthenticated(true),
      onError: (error) => {
        message.error(extractErrorMessage(error));
      },
    });
  }, [
    authenticated,
    canAuthenticate,
    config?.defaultDevUser,
    devMode,
    isConfigLoading,
    message,
    mutate,
  ]);

  if (isConfigLoading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!canAuthenticate) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Result
          status="info"
          title="Запуск вне Telegram"
          subTitle={
            isProduction
              ? 'Сервис работает только внутри Telegram Mini App: вход выполняется по подписи initData, выданной Telegram.'
              : 'Вне Telegram вход невозможен: нужна подпись initData. Для проверки в браузере включите DEV_MODE на бэкенде — появится переключатель тестовых пользователей.'
          }
        />
      </div>
    );
  }

  if (!authenticated && (isPending || !getAuthSession().authenticated)) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          color: palette.textSecondary,
        }}
      >
        <Spin size="large" />
        <span style={{ fontSize: 13 }}>
          {devMode ? 'Входим в DEV-режиме…' : 'Проверяем данные Telegram…'}
        </span>
        <Button size="small" type="link" onClick={() => mutate()} loading={isPending}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <>
      {devMode ? (
        <Tag color="gold" style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 60, margin: 0 }}>
          DEV · {readDevUser() ?? config?.defaultDevUser ?? 'default'}
        </Tag>
      ) : null}
      {children}
      <DevUserSwitcher />
    </>
  );
};
