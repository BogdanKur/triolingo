export type DrawerItemId = "home" | "courses" | "customization" | "profile" | "settings";

export interface DrawerItem {
  id: DrawerItemId;
  label: string;
  href?: string;
}
