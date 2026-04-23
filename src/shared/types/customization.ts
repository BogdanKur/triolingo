import type { DrawerItem } from "./drawer";

export type CustomizationCardKind = "pet" | "crystal";
export type CustomizationCurrency = "crystal" | "rub";

export interface CustomizationCard {
  id: string;
  kind: CustomizationCardKind;
  image: string;
  price: string;
  currency: CustomizationCurrency;
  crystalIcon: string;
  alt: string;
  cashPrice?: string;
}

export interface PurchasePopup {
  id: string;
  triggerCardIds: string[];
  image: string;
  alt: string;
  crystalPrice: string;
  cashPrice?: string;
  accentColor: string;
}

export interface CustomizationSection {
  id: string;
  title: string;
  cards: CustomizationCard[];
}

export interface CustomizationScreenConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    drawerLine: string;
    popupCrystal: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    burgerAriaLabel: string;
    popupCancel: string;
    popupBuy: string;
    purchaseSuccess: string;
  };
  sections: CustomizationSection[];
  purchasePopups: PurchasePopup[];
  drawerItems: DrawerItem[];
}
