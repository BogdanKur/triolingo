import type { PremiumHomeConfig } from "../../shared/types/premium-home";

export const premiumHomeConfig: PremiumHomeConfig = {
  assets: {
    bg: "/assets/images/premium-home/bg.png",
    mascot: "/assets/images/premium-home/mascot.png",
    burger: "/assets/images/premium-home/hamburger.svg",
    courseIcon: "/assets/images/premium-home/course-icon.png",
  },
  texts: {
    brand: "Triolingo",
    pageTitle: "Главная",
    courseTitle: "Повышение уровня",
    courseDescription:
      "Углубленное изучение языка для перехода на следующий уровень владения.",
    dailyTitle: "Ежедневные задания",
    burgerAriaLabel: "Открыть меню",
  },
  stats: [
    { id: "streak", icon: "/assets/images/premium-home/stat-fire.png", value: "6", alt: "Огонь" },
    { id: "crystals", icon: "/assets/images/premium-home/stat-crystal.svg", value: "125", alt: "Кристаллы" },
    { id: "xp", icon: "/assets/images/premium-home/stat-xp.svg", value: "25", alt: "Опыт" },
  ],
  courseCard: {
    priceCrystals: "150",
    priceRubles: "599 р",
  },
  exerciseList: [
    { id: "match", label: "Найди соответствие" },
    { id: "word", label: "Выбери правильное слово" },
    { id: "speak", label: "Произнеси фразу" },
    { id: "gap", label: "Заполни пропуск" },
    { id: "build", label: "Собери фразу" },
  ],
  dailyTasks: [
    { id: "mini", title: "Мини-урок", reward: "+100", icon: "/assets/images/premium-home/task-arrow.svg" },
    { id: "audio", title: "Аудирование", reward: "+100", icon: "/assets/images/premium-home/task-arrow.svg" },
    { id: "translation", title: "Перевод фразы", reward: "+100", icon: "/assets/images/premium-home/task-arrow.svg" },
  ],
};
