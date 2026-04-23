export interface TranslationInputConfig {
  placeholder: string;
  maxLength?: number;
}

export interface TranslationScreenConfig {
  assets: {
    bg: string;
    closeIcon: string;
  };
  texts: {
    pageTitle: string;
    closeAriaLabel: string;
    sourcePhrase: string;
    checkLabel: string;
    inputAriaLabel: string;
  };
  layout: {
    contentMaxWidth: number;
    cardMaxWidth: number;
    buttonMaxWidth: number;
  };
  input: TranslationInputConfig;
}
