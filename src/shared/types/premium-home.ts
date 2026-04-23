export interface PremiumHomeStatItem {
  id: string;
  icon: string;
  value: string;
  alt: string;
}

export interface ExerciseListItem {
  id: string;
  label: string;
  href?: string;
}

export interface PremiumHomeDailyTaskItem {
  id: string;
  title: string;
  reward: string;
  icon: string;
}

export interface PremiumHomeConfig {
  assets: {
    bg: string;
    mascot: string;
    burger: string;
    courseIcon: string;
  };
  texts: {
    brand: string;
    pageTitle: string;
    courseTitle: string;
    courseDescription: string;
    dailyTitle: string;
    burgerAriaLabel: string;
  };
  stats: PremiumHomeStatItem[];
  courseCard: {
    priceCrystals: string;
    priceRubles: string;
  };
  exerciseList: ExerciseListItem[];
  dailyTasks: PremiumHomeDailyTaskItem[];
}
