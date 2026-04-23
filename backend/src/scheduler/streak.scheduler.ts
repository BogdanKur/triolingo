import { runStreakRiskSweep } from "../modules/notifications/notifications.service.js";

export const startStreakScheduler = (): void => {
  const run = async (): Promise<void> => {
    try {
      const processed = await runStreakRiskSweep();
      if (processed > 0) {
        console.info(`Streak scheduler processed users: ${processed}`);
      }
    } catch (error) {
      console.warn("Streak scheduler run failed:", error);
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, 60 * 60 * 1000);
};
