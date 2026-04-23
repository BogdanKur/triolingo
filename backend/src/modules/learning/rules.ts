export const deriveAssessmentLevel = (answers: Array<{ id: string; value: string }>): string => {
  const levelAnswer = answers.find((answer) => answer.id === "level")?.value ?? "A1-A2";
  if (levelAnswer.includes("C1")) return "C1";
  if (levelAnswer.includes("B1")) return "B1";
  if (levelAnswer.includes("A1")) return "A2";
  return "A1";
};

export const deriveWeakTopicsFromAssessment = (answers: Array<{ id: string; value: string }>): string[] => {
  const topics = new Set<string>();
  const goal = answers.find((answer) => answer.id === "goal")?.value.toLowerCase() ?? "";
  const schedule = answers.find((answer) => answer.id === "schedule")?.value.toLowerCase() ?? "";
  const time = answers.find((answer) => answer.id === "time")?.value.toLowerCase() ?? "";

  if (goal.includes("граммат")) topics.add("grammar");
  if (goal.includes("говор")) topics.add("speaking");
  if (goal.includes("экзам")) topics.add("exam");
  if (schedule.includes("вечер")) topics.add("listening");
  if (time.includes("5-10")) topics.add("vocabulary");
  if (topics.size === 0) topics.add("vocabulary");

  return [...topics];
};
