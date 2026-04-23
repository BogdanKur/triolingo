const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const calculateNextStreak = (params: {
  currentStreak: number;
  lastActivityDate: string | null;
  now?: Date;
}): number => {
  const now = params.now ?? new Date();
  const today = isoDate(now);

  if (!params.lastActivityDate) {
    return 1;
  }

  if (params.lastActivityDate === today) {
    return params.currentStreak;
  }

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayIso = isoDate(yesterday);

  if (params.lastActivityDate === yesterdayIso) {
    return params.currentStreak + 1;
  }

  return 1;
};
