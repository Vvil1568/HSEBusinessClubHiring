export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomInt = (random: () => number, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

export const pickOne = <TValue,>(random: () => number, items: readonly TValue[]): TValue =>
  items[Math.floor(random() * items.length)];

export const daysAgoIso = (days: number, hours = 10, minutes = 0): string => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};
