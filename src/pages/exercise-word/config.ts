import type { ExerciseOptionItem, ExerciseScreenConfig } from "../../shared/types/exercise";

export interface ExerciseWordConfig extends ExerciseScreenConfig {
  promptWord: string;
  options: ExerciseOptionItem[];
}

export const exerciseWordConfig: ExerciseWordConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
    illustration: "/assets/images/customization/pet-2.png",
  },
  texts: {
    pageTitle: "Выбери правильное слово",
    closeAriaLabel: "Закрыть выбор слова",
    checkLabel: "Проверить",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 1120,
    buttonMaxWidth: 503,
  },
  actions: {
    closeHref: "/fifth.html",
  },
  promptWord: "Window",
  options: [
    { id: "window", label: "Окно" },
    { id: "door", label: "Дверь" },
    { id: "tree", label: "Дерево" },
    { id: "apple", label: "Яблоко" },
  ],
};
