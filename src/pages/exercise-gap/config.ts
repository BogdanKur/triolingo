import type { ExerciseOptionItem, ExerciseScreenConfig } from "../../shared/types/exercise";

export interface ExerciseGapConfig extends ExerciseScreenConfig {
  options: ExerciseOptionItem[];
}

export const exerciseGapConfig: ExerciseGapConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Заполни пропуск",
    closeAriaLabel: "Закрыть упражнение на пропуск",
    checkLabel: "Проверить",
    prompt: "London is the ______ of Great Britain",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 910,
    buttonMaxWidth: 503,
  },
  actions: {
    closeHref: "/fifth.html",
  },
  options: [
    { id: "capital", label: "capital" },
    { id: "door", label: "Дверь" },
    { id: "tree-1", label: "Дерево" },
    { id: "apple", label: "Яблоко" },
    { id: "tree-2", label: "Дерево" },
  ],
};
