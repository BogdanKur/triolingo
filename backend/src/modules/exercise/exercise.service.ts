import { z } from "zod";
import { query } from "../../db/pool.js";
import { applyExerciseProgress, type ProgressSnapshot } from "../gamification/gamification.service.js";
import { evaluateBuildSequence, evaluateMatchPairs, evaluateTextAnswer } from "./scoring.js";

export const exerciseTypeSchema = z.enum(["word", "gap", "build", "match", "translation", "audio", "speak"]);
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;

export const dailyTaskIdSchema = z.enum(["mini", "audio", "translation"]);
export const miniStepSchema = z.enum(["speak", "build", "gap"]);
const roundContextSchema = z
  .object({
    current: z.coerce.number().int().min(1).max(20),
    total: z.coerce.number().int().min(1).max(20),
  })
  .refine((value) => value.current <= value.total, {
    message: "INVALID_ROUND_CONTEXT",
  });
const sessionContextSchema = z.object({
  forceFail: z.boolean().optional(),
});
const lessonMapContextSchema = z.object({
  mode: z.literal("lessonMap"),
  stepId: z.coerce.number().int().min(1).max(5),
});
const dailyTaskContextSchema = z.object({
  mode: z.literal("daily"),
  taskId: dailyTaskIdSchema,
  miniStep: miniStepSchema.optional(),
});

export type DailyTaskId = z.infer<typeof dailyTaskIdSchema>;
export type MiniStep = z.infer<typeof miniStepSchema>;
type LessonMapContext = z.infer<typeof lessonMapContextSchema>;
type DailyTaskContext = z.infer<typeof dailyTaskContextSchema>;

const taskContextSchema = z.union([dailyTaskContextSchema, lessonMapContextSchema]).optional();

const textCheckSchema = z.object({
  exerciseId: z.coerce.number().int().positive().optional(),
  lessonId: z.coerce.number().int().positive().optional(),
  prompt: z.string().optional(),
  expected: z.string().min(1),
  userAnswer: z.string().min(1),
  language: z.string().min(2).max(12).optional(),
  taskContext: taskContextSchema,
  round: roundContextSchema.optional(),
  session: sessionContextSchema.optional(),
});

const buildCheckSchema = z.object({
  exerciseId: z.coerce.number().int().positive().optional(),
  lessonId: z.coerce.number().int().positive().optional(),
  expectedSequence: z.array(z.string().min(1)).min(1),
  userSequence: z.array(z.string().min(1)).min(1),
  language: z.string().min(2).max(12).optional(),
  taskContext: taskContextSchema,
  round: roundContextSchema.optional(),
  session: sessionContextSchema.optional(),
});

const matchCheckSchema = z.object({
  exerciseId: z.coerce.number().int().positive().optional(),
  lessonId: z.coerce.number().int().positive().optional(),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(1),
  language: z.string().min(2).max(12).optional(),
  taskContext: taskContextSchema,
  round: roundContextSchema.optional(),
  session: sessionContextSchema.optional(),
});

type TextCheckPayload = z.infer<typeof textCheckSchema>;
type BuildCheckPayload = z.infer<typeof buildCheckSchema>;
type MatchCheckPayload = z.infer<typeof matchCheckSchema>;

export type CheckPayload = TextCheckPayload | BuildCheckPayload | MatchCheckPayload;

export interface CheckResult {
  correct: boolean;
  score: number;
  feedback: string;
  grammarHint: string | null;
  mistakes: string[];
  progress: ProgressSnapshot;
  dailyTask: {
    taskId: DailyTaskId;
    status: "in_progress" | "passed" | "failed";
    nextMiniStep: MiniStep | null;
  } | null;
  rewards: {
    xp: number;
    crystals: number;
  };
}

const getExerciseFallback = async (type: ExerciseType): Promise<{ id: number; lesson_id: number; xp_reward: number } | null> => {
  const row = await query<{ id: number; lesson_id: number; xp_reward: number }>(
    `
      SELECT id, lesson_id, xp_reward
      FROM exercises
      WHERE type = $1
      ORDER BY id ASC
      LIMIT 1
    `,
    [type],
  );
  return row.rows[0] ?? null;
};

const evaluateText = (payload: TextCheckPayload): Omit<CheckResult, "progress" | "dailyTask" | "rewards"> => {
  return evaluateTextAnswer(payload.expected, payload.userAnswer);
};

const evaluateBuild = (payload: BuildCheckPayload): Omit<CheckResult, "progress" | "dailyTask" | "rewards"> => {
  return evaluateBuildSequence(payload.expectedSequence, payload.userSequence);
};

const evaluateMatch = (payload: MatchCheckPayload): Omit<CheckResult, "progress" | "dailyTask" | "rewards"> => {
  return evaluateMatchPairs(payload.pairs);
};

const miniStepOrder: MiniStep[] = ["speak", "build", "gap"];
const miniStepByExerciseType: Partial<Record<ExerciseType, MiniStep>> = {
  speak: "speak",
  build: "build",
  gap: "gap",
};

const taskContextOf = (payload: CheckPayload) => ("taskContext" in payload ? payload.taskContext : undefined);
const roundContextOf = (payload: CheckPayload) => ("round" in payload ? payload.round : undefined);
const sessionContextOf = (payload: CheckPayload) => ("session" in payload ? payload.session : undefined);
const dailyContextOf = (payload: CheckPayload): DailyTaskContext | null => {
  const context = taskContextOf(payload);
  if (!context || context.mode !== "daily") return null;
  return context;
};
const lessonMapContextOf = (payload: CheckPayload): LessonMapContext | null => {
  const context = taskContextOf(payload);
  if (!context || context.mode !== "lessonMap") return null;
  return context;
};

const validateTaskContextForExercise = (type: ExerciseType, context: DailyTaskContext): void => {
  if (!context) return;

  if (context.taskId === "audio" && type !== "audio") {
    throw new Error("DAILY_TASK_TYPE_MISMATCH");
  }

  if (context.taskId === "translation" && type !== "translation") {
    throw new Error("DAILY_TASK_TYPE_MISMATCH");
  }

  if (context.taskId === "mini") {
    const expectedStep = miniStepByExerciseType[type];
    if (!expectedStep || context.miniStep !== expectedStep) {
      throw new Error("DAILY_TASK_TYPE_MISMATCH");
    }
  }
};

interface DailyTaskStateRow {
  status: "in_progress" | "passed" | "failed";
  step_index: number;
}

const getDailyTaskState = async (userId: number, taskId: DailyTaskId): Promise<DailyTaskStateRow | null> => {
  const row = await query<DailyTaskStateRow>(
    `
      SELECT status, step_index
      FROM daily_task_states
      WHERE user_id = $1
        AND task_date = CURRENT_DATE
        AND task_id = $2
      LIMIT 1
    `,
    [userId, taskId],
  );

  return row.rows[0] ?? null;
};

const upsertDailyTaskState = async (
  userId: number,
  taskId: DailyTaskId,
  status: "in_progress" | "passed" | "failed",
  stepIndex: number,
): Promise<void> => {
  await query(
    `
      INSERT INTO daily_task_states (user_id, task_date, task_id, status, step_index, updated_at)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, NOW())
      ON CONFLICT (user_id, task_date, task_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        step_index = EXCLUDED.step_index,
        updated_at = NOW()
    `,
    [userId, taskId, status, stepIndex],
  );
};

interface DailyTaskOutcome {
  taskId: DailyTaskId;
  status: "in_progress" | "passed" | "failed";
  nextMiniStep: MiniStep | null;
  xpReward: number;
  crystalReward: number;
}

const resolveDailyTaskOutcome = async (params: {
  userId: number;
  exerciseType: ExerciseType;
  isCorrect: boolean;
  taskContext: DailyTaskContext;
}): Promise<DailyTaskOutcome | null> => {
  const context = params.taskContext;

  validateTaskContextForExercise(params.exerciseType, context);

  const currentState = await getDailyTaskState(params.userId, context.taskId);
  if (currentState && (currentState.status === "passed" || currentState.status === "failed")) {
    throw new Error("DAILY_TASK_ALREADY_DONE");
  }

  if (context.taskId !== "mini") {
    const status = params.isCorrect ? "passed" : "failed";
    await upsertDailyTaskState(params.userId, context.taskId, status, 1);
    return {
      taskId: context.taskId,
      status,
      nextMiniStep: null,
      xpReward: params.isCorrect ? 1 : 0,
      crystalReward: params.isCorrect ? 1 : 0,
    };
  }

  if (!context.miniStep) {
    throw new Error("DAILY_TASK_MINI_STEP_REQUIRED");
  }

  const currentIndex = currentState?.step_index ?? 0;
  const expectedMiniStep = miniStepOrder[currentIndex] ?? null;
  if (!expectedMiniStep || context.miniStep !== expectedMiniStep) {
    throw new Error("DAILY_TASK_INVALID_STEP_ORDER");
  }

  if (!params.isCorrect) {
    await upsertDailyTaskState(params.userId, "mini", "failed", currentIndex);
    return {
      taskId: "mini",
      status: "failed",
      nextMiniStep: null,
      xpReward: 0,
      crystalReward: 0,
    };
  }

  const isLastStep = currentIndex >= miniStepOrder.length - 1;
  if (isLastStep) {
    await upsertDailyTaskState(params.userId, "mini", "passed", miniStepOrder.length);
    return {
      taskId: "mini",
      status: "passed",
      nextMiniStep: null,
      xpReward: 3,
      crystalReward: 3,
    };
  }

  const nextIndex = currentIndex + 1;
  const nextMiniStep = miniStepOrder[nextIndex] ?? null;
  await upsertDailyTaskState(params.userId, "mini", "in_progress", nextIndex);
  return {
    taskId: "mini",
    status: "in_progress",
    nextMiniStep,
    xpReward: 0,
    crystalReward: 0,
  };
};

const parsePayload = (type: ExerciseType, input: unknown): CheckPayload => {
  if (type === "build") return buildCheckSchema.parse(input);
  if (type === "match") return matchCheckSchema.parse(input);
  return textCheckSchema.parse(input);
};

const evaluateByType = (type: ExerciseType, payload: CheckPayload): Omit<CheckResult, "progress" | "dailyTask" | "rewards"> => {
  if (type === "build") return evaluateBuild(payload as BuildCheckPayload);
  if (type === "match") return evaluateMatch(payload as MatchCheckPayload);
  return evaluateText(payload as TextCheckPayload);
};

const resolveExerciseReferences = async (
  type: ExerciseType,
  payload: CheckPayload,
): Promise<{ exerciseId: number | null; lessonId: number | null; xpReward: number }> => {
  const explicitExerciseId = "exerciseId" in payload ? payload.exerciseId ?? null : null;
  const explicitLessonId = "lessonId" in payload ? payload.lessonId ?? null : null;
  if (explicitExerciseId && explicitLessonId) {
    const xpRow = await query<{ xp_reward: number }>(
      `
        SELECT xp_reward
        FROM exercises
        WHERE id = $1
      `,
      [explicitExerciseId],
    );
    return { exerciseId: explicitExerciseId, lessonId: explicitLessonId, xpReward: xpRow.rows[0]?.xp_reward ?? 10 };
  }

  if (explicitExerciseId && !explicitLessonId) {
    const row = await query<{ lesson_id: number; xp_reward: number }>(
      `
        SELECT lesson_id, xp_reward
        FROM exercises
        WHERE id = $1
      `,
      [explicitExerciseId],
    );
    return {
      exerciseId: explicitExerciseId,
      lessonId: row.rows[0]?.lesson_id ?? null,
      xpReward: row.rows[0]?.xp_reward ?? 10,
    };
  }

  if (!explicitExerciseId) {
    const fallback = await getExerciseFallback(type);
    if (!fallback) {
      return { exerciseId: null, lessonId: explicitLessonId, xpReward: 10 };
    }
    return {
      exerciseId: fallback.id,
      lessonId: explicitLessonId ?? fallback.lesson_id,
      xpReward: fallback.xp_reward,
    };
  }

  return { exerciseId: explicitExerciseId, lessonId: explicitLessonId, xpReward: 10 };
};

const upsertLessonResult = async (params: {
  userId: number;
  lessonId: number;
  score: number;
  correct: boolean;
  mistakes: string[];
}): Promise<void> => {
  await query(
    `
      INSERT INTO lesson_results (user_id, lesson_id, is_completed, score, mistakes, accuracy, completed_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
    `,
    [
      params.userId,
      params.lessonId,
      params.correct,
      params.score,
      JSON.stringify(params.mistakes),
      params.score,
    ],
  );
};

export const checkExercise = async (
  userId: number,
  type: ExerciseType,
  input: unknown,
): Promise<CheckResult> => {
  const payload = parsePayload(type, input);
  const evaluatedBase = evaluateByType(type, payload);
  const roundContext = roundContextOf(payload);
  const sessionContext = sessionContextOf(payload);
  const isFinalRound = !roundContext || roundContext.current >= roundContext.total;
  const isForcedFail = Boolean(isFinalRound && sessionContext?.forceFail);
  const evaluated = isForcedFail
    ? {
        ...evaluatedBase,
        correct: false,
        score: 0,
        feedback: "В одном из раундов есть ошибка.",
      }
    : evaluatedBase;
  const refs = await resolveExerciseReferences(type, payload);
  const dailyContext = dailyContextOf(payload);
  const lessonMapContext = lessonMapContextOf(payload);

  if (!isFinalRound) {
    const progress = await applyExerciseProgress({
      userId,
      isCorrect: false,
      score: 0,
      baseXp: refs.xpReward,
      xpDelta: 0,
      crystalDelta: 0,
      countStreak: false,
      language: "language" in payload ? payload.language : undefined,
    });

    return {
      ...evaluated,
      progress,
      dailyTask: null,
      rewards: {
        xp: 0,
        crystals: 0,
      },
    };
  }

  const dailyTask = dailyContext
    ? await resolveDailyTaskOutcome({
        userId,
        exerciseType: type,
        isCorrect: evaluated.correct,
        taskContext: dailyContext,
      })
    : null;

  await query(
    `
      INSERT INTO exercise_attempts (user_id, exercise_id, exercise_type, user_answer, is_correct, score, feedback, grammar_hint)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
    `,
    [
      userId,
      refs.exerciseId,
      type,
      JSON.stringify(payload),
      evaluated.correct,
      evaluated.score,
      evaluated.feedback,
      evaluated.grammarHint,
    ],
  );

  if (refs.lessonId) {
    await upsertLessonResult({
      userId,
      lessonId: refs.lessonId,
      score: evaluated.score,
      correct: evaluated.correct,
      mistakes: evaluated.mistakes,
    });
  }

  const lessonMapXpReward = lessonMapContext && evaluated.correct ? 10 : null;
  const xpReward = dailyTask
    ? dailyTask.xpReward
    : lessonMapXpReward ?? (evaluated.correct ? Math.max(refs.xpReward, evaluated.score) : 0);
  const crystalReward = dailyTask?.crystalReward ?? 0;
  const shouldCountStreak = dailyTask ? dailyTask.status === "passed" : evaluated.correct;

  const progress = await applyExerciseProgress({
    userId,
    isCorrect: evaluated.correct,
    score: evaluated.score,
    baseXp: refs.xpReward,
    xpDelta: xpReward,
    crystalDelta: crystalReward,
    countStreak: shouldCountStreak,
    language: "language" in payload ? payload.language : undefined,
  });

  const feedback =
    dailyTask?.taskId === "mini" && dailyTask.status === "in_progress"
      ? "Шаг мини-урока выполнен. Переходите к следующему шагу."
      : evaluated.feedback;

  return {
    ...evaluated,
    feedback,
    progress,
    dailyTask: dailyTask
      ? {
          taskId: dailyTask.taskId,
          status: dailyTask.status,
          nextMiniStep: dailyTask.nextMiniStep,
        }
      : null,
    rewards: {
      xp: xpReward,
      crystals: crystalReward,
    },
  };
};
