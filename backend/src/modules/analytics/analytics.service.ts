import { query } from "../../db/pool.js";

export interface StudyStatistics {
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
  estimatedStudyMinutes: number;
  attemptsByType: Array<{
    type: string;
    attempts: number;
    accuracy: number;
  }>;
}

export interface ImprovementReport {
  improvements: string[];
  weakPoints: string[];
  summary: string;
}

export const getStudyStatistics = async (userId: number): Promise<StudyStatistics> => {
  const globalRows = await query<{ total: string; correct: string }>(
    `
      SELECT
        COUNT(*)::text AS total,
        COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::text AS correct
      FROM exercise_attempts
      WHERE user_id = $1
    `,
    [userId],
  );

  const totalAttempts = Number(globalRows.rows[0]?.total ?? 0);
  const totalCorrect = Number(globalRows.rows[0]?.correct ?? 0);
  const accuracy = totalAttempts === 0 ? 0 : Number(((totalCorrect / totalAttempts) * 100).toFixed(2));

  const byTypeRows = await query<{ exercise_type: string; attempts: string; correct: string }>(
    `
      SELECT
        exercise_type,
        COUNT(*)::text AS attempts,
        COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::text AS correct
      FROM exercise_attempts
      WHERE user_id = $1
      GROUP BY exercise_type
      ORDER BY exercise_type ASC
    `,
    [userId],
  );

  const attemptsByType = byTypeRows.rows.map((row) => {
    const attempts = Number(row.attempts);
    const correct = Number(row.correct);
    return {
      type: row.exercise_type,
      attempts,
      accuracy: attempts === 0 ? 0 : Number(((correct / attempts) * 100).toFixed(2)),
    };
  });

  return {
    totalAttempts,
    totalCorrect,
    accuracy,
    estimatedStudyMinutes: totalAttempts * 2,
    attemptsByType,
  };
};

const calculateTrend = (values: boolean[]): number => {
  if (values.length === 0) return 0;
  const midpoint = Math.ceil(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);
  const firstRate = firstHalf.length === 0 ? 0 : firstHalf.filter(Boolean).length / firstHalf.length;
  const secondRate = secondHalf.length === 0 ? firstRate : secondHalf.filter(Boolean).length / secondHalf.length;
  return secondRate - firstRate;
};

export const buildImprovementReport = async (userId: number): Promise<ImprovementReport> => {
  const attempts = await query<{ exercise_type: string; is_correct: boolean }>(
    `
      SELECT exercise_type, is_correct
      FROM exercise_attempts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 40
    `,
    [userId],
  );

  const grouped = new Map<string, boolean[]>();
  attempts.rows.forEach((row) => {
    const list = grouped.get(row.exercise_type) ?? [];
    list.push(row.is_correct);
    grouped.set(row.exercise_type, list);
  });

  const improvements: string[] = [];
  const weakPoints: string[] = [];

  grouped.forEach((values, type) => {
    const trend = calculateTrend(values.reverse());
    if (trend > 0.15) {
      improvements.push(`Улучшение в блоке ${type}`);
      return;
    }
    const accuracy = values.filter(Boolean).length / values.length;
    if (accuracy < 0.6) {
      weakPoints.push(`Низкая точность в блоке ${type}`);
    }
  });

  if (improvements.length === 0) improvements.push("Стабильный прогресс без резких скачков");
  if (weakPoints.length === 0) weakPoints.push("Явных слабых мест не обнаружено");

  const summary = `Улучшений: ${improvements.length}. Слабых зон: ${weakPoints.length}.`;
  return { improvements, weakPoints, summary };
};
