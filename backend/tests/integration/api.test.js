import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "../../src/shared/jwt.js";
vi.mock("../../src/modules/auth/auth.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/auth/auth.service.js");
    return {
        ...actual,
        oauthLogin: vi.fn(async () => ({
            token: "stub-token",
            user: {
                id: 1,
                email: "stub@example.com",
                name: "Stub User",
                role: "student",
                subscriptionStatus: "free",
                preferredLanguage: "ru",
                learningLanguage: "en",
            },
        })),
        getMe: vi.fn(async () => ({
            id: 1,
            email: "stub@example.com",
            name: "Stub User",
            role: "student",
            subscriptionStatus: "free",
            preferredLanguage: "ru",
            learningLanguage: "en",
        })),
    };
});
vi.mock("../../src/modules/profile/profile.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/profile/profile.service.js");
    return {
        ...actual,
        getProfile: vi.fn(async () => ({
            userId: 1,
            email: "stub@example.com",
            name: "Stub User",
            avatar: null,
            notificationLevel: "all",
            preferredLanguage: "ru",
            learningLanguage: "en",
            subscriptionStatus: "free",
        })),
        patchProfile: vi.fn(async () => ({
            userId: 1,
            email: "stub@example.com",
            name: "New Name",
            avatar: null,
            notificationLevel: "important",
            preferredLanguage: "ru",
            learningLanguage: "en",
            subscriptionStatus: "free",
        })),
        getSettings: vi.fn(async () => ({
            musicEnabled: false,
            soundEnabled: true,
            telegramNotifications: true,
            nightMode: false,
        })),
        patchSettings: vi.fn(async () => ({
            musicEnabled: true,
            soundEnabled: true,
            telegramNotifications: true,
            nightMode: false,
        })),
        switchLearningLanguage: vi.fn(async () => ({ language: "en" })),
    };
});
vi.mock("../../src/modules/learning/learning.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/learning/learning.service.js");
    return {
        ...actual,
        submitAssessment: vi.fn(async () => ({
            level: "B1",
            weakTopics: ["grammar"],
            recommendedLessonIds: [1, 2],
        })),
        getDailyPlan: vi.fn(async () => ({
            lesson: { id: 1, title: "Daily", topic: "grammar", difficulty: 2 },
            exercises: [{ id: 10, type: "word", content: { prompt: "Window" } }],
            availableExerciseTypes: ["word"],
        })),
    };
});
vi.mock("../../src/modules/exercise/exercise.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/exercise/exercise.service.js");
    return {
        ...actual,
        checkExercise: vi.fn(async () => ({
            correct: true,
            score: 100,
            feedback: "ok",
            grammarHint: null,
            mistakes: [],
            progress: {
                language: "en",
                level: "A2",
                totalXp: 120,
                crystals: 125,
                currentStreak: 2,
                longestStreak: 2,
                accuracy: 90,
                unlockedAchievements: [],
            },
        })),
    };
});
vi.mock("../../src/modules/progress/progress.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/progress/progress.service.js");
    return {
        ...actual,
        getProgressSummary: vi.fn(async () => ({
            language: "en",
            level: "A2",
            totalXp: 120,
            crystals: 125,
            currentStreak: 2,
            longestStreak: 2,
            accuracy: 88,
            weakTopics: ["grammar"],
            achievements: [],
            notifications: [],
        })),
        getProgressStatistics: vi.fn(async () => ({
            summary: { level: "A2" },
            statistics: { totalAttempts: 3 },
        })),
        getProgressReport: vi.fn(async () => ({
            improvements: ["grammar"],
            weakPoints: ["speaking"],
            summary: "test",
        })),
    };
});
vi.mock("../../src/modules/store/store.service.js", async () => {
    const actual = await vi.importActual("../../src/modules/store/store.service.js");
    return {
        ...actual,
        getStoreCatalog: vi.fn(async () => ({ courses: [], customization: [], subscriptions: [] })),
        createPurchase: vi.fn(async () => ({ success: true, itemId: "x", itemType: "pet" })),
        upgradeSubscription: vi.fn(async () => ({ success: true, itemId: "upgrade", itemType: "subscription" })),
    };
});
describe("api integration (supertest)", () => {
    const authHeader = `Bearer ${signToken({ sub: 1, provider: "google" })}`;
    let app;
    beforeEach(async () => {
        vi.clearAllMocks();
        ({ app } = await import("../../src/app.js"));
    });
    it("handles oauth login and current user", async () => {
        const login = await request(app).post("/api/auth/oauth/google").send({ oauthId: "g-1" });
        expect(login.status).toBe(200);
        expect(login.body.user.id).toBe(1);
        const me = await request(app).get("/api/auth/me").set("Authorization", authHeader);
        expect(me.status).toBe(200);
        expect(me.body.user.name).toBe("Stub User");
    });
    it("handles assessment and exercise check", async () => {
        const assessment = await request(app)
            .post("/api/assessment/submit")
            .set("Authorization", authHeader)
            .send({ answers: [{ id: "level", value: "B1-B2" }] });
        expect(assessment.status).toBe(200);
        const exercise = await request(app)
            .post("/api/exercises/word/check")
            .set("Authorization", authHeader)
            .send({ expected: "Window", userAnswer: "Window" });
        expect(exercise.status).toBe(200);
        expect(exercise.body.correct).toBe(true);
    });
    it("handles progress and store endpoints", async () => {
        const summary = await request(app).get("/api/progress/summary").set("Authorization", authHeader);
        expect(summary.status).toBe(200);
        const report = await request(app).get("/api/progress/report").set("Authorization", authHeader);
        expect(report.status).toBe(200);
        const purchase = await request(app)
            .post("/api/store/purchase")
            .set("Authorization", authHeader)
            .send({ itemType: "pet", itemId: "pet-1", amount: 15, currency: "crystal" });
        expect(purchase.status).toBe(200);
        const upgrade = await request(app)
            .post("/api/subscription/upgrade")
            .set("Authorization", authHeader)
            .send({ planId: "upgrade-b1", amount: 999, currency: "rub" });
        expect(upgrade.status).toBe(200);
    });
});
