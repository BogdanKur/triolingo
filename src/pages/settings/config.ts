import type { SettingsScreenConfig } from "../../shared/types/settings";

export const settingsConfig: SettingsScreenConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    mascot: "/assets/images/fifth/drawer-icon.png",
    burger: "/assets/images/fifth/hamburger.svg",
    drawerLine: "/assets/images/fifth/drawer-line.svg",
    moonIcon: "/assets/images/settings/moon.svg",
  },
  texts: {
    brand: "Triolingo",
    pageTitle: "Настройки",
    burgerAriaLabel: "Открыть меню",
    nightModeLabel: "Ночной режим",
  },
  toggles: [
    { id: "music", label: "Фоновая музыка", defaultOn: false },
    { id: "sound", label: "Звуковые эффекты", defaultOn: true },
    { id: "telegram", label: "Уведомления в телеграм боте", defaultOn: true },
    { id: "night", label: "Тема", defaultOn: false, withIcon: true },
  ],
  actions: [
    { id: "change-language", label: "Сменить язык для изучения" },
    { id: "support", label: "Остались вопросы? Обратись в поддержку!" },
  ],
  drawerItems: [
    { id: "home", label: "Главная", href: "/fifth.html" },
    { id: "courses", label: "Курсы", href: "/courses.html" },
    { id: "customization", label: "Кастомизация", href: "/customization.html" },
    { id: "profile", label: "Профиль", href: "/profile.html" },
    { id: "settings", label: "Настройки", href: "/settings.html" },
  ],
};
