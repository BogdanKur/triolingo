export interface ExerciseAction {
  closeHref: string;
}

export interface ExerciseOptionItem {
  id: string;
  label: string;
  selected?: boolean;
  counter?: number;
}

export interface ExerciseScreenConfig {
  assets: {
    bg: string;
    closeIcon: string;
    illustration?: string;
  };
  texts: {
    pageTitle: string;
    closeAriaLabel: string;
    checkLabel: string;
    prompt?: string;
    errorText?: string;
  };
  layout: {
    contentMaxWidth: number;
    cardMaxWidth: number;
    buttonMaxWidth: number;
  };
  actions: ExerciseAction;
}
