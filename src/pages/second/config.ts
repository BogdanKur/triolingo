import type { SecondScreenConfig } from "../../shared/types/second";

export const secondConfig: SecondScreenConfig = {
  background: {
    src: "/assets/images/second/background-clouds-2.png",
    alt: "Небо с облаками",
  },
  mascot: {
    src: "/assets/images/second/monster-blue.png",
    alt: "Синий персонаж Triolingo",
    desktop: { x: 70, y: 166, w: 368, h: 368 },
    mobile: { x: 75, y: 84, w: 240, h: 240 },
  },
  title: {
    text: "Войдите\nЧтобы начать изучать языки",
    desktop: { x: 600, y: 140, w: 488, h: 150 },
    mobile: { x: 20, y: 350, w: 350, h: 114 },
  },
  buttons: [
    {
      id: "telegram",
      text: "Continue with Telegram",
      iconSrc: "/assets/images/second/icon-telegram.svg",
      iconAlt: "Telegram",
      href: "/third.html",
      desktop: { x: 600, y: 341, w: 488, h: 61 },
      mobile: { x: 20, y: 490, w: 350, h: 58 },
      iconDesktop: { x: 663, y: 355, w: 34, h: 33 },
      iconMobile: { x: 46, y: 504, w: 29, h: 29 },
    },
    {
      id: "google",
      text: "Continue with Google",
      iconSrc: "/assets/images/second/icon-google.svg",
      iconAlt: "Google",
      href: "/third.html",
      desktop: { x: 600, y: 425, w: 488, h: 61 },
      mobile: { x: 20, y: 566, w: 350, h: 58 },
      iconDesktop: { x: 663, y: 439, w: 34, h: 33 },
      iconMobile: { x: 46, y: 580, w: 29, h: 29 },
    },
  ],
};
