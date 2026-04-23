import { describe, expect, it } from "vitest";
import { deriveAssessmentLevel, deriveWeakTopicsFromAssessment } from "../../src/modules/learning/rules.js";

describe("assessment rules", () => {
  it("derives level from profile answer", () => {
    const level = deriveAssessmentLevel([
      { id: "level", value: "B1-B2" },
      { id: "goal", value: "Свободно говорить" },
    ]);
    expect(level).toBe("B1");
  });

  it("extracts weak topics from answers", () => {
    const weakTopics = deriveWeakTopicsFromAssessment([
      { id: "time", value: "5-10 мин." },
      { id: "goal", value: "Улучшить грамматику" },
      { id: "schedule", value: "Вечером" },
    ]);

    expect(weakTopics).toContain("grammar");
    expect(weakTopics).toContain("listening");
  });
});
