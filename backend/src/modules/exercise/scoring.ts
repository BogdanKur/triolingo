import { jaccardSimilarity, normalizeText } from "../../shared/domain.js";

export interface TextScoreResult {
  correct: boolean;
  score: number;
  feedback: string;
  grammarHint: string | null;
  mistakes: string[];
}

export interface BuildScoreResult extends TextScoreResult {}
export interface MatchScoreResult extends TextScoreResult {}

export const grammarHintFor = (expected: string, actual: string): string | null => {
  if (normalizeText(expected) === normalizeText(actual)) return null;
  if (!/[.!?]$/.test(actual.trim())) {
    return "Проверьте пунктуацию и завершение предложения.";
  }
  if (actual.trim().split(" ").length < expected.trim().split(" ").length) {
    return "Ответ слишком короткий, возможно пропущены служебные слова.";
  }
  return "Проверьте порядок слов и форму глагола.";
};

export const evaluateTextAnswer = (expectedRaw: string, userAnswerRaw: string): TextScoreResult => {
  const expected = normalizeText(expectedRaw);
  const actual = normalizeText(userAnswerRaw);
  const similarity = jaccardSimilarity(expected, actual);
  const correct = similarity >= 0.7;
  const score = Math.round(similarity * 100);

  return {
    correct,
    score,
    feedback: correct ? "Ответ принят" : "Ответ неточный, попробуйте еще раз.",
    grammarHint: correct ? null : grammarHintFor(expectedRaw, userAnswerRaw),
    mistakes: correct ? [] : ["Смысл фразы частично не совпадает с ожидаемым."],
  };
};

export const evaluateBuildSequence = (expectedSequence: string[], userSequence: string[]): BuildScoreResult => {
  const expected = expectedSequence.map(normalizeText);
  const actual = userSequence.map(normalizeText);
  const total = expected.length;
  const matches = expected.reduce((acc, token, index) => acc + (token === (actual[index] ?? "") ? 1 : 0), 0);
  const score = Math.round((matches / total) * 100);
  const correct = matches === total;

  return {
    correct,
    score,
    feedback: correct ? "Фраза собрана верно." : "Порядок слов неверный.",
    grammarHint: correct ? null : "В английском фиксированный порядок слов: подлежащее -> сказуемое -> дополнение.",
    mistakes: correct ? [] : ["Неверный порядок слов."],
  };
};

export const evaluateMatchPairs = (pairs: Array<{ left: string; right: string }>): MatchScoreResult => {
  const total = pairs.length;
  const correctCount = pairs.reduce((acc, pair) => {
    const isCorrect = normalizeText(pair.left) === normalizeText(pair.right);
    return acc + (isCorrect ? 1 : 0);
  }, 0);

  const score = Math.round((correctCount / total) * 100);
  const correct = correctCount === total;

  return {
    correct,
    score,
    feedback: correct ? "Все соответствия верные." : "Некоторые пары подобраны неверно.",
    grammarHint: null,
    mistakes: correct ? [] : [`Ошибочных совпадений: ${total - correctCount}`],
  };
};
