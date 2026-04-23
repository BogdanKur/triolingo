import type { ExerciseOptionItem, ExerciseScreenConfig } from "../../shared/types/exercise";

export interface ExerciseBuildConfig extends ExerciseScreenConfig {
  options: ExerciseOptionItem[];
  correctOrderIds: string[];
}

export const exerciseBuildConfig: ExerciseBuildConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Собери фразу",
    closeAriaLabel: "Закрыть сборку фразы",
    checkLabel: "Проверить",
    prompt: "Сегодня прекрасный день, я собираюсь прогуляться!",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 1000,
    buttonMaxWidth: 503,
  },
  actions: {
    closeHref: "/fifth.html",
  },
  options: [
    { id: "walk", label: "walk!" },
    { id: "im", label: "I'm" },
    { id: "nice", label: "nice" },
    { id: "day", label: "day" },
    { id: "its", label: "It's" },
    { id: "a", label: "a" },
    { id: "going", label: "going" },
    { id: "for", label: "for", selected: true, counter: 1 },
  ],
  correctOrderIds: ["its", "a", "nice", "day", "im", "going", "for", "walk"],
};
