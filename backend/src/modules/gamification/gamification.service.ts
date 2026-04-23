import { query } from "../../db/pool.js";
import { xpToLevel } from "../../shared/domain.js";
import { createNotification } from "../notifications/notifications.service.js";
import { normalizeLegacyCrystals } from "../progress/crystal-baseline.service.js";
import { calculateNextStreak } from "./rules.js";

export interface ProgressSnapshot {
  language: string;
  level: string;
  totalXp: number;
  crystals: number;
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  unlockedAchievements: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}

const getOrCreateProgress = async (userId: number, language: string) => {
  await query(
    `
      INSERT INTO user_progress (user_id, language, current_level, total_xp, crystals, current_streak, longest_streak, accuracy, weak_topics, last_activity_date)
      VALUES ($1, $2, 'A1', 0, 0, 0, 0, 0, '[]'::jsonb, NULL)
      ON CONFLICT (user_id, language) DO NOTHING
    `,
    [userId, language],
  );

  const progress = await query<{
    id: number;
    current_level: string;
    total_xp: number;
    crystals: number;
    current_streak: number;
    longest_streak: number;
    accuracy: number;
    last_activity_date: string | null;
  }>(
    `
      SELECT id, current_level, total_xp, crystals, current_streak, longest_streak, accuracy, last_activity_date
      FROM user_progress
      WHERE user_id = $1 AND language = $2
      LIMIT 1
    `,
    [userId, language],
  );

  const row = progress.rows[0];
  if (!row) throw new Error("Progress row missing after upsert");
  row.crystals = await normalizeLegacyCrystals(userId, language, row.crystals);
  return row;
};

const recalculateAccuracy = async (userId: number): Promise<number> => {
  const stats = await query<{ total: string; correct: string }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::text AS correct
      FROM exercise_attempts
      WHERE user_id = $1
    `,
    [userId],
  );

  const total = Number(stats.rows[0]?.total ?? 0);
  const correct = Number(stats.rows[0]?.correct ?? 0);
  if (total === 0) return 0;
  return Number(((correct / total) * 100).toFixed(2));
};

const unlockAchievements = async (userId: number, totalXp: number, streak: number): Promise<Array<{ id: number; name: string; description: string }>> => {
  const candidates = await query<{
    id: number;
    name: string;
    description: string;
    xp_required: number;
    streak_required: number;
  }>(
    `
      SELECT a.id, a.name, a.description, a.xp_required, a.streak_required
      FROM achievements a
      LEFT JOIN user_achievements ua
        ON ua.achievement_id = a.id
       AND ua.user_id = $1
      WHERE ua.id IS NULL
    `,
    [userId],
  );

  const unlocked: Array<{ id: number; name: string; description: string }> = [];
  for (const row of candidates.rows) {
    if (totalXp < row.xp_required || streak < row.streak_required) continue;

    await query(
      `
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
      `,
      [userId, row.id],
    );

    unlocked.push({ id: row.id, name: row.name, description: row.description });
    await createNotification(userId, "achievement-unlocked", `Achievement unlocked: ${row.name}`);
  }

  return unlocked;
};

const resolveLanguage = async (userId: number, explicitLanguage?: string): Promise<string> => {
  if (explicitLanguage) return explicitLanguage;
  const profile = await query<{ learning_language: string }>(
    `
      SELECT learning_language
      FROM profiles
      WHERE user_id = $1
    `,
    [userId],
  );
  return profile.rows[0]?.learning_language ?? "en";
};

export const applyExerciseProgress = async (params: {
  userId: number;
  isCorrect: boolean;
  score: number;
  baseXp?: number;
  xpDelta?: number;
  crystalDelta?: number;
  countStreak?: boolean;
  language?: string;
}): Promise<ProgressSnapshot> => {
  const language = await resolveLanguage(params.userId, params.language);
  const progress = await getOrCreateProgress(params.userId, language);

  const xpDelta = params.isCorrect
    ? Math.max(0, params.xpDelta ?? Math.max(params.baseXp ?? 10, params.score))
    : 0;
  const crystalDelta = params.isCorrect ? Math.max(0, params.crystalDelta ?? 0) : 0;
  const nextTotalXp = progress.total_xp + xpDelta;
  const nextCrystals = progress.crystals + crystalDelta;
  const nextLevel = xpToLevel(nextTotalXp);

  const shouldCountStreak = params.isCorrect && (params.countStreak ?? true);
  const nextStreak = shouldCountStreak
    ? calculateNextStreak({
        currentStreak: progress.current_streak,
        lastActivityDate: progress.last_activity_date,
      })
    : progress.current_streak;
  const nextLongestStreak = Math.max(progress.longest_streak, nextStreak);

  const nextAccuracy = await recalculateAccuracy(params.userId);

  await query(
    `
      UPDATE user_progress
      SET
        current_level = $3,
        total_xp = $4,
        crystals = $5,
        current_streak = $6,
        longest_streak = $7,
        accuracy = $8,
        last_activity_date = CASE WHEN $9 THEN CURRENT_DATE ELSE last_activity_date END,
        updated_at = NOW()
      WHERE user_id = $1 AND language = $2
    `,
    [params.userId, language, nextLevel, nextTotalXp, nextCrystals, nextStreak, nextLongestStreak, nextAccuracy, shouldCountStreak],
  );

  if (progress.current_level !== nextLevel) {
    await createNotification(params.userId, "level-unlocked", `New level unlocked: ${nextLevel}`);
  }

  const unlockedAchievements = await unlockAchievements(params.userId, nextTotalXp, nextStreak);

  const refreshed = await query<{
    total_xp: number;
    crystals: number;
    current_streak: number;
    longest_streak: number;
    accuracy: number;
    current_level: string;
  }>(
    `
      SELECT total_xp, crystals, current_streak, longest_streak, accuracy, current_level
      FROM user_progress
      WHERE user_id = $1 AND language = $2
    `,
    [params.userId, language],
  );

  const row = refreshed.rows[0];
  if (!row) throw new Error("Missing refreshed progress");

  return {
    language,
    level: row.current_level,
    totalXp: row.total_xp,
    crystals: row.crystals,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    accuracy: Number(row.accuracy),
    unlockedAchievements,
  };
};
