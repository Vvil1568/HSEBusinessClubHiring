import { App, Button, Result, Spin } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { extractErrorMessage, getAuthSession, isMockApi } from '../../../api/client';
import { palette } from '../../../theme/tokens';
import {
  getInitDataUser,
  initTelegramApp,
  isTelegramEnvironment,
  subscribeViewportChange,
} from '../../../telegram/webApp';
import { useTelegramAuth } from '../api/useTelegramAuth';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Mini App entry point.
 *
 * Order matters: `Telegram.WebApp.ready()` / `expand()` first, then
 * `POST /auth/telegram` with signed `initData`, and only after success are the
 * pages allowed to render and issue requests. Outside Telegram no auth attempt
 * is made, since `initData` is empty and every request would return `401`.
 */
export const AuthGate = ({ children }: AuthGateProps) => {
  const { message } = App.useApp();
  // The mock runs in a plain browser without the Telegram object, but it still
  // needs a session or no screen can load.
  const [inTelegram] = useState(() => isTelegramEnvironment() || isMockApi());
  const [bypassForWeb, setBypassForWeb] = useState(false);
  const { mutate, isPending, isSuccess } = useTelegramAuth();

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
    if (!inTelegram || getAuthSession().authenticated) return;
    mutate(undefined, {
      onError: (error) => {
        message.error(extractErrorMessage(error));
      },
    });
  }, [inTelegram, message, mutate]);

  if (!inTelegram && !bypassForWeb) {
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
          subTitle="В продакшене сервис работает внутри Telegram Mini App с верификацией по initData. Для проверки десктопной версии прямо в браузере нажмите кнопку ниже."
          extra={
            <Button
              type="primary"
              size="large"
              onClick={() => {
                // Включаем демо-сессию для браузера
                getAuthSession().authenticated = true;
                setBypassForWeb(true);
              }}
              style={{ borderRadius: 10 }}
            >
              Войти для проверки в браузере (Демо-режим)
            </Button>
          }
        />
      </div>
    );
  }

  if (isPending || (!isSuccess && !getAuthSession().authenticated)) {
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
        <span style={{ fontSize: 13 }}>Проверяем данные Telegram…</span>
        <Button size="small" type="link" onClick={() => mutate()} loading={isPending}>
          Повторить
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
