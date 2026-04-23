import { pool } from "./pool.js";
import { runSeed } from "./migration-runner.js";

const main = async (): Promise<void> => {
  try {
    await runSeed();
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
