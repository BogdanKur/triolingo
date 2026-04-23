import type { ExerciseScreenConfig } from "../../shared/types/exercise";

export interface ExerciseSpeakConfig extends ExerciseScreenConfig {
  phrase: string;
  micIcon: string;
}

export const exerciseSpeakConfig: ExerciseSpeakConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Произнеси фразу",
    closeAriaLabel: "Закрыть упражнение на произношение",
    checkLabel: "Проверить",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 910,
    buttonMaxWidth: 503,
  },
  actions: {
    closeHref: "/fifth.html",
  },
  phrase: "London is the capital of Great Britain",
  micIcon: "/assets/images/exercises/speak/mic-button.png",
};
