/**
 * Telegram Mini App user.
 *
 * Identity comes only from `Telegram.WebApp.initData` and is verified on the
 * backend with HMAC-SHA256. The platform stores no custom fields (nick, email,
 * position, company): the profile is just a projection of Telegram data.
 */
export interface Applicant {
  /** Internal platform identifier (UUID). */
  id: string;
  /** Telegram user id — the natural key used for upserts. */
  telegramId: number;
  /** Telegram `first_name` (required). */
  firstName: string;
  /** Telegram `last_name`; empty string when not provided. */
  lastName: string;
  /** Telegram `photo_url`; `null` when no avatar is set. */
  photoUrl: string | null;
}

export interface UserProfile extends Applicant {
  startupsCount: number;
  vacanciesCount: number;
  applicationsCount: number;
}
