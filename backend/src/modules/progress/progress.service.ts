import { query } from "../../db/pool.js";
import { buildImprovementReport, getStudyStatistics } from "../analytics/analytics.service.js";
import { createStreakRiskNotificationIfNeeded, listNotifications } from "../notifications/notifications.service.js";
import { normalizeLegacyCrystals } from "./crystal-baseline.service.js";

export interface ProgressSummary {
  language: string;
  level: string;
  totalXp: number;
  crystals: number;
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  weakTopics: string[];
  achievements: Array<{
    id: number;
    name: string;
    description: string;
    unlockedAt: string;
  }>;
  notifications: Array<{
    id: number;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

const getLearningLanguage = async (userId: number): Promise<string> => {
  const profile = await query<{ learning_language: string }>(
    `
      SELECT learning_language
      FROM profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  return profile.rows[0]?.learning_language ?? "en";
};

export const getProgressSummary = async (userId: number): Promise<ProgressSummary | null> => {
  const language = await getLearningLanguage(userId);

  const progress = await query<{
    language: string;
    current_level: string;
    total_xp: number;
    crystals: number;
    current_streak: number;
    longest_streak: number;
    accuracy: number;
    weak_topics: unknown;
    last_activity_date: string | null;
  }>(
    `
      SELECT language, current_level, total_xp, crystals, current_streak, longest_streak, accuracy, weak_topics, last_activity_date
      FROM user_progress
      WHERE user_id = $1
        AND language = $2
      LIMIT 1
    `,
    [userId, language],
  );

  const row = progress.rows[0];
  if (!row) return null;
  const crystals = await normalizeLegacyCrystals(userId, language, row.crystals);

  if (!row.last_activity_date || row.last_activity_date !== new Date().toISOString().slice(0, 10)) {
    await createStreakRiskNotificationIfNeeded(userId, row.current_streak);
  }

  const achievements = await query<{
    id: number;
    name: string;
    description: string;
    unlocked_at: string;
  }>(
    `
      SELECT a.id, a.name, a.description, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `,
    [userId],
  );

  const notifications = await listNotifications(userId);

  return {
    language: row.language,
    level: row.current_level,
    totalXp: row.total_xp,
    crystals,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    accuracy: Number(row.accuracy),
    weakTopics: Array.isArray(row.weak_topics) ? (row.weak_topics as string[]) : [],
    achievements: achievements.rows.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      unlockedAt: item.unlocked_at,
    })),
    notifications,
  };
};

export const getProgressStatistics = async (userId: number) => {
  const summary = await getProgressSummary(userId);
  const statistics = await getStudyStatistics(userId);
  return {
    summary,
    statistics,
  };
};

export const getProgressReport = async (userId: number) => {
  const report = await buildImprovementReport(userId);
  await query(
    `
      INSERT INTO reports (user_id, report_type, data)
      VALUES ($1, 'improvement-summary', $2::jsonb)
    `,
    [userId, JSON.stringify(report)],
  );
  return report;
};
