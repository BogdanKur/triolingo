import type { AudioScreenConfig } from "../../shared/types/audio";

export const audioConfig: AudioScreenConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    playIcon: "/assets/images/audio/play-icon.svg",
    playIconActive: "/assets/images/audio/group-3-active.svg",
    closeIcon: "/assets/images/audio/close.svg",
  },
  texts: {
    pageTitle: "Аудирование",
    closeAriaLabel: "Закрыть аудирование",
    inputAriaLabel: "Введите услышанную фразу на английском",
  },
  layout: {
    contentMaxWidth: 1200,
    cardMaxWidth: 910,
    buttonMaxWidth: 503,
  },
  instruction: {
    id: "instruction",
    icon: "/assets/images/audio/play-icon.svg",
    title: "Прослушайте аудиозапись",
    subtitle: "и введите услышанную фразу на английском",
  },
  input: {
    placeholder: "Введите услышанную фразу...",
    maxLength: 500,
  },
  cta: {
    label: "Проверить",
  },
};
