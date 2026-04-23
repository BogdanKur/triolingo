import type { ExerciseScreenConfig } from "../../shared/types/exercise";

export interface ExerciseMatchConfig extends ExerciseScreenConfig {
  leftWords: string[];
  rightWords: string[];
}

export const exerciseMatchConfig: ExerciseMatchConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Найди соответствие между словами",
    closeAriaLabel: "Закрыть поиск соответствий",
    checkLabel: "Проверить",
    errorText: "Вы не правильно подобрали соответствие",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 1120,
    buttonMaxWidth: 503,
  },
  actions: {
    closeHref: "/fifth.html",
  },
  leftWords: ["Окно", "Дерево", "Дверь", "Яблоко"],
  rightWords: ["Окно", "Дерево", "Дверь", "Яблоко"],
};
