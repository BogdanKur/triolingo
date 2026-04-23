import type { DrawerItem } from "../../shared/types/drawer";

export interface StatItem {
  id: string;
  icon: string;
  value: string;
  alt: string;
}

export interface DailyTaskItem {
  id: string;
  title: string;
  reward: string;
  icon: string;
}

export interface MapStepItem {
  id: string;
  label: string;
  x: number;
  y: number;
  href?: string;
  primary?: boolean;
}

export interface FifthScreenConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    lessonMap: string;
    drawerIcon: string;
    drawerLine: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    greeting: string;
    lessonTitle: string;
    dailyTitle: string;
    burgerAriaLabel: string;
  };
  stats: StatItem[];
  dailyTasks: DailyTaskItem[];
  drawerItems: DrawerItem[];
  mapSteps: MapStepItem[];
}

export const fifthConfig: FifthScreenConfig = {
  assets: {
    bg: "/assets/images/fifth/bg.png",
    mascot: "/assets/images/fifth/drawer-icon.png",
    burger: "/assets/images/fifth/hamburger.svg",
    lessonMap: "/assets/images/fifth/lesson-map.png",
    drawerIcon: "/assets/images/fifth/drawer-icon.png",
    drawerLine: "/assets/images/fifth/drawer-line.svg",
  },
  texts: {
    brand: "Triolingo",
    pageTitle: "Главная",
    greeting: "Приветствуем, Анастасия!",
    lessonTitle: "Блок: аудирование",
    dailyTitle: "Ежедневные задания",
    burgerAriaLabel: "Открыть меню",
  },
  stats: [
    { id: "streak", icon: "/assets/images/fifth/stat-fire.png", value: "0", alt: "Огонь" },
    { id: "crystals", icon: "/assets/images/fifth/crystal-user.svg?v=1", value: "0", alt: "Кристаллы" },
    { id: "xp", icon: "/assets/images/fifth/stat-xp.svg", value: "0", alt: "Опыт" },
  ],
  dailyTasks: [
    { id: "mini", title: "Мини-урок", reward: "+3 XP / +3", icon: "/assets/images/fifth/task-arrow.svg" },
    { id: "audio", title: "Аудирование", reward: "+1 XP / +1", icon: "/assets/images/fifth/task-arrow.svg" },
    { id: "translation", title: "Перевод фразы", reward: "+1 XP / +1", icon: "/assets/images/fifth/task-arrow.svg" },
  ],
  drawerItems: [
    { id: "home", label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f", href: "/fifth.html" },
    { id: "courses", label: "\u041a\u0443\u0440\u0441\u044b", href: "/courses.html" },
    { id: "customization", label: "\u041a\u0430\u0441\u0442\u043e\u043c\u0438\u0437\u0430\u0446\u0438\u044f", href: "/customization.html" },
    { id: "profile", label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c", href: "/profile.html" },
    { id: "settings", label: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438", href: "/settings.html" },
  ],
  mapSteps: [
    { id: "step-1", label: "1", x: 59.8, y: 88.1, href: "/exercise-word.html", primary: true },
    { id: "step-2", label: "2", x: 51.0, y: 74.6, href: "/exercise-speak.html" },
    { id: "step-3", label: "3", x: 59.7, y: 64.1, href: "/exercise-gap.html" },
    { id: "step-4", label: "4", x: 67.6, y: 54.7, href: "/exercise-build.html" },
    { id: "step-5", label: "5", x: 75.5, y: 46.0, href: "/exercise-match.html" },
  ],
};

