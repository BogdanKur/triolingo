import type { DrawerItem } from "./drawer";

export interface ProfileStatItem {
  id: string;
  icon: string;
  value: string;
  suffix: string;
}

export interface ProfileAchievementItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
  current?: number;
  total?: number;
}

export interface ProfileScreenConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    drawerLine: string;
    heroBg: string;
    heroAvatar: string;
    heroEdit: string;
    languageFlag: string;
    statLevelIcon: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    burgerAriaLabel: string;
    profileName: string;
    languageLabel: string;
    statsTitle: string;
    achievementsTitle: string;
  };
  stats: ProfileStatItem[];
  achievements: ProfileAchievementItem[];
  drawerItems: DrawerItem[];
}
