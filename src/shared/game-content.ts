export type MiniStepId = "speak" | "build" | "gap";
export type DailyTaskId = "mini" | "audio" | "translation";
export type LessonStepId = 1 | 2 | 3 | 4 | 5;

export interface DailyTaskContextQuery {
  isDaily: boolean;
  taskId: DailyTaskId | null;
  miniStep: MiniStepId | null;
}

export interface LessonStepContextQuery {
  lessonStep: LessonStepId | null;
}

export interface WordChallenge {
  id: string;
  promptWord: string;
  options: string[];
  expected: string;
}

export interface GapChallenge {
  id: string;
  prompt: string;
  options: string[];
  expected: string;
}

export interface BuildChallenge {
  id: string;
  prompt: string;
  expectedSequence: string[];
  options: string[];
}

export interface MatchChallenge {
  id: string;
  leftWords: string[];
  rightWords: string[];
}

export interface SpeakChallenge {
  id: string;
  phrase: string;
}

export interface TranslationChallenge {
  id: string;
  sourcePhrase: string;
  expected: string;
}

export interface AudioChallenge {
  id: string;
  sourcePhrase: string;
  expected: string;
}

interface PhrasePair {
  id: string;
  en: string;
  ru: string;
}

interface VocabPair {
  id: string;
  en: string;
  ru: string;
}

export interface MiniLessonSession {
  date: string;
  speak: SpeakChallenge;
  build: BuildChallenge;
  gap: GapChallenge;
}

interface DailyChallengeSession {
  date: string;
  audio: AudioChallenge;
  translation: TranslationChallenge;
}

interface LessonMapProgress {
  completedSteps: LessonStepId[];
}

const STORAGE_PREFIX = "triolingo.pool";
const MINI_SESSION_KEY = "triolingo.daily.mini.session";
const DAILY_CHALLENGES_KEY = "triolingo.daily.challenge.session";
const LESSON_MAP_PROGRESS_KEY = "triolingo.lesson.map.progress";

const shuffle = <T>(values: T[]): T[] => {
  const clone = [...values];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const isoToday = (): string => new Date().toISOString().slice(0, 10);

const readJson = <T>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const historyKey = (poolId: string): string => `${STORAGE_PREFIX}.${poolId}.${isoToday()}`;

const pickUnique = <T extends { id: string }>(poolId: string, values: T[]): T => {
  if (values.length === 0) {
    throw new Error(`Pool ${poolId} is empty`);
  }

  const key = historyKey(poolId);
  const used = readJson<string[]>(key) ?? [];
  const usedSet = new Set(used);

  const available = values.filter((value) => !usedSet.has(value.id));
  const source = available.length > 0 ? available : values;
  const picked = source[Math.floor(Math.random() * source.length)] as T;

  const nextUsed = available.length > 0 ? [...used, picked.id] : [picked.id];
  writeJson(key, nextUsed.slice(-500));

  return picked;
};

const vocabulary: VocabPair[] = [
  { id: "word-window", en: "window", ru: "окно" },
  { id: "word-door", en: "door", ru: "дверь" },
  { id: "word-tree", en: "tree", ru: "дерево" },
  { id: "word-apple", en: "apple", ru: "яблоко" },
  { id: "word-notebook", en: "notebook", ru: "тетрадь" },
  { id: "word-keyboard", en: "keyboard", ru: "клавиатура" },
  { id: "word-city", en: "city", ru: "город" },
  { id: "word-country", en: "country", ru: "страна" },
  { id: "word-family", en: "family", ru: "семья" },
  { id: "word-friend", en: "friend", ru: "друг" },
  { id: "word-teacher", en: "teacher", ru: "учитель" },
  { id: "word-student", en: "student", ru: "студент" },
  { id: "word-morning", en: "morning", ru: "утро" },
  { id: "word-evening", en: "evening", ru: "вечер" },
  { id: "word-school", en: "school", ru: "школа" },
  { id: "word-office", en: "office", ru: "офис" },
  { id: "word-market", en: "market", ru: "магазин" },
  { id: "word-library", en: "library", ru: "библиотека" },
  { id: "word-phone", en: "phone", ru: "телефон" },
  { id: "word-table", en: "table", ru: "стол" },
  { id: "word-chair", en: "chair", ru: "стул" },
  { id: "word-water", en: "water", ru: "вода" },
  { id: "word-coffee", en: "coffee", ru: "кофе" },
  { id: "word-tea", en: "tea", ru: "чай" },
  { id: "word-breakfast", en: "breakfast", ru: "завтрак" },
  { id: "word-lunch", en: "lunch", ru: "обед" },
  { id: "word-dinner", en: "dinner", ru: "ужин" },
  { id: "word-weekend", en: "weekend", ru: "выходные" },
  { id: "word-summer", en: "summer", ru: "лето" },
  { id: "word-winter", en: "winter", ru: "зима" },
  { id: "word-rain", en: "rain", ru: "дождь" },
  { id: "word-sun", en: "sun", ru: "солнце" },
  { id: "word-cloud", en: "cloud", ru: "облако" },
  { id: "word-river", en: "river", ru: "река" },
  { id: "word-mountain", en: "mountain", ru: "гора" },
  { id: "word-music", en: "music", ru: "музыка" },
  { id: "word-movie", en: "movie", ru: "фильм" },
  { id: "word-game", en: "game", ru: "игра" },
  { id: "word-travel", en: "travel", ru: "путешествие" },
  { id: "word-ticket", en: "ticket", ru: "билет" },
  { id: "word-hotel", en: "hotel", ru: "отель" },
  { id: "word-train", en: "train", ru: "поезд" },
  { id: "word-plane", en: "plane", ru: "самолет" },
  { id: "word-bus", en: "bus", ru: "автобус" },
  { id: "word-station", en: "station", ru: "станция" },
  { id: "word-question", en: "question", ru: "вопрос" },
  { id: "word-answer", en: "answer", ru: "ответ" },
  { id: "word-letter", en: "letter", ru: "письмо" },
  { id: "word-message", en: "message", ru: "сообщение" },
  { id: "word-picture", en: "picture", ru: "картинка" },
  { id: "word-language", en: "language", ru: "язык" },
  { id: "word-word", en: "word", ru: "слово" },
  { id: "word-phrase", en: "phrase", ru: "фраза" },
  { id: "word-lesson", en: "lesson", ru: "урок" },
  { id: "word-level", en: "level", ru: "уровень" },
  { id: "word-progress", en: "progress", ru: "прогресс" },
  { id: "word-achievement", en: "achievement", ru: "достижение" },
  { id: "word-crystal", en: "crystal", ru: "кристалл" },
  { id: "word-skill", en: "skill", ru: "навык" },
  { id: "word-pronunciation", en: "pronunciation", ru: "произношение" },
  { id: "word-translation", en: "translation", ru: "перевод" },
  { id: "word-audio", en: "audio", ru: "аудио" },
  { id: "word-repeat", en: "repeat", ru: "повтор" },
  { id: "word-goal", en: "goal", ru: "цель" },
  { id: "word-plan", en: "plan", ru: "план" },
  { id: "word-home", en: "home", ru: "дом" },
  { id: "word-room", en: "room", ru: "комната" },
  { id: "word-kitchen", en: "kitchen", ru: "кухня" },
  { id: "word-garden", en: "garden", ru: "сад" },
  { id: "word-street", en: "street", ru: "улица" },
  { id: "word-bridge", en: "bridge", ru: "мост" },
  { id: "word-book", en: "book", ru: "книга" },
  { id: "word-pen", en: "pen", ru: "ручка" },
  { id: "word-paper", en: "paper", ru: "бумага" },
  { id: "word-clock", en: "clock", ru: "часы" },
  { id: "word-minute", en: "minute", ru: "минута" },
  { id: "word-hour", en: "hour", ru: "час" },
  { id: "word-day", en: "day", ru: "день" },
  { id: "word-night", en: "night", ru: "ночь" },
  { id: "word-idea", en: "idea", ru: "идея" },
  { id: "word-practice", en: "practice", ru: "практика" },
];

const phraseVerbs = [
  { en: "read", ru: "читаю" },
  { en: "write", ru: "пишу" },
  { en: "learn", ru: "учу" },
  { en: "review", ru: "повторяю" },
  { en: "practice", ru: "практикую" },
  { en: "watch", ru: "смотрю" },
  { en: "listen to", ru: "слушаю" },
  { en: "buy", ru: "покупаю" },
  { en: "choose", ru: "выбираю" },
  { en: "prepare", ru: "готовлю" },
  { en: "clean", ru: "убираю" },
  { en: "visit", ru: "посещаю" },
];

const phraseObjects = [
  { en: "new words", ru: "новые слова" },
  { en: "short phrases", ru: "короткие фразы" },
  { en: "a lesson", ru: "урок" },
  { en: "my notebook", ru: "мою тетрадь" },
  { en: "an audio track", ru: "аудио запись" },
  { en: "a translation", ru: "перевод" },
  { en: "a grammar rule", ru: "грамматическое правило" },
  { en: "my homework", ru: "домашнее задание" },
  { en: "a vocabulary list", ru: "словарный список" },
  { en: "daily tasks", ru: "ежедневные задания" },
  { en: "a speaking exercise", ru: "упражнение на речь" },
  { en: "a short dialog", ru: "короткий диалог" },
];

const phraseTimes = [
  { en: "every day", ru: "каждый день" },
  { en: "in the morning", ru: "утром" },
  { en: "in the evening", ru: "вечером" },
  { en: "at home", ru: "дома" },
  { en: "after work", ru: "после работы" },
  { en: "before dinner", ru: "перед ужином" },
  { en: "on weekends", ru: "по выходным" },
  { en: "with my friend", ru: "с моим другом" },
];

const generatedPhrasePairs: PhrasePair[] = [];
for (let verbIndex = 0; verbIndex < phraseVerbs.length; verbIndex += 1) {
  for (let objectIndex = 0; objectIndex < phraseObjects.length; objectIndex += 1) {
    for (let timeIndex = 0; timeIndex < phraseTimes.length; timeIndex += 1) {
      const verb = phraseVerbs[verbIndex];
      const object = phraseObjects[objectIndex];
      const time = phraseTimes[timeIndex];
      generatedPhrasePairs.push({
        id: `phrase-${verbIndex}-${objectIndex}-${timeIndex}`,
        en: `I ${verb.en} ${object.en} ${time.en}`,
        ru: `Я ${verb.ru} ${object.ru} ${time.ru}`,
      });
    }
  }
}

const phrasePairs: PhrasePair[] = generatedPhrasePairs;

const englishWordBank = Array.from(new Set(phrasePairs.flatMap((item) => item.en.split(" ")))).filter(Boolean);

const pickDistractors = (expected: string, count: number, source: string[]): string[] => {
  const normalizedExpected = expected.toLowerCase();
  const unique = source.filter((item) => item.toLowerCase() !== normalizedExpected);
  return shuffle(unique).slice(0, count);
};

export const getWordChallenge = (): WordChallenge => {
  const correct = pickUnique("word", vocabulary);
  const distractors = shuffle(vocabulary.filter((item) => item.id !== correct.id)).slice(0, 3).map((item) => item.ru);
  const options = shuffle([correct.ru, ...distractors]);

  return {
    id: correct.id,
    promptWord: correct.en,
    options,
    expected: correct.ru,
  };
};

export const getGapChallenge = (): GapChallenge => {
  const phrase = pickUnique("gap", phrasePairs);
  const tokens = phrase.en.split(" ");
  const stopWords = new Set(["I", "a", "an", "the", "my", "with", "in", "on", "at", "to", "every", "after", "before"]);
  const candidateIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter((item) => !stopWords.has(item.token) && item.token.length > 2)
    .map((item) => item.index);

  const blankIndex = candidateIndexes.length > 0
    ? candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)]
    : Math.max(1, Math.floor(tokens.length / 2));

  const expected = tokens[blankIndex] ?? "";
  const promptTokens = [...tokens];
  promptTokens[blankIndex] = "______";

  const distractors = pickDistractors(expected, 3, englishWordBank);
  const options = shuffle([expected, ...distractors]);

  return {
    id: phrase.id,
    prompt: promptTokens.join(" "),
    options,
    expected,
  };
};

export const getBuildChallenge = (): BuildChallenge => {
  const phrase = pickUnique("build", phrasePairs);
  const expectedSequence = phrase.en.split(" ").filter(Boolean);
  const options = shuffle(expectedSequence);

  return {
    id: phrase.id,
    prompt: phrase.ru,
    expectedSequence,
    options,
  };
};

export const getMatchChallenge = (): MatchChallenge => {
  const pairs = shuffle(vocabulary).slice(0, 4);
  return {
    id: `match-${pairs.map((item) => item.id).join("-")}`,
    leftWords: pairs.map((item) => item.ru),
    rightWords: shuffle(pairs.map((item) => item.ru)),
  };
};

export const getSpeakChallenge = (): SpeakChallenge => {
  const phrase = pickUnique("speak", phrasePairs);
  return {
    id: phrase.id,
    phrase: phrase.en,
  };
};

export const getTranslationChallenge = (): TranslationChallenge => {
  const phrase = pickUnique("translation", phrasePairs);
  return {
    id: phrase.id,
    sourcePhrase: phrase.ru,
    expected: phrase.en,
  };
};

export const getAudioChallenge = (): AudioChallenge => {
  const phrase = pickUnique("audio", phrasePairs);
  return {
    id: phrase.id,
    sourcePhrase: phrase.ru,
    expected: phrase.en,
  };
};

export const parseDailyTaskContext = (search = window.location.search): DailyTaskContextQuery => {
  const params = new URLSearchParams(search);
  const taskIdRaw = params.get("dailyTask");
  const miniStepRaw = params.get("miniStep");

  const taskId: DailyTaskId | null = taskIdRaw === "mini" || taskIdRaw === "audio" || taskIdRaw === "translation"
    ? taskIdRaw
    : null;

  const miniStep: MiniStepId | null = miniStepRaw === "speak" || miniStepRaw === "build" || miniStepRaw === "gap"
    ? miniStepRaw
    : null;

  return {
    isDaily: Boolean(taskId),
    taskId,
    miniStep,
  };
};

export const buildDailyTaskUrl = (taskId: DailyTaskId, miniStep?: MiniStepId): string => {
  if (taskId === "audio") return "/audio.html?dailyTask=audio";
  if (taskId === "translation") return "/translation.html?dailyTask=translation";

  const step = miniStep ?? "speak";
  const pathByStep: Record<MiniStepId, string> = {
    speak: "/exercise-speak.html",
    build: "/exercise-build.html",
    gap: "/exercise-gap.html",
  };

  return `${pathByStep[step]}?dailyTask=mini&miniStep=${step}`;
};

export const startMiniLessonSession = (): MiniLessonSession => {
  const session: MiniLessonSession = {
    date: isoToday(),
    speak: getSpeakChallenge(),
    build: getBuildChallenge(),
    gap: getGapChallenge(),
  };
  writeJson(MINI_SESSION_KEY, session);
  return session;
};

export const getMiniLessonSession = (): MiniLessonSession | null => {
  const session = readJson<MiniLessonSession>(MINI_SESSION_KEY);
  if (!session) return null;
  if (session.date !== isoToday()) {
    localStorage.removeItem(MINI_SESSION_KEY);
    return null;
  }
  return session;
};

export const ensureMiniLessonSession = (): MiniLessonSession => {
  const existing = getMiniLessonSession();
  if (existing) return existing;
  return startMiniLessonSession();
};

export const clearMiniLessonSession = (): void => {
  localStorage.removeItem(MINI_SESSION_KEY);
};

export const getDailyChallengeSession = (): DailyChallengeSession | null => {
  const session = readJson<DailyChallengeSession>(DAILY_CHALLENGES_KEY);
  if (!session) return null;
  if (session.date !== isoToday()) {
    localStorage.removeItem(DAILY_CHALLENGES_KEY);
    return null;
  }
  return session;
};

export const ensureDailyChallengeSession = (): DailyChallengeSession => {
  const existing = getDailyChallengeSession();
  if (existing) return existing;

  const session: DailyChallengeSession = {
    date: isoToday(),
    audio: getAudioChallenge(),
    translation: getTranslationChallenge(),
  };
  writeJson(DAILY_CHALLENGES_KEY, session);
  return session;
};

const normalizeLessonStep = (value: unknown): LessonStepId | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed as LessonStepId;
};

const normalizeCompletedSteps = (steps: unknown): LessonStepId[] => {
  if (!Array.isArray(steps)) return [];
  const normalized = steps
    .map((step) => normalizeLessonStep(step))
    .filter((step): step is LessonStepId => step !== null);
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
};

export const getLessonMapProgress = (): LessonMapProgress => {
  const raw = readJson<LessonMapProgress>(LESSON_MAP_PROGRESS_KEY);
  return {
    completedSteps: normalizeCompletedSteps(raw?.completedSteps),
  };
};

const saveLessonMapProgress = (progress: LessonMapProgress): void => {
  writeJson(LESSON_MAP_PROGRESS_KEY, {
    completedSteps: normalizeCompletedSteps(progress.completedSteps),
  });
};

export const isLessonStepCompleted = (step: LessonStepId): boolean => {
  return getLessonMapProgress().completedSteps.includes(step);
};

export const isLessonStepUnlocked = (step: LessonStepId): boolean => {
  if (step === 1) return true;
  return isLessonStepCompleted((step - 1) as LessonStepId);
};

export const markLessonStepCompleted = (step: LessonStepId): void => {
  if (!isLessonStepUnlocked(step)) {
    return;
  }
  const progress = getLessonMapProgress();
  if (progress.completedSteps.includes(step)) {
    return;
  }
  progress.completedSteps.push(step);
  saveLessonMapProgress(progress);
};

export const parseLessonStepContext = (search = window.location.search): LessonStepContextQuery => {
  const params = new URLSearchParams(search);
  return {
    lessonStep: normalizeLessonStep(params.get("lessonStep")),
  };
};


