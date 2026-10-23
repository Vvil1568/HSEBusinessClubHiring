import { buildAvatarDataUri } from '../../utils/logo';
import type { DbUser } from './types';

export const CURRENT_USER_ID = 'u-ivan';

/**
 * Demo users. `telegramId` values are fictional but stable; in production the
 * key comes from signed `initData` and `photoUrl` maps to `photo_url`.
 */
export const seedUsers: DbUser[] = [
  {
    id: CURRENT_USER_ID,
    telegramId: 100_000_001,
    firstName: 'Иван',
    lastName: 'Петров',
    photoUrl: buildAvatarDataUri('ИП', '#2563EB', '#7C3AED'),
  },
  {
    id: 'u-anna',
    telegramId: 100_000_002,
    firstName: 'Анна',
    lastName: 'Смирнова',
    photoUrl: buildAvatarDataUri('АС', '#F97316', '#DB2777'),
  },
  {
    id: 'u-dmitry',
    telegramId: 100_000_003,
    firstName: 'Дмитрий',
    lastName: 'Ковалёв',
    photoUrl: buildAvatarDataUri('ДК', '#0EA5E9', '#22C55E'),
  },
  {
    id: 'u-maria',
    telegramId: 100_000_004,
    firstName: 'Мария',
    lastName: 'Лебедева',
    photoUrl: buildAvatarDataUri('МЛ', '#8B5CF6', '#EC4899'),
  },
  {
    id: 'u-sergey',
    telegramId: 100_000_005,
    firstName: 'Сергей',
    lastName: 'Ветров',
    photoUrl: buildAvatarDataUri('СВ', '#14B8A6', '#2563EB'),
  },
  {
    id: 'u-olga',
    telegramId: 100_000_006,
    firstName: 'Ольга',
    lastName: 'Кузнецова',
    photoUrl: buildAvatarDataUri('ОК', '#EAB308', '#F97316'),
  },
  {
    id: 'u-artem',
    telegramId: 100_000_007,
    firstName: 'Артём',
    lastName: 'Новиков',
    photoUrl: buildAvatarDataUri('АН', '#6366F1', '#06B6D4'),
  },
  {
    id: 'u-ekaterina',
    telegramId: 100_000_008,
    firstName: 'Екатерина',
    lastName: 'Морозова',
    photoUrl: buildAvatarDataUri('ЕМ', '#DB2777', '#7C3AED'),
  },
  {
    id: 'u-pavel',
    telegramId: 100_000_009,
    firstName: 'Павел',
    lastName: 'Орлов',
    photoUrl: buildAvatarDataUri('ПО', '#16A34A', '#0EA5E9'),
  },
];
