export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SocialButton = {
  id: string;
  text: string;
  iconSrc: string;
  iconAlt: string;
  href: string;
  desktop: Rect;
  mobile: Rect;
  iconDesktop: Rect;
  iconMobile: Rect;
};

export type SecondScreenConfig = {
  background: {
    src: string;
    alt: string;
  };
  mascot: {
    src: string;
    alt: string;
    desktop: Rect;
    mobile: Rect;
  };
  title: {
    text: string;
    desktop: Rect;
    mobile: Rect;
  };
  buttons: SocialButton[];
};
