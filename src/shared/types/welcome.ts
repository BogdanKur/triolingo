export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SpriteCrop = {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
};

export type DecorationItem = {
  id: string;
  src: string;
  alt: string;
  desktop: Rect;
  mobile: Rect;
  sprite: SpriteCrop;
};

export type WelcomeScreenConfig = {
  background: {
    src: string;
    alt: string;
  };
  title: {
    text: string;
    desktop: Rect;
    mobile: Rect;
  };
  cta: {
    text: string;
    href: string;
    desktop: Rect;
    mobile: Rect;
  };
  decorations: DecorationItem[];
};
