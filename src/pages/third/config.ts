export type Rect = { x: number; y: number; w: number; h: number };

export type FlagKind =
  | "uk"
  | "germany"
  | "spain"
  | "portugal"
  | "russia"
  | "france"
  | "japan"
  | "italy"
  | "poland"
  | "belarus"
  | "greece"
  | "hungary"
  | "turkey"
  | "kazakhstan"
  | "romania";

export type LanguageCard = {
  id: string;
  label: string;
  flag: FlagKind;
  rect: Rect;
};

export const thirdConfig = {
  title: "Выберите язык и начнём играть!",
  decorations: [
    { id: "left-top", sprite: { left: 0, top: -4.33, w: 297.67, h: 390.84 }, rect: { x: 25, y: 49, w: 150, h: 171 } },
    { id: "left-mid", sprite: { left: -214.11, top: -4.51, w: 314.11, h: 407.43 }, rect: { x: 25, y: 274, w: 124, h: 143 } },
    { id: "left-bottom", sprite: { left: -101.76, top: -12.93, w: 300.29, h: 441.38 }, rect: { x: 112, y: 533, w: 127, h: 129 } },
    { id: "right-mid", sprite: { left: -195.95, top: -116.76, w: 295.95, h: 443.93 }, rect: { x: 1077, y: 274, w: 123, h: 123 } },
    { id: "right-top", sprite: { left: -9.35, top: -312.47, w: 319, h: 425.48 }, rect: { x: 1024, y: 30, w: 136, h: 153 } },
    { id: "right-bottom", sprite: { left: -115.67, top: -216.01, w: 321, h: 431.46 }, rect: { x: 985, y: 493, w: 135, h: 151 } },
  ],
  board: { x: 187, y: 166, w: 825, h: 343 },
  start: { x: 348, y: 564, w: 503, h: 87 },
  cards: [
    { id: "de", label: "Немецкий", flag: "germany", rect: { x: 286, y: 17, w: 232, h: 211 } },
    { id: "en", label: "Английский", flag: "uk", rect: { x: 26, y: 78, w: 232, h: 211 } },
    { id: "es", label: "Испанский", flag: "spain", rect: { x: 546, y: 76, w: 232, h: 211 } },
    { id: "fr", label: "Французский", flag: "france", rect: { x: 520, y: 1118, w: 232, h: 211 } },
    { id: "jp", label: "Японский", flag: "japan", rect: { x: 7, y: 598, w: 232, h: 211 } },
    { id: "pt", label: "Португальский", flag: "portugal", rect: { x: 306, y: 285, w: 232, h: 211 } },
    { id: "ru", label: "Русский", flag: "russia", rect: { x: 566, y: 338, w: 232, h: 211 } },
    { id: "it", label: "Итальянский", flag: "italy", rect: { x: 300, y: 823, w: 232, h: 211 } },
    { id: "pl", label: "Польский", flag: "poland", rect: { x: 560, y: 849, w: 232, h: 211 } },
    { id: "by", label: "Булорусский", flag: "belarus", rect: { x: 527, y: 598, w: 232, h: 211 } },
    { id: "gr", label: "Греческий", flag: "greece", rect: { x: 0, y: 1118, w: 232, h: 211 } },
    { id: "hu", label: "Венгерский", flag: "hungary", rect: { x: 40, y: 858, w: 232, h: 211 } },
    { id: "tr", label: "Турецкий", flag: "turkey", rect: { x: 46, y: 338, w: 232, h: 211 } },
    { id: "kz", label: "Казахский", flag: "kazakhstan", rect: { x: 267, y: 553, w: 232, h: 211 } },
    { id: "ro", label: "Румынский", flag: "romania", rect: { x: 260, y: 1087, w: 232, h: 211 } },
  ] as LanguageCard[],
};
