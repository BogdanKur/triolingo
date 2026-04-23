import type { TranslationScreenConfig } from "../../shared/types/translation";

export const translationConfig: TranslationScreenConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Переведите фразу",
    closeAriaLabel: "Закрыть перевод фразы",
    sourcePhrase: "London is the capital of Great Britain",
    checkLabel: "Проверить",
    inputAriaLabel: "Введите перевод фразы",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 910,
    buttonMaxWidth: 503,
  },
  input: {
    placeholder: "Введите перевод...",
    maxLength: 500,
  },
};
