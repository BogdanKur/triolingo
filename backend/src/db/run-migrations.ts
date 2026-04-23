import { pool } from "./pool.js";
import { runMigrations } from "./migration-runner.js";

const main = async (): Promise<void> => {
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
