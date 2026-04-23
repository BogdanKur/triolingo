export type OAuthProvider = "google" | "telegram";
export type ExerciseType = "word" | "gap" | "build" | "match" | "translation" | "audio" | "speak";

export interface SessionUser {
  id: number;
  email: string | null;
  name: string;
  role: string;
  subscriptionStatus: string;
  preferredLanguage: string;
  learningLanguage: string;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export interface ProfileResponse {
  profile: {
    userId: number;
    email: string | null;
    name: string;
    avatar: string | null;
    activePetId: string | null;
    ownedPetIds: string[];
    notificationLevel: string;
    preferredLanguage: string;
    learningLanguage: string;
    subscriptionStatus: string;
  };
}

export interface SettingsResponse {
  settings: {
    musicEnabled: boolean;
    soundEnabled: boolean;
    telegramNotifications: boolean;
    nightMode: boolean;
  };
}

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

export interface DailyPlanResponse {
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
    id: "mini" | "audio" | "translation";
    status: "available" | "in_progress" | "passed" | "failed";
    nextMiniStep: "speak" | "build" | "gap" | null;
  }>;
}

export interface ExerciseCheckResponse {
  correct: boolean;
  score: number;
  feedback: string;
  grammarHint: string | null;
  mistakes: string[];
  dailyTask: {
    taskId: "mini" | "audio" | "translation";
    status: "in_progress" | "passed" | "failed";
    nextMiniStep: "speak" | "build" | "gap" | null;
  } | null;
  rewards: {
    xp: number;
    crystals: number;
  };
  progress: {
    language: string;
    level: string;
    totalXp: number;
    crystals: number;
    currentStreak: number;
    longestStreak: number;
    accuracy: number;
    unlockedAchievements: Array<{ id: number; name: string; description: string }>;
  };
}

export interface StoreCatalogResponse {
  courses: Array<{
    id: string;
    title: string;
    description: string;
    level: string;
    kind: string;
    price: number;
    currency: "rub";
  }>;
  customization: Array<{
    id: string;
    itemType: "pet" | "crystal-pack" | "course" | "subscription";
    title: string;
    amount: number;
    currency: "crystal" | "rub";
  }>;
  subscriptions: Array<{
    id: string;
    title: string;
    amount: number;
    currency: "crystal" | "rub";
  }>;
  ownedPetIds: string[];
  activePetId: string | null;
}
