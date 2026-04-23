export interface AudioInstructionCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface AudioInputConfig {
  placeholder: string;
  maxLength?: number;
}

export interface AudioScreenConfig {
  assets: {
    bg: string;
    playIcon: string;
    playIconActive: string;
    closeIcon: string;
  };
  texts: {
    pageTitle: string;
    closeAriaLabel: string;
    inputAriaLabel: string;
  };
  layout: {
    contentMaxWidth: number;
    cardMaxWidth: number;
    buttonMaxWidth: number;
  };
  instruction: AudioInstructionCard;
  input: AudioInputConfig;
  cta: {
    label: string;
  };
}
