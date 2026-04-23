import type { ProfileScreenConfig } from "../../shared/types/profile";

export const profileConfig: ProfileScreenConfig = {
  assets: {
    bg: "/assets/images/profile/bg.png",
    mascot: "/assets/images/profile/mascot.png",
    burger: "/assets/images/profile/hamburger.svg",
    drawerLine: "/assets/images/profile/drawer-line.svg",
    heroBg: "/assets/images/profile/banner.png",
    heroAvatar: "/assets/images/profile/avatar.png",
    heroEdit: "/assets/images/profile/edit.svg",
    languageFlag: "/assets/images/profile/flag-russia.svg",
    statLevelIcon: "/assets/images/profile/stat-level.png",
  },
  texts: {
    brand: "Triolingo",
    pageTitle: "Профиль",
    burgerAriaLabel: "Открыть меню",
    profileName: "Lika life",
    languageLabel: "Русский (Russian)",
    statsTitle: "Статистика",
    achievementsTitle: "Достижения",
  },
  stats: [
    { id: "streak", icon: "/assets/images/profile/stat-streak.svg", value: "3", suffix: "дня подряд" },
    { id: "xp", icon: "/assets/images/profile/stat-xp.svg", value: "25", suffix: "набрано опыта" },
    { id: "levels", icon: "/assets/images/profile/stat-level.png", value: "10", suffix: "уровней пройдено" },
  ],
  achievements: [
    {
      id: "fan",
      icon: "/assets/images/profile/ach-fan.png",
      title: "Фанат",
      description: "Держите ритм 3 дня",
      highlighted: true,
    },
    {
      id: "thinker",
      icon: "/assets/images/profile/ach-wise.svg",
      title: "Мыслитель",
      description: "Заработали 30 очков из 100",
      current: 30,
      total: 100,
    },
    {
      id: "winner",
      icon: "/assets/images/profile/ach-winner.svg",
      title: "Победитель",
      description: "Заработали 30 очков из 100",
      current: 30,
      total: 100,
    },
  ],
  drawerItems: [
    { id: "home", label: "Главная", href: "/fifth.html" },
    { id: "courses", label: "Курсы", href: "/courses.html" },
    { id: "customization", label: "Кастомизация", href: "/customization.html" },
    { id: "profile", label: "Профиль", href: "/profile.html" },
    { id: "settings", label: "Настройки", href: "/settings.html" },
  ],
};

