const pluralRules = new Intl.PluralRules('ru-RU');

const pluralForms: Record<string, [string, string, string]> = {
  vacancy: ['вакансия', 'вакансии', 'вакансий'],
  application: ['отклик', 'отклика', 'откликов'],
  view: ['просмотр', 'просмотра', 'просмотров'],
  startup: ['стартап', 'стартапа', 'стартапов'],
};

export const pluralize = (count: number, key: keyof typeof pluralForms): string => {
  const forms = pluralForms[key];
  const category = pluralRules.select(count);

  if (category === 'one') return forms[0];
  if (category === 'few') return forms[1];
  return forms[2];
};

export const formatCount = (count: number, key: keyof typeof pluralForms): string =>
  `${count} ${pluralize(count, key)}`;

const numberFormatter = new Intl.NumberFormat('ru-RU');

export const formatNumber = (value: number): string => numberFormatter.format(value);

export const getInitials = (firstName: string, lastName: string): string =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

/**
 * Display name for a Telegram user. Lives here rather than in `types`, since
 * `types/index.ts` re-exports types only (`export type *`).
 */
export const getUserDisplayName = (user: { firstName: string; lastName: string }): string =>
  [user.firstName, user.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
