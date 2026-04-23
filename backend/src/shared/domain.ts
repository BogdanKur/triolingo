export const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");

export const tokenize = (value: string): string[] => normalizeText(value).split(" ").filter(Boolean);

export const jaccardSimilarity = (left: string, right: string): number => {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));

  if (leftSet.size === 0 && rightSet.size === 0) return 1;
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) intersection += 1;
  });

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
};

export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const levels: LanguageLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const levelToDifficulty = (level: LanguageLevel): number => levels.indexOf(level) + 1;

export const xpToLevel = (xp: number): LanguageLevel => {
  if (xp >= 1500) return "C2";
  if (xp >= 1000) return "C1";
  if (xp >= 600) return "B2";
  if (xp >= 300) return "B1";
  if (xp >= 100) return "A2";
  return "A1";
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
