import { describe, expect, it } from "vitest";
import { authLoginResponseSchema, exerciseCheckResponseSchema, progressSummarySchema } from "../../src/shared/contracts.js";
describe("api contract schemas", () => {
    it("validates auth login response", () => {
        const candidate = {
            token: "jwt-token",
            user: {
                id: 1,
                email: "user@example.com",
                name: "User",
                role: "student",
                subscriptionStatus: "free",
                preferredLanguage: "ru",
                learningLanguage: "en",
            },
        };
        expect(() => authLoginResponseSchema.parse(candidate)).not.toThrow();
    });
    it("validates progress summary shape", () => {
        const candidate = {
            language: "en",
            level: "A2",
            totalXp: 120,
            crystals: 125,
            currentStreak: 2,
            longestStreak: 3,
            accuracy: 84.5,
            weakTopics: ["grammar"],
            achievements: [],
            notifications: [],
        };
        expect(() => progressSummarySchema.parse(candidate)).not.toThrow();
    });
    it("validates exercise check shape", () => {
        const candidate = {
            correct: true,
            score: 95,
            feedback: "ok",
            grammarHint: null,
            mistakes: [],
            progress: {
                language: "en",
                level: "A2",
                totalXp: 120,
                crystals: 125,
                currentStreak: 2,
                longestStreak: 3,
                accuracy: 84.5,
                unlockedAchievements: [],
            },
        };
        expect(() => exerciseCheckResponseSchema.parse(candidate)).not.toThrow();
    });
});
