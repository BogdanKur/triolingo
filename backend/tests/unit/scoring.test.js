import { describe, expect, it } from "vitest";
import { evaluateBuildSequence, evaluateMatchPairs, evaluateTextAnswer, grammarHintFor } from "../../src/modules/exercise/scoring.js";
describe("exercise scoring", () => {
    it("scores exact text answer as correct", () => {
        const result = evaluateTextAnswer("London is the capital of Great Britain", "London is the capital of Great Britain");
        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
        expect(result.grammarHint).toBeNull();
    });
    it("returns grammar hint for incomplete answer", () => {
        const hint = grammarHintFor("London is the capital of Great Britain.", "London capital");
        expect(hint).toBeTruthy();
    });
    it("marks wrong order for build exercise", () => {
        const result = evaluateBuildSequence(["its", "a", "nice", "day"], ["a", "its", "nice", "day"]);
        expect(result.correct).toBe(false);
        expect(result.score).toBeLessThan(100);
    });
    it("marks all matching pairs as correct", () => {
        const result = evaluateMatchPairs([
            { left: "Окно", right: "Окно" },
            { left: "Дверь", right: "Дверь" },
        ]);
        expect(result.correct).toBe(true);
        expect(result.score).toBe(100);
    });
});
