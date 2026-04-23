import type { DrawerItem } from "./drawer";

export type CourseCardKind = "upgrade" | "soon";

export interface CourseCard {
  id: string;
  kind: CourseCardKind;
  title: string;
  description: string;
  price?: string;
  ctaLabel?: string;
}

export interface CoursesScreenConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    drawerLine: string;
    courseIcon: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    burgerAriaLabel: string;
  };
  cards: CourseCard[];
  drawerItems: DrawerItem[];
}
