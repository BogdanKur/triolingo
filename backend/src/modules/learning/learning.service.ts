import { z } from "zod";
import { query } from "../../db/pool.js";
import { safeRedisGet, safeRedisSet } from "../../db/redis.js";
import { clamp } from "../../shared/domain.js";
import { deriveAssessmentLevel, deriveWeakTopicsFromAssessment } from "./rules.js";
import type { DailyTaskId, MiniStep } from "../exercise/exercise.service.js";

export const assessmentSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .min(1),
});

export interface AssessmentResult {
  level: string;
  weakTopics: string[];
  recommendedLessonIds: number[];
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

const pickRecommendedLessons = async (language: string, level: string, weakTopics: string[]): Promise<number[]> => {
  const difficultySeed = level.startsWith("C") ? 5 : level.startsWith("B") ? 3 : 2;
  const rows = await query<{ id: number }>(
    `
      SELECT l.id
      FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE c.language = $1
        AND l.difficulty BETWEEN $2 AND $3
        AND l.topic = ANY($4::text[])
      ORDER BY l.order_index ASC
      LIMIT 3
    `,
    [language, clamp(difficultySeed - 1, 1, 6), clamp(difficultySeed + 1, 1, 6), weakTopics],
  );

  if (rows.rows.length > 0) {
    return rows.rows.map((row) => row.id);
  }

  const fallbackRows = await query<{ id: number }>(
    `
      SELECT l.id
      FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE c.language = $1
      ORDER BY l.order_index ASC
      LIMIT 3
    `,
    [language],
  );

  return fallbackRows.rows.map((row) => row.id);
};

export const submitAssessment = async (
  userId: number,
  payload: z.infer<typeof assessmentSubmitSchema>,
): Promise<AssessmentResult> => {
  const language = await getLearningLanguage(userId);
  const level = deriveAssessmentLevel(payload.answers);
  const weakTopics = deriveWeakTopicsFromAssessment(payload.answers);
  const recommendedLessonIds = await pickRecommendedLessons(language, level, weakTopics);

  await query(
    `
      UPDATE user_progress
      SET
        current_level = $3,
        weak_topics = $4::jsonb,
        updated_at = NOW()
      WHERE user_id = $1 AND language = $2
    `,
    [userId, language, level, JSON.stringify(weakTopics)],
  );

  await query(
    `
      INSERT INTO reports (user_id, report_type, data)
      VALUES ($1, 'assessment', $2::jsonb)
    `,
    [
      userId,
      JSON.stringify({
        level,
        weakTopics,
        answers: payload.answers,
        recommendedLessonIds,
      }),
    ],
  );

  const cacheKey = `daily-plan:${userId}:${language}`;
  await safeRedisSet(cacheKey, "", 1);

  return { level, weakTopics, recommendedLessonIds };
};

export interface DailyPlan {
  lesson: {
    id: number;
    title: string;
    topic: string;
    difficulty: number;
  } | null;
  exercises: Array<{
    id: number;
    type: string;
    content: Record<string, unknown>;
  }>;
  availableExerciseTypes: string[];
  dailyTasks: Array<{
    id: DailyTaskId;
    status: "available" | "in_progress" | "passed" | "failed";
    nextMiniStep: MiniStep | null;
  }>;
}

interface CachedDailyPlan {
  lesson: DailyPlan["lesson"];
  exercises: DailyPlan["exercises"];
  availableExerciseTypes: DailyPlan["availableExerciseTypes"];
}

const miniStepOrder: MiniStep[] = ["speak", "build", "gap"];

const getDailyTasks = async (userId: number): Promise<DailyPlan["dailyTasks"]> => {
  const rows = await query<{
    task_id: DailyTaskId;
    status: "in_progress" | "passed" | "failed";
    step_index: number;
  }>(
    `
      SELECT task_id, status, step_index
      FROM daily_task_states
      WHERE user_id = $1
        AND task_date = CURRENT_DATE
    `,
    [userId],
  );

  const stateMap = new Map<DailyTaskId, { status: "in_progress" | "passed" | "failed"; stepIndex: number }>();
  rows.rows.forEach((row) => {
    stateMap.set(row.task_id, { status: row.status, stepIndex: row.step_index });
  });

  const taskIds: DailyTaskId[] = ["mini", "audio", "translation"];
  return taskIds.map((taskId) => {
    const state = stateMap.get(taskId);
    if (!state) {
      return {
        id: taskId,
        status: "available",
        nextMiniStep: taskId === "mini" ? (miniStepOrder[0] ?? null) : null,
      };
    }

    const nextMiniStep =
      taskId === "mini" && state.status === "in_progress"
        ? miniStepOrder[state.stepIndex] ?? null
        : null;

    return {
      id: taskId,
      status: state.status,
      nextMiniStep,
    };
  });
};

export const getDailyPlan = async (userId: number): Promise<DailyPlan> => {
  const language = await getLearningLanguage(userId);
  const cacheKey = `daily-plan:${userId}:${language}`;
  const cached = await safeRedisGet(cacheKey);
  if (cached) {
    const basePlan = JSON.parse(cached) as CachedDailyPlan;
    const dailyTasks = await getDailyTasks(userId);
    return {
      ...basePlan,
      dailyTasks,
    };
  }

  const progressResult = await query<{
    current_level: string;
    weak_topics: unknown;
  }>(
    `
      SELECT current_level, weak_topics
      FROM user_progress
      WHERE user_id = $1 AND language = $2
      LIMIT 1
    `,
    [userId, language],
  );

  const weakTopics = Array.isArray(progressResult.rows[0]?.weak_topics)
    ? (progressResult.rows[0]?.weak_topics as string[])
    : ["vocabulary"];

  const lessonResult = await query<{
    id: number;
    title: string;
    topic: string;
    difficulty: number;
  }>(
    `
      SELECT l.id, l.title, l.topic, l.difficulty
      FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE c.language = $1
        AND l.topic = ANY($2::text[])
      ORDER BY l.order_index ASC
      LIMIT 1
    `,
    [language, weakTopics],
  );

  const lesson = lessonResult.rows[0] ?? null;
  if (!lesson) {
    const baseEmpty: CachedDailyPlan = { lesson: null, exercises: [], availableExerciseTypes: [] };
    await safeRedisSet(cacheKey, JSON.stringify(baseEmpty), 300);
    return {
      ...baseEmpty,
      dailyTasks: await getDailyTasks(userId),
    };
  }

  const exerciseRows = await query<{
    id: number;
    type: string;
    content: Record<string, unknown>;
  }>(
    `
      SELECT id, type, content
      FROM exercises
      WHERE lesson_id = $1
      ORDER BY id ASC
    `,
    [lesson.id],
  );

  const basePlan: CachedDailyPlan = {
    lesson,
    exercises: exerciseRows.rows,
    availableExerciseTypes: [...new Set(exerciseRows.rows.map((row) => row.type))],
  };

  await safeRedisSet(cacheKey, JSON.stringify(basePlan), 1800);
  return {
    ...basePlan,
    dailyTasks: await getDailyTasks(userId),
  };
};
