import { describe, expect, it } from "vitest";
import { calculateNextStreak } from "../../src/modules/gamification/rules.js";
import { xpToLevel } from "../../src/shared/domain.js";
describe("gamification rules", () => {
    const now = new Date("2026-04-15T12:00:00.000Z");
    it("starts new streak for first activity", () => {
        const next = calculateNextStreak({
            currentStreak: 0,
            lastActivityDate: null,
            now,
        });
        expect(next).toBe(1);
    });
    it("increments streak for yesterday activity", () => {
        const next = calculateNextStreak({
            currentStreak: 4,
            lastActivityDate: "2026-04-14",
            now,
        });
        expect(next).toBe(5);
    });
    it("resets streak if day was missed", () => {
        const next = calculateNextStreak({
            currentStreak: 6,
            lastActivityDate: "2026-04-12",
            now,
        });
        expect(next).toBe(1);
    });
    it("maps xp thresholds to levels", () => {
        expect(xpToLevel(0)).toBe("A1");
        expect(xpToLevel(350)).toBe("B1");
        expect(xpToLevel(1200)).toBe("C1");
    });
});
