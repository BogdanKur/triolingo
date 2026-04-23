import type { DrawerItem } from "./drawer";

export interface SettingsToggleItem {
  id: string;
  label: string;
  defaultOn: boolean;
  withIcon?: boolean;
}

export interface SettingsActionItem {
  id: string;
  label: string;
}

export interface SettingsScreenConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    drawerLine: string;
    moonIcon: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    burgerAriaLabel: string;
    nightModeLabel: string;
  };
  toggles: SettingsToggleItem[];
  actions: SettingsActionItem[];
  drawerItems: DrawerItem[];
}
