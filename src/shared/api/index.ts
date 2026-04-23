import { ApiError, apiBase, apiFetch, sessionStorageApi } from "./client";
import type {
  AuthResponse,
  DailyPlanResponse,
  ExerciseCheckResponse,
  ExerciseType,
  OAuthProvider,
  ProfileResponse,
  ProgressSummary,
  SessionUser,
  SettingsResponse,
  StoreCatalogResponse,
} from "./types";

export { apiBase, ApiError, sessionStorageApi } from "./client";
export type { SessionUser } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasLessonMapTaskContext = (payload: unknown): boolean => {
  if (!isRecord(payload)) return false;
  const taskContext = payload.taskContext;
  return isRecord(taskContext) && taskContext.mode === "lessonMap";
};

const stripTaskContext = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const { taskContext: _ignored, ...rest } = payload;
  return rest;
};

export const authApi = {
  async oauthLogin(provider: OAuthProvider, payload: { oauthId: string; email?: string; name?: string }): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>(`/api/auth/oauth/${provider}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, false);
    sessionStorageApi.setToken(data.token);
    sessionStorageApi.setUser(data.user);
    return data;
  },

  async me(): Promise<SessionUser> {
    const data = await apiFetch<{ user: SessionUser }>("/api/auth/me");
    sessionStorageApi.setUser(data.user);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    } finally {
      sessionStorageApi.clearSession();
    }
  },

  getGoogleStartUrl(origin: string): string {
    const url = new URL("/api/auth/google/start", apiBase);
    url.searchParams.set("origin", origin);
    return url.toString();
  },

  getTelegramStartUrl(origin: string): string {
    const url = new URL("/api/auth/telegram/start", apiBase);
    url.searchParams.set("origin", origin);
    return url.toString();
  },
};

export const profileApi = {
  getProfile: (): Promise<ProfileResponse> => apiFetch<ProfileResponse>("/api/profile"),
  patchProfile: (payload: Partial<ProfileResponse["profile"]>): Promise<ProfileResponse> =>
    apiFetch<ProfileResponse>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getSettings: (): Promise<SettingsResponse> => apiFetch<SettingsResponse>("/api/settings"),
  patchSettings: (payload: Partial<SettingsResponse["settings"]>): Promise<SettingsResponse> =>
    apiFetch<SettingsResponse>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  switchLanguage: (language: string): Promise<{ language: string }> =>
    apiFetch<{ language: string }>("/api/language/switch", {
      method: "POST",
      body: JSON.stringify({ language }),
    }),
};

export const learningApi = {
  submitAssessment: (answers: Array<{ id: string; value: string }>) =>
    apiFetch<{
      level: string;
      weakTopics: string[];
      recommendedLessonIds: number[];
    }>("/api/assessment/submit", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  getDailyPlan: (): Promise<DailyPlanResponse> => apiFetch<DailyPlanResponse>("/api/plan/daily"),
};

export const progressApi = {
  getSummary: (): Promise<ProgressSummary> => apiFetch<ProgressSummary>("/api/progress/summary"),
  getStatistics: (): Promise<unknown> => apiFetch<unknown>("/api/progress/statistics"),
  getReport: (): Promise<unknown> => apiFetch<unknown>("/api/progress/report"),
};

export const exerciseApi = {
  check: async (type: ExerciseType, payload: unknown): Promise<ExerciseCheckResponse> => {
    try {
      return await apiFetch<ExerciseCheckResponse>(`/api/exercises/${type}/check`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (
        error instanceof ApiError
        && error.status === 400
        && error.message === "Invalid exercise payload"
        && hasLessonMapTaskContext(payload)
      ) {
        return apiFetch<ExerciseCheckResponse>(`/api/exercises/${type}/check`, {
          method: "POST",
          body: JSON.stringify(stripTaskContext(payload)),
        });
      }

      throw error;
    }
  },
};

export const storeApi = {
  getCatalog: (): Promise<StoreCatalogResponse> => apiFetch<StoreCatalogResponse>("/api/store/catalog"),
  purchase: (payload: { itemType: "pet" | "crystal-pack" | "course" | "subscription"; itemId: string; amount: number; currency: "crystal" | "rub" }) =>
    apiFetch<{ success: boolean; itemId: string; itemType: string }>("/api/store/purchase", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  upgradeSubscription: (payload: { planId: string; amount: number; currency: "crystal" | "rub" }) =>
    apiFetch<{ success: boolean; itemId: string; itemType: string }>("/api/subscription/upgrade", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
