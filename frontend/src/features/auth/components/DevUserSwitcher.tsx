import { CheckOutlined, ExperimentOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { App, Badge, Button, Drawer, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { extractErrorMessage } from '../../../api/client';
import { useUiStore } from '../../../store/useUiStore';
import { isTelegramEnvironment } from '../../../telegram/webApp';
import { palette } from '../../../theme/tokens';
import type { DevUserOption } from '../../../types';
import { readDevUser } from '../api/devSession';
import { useAppConfig } from '../api/useAppConfig';
import { useDevUserSwitch } from '../api/useTelegramAuth';

const REAL_USER_KEY = 'real';

/**
 * Header trigger for the DEV identity switcher.
 *
 * Renders nothing unless `GET /auth/app-config` reports `devMode: true`, so a
 * production bundle never exposes the control even though the header imports
 * it unconditionally.
 */
export const DevUserSwitcherButton = () => {
  const { data: config, isError } = useAppConfig();
  const openDevSwitcher = useUiStore((state) => state.openDevSwitcher);

  if (isError || !config?.devMode) {
    return null;
  }

  return (
    <Tooltip title="DEV: переключить тестового пользователя" placement="bottomRight">
      <Button
        type="text"
        aria-label="Переключить тестового пользователя"
        onClick={openDevSwitcher}
        icon={<UserSwitchOutlined style={{ fontSize: 18, color: palette.warning }} />}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: `1px solid ${palette.border}`,
          background: palette.surface,
        }}
      />
    </Tooltip>
  );
};

/**
 * DEV-only identity drawer, mounted once near the app root.
 *
 * The trigger is in the header, so open state lives in `useUiStore`. The whole
 * component renders `null` outside DEV mode, which means the drawer can never
 * appear in a production build.
 */
export const DevUserSwitcher = () => {
  const { data: config, isError } = useAppConfig();
  const { message } = App.useApp();
  const open = useUiStore((state) => state.isDevSwitcherOpen);
  const close = useUiStore((state) => state.closeDevSwitcher);
  const [selected, setSelected] = useState<string | null>(() => readDevUser());
  const [inTelegram] = useState(() => isTelegramEnvironment());
  const switchUser = useDevUserSwitch();

  if (isError || !config?.devMode) {
    return null;
  }

  const users = config.devUsers;
  const active = selected ?? config.defaultDevUser;
  const activeUser: DevUserOption | undefined = users.find((item) => item.key === active);

  const handleSwitch = (key: string) => {
    switchUser.mutate(key, {
      onSuccess: (result) => {
        setSelected(key === REAL_USER_KEY ? null : key);
        close();
        message.success(
          `Активный пользователь: ${result.user.firstName} ${result.user.lastName}`.trim(),
        );
      },
      onError: (error) => {
        message.error(extractErrorMessage(error));
      },
    });
  };

  return (
    <Drawer
      title={
        <Space size={8}>
          <ExperimentOutlined />
          <span>DEV-режим</span>
        </Space>
      }
      placement="right"
      width={340}
      open={open}
      onClose={close}
      styles={{ body: { background: palette.background } }}
    >
      <Typography.Paragraph style={{ color: palette.textSecondary, fontSize: 13 }}>
        Проверка серверной проверки подписи ослаблена. Выберите, от чьего имени работать:
      </Typography.Paragraph>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Select
          value={active}
          loading={switchUser.isPending}
          onChange={handleSwitch}
          style={{ width: '100%' }}
          options={users.map((item) => ({
            value: item.key,
            label: item.label,
            // `real` proves identity with the signed Telegram payload, so it
            // is only selectable inside Telegram. `availableOutsideTelegram`
            // says nothing about availability *inside* the Mini App.
            disabled: item.key === REAL_USER_KEY && !inTelegram,
          }))}
        />

        {activeUser ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
            }}
          >
            <Space size={8} wrap>
              <Badge status="processing" />
              <Typography.Text strong style={{ color: palette.text }}>
                {activeUser.label}
              </Typography.Text>
              <Tag color="blue">активен</Tag>
            </Space>
            <Typography.Paragraph
              style={{ color: palette.textSecondary, fontSize: 12, margin: '8px 0 0' }}
            >
              {activeUser.description}
            </Typography.Paragraph>
          </div>
        ) : null}

        {users.map((item) => (
          <Button
            key={item.key}
            block
            type={item.key === active ? 'primary' : 'default'}
            disabled={switchUser.isPending}
            onClick={() => handleSwitch(item.key)}
            icon={item.key === active ? <CheckOutlined /> : undefined}
            style={{ justifyContent: 'flex-start', textAlign: 'left' }}
          >
            {item.label}
          </Button>
        ))}
      </Space>
    </Drawer>
  );
};
