import { z } from "zod";

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email().nullable(),
  name: z.string(),
  role: z.string(),
  subscriptionStatus: z.string(),
  preferredLanguage: z.string(),
  learningLanguage: z.string(),
});

export const authLoginResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema,
});

export const progressSummarySchema = z.object({
  language: z.string(),
  level: z.string(),
  totalXp: z.number(),
  crystals: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  accuracy: z.number(),
  weakTopics: z.array(z.string()),
  achievements: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      description: z.string(),
      unlockedAt: z.string(),
    }),
  ),
  notifications: z.array(
    z.object({
      id: z.number(),
      type: z.string(),
      message: z.string(),
      isRead: z.boolean(),
      createdAt: z.string(),
    }),
  ),
});

export const exerciseCheckResponseSchema = z.object({
  correct: z.boolean(),
  score: z.number(),
  feedback: z.string(),
  grammarHint: z.string().nullable(),
  mistakes: z.array(z.string()),
  dailyTask: z
    .object({
      taskId: z.enum(["mini", "audio", "translation"]),
      status: z.enum(["in_progress", "passed", "failed"]),
      nextMiniStep: z.enum(["speak", "build", "gap"]).nullable(),
    })
    .nullable(),
  rewards: z.object({
    xp: z.number(),
    crystals: z.number(),
  }),
  progress: z.object({
    language: z.string(),
    level: z.string(),
    totalXp: z.number(),
    crystals: z.number(),
    currentStreak: z.number(),
    longestStreak: z.number(),
    accuracy: z.number(),
    unlockedAchievements: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        description: z.string(),
      }),
    ),
  }),
});
