import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { ensureRedisConnected, redis } from "./db/redis.js";
import { startStreakScheduler } from "./scheduler/streak.scheduler.js";

const bootstrap = async (): Promise<void> => {
  await ensureRedisConnected();

  app.listen(config.port, () => {
    console.info(`Triolingo API running on :${config.port}`);
  });

  startStreakScheduler();
};

bootstrap().catch(async (error) => {
  console.error("Failed to bootstrap API:", error);
  await pool.end();
  if (redis.isOpen) {
    await redis.quit();
  }
  process.exitCode = 1;
});
